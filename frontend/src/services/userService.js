import axios from 'axios';
import {
    saveUserOffline,
    getUnsyncedUsers,
    deleteUser
} from './indexedDBService';

const API_URL = 'http://localhost:3000/auth'; // your backend endpoint

export async function addUser(user) {
    if (navigator.onLine) {
        try {
            // Remove IndexedDB-specific fields before sending
            const { id: _id, synced: _synced, ...userData } = user;
            await axios.post(API_URL, userData);
        } catch (err) {
            if (err.response.status === 409) {
                console.error('User already exists');
                // Optionally notify user
            } else {
                console.error('Network/server error, saving offline');
                await saveUserOffline(user);
            }
        }
    } else {
        await saveUserOffline(user);
    }
}

export async function syncOfflineUsers() {
    if (!navigator.onLine) return;

    const users = await getUnsyncedUsers();
    if (users.length === 0) return;

    try {
        for (const user of users) {
            const { id, synced: _synced, ...userData } = user;
            await axios.post(API_URL, userData);
            // After successful sync, remove user from IndexedDB
            await deleteUser(id);
        }
        console.log('Offline users synced and removed locally.');
    } catch (err) {
        console.error('Sync failed:', err);
    }
}