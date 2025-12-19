import React, { useState, useEffect, memo } from 'react';
import {
  User, Mail, Phone, MapPin, Lock, Camera, Save, X, Edit2,
  CheckCircle, AlertCircle, Eye, EyeOff, Building2, Calendar,
  Shield, FileText, Download, Trash2, Loader2,
  Bell, MessageCircleCode
} from 'lucide-react';
import { usePartnerAuth } from '../../../context/PartnerAuthContext';
import { API_URL } from '../../../api/api';
import Swal from 'sweetalert2';
// import PushNotificationPage from '../PushNotificationPage';

/* -------------------------------------------------------------------------- */
/*                   REUSABLE INPUT COMPONENTS (unchanged)                   */
/* -------------------------------------------------------------------------- */
const InputField = memo(({ label, icon: Icon, error, readOnly, ...props }) => (
  <div className="space-y-1.5">
    <label className="flex items-center text-sm font-medium text-gray-700">
      {Icon && <Icon className="w-4 h-4 mr-1.5 text-gray-400" />}
      {label}
    </label>
    <input
      {...props}
      readOnly={readOnly}
      className={`w-full px-4 py-2.5 border rounded-lg transition-all duration-200 ${
        readOnly
          ? 'bg-gray-50 text-gray-600 cursor-not-allowed'
          : 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
      } ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
    />
    {error && (
      <p className="flex items-center text-xs text-red-600">
        <AlertCircle className="w-3 h-3 mr-1" />
        {error}
      </p>
    )}
  </div>
));

const PasswordField = memo(({ label, field, error, showPassword, togglePassword, ...props }) => (
  <div className="space-y-1.5">
    <label className="flex items-center text-sm font-medium text-gray-700">
      <Lock className="w-4 h-4 mr-1.5 text-gray-400" />
      {label}
    </label>
    <div className="relative">
      <input
        {...props}
        type={showPassword[field] ? 'text' : 'password'}
        className={`w-full px-4 py-2.5 pr-10 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      />
      <button
        type="button"
        onClick={() => togglePassword(field)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {showPassword[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
    {error && (
      <p className="flex items-center text-xs text-red-600">
        <AlertCircle className="w-3 h-3 mr-1" />
        {error}
      </p>
    )}
  </div>
));

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */
const PartnerProfilePage = () => {
  const { partner, updateProfile, changePassword, isLoading: authLoading } = usePartnerAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load partner data
  useEffect(() => {
    if (partner) {
      setProfileData({
        name: partner.name || '',
        email: partner.email || '',
        phone: partner.phone || '',
        address: partner.address || ''
      });
    }
  }, [partner]);

  // Input handlers
  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const togglePassword = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Validation
  const validateProfile = () => {
    const newErrors = {};
    if (!profileData.name.trim()) newErrors.name = 'Name is required';
    if (!profileData.email.trim()) newErrors.email = 'Email is required';
    if (profileData.phone && profileData.phone.length < 10) newErrors.phone = 'Phone number must be at least 10 digits';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors = {};
    if (!passwordData.currentPassword) newErrors.currentPassword = 'Current password is required';
    if (!passwordData.newPassword) newErrors.newPassword = 'New password is required';
    if (passwordData.newPassword.length < 8) newErrors.newPassword = 'Password must be at least 8 characters';
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!validateProfile()) return;
    setIsLoading(true);
    try {
      await updateProfile(profileData);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      Swal.fire({ title: 'Success!', text: 'Profile updated!', icon: 'success', confirmButtonColor: '#2563eb' });
    } catch (error) {
      Swal.fire('Error', error.message || 'Failed to update profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;
    setIsLoading(true);
    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccessMessage('Password changed successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      Swal.fire({ title: 'Success!', text: 'Password changed!', icon: 'success', confirmButtonColor: '#2563eb' });
    } catch (error) {
      Swal.fire('Error', error.message || 'Failed to change password', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Profile Found</h2>
          <p className="text-gray-600 mb-6">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className=" mx-auto">
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Header & Tabs */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-white">Partner Profile</h1>
                <p className="text-primary-100 text-sm mt-1">Manage your partner account settings</p>
              </div>
              {activeTab === 'personal' && (
                <button
                  onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-white text-primary-600 rounded-lg hover:bg-primary-50 transition-all shadow-sm font-medium disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : isEditing ? (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex space-x-8 px-8 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsEditing(false);
                      setErrors({});
                    }}
                    className={`flex items-center space-x-2 py-4 border-b-2 transition-all ${
                      isActive ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          {/* PERSONAL TAB */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              {/* Partner Avatar */}
              <div className="flex items-start space-x-6 pb-6 border-b">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg border-4 border-gray-100">
                    {partner.name ? partner.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Partner Profile</h3>
                  <p className="text-sm text-gray-600 mt-1">ABY Inventory Partner</p>
                  <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                    <span>Partner ID: {partner.id}</span>
                    <span>Member since: {new Date(partner.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-primary-600" /> Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField
                    label="Partner Name"
                    icon={User}
                    value={profileData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    error={errors.name}
                    readOnly={!isEditing}
                    placeholder="Enter partner/company name"
                  />
                  <InputField
                    label="Email Address"
                    icon={Mail}
                    type="email"
                    value={profileData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    error={errors.email}
                    readOnly={!isEditing}
                    placeholder="Enter your email"
                  />
                  <InputField
                    label="Phone Number"
                    icon={Phone}
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    error={errors.phone}
                    readOnly={!isEditing}
                    placeholder="Enter phone number (optional)"
                  />
                </div>
              </div>

              {/* Address */}
              {profileData.address && (
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-primary-600" /> Address
                  </h3>
                  <textarea
                    value={profileData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={3}
                    readOnly={!isEditing}
                    className={`w-full px-4 py-2.5 border rounded-lg transition-all ${
                      !isEditing ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                    } ${errors.address ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                    placeholder="Enter your address (optional)"
                  />
                </div>
              )}
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-primary-600" /> Change Password
                </h3>
                <div className="grid lg:grid-cols-2 gap-6">
                  <PasswordField
                    label="Current Password"
                    field="current"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    error={errors.currentPassword}
                    showPassword={showPassword}
                    togglePassword={togglePassword}
                  />
                  <PasswordField
                    label="New Password"
                    field="new"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    error={errors.newPassword}
                    showPassword={showPassword}
                    togglePassword={togglePassword}
                  />
                  <div className="col-span-1 lg:col-span-2">
                    <PasswordField
                      label="Confirm New Password"
                      field="confirm"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      error={errors.confirmPassword}
                      showPassword={showPassword}
                      togglePassword={togglePassword}
                    />
                  </div>
                  <button
                    onClick={handleChangePassword}
                    disabled={isLoading}
                    className="w-full col-span-1 lg:col-span-2 flex items-center justify-center space-x-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium transition-all"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Change Password</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-base font-semibold text-gray-900 mb-6 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-primary-600" /> Push Notifications
              </h3>
              {/* <PushNotificationPage /> */}
            </div>
          )}
        </div>

        {/* Cancel / Save Buttons (only on personal tab when editing) */}
        {activeTab === 'personal' && isEditing && (
          <div className="mt-8 flex justify-end space-x-3">
            <button
              onClick={() => {
                setIsEditing(false);
                setErrors({});
                if (partner) {
                  setProfileData({
                    name: partner.name || '',
                    email: partner.email || '',
                    phone: partner.phone || '',
                    address: partner.address || ''
                  });
                }
              }}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all flex items-center"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium transition-all flex items-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerProfilePage;