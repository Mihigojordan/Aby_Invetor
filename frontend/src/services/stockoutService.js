import api, { API_URL } from '../api/api'; // Adjust the import path as needed

/**
 * StockOut Service for Frontend
 * Provides methods to interact with StockOut API endpoints using axios
 * Updated to match backend bulk transaction structure
 */

class StockOutService {
 /**
 * Create a single stock-out entry (converted to bulk format for backend)
 * @param {Object} stockOutData - Stock-out data
 * @param {string} stockOutData.stockinId - Stock-in ID (required)
 * @param {number} stockOutData.quantity - Quantity sold (required)
 * @param {string} [stockOutData.clientName] - Client name (optional)
 * @param {string} [stockOutData.clientEmail] - Client email (optional)
 * @param {string} [stockOutData.paymentMethod] - Payment method (optional)
 * @param {string} [stockOutData.clientPhone] - Client phone (optional)
 * @param {string} [stockOutData.adminId] - Admin ID (optional)
 * @param {string} [stockOutData.employeeId] - Employee ID (optional)
 * @returns {Promise<Object>} Created stock-out transaction with success message
 */
async createStockOut(stockOutData) {
  try {
    // Validate required fields
    if (!stockOutData.stockinId || !stockOutData.quantity) {
      throw new Error('Stock-in ID and quantity are required');
    }

    // Transform single stock-out data to match backend expected format
    const requestData = {
      sales: [
        {
          stockinId: stockOutData.stockinId,
          quantity: Number(stockOutData.quantity)
        }
      ],
      clientName: stockOutData.clientName || undefined,
      clientEmail: stockOutData.clientEmail || undefined,
      clientPhone: stockOutData.clientPhone || undefined,
      adminId: stockOutData.adminId || undefined,
      employeeId: stockOutData.employeeId || undefined,
      paymentMethod: stockOutData.paymentMethod || undefined
    };

    const response = await api.post('/stockout/create', requestData);
    return response.data;
  } catch (error) {
    console.error('Error creating stock-out:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to create stock-out');
  }
}

/**
 * Create multiple stock-out entries in a single transaction
 * @param {Array} salesArray - Array of sale objects
 * @param {Object} clientInfo - Client information (applied to all sales in transaction)
 * @param {string} [clientInfo.clientName] - Client name
 * @param {string} [clientInfo.clientEmail] - Client email
 * @param {string} [clientInfo.clientPhone] - Client phone
 * @param {string} [clientInfo.paymentMethod] - Payment method
 * @param {Object} userInfo - User information
 * @param {string} [userInfo.adminId] - Admin ID
 * @param {string} [userInfo.employeeId] - Employee ID
 * @returns {Promise<Object>} Created stock-out transaction with success message
 */
async createMultipleStockOut(salesArray, clientInfo = {}, userInfo = {}) {
  try {
    // Validate sales array
    if (!Array.isArray(salesArray) || salesArray.length === 0) {
      throw new Error('At least one sale is required');
    }

    // Validate each sale item
    for (const sale of salesArray) {
      if (!sale.stockinId || !sale.quantity) {
        throw new Error('Each sale must have stockinId and quantity');
      }
    }

    // Format sales data - only stockinId and quantity per sale item
    const formattedSales = salesArray.map(sale => ({
      stockinId: sale.stockinId,
      quantity: Number(sale.quantity)
    }));

    const requestData = {
      sales: formattedSales,
      clientName: clientInfo.clientName || undefined,
      clientEmail: clientInfo.clientEmail || undefined,
      clientPhone: clientInfo.clientPhone || undefined,
      paymentMethod: clientInfo.paymentMethod || undefined, // FIXED: Added this line
      adminId: userInfo.adminId || undefined,
      employeeId: userInfo.employeeId || undefined
    };

    const response = await api.post('/stockout/create', requestData);
    return response.data;
  } catch (error) {
    console.error('Error creating multiple stock-out:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to create multiple stock-out');
  }
}

  /**
   * Get all stock-out entries
   * @returns {Promise<Array>} Array of stock-out entries with related details
   */
  async getAllStockOuts() {
    try {
      const response = await api.get('/stockout/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching all stock-outs:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch stock-outs');
    }
  }

  /**
   * Get a single stock-out entry by ID
   * @param {string} id - Stock-out entry ID
   * @returns {Promise<Object>} Stock-out entry details
   */
  async getStockOutById(id) {
    try {
      if (!id) {
        throw new Error('Stock-out ID is required');
      }

      const response = await api.get(`/stockout/getone/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching stock-out by ID:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch stock-out');
    }
  }

  /**
   * Get stock-out entries by transaction ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Array>} Array of stock-out entries for the transaction
   */
  async getStockOutByTransactionId(transactionId) {
    try {
      if (!transactionId) {
        throw new Error('Transaction ID is required');
      }

      // Note: The backend endpoint uses @Body() for this, but it should probably be a query parameter
      // For now, using the existing structure
      const response = await api.get(`/stockout/transaction/${transactionId}`, );
      return response.data;
    } catch (error) {
      console.error('Error fetching stock-out by transaction ID:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch stock-out by transaction ID');
    }
  }

  /**
   * Update a stock-out entry
   * @param {string} id - Stock-out entry ID
   * @param {Object} updateData - Data to update
   * @param {number} [updateData.quantity] - Updated quantity
   * @param {number} [updateData.soldPrice] - Updated sold price
   * @param {string} [updateData.clientName] - Updated client name
   * @param {string} [updateData.clientEmail] - Updated client email
   * @param {string} [updateData.clientPhone] - Updated client phone
   * @param {string} [updateData.paymentMethod] - Updated payment method
   * @param {string} [updateData.adminId] - Admin ID for activity tracking
   * @param {string} [updateData.employeeId] - Employee ID for activity tracking
   * @returns {Promise<Object>} Updated stock-out entry
   */
  async updateStockOut(id, updateData) {
    try {
      if (!id) {
        throw new Error('Stock-out ID is required');
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error('Update data is required');
      }

      // Ensure numeric fields are properly converted
      const formattedUpdateData = {
        ...updateData
      };

      if (updateData.quantity !== undefined) {
        formattedUpdateData.quantity = Number(updateData.quantity);
      }
      if (updateData.soldPrice !== undefined) {
        formattedUpdateData.soldPrice = Number(updateData.soldPrice);
      }

      const response = await api.put(`/stockout/update/${id}`, formattedUpdateData);
      return response.data;
    } catch (error) {
      console.error('Error updating stock-out:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update stock-out');
    }
  }

  /**
   * Delete a stock-out entry
   * @param {string} id - Stock-out entry ID
   * @param {Object} [userData] - User data for activity tracking
   * @param {string} [userData.adminId] - Admin ID
   * @param {string} [userData.employeeId] - Employee ID
   * @returns {Promise<Object>} Success message
   */
  async deleteStockOut(id, userData = {}) {
    try {
      if (!id) {
        throw new Error('Stock-out ID is required');
      }

      const response = await api.delete(`/stockout/delete/${id}`, {
        data: userData
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting stock-out:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete stock-out');
    }
  }

   getBarCodeUrlImage  (code){
    if(!code){
      return null
    }
    return `${API_URL}/uploads/barcodes/${code}.png`;
  }
  /**
   * Utility function to validate stock-out data before sending
   * @param {Object} stockOutData - Stock-out data to validate
   * @returns {boolean} True if valid
   * @throws {Error} If validation fails
   */
  validateStockOutData(stockOutData) {
    const errors = [];
    
    if (!stockOutData.stockinId) errors.push('Stock-in ID is required');
    if (!stockOutData.quantity || stockOutData.quantity <= 0) errors.push('Valid quantity is required');
    
    // Optional: Email format validation
    if (stockOutData.clientEmail && !this.isValidEmail(stockOutData.clientEmail)) {
      errors.push('Valid email format required');
    }
    
    // Optional: Phone format validation
    if (stockOutData.clientPhone && !this.isValidPhone(stockOutData.clientPhone)) {
      errors.push('Valid phone number required');
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    return true;
  }

  /**
   * Utility function to validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Utility function to validate phone number format
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid phone format
   */
  isValidPhone(phone) {
    // Basic phone validation - adjust regex based on your requirements
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Calculate total sales amount for a transaction
   * @param {Array} sales - Array of sale objects with soldPrice
   * @returns {number} Total sales amount
   */
  calculateTotalSales(sales) {
    if (!Array.isArray(sales)) return 0;
    return sales.reduce((total, sale) => total + (sale.soldPrice || 0), 0);
  }

  /**
   * Calculate total quantity sold for a transaction
   * @param {Array} sales - Array of sale objects with quantity
   * @returns {number} Total quantity sold
   */
  calculateTotalQuantity(sales) {
    if (!Array.isArray(sales)) return 0;
    return sales.reduce((total, sale) => total + (sale.quantity || 0), 0);
  }
}

// Create and export a singleton instance
const stockOutService = new StockOutService();
export default stockOutService;

// Also export the class for potential custom instances
export { StockOutService };