// src/pages/RequisitionDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  Plus, Eye, Trash2, Search, ChevronLeft, ChevronRight,
  AlertTriangle, XCircle, X, RefreshCw,
  Grid3X3, List, Package, Truck, Clock, AlertOctagon, Edit, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import requisitionService from '../../services/requisitionService';
import { format } from 'date-fns';
import { useSocketEvent } from '../../context/SocketContext';

const RequisitionDashboard = ({role}) => {  // 'partner' | 'employee' | 'admin'
 
  const navigate = useNavigate();

  const isPartner = role === 'partner';
  const isEmployee = role === 'employee';
  const isAdmin = role === 'admin';

  // State
  const [allRequisitions, setAllRequisitions] = useState([]);
  const [filteredRequisitions, setFilteredRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid' | 'list'
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [rejectConfirm, setRejectConfirm] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // Socket updates
  useSocketEvent('requisitionCreated', (newReq) => {
    setAllRequisitions(prev => [...prev, newReq]);
  }, []);

  useSocketEvent('requisitionUpdated', (updated) => {
    setAllRequisitions(prev => prev.map(r => r.id === updated.id ? updated : r));
  }, []);

  useSocketEvent('requisitionCancelled', (updated) => {
    setAllRequisitions(prev => prev.map(r => r.id === updated.id ? updated : r));
  }, []);

  useSocketEvent('requisitionDeleted', ({ id }) => {
    setAllRequisitions(prev => prev.filter(r => r.id !== id));
  }, []);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [allRequisitions, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      let data;
      if (isPartner) {
        data = await requisitionService.getMyRequisitions();
      } else {
        data = await requisitionService.getAllRequisitions();
      }
      setAllRequisitions(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load requisitions');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    let filtered = [...allRequisitions];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(req =>
        req.requisitionNumber?.toLowerCase().includes(term) ||
        req.partnerNote?.toLowerCase().includes(term) ||
        req.items?.some(item => item.itemName?.toLowerCase().includes(term))
      );
    }
    setFilteredRequisitions(filtered);
    setCurrentPage(1);
  };

  const showOperationStatus = (type, message, duration = 3000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setOperationLoading(true);
      await requisitionService.deleteRequisition(deleteConfirm.id);
      showOperationStatus('success', 'Requisition deleted successfully');
      setDeleteConfirm(null);
    } catch (err) {
      showOperationStatus('error', err.message || 'Failed to delete');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || !rejectConfirm) return;
    try {
      setOperationLoading(true);
      await requisitionService.rejectRequisition(rejectConfirm.id, rejectReason);
      showOperationStatus('success', 'Requisition rejected');
      setRejectConfirm(null);
      setRejectReason('');
    } catch (err) {
      showOperationStatus('error', err.message || 'Failed to reject');
    } finally {
      setOperationLoading(false);
    }
  };

  // Status badge
  const getStatusConfig = (status) => {
    const config = {
      PENDING: { bg: 'bg-yellow-100', txt: 'text-yellow-800', icon: Clock, label: 'Pending' },
      APPROVED: { bg: 'bg-blue-100', txt: 'text-blue-800', icon: CheckCircle, label: 'Approved' },
      PARTIALLY_FULFILLED: { bg: 'bg-orange-100', txt: 'text-orange-800', icon: Package, label: 'Partially Delivered' },
      COMPLETED: { bg: 'bg-green-100', txt: 'text-green-800', icon: Truck, label: 'Completed' },
      REJECTED: { bg: 'bg-red-100', txt: 'text-red-800', icon: XCircle, label: 'Rejected' },
      CANCELLED: { bg: 'bg-gray-100', txt: 'text-gray-800', icon: XCircle, label: 'Cancelled' },
    };
    return config[status] || config.PENDING;
  };

  const renderStatusBadge = (status) => {
    const { bg, txt, icon: Icon, label } = getStatusConfig(status);
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${txt}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  // Actions
  const renderActions = (req) => {
    const canUpdate = isPartner && req.status === 'PENDING';
    const canCancel = isPartner && ['PENDING', 'REJECTED'].includes(req.status);
    const canDelete = isPartner && req.status === 'PENDING';
    const canApprove = isEmployee && req.status === 'PENDING';
    const canDeliver = isEmployee && ['APPROVED', 'PARTIALLY_FULFILLED'].includes(req.status);
    const canConfirm = isPartner && ['APPROVED', 'PARTIALLY_FULFILLED'].includes(req.status);
    const canOverridePrice = isAdmin && req.status === 'APPROVED';

    return (
      <div className="flex items-center gap-2">
        <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate(`/${role}/dashboard/requisition/view/${req.id}`)}
          className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition-colors" title="View">
          <Eye className="w-4 h-4" />
        </motion.button>

        {canUpdate && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate(`/${role}/dashboard/requisition/update/${req.id}`)}
            className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition-colors" title="Edit">
            <Edit className="w-4 h-4" />
          </motion.button>
        )}

        {canCancel && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate(`/${role}/dashboard/requisition/cancel/${req.id}`)}
            className="text-gray-500 hover:text-orange-600 p-2 rounded-full hover:bg-orange-50 transition-colors" title="Cancel">
            <XCircle className="w-4 h-4" />
          </motion.button>
        )}

        {canDelete && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => setDeleteConfirm(req)}
            className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors" title="Delete">
            <Trash2 className="w-4 h-4" />
          </motion.button>
        )}

        {canApprove && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate(`/${role}/dashboard/requisition/approve/${req.id}`)}
            className="text-gray-500 hover:text-green-600 p-2 rounded-full hover:bg-green-50 transition-colors" title="Approve Items">
            <CheckCircle className="w-4 h-4" />
          </motion.button>
        )}

        {canApprove && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => setRejectConfirm(req)}
            className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors" title="Reject">
            <AlertOctagon className="w-4 h-4" />
          </motion.button>
        )}

        {canDeliver && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate(`/${role}/dashboard/requisition/deliver/${req.id}`)}
            className="text-gray-500 hover:text-orange-600 p-2 rounded-full hover:bg-orange-50 transition-colors" title="Deliver Items">
            <Truck className="w-4 h-4" />
          </motion.button>
        )}

        {canOverridePrice && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate(`/${role}/dashboard/requisition/override-price/${req.id}`)}
            className="text-gray-500 hover:text-purple-600 p-2 rounded-full hover:bg-purple-50 transition-colors" title="Override Price">
            <AlertTriangle className="w-4 h-4" />
          </motion.button>
        )}

        {canConfirm && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate(`/${role}/dashboard/requisition/confirm/${req.id}`)}
            className="text-gray-500 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-colors" title="Confirm Receipt">
            <CheckCircle className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    );
  };

  // Pagination
  const totalPages = Math.ceil(filteredRequisitions.length / itemsPerPage);
  const paginated = filteredRequisitions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);

    for (let i = startPage; i <= endPage; i++) pages.push(i);

    return (
      <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-100 rounded-b-lg shadow">
        <div className="text-xs text-gray-600">
          Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredRequisitions.length)} of {filteredRequisitions.length}
        </div>
        <div className="flex items-center space-x-2">
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50">
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          {pages.map(page => (
            <motion.button key={page} whileHover={{ scale: 1.05 }} onClick={() => setCurrentPage(page)}
              className={`px-3 py-1.5 text-xs rounded ${currentPage === page ? 'bg-primary-600 text-white' : 'text-gray-600 bg-white border border-gray-200 hover:bg-primary-50'}`}>
              {page}
            </motion.button>
          ))}
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50">
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    );
  };

  // Views
  const renderTableView = () => (
    <div className="bg-white rounded-lg shadow border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">Req #</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">Partner Note</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">Items</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">Created</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">Status</th>
              <th className="text-right py-3 px-4 text-gray-600 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.map((req) => (
              <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{req.requisitionNumber}</td>
                <td className="py-3 px-4 text-gray-600 truncate max-w-xs">{req.partnerNote || '—'}</td>
                <td className="py-3 px-4">{req.items?.length || 0} item{req.items?.length !== 1 ? 's' : ''}</td>
                <td className="py-3 px-4 text-gray-600">{format(new Date(req.createdAt), 'dd MMM yyyy')}</td>
                <td className="py-3 px-4">{renderStatusBadge(req.status)}</td>
                <td className="py-3 px-4 text-right">{renderActions(req)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {paginated.map((req) => (
        <motion.div
          key={req.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex flex-col space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-900">{req.requisitionNumber}</p>
                <p className="text-xs text-gray-500">{format(new Date(req.createdAt), 'dd MMM yyyy')}</p>
              </div>
              {renderStatusBadge(req.status)}
            </div>
            <div className="text-xs text-gray-600">
              <p className="font-medium">{req.items?.length || 0} item{req.items?.length !== 1 ? 's' : ''}</p>
              <p className="truncate">{req.partnerNote || 'No note'}</p>
            </div>
            <div className="flex justify-end">
              {renderActions(req)}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="bg-white rounded-lg shadow border border-gray-100 divide-y divide-gray-100">
      {paginated.map((req) => (
        <motion.div
          key={req.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="px-4 py-4 hover:bg-gray-50 flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{req.requisitionNumber}</p>
                <p className="text-xs text-gray-500">{format(new Date(req.createdAt), 'dd MMM yyyy')}</p>
              </div>
              <div className="flex-1 truncate">
                <p className="text-xs text-gray-600 truncate">{req.partnerNote || 'No note'}</p>
                <p className="text-xs text-gray-500">{req.items?.length || 0} items</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {renderStatusBadge(req.status)}
            {renderActions(req)}
          </div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-100 font-sans">
      {/* Header */}
      <div className="sticky top-0 bg-white shadow-md z-10">
        <div className="mx-auto px-4 py-4 ">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Requisition Management</h1>
              <p className="text-xs text-gray-500">Create, view and manage requisitions</p>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button whileHover={{ scale: 1.05 }} onClick={loadData} disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-primary-600 border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-xs">Refresh</span>
              </motion.button>
              {isPartner && (
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate(`/${role}/dashboard/requisition/create`)}
                  className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded font-medium shadow-md">
                  <Plus className="w-4 h-4" />
                  <span className="text-xs">New Requisition</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-auto px-4 py-6 space-y-6 ">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <p className="text-xs text-gray-600">Completed</p>
                <p className="text-xl font-semibold text-gray-900">
                  {allRequisitions.filter(r => r.status === 'COMPLETED').length}
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow border border-gray-100 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-50 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Partially Delivered</p>
                <p className="text-xl font-semibold text-gray-900">
                  {allRequisitions.filter(r => r.status === 'PARTIALLY_FULFILLED').length}
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
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search requisitions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-200 rounded">
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setViewMode('table')}
                  className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:text-primary-600'}`} title="Table View">
                  <List className="w-4 h-4" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:text-primary-600'}`} title="Grid View">
                  <Grid3X3 className="w-4 h-4" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:text-primary-600'}`} title="List View">
                  <List className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-xs">{error}</div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow border border-gray-100 p-8 text-center text-gray-600">
            <div className="inline-flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Loading requisitions...</span>
            </div>
          </div>
        ) : filteredRequisitions.length === 0 ? (
          <div className="bg-white rounded-lg shadow border border-gray-100 p-8 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900">
              {searchTerm ? 'No Requisitions Found' : 'No Requisitions Available'}
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
            {(viewMode === 'grid' || viewMode === 'list') && totalPages > 1 && renderPagination()}
          </div>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {operationStatus && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-4 right-4 z-50">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-xs ${operationStatus.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
              {operationStatus.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
              <span className="font-medium">{operationStatus.message}</span>
              <motion.button whileHover={{ scale: 1.1 }} onClick={() => setOperationStatus(null)}>
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {operationLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-4 shadow-xl">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-700 text-xs font-medium">Processing...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center gap-3 mb-4">
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
                  Are you sure you want to delete this requisition?
                </p>
              </div>
              <div className="flex items-center justify-end gap-3">
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50">
                  Cancel
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} onClick={handleDelete} className="px-4 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                  Delete
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject with Reason Modal */}
      <AnimatePresence>
        {rejectConfirm && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center gap-3 mb-4">
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
              <div className="flex items-center justify-end gap-3">
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

export default RequisitionDashboard;