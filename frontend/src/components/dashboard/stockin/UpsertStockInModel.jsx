import { useEffect, useState } from "react";

const UpsertStockInModal = ({ isOpen, onClose, onSubmit, stockIn, products, isLoading, title }) => {
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    price: '',
    supplier: '',
    sellingPrice: ''
  });

  // State for multiple purchases (only used when creating)
  const [purchases, setPurchases] = useState([{
    productId: '',
    quantity: '',
    price: '',
    supplier: '',
    sellingPrice: ''
  }]);

  const isEditing = !!stockIn;

  useEffect(() => {
    if (stockIn) {
      // Editing mode - use single form data
      setFormData({
        productId: stockIn.productId || '',
        quantity: stockIn.quantity || '',
        price: stockIn.price || '',
        supplier: stockIn.supplier || '',
        sellingPrice: stockIn.sellingPrice || '',
      });
    } else {
      // Creating mode - reset both single form and purchases array
      setFormData({ productId: '', quantity: '', price: '', supplier: '', sellingPrice: '' });
      setPurchases([{ productId: '', quantity: '', price: '', supplier: '', sellingPrice: '' }]);
    }
  }, [stockIn]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isEditing) {
      // Edit mode - submit single item
      onSubmit({
        ...formData,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        sellingPrice: Number(formData.sellingPrice)
      });
    } else {
      // Create mode - submit multiple purchases
      const formattedPurchases = purchases.map(purchase => ({
        ...purchase,
        quantity: Number(purchase.quantity),
        price: Number(purchase.price),
        sellingPrice: Number(purchase.sellingPrice)
      }));
      onSubmit({ purchases: formattedPurchases });
    }

    // Reset forms
    setFormData({ productId: '', quantity: '', price: '', supplier: '', sellingPrice: '' });
    setPurchases([{ productId: '', quantity: '', price: '', supplier: '', sellingPrice: '' }]);
  };

  const addPurchase = () => {
    setPurchases([...purchases, { productId: '', quantity: '', price: '', supplier: '', sellingPrice: '' }]);
  };

  const removePurchase = (index) => {
    if (purchases.length > 1) {
      setPurchases(purchases.filter((_, i) => i !== index));
    }
  };

  const updatePurchase = (index, field, value) => {
    const updatedPurchases = purchases.map((purchase, i) => 
      i === index ? { ...purchase, [field]: value } : purchase
    );
    setPurchases(updatedPurchases);
  };

  const renderSingleForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
        <select
          value={formData.productId}
          onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Select a product</option>
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.productName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
        <input
          type="number"
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
          required
          min="1"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit</label>
        <input
          type="number"
          step="0.01"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          required
          min="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
        <input
          type="number"
          step="0.01"
          value={formData.sellingPrice}
          onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
          required
          min="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier (Optional)</label>
        <input
          type="text"
          value={formData.supplier}
          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      </div>
    </div>
  );

  const renderMultipleForm = () => (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Stock Purchases
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {purchases.length} purchase{purchases.length !== 1 ? 's' : ''} • 
              Total items: {purchases.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0)}
            </p>
          </div>
          <button
            type="button"
            onClick={addPurchase}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 shadow-sm transition-all duration-200 transform hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Purchase
          </button>
        </div>
      </div>
      
      {/* Purchases List */}
      <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
        {purchases.map((purchase, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 relative group">
            {/* Remove Button */}
            {purchases.length > 1 && (
              <button
                type="button"
                onClick={() => removePurchase(index)}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-full hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            {/* Purchase Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">{index + 1}</span>
              </div>
              <h4 className="font-semibold text-gray-800">Purchase Item {index + 1}</h4>
              {purchase.productId && (
                <span className="ml-auto px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  {products.find(p => p.id === purchase.productId)?.productName || 'Selected'}
                </span>
              )}
            </div>
            
            {/* Form Fields */}
            <div className="grid grid-cols-1 gap-4">
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Product
                </label>
                <select
                  value={purchase.productId}
                  onChange={(e) => updatePurchase(index, 'productId', e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 hover:bg-white"
                >
                  <option value="">Choose a product...</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.productName}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Quantity and Price Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={purchase.quantity}
                    onChange={(e) => updatePurchase(index, 'quantity', e.target.value)}
                    required
                    min="1"
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 hover:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Cost Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchase.price}
                    onChange={(e) => updatePurchase(index, 'price', e.target.value)}
                    required
                    min="0"
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 hover:bg-white"
                  />
                </div>
              </div>
              
              {/* Selling Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Selling Price
                  {purchase.price && purchase.sellingPrice && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      Number(purchase.sellingPrice) > Number(purchase.price) 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {((Number(purchase.sellingPrice) - Number(purchase.price)) / Number(purchase.price) * 100).toFixed(1)}% margin
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={purchase.sellingPrice}
                  onChange={(e) => updatePurchase(index, 'sellingPrice', e.target.value)}
                  required
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 hover:bg-white"
                />
              </div>
              
              {/* Supplier */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Supplier
                  <span className="text-xs text-gray-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={purchase.supplier}
                  onChange={(e) => updatePurchase(index, 'supplier', e.target.value)}
                  placeholder="Enter supplier name..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 hover:bg-white"
                />
              </div>
              
              {/* Purchase Summary */}
              {purchase.quantity && purchase.price && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border-l-4 border-blue-500">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700">Total Cost:</span>
                    <span className="font-bold text-blue-600">
                      ${(Number(purchase.quantity) * Number(purchase.price)).toFixed(2)}
                    </span>
                  </div>
                  {purchase.sellingPrice && (
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="font-medium text-gray-700">Potential Revenue:</span>
                      <span className="font-bold text-green-600">
                        ${(Number(purchase.quantity) * Number(purchase.sellingPrice)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl p-0 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            {title}
          </h2>
          {!isEditing && (
            <p className="text-sm text-gray-600 mt-2">Create multiple stock purchases in one go</p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isEditing ? renderSingleForm() : renderMultipleForm()}
          </div>
          
          <div className="flex gap-4 pt-4 px-6 pb-6 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-white hover:border-gray-400 transition-all duration-200 font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  {isEditing ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Update Purchase
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create All Purchases ({purchases.length})
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpsertStockInModal;