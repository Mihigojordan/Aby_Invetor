import { User, Mail, Calendar, Shield, Lock, Clock } from "lucide-react";
import useAdminAuth from "../../context/AdminAuthContext";

const AdminProfile = () => {

    const {user} =  useAdminAuth()
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-h-[90vh] overflow-y-auto  p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-900 mb-2">Admin Profile</h1>
          <p className="text-primary-600">Manage your administrative account information</p>
        </div>

        {/* Main Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-12 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="relative z-10 flex items-center space-x-6">
              <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <User className="w-12 h-12 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2">{user.adminName || "Admin User"}</h2>
                <p className="text-primary-100 text-lg">{user.adminEmail}</p>
                <div className="flex items-center mt-3">
                  {user.isLocked ? (
                    <div className="flex items-center bg-red-500 bg-opacity-20 px-3 py-1 rounded-full">
                      <Lock className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Account Locked</span>
                    </div>
                  ) : (
                    <div className="flex items-center bg-green-500 bg-opacity-20 px-3 py-1 rounded-full">
                      <Shield className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Account Active</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-primary-900 pb-3 border-b border-primary-200">
                  Personal Information
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-4 bg-primary-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary-600 mb-1">Full Name</p>
                      <p className="text-lg font-semibold text-primary-900">
                        {user.adminName || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 bg-primary-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary-600 mb-1">Email Address</p>
                      <p className="text-lg font-semibold text-primary-900">
                        {user.adminEmail || "Not provided"}
                      </p>
                    </div>
                  </div>

              
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-primary-900 pb-3 border-b border-primary-200">
                  Account Details
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-4 bg-primary-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary-600 mb-1">Account Status</p>
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${user.isLocked ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        <p className="text-lg font-semibold text-primary-900">
                          {user.isLocked ? 'Locked' : 'Active'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 bg-primary-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary-600 mb-1">Account Created</p>
                      <p className="text-lg font-semibold text-primary-900">
                        {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </div>

              
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Additional Info Card */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-center text-primary-600">
            <Shield className="w-5 h-5 mr-2" />
            <p className="text-sm">
              This is a read-only view of your administrative account. 
              Contact system administrator for any changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;