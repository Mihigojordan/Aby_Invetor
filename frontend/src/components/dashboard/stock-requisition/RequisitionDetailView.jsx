// src/pages/ViewStockRequisition.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, User, Calendar, CheckCircle, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp, TrendingUp, FileText } from 'lucide-react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import requisitionService from '../../../services/stockRequisitionService';
import stockInService from '../../../services/stockinService';

const formatCurrency = (amount, currency = 'RWF') => {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ViewStockRequisition = (props) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = props;

  const [requisition, setRequisition] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const reqResponse = await requisitionService.getOne(id);
        setRequisition(reqResponse);

        const allStocks = await stockInService.getAllStockIns();
        setStocks(allStocks || []);
      } catch (err) {
        console.error("Failed to load requisition:", err);
        setError(err.message || "Failed to load requisition details");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'APPROVED': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-300';
      case 'PARTIALLY_RECEIVED': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'FULLY_RECEIVED': return 'bg-green-100 text-green-800 border-green-300';
      case 'COMPLETED': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getReceivingStatusColor = (status) => {
    switch (status) {
      case 'NOT_RECEIVED': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'PARTIALLY_RECEIVED': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'FULLY_RECEIVED': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-5 w-5" />;
      case 'APPROVED': return <CheckCircle className="h-5 w-5" />;
      case 'REJECTED': return <XCircle className="h-5 w-5" />;
      case 'PARTIALLY_RECEIVED': return <TrendingUp className="h-5 w-5" />;
      case 'FULLY_RECEIVED': return <Package className="h-5 w-5" />;
      case 'COMPLETED': return <CheckCircle className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const toggleItemExpansion = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const getStockInfo = (stockId) => {
    return stocks.find(s => s.id === stockId) || null;
  };

  const calculateProgress = (received, total) => {
    return total > 0 ? (received / total) * 100 : 0;
  };

  const calculateTotals = () => {
    if (!requisition?.items) return { totalItems: 0, fullyReceived: 0, partiallyReceived: 0, notReceived: 0, overallProgress: 0 };
    const totalItems = requisition.items.length;
    const fullyReceived = requisition.items.filter(i => i.receivingStatus === 'FULLY_RECEIVED').length;
    const partiallyReceived = requisition.items.filter(i => i.receivingStatus === 'PARTIALLY_RECEIVED').length;
    const notReceived = requisition.items.filter(i => i.receivingStatus === 'NOT_RECEIVED').length;
    const overallProgress = requisition.items.reduce((acc, item) => {
      return acc + calculateProgress(item.receivedQty, item.quantity);
    }, 0) / totalItems;
    return { totalItems, fullyReceived, partiallyReceived, notReceived, overallProgress };
  };

  if (loading) {
    return (
      <div className="max-h-[90vh] overflow-y-auto bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !requisition) {
    return (
      <div className="max-h-[90vh] overflow-y-auto bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-800">Error Loading Requisition</p>
          <p className="text-gray-600 mt-2">{error || "Requisition not found"}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-50 py-8 px-4">
      <div className=" mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Requisitions
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold mb-3">Stock Requisition #{requisition.id.slice(-8)}</h1>
                <p className="text-blue-100 text-lg">
                  Created on {formatDate(requisition.createdAt)}
                </p>
              </div>
              <div className={`px-6 py-3 rounded-xl border-4 font-bold flex items-center gap-3 ${getStatusColor(requisition.status)} bg-white`}>
                {getStatusIcon(requisition.status)}
                <span className="text-lg">{requisition.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="px-8 py-6 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-12">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-500">{new Date(requisition.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="flex-1 h-1 bg-gray-300 relative">
                  <div
                    className={`absolute top-0 left-0 h-full transition-all ${requisition.approvedAt ? 'bg-green-500' : 'bg-gray-300'}`}
                    style={{ width: requisition.approvedAt ? '100%' : '0%' }}
                  />
                </div>

                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    requisition.status === 'REJECTED' ? 'bg-red-100' : requisition.approvedAt ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {requisition.status === 'REJECTED' ? (
                      <XCircle className="h-6 w-6 text-red-600" />
                    ) : (
                      <CheckCircle className={`h-6 w-6 ${requisition.approvedAt ? 'text-green-600' : 'text-gray-400'}`} />
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {requisition.status === 'REJECTED' ? 'Rejected' : 'Approved'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {requisition.approvedAt ? new Date(requisition.approvedAt).toLocaleDateString() : '—'}
                  </p>
                </div>

                {requisition.status !== 'REJECTED' && (
                  <>
                    <div className="flex-1 h-1 bg-gray-300 relative">
                      <div
                        className={`absolute top-0 left-0 h-full transition-all ${totals.overallProgress > 0 ? 'bg-green-500' : 'bg-gray-300'}`}
                        style={{ width: `${Math.min(totals.overallProgress, 100)}%` }}
                      />
                    </div>

                    <div className="text-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                        requisition.completedAt ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <CheckCircle className={`h-6 w-6 ${requisition.completedAt ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <p className="text-sm font-medium text-gray-900">Completed</p>
                      <p className="text-xs text-gray-500">
                        {requisition.completedAt ? new Date(requisition.completedAt).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">REQUESTED BY</p>
                <p className="text-lg font-bold text-gray-900">
                  {requisition.employee?.firstname} {requisition.employee?.lastname}
                </p>
                <p className="text-sm text-gray-600">{requisition.employee?.email}</p>
                <p className="text-xs text-gray-400 mt-1">ID: {requisition.employee?.id}</p>
              </div>
            </div>

            {requisition.description && (
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-7 w-7 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-1">DESCRIPTION</p>
                  <p className="text-gray-700">{requisition.description}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Package className="h-7 w-7 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-2">RECEIVING SUMMARY</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fully Received</span>
                    <span className="font-bold text-green-600">{totals.fullyReceived}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Partially</span>
                    <span className="font-bold text-orange-600">{totals.partiallyReceived}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pending</span>
                    <span className="font-bold text-gray-600">{totals.notReceived}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rejection Reason */}
          {requisition.rejectReason && (
            <div className="mx-8 mb-8">
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-900 mb-1">REJECTION REASON</p>
                    <p className="text-gray-800">{requisition.rejectReason}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Overall Progress */}
        {requisition.status !== 'REJECTED' && requisition.status !== 'PENDING' && (
          <div className="bg-white rounded-xl shadow-lg mb-6 p-8">
            <h2 className="text-2xl font-bold mb-6">Overall Receiving Progress</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-lg text-gray-700">Total Progress</span>
                <span className="text-3xl font-bold text-indigo-600">{totals.overallProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-blue-600 h-6 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(totals.overallProgress, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                {totals.fullyReceived} items fully received • {totals.partiallyReceived} partially received
              </p>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="bg-white rounded-xl shadow-lg">
          <div className="border-b px-8 py-6">
            <h2 className="text-2xl font-bold">Requisition Items ({requisition.items.length})</h2>
          </div>

          <div className="p-8 space-y-6">
            {requisition.items.map((item, index) => {
              const stockInfo = item.stockId ? getStockInfo(item.stockId) : null;
              const progress = calculateProgress(item.receivedQty, item.quantity);
              const isExpanded = expandedItems[item.id];

              return (
                <div key={item.id} className="border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-6 bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <h3 className="text-2xl font-bold text-gray-900">{item.itemName}</h3>
                          <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getReceivingStatusColor(item.receivingStatus)}`}>
                            {item.receivingStatus.replace(/_/g, ' ')}
                          </span>
                          {item.category && (
                            <span className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                              {item.category.name}
                            </span>
                          )}
                        </div>

                        {/* Stock Info */}
                        {stockInfo && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">SKU</p>
                                <p className="font-mono font-bold">{stockInfo.sku}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Available Stock</p>
                                <p className="font-bold text-green-600">{stockInfo.quantity}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Purchase Price</p>
                                <p className="font-bold">{formatCurrency(item.price)}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Selling Price</p>
                                <p className="font-bold text-green-600">{formatCurrency(item.sellingPrice)}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {!stockInfo && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                            <p className="font-medium text-orange-800">New Item (Not in Stock)</p>
                            <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                              <div>
                                <p className="text-gray-600">Purchase Price</p>
                                <p className="font-bold">{formatCurrency(item.price)}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Selling Price</p>
                                <p className="font-bold text-green-600">{formatCurrency(item.sellingPrice)}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Quantities */}
                        <div className="grid grid-cols-3 gap-6 mb-5">
                          <div className="bg-gray-100 rounded-lg p-4 text-center">
                            <p className="text-sm text-gray-600 mb-1">Requested</p>
                            <p className="text-2xl font-bold text-gray-900">{item.quantity}</p>
                          </div>
                          <div className="bg-green-100 rounded-lg p-4 text-center">
                            <p className="text-sm text-gray-600 mb-1">Received</p>
                            <p className="text-2xl font-bold text-green-600">{item.receivedQty}</p>
                          </div>
                          <div className="bg-orange-100 rounded-lg p-4 text-center">
                            <p className="text-sm text-gray-600 mb-1">Remaining</p>
                            <p className="text-2xl font-bold text-orange-600">{item.quantity - item.receivedQty}</p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700 font-medium">Receiving Progress</span>
                            <span className="font-bold text-lg">{progress.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-5">
                            <div
                              className={`h-5 rounded-full transition-all duration-700 ${
                                progress === 100 ? 'bg-green-500' : progress > 0 ? 'bg-orange-500' : 'bg-gray-300'
                              }`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Note */}
                        {item.note && (
                          <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="font-medium text-blue-900 mb-1">Note</p>
                            <p className="text-gray-700">{item.note}</p>
                          </div>
                        )}

                        {/* Estimated Value */}
                        <div className="mt-5 text-right">
                          <p className="text-sm text-gray-600">Estimated Total Value</p>
                          <p className="text-2xl font-bold text-indigo-600">
                            {formatCurrency(item.quantity * (item.sellingPrice || 0))}
                          </p>
                        </div>
                      </div>

                      {/* Expand Button */}
                      {item.receivingLogs && item.receivingLogs.length > 0 && (
                        <button
                          onClick={() => toggleItemExpansion(item.id)}
                          className="ml-6 p-3 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-6 w-6 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-6 w-6 text-gray-600" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Receiving Logs */}
                  {isExpanded && item.receivingLogs && item.receivingLogs.length > 0 && (
                    <div className="border-t border-gray-200 bg-gray-50 p-6">
                      <h4 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-3">
                        <Calendar className="h-5 w-5" />
                        Receiving History ({item.receivingLogs.length} entries)
                      </h4>
                      <div className="space-y-4">
                        {item.receivingLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-lg font-bold text-gray-900">
                                  Received {log.receivedQty}
                                </p>
                                <span className="text-sm text-gray-500">{formatDate(log.receivedAt)}</span>
                              </div>
                              <p className="text-gray-700">
                                By: <span className="font-semibold">
                                  {log.receivedBy?.firstname} {log.receivedBy?.lastname}
                                </span>
                                {log.receivedBy?.position && <span className="text-gray-500"> ({log.receivedBy.position})</span>}
                              </p>
                              {log.note && (
                                <p className="mt-2 text-gray-700 italic bg-gray-100 p-3 rounded-lg">" {log.note} "</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-6">
              <span>Requisition ID: <span className="font-mono font-bold text-gray-700">{requisition.id}</span></span>
              <span>Last Updated: {formatDate(requisition.updatedAt)}</span>
            </div>
            <div className="flex gap-3">
              <button className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                Export PDF
              </button>
              <button className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewStockRequisition;