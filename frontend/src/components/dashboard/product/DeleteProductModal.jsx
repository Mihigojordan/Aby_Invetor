import { AlertTriangle, Package } from "lucide-react";
import productService from "../../../services/productService";

// Delete Product Modal Component
const DeleteModal = ({ isOpen, onClose, onConfirm, product, isLoading }) => {
  if (!isOpen || !product) return null;

  const parseDescription = (description) => {
    if (!description) return '';
    try {
      const parsed = typeof description === 'string' ? JSON.parse(description) : description;
      if (parsed.details) return parsed.details;
      if (typeof parsed === 'string') return parsed;
      return JSON.stringify(parsed);
    } catch {
      return description;
    }
  };

  const getFirstImage = (imageUrls) => {
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return null;
    }
    return productService.getFullImageUrl(imageUrls[0]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Delete Product</h2>
              <p className="text-gray-600">This action cannot be undone.</p>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-3">You are about to delete:</p>
            
            <div className="flex items-center gap-3 mb-3">
              {getFirstImage(product.imageUrls) ? (
                <img
                  src={getFirstImage(product.imageUrls)}
                  alt={product.productName}
                  className="w-16 h-16 object-cover rounded-lg border"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                  <Package size={24} />
                </div>
              )}
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {product.productName || 'Unnamed Product'}
                </div>
                <div className="text-sm text-gray-600">{product.brand || 'No brand'}</div>
                <div className="text-sm text-gray-500">{product.category?.name || 'No category'}</div>
              </div>
            </div>
            
            {product.description && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 line-clamp-2">
                  {parseDescription(product.description)}
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span>{product.imageUrls?.length || 0} image{(product.imageUrls?.length || 0) !== 1 ? 's' : ''}</span>
              {product.createdAt && (
                <span>Added {new Date(product.createdAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Deleting...' : 'Delete Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;