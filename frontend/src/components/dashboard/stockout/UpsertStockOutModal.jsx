import { useEffect, useState } from "react";

// Modal Component for StockOut
const UpsertStockOutModal = ({ isOpen, onClose, onSubmit, stockOut, stockIns, isLoading, title }) => {
  const [formData, setFormData] = useState({
    stockinId: '',
    quantity: '',
    clientName: '',
    clientEmail: '',
    clientPhone: ''
  });

  const [validationErrors, setValidationErrors] = useState({
    stockinId: '',
    quantity: '',
    clientEmail: ''
  });

  useEffect(() => {
    if (stockOut) {
      setFormData({
        stockinId: stockOut.stockinId || '',
        quantity: stockOut.quantity || '',
        clientName: stockOut.clientName || '',
        clientEmail: stockOut.clientEmail || '',
        clientPhone: stockOut.clientPhone || ''
      });
    } else {
      setFormData({ 
        stockinId: '', 
        quantity: '', 
        clientName: '', 
        clientEmail: '', 
        clientPhone: '' 
      });
    }
    
    // Clear validation errors when modal opens/closes
    setValidationErrors({
      stockinId: '',
      quantity: '',
      clientEmail: ''
    });
  }, [stockOut, isOpen]);

  const validateStockInId = (stockinId) => {
    if (!stockinId) {
      return 'Please select a stock-in entry';
    }
    return '';
  };

  const validateQuantity = (quantity, stockinId) => {
    if (!quantity) {
      return 'Quantity is required';
    }
    
    const numQuantity = Number(quantity);
    
    if (isNaN(numQuantity) || numQuantity <= 0) {
      return 'Quantity must be a positive number';
    }
    
    if (!Number.isInteger(numQuantity)) {
      return 'Quantity must be a whole number';
    }
    
    // Check if quantity exceeds available stock
    if (stockinId && stockIns) {
      const selectedStockIn = stockIns.find(stock => stock.id === stockinId);
      if (selectedStockIn && numQuantity > selectedStockIn.quantity) {
        return `Quantity cannot exceed available stock (${selectedStockIn.quantity})`;
      }
    }
    
    return '';
  };

  const validateEmail = (email) => {
    if (!email) return ''; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? '' : 'Please enter a valid email address';
  };

  const handleStockInChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, stockinId: value });
    
    // Validate stock-in selection
    const stockinError = validateStockInId(value);
    
    // Re-validate quantity if it exists (in case stock availability changed)
    const quantityError = formData.quantity ? validateQuantity(formData.quantity, value) : '';
    
    setValidationErrors(prev => ({
      ...prev,
      stockinId: stockinError,
      quantity: quantityError
    }));
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, quantity: value });
    
    // Validate quantity
    const quantityError = validateQuantity(value, formData.stockinId);
    
    setValidationErrors(prev => ({
      ...prev,
      quantity: quantityError
    }));
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, clientEmail: value });
    
    // Validate email
    const emailError = validateEmail(value);
    
    setValidationErrors(prev => ({
      ...prev,
      clientEmail: emailError
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Final validation before submit
    const stockinError = validateStockInId(formData.stockinId);
    const quantityError = validateQuantity(formData.quantity, formData.stockinId);
    const emailError = validateEmail(formData.clientEmail);
    
    setValidationErrors({
      stockinId: stockinError,
      quantity: quantityError,
      clientEmail: emailError
    });
    
    // Don't submit if there are validation errors
    if (stockinError || quantityError || emailError) {
      return;
    }
    
    // Prepare data, converting numbers and excluding empty strings
    const submitData = {};
    
    if (formData.stockinId) submitData.stockinId = formData.stockinId;
    if (formData.quantity) submitData.quantity = Number(formData.quantity);
    if (formData.soldPrice) submitData.soldPrice = Number(formData.soldPrice);
    if (formData.clientName.trim()) submitData.clientName = formData.clientName.trim();
    if (formData.clientEmail.trim()) submitData.clientEmail = formData.clientEmail.trim();
    if (formData.clientPhone.trim()) submitData.clientPhone = formData.clientPhone.trim();

    onSubmit(submitData);
    onClose();

    // Reset form after submission
    setFormData({ 
      stockinId: '', 
      quantity: '', 
      clientName: '', 
      clientEmail: '', 
      clientPhone: '' 
    });
    
    setValidationErrors({
      stockinId: '',
      quantity: '',
      clientEmail: ''
    });
  };

  const isFormValid = () => {
    // Check if required fields are filled and have no validation errors
    return formData.stockinId && 
           formData.quantity && 
           !validationErrors.stockinId && 
           !validationErrors.quantity && 
           !validationErrors.clientEmail;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Stock-In Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock-In Entry <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.stockinId}
              onChange={handleStockInChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                validationErrors.stockinId 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-primary-500'
              }`}
            >
              <option value="">Select a stock-in entry</option>
              {stockIns?.map(stockIn => (
                <option key={stockIn.id} value={stockIn.id}>
                  {stockIn.product?.productName || 'Unknown Product'} - 
                  Quantity: #{stockIn.quantity} -
                  Price: ${stockIn.sellingPrice}
                </option>
              ))}
            </select>
            {validationErrors.stockinId && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.stockinId}</p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity Sold <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={handleQuantityChange}
              min="1"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                validationErrors.quantity 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-primary-500'
              }`}
              placeholder="Enter quantity sold"
            />
            {validationErrors.quantity && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.quantity}</p>
            )}
            {/* Show available stock info */}
            {formData.stockinId && stockIns && (
              <p className="text-gray-500 text-xs mt-1">
                Available stock: {stockIns.find(stock => stock.id === formData.stockinId)?.quantity || 0}
              </p>
            )}
          </div>

          {/* Client Information Section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Client Information</h3>
            
            {/* Client Name */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name (Optional)
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Enter client name"
              />
            </div>

            {/* Client Email */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Email (Optional)
              </label>
              <input
                type="email"
                value={formData.clientEmail}
                onChange={handleEmailChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                  validationErrors.clientEmail 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-primary-500'
                }`}
                placeholder="Enter client email"
              />
              {validationErrors.clientEmail && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.clientEmail}</p>
              )}
            </div>

            {/* Client Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Phone (Optional)
              </label>
              <input
                type="tel"
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Enter client phone number"
              />
            </div>
          </div>

          {/* Form Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isFormValid()}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Processing...' : stockOut ? 'Update' : 'Create'}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Required fields:</strong> Stock-In Entry and Quantity Sold are required.
            <br />
            <strong>Note:</strong> The SKU will be generated automatically.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpsertStockOutModal;