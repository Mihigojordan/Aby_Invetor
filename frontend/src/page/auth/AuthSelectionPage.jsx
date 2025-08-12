import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  ArrowRight,
  Package,
  Building,
  UserCheck
} from 'lucide-react';

const AuthSelectionPage = () => {
  const navigate = useNavigate();

  const handleAdminLogin = () => {
    navigate('/auth/admin/login');
  };

  const handleEmployeeLogin = () => {
    navigate('/auth/employee/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-3xl mb-6 shadow-lg">
            <Package className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            ABY Inventory System
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Welcome to your inventory management platform. Choose your role to continue.
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Admin Login Card */}
          <div className="group">
            <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 p-8 border border-primary-100 hover:border-primary-200">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mb-4 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Administrator</h2>
                <p className="text-gray-600 leading-relaxed">
                  Full system access with administrative privileges. Manage inventory, users, and system settings.
                </p>
              </div>

              {/* Admin Features */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                  <span>Complete inventory management</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                  <span>User and employee management</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                  <span>System configuration & reports</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                  <span>Advanced analytics & insights</span>
                </div>
              </div>

              <button
                onClick={handleAdminLogin}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-4 px-6 rounded-xl hover:from-primary-700 hover:to-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-300 font-semibold text-lg flex items-center justify-center group-hover:shadow-lg"
              >
                <Building className="w-5 h-5 mr-2" />
                Continue as Admin
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
          </div>

          {/* Employee Login Card */}
          <div className="group">
            <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 p-8 border border-primary-100 hover:border-primary-200">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-500 rounded-2xl mb-4 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Employee</h2>
                <p className="text-gray-600 leading-relaxed">
                  Access your assigned tasks and manage day-to-day inventory operations efficiently.
                </p>
              </div>

              {/* Employee Features */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                  <span>Task management & tracking</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                  <span>Stock operations & updates</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                  <span>Profile & schedule management</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                  <span>Real-time inventory access</span>
                </div>
              </div>

              <button
                onClick={handleEmployeeLogin}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-4 px-6 rounded-xl hover:from-primary-600 hover:to-primary-700 focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 transition-all duration-300 font-semibold text-lg flex items-center justify-center group-hover:shadow-lg"
              >
                <UserCheck className="w-5 h-5 mr-2" />
                Continue as Employee
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            Secure access to ABY Inventory Management System
          </p>
          <div className="flex items-center justify-center space-x-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">System Online</span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <span className="text-xs text-gray-500">Version 2.0</span>
            <div className="w-px h-4 bg-gray-300"></div>
            <Link to={'/'} className="text-xs text-gray-500 capitalize">home page</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthSelectionPage;