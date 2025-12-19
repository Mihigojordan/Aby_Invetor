// services/partnerService.js
import api from '../api/api';

class PartnerService {
  async createPartner(partnerData) {
    try {
      const response = await api.post('/partner/create', partnerData);
      return response.data;
    } catch (error) {
      console.error('Error creating partner:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to create partner';
      throw new Error(errorMessage);
    }
  }

  async getAllPartners() {
    try {
      const response = await api.get('/partner/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching partners:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch partners';
      throw new Error(errorMessage);
    }
  }

  async getPartnerById(id) {
    try {
      const response = await api.get(`/partner/getone/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching partner:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch partner';
      throw new Error(errorMessage);
    }
  }

  async updatePartner(id, partnerData) {
    try {
      const response = await api.put(`/partner/update/${id}`, partnerData);
      return response.data;
    } catch (error) {
      console.error('Error updating partner:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to update partner';
      throw new Error(errorMessage);
    }
  }

  async deletePartner(id) {
    try {
      const response = await api.delete(`/partner/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting partner:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to delete partner';
      throw new Error(errorMessage);
    }
  }

  validatePartnerData(partnerData) {
    const errors = [];

    if (!partnerData.name?.trim()) {
      errors.push('Partner name is required');
    }

    if (!partnerData.email?.trim()) {
      errors.push('Email is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

const partnerService = new PartnerService();
export default partnerService;

export const {
  createPartner,
  getAllPartners,
  getPartnerById,
  updatePartner,
  deletePartner,
  validatePartnerData,
} = partnerService;
