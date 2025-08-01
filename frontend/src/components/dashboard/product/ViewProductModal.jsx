import React from 'react';
import { X, Package, Tag, Building2, FileText, Calendar, User, Hash, Layers } from 'lucide-react';
import { API_URL } from '../../../api/api';
import productService from '../../../services/productService';

const ViewProductModal = ({ isOpen, onClose, product }) => {
  if (!isOpen || !product) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateId = (id) => {
    return id ? `${id.substring(0, 8)}-${id.substring(8, 12)}-${id.substring(12, 16)}-${id.substring(16, 20)}-${id.substring(20)}` : 'N/A';
  };

  const getTotalStock = () => {
    return product.stockIn?.reduce((total, stock) => total + (stock.quantity || 0), 0) || 0;
  };

  const getAveragePrice = () => {
    if (!product.stockIn || product.stockIn.length === 0) return 0;
    const totalPrice = product.stockIn.reduce((total, stock) => total + (stock.price || 0), 0);
    return totalPrice / product.stockIn.length;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Product Details</h2>
              <p className="text-primary-600 font-medium">
                {product.productName || 'Unknown Product'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Basic Information */}
            <div className="space-y-6">
        
              {/* Basic Product Information */}
              <div className="bg-primary-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-primary-600" />
                  <h3 className="font-semibold text-gray-900">Product Information</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                    <p className="text-gray-900 font-medium text-lg">
                      {product.productName || 'N/A'}
                    </p>
                  </div>
                  {product.brand && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-gray-500" />
                        <p className="text-gray-900">{product.brand}</p>
                      </div>
                    </div>
                  )}
                  {product.category?.name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-gray-500" />
                        <p className="text-gray-900">{product.category.name}</p>
                      </div>
                    </div>
                  )}
                  {product.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <div className="text-gray-600 text-sm bg-white p-3 rounded border max-h-32 overflow-y-auto" 
                        dangerouslySetInnerHTML={{__html : productService.parseDescription(product.description)}} />
                    </div>
                  )}
                </div>
              </div>

              {/* Stock Summary */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Stock Summary</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white rounded border">
                    <p className="text-2xl font-bold text-green-600">{getTotalStock()}</p>
                    <p className="text-sm text-gray-600">Total Units</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded border">
                    <p className="text-2xl font-bold text-primary-600">{product.stockIn?.length || 0}</p>
                    <p className="text-sm text-gray-600">Stock Entries</p>
                  </div>
                </div>
              </div>

              {/* Creator Information */}
              <div className="bg-primary-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-primary-600" />
                  <h3 className="font-semibold text-gray-900">Created By</h3>
                </div>
                <div className="space-y-2">
                  {product.admin && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Admin</label>
                      <p className="text-gray-900">{product.admin.name || 'Admin User'}</p>
                    </div>
                  )}
                  {product.employee && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                      <p className="text-gray-900">{product.employee.name || 'Employee User'}</p>
                    </div>
                  )}
                  {!product.admin && !product.employee && (
                    <p className="text-gray-500 italic">Creator information not available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Additional Information */}
            <div className="space-y-6">
              {/* Product Images */}
              {product.imageUrls && (
                <div className="bg-primary-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-primary-600" />
                    <h3 className="font-semibold text-gray-900">Product Images</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Array.isArray(product.imageUrls) 
                      ? product.imageUrls.slice(0, 6).map((url, index) => (
                          <div key={index} className="relative">
                            <img 
                              src={`${API_URL}${url}`} 
                              alt={`Product ${index + 1}`}
                              className="w-full h-24 object-cover rounded border hover:scale-105 transition-transform cursor-pointer"
                            />
                          </div>
                        ))
                      : <p className="text-gray-500 italic col-span-2">No images available</p>
                    }
                  </div>
                </div>
              )}

              {/* Recent Stock Entries */}
              {product.stockIn && product.stockIn.length > 0 && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-orange-600" />
                    <h3 className="font-semibold text-gray-900">Recent Stock Entries</h3>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {product.stockIn.slice(0, 5).map((stock, index) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {stock.quantity} units
                            </p>
                            <p className="text-sm text-gray-600">
                              {stock.supplier || 'Unknown Supplier'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(stock.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              ${(stock.totalPrice || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              ${(stock.price || 0).toFixed(2)}/unit
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {product.stockIn.length > 5 && (
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      And {product.stockIn.length - 5} more entries...
                    </p>
                  )}
                </div>
              )}

              {/* Timeline Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Timeline</h3>
                </div>
                <div className="space-y-3">
                  {product.createdAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-900">{formatDate(product.createdAt)}</span>
                      </div>
                    </div>
                  )}
                  {product.updatedAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-900">{formatDate(product.updatedAt)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Details */}
              {product.category && (
                <div className="bg-primary-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-5 h-5 text-primary-600" />
                    <h3 className="font-semibold text-gray-900">Category Details</h3>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                      <p className="text-gray-900 font-medium">{product.category.name}</p>
                    </div>
                    {product.category.description && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <p className="text-gray-600 text-sm">{product.category.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewProductModal;