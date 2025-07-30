import api from '../api/api'; // Adjust the import path as needed

/**
 * StockIn Service for Frontend
 * Provides methods to interact with StockIn API endpoints using axios
 */

class StockInService {
  /**
   * Create a new stock-in entry
   * @param {Object} stockInData - Stock-in data
   * @param {string} stockInData.productId - Product ID
   * @param {number} stockInData.quantity - Quantity
   * @param {number} stockInData.price - Price per unit
   * @param {string} [stockInData.supplier] - Supplier name (optional)
   * @returns {Promise<Object>} Created stock-in entry with success message
   */
  async createStockIn(stockInData) {
    try {
      if (!stockInData.productId || !stockInData.quantity || !stockInData.price) {
        throw new Error('Product ID, quantity, and price are required');
      }

      const response = await api.post('/stockin/create', stockInData);
      return response.data;
    } catch (error) {
      console.error('Error creating stock-in:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create stock-in');
    }
  }

  /**
   * Get all stock-in entries
   * @returns {Promise<Array>} Array of stock-in entries with product details
   */
  async getAllStockIns() {
    try {
      const response = await api.get('/stockin/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching all stock-ins:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch stock-ins');
    }
  }

  /**
   * Get a single stock-in entry by ID
   * @param {string} id - Stock-in entry ID
   * @returns {Promise<Object>} Stock-in entry details
   */
  async getStockInById(id) {
    try {
      if (!id) {
        throw new Error('Stock-in ID is required');
      }

      const response = await api.get(`/stockin/getone/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching stock-in by ID:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch stock-in');
    }
  }

  /**
   * Update a stock-in entry
   * @param {string} id - Stock-in entry ID
   * @param {Object} updateData - Data to update
   * @param {number} [updateData.quantity] - Updated quantity
   * @param {number} [updateData.price] - Updated price
   * @param {string} [updateData.supplier] - Updated supplier
   * @returns {Promise<Object>} Updated stock-in entry
   */
  async updateStockIn(id, updateData) {
    try {
      if (!id) {
        throw new Error('Stock-in ID is required');
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error('Update data is required');
      }

      const response = await api.put(`/stockin/update/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating stock-in:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update stock-in');
    }
  }

  /**
   * Delete a stock-in entry
   * @param {string} id - Stock-in entry ID
   * @returns {Promise<Object>} Success message
   */
  async deleteStockIn(id) {
    try {
      if (!id) {
        throw new Error('Stock-in ID is required');
      }

      const response = await api.delete(`/stockin/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting stock-in:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete stock-in');
    }
  }

  /**
   * Get stock-in entries filtered by product ID
   * @param {string} productId - Product ID to filter by
   * @returns {Promise<Array>} Array of stock-in entries for the specific product
   */
  async getStockInsByProductId(productId) {
    try {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      const allStockIns = await this.getAllStockIns();
      return allStockIns.filter(stockIn => stockIn.productId === productId);
    } catch (error) {
      console.error('Error fetching stock-ins by product ID:', error);
      throw new Error('Failed to fetch stock-ins by product ID');
    }
  }

  /**
   * Get stock-in entries filtered by supplier
   * @param {string} supplier - Supplier name to filter by
   * @returns {Promise<Array>} Array of stock-in entries for the specific supplier
   */
  async getStockInsBySupplier(supplier) {
    try {
      if (!supplier) {
        throw new Error('Supplier name is required');
      }

      const allStockIns = await this.getAllStockIns();
      return allStockIns.filter(stockIn => 
        stockIn.supplier && stockIn.supplier.toLowerCase().includes(supplier.toLowerCase())
      );
    } catch (error) {
      console.error('Error fetching stock-ins by supplier:', error);
      throw new Error('Failed to fetch stock-ins by supplier');
    }
  }

  /**
   * Calculate total value of all stock-ins
   * @returns {Promise<number>} Total value of all stock-ins
   */
  async getTotalStockValue() {
    try {
      const allStockIns = await this.getAllStockIns();
      return allStockIns.reduce((total, stockIn) => total + (stockIn.totalPrice || 0), 0);
    } catch (error) {
      console.error('Error calculating total stock value:', error);
      throw new Error('Failed to calculate total stock value');
    }
  }

  /**
   * Get stock-in statistics
   * @returns {Promise<Object>} Statistics object containing totals and counts
   */
  async getStockInStats() {
    try {
      const allStockIns = await this.getAllStockIns();
      
      const stats = {
        totalEntries: allStockIns.length,
        totalQuantity: allStockIns.reduce((sum, item) => sum + (item.quantity || 0), 0),
        totalValue: allStockIns.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
        uniqueProducts: new Set(allStockIns.map(item => item.productId)).size,
        uniqueSuppliers: new Set(allStockIns.filter(item => item.supplier).map(item => item.supplier)).size,
        averagePrice: allStockIns.length > 0 
          ? allStockIns.reduce((sum, item) => sum + (item.price || 0), 0) / allStockIns.length 
          : 0
      };

      return stats;
    } catch (error) {
      console.error('Error getting stock-in statistics:', error);
      throw new Error('Failed to get stock-in statistics');
    }
  }
}

// Create and export a singleton instance
const stockInService = new StockInService();
export default stockInService;

// Also export the class for potential custom instances
export { StockInService };