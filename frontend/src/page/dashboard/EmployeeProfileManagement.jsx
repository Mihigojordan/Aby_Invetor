import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Shield, Eye, EyeOff, Lock, Save, BarChart3 } from 'lucide-react';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import { API_URL } from '../../api/api';

const EmployeeProfile = () => {
  const [activeTab, setActiveTab] = useState('general');
  const { user: employee } = useEmployeeAuth();

  // Get tab from URL params on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['general', 'password', 'performance'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Update URL when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const isActive = status === 'ACTIVE';
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        isActive 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {status}
      </span>
    );
  };

  const sidebarItems = [
    {
      id: 'general',
      label: 'General Information',
      icon: User,
    },
    {
      id: 'password',
      label: 'Change Password',
      icon: Lock,
    },
    {
      id: 'performance',
      label: 'Work Performance',
      icon: BarChart3,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-72  bg-white shadow-sm border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Employee Profile</h2>
            <nav className="space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors duration-200 ${
                      activeTab === item.id
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeTab === 'general' && <GeneralInformation employee={employee} formatDate={formatDate} getStatusBadge={getStatusBadge} />}
          {activeTab === 'password' && <ChangePassword employee={employee} />}
          {activeTab === 'performance' && <WorkPerformance />}
        </div>
      </div>
    </div>
  );
};

// General Information Component
const GeneralInformation = ({ employee, formatDate, getStatusBadge }) => {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">General Information</h1>
        <p className="text-gray-600">View your profile information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-12 text-white relative">
          <div className="flex items-center space-x-6">
            <div className="relative">
              {employee.profileImg ? (
                <img
                  src={`${API_URL}${employee.profileImg}`}
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-primary-500 flex items-center justify-center">
                  <User size={40} className="text-white" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">
                {employee.firstname} {employee.lastname}
              </h2>
              <p className="text-primary-100 text-lg mb-3">{employee.email}</p>
              <div className="flex items-center space-x-4">
                {getStatusBadge(employee.status)}
                <span className="text-primary-100 text-sm">
                  Employee ID: {employee.id?.split('-')[0]}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Personal Information */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <User size={20} className="mr-2 text-primary-600" />
                Personal Information
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Mail size={18} className="text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email Address</p>
                    <p className="text-gray-900">{employee.email}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Phone size={18} className="text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone Number</p>
                    <p className="text-gray-900">{employee.phoneNumber || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <MapPin size={18} className="text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Address</p>
                    <p className="text-gray-900">{employee.address || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar size={18} className="text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Joined Date</p>
                    <p className="text-gray-900">{formatDate(employee.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Tasks */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Shield size={20} className="mr-2 text-primary-600" />
                Assigned Tasks
              </h3>
              
              <div className="space-y-2">
                {employee.tasks.map((task) => (
                  <div key={task.id} className="bg-primary-50 rounded-lg p-3 border border-primary-100">
                    <p className="font-medium text-primary-900 capitalize">{task.taskname}</p>
                    <p className="text-sm text-primary-700 mt-1">{task.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Change Password Component
const ChangePassword = ({ employee }) => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    email: employee.email,
    fullname: `${employee.firstname || ''} ${employee.lastname || ''}`,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    setIsUpdating(true);
    
    try {
      // API call to update password would go here
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      alert('Password updated successfully!');
      setPasswordForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      alert('Failed to update password. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Change Password</h1>
        <p className="text-gray-600">Update your account password</p>
      </div>

      {/* Password Form */}
      <div className="bg-white rounded-xl flex justify-center items-center min- shadow-sm border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2"></h1>
        <form onSubmit={handlePasswordSubmit} className=" space-y-6">
          {/* Email Field */}

           <div className="grid grid-cols-2 gap-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Names
            </label>
            <input
              type="text"
              name="text"
              value={passwordForm.fullname}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={passwordForm.email}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              disabled
            />
          </div>
              </div>

               <div className="grid grid-cols-2 gap-4">


          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

                </div>
          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isUpdating}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {isUpdating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Update Password</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// Work Performance Component
const WorkPerformance = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Work Performance</h1>
    </div>
  );
};

export default EmployeeProfile;