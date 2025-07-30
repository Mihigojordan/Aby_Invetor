import { createContext, useContext, useEffect, useState } from "react";
import adminAuthService from "../services/adminAuthService";

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

    const login = async (data) => {
        try {
            const { adminEmail, password } = data
            const response = await adminAuthService.adminLogin({ adminEmail, password })

            if (response.authenticated) {
                setIsAuthenticated(response.authenticated)
                setIsLocked(false) // Reset lock state on login
                
                // Fetch user profile after successful login
                try {
                    const userProfile = await adminAuthService.getAdminProfile()
                    setUser(userProfile)
                } catch (profileError) {
                    console.log('Error fetching user profile after login:', profileError)
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
            
            setIsAuthenticated(false)
            setIsLocked(false)
            setUser(null)

            return response

        } catch (error) {
            // Still clear local state even if logout request fails
            setIsAuthenticated(false)
            setIsLocked(false)
            setUser(null)
            throw new Error(error.message);
        }
    }

    const lockAdmin = async () => {
        try {
            const response = await adminAuthService.lockAdmin()
            setIsLocked(true)
            return response
        } catch (error) {
            throw new Error(error.message);
        }
    }

    const unlockAdmin = async (password) => {
        try {
            const response = await adminAuthService.unlockAdmin({ password })
            setIsLocked(false)
            return response
        } catch (error) {
            throw new Error(error.message);
        }
    }

    const checkAuthStatus = async () => {
        setIsLoading(true)
        try {
            const response = await adminAuthService.getAdminProfile()

            if (response) {
                setIsAuthenticated(true)
                setUser(response)
                // Check if user is locked (you might need to add this field to your backend response)
                setIsLocked(response.isLocked || false)
            } else {
                setIsAuthenticated(false)
                setUser(null)
                setIsLocked(false)
            }

        } catch (error) {
            console.log('Error from checkAuthStatus:', error)

            const status = error?.response?.status
            if (status === 409 || status === 401 || status === 403 || status === 400) {
                setIsAuthenticated(false)
                setUser(null)
                setIsLocked(false)
            } else {
                setIsAuthenticated(false)
                setUser(null)
                setIsLocked(false)
            }

        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        checkAuthStatus()
    }, [])

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