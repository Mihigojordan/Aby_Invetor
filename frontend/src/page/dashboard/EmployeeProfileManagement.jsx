import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Shield, Eye, EyeOff, Lock, Save, BarChart3 } from 'lucide-react';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import { API_URL } from '../../api/api';
import GeneralInformation from '../../components/dashboard/employee/GeneralInformation';
import ChangePassword from '../../components/dashboard/employee/ChangePassword';
import WorkPerformance from '../../components/dashboard/employee/WorkPerformance';

const EmployeeProfile = ({}) => {
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
      label: 'Profile',
      icon: User,
    },
    {
      id: 'password',
      label: 'Security',
      icon: Lock,
    },
    {
      id: 'performance',
      label: 'Work Performance',
      icon: BarChart3,
    },
  ];

  return (
    <div className=" mt-5 bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="  w-64  bg-white shadow-sm border-r border-gray-200 ">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900  mb-6">Employee Profile</h2>
            <nav className="space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full xl:flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors duration-200 ${
                      activeTab === item.id
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium ">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 h-[85vh] overflow-auto ">
          {activeTab === 'general' && <GeneralInformation employee={employee} formatDate={formatDate} getStatusBadge={getStatusBadge} />}
          {activeTab === 'password' && <ChangePassword employee={employee} />}
          {activeTab === 'performance' && <WorkPerformance />}
        </div>
      </div>
    </div>
  );
};







export default EmployeeProfile;