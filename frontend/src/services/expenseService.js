import api from '../api/api'; // Axios instance

// ───────────────────────────────
// EXPENSE SERVICE
// ───────────────────────────────
class ExpenseService {
  // ───────────────────────────────
  // CREATE EXPENSE
  // ───────────────────────────────
  async createExpense(data) {
    try {
      const response = await api.post('/expense', data);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to create expense'
      );
    }
  }

  // ───────────────────────────────
  // UPDATE EXPENSE DETAILS
  // ───────────────────────────────
  async updateExpense(id, data) {
    try {
      const response = await api.patch(`/expense/${id}`, data);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to update expense'
      );
    }
  }

  // ───────────────────────────────
  // UPDATE EXPENSE STATUS (NEW)
  // ───────────────────────────────
  async updateExpenseStatus(id, status) {
    try {
      const response = await api.patch(`/expense/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to update expense status'
      );
    }
  }

  // ───────────────────────────────
  // GET ALL EXPENSES (WITH FILTERS)
  // ───────────────────────────────
  async getAllExpenses(params = {}) {
    try {
      const response = await api.get('/expense', { params });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch expenses'
      );
    }
  }

  // ───────────────────────────────
  // GET SINGLE EXPENSE
  // ───────────────────────────────
  async getExpense(id) {
    try {
      const response = await api.get(`/expense/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch expense'
      );
    }
  }

  // ───────────────────────────────
  // DELETE EXPENSE
  // ───────────────────────────────
  async deleteExpense(id) {
    try {
      const response = await api.delete(`/expense/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to delete expense'
      );
    }
  }
}

// Singleton export
const expenseService = new ExpenseService();
export default expenseService;

// Named exports
export const {
  createExpense,
  updateExpense,
  updateExpenseStatus, // ✅ NEW
  getAllExpenses,
  getExpense,
  deleteExpense,
} = expenseService;
