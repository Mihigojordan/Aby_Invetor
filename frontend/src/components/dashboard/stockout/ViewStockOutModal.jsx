import React from 'react';
import { X, Package, Hash, DollarSign, User, Calendar, ShoppingCart, Phone, Mail, Receipt, Clock, TrendingUp, Barcode, CreditCard } from 'lucide-react';
import { API_URL } from '../../../api/api';
import productService from '../../../services/productService';
import stockOutService from '../../../services/stockoutService';

const ViewStockOutModal = ({ isOpen, onClose, stockOut }) => {
  if (!isOpen || !stockOut) return null;

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

  const calculateTotalRevenue = () => {
    return (stockOut.quantity || 0) * (stockOut.soldPrice || 0);
  };

  const calculateProfit = () => {
    if (!stockOut.stockin || !stockOut.quantity || !stockOut.soldPrice) return 0;
    const costPrice = stockOut.stockin.price || 0;
    const soldPrice = stockOut.soldPrice || 0;
    return (soldPrice - costPrice) * stockOut.quantity;
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    // Simple phone formatting - adjust based on your needs
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
              <ShoppingCart size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Stock Out Details</h2>
              <p className="text-green-600 font-medium">
                {stockOut.stockin?.product?.productName || 'Sale Transaction'}
              </p>
              {stockOut.sku && (
                <p className="text-sm text-gray-600">SKU: {stockOut.sku}</p>
              )}
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
            {/* Left Column - Sale Information */}
            <div className="space-y-6">


              {/* Sale Summary */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Sale Summary</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {stockOut.quantity && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Sold</label>
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <span className="text-2xl font-bold text-gray-900">
                          {stockOut.quantity}
                        </span>
                        <span className="text-sm text-gray-500">units</span>
                      </div>
                    </div>
                  )}
                  {stockOut.soldPrice && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit</label>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatPrice(stockOut.soldPrice)}
                      </p>
                    </div>
                  )}
                  {stockOut.quantity && stockOut.soldPrice && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Revenue</label>
                      <p className="text-3xl font-bold text-green-600">
                        {formatPrice(calculateTotalRevenue())}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Profit Analysis */}
              {stockOut.stockin && stockOut.quantity && stockOut.soldPrice && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Profit Analysis</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                      <p className="text-lg font-medium text-gray-900">
                        {formatPrice(stockOut.stockin.price)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sold Price</label>
                      <p className="text-lg font-medium text-gray-900">
                        {formatPrice(stockOut.soldPrice)}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Profit</label>
                      <p className={`text-2xl font-bold ${calculateProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPrice(calculateProfit())}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Profit per unit: {formatPrice((stockOut.soldPrice || 0) - (stockOut.stockin?.price || 0))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Related Stock-In Information */}
              {stockOut.stockin && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">Related Stock Entry</h3>
                  </div>
                  <div className="space-y-3">

                    {stockOut.stockin.product && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                        <p className="text-gray-900 font-medium">
                          {stockOut.stockin.product.productName}
                        </p>
                        {stockOut.stockin.product.brand && (
                          <p className="text-sm text-gray-600">Brand: {stockOut.stockin.product.brand}</p>
                        )}
                      </div>
                    )}
                    {stockOut.stockin.supplier && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Original Supplier</label>
                        <p className="text-gray-900">{stockOut.stockin.supplier}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Client & Additional Information */}
            <div className="space-y-6">
              {/* Barcode & SKU */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Barcode className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Barcode </h3>
                </div>
                <div className="space-y-4">

                  {stockOut.transactionId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Barcode</label>
                      <div className="bg-white p-4 rounded border flex justify-center">
                        <img
                          src={`${stockOutService.getBarCodeUrlImage(stockOut.transactionId)}`}
                          alt="Barcode"
                          className="max-h-16 object-contain"
                        />
                      </div>
                    </div>
                  )}
                  {!stockOut.transactionId && (
                    <p className="text-gray-500 italic">No barcode  information available</p>
                  )}
                </div>
              </div>
              {/* Client Information */}
              {(stockOut.clientName || stockOut.clientEmail || stockOut.clientPhone) && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-5 h-5 text-orange-600" />
                    <h3 className="font-semibold text-gray-900">Client Information</h3>
                  </div>
                  <div className="space-y-4">
                    {stockOut.clientName && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                        <p className="text-gray-900 font-medium">{stockOut.clientName}</p>
                      </div>
                    )}
                    {stockOut.clientEmail && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <a
                            href={`mailto:${stockOut.clientEmail}`}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {stockOut.clientEmail}
                          </a>
                        </div>
                      </div>
                    )}
                    {stockOut.clientPhone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <a
                            href={`tel:${stockOut.clientPhone}`}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {formatPhoneNumber(stockOut.clientPhone)}
                          </a>
                        </div>
                      </div>
                    )}
                    {stockOut.paymentMethod && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-500" />
                            {formatPhoneNumber(stockOut.paymentMethod)}
                        </div>
                      </div>
                    )}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-900">{formatDate(stockOut.createdAt)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-900">{formatDate(stockOut.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>


              {/* Empty State for No Additional Info */}
              {!stockOut.clientName && !stockOut.clientEmail && !stockOut.clientPhone &&
                !stockOut.stockin?.product?.imageUrls && !stockOut.stockin?.product?.description && (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <div className="text-gray-400 mb-2">
                      <Package size={48} className="mx-auto" />
                    </div>
                    <p className="text-gray-500">No additional information available</p>
                  </div>
                )}
            </div>
              {/* Product Images */}
              {stockOut.stockin?.product?.imageUrls && (
                <div className="bg-blue-50  col-span-2 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Product Images</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.isArray(stockOut.stockin.product.imageUrls)
                      ? stockOut.stockin.product.imageUrls.slice(0, 4).map((url, index) => (
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

              {/* Product Description */}
              {stockOut.stockin?.product?.description && (
                <div className="bg-blue-50  md:col-span-2 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Product Description</h3>
                  </div>
                  <div className="text-gray-600 text-sm"
                    dangerouslySetInnerHTML={{ __html: productService.parseDescription(stockOut.stockin.product.description) }}
                  />
                </div>
              )}
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

export default ViewStockOutModal;