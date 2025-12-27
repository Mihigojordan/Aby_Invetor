import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// Create the Socket Context
const SocketContext = createContext(null);

// Socket Provider Component
/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.serverUrl='http://localhost:3001']
 * @param {Object} [props.options]
 */
export const SocketProvider = ({ 
  children, 
  serverUrl = 'http://localhost:3001',
  options = {}
}) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Default socket options
  const defaultOptions = {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: maxReconnectAttempts,
    timeout: 20000,
    forceNew: true,
    ...options
  };

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(serverUrl, defaultOptions);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socketRef.current?.id);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        handleReconnection();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
      handleReconnection();
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Reconnection attempt:', attemptNumber);
      reconnectAttemptsRef.current = attemptNumber;
    });

    socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
      setConnectionError(error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect after maximum attempts');
      setConnectionError('Failed to reconnect to server');
    });

    return socket;
  }, [serverUrl, options]); // Note: options is object, so we can't directly depend on it — consider JSON.stringify if needed

  // Manual reconnection with exponential backoff
  const handleReconnection = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (!socketRef.current?.connected) {
        console.log('Attempting manual reconnection...');
        socketRef.current?.connect();
      }
    }, delay);
  }, []);

  // Manual connect
  const connect = useCallback(() => {
    if (!socketRef.current) {
      initializeSocket();
    } else if (!socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, [initializeSocket]);

  // Manual disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      setIsConnected(false);
    }
  }, []);

  // Emit wrapper
  const emit = useCallback((event, data, callback) => {
    if (socketRef.current?.connected) {
      if (callback) {
        socketRef.current.emit(event, data, callback);
      } else {
        socketRef.current.emit(event, data);
      }
    } else {
      console.warn('Socket not connected. Cannot emit event:', event);
    }
  }, []);

  // Listen to event with cleanup
  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
      return () => {
        socketRef.current?.off(event, handler);
      };
    }
  }, []);

  // Remove listener
  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  // Initialize on mount
  useEffect(() => {
    const socket = initializeSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socket.disconnect();
    };
  }, [initializeSocket]);

  const contextValue = {
    socket: socketRef.current,
    isConnected,
    connectionError,
    reconnectAttempts: reconnectAttemptsRef.current,
    connect,
    disconnect,
    emit,
    on,
    off
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

// Hook to use socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// Hook for easy event listening with auto cleanup
export const useSocketEvent = (event, handler, dependencies = []) => {
  const { on, socket } = useSocket();

  useEffect(() => {
    if (!event || !handler) return;
    const cleanup = on(event, handler);
    return cleanup;
  }, [event, socket, handler, on, ...dependencies]);
};

// Status display component
export const SocketStatus = () => {
  const { isConnected, connectionError, reconnectAttempts, connect, disconnect } = useSocket();

  return (
    <div style={{
      padding: '10px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      margin: '10px 0'
    }}>
      <h3>Socket Status</h3>
      <p>
        Status: <span style={{ color: isConnected ? 'green' : 'red' }}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </p>

      {connectionError && (
        <p style={{ color: 'red' }}>Error: {connectionError}</p>
      )}

      {reconnectAttempts > 0 && (
        <p>Reconnection attempts: {reconnectAttempts}</p>
      )}

      <div>
        <button onClick={connect} disabled={isConnected}>
          Connect
        </button>
        <button onClick={disconnect} disabled={!isConnected} style={{ marginLeft: '10px' }}>
          Disconnect
        </button>
      </div>
    </div>
  );
};