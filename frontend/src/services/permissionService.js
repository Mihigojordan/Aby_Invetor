import api from '../api/api';

/**
 * Permission Service for Frontend
 * Manages the per-employee, per-feature permission matrix (Access / View Own /
 * View All / Create / Update / Delete). Admin-only management calls plus a
 * self-service "my own permissions" call for employees.
 */
class PermissionService {
  /**
   * Get every employee's permission row for a given feature (admin only).
   * @param {string} feature - Feature key, e.g. 'stockin'
   * @returns {Promise<Array>} One entry per employee
   */
  async getMatrixForFeature(feature) {
    try {
      if (!feature) {
        throw new Error('Feature is required');
      }
      const response = await api.get(`/permissions/feature/${feature}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching permission matrix:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch permission matrix');
    }
  }

  /**
   * Get a count of employees with access=true, per feature (admin only).
   * @returns {Promise<Object>} Map of feature key -> count
   */
  async getFeatureAccessCounts() {
    try {
      const response = await api.get('/permissions/counts');
      return response.data;
    } catch (error) {
      console.error('Error fetching permission counts:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch permission counts');
    }
  }

  /**
   * Create or update a single employee's permission row for a feature (admin only).
   * @param {string} employeeId
   * @param {string} feature
   * @param {Object} data - Partial set of { access, viewOwn, viewAll, create, update, delete }
   * @returns {Promise<Object>} Updated permission row
   */
  async upsertPermission(employeeId, feature, data) {
    try {
      if (!employeeId || !feature) {
        throw new Error('Employee ID and feature are required');
      }
      const response = await api.put('/permissions', { employeeId, feature, ...data });
      return response.data;
    } catch (error) {
      console.error('Error updating permission:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update permission');
    }
  }

  /**
   * Get the currently authenticated employee's own permission rows.
   * @returns {Promise<Array>}
   */
  async getOwnPermissions() {
    try {
      const response = await api.get('/permissions/employee/me');
      return response.data;
    } catch (error) {
      console.error('Error fetching own permissions:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch permissions');
    }
  }
}

const permissionService = new PermissionService();
export default permissionService;
export { PermissionService };
