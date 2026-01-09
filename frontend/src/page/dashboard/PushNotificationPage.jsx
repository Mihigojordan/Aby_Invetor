import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Bell,
  BellOff,
  Smartphone,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';

import  useAdminAuth  from '../../context/AdminAuthContext';
import  useEmployeeAuth  from '../../context/EmployeeAuthContext';
import { usePartnerAuth } from '../../context/PartnerAuthContext';

import { getClientDescription } from '../../stores/detectDevice';

const roleToAuthHook = {
  admin: useAdminAuth,
  employee: useEmployeeAuth,
  partner: usePartnerAuth,
};

const roleToTypeMap = {
  admin: 'ADMIN',
  employee: 'EMPLOYEE',
  partner: 'PARTNER',
};

const PushNotificationPage = ({role}) => {
 

  // Get appropriate auth context based on role
  const useAuth = roleToAuthHook[role];
  if (!useAuth) {
    throw new Error(`Unsupported role: ${role}`);
  }

  const auth = useAuth();

  const {
    isAuthenticated,
    isSubscribedToNotifications,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    unsubscribeAllDevices,
    getSubscriptions,
    user,     // admin/employee → user, partner → partner
    partner,  // only for partner role
  } = auth;

  const currentUser = role === 'partner' ? partner : user;

  const client = getClientDescription();

  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [deviceLabel, setDeviceLabel] = useState(client.description || '');
  const [showLabelInput, setShowLabelInput] = useState(false);

  const [currentEndpoint, setCurrentEndpoint] = useState(null);

  useEffect(() => {
    setDeviceLabel(client.description || '');
  }, []);

  const getUserName = () => {
    if (role === 'partner' && partner) return partner.name || partner.companyName || 'Partner';
    if (role === 'employee' && user) return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Employee';
    if (role === 'admin' && user) return user.adminName || user.name || 'Admin';
    return 'User';
  };

  // Fetch current device push subscription endpoint
  useEffect(() => {
    const fetchCurrentEndpoint = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setCurrentEndpoint(subscription?.endpoint || null);
      } catch (err) {
        console.warn('Could not get current push subscription', err);
        setCurrentEndpoint(null);
      }
    };

    if (isAuthenticated) {
      fetchCurrentEndpoint();
    }
  }, [isAuthenticated, isSubscribedToNotifications]);

  // Fetch list of subscribed devices
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchSubscriptions = async () => {
      setLoading(true);
      try {
        const subs = await getSubscriptions();
        setSubscriptions(subs || []);
      } catch (error) {
        showNotification('error', error.message || 'Failed to load devices');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, [isAuthenticated, isSubscribedToNotifications]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4800);
  };

  const handleSubscribe = async () => {
    setActionLoading(true);
    try {
      const label = deviceLabel.trim() || undefined;
      const result = await subscribeToNotifications(label);
      showNotification('success', result.message || 'Device subscribed successfully');
      setShowLabelInput(false);
      setDeviceLabel(client.description || '');
    } catch (err) {
      showNotification('error', err.message || 'Failed to subscribe device');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!window.confirm('Really unsubscribe this device?')) return;

    setActionLoading(true);
    try {
      const result = await unsubscribeFromNotifications();
      showNotification('success', result.message || 'Device unsubscribed');
    } catch (err) {
      showNotification('error', err.message || 'Failed to unsubscribe');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsubscribeAll = async () => {
    if (!window.confirm('Unsubscribe ALL devices? This cannot be undone.')) return;

    setActionLoading(true);
    try {
      const result = await unsubscribeAllDevices();
      showNotification('success', result.message || 'All devices unsubscribed');
    } catch (err) {
      showNotification('error', err.message || 'Failed to unsubscribe all devices');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-10 max-w-md w-full text-center">
          <AlertCircle className="w-20 h-20 text-amber-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to manage your push notification settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12 pt-8 px-4 sm:px-6 lg:px-8">
      <div className=" mx-auto">

        {/* Toast Notification */}
        {notification && (
          <div
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl text-white transition-all duration-300 ${
              notification.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6" />
            )}
            <span className="font-medium">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-7 mb-8">
          <div className="flex items-center gap-5">
            <div className="bg-primary-100 p-4 rounded-full">
              <Bell className="w-10 h-10 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Push Notifications</h1>
              <p className="text-gray-600 mt-1">
                Manage notification settings for <strong>{getUserName()}</strong> ({role})
              </p>
            </div>
          </div>
        </div>

        {/* Current Device Status */}
        <div className="bg-white rounded-xl shadow-md p-7 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-semibold text-gray-900">This Device</h2>
            <div
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium ${
                isSubscribedToNotifications
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {isSubscribedToNotifications ? (
                <>
                  <Bell className="w-4 h-4" /> Active
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4" /> Inactive
                </>
              )}
            </div>
          </div>

          <p className="text-gray-600 mb-6 leading-relaxed">
            {isSubscribedToNotifications
              ? 'This device is receiving important updates and alerts.'
              : 'Enable notifications to stay informed in real time.'}
          </p>

          {!isSubscribedToNotifications ? (
            showLabelInput ? (
              <div className="space-y-4 max-w-lg">
                <input
                  type="text"
                  value={deviceLabel}
                  onChange={(e) => setDeviceLabel(e.target.value)}
                  placeholder="Device label (optional) — e.g. Work MacBook"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSubscribe}
                    disabled={actionLoading}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                  >
                    {actionLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                    Confirm Subscription
                  </button>
                  <button
                    onClick={() => {
                      setShowLabelInput(false);
                      setDeviceLabel(client.description || '');
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowLabelInput(true)}
                disabled={actionLoading}
                className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-8 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                <Bell className="w-5 h-5" />
                Enable Notifications
              </button>
            )
          ) : (
            <button
              onClick={handleUnsubscribe}
              disabled={actionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white font-medium py-3 px-8 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {actionLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <BellOff className="w-5 h-5" />
              )}
              Disable on This Device
            </button>
          )}
        </div>

        {/* All Subscribed Devices */}
        <div className="bg-white rounded-xl shadow-md p-7">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              All Subscribed Devices ({subscriptions.length})
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => getSubscriptions()}
                disabled={loading}
                title="Refresh list"
                className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
              >
                <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {subscriptions.length > 0 && (
                <button
                  onClick={handleUnsubscribeAll}
                  disabled={actionLoading}
                  className="px-5 py-2.5 text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50 flex items-center gap-2 font-medium"
                  title="Remove all devices"
                >
                  <Trash2 className="w-5 h-5" />
                  Unsubscribe All
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <RefreshCw className="w-12 h-12 text-primary-600 animate-spin" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-16">
              <Smartphone className="w-20 h-20 text-gray-300 mx-auto mb-5" />
              <p className="text-gray-600 text-xl font-medium">No devices found</p>
              <p className="text-gray-500 mt-2">
                Enable notifications on your devices to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((sub) => {
                const isCurrent = currentEndpoint === sub.endpoint;

                return (
                  <div
                    key={sub.id || sub.endpoint}
                    className={`p-5 border rounded-xl transition-all ${
                      isCurrent
                        ? 'border-primary-300 bg-primary-50/60'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-lg ${
                            isCurrent ? 'bg-primary-100' : 'bg-gray-100'
                          }`}
                        >
                          <Smartphone
                            className={`w-6 h-6 ${
                              isCurrent ? 'text-primary-600' : 'text-gray-600'
                            }`}
                          />
                        </div>

                        <div>
                          <p className="font-semibold text-gray-900">
                            {sub.label || 'Unnamed Device'}
                          </p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            Added: {formatDate(sub.createdAt)}
                          </p>
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-medium">
                          Current Device
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-10 bg-primary-50 border border-primary-100 rounded-xl p-6">
          <div className="flex gap-4">
            <AlertCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
            <div className="text-sm text-primary-900">
              <p className="font-medium mb-1.5">How push notifications work</p>
              <p>
                You can enable/disable notifications separately for each device you use. 
                The "Unsubscribe All" option removes every registered device at once.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .fixed {
          animation: slideInFromRight 0.35s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default PushNotificationPage;