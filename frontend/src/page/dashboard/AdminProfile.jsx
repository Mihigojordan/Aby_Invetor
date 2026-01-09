import React, { useState } from 'react';
import { User, Mail, Calendar, Shield, Lock, Bell, Settings } from 'lucide-react';
import useAdminAuth from '../../context/AdminAuthContext';
import PushNotificationPage from './PushNotificationPage';

// You can import your real Notifications component here
// import NotificationsList from './NotificationsList'; // ← your actual notifications component

const AdminProfile = () => {
  const { user } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'notifications'

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className=" mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Profile</h1>
          <p className="mt-2 text-gray-600">
            Manage your account information and notification preferences
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('profile')}
                className={`group relative min-w-0 flex-1 overflow-hidden py-5 px-6 text-sm font-medium text-center hover:bg-gray-50 focus:z-10 transition-colors ${
                  activeTab === 'profile'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <User className="w-5 h-5" />
                  <span>Profile Details</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('notifications')}
                className={`group relative min-w-0 flex-1 overflow-hidden py-5 px-6 text-sm font-medium text-center hover:bg-gray-50 focus:z-10 transition-colors ${
                  activeTab === 'notifications'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Bell className="w-5 h-5" />
                  <span>Notifications</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6 md:p-8">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-10">
                {/* Profile Header Card */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
                  <div className="absolute inset-0 bg-black opacity-10"></div>
                  <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                      <User className="w-12 h-12 text-white" />
                    </div>

                    <div>
                      <h2 className="text-3xl font-bold mb-2">
                        {user?.adminName || 'Admin User'}
                      </h2>
                      <p className="text-primary-100 text-lg mb-4">{user?.adminEmail}</p>

                      <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm">
                        {user?.isLocked ? (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            <span className="font-medium">Account Locked</span>
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 mr-2" />
                            <span className="font-medium">Account Active</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Information Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Personal Information */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 pb-3 border-b">
                      Personal Information
                    </h3>

                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Full Name</p>
                          <p className="text-lg font-medium text-gray-900">
                            {user?.adminName || 'Not provided'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Mail className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Email Address</p>
                          <p className="text-lg font-medium text-gray-900">
                            {user?.adminEmail || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 pb-3 border-b">
                      Account Details
                    </h3>

                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Shield className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Account Status</p>
                          <div className="flex items-center">
                            <div
                              className={`w-3 h-3 rounded-full mr-2 ${
                                user?.isLocked ? 'bg-red-500' : 'bg-green-500'
                              }`}
                            ></div>
                            <p className="text-lg font-medium text-gray-900">
                              {user?.isLocked ? 'Locked' : 'Active'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Created At</p>
                          <p className="text-lg font-medium text-gray-900">
                            {formatDate(user?.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="mt-10 bg-primary-50 border border-primary-100 rounded-xl p-6 text-center">
                  <div className="flex items-center justify-center gap-2 text-primary-700">
                    <Shield className="w-5 h-5" />
                    <p className="text-sm">
                      This is a read-only view. Contact the system administrator for any changes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Bell className="w-5 h-5" />
                    <span>Manage how you receive updates</span>
                  </div>
                </div>

               
                    <PushNotificationPage role={'admin'} />

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;