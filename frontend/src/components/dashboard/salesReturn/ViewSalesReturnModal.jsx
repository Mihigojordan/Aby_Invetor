import React from 'react';
import { X, Package, DollarSign, Hash, User, Mail, Phone, Calendar, RotateCcw, FileText, Building, Barcode, Clock } from 'lucide-react';
import { API_URL } from '../../../api/api';

const ViewSalesReturnModal = ({ isOpen, onClose, salesReturn }) => {
  if (!isOpen || !salesReturn) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
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

  // Calculate refund details
  const calculateRefundAmount = () => {
    if (!salesReturn.stockout) return 0;
    const unitPrice = salesReturn.stockout.soldPrice / salesReturn.stockout.quantity;
    // Assuming full quantity is returned for now - you might want to add a quantity field to the return model
    return salesReturn.stockout.soldPrice;
  };

  const getProcessedBy = () => {
    if (salesReturn.admin) {
      return {
        type: 'Admin',
        name: salesReturn.admin.adminName,
        email: salesReturn.admin.adminEmail
      };
    } else if (salesReturn.employee) {
      return {
        type: 'Employee',
        name: salesReturn.employee.employeeName,
        email: salesReturn.employee.employeeEmail
      };
    }
    return null;
  };

  const processedBy = getProcessedBy();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl w-full max-w-4xl mx-4 max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-500 to-red-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Sales Return Details</h2>
                <p className="text-red-100 text-sm">Return ID: {truncateId(salesReturn.id)}</p>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-gray-600">Return ID</span>
                  </div>
                  <p className="font-mono text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">
                    {truncateId(salesReturn.id)}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-600">Refund Amount</span>
                  </div>
                  <p className="text-lg font-semibold text-green-600">
                    {formatPrice(calculateRefundAmount())}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Information */}
              {salesReturn.stockout && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-500" />
                      Product Information
                    </h3>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
                        <Package className="w-8 h-8" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-1">
                          {salesReturn.stockout.stockin?.product?.productName || 'Unknown Product'}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {salesReturn.stockout.stockin?.sku && (
                            <div className="flex items-center gap-1">
                              <Barcode className="w-4 h-4" />
                              <span>{salesReturn.stockout.stockin.sku}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Hash className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-600">Quantity Sold</span>
                          </div>
                          <p className="text-lg font-semibold text-gray-900">
                            {salesReturn.stockout.quantity}
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-600">Unit Price</span>
                          </div>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatPrice(salesReturn.stockout.soldPrice / salesReturn.stockout.quantity)}
                          </p>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-blue-700">Total Sale Amount</span>
                        </div>
                        <p className="text-xl font-bold text-blue-800">
                          {formatPrice(salesReturn.stockout.soldPrice)}
                        </p>
                      </div>

                      {/* Barcode Image */}
                      {salesReturn.stockout.stockin?.barcodeUrl && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Barcode className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-600">Product Barcode</span>
                          </div>
                          <img
                            src={`${API_URL}${salesReturn.stockout.stockin.barcodeUrl}`}
                            alt="Product Barcode"
                            className="h-12 object-contain bg-white rounded p-1 border"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction & Return Details */}
              <div className="space-y-6">
                {/* Transaction Information */}
                {salesReturn.stockout && (
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
                          {salesReturn.stockout.transactionId}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Sale Date</span>
                        <span className="text-sm text-gray-900">
                          {formatDate(salesReturn.stockout.createdAt)}
                        </span>
                      </div>

                      {salesReturn.stockout.clientName && (
                        <>
                          <div className="flex items-center justify-between py-2 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-600">Client Name</span>
                            <span className="text-sm text-gray-900">
                              {salesReturn.stockout.clientName}
                            </span>
                          </div>

                          {salesReturn.stockout.clientEmail && (
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-600">Client Email</span>
                              <span className="text-sm text-gray-900">
                                {salesReturn.stockout.clientEmail}
                              </span>
                            </div>
                          )}

                          {salesReturn.stockout.clientPhone && (
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-600">Client Phone</span>
                              <span className="text-sm text-gray-900">
                                {salesReturn.stockout.clientPhone}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Return Information */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-orange-500" />
                      Return Information
                    </h3>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between py-2">
                      <span className="text-sm font-medium text-gray-600">Return Reason</span>
                      <div className="text-right max-w-xs">
                        {salesReturn.reason ? (
                          <span className="text-sm text-gray-900 bg-orange-50 px-3 py-1 rounded-full">
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

                    {processedBy && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Processed By</span>
                        <div className="text-right">
                          <div className="text-sm text-gray-900 font-medium">
                            {processedBy.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {processedBy.type} • {processedBy.email}
                          </div>
                        </div>
                      </div>
                    )}
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
                    {processedBy && (
                      <> by <strong>{processedBy.name}</strong> ({processedBy.type})</>
                    )}. 
                    The refund amount of <strong>{formatPrice(calculateRefundAmount())}</strong> should be processed 
                    according to your return policy.
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