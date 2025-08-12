import { useEffect, useState } from "react";

const UpsertStockInModal = ({ isOpen, onClose, onSubmit, stockIn, products, isLoading, title }) => {
  const [formData, setFormData] = useState({
    // Single entry fields (for update mode)
    productId: '',
    quantity: '',
    price: '',
    supplier: '',
    sellingPrice: '',
    // Multiple entries fields (for create mode)
    purchases: []
  });

    const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF'
    }).format(amount);
  };

  const [validationErrors, setValidationErrors] = useState({
    productId: '',
    quantity: '',
    price: '',
    sellingPrice: '',
    purchases: []
  });

  const isUpdateMode = !!stockIn;

  useEffect(() => {
    if (stockIn) {
      // Update mode - single entry
      setFormData({
        productId: stockIn.productId || '',
        quantity: stockIn.quantity || '',
        price: stockIn.price || '',
        supplier: stockIn.supplier || '',
        sellingPrice: stockIn.sellingPrice || '',
        purchases: []
      });
    } else {
      // Create mode - multiple entries
      setFormData({
        productId: '',
        quantity: '',
        price: '',
        supplier: '',
        sellingPrice: '',
        purchases: [{ productId: '', quantity: '', price: '', supplier: '', sellingPrice: '' }]
      });
    }
    
    // Clear validation errors when modal opens/closes
    setValidationErrors({
      productId: '',
      quantity: '',
      price: '',
      sellingPrice: '',
      purchases: []
    });
  }, [stockIn, isOpen]);

  const validateProduct = (productId) => {
    if (!productId) {
      return 'Please select a product';
    }
    return '';
  };

  const validateQuantity = (quantity) => {
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
    
    return '';
  };

  const validatePrice = (price) => {
    if (!price) {
      return 'Price is required';
    }
    
    const numPrice = Number(price);
    
    if (isNaN(numPrice) || numPrice <= 0) {
      return 'Price must be a positive number';
    }
    
    return '';
  };

  const validateSellingPrice = (sellingPrice) => {
    if (!sellingPrice) {
      return 'Selling price is required';
    }
    
    const numPrice = Number(sellingPrice);
    
    if (isNaN(numPrice) || numPrice <= 0) {
      return 'Selling price must be a positive number';
    }
    
    return '';
  };

  // Single entry handlers (for update mode)
  const handleProductChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, productId: value });
    
    const productError = validateProduct(value);
    setValidationErrors(prev => ({ ...prev, productId: productError }));
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, quantity: value });
    
    const quantityError = validateQuantity(value);
    setValidationErrors(prev => ({ ...prev, quantity: quantityError }));
  };

  const handlePriceChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, price: value });
    
    const priceError = validatePrice(value);
    setValidationErrors(prev => ({ ...prev, price: priceError }));
  };

  const handleSellingPriceChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, sellingPrice: value });
    
    const sellingPriceError = validateSellingPrice(value);
    setValidationErrors(prev => ({ ...prev, sellingPrice: sellingPriceError }));
  };

  // Multiple entries handlers (for create mode)
  const addPurchase = () => {
    setFormData(prev => ({
      ...prev,
      purchases: [...prev.purchases, { productId: '', quantity: '', price: '', supplier: '', sellingPrice: '' }]
    }));
    
    setValidationErrors(prev => ({
      ...prev,
      purchases: [...prev.purchases, {}]
    }));
  };

  const removePurchase = (index) => {
    if (formData.purchases.length > 1) {
      setFormData(prev => ({
        ...prev,
        purchases: prev.purchases.filter((_, i) => i !== index)
      }));
      
      setValidationErrors(prev => ({
        ...prev,
        purchases: prev.purchases.filter((_, i) => i !== index)
      }));
    }
  };

  const handlePurchaseChange = (index, field, value) => {
    const updatedPurchases = [...formData.purchases];
    updatedPurchases[index] = { ...updatedPurchases[index], [field]: value };
    
    setFormData(prev => ({ ...prev, purchases: updatedPurchases }));
    
    // Validate the changed field
    let error = '';
    if (field === 'productId') {
      error = validateProduct(value);
    } else if (field === 'quantity') {
      error = validateQuantity(value);
    } else if (field === 'price') {
      error = validatePrice(value);
    } else if (field === 'sellingPrice') {
      error = validateSellingPrice(value);
    }
    
    const updatedErrors = [...validationErrors.purchases];
    updatedErrors[index] = { ...updatedErrors[index], [field]: error };
    setValidationErrors(prev => ({ ...prev, purchases: updatedErrors }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isUpdateMode) {
      // Single entry validation for update mode
      const productError = validateProduct(formData.productId);
      const quantityError = validateQuantity(formData.quantity);
      const priceError = validatePrice(formData.price);
      const sellingPriceError = validateSellingPrice(formData.sellingPrice);
      
      setValidationErrors({
        productId: productError,
        quantity: quantityError,
        price: priceError,
        sellingPrice: sellingPriceError,
        purchases: []
      });
      
      if (productError || quantityError || priceError || sellingPriceError) {
        return;
      }
      
      // Prepare single entry data
      const submitData = {
        productId: formData.productId,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        sellingPrice: Number(formData.sellingPrice)
      };
      
      if (formData.supplier.trim()) {
        submitData.supplier = formData.supplier.trim();
      }
      
      onSubmit(submitData);
    } else {
      // Multiple entries validation for create mode
      const purchaseErrors = formData.purchases.map(purchase => ({
        productId: validateProduct(purchase.productId),
        quantity: validateQuantity(purchase.quantity),
        price: validatePrice(purchase.price),
        sellingPrice: validateSellingPrice(purchase.sellingPrice)
      }));
      
      setValidationErrors({
        productId: '',
        quantity: '',
        price: '',
        sellingPrice: '',
        purchases: purchaseErrors
      });
      
      // Check if there are any validation errors
      const hasPurchaseErrors = purchaseErrors.some(error => 
        error.productId || error.quantity || error.price || error.sellingPrice
      );
      
      if (hasPurchaseErrors) {
        return;
      }
      
      // Check for duplicate products
      const productIds = formData.purchases.map(purchase => purchase.productId);
      const uniqueProductIds = new Set(productIds);
      if (productIds.length !== uniqueProductIds.size) {
        alert('Cannot select the same product multiple times');
        return;
      }
      
      // Prepare multiple entries data
      const purchasesArray = formData.purchases.map(purchase => ({
        productId: purchase.productId,
        quantity: Number(purchase.quantity),
        price: Number(purchase.price),
        sellingPrice: Number(purchase.sellingPrice),
        ...(purchase.supplier.trim() && { supplier: purchase.supplier.trim() })
      }));
      
      onSubmit({ purchases: purchasesArray });
    }
    
    onClose();
    
    // Reset form after submission
    setFormData({
      productId: '',
      quantity: '',
      price: '',
      supplier: '',
      sellingPrice: '',
      purchases: [{ productId: '', quantity: '', price: '', supplier: '', sellingPrice: '' }]
    });
    
    setValidationErrors({
      productId: '',
      quantity: '',
      price: '',
      sellingPrice: '',
      purchases: []
    });
  };

  const isFormValid = () => {
    if (isUpdateMode) {
      return formData.productId && 
             formData.quantity && 
             formData.price && 
             formData.sellingPrice &&
             !validationErrors.productId && 
             !validationErrors.quantity && 
             !validationErrors.price &&
             !validationErrors.sellingPrice;
    } else {
      const allPurchasesValid = formData.purchases.every(purchase => 
        purchase.productId && purchase.quantity && purchase.price && purchase.sellingPrice
      ) && validationErrors.purchases.every(error => 
        !error.productId && !error.quantity && !error.price && !error.sellingPrice
      );
      
      return allPurchasesValid;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {isUpdateMode ? (
            // Single entry form for update mode
            <>
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.productId}
                  onChange={handleProductChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                    validationErrors.productId
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Select a product</option>
                  {products?.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.productName}
                    </option>
                  ))}
                </select>
                {validationErrors.productId && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.productId}</p>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={handleQuantityChange}
                  min="1"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                    validationErrors.quantity
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Enter quantity"
                />
                {validationErrors.quantity && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.quantity}</p>
                )}
              </div>

              {/* Price per Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price per Unit <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={handlePriceChange}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                    validationErrors.price
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Enter price per unit"
                />
                {validationErrors.price && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.price}</p>
                )}
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.sellingPrice}
                  onChange={handleSellingPriceChange}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                    validationErrors.sellingPrice
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Enter selling price"
                />
                {validationErrors.sellingPrice && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.sellingPrice}</p>
                )}
                {formData.price && formData.sellingPrice && (
                  <p className={`text-xs mt-1 ${
                    Number(formData.sellingPrice) > Number(formData.price) 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    Profit margin: {((Number(formData.sellingPrice) - Number(formData.price)) / Number(formData.price) * 100).toFixed(1)}%
                  </p>
                )}
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter supplier name (optional)"
                />
              </div>
            </>
          ) : (
            // Multiple entries form for create mode
            <div className="min-h-[50vh] max-h-96 overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-800">Stock Purchases</h3>
              </div>

              {formData.purchases.map((purchase, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">Purchase #{index + 1}</h4>
                    {formData.purchases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePurchase(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                    {/* Product Selection */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={purchase.productId}
                        onChange={(e) => handlePurchaseChange(index, 'productId', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                          validationErrors.purchases[index]?.productId
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      >
                        <option value="">Select a product</option>
                        {products?.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.productName}
                          </option>
                        ))}
                      </select>
                      {validationErrors.purchases[index]?.productId && (
                        <p className="text-red-500 text-xs mt-1">
                          {validationErrors.purchases[index].productId}
                        </p>
                      )}
                    </div>

                        {/* Supplier */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Supplier
                          </label>
                          <input
                            type="text"
                            value={purchase.supplier}
                            onChange={(e) => handlePurchaseChange(index, 'supplier', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter supplier name (optional)"
                          />
                        </div>
                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={purchase.quantity}
                        onChange={(e) => handlePurchaseChange(index, 'quantity', e.target.value)}
                        min="1"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                          validationErrors.purchases[index]?.quantity
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="Enter quantity"
                      />
                      {validationErrors.purchases[index]?.quantity && (
                        <p className="text-red-500 text-xs mt-1">
                          {validationErrors.purchases[index].quantity}
                        </p>
                      )}
                    </div>

                    {/* Price per Unit */}
                    <div>
                      <label className="md:hidden text-sm font-medium text-gray-700 mb-1">
                        Price <span className="text-red-500">*</span>
                      </label>
                      <label className=" hidden md:block text-sm font-medium text-gray-700 mb-1">
                        Price per Unit <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={purchase.price}
                        onChange={(e) => handlePurchaseChange(index, 'price', e.target.value)}
                        min="0"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                          validationErrors.purchases[index]?.price
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="Enter price per unit"
                      />
                      {validationErrors.purchases[index]?.price && (
                        <p className="text-red-500 text-xs mt-1">
                          {validationErrors.purchases[index].price}
                        </p>
                      )}
                    </div>

                    {/* Selling Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Selling Price <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={purchase.sellingPrice}
                        onChange={(e) => handlePurchaseChange(index, 'sellingPrice', e.target.value)}
                        min="0"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                          validationErrors.purchases[index]?.sellingPrice
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="Enter selling price"
                      />
                      {validationErrors.purchases[index]?.sellingPrice && (
                        <p className="text-red-500 text-xs mt-1">
                          {validationErrors.purchases[index].sellingPrice}
                        </p>
                      )}
                      {purchase.price && purchase.sellingPrice && (
                        <p className={`text-xs mt-1 ${
                          Number(purchase.sellingPrice) > Number(purchase.price) 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          Profit margin: {((Number(purchase.sellingPrice) - Number(purchase.price)) / Number(purchase.price) * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>

                  </div>

                  {/* Purchase Summary */}
                  {purchase.quantity && purchase.price && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-gray-700">Total Cost:</span>
                        <span className="font-bold text-blue-600">
                          {formatCurrency((Number(purchase.quantity) * Number(purchase.price)).toFixed(2))}
                        </span>
                      </div>
                      {purchase.sellingPrice && (
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="font-medium text-gray-700">Potential Revenue:</span>
                          <span className="font-bold text-green-600">
                            {formatCurrency((Number(purchase.quantity) * Number(purchase.sellingPrice)).toFixed(2))}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

            
            </div>
          )}

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
              {isLoading ? 'Processing...' : stockIn ? 'Update' : `Create ${formData.purchases?.length || 1} Purchase${formData.purchases?.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Required fields:</strong> Product, Quantity, Price per Unit, and Selling Price are required for each purchase.
            <br />
            {!isUpdateMode && (
              <>
                <strong>Multiple purchases:</strong> You can add multiple products to create stock entries in one go.
                <br />
              </>
            )}
            <strong>Note:</strong> The profit margin is calculated automatically based on your cost and selling prices.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpsertStockInModal;