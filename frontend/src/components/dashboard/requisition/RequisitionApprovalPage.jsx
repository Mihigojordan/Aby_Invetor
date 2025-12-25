// src/pages/RequisitionApprovalPage.jsx
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle, Package, User,
  Calendar, FileText, Search, Loader2
} from 'lucide-react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import requisitionService from '../../../services/requisitionService';
import stockInService from '../../../services/stockinService';
import { format } from 'date-fns';
import Swal from 'sweetalert2';


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
const StockSearchModal = ({ isOpen, onClose, onSelect, searchQuery = '' }) => {
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(searchQuery);

  useEffect(() => {
    if (isOpen) {
      loadStocks();
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim() === '') {
      setFilteredStocks(stocks);
    } else {
      const lowerQuery = query.toLowerCase();
      setFilteredStocks(
        stocks.filter(stock =>
          stock.product?.name?.toLowerCase().includes(lowerQuery) ||
          stock.sku?.toLowerCase().includes(lowerQuery) ||
          stock.supplier?.toLowerCase().includes(lowerQuery)
        )
      );
    }
  }, [query, stocks]);

  const loadStocks = async () => {
    setLoading(true);
    try {
      const allStocks = await stockInService.getAllStockIns();
      const inStock = allStocks.filter(s => s.quantity > 0);
      setStocks(inStock);
      setFilteredStocks(inStock);
    } catch (error) {
      console.error('Failed to load stock:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Select from Available Stock</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by product name, SKU, or supplier..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading available stock...</p>
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No matching stock found.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredStocks.map((stock) => (
                <button
                  key={stock.id}
                  onClick={() => {
                    onSelect(stock);
                    onClose();
                  }}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{stock.product?.name || 'Unknown Product'}</p>
                      <div className="text-sm text-gray-600 mt-1 space-y-1">
                        {stock.sku && <p>SKU: {stock.sku}</p>}
                        {stock.supplier && <p>Supplier: {stock.supplier}</p>}
                        <p>Available: <span className="font-medium">{stock.quantity} units</span></p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(stock.sellingPrice)}</p>
                      <p className="text-xs text-gray-500">Selling Price</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const RequisitionApprovalPage = ({ role }) => {

  const { id: requisitionId } = useParams();
  const navigate = useNavigate();

  const [requisition, setRequisition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [approvals, setApprovals] = useState({});
  const [stockSearch, setStockSearch] = useState({ isOpen: false, itemId: null, query: '' });

  useEffect(() => {
    if (requisitionId) fetchRequisition();
  }, [requisitionId]);

  const fetchRequisition = async () => {
    setLoading(true);
    try {
      const data = await requisitionService.getRequisitionById(requisitionId);

      setRequisition(data);

      // Initialize approvals only for PENDING items
      const initial = {};
      data.items.forEach(item => {
        if (item.status === 'PENDING') {
          initial[item.id] = {
            itemId: item.id,
            decision: 'pending',
            qtyApproved: item.qtyRequested,
            stockInId: null,
            stockInfo: null,
            approvalNote: ''
          };
        }
        // Approved/Rejected items are not editable — we just display them
      });
      setApprovals(initial);
    } catch (err) {
      setError(err.message || 'Failed to load requisition');
    } finally {
      setLoading(false);
    }
  };

  const updateApproval = (itemId, field, value) => {
    setApprovals(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value }
    }));
    setError('');
  };

  const handleApprove = (itemId) => {
    updateApproval(itemId, 'decision', 'approve');
  };

  const handleReject = (itemId) => {
    updateApproval(itemId, 'decision', 'reject');
    updateApproval(itemId, 'qtyApproved', 0);
    updateApproval(itemId, 'stockInId', null);
    updateApproval(itemId, 'stockInfo', null);
  };

  const openStockSearch = (itemId, itemName) => {
    setStockSearch({ isOpen: true, itemId, query: itemName });
  };

  const closeStockSearch = () => {
    setStockSearch({ isOpen: false, itemId: null, query: '' });
  };

  const selectStock = (stock) => {
    if (stockSearch.itemId) {
      updateApproval(stockSearch.itemId, 'stockInId', stock.id);
      updateApproval(stockSearch.itemId, 'stockInfo', stock);

      // Auto-adjust qty if exceeds stock availability
      const currentQty = approvals[stockSearch.itemId]?.qtyApproved || 0;
      if (currentQty > stock.quantity) {
        updateApproval(stockSearch.itemId, 'qtyApproved', stock.quantity);
      }
    }
  };

  const getValidationErrors = () => {
    const errors = [];
    const pendingItems = Object.values(approvals).filter(a => a.decision === 'pending');

    if (pendingItems.length === requisition?.items.filter(i => i.status === 'PENDING').length) {
      errors.push('You must review at least one pending item before submitting.');
    }

    Object.values(approvals).forEach(a => {
      if (a.decision === 'approve') {
        const item = requisition?.items.find(i => i.id === a.itemId);
        if (!item) return;

        const qty = Number(a.qtyApproved);

        if (isNaN(qty) || qty <= 0) {
          errors.push(`${item.itemName}: Approved quantity must be greater than 0`);
        } else if (qty > item.qtyRequested) {
          errors.push(`${item.itemName}: Cannot approve more than requested (${item.qtyRequested})`);
        }

        if (!a.stockInId || !a.stockInfo) {
          errors.push(`${item.itemName}: You must assign a stock item`);
        } else if (qty > a.stockInfo.quantity) {
          errors.push(`${item.itemName}: Only ${a.stockInfo.quantity} units available in selected stock`);
        }
      }
    });

    return errors;
  };

  const validationErrors = getValidationErrors();
  const hasErrors = validationErrors.length > 0;

  const handleSubmit = async () => {
    if (hasErrors) {
      setError(validationErrors.join(' • '));
      return;
    }

    const result = await Swal.fire({
      title: 'Submit Review?',
      text: 'This will finalize your approval decisions for pending items.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Submit',
      cancelButtonText: 'No, Continue Editing',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#dc2626'
    });

    if (!result.isConfirmed) {
      return; // User cancelled
    }

    setError('');
    setSubmitting(true);

    try {
      // Only submit items that were reviewed (decision !== pending)
      const itemsToSubmit = Object.values(approvals)
        .filter(a => a.decision !== 'pending')
        .map(a => ({
          itemId: a.itemId,
          qtyApproved: a.decision === 'reject' ? 0 : Number(a.qtyApproved),
          ...(a.stockInId && { stockInId: a.stockInId }),
          ...(a.approvalNote?.trim() && { approvalNote: a.approvalNote })
        }));

      if (itemsToSubmit.length === 0) {
        Swal.fire('Nothing to Submit', 'You did not review any items.', 'info');
        setSubmitting(false);
        return;
      }

      await requisitionService.approveItems(requisitionId, itemsToSubmit);

      Swal.fire({
        title: 'Success!',
        text: 'Your review has been submitted successfully.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      setSuccess(true);
      setTimeout(() => {
        navigate(-1);
      }, 2200);
    } catch (err) {
      Swal.fire('Error', err.message || 'Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = requisition?.items.filter(i => i.status === 'PENDING').length || 0;
  const approvedCount = requisition?.items.filter(i => i.status === 'APPROVED').length || 0;
  const rejectedCount = requisition?.items.filter(i => i.status === 'REJECTED').length || 0;

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
          <button onClick={() => navigate(-1)} className="text-blue-600 hover:text-blue-800 font-medium">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
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
              <h1 className="text-3xl font-bold text-gray-900">Review Requisition</h1>
             
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Current Status</p>
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                {requisition.status}
              </span>
            </div>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-6 flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600 mr-4" />
            <div>
              <p className="text-lg font-semibold text-green-800">Review Submitted Successfully!</p>
              <p className="text-green-700">Redirecting back...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-6 flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Validation Error</p>
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
                <p className="font-medium text-gray-900">Partner Name</p>
                <p className="text-sm text-gray-600">partner@email.com</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(requisition.createdAt), 'dd MMM yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  {format(new Date(requisition.createdAt), 'hh:mm a')}
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

        {/* Review Progress */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Review Progress</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center py-6 bg-yellow-50 rounded-lg">
              <p className="text-4xl font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-sm text-yellow-800 mt-1">Pending</p>
            </div>
            <div className="text-center py-6 bg-green-50 rounded-lg">
              <p className="text-4xl font-bold text-green-600">{approvedCount}</p>
              <p className="text-sm text-green-800 mt-1">Approved</p>
            </div>
            <div className="text-center py-6 bg-red-50 rounded-lg">
              <p className="text-4xl font-bold text-red-600">{rejectedCount}</p>
              <p className="text-sm text-red-800 mt-1">Rejected</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-6 mb-8">
          {requisition.items.map((item) => {
            const isAlreadyReviewed = item.status !== 'PENDING';
            const approval = approvals[item.id];

            const itemErrors = [];
            if (!isAlreadyReviewed && approval?.decision === 'approve') {
              const qty = Number(approval.qtyApproved);
              if (isNaN(qty) || qty <= 0) itemErrors.push('Quantity must be > 0');
              if (qty > item.qtyRequested) itemErrors.push(`Max requested: ${item.qtyRequested}`);
              if (!approval.stockInId) itemErrors.push('Stock assignment required');
              else if (qty > approval.stockInfo.quantity) {
                itemErrors.push(`Only ${approval.stockInfo.quantity} available`);
              }
            }

            return (
              <div
                key={item.id}
                className={`bg-white rounded-lg shadow-sm border-2 p-6 transition-all ${
                  isAlreadyReviewed
                    ? item.status === 'APPROVED'
                      ? 'border-green-500 bg-green-50 opacity-75'
                      : 'border-red-500 bg-red-50 opacity-75'
                    : approval?.decision === 'approve'
                    ? 'border-green-500 bg-green-50'
                    : approval?.decision === 'reject'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <Package className="w-6 h-6 text-gray-400" />
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{item.itemName}</h3>
                      <p className="text-gray-600">Requested: <strong>{item.qtyRequested}</strong> units</p>
                      {item.note && <p className="text-sm text-gray-600 mt-2 italic">"{item.note}"</p>}
                      {isAlreadyReviewed && (
                        <p className="text-sm font-medium mt-2">
                          {item.status === 'APPROVED' ? '✓ Already Approved' : '✗ Already Rejected'}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isAlreadyReviewed && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(item.id)}
                        disabled={approval?.decision === 'approve'}
                        className={`px-5 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                          approval?.decision === 'approve'
                            ? 'bg-green-600 text-white'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(item.id)}
                        disabled={approval?.decision === 'reject'}
                        className={`px-5 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                          approval?.decision === 'reject'
                            ? 'bg-red-600 text-white'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {/* Already Reviewed Items */}
                {isAlreadyReviewed && item.status === 'APPROVED' && (
                  <div className="mt-4 p-4 bg-green-100 rounded-lg">
                    <p className="font-medium">Approved: {item.qtyApproved} units</p>
                    {item.stockIn && (
                      <p className="text-sm mt-1">
                        Stock: {item.stockIn.product?.name} (Available: {item.stockIn.quantity})
                      </p>
                    )}
                    {item.approvalNote && <p className="text-sm italic mt-2">Note: {item.approvalNote}</p>}
                  </div>
                )}

                {isAlreadyReviewed && item.status === 'REJECTED' && (
                  <div className="mt-4 p-4 bg-red-100 rounded-lg">
                    <p className="font-medium">Rejected</p>
                    {item.approvalNote && <p className="text-sm italic mt-2">Reason: {item.approvalNote}</p>}
                  </div>
                )}

                {/* Pending Review - Approval Section */}
                {!isAlreadyReviewed && approval?.decision === 'approve' && (
                  <div className="mt-6 pt-6 border-t border-green-200 space-y-5">
                    {itemErrors.length > 0 && (
                      <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                        <p className="font-semibold text-red-800 mb-2">Cannot approve yet:</p>
                        <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                          {itemErrors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity to Approve <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={Math.min(item.qtyRequested, approval.stockInfo?.quantity || item.qtyRequested)}
                          value={approval.qtyApproved || ''}
                          onChange={(e) => updateApproval(item.id, 'qtyApproved', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            itemErrors.some(e => e.includes('quantity') || e.includes('available'))
                              ? 'border-red-500'
                              : 'border-gray-300'
                          }`}
                        />
                        <p className="text-xs text-gray-600 mt-2">
                          Max: {item.qtyRequested} requested
                          {approval.stockInfo && ` • ${approval.stockInfo.quantity} in stock`}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assign Stock <span className="text-red-600">*</span>
                        </label>
                        {approval.stockInfo ? (
                          <div className={`p-4 border rounded-lg ${
                            approval.stockInfo.quantity < Number(approval.qtyApproved)
                              ? 'border-red-500 bg-red-50'
                              : 'border-green-300 bg-green-50'
                          }`}>
                            <div className="flex justify-between">
                              <div>
                                <p className="font-semibold">{approval.stockInfo.product?.name}</p>
                                <p className="text-sm text-gray-600">
                                  Available: <strong>{approval.stockInfo.quantity}</strong> • 
                                  Price: {formatCurrency(approval.stockInfo.sellingPrice)}
                                  {approval.stockInfo.sku && ` • SKU: ${approval.stockInfo.sku}`}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  updateApproval(item.id, 'stockInId', null);
                                  updateApproval(item.id, 'stockInfo', null);
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => openStockSearch(item.id, item.itemName)}
                            className="w-full px-4 py-3 border-2 border-dashed border-red-400 rounded-lg text-red-700 hover:border-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                          >
                            <AlertCircle className="w-5 h-5" />
                            Required: Select Stock Item
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Approval Note (Optional)
                      </label>
                      <textarea
                        value={approval.approvalNote || ''}
                        onChange={(e) => updateApproval(item.id, 'approvalNote', e.target.value)}
                        rows="2"
                        placeholder="Add notes..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Pending Review - Rejection Section */}
                {!isAlreadyReviewed && approval?.decision === 'reject' && (
                  <div className="mt-6 pt-6 border-t border-red-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Rejection (Optional)
                    </label>
                    <textarea
                      value={approval.approvalNote || ''}
                      onChange={(e) => updateApproval(item.id, 'approvalNote', e.target.value)}
                      rows="3"
                      placeholder="Explain why this item cannot be approved..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit */}
              {JSON.stringify(pendingCount === requisition.items.filter(i => i.status === 'PENDING').lengthors).length}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky bottom-0">
          <div className="flex justify-end gap-4">
            <button
              onClick={() => navigate(-1)}
              disabled={submitting}
              className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
            disabled={
  submitting ||
  hasErrors ||
  Object.keys(approvals).length === 0 || // No items to review at all
  Object.values(approvals).every(a => a.decision === 'pending') // Nothing reviewed yet
}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3 font-medium"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Submit Review
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <StockSearchModal
        isOpen={stockSearch.isOpen}
        onClose={closeStockSearch}
        onSelect={selectStock}
        searchQuery={stockSearch.query}
      />
    </div>
  );
};

export default RequisitionApprovalPage;