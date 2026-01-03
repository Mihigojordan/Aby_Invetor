// src/pages/RequisitionDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Package, User, Calendar, FileText, CheckCircle, XCircle,
  Clock, Truck, DollarSign, TrendingUp, AlertCircle, Loader2,
  Eye, Download, MapPin, Phone, Mail, Box, Tag, ChevronDown,
  ChevronUp, Building2, ShoppingCart
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import requisitionService from '../../../services/requisitionService';

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

const StatusBadge = ({ status, size = 'default' }) => {
  const configs = {
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Review' },
    REVIEWED: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Reviewed' },
    APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
    PARTIALLY_FULFILLED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Partially Fulfilled' },
    FULFILLED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Fulfilled' },
    COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' }
  };

  const config = configs[status] || configs.PENDING;
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm';

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const DeliveryHistoryCard = ({ delivery }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-start">
        <div className="flex gap-3 flex-1">
          <Truck className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <p className="font-semibold text-gray-900">
                {delivery.qtyDelivered} units delivered
              </p>
              {delivery.confirmedAt ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Confirmed
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  <Clock className="w-3 h-3 mr-1" />
                  Awaiting Confirmation
                </span>
              )}
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p>Delivered by: {delivery.createdBy?.firstname} {delivery.createdBy?.lastname}</p>
              <p>Date: {new Date(delivery.createdAt).toLocaleString()}</p>
              {delivery.deliveryNote && (
                <p className="italic mt-2">"{delivery.deliveryNote}"</p>
              )}
            </div>

            {delivery.confirmedAt && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {expanded ? 'Hide' : 'Show'} Confirmation Details
              </button>
            )}

            {expanded && delivery.confirmedAt && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900 mb-2">
                  Confirmed by: {delivery.confirmedBy?.firstname} {delivery.confirmedBy?.lastname}
                </p>
                <p className="text-sm text-green-800">
                  Date: {new Date(delivery.confirmedAt).toLocaleString()}
                </p>
                {delivery.partnerNote && (
                  <p className="text-sm text-green-800 mt-2 italic">
                    "{delivery.partnerNote}"
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ItemDetailsCard = ({ item, role, showPrices }) => {
  const [expanded, setExpanded] = useState(false);

  const currentPrice = Number(item.priceOverride ?? item.unitPriceAtApproval ?? 0);
  const costPrice = Number(item.stockIn?.price ?? 0);
  const profit = currentPrice - costPrice;
  const profitMargin = costPrice > 0 ? (profit / costPrice) * 100 : 0;

  // Individual item price visibility: hide if item is in restricted status
  const shouldShowItemPrices = showPrices && !['PENDING', 'REJECTED', 'CANCELLED'].includes(item.status);

  return (
    <div className={`border-2 rounded-lg p-6 transition-all ${
      item.status === 'FULFILLED' ? 'bg-green-50 border-green-300' :
      item.status === 'REJECTED' ? 'bg-red-50 border-red-300' :
      item.status === 'PARTIALLY_FULFILLED' ? 'bg-blue-50 border-blue-300' :
      item.status === 'REVIEWED' ? 'bg-purple-50 border-purple-300' :
      item.status === 'CANCELLED' ? 'bg-gray-50 border-gray-300' :
      'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3 flex-1">
          <Package className="w-6 h-6 text-gray-400 mt-1" />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{item.itemName}</h3>
            {item.note && (
              <p className="text-sm text-gray-600 mt-1 italic">"{item.note}"</p>
            )}
            <div className="mt-2">
              <StatusBadge status={item.status} size="sm" />
            </div>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? 'Less' : 'More'} Details
        </button>
      </div>

      {/* Quantities */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Requested</p>
          <p className="text-2xl font-bold text-gray-900">{item.qtyRequested}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Approved</p>
          <p className="text-2xl font-bold text-green-600">{item.qtyApproved || 0}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Delivered</p>
          <p className="text-2xl font-bold text-blue-600">{item.qtyDelivered}</p>
        </div>
      </div>

      {/* Pricing Section */}
      {shouldShowItemPrices && (
        <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Pricing Details
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Unit Price</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(currentPrice)}
              </p>
              {item.priceOverride !== null && item.priceOverride !== undefined && (
                <p className="text-xs text-blue-600 mt-1">Overridden</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Value</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(currentPrice * item.qtyApproved)}
              </p>
            </div>
            {role === 'admin' && (
              <>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Unit Profit</p>
                  <p className={`text-lg font-bold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Profit Margin</p>
                  <p className={`text-lg font-bold ${profitMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitMargin.toFixed(1)}%
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          {/* Stock Information */}
          {item.stockIn && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Box className="w-5 h-5" />
                Stock Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Product:</span>
                      <span className="font-medium text-gray-900">
                        {item.stockIn.product?.productName || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Brand:</span>
                      <span className="font-medium text-gray-900">
                        {item.stockIn.product?.brand || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium text-gray-900">
                        {item.stockIn.product?.category?.name || 'N/A'}
                      </span>
                    </div>
                    {item.stockIn.sku && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">SKU:</span>
                        <span className="font-medium text-gray-900 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {item.stockIn.sku}
                        </span>
                      </div>
                    )}
                    {item.stockIn.supplier && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Supplier:</span>
                        <span className="font-medium text-gray-900">
                          {item.stockIn.supplier}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  {item.stockIn.product?.imageUrls?.[0] && (
                    <img
                      src={item.stockIn.product.imageUrls[0]}
                      alt={item.stockIn.product.productName}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Approval Info */}
          {item.approver && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                Approval Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Reviewed by:</span>
                  <span className="font-medium text-gray-900">
                    {item.approver.firstname} {item.approver.lastname}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-gray-900">{item.approver.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(item.approvedAt).toLocaleString()}
                  </span>
                </div>
                {item.approvalNote && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700 italic">"{item.approvalNote}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delivery History */}
          {item.deliveries && item.deliveries.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Delivery History ({item.deliveries.length})
              </h4>
              <div className="space-y-3">
                {item.deliveries.map(delivery => (
                  <DeliveryHistoryCard key={delivery.id} delivery={delivery} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RequisitionDetailsPage = ({ role = 'employee' }) => {
  const { id: requisitionId } = useParams();
  const [requisition, setRequisition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (requisitionId) fetchRequisition();
  }, [requisitionId]);

  const fetchRequisition = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await requisitionService.getRequisitionById(requisitionId);
      setRequisition(data);
    } catch (err) {
      setError(err.message || 'Failed to load requisition');
    } finally {
      setLoading(false);
    }
  };

  // Determine if prices should be visible
  const isPartner = role === 'partner';
  const allowedStatuses = ['APPROVED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'COMPLETED'];
  const showPrices = isPartner
    ? requisition && allowedStatuses.includes(requisition.status)
    : true; // Employee/Admin always see prices

  const calculateTotals = () => {
    if (!requisition || !showPrices) return { revenue: 0, cost: 0, profit: 0, profitMargin: 0 };

    const approvedItems = requisition.items.filter(i =>
      !['PENDING', 'REJECTED', 'CANCELLED'].includes(i.status)
    );

    const revenue = approvedItems.reduce((sum, item) => {
      const price = Number(item.priceOverride ?? item.unitPriceAtApproval ?? 0);
      return sum + (price * item.qtyApproved);
    }, 0);

    const cost = approvedItems.reduce((sum, item) => {
      const costPrice = Number(item.stockIn?.price ?? 0);
      return sum + (costPrice * item.qtyApproved);
    }, 0);

    const profit = revenue - cost;
    const profitMargin = cost > 0 ? (profit / cost) * 100 : 0;

    return { revenue, cost, profit, profitMargin };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading requisition details...</p>
        </div>
      </div>
    );
  }

  if (error || !requisition) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-900 mb-2">Error</p>
          <p className="text-gray-600 mb-6">{error || 'Requisition not found'}</p>
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

  const totals = calculateTotals();

  const approvedCount = requisition.items.filter(i =>
    ['APPROVED', 'PARTIALLY_FULFILLED', 'FULFILLED'].includes(i.status)
  ).length;

  const fulfilledCount = requisition.items.filter(i =>
    i.status === 'FULFILLED' || i.status === 'PARTIALLY_FULFILLED'
  ).length;

  const rejectedCount = requisition.items.filter(i => i.status === 'REJECTED').length;

  return (
    <div className="bg-gray-50 py-8 max-h-[90vh] overflow-y-auto">
      <div className="mx-auto px-4">
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
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Requisition Details</h1>
              <p className="text-2xl text-gray-600 mt-2">{requisition.requisitionNumber}</p>
            </div>
            <StatusBadge status={requisition.status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">Created</p>
                <p className="font-medium text-gray-900">
                  {new Date(requisition.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            {requisition.reviewedAt && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Eye className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-600">Reviewed</p>
                  <p className="font-medium text-gray-900">
                    {new Date(requisition.reviewedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">Last Updated</p>
                <p className="font-medium text-gray-900">
                  {new Date(requisition.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Partner Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Partner Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="text-lg font-medium text-gray-900">
                  {requisition.partner?.firstname} {requisition.partner?.lastname}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{requisition.partner?.email}</p>
                </div>
              </div>
              {requisition.partner?.phoneNumber && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{requisition.partner.phoneNumber}</p>
                  </div>
                </div>
              )}
            </div>
            {requisition.partner?.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium text-gray-900">{requisition.partner.address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {(requisition.partnerNote || requisition.approvalSummary) && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              {requisition.partnerNote && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-start gap-2">
                    <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-1">Partner Note</p>
                      <p className="text-sm text-blue-800 italic">"{requisition.partnerNote}"</p>
                    </div>
                  </div>
                </div>
              )}
              {requisition.approvalSummary && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900 mb-1">Approval Summary</p>
                      <p className="text-sm text-green-800 italic">"{requisition.approvalSummary}"</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Statistics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Items</p>
                <p className="text-3xl font-bold text-gray-900">{requisition.items.length}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Approved</p>
                <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Delivered</p>
                <p className="text-3xl font-bold text-blue-600">{fulfilledCount}</p>
              </div>
              <Package className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Rejected</p>
                <p className="text-3xl font-bold text-red-600">{rejectedCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Financial Summary - Only for admin & when prices are allowed */}
        {role === 'admin' && showPrices && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-sm border border-green-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Financial Overview (Admin View)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totals.revenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Selling price × quantity</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totals.cost)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Purchase price × quantity</p>
              </div>
              <div className="bg-white rounded-lg p-4 border-2 border-green-500">
                <p className="text-sm text-gray-600 mb-1">Total Profit</p>
                <p className={`text-2xl font-bold ${totals.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totals.profit)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Revenue - Cost</p>
              </div>
              <div className="bg-white rounded-lg p-4 border-2 border-green-500">
                <p className="text-sm text-gray-600 mb-1">Profit Margin</p>
                <p className={`text-2xl font-bold ${totals.profitMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totals.profitMargin.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Profit / Cost × 100</p>
              </div>
            </div>
          </div>
        )}

        {/* Items Section */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Requisition Items</h2>
          <div className="space-y-4">
            {requisition.items.map((item) => (
              <ItemDetailsCard
                key={item.id}
                item={item}
                role={role}
                showPrices={showPrices}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Back to List
            </button>
            <div className="flex gap-3">
              <button className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequisitionDetailsPage;