// contexts/NetworkStatusContext.js
import React, { createContext, useContext } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const NetworkStatusContext = createContext();

export const NetworkStatusProvider = ({ children, retryInterval = 1000 }) => {
  const networkStatus = useNetworkStatus(retryInterval);

  
  
  return (
    <NetworkStatusContext.Provider value={networkStatus}>
      {children}
    </NetworkStatusContext.Provider>
  );
};

export const useNetworkStatusContext = () => {
  const context = useContext(NetworkStatusContext);
  
  if (!context) {
    throw new Error('useNetworkStatusContext must be used within a NetworkStatusProvider');
  }
  
  return context;
};

// Example usage in your App.js:
/*
import { NetworkStatusProvider } from './contexts/NetworkStatusContext';

function App() {
  return (
    <NetworkStatusProvider retryInterval={3000}>
      <YourAppContent />
    </NetworkStatusProvider>
  );
}
*/

// Example usage in any component:
/*
import { useNetworkStatusContext } from './contexts/NetworkStatusContext';

function SomeComponent() {
  const { isOnline, isChecking, browserOnline } = useNetworkStatusContext();
  
  return (
    <div>
      {!isOnline && <div>You're offline!</div>}
      {isChecking && <div>Checking connection...</div>}
    </div>
  );
}
*/