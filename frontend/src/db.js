// src/db.js
import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';

const db = new Dexie('MyOfflineApp');
db.version(1).stores({
  items: 'uuid, name, description, syncStatus, [syncStatus+lastModified]',
});

export default db;