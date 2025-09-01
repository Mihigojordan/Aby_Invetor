import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Calendar, Shield, Eye, EyeOff, Lock, Save, BarChart3, X, XCircle, ArrowLeft } from 'lucide-react';

import GeneralInformation from './GeneralInformation';
import WorkPerformance from './WorkPerformance';
import employeeService from '../../../services/employeeService'; // Import the employee service

const ViewEmployeePage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get employee ID from URL params and navigation function
  const { id } = useParams();
  const navigate = useNavigate();

  // Get tab from URL params on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['general', 'performance'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Fetch employee data when component mounts or ID changes
  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!id) {
        setError('Employee ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const employeeData = await employeeService.findEmployeeById(id);
        
        if (employeeData) {
          setEmployee(employeeData);
        } else {
          setError('Employee not found');
        }
      } catch (err) {
        console.error('Error fetching employee:', err);
        setError(err.message || 'Failed to fetch employee data');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [id]);

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

  // Handle back navigation
  const handleGoBack = () => {
    navigate('/admin/dashboard/employee'); // Go back to previous page
  };

  const navbarItems = [
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

  // Loading state
  if (loading) {
    return (
      <div className=" flex items-center justify-center p-4 z-50">
        <div className="flex min-h-[90vh] w-11/12 bg-white p-5 rounded-md items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading employee data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className=" flex items-center justify-center p-4 z-50">
        <div className="flex min-h-[90vh] w-11/12 bg-white p-5 rounded-md items-center justify-center">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Employee</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No employee found state
  if (!employee) {
    return (
      <div className=" flex items-center justify-center p-4 z-50">
        <div className="flex min-h-[90vh] w-11/12 bg-white p-5 rounded-md items-center justify-center">
          <div className="text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Employee Not Found</h3>
            <p className="text-gray-600">The employee with ID "{id}" could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="  w-full h-[90vh]  overflow-y-auto bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="flex flex-col w-full  bg-white rounded-md">
        {/* Navbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGoBack}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">Back</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">
                {employee ? `${employee.firstname} ${employee.lastname}` : 'Employee Profile'}
              </h1>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <nav className="flex space-x-1">
            {navbarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                    activeTab === item.id
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'general' && (
            <GeneralInformation 
              employee={employee} 
              formatDate={formatDate} 
              getStatusBadge={getStatusBadge} 
            />
          )}
          {activeTab === 'performance' && (
            <WorkPerformance 
              employee={employee} 
              notAsEmployee={true} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewEmployeePage;