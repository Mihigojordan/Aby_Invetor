import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Shield, Eye, EyeOff, Lock, Save, BarChart3, X, XCircle } from 'lucide-react';

import GeneralInformation from './GeneralInformation';

import WorkPerformance from './WorkPerformance';

const ViewEmployeeModal = ({isOpen,onClose,employee}) => {
  const [activeTab, setActiveTab] = useState('general');

  useEffect(()=>{
    if(!employee){
        onClose()
    }

  },[])


  // Get tab from URL params on component mount
  useEffect(() => {
   if(isOpen){
     const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['general', 'performance'].includes(tab)) {
      setActiveTab(tab);
    }
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
      id: 'performance',
      label: 'Work Performance',
      icon: BarChart3,
    },
  ];

  if(!isOpen){
    return null
  }

  return (
    <div className="fixed min-h-screen w-screen left-0 top-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="flex min-h-[90vh] w-11/12 bg-white p-5 rounded-md">
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
        <div className="flex-1 p-4 h-[90vh] overflow-y-auto ">
        
          {activeTab === 'general' && <GeneralInformation employee={employee} formatDate={formatDate} getStatusBadge={getStatusBadge} />}
        
          {activeTab === 'performance' && <WorkPerformance employee={employee} notAsEmployee={true} />}
        </div>
        <XCircle className='cursor-pointer' title='close' onClick={onClose} />
      </div>
    </div>
  );
};







export default ViewEmployeeModal;