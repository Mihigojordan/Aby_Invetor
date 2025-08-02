import { useEffect, useState } from "react";
import stockOutService from "../../../services/stockOutService";

// Modal Component for StockOut
const UpsertStockOutModal = ({ isOpen, onClose, onSubmit, stockOut, stockIns, isLoading, title }) => {
  const [formData, setFormData] = useState({
    // Single entry fields (for update mode)
    stockinId: '',
    quantity: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    // Multiple entries fields (for create mode)
    salesEntries: []
  });

  
  const [validationErrors, setValidationErrors] = useState({
    stockinId: '',
    quantity: '',
    clientEmail: '',
    salesEntries: []
  });

  const isUpdateMode = !!stockOut;

  useEffect(() => {
    if (stockOut) {
      // Update mode - single entry
      setFormData({
        stockinId: stockOut.stockinId || '',
        quantity: stockOut.quantity || '',
        clientName: stockOut.clientName || '',
        clientEmail: stockOut.clientEmail || '',
        clientPhone: stockOut.clientPhone || '',
        salesEntries: []
      });
    } else {
      // Create mode - multiple entries
      setFormData({
        stockinId: '',
        quantity: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        salesEntries: [{ stockinId: '', quantity: '' }]
      });
    }
    
    // Clear validation errors when modal opens/closes
    setValidationErrors({
      stockinId: '',
      quantity: '',
      clientEmail: '',
      salesEntries: []
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

  // Single entry handlers (for update mode)
  const handleStockInChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, stockinId: value });
    
    const stockinError = validateStockInId(value);
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
    
    const quantityError = validateQuantity(value, formData.stockinId);
    
    setValidationErrors(prev => ({
      ...prev,
      quantity: quantityError
    }));
  };

  // Multiple entries handlers (for create mode)
  const addSalesEntry = () => {
    setFormData(prev => ({
      ...prev,
      salesEntries: [...prev.salesEntries, { stockinId: '', quantity: '' }]
    }));
    
    setValidationErrors(prev => ({
      ...prev,
      salesEntries: [...prev.salesEntries, {}]
    }));
  };

  const removeSalesEntry = (index) => {
    if (formData.salesEntries.length > 1) {
      setFormData(prev => ({
        ...prev,
        salesEntries: prev.salesEntries.filter((_, i) => i !== index)
      }));
      
      setValidationErrors(prev => ({
        ...prev,
        salesEntries: prev.salesEntries.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSalesEntryChange = (index, field, value) => {
    const updatedEntries = [...formData.salesEntries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    
    setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));
    
    // Validate the changed field
    let error = '';
    if (field === 'stockinId') {
      error = validateStockInId(value);
      
      // Also re-validate quantity if it exists
      const quantityError = updatedEntries[index].quantity 
        ? validateQuantity(updatedEntries[index].quantity, value) 
        : '';
      
      const updatedErrors = [...validationErrors.salesEntries];
      updatedErrors[index] = { 
        ...updatedErrors[index], 
        stockinId: error,
        quantity: quantityError 
      };
      setValidationErrors(prev => ({ ...prev, salesEntries: updatedErrors }));
    } else if (field === 'quantity') {
      error = validateQuantity(value, updatedEntries[index].stockinId);
      
      const updatedErrors = [...validationErrors.salesEntries];
      updatedErrors[index] = { ...updatedErrors[index], quantity: error };
      setValidationErrors(prev => ({ ...prev, salesEntries: updatedErrors }));
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, clientEmail: value });
    
    const emailError = validateEmail(value);
    
    setValidationErrors(prev => ({
      ...prev,
      clientEmail: emailError
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isUpdateMode) {
      // Single entry validation for update mode
      const stockinError = validateStockInId(formData.stockinId);
      const quantityError = validateQuantity(formData.quantity, formData.stockinId);
      const emailError = validateEmail(formData.clientEmail);
      
      setValidationErrors({
        stockinId: stockinError,
        quantity: quantityError,
        clientEmail: emailError,
        salesEntries: []
      });
      
      if (stockinError || quantityError || emailError) {
        return;
      }
      
      // Prepare single entry data
      const submitData = {};
      if (formData.stockinId) submitData.stockinId = formData.stockinId;
      if (formData.quantity) submitData.quantity = Number(formData.quantity);
      if (formData.clientName.trim()) submitData.clientName = formData.clientName.trim();
      if (formData.clientEmail.trim()) submitData.clientEmail = formData.clientEmail.trim();
      if (formData.clientPhone.trim()) submitData.clientPhone = formData.clientPhone.trim();
      
      onSubmit(submitData);
    } else {
      // Multiple entries validation for create mode
      const emailError = validateEmail(formData.clientEmail);
      const salesErrors = formData.salesEntries.map(entry => ({
        stockinId: validateStockInId(entry.stockinId),
        quantity: validateQuantity(entry.quantity, entry.stockinId)
      }));
      
      setValidationErrors({
        stockinId: '',
        quantity: '',
        clientEmail: emailError,
        salesEntries: salesErrors
      });
      
      // Check if there are any validation errors
      const hasEmailError = !!emailError;
      const hasSalesErrors = salesErrors.some(error => error.stockinId || error.quantity);
      
      if (hasEmailError || hasSalesErrors) {
        return;
      }
      
      // Check for duplicate stock entries
      const stockinIds = formData.salesEntries.map(entry => entry.stockinId);
      const uniqueStockinIds = new Set(stockinIds);
      if (stockinIds.length !== uniqueStockinIds.size) {
        alert('Cannot select the same stock-in entry multiple times');
        return;
      }
      
      // Prepare multiple entries data
      const salesArray = formData.salesEntries.map(entry => ({
        stockinId: entry.stockinId,
        quantity: Number(entry.quantity)
      }));
      
      const clientInfo = {};
      if (formData.clientName.trim()) clientInfo.clientName = formData.clientName.trim();
      if (formData.clientEmail.trim()) clientInfo.clientEmail = formData.clientEmail.trim();
      if (formData.clientPhone.trim()) clientInfo.clientPhone = formData.clientPhone.trim();
      
      onSubmit({ salesArray, clientInfo });
    }
    
    onClose();
    
    // Reset form after submission
    setFormData({
      stockinId: '',
      quantity: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      salesEntries: [{ stockinId: '', quantity: '' }]
    });
    
    setValidationErrors({
      stockinId: '',
      quantity: '',
      clientEmail: '',
      salesEntries: []
    });
  };

  const isFormValid = () => {
    if (isUpdateMode) {
      return formData.stockinId && 
             formData.quantity && 
             !validationErrors.stockinId && 
             !validationErrors.quantity && 
             !validationErrors.clientEmail;
    } else {
      const allEntriesValid = formData.salesEntries.every(entry => 
        entry.stockinId && entry.quantity
      ) && validationErrors.salesEntries.every(error => 
        !error.stockinId && !error.quantity
      );
      
      return allEntriesValid && !validationErrors.clientEmail;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {isUpdateMode ? (
            // Single entry form for update mode
            <>
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
                      : 'border-gray-300 focus:ring-blue-500'
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
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Enter quantity sold"
                />
                {validationErrors.quantity && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.quantity}</p>
                )}
                {formData.stockinId && stockIns && (
                  <p className="text-gray-500 text-xs mt-1">
                    Available stock: {stockIns.find(stock => stock.id === formData.stockinId)?.quantity || 0}
                  </p>
                )}
              </div>
            </>
          ) : (
            // Multiple entries form for create mode
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">Sales Entries</h3>
                <button
                  type="button"
                  onClick={addSalesEntry}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Add Entry
                </button>
              </div>

              {formData.salesEntries.map((entry, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">Entry #{index + 1}</h4>
                    {formData.salesEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSalesEntry(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Stock-In Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock-In Entry <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={entry.stockinId}
                        onChange={(e) => handleSalesEntryChange(index, 'stockinId', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                          validationErrors.salesEntries[index]?.stockinId
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      >
                        <option value="">Select a stock-in entry</option>
                        {stockIns?.map(stockIn => (
                          <option key={stockIn.id} value={stockIn.id}>
                            {stockIn.product?.productName || 'Unknown Product'} -
                            Qty: #{stockIn.quantity} -
                            Price: ${stockIn.sellingPrice}
                          </option>
                        ))}
                      </select>
                      {validationErrors.salesEntries[index]?.stockinId && (
                        <p className="text-red-500 text-xs mt-1">
                          {validationErrors.salesEntries[index].stockinId}
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity Sold <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={entry.quantity}
                        onChange={(e) => handleSalesEntryChange(index, 'quantity', e.target.value)}
                        min="1"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                          validationErrors.salesEntries[index]?.quantity
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="Enter quantity sold"
                      />
                      {validationErrors.salesEntries[index]?.quantity && (
                        <p className="text-red-500 text-xs mt-1">
                          {validationErrors.salesEntries[index].quantity}
                        </p>
                      )}
                      {entry.stockinId && stockIns && (
                        <p className="text-gray-500 text-xs mt-1">
                          Available stock: {stockIns.find(stock => stock.id === entry.stockinId)?.quantity || 0}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Client Information Section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Client Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Client Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name 
                </label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter client name"
                />
              </div>

              {/* Client Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Email 
                </label>
                <input
                  type="email"
                  value={formData.clientEmail}
                  onChange={handleEmailChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                    validationErrors.clientEmail
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
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
                  Client Phone 
                </label>
                <input
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter client phone number"
                />
              </div>
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Processing...' : stockOut ? 'Update' : 'Create Transaction'}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Required fields:</strong> Stock-In Entry and Quantity Sold are required for each entry.
            <br />
            {!isUpdateMode && (
              <>
                <strong>Multiple entries:</strong> You can add multiple products to create a single transaction.
                <br />
              </>
            )}
            <strong>Note:</strong> The transaction ID will be generated automatically.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpsertStockOutModal;