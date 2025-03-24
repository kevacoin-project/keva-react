/// <reference types="node" />
import { useState, useEffect, useCallback, useRef } from 'react';
import { BlogPost, KeyValueData } from '../types/blog';
import KevaWS from '../utils/KevaAPI';
import { RawKeyValue } from '../types/blog';

const FETCH_TX_NUM = 10;

function BlogPanel() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRequestIdRef = useRef<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const KEVACOIN_WS = 'wss://ec.kevacoin.org:50004';

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log('Attempting to connect to WebSocket...');
    wsRef.current = new WebSocket(KEVACOIN_WS);

    wsRef.current.onopen = () => {
      console.log('WebSocket connection established successfully');
      retryCount.current = 0;  // Reset retry count on successful connection
      setConnectionError(null);
      setIsConnected(true);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error occurred:', error);
      setConnectionError('Connection failed. Please check if the server is available.');
      setIsConnected(false);
    };

    wsRef.current.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      console.log('Close event details:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      setIsConnected(false);
      setConnectionError(`Connection closed (Code: ${event.code})${event.reason ? ': ' + event.reason : ''}`);
      
      if (retryCount.current < 3) {
        console.log(`Retrying connection... Attempt ${retryCount.current + 1}/3`);
        retryCount.current += 1;
        setTimeout(connectWebSocket, 2000);
      } else {
        setConnectionError('Failed to connect after 3 attempts. Please try again later.');
      }
    };    
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [connectWebSocket]);
  
  const processKeyValueList = (origkeyValues: RawKeyValue[]) => {
    // Merge the results.
    let keyValues: RawKeyValue[] = [];
    const reverseKV = origkeyValues.slice().reverse();
    for (let kv of reverseKV) {
      if (kv.type === 'PUT') {
        // Override the existing one.
        const i = keyValues.findIndex(e => e.key == kv.key);
        if (i >= 0 && keyValues[i].type != 'REG') {
          keyValues[i] = kv;
        } else {
          keyValues.push(kv);
        }
      } else if (kv.type === 'DEL') {
        keyValues = keyValues.filter(e => {
          if (e.type == 'REG') {
            return true;
          }
          if ((typeof e.key) != (typeof kv.key)) {
            return true;
          }
          if ((typeof e.key) == 'string') {
            return e.key != kv.key;
          }
          return false;
        });
      } else if (kv.type === 'REG') {
        // Special treatment for namespace creation.
        keyValues.push({key: kv.displayName, value: loc.namespaces.created, ...kv});
      }
    }
    return keyValues.reverse();
  }

  const handleSubmit = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket not connected. Attempting to reconnect...')
      connectWebSocket()
      return
    }

    const kevaWS = new KevaWS(wsRef.current)
    const namespaceId = await kevaWS.getNamespaceIdFromShortCode(inputValue)
    //setRawResponse(namespaceId)
    if (namespaceId !== null) {
      const keyValues = await kevaWS.getKeyValues(namespaceId) as KeyValueData
      const processedKeyValues = processKeyValueList(keyValues.data)      
      const blogPosts = processedKeyValues
        .filter(keyValue => typeof keyValue.key === 'string')
        .map((keyValue) => {
          return {
            title: keyValue.key,
            content: keyValue.value
          }
        })
      setBlogPosts(blogPosts)
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setInputValue(value);
      setError(null);
      setTransactionId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter a number"
          className="border p-2 rounded mr-2"
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !isConnected}
          className={`px-4 py-2 rounded ${
            isLoading || !isConnected
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
        >
          {isLoading ? 'Submitting...' : 'Submit'}
        </button>
      </div>

      {connectionError && (
        <div className="text-red-500 mb-4">
          {connectionError}
          {retryCount.current >= 3 && (
            <button
              onClick={connectWebSocket}
              className="ml-2 text-blue-500 underline"
            >
              Retry Connection
            </button>
          )}
        </div>
      )}

      {error && <div className="text-red-500 mb-4">{error}</div>}
      
      {transactionId && (
        <div className="text-green-600 text-sm mb-4">
          Transaction ID: {transactionId}
        </div>
      )}

      {rawResponse && (
        <div className="bg-gray-100 p-4 rounded mb-4 overflow-x-auto">
          <pre className="whitespace-pre-wrap">
            { rawResponse }
          </pre>
        </div>
      )}

      {blogPosts.length > 0 && (
        <div className="space-y-4">
          {blogPosts.map((post, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg p-6">
              <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
              <p className="text-gray-700 mb-6">{post.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BlogPanel; 