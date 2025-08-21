import { useEffect, useState } from "react";
import { Search, Package, DollarSign, Hash, User, Mail, Phone, Calendar, RotateCcw, AlertTriangle, Check, X, Info } from 'lucide-react';
import stockOutService from "../../../services/stockoutService";

// Modal Component for Sales Return
const UpsertSalesReturnModal = ({ isOpen, onClose, onSubmit, isLoading, title, currentUser, userRole }) => {
  const [transactionId, setTransactionId] = useState('');
  const [reason, setReason] = useState('');
  const [soldProducts, setSoldProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Predefined return reasons
  const commonReasons = [
    'Defective product',
    'Wrong item ordered',
    'Damaged during shipping',
    'Customer changed mind',
    'Product expired',
    'Size/color mismatch',
    'Quality issues',
    'Not as described',
    'Duplicate order',
    'Other'
  ];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTransactionId('');
    setReason('');
    setSoldProducts([]);
    setSelectedItems([]);
    setIsSearching(false);
    setSearchError('');
    setHasSearched(false);
    setValidationErrors({});
  };

  const handleSearchTransaction = async () => {
    if (!transactionId.trim()) {
      setSearchError('Please enter a transaction ID');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setHasSearched(false);

    try {
      const response = await stockOutService.getStockOutByTransactionId(transactionId.trim());
      
      if (response && response.length > 0) {
        // Filter out items that have already been fully returned
        const availableProducts = response.filter(product => {
          // Check if product has remaining quantity available for return
          return product.quantity > 0;
        });

        if (availableProducts.length > 0) {
          setSoldProducts(availableProducts);
          setHasSearched(true);
          setSelectedItems([]);
        } else {
          setSoldProducts([]);
          setSearchError('All products from this transaction have already been returned');
          setHasSearched(true);
        }
      } else {
        setSoldProducts([]);
        setSearchError('No products found for this transaction ID');
        setHasSearched(true);
      }
    } catch (error) {
      console.error('Error searching transaction:', error);
      setSearchError(`Failed to find transaction: ${error.message}`);
      setSoldProducts([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleItemSelect = (stockoutId, isSelected) => {
    if (isSelected) {
      const product = soldProducts.find(p => p.id === stockoutId);
      if (product) {
        const newItem = {
          stockoutId: stockoutId,
          quantity: 1, // Default to 1 instead of full quantity
          maxQuantity: product.quantity,
          productName: product.stockin?.product?.productName || 'Unknown Product',
          sku: product.stockin?.product?.sku || 'N/A',
          unitPrice: product.soldPrice ? (product.soldPrice / product.quantity) : 0,
          soldPrice: product.soldPrice || 0,
          soldQuantity: product.quantity
        };
        setSelectedItems(prev => [...prev, newItem]);
      }
    } else {
      setSelectedItems(prev => prev.filter(item => item.stockoutId !== stockoutId));
    }
    
    // Clear validation error for this item
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[stockoutId];
      return newErrors;
    });
  };

  const handleQuantityChange = (stockoutId, quantity) => {
    const numQuantity = parseInt(quantity) || 0;
    setSelectedItems(prev => 
      prev.map(item => 
        item.stockoutId === stockoutId 
          ? { ...item, quantity: Math.min(Math.max(0, numQuantity), item.maxQuantity) } 
          : item
      )
    );

    // Clear validation error if quantity is valid
    if (numQuantity > 0) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[stockoutId];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    if (!transactionId.trim()) {
      setSearchError('Transaction ID is required');
      return false;
    }

    if (!reason.trim()) {
      setSearchError('Return reason is required');
      return false;
    }

    if (selectedItems.length === 0) {
      setSearchError('Please select at least one item to return');
      return false;
    }

    selectedItems.forEach(item => {
      if (item.quantity <= 0) {
        errors[item.stockoutId] = 'Quantity must be greater than 0';
        isValid = false;
      }
      
      if (item.quantity > item.maxQuantity) {
        errors[item.stockoutId] = `Quantity cannot exceed ${item.maxQuantity}`;
        isValid = false;
      }
    });

    setValidationErrors(errors);
    if (!isValid) {
      setSearchError('Please fix the quantity errors below');
    }
    
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Prepare the data in the format expected by the backend
    const returnData = {
      transactionId: transactionId.trim(),
      reason: reason.trim(),
      items: selectedItems.map(item => ({
        stockoutId: item.stockoutId,
        quantity: item.quantity
      }))
    };

    onSubmit(returnData);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF'
    }).format(price || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateTotalRefund = () => {
    return selectedItems.reduce((total, item) => {
      return total + (item.unitPrice * item.quantity);
    }, 0);
  };

  const calculateTotalQuantity = () => {
    return selectedItems.reduce((total, item) => total + item.quantity, 0);
  };

  const isItemSelected = (stockoutId) => {
    return selectedItems.some(item => item.stockoutId === stockoutId);
  };

  const getSelectedItem = (stockoutId) => {
    return selectedItems.find(item => item.stockoutId === stockoutId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl w-full max-w-6xl mx-4 max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-primary-600" />
                {title}
              </h2>
              <p className="text-sm text-gray-600 mt-1">Search for a transaction and select items to return</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* User Info */}
            {currentUser && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User size={16} className="text-blue-600" />
                  <span className="font-medium text-blue-900">Processing as: {userRole}</span>
                </div>
                <p className="text-sm text-blue-700">
                  {userRole === 'admin' ? currentUser.adminName : `${currentUser.firstname} ${currentUser.lastname}`}
                  {currentUser.email && ` (${currentUser.email})`}
                </p>
              </div>
            )}

            {/* Transaction Search Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction ID <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => {
                      setTransactionId(e.target.value);
                      setSearchError('');
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchTransaction()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="Enter transaction ID (e.g., ABTR64943)"
                    disabled={isSearching}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchTransaction}
                  disabled={isSearching || !transactionId.trim()}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors font-medium"
                >
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Search size={16} />
                  )}
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
              
              {searchError && (
                <div className="mt-2 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                  <AlertTriangle size={16} />
                  {searchError}
                </div>
              )}
            </div>

            {/* Transaction Results */}
            {hasSearched && soldProducts.length > 0 && (
              <>
                {/* Transaction Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Info size={16} className="text-gray-600" />
                    Transaction Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Hash size={14} className="text-gray-400" />
                      <span className="text-gray-600">ID:</span>
                      <span className="font-medium">{soldProducts[0]?.transactionId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="text-gray-600">Client:</span>
                      <span className="font-medium">{soldProducts[0]?.clientName || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{formatDate(soldProducts[0]?.createdAt)}</span>
                    </div>
                    {soldProducts[0]?.clientEmail && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-gray-400" />
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium text-xs">{soldProducts[0].clientEmail}</span>
                      </div>
                    )}
                    {soldProducts[0]?.clientPhone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{soldProducts[0].clientPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-gray-400" />
                      <span className="text-gray-600">Total Items:</span>
                      <span className="font-medium">{soldProducts.length}</span>
                    </div>
                  </div>
                </div>

                {/* Return Reason Section */}
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Info size={16} className="text-yellow-600" />
                    Return Reason <span className="text-red-500">*</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Please provide a reason for this return. This will apply to all returned items.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Common Reason
                      </label>
                      <select
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          setSearchError('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select a reason...</option>
                        {commonReasons.map((commonReason) => (
                          <option key={commonReason} value={commonReason}>{commonReason}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Or Enter Custom Reason
                      </label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          setSearchError('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Enter custom reason"
                      />
                    </div>
                  </div>
                </div>

                {/* Products List */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Package size={16} className="text-gray-600" />
                    Select Items to Return
                  </h3>
                  <div className="space-y-3">
                    {soldProducts.map((product) => {
                      const isSelected = isItemSelected(product.id);
                      const selectedItem = getSelectedItem(product.id);
                      const hasError = validationErrors[product.id];
                      const unitPrice = product.soldPrice ? (product.soldPrice / product.quantity) : 0;

                      return (
                        <div
                          key={product.id}
                          className={`border rounded-lg p-4 transition-all duration-200 ${
                            isSelected 
                              ? 'border-primary-300 bg-primary-50 shadow-sm' 
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          } ${hasError ? 'border-red-300 bg-red-50' : ''}`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Checkbox */}
                            <div className="flex items-center pt-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleItemSelect(product.id, e.target.checked)}
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                            </div>

                            {/* Product Info */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white">
                                    <Package size={18} />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900 text-lg">
                                      {product.stockin?.product?.productName || 'Unknown Product'}
                                    </h4>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                      <span>SKU: {product.stockin?.product?.sku || 'N/A'}</span>
                                      <span>•</span>
                                      <span>Available: {product.quantity} units</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900 text-lg">
                                    {formatPrice(product.soldPrice)}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {formatPrice(unitPrice)} per unit
                                  </div>
                                </div>
                              </div>

                              {/* Quantity Selection (shown when selected) */}
                              {isSelected && selectedItem && (
                                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    {/* Quantity to Return */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Quantity to Return <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        max={selectedItem.maxQuantity}
                                        value={selectedItem.quantity}
                                        onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-center font-medium ${
                                          hasError
                                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                            : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                                        }`}
                                      />
                                      <p className="text-xs text-gray-500 mt-1 text-center">
                                        Max: {selectedItem.maxQuantity}
                                      </p>
                                    </div>

                                    {/* Refund Calculation */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Refund Amount
                                      </label>
                                      <div className="w-full px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-center">
                                        <span className="font-bold text-green-600 text-lg">
                                          {formatPrice(selectedItem.unitPrice * selectedItem.quantity)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1 text-center">
                                        {formatPrice(selectedItem.unitPrice)} × {selectedItem.quantity}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Validation Error */}
                              {hasError && (
                                <div className="mt-3 flex items-center gap-2 text-red-600 text-sm bg-red-100 p-2 rounded-lg">
                                  <AlertTriangle size={14} />
                                  {hasError}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Return Summary */}
                {selectedItems.length > 0 && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                      <Check size={16} />
                      Return Summary
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center p-3 bg-white rounded-lg">
                        <div className="text-2xl font-bold text-green-700">{selectedItems.length}</div>
                        <div className="text-green-600">Items</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <div className="text-2xl font-bold text-green-700">{calculateTotalQuantity()}</div>
                        <div className="text-green-600">Total Qty</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <div className="text-2xl font-bold text-green-700">{formatPrice(calculateTotalRefund())}</div>
                        <div className="text-green-600">Total Refund</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <div className="text-2xl font-bold text-green-700">
                          {formatPrice(calculateTotalRefund() / calculateTotalQuantity() || 0)}
                        </div>
                        <div className="text-green-600">Avg/Unit</div>
                      </div>
                    </div>
                    
                    {reason && (
                      <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                        <div className="text-sm text-gray-600">Return Reason:</div>
                        <div className="font-medium text-gray-900">{reason}</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* No Results Message */}
            {hasSearched && soldProducts.length === 0 && !searchError && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RotateCcw className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
                <p className="text-gray-600">
                  No returnable products found for transaction ID: <strong>{transactionId}</strong>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This could mean the transaction doesn't exist or all items have already been returned.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || selectedItems.length === 0 || !reason.trim()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw size={16} />
                  Process Return ({selectedItems.length} items, {calculateTotalQuantity()} qty)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpsertSalesReturnModal;