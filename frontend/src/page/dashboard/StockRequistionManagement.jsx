// src/pages/StockRequisitionDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Search, ChevronDown, Eye, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, X, RefreshCw,
  Grid3X3, List, Package, Truck, Clock, User, AlertOctagon,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import requisitionService from '../../services/stockRequisitionService';
import  useEmployeeAuth  from '../../context/EmployeeAuthContext';
import { format } from 'date-fns';
import { API_URL } from '../../api/api';
import { useSocketEvent } from '../../context/SocketContext';
import { hasFeaturePermission } from '../../utils/permissions';

const StockRequisitionDashboard = ({role}) => {
  const { user } = useEmployeeAuth();

  const employeeId = user?.id;
  const isAdmin = role === 'admin';
  const isEmployee = role === 'employee';
  const canCreate = hasFeaturePermission(user, role, 'stock-requisition-management', 'create');
  const canUpdateRequisition = hasFeaturePermission(user, role, 'stock-requisition-management', 'update');
  const canDeleteRequisition = hasFeaturePermission(user, role, 'stock-requisition-management', 'delete');

  // ── STATE ──
  const [requisitions, setRequisitions] = useState([]);
  const [allRequisitions, setAllRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [rejectConfirm, setRejectConfirm] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');

  const navigate = useNavigate();

  // ── SOCKET EVENTS ──
  useSocketEvent('stockRequisitionCreated', (newReq) => {
    setAllRequisitions(prev => [...prev, newReq]);
  }, []);

  useSocketEvent('stockRequisitionUpdated', (updated) => {
    setAllRequisitions(prev => prev.map(r => r.id === updated.id ? updated : r));
  }, []);

  useSocketEvent('stockRequisitionApproved', (updated) => {
    setAllRequisitions(prev => prev.map(r => r.id === updated.id ? updated : r));
  }, []);

  useSocketEvent('stockRequisitionReceived', (updated) => {
    setAllRequisitions(prev => prev.map(r => r.id === updated.id ? updated : r));
  }, []);

  useSocketEvent('stockRequisitionRejected', (updated) => {
    setAllRequisitions(prev => prev.map(r => r.id === updated.id ? updated : r));
  }, []);

  useSocketEvent('stockRequisitionDeleted', ({ id }) => {
    setAllRequisitions(prev => prev.filter(r => r.id !== id));
  }, []);

  // ── LOAD DATA ──
  useEffect(() => {
    if (employeeId || isAdmin) loadData();
  }, [employeeId, isAdmin]);

  useEffect(() => {
    handleFilterAndSort();
  }, [searchTerm, sortBy, sortOrder, allRequisitions]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await requisitionService.getAll();
      let filtered = data;
      if (isEmployee && employeeId) {
        filtered = data.filter(r => r.employeeId === employeeId);
      }
      setAllRequisitions(Array.isArray(filtered) ? filtered : []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load stock requisitions');
      setAllRequisitions([]);
    } finally {
      setLoading(false);
    }
  };

  // ── TOAST ──
  const showOperationStatus = (type, message, duration = 3000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  // ── FILTER / SORT ──
  const handleFilterAndSort = () => {
    let filtered = [...allRequisitions];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((r) =>
        r.description?.toLowerCase().includes(term) ||
        `${r.employee?.firstname || ''} ${r.employee?.lastname || ''}`.toLowerCase().includes(term) ||
        r.items.some(i => i.itemName.toLowerCase().includes(term))
      );
    }
    filtered.sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (sortBy === 'createdAt') {
        aVal = new Date(a.createdAt);
        bVal = new Date(b.createdAt);
      }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (bVal > aVal ? 1 : -1);
    });
    setRequisitions(filtered);
    setCurrentPage(1);
  };

  // ── CRUD OPERATIONS ──
  const handleDelete = async (req) => {
    try {
      setOperationLoading(true);
      await requisitionService.delete(req.id);
      setDeleteConfirm(null);
      showOperationStatus('success', 'Stock requisition deleted');
    } catch (err) {
      showOperationStatus('error', err.message || 'Delete failed');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showOperationStatus('error', 'Rejection reason is required');
      return;
    }
    if (!rejectConfirm) return;
    try {
      setOperationLoading(true);
      await requisitionService.reject(rejectConfirm.id, rejectReason);
      setRejectConfirm(null);
      setRejectReason('');
      showOperationStatus('success', 'Stock requisition rejected');
    } catch (err) {
      showOperationStatus('error', err.message || 'Reject failed');
    } finally {
      setOperationLoading(false);
    }
  };

  // ── PERMISSIONS ──
  const canEdit = (req) => isEmployee && req.employeeId === employeeId && req.status === 'PENDING' && canUpdateRequisition;
  const canDelete = (req) => isEmployee && req.employeeId === employeeId && req.status === 'PENDING' && canDeleteRequisition;
  const canApproveReject = (req) => isAdmin && req.status === 'PENDING';
    const canReceive = (req) => isEmployee && ['APPROVED', 'PARTIALLY_RECEIVED'].includes(req.status) && canUpdateRequisition;

  // ── STATUS CONFIG ──
  const getStatusConfig = (status) => {
    const cfg = {
      PENDING: { bg: 'bg-yellow-100', txt: 'text-yellow-800', icon: Clock, label: 'Pending' },
      APPROVED: { bg: 'bg-blue-100', txt: 'text-blue-800', icon: CheckCircle, label: 'Approved' },
      PARTIALLY_RECEIVED: { bg: 'bg-orange-100', txt: 'text-orange-800', icon: Package, label: 'Partially Received' },
      FULLY_RECEIVED: { bg: 'bg-green-100', txt: 'text-green-800', icon: Truck, label: 'Fully Received' },
      COMPLETED: { bg: 'bg-purple-100', txt: 'text-purple-800', icon: CheckCircle, label: 'Completed' },
      REJECTED: { bg: 'bg-red-100', txt: 'text-red-800', icon: XCircle, label: 'Rejected' },
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

  const renderAvatar = (url, size = 'w-10 h-10') => {
    if (!url) {
      return (
        <div className={`${size} bg-gray-100 rounded-full flex items-center justify-center`}>
          <User className="w-5 h-5 text-gray-400" />
        </div>
      );
    }
    return <img src={`${API_URL}${url}`} alt="Profile" className={`${size} rounded-full object-cover border border-gray-200`} />;
  };

  const renderActions = (req) => (
    <div className="flex items-center space-x-2">
      <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate(`/${role}/dashboard/stock-requisition/view/${req.id}`)} className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition-colors" title="View">
        <Eye className="w-4 h-4" />
      </motion.button>

       {canEdit(req) && (
        <motion.button whileHover={{ scale: 1.1 }} onClick={() => {
         navigate(`/${role}/dashboard/stock-requisition/update/${req.id}`)
        }} className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition-colors" title="Edit">
          <Edit className="w-4 h-4" />
        </motion.button>
      )}

      {canDelete(req) && (
        <motion.button whileHover={{ scale: 1.1 }} onClick={() => setDeleteConfirm(req)} className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors" title="Delete">
          <Trash2 className="w-4 h-4" />
        </motion.button>
      )}

      {canApproveReject(req) && (
        <>
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate(`/${role}/dashboard/stock-requisition/approve/${req.id}`)} className="text-gray-500 hover:text-green-600 p-2 rounded-full hover:bg-green-50 transition-colors" title="Approve">
            <CheckCircle className="w-4 h-4" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => setRejectConfirm(req)} className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors" title="Reject">
            <AlertOctagon className="w-4 h-4" />
          </motion.button>
        </>
      )}

     {canReceive(req) && (
        <motion.button whileHover={{ scale: 1.1 }} onClick={() => {
          navigate(`/${role}/dashboard/stock-requisition/receive/${req.id}`)
        }} className="text-gray-500 hover:text-orange-600 p-2 rounded-full hover:bg-orange-50 transition-colors" title="Receive Items">
          <Truck className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );

  // ── PAGINATION ──
  const totalPages = Math.ceil(requisitions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRequisitions = requisitions.slice(startIndex, endIndex);

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i);

    return (
      <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-100 rounded-b-lg shadow">
        <div className="text-xs text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, requisitions.length)} of {requisitions.length}
        </div>
        <div className="flex items-center space-x-2">
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}
            className="flex items-center px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          {pages.map((page) => (
            <motion.button key={page} whileHover={{ scale: 1.05 }} onClick={() => setCurrentPage(page)}
              className={`px-3 py-1.5 text-xs rounded ${currentPage === page ? 'bg-primary-600 text-white' : 'text-gray-600 bg-white border border-gray-200 hover:bg-primary-50'}`}>
              {page}
            </motion.button>
          ))}
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}
            className="flex items-center px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    );
  };

  // ── VIEWS ──
  const renderTableView = () => (
    <div className="bg-white rounded-lg shadow border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">Employee</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">Employee Name</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">Items</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">Description</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">Status</th>
              <th className="text-right py-3 px-4 text-gray-600 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentRequisitions.map((req) => (
              <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  {renderAvatar(req.employee?.profileImg)}
                </td>
                <td className="py-3 px-4">
                  {req.employee?.firstname || req.employee?.lastname
                    ? `${req.employee?.firstname || ''} ${req.employee?.lastname || ''}`.trim()
                    : '—'}
                </td>
                <td className="py-3 px-4">
                  <div className="text-xs">
                    <span className="font-medium">{req.items.length} item{req.items.length > 1 ? 's' : ''}</span>
                    <div className="text-gray-500 truncate max-w-xs">
                      {req.items.map(i => `${i.quantity} ${i.itemName}`).join(', ')}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600">{req.description || '—'}</td>
                <td className="py-3 px-4">{renderStatusBadge(req.status)}</td>
                <td className="py-3 px-4 text-right">{renderActions(req)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {currentRequisitions.map((req) => (
        <motion.div key={req.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center space-y-3 mb-3">
            {renderAvatar(req.employee?.profileImg, 'w-16 h-16')}
            <div className="text-center w-full">
              <div className="font-semibold text-gray-900 text-xs truncate max-w-full">
                {req.items.length} item{req.items.length > 1 ? 's' : ''}
              </div>
              <div className="text-gray-500 text-xs">
                {format(new Date(req.createdAt), 'dd MMM yyyy')}
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-center">
            {renderStatusBadge(req.status)}
          </div>
          <div className="mt-4 flex justify-center">
            {renderActions(req)}
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="bg-white rounded-lg shadow border border-gray-100 divide-y divide-gray-100">
      {currentRequisitions.map((req) => (
        <motion.div key={req.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="px-4 py-4 hover:bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {renderAvatar(req.employee?.profileImg)}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-xs truncate">
                  {req.items.length} item{req.items.length > 1 ? 's' : ''}
                </div>
                <div className="text-gray-500 text-xs truncate">
                  {req.employee?.firstname || req.employee?.lastname
                    ? `${req.employee?.firstname || ''} ${req.employee?.lastname || ''}`.trim()
                    : 'Unknown'} • {format(new Date(req.createdAt), 'dd MMM yyyy')}
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4 text-xs text-gray-600">
              {renderStatusBadge(req.status)}
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              {renderActions(req)}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-100 font-sans">
      {/* Header */}
      <div className="sticky top-0 bg-white shadow-md z-10">
        <div className="mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Stock Requisition Management
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  Create, view and manage stock requisitions
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={loadData}
                disabled={loading}
                className="flex items-center justify-center sm:justify-start space-x-2 px-3 py-2 text-gray-600 hover:text-primary-600 border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50 text-xs sm:text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </motion.button>

              {isEmployee && canCreate && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => navigate('/employee/dashboard/stock-requisition/create')}
                  className="flex items-center justify-center sm:justify-start space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded font-medium transition-colors shadow-md text-xs sm:text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Requisition</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow border border-gray-100 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary-50 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Requisitions</p>
                <p className="text-xl font-semibold text-gray-900">{allRequisitions.length}</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow border border-gray-100 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-50 rounded-full flex items-center justify-center">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Fully Received</p>
                <p className="text-xl font-semibold text-gray-900">
                  {allRequisitions.filter(r => r.status === 'FULLY_RECEIVED' || r.status === 'COMPLETED').length}
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow border border-gray-100 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-yellow-50 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Pending</p>
                <p className="text-xl font-semibold text-gray-900">
                  {allRequisitions.filter(r => r.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search requisitions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="text-xs border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="status-asc">Status A-Z</option>
                <option value="status-desc">Status Z-A</option>
              </select>
              <div className="flex items-center border border-gray-200 rounded">
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setViewMode('table')} className={`p-2 text-xs transition-colors ${viewMode === 'table' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:text-primary-600'}`} title="Table View">
                  <List className="w-4 h-4" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setViewMode('grid')} className={`p-2 text-xs transition-colors ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:text-primary-600'}`} title="Grid View">
                  <Grid3X3 className="w-4 h-4" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setViewMode('list')} className={`p-2 text-xs transition-colors ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:text-primary-600'}`} title="List View">
                  <List className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-xs">
            {error}
          </motion.div>
        )}
        {loading ? (
          <div className="bg-white rounded-lg shadow border border-gray-100 p-8 text-center text-gray-600">
            <div className="inline-flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Loading requisitions...</span>
            </div>
          </div>
        ) : requisitions.length === 0 ? (
          <div className="bg-white rounded-lg shadow border border-gray-100 p-8 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900">
              {searchTerm ? 'No Requisitions Found' : 'No Stock Requisitions Available'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Create a new requisition to get started.'}
            </p>
          </div>
        ) : (
          <div>
            {viewMode === 'table' && renderTableView()}
            {viewMode === 'grid' && renderGridView()}
            {viewMode === 'list' && renderListView()}
            {requisitions.length > itemsPerPage && renderPagination()}
          </div>
        )}
      </div>

      {/* TOASTS */}
      <AnimatePresence>
        {operationStatus && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-4 right-4 z-50">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg text-xs ${operationStatus.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
              {operationStatus.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
              <span className="font-medium">{operationStatus.message}</span>
              <motion.button whileHover={{ scale: 1.1 }} onClick={() => setOperationStatus(null)} className="hover:opacity-70">
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOADING OVERLAY */}
      <AnimatePresence>
        {operationLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-4 shadow-xl">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-700 text-xs font-medium">Processing...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRM MODAL */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Requisition</h3>
                  <p className="text-xs text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs text-gray-700">
                  Are you sure you want to delete this stock requisition?
                </p>
              </div>
              <div className="flex items-center justify-end space-x-3">
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50">
                  Cancel
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                  Delete
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REJECT MODAL */}
      <AnimatePresence>
        {rejectConfirm && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Reject Requisition</h3>
                  <p className="text-xs text-gray-500">Provide a reason for rejection</p>
                </div>
              </div>
              <div className="mb-4">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-end space-x-3">
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => { setRejectConfirm(null); setRejectReason(''); }} className="px-4 py-2 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50">
                  Cancel
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} onClick={handleReject} disabled={!rejectReason.trim()} className="px-4 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                  Reject
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StockRequisitionDashboard;