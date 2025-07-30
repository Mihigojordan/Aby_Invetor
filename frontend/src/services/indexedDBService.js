const DB_NAME = 'UserDB';
const DB_VERSION = 1;
const STORE_NAME = 'users';

export function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject('Error opening IndexedDB');
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// Save user offline with synced = false
export async function saveUserOffline(user) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.add({...user, synced: false });
    return tx.complete;
}

// Get all offline users
export async function getAllOfflineUsers() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Error retrieving users');
    });
}

// Get unsynced users only (synced === false)
export async function getUnsyncedUsers() {
    const allUsers = await getAllOfflineUsers();
    return allUsers.filter(user => user.synced === false);
}

// Delete a user by id
export async function deleteUser(id) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    return tx.complete;
}

// Optional: Clear all offline users (if needed)
export async function clearOfflineUsers() {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    return tx.complete;
}