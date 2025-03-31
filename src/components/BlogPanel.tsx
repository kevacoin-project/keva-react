/// <reference types="node" />
import { useState } from 'react';
import { BlogPost, KeyValueData } from '../types/blog';
import KevaWS from '../utils/KevaAPI';
import { RawKeyValue } from '../types/blog';
import { HeartIcon, ShareIcon, ChatBubbleLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useBlogStore } from '../store/blogStore';
import { useWebSocket } from '../contexts/WebSocketContext';

const FETCH_TX_NUM = 10;

const NAMESPACE_OPTIONS = [
  { label: 'Kevacoin Official Account', value: '32101' },
  { label: 'Kevacoin Chinese', value: '5577271' },
];

function BlogPanel() {
  const { posts, setPosts, inputValue, setInputValue } = useBlogStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const { wsRef, isConnected, connectionError, isConnecting, connectWebSocket, retryCount } = useWebSocket();

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setInputValue(value);
      setError(null);
      setTransactionId(null);
      
      // Check if the value matches any predefined option
      const selectedOption = NAMESPACE_OPTIONS.find(opt => opt.value === value);
      if (selectedOption) {
        // Use setTimeout to ensure the value is set before submitting
        setTimeout(() => {
          handleSubmit();
        }, 0);
      }
    }
  };

  const handleSubmit = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket not connected. Attempting to reconnect...')
      connectWebSocket()
      return
    }

    setIsLoading(true);
    try {
      const kevaWS = new KevaWS(wsRef.current)
      const namespaceId = await kevaWS.getNamespaceIdFromShortCode(inputValue)
      if (namespaceId !== null) {
        const keyValues = await kevaWS.getKeyValues(namespaceId) as KeyValueData
        const processedKeyValues = processKeyValueList(keyValues.data)      
        const blogPosts = processedKeyValues
          .filter(keyValue => typeof keyValue.key === 'string')
          .map((keyValue) => {
            return {
              title: keyValue.key,
              content: keyValue.value,
              likes: keyValue.likes || 0,
              shares: keyValue.shares || 0,
              replies: keyValue.replies || 0,
              time: keyValue.time,
              height: keyValue.height,
              tx_hash: keyValue.tx_hash
            }
          })
        setPosts(blogPosts)
      }
    } catch (err) {
      setError('Failed to fetch posts');
      console.error('Error fetching posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const togglePostExpansion = (index: number) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onInput={(e) => {
                const target = e.target as HTMLInputElement;
                const selectedOption = NAMESPACE_OPTIONS.find(opt => opt.value === target.value);
                if (selectedOption) {
                  handleSubmit();
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter namespace ID or select from list"
              className="w-full rounded-lg border border-gray-300 pl-4 pr-12 h-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-white"
              list="namespace-options"
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => setInputValue('')}
                className="absolute right-4 top-[1px] text-gray-400 hover:text-gray-600 z-10"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
            <datalist id="namespace-options">
              {NAMESPACE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} label={option.label} />
              ))}
            </datalist>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !isConnected}
            className={`px-6 py-2 rounded-lg ${
              isLoading || !isConnected
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white whitespace-nowrap`}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      {connectionError && isConnecting && (
        <div className="text-red-500 mb-4">
          {connectionError}
          {retryCount >= 3 && (
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

      {posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post, index) => (
            <Link 
              to={`/post/${index}`} 
              key={index} 
              className="block hover:shadow-xl transition-shadow duration-200"
            >
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <h1 className="text-2xl font-bold">{post.title}</h1>
                  <div className="text-sm text-gray-500 flex flex-col items-end">
                    {post.time && (
                      <span>{new Date(post.time * 1000).toLocaleString()}</span>
                    )}
                    {post.height && (
                      <span>Block #{post.height}</span>
                    )}
                  </div>
                </div>
                <p className="text-gray-700 mb-6 line-clamp-3">
                  {post.content}
                </p>
                <div className="flex items-center space-x-6 text-gray-500">
                  <div className="flex items-center space-x-1">
                    <HeartIcon className="h-5 w-5" />
                    <span>{post.likes}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ShareIcon className="h-5 w-5" />
                    <span>{post.shares}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ChatBubbleLeftIcon className="h-5 w-5" />
                    <span>{post.replies}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default BlogPanel; 