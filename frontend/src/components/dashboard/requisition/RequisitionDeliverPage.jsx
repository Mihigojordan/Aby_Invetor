import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Package, CheckCircle, AlertCircle, Truck, User,
  Calendar, FileText, Loader2, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import requisitionService from '../../../services/requisitionService';

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


const DeliveryHistorySection = ({ deliveries }) => {
  const [expanded, setExpanded] = useState(false);

  if (!deliveries || deliveries.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No previous deliveries
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {deliveries.length} Previous Deliver{deliveries.length !== 1 ? 'ies' : 'y'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {deliveries.map((delivery, idx) => (
            <div key={delivery.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">
                    {delivery.qtyDelivered} units delivered
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    By {delivery.createdBy?.name || 'Unknown'} • {new Date(delivery.createdAt).toLocaleDateString()}
                  </p>
                  {delivery.deliveryNote && (
                    <p className="text-sm text-gray-700 mt-2 italic">
                      "{delivery.deliveryNote}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RequisitionDeliverPage = ({role}) => {
  const{id:requisitionId} = useParams()
  const navigate = useNavigate();
  
  const [requisition, setRequisition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [deliveries, setDeliveries] = useState({});

  useEffect(() => {
    fetchRequisition();
  }, [requisitionId]);

  const fetchRequisition = async () => {
    setLoading(true);
    try {
      const data = await requisitionService.getRequisitionById(requisitionId);

      if (data.status !== 'APPROVED' && data.status !== 'PARTIALLY_FULFILLED') {
        setError('This requisition is not ready for delivery.');
        setLoading(false);
        return;
      }

      setRequisition(data);

      // Initialize deliveries for items that can still be delivered
      const initial = {};
      data.items.forEach(item => {
        const remaining = item.qtyApproved - item.qtyDelivered;
        if (remaining > 0) {
          initial[item.id] = {
            itemId: item.id,
            qtyDelivered: remaining,
            deliveryNote: '',
            selected: false
          };
        }
      });
      setDeliveries(initial);
    } catch (err) {
      setError(err.message || 'Failed to load requisition');
    } finally {
      setLoading(false);
    }
  };

  const updateDelivery = (itemId, field, value) => {
    setDeliveries(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value }
    }));
  };

  const toggleSelect = (itemId) => {
    setDeliveries(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId].selected }
    }));
  };

  const validateDeliveries = () => {
    const errors = [];
    const selected = Object.values(deliveries).filter(d => d.selected);

    if (selected.length === 0) {
      errors.push('Please select at least one item to deliver.');
      return errors;
    }

    selected.forEach(d => {
      const item = requisition.items.find(i => i.id === d.itemId);
      const remaining = item.qtyApproved - item.qtyDelivered;

      if (!d.qtyDelivered || d.qtyDelivered <= 0) {
        errors.push(`${item.itemName}: Quantity must be greater than 0`);
      }
      if (d.qtyDelivered > remaining) {
        errors.push(`${item.itemName}: Cannot deliver more than ${remaining} (remaining quantity)`);
      }
    });

    return errors;
  };

  const handleSubmit = async () => {
    setError('');
    const errors = validateDeliveries();
    if (errors.length > 0) {
      setError(errors.join(' • '));
      return;
    }

    setSubmitting(true);
    try {
      const deliveriesToSubmit = Object.values(deliveries)
        .filter(d => d.selected)
        .map(d => ({
          itemId: d.itemId,
          qtyDelivered: Number(d.qtyDelivered),
          ...(d.deliveryNote?.trim() && { deliveryNote: d.deliveryNote })
        }));

      await requisitionService.deliverItems(requisitionId, deliveriesToSubmit);

      setSuccess(true);
     navigate(`/${role}/dashboard/requisition`);
    } catch (err) {
      setError(err.message || 'Failed to record delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = Object.values(deliveries).filter(d => d.selected).length;
  const totalSelectedQty = Object.values(deliveries)
    .filter(d => d.selected)
    .reduce((sum, d) => sum + Number(d.qtyDelivered || 0), 0);

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
          <p className="text-xl font-semibold text-gray-900 mb-2">Error</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const deliverableItems = requisition.items.filter(
    item => item.qtyApproved > item.qtyDelivered
  );

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-50 py-8">
      <div className=" mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requisitions
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Deliver Items</h1>
              
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Current Status</p>
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                requisition.status === 'APPROVED' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {requisition.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Success */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-6 flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600 mr-4" />
            <div>
              <p className="text-lg font-semibold text-green-800">Delivery Recorded Successfully!</p>
              <p className="text-green-700">Redirecting back...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-6 flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Requisition Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Requisition Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Partner</p>
                <p className="font-medium text-gray-900">{requisition.partner?.name}</p>
                <p className="text-sm text-gray-600">{requisition.partner?.email}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-medium text-gray-900">
                  {new Date(requisition.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(requisition.createdAt).toLocaleTimeString()}
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

        {/* Delivery Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center py-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{deliverableItems.length}</p>
              <p className="text-sm text-blue-800 mt-1">Items to Deliver</p>
            </div>
            <div className="text-center py-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{selectedCount}</p>
              <p className="text-sm text-green-800 mt-1">Selected</p>
            </div>
            <div className="text-center py-4 bg-purple-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">{totalSelectedQty}</p>
              <p className="text-sm text-purple-800 mt-1">Total Units</p>
            </div>
            <div className="text-center py-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-gray-600">
                {requisition.items.filter(i => i.status === 'FULFILLED').length}
              </p>
              <p className="text-sm text-gray-800 mt-1">Completed</p>
            </div>
          </div>
        </div>

        {/* Items to Deliver */}
        {deliverableItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              All Items Delivered
            </h3>
            <p className="text-gray-600">
              This requisition has been fully fulfilled.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {deliverableItems.map((item) => {
              const delivery = deliveries[item.id] || {};
              const remaining = item.qtyApproved - item.qtyDelivered;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-lg shadow-sm border-2 p-6 transition-all ${
                    delivery.selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={delivery.selected || false}
                      onChange={() => toggleSelect(item.id)}
                      className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-4">
                          <Package className="w-6 h-6 text-gray-400" />
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                              {item.itemName}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Stock: {item.stockIn?.product?.name} 
                              {item.stockIn?.sku && ` (${item.stockIn.sku})`}
                            </p>
                            {item.note && (
                              <p className="text-sm text-gray-600 mt-2 italic">"{item.note}"</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-gray-600">Price</p>
                          <p className="text-xl font-bold text-gray-900">
                            {formatCurrency(item?.unitPriceAtApproval)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Approved</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {item.qtyApproved}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Delivered</p>
                          <p className="text-lg font-semibold text-green-600">
                            {item.qtyDelivered}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Remaining</p>
                          <p className="text-lg font-semibold text-orange-600">
                            {remaining}
                          </p>
                        </div>
                      </div>

                      {delivery.selected && (
                        <div className="mt-4 pt-4 border-t border-blue-200 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Quantity to Deliver
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={remaining}
                              value={delivery.qtyDelivered || ''}
                              onChange={(e) => updateDelivery(item.id, 'qtyDelivered', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-600 mt-1">
                              Max: {remaining} units
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Delivery Note (Optional)
                            </label>
                            <textarea
                              value={delivery.deliveryNote || ''}
                              onChange={(e) => updateDelivery(item.id, 'deliveryNote', e.target.value)}
                              rows="2"
                              placeholder="Add notes about this delivery..."
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      {item.deliveries && item.deliveries.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <DeliveryHistorySection deliveries={item.deliveries} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Already Fulfilled Items */}
        {requisition.items.filter(i => i.status === 'FULFILLED').length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Already Fulfilled Items
            </h2>
            <div className="space-y-3">
              {requisition.items
                .filter(i => i.status === 'FULFILLED')
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-green-50 border border-green-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-semibold text-gray-900">{item.itemName}</p>
                          <p className="text-sm text-gray-600">
                            {item.qtyApproved} units delivered
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-green-700">
                        Completed
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Submit Actions */}
        {deliverableItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky bottom-0">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-600">
                {selectedCount > 0 ? (
                  <span>
                    Selected <strong>{selectedCount}</strong> item(s) • 
                    <strong className="ml-1">{totalSelectedQty}</strong> total units
                  </span>
                ) : (
                  <span>No items selected</span>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => window.history.back()}
                disabled={submitting}
                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || selectedCount === 0}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3 font-medium"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Recording Delivery...
                  </>
                ) : (
                  <>
                    <Truck className="w-5 h-5" />
                    Record Delivery
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequisitionDeliverPage;