// src/pages/RequisitionPricingPage.jsx
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, DollarSign, CheckCircle, AlertCircle, Package, User,
  Calendar, FileText, Loader2, Edit2, X, Save, TrendingUp, TrendingDown
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import requisitionService from '../../../services/requisitionService';
import { format } from 'date-fns';

// Currency formatter - default to RWF (Rwandan Francs)
const formatCurrency = (amount, currency = 'RWF') => {
  if (amount === null || amount === undefined || isNaN(amount)) return 'RWF 0';

  const num = Number(amount);
  return new Intl.NumberFormat('rw-RW', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

const PriceEditModal = ({ isOpen, onClose, item, onSave }) => {
  const [newPrice, setNewPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && item) {
      const current = item.priceOverride !== null && item.priceOverride !== undefined
        ? Number(item.priceOverride)
        : Number(item.unitPriceAtApproval || 0);
      setNewPrice(current.toFixed(2));
      setError('');
    }
  }, [isOpen, item]);

  const handleSave = async () => {
    setError('');
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      setError('Please enter a valid price (≥ 0)');
      return;
    }

    setSaving(true);
    try {
      await onSave(item.id, price);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update price');
    } finally {
      setSaving(false);
    }
  };

  const calculateChange = () => {
    const originalPrice = Number(item?.unitPriceAtApproval || 0);
    const price = parseFloat(newPrice) || 0;
    const diff = price - originalPrice;
    const percentChange = originalPrice > 0 ? (diff / originalPrice) * 100 : 0;
    return { diff, percentChange };
  };

  if (!isOpen || !item) return null;

  const { diff, percentChange } = calculateChange();
  const originalPrice = Number(item?.unitPriceAtApproval || 0);
  const totalOriginal = originalPrice * item.qtyApproved;
  const totalNew = (parseFloat(newPrice) || 0) * item.qtyApproved;
  const totalDiff = totalNew - totalOriginal;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Override Price</h2>
              <p className="text-sm text-gray-600 mt-1">{item.itemName}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Original Price:</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(originalPrice)}
              </span>
            </div>
            {item.priceOverride !== null && item.priceOverride !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current Override:</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(item.priceOverride)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Approved Quantity:</span>
              <span className="font-semibold text-gray-900">
                {item.qtyApproved} units
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Unit Price
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                step="1"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                placeholder="0"
              />
            </div>
          </div>

          {newPrice && !isNaN(parseFloat(newPrice)) && (
            <div className="space-y-3">
              <div className={`p-4 rounded-lg border-2 ${
                diff > 0 ? 'bg-red-50 border-red-200' :
                diff < 0 ? 'bg-green-50 border-green-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Change per Unit</span>
                  <div className="flex items-center gap-2">
                    {diff !== 0 && (
                      diff > 0 ? <TrendingUp className="w-5 h-5 text-red-600" /> :
                      <TrendingDown className="w-5 h-5 text-green-600" />
                    )}
                    <span className={`text-lg font-bold ${
                      diff > 0 ? 'text-red-600' :
                      diff < 0 ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${
                    diff > 0 ? 'text-red-700' :
                    diff < 0 ? 'text-green-700' :
                    'text-gray-700'
                  }`}>
                    ({percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="text-xs text-gray-500">({item.qtyApproved} units)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(totalNew)}
                    </p>
                    <p className={`text-sm font-medium ${
                      totalDiff > 0 ? 'text-red-600' :
                      totalDiff < 0 ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {totalDiff > 0 ? '+' : ''}{formatCurrency(Math.abs(totalDiff))} from original
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !newPrice || isNaN(parseFloat(newPrice))}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Price
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const RequisitionPricingPage = () => {
  const { id: requisitionId } = useParams();
  const navigate = useNavigate();

  const [requisition, setRequisition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editModal, setEditModal] = useState({ isOpen: false, item: null });

  useEffect(() => {
    if (requisitionId) fetchRequisition();
  }, [requisitionId]);

  const fetchRequisition = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await requisitionService.getRequisitionById(requisitionId);

      if (!['APPROVED', 'PARTIALLY_FULFILLED', 'COMPLETED'].includes(data.status)) {
        setError('Price override is only available for approved requisitions.');
        setLoading(false);
        return;
      }

      setRequisition(data);
    } catch (err) {
      setError(err.message || 'Failed to load requisition');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (item) => {
    if (item.qtyDelivered > 0) {
      setError(`Cannot override price for "${item.itemName}" — delivery has already started (${item.qtyDelivered} delivered).`);
      setTimeout(() => setError(''), 6000);
      return;
    }

    setEditModal({ isOpen: true, item });
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, item: null });
  };

  const handleSavePrice = async (itemId, priceOverride) => {
    try {
      await requisitionService.overrideItemPrice(itemId, priceOverride);

      setRequisition(prev => ({
        ...prev,
        items: prev.items.map(i =>
          i.id === itemId
            ? { ...i, priceOverride, priceOverriddenAt: new Date().toISOString() }
            : i
        )
      }));

      setSuccess('Price override saved successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      throw err;
    }
  };

  const calculateTotals = () => {
    if (!requisition) return { original: 0, current: 0, savings: 0 };

    const relevantItems = requisition.items.filter(i =>
      ['APPROVED', 'PARTIALLY_FULFILLED'].includes(i.status)
    );

    const original = relevantItems.reduce((sum, item) => {
      return sum + (Number(item.unitPriceAtApproval || 0) * item.qtyApproved);
    }, 0);

    const current = relevantItems.reduce((sum, item) => {
      const price = item.priceOverride !== null && item.priceOverride !== undefined
        ? Number(item.priceOverride)
        : Number(item.unitPriceAtApproval || 0);
      return sum + (price * item.qtyApproved);
    }, 0);

    const savings = original - current;
    return { original, current, savings };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading requisition...</p>
        </div>
      </div>
    );
  }

  if (error && !requisition) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-900 mb-2">Cannot Access Pricing</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => navigate(-1)} className="text-blue-600 hover:text-blue-800 font-medium">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const approvedItems = requisition.items.filter(i =>
    ['APPROVED', 'PARTIALLY_FULFILLED'].includes(i.status)
  );

  const totals = calculateTotals();

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-50 py-8">
      <div className=" mx-auto px-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requisitions
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Price Management</h1>
             
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Status</p>
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                requisition.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                requisition.status === 'PARTIALLY_FULFILLED' ? 'bg-orange-100 text-orange-800' :
                'bg-green-100 text-green-800'
              }`}>
                {requisition.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
            <p className="text-green-800 font-medium">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Requisition Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Partner</p>
                <p className="font-medium text-gray-900">{requisition.partner?.name || 'Unknown'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(requisition.createdAt), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Partner Note</p>
                <p className="font-medium text-gray-900">
                  {requisition.partnerNote || 'No note provided'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Original Total</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(totals.original)}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Current Total</p>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(totals.current)}</p>
            </div>
            <div className={`bg-white rounded-lg p-4 border-2 ${
              totals.savings > 0 ? 'border-green-500 bg-green-50' :
              totals.savings < 0 ? 'border-red-500 bg-red-50' :
              'border-gray-200'
            }`}>
              <p className="text-sm text-gray-600 mb-1">
                {totals.savings >= 0 ? 'Total Savings' : 'Total Increase'}
              </p>
              <p className={`text-3xl font-bold ${
                totals.savings > 0 ? 'text-green-600' :
                totals.savings < 0 ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {totals.savings >= 0 ? '' : '+'}{formatCurrency(Math.abs(totals.savings))}
              </p>
            </div>
          </div>
        </div>

        {approvedItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Items to Price</h3>
            <p className="text-gray-600">There are no approved items in this requisition.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Approved Items</h2>
            {approvedItems.map((item) => {
              const currentPrice = item.priceOverride !== null && item.priceOverride !== undefined
                ? Number(item.priceOverride)
                : Number(item.unitPriceAtApproval || 0);
              const originalPrice = Number(item.unitPriceAtApproval || 0);
              const hasOverride = item.priceOverride !== null && item.priceOverride !== undefined;
              const priceDiff = currentPrice - originalPrice;
              const percentChange = originalPrice > 0 ? (priceDiff / originalPrice) * 100 : 0;
              const canEdit = item.qtyDelivered === 0;
              const totalPrice = currentPrice * item.qtyApproved;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-lg shadow-sm border-2 p-6 transition-all ${
                    hasOverride ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      <Package className="w-6 h-6 text-gray-400 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{item.itemName}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Stock: {item.stockIn?.product?.name || 'N/A'}
                              {item.stockIn?.sku && ` (${item.stockIn.sku})`}
                            </p>
                            {item.note && (
                              <p className="text-sm text-gray-600 mt-2 italic">"{item.note}"</p>
                            )}
                          </div>
                          {!canEdit && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Delivery Started
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Quantity</p>
                            <p className="text-lg font-semibold text-gray-900">{item.qtyApproved}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Original Price</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(originalPrice)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">
                              {hasOverride ? 'Override Price' : 'Current Price'}
                            </p>
                            <p className={`text-lg font-semibold ${hasOverride ? 'text-blue-600' : 'text-gray-900'}`}>
                              {formatCurrency(currentPrice)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Total</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(totalPrice)}
                            </p>
                          </div>
                        </div>

                        {hasOverride && (
                          <div className={`p-3 rounded-lg border ${
                            priceDiff > 0 ? 'bg-red-50 border-red-200' :
                            priceDiff < 0 ? 'bg-green-50 border-green-200' :
                            'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {priceDiff !== 0 && (
                                  priceDiff > 0 ? <TrendingUp className="w-5 h-5 text-red-600" /> :
                                  <TrendingDown className="w-5 h-5 text-green-600" />
                                )}
                                <span className="text-sm font-medium text-gray-700">
                                  Price {priceDiff > 0 ? 'Increased' : priceDiff < 0 ? 'Decreased' : 'Unchanged'}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className={`text-lg font-bold ${
                                  priceDiff > 0 ? 'text-red-600' :
                                  priceDiff < 0 ? 'text-green-600' :
                                  'text-gray-600'
                                }`}>
                                  {priceDiff > 0 ? '+' : ''}{formatCurrency(priceDiff)}
                                </span>
                                <span className={`text-sm ml-2 ${
                                  priceDiff > 0 ? 'text-red-700' :
                                  priceDiff < 0 ? 'text-green-700' :
                                  'text-gray-700'
                                }`}>
                                  ({percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                            {item.priceOverriddenAt && (
                              <p className="text-xs text-gray-600 mt-2">
                                Last updated: {format(new Date(item.priceOverriddenAt), 'dd MMM yyyy, hh:mm a')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => openEditModal(item)}
                      disabled={!canEdit}
                      className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        canEdit
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Edit2 className="w-4 h-4" />
                      {hasOverride ? 'Edit Price' : 'Set Price'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <PriceEditModal
          isOpen={editModal.isOpen}
          onClose={closeEditModal}
          item={editModal.item}
          onSave={handleSavePrice}
        />
      </div>
    </div>
  );
};

export default RequisitionPricingPage;