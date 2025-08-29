import api from '../api/api'; // Import your axios instance

/**
 * BackOrder Management Service
 * Service for handling all BackOrder related API calls
 */
class BackOrderService {
  
  /**
   * Create a new BackOrder
   * @param {Object} backOrderData - The backorder data to create
   * @returns {Promise<Object>} Created backorder response
   */
  async createBackOrder(backOrderData) {
    try {
      const response = await api.post('/backorder/create', backOrderData);
      return response.data;
    } catch (error) {
      console.error('Error creating backorder:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get all BackOrders
   * @returns {Promise<Array>} Array of all backorders
   */
  async getAllBackOrders() {
    try {
      const response = await api.get('/backorder/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching all backorders:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get a single BackOrder by ID
   * @param {string|number} id - The backorder ID
   * @returns {Promise<Object>} Single backorder data
   */
  async getBackOrderById(id) {
    try {
      const response = await api.get(`/backorder/getone/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching backorder with ID ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Update an existing BackOrder
   * @param {string|number} id - The backorder ID to update
   * @param {Object} updateData - The data to update
   * @returns {Promise<Object>} Updated backorder response
   */
  async updateBackOrder(id, updateData) {
    try {
      const response = await api.put(`/backorder/update/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating backorder with ID ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete a BackOrder
   * @param {string|number} id - The backorder ID to delete
   * @param {Object} deleteData - Additional data for deletion (if required)
   * @returns {Promise<Object>} Delete operation response
   */
  async deleteBackOrder(id, deleteData = {}) {
    try {
      const response = await api.delete(`/backorder/delete/${id}`, { 
        data: deleteData 
      });
      return response.data;
    } catch (error) {
      console.error(`Error deleting backorder with ID ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors consistently
   * @param {Error} error - The error object from axios
   * @returns {Error} Formatted error object
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const errorMessage = error.response.data?.message || error.response.statusText || 'An error occurred';
      const errorStatus = error.response.status;
      return new Error(`API Error (${errorStatus}): ${errorMessage}`);
    } else if (error.request) {
      // Request made but no response received
      return new Error('Network Error: No response from server');
    } else {
      // Something else happened
      return new Error(`Request Error: ${error.message}`);
    }
  }
}

// Create and export a singleton instance
const backOrderService = new BackOrderService();

export default backOrderService;

// Also export the class if you need multiple instances
export { BackOrderService };