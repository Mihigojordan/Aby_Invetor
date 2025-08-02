import api from '../api/api'; // Adjust the import path as needed

/**
 * SalesReturn Service for Frontend
 * Provides methods to interact with SalesReturn API endpoints using axios
 * Supports bulk sales return processing
 */
class SalesReturnService {
  /**
   * Create sales return entries in bulk
   * @param {Object} returnData - Sales return data
   * @param {Array} returnData.returns - Array of return objects
   * @param {string} returnData.returns[].transactionId - Transaction ID (required)
   * @param {string} [returnData.returns[].reason] - Reason for return (optional)
   * @param {Date} [returnData.returns[].createdAt] - Return creation date (optional)
   * @param {string} [returnData.adminId] - Admin ID (optional)
   * @param {string} [returnData.employeeId] - Employee ID (optional)
   * @returns {Promise<Object>} Processing result with success and error details
   */
  async createSalesReturn(returnData) {
    try {
      // Validate required fields
      if (!returnData.returns || !Array.isArray(returnData.returns) || returnData.returns.length === 0) {
        throw new Error('At least one return is required');
      }

      for (const returnItem of returnData.returns) {
        if (!returnItem.transactionId) {
          throw new Error('Transaction ID is required for each return');
        }
      }

      // Format request data
      const requestData = {
        returns: returnData.returns.map(item => ({
          transactionId: item.transactionId,
          reason: item.reason || undefined,
          createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
        })),
        adminId: returnData.adminId || undefined,
        employeeId: returnData.employeeId || undefined,
      };

      const response = await api.post('/sales-return/create', requestData);
      return response.data;
    } catch (error) {
      console.error('Error creating sales return:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create sales return');
    }
  }

  /**
   * Get all sales return entries
   * @returns {Promise<Object>} Object containing array of sales return entries
   */
  async getAllSalesReturns() {
    try {
      const response = await api.get('/sales-return');
      return response.data;
    } catch (error) {
      console.error('Error fetching all sales returns:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch sales returns');
    }
  }

  /**
   * Get a single sales return entry by ID
   * @param {string} id - Sales return entry ID
   * @returns {Promise<Object>} Sales return entry details
   */
  async getSalesReturnById(id) {
    try {
      if (!id) {
        throw new Error('Sales return ID is required');
      }

      const response = await api.get(`/sales-return/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sales return by ID:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch sales return');
    }
  }

  /**
   * Utility function to validate sales return data before sending
   * @param {Object} returnData - Sales return data to validate
   * @returns {boolean} True if valid
   * @throws {Error} If validation fails
   */
  validateSalesReturnData(returnData) {
    const errors = [];

    if (!returnData.returns || !Array.isArray(returnData.returns)) {
      errors.push('Returns array is required');
    } else {
      returnData.returns.forEach((item, index) => {
        if (!item.transactionId) {
          errors.push(`Transaction ID is required for return at index ${index}`);
        }
      });
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    return true;
  }
}

// Create and export a singleton instance
const salesReturnService = new SalesReturnService();
export default salesReturnService;

// Also export the class for potential custom instances
export { SalesReturnService };