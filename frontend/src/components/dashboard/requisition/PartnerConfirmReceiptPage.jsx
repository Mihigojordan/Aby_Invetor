// src/pages/PartnerConfirmReceiptPage.jsx
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Package, CheckCircle, AlertCircle, Truck, Calendar,
  FileText, Loader2, Clock, User, Box, Tag
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import requisitionService from '../../../services/requisitionService';
import { usePartnerAuth } from '../../../context/PartnerAuthContext';

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

const DeliveryCard = ({ delivery, item, onConfirm, confirming }) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [note, setNote] = useState('');
  const [dialogError, setDialogError] = useState('');

  const handleConfirm = async () => {
    setDialogError('');
    try {
      await onConfirm(delivery.id, note.trim() || null);
      setShowConfirmDialog(false);
      setNote('');
    } catch (err) {
      setDialogError(err.message || 'Failed to confirm receipt');
    }
  };

  const isConfirmed = delivery.confirmedAt !== null;
  const currentPrice = Number(item.priceOverride ?? item.unitPriceAtApproval ?? 0);
  const deliveryTotal = currentPrice * delivery.qtyDelivered;

  return (
    <>
      <div className={`border-2 rounded-lg p-6 transition-all shadow-sm ${
        isConfirmed
          ? 'bg-green-50 border-green-300'
          : 'bg-white border-blue-300 hover:border-blue-500 hover:shadow-md'
      }`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-4 flex-1">
            <Truck className={`w-7 h-7 mt-1 ${isConfirmed ? 'text-green-600' : 'text-blue-600'}`} />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-gray-900">
                  Delivery #{delivery.id.slice(-8).toUpperCase()}
                </h3>
                {isConfirmed ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Confirmed
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <Clock className="w-4 h-4 mr-1" />
                    Awaiting Confirmation
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Delivered by: {delivery.createdBy?.firstname} {delivery.createdBy?.lastname}
              </p>
              <p className="text-sm text-gray-600">
                {new Date(delivery.createdAt).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Item & Delivery Info */}
        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 mb-5">
          <div className="flex gap-5">
            {item.stockIn?.product?.imageUrls?.[0] ? (
              <img
                src={item.stockIn.product.imageUrls[0]}
                alt={item.itemName}
                className="w-24 h-24 object-cover rounded-lg border border-gray-300"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-200 rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 mb-1">{item.itemName}</h4>
              <p className="text-sm text-gray-600 mb-3">
                {item.stockIn?.product?.productName || 'Unknown Product'}
                {item.stockIn?.product?.brand && ` • ${item.stockIn.product.brand}`}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-600">Quantity</p>
                    <p className="font-bold text-gray-900">{delivery.qtyDelivered} units</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-600">SKU</p>
                    <p className="font-bold text-gray-900">{item.stockIn?.sku || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600">Unit Price</p>
                  <p className="font-bold text-gray-900">{formatCurrency(currentPrice)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Delivery Value</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(deliveryTotal)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Note */}
        {delivery.deliveryNote && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-5">
            <p className="text-sm font-medium text-blue-900 mb-1">Delivery Note from Supplier:</p>
            <p className="text-sm text-blue-800 italic">"{delivery.deliveryNote}"</p>
          </div>
        )}

        {/* Confirmation Section */}
        {isConfirmed ? (
          <div className="bg-green-50 rounded-lg p-5 border border-green-300">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-7 h-7 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-green-900 mb-2">
                  Receipt Confirmed
                </p>
                <p className="text-sm text-green-800">
                  Confirmed on {new Date(delivery.confirmedAt).toLocaleString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
                {delivery.partnerNote && (
                  <div className="mt-3 p-4 bg-white rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Your Confirmation Note:</p>
                    <p className="text-sm text-gray-800 italic">"{delivery.partnerNote}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={confirming}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3 font-medium shadow-md"
            >
              <CheckCircle className="w-5 h-5" />
              Confirm Receipt
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Confirm Delivery Receipt</h2>
              <p className="text-gray-600 mt-2">
                Confirm that you have received the items in good condition
              </p>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">Delivery Summary</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Item:</strong> {item.itemName}</p>
                  <p><strong>Product:</strong> {item.stockIn?.product?.productName || 'N/A'}</p>
                  <p><strong>Quantity Delivered:</strong> {delivery.qtyDelivered} units</p>
                  <p><strong>Value:</strong> {formatCurrency(deliveryTotal)}</p>
                  <p><strong>Delivered on:</strong> {new Date(delivery.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Notes (Optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows="4"
                  placeholder="Add comments about condition, quality, packaging, or any issues..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  By confirming, you acknowledge receipt of the items as described.
                </p>
              </div>

              {dialogError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{dialogError}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setNote('');
                  setDialogError('');
                }}
                disabled={confirming}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3 font-medium shadow-md"
              >
                {confirming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Confirm Receipt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const PartnerConfirmReceiptPage = () => {
  const { id: requisitionId } = useParams();
  const navigate = useNavigate();
  const { partner } = usePartnerAuth();

  const [requisition, setRequisition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (requisitionId && partner) fetchRequisition();
  }, [requisitionId, partner]);

  const fetchRequisition = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await requisitionService.getRequisitionById(requisitionId);

      // Optional: verify ownership
      if (data.partnerId !== partner.id) {
        setError('You can only view your own requisitions.');
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

  const handleConfirmDelivery = async (deliveryId, partnerNote) => {
    setConfirming(true);
    setError('');
    try {
      await requisitionService.confirmDeliveryReceipt(deliveryId, partnerNote);

      // Update local state optimistically
      setRequisition(prev => ({
        ...prev,
        items: prev.items.map(item => ({
          ...item,
          deliveries: item.deliveries.map(d =>
            d.id === deliveryId
              ? {
                  ...d,
                  confirmedAt: new Date().toISOString(),
                  partnerNote: partnerNote || null
                }
              : d
          )
        }))
      }));

      setSuccess('Delivery confirmed successfully!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to confirm delivery');
      throw err; // re-throw to show in modal
    } finally {
      setConfirming(false);
    }
  };

  const getPendingDeliveries = () => {
    if (!requisition) return [];
    const deliveries = [];
    requisition.items.forEach(item => {
      item.deliveries.forEach(delivery => {
        if (!delivery.confirmedAt) {
          deliveries.push({ delivery, item });
        }
      });
    });
    return deliveries;
  };

  const getConfirmedDeliveries = () => {
    if (!requisition) return [];
    const deliveries = [];
    requisition.items.forEach(item => {
      item.deliveries.forEach(delivery => {
        if (delivery.confirmedAt) {
          deliveries.push({ delivery, item });
        }
      });
    });
    return deliveries.sort((a, b) => new Date(b.delivery.confirmedAt) - new Date(a.delivery.confirmedAt));
  };

  const pendingDeliveries = getPendingDeliveries();
  const confirmedDeliveries = getConfirmedDeliveries();
  const totalDeliveries = pendingDeliveries.length + confirmedDeliveries.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your deliveries...</p>
        </div>
      </div>
    );
  }

  if (error && !requisition) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-900 mb-2">Access Denied</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className=" mx-auto px-4">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requisitions
        </button>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Confirm Deliveries</h1>
             
              <p className="text-gray-600 mt-3">
                Please review and confirm receipt of delivered items
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-3 mb-2">
                <User className="w-6 h-6 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Partner</p>
                  <p className="text-lg font-medium text-gray-900">
                    {requisition.partner?.firstname} {requisition.partner?.lastname}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-5 flex items-center shadow-sm">
            <CheckCircle className="w-7 h-7 text-green-600 mr-4" />
            <p className="text-lg font-medium text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-5 flex items-start shadow-sm">
            <AlertCircle className="w-7 h-7 text-red-600 mr-4 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Deliveries</p>
                <p className="text-4xl font-bold text-gray-900">{totalDeliveries}</p>
              </div>
              <Truck className="w-10 h-10 text-gray-400" />
            </div>
          </div>
          <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Confirmation</p>
                <p className="text-4xl font-bold text-yellow-600">{pendingDeliveries.length}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
          </div>
          <div className="bg-green-50 rounded-xl shadow-sm border border-green-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Confirmed</p>
                <p className="text-4xl font-bold text-green-600">{confirmedDeliveries.length}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>
        </div>

        {/* Pending Deliveries */}
        {pendingDeliveries.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-7 h-7 text-yellow-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Pending Confirmation ({pendingDeliveries.length})
              </h2>
            </div>
            <div className="space-y-6">
              {pendingDeliveries.map(({ delivery, item }) => (
                <DeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  item={item}
                  onConfirm={handleConfirmDelivery}
                  confirming={confirming}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Confirmed */}
        {pendingDeliveries.length === 0 && totalDeliveries > 0 && (
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-12 text-center mb-10 shadow-lg">
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              All Deliveries Confirmed!
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Thank you! You have successfully confirmed receipt of all delivered items.
            </p>
          </div>
        )}

        {/* Confirmed Deliveries */}
        {confirmedDeliveries.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-7 h-7 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Confirmed Deliveries ({confirmedDeliveries.length})
              </h2>
            </div>
            <div className="space-y-6">
              {confirmedDeliveries.map(({ delivery, item }) => (
                <DeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  item={item}
                  onConfirm={handleConfirmDelivery}
                  confirming={confirming}
                />
              ))}
            </div>
          </div>
        )}

        {/* No Deliveries */}
        {totalDeliveries === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
            <Package className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              No Deliveries Yet
            </h2>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Items from this requisition have not been delivered yet. Check back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerConfirmReceiptPage;