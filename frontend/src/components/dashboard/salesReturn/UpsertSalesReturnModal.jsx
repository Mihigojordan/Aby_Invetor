import { useEffect, useState } from "react";
import { Search, Package, DollarSign, Hash, User, Mail, Phone, Calendar, RotateCcw, AlertTriangle, Check } from 'lucide-react';
import stockOutService from "../../../services/stockOutService";

// Modal Component for Sales Return
const UpsertSalesReturnModal = ({ isOpen, onClose, onSubmit, isLoading, title }) => {
  const [transactionId, setTransactionId] = useState('');
  const [soldProducts, setSoldProducts] = useState([]);
  const [selectedReturns, setSelectedReturns] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTransactionId('');
    setSoldProducts([]);
    setSelectedReturns([]);
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
        setSoldProducts(response);
        setHasSearched(true);
        // Initialize selected returns array
        setSelectedReturns([]);
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

  const handleProductSelect = (stockoutId, isSelected) => {
    if (isSelected) {
      // Add to selected returns
      const product = soldProducts.find(p => p.id === stockoutId);
      if (product) {
        setSelectedReturns(prev => [...prev, {
          stockoutId: stockoutId,
          reason: '',
          maxQuantity: product.quantity,
          quantity: product.quantity, // Default to full quantity
          productName: product.stockin?.product?.productName || 'Unknown Product',
          soldPrice: product.soldPrice,
          soldQuantity: product.quantity
        }]);
      }
    } else {
      // Remove from selected returns
      setSelectedReturns(prev => prev.filter(item => item.stockoutId !== stockoutId));
    }
    
    // Clear validation error for this product
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[stockoutId];
      return newErrors;
    });
  };

  const handleReasonChange = (stockoutId, reason) => {
    setSelectedReturns(prev => 
      prev.map(item => 
        item.stockoutId === stockoutId 
          ? { ...item, reason } 
          : item
      )
    );
    
    // Clear validation error for this product
    if (reason.trim()) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[stockoutId];
        return newErrors;
      });
    }
  };

  const handleQuantityChange = (stockoutId, quantity) => {
    const numQuantity = parseInt(quantity) || 0;
    setSelectedReturns(prev => 
      prev.map(item => 
        item.stockoutId === stockoutId 
          ? { ...item, quantity: numQuantity } 
          : item
      )
    );
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    if (selectedReturns.length === 0) {
      setSearchError('Please select at least one product to return');
      return false;
    }

    selectedReturns.forEach(item => {
      if (!item.reason.trim()) {
        errors[item.stockoutId] = 'Return reason is required';
        isValid = false;
      }
      
      if (item.quantity <= 0 || item.quantity > item.maxQuantity) {
        errors[item.stockoutId] = `Quantity must be between 1 and ${item.maxQuantity}`;
        isValid = false;
      }
    });

    setValidationErrors(errors);
    if (!isValid) {
      setSearchError('');
    }
    
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Prepare the data in the format expected by the service
    const returnData = {
      returns: selectedReturns.map(item => ({
        transactionId: transactionId.trim(),
        reason: item.reason.trim(),
        // You might want to include additional fields based on your backend requirements
        stockoutId: item.stockoutId,
        quantity: item.quantity
      }))
    };

    onSubmit(returnData);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
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
    return selectedReturns.reduce((total, item) => {
      const unitPrice = item.soldPrice / item.soldQuantity;
      return total + (unitPrice * item.quantity);
    }, 0);
  };

  const isProductSelected = (stockoutId) => {
    return selectedReturns.some(item => item.stockoutId === stockoutId);
  };

  const getSelectedProduct = (stockoutId) => {
    return selectedReturns.find(item => item.stockoutId === stockoutId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-full max-w-6xl mx-4 max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">Search for a transaction and select products to return</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter transaction ID (e.g., ABTR64943)"
                    disabled={isSearching}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchTransaction}
                  disabled={isSearching || !transactionId.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
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
                <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle size={16} />
                  {searchError}
                </div>
              )}
            </div>

            {/* Transaction Results */}
            {hasSearched && soldProducts.length > 0 && (
              <>
                {/* Transaction Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Transaction Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Hash size={14} className="text-gray-400" />
                      <span className="text-gray-600">Transaction ID:</span>
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
                        <span className="font-medium">{soldProducts[0].clientEmail}</span>
                      </div>
                    )}
                    {soldProducts[0]?.clientPhone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{soldProducts[0].clientPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Products List */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-4">Select Products to Return</h3>
                  <div className="space-y-3">
                    {soldProducts.map((product) => {
                      const isSelected = isProductSelected(product.id);
                      const selectedProduct = getSelectedProduct(product.id);
                      const hasError = validationErrors[product.id];

                      return (
                        <div
                          key={product.id}
                          className={`border rounded-lg p-4 transition-colors ${
                            isSelected 
                              ? 'border-blue-300 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          } ${hasError ? 'border-red-300' : ''}`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Checkbox */}
                            <div className="flex items-center pt-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleProductSelect(product.id, e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>

                            {/* Product Info */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                                    <Package size={16} />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">
                                      {product.stockin?.product?.productName || 'Unknown Product'}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                      SKU: {product.stockin?.sku || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900">
                                    {formatPrice(product.soldPrice)}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Qty: {product.quantity}
                                  </div>
                                </div>
                              </div>

                              {/* Return Details (shown when selected) */}
                              {isSelected && selectedProduct && (
                                <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Quantity to Return */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Quantity to Return <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        max={selectedProduct.maxQuantity}
                                        value={selectedProduct.quantity}
                                        onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                      <p className="text-xs text-gray-500 mt-1">
                                        Max returnable: {selectedProduct.maxQuantity}
                                      </p>
                                    </div>

                                    {/* Return Reason */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Return Reason <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="text"
                                        value={selectedProduct.reason}
                                        onChange={(e) => handleReasonChange(product.id, e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                                          hasError
                                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                        }`}
                                        placeholder="e.g., Defective, Wrong size, Customer changed mind"
                                      />
                                    </div>
                                  </div>

                                  {/* Refund Calculation */}
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-gray-600">Refund Amount:</span>
                                      <span className="font-semibold text-green-600">
                                        {formatPrice((product.soldPrice / product.quantity) * selectedProduct.quantity)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Validation Error */}
                              {hasError && (
                                <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
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
                {selectedReturns.length > 0 && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                      <Check size={16} />
                      Return Summary
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-green-700">Items to Return:</span>
                        <span className="font-semibold ml-2">{selectedReturns.length}</span>
                      </div>
                      <div>
                        <span className="text-green-700">Total Quantity:</span>
                        <span className="font-semibold ml-2">
                          {selectedReturns.reduce((sum, item) => sum + item.quantity, 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-green-700">Total Refund:</span>
                        <span className="font-semibold ml-2 text-green-800">
                          {formatPrice(calculateTotalRefund())}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* No Results Message */}
            {hasSearched && soldProducts.length === 0 && !searchError && (
              <div className="text-center py-8">
                <RotateCcw className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Products Found</h3>
                <p className="text-gray-600">
                  No sold products found for transaction ID: <strong>{transactionId}</strong>
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
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || selectedReturns.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw size={16} />
                  Process Return ({selectedReturns.length} items)
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