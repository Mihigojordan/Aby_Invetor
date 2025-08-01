import { createContext, useContext, useEffect, useState } from "react";
import employeeAuthService from "../services/employeeAuthServices";

export const EmployeeAuthContext = createContext({
    user: null,
    login: () => { },
    logout: () => { },
    lockEmployee: () => { },
    unlockEmployee: () => { },
    isAuthenticated: false,
    isLocked: false,
    isLoading: true
})

// localStorage keys
const AUTH_STORAGE_KEYS = {
    USER: 'employee_user',
    IS_AUTHENTICATED: 'employee_is_authenticated',
    IS_LOCKED: 'employee_is_locked'
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
    // Initialize state from localStorage
    const [user, setUser] = useState(() => getStoredValue(AUTH_STORAGE_KEYS.USER))
    const [isAuthenticated, setIsAuthenticated] = useState(() => getStoredValue(AUTH_STORAGE_KEYS.IS_AUTHENTICATED, false))
    const [isLocked, setIsLocked] = useState(() => getStoredValue(AUTH_STORAGE_KEYS.IS_LOCKED, false))
    const [isLoading, setIsLoading] = useState(true)

    // Helper function to update state and localStorage
    const updateAuthState = (authData) => {
        const { user: userData, isAuthenticated: authStatus, isLocked: lockStatus } = authData

        // Update state
        setUser(userData)
        setIsAuthenticated(authStatus)
        setIsLocked(lockStatus)

        // Update localStorage
        if (userData) {
            setStoredValue(AUTH_STORAGE_KEYS.USER, userData)
        } else {
            removeStoredValue(AUTH_STORAGE_KEYS.USER)
        }
        
        setStoredValue(AUTH_STORAGE_KEYS.IS_AUTHENTICATED, authStatus)
        setStoredValue(AUTH_STORAGE_KEYS.IS_LOCKED, lockStatus)
    }

    const login = async (data) => {
        try {
            const { email, password } = data
            const response = await employeeAuthService.login({ email, password })

            if (response.authenticated) {
                // Fetch user profile after successful login
                try {
                    const userProfile = await employeeAuthService.getProfile()
                    
                    updateAuthState({
                        user: userProfile.employee,
                        isAuthenticated: true,
                        isLocked: userProfile.employee?.isLocked || false
                    })
                } catch (profileError) {
                    console.log('Error fetching user profile after login:', profileError)
                    
                    // Still update auth status even if profile fetch fails
                    updateAuthState({
                        user: null,
                        isAuthenticated: true,
                        isLocked: false
                    })
                }
            }

            return response

        } catch (error) {
            throw new Error(error.message);
        }
    }

    const logout = async () => {
        try {
            const response = await employeeAuthService.logout()
            
            // Clear auth state and localStorage
            updateAuthState({
                user: null,
                isAuthenticated: false,
                isLocked: false
            })

            return response

        } catch (error) {
            // Still clear local state even if logout request fails
            updateAuthState({
                user: null,
                isAuthenticated: false,
                isLocked: false
            })
            throw new Error(error.message);
        }
    }

    const lockEmployee = async () => {
        try {
            const response = await employeeAuthService.lockAccount()
            
            updateAuthState({
                user: { ...user, isLocked: true },
                isAuthenticated,
                isLocked: true
            })
            
            return response
        } catch (error) {
            throw new Error(error.message);
        }
    }

    const unlockEmployee = async (password) => {
        try {
            const response = await employeeAuthService.unlockAccount({ password })
            
            updateAuthState({
                user: { ...user, isLocked: false },
                isAuthenticated,
                isLocked: false
            })
            
            return response
        } catch (error) {
            throw new Error(error.message);
        }
    }

    const checkAuthStatus = async () => {
        setIsLoading(true)
        
        // If we have stored auth data, try to validate it with the server
        const storedAuth = getStoredValue(AUTH_STORAGE_KEYS.IS_AUTHENTICATED, false)
        const storedUser = getStoredValue(AUTH_STORAGE_KEYS.USER)
        
        try {
            // Always try to fetch fresh profile data if we think we're authenticated
            if (storedAuth) {
                const response = await employeeAuthService.getProfile()

                if (response.success && response.employee) {
                    updateAuthState({
                        user: response.employee,
                        isAuthenticated: true,
                        isLocked: response.employee.isLocked || false
                    })
                } else {
                    // Server says we're not authenticated, clear stored data
                    clearAuthStorage()
                    updateAuthState({
                        user: null,
                        isAuthenticated: false,
                        isLocked: false
                    })
                }
            } else {
                // No stored auth, ensure everything is cleared
                updateAuthState({
                    user: null,
                    isAuthenticated: false,
                    isLocked: false
                })
            }

        } catch (error) {
            console.log('Error from checkAuthStatus:', error)

            const status = error?.status
            
            // If we get auth-related errors, clear stored data
            if (status === 409 || status === 401 || status === 403 || status === 400) {
                clearAuthStorage()
                updateAuthState({
                    user: null,
                    isAuthenticated: false,
                    isLocked: false
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
                } else {
                    updateAuthState({
                        user: null,
                        isAuthenticated: false,
                        isLocked: false
                    })
                }
            }

        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        checkAuthStatus()
    }, [])

    // Optional: Listen for online/offline events to sync when connection is restored
    useEffect(() => {
        const handleOnline = () => {
            console.log('Connection restored - checking employee auth status')
            if (isAuthenticated) {
                checkAuthStatus()
            }
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

    // Optional: Listen for storage changes from other tabs
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
        isLocked
    }

    return (
        <EmployeeAuthContext.Provider value={values}>
            {children}
        </EmployeeAuthContext.Provider>
    )
}

export default function useEmployeeAuth() {
    const context = useContext(EmployeeAuthContext)
    
    if (!context) {
        throw new Error('useEmployeeAuth must be used within EmployeeAuthContextProvider')
    }

    return context
}