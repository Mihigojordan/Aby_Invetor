import employeeService from '../../../services/employeeService';
import { User, Mail, Eye, EyeOff, Lock, Save } from 'lucide-react';
import { useState } from 'react';

const ChangePassword = ({ employee }) => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    email: employee?.email || '',
    fullname: `${employee?.firstname || ''} ${employee?.lastname || ''}`.trim(),
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [errors, setErrors] = useState({});

  // Password validation regex (at least 8 characters, including uppercase, lowercase, number, and special character)
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    if (name === 'newPassword') {
      if (!value) {
        newErrors.newPassword = 'New password is required';
      } else if (!passwordRegex.test(value)) {
        newErrors.newPassword =
          'Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character';
      } else {
        delete newErrors.newPassword;
      }
      // Re-validate confirm password if new password changes
      if (passwordForm.confirmPassword && value !== passwordForm.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      } else {
        delete newErrors.confirmPassword;
      }
    } else if (name === 'confirmPassword') {
      if (value !== passwordForm.newPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      } else {
        delete newErrors.confirmPassword;
      }
    } else if (name === 'currentPassword') {
      if (!value) {
        newErrors.currentPassword = 'Current password is required';
      } else {
        delete newErrors.currentPassword;
      }
    }
    setErrors(newErrors);
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    validateField(name, value);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields before submission
    validateField('currentPassword', passwordForm.currentPassword);
    validateField('newPassword', passwordForm.newPassword);
    validateField('confirmPassword', passwordForm.confirmPassword);

    if (Object.keys(errors).length > 0 || !passwordForm.currentPassword || !passwordForm.newPassword) {
      return;
    }

    setIsUpdating(true);

    try {
    
      const submitData = new FormData()
      
      submitData.append('password', passwordForm.currentPassword)
      submitData.append('newPassword', passwordForm.newPassword)


      // Call employeeService.updateEmployee
     const updtedEmployee=  await employeeService.updateEmployee(employee.id,submitData);

     console.log('updated',updtedEmployee);
     


      setErrors({});
      setPasswordForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      alert('Password updated successfully!'); // Replace with UI notification in production
    } catch (error) {
      setErrors({ form: 'Failed to update password. Please try again.' });
      console.error('Password update error:', error);
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          {/* Error Message */}
          {errors.form && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{errors.form}</div>
          )}

          {/* Email and Full Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={passwordForm.fullname}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={passwordForm.email}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                disabled
              />
            </div>
          </div>

          {/* Password Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10 ${
                    errors.currentPassword ? 'border-red-500' : ''
                  }`}
                  required
                  aria-describedby={errors.currentPassword ? 'currentPassword-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.currentPassword && (
                <p id="currentPassword-error" className="text-red-600 text-sm mt-1">
                  {errors.currentPassword}
                </p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10 ${
                    errors.newPassword ? 'border-red-500' : ''
                  }`}
                  required
                  aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.newPassword && (
                <p id="newPassword-error" className="text-red-600 text-sm mt-1">
                  {errors.newPassword}
                </p>
              )}
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
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10 ${
                  errors.confirmPassword ? 'border-red-500' : ''
                }`}
                required
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p id="confirmPassword-error" className="text-red-600 text-sm mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isUpdating || Object.keys(errors).length > 0}
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

export default ChangePassword;