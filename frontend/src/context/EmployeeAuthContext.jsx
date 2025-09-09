import { createContext, useContext, useEffect, useState } from "react";
import employeeAuthService from "../services/employeeAuthServices";
import { employeeOfflineAuthService } from "../services/offline-auth/employeeOfflineAuthService";
import { useNetworkStatusContext } from "./useNetworkContext";
import { decrypt } from "../utils/Encryption";
import { db } from "../db/database"; // your Dexie db

// eslint-disable-next-line react-refresh/only-export-components
export const EmployeeAuthContext = createContext({
    user: null,
    login: () => { },
    logout: () => { },
    lockEmployee: () => { },
    unlockEmployee: () => { },
    isAuthenticated: false,
    isLocked: false,
    isLoading: true,
    isOfflineMode: false
})

// localStorage keys
const AUTH_STORAGE_KEYS = {
    USER: 'employee_user',
    IS_AUTHENTICATED: 'employee_is_authenticated',
    IS_LOCKED: 'employee_is_locked',
    IS_OFFLINE_MODE: 'employee_is_offline_mode'
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

export const EmployeeAuthContextProvider = ({ children }) => {
    const { isOnline } = useNetworkStatusContext()
    
    // Initialize state from localStorage
    const [user, setUser] = useState(() => getStoredValue(AUTH_STORAGE_KEYS.USER))
    const [isAuthenticated, setIsAuthenticated] = useState(() => getStoredValue(AUTH_STORAGE_KEYS.IS_AUTHENTICATED, false))
    const [isLocked, setIsLocked] = useState(() => getStoredValue(AUTH_STORAGE_KEYS.IS_LOCKED, false))
    const [isOfflineMode, setIsOfflineMode] = useState(() => getStoredValue(AUTH_STORAGE_KEYS.IS_OFFLINE_MODE, false))
    const [isLoading, setIsLoading] = useState(true)

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

    const reAuthWhenOnline = async () => {
        if (!isOnline) return;

        try {
            try {
                console.log("Checking backend employee auth state...");
                const response = await employeeAuthService.getProfile();
                // If already authenticated on backend → stop
                if (response && response.employee && response.employee.id) {
                    console.log("Already authenticated online ✅");
                    return;
                }
            } catch (error) {
                // Continue to re-login attempt
            }

            // Otherwise → try to re-login using IndexedDB stored credentials
            console.log("Not authenticated, attempting employee re-login from IndexedDB...");

            const storedUser = getStoredValue(AUTH_STORAGE_KEYS.USER);
            if (!storedUser || !storedUser.id || !storedUser?.isOffline) {
                console.warn("No stored employee user found in localStorage");
                return;
            }

            // Fetch from IndexedDB by employee.id
            const employeeFromDB = await db.employees_all.get(storedUser.id);
            if (!employeeFromDB) {
                console.warn("Employee not found in IndexedDB");
                return;
            }

            // Decrypt password
            const decryptedPassword = await decrypt(storedUser.encryptedPassword);

            // Attempt online login
            const loginResponse = await employeeAuthService.login({
                email: employeeFromDB.email,
                password: decryptedPassword
            });

            if (loginResponse.authenticated) {
                console.log("Employee re-login successful ✅");

                // Refresh user profile
                const userProfile = await employeeAuthService.getProfile();

                updateAuthState({
                    user: userProfile.employee,
                    isAuthenticated: true,
                    isLocked: userProfile.employee?.isLocked || false,
                    isOfflineMode: false
                });
            }
        } catch (error) {
            console.error("Error in employee reAuthWhenOnline:", error);
        }
    };

    useEffect(() => {
        if (isOnline) {
            reAuthWhenOnline();
        }
    }, [isOnline]);

    const login = async (data) => {
        try {
            const { email, password } = data
            let response

            if (isOnline) {
                // Try online login first
                try {
                    response = await employeeAuthService.login({ email, password })

                    if (response.authenticated) {
                        // Fetch user profile after successful online login
                        try {
                            const userProfile = await employeeAuthService.getProfile()
                            
                            updateAuthState({
                                user: userProfile.employee,
                                isAuthenticated: true,
                                isLocked: userProfile.employee?.isLocked || false,
                                isOfflineMode: false
                            })
                        } catch (profileError) {
                            console.log('Error fetching employee profile after login:', profileError)
                            // Still update auth status even if profile fetch fails
                            updateAuthState({
                                user: null,
                                isAuthenticated: true,
                                isLocked: false,
                                isOfflineMode: false
                            })
                            return profileError
                        }
                    }

                    return response
                } catch (onlineError) {
                    console.log('Online employee login failed, attempting offline login:', onlineError)
                    // Fall through to offline login
                }
            }

            // Use offline login if online failed or if offline
            response = await employeeOfflineAuthService.employeeLoginOffline({ email, password })
            
            updateAuthState({
                user: {
                    ...response,
                    id: response.id,
                    firstname: response.firstname,
                    lastname: response.lastname,
                    email: response.email,
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
                    response = await employeeAuthService.logout()
                } catch (error) {
                    console.log('Online employee logout failed, proceeding with local logout:', error)
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

    const lockEmployee = async () => {
        try {
            let response = { success: true, message: 'Employee locked successfully' }

            // Try online lock if we're online and not in offline mode
            if (isOnline && !isOfflineMode) {
                try {
                    response = await employeeAuthService.lockAccount()
                } catch (error) {
                    console.log('Online employee lock failed, proceeding with local lock:', error)
                    // Continue with local lock
                }
            }
            
            updateAuthState({
                user: { ...user, isLocked: true },
                isAuthenticated,
                isLocked: true,
                isOfflineMode
            })
            
            return response
        } catch (error) {
            throw new Error(error.message);
        }
    }

    const unlockEmployee = async (password) => {
        try {
            let response = { success: true, message: 'Employee unlocked successfully' }

            // Try online unlock if we're online and not in offline mode
            if (isOnline && !isOfflineMode) {
                try {
                    response = await employeeAuthService.unlockAccount({ password })
                } catch (error) {
                    console.log('Online employee unlock failed, proceeding with local unlock:', error)
                    // You might want to add offline password verification here
                }
            }
            
            updateAuthState({
                user: { ...user, isLocked: false },
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
                const response = await employeeAuthService.getProfile()

                if (response && response.employee) {
                    updateAuthState({
                        user: response.employee,
                        isAuthenticated: true,
                        isLocked: response.employee?.isLocked || false,
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
            console.log('Error from employee checkAuthStatus:', error)

            const status = error?.response?.status || error?.status
            
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
                console.log('Network error - maintaining stored employee auth state')
                
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

    const syncEmployeesWhenOnline = async () => {
        if (isOnline) {
            try {
                console.log('Syncing employees data while online...')
                await employeeOfflineAuthService.syncAllEmployees()
                console.log('Employees sync completed')
            } catch (error) {
                console.error('Failed to sync employees:', error)
            }
        }
    }

    // Initial auth status check
    useEffect(() => {
        checkAuthStatus()
    }, [])

    // Sync employees data when coming online
    useEffect(() => {
        if (isOnline) {
            syncEmployeesWhenOnline()
        }
    }, [isOnline])

    // Listen for online/offline events to sync when connection is restored
    useEffect(() => {
        const handleOnline = () => {
            console.log('Connection restored - checking employee auth status and syncing data')
            if (isAuthenticated) {
                checkAuthStatus()
            }
            syncEmployeesWhenOnline()
        }

        const handleOffline = () => {
            console.log('Gone offline - employee auth state preserved in localStorage')
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
                console.log('Employee auth state changed in another tab')
                checkAuthStatus()
            }
        }

        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [])

    const values = {
        login,
        logout,
        lockEmployee,
        unlockEmployee,
        user,
        isLoading,
        isAuthenticated,
        isLocked,
        isOfflineMode
    }

    return (
        <EmployeeAuthContext.Provider value={values}>
            {children}
        </EmployeeAuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export default function useEmployeeAuth() {
    const context = useContext(EmployeeAuthContext)
    
    if (!context) {
        throw new Error('useEmployeeAuth must be used within EmployeeAuthContextProvider')
    }

    return context
}