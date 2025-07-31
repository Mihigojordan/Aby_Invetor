import Dexie from 'dexie';

const db = new Dexie('TaskDB');

db.version(2).stores({
    tasks: 'id, synced, taskname, description, updatedAt',
    deletedTasks: 'id'
});

export default db;