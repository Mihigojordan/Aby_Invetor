// services/employeeService.js
import api from '../api/api'; // Adjust the import path as needed

/**
 * Employee Service
 * Handles all employee-related API calls
 */
class EmployeeService {
  /**
   * Register a new employee
   * @param {Object} employeeData - Employee registration data
   * @param {string} employeeData.firstname - Employee's first name
   * @param {string} employeeData.lastname - Employee's last name
   * @param {string} employeeData.email - Employee's email address
   * @param {string} employeeData.phoneNumber - Employee's phone number
   * @param {string} employeeData.address - Employee's address
   * @returns {Promise<Object>} Response with success message and created employee
   */
  async registerEmployee(employeeData) {
    try {
      const response = await api.post('/employee/register', employeeData);
      return response.data;
    } catch (error) {
      console.error('Error registering employee:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
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
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch employees';
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
        error.response?.data?.message ||
        error.response?.data?.error ||
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
      if (error.response?.status === 404) {
        return null; // Employee not found
      }
      console.error('Error finding employee by email:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
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
      if (error.response?.status === 404) {
        return null; // Employee not found
      }
      console.error('Error finding employee by ID:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to find employee';
      throw new Error(errorMessage);
    }
  }

  /**
   * Update an employee
   * @param {string} id - Employee's ID
   * @param {Object} employeeData - Employee update data
   * @param {string} [employeeData.firstname] - Employee's first name
   * @param {string} [employeeData.lastname] - Employee's last name
   * @param {string} [employeeData.email] - Employee's email address
   * @param {string} [employeeData.phoneNumber] - Employee's phone number
   * @param {string} [employeeData.address] - Employee's address
   * @returns {Promise<Object>} Response with success message and updated employee
   */
  async updateEmployee(id, employeeData) {
    try {
      const response = await api.put(`/employee/update/${id}`, employeeData);
      return response.data;
    } catch (error) {
      console.error('Error updating employee:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
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
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to delete employee';
      throw new Error(errorMessage);
    }
  }

  /**
   * Validate employee data before sending to backend
   * @param {Object} employeeData - Employee data to validate
   * @returns {Object} Validation result with isValid boolean and errors array
   */
  validateEmployeeData(employeeData) {
    const errors = [];

    if (!employeeData.email) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(employeeData.email)) {
      errors.push('Email format is invalid');
    }

    if (!employeeData.phoneNumber) {
      errors.push('Phone number is required');
    }

    if (!employeeData.firstname?.trim()) {
      errors.push('First name is required');
    }

    if (!employeeData.lastname?.trim()) {
      errors.push('Last name is required');
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
  validateEmployeeData
} = employeeService;