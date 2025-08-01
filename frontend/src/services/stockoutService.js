import api from '../api/api'; // Adjust the import path as needed

/**
 * StockOut Service for Frontend
 * Provides methods to interact with StockOut API endpoints using axios
 */

class StockOutService {
  /**
   * Create a new stock-out entry
   * @param {Object} stockOutData - Stock-out data
   * @param {string} [stockOutData.stockinId] - Stock-in ID (optional)
   * @param {number} [stockOutData.quantity] - Quantity sold (optional)
   * @param {string} [stockOutData.clientName] - Client name (optional)
   * @param {string} [stockOutData.clientEmail] - Client email (optional)
   * @param {string} [stockOutData.clientPhone] - Client phone (optional)
   * @returns {Promise<Object>} Created stock-out entry with success message
   */
  async createStockOut(stockOutData) {
    try {
      // Basic validation - at least some data should be provided
      if (!stockOutData || Object.keys(stockOutData).length === 0) {
        throw new Error('Stock-out data is required');
      }

      const response = await api.post('/stockout/create', stockOutData);
      return response.data;
    } catch (error) {
      console.error('Error creating stock-out:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create stock-out');
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
   * Update a stock-out entry
   * @param {string} id - Stock-out entry ID
   * @param {Object} updateData - Data to update
   * @param {string} [updateData.stockinId] - Updated stock-in ID
   * @param {number} [updateData.quantity] - Updated quantity
   * @param {string} [updateData.clientName] - Updated client name
   * @param {string} [updateData.clientEmail] - Updated client email
   * @param {string} [updateData.clientPhone] - Updated client phone
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

      const response = await api.put(`/stockout/update/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating stock-out:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update stock-out');
    }
  }

  /**
   * Delete a stock-out entry
   * @param {string} id - Stock-out entry ID
   * @returns {Promise<Object>} Success message
   */
  async deleteStockOut(id) {
    try {
      if (!id) {
        throw new Error('Stock-out ID is required');
      }

      const response = await api.delete(`/stockout/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting stock-out:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete stock-out');
    }
  }
}

// Create and export a singleton instance
const stockOutService = new StockOutService();
export default stockOutService;

// Also export the class for potential custom instances
export { StockOutService };