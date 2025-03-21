export type UnixDate = number;

export namespace Keva {
  // TODO: Make this more complete
  export interface Transaction {
    tx_hash: string;
    n: [string, number];
    t: UnixDate;
    h: number;
    kv: {
      op: number;
      value: string;
    };
  }
  
}
