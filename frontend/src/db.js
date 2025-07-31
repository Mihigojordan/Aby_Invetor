// src/db.js
import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';

const db = new Dexie('aby_inventory');

db.version(1).stores({
  // Admin table - added fields for offline support
  admins: 'id, adminEmail, adminName, password, lastKnownPasswordHash, isLocked, lastLoginAt, createdAt, updatedAt',
  
  // Auth session table (for storing current auth state)
  authSession: 'key, value, timestamp',
  
  // Offline queue for actions that need to sync when online
  offlineQueue: '++id, action, data, timestamp, synced'
});

// Helper functions for Admin operations
export const AdminService = {
  // Create a new admin
  async createAdmin(adminData) {
    const admin = {
      id: adminData.id || uuidv4(),
      adminName: adminData.adminName || null,
      adminEmail: adminData.adminEmail || null,
      password: adminData.password || null,
      lastKnownPasswordHash: adminData.lastKnownPasswordHash || null,
      isLocked: adminData.isLocked || false,
      lastLoginAt: adminData.lastLoginAt || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.admins.add(admin);
    return admin;
  },

  // Get admin by email
  async getAdminByEmail(adminEmail) {
    return await db.admins.where('adminEmail').equals(adminEmail).first();
  },

  // Get admin by ID
  async getAdminById(id) {
    return await db.admins.get(id);
  },

  // Update admin
  async updateAdmin(id, updates) {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    
    await db.admins.update(id, updateData);
    return await db.admins.get(id);
  },

  // Update last login time
  async updateLastLogin(id) {
    return await this.updateAdmin(id, { lastLoginAt: new Date() });
  },

  // Lock/Unlock admin
  async lockAdmin(id) {
    const result = await this.updateAdmin(id, { isLocked: true });
    
    // Queue action for sync when online
    await OfflineQueueService.addAction('LOCK_ADMIN', { adminId: id });
    
    return result;
  },

  async unlockAdmin(id) {
    const result = await this.updateAdmin(id, { isLocked: false });
    
    // Queue action for sync when online
    await OfflineQueueService.addAction('UNLOCK_ADMIN', { adminId: id });
    
    return result;
  },

  // Get all admins
  async getAllAdmins() {
    return await db.admins.toArray();
  },

  // Delete admin
  async deleteAdmin(id) {
    await db.admins.delete(id);
  },

  // Check if admin can login offline (has previous successful login)
  async canLoginOffline(adminEmail) {
    const admin = await this.getAdminByEmail(adminEmail);
    return admin && admin.lastLoginAt !== null;
  }
};

// Helper functions for Auth Session operations
export const AuthSessionService = {
  // Auth session keys
  KEYS: {
    CURRENT_USER: 'current_user',
    IS_AUTHENTICATED: 'is_authenticated',
    IS_LOCKED: 'is_locked',
    LAST_ACTIVITY: 'last_activity',
    OFFLINE_MODE: 'offline_mode',
    LAST_SYNC: 'last_sync'
  },

  // Set auth session data
  async setAuthData(key, value) {
    const sessionData = {
      key,
      value: JSON.stringify(value),
      timestamp: new Date()
    };
    
    await db.authSession.put(sessionData);
  },

  // Get auth session data
  async getAuthData(key) {
    const session = await db.authSession.get(key);
    if (session) {
      try {
        return JSON.parse(session.value);
      } catch (error) {
        console.error('Error parsing auth session data:', error);
        return null;
      }
    }
    return null;
  },

  // Clear all auth session data
  async clearAuthSession() {
    await db.authSession.clear();
  },

  // Clear specific auth data
  async clearAuthData(key) {
    await db.authSession.delete(key);
  },

  // Check if session is expired (optional - you can implement session timeout)
  async isSessionExpired(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const lastActivity = await this.getAuthData(this.KEYS.LAST_ACTIVITY);
    if (!lastActivity) return true;
    
    const now = new Date().getTime();
    const lastTime = new Date(lastActivity).getTime();
    return (now - lastTime) > maxAge;
  },

  // Update last activity
  async updateLastActivity() {
    await this.setAuthData(this.KEYS.LAST_ACTIVITY, new Date());
  },

  // Set offline mode
  async setOfflineMode(isOffline) {
    await this.setAuthData(this.KEYS.OFFLINE_MODE, isOffline);
  },

  // Check if in offline mode
  async isOfflineMode() {
    return await this.getAuthData(this.KEYS.OFFLINE_MODE) || false;
  },

  // Update last sync time
  async updateLastSync() {
    await this.setAuthData(this.KEYS.LAST_SYNC, new Date());
  }
};

// Helper functions for Offline Queue operations
export const OfflineQueueService = {
  // Add action to queue
  async addAction(action, data) {
    const queueItem = {
      action,
      data: JSON.stringify(data),
      timestamp: new Date(),
      synced: false
    };
    
    return await db.offlineQueue.add(queueItem);
  },

  // Get all unsynced actions
  async getUnsyncedActions() {
    return await db.offlineQueue.where('synced').equals(false).toArray();
  },

  // Mark action as synced
  async markAsSynced(id) {
    await db.offlineQueue.update(id, { synced: true });
  },

  // Clear synced actions older than specified days
  async clearOldSyncedActions(daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    await db.offlineQueue
      .where('synced').equals(true)
      .and(item => item.timestamp < cutoffDate)
      .delete();
  },

  // Get queue count
  async getQueueCount() {
    return await db.offlineQueue.where('synced').equals(false).count();
  }
};

// Sync service for when connection is restored
export const SyncService = {
  // Sync all pending actions
  async syncPendingActions(adminAuthService) {
    try {
      const pendingActions = await OfflineQueueService.getUnsyncedActions();
      
      for (const actionItem of pendingActions) {
        try {
          const data = JSON.parse(actionItem.data);
          
          switch (actionItem.action) {
            case 'LOCK_ADMIN':
              await adminAuthService.lockAdmin();
              break;
            case 'UNLOCK_ADMIN':
              await adminAuthService.unlockAdmin(data);
              break;
            // Add more action types as needed
          }
          
          // Mark as synced
          await OfflineQueueService.markAsSynced(actionItem.id);
          
        } catch (syncError) {
          console.error(`Error syncing action ${actionItem.action}:`, syncError);
          // Don't mark as synced if it failed
        }
      }
      
      // Update last sync time
      await AuthSessionService.updateLastSync();
      
      // Clean up old synced actions
      await OfflineQueueService.clearOldSyncedActions();
      
      return true;
    } catch (error) {
      console.error('Error during sync:', error);
      return false;
    }
  },

  // Get sync status
  async getSyncStatus() {
    const queueCount = await OfflineQueueService.getQueueCount();
    const lastSync = await AuthSessionService.getAuthData(AuthSessionService.KEYS.LAST_SYNC);
    
    return {
      pendingActions: queueCount,
      lastSync: lastSync,
      needsSync: queueCount > 0
    };
  }
};

// Database initialization function
export const initializeDatabase = async () => {
  try {
    // Open the database
    await db.open();
    console.log('Dexie database is ready');
    
    // You can add initial setup here if needed
    const adminCount = await db.admins.count();
    if (adminCount === 0) {
      console.log('No admins found, you may want to create a default admin');
    }
    
    // Clean up old synced actions on startup
    await OfflineQueueService.clearOldSyncedActions();
    
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
};

// Handle database errors
db.on('blocked', () => {
  console.warn('Database is blocked - another tab may need to close');
});

db.on('versionchange', () => {
  console.warn('Database version changed - reloading page');
  window.location.reload();
});

// Export database instance and services
export default db 

