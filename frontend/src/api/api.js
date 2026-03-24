import axios  from 'axios';

export const API_URL = import.meta.env.VITE_API_URL
// Create an axios instance with a base URL
const api = axios.create({
  baseURL:API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',

  },
  withCredentials:true
});

// ─── 401 Interceptor ───────────────────────────────────────────────────────────
// When any API call returns 401 (auth expired), dispatch a custom event so the
// SyncContext can pause the sync queue. This prevents offline queue items from
// being permanently deleted after 5 retries during an expired-token period.
// SyncContext listens for 'sync:pause' and resumes via resumeSync() after re-auth.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Dispatch event instead of importing SyncContext directly — avoids circular deps
      window.dispatchEvent(new CustomEvent('sync:pause'));
    }
    return Promise.reject(error);
  }
);

export default api;