import api from '../api/api'; // Adjust the import path as needed

class TaskService {
    async createTask(taskData) {
        try {
            const response = await api.post('/task/create', taskData);
            return response.data;
        } catch (error) {
            console.error('Error creating task:', error);
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to create task';
            throw new Error(errorMessage);
        }
    }

    async getAllTasks() {
        try {
            const response = await api.get('/task/all');
            return response.data;
        } catch (error) {
            console.error('Error fetching tasks:', error);
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to fetch tasks';
            throw new Error(errorMessage);
        }
    }

    async findTaskByName(taskname) {
        try {
            const response = await api.get(`/task/by-name/${encodeURIComponent(taskname)}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            console.error('Error finding task by name:', error);
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to find task';
            throw new Error(errorMessage);
        }
    }

    async findTaskById(id) {
        try {
            const response = await api.get(`/task/${id}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            console.error('Error finding task by ID:', error);
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to find task';
            throw new Error(errorMessage);
        }
    }

    async updateTask(id, taskData) {
        try {
            const response = await api.put(`/task/${id}`, taskData);
            return response.data;
        } catch (error) {
            console.error('Error updating task:', error);
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to update task';
            throw new Error(errorMessage);
        }
    }

    async deleteTask(id) {
        try {
            const response = await api.delete(`/task/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting task:', error);
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to delete task';
            throw new Error(errorMessage);
        }
    }

    validateTaskData(taskData) {
        const errors = [];
        if (!taskData.taskname && !taskData.description) {
            errors.push('At least task name or description is required');
        }
        if (taskData.taskname && !taskData.taskname.trim()) {
            errors.push('Task name cannot be empty if provided');
        }
        if (taskData.description && !taskData.description.trim()) {
            errors.push('Description cannot be empty if provided');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

const taskService = new TaskService();
export default taskService;

export const {
    createTask,
    getAllTasks,
    findTaskByName,
    findTaskById,
    updateTask,
    deleteTask,
    validateTaskData
} = taskService;