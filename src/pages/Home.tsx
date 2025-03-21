/// <reference types="node" />
import { useState, useEffect, useRef, useCallback } from 'react'
import BlogPanel from '../components/BlogPanel'
import { createJsonRpcMessage } from '../utils/jsonrpc'

interface ParsedShortCode {
  height: string;
  pos: string;
}

interface WsResponse {
  jsonrpc: string;
  result: string | null;
  error?: {
    code: number;
    message: string;
  };
  id: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const REQUEST_TIMEOUT = 10000; // 10 seconds

function parseShortCode(shortCode: string): ParsedShortCode | null {
  try {
    const prefix = parseInt(shortCode.substring(0, 1));
    if (isNaN(prefix) || prefix <= 0) return null;
    
    // Check if we have enough characters for the height based on prefix
    if (shortCode.length < 1 + prefix) return null;
    
    const height = shortCode.substring(1, 1 + prefix);
    const pos = shortCode.substring(1 + prefix);
    
    // Ensure we have both height and position
    if (!height || !pos) return null;
    
    return { height, pos };
  } catch (error) {
    console.error('Error parsing shortCode:', error);
    return null;
  }
}

const Home = () => {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [rawResponse, setRawResponse] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const retryCount = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentRequestIdRef = useRef<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log('Attempting to connect to WebSocket...');
    wsRef.current = new WebSocket('wss://ec.kevacoin.org:50004')

    wsRef.current.onopen = () => {
      console.log('WebSocket connection established successfully')
      retryCount.current = 0  // Reset retry count on successful connection
      setConnectionError(null)
      setIsConnected(true)
    }

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error occurred:', error)
      setConnectionError('Connection failed. Please check if the server is available on port 50004.')
      setIsConnected(false)
    }

    wsRef.current.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      console.log('Close event details:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      })
      setIsConnected(false)
      setConnectionError(`Connection closed (Code: ${event.code})${event.reason ? ': ' + event.reason : ''}`)
      
      // Implement retry logic
      if (retryCount.current < 3) {
        console.log(`Retrying connection... Attempt ${retryCount.current + 1}/3`)
        retryCount.current += 1
        setTimeout(connectWebSocket, 2000)
      } else {
        setConnectionError('Failed to connect after 3 attempts. Please try again later or check if port 50004 is correct.')
      }
    }

    wsRef.current.onmessage = (event) => {
      try {
        // Store and display raw response
        setRawResponse(event.data)
        console.log('Raw response:', event.data)

        const response: WsResponse = JSON.parse(event.data)
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }

        if (response.id === currentRequestIdRef.current) {
          setIsLoading(false)
          
          if (response.error) {
            setError(`Server error: ${response.error.message}`)
            setTransactionId(null)
          } else if (response.result === null) {
            setError('Transaction not found')
            setTransactionId(null)
          } else {
            setError(null)
            setTransactionId(response.result)
          }
        }
      } catch (err) {
        console.error('Error processing response:', err)
        setError('Error processing response')
        setIsLoading(false)
        setTransactionId(null)
      }
    }
  }, [])

  useEffect(() => {
    connectWebSocket()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [connectWebSocket])

  const handleSubmit = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket not connected. Attempting to reconnect...')
      connectWebSocket()
      return
    }

    const parsed = parseShortCode(inputValue)
    if (parsed) {
      try {
        setIsLoading(true)
        setError(null)
        setTransactionId(null)

        // Generate random ID for this request
        const requestId = Math.floor(Math.random() * 1000000)
        currentRequestIdRef.current = requestId

        const message = createJsonRpcMessage(
          'blockchain.transaction.id_from_pos',
          [parsed.height, parsed.pos, false],
          requestId
        )

        // Set timeout for this request
        timeoutRef.current = setTimeout(() => {
          if (currentRequestIdRef.current === requestId) {
            setIsLoading(false)
            setError('Request timed out')
            currentRequestIdRef.current = null
          }
        }, REQUEST_TIMEOUT)

        wsRef.current.send(message)
        console.log('Sent message:', message)
      } catch (err) {
        console.error('Error sending message:', err)
        setError('Error sending message')
        setIsLoading(false)
        setTransactionId(null)
      }
    } else {
      setError('Invalid shortCode format')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Only allow numbers
    if (value === '' || /^[0-9]+$/.test(value)) {
      setInputValue(value)
      setError(null)
      setTransactionId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">
        Welcome to Keva React
      </h1>

      {/* Search Bar and Submit Button */}
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex gap-4">
          <input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="Enter a number..."
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`px-6 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
              isLoading 
                ? 'bg-blue-300 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isLoading ? 'Loading...' : 'Submit'}
          </button>
        </div>
        {error && (
          <div className="text-red-500 text-sm flex items-center gap-2">
            <span>{error}</span>
            {error.includes('Connection') && (
              <button
                onClick={connectWebSocket}
                className="text-blue-500 hover:text-blue-600 text-sm underline"
              >
                Retry connection
              </button>
            )}
          </div>
        )}
        {transactionId && (
          <div className="text-green-600 text-sm">
            Transaction ID: {transactionId}
          </div>
        )}
        {/* Display raw response */}
        {rawResponse && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Raw Response:</h3>
            <pre className="text-xs text-gray-600 overflow-x-auto">
              {JSON.stringify(JSON.parse(rawResponse), null, 2)}
            </pre>
          </div>
        )}
      </div>

      <BlogPanel />
    </div>
  )
}

export default Home 