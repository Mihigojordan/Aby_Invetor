import api from '../api/api';
import db from './dexieDB'; // Dexie instance separated

class TaskService {
  // Check network status
  isOnline() {
    return navigator.onLine;
  }

  // Create task (works offline)
  async createTask(taskData) {
    try {
      const user = useem
      const employeeId = user;
      const validation = this.validateTaskData(taskData);
      if (!validation.isValid) throw new Error(validation.errors.join(', '));
      

      const timestamp = new Date().toISOString();

      // Task with local metadata — ONLY for IndexedDB usage
      const taskWithMeta = {
        ...taskData,
        synced: false,
        local: true,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      if (this.isOnline()) {
        try {
          // Send to backend
          const response = await api.post('/task/create', taskData);

          // Store backend response in IndexedDB with synced=true
          await db.tasks.add({
            ...response.data,
            synced: true,
            local: false,
            updatedAt: timestamp,
            ActivityAt: timestamp
          });

          return response.data;
        // eslint-disable-next-line no-unused-vars
        } catch (apiError) {
          // On API failure, save locally with unsynced flag
          const localId = await db.tasks.add(taskWithMeta);
          return { ...taskWithMeta, id: localId };
        }
      } else {
        // Offline: save locally
        const localId = await db.tasks.add(taskWithMeta);
        return { ...taskWithMeta, id: localId };
      }
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error(this.extractErrorMessage(error, 'create task'));
    }
  }

  // Get all tasks (sync local DB with server data if online)
// Get all tasks (fetch backend if online, else local DB)
// Get all tasks (sync local offline data to server, then refresh with server data)
async getAllTasks() {
  try {
    if (this.isOnline()) {
      try {
        // Step 1: Sync local unsynced data to backend
        await this.syncWithServer();

        // Step 2: Clear all local tasks and deletedTasks from IndexedDB
        await db.tasks.clear();
        await db.deletedTasks.clear();

        // Step 3: Fetch all fresh tasks from server
        const response = await api.get('/task/all');

        // Step 4: Save server tasks to local IndexedDB
        for (const task of response.data) {
          await db.tasks.put({
            ...task,
            synced: true,
            local: false
          });
        }

        // Step 5: Return backend data
        return response.data;
      } catch (apiError) {
        console.warn('API failed, falling back to local data', apiError);
        return await db.tasks.toArray();
      }
    } else {
      // Offline mode — just read from local IndexedDB
      return await db.tasks.toArray();
    }
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

      const timestamp = new Date().toISOString();

      const updateData = {
        ...taskData,
        synced: false,
        updatedAt: timestamp
      };

      if (this.isOnline()) {
        try {
          const response = await api.put(`/task/update/${id}`, taskData);

          await db.tasks.update(id, {
            ...response.data,
            synced: true,
            updatedAt: timestamp
          });

          return response.data;
        // eslint-disable-next-line no-unused-vars
        } catch (apiError) {
          // API failed, update locally with unsynced flag
          await db.tasks.update(id, updateData);
          return { ...updateData, id };
        }
      } else {
        // Offline: update locally
        await db.tasks.update(id, updateData);
        return { ...updateData, id };
      }
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error(this.extractErrorMessage(error, 'update task'));
    }
  }

  // Delete task
  async deleteTask(id) {
    try {
      await db.tasks.delete(id);

      if (this.isOnline()) {
        try {
          await api.delete(`/task/delete/${id}`);
        } catch (apiError) {
          console.warn('API delete failed, queueing for sync', apiError);
          await db.deletedTasks.add({ id, deletedAt: new Date().toISOString() });
        }
      } else {
        await db.deletedTasks.add({ id, deletedAt: new Date().toISOString() });
      }

      return { success: true, id };
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error(this.extractErrorMessage(error, 'delete task'));
    }
  }

  // Sync unsynced tasks and deleted tasks with backend
  async syncWithServer() {
    if (!this.isOnline()) return;

    try {
      // Get unsynced tasks safely (avoid .where if issues)
      const allTasks = await db.tasks.toArray();
      const unsyncedTasks = allTasks.filter(task => task.synced === false);

      for (const task of unsyncedTasks) {
        const timestamp = new Date().toISOString();

        try {
          if (task.local) {
            const response = await api.post('/task/create', {
              taskname: task.taskname,
              description: task.description
            });

            await db.tasks.update(task.id, {
              ...response.data,
              synced: true,
              local: false,
              updatedAt: timestamp
            });
          } else {
            await api.put(`/task/update/${task.id}`, {
              taskname: task.taskname,
              description: task.description
            });

            await db.tasks.update(task.id, {
              synced: true,
              updatedAt: timestamp
            });
          }
        } catch (error) {
          console.error('Task sync failed:', task, error);
        }
      }

      // Sync deleted tasks
      const deletedTasks = await db.deletedTasks.toArray();

      for (const { id } of deletedTasks) {
        try {
          await api.delete(`/task/delete/${id}`);
          await db.deletedTasks.delete(id);
        } catch (error) {
          console.error('Delete sync failed for task:', id, error);
        }
      }

      console.log('✅ Sync complete');
    } catch (error) {
      console.error('❌ Sync process failed:', error);
    }
  }

  // Sync backend data to local DB without removing local-only tasks
  async syncLocalWithServer(serverTasks) {
    for (const serverTask of serverTasks) {
      const localTask = await db.tasks.get(serverTask.id);

      // Only update if local task is missing or already synced (to avoid overwriting local changes)
      if (!localTask || localTask.synced === true) {
        await db.tasks.put({
          ...serverTask,
          synced: true,
          local: false
        });
      }
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

// Don't define schema here — it is in dexieDB.js

// Setup syncing interval and online listener — do this in your app root or component, not here
// setInterval(() => taskService.syncWithServer(), 30000);
// window.addEventListener('online', () => taskService.syncWithServer());

export default taskService;