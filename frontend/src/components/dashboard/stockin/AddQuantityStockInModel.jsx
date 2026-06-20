import { useState, useEffect } from 'react';
import { PackagePlus } from 'lucide-react';

const AddQuantityStockInModal = ({ isOpen, onClose, onConfirm, stockIn, isLoading }) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setError('');
    }
  }, [isOpen, stockIn]);

  if (!isOpen || !stockIn) return null;

  const currentQuantity = stockIn.offlineQuantity ?? stockIn.quantity ?? 0;

  const handleConfirm = () => {
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      setError('Enter a quantity greater than 0');
      return;
    }
    if (!Number.isInteger(value)) {
      setError('Quantity must be a whole number');
      return;
    }
    setError('');
    onConfirm(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
            <PackagePlus size={18} className="text-primary-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Add Stock Quantity</h2>
        </div>
        <p className="text-gray-600 mt-3">
          {stockIn.product?.productName || 'Unknown Product'}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Current quantity: <span className="font-semibold text-gray-900">{currentQuantity}</span>
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quantity to add
        </label>
        <input
          type="number"
          min="1"
          step="1"
          autoFocus
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          placeholder="e.g. 10"
        />
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {isLoading ? 'Adding...' : 'Add Quantity'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddQuantityStockInModal;
