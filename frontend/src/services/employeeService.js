// Updated employeeService.js to handle file uploads with your existing API structure
import api from '../api/api'; // Using your existing API instance

/**
 * Employee Service
 * Handles all employee-related API calls including file uploads
 */
class EmployeeService {
    /**
     * Register a new employee with optional file uploads
     * @param {FormData|Object} employeeData - Employee registration data (FormData for files, Object for regular data)
     * @returns {Promise<Object>} Response with success message and created employee
     */
    async registerEmployee(employeeData) {
        try {
            let response;

            if (employeeData instanceof FormData) {
                // Handle file uploads with FormData
                response = await api.post('/employee/register', employeeData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            } else {
                // Handle regular JSON data
                response = await api.post('/employee/register', employeeData);
            }

            return response.data;
        } catch (error) {
            console.error('Error registering employee:', error);
            const errorMessage =
                error.response.data.message ||
                error.response.data.error ||
                error.message ||
                'Failed to register employee';
            throw new Error(errorMessage);
        }
    }

    /**
     * Get all employees
     * @returns {Promise<Array>} Array of all employees with their tasks
     */
    async getAllEmployees() {
        try {
            const response = await api.get('/employee/all');
            return response.data;
        } catch (error) {
            console.error('Error fetching employees:', error);
            const errorMessage =
                error.response.data.message ||
                error.response.data.error ||
                error.message ||
                'Failed to fetch employees';
            throw new Error(errorMessage);
        }
    }

    /**
     * Get activities for a specific employee
     * @param {string} id - Employee's ID
     * @returns {Promise<Array>} Array of activities for the employee
     */
    async getActivityByEmployeeId() {
        try {
            const response = await api.get(`/employee/activity`);
            return response.data || [];
        } catch (error) {
            console.error('Error fetching employee activities:', error);
            const errorMessage =
                error.response.data.message ||
                error.response.data.error ||
                error.message ||
                'Failed to fetch employee activities';
            throw new Error(errorMessage);
        }
    }

    /**
     * Get activities for a specific employee
     * @param {string} id - Employee's ID
     * @returns {Promise<Array>} Array of activities for the employee
     */
    async getActivityByEmployeeIdWithOutGuard(id) {
        try {
            const response = await api.get(`/employee/activity/${id}`);
            return response.data || [];
        } catch (error) {
            console.error('Error fetching employee activities:', error);
            const errorMessage =
                error.response.data.message ||
                error.response.data.error ||
                error.message ||
                'Failed to fetch employee activities';
            throw new Error(errorMessage);
        }
    }

    /**
     * Update an employee with optional file uploads
     * @param {string} id - Employee's ID
     * @param {FormData|Object} employeeData - Employee update data
     * @returns {Promise<Object>} Response with success message and updated employee
     */
    async updateEmployee(id, employeeData) {
        try {
            let response;

            if (employeeData instanceof FormData) {
                // Handle file uploads with FormData
                response = await api.put(`/employee/update/${id}`, employeeData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            } else {
                // Handle regular JSON data
                response = await api.put(`/employee/update/${id}`, employeeData);
            }

            return response.data;
        } catch (error) {
            console.error('Error updating employee:', error);
            const errorMessage =
                error.response.data.message ||
                error.response.data.error ||
                error.message ||
                'Failed to update employee';
            throw new Error(errorMessage);
        }
    }

    /**
     * Delete an employee
     * @param {string} id - Employee's ID
     * @returns {Promise<Object>} Response with success message
     */
    async deleteEmployee(id) {
        try {
            const response = await api.delete(`/employee/delete/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting employee:', error);
            const errorMessage =
                error.response.data.message ||
                error.response.data.error ||
                error.message ||
                'Failed to delete employee';
            throw new Error(errorMessage);
        }
    }

    /**
     * Assign tasks to an employee
     * @param {Object} assignmentData - Task assignment data
     * @param {string} assignmentData.employeeId - ID of the employee
     * @param {string[]} assignmentData.assignedTasks - Array of task IDs to assign
     * @returns {Promise<Object>} Response with success message and updated employee
     */
    async assignTasksToEmployee(assignmentData) {
        try {
            const response = await api.post('/employee/assign-task', assignmentData);
            return response.data;
        } catch (error) {
            console.error('Error assigning tasks to employee:', error);
            const errorMessage =
                error.response.data.message ||
                error.response.data.error ||
                error.message ||
                'Failed to assign tasks to employee';
            throw new Error(errorMessage);
        }
    }

    /**
     * Find employee by email
     * @param {string} email - Employee's email
     * @returns {Promise<Object|null>} Employee object or null if not found
     */
    async findEmployeeByEmail(email) {
        try {
            const response = await api.get(`/employee/by-email/${email}`);
            return response.data;
        } catch (error) {
            if (error.response.status === 404) {
                return null; // Employee not found
            }
            console.error('Error finding employee by email:', error);
            const errorMessage =
                error.response.data.message ||
                error.response.data.error ||
                error.message ||
                'Failed to find employee';
            throw new Error(errorMessage);
        }
    }

    /**
     * Find employee by ID
     * @param {string} id - Employee's ID
     * @returns {Promise<Object|null>} Employee object or null if not found
     */
    async findEmployeeById(id) {
        try {
            const response = await api.get(`/employee/${id}`);
            return response.data;
        } catch (error) {
            if (error.response.status === 404) {
                return null; // Employee not found
            }
            console.error('Error finding employee by ID:', error);
            const errorMessage =
                error.response.data.message ||
                error.response.data.error ||
                error.message ||
                'Failed to find employee';
            throw new Error(errorMessage);
        }
    }

    /**
     * Validate employee data before sending to backend
     * @param {Object|FormData} employeeData - Employee data to validate
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    validateEmployeeData(employeeData) {
        const errors = [];

        // Convert FormData to object for validation if needed
        let dataToValidate = {};
        if (employeeData instanceof FormData) {
            for (let [key, value] of employeeData.entries()) {
                if (!(value instanceof File)) {
                    dataToValidate[key] = value;
                }
            }
        } else {
            dataToValidate = employeeData;
        }

        if (!dataToValidate.firstname.trim()) {
            errors.push('First name is required');
        }

        if (!dataToValidate.lastname.trim()) {
            errors.push('Last name is required');
        }

        if (!dataToValidate.email) {
            errors.push('Email is required');
        } else if (!this.isValidEmail(dataToValidate.email)) {
            errors.push('Email format is invalid');
        }

        if (!dataToValidate.phoneNumber) {
            errors.push('Phone number is required');
        }

        if (!dataToValidate.address.trim()) {
            errors.push('Address is required');
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

    /**
     * Download file helper
     * @param {string} fileUrl - URL of the file to download
     * @param {string} fileName - Name for the downloaded file
     */
    async downloadFile(fileUrl, fileName) {
        try {
            const response = await api.get(fileUrl, {
                responseType: 'blob',
            });

            const blob = response.data;
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
            throw new Error('Failed to download file');
        }
    }

    /**
     * Get file URL for display
     * @param {string} filePath - Server file path
     * @returns {string} Full URL for file access
     */
    getFileUrl(filePath) {
        if (!filePath) return null;

        // If it's already a full URL, return as is
        if (filePath.startsWith('http')) {
            return filePath;
        }


        // Construct full URL from your API base
        const baseUrl = api.defaults.baseURL || '';
        return `${baseUrl}${filePath}`;
    }
}

// Create and export a singleton instance
const employeeService = new EmployeeService();
export default employeeService;

// Named exports for individual methods
export const {
    registerEmployee,
    getAllEmployees,
    assignTasksToEmployee,
    findEmployeeByEmail,
    findEmployeeById,
    updateEmployee,
    deleteEmployee,
    validateEmployeeData,
    downloadFile,
    getFileUrl
} = employeeService;