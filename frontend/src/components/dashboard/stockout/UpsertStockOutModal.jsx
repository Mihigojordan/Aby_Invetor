import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import stockInService from "../../../services/stockinService";

// Modal Component for StockOut
const UpsertStockOutModal = ({ isOpen, onClose, onSubmit, stockOut, stockIns, isLoading, title }) => {
  const [formData, setFormData] = useState({
    // Single entry fields (for update mode)
    stockinId: '',
    quantity: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    paymentMethod:'',
    // Multiple entries fields (for create mode)
    salesEntries: []
  });

  const [validationErrors, setValidationErrors] = useState({
    stockinId: '',
    quantity: '',
    clientEmail: '',
    salesEntries: []
  });

  // New states for SKU functionality
  const [skuLoadingStates, setSkuLoadingStates] = useState({});
  const [skuErrors, setSkuErrors] = useState({});

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
        paymentMethod: stockOut.paymentMethod || '', 
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
        paymentMethod:'',
        salesEntries: [{ stockinId: '', quantity: '', sku: '' }]
      });
    }
    
    // Clear validation errors and SKU states when modal opens/closes
    setValidationErrors({
      stockinId: '',
      quantity: '',
      clientEmail: '',
      paymentMethod:'',
      salesEntries: []
    });
    setSkuLoadingStates({});
    setSkuErrors({});
  }, [stockOut, isOpen]);

  const validateStockInId = (stockinId) => {
    if (!stockinId) {
      return 'Please select a stock-in entry';
    }
    return '';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF'
    }).format(amount);
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

  // Calculate suggested quantity (half of available stock, minimum 1)
  const calculateSuggestedQuantity = (availableQuantity) => {
    if (!availableQuantity || availableQuantity <= 0) return 1;
    const halfQuantity = Math.floor(availableQuantity / 2);
    return halfQuantity > 0 ? halfQuantity : 1;
  };

  // SKU search functionality
  const handleSkuSearch = async (index, sku) => {
    if (!sku.trim()) {
      // Clear selection if SKU is empty
      const updatedEntries = [...formData.salesEntries];
      updatedEntries[index] = { ...updatedEntries[index], stockinId: '', sku: '', quantity: '' };
      setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));
      
      // Clear SKU error for this index
      setSkuErrors(prev => ({ ...prev, [index]: '' }));
      return;
    }

    // Set loading state for this specific entry
    setSkuLoadingStates(prev => ({ ...prev, [index]: true }));
    setSkuErrors(prev => ({ ...prev, [index]: '' }));

    try {
      // Use the stockInService to fetch by SKU
      const response = await stockInService.getStockInBySku(sku.trim());
      
      if (response) {
        const stockInData = response;
        
        // Check if this stock is already selected in other entries
        const isAlreadySelected = formData.salesEntries.some((entry, i) => 
          i !== index && entry.stockinId === stockInData.id
        );

        if (isAlreadySelected) {
          setSkuErrors(prev => ({ 
            ...prev, 
            [index]: 'This stock item is already selected in another entry' 
          }));
          
          // Clear the selection
          const updatedEntries = [...formData.salesEntries];
          updatedEntries[index] = { ...updatedEntries[index], stockinId: '', quantity: '' };
          setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));
        } else {
          // Calculate suggested quantity (half of available stock)
          const suggestedQuantity = calculateSuggestedQuantity(stockInData.quantity);
          
          // Update the sales entry with the found stock and suggested quantity
          const updatedEntries = [...formData.salesEntries];
          updatedEntries[index] = { 
            ...updatedEntries[index], 
            stockinId: stockInData.id,
            sku: sku.trim(),
            quantity: suggestedQuantity.toString()
          };
          setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));
          
          // Clear any validation errors for stockinId and quantity
          const updatedErrors = [...validationErrors.salesEntries];
          if (updatedErrors[index]) {
            updatedErrors[index] = { 
              ...updatedErrors[index], 
              stockinId: '', 
              quantity: '' 
            };
            setValidationErrors(prev => ({ ...prev, salesEntries: updatedErrors }));
          }
          
          // Show success message in console (optional)
          console.log(`Auto-filled quantity: ${suggestedQuantity} (half of available ${stockInData.quantity})`);
        }
      } else {
        setSkuErrors(prev => ({ 
          ...prev, 
          [index]: 'No stock found with this SKU' 
        }));
        
        // Clear the selection
        const updatedEntries = [...formData.salesEntries];
        updatedEntries[index] = { ...updatedEntries[index], stockinId: '', quantity: '' };
        setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));
      }
    } catch (error) {
      console.error('Error searching by SKU:', error);
      setSkuErrors(prev => ({ 
        ...prev, 
        [index]: 'Error searching for SKU. Please try again.' 
      }));
      
      // Clear the selection
      const updatedEntries = [...formData.salesEntries];
      updatedEntries[index] = { ...updatedEntries[index], stockinId: '', quantity: '' };
      setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));
    } finally {
      setSkuLoadingStates(prev => ({ ...prev, [index]: false }));
    }
  };

  // Debounced SKU search
  const handleSkuChange = (index, value) => {
    // Update the SKU value immediately
    const updatedEntries = [...formData.salesEntries];
    updatedEntries[index] = { ...updatedEntries[index], sku: value };
    setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));

    // Clear previous timeout if exists
    if (window.skuSearchTimeout) {
      clearTimeout(window.skuSearchTimeout);
    }

    // Set new timeout for search
    window.skuSearchTimeout = setTimeout(() => {
      handleSkuSearch(index, value);
    }, 500); // 500ms delay
  };

  // Get stock information for display
  const getStockInfo = (stockinId) => {
    if (!stockinId || !stockIns) return null;
    return stockIns.find(stock => stock.id === stockinId);
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
      salesEntries: [...prev.salesEntries, { stockinId: '', quantity: '', sku: '' }]
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
      
      // Clean up SKU states for this index
      setSkuLoadingStates(prev => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
      
      setSkuErrors(prev => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
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
      
      // Update SKU and auto-fill quantity when manually selecting from dropdown
      if (value && stockIns) {
        const selectedStock = stockIns.find(stock => stock.id === value);
        if (selectedStock) {
          // Update SKU if available
          if (selectedStock.sku) {
            updatedEntries[index].sku = selectedStock.sku;
          }
          
          // Auto-fill quantity if not already set
          if (!updatedEntries[index].quantity) {
            const suggestedQuantity = calculateSuggestedQuantity(selectedStock.quantity);
            updatedEntries[index].quantity = suggestedQuantity.toString();
            
            // Clear quantity validation error since we're setting a valid value
            const updatedErrors = [...validationErrors.salesEntries];
            if (updatedErrors[index]) {
              updatedErrors[index] = { ...updatedErrors[index], quantity: '' };
              setValidationErrors(prev => ({ ...prev, salesEntries: updatedErrors }));
            }
          }
          
          setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));
        }
      }
      
    } else if (field === 'quantity') {
      error = validateQuantity(value, updatedEntries[index].stockinId);
      
      const updatedErrors = [...validationErrors.salesEntries];
      updatedErrors[index] = { ...updatedErrors[index], quantity: error };
      setValidationErrors(prev => ({ ...prev, salesEntries: updatedErrors }));
    }
  };

  // Helper function to set suggested quantity for a specific entry
  const setSuggestedQuantity = (index) => {
    const entry = formData.salesEntries[index];
    if (!entry.stockinId) return;
    
    const stockInfo = getStockInfo(entry.stockinId);
    if (!stockInfo) return;
    
    const suggestedQuantity = calculateSuggestedQuantity(stockInfo.quantity);
    handleSalesEntryChange(index, 'quantity', suggestedQuantity.toString());
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
      
      // Prepare single entry data - FIXED: Include paymentMethod
      const submitData = {};
      if (formData.stockinId) submitData.stockinId = formData.stockinId;
      if (formData.quantity) submitData.quantity = Number(formData.quantity);
      if (formData.clientName.trim()) submitData.clientName = formData.clientName.trim();
      if (formData.clientEmail.trim()) submitData.clientEmail = formData.clientEmail.trim();
      if (formData.clientPhone.trim()) submitData.clientPhone = formData.clientPhone.trim();
      if (formData.paymentMethod) submitData.paymentMethod = formData.paymentMethod; // ADDED THIS LINE
      
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
      const hasSkuErrors = Object.values(skuErrors).some(error => !!error);
      
      if (hasEmailError || hasSalesErrors || hasSkuErrors) {
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
      
      // FIXED: Include paymentMethod in clientInfo
      const clientInfo = {};
      if (formData.clientName.trim()) clientInfo.clientName = formData.clientName.trim();
      if (formData.clientEmail.trim()) clientInfo.clientEmail = formData.clientEmail.trim();
      if (formData.clientPhone.trim()) clientInfo.clientPhone = formData.clientPhone.trim();
      if (formData.paymentMethod) clientInfo.paymentMethod = formData.paymentMethod; // ADDED THIS LINE
      
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
      paymentMethod:'',
      salesEntries: [{ stockinId: '', quantity: '', sku: '' }]
    });
    
    setValidationErrors({
      stockinId: '',
      quantity: '',
      clientEmail: '',
      salesEntries: []
    });
    
    setSkuLoadingStates({});
    setSkuErrors({});
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
      
      const noSkuErrors = !Object.values(skuErrors).some(error => !!error);
      
      return allEntriesValid && !validationErrors.clientEmail && noSkuErrors;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold mb-4">{title}</h2>
          <div className="cursor-pointer" onClick={onClose}>
            <XIcon size={24} />
          </div>
        </div>
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
                      Price: {formatCurrency(stockIn.sellingPrice)}
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
            <div className="min-h-[50vh] max-h-96 overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-800">Sales Entries</h3>
              </div>

              {formData.salesEntries.map((entry, index) => {
                const stockInfo = getStockInfo(entry.stockinId);
                const isSkuLoading = skuLoadingStates[index];
                const skuError = skuErrors[index];
                
                return (
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

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* SKU Input */}
                      <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SKU <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={entry.sku || ''}
                            onChange={(e) => handleSkuChange(index, e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                              skuError
                                ? 'border-red-300 focus:ring-red-500'
                                : entry.stockinId
                                ? 'border-green-300 focus:ring-green-500'
                                : 'border-gray-300 focus:ring-blue-500'
                            }`}
                            placeholder="Enter SKU"
                          />
                          {isSkuLoading && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            </div>
                          )}
                        </div>
                        {skuError && (
                          <p className="text-red-500 text-xs mt-1">{skuError}</p>
                        )}
                        {entry.stockinId && !skuError && (
                          <p className="text-green-600 text-xs mt-1">✓ Stock found & quantity auto-filled</p>
                        )}
                      </div>

                      {/* Stock-In Selection */}
                      <div className="md:col-span-4">
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
                              SKU: {stockIn.sku} - {stockIn.product?.productName || 'Unknown Product'} -
                              Qty: #{stockIn.quantity} -
                              Price: {formatCurrency(stockIn.sellingPrice)}
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
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity Sold <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
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
                            placeholder="Qty"
                          />
                          {entry.stockinId && (
                            <button
                              type="button"
                              onClick={() => setSuggestedQuantity(index)}
                              className="absolute right-1 top-1 bottom-1 px-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 rounded transition-colors"
                              title="Fill half quantity"
                            >
                              ½
                            </button>
                          )}
                        </div>
                        {validationErrors.salesEntries[index]?.quantity && (
                          <p className="text-red-500 text-xs mt-1">
                            {validationErrors.salesEntries[index].quantity}
                          </p>
                        )}
                      </div>

                      {/* Stock Information Display */}
                      <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stock Information
                        </label>
                        {stockInfo ? (
                          <div className="bg-gray-50 rounded-lg p-2 text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Available:</span>
                              <span className="font-medium">{stockInfo.quantity}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Suggested:</span>
                              <span className="font-medium text-blue-600">
                                {calculateSuggestedQuantity(stockInfo.quantity)} (½)
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Price:</span>
                              <span className="font-medium text-green-600">
                                {formatCurrency(stockInfo.sellingPrice)}
                              </span>
                            </div>
                            {entry.quantity && (
                              <div className="flex justify-between border-t pt-1">
                                <span className="text-gray-600">Total:</span>
                                <span className="font-bold text-blue-600">
                                  {formatCurrency(stockInfo.sellingPrice * Number(entry.quantity || 0))}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-500">
                            Select a stock item
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Sales Entry Button */}
              <div className="flex justify-center mb-4">
                <button
                  type="button"
                  onClick={addSalesEntry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <span className="text-lg">+</span>
                  Add Another Entry
                </button>
              </div>
            </div>
          )}

          {/* Client Information Section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Client Information</h3>
            
            {/* FIXED: Better layout for client info inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

              {/* Payment Method - FIXED: Better styling and label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Choose payment method</option>
                  <option value="CARD">Card</option>
                  <option value="MOMO">Mobile Money</option>
                  <option value="CASH">Cash</option>
                </select>
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
            <strong>SKU Search:</strong> Enter a SKU to automatically find and select the corresponding stock item with auto-filled quantity (half of available stock).
            <br />
            <strong>Auto Quantity:</strong> When a stock is found, quantity is automatically set to half of available stock. Use the "½" button to reset to this value.
            <br />
            <strong>Required fields:</strong> SKU (or Stock-In Entry) and Quantity Sold are required for each entry.
            <br />
            {!isUpdateMode && (
              <>
                <strong>Multiple entries:</strong> You can add multiple products to create a single transaction.
                <br />
              </>
            )}
            <strong>Note:</strong> The transaction ID will be generated automatically. Stock information updates in real-time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpsertStockOutModal;