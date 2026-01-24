// src/pages/CreditManagementPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Search, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, X, RefreshCw, DollarSign,
  Clock, CreditCard, Edit, Eye, List, Grid3X3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import creditService from '../../services/creditService';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import { format } from 'date-fns';
import useScreenBelow from '../../hooks/useScreenBelow';

const CreditManagementPage = ({ role }) => {
  const { user } = useEmployeeAuth();
  const employeeId = user?.id;
  const isAdmin = role === 'admin';
  // const isEmployee = role === 'employee';
  const isEmployee = true;

  // ── STATE ──
  const [credits, setCredits] = useState([]);
  const [allCredits, setAllCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [viewMode, setViewMode] = useState('table');

  const [selectedCredit, setSelectedCredit] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [createEditModalOpen, setCreateEditModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentCredit, setPaymentCredit] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const [formData, setFormData] = useState({
    description: '',
    totalAmount: ''
  });

  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);

  const navigate = useNavigate();
  const isBelow = useScreenBelow();

  useEffect(() => {
    setViewMode(isBelow ? 'grid' : 'table');
  }, [isBelow]);

  // ── LOAD DATA ──
  useEffect(() => {
    loadCredits();
  }, [employeeId, isAdmin]);

  useEffect(() => {
    handleFilterAndSort();
  }, [searchTerm, sortBy, sortOrder, allCredits]);

  const loadCredits = async () => {
    try {
      setLoading(true);
      const data = await creditService.getAllCredits();
      let filtered = data;
      if (isEmployee && employeeId) {
        console.log(data);
        
        filtered = data.filter(c => c.employeeId === employeeId);
      }
      console.log(data);
      setAllCredits(Array.isArray(filtered) ? filtered : []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load credits');
      setAllCredits([]);
    } finally {
      setLoading(false);
    }
  };

  // ── FILTER & SORT ──
  const handleFilterAndSort = () => {
    let filtered = [...allCredits];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.description?.toLowerCase().includes(term) ||
        `${c.employee?.firstname || ''} ${c.employee?.lastname || ''}`.toLowerCase().includes(term) ||
        c.totalAmount?.toString().includes(term)
      );
    }

    filtered.sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      if (sortBy === 'createdAt') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (bVal > aVal ? 1 : -1);
    });

    setCredits(filtered);
    setCurrentPage(1);
  };

  // ── STATS ──
  const totalCredits = allCredits.length;
  const totalDebt = allCredits.reduce((sum, c) => sum + ((c.totalAmount - (c.payments?.reduce((pSum, p) => pSum + (parseFloat(p.amount) || 0), 0) || 0)) || 0), 0);
  const totalPaid = allCredits.reduce((sum, c) => {
    const payments = Array.isArray(c.payments) ? c.payments : [];
    return sum + payments.reduce((pSum, p) => pSum + (parseFloat(p.amount) || 0), 0);
  }, 0);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RWF' ,}).format(amount || 0);

  // ── STATUS CONFIG ──
  const getStatusConfig = (status) => {
    const cfg = {
      PENDING: { bg: 'bg-yellow-100', txt: 'text-yellow-800', icon: Clock, label: 'Pending' },
      PARTIAL: { bg: 'bg-orange-100', txt: 'text-orange-800', icon: CreditCard, label: 'Partial' },
      PAID: { bg: 'bg-green-100', txt: 'text-green-800', icon: CheckCircle, label: 'Paid' },
    };
    return cfg[status] || cfg.PENDING;
  };

  const renderStatusBadge = (status) => {
    const { bg, txt, icon: Icon, label } = getStatusConfig(status);
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${txt}`}>
        <Icon className="w-3 h-3" />
        <span>{label}</span>
      </span>
    );
  };

  // ── CALCULATE PAID & BALANCE ──
  const getPaidAmount = (credit) => {
    const payments = Array.isArray(credit.payments) ? credit.payments : [];
    return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  };

  const getBalance = (credit) => {
    const total = Number(credit.totalAmount) || 0;
    const paid = getPaidAmount(credit);
    return total - paid;
  };

  const getCreditStatus = (credit) => {
    const balance = getBalance(credit);
    if (balance <= 0) return 'PAID';
    if (getPaidAmount(credit) > 0) return 'PARTIAL';
    return 'PENDING';
  };

  // ── PAYMENT MODAL LOGIC ──
  const openPaymentModal = (credit) => {
    setPaymentCredit(credit);
    setPaymentAmount('');
    setPaymentModalOpen(true);
  };

  const handleAddPayment = async () => {
    const amount = Number(paymentAmount);
    const balance = getBalance(paymentCredit);

    if (!amount || amount <= 0) {
      showToast('error', 'Please enter a valid amount');
      return;
    }

    if (amount > balance) {
      showToast('error', `Amount cannot exceed remaining balance of ${formatCurrency(balance)}`);
      return;
    }

    try {
      setOperationLoading(true);
      await creditService.addPayment(paymentCredit.id, amount);
      showToast('success', `Payment of ${formatCurrency(amount)} added successfully`);
      setPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentCredit(null);
      loadCredits();
    } catch (err) {
      showToast('error', err.message || 'Failed to add payment');
    } finally {
      setOperationLoading(false);
    }
  };

  // ── CRUD HANDLERS ──
  const handleCreateOrUpdate = async () => {
    if (!formData.description || !formData.totalAmount || Number(formData.totalAmount) <= 0) {
      showToast('error', 'Description and valid amount are required');
      return;
    }

    try {
      setOperationLoading(true);
      const payload = {
        ...formData,
        totalAmount: parseFloat(formData.totalAmount),
      };

      if (selectedCredit?.id) {
        showToast('info', 'Update not implemented in backend');
      } else {
        await creditService.createCredit(payload);
        showToast('success', 'Credit created successfully');
      }

      setCreateEditModalOpen(false);
      resetForm();
      loadCredits();
    } catch (err) {
      showToast('error', err.message || 'Operation failed');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm?.id) return;
    try {
      setOperationLoading(true);
      await creditService.deleteCredit(deleteConfirm.id);
      showToast('success', 'Credit deleted');
      setDeleteConfirm(null);
      loadCredits();
    } catch (err) {
      showToast('error', err.message || 'Delete failed');
    } finally {
      setOperationLoading(false);
    }
  };

  const openCreateModal = () => {
    setSelectedCredit(null);
    setFormData({ description: '', totalAmount: '' });
    setCreateEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ description: '', totalAmount: '' });
    setSelectedCredit(null);
  };

  // ── UTILS ──
  const showToast = (type, message, duration = 2800) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  const canDelete = (credit) => isEmployee && credit.employeeId === employeeId;

  // ── PAGINATION ──
  const totalPages = Math.ceil(credits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCredits = credits.slice(startIndex, endIndex);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-100 rounded-b-xl">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1}–{Math.min(endIndex, credits.length)} of {credits.length}
        </div>
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border rounded disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>

          {pages.map(page => (
            <motion.button
              key={page}
              whileHover={{ scale: 1.05 }}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-2 border rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
            >
              {page}
            </motion.button>
          ))}

          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border rounded disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    );
  };

  // ── VIEWS ──
  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {currentCredits.map(credit => {
        const paid = getPaidAmount(credit);
        const balance = getBalance(credit);
        const status = getCreditStatus(credit);

        return (
          <motion.div
            key={credit.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow border overflow-hidden"
          >
            <div className="p-5 border-b bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xl font-bold">{formatCurrency(credit.totalAmount)}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {format(new Date(credit.createdAt), 'dd MMM yyyy')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedCredit(credit);
                      setViewModalOpen(true);
                    }}
                    className="p-2 hover:bg-blue-50 rounded-full text-blue-600"
                  >
                    <Eye size={18} />
                  </button>

                  {canDelete(credit) && (
                    <button
                      onClick={() => setDeleteConfirm(credit)}
                      className="p-2 hover:bg-red-50 rounded-full text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Status</span>
                {renderStatusBadge(status)}
              </div>

              <div>
                <p className="text-xs text-gray-500">Description</p>
                <p className="font-medium">{credit.description || '—'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Paid</p>
                  <p className="font-semibold text-green-600">{formatCurrency(paid)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Balance</p>
                  <p className="font-semibold text-red-600">{formatCurrency(balance)}</p>
                </div>
              </div>

              {balance > 0 && (
                <button
                  onClick={() => openPaymentModal(credit)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  Make Payment
                </button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  const renderTableView = () => (
    <div className="bg-white rounded-xl shadow border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentCredits.map(credit => {
              const paid = getPaidAmount(credit);
              const balance = getBalance(credit);
              const status = getCreditStatus(credit);

              return (
                <tr key={credit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">{credit.description || '—'}</td>
                  <td className="px-6 py-4 text-sm">{formatCurrency(credit.totalAmount)}</td>
                  <td className="px-6 py-4 text-sm text-green-600">{formatCurrency(paid)}</td>
                  <td className="px-6 py-4 text-sm text-red-600">{formatCurrency(balance)}</td>
                  <td className="px-6 py-4">{renderStatusBadge(status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {format(new Date(credit.createdAt), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedCredit(credit);
                          setViewModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-blue-50 rounded-full text-blue-600"
                      >
                        <Eye size={18} />
                      </button>

                      {canDelete(credit) && (
                        <button
                          onClick={() => setDeleteConfirm(credit)}
                          className="p-1.5 hover:bg-red-50 rounded-full text-red-600"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}

                      {balance > 0 && (
                        <button
                          onClick={() => openPaymentModal(credit)}
                          className="p-1.5 hover:bg-green-50 rounded-full text-green-600"
                          title="Make Payment"
                        >
                          <CreditCard size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── MODALS ──
  const renderViewModal = () => {
    if (!selectedCredit) return null;

    const paid = getPaidAmount(selectedCredit);
    const balance = getBalance(selectedCredit);
    const payments = Array.isArray(selectedCredit.payments) ? selectedCredit.payments : [];

    return (
      <AnimatePresence>
        {viewModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">Credit Details</h2>
                <button onClick={() => setViewModalOpen(false)}>
                  <X className="w-6 h-6 text-gray-500 hover:text-gray-800" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-2xl font-bold">{formatCurrency(selectedCredit.totalAmount)}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-700">Paid</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(paid)}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-700">Balance</p>
                    <p className="text-2xl font-bold text-red-700">{formatCurrency(balance)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-gray-700">{selectedCredit.description || '—'}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Status</h3>
                  {renderStatusBadge(getCreditStatus(selectedCredit))}
                </div>

                {payments.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Payment History</h3>
                    <div className="space-y-2">
                      {payments.map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                          <span>{formatCurrency(p.amount)}</span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(p.paidAt), 'dd MMM yyyy • HH:mm')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t flex justify-end">
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const renderCreateEditModal = () => (
    <AnimatePresence>
      {createEditModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
          >
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">New Credit</h2>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Salary advance, medical, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Amount (RWF)
                </label>
                <input
                  type="number"
                  step="100"
                  value={formData.totalAmount}
                  onChange={e => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="50000"
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setCreateEditModalOpen(false);
                  resetForm();
                }}
                className="px-5 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrUpdate}
                disabled={operationLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {operationLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Create
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── PAYMENT MODAL ──
  const renderPaymentModal = () => {
    if (!paymentCredit) return null;

    const balance = getBalance(paymentCredit);
    const maxAmount = balance;

    return (
      <AnimatePresence>
        {paymentModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Make Payment</h2>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <p className="text-sm text-gray-600">Credit: {paymentCredit.description || '—'}</p>
                  <p className="text-lg font-medium mt-1">
                    Remaining Balance: <span className="text-red-600">{formatCurrency(balance)}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount (RWF)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max={maxAmount}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={`Max: ${formatCurrency(maxAmount)}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum allowed: {formatCurrency(maxAmount)}
                  </p>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={() => {
                    setPaymentModalOpen(false);
                    setPaymentAmount('');
                    setPaymentCredit(null);
                  }}
                  className="px-5 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPayment}
                  disabled={operationLoading || !paymentAmount || Number(paymentAmount) > maxAmount}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {operationLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Add Payment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // ── MAIN RENDER ──
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="sticky top-0 bg-white shadow z-10">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Credit Management</h1>
              <p className="text-sm text-gray-600">Manage employee credits & payments</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadCredits}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              {isEmployee && (
                <button
                  onClick={openCreateModal}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Credit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* Stats */}
      {!loading && allCredits.length > 0 && (
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white rounded-xl shadow border p-5">
              <p className="text-sm text-gray-500">Total Credits</p>
              <p className="text-3xl font-bold mt-1">{totalCredits}</p>
            </div>
            <div className="bg-white rounded-xl shadow border p-5">
              <p className="text-sm text-gray-500">Total Debt</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(totalDebt)}</p>
            </div>
            <div className="bg-white rounded-xl shadow border p-5">
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Toolbar */}
        <div className="bg-white rounded-xl shadow border p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search description..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={e => {
                  const [f, o] = e.target.value.split('-');
                  setSortBy(f);
                  setSortOrder(o);
                }}
                className="px-4 py-2.5 border rounded-lg text-sm"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="totalAmount-desc">Highest Amount</option>
                <option value="totalAmount-asc">Lowest Amount</option>
              </select>

              <div className="flex border rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                >
                  <Grid3X3 size={20} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2.5 ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                >
                  <List size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-gray-600">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading credits...
            </div>
          </div>
        ) : credits.length === 0 ? (
          <div className="bg-white rounded-xl shadow border p-12 text-center">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold">No credits found</h3>
            {isEmployee && <p className="text-gray-600 mt-2">Create your first credit request</p>}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? renderGridView() : renderTableView()}
            {renderPagination()}
          </>
        )}
      </div>

      {/* Modals */}
      {renderViewModal()}
      {renderCreateEditModal()}
      {renderPaymentModal()}

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-4 mb-5">
                <AlertTriangle className="w-10 h-10 text-red-600" />
                <div>
                  <h3 className="text-lg font-semibold">Delete Credit</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2 border rounded-lg">
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={operationLoading}
                  className="px-5 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {operationStatus && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="fixed top-6 right-6 z-50"
          >
            <div
              className={`px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-medium ${
                operationStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {operationStatus.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {operationStatus.message}
              <button onClick={() => setOperationStatus(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global loading overlay */}
      <AnimatePresence>
        {operationLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          >
            <div className="bg-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="font-medium">Processing...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreditManagementPage;