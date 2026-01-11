// components/dashboard/stockout/UpdatePaymentModal.jsx
import React, { useEffect, useState } from 'react';
import stockOutService from '../../../services/stockoutService'; // Adjust path as needed
import { X, Loader2, AlertTriangle, Check } from 'lucide-react';

const UpdatePaymentModal = ({ isOpen, onClose, stockOutId, currentDebtedAmount, onPaymentUpdated }) => {
  const [amountPaid, setAmountPaid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Validate that amount is valid and not exceeding remaining debt
  const isValidAmount = () => {
    const num = parseFloat(amountPaid);
    return !isNaN(num) && num > 0 && num <= currentDebtedAmount;
  };

  useEffect(()=>{
    if(isOpen){

        setAmountPaid('')
    }

  },[isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!isValidAmount()) {
      setError(
        parseFloat(amountPaid) > currentDebtedAmount
          ? `Amount cannot exceed remaining debt (RWF ${currentDebtedAmount.toLocaleString()})`
          : 'Please enter a valid positive amount'
      );
      return;
    }

    setLoading(true);

    try {
      const response = await stockOutService.updatePayment(stockOutId, parseFloat(amountPaid));
      
      setSuccess(true);
      // Optional: show success for 2 seconds then close
    
        onPaymentUpdated(response.data); // Callback to refresh parent data
        onClose()
    
    } catch (err) {
      console.error('Payment update failed:', err);
      setError(err.message || 'Failed to update payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Record Payment
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-6">
            <div className="text-sm text-gray-600 mb-1">Remaining Debt</div>
            <div className="text-2xl font-bold text-red-600">
              RWF {currentDebtedAmount.toLocaleString()}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount Paid (RWF)
              </label>
              <input
                type="number"
                id="amount"
                value={amountPaid}
                onChange={(e) => {
                  setAmountPaid(e.target.value);
                  setError(null);
                }}
                step="any"
                min="0"
                max={currentDebtedAmount}
                placeholder="Enter amount paid"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg font-medium"
                required
                disabled={loading}
              />
            </div>

            {/* Error / Success messages */}
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertTriangle size={18} />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                <Check size={18} />
                Payment updated successfully!
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !isValidAmount()}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Updating...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdatePaymentModal;