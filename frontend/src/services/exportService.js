import api from '../api/api';

class ExportService {
  async preview(config) {
    try {
      const response = await api.post('/export/preview', config, { timeout: 30000 });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load preview');
    }
  }

  async exportData(config) {
    try {
      const response = await api.post('/export/data', config, { timeout: 120000 });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to export data');
    }
  }

  async importData(payload) {
    try {
      const response = await api.post('/export/import', payload, { timeout: 120000 });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Import failed');
    }
  }
}

const exportService = new ExportService();
export default exportService;
