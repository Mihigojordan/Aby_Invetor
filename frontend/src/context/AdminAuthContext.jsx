import { createContext, useContext, useEffect, useState } from "react";
import adminAuthService from "../services/adminAuthService";
import { adminOfflineAuthService } from "../services/offline-auth/adminOfflineAuthService";
import { useNetworkStatusContext } from "./useNetworkContext";
import { decrypt } from "../utils/Encryption";
import { db } from "../db/database"; // your Dexie db
import pushNotificationService from "../services/pushNotificationService";
import { getClientDescription } from "../stores/detectDevice";

// eslint-disable-next-line react-refresh/only-export-components
export const AdminAuthContext = createContext({
    user: null,
    login: () => { },
    logout: () => { },
    lockAdmin: () => { },
    unlockAdmin: () => { },
    isAuthenticated: false,
    isLocked: false,
    isLoading: true,
    isOfflineMode: false,
    subscribeToNotifications: async () => {},
    unsubscribeFromNotifications: async () => {},
    unsubscribeAllDevices: async () => {},
    getSubscriptions: async () => [],
    isSubscribedToNotifications: false,
})

// localStorage keys
const AUTH_STORAGE_KEYS = {
    USER: 'admin_user',
    IS_AUTHENTICATED: 'admin_is_authenticated',
    IS_LOCKED: 'admin_is_locked',
    IS_OFFLINE_MODE: 'admin_is_offline_mode'
}

// Helper functions for localStorage operations
const getStoredValue = (key, defaultValue = null) => {
    try {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : defaultValue
    } catch (error) {
        console.error(`Error reading from localStorage for key ${key}:`, error)
        return defaultValue
    }
}

const setStoredValue = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
        console.error(`Error writing to localStorage for key ${key}:`, error)
    }
}

const removeStoredValue = (key) => {
    try {
        localStorage.removeItem(key)
    } catch (error) {
        console.error(`Error removing from localStorage for key ${key}:`, error)
    }
}

const clearAuthStorage = () => {
    Object.values(AUTH_STORAGE_KEYS).forEach(key => {
        removeStoredValue(key)
    })
}

export const AdminAuthContextProvider = ({ children }) => {
    const { isOnline } = useNetworkStatusContext()
    
    // Initialize state from localStorage
    const [user, setUser] = useState(() => getStoredValue(AUTH_STORAGE_KEYS.USER))
    const [isAuthenticated, setIsAuthenticated] = useState(() => getStoredValue(AUTH_STORAGE_KEYS.IS_AUTHENTICATED, false))
    const [isLocked, setIsLocked] = useState(() => getStoredValue(AUTH_STORAGE_KEYS.IS_LOCKED, false))
    const [isOfflineMode, setIsOfflineMode] = useState(() => getStoredValue(AUTH_STORAGE_KEYS.IS_OFFLINE_MODE, false))
    const [isLoading, setIsLoading] = useState(true)
    const [isSubscribedToNotifications, setIsSubscribedToNotifications] = useState(false)

    // Helper function to update state and localStorage
    const updateAuthState = (authData) => {
        const { 
            user: userData, 
            isAuthenticated: authStatus, 
            isLocked: lockStatus, 
            isOfflineMode: offlineMode 
        } = authData

        // Update state
        setUser(userData)
        setIsAuthenticated(authStatus)
        setIsLocked(lockStatus)
        setIsOfflineMode(offlineMode || false)

        // Reset notification subscription status when logging out
        if (!authStatus) {
            setIsSubscribedToNotifications(false)
        }

        // Update localStorage
        if (userData) {
            setStoredValue(AUTH_STORAGE_KEYS.USER, userData)
        } else {
            removeStoredValue(AUTH_STORAGE_KEYS.USER)
        }
        
        setStoredValue(AUTH_STORAGE_KEYS.IS_AUTHENTICATED, authStatus)
        setStoredValue(AUTH_STORAGE_KEYS.IS_LOCKED, lockStatus)
        setStoredValue(AUTH_STORAGE_KEYS.IS_OFFLINE_MODE, offlineMode || false)
    }

    // 🔧 Helper function to convert VAPID key
    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
    };

    // 🔔 Subscribe to push notifications (only when online)
    const subscribeToNotifications = async (label) => {
        if (!user?.id) {
            throw new Error('Admin must be logged in to subscribe');
        }

        if (!isOnline) {
            throw new Error('Must be online to subscribe to notifications');
        }

        try {
            // 1. Check if browser supports notifications
            if (!('Notification' in window) || !('serviceWorker' in navigator)) {
                throw new Error('Push notifications not supported in this browser');
            }

            // 2. Request permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Notification permission denied');
            }

            // 3. Wait for service worker to be ready
            const registration = await navigator.serviceWorker.ready;

            // 4. Get VAPID public key from environment
            const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
            if (!publicVapidKey) {
                throw new Error('VAPID public key not configured');
            }

            // 4.5 Check for existing subscription and unsubscribe if it exists
            const existingSubscription = await registration.pushManager.getSubscription();
            if (existingSubscription) {
                try {
                    await existingSubscription.unsubscribe();
                    console.log('Unsubscribed from existing push subscription');
                } catch (unsubError) {
                    console.warn('Failed to unsubscribe from existing subscription:', unsubError);
                }
            }

            // 5. Subscribe to push manager
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
            });

            // 6. Convert subscription to plain object
            const subscriptionObject = subscription.toJSON();

            // 7. Send subscription to backend using push notification service
            await pushNotificationService.subscribe(
                user.id,
                'ADMIN',
                {
                    id: '', // Will be generated by backend
                    userId: user.id,
                    type: 'ADMIN',
                    endpoint: subscriptionObject.endpoint,
                    p256dh: subscriptionObject.keys.p256dh,
                    auth: subscriptionObject.keys.auth,
                    label: label || `${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'} Device`,
                    createdAt: new Date().toISOString(),
                },
                label
            );

            setIsSubscribedToNotifications(true);

            console.log('✅ Successfully subscribed to push notifications');
            return { success: true, message: 'Successfully subscribed to notifications' };
        } catch (error) {
            console.error('❌ Error subscribing to notifications:', error);
            throw new Error(error?.message || 'Failed to subscribe to notifications');
        }
    };

    // 🔕 Unsubscribe from push notifications (current device only)
    const unsubscribeFromNotifications = async () => {
        if (!user?.id) {
            throw new Error('Admin must be logged in');
        }

        if (!isOnline) {
            throw new Error('Must be online to unsubscribe from notifications');
        }

        try {
            // 1. Unsubscribe from push manager
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            
            if (subscription) {
                const endpoint = subscription.endpoint;
                
                // Unsubscribe from browser
                await subscription.unsubscribe();

                // 2. Remove subscription from backend
                await pushNotificationService.unsubscribeDevice(
                    user.id,
                    'ADMIN',
                    endpoint
                );
            }

            setIsSubscribedToNotifications(false);

            console.log('✅ Successfully unsubscribed from push notifications');
            return { success: true, message: 'Successfully unsubscribed from notifications' };
        } catch (error) {
            console.error('❌ Error unsubscribing from notifications:', error);
            throw new Error(error?.message || 'Failed to unsubscribe from notifications');
        }
    };

    // 🔕 Unsubscribe all devices
    const unsubscribeAllDevices = async () => {
        if (!user?.id) {
            throw new Error('Admin must be logged in');
        }

        if (!isOnline) {
            throw new Error('Must be online to unsubscribe all devices');
        }

        try {
            // Remove all subscriptions from backend
            await pushNotificationService.unsubscribeAllDevices(
                user.id,
                'ADMIN'
            );

            // Also unsubscribe current device from browser
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
            }

            setIsSubscribedToNotifications(false);

            console.log('✅ Successfully unsubscribed all devices');
            return { success: true, message: 'Successfully unsubscribed all devices' };
        } catch (error) {
            console.error('❌ Error unsubscribing all devices:', error);
            throw new Error(error?.message || 'Failed to unsubscribe all devices');
        }
    };

    // 📋 Get all subscriptions for current admin
    const getSubscriptions = async () => {
        if (!user?.id) {
            throw new Error('Admin must be logged in');
        }

        if (!isOnline) {
            throw new Error('Must be online to get subscriptions');
        }

        try {
            const subscriptions = await pushNotificationService.getSubscriptions(
                user.id,
                'ADMIN'
            );
            return subscriptions;
        } catch (error) {
            console.error('❌ Error fetching subscriptions:', error);
            throw new Error(error?.message || 'Failed to fetch subscriptions');
        }
    };

    // 🔍 Check if current device is subscribed (only when online)
    const checkSubscriptionStatus = async () => {
        if (!user?.id || !isAuthenticated || !isOnline || isOfflineMode) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            
            if (subscription) {
                // Verify with backend
                const subscriptions = await pushNotificationService.getSubscriptions(
                    user.id,
                    'ADMIN'
                );
                
                const isSubscribed = subscriptions.some(
                    (sub) => sub.endpoint === subscription.endpoint
                );
                
                setIsSubscribedToNotifications(isSubscribed);
            } else {
                setIsSubscribedToNotifications(false);
            }
        } catch (error) {
            console.warn('Could not check subscription status:', error);
            setIsSubscribedToNotifications(false);
        }
    };

    const reAuthWhenOnline = async () => {
        if (!isOnline) return;

        try {
            try {
                console.log("Checking backend auth state...");
                const response = await adminAuthService.getAdminProfile();
                // If already authenticated on backend → stop
                if (response && response.id) {
                    console.log("Already authenticated online ✅");
                    return;
                }
            } catch (error) {
                // Continue to re-login attempt
            }

            // Otherwise → try to re-login using IndexedDB stored credentials
            console.log("Not authenticated, attempting re-login from IndexedDB...");

            const storedUser = getStoredValue(AUTH_STORAGE_KEYS.USER);
            if (!storedUser || !storedUser.id || !storedUser?.isOffline) {
                console.warn("No stored user found in localStorage");
                return;
            }

            // Fetch from IndexedDB by admin.id
            const adminFromDB = await db.admins_all.get(storedUser.id);
            if (!adminFromDB) {
                console.warn("Admin not found in IndexedDB");
                return;
            }

            // Decrypt password
            const decryptedPassword = await decrypt(storedUser.encryptedPassword);

            // Attempt online login
            const loginResponse = await adminAuthService.adminLogin({
                adminEmail: adminFromDB.adminEmail,
                password: decryptedPassword
            });

            if (loginResponse.authenticated) {
                console.log("Re-login successful ✅");

                // Use the user data from the login response if available; otherwise fetch profile once
                const userProfile = loginResponse.user ?? loginResponse.admin ?? await adminAuthService.getAdminProfile();

                updateAuthState({
                    user: userProfile,
                    isAuthenticated: true,
                    isLocked: false,
                    isOfflineMode: false
                });
            }
        } catch (error) {
            console.error("Error in reAuthWhenOnline:", error);
        }
    };

    useEffect(() => {
        if (isOnline) {
            reAuthWhenOnline();
        }
    }, [isOnline]);

    const login = async (data) => {
        try {
            const { adminEmail, password } = data
            let response

            if (isOnline) {
                // Try online login first
                try {
                    response = await adminAuthService.adminLogin({ adminEmail, password })

                    if (response.authenticated) {
                        // Fetch user profile after successful online login
                        try {
                            const userProfile = await adminAuthService.getAdminProfile()
                            
                            updateAuthState({
                                user: userProfile,
                                isAuthenticated: true,
                                isLocked: false,
                                isOfflineMode: false
                            })
                        } catch (profileError) {
                            console.log('Error fetching user profile after login:', profileError)
                            
                            // Still update auth status even if profile fetch fails
                            updateAuthState({
                                user: null,
                                isAuthenticated: true,
                                isLocked: false,
                                isOfflineMode: false
                            })
                        }
                    }

                    return response
                } catch (onlineError) {
                    console.log('Online login failed, attempting offline login:', onlineError)
                    // Fall through to offline login
                }
            }

            // Use offline login if online failed or if offline
            response = await adminOfflineAuthService.adminLoginOffline({ adminEmail, password })
            
            updateAuthState({
                user: {
                    ...response,
                    id: response.id,
                    adminName: response.adminName,
                    adminEmail: response.adminEmail,
                    encryptedPassword: response.encryptedPassword,
                    isOffline: true
                },
                isAuthenticated: true,
                isLocked: false,
                isOfflineMode: true
            })

            return {
                authenticated: true,
                message: response.message,
                isOffline: true
            }

        } catch (error) {
            throw new Error(error.message);
        }
    }

    const logout = async () => {
        try {
            let response = { success: true, message: 'Logged out successfully' }

            // Try online logout if we're online and not in offline mode
            if (isOnline && !isOfflineMode) {
                try {
                    response = await adminAuthService.logout()
                } catch (error) {
                    console.log('Online logout failed, proceeding with local logout:', error)
                    // Continue with local logout
                }
            }
            
            // Clear auth state and localStorage
            updateAuthState({
                user: null,
                isAuthenticated: false,
                isLocked: false,
                isOfflineMode: false
            })

            return response

        } catch (error) {
            // Still clear local state even if logout request fails
            updateAuthState({
                user: null,
                isAuthenticated: false,
                isLocked: false,
                isOfflineMode: false
            })
            throw new Error(error.message);
        }
    }

    const lockAdmin = async () => {
        try {
            let response = { success: true, message: 'Admin locked successfully' }

            // Try online lock if we're online and not in offline mode
            if (isOnline && !isOfflineMode) {
                try {
                    response = await adminAuthService.lockAdmin()
                } catch (error) {
                    console.log('Online lock failed, proceeding with local lock:', error)
                    // Continue with local lock
                }
            }
            
            updateAuthState({
                user,
                isAuthenticated,
                isLocked: true,
                isOfflineMode
            })
            
            return response
        } catch (error) {
            throw new Error(error.message);
        }
    }

    const unlockAdmin = async (password) => {
        try {
            let response = { success: true, message: 'Admin unlocked successfully' }

            // Try online unlock if we're online and not in offline mode
            if (isOnline && !isOfflineMode) {
                try {
                    response = await adminAuthService.unlockAdmin({ password })
                } catch (error) {
                    console.log('Online unlock failed, proceeding with local unlock:', error)
                    // You might want to add offline password verification here
                }
            }
            
            updateAuthState({
                user,
                isAuthenticated,
                isLocked: false,
                isOfflineMode
            })
            
            return response
        } catch (error) {
            throw new Error(error.message);
        }
    }

    const checkAuthStatus = async () => {
        setIsLoading(true)
        
        // Get stored auth data
        const storedAuth = getStoredValue(AUTH_STORAGE_KEYS.IS_AUTHENTICATED, false)
        const storedUser = getStoredValue(AUTH_STORAGE_KEYS.USER)
        const storedOfflineMode = getStoredValue(AUTH_STORAGE_KEYS.IS_OFFLINE_MODE, false)
        
        try {
            // If we're online and not in stored offline mode, try to validate with server
            if (isOnline && storedAuth && !storedOfflineMode) {
                const response = await adminAuthService.getAdminProfile()

                if (response) {
                    updateAuthState({
                        user: response,
                        isAuthenticated: true,
                        isLocked: response.isLocked || false,
                        isOfflineMode: false
                    })
                } else {
                    // Server says we're not authenticated, clear stored data
                    clearAuthStorage()
                    updateAuthState({
                        user: null,
                        isAuthenticated: false,
                        isLocked: false,
                        isOfflineMode: false
                    })
                }
            } else if (storedAuth && storedUser) {
                // Use stored data for offline mode or when online validation isn't needed
                updateAuthState({
                    user: storedUser,
                    isAuthenticated: storedAuth,
                    isLocked: getStoredValue(AUTH_STORAGE_KEYS.IS_LOCKED, false),
                    isOfflineMode: storedOfflineMode
                })
            } else {
                // No stored auth, ensure everything is cleared
                updateAuthState({
                    user: null,
                    isAuthenticated: false,
                    isLocked: false,
                    isOfflineMode: false
                })
            }

        } catch (error) {
            console.log('Error from checkAuthStatus:', error)

            const status = error?.response?.status
            
            // If we get auth-related errors, clear stored data
            if (status === 409 || status === 401 || status === 403 || status === 400) {
                clearAuthStorage()
                updateAuthState({
                    user: null,
                    isAuthenticated: false,
                    isLocked: false,
                    isOfflineMode: false
                })
            } else {
                // For network errors, keep stored data but don't update state
                // This allows offline functionality
                console.log('Network error - maintaining stored auth state')
                
                // If we have stored data, use it
                if (storedAuth && storedUser) {
                    setUser(storedUser)
                    setIsAuthenticated(storedAuth)
                    setIsLocked(getStoredValue(AUTH_STORAGE_KEYS.IS_LOCKED, false))
                    setIsOfflineMode(storedOfflineMode)
                } else {
                    updateAuthState({
                        user: null,
                        isAuthenticated: false,
                        isLocked: false,
                        isOfflineMode: false
                    })
                }
            }

        } finally {
            setIsLoading(false)
        }
    }

    const syncAdminsWhenOnline = async () => {
        if (isOnline) {
            try {
                console.log('Syncing admins data while online...')
                await adminOfflineAuthService.syncAllAdmins()
                console.log('Admins sync completed')
            } catch (error) {
                console.error('Failed to sync admins:', error)
            }
        }
    }

    // Initial auth status check
    useEffect(() => {
        checkAuthStatus()
    }, [])

    // Sync admins data when coming online
    useEffect(() => {
        if (isOnline) {
            syncAdminsWhenOnline()
        }
    }, [isOnline])

    // 🔍 Check subscription status when authenticated and online
    useEffect(() => {
        if (isAuthenticated && !isLoading && user?.id && isOnline && !isOfflineMode) {
            checkSubscriptionStatus();
        }
    }, [isAuthenticated, isLoading, user?.id, isOnline, isOfflineMode]);

    // 🔔 Auto-subscribe on login (only when online and not in offline mode)
    useEffect(() => {
        const autoSubscribe = async () => {
            // Only run if authenticated, online, not offline mode, and not already subscribed
            if (!isAuthenticated || isLoading || !user?.id || isSubscribedToNotifications || !isOnline || isOfflineMode) {
                return;
            }

            // Check if admin wants auto-subscribe
            const autoSubscribeEnabled = true;
            const client = getClientDescription();
            
            if (autoSubscribeEnabled) {
                try {
                    await subscribeToNotifications(client.description || 'Auto-subscribed device');
                } catch (error) {
                    console.warn('Auto-subscribe failed:', error);
                }
            }
        };

        autoSubscribe();
    }, [isAuthenticated, isLoading, user?.id, isSubscribedToNotifications, isOnline, isOfflineMode]);

    // Listen for online/offline events to sync when connection is restored
    useEffect(() => {
        const handleOnline = () => {
            console.log('Connection restored - checking auth status and syncing data')
            if (isAuthenticated) {
                checkAuthStatus()
            }
            syncAdminsWhenOnline()
        }

        const handleOffline = () => {
            console.log('Gone offline - auth state preserved in localStorage')
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [isAuthenticated])

    // Listen for storage changes from other tabs
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (Object.values(AUTH_STORAGE_KEYS).includes(e.key)) {
                console.log('Auth state changed in another tab')
                checkAuthStatus()
            }
        }

        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [])

    const values = {
        login,
        logout,
        lockAdmin,
        unlockAdmin,
        user,
        isLoading,
        isAuthenticated,
        isLocked,
        isOfflineMode,
        subscribeToNotifications,
        unsubscribeFromNotifications,
        unsubscribeAllDevices,
        getSubscriptions,
        isSubscribedToNotifications,
    }

    return (
        <AdminAuthContext.Provider value={values}>
            {children}
        </AdminAuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export default function useAdminAuth() {
    const context = useContext(AdminAuthContext)
    
    if (!context) {
        throw new Error('useAdminAuth must be used within AdminAuthContextProvider')
    }

    return context
}