import api from '../api/api'; // Axios instance

class NotificationService {
  // ───────────────────────────────
  // CREATE NOTIFICATION
  // ───────────────────────────────
  async createNotification(data) {
    try {
      const response = await api.post('/notifications', data);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to create notification'
      );
    }
  }

  // ───────────────────────────────
  // GET ALL NOTIFICATIONS
  // ───────────────────────────────
  async getNotifications(page = 1, limit = 10, search = '') {
    try {
      const response = await api.get('/notifications', {
        params: { page, limit, search }
      });

      // Response includes { data, meta }
      return {
        notifications: response.data.data,
        meta: response.data.meta,
      };
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch notifications'
      );
    }
  }

  // ───────────────────────────────
  // MARK AS READ
  // ───────────────────────────────
  async markAsRead(notificationId) {
    try {
      const response = await api.put(
        `/notifications/${notificationId}/read`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to mark notification as read'
      );
    }
  }
}

// Singleton export
const notificationService = new NotificationService();
export default notificationService;

// Named exports
export const {
  createNotification,
  getNotifications,
  markAsRead
} = notificationService;
