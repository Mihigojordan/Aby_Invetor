import api from "../api/api"; // Axios instance with JWT

// ───────────────────────────────────────────────
// ENUMS
// ───────────────────────────────────────────────
export const StockRequisitionStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  PARTIALLY_RECEIVED: "PARTIALLY_RECEIVED",
  FULLY_RECEIVED: "FULLY_RECEIVED",
  REJECTED: "REJECTED",
  COMPLETED: "COMPLETED",
};

export const StockReceivingStatus = {
  NOT_RECEIVED: "NOT_RECEIVED",
  PARTIALLY_RECEIVED: "PARTIALLY_RECEIVED",
  FULLY_RECEIVED: "FULLY_RECEIVED",
};

// ───────────────────────────────────────────────
// TYPES (JSDoc for better IDE support)
// ───────────────────────────────────────────────

/**
 * @typedef {Object} ReceivingLog
 * @property {string} id
 * @property {string} requisitionItemId
 * @property {number} receivedQty
 * @property {string} receivedById
 * @property {string} receivedAt - ISO date string
 * @property {string} [note]
 * @property {Object} [receivedBy] - Employee object
 */

/**
 * @typedef {Object} StockRequisitionItem
 * @property {string} id
 * @property {string} requisitionId
 * @property {string} [stockId]
 * @property {string} itemName
 * @property {number} quantity
 * @property {string} [note]
 * @property {number} receivedQty
 * @property {string} receivingStatus - StockReceivingStatus
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {Object} [stock] - StockIn object
 * @property {ReceivingLog[]} [receivingLogs]
 */

/**
 * @typedef {Object} StockRequisition
 * @property {string} id
 * @property {string} employeeId
 * @property {string} status - StockRequisitionStatus
 * @property {string} [description]
 * @property {string} [rejectReason]
 * @property {string} [approvedAt]
 * @property {string} [completedAt]
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {Object} [employee] - Employee object
 * @property {StockRequisitionItem[]} items
 */

// ───────────────────────────────────────────────
// SERVICE CLASS
// ───────────────────────────────────────────────
class StockRequisitionService {
  /**
   * Create a new stock requisition
   * @param {Object} data
   * @param {string} [data.description]
   * @param {Array<{itemName: string, quantity: number, note?: string, stockId?: string}>} data.items
   * @returns {Promise<StockRequisition>}
   */
  async createStockRequisition(data) {
    try {
      const res = await api.post("/stock-requisition", data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create stock requisition";
      throw new Error(msg);
    }
  }

  /**
   * Get all stock requisitions (filtered by role on backend)
   * @returns {Promise<StockRequisition[]>}
   */
  async getAll() {
    try {
      const res = await api.get("/stock-requisition");
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to fetch stock requisitions";
      throw new Error(msg);
    }
  }

  /**
   * Get a single stock requisition by ID
   * @param {string} id
   * @returns {Promise<StockRequisition>}
   */
  async getOne(id) {
    try {
      const res = await api.get(`/stock-requisition/${id}`);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to fetch stock requisition";
      throw new Error(msg);
    }
  }

  /**
   * Get receiving summary for a stock requisition
   * @param {string} id
   * @returns {Promise<Array>}
   */
  async getReceivingSummary(id) {
    try {
      const res = await api.get(`/stock-requisition/${id}/receiving-summary`);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to fetch receiving summary";
      throw new Error(msg);
    }
  }

  /**
   * Update a pending stock requisition (Employee only)
   * @param {string} id
   * @param {Object} data
   * @param {string} [data.description]
   * @param {Array} [data.items]
   * @returns {Promise<StockRequisition>}
   */
  async update(id, data) {
    try {
      const res = await api.put(`/stock-requisition/${id}`, data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update stock requisition";
      throw new Error(msg);
    }
  }

  /**
   * Approve a stock requisition
   * @param {string} id
   * @param {Array} [items] - Optional items to edit before approval
   * @returns {Promise<StockRequisition>}
   */
  async approve(id, items) {
    try {
      const res = await api.put(`/stock-requisition/${id}/approve`, { items });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to approve stock requisition";
      throw new Error(msg);
    }
  }

  /**
   * Receive items for a stock requisition
   * @param {string} id
   * @param {Array<{itemId: string, receivedQty: number, note?: string}>} items
   * @returns {Promise<StockRequisition>}
   */
  async receiveItems(id, items) {
    try {
      const res = await api.put(`/stock-requisition/${id}/receive`, { items });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to receive stock items";
      throw new Error(msg);
    }
  }

  /**
   * Reject a stock requisition
   * @param {string} id
   * @param {string} reason
   * @returns {Promise<StockRequisition>}
   */
  async reject(id, reason) {
    try {
      const res = await api.put(`/stock-requisition/${id}/reject`, { reason });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to reject stock requisition";
      throw new Error(msg);
    }
  }

  /**
   * Delete a stock requisition
   * @param {string} id
   * @returns {Promise}
   */
  async delete(id) {
    try {
      const res = await api.delete(`/stock-requisition/${id}`);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to delete stock requisition";
      throw new Error(msg);
    }
  }
}

// ───────────────────────────────────────────────
// SINGLETON EXPORT
// ───────────────────────────────────────────────
const stockRequisitionService = new StockRequisitionService();
export default stockRequisitionService;

// ───────────────────────────────────────────────
// NAMED EXPORTS (for convenience)
// ───────────────────────────────────────────────
export const {
  createStockRequisition,
  getAll,
  getOne,
  getReceivingSummary,
  update,
  approve,
  receiveItems,
  reject,
} = stockRequisitionService;