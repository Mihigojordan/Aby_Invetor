// src/pages/RequisitionPricingPage.jsx
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, DollarSign, CheckCircle, AlertCircle, Package, User,
  Calendar, FileText, Loader2, Edit2, X, Save, TrendingUp, TrendingDown
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import requisitionService from '../../../services/requisitionService';
import { format } from 'date-fns';

// RWF Currency Formatter
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'RWF 0';
  }
  const num = Number(amount);
  return new Intl.NumberFormat('rw-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const PriceEditModal = ({ isOpen, onClose, item, currentPrice, onPriceChange }) => {
  const [newPrice, setNewPrice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && item) {
      setNewPrice(currentPrice.toString());
      setError('');
    }
  }, [isOpen, item, currentPrice]);

  const handleSave = () => {
    setError('');
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      setError('Please enter a valid price (≥ 0)');
      return;
    }
    onPriceChange(item.id, price);
    onClose();
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
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Set Final Price</h2>
              <p className="text-sm text-gray-600 mt-1">{item.itemName}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Original Price:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(originalPrice)}</span>
            </div>
            {item.priceOverride !== null && item.priceOverride !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current Override:</span>
                <span className="font-semibold text-blue-600">{formatCurrency(item.priceOverride)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Approved Quantity:</span>
              <span className="font-semibold text-gray-900">{item.qtyApproved} units</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-700">Original Total:</span>
              <span className="text-gray-900">{formatCurrency(totalOriginal)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Unit Price (Override)
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
            <div className="space-y-4">
              <div className={`p-5 rounded-lg border-2 ${
                diff > 0 ? 'bg-red-50 border-red-200' :
                diff < 0 ? 'bg-green-50 border-green-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Change per Unit</span>
                  <div className="flex items-center gap-2">
                    {diff !== 0 && (
                      diff > 0 ? <TrendingUp className="w-5 h-5 text-red-600" /> :
                      <TrendingDown className="w-5 h-5 text-green-600" />
                    )}
                    <span className={`text-xl font-bold ${
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

              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-medium text-blue-900">New Total Value</p>
                    <p className="text-sm text-blue-700">({item.qtyApproved} units)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-900">
                      {formatCurrency(totalNew)}
                    </p>
                    <p className={`text-sm font-medium mt-2 ${
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-3 font-medium shadow-md"
          >
            <Save className="w-5 h-5" />
            Apply Price
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Track pending edits before saving
  const [editedPrices, setEditedPrices] = useState({});
  const [editModal, setEditModal] = useState({ isOpen: false, item: null });

  useEffect(() => {
    if (requisitionId) fetchRequisition();
  }, [requisitionId]);

  const fetchRequisition = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await requisitionService.getRequisitionById(requisitionId);

      if (!['PENDING', 'APPROVED', 'REVIEWED'].includes(data.status)) {
        setError('Price override is only available for pending, reviewed, or approved requisitions.');
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
      setError(`Cannot override price for "${item.itemName}" — delivery has already started.`);
      setTimeout(() => setError(''), 6000);
      return;
    }
    if (item.qtyApproved <= 0) {
      setError(`"${item.itemName}" has no approved quantity.`);
      setTimeout(() => setError(''), 6000);
      return;
    }

    // Current price = pending edit > saved override > original
    const currentPrice = editedPrices[item.id] ??
      (item.priceOverride !== null && item.priceOverride !== undefined
        ? Number(item.priceOverride)
        : Number(item.unitPriceAtApproval || 0));

    setEditModal({ isOpen: true, item: { ...item, currentPrice } });
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, item: null });
  };

  const handlePriceChange = (itemId, price) => {
    setEditedPrices(prev => ({
      ...prev,
      [itemId]: price
    }));
  };

  const handleSaveAll = async () => {
    if (Object.keys(editedPrices).length === 0) {
      setError('No prices have been changed.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const items = Object.entries(editedPrices).map(([id, overriddenPrice]) => ({
        id,
        overriddenPrice
      }));

      const updatedRequisition = await requisitionService.overridePricesAndApproveRequisition(
        requisitionId,
        items
      );

      setRequisition(updatedRequisition);
      setEditedPrices({});
      setSuccess('Prices overridden and requisition approved successfully!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to save prices and approve requisition');
    } finally {
      setSaving(false);
    }
  };

  const calculateTotals = () => {
    if (!requisition) return { original: 0, current: 0, savings: 0 };

    const relevantItems = requisition.items.filter(i => i.qtyApproved > 0);

    const original = relevantItems.reduce((sum, item) => {
      return sum + (Number(item.unitPriceAtApproval || 0) * item.qtyApproved);
    }, 0);

    const current = relevantItems.reduce((sum, item) => {
      const price = editedPrices[item.id] ??
        (item.priceOverride !== null && item.priceOverride !== undefined
          ? Number(item.priceOverride)
          : Number(item.unitPriceAtApproval || 0));
      return sum + (Number(price) * item.qtyApproved);
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

  const eligibleItems = requisition.items.filter(item =>
    item.qtyApproved > 0 && item.qtyDelivered === 0
  );

  const totals = calculateTotals();
  const hasChanges = Object.keys(editedPrices).length > 0;

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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Price Override & Approval</h1>
              <p className="text-xl text-gray-600 mt-2">{requisition.requisitionNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Current Status</p>
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                requisition.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                requisition.status === 'REVIEWED' ? 'bg-purple-100 text-purple-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {requisition.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Partner</p>
                <p className="font-medium text-gray-900">{requisition.partner?.firstname} {requisition.partner?.lastname}</p>
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

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-6 flex items-center shadow-sm">
            <CheckCircle className="w-8 h-8 text-green-600 mr-4" />
            <p className="text-lg font-medium text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-6 flex items-start shadow-sm">
            <AlertCircle className="w-8 h-8 text-red-600 mr-4 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Pricing Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Original Total</p>
              <p className="text-4xl font-bold text-gray-900">{formatCurrency(totals.original)}</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Current Total {hasChanges && '(with changes)'}</p>
              <p className="text-4xl font-bold text-blue-600">{formatCurrency(totals.current)}</p>
            </div>
            <div className={`bg-white rounded-xl p-6 border-2 ${
              totals.savings > 0 ? 'border-green-500 bg-green-50' :
              totals.savings < 0 ? 'border-red-500 bg-red-50' :
              'border-gray-200'
            }`}>
              <p className="text-sm text-gray-600 mb-2">
                {totals.savings >= 0 ? 'Total Savings' : 'Total Increase'}
              </p>
              <p className={`text-4xl font-bold ${
                totals.savings > 0 ? 'text-green-600' :
                totals.savings < 0 ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {totals.savings >= 0 ? '' : '+'}{formatCurrency(Math.abs(totals.savings))}
              </p>
            </div>
          </div>
        </div>

        {eligibleItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
            <Package className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Items Eligible for Pricing</h3>
            <p className="text-gray-600">All items are either not approved or delivery has started.</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Set Final Prices</h2>
              <div className="space-y-6">
                {eligibleItems.map((item) => {
                  // Current price priority: pending edit > saved override > original
                  const currentPrice = editedPrices[item.id] ??
                    (item.priceOverride !== null && item.priceOverride !== undefined
                      ? Number(item.priceOverride)
                      : Number(item.unitPriceAtApproval || 0));

                  const originalPrice = Number(item.unitPriceAtApproval || 0);
                  const hasSavedOverride = item.priceOverride !== null && item.priceOverride !== undefined;
                  const hasPendingEdit = editedPrices.hasOwnProperty(item.id);
                  const isModified = hasPendingEdit || hasSavedOverride;

                  const totalPrice = currentPrice * item.qtyApproved;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-xl shadow-sm border-2 p-8 transition-all ${
                        isModified ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex gap-5 flex-1">
                          <Package className="w-8 h-8 text-gray-400 mt-1" />
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900">{item.itemName}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {item.stockIn?.product?.productName || 'Unknown Product'}
                              {item.stockIn?.sku && ` • SKU: ${item.stockIn.sku}`}
                            </p>
                            {item.note && (
                              <p className="text-sm text-gray-600 mt-3 italic">"{item.note}"</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => openEditModal(item)}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-3 font-medium shadow-md"
                        >
                          <Edit2 className="w-5 h-5" />
                          {isModified ? 'Edit Price' : 'Set Price'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Approved Quantity</p>
                          <p className="text-2xl font-bold text-gray-900">{item.qtyApproved}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Original Unit Price</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(originalPrice)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">
                            {isModified ? 'Final Unit Price' : 'Current Unit Price'}
                          </p>
                          <p className={`text-2xl font-bold ${isModified ? 'text-blue-600' : 'text-gray-900'}`}>
                            {formatCurrency(currentPrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Total Value</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPrice)}</p>
                        </div>
                      </div>

                      {isModified && (
                        <div className="mt-6 p-5 bg-blue-100 border border-blue-300 rounded-lg">
                          <p className="text-sm font-medium text-blue-900">
                            {hasPendingEdit
                              ? '✓ Price modified — will be saved when you click "Save All"'
                              : '✓ Price has been overridden'}
                          </p>
                          {item.priceOverriddenAt && (
                            <p className="text-xs text-blue-700 mt-1">
                              Last updated: {format(new Date(item.priceOverriddenAt), 'dd MMM yyyy, hh:mm a')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {hasChanges ? `${Object.keys(editedPrices).length} price(s) changed` : 'No changes made'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Saving will override prices and approve the requisition
                  </p>
                </div>
                <button
                  onClick={handleSaveAll}
                  disabled={!hasChanges || saving}
                  className="px-10 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-4 font-semibold text-lg shadow-lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Saving & Approving...
                    </>
                  ) : (
                    <>
                      <Save className="w-6 h-6" />
                      Save All Prices & Approve Requisition
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        <PriceEditModal
          isOpen={editModal.isOpen}
          onClose={closeEditModal}
          item={editModal.item}
          currentPrice={editModal.item?.currentPrice || 0}
          onPriceChange={handlePriceChange}
        />
      </div>
    </div>
  );
};

export default RequisitionPricingPage;