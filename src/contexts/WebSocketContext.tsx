import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { KEVACOIN_WS } from '../config';

interface WebSocketContextType {
  wsRef: React.RefObject<WebSocket>;
  isConnected: boolean;
  connectionError: string | null;
  isConnecting: boolean;
  connectWebSocket: () => void;
  retryCount: React.RefObject<number>;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (isConnecting) return;

    setIsConnecting(true);
    console.log('Attempting to connect to WebSocket...');
    wsRef.current = new WebSocket(KEVACOIN_WS);

    wsRef.current.onopen = () => {
      console.log('WebSocket connection established successfully');
      retryCount.current = 0;
      setConnectionError(null);
      setIsConnected(true);
      setIsConnecting(false);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error occurred:', error);
      setConnectionError('Connection failed. Please check if the server is available.');
      setIsConnected(false);
      setIsConnecting(false);
    };

    wsRef.current.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      console.log('Close event details:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      setIsConnected(false);
      setIsConnecting(false);
      
      if (retryCount.current < 3) {
        console.log(`Retrying connection... Attempt ${retryCount.current + 1}/3`);
        retryCount.current += 1;
        setTimeout(connectWebSocket, 2000);
      } else {
        setConnectionError('Failed to connect after 3 attempts. Please try again later.');
      }
    };    
  }, [isConnecting]);

  useEffect(() => {
    if (!wsRef.current) {
      connectWebSocket();
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{
      wsRef,
      isConnected,
      connectionError,
      isConnecting,
      connectWebSocket,
      retryCount
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
} 