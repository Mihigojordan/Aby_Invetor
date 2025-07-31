import { useEffect } from 'react';
import taskService from './services/';

export default function SyncOnOnline() {
  useEffect(() => {
    // Sync immediately if online when component mounts
    if (navigator.onLine) {
      taskService.syncWithServer();
    }

    // Listen for network coming back online
    const handleOnline = () => {
      console.log('Network online — syncing tasks');
      taskService.syncWithServer();
    };

    window.addEventListener('online', handleOnline);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null; // No UI
}
