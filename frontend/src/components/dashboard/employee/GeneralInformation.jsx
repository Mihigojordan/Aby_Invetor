import { API_URL } from '../../../api/api';
import { User, Mail, Phone, MapPin, Calendar, Shield, Eye, EyeOff, Lock, Save, BarChart3 } from 'lucide-react';

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

export default GeneralInformation;