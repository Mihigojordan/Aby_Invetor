import { createContext, useContext, useEffect, useState } from "react";
import adminAuthService from "../services/adminAuthService";
import { AuthSessionService, AdminService } from "../db";

export const AdminAuthContext = createContext({
    user: null,
    login: () => { },
    logout: () => { },
    lockAdmin: () => { },
    unlockAdmin: () => { },
    isAuthenticated: false,
    isLocked: false,
    isLoading: true
})

export const AdminAuthContextProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLocked, setIsLocked] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Helper function to update state and IndexedDB
    const updateAuthState = async (authData) => {
        const { user: userData, isAuthenticated: authStatus, isLocked: lockStatus } = authData

        try {
            // Update state
            setUser(userData)
            setIsAuthenticated(authStatus)
            setIsLocked(lockStatus)

            // Update IndexedDB
            await AuthSessionService.setAuthData(AuthSessionService.KEYS.CURRENT_USER, userData)
            await AuthSessionService.setAuthData(AuthSessionService.KEYS.IS_AUTHENTICATED, authStatus)
            await AuthSessionService.setAuthData(AuthSessionService.KEYS.IS_LOCKED, lockStatus)
            
            // Update last activity
            if (authStatus) {
                await AuthSessionService.updateLastActivity()
            }

            // If we have user data, also store/update in admins table
            if (userData && userData.id) {
                try {
                    const existingAdmin = await AdminService.getAdminById(userData.id)
                    if (existingAdmin) {
                        // Update existing admin data
                        await AdminService.updateAdmin(userData.id, {
                            adminName: userData.adminName,
                            adminEmail: userData.adminEmail,
                            isLocked: lockStatus
                        })
                    } else {
                        // Create new admin record (sync from server)
                        await AdminService.createAdmin({
                            id: userData.id,
                            adminName: userData.adminName,
                            adminEmail: userData.adminEmail,
                            isLocked: lockStatus
                        })
                    }
                } catch (dbError) {
                    console.log('Error updating admin in IndexedDB:', dbError)
                }
            }

        } catch (error) {
            console.error('Error updating auth state in IndexedDB:', error)
        }
    }

    // Helper function to load auth state from IndexedDB
    const loadAuthStateFromDB = async () => {
        try {
            const storedUser = await AuthSessionService.getAuthData(AuthSessionService.KEYS.CURRENT_USER)
            const storedAuth = await AuthSessionService.getAuthData(AuthSessionService.KEYS.IS_AUTHENTICATED) || false
            const storedLocked = await AuthSessionService.getAuthData(AuthSessionService.KEYS.IS_LOCKED) || false

            return {
                user: storedUser,
                isAuthenticated: storedAuth,
                isLocked: storedLocked
            }
        } catch (error) {
            console.error('Error loading auth state from IndexedDB:', error)
            return {
                user: null,
                isAuthenticated: false,
                isLocked: false
            }
        }
    }

    const login = async (data) => {
        try {
            const { adminEmail, password } = data
            const response = await adminAuthService.adminLogin({ adminEmail, password })

            if (response.authenticated) {
                // Fetch user profile after successful login
                try {
                    const userProfile = await adminAuthService.getAdminProfile()
                    
                    await updateAuthState({
                        user: userProfile,
                        isAuthenticated: true,
                        isLocked: false
                    })
                } catch (profileError) {
                    console.log('Error fetching user profile after login:', profileError)
                    
                    // Still update auth status even if profile fetch fails
                    await updateAuthState({
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
            const response = await adminAuthService.logout()
            
            // Clear auth state and IndexedDB
            await updateAuthState({
                user: null,
                isAuthenticated: false,
                isLocked: false
            })

            // Clear all auth session data
            await AuthSessionService.clearAuthSession()

            return response

        } catch (error) {
            // Still clear local state even if logout request fails
            await updateAuthState({
                user: null,
                isAuthenticated: false,
                isLocked: false
            })
            
            await AuthSessionService.clearAuthSession()
            throw new Error(error.message);
        }
    }

    const lockAdmin = async () => {
        try {
            const response = await adminAuthService.lockAdmin()
            
            await updateAuthState({
                user,
                isAuthenticated,
                isLocked: true
            })
            
            // Also update the admin record in IndexedDB
            if (user && user.id) {
                await AdminService.lockAdmin(user.id)
            }
            
            return response
        } catch (error) {
            throw new Error(error.message);
        }
    }

    const unlockAdmin = async (password) => {
        try {
            const response = await adminAuthService.unlockAdmin({ password })
            
            await updateAuthState({
                user,
                isAuthenticated,
                isLocked: false
            })
            
            // Also update the admin record in IndexedDB
            if (user && user.id) {
                await AdminService.unlockAdmin(user.id)
            }
            
            return response
        } catch (error) {
            throw new Error(error.message);
        }
    }

    const checkAuthStatus = async () => {
        setIsLoading(true)
        
        try {
            // Load stored auth data from IndexedDB
            const storedAuthData = await loadAuthStateFromDB()
            
            // Check if session is expired (optional)
            // const isExpired = await AuthSessionService.isSessionExpired()
            
            // If we have stored auth data, try to validate it with the server
            if (storedAuthData.isAuthenticated) {
                try {
                    const response = await adminAuthService.getAdminProfile()

                    if (response) {
                        await updateAuthState({
                            user: response,
                            isAuthenticated: true,
                            isLocked: response.isLocked || false
                        })
                    } else {
                        // Server says we're not authenticated, clear stored data
                        await AuthSessionService.clearAuthSession()
                        await updateAuthState({
                            user: null,
                            isAuthenticated: false,
                            isLocked: false
                        })
                    }
                } catch (serverError) {
                    console.log('Error validating auth with server:', serverError)

                    const status = serverError?.response?.status
                    
                    // If we get auth-related errors, clear stored data
                    if (status === 409 || status === 401 || status === 403 || status === 400) {
                        await AuthSessionService.clearAuthSession()
                        await updateAuthState({
                            user: null,
                            isAuthenticated: false,
                            isLocked: false
                        })
                    } else {
                        // For network errors, keep stored data for offline functionality
                        console.log('Network error - maintaining stored auth state')
                        setUser(storedAuthData.user)
                        setIsAuthenticated(storedAuthData.isAuthenticated)
                        setIsLocked(storedAuthData.isLocked)
                    }
                }
            } else {
                // No stored auth, ensure everything is cleared
                await updateAuthState({
                    user: null,
                    isAuthenticated: false,
                    isLocked: false
                })
            }

        } catch (error) {
            console.error('Error in checkAuthStatus:', error)
            // Fallback to cleared state
            await updateAuthState({
                user: null,
                isAuthenticated: false,
                isLocked: false
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        checkAuthStatus()
    }, [])

    // Listen for online/offline events to sync when connection is restored
    useEffect(() => {
        const handleOnline = () => {
            console.log('Connection restored - checking auth status')
            if (isAuthenticated) {
                checkAuthStatus()
            }
        }

        const handleOffline = () => {
            console.log('Gone offline - auth state preserved in IndexedDB')
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [isAuthenticated])

    // Optional: Periodically update last activity when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            const activityInterval = setInterval(async () => {
                await AuthSessionService.updateLastActivity()
            }, 5 * 60 * 1000) // Update every 5 minutes

            return () => clearInterval(activityInterval)
        }
    }, [isAuthenticated])

    const values = {
        login,
        logout,
        lockAdmin,
        unlockAdmin,
        user,
        isLoading,
        isAuthenticated,
        isLocked
    }

    return (
        <AdminAuthContext.Provider value={values}>
            {children}
        </AdminAuthContext.Provider>
    )
}

export default function useAdminAuth() {
    const context = useContext(AdminAuthContext)
    
    if (!context) {
        throw new Error('useAdminAuth must be used within AdminAuthContextProvider')
    }

    return context
}