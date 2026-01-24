import api from '../api/api'; // Axios instance

// ───────────────────────────────
// CREDIT SERVICE
// ───────────────────────────────
class CreditService {
  // ───────────────────────────────
  // CREATE CREDIT
  // ───────────────────────────────
  async createCredit(data) {
    try {
      const response = await api.post('/credit', data);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to create credit'
      );
    }
  }

  // ───────────────────────────────
  // ADD PAYMENT TO CREDIT
  // ───────────────────────────────
  async addPayment(creditId, amount) {
    try {
      const response = await api.patch(`/credit/${creditId}/pay`, { amount });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to add payment'
      );
    }
  }

  // ───────────────────────────────
  // GET ALL CREDITS (WITH FILTERS)
  // ───────────────────────────────
  async getAllCredits(params = {}) {
    try {
      const response = await api.get('/credit', { params });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch credits'
      );
    }
  }

  // ───────────────────────────────
  // GET SINGLE CREDIT
  // ───────────────────────────────
  async getCredit(id) {
    try {
      const response = await api.get(`/credit/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch credit'
      );
    }
  }

  // ───────────────────────────────
  // DELETE CREDIT
  // ───────────────────────────────
  async deleteCredit(id) {
    try {
      const response = await api.delete(`/credit/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to delete credit'
      );
    }
  }
}

// Singleton export
const creditService = new CreditService();
export default creditService;

// Named exports
export const {
  createCredit,
  addPayment,
  getAllCredits,
  getCredit,
  deleteCredit,
} = creditService;
