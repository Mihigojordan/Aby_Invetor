// src/pages/ExpenseManagementPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Search, ChevronDown, Eye, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, X, RefreshCw, DollarSign,
  Calendar, User, Edit, FileText, List, Grid3X3,
  Clock,
  BookCheckIcon,
  FolderCheckIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import expenseService from '../../services/expenseService'; // ← your service
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import { format } from 'date-fns';
import { API_URL } from '../../api/api';
import useScreenBelow from '../../hooks/useScreenBelow';
import { hasFeaturePermission } from '../../utils/permissions';

const ExpenseManagementPage = ({ role }) => {
  const { user } = useEmployeeAuth();
  const employeeId = user?.id;
  const isAdmin = role === 'admin';
  const isEmployee = role === 'employee';
  const canCreate = hasFeaturePermission(user, role, 'expense-movement', 'create');
  const canUpdate = hasFeaturePermission(user, role, 'expense-movement', 'update');
  const canDeleteExpense = hasFeaturePermission(user, role, 'expense-movement', 'delete');

  // ── STATE ──
  const [expenses, setExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [viewMode, setViewMode] = useState('table'); // 'grid' or 'table'

  const [selectedExpense, setSelectedExpense] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    reason: '',
    expenseDate: ''
  });

  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);

  const navigate = useNavigate();

  const isBelow = useScreenBelow();

  useEffect(() => {
    if (isBelow) {
      setViewMode('grid');
    } else {
      setViewMode('table');
    }
  }, [isBelow]);

  // ── LOAD DATA ──
  useEffect(() => {
    loadExpenses();
  }, [employeeId, isAdmin]);

  useEffect(() => {
    handleFilterAndSort();
  }, [searchTerm, sortBy, sortOrder, allExpenses]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await expenseService.getAllExpenses();
      let filtered = data;
      if (isEmployee && employeeId) {
        filtered = data.filter(exp => exp.employeeId === employeeId);
      }
      setAllExpenses(Array.isArray(filtered) ? filtered : []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load expenses');
      setAllExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  // ── FILTER & SORT ──
  const handleFilterAndSort = () => {
    let filtered = [...allExpenses];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(exp =>
        exp.description?.toLowerCase().includes(term) ||
        exp.reason?.toLowerCase().includes(term) ||
        `${exp.employee?.firstname || ''} ${exp.employee?.lastname || ''}`.toLowerCase().includes(term) ||
        exp.amount?.toString().includes(term)
      );
    }

    filtered.sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      if (sortBy === 'createdAt' || sortBy === 'expenseDate') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (bVal > aVal ? 1 : -1);
    });

    setExpenses(filtered);
    setCurrentPage(1);
  };

  // ── STATS ──
  const totalExpenses = allExpenses.length;
  const totalAmount = allExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const highestExpense = allExpenses.length > 0
    ? allExpenses.reduce((max, exp) => (exp.amount > max.amount ? exp : max), allExpenses[0])
    : null;
  const lowestExpense = allExpenses.length > 0
    ? allExpenses.reduce((min, exp) => (exp.amount < min.amount ? exp : min), allExpenses[0])
    : null;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RWF' }).format(amount || 0);

  // ── STATUS CONFIG ──
  const getStatusConfig = (status) => {
    const cfg = {
      PENDING: { bg: 'bg-yellow-100', txt: 'text-yellow-800', icon: Clock, label: 'Pending' },
      APPROVED: { bg: 'bg-blue-100', txt: 'text-blue-800', icon: CheckCircle, label: 'Approved' },
      REJECTED: { bg: 'bg-red-100', txt: 'text-red-800', icon: XCircle, label: 'Rejected' },
      COMPLETED: { bg: 'bg-green-100', txt: 'text-green-800', icon: FolderCheckIcon, label: 'Completed' },
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

  // ── STATUS UPDATE HANDLERS ──
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      setOperationLoading(true);
      await expenseService.updateExpenseStatus(id, newStatus);
      showToast('success', `Expense ${newStatus.toLowerCase()} successfully`);
      loadExpenses();
    } catch (err) {
      showToast('error', err.message || 'Failed to update status');
    } finally {
      setOperationLoading(false);
    }
  };

  // ── ACTION BUTTONS PER EXPENSE ──
  const renderActions = (exp) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          setSelectedExpense(exp);
          setViewModalOpen(true);
        }}
        className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50"
        title="View details"
      >
        <Eye className="w-5 h-5" />
      </button>

      {canEditExpense(exp) && (
        <>
          <button
            onClick={() => openEditModal(exp)}
            className="p-1.5 text-gray-500 hover:text-green-600 rounded-full hover:bg-green-50"
            title="Edit"
          >
            <Edit className="w-5 h-5" />
          </button>
        </>
      )}
      {canDeleteExpenseRow(exp) && (
        <>
          <button
            onClick={() => setDeleteConfirm(exp)}
            className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </>
      )}

      {isAdmin && exp.status === 'PENDING' && (
        <>
          <motion.button
            whileHover={{ scale: 1.1 }}
            onClick={() => handleStatusUpdate(exp.id, 'APPROVED')}
            className="p-1.5 text-gray-500 hover:text-green-600 rounded-full hover:bg-green-50"
            title="Approve"
          >
            <CheckCircle className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            onClick={() => handleStatusUpdate(exp.id, 'REJECTED')}
            className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50"
            title="Reject"
          >
            <XCircle className="w-5 h-5" />
          </motion.button>
        </>
      )}

      {isAdmin && exp.status === 'APPROVED' && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          onClick={() => handleStatusUpdate(exp.id, 'COMPLETED')}
          className="p-1.5 text-gray-500 hover:text-emerald-600 rounded-full hover:bg-emerald-50"
          title="Mark as Completed"
        >
          <FolderCheckIcon className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  );

  // ── CRUD HANDLERS ──
  const handleCreateOrUpdate = async () => {
    if (!formData.description || !formData.amount || !formData.reason || !formData.expenseDate) {
      showToast('error', 'All fields are required');
      return;
    }
    try {
      setOperationLoading(true);
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        expenseDate: new Date(formData.expenseDate).toISOString(),
      };
      if (editModalOpen && selectedExpense?.id) {
        await expenseService.updateExpense(selectedExpense.id, payload);
        showToast('success', 'Expense updated successfully');
      } else {
        await expenseService.createExpense(payload);
        showToast('success', 'Expense created successfully');
      }
      setEditModalOpen(false);
      resetForm();
      loadExpenses();
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
      await expenseService.deleteExpense(deleteConfirm.id);
      showToast('success', 'Expense deleted');
      setDeleteConfirm(null);
      loadExpenses();
    } catch (err) {
      showToast('error', err.message || 'Delete failed');
    } finally {
      setOperationLoading(false);
    }
  };

  const openEditModal = (exp = null) => {
    if (exp) {
      setSelectedExpense(exp);
      setFormData({
        description: exp.description || '',
        amount: exp.amount || '',
        reason: exp.reason || '',
        expenseDate: exp.expenseDate ? format(new Date(exp.expenseDate), 'yyyy-MM-dd') : ''
      });
    } else {
      resetForm();
    }
    setEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ description: '', amount: '', reason: '', expenseDate: '' });
    setSelectedExpense(null);
  };

  // ── UTILS ──
  const showToast = (type, message, duration = 2800) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  const canEditOrDelete = (exp) =>
    isEmployee && exp.employeeId === employeeId;
  const canEditExpense = (exp) => canEditOrDelete(exp) && canUpdate;
  const canDeleteExpenseRow = (exp) => canEditOrDelete(exp) && canDeleteExpense;

  // ── PAGINATION ──
  const totalPages = Math.ceil(expenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentExpenses = expenses.slice(startIndex, endIndex);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-100 rounded-b-xl shadow-sm">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1}–{Math.min(endIndex, expenses.length)} of {expenses.length}
        </div>
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>

          {pages.map((page) => (
            <motion.button
              key={page}
              whileHover={{ scale: 1.05 }}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-2 text-sm rounded border ${
                currentPage === page
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              {page}
            </motion.button>
          ))}

          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
      {currentExpenses.map(exp => (
        <motion.div
          key={exp.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow border overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="p-5 border-b bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(exp.amount)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {format(new Date(exp.expenseDate), 'dd MMM yyyy')}
                </p>
              </div>
              <div className="flex gap-2">
                {renderActions(exp)}
              </div>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Status</span>
              {renderStatusBadge(exp.status)}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Description</p>
              <p className="font-medium text-gray-800">{exp.description || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Reason</p>
              <p className="text-gray-700 line-clamp-2">{exp.reason || '—'}</p>
            </div>
            {exp.employee && (
              <div className="pt-2 border-t text-xs text-gray-500">
                Submitted by: {exp.employee.firstname} {exp.employee.lastname}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderTableView = () => (
    <div className="bg-white rounded-xl shadow border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentExpenses.map(exp => (
              <motion.tr
                key={exp.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-gray-50"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(exp.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(exp.expenseDate), 'dd MMM yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {renderStatusBadge(exp.status)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{exp.description || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{exp.reason || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {exp.employee ? `${exp.employee.firstname} ${exp.employee.lastname}` : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {renderActions(exp)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── MODALS (unchanged) ──
  const renderViewModal = () => {
    if (!selectedExpense) return null;
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
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Expense Details</h2>
                  <button onClick={() => setViewModalOpen(false)}>
                    <X className="w-6 h-6 text-gray-500 hover:text-gray-800" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">Status:</span>
                  {renderStatusBadge(selectedExpense.status)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-semibold text-lg">{formatCurrency(selectedExpense.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="font-medium">
                      {format(new Date(selectedExpense.expenseDate), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-gray-800">{selectedExpense.description || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Reason</p>
                  <p className="text-gray-800 whitespace-pre-line">{selectedExpense.reason || '—'}</p>
                </div>
                <div className="text-xs text-gray-500">
                  Created: {format(new Date(selectedExpense.createdAt), 'dd MMM yyyy • HH:mm')}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="px-5 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50"
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

  const renderEditCreateModal = () => (
    <AnimatePresence>
      {editModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.92 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
          >
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {selectedExpense ? 'Edit Expense' : 'New Expense'}
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Amount (RWF)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="125.50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Expense Date
                </label>
                <input
                  type="date"
                  value={formData.expenseDate}
                  onChange={e => setFormData({ ...formData, expenseDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Office supplies, travel, etc."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason / Justification
                </label>
                <textarea
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                  placeholder="Why was this expense necessary?"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditModalOpen(false);
                  resetForm();
                }}
                className="px-5 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrUpdate}
                disabled={operationLoading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {operationLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {selectedExpense ? 'Update' : 'Create'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── RENDER ──
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header & Actions */}
      <div className="sticky top-0 bg-white shadow z-10">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
              <p className="text-sm text-gray-600">Track and manage your expenses</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadExpenses}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              {isEmployee && canCreate && (
                <button
                  onClick={() => openEditModal()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Expense
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {!loading && allExpenses.length > 0 && (
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-xl shadow border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{totalExpenses}</p>
                </div>
                <DollarSign className="w-10 h-10 text-blue-500 opacity-30" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalAmount)}</p>
                </div>
                <DollarSign className="w-10 h-10 text-green-500 opacity-30" />
              </div>
            </div>

            {highestExpense && (
              <div className="bg-white rounded-xl shadow border p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Highest Expense</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(highestExpense.amount)}</p>
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {highestExpense.description || 'No description'}
                    </p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-amber-500 opacity-30" />
                </div>
              </div>
            )}

            {lowestExpense && (
              <div className="bg-white rounded-xl shadow border p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Lowest Expense</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(lowestExpense.amount)}</p>
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {lowestExpense.description || 'No description'}
                    </p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-emerald-500 opacity-30" />
                </div>
              </div>
            )}
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
                placeholder="Search description, reason, amount..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-4">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={e => {
                  const [field, dir] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(dir);
                }}
                className="px-4 py-2.5 border rounded-lg text-sm"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
                <option value="expenseDate-desc">Recent Expense Date</option>
                <option value="expenseDate-asc">Oldest Expense Date</option>
              </select>

              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                  title="Grid View"
                >
                  <Grid3X3 className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setViewMode('table')}
                  className={`p-2.5 ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                  title="Table View"
                >
                  <List className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow border p-12 text-center">
            <div className="inline-flex items-center gap-3 text-gray-600">
              <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading expenses...
            </div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="bg-white rounded-xl shadow border p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {searchTerm ? 'No matching expenses' : 'No expenses yet'}
            </h3>
            <p className="text-gray-600">
              {searchTerm
                ? 'Try different search terms'
                : isEmployee
                ? 'Start by creating your first expense'
                : 'No expenses have been submitted yet'}
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' && renderGridView()}
            {viewMode === 'table' && renderTableView()}
            {renderPagination()}
          </>
        )}
      </div>

      {/* Modals */}
      {renderViewModal()}
      {renderEditCreateModal()}

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
              exit={{ scale: 0.9 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Expense</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-5 py-2.5 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={operationLoading}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 flex items-center gap-2"
                >
                  {operationLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {operationStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50"
          >
            <div
              className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
                operationStatus.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {operationStatus.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {operationStatus.message}
              <button onClick={() => setOperationStatus(null)}>
                <X className="w-4 h-4 opacity-70 hover:opacity-100" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay for status updates */}
      <AnimatePresence>
        {operationLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-40"
          >
            <div className="bg-white rounded-lg p-4 shadow-xl">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-700 text-sm font-medium">Processing...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpenseManagementPage;