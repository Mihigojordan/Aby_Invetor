import api from '../api/api';

class TaskService {
  // Create task
  async createTask(taskData) {
    try {
      const validation = this.validateTaskData(taskData);
      if (!validation.isValid) throw new Error(validation.errors.join(', '));

      const response = await api.post('/task/create', taskData);
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error(this.extractErrorMessage(error, 'create task'));
    }
  }

  // Get all tasks
  async getAllTasks() {
    try {
      const response = await api.get('/task/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw new Error(this.extractErrorMessage(error, 'fetch tasks'));
    }
  }

  // Update task
  async updateTask(id, taskData) {
    try {
      const validation = this.validateTaskData(taskData);
      if (!validation.isValid) throw new Error(validation.errors.join(', '));

      const response = await api.put(`/task/update/${id}`, taskData);
      return response.data;
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error(this.extractErrorMessage(error, 'update task'));
    }
  }

  // Delete task
  async deleteTask(id) {
    try {
      const response = await api.delete(`/task/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error(this.extractErrorMessage(error, 'delete task'));
    }
  }

  // Simple task data validation
  validateTaskData(taskData) {
    const errors = [];
    if (!taskData.taskname && !taskData.description) {
      errors.push('At least task name or description is required');
    }
    if (taskData.taskname && !taskData.taskname.trim()) {
      errors.push('Task name cannot be empty');
    }
    if (taskData.description && !taskData.description.trim()) {
      errors.push('Description cannot be empty');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Extract readable error messages
  extractErrorMessage(error, action = '') {
    return (
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      `Failed to ${action}`
    );
  }
}

const taskService = new TaskService();

export default taskService;
