import React, { useState, useMemo, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  Inbox,
  ExternalLink,
  Clock,
  User,
  Building2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useOutletContext, useSearchParams } from 'react-router-dom';


const NotificationsPage = ({role}) => {


  const [searchParams, setSearchParams] = useSearchParams();

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    fetchNotifications,
    clearError,
    recipientId,
    recipientType,
    page,
    limit,
    search,
    totalPages,
    totalNotifications,
    updatePagination,
    updateSearch,
  } = useNotifications();

  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Initialize from URL params (only on mount)
  useEffect(() => {
    const urlPage = searchParams.get('page');
    const urlLimit = searchParams.get('limit');
    const urlSearch = searchParams.get('search');
    const urlFilter = searchParams.get('filter');

    if (urlPage) {
      const pageNum = parseInt(urlPage, 10);
      if (!Number.isNaN(pageNum) && pageNum !== page) {
        updatePagination(pageNum);
      }
    }
    if (urlLimit) {
      const limitNum = parseInt(urlLimit, 10);
      if (!Number.isNaN(limitNum) && limitNum !== limit) {
        updatePagination(undefined, limitNum);
      }
    }
    if (urlSearch !== null) {
      setSearchQuery(urlSearch);
      updateSearch(urlSearch);
    }
    if (urlFilter && ['all', 'unread', 'read'].includes(urlFilter)) {
      setFilter(urlFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← only on mount

  // Sync state → URL params
  useEffect(() => {
    const params = {};
    if (page > 1) params.page = page.toString();
    if (limit !== 10) params.limit = limit.toString();
    if (searchQuery) params.search = searchQuery;
    if (filter !== 'all') params.filter = filter;

    setSearchParams(params, { replace: true });
  }, [page, limit, searchQuery, filter, setSearchParams]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateSearch(searchQuery);
    }, 480);

    return () => clearTimeout(timer);
  }, [searchQuery, updateSearch]);

  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    if (filter === 'unread') {
      result = result.filter((n) =>
        n.recipients.some((r) => r.id === recipientId && r.type === recipientType && !r.read)
      );
    } else if (filter === 'read') {
      result = result.filter((n) =>
        n.recipients.some((r) => r.id === recipientId && r.type === recipientType && r.read)
      );
    }

    return result;
  }, [notifications, filter, recipientId, recipientType]);

  const isNotificationRead = (notif) => {
    const recipient = notif.recipients.find(
      (r) => r.id === recipientId && r.type === recipientType
    );
    return recipient?.read ?? false;
  };

  const handleMarkAsRead = async (id) => {
    await markAsRead(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleMarkAllAsRead = async () => {
    const unread = filteredNotifications.filter((n) => !isNotificationRead(n));
    await Promise.all(unread.map((n) => markAsRead(n.id)));
    setSelectedIds(new Set());
  };

  const toggleSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) updatePagination(page + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) updatePagination(page - 1);
  };

  const handlePageClick = (p) => updatePagination(p);

  const getPageNumbers = () => {
    const maxVisible = 5;
    const pages = [];

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    if (page <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (page >= totalPages - 2) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      pages.push(page - 1);
      pages.push(page);
      pages.push(page + 1);
      pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getSenderIcon = (type) =>
    type === 'COMPANY' ? (
      <Building2 className="w-4 h-4 text-primary-600" />
    ) : (
      <User className="w-4 h-4 text-gray-600" />
    );

  const filteredUnreadCount = useMemo(
    () => filteredNotifications.filter((n) => !isNotificationRead(n)).length,
    [filteredNotifications]
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-100 rounded-lg">
                <Bell className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>

            <button
              onClick={fetchNotifications}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Refresh'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className=" mx-auto px-4 sm:px-6 lg:px-8 mt-5">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={clearError}
              className="text-red-700 hover:text-red-900 font-medium text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            {/* Search */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gray-500" />
              <div className="flex bg-gray-100 rounded-lg p-1">
                {['all', 'unread', 'read'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      filter === f
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Info + Limit */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-5 pt-5 border-t border-gray-200 text-sm text-gray-600">
            <div>
              Showing{' '}
              <strong>
                {filteredNotifications.length > 0 ? (page - 1) * limit + 1 : 0}
              </strong>{' '}
              –{' '}
              <strong>
                {Math.min(page * limit, totalNotifications)}
              </strong>{' '}
              of <strong>{totalNotifications}</strong>
            </div>

            <div className="flex items-center gap-3">
              <label>Show:</label>
              <select
                value={limit}
                onChange={(e) => updatePagination(undefined, Number(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Bulk actions */}
          {filteredNotifications.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-5 pt-5 border-t border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredNotifications.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selected`
                    : 'Select all'}
                </span>
              </label>

              {filteredUnreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition"
                >
                  <CheckCheck size={16} />
                  Mark all as read
                </button>
              )}
            </div>
          )}
        </div>

        {/* List */}
        <div className="space-y-4">
          {isLoading && notifications.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-800 mb-2">
                No notifications
              </h3>
              <p className="text-gray-500">
                {searchQuery
                  ? 'No results match your search'
                  : filter === 'unread'
                  ? "You're all caught up!"
                  : 'No notifications to show'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isRead = isNotificationRead(notif);
              const isSelected = selectedIds.has(notif.id);

              return (
                <div
                  key={notif.id}
                  className={`bg-white rounded-xl border transition-all hover:shadow-md ${
                    isRead
                      ? 'border-gray-200'
                      : 'border-primary-200 bg-primary-50/40'
                  } ${isSelected ? 'ring-2 ring-primary-500 ring-offset-1' : ''}`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(notif.id)}
                        className="mt-1.5 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            {getSenderIcon(notif.senderType)}
                            <h3
                              className={`text-base font-semibold ${
                                isRead ? 'text-gray-700' : 'text-gray-900'
                              }`}
                            >
                              {notif.title}
                            </h3>
                            {!isRead && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                New
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500 whitespace-nowrap">
                            <Clock size={14} />
                            <span>{formatRelativeTime(notif.createdAt)}</span>
                          </div>
                        </div>

                        <p
                          className={`text-sm mb-4 leading-relaxed ${
                            isRead ? 'text-gray-600' : 'text-gray-700'
                          }`}
                        >
                          {notif.message}
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                          {!isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition"
                            >
                              <Check size={14} />
                              Mark as read
                            </button>
                          )}

                          {notif.link && (
                            <a
                              href={notif.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => !isRead && handleMarkAsRead(notif.id)}
                              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            >
                              <ExternalLink size={14} />
                              View details
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mt-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <button
                onClick={handlePrevPage}
                disabled={page === 1}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {getPageNumbers().map((p, i) => (
                  <React.Fragment key={i}>
                    {p === '...' ? (
                      <span className="px-3 py-2 text-gray-500">...</span>
                    ) : (
                      <button
                        onClick={() => handlePageClick(p)}
                        className={`min-w-[38px] py-2 text-sm font-medium rounded-lg transition-colors ${
                          page === p
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <button
                onClick={handleNextPage}
                disabled={page === totalPages}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;