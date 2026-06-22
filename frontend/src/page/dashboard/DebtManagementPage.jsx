import React, { useState, useEffect } from 'react';
import { Search, DollarSign, Phone, Mail, User, Calendar, CreditCard, AlertCircle, CheckCircle, XCircle, Filter, Package, Barcode, TrendingUp, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import stockOutService from '../../services/stockoutService.js';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import { hasFeaturePermission } from '../../utils/permissions';

// Currency formatting function
const formatCurrency = (amount, currency = 'RWF') => {
  if (amount === null || amount === undefined) return `${currency} 0`;
  
  const formatted = Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  return `${currency} ${formatted}`;
};

const DebtManagementPage = ({ role }) => {
  const { user: employeeData } = useEmployeeAuth();
  const canUpdate = hasFeaturePermission(employeeData, role, 'debt-movement', 'update');
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchDebts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterPaymentMethod]);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const response = await stockOutService.getAllDebtedStockOuts();
      // Handle the array directly or extract from data property
      const debtData = Array.isArray(response) ? response : (response?.data || []);
      setDebts(debtData);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching debts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedDebt || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (parseFloat(paymentAmount) > selectedDebt.debtedAmount) {
      alert('Payment amount cannot exceed the debt amount');
      return;
    }

    try {
      await stockOutService.updatePayment(selectedDebt.id, parseFloat(paymentAmount));
      alert('Payment updated successfully');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setSelectedDebt(null);
      fetchDebts();
    } catch (err) {
      alert('Failed to update payment: ' + err.message);
    }
  };

  const filteredDebts = debts.filter(debt => {
    const matchesSearch = 
      debt.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      debt.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      debt.clientPhone?.includes(searchTerm) ||
      debt.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      debt.stockin?.product?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      debt.stockin?.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatusFilter = 
      filterStatus === 'all' || 
      debt.paymentStatus === filterStatus;

    const matchesPaymentMethodFilter = 
      filterPaymentMethod === 'all' || 
      debt.paymentMethod === filterPaymentMethod;

    return matchesSearch && matchesStatusFilter && matchesPaymentMethodFilter;
  });

  const totalDebt = filteredDebts.reduce((sum, debt) => sum + (debt.debtedAmount || 0), 0);
  const totalSold = filteredDebts.reduce((sum, debt) => sum + (debt.soldPrice || 0), 0);
  const totalPaid = filteredDebts.reduce((sum, debt) => sum + ((debt.soldPrice || 0) - (debt.debtedAmount || 0)), 0);
  const uniqueClients = new Set(filteredDebts.map(d => d.clientName || d.clientPhone)).size;

  const totalPages = Math.ceil(filteredDebts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredDebts.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    const pages = [];
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'SUCCESSFUL':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'DEBTED':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'SUCCESSFUL':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'DEBTED':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodColor = (method) => {
    switch(method) {
      case 'MOMO':
        return 'bg-purple-100 text-purple-800';
      case 'CARD':
        return 'bg-blue-100 text-blue-800';
      case 'CASH':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading debts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-[90vh] bg-gray-50 p-6">
      <div className=" mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Debt Management Dashboard</h1>
          <p className="text-gray-600">Track and manage all outstanding customer debts</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Debt</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebt)}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{filteredDebts.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Unique Clients</p>
                <p className="text-2xl font-bold text-purple-600">{uniqueClients}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <User className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by client, product, SKU, or transaction..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="DEBTED">Debted</option>
                <option value="PENDING">Pending</option>
                <option value="SUCCESSFUL">Successful</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Payment Methods</option>
                <option value="MOMO">Mobile Money</option>
                <option value="CARD">Card</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Debts Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDebts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No debts found</p>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((debt) => (
                    <tr key={debt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-mono text-gray-900 font-medium">{debt.transactionId}</div>
                          <div className="text-gray-500 flex items-center mt-1">
                            <Barcode className="w-3 h-3 mr-1" />
                            {debt.stockin?.sku || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start">
                          <User className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{debt.clientName || 'N/A'}</div>
                            {debt.clientEmail && (
                              <div className="text-gray-500 text-xs mt-0.5">{debt.clientEmail}</div>
                            )}
                            {debt.clientPhone && (
                              <div className="text-gray-500 text-xs">{debt.clientPhone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {debt.stockin?.product?.productName || 'N/A'}
                          </div>
                          <div className="text-gray-500 text-xs mt-1">
                            Qty: {debt.quantity} × {formatCurrency(debt.stockin?.sellingPrice || 0)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(debt.soldPrice || 0)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Paid: {formatCurrency((debt.soldPrice || 0) - (debt.debtedAmount || 0))}
                          </div>
                          <div className="text-xs font-bold text-red-600">
                            Debt: {formatCurrency(debt.debtedAmount || 0)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentMethodColor(debt.paymentMethod)}`}>
                          {debt.paymentMethod || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(debt.paymentStatus)}
                          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(debt.paymentStatus)}`}>
                            {debt.paymentStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(debt.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedDebt(debt);
                              setShowDetailsModal(true);
                            }}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition-colors"
                          >
                            View
                          </button>
                          {canUpdate && (
                          <button
                            onClick={() => {
                              setSelectedDebt(debt);
                              setShowPaymentModal(true);
                            }}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                          >
                            Pay
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredDebts.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-t border-gray-200 bg-white">
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredDebts.length)} of {filteredDebts.length} entries
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${currentPage === 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>
                  <div className="flex items-center gap-1 mx-2">
                    {getPageNumbers().map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 text-sm rounded-md transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${currentPage === totalPages ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Update Payment</h3>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Client:</span>
                  <span className="font-medium">{selectedDebt.clientName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Product:</span>
                  <span className="font-medium">{selectedDebt.stockin?.product?.productName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">{formatCurrency(selectedDebt.soldPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Already Paid:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency((selectedDebt.soldPrice || 0) - (selectedDebt.debtedAmount || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-gray-600 font-semibold">Remaining Debt:</span>
                  <span className="font-bold text-red-600">{formatCurrency(selectedDebt.debtedAmount)}</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter payment amount"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max={selectedDebt.debtedAmount}
                    step="0.01"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Maximum: {formatCurrency(selectedDebt.debtedAmount)}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentAmount('');
                    setSelectedDebt(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold text-gray-900">Transaction Details</h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedDebt(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Transaction Info */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Transaction Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Transaction ID:</span>
                      <p className="font-mono font-medium">{selectedDebt.transactionId}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">SKU:</span>
                      <p className="font-medium">{selectedDebt.stockin?.sku}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Date:</span>
                      <p className="font-medium">{new Date(selectedDebt.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Last Updated:</span>
                      <p className="font-medium">{new Date(selectedDebt.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Client Info */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Client Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-600" />
                      <span className="font-medium">{selectedDebt.clientName}</span>
                    </div>
                    {selectedDebt.clientEmail && (
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-600" />
                        <span>{selectedDebt.clientEmail}</span>
                      </div>
                    )}
                    {selectedDebt.clientPhone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-gray-600" />
                        <span>{selectedDebt.clientPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Info */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Product Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Product Name:</span>
                      <p className="font-medium">{selectedDebt.stockin?.product?.productName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Brand:</span>
                      <p className="font-medium">{selectedDebt.stockin?.product?.brand || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Quantity Sold:</span>
                      <p className="font-medium">{selectedDebt.quantity}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Unit Price:</span>
                      <p className="font-medium">{formatCurrency(selectedDebt.stockin?.sellingPrice)}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Payment Details</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-bold text-lg">{formatCurrency(selectedDebt.soldPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency((selectedDebt.soldPrice || 0) - (selectedDebt.debtedAmount || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-gray-600 font-semibold">Outstanding Debt:</span>
                      <span className="font-bold text-red-600 text-lg">
                        {formatCurrency(selectedDebt.debtedAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentMethodColor(selectedDebt.paymentMethod)}`}>
                        {selectedDebt.paymentMethod}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Payment Status:</span>
                      <div className="flex items-center">
                        {getStatusIcon(selectedDebt.paymentStatus)}
                        <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedDebt.paymentStatus)}`}>
                          {selectedDebt.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Employee Info */}
                {selectedDebt.employee && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Processed By</h4>
                    <div className="text-sm">
                      <p className="font-medium">
                        {selectedDebt.employee.firstname} {selectedDebt.employee.lastname}
                      </p>
                      <p className="text-gray-600">{selectedDebt.employee.email}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                {canUpdate && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowPaymentModal(true);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Make Payment
                </button>
                )}
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedDebt(null);
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtManagementPage;