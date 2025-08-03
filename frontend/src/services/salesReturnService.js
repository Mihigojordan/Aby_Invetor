import api from '../api/api'; // Adjust the import path as needed

/**
 * Enhanced SalesReturn Service for Frontend
 * Provides methods to interact with SalesReturn API endpoints using axios
 * Matches backend functionality with proper item management
 */
class SalesReturnService {
  /**
   * Create a single sales return with items
   * @param {Object} returnData - Sales return data
   * @param {string} returnData.transactionId - Transaction ID (required)
   * @param {string} [returnData.reason] - Reason for return (optional)
   * @param {Date} [returnData.createdAt] - Return creation date (optional)
   * @param {Array} returnData.items - Array of return items (required)
   * @param {string} returnData.items[].stockoutId - Stockout ID (required)
   * @param {number} returnData.items[].quantity - Return quantity (required)
   * @param {string} [returnData.adminId] - Admin ID (optional)
   * @param {string} [returnData.employeeId] - Employee ID (optional)
   * @returns {Promise<Object>} Processing result with success and error details
   */
  async createSalesReturn(returnData) {
    try {
      // Validate required fields
      this.validateSalesReturnData(returnData);

      // Format request data to match backend expectations
      const requestData = {
        transactionId: returnData.transactionId,
        reason: returnData.reason || undefined,
        createdAt: returnData.createdAt ? new Date(returnData.createdAt) : undefined,
        items: returnData.items.map(item => ({
          stockoutId: item.stockoutId,
          quantity: parseInt(item.quantity, 10)
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
   * Create multiple sales returns in bulk (sequential processing)
   * @param {Array} returnsArray - Array of sales return data objects
   * @returns {Promise<Object>} Bulk processing result with success and error details
   */
  async createBulkSalesReturns(returnsArray) {
    try {
      if (!Array.isArray(returnsArray) || returnsArray.length === 0) {
        throw new Error('At least one return is required');
      }

      const results = [];
      const errors = [];

      for (let i = 0; i < returnsArray.length; i++) {
        try {
          const result = await this.createSalesReturn(returnsArray[i]);
          results.push({
            index: i,
            transactionId: returnsArray[i].transactionId,
            result: result
          });
        } catch (error) {
          errors.push({
            index: i,
            transactionId: returnsArray[i].transactionId,
            error: error.message
          });
        }
      }

      return {
        message: 'Bulk sales return processing completed',
        totalProcessed: returnsArray.length,
        successful: results.length,
        failed: errors.length,
        results: results,
        errors: errors
      };
    } catch (error) {
      console.error('Error in bulk sales return creation:', error);
      throw new Error(error.message || 'Failed to process bulk sales returns');
    }
  }

  /**
   * Get all sales return entries
   * @param {Object} [filters] - Optional filtering parameters
   * @returns {Promise<Object>} Object containing array of sales return entries
   */
  async getAllSalesReturns(filters = {}) {
    try {
      let url = '/sales-return';
      
      // Add query parameters if filters are provided
      const queryParams = new URLSearchParams();
      
      if (filters.transactionId) {
        queryParams.append('transactionId', filters.transactionId);
      }
      if (filters.reason) {
        queryParams.append('reason', filters.reason);
      }
      if (filters.createdAfter) {
        queryParams.append('createdAfter', filters.createdAfter);
      }
      if (filters.createdBefore) {
        queryParams.append('createdBefore', filters.createdBefore);
      }

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching all sales returns:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch sales returns');
    }
  }

  /**
   * Get a single sales return entry by ID with full details
   * @param {string} id - Sales return entry ID
   * @returns {Promise<Object>} Sales return entry details with items and stockout info
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
   * Get sales returns by transaction ID
   * @param {string} transactionId - Transaction ID to search for
   * @returns {Promise<Object>} Sales returns matching the transaction ID
   */
  async getSalesReturnsByTransactionId(transactionId) {
    try {
      if (!transactionId) {
        throw new Error('Transaction ID is required');
      }

      return await this.getAllSalesReturns({ transactionId });
    } catch (error) {
      console.error('Error fetching sales returns by transaction ID:', error);
      throw new Error(error.message || 'Failed to fetch sales returns by transaction ID');
    }
  }

  /**
   * Get sales returns within a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Object>} Sales returns within the date range
   */
  async getSalesReturnsByDateRange(startDate, endDate) {
    try {
      if (!startDate || !endDate) {
        throw new Error('Both start date and end date are required');
      }

      const filters = {
        createdAfter: new Date(startDate).toISOString(),
        createdBefore: new Date(endDate).toISOString()
      };

      return await this.getAllSalesReturns(filters);
    } catch (error) {
      console.error('Error fetching sales returns by date range:', error);
      throw new Error(error.message || 'Failed to fetch sales returns by date range');
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

    // Validate required fields
    if (!returnData.transactionId) {
      errors.push('Transaction ID is required');
    }

    if (!returnData.items || !Array.isArray(returnData.items)) {
      errors.push('Items array is required');
    } else if (returnData.items.length === 0) {
      errors.push('At least one item must be provided');
    } else {
      // Validate each item
      returnData.items.forEach((item, index) => {
        if (!item.stockoutId) {
          errors.push(`Stockout ID is required for item at index ${index}`);
        }
        
        if (!item.quantity || isNaN(parseInt(item.quantity, 10)) || parseInt(item.quantity, 10) <= 0) {
          errors.push(`Valid quantity (positive number) is required for item at index ${index}`);
        }
      });
    }

    // Validate user identification
    if (!returnData.adminId && !returnData.employeeId) {
      errors.push('Either adminId or employeeId must be provided');
    }

    // Validate dates if provided
    if (returnData.createdAt && isNaN(new Date(returnData.createdAt).getTime())) {
      errors.push('Invalid createdAt date format');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    return true;
  }

  /**
   * Format sales return data for display
   * @param {Object} salesReturn - Raw sales return data from API
   * @returns {Object} Formatted sales return data
   */
  formatSalesReturnForDisplay(salesReturn) {
    if (!salesReturn) return null;

    return {
      id: salesReturn.id,
      transactionId: salesReturn.transactionId,
      reason: salesReturn.reason || 'No reason provided',
      createdAt: new Date(salesReturn.createdAt).toLocaleString(),
      itemCount: salesReturn.items ? salesReturn.items.length : 0,
      totalQuantity: salesReturn.items ? 
        salesReturn.items.reduce((sum, item) => sum + item.quantity, 0) : 0,
      items: salesReturn.items ? salesReturn.items.map(item => ({
        id: item.id,
        stockoutId: item.stockoutId,
        quantity: item.quantity,
        stockoutInfo: item.stockout ? {
          id: item.stockout.id,
          quantity: item.stockout.quantity,
          stockinInfo: item.stockout.stockin ? {
            id: item.stockout.stockin.id,
            quantity: item.stockout.stockin.quantity
          } : null
        } : null
      })) : []
    };
  }

  /**
   * Calculate return statistics
   * @param {Array} salesReturns - Array of sales return objects
   * @returns {Object} Statistics summary
   */
  calculateReturnStatistics(salesReturns) {
    if (!Array.isArray(salesReturns) || salesReturns.length === 0) {
      return {
        totalReturns: 0,
        totalItems: 0,
        totalQuantity: 0,
        averageItemsPerReturn: 0,
        mostCommonReason: null
      };
    }

    const totalReturns = salesReturns.length;
    let totalItems = 0;
    let totalQuantity = 0;
    const reasonCounts = {};

    salesReturns.forEach(returnItem => {
      if (returnItem.items) {
        totalItems += returnItem.items.length;
        totalQuantity += returnItem.items.reduce((sum, item) => sum + item.quantity, 0);
      }

      const reason = returnItem.reason || 'No reason provided';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    const mostCommonReason = Object.keys(reasonCounts).reduce((a, b) => 
      reasonCounts[a] > reasonCounts[b] ? a : b, null);

    return {
      totalReturns,
      totalItems,
      totalQuantity,
      averageItemsPerReturn: totalReturns > 0 ? (totalItems / totalReturns).toFixed(2) : 0,
      mostCommonReason,
      reasonBreakdown: reasonCounts
    };
  }
}

// Create and export a singleton instance
const salesReturnService = new SalesReturnService();
export default salesReturnService;

// Also export the class for potential custom instances
export { SalesReturnService };