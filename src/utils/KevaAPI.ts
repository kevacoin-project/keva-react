import { Buffer } from 'buffer';
// This one doesn't play very nicely with default exports. May need "* as bitcoin" if you want the bitcoin.crypto code style
import {
  StackElement,
  script as bscript,
  crypto as bcrypto,
  address as baddress
} from 'bitcoinjs-lib';
import base58check from 'bs58check';

const KEVA_OP_NAMESPACE = 0xd0;
const KEVA_OP_PUT = 0xd1;
const KEVA_OP_DELETE = 0xd2;

const _KEVA_NS_BUF = Buffer.from('\x01_KEVA_NS_', 'utf8');

// Custom imports
import type { Keva } from './types';

function decodeBase64(key: string) {
  if (!key) {
    return '';
  }

  const keyBuf = Buffer.from(key, 'base64');
  if (keyBuf[0] < 10) {
    // Special protocol, not a valid utf-8 string.
    return keyBuf;
  }
  return keyBuf.toString('utf-8');
}

function namespaceToHex(nsStr: string) {
  if (!nsStr) {
    return '';
  }
  return base58check.decode(nsStr);
}

function reverse(src: string | any[] | Buffer<ArrayBufferLike>) {
  let buffer = Buffer.alloc(src.length);

  for (let i = 0, j = src.length - 1; i <= j; ++i, --j) {
    buffer[i] = src[j];
    buffer[j] = src[i];
  }

  return buffer;
}

function getNamespaceScriptHash(namespaceId: string, isBase58 = true) {
  const emptyBuffer = Buffer.alloc(0);
  let nsScript = bscript.compile([
    KEVA_OP_PUT,
    // TODO: Find out the proper typing for this
    (isBase58
      ? namespaceToHex(namespaceId)
      : Buffer.from(namespaceId, 'hex')) as StackElement,
    emptyBuffer,
    bscript.OPS.OP_2DROP,
    bscript.OPS.OP_DROP,
    bscript.OPS.OP_RETURN,
  ]);
  let hash = bcrypto.sha256(nsScript);
  let reversedHash = Buffer.from(reverse(hash));
  return reversedHash.toString('hex');
}

function getNamespaceKeyScriptHash(namespaceId: string, key: string) {
  const nsBuffer = namespaceToHex(namespaceId);
  const keyBuffer = Buffer.from(key, 'utf8');
  const totalBuffer = Buffer.concat([nsBuffer as Uint8Array, keyBuffer]);
  const emptyBuffer = Buffer.alloc(0);
  let nsScript = bscript.compile([
    KEVA_OP_PUT,
    totalBuffer,
    emptyBuffer,
    bscript.OPS.OP_2DROP,
    bscript.OPS.OP_DROP,
    bscript.OPS.OP_RETURN,
  ]);
  let hash = bcrypto.sha256(nsScript);
  let reversedHash = Buffer.from(reverse(hash));
  return reversedHash.toString('hex');
}

function getRootNamespaceScriptHash(namespaceId: string) {
  const emptyBuffer = Buffer.alloc(0);
  const nsBuf = namespaceId.startsWith('N')
    ? namespaceToHex(namespaceId)
    : Buffer.from(namespaceId, 'hex');
  const totalBuf = Buffer.concat([nsBuf as Uint8Array, _KEVA_NS_BUF]);
  let nsScript = bscript.compile([
    KEVA_OP_PUT,
    totalBuf,
    emptyBuffer,
    bscript.OPS.OP_2DROP,
    bscript.OPS.OP_DROP,
    bscript.OPS.OP_RETURN,
  ]);
  let hash = bcrypto.sha256(nsScript);
  let reversedHash = Buffer.from(reverse(hash));
  return reversedHash.toString('hex');
}

function getAddressScriptHash(address: string) {
  let script = baddress.toOutputScript(address);
  let hash = bcrypto.sha256(script);
  let reversedHash = Buffer.from(reverse(hash));
  return reversedHash.toString('hex');
}

export function getHashtagScriptHash(hashtag: string) {
  let emptyBuffer = Buffer.alloc(0);
  if (hashtag.startsWith('#')) {
    hashtag = hashtag.substring(1);
  }
  let nsScript = bscript.compile([
    KEVA_OP_PUT,
    Buffer.from(hashtag.toLowerCase(), 'utf8'),
    emptyBuffer,
    bscript.OPS.OP_2DROP,
    bscript.OPS.OP_DROP,
    bscript.OPS.OP_RETURN,
  ]);
  let hash = bcrypto.sha256(nsScript);
  let reversedHash = Buffer.from(reverse(hash));
  return reversedHash.toString('hex');
}

class KevaWS {
  private ws: WebSocket;

  constructor(ws: WebSocket) {
    this.ws = ws;
  }

  async connect() {
    const promise = new Promise<void>((resolve, reject) => {
      if (!this.ws) {
        reject('No websocket');
      }

      // Since we do not use this event, we can mark unknown
      this.ws.onopen = (_event: unknown) => {
        resolve();
      };
    });
    await promise;
  }

  close() {
    this.ws && this.ws.close();
  }

  async getMerkle(txId: string, height: number) {
    const promise = new Promise((resolve) => {
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data.toString());
        resolve(data.result);
      };
    });
    try {
      this.ws.send(
        `{"id": 1, "method": "blockchain.transaction.get_merkle", "params": ["${txId}", ${height}]}`
      );
    } catch (err) {
      return err;
    }
    return await promise;
  }

  async getIdFromPos(height: number, pos: unknown) {
    const promise = new Promise((resolve) => {
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data.toString());
        resolve(data.result);
      };
    });
    try {
      this.ws.send(
        `{"id": 1, "method": "blockchain.transaction.id_from_pos", "params": ["${height}", ${pos}]}`
      );
    } catch (err) {
      return err;
    }

    return await promise;
  }

  async getAddressHistory(address: string) {
    const scriptHash = getAddressScriptHash(address);
    const promise = new Promise<Array<Keva.Transaction>>((resolve, reject) => {
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data.toString());
        if (!data.result || data.result.length == 0) {
          return reject('Address not found');
        }
        resolve(data.result);
      };
    });
    try {
      this.ws.send(
        `{"id": 1, "method": "blockchain.scripthash.get_history", "params": ["${scriptHash}"]}`
      );
    } catch (err) {
      return err;
    }
    return await promise;
  }

  async getAddressBalance(address: string) {
    const scriptHash = getAddressScriptHash(address);
    const promise = new Promise<Array<Keva.Transaction>>((resolve, reject) => {
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data.toString());
        if (!data.result || data.result.length == 0) {
          return reject('Address not found');
        }
        resolve(data.result);
      };
    });
    try {
      this.ws.send(
        `{"id": 1, "method": "blockchain.scripthash.get_balance", "params": ["${scriptHash}"]}`
      );
    } catch (err) {
      return err;
    }
    return await promise;
  }

  async getNamespaceInfo(namespaceId: string) {
    const history = await this.getNamespaceHistory(namespaceId);
    if (!history || !Array.isArray(history) || history.length === 0) {
      return {};
    }
    // Get short code of the namespace.
    const merkle = await this.getMerkle(history[0].tx_hash, history[0].h);
    if (!merkle) {
      return {};
    }

    let strHeight = (merkle as any).block_height.toString();
    const prefix = strHeight.length;
    const shortCode = prefix + strHeight + (merkle as any).pos.toString();

    const last = history.length - 1;
    const latest = history[last];
    if (latest.kv.op == KEVA_OP_NAMESPACE) {
      // Original creation.
      return {
        displayName: decodeBase64(latest.kv.key),
        shortCode,
      };
    } else {
      const infoStr = decodeBase64(latest.kv.value);
      const info = JSON.parse(infoStr as string);
      return { ...info, shortCode };
    }
  }

  async getNamespaceIdFromShortCode(shortCode: string) {
    const prefix = parseInt(shortCode.substring(0, 1));
    const height = parseInt(shortCode.substring(1, 1 + prefix));
    const pos = parseInt(shortCode.substring(1 + prefix));
    const tx = await this.getIdFromPos(height, pos);
    const transactions = await this.getTransactions([tx as string]);
    if (!transactions || transactions.length == 0 || !transactions[0].n) {
      return null;
    }
    return transactions[0].n[0];
  }

  async getNamespaceHistory(namespaceId: string) {
    const scriptHash = getRootNamespaceScriptHash(namespaceId);
    const promise = new Promise<Array<Keva.Transaction>>((resolve, reject) => {
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data.toString());
        if (!data.result || data.result.length == 0) {
          return reject('Namespace not found');
        }
        resolve(data.result);
      };
    });
    try {
      this.ws.send(
        `{"id": 1, "method": "blockchain.scripthash.get_history", "params": ["${scriptHash}"]}`
      );
    } catch (err) {
      return err;
    }
    const nsHistory = await promise;
    const txIds = nsHistory.map((t) => t.tx_hash);
    const transactions = await this.getTransactions(txIds);
    return transactions.map((t, i) => {
      t.tx_hash = txIds[i];
      return t;
    });
  }

  async getKeyValues(namespaceId: string, txNum = -1) {
    const scriptHash = getNamespaceScriptHash(namespaceId, true);
    const promise = new Promise((resolve) => {
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data.toString());
        const resultList = data.result.keyvalues.map((r: { key: string; value: string }) => {          
          return {
            key: decodeBase64(r.key),
            value: decodeBase64(r.value)            
          };
        });
        const min_tx_num = data.result.min_tx_num;
        const result = {
          data: resultList,
          min_tx_num,
        };
        resolve(result);
      };
    });
    try {
      this.ws.send(
        `{"id": 1, "method": "blockchain.keva.get_keyvalues", "params": ["${scriptHash}", ${txNum}]}`
      );
    } catch (err) {
      return err;
    }
    return await promise;
  }

  async getHashtag(hashtag: string, txNum = -1) {
    const scriptHash = getHashtagScriptHash(hashtag);
    const promise = new Promise((resolve) => {
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data.toString());
        let hashtags = data.result.hashtags;
        let min_tx_num = data.result.min_tx_num;
        if (!hashtags || hashtags.length == 0) {
          return {
            hashtags: [],
            min_tx_num: -1,
          };
        }

        hashtags = hashtags.map((r: { key: string; value: string; }) => {          
          return {
                key: decodeBase64(r.key),
                value: decodeBase64(r.value)
          };
        });
        resolve({
          hashtags,
          min_tx_num,
        });
      };
    });
    try {
      this.ws.send(
        `{"id": 1, "method": "blockchain.keva.get_hashtag", "params": ["${scriptHash}", ${txNum}]}`
      );
    } catch (err) {
      return err;
    }
    return await promise;
  }

  async getTransactions(
    txIds: Array<string>,
    namespaceInfo = true
  ): Promise<Array<Keva.Transaction>> {
    const promise = new Promise<Array<Keva.Transaction>>((resolve) => {
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data.toString());
        resolve(data.result);
      };
    });
    try {
      this.ws.send(
        `{"id": 1, "method": "blockchain.keva.get_transactions_info", "params": [${JSON.stringify(
          txIds
        )}, ${namespaceInfo}]}`
      );
    } catch (err) {
      return [] as Keva.Transaction[];
    }
    return await promise;
  }

  async getValue(namespaceId: string, key: string, history = false) {
    const scriptHash = getNamespaceKeyScriptHash(namespaceId, key);
    const promise = new Promise<Array<Keva.Transaction>>((resolve) => {
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data.toString());
        resolve(data.result);
      };
    });
    try {
      this.ws.send(
        `{"id": 1, "method": "blockchain.scripthash.get_history", "params": ["${scriptHash}"]}`
      );
    } catch (err) {
      return err;
    }
    const txIdResults = await promise;
    const txIds = txIdResults.map((t) => t.tx_hash);
    const results = await this.getTransactions(txIds);
    if (history) {
      return results.map((r) => {
        return {
          value: decodeBase64(r.kv.value),
          timestamp: r.t,
          height: r.h,
        };
      });
    } else {
      // The last one is the latest one.
      const index = results.length - 1;
      if (index < 0) {
        return {};
      }
      const result = results[index];
      if (result.kv.op == KEVA_OP_DELETE || result.kv.op == KEVA_OP_NAMESPACE) {
        // Value deleted or no value (namespace registation).
        return;
      }
      return {
        value: decodeBase64(result.kv.value),
        timestamp: result.t,
        height: result.h,
      };
    }
  }
}

export default KevaWS;
