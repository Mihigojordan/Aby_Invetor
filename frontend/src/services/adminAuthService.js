import api from '../api/api'; // Adjust the import path as needed

/**
 * Admin Auth Service
 * Handles all admin authentication-related API calls
 */
class AdminAuthService {
    /**
     * Register a new admin
     * @param {Object} adminData - Admin registration data
     * @param {string} adminData.adminName - Admin's name
     * @param {string} adminData.adminEmail - Admin's email address
     * @param {string} adminData.password - Admin's password
     * @returns {Promise<Object>} Response with success message and admin ID
     */
    async registerAdmin(adminData) {
        try {
            const response = await api.post('/admin/register', adminData);
            return response.data;
        } catch (error) {
            console.error('Error registering admin:', error);

            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to register admin';

            throw new Error(errorMessage);
        }
    }

    /**
     * Admin login
     * @param {Object} loginData - Admin login data
     * @param {string} loginData.adminEmail - Admin's email address
     * @param {string} loginData.password - Admin's password
     * @returns {Promise<Object>} Response with JWT token
     */
    async adminLogin(loginData) {
        try {
            const response = await api.post('/admin/login', loginData);
            return response.data;
        } catch (error) {
            console.error('Error logging in admin:', error);

            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to login admin';

            throw new Error(errorMessage);
        }
    }

    /**
     * Admin logout
     * @returns {Promise<Object>} Response with success message
     */
    async logout() {
        try {
            const response = await api.post('/admin/logout');
            return response.data;
        } catch (error) {
            console.error('Error logging out admin:', error);

            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to logout admin';

            throw new Error(errorMessage);
        }
    }

    /**
     * Get admin profile
     * @returns {Promise<Object|null>} Admin profile object or null if not found
     */
    async getAdminProfile() {
        try {
            const response = await api.get('/admin/profile');
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                return null; // Admin not found
            }

            console.error('Error fetching admin profile:', error);

            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to fetch admin profile';

            throw new Error(errorMessage);
        }
    }

    /**
     * Lock admin account
     * @returns {Promise<Object>} Response with success message
     */
    async lockAdmin() {
        try {
            const response = await api.post('/admin/lock');
            return response.data;
        } catch (error) {
            console.error('Error locking admin account:', error);

            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to lock admin account';

            throw new Error(errorMessage);
        }
    }

    /**
     * Unlock admin account
     * @param {Object} unlockData - Unlock data
     * @param {string} unlockData.password - Admin's password for verification
     * @returns {Promise<Object>} Response with success message
     */
    async unlockAdmin(unlockData) {
        try {
            const response = await api.post('/admin/unlock', unlockData);
            return response.data;
        } catch (error) {
            console.error('Error unlocking admin account:', error);

            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to unlock admin account';

            throw new Error(errorMessage);
        }
    }

    /**
     * Find admin by email
     * @param {string} email - Admin's email
     * @returns {Promise<Object|null>} Admin object or null if not found
     */
    async findAdminByEmail(email) {
        try {
            const response = await api.get(`/admin/by-email/${email}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                return null; // Admin not found
            }

            console.error('Error finding admin by email:', error);

            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to find admin';

            throw new Error(errorMessage);
        }
    }

    /**
     * Find admin by ID
     * @param {string} id - Admin's ID
     * @returns {Promise<Object|null>} Admin object or null if not found
     */
    async findAdminById(id) {
        try {
            const response = await api.get(`/admin/${id}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                return null; // Admin not found
            }

            console.error('Error finding admin by ID:', error);

            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to find admin';

            throw new Error(errorMessage);
        }
    }

    /**
     * Validate admin data before sending to backend
     * @param {Object} adminData - Admin data to validate
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    validateAdminData(adminData) {
        const errors = [];

        if (!adminData.adminEmail) {
            errors.push('Email is required');
        } else if (!this.isValidEmail(adminData.adminEmail)) {
            errors.push('Email format is invalid');
        }

        if (!adminData.adminName?.trim()) {
            errors.push('Name is required');
        }

        if (!adminData.password) {
            errors.push('Password is required');
        } else if (adminData.password.length < 6) {
            errors.push('Password must be at least 6 characters long');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Basic email validation
     * @param {string} email - Email to validate
     * @returns {boolean} True if email format is valid
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Create and export a singleton instance
const adminAuthService = new AdminAuthService();
export default adminAuthService;

// Named exports for individual methods if needed
export const {
    registerAdmin,
    adminLogin,
    logout,
    getAdminProfile,
    lockAdmin,
    unlockAdmin,
    findAdminByEmail,
    findAdminById,
    validateAdminData
} = adminAuthService;