import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useSocket, useSocketEvent } from './SocketContext';
import notificationService from '../services/notificationService';

/**
 * @typedef {import('../services/notificationService').Notification} Notification
 * @typedef {import('../services/notificationService').Recipient} Recipient
 */

/** @typedef {{ id: string; type: 'COMPANY'|'EMPLOYEE' }} RecipientIdentifier */

/** @typedef {{
 *   recipients: Recipient[];
 *   title: string;
 *   message: string;
 *   link?: string;
 * }} CreateNotificationInput
 */

/** @typedef {{
 *   notifications: Notification[];
 *   unreadCount: number;
 *   isLoading: boolean;
 *   error: string | null;
 *   recipientId: string | null;
 *   recipientType: 'COMPANY' | 'EMPLOYEE' | null;
 *   page: number;
 *   limit: number;
 *   search: string;
 *   totalPages: number;
 *   totalNotifications: number;
 *   setRecipient: (id: string, type: 'COMPANY'|'EMPLOYEE') => void;
 *   fetchNotifications: () => Promise<void>;
 *   markAsRead: (notificationId: string) => Promise<void>;
 *   createNotification: (data: CreateNotificationInput) => Promise<Notification|null>;
 *   clearError: () => void;
 *   getUnreadNotifications: () => Notification[];
 *   getReadNotifications: () => Notification[];
 *   updatePagination: (newPage?: number, newLimit?: number) => void;
 *   updateSearch: (searchTerm: string) => void;
 * }} NotificationContextValue */

/** @type {React.Context<NotificationContextValue|null>} */
const NotificationContext = createContext(null);

/**
 * Updates the badge count shown on the app icon (via service worker)
 * @param {number} count
 */
const updateServiceWorkerBadge = (count) => {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: 'UPDATE_BADGE',
    count,
  });
};

/**
 * Notifies service worker that at least one notification was read
 */
const notifyServiceWorkerOfRead = () => {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: 'NOTIFICATION_READ',
  });
};

// ────────────────────────────────────────────────
// PROVIDER
// ────────────────────────────────────────────────

export const NotificationProvider = ({ children }) => {
  const { isConnected } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [recipientId, setRecipientId] = useState(null);
  const [recipientType, setRecipientType] = useState(null);

  // Pagination & search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [totalNotifications, setTotalNotifications] = useState(0);

  // ─── Set current user/recipient ───────────────────────
  const setRecipient = useCallback((id, type) => {
    setRecipientId(id);
    setRecipientType(type);
  }, []);

  // ─── Pagination control ───────────────────────────────
  const updatePagination = useCallback((newPage, newLimit) => {
    if (newPage !== undefined) setPage(newPage);
    if (newLimit !== undefined) {
      setLimit(newLimit);
      setPage(1); // reset to first page on limit change
    }
  }, []);

  // ─── Search control ───────────────────────────────────
  const updateSearch = useCallback((searchTerm) => {
    setSearch(searchTerm);
    setPage(1); // reset pagination on search
  }, []);

  // ─── Computed unread count ────────────────────────────
  const unreadCount = useMemo(() => {
    if (!recipientId || !recipientType) return 0;

    return notifications.filter((notif) =>
      notif.recipients.some(
        (r) => r.id === recipientId && r.type === recipientType && !r.read
      )
    ).length;
  }, [notifications, recipientId, recipientType]);

  // Sync badge count
  useEffect(() => {
    updateServiceWorkerBadge(unreadCount);
  }, [unreadCount]);

  // ─── Fetch notifications ──────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!recipientId || !recipientType) return;

    setIsLoading(true);
    setError(null);

    try {
      const { notifications: data, meta } = await notificationService.getNotifications(
        page,
        limit,
        search
      );

      // Only keep notifications where current user is recipient
      const relevant = data.filter((n) =>
        n.recipients.some((r) => r.id === recipientId && r.type === recipientType)
      );

      setNotifications(relevant);

      if (meta) {
        setTotalPages(meta.totalPages ?? 0);
        setTotalNotifications(meta.total ?? 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [recipientId, recipientType, page, limit, search]);

  // ─── Mark single notification as read ─────────────────
  const markAsRead = useCallback(
    async (notificationId) => {
      if (!recipientId || !recipientType) return;

      try {
        await notificationService.markAsRead(notificationId);

        // Optimistic update
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId
              ? {
                  ...notif,
                  recipients: notif.recipients.map((r) =>
                    r.id === recipientId && r.type === recipientType
                      ? { ...r, read: true }
                      : r
                  ),
                }
              : notif
          )
        );

        notifyServiceWorkerOfRead();
      } catch (err) {
        console.error('Failed to mark as read:', err);
        setError(err.message || 'Failed to mark notification as read');
      }
    },
    [recipientId, recipientType]
  );

  // ─── Create new notification ──────────────────────────
  const createNotification = useCallback(
    async (data) => {
      if (!recipientId || !recipientType) return null;

      try {
        const created = await notificationService.createNotification(data);

        // Add to list if current user is recipient
        const isForMe = created.recipients.some(
          (r) => r.id === recipientId && r.type === recipientType
        );

        if (isForMe) {
          setNotifications((prev) => [created, ...prev]);
        }

        return created;
      } catch (err) {
        console.error('Failed to create notification:', err);
        setError(err.message || 'Failed to create notification');
        return null;
      }
    },
    [recipientId, recipientType]
  );

  // ─── Helpers ──────────────────────────────────────────
  const clearError = useCallback(() => setError(null), []);

  const getUnreadNotifications = useCallback(() => {
    if (!recipientId || !recipientType) return [];
    return notifications.filter((n) =>
      n.recipients.some((r) => r.id === recipientId && r.type === recipientType && !r.read)
    );
  }, [notifications, recipientId, recipientType]);

  const getReadNotifications = useCallback(() => {
    if (!recipientId || !recipientType) return [];
    return notifications.filter((n) =>
      n.recipients.some((r) => r.id === recipientId && r.type === recipientType && r.read)
    );
  }, [notifications, recipientId, recipientType]);

  // ─── Real-time updates via Socket ─────────────────────
  useSocketEvent('new-notification', (notification) => {
    if (!recipientId || !recipientType) return;

    const isForMe = notification.recipients.some(
      (r) => r.id === recipientId && r.type === recipientType
    );

    if (isForMe) {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });
    }
  });

  useSocketEvent('notification-read', ({ notificationId, recipientId: readBy }) => {
    if (readBy !== recipientId) return;

    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId
          ? {
              ...notif,
              recipients: notif.recipients.map((r) =>
                r.id === recipientId && r.type === recipientType
                  ? { ...r, read: true }
                  : r
              ),
            }
          : notif
      )
    );
  });

  // Auto-fetch when recipient & socket are ready
  useEffect(() => {
    if (recipientId && recipientType && isConnected) {
      fetchNotifications();
    }
  }, [recipientId, recipientType, isConnected, fetchNotifications]);

  // ─── Final context value ──────────────────────────────
  const value = {
    notifications,
    unreadCount,
    isLoading,
    error,
    recipientId,
    recipientType,
    page,
    limit,
    search,
    totalPages,
    totalNotifications,
    setRecipient,
    fetchNotifications,
    markAsRead,
    createNotification,
    clearError,
    getUnreadNotifications,
    getReadNotifications,
    updatePagination,
    updateSearch,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// ────────────────────────────────────────────────
// HOOK
// ────────────────────────────────────────────────

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export default NotificationProvider;