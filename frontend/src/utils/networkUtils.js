
  export const isOnline = async () => {
    if (!navigator.onLine) return false;

    const testUrls = [
      "https://www.google.com/favicon.ico",

    ];

    // Test multiple URLs in parallel for faster response
    const testPromises = testUrls.map(async (url) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(url, { 
          method: "HEAD", 
          cache: "no-cache",
          mode: "no-cors",
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response.ok || response.type === 'opaque';
      } catch (error) {
        return false;
      }
    });

    try {
      // If any of the tests succeed, we have internet
      const results = await Promise.allSettled(testPromises);
      return results.some(result => result.status === 'fulfilled' && result.value === true);
    } catch (error) {
      return false;
    }
  };

  export const waitForNetwork = async (timeout = 10000) => {
    const currentlyOnline = await isOnline();
    if (currentlyOnline) {
      return true;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Connection timeout'));
      }, timeout);

      let checkInterval;

      const cleanup = () => {
        clearTimeout(timeoutId);
        if (checkInterval) clearInterval(checkInterval);
        window.removeEventListener('online', onlineHandler);
      };

      const onlineHandler = async () => {
        // When browser says online, verify real connectivity
        const reallyOnline = await isOnline();
        if (reallyOnline) {
          cleanup();
          resolve(true);
        }
      };

      // Listen for browser online event
      window.addEventListener('online', onlineHandler);

      // Also periodically check if we're online (in case we missed the event)
      checkInterval = setInterval(async () => {
        const online = await isOnline();
        if (online) {
          cleanup();
          resolve(true);
        }
      }, 2000);
    });
  };

  // Enhanced network status event listeners
  let networkStatusCallbacks = [];

  export const onNetworkStatusChange = (callback) => {
    networkStatusCallbacks.push(callback);
    
    // Set up listeners only once
    if (networkStatusCallbacks.length === 1) {
      setupNetworkListeners();
    }
  };

  export const removeNetworkStatusListener = (callback) => {
    networkStatusCallbacks = networkStatusCallbacks.filter(cb => cb !== callback);
    
    // Clean up listeners if no more callbacks
    if (networkStatusCallbacks.length === 0) {
      cleanupNetworkListeners();
    }
  };

  let onlineHandler, offlineHandler;

  const setupNetworkListeners = () => {
    onlineHandler = () => {
      console.log('📡 Browser online event fired');
      networkStatusCallbacks.forEach(callback => callback(true));
    };
    
    offlineHandler = () => {
      console.log('📡 Browser offline event fired');
      networkStatusCallbacks.forEach(callback => callback(false));
    };
    
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    
    // Also listen for connection changes that might not trigger online/offline
    if ('connection' in navigator) {
      const connection = navigator.connection;
      const connectionHandler = () => {
        console.log('📡 Connection change detected:', connection.effectiveType);
        // Trigger a check with current navigator.onLine status
        networkStatusCallbacks.forEach(callback => callback(navigator.onLine));
      };
      
      connection.addEventListener('change', connectionHandler);
      
      // Store reference for cleanup
      onlineHandler.connectionHandler = connectionHandler;
    }
  };

  const cleanupNetworkListeners = () => {
    if (onlineHandler) {
      window.removeEventListener('online', onlineHandler);
      if (onlineHandler.connectionHandler && 'connection' in navigator) {
        navigator.connection.removeEventListener('change', onlineHandler.connectionHandler);
      }
      onlineHandler = null;
    }
    
    if (offlineHandler) {
      window.removeEventListener('offline', offlineHandler);
      offlineHandler = null;
    }
  };