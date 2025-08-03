import { API_URL } from '../../../api/api';
import { User, Mail, Phone, MapPin, Calendar, Shield, Save, X } from 'lucide-react';
import employeeService from '../../../services/employeeService';
import { useState } from 'react';

const GeneralInformation = ({ employee, formatDate, getStatusBadge }) => {
  const [profileImg, setProfileImg] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        setProfileImg(null);
        setPreviewImg(null);
        return;
      }
      setProfileImg(file);
      setPreviewImg(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profileImg) {
      setError('Please select an image');
      return;
    }

    setIsUpdating(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('profileImg', profileImg);
      await employeeService.updateEmployee(employee.id, formData);
      window.location.href = '/employee/dashboard/profile?tab=general'
      setIsModalOpen(false);
      setProfileImg(null);
      setPreviewImg(null);
      // Note: The component assumes the employee.profileImg updates via a parent re-render or API response
    } catch (error) {
      setError('Failed to update profile image. Please try again.');
      console.error('Profile image update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setProfileImg(null);
    setPreviewImg(null);
    setError('');
  };

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
              <button
                onClick={() => setIsModalOpen(true)}
                className="absolute bottom-0 right-0 bg-white text-primary-600 rounded-full p-2 shadow-md hover:bg-gray-100"
                aria-label="Edit profile image"
              >
                <User size={16} />
              </button>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">
                {employee.firstname} {employee.lastname}
              </h2>
              <p className="text-primary-100 text-lg mb-3">{employee.email}</p>
              <div className="flex items-center space-x-4">
                {getStatusBadge(employee.status)}
               
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
  
  {employee.tasks && employee.tasks.length > 0 ? (
    <div className="space-y-2">
      {employee.tasks.map((task) => (
        <div key={task.id} className="bg-primary-50 rounded-lg p-3 border border-primary-100">
          <p className="font-medium text-primary-900 capitalize">{task.taskname}</p>
          <p className="text-sm text-primary-700 mt-1">{task.description}</p>
        </div>
      ))}
    </div>
  ) : (
    <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
      <p className="text-gray-500 text-sm">No tasks assigned yet</p>
    </div>
  )}
</div>
          </div>
        </div>
      </div>

      {/* Modal for Updating Profile Image */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Update Profile Image</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="profileImg" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Profile Image
                </label>
                <input
                  type="file"
                  id="profileImg"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                {previewImg && (
                  <div className="mt-4">
                    <img
                      src={previewImg}
                      alt="Profile preview"
                      className="w-32 h-32 rounded-full object-cover mx-auto"
                    />
                  </div>
                )}
                {error && (
                  <p className="text-red-600 text-sm mt-2" id="profileImg-error">
                    {error}
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || !profileImg}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400 flex items-center space-x-2"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralInformation;