import api from '../api/api'; // Axios instance

// User type constants
export const UserTypeEnum = {
  EMPLOYEE: 'EMPLOYEE',
  PARTNER: 'PARTNER',
  ADMIN: 'ADMIN',
};

// ───────────────────────────────
// PUSH NOTIFICATION SERVICE
// ───────────────────────────────
class PushNotificationService {
  // ───────────────────────────────
  // SUBSCRIBE DEVICE
  // ───────────────────────────────
  async subscribe(userId, type, subscription, label) {
    try {
      const response = await api.post('/push-notification/subscribe', {
        userId,
        type,
        subscription,
        label,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to subscribe device');
    }
  }

  // ───────────────────────────────
  // UNSUBSCRIBE SINGLE DEVICE
  // ───────────────────────────────
  async unsubscribeDevice(userId, type, endpoint) {
    try {
      const response = await api.delete('/push-notification/unsubscribe/device', {
        data: { userId, type, endpoint },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to unsubscribe device');
    }
  }

  // ───────────────────────────────
  // UNSUBSCRIBE ALL DEVICES
  // ───────────────────────────────
  async unsubscribeAllDevices(userId, type) {
    try {
      const response = await api.delete('/push-notification/unsubscribe/all', {
        data: { userId, type },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to unsubscribe all devices');
    }
  }

  // ───────────────────────────────
  // SEND NOTIFICATION TO SINGLE USER
  // ───────────────────────────────
  async sendToUser(userId, type, payload) {
    try {
      const response = await api.post('/push-notification/send/user', {
        userId,
        type,
        payload,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to send notification');
    }
  }

  // ───────────────────────────────
  // SEND NOTIFICATION TO ALL USERS OF TYPE
  // ───────────────────────────────
  async sendToAll(type, payload) {
    try {
      const response = await api.post('/push-notification/send/all', {
        type,
        payload,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to send notification');
    }
  }

  // ───────────────────────────────
  // GET USER SUBSCRIPTIONS
  // ───────────────────────────────
  async getSubscriptions(userId, type) {
    try {
      const response = await api.get(`/push-notification/subscriptions/${userId}/${type}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch subscriptions');
    }
  }

  // ───────────────────────────────
  // GET TOTAL SUBSCRIPTIONS
  // ───────────────────────────────
  async getTotalSubscriptions(type) {
    try {
      const response = await api.get(`/push-notification/count/${type || ''}`);
      return response.data.count;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch subscription count');
    }
  }
}

// Singleton export
const pushNotificationService = new PushNotificationService();
export default pushNotificationService;

// Named exports
export const {
  subscribe,
  unsubscribeDevice,
  unsubscribeAllDevices,
  sendToUser,
  sendToAll,
  getSubscriptions,
  getTotalSubscriptions,
} = pushNotificationService;
