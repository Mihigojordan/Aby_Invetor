// src/pages/ReceiveStockRequisition.jsx
import React, { useState, useEffect } from 'react';
import { Package, AlertCircle, CheckCircle, ArrowLeft, Clock, CheckSquare, Square } from 'lucide-react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import  useEmployeeAuth  from '../../../context/EmployeeAuthContext';
import requisitionService from '../../../services/stockRequisitionService';

const ReceiveStockRequisition = ({ role }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user: employee } = useEmployeeAuth();

  const [requisition, setRequisition] = useState(null);
  const [receiveData, setReceiveData] = useState([]);
  const [selectedItems, setSelectedItems] = useState({}); // Tracks which cards are checked
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState({});
  const [loading, setLoading] = useState(true);

  // Load requisition
  useEffect(() => {
    const fetchRequisition = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const req = await requisitionService.getOne(id);
        setRequisition(req);

        // Initialize receive data for items that are not fully received
        const initialData = req.items
          .filter(item => item.receivingStatus !== 'FULLY_RECEIVED')
          .map(item => ({
            itemId: item.id,
            receivedQty: '',
            note: ''
          }));
        setReceiveData(initialData);

        // By default, select all non-fully received items
        const initialSelected = {};
        req.items.forEach(item => {
          if (item.receivingStatus !== 'FULLY_RECEIVED') {
            initialSelected[item.id] = true;
          }
        });
        setSelectedItems(initialSelected);
      } catch (err) {
        console.error('Failed to load requisition:', err);
        setErrors({ load: 'Failed to load requisition. Please try again.' });
      } finally {
        setLoading(false);
      }
    };
    fetchRequisition();
  }, [id]);

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleReceiveChange = (itemId, field, value) => {
    setReceiveData(prev => {
      const existing = prev.find(d => d.itemId === itemId);
      if (existing) {
        return prev.map(d => d.itemId === itemId ? { ...d, [field]: value } : d);
      } else {
        return [...prev, { itemId, receivedQty: field === 'receivedQty' ? value : '', note: field === 'note' ? value : '' }];
      }
    });

    // Clear related error
    if (errors[`items.${itemId}.${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`items.${itemId}.${field}`];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const itemsToReceive = receiveData.filter(d => 
      selectedItems[d.itemId] && d.receivedQty && parseFloat(d.receivedQty) > 0
    );

    if (itemsToReceive.length === 0) {
      newErrors.general = 'Enter quantity for at least one selected item to receive';
    }

    itemsToReceive.forEach(data => {
      const item = requisition.items.find(i => i.id === data.itemId);
      const remainingQty = item.quantity - item.receivedQty;
      const qty = parseFloat(data.receivedQty);

      if (qty <= 0) {
        newErrors[`items.${data.itemId}.receivedQty`] = 'Must be greater than 0';
      } else if (qty > remainingQty) {
        newErrors[`items.${data.itemId}.receivedQty`] = `Cannot exceed remaining quantity (${remainingQty})`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReceive = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const itemsToReceive = receiveData
        .filter(d => selectedItems[d.itemId] && d.receivedQty && parseFloat(d.receivedQty) > 0)
        .map(d => ({
          itemId: d.itemId,
          receivedQty: parseFloat(d.receivedQty),
          note: d.note || undefined
        }));

      const result = await requisitionService.receiveItems(id, itemsToReceive);

      setSubmitSuccess(true);
      setRequisition(result);

      // Reset inputs for received items
      setReceiveData(prev => prev.map(d => ({ ...d, receivedQty: '', note: '' })));

      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to receive items. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'NOT_RECEIVED': return 'bg-gray-100 text-gray-800';
      case 'PARTIALLY_RECEIVED': return 'bg-yellow-100 text-yellow-800';
      case 'FULLY_RECEIVED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'NOT_RECEIVED': return <Clock className="h-4 w-4" />;
      case 'PARTIALLY_RECEIVED': return <Package className="h-4 w-4" />;
      case 'FULLY_RECEIVED': return <CheckSquare className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const toggleLogs = (itemId) => {
    setExpandedLogs(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  if (loading) {
    return (
      <div className="max-h-[90vh] overflow-y-auto bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (errors.load || !requisition) {
    return (
      <div className="max-h-[90vh] overflow-y-auto bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-800">Error Loading Requisition</p>
          <p className="text-gray-600 mt-2">{errors.load || 'Requisition not found'}</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const allItemsReceived = requisition.items.every(item => item.receivingStatus === 'FULLY_RECEIVED');
  const canReceive = ['APPROVED', 'PARTIALLY_RECEIVED'].includes(requisition.status);

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-50 py-8 px-4">
      <div className=" mx-auto">
        <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Requisitions
        </button>

        {/* Requisition Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-6 border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Stock Requisition #{requisition.id.slice(-8)}
              </h2>
              <p className="text-sm text-gray-600">
                Created: {new Date(requisition.createdAt).toLocaleDateString()}
              </p>
              {requisition.approvedAt && (
                <p className="text-sm text-gray-600">
                  Approved: {new Date(requisition.approvedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(requisition.status)}`}>
              {requisition.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
            <div>
              <p className="text-sm text-gray-500">Requested By</p>
              <p className="font-semibold text-gray-900">
                {requisition.employee?.firstname} {requisition.employee?.lastname}
              </p>
              <p className="text-sm text-gray-600">{requisition.employee?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-gray-700">{requisition.description || 'No description'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{requisition.items.length}</p>
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm mb-6 p-6 border border-blue-200">
          <h3 className="text-lg font-semibold mb-4">Receiving Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-5 text-center shadow-sm">
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{requisition.items.length}</p>
            </div>
            <div className="bg-white rounded-lg p-5 text-center shadow-sm">
              <p className="text-sm text-gray-600">Fully Received</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {requisition.items.filter(i => i.receivingStatus === 'FULLY_RECEIVED').length}
              </p>
            </div>
            <div className="bg-white rounded-lg p-5 text-center shadow-sm">
              <p className="text-sm text-gray-600">Still Pending</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {requisition.items.filter(i => i.receivingStatus !== 'FULLY_RECEIVED').length}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {submitSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
            <p className="text-green-800 font-medium">Items received successfully!</p>
          </div>
        )}

        {errors.submit && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
            <p className="text-red-800">{errors.submit}</p>
          </div>
        )}

        {errors.general && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
            <p className="text-red-800">{errors.general}</p>
          </div>
        )}

        {allItemsReceived && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
            <p className="text-green-800 font-medium">All items have been fully received!</p>
          </div>
        )}

        {/* Items List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Receive Items</h1>
            <p className="text-sm text-gray-600 mt-1">Uncheck items you do not want to receive now</p>
          </div>

          <div className="p-6 space-y-6">
            {requisition.items.map((item) => {
              const remainingQty = item.quantity - item.receivedQty;
              const progressPercent = item.quantity > 0 ? (item.receivedQty / item.quantity) * 100 : 0;
              const receiveInput = receiveData.find(d => d.itemId === item.id);
              const isFullyReceived = item.receivingStatus === 'FULLY_RECEIVED';
              const isChecked = selectedItems[item.id] ?? false;
              const isDisabled = isFullyReceived || !canReceive;

              return (
                <div
                  key={item.id}
                  className={`border rounded-xl p-6 transition-all relative ${
                    isFullyReceived
                      ? 'bg-green-50 border-green-300'
                      : isDisabled || !isChecked
                      ? 'bg-gray-50 border-gray-300 opacity-60'
                      : 'bg-white border-gray-300 shadow-sm'
                  }`}
                >
                  {/* Checkbox at top right */}
                  {!isFullyReceived && canReceive && (
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={() => toggleItemSelection(item.id)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        {isChecked ? (
                          <CheckSquare className="h-6 w-6 text-blue-600" />
                        ) : (
                          <Square className="h-6 w-6 text-gray-400" />
                        )}
                        <span>{isChecked ? 'Selected' : 'Not receiving now'}</span>
                      </button>
                    </div>
                  )}

                  {/* Item Header */}
                  <div className="flex justify-between items-start mb-4 pr-32">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{item.itemName}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(item.receivingStatus)}`}>
                          {getStatusIcon(item.receivingStatus)}
                          {item.receivingStatus.replace('_', ' ')}
                        </span>
                      </div>
                      {item.note && (
                        <p className="text-sm text-gray-600 italic">Note: {item.note}</p>
                      )}
                      {item.category && (
                        <p className="text-sm text-gray-600 mt-1">Category: {item.category.name}</p>
                      )}
                    </div>

                    {/* Price Info */}
                    <div className="text-right">
                      {( (item?.stock?.price ?? item.price) || (item?.stock?.sellingPrice ?? item.sellingPrice) ) ? (
                        <>
                          <p className="text-sm text-gray-600">Purchase Price</p>
                          <p className="font-semibold text-gray-900">
                             RWF {parseFloat(item?.stock?.price ?? item.price).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">Selling Price</p>
                          <p className="font-semibold text-green-600">
                           RWF {parseFloat(item?.stock?.sellingPrice ?? item.sellingPrice).toLocaleString()}
                          </p>
                        </>
                      ) : (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-orange-800">New Item (No Stock Record)</p>
                          <p className="text-xs text-orange-700 mt-1">Prices set during approval</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-5">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-700 font-medium">Receiving Progress</span>
                      <span className="font-semibold">
                        {item.receivedQty} / {item.quantity} ({progressPercent.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          isFullyReceived ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Receiving History */}
                  {item.receivingLogs && item.receivingLogs.length > 0 && (
                    <div className="mb-5">
                      <button
                        onClick={() => toggleLogs(item.id)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        {expandedLogs[item.id] ? '▼' : '▶'} History ({item.receivingLogs.length} entries)
                      </button>

                      {expandedLogs[item.id] && (
                        <div className="mt-3 space-y-3">
                          {item.receivingLogs.map((log, idx) => (
                            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">
                                    {log.receivedQty} received
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    By: {log.receivedBy?.firstname} {log.receivedBy?.lastname}
                                  </p>
                                  {log.note && (
                                    <p className="text-sm text-gray-600 mt-1 italic">Note: {log.note}</p>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">
                                  {new Date(log.receivedAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Receive Input - Only if checked and not fully received */}
                  {isChecked && !isFullyReceived && canReceive && (
                    <div className="border-t pt-5 mt-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity to Receive
                            <span className="text-gray-500 ml-2">(Max: {remainingQty})</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={remainingQty}
                            value={receiveInput?.receivedQty || ''}
                            onChange={(e) => handleReceiveChange(item.id, 'receivedQty', e.target.value)}
                            placeholder={`0 - ${remainingQty}`}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-lg ${
                              errors[`items.${item.id}.receivedQty`]
                                ? 'border-red-500'
                                : 'border-gray-300'
                            }`}
                          />
                          {errors[`items.${item.id}.receivedQty`] && (
                            <p className="mt-2 text-sm text-red-600">
                              {errors[`items.${item.id}.receivedQty`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Note <span className="text-gray-400">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={receiveInput?.note || ''}
                            onChange={(e) => handleReceiveChange(item.id, 'note', e.target.value)}
                            placeholder="e.g., Delivered in good condition"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message when unchecked */}
                  {!isChecked && !isFullyReceived && canReceive && (
                    <div className="border-t pt-5 mt-5 bg-gray-100 rounded-lg p-4 text-center">
                      <p className="text-gray-600 font-medium">
                        This item is unchecked and will not be included in this receiving session
                      </p>
                    </div>
                  )}

                  {/* Fully received message */}
                  {isFullyReceived && (
                    <div className="bg-green-100 border border-green-300 rounded-lg p-4 flex items-center gap-3">
                      <CheckSquare className="h-8 w-8 text-green-600" />
                      <p className="text-green-800 font-semibold text-lg">
                        This item has been fully received
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Button */}
          {canReceive && !allItemsReceived && (
            <div className="border-t px-6 py-5 flex justify-end gap-4">
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReceive}
                disabled={isSubmitting}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-3 font-medium"
              >
                <Package className="h-5 w-5" />
                {isSubmitting ? 'Processing...' : 'Record Received Items'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiveStockRequisition;