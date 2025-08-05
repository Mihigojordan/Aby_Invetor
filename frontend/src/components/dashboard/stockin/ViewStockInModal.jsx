import React from 'react';
import { X, Package, Hash, DollarSign, User, Calendar, Barcode, Tag, Building2, FileText, Clock } from 'lucide-react';
import { API_URL } from '../../../api/api';
import productService from '../../../services/productService';

const ViewStockInModal = ({ isOpen, onClose, stockIn }) => {
  if (!isOpen || !stockIn) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF'
    }).format(price || 0);
  };

  const truncateId = (id) => {
    return id ? `${id.substring(0, 8)}-${id.substring(8, 12)}-${id.substring(12, 16)}-${id.substring(16, 20)}-${id.substring(20)}` : 'N/A';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Stock Entry Details</h2>
              <p className="text-blue-600 font-medium">
                {stockIn.product?.productName || 'Unknown Product'}
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
          <div className="grid grid-cols-1  lg:grid-cols-2  gap-8">
            {/* Left Column - Basic Information */}
            <div className="space-y-6">
             

              {/* Product Information */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Product Information</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                    <p className="text-gray-900 font-medium">
                      {stockIn.product?.productName || 'N/A'}
                    </p>
                  </div>
                  {stockIn.product?.brand && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                      <p className="text-gray-900">{stockIn.product.brand}</p>
                    </div>
                  )}
                  {stockIn.product?.category?.name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <p className="text-gray-900">{stockIn.product.category.name}</p>
                    </div>
                  )}
                  {stockIn.product?.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <div className="text-gray-600 text-sm line-clamp-1" 
                      dangerouslySetInnerHTML={{__html : productService.parseDescription(stockIn.product.description)}} />
                    
                     
                    </div>
                  )}
                </div>
              </div>

              {/* Quantity & Pricing */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Quantity & Pricing</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-500" />
                      <span className="text-2xl font-bold text-gray-900">
                        {stockIn.quantity || 0}
                      </span>
                      <span className="text-sm text-gray-500">units</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                    <p className="text-xl font-semibold text-gray-900">
                      {formatPrice(stockIn.price)}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Price</label>
                    <p className="text-3xl font-bold text-green-600">
                      {formatPrice(stockIn.totalPrice)}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                    <p className="text-3xl font-bold text-green-600">
                      {formatPrice(stockIn.sellingPrice)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Additional Information */}
            <div className="space-y-6">
              {/* Barcode & SKU */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Barcode className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Barcode & SKU</h3>
                </div>
                <div className="space-y-4">
                 
                  {stockIn.barcodeUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Barcode</label>
                      <div className="bg-white p-4 rounded border flex justify-center">
                        <img 
                          src={`${API_URL}${stockIn.barcodeUrl}`} 
                          alt="Barcode" 
                          className="max-h-16 object-contain"
                        />
                      </div>
                    </div>
                  )}
                  {!stockIn.sku && !stockIn.barcodeUrl && (
                    <p className="text-gray-500 italic">No barcode or SKU information available</p>
                  )}
                </div>
              </div>

              {/* Supplier Information */}
              {stockIn.supplier && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-5 h-5 text-orange-600" />
                    <h3 className="font-semibold text-gray-900">Supplier Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                    <p className="text-gray-900 font-medium">{stockIn.supplier}</p>
                  </div>
                </div>
              )}

              {/* Timeline Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Timeline</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-900">{formatDate(stockIn.createdAt)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-900">{formatDate(stockIn.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Images */}
              {stockIn.product?.imageUrls && (
                <div className="bg-blue-50 row-span-2 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Product Images</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.isArray(stockIn.product.imageUrls) 
                      ? stockIn.product.imageUrls.slice(0, 4).map((url, index) => (
                          <img 
                            key={index}
                            src={`${API_URL}${url}`} 
                            alt={`Product ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                        ))
                      : <p className="text-gray-500 italic col-span-2">No images available</p>
                    }
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

export default ViewStockInModal;