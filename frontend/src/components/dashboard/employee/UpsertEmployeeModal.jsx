import { X, Upload, File, Image, User, FileText, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { API_URL } from "../../../api/api";

const UpsertEmployeeModal = ({ isOpen, onClose, onSubmit, employee, isLoading, title }) => {
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phoneNumber: '',
    address: '',
    profileImg: null,
    identityCard: null,
    cv: null
  });
  const [errors, setErrors] = useState({});
  const [previews, setPreviews] = useState({
    profileImg: null,
    identityCard: null,
    cv: null
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        firstname: employee.firstname || '',
        lastname: employee.lastname || '',
        email: employee.email || '',
        phoneNumber: employee.phoneNumber || '',
        address: employee.address || '',
        profileImg: null,
        identityCard: null,
        cv: null
      });
      // Set existing file previews if available
      setPreviews({
        profileImg: employee.profileImg || null,
        identityCard: employee.identityCard || null,
        cv: employee.cv || null
      });
    } else {
      setFormData({
        firstname: '',
        lastname: '',
        email: '',
        phoneNumber: '',
        address: '',
        profileImg: null,
        identityCard: null,
        cv: null
      });
      setPreviews({
        profileImg: null,
        identityCard: null,
        cv: null
      });
    }
    setErrors({});
  }, [employee, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstname.trim()) newErrors.firstname = 'First name is required';
    if (!formData.lastname.trim()) newErrors.lastname = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add text fields
      Object.keys(formData).forEach(key => {
        if (key !== 'profileImg' && key !== 'identityCard' && key !== 'cv') {
          submitData.append(key, formData[key]);
        }
      });
      
      // Add files if they exist
      if (formData.profileImg) submitData.append('profileImg', formData.profileImg);
      if (formData.identityCard) submitData.append('identityCard', formData.identityCard);
      if (formData.cv) submitData.append('cv', formData.cv);
      
      onSubmit(submitData);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (field, file) => {
    if (!file) return;

    // File size validation (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, [field]: 'File size must be less than 10MB' }));
      return;
    }

    // File type validation
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if ((field === 'profileImg' || field === 'identityCard') && !allowedImageTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, [field]: 'Please upload a valid image file (JPEG, PNG, GIF)' }));
      return;
    }
    
    if (field === 'cv' && !allowedDocTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, [field]: 'Please upload a valid document file (PDF, DOC, DOCX)' }));
      return;
    }

    setFormData(prev => ({ ...prev, [field]: file }));
    
    // Create preview for images
    if (field === 'profileImg' || field === 'identityCard') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => ({ ...prev, [field]: e.target.result }));
      };
      reader.readAsDataURL(file);
    } else {
      setPreviews(prev => ({ ...prev, [field]: file.name }));
    }

    // Clear any existing error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const removeFile = (field) => {
    setFormData(prev => ({ ...prev, [field]: null }));
    setPreviews(prev => ({ ...prev, [field]: null }));
  };

  const FileUploadField = ({ field, label, icon: Icon, accept, description }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <div className="flex items-center gap-2">
          <Icon size={16} />
          {label}
        </div>
      </label>
      
      {!formData[field] && !previews[field] ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
          <input
            type="file"
            accept={accept}
            onChange={(e) => handleFileChange(field, e.target.files[0])}
            className="hidden"
            id={field}
          />
          <label htmlFor={field} className="cursor-pointer">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">Click to upload {label.toLowerCase()}</p>
            <p className="text-xs text-gray-500">{description}</p>
          </label>
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg p-4">
          {(field === 'profileImg' || field === 'identityCard') && previews[field] && (
            <div className="mb-3">
              <img 
                src={previews[field]} 
                alt={`${label} preview`}
                className="w-20 h-20 object-cover rounded-lg mx-auto"
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon size={16} className="text-gray-500" />
              <span className="text-sm text-gray-700">
                {field === 'cv' ? previews[field] || 'Document uploaded' : `${label} uploaded`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeFile(field)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>
        </div>
      )}
      
      {errors[field] && (
        <div className="flex items-center gap-1 mt-1">
          <AlertCircle size={14} className="text-red-500" />
          <p className="text-red-500 text-xs">{errors[field]}</p>
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.firstname}
                      onChange={(e) => handleChange('firstname', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                        errors.firstname ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="John"
                    />
                    {errors.firstname && <p className="text-red-500 text-xs mt-1">{errors.firstname}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.lastname}
                      onChange={(e) => handleChange('lastname', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                        errors.lastname ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Doe"
                    />
                    {errors.lastname && <p className="text-red-500 text-xs mt-1">{errors.lastname}</p>}
                  </div>
                </div>


 <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="john.doe@company.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="+1 (555) 123-4567"
                  />
                  {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
                </div>
                      </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <input
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="123 Main St, City, State 12345"
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>
              </div>
            </div>

            {/* File Uploads */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Documents & Photos</h3>
              <div className="space-y-4">

                 <div className="grid grid-cols-2 gap-4">

                <FileUploadField
                  field="profileImg"
                  label="Profile Image"
                  icon={User}
                  accept="image/*"
                  description="PNG, JPG, GIF up to 10MB"
                />

                <FileUploadField
                  field="identityCard"
                  label="Identity Card"
                  icon={Image}
                  accept="image/*"
                  description="PNG, JPG, GIF up to 10MB"
                />

                  </div>
                <FileUploadField
                  field="cv"
                  label="CV/Resume"
                  icon={FileText}
                  accept=".pdf,.doc,.docx"
                  description="PDF, DOC, DOCX up to 10MB"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : (employee ? 'Update' : 'Add')} Employee
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpsertEmployeeModal;