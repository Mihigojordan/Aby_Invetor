// services/requisitionService.js
import api from '../api/api';

class RequisitionService {
  // ============================================================================
  // PARTNER ACTIONS
  // ============================================================================

  async createRequisition(data) {
    try {
      const response = await api.post('/requisition', data);
      return response.data;
    } catch (error) {
      console.error('Error creating requisition:', error);
      throw new Error(this._errorMessage(error, 'Failed to create requisition'));
    }
  }

  async updateRequisition(id, data) {
    try {
      const response = await api.put(`/requisition/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating requisition:', error);
      throw new Error(this._errorMessage(error, 'Failed to update requisition'));
    }
  }

  async cancelRequisition(id) {
    try {
      const response = await api.put(`/requisition/${id}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling requisition:', error);
      throw new Error(this._errorMessage(error, 'Failed to cancel requisition'));
    }
  }

  async confirmDeliveryReceipt(deliveryId, partnerNote) {
    try {
      const response = await api.put(
        `/requisition/delivery/${deliveryId}/confirm`,
        { partnerNote }
      );
      return response.data;
    } catch (error) {
      console.error('Error confirming receipt:', error);
      throw new Error(this._errorMessage(error, 'Failed to confirm receipt'));
    }
  }

  async getMyRequisitions() {
    try {
      const response = await api.get('/requisition/my/list');
      return response.data;
    } catch (error) {
      console.error('Error fetching my requisitions:', error);
      throw new Error(this._errorMessage(error, 'Failed to fetch requisitions'));
    }
  }

  // ============================================================================
  // EMPLOYEE / ADMIN ACTIONS
  // ============================================================================

  async approveItems(requisitionId, items) {
    try {
      const response = await api.put(`/requisition/${requisitionId}/approve`, {
        items,
      });
      return response.data;
    } catch (error) {
      console.error('Error approving items:', error);
      throw new Error(this._errorMessage(error, 'Failed to approve items'));
    }
  }

  async rejectRequisition(requisitionId, reason) {
    try {
      const response = await api.put(`/requisition/${requisitionId}/reject`, {
        reason,
      });
      return response.data;
    } catch (error) {
      console.error('Error rejecting requisition:', error);
      throw new Error(this._errorMessage(error, 'Failed to reject requisition'));
    }
  }

  async deliverItems(requisitionId, deliveries) {
    try {
      const response = await api.put(`/requisition/${requisitionId}/deliver`, {
        deliveries,
      });
      return response.data;
    } catch (error) {
      console.error('Error delivering items:', error);
      throw new Error(this._errorMessage(error, 'Failed to deliver items'));
    }
  }

  async overrideItemPrice(itemId, priceOverride) {
    try {
      const response = await api.put(
        `/requisition/item/${itemId}/price`,
        { priceOverride }
      );
      return response.data;
    } catch (error) {
      console.error('Error overriding price:', error);
      throw new Error(this._errorMessage(error, 'Failed to override price'));
    }
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  async getAllRequisitions(params = {}) {
    try {
      const response = await api.get('/requisition', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching requisitions:', error);
      throw new Error(this._errorMessage(error, 'Failed to fetch requisitions'));
    }
  }

  async getRequisitionById(id) {
    try {
      const response = await api.get(`/requisition/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching requisition:', error);
      throw new Error(this._errorMessage(error, 'Failed to fetch requisition'));
    }
  }

  async getDeliverySummary(requisitionId) {
    try {
      const response = await api.get(
        `/requisition/${requisitionId}/delivery-summary`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching delivery summary:', error);
      throw new Error(this._errorMessage(error, 'Failed to fetch delivery summary'));
    }
  }

  async deleteRequisition(id) {
    try {
      const response = await api.delete(`/requisition/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting requisition:', error);
      throw new Error(this._errorMessage(error, 'Failed to delete requisition'));
    }
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  validateCreateRequisition(data) {
    const errors = [];

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      errors.push('At least one item is required');
    }

    data.items?.forEach((item, index) => {
      if (!item.itemName?.trim()) {
        errors.push(`Item ${index + 1}: name is required`);
      }
      if (!item.qtyRequested || item.qtyRequested <= 0) {
        errors.push(`Item ${index + 1}: quantity must be greater than 0`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ============================================================================
  // INTERNAL
  // ============================================================================

  _errorMessage(error, fallback) {
    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      fallback
    );
  }
}

const requisitionService = new RequisitionService();
export default requisitionService;

export const {
  createRequisition,
  updateRequisition,
  cancelRequisition,
  confirmDeliveryReceipt,
  getMyRequisitions,
  approveItems,
  rejectRequisition,
  deliverItems,
  overrideItemPrice,
  getAllRequisitions,
  getRequisitionById,
  getDeliverySummary,
  deleteRequisition,
  validateCreateRequisition,
} = requisitionService;
