import api from '../api/api'; // Assuming this is your axios instance file

/**
 * Employee Authentication Service
 * Handles all authentication-related operations for employees
 */
class EmployeeAuthService {
  
  /**
   * Login employee
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - Employee email
   * @param {string} credentials.password - Employee password
   * @returns {Promise<Object>} Login response
   */
  async login(credentials) {
    try {
      const response = await api.post('/employee/auth/login', credentials);
      return {
        success: true,
        message: response.data.message,
        authenticated: response.data.authenticated,
        data: response.data
      };
    } catch (error) {
      console.error('Login error:', error);
      throw {
        success: false,
        message: error.response?.data?.message || 'Login failed',
        status: error.response?.status || 500,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Logout employee
   * @returns {Promise<Object>} Logout response
   */
  async logout() {
    try {
      const response = await api.post('/employee/auth/logout');
      return {
        success: true,
        message: response.data.message,
        data: response.data
      };
    } catch (error) {
      console.error('Logout error:', error);
      throw {
        success: false,
        message: error.response?.data?.message || 'Logout failed',
        status: error.response?.status || 500,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Get employee profile
   * @returns {Promise<Object>} Employee profile data
   */
  async getProfile() {
    try {
      const response = await api.get('/employee/auth/profile');
      return {
        success: true,
        data: response.data,
        employee: response.data
      };
    } catch (error) {
      console.error('Get profile error:', error);
      throw {
        success: false,
        message: error.response?.data?.message || 'Failed to get profile',
        status: error.response?.status || 500,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Lock employee account
   * @returns {Promise<Object>} Lock response
   */
  async lockAccount() {
    try {
      const response = await api.post('/employee/auth/lock');
      return {
        success: true,
        message: response.data.message,
        data: response.data
      };
    } catch (error) {
      console.error('Lock account error:', error);
      throw {
        success: false,
        message: error.response?.data?.message || 'Failed to lock account',
        status: error.response?.status || 500,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Unlock employee account
   * @param {Object} unlockData - Unlock data
   * @param {string} unlockData.password - Employee password for verification
   * @returns {Promise<Object>} Unlock response
   */
  async unlockAccount(unlockData) {
    try {
      const response = await api.post('/employee/auth/unlock', unlockData);
      return {
        success: true,
        message: response.data.message,
        data: response.data
      };
    } catch (error) {
      console.error('Unlock account error:', error);
      throw {
        success: false,
        message: error.response?.data?.message || 'Failed to unlock account',
        status: error.response?.status || 500,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Check if employee is authenticated by trying to get profile
   * @returns {Promise<boolean>} Authentication status
   */
  async isAuthenticated() {
    try {
      await this.getProfile();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Email validity
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  validatePassword(password) {
    const minLength = 6;
    const isValid = password && password.length >= minLength;
    
    return {
      isValid,
      message: isValid ? 'Password is valid' : `Password must be at least ${minLength} characters long`
    };
  }

  /**
   * Validate login credentials
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - Employee email
   * @param {string} credentials.password - Employee password
   * @returns {Object} Validation result
   */
  validateLoginCredentials(credentials) {
    const errors = [];

    if (!credentials.email) {
      errors.push('Email is required');
    } else if (!this.validateEmail(credentials.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!credentials.password) {
      errors.push('Password is required');
    } else {
      const passwordValidation = this.validatePassword(credentials.password);
      if (!passwordValidation.isValid) {
        errors.push(passwordValidation.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Create and export a singleton instance
const employeeAuthService = new EmployeeAuthService();

export default employeeAuthService;

// Also export the class if you need to create multiple instances
export { EmployeeAuthService };