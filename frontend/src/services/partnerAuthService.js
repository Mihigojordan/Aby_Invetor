// services/partnerAuthService.js
import api from '../api/api';

class PartnerAuthService {
  // ─── Register ───
  async register(data) {
    try {
      const response = await api.post('/partner-auth/register', data);
      return response.data;
    } catch (error) {
      console.error('Error registering partner:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to register';
      throw new Error(errorMessage);
    }
  }

  // ─── Login ───
  async login(data) {
    try {
      const response = await api.post('/partner-auth/login', data, { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error('Error logging in:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to login';
      throw new Error(errorMessage);
    }
  }

  // ─── Logout ───
  async logout() {
    try {
      const response = await api.post('/partner-auth/logout', {}, { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error('Error logging out:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to logout';
      throw new Error(errorMessage);
    }
  }

  // ─── Get Profile ───
  async getProfile() {
    try {
      const response = await api.get('/partner-auth/profile', { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch profile';
      throw new Error(errorMessage);
    }
  }

  // ─── Edit Profile ───
  async editProfile(data) {
    try {
      const response = await api.put('/partner-auth/edit-profile', data, { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to update profile';
      throw new Error(errorMessage);
    }
  }

  // ─── Change Password ───
  async changePassword(data) {
    try {
      const response = await api.patch('/partner-auth/change-password', data, { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to change password';
      throw new Error(errorMessage);
    }
  }
}

const partnerAuthService = new PartnerAuthService();
export default partnerAuthService;

export const {
  register,
  login,
  logout,
  getProfile,
  editProfile,
  changePassword,
} = partnerAuthService;
