/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import partnerAuthService from '../services/partnerAuthService';
import pushNotificationService from '../services/pushNotificationService';
import { getClientDescription } from '../stores/detectDevice';

// ✅ Create context
const PartnerAuthContext = createContext({
  partner: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  changePassword: async () => {},
  isAuthenticated: false,
  isLoading: true,
  isSubscribedToNotifications: false,
  subscribeToNotifications: async () => {},
  unsubscribeFromNotifications: async () => {},
  unsubscribeAllDevices: async () => {},
  getSubscriptions: async () => [],
});

// ✅ Provider
export const PartnerAuthProvider = ({ children }) => {
  const [partner, setPartner] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribedToNotifications, setIsSubscribedToNotifications] = useState(false);

  const updateAuthState = (userData, authStatus) => {
    setPartner(userData);
    setIsAuthenticated(authStatus);
    if (!authStatus) {
      setIsSubscribedToNotifications(false);
    }
  };

  // 🔧 Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  };

  // 🔔 Subscribe to push notifications
  const subscribeToNotifications = async (label) => {
    if (!partner?.id) throw new Error('Partner must be logged in to subscribe');

    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator))
        throw new Error('Push notifications not supported');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission denied');

      const registration = await navigator.serviceWorker.ready;

      const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) throw new Error('VAPID public key not configured');

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      const subscriptionObject = subscription.toJSON();

      await pushNotificationService.subscribe(
        partner.id,
        'PARTNER',
        {
          id: '',
          userId: partner.id,
          type: 'PARTNER',
          endpoint: subscriptionObject.endpoint,
          p256dh: subscriptionObject.keys.p256dh,
          auth: subscriptionObject.keys.auth,
          label: label || `${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'} Device`,
          createdAt: new Date().toISOString(),
        },
        label
      );

      setIsSubscribedToNotifications(true);
      return { success: true, message: 'Subscribed to notifications' };
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      throw new Error(error?.message || 'Failed to subscribe');
    }
  };

  // 🔕 Unsubscribe from notifications (current device)
  const unsubscribeFromNotifications = async () => {
    if (!partner?.id) throw new Error('Partner must be logged in');

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await pushNotificationService.unsubscribeDevice(partner.id, 'PARTNER', endpoint);
      }

      setIsSubscribedToNotifications(false);
      return { success: true, message: 'Unsubscribed successfully' };
    } catch (error) {
      console.error('Error unsubscribing:', error);
      throw new Error(error?.message || 'Failed to unsubscribe');
    }
  };

  // 🔕 Unsubscribe all devices
  const unsubscribeAllDevices = async () => {
    if (!partner?.id) throw new Error('Partner must be logged in');

    try {
      await pushNotificationService.unsubscribeAllDevices(partner.id, 'PARTNER');

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();

      setIsSubscribedToNotifications(false);
      return { success: true, message: 'All devices unsubscribed' };
    } catch (error) {
      console.error('Error unsubscribing all devices:', error);
      throw new Error(error?.message || 'Failed to unsubscribe all devices');
    }
  };

  // 📋 Get all subscriptions
  const getSubscriptions = async () => {
    if (!partner?.id) throw new Error('Partner must be logged in');

    try {
      return await pushNotificationService.getSubscriptions(partner.id, 'PARTNER');
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      throw new Error(error?.message || 'Failed to fetch subscriptions');
    }
  };

  // 🔹 Register
  const register = async (data) => {
    try {
      const response = await partnerAuthService.register(data);
      updateAuthState(null, false);
      return response.partner;
    } catch (error) {
      throw new Error(error?.message || 'Registration failed');
    }
  };

  // 🔹 Login
  const login = async (credentials) => {
    try {
      const response = await partnerAuthService.login(credentials);
      updateAuthState(response.partner, true);
      return response.partner;
    } catch (error) {
      throw new Error(error?.message || 'Login failed');
    }
  };

  // 🔹 Logout
  const logout = async () => {
    try {
      await partnerAuthService.logout();
      updateAuthState(null, false);
    } catch (error) {
      updateAuthState(null, false);
      throw new Error(error?.message || 'Logout failed');
    }
  };

  // 🔹 Update profile
  const updateProfile = async (updates) => {
    try {
      const updatedPartner = await partnerAuthService.editProfile(updates);
      updateAuthState(updatedPartner, true);
      return updatedPartner;
    } catch (error) {
      throw new Error(error?.message || 'Failed to update profile');
    }
  };

  // 🔹 Change password
  const changePassword = async (passwordData) => {
    try {
      return await partnerAuthService.changePassword(passwordData);
    } catch (error) {
      throw new Error(error?.message || 'Failed to change password');
    }
  };

  // 🔹 Check existing session
  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      const profile = await partnerAuthService.getProfile();
      if (profile) updateAuthState(profile, true);
      else updateAuthState(null, false);
    } catch {
      updateAuthState(null, false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value = {
    partner,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    unsubscribeAllDevices,
    getSubscriptions,
    isAuthenticated,
    isLoading,
    isSubscribedToNotifications,
  };

  return (
    <PartnerAuthContext.Provider value={value}>
      {children}
    </PartnerAuthContext.Provider>
  );
};

// ✅ Hook
export const usePartnerAuth = () => {
  const context = useContext(PartnerAuthContext);
  if (!context) throw new Error('usePartnerAuth must be used within a PartnerAuthProvider');
  return context;
};
