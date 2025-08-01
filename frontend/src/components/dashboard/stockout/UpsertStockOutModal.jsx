import { useEffect, useState } from "react";

// Modal Component for StockOut
const UpsertStockOutModal = ({ isOpen, onClose, onSubmit, stockOut, stockIns, isLoading, title }) => {
  const [formData, setFormData] = useState({
    stockinId: '',
    quantity: '',
    clientName: '',
    clientEmail: '',
    clientPhone: ''
  });

  useEffect(() => {
    if (stockOut) {
      setFormData({
        stockinId: stockOut.stockinId || '',
        quantity: stockOut.quantity || '',
        clientName: stockOut.clientName || '',
        clientEmail: stockOut.clientEmail || '',
        clientPhone: stockOut.clientPhone || ''
      });
    } else {
      setFormData({ 
        stockinId: '', 
        quantity: '', 
        clientName: '', 
        clientEmail: '', 
        clientPhone: '' 
      });
    }
  }, [stockOut]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepare data, converting numbers and excluding empty strings
    const submitData = {};
    
    if (formData.stockinId) submitData.stockinId = formData.stockinId;
    if (formData.quantity) submitData.quantity = Number(formData.quantity);
    if (formData.soldPrice) submitData.soldPrice = Number(formData.soldPrice);
    if (formData.clientName.trim()) submitData.clientName = formData.clientName.trim();
    if (formData.clientEmail.trim()) submitData.clientEmail = formData.clientEmail.trim();
    if (formData.clientPhone.trim()) submitData.clientPhone = formData.clientPhone.trim();

    onSubmit(submitData);

    // Reset form after submission
    setFormData({ 
      stockinId: '', 
      quantity: '', 
      clientName: '', 
      clientEmail: '', 
      clientPhone: '' 
    });
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isFormValid = () => {
    // At least one field should be filled
    return formData.stockinId || 
           formData.quantity || 
           formData.soldPrice || 
           formData.clientName.trim() || 
           formData.clientEmail.trim() || 
           formData.clientPhone.trim();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Stock-In Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock-In Entry (Optional)
            </label>
            <select
              value={formData.stockinId}
              onChange={(e) => setFormData({ ...formData, stockinId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a stock-in entry</option>
              {stockIns?.map(stockIn => (
                <option key={stockIn.id} value={stockIn.id}>
                  {stockIn.product?.productName || 'Unknown Product'} - 
                  Quantity: #{stockIn.quantity} -
                  Price: ${stockIn.sellingPrice}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity Sold
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Enter quantity sold"
            />
          </div>

          {/* Sold Price */}
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sold Price per Unit (Optional)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.soldPrice}
              onChange={(e) => setFormData({ ...formData, soldPrice: e.target.value })}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Enter sold price per unit"
            />
          </div> */}

          {/* Client Information Section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Client Information</h3>
            
            {/* Client Name */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name (Optional)
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Enter client name"
              />
            </div>

            {/* Client Email */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Email (Optional)
              </label>
              <input
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                  formData.clientEmail && !validateEmail(formData.clientEmail) 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-300'
                }`}
                placeholder="Enter client email"
              />
              {formData.clientEmail && !validateEmail(formData.clientEmail) && (
                <p className="text-red-500 text-xs mt-1">Please enter a valid email address</p>
              )}
            </div>

            {/* Client Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Phone (Optional)
              </label>
              <input
                type="tel"
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Enter client phone number"
              />
            </div>
          </div>

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
              disabled={isLoading || !isFormValid() || (formData.clientEmail && !validateEmail(formData.clientEmail))}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Processing...' : stockOut ? 'Update' : 'Create'}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong>
            The SKU will be generated automatically.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpsertStockOutModal;