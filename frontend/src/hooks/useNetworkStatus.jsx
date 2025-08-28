// hooks/useNetworkStatus.js
import { useEffect, useState } from "react";

export const useNetworkStatus = (retryInterval = 5000) => {
  const [online, setOnline] = useState(navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let mounted = true;
    let retryTimer = null;

    const checkInternetConnectivity = async () => {
      if (!mounted) return false;

      setIsChecking(true);
      try {
        const status = await isOnline();
        if (mounted) {
          setOnline(status);
          setIsChecking(false);
        }
        return status;
      } catch (error) {
        console.error("Error checking internet connectivity:", error);
        if (mounted) {
          setOnline(false);
          setIsChecking(false);
        }
        return false;
      }
    };

    // Initial check
    checkInternetConnectivity();

    // Handle browser online/offline + real connectivity check
    const handleNetworkChange = async (browserOnlineStatus) => {
      if (!mounted) return;

      console.log(
        "🌐 Network change detected:",
        browserOnlineStatus ? "online" : "offline"
      );

      if (!browserOnlineStatus) {
        // Browser says offline → trust it
        setOnline(false);
        setIsChecking(false);

        if (retryTimer) {
          clearInterval(retryTimer);
          retryTimer = null;
        }
      } else {
        console.log("🔍 Browser online - verifying internet connectivity...");

        if (retryTimer) {
          clearInterval(retryTimer);
          retryTimer = null;
        }

        const startConnectivityCheck = async () => {
          const hasInternet = await checkInternetConnectivity();

          if (!hasInternet && mounted) {
            retryTimer = setInterval(async () => {
              if (!mounted) {
                if (retryTimer) {
                  clearInterval(retryTimer);
                  retryTimer = null;
                }
                return;
              }

              const connected = await checkInternetConnectivity();
              if (connected && mounted) {
                console.log("✅ Real internet connectivity restored!");
                clearInterval(retryTimer);
                retryTimer = null;
              }
            }, retryInterval);
          }
        };

        startConnectivityCheck();
      }
    };

    // Set up network listeners
    onNetworkStatusChange(handleNetworkChange);

    // Periodic fallback check (only if browser says online but we think offline)
    const periodicTimer = setInterval(async () => {
      if (!mounted) return;
      if (navigator.onLine && !online && !isChecking) {
        console.log(
          "🔄 Periodic check - browser online but state offline, verifying..."
        );
        await checkInternetConnectivity();
      }
    }, retryInterval * 2);

    return () => {
      mounted = false;
      if (retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
      }
      if (periodicTimer) {
        clearInterval(periodicTimer);
      }
      removeNetworkStatusListener(handleNetworkChange);
    };
  }, [retryInterval]); // ✅ Only rerun when retryInterval changes

  return {
    isOnline: online,
    isChecking,
    browserOnline: navigator.onLine,
  };
};

export const isOnline = async () => {
  if (!navigator.onLine) return false;

  const testUrls = [
    "https://www.google.com/favicon.ico",
    "https://www.cloudflare.com/favicon.ico",
    "https://www.wikipedia.org/favicon.ico",
  ];

  const testPromises = testUrls.map(async (url) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: "HEAD",
        cache: "no-cache",
        mode: "no-cors",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.type === "opaque";
    } catch (error) {
      return false;
    }
  });

  try {
    const results = await Promise.allSettled(testPromises);
    return results.some(
      (result) => result.status === "fulfilled" && result.value === true
    );
  } catch {
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
      reject(new Error("Connection timeout"));
    }, timeout);

    let checkInterval;

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (checkInterval) clearInterval(checkInterval);
      window.removeEventListener("online", onlineHandler);
    };

    const onlineHandler = async () => {
      const reallyOnline = await isOnline();
      if (reallyOnline) {
        cleanup();
        resolve(true);
      }
    };

    window.addEventListener("online", onlineHandler);

    checkInterval = setInterval(async () => {
      const online = await isOnline();
      if (online) {
        cleanup();
        resolve(true);
      }
    }, 2000);
  });
};

// --------------------
// Event listener utils
// --------------------

let networkStatusCallbacks = [];

export const onNetworkStatusChange = (callback) => {
  networkStatusCallbacks.push(callback);
  if (networkStatusCallbacks.length === 1) {
    setupNetworkListeners();
  }
};

export const removeNetworkStatusListener = (callback) => {
  networkStatusCallbacks = networkStatusCallbacks.filter((cb) => cb !== callback);
  if (networkStatusCallbacks.length === 0) {
    cleanupNetworkListeners();
  }
};

let onlineHandler, offlineHandler;

const setupNetworkListeners = () => {
  onlineHandler = () => {
    console.log("📡 Browser online event fired");
    networkStatusCallbacks.forEach((callback) => callback(true));
  };

  offlineHandler = () => {
    console.log("📡 Browser offline event fired");
    networkStatusCallbacks.forEach((callback) => callback(false));
  };

  window.addEventListener("online", onlineHandler);
  window.addEventListener("offline", offlineHandler);

  if ("connection" in navigator) {
    const connection = navigator.connection;
    const connectionHandler = () => {
      console.log("📡 Connection change detected:", connection.effectiveType);
      networkStatusCallbacks.forEach((callback) => callback(navigator.onLine));
    };

    connection.addEventListener("change", connectionHandler);
    onlineHandler.connectionHandler = connectionHandler;
  }
};

const cleanupNetworkListeners = () => {
  if (onlineHandler) {
    window.removeEventListener("online", onlineHandler);
    if (onlineHandler.connectionHandler && "connection" in navigator) {
      navigator.connection.removeEventListener(
        "change",
        onlineHandler.connectionHandler
      );
    }
    onlineHandler = null;
  }

  if (offlineHandler) {
    window.removeEventListener("offline", offlineHandler);
    offlineHandler = null;
  }
};
