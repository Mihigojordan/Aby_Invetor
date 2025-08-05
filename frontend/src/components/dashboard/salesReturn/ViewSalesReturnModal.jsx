import React from 'react';
import { X, Package, DollarSign, Hash, User, Mail, Phone, Calendar, RotateCcw, FileText, Building, Barcode, Clock, ShoppingCart } from 'lucide-react';
import { API_URL } from '../../../api/api';

const ViewSalesReturnModal = ({ isOpen, onClose, salesReturn }) => {
  if (!isOpen || !salesReturn) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF'
    }).format(price || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const truncateId = (id) => {
    return id ? `${id.substring(0, 8)}...${id.substring(id.length - 4)}` : 'N/A';
  };

  // Calculate total refund amount from all items
  const calculateTotalRefundAmount = () => {
    if (!salesReturn.items || salesReturn.items.length === 0) return 0;
    return salesReturn.items.reduce((total, item) => {
      return total + (item.stockout.soldPrice * item.quantity);
    }, 0);
  };

  // Get total quantity of all returned items
  const getTotalQuantity = () => {
    if (!salesReturn.items || salesReturn.items.length === 0) return 0;
    return salesReturn.items.reduce((total, item) => total + item.quantity, 0);
  };

  // Get client information from the first item (assuming all items have same client)
  const getClientInfo = () => {
    if (salesReturn.items && salesReturn.items.length > 0) {
      const firstStockout = salesReturn.items[0].stockout;
      return {
        name: firstStockout.clientName,
        email: firstStockout.clientEmail,
        phone: firstStockout.clientPhone
      };
    }
    return null;
  };

  const getProcessedBy = () => {
    if (salesReturn.items && salesReturn.items.length > 0) {
      const firstStockout = salesReturn.items[0].stockout;
      if (firstStockout.adminId) {
        return {
          type: 'Admin',
          id: firstStockout.adminId
        };
      } else if (firstStockout.employeeId) {
        return {
          type: 'Employee',
          id: firstStockout.employeeId
        };
      }
    }
    return null;
  };

  const clientInfo = getClientInfo();
  const processedBy = getProcessedBy();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl w-full max-w-6xl mx-4 max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-500 to-red-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Sales Return Details</h2>
                <p className="text-red-100 text-sm">Credit Note ID: {salesReturn.creditnoteId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Return Summary Card */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Return Summary</h3>
                  <p className="text-red-700 text-sm">Product return information</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               

                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-600">Items Returned</span>
                  </div>
                  <p className="text-lg font-semibold text-blue-600">
                    {salesReturn.items?.length || 0} items ({getTotalQuantity()} qty)
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-600">Total Refund</span>
                  </div>
                  <p className="text-lg font-semibold text-green-600">
                    {formatPrice(calculateTotalRefundAmount())}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-600">Return Date</span>
                  </div>
                  <p className="text-sm text-gray-900">
                    {formatDate(salesReturn.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Returned Items */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-500" />
                      Returned Items ({salesReturn.items?.length || 0})
                    </h3>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {salesReturn.items?.map((item, index) => (
                      <div key={item.id} className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                            <Package className="w-8 h-8" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-semibold text-gray-900 mb-1">
                              {item.stockout.stockin?.product?.productName || 'Unknown Product'}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                             
                              <span className="text-gray-400">•</span>
                              <span>{item.stockout.stockin?.product?.brand}</span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-600 mb-1">Returned Qty</div>
                                <div className="text-lg font-semibold text-gray-900">{item.quantity}</div>
                              </div>
                              
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-600 mb-1">Unit Price</div>
                                <div className="text-lg font-semibold text-gray-900">
                                  {formatPrice(item.stockout.soldPrice / item.stockout.quantity)}
                                </div>
                              </div>
                              
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs font-medium text-gray-600 mb-1">Original Sale</div>
                                <div className="text-lg font-semibold text-gray-900">
                                  {formatPrice(item.stockout.soldPrice)}
                                </div>
                              </div>
                              
                              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                <div className="text-xs font-medium text-green-700 mb-1">Refund Amount</div>
                                <div className="text-lg font-bold text-green-800">
                                  {formatPrice(item.stockout.soldPrice * item.quantity)}
                                </div>
                              </div>
                            </div>


                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transaction & Return Details */}
              <div className="space-y-6">
                {/* Transaction Information */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Hash className="w-5 h-5 text-green-500" />
                      Transaction Details
                    </h3>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Transaction ID</span>
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {salesReturn.transactionId}
                      </span>
                    </div>

                    {clientInfo && (
                      <>
                        {clientInfo.name && (
                          <div className="flex items-center justify-between py-2 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-600">Client Name</span>
                            <span className="text-sm text-gray-900">
                              {clientInfo.name}
                            </span>
                          </div>
                        )}

                        {clientInfo.email && (
                          <div className="flex items-center justify-between py-2 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-600">Client Email</span>
                            <span className="text-sm text-gray-900">
                              {clientInfo.email}
                            </span>
                          </div>
                        )}

                        {clientInfo.phone && (
                          <div className="flex items-center justify-between py-2 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-600">Client Phone</span>
                            <span className="text-sm text-gray-900">
                              {clientInfo.phone}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Return Information */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-orange-500" />
                      Return Information
                    </h3>
                  </div>
                  
                  <div className="p-6 space-y-4">

                         <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Credit Note Id</span>
                      <span className="text-sm text-gray-900">
                        {salesReturn.creditnoteId}
                      </span>
                    </div>
                    <div className="flex items-start flex-wrap justify-between py-2">
                      <span className="text-sm font-medium text-gray-600">Return Reason</span>
                      <div className="text-right max-w-xs">
                        {salesReturn.reason ? (
                          <span className="text-sm text-gray-900 bg-orange-50 px-3 py-1 rounded-full ">
                            {salesReturn.reason}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 italic">No reason provided</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Return Date</span>
                      <span className="text-sm text-gray-900">
                        {formatDate(salesReturn.createdAt)}
                      </span>
                    </div>

                 
                  </div>
                </div>

                {/* Summary Totals */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-900">Refund Summary</h4>
                      <p className="text-green-700 text-sm">Total amount to be refunded</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Total Items:</span>
                      <span className="font-medium">{salesReturn.items?.length || 0} items</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Total Quantity:</span>
                      <span className="font-medium">{getTotalQuantity()} units</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">Total Refund:</span>
                        <span className="text-xl font-bold text-green-600">
                          {formatPrice(calculateTotalRefundAmount())}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Return Processing Information</h4>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    This return was processed on <strong>{formatDate(salesReturn.createdAt)}</strong>
                    . 
                    The total refund amount of <strong>{formatPrice(calculateTotalRefundAmount())}</strong> 
                    covers {salesReturn.items?.length || 0} items and should be processed according to your return policy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewSalesReturnModal;