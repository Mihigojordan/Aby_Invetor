
// Cache result for 10s to avoid hammering on every sync start
let _cachedOnline = null;
let _cacheAt = 0;
const CACHE_MS = 10_000;

const tryFetch = async (url, mode) => {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000); // 3s timeout
    const res = await fetch(url, { method: 'HEAD', cache: 'no-cache', mode, signal: controller.signal });
    clearTimeout(id);
    return res.ok || res.type === 'opaque';
  } catch {
    return false;
  }
};

export const isOnline = async () => {
  if (!navigator.onLine) return false;

  // Return cached result if fresh
  if (_cachedOnline !== null && Date.now() - _cacheAt < CACHE_MS) return _cachedOnline;

  const API_BASE = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
  // Try own API first; fall back to Google only if the API server is unreachable
  const result = (API_BASE ? await tryFetch(`${API_BASE}/api/health`, 'cors') : false)
    || await tryFetch('https://www.google.com/favicon.ico', 'no-cors');

  _cachedOnline = result;
  _cacheAt = Date.now();
  return result;
};

// Invalidate cache immediately when the browser reports a connectivity change
if (typeof window !== 'undefined') {
  window.addEventListener('online',  () => { _cachedOnline = null; });
  window.addEventListener('offline', () => { _cachedOnline = false; });
}

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