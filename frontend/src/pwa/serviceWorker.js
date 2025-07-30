// src/serviceWorker.js
import { syncOfflineUsers } from '../services/userService';

export function registerServiceWorker() {
    window.addEventListener('online', () => {
        console.log('[SW] Back online, syncing users...');
        syncOfflineUsers();
    });

    window.addEventListener('offline', () => {
        console.log('[SW] You are offline. Changes will be saved locally.');
    });
}