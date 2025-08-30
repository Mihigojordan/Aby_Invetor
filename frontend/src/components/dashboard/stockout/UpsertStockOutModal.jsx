import { useEffect, useRef, useState } from "react";

import stockInService from "../../../services/stockinService";

import { ChevronDownIcon, SearchIcon, XIcon, Package, ShoppingCart } from 'lucide-react';

// Searchable Stock-In Dropdown Component
const SearchableStockInDropdown = ({
  stockIns,
  value,
  onChange,
  placeholder = "Select a stock-in entry",
  error = false,
  formatCurrency
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter stock items based on search term
  const filteredStockIns = stockIns?.filter(stockIn => {
    const searchLower = searchTerm.toLowerCase();
    const productName = stockIn.product?.productName?.toLowerCase() || '';
    const sku = stockIn.sku?.toLowerCase() || '';
    const quantity = (stockIn.offlineQuantity ?? stockIn.quantity ?? '').toString();

    const price = stockIn.sellingPrice?.toString() || '';

    return productName.includes(searchLower) ||
      sku.includes(searchLower) ||
      quantity.includes(searchLower) ||
      price.includes(searchLower);
  }) || [];

  // Get selected stock info for display
  const selectedStock = stockIns?.find(stock => stock.id === value || stock.localId === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

 
  

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (stockId) => {
    onChange({ target: { value: stockId } });
    setIsOpen(false);
    setSearchTerm('');
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown trigger */}
      <div
        onClick={toggleDropdown}
        className={`w-full px-3 py-2 border rounded-lg cursor-pointer flex items-center justify-between ${error
          ? 'border-red-300 focus:ring-red-500'
          : 'border-gray-300 focus:ring-blue-500'
          } ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-gray-400'}`}
      >
        <span className={`${selectedStock ? 'text-gray-900' : 'text-gray-500'} truncate`}>
          {selectedStock ? (
            `${selectedStock.product?.productName || 'Unknown Product'} - Qty: #${ selectedStock.offlineQuantity ?? selectedStock.quantity} - Price: ${formatCurrency(selectedStock.sellingPrice)} ${(!selectedStock.synced && selectedStock.localId) ? ' - Pending' : ''}`
          ) : (
            placeholder
          )}
        </span>
        <ChevronDownIcon
          size={20}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by product name, SKU, quantity, or price..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="overflow-y-auto max-h-40">
            {filteredStockIns.length > 0 ? (
              <>
                {/* Empty option */}
                <div
                  onClick={() => handleSelect('')}
                  className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                >
                  {placeholder}
                </div>

                {/* Stock options */}
                {filteredStockIns.map((stockIn,key) => (
                  <div
                    key={key}
                    onClick={() => handleSelect(stockIn.id || stockIn.localId)}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${(value === stockIn.id || value === stockIn.localId) ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {stockIn.product?.productName || 'Unknown Product'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          SKU: {stockIn.sku} • Qty: #{ stockIn.offlineQuantity ?? stockIn.quantity}
                        </div>
                      </div>
{!stockIn.synced && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            Pending
                          </span>
                        )}
                      <div className="ml-2 text-right">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(stockIn.sellingPrice)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                {searchTerm ? 'No matching stock items found' : 'No stock items available'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Modal Component for StockOut
const UpsertStockOutModal = ({ isOpen, onClose, onSubmit, stockOut, stockIns, isLoading, title }) => {
  const [formData, setFormData] = useState({
    // Single entry fields (for update mode)
    stockinId: '',
    quantity: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    paymentMethod: '',
    backorderId: '',
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
        backorderId: stockOut.backorderId || '',
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
        backorderId: '',
        quantity: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        paymentMethod: '',
        salesEntries: [{ stockinId: '', quantity: '', sku: '', isBackOrder: false, backOrder: null }]
      });
    }

    // Clear validation errors and SKU states when modal opens/closes
    setValidationErrors({
      stockinId: '',
      quantity: '',
      clientEmail: '',
      paymentMethod: '',
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

    // Check if quantity exceeds available stock (only for stock-in, not back orders)
    if (stockinId && stockIns) {
      const selectedStockIn = stockIns.find(stock => stock.id === stockinId || stock.localId === stockinId);
    if (selectedStockIn) {
  const availableQty = selectedStockIn.offlineQuantity ?? selectedStockIn.quantity;

  if (numQuantity > availableQty) {
    return `Quantity cannot exceed available stock (${availableQty})`;
  }
}
    }

    return '';
  };

  const validateEmail = (email) => {
    if (!email) return ''; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? '' : 'Please enter a valid email address';
  };

  const validateBackOrder = (backOrder) => {
    if (!backOrder) return 'Back order information is required';
    if (!backOrder.productName?.trim()) return 'Product name is required for back order';
    if (!backOrder.sellingPrice || backOrder.sellingPrice <= 0) return 'Selling price is required for back order';
    return '';
  };

  // Calculate suggested quantity (half of available stock, minimum 1)
  const calculateSuggestedQuantity = (availableQuantity) => {
    if (!availableQuantity || availableQuantity <= 0) return 1;
    const halfQuantity = Math.floor(availableQuantity / 2);
    return halfQuantity > 0 ? halfQuantity : 1;
  };

  // FIXED: Improved SKU search functionality
  const handleSkuSearch = async (index, sku) => {
    // Clear previous timeout to prevent multiple requests
    if (window.skuSearchTimeouts?.[index]) {
      clearTimeout(window.skuSearchTimeouts[index]);
    }

    if (!sku.trim()) {
      // Clear selection if SKU is empty but don't clear the error until user starts typing again
      const updatedEntries = [...formData.salesEntries];
      updatedEntries[index] = { ...updatedEntries[index], stockinId: '', sku: '', quantity: '' };
      setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));
      return;
    }

    // Set loading state for this specific entry
    setSkuLoadingStates(prev => ({ ...prev, [index]: true }));

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

          // Clear only the selection, keep the SKU for user to see/edit
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
            quantity: suggestedQuantity.toString(),
            isBackOrder: false,
            backOrder: null
          };
          setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));

          // Clear SKU error since we found valid stock
          setSkuErrors(prev => ({ ...prev, [index]: '' }));

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
        }
      } else {
        // SKU not found - set error but keep SKU in input for user to correct
        setSkuErrors(prev => ({
          ...prev,
          [index]: 'No stock found with this SKU'
        }));

        // Clear only the selection, keep the SKU
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

      // Clear only the selection, keep the SKU
      const updatedEntries = [...formData.salesEntries];
      updatedEntries[index] = { ...updatedEntries[index], stockinId: '', quantity: '' };
      setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));
    } finally {
      setSkuLoadingStates(prev => ({ ...prev, [index]: false }));
    }
  };

  // FIXED: Improved debounced SKU search with proper cleanup
  const handleSkuChange = (index, value) => {
  // Update the SKU value immediately
  const updatedEntries = [...formData.salesEntries];
  updatedEntries[index] = { ...updatedEntries[index], sku: value };
  setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));

  // Clear SKU error when user starts typing (gives them chance to correct)
  if (value.trim() && skuErrors[index]) {
    setSkuErrors(prev => ({ ...prev, [index]: '' }));
  }

  // Check if we have a selected stock item to determine if it's offline
  const selectedStock = getStockInfo(updatedEntries[index].stockinId);
  const isOfflineData = selectedStock && (selectedStock.synced === false || selectedStock.localId);

  // Don't search for offline data
  if (isOfflineData) {
    return;
  }

  // Initialize timeouts object if it doesn't exist
  if (!window.skuSearchTimeouts) {
    window.skuSearchTimeouts = {};
  }

  // Clear previous timeout for this specific index
  if (window.skuSearchTimeouts[index]) {
    clearTimeout(window.skuSearchTimeouts[index]);
  }

  // Set new timeout for search (only for online data)
  window.skuSearchTimeouts[index] = setTimeout(() => {
    handleSkuSearch(index, value);
  }, 500); // 500ms delay
};

  // Get stock information for display
  const getStockInfo = (stockinId) => {
    if (!stockinId || !stockIns) return null;
    return stockIns.find(stock => stock.id === stockinId || stock.localId === stockinId);
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
      salesEntries: [...prev.salesEntries, { stockinId: '', quantity: '', sku: '', isBackOrder: false, backOrder: null }]
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

      // Clear timeout for this index
      if (window.skuSearchTimeouts?.[index]) {
        clearTimeout(window.skuSearchTimeouts[index]);
        delete window.skuSearchTimeouts[index];
      }
    }
  };

  // Toggle entry type between stock-in and back order
  const toggleEntryType = (index) => {
    const updatedEntries = [...formData.salesEntries];
    const currentEntry = updatedEntries[index];
    
    updatedEntries[index] = {
      ...currentEntry,
      isBackOrder: !currentEntry.isBackOrder,
      // Reset fields when switching types
      stockinId: '',
      sku: '',
      quantity: '',
      backOrder: !currentEntry.isBackOrder ? {
        productName: '',
        sellingPrice: ''
      } : null
    };

    setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));

    // Clear validation errors for this entry
    const updatedErrors = [...validationErrors.salesEntries];
    updatedErrors[index] = {};
    setValidationErrors(prev => ({ ...prev, salesEntries: updatedErrors }));

    // Clear SKU errors
    setSkuErrors(prev => ({ ...prev, [index]: '' }));
  };

  // Handle back order field changes
  const handleBackOrderChange = (index, field, value) => {
    const updatedEntries = [...formData.salesEntries];
    updatedEntries[index] = {
      ...updatedEntries[index],
      backOrder: {
        ...updatedEntries[index].backOrder,
        [field]: value
      }
    };
    setFormData(prev => ({ ...prev, salesEntries: updatedEntries }));

    // Clear validation errors when user starts typing
    const updatedErrors = [...validationErrors.salesEntries];
    if (updatedErrors[index]) {
      updatedErrors[index] = { ...updatedErrors[index], backOrder: '' };
      setValidationErrors(prev => ({ ...prev, salesEntries: updatedErrors }));
    }
  };

  // FIXED: Improved handleSalesEntryChange to clear SKU errors properly
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

      // FIXED: When manually selecting from dropdown, clear SKU error and update SKU field
      if (value && stockIns) {
        const selectedStock = stockIns.find(stock => stock.id === value || stock.localId === value);
        if (selectedStock) {
          // Update SKU if available
          if (selectedStock.sku) {
            updatedEntries[index].sku = selectedStock.sku;
          }

          // Clear SKU error since we have a valid selection
          setSkuErrors(prev => ({ ...prev, [index]: '' }));

          // Auto-fill quantity if not already set
          if (!updatedEntries[index].quantity) {
            const suggestedQuantity = calculateSuggestedQuantity(( selectedStock.offlineQuantity ?? selectedStock.quantity));
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
      } else if (!value) {
        // If clearing selection, also clear SKU error
        setSkuErrors(prev => ({ ...prev, [index]: '' }));
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

    const suggestedQuantity = calculateSuggestedQuantity(stockInfo.offlineQuantity ?? stockInfo.quantity);
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
      const emailError = validateEmail(formData.clientEmail);

      // Validate based on whether it's a stock-in or back order
      let stockinError = '';
      let quantityError = '';

      if (stockOut.backorderId) {
        // Back order update - only validate quantity
        quantityError = !formData.quantity ? 'Quantity is required' : '';
        if (formData.quantity) {
          const numQuantity = Number(formData.quantity);
          if (isNaN(numQuantity) || numQuantity <= 0) {
            quantityError = 'Quantity must be a positive number';
          } else if (!Number.isInteger(numQuantity)) {
            quantityError = 'Quantity must be a whole number';
          }
        }
      } else {
        // Stock-in update
        stockinError = validateStockInId(formData.stockinId);
        quantityError = validateQuantity(formData.quantity, formData.stockinId);
      }

      setValidationErrors({
        stockinId: stockinError,
        quantity: quantityError,
        clientEmail: emailError,
        salesEntries: []
      });

      if (stockinError || quantityError || emailError) {
        return;
      }

      // Prepare single entry data for update
      const submitData = {};
      if (formData.stockinId) submitData.stockinId = formData.stockinId;
      if (formData.quantity) submitData.quantity = Number(formData.quantity);
      if (formData.clientName.trim()) submitData.clientName = formData.clientName.trim();
      if (formData.clientEmail.trim()) submitData.clientEmail = formData.clientEmail.trim();
      if (formData.clientPhone.trim()) submitData.clientPhone = formData.clientPhone.trim();
      if (formData.paymentMethod) submitData.paymentMethod = formData.paymentMethod;

      onSubmit(submitData);
    } else {
      // Multiple entries validation for create mode
      const emailError = validateEmail(formData.clientEmail);
      const salesErrors = formData.salesEntries.map(entry => {
        if (entry.isBackOrder) {
          return {
            quantity: !entry.quantity ? 'Quantity is required' : '',
            backOrder: validateBackOrder(entry.backOrder)
          };
        } else {
          return {
            stockinId: validateStockInId(entry.stockinId),
            quantity: validateQuantity(entry.quantity, entry.stockinId)
          };
        }
      });

      setValidationErrors({
        stockinId: '',
        quantity: '',
        clientEmail: emailError,
        salesEntries: salesErrors
      });

      // Check if there are any validation errors
      const hasEmailError = !!emailError;
      const hasSalesErrors = salesErrors.some(error => error.stockinId || error.quantity || error.backOrder);
      const hasSkuErrors = Object.values(skuErrors).some(error => !!error);

      if (hasEmailError || hasSalesErrors || hasSkuErrors) {
        return;
      }

      // Check for duplicate stock entries (only for stock-in entries)
      const stockinIds = formData.salesEntries
        .filter(entry => !entry.isBackOrder && entry.stockinId)
        .map(entry => entry.stockinId);
      const uniqueStockinIds = new Set(stockinIds);
      if (stockinIds.length !== uniqueStockinIds.size) {
        alert('Cannot select the same stock-in entry multiple times');
        return;
      }

      // Prepare multiple entries data in the new format
      const salesArray = formData.salesEntries.map(entry => {
        if (entry.isBackOrder) {
          return {
            stockinId: null,
            quantity: Number(entry.quantity),
            isBackOrder: true,
            backOrder: {
              productName: entry.backOrder.productName,
              quantity: Number(entry.quantity), // Back order quantity matches sales quantity
              sellingPrice: Number(entry.backOrder.sellingPrice)
            }
          };
        } else {
          return {
            stockinId: entry.stockinId,
            quantity: Number(entry.quantity),
            isBackOrder: false,
            backOrder: null
          };
        }
      });

      // Prepare client info
      const clientInfo = {};
      if (formData.clientName.trim()) clientInfo.clientName = formData.clientName.trim();
      if (formData.clientEmail.trim()) clientInfo.clientEmail = formData.clientEmail.trim();
      if (formData.clientPhone.trim()) clientInfo.clientPhone = formData.clientPhone.trim();
      if (formData.paymentMethod) clientInfo.paymentMethod = formData.paymentMethod;

      // Submit data in the format expected by the backend
      onSubmit({ 
        salesEntries: salesArray,
        ...clientInfo
      });
    }

    onClose();

    // Reset form after submission
    setFormData({
      stockinId: '',
      backorderId: '',
      quantity: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      paymentMethod: '',
      salesEntries: [{ stockinId: '', quantity: '', sku: '', isBackOrder: false, backOrder: null }]
    });

    setValidationErrors({
      stockinId: '',
      quantity: '',
      clientEmail: '',
      salesEntries: []
    });

    setSkuLoadingStates({});
    setSkuErrors({});

    // Clear all SKU search timeouts
    if (window.skuSearchTimeouts) {
      Object.values(window.skuSearchTimeouts).forEach(timeout => clearTimeout(timeout));
      window.skuSearchTimeouts = {};
    }
  };

  const isFormValid = () => {
    if (isUpdateMode) {
      // For update mode, check if it's a back order or stock-in
      if (stockOut.backorderId) {
        // Back order: only quantity is required
        return formData.quantity && !validationErrors.quantity && !validationErrors.clientEmail;
      } else {
        // Stock-in: stockinId and quantity required
        return formData.stockinId &&
          formData.quantity &&
          !validationErrors.stockinId &&
          !validationErrors.quantity &&
          !validationErrors.clientEmail;
      }
    } else {
      // Create mode: validate all entries
      const allEntriesValid = formData.salesEntries.every(entry => {
        if (entry.isBackOrder) {
          return entry.quantity && entry.backOrder?.productName && entry.backOrder?.sellingPrice;
        } else {
          return entry.stockinId && entry.quantity;
        }
      });

      const noValidationErrors = validationErrors.salesEntries.every(error =>
        !error.stockinId && !error.quantity && !error.backOrder
      );

      const noSkuErrors = !Object.values(skuErrors).some(error => !!error);

      return allEntriesValid && !validationErrors.clientEmail && noValidationErrors && noSkuErrors;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-7xl mx-4 max-h-[90vh] overflow-y-auto">
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
              {stockOut.backorderId ? (
                // Back order update form
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingCart size={20} className="text-orange-600" />
                    <h3 className="font-medium text-orange-800">Updating Back Order</h3>
                  </div>
                  
                  {/* Display back order info if available */}
                  {stockOut.backorder && (
                    <div className="mb-4 p-3 bg-white rounded border">
                      <div className="text-sm space-y-1">
                        <div><strong>Product:</strong> {stockOut.backorder.productName}</div>
                        <div><strong>Price:</strong> {formatCurrency(stockOut.backorder.soldPrice || 0)}</div>
                      </div>
                    </div>
                  )}

                  {/* Quantity for back order */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity Sold <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={handleQuantityChange}
                      min="1"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${validationErrors.quantity
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      placeholder="Enter quantity sold"
                    />
                    {validationErrors.quantity && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.quantity}</p>
                    )}
                  </div>
                </div>
              ) : (
                // Stock-in update form
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package size={20} className="text-blue-600" />
                    <h3 className="font-medium text-blue-800">Updating Stock-In Transaction</h3>
                  </div>

                  {/* Stock-In Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock-In Entry <span className="text-red-500">*</span>
                    </label>
                    <SearchableStockInDropdown
                      stockIns={stockIns}
                      value={formData.stockinId}
                      onChange={handleStockInChange}
                      error={!!validationErrors.stockinId}
                      formatCurrency={formatCurrency}
                    />
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
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${validationErrors.quantity
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
  Available stock: {stockIns.find(stock => stock.id === formData.stockinId || stock.localId === formData.stockinId)?.offlineQuantity 
    ?? stockIns.find(stock => stock.id === formData.stockinId)?.quantity 
    ?? 0}
</p>

                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Multiple entries form for create mode
            <div className="min-h-[50vh] max-h-96 overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-800">Sales Entries</h3>
                <p className="text-sm text-gray-600">Add stock-in items or back orders for this transaction</p>
              </div>

              {formData.salesEntries.map((entry, index) => {
                const stockInfo = getStockInfo(entry.stockinId);
                const isSkuLoading = skuLoadingStates[index];
                const skuError = skuErrors[index];

                return (
                  <div key={index} className={`border rounded-lg p-4 mb-4 ${entry.isBackOrder ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        {entry.isBackOrder ? (
                          <ShoppingCart size={16} className="text-orange-600" />
                        ) : (
                          <Package size={16} className="text-blue-600" />
                        )}
                        <h4 className="font-medium text-gray-700">
                          Entry #{index + 1} - {entry.isBackOrder ? 'Back Order' : 'Stock Item'}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleEntryType(index)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            entry.isBackOrder 
                              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          Switch to {entry.isBackOrder ? 'Stock Item' : 'Back Order'}
                        </button>
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
                    </div>

                    {entry.isBackOrder ? (
                      // Back Order Form
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={entry.backOrder?.productName || ''}
                            onChange={(e) => handleBackOrderChange(index, 'productName', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                              validationErrors.salesEntries[index]?.backOrder
                                ? 'border-red-300 focus:ring-red-500'
                                : 'border-gray-300 focus:ring-blue-500'
                            }`}
                            placeholder="Enter product name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Selling Price <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={entry.backOrder?.sellingPrice || ''}
                            onChange={(e) => handleBackOrderChange(index, 'sellingPrice', e.target.value)}
                            min="0"
                            step="0.01"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                              validationErrors.salesEntries[index]?.backOrder
                                ? 'border-red-300 focus:ring-red-500'
                                : 'border-gray-300 focus:ring-blue-500'
                            }`}
                            placeholder="Enter selling price"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity <span className="text-red-500">*</span>
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
                            placeholder="Enter quantity"
                          />
                          {validationErrors.salesEntries[index]?.quantity && (
                            <p className="text-red-500 text-xs mt-1">
                              {validationErrors.salesEntries[index].quantity}
                            </p>
                          )}
                          {entry.backOrder?.sellingPrice && entry.quantity && (
                            <p className="text-green-600 text-xs mt-1">
                              Total: {formatCurrency(entry.backOrder.sellingPrice * Number(entry.quantity || 0))}
                            </p>
                          )}
                        </div>

                        {validationErrors.salesEntries[index]?.backOrder && (
                          <div className="md:col-span-3">
                            <p className="text-red-500 text-xs">{validationErrors.salesEntries[index].backOrder}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Stock-In Form (existing code)
                      <div className={`grid grid-cols-1 gap-4 ${(() => {
  const selectedStock = getStockInfo(entry.stockinId);
  const isOfflineData = selectedStock && (selectedStock.synced === false || selectedStock.localId);
  const shouldShowSku = !entry.stockinId || !isOfflineData;
  return shouldShowSku ? 'md:grid-cols-12' : 'md:grid-cols-9';
})()}` }>
                        {/* SKU Input */}
                       {/* SKU Input - Conditionally rendered */}
{(() => {
  const selectedStock = getStockInfo(entry.stockinId);
  const isOfflineData = selectedStock && (selectedStock.synced === false || selectedStock.localId);
  const shouldShowSku = !entry.stockinId || !isOfflineData;

  return shouldShowSku ? (
    <div className="md:col-span-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        SKU <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          type="text"
          value={entry.sku || ''}
          onChange={(e) => handleSkuChange(index, e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${skuError
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
      {entry.stockinId && !skuError && !isOfflineData && (
        <p className="text-green-600 text-xs mt-1">✓ Stock found & quantity auto-filled</p>
      )}
    </div>
  ) : null;
})()}

                        {/* Stock-In Selection */}
                      {/* Stock-In Selection */}
<div className={(() => {
  const selectedStock = getStockInfo(entry.stockinId);
  const isOfflineData = selectedStock && (selectedStock.synced === false || selectedStock.localId);
  const shouldShowSku = !entry.stockinId || !isOfflineData;
  return shouldShowSku ? 'md:col-span-4' : 'md:col-span-3';
})()}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stock-In Entry <span className="text-red-500">*</span>
                          </label>
                          <SearchableStockInDropdown
                            stockIns={stockIns}
                            value={entry.stockinId}
                            onChange={(e) => handleSalesEntryChange(index, 'stockinId', e.target.value)}
                            error={!!validationErrors.salesEntries[index]?.stockinId}
                            formatCurrency={formatCurrency}
                            placeholder="Select a stock-in entry"
                          />
                          {validationErrors.salesEntries[index]?.stockinId && (
                            <p className="text-red-500 text-xs mt-1">
                              {validationErrors.salesEntries[index].stockinId}
                            </p>
                          )}
                        </div>

                        {/* Quantity */}
                       <div className={(() => {
  const selectedStock = getStockInfo(entry.stockinId);
  const isOfflineData = selectedStock && (selectedStock.synced === false || selectedStock.localId);
  const shouldShowSku = !entry.stockinId || !isOfflineData;
  return shouldShowSku ? 'md:col-span-2' : 'md:col-span-3';
})()}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity Sold <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={entry.quantity}
                              onChange={(e) => handleSalesEntryChange(index, 'quantity', e.target.value)}
                              min="1"
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${validationErrors.salesEntries[index]?.quantity
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
                                <span className="font-medium">{ stockInfo.offlineQuantity ?? stockInfo.quantity}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Suggested:</span>
                                <span className="font-medium text-blue-600">
                                  {calculateSuggestedQuantity(stockInfo.offlineQuantity ?? stockInfo.quantity)} (½)
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
                    )}
                  </div>
                );
              })}

              {/* Add Sales Entry Button */}
              <div className="flex justify-center mb-4 gap-2">
                <button
                  type="button"
                  onClick={addSalesEntry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Package size={16} />
                  Add Stock Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newEntry = { stockinId: '', quantity: '', sku: '', isBackOrder: true, backOrder: { productName: '', sellingPrice: '' } };
                    setFormData(prev => ({
                      ...prev,
                      salesEntries: [...prev.salesEntries, newEntry]
                    }));
                    setValidationErrors(prev => ({
                      ...prev,
                      salesEntries: [...prev.salesEntries, {}]
                    }));
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                >
                  <ShoppingCart size={16} />
                  Add Back Order
                </button>
              </div>
            </div>
          )}

          {/* Client Information Section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Client Information</h3>

            {/* Better layout for client info inputs */}
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
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${validationErrors.clientEmail
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

              {/* Payment Method */}
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
            <strong>Create Mode:</strong> Add multiple stock items and back orders to create a single transaction.
            <br />
            <strong>Stock Items:</strong> Use SKU search to automatically find and select stock with auto-filled quantity (half of available stock).
            <br />
            <strong>Back Orders:</strong> For items not in stock, manually enter product details and pricing.
            <br />
            <strong>Update Mode:</strong> {isUpdateMode && stockOut?.backorderId ? 'Updating a back order - only quantity can be modified.' : 'Updating a stock transaction - modify stock selection and quantity.'}
            <br />
            <strong>Required fields:</strong> Quantity is always required. For stock items: SKU or Stock-In selection. For back orders: Product name and selling price.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpsertStockOutModal;