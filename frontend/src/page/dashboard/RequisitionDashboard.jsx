// src/pages/RequisitionDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  Plus, Eye, Trash2, Search, ChevronLeft, ChevronRight,
  AlertTriangle, XCircle, X, RefreshCw,
  Grid3X3, List, Package, Truck, Clock, AlertOctagon, Edit, CheckCircle,
  Menu, X as CloseIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import requisitionService from '../../services/requisitionService';
import { format } from 'date-fns';
import { useSocketEvent } from '../../context/SocketContext';

const RequisitionDashboard = ({role}) => {  // 'partner' | 'employee' | 'admin'
 
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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
  const [viewMode, setViewMode] = useState('grid'); // 'table' | 'grid' | 'list' - default to grid for mobile
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [rejectConfirm, setRejectConfirm] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // On mobile, default to grid view and hide menu if screen gets larger
      if (mobile && viewMode === 'table') {
        setViewMode('grid');
      }
      if (!mobile) {
        setShowMobileMenu(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

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
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs ${bg} ${txt}`}>
        <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{label.charAt(0)}</span>
      </span>
    );
  };

  // Actions - Mobile optimized
  const renderActions = (req) => {
    const canUpdate = isPartner && req.status === 'PENDING';
    const canCancel = isPartner && ['PENDING', 'REJECTED'].includes(req.status);
    const canDelete = isPartner && req.status === 'PENDING';
    const canApprove = isEmployee && req.status === 'PENDING';
    const canDeliver = isEmployee && ['APPROVED', 'PARTIALLY_FULFILLED'].includes(req.status);
    const canConfirm = isPartner && ['APPROVED', 'PARTIALLY_FULFILLED'].includes(req.status);
    const canOverridePrice = isAdmin && req.status === 'APPROVED';

    return (
      <div className="flex items-center gap-1 sm:gap-2">
        <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate(`/${role}/dashboard/requisition/view/${req.id}`)}
          className="text-gray-500 hover:text-primary-600 p-1.5 sm:p-2 rounded-full hover:bg-primary-50 transition-colors" title="View">
          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </motion.button>

        {canUpdate && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate(`/${role}/dashboard/requisition/update/${req.id}`)}
            className="text-gray-500 hover:text-primary-600 p-1.5 sm:p-2 rounded-full hover:bg-primary-50 transition-colors" title="Edit">
            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </motion.button>
        )}

        {canDelete && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => setDeleteConfirm(req)}
            className="text-gray-500 hover:text-red-600 p-1.5 sm:p-2 rounded-full hover:bg-red-50 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </motion.button>
        )}

        {canApprove && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate(`/${role}/dashboard/requisition/approve/${req.id}`)}
            className="text-gray-500 hover:text-green-600 p-1.5 sm:p-2 rounded-full hover:bg-green-50 transition-colors" title="Approve Items">
            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </motion.button>
        )}

        {canApprove && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => setRejectConfirm(req)}
            className="text-gray-500 hover:text-red-600 p-1.5 sm:p-2 rounded-full hover:bg-red-50 transition-colors" title="Reject">
            <AlertOctagon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </motion.button>
        )}

        {canDeliver && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate(`/${role}/dashboard/requisition/deliver/${req.id}`)}
            className="text-gray-500 hover:text-orange-600 p-1.5 sm:p-2 rounded-full hover:bg-orange-50 transition-colors" title="Deliver Items">
            <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </motion.button>
        )}

        {canOverridePrice && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate(`/${role}/dashboard/requisition/override-price/${req.id}`)}
            className="text-gray-500 hover:text-purple-600 p-1.5 sm:p-2 rounded-full hover:bg-purple-50 transition-colors" title="Override Price">
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </motion.button>
        )}

        {canConfirm && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate(`/${role}/dashboard/requisition/confirm/${req.id}`)}
            className="text-gray-500 hover:text-indigo-600 p-1.5 sm:p-2 rounded-full hover:bg-indigo-50 transition-colors" title="Confirm Receipt">
            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
    const maxVisible = isMobile ? 3 : 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);

    for (let i = startPage; i <= endPage; i++) pages.push(i);

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white px-3 sm:px-4 py-3 border-t border-gray-100 rounded-b-lg shadow space-y-2 sm:space-y-0">
        <div className="text-xs text-gray-600 text-center sm:text-left">
          Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredRequisitions.length)} of {filteredRequisitions.length}
        </div>
        <div className="flex items-center justify-center space-x-1 sm:space-x-2">
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-2 sm:px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50">
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
          </motion.button>
          {pages.map(page => (
            <motion.button key={page} whileHover={{ scale: 1.05 }} onClick={() => setCurrentPage(page)}
              className={`px-2 sm:px-3 py-1.5 text-xs rounded ${currentPage === page ? 'bg-primary-600 text-white' : 'text-gray-600 bg-white border border-gray-200 hover:bg-primary-50'}`}>
              {page}
            </motion.button>
          ))}
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-2 sm:px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50">
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </motion.button>
        </div>
      </div>
    );
  };

  // Views
  const renderTableView = () => (
    <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-3 sm:px-4 text-gray-600 font-semibold">Req #</th>
              <th className="text-left py-3 px-3 sm:px-4 text-gray-600 font-semibold hidden sm:table-cell">Partner Note</th>
              <th className="text-left py-3 px-3 sm:px-4 text-gray-600 font-semibold">Items</th>
              <th className="text-left py-3 px-3 sm:px-4 text-gray-600 font-semibold hidden xs:table-cell">Created</th>
              <th className="text-left py-3 px-3 sm:px-4 text-gray-600 font-semibold">Status</th>
              <th className="text-right py-3 px-3 sm:px-4 text-gray-600 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.map((req) => (
              <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                <td className="py-3 px-3 sm:px-4 font-medium text-xs">{req.requisitionNumber}</td>
                <td className="py-3 px-3 sm:px-4 text-gray-600 truncate max-w-xs hidden sm:table-cell text-xs">
                  {req.partnerNote || '—'}
                </td>
                <td className="py-3 px-3 sm:px-4 text-xs">
                  <span className="sm:hidden">{req.items?.length || 0}</span>
                  <span className="hidden sm:inline">{req.items?.length || 0} item{req.items?.length !== 1 ? 's' : ''}</span>
                </td>
                <td className="py-3 px-3 sm:px-4 text-gray-600 text-xs hidden xs:table-cell">
                  {format(new Date(req.createdAt), 'dd MMM yyyy')}
                </td>
                <td className="py-3 px-3 sm:px-4">{renderStatusBadge(req.status)}</td>
                <td className="py-3 px-3 sm:px-4 text-right">{renderActions(req)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {paginated.map((req) => (
        <motion.div
          key={req.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex flex-col space-y-2 sm:space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-900 truncate">{req.requisitionNumber}</p>
                <p className="text-xs text-gray-500">{format(new Date(req.createdAt), 'dd MMM yyyy')}</p>
              </div>
              {renderStatusBadge(req.status)}
            </div>
            <div className="text-xs text-gray-600">
              <p className="font-medium">{req.items?.length || 0} item{req.items?.length !== 1 ? 's' : ''}</p>
              <p className="truncate text-xs">{req.partnerNote || 'No note'}</p>
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
          className="px-3 sm:px-4 py-3 sm:py-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0"
        >
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div>
                <p className="font-semibold text-gray-900 text-xs sm:text-sm">{req.requisitionNumber}</p>
                <p className="text-xs text-gray-500">{format(new Date(req.createdAt), 'dd MMM yyyy')}</p>
              </div>
              <div className="flex-1 truncate">
                <p className="text-xs text-gray-600 truncate">{req.partnerNote || 'No note'}</p>
                <p className="text-xs text-gray-500">{req.items?.length || 0} items</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
            {renderStatusBadge(req.status)}
            {renderActions(req)}
          </div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute top-0 right-0 w-64 h-full bg-white shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Menu</h3>
                  <button onClick={() => setShowMobileMenu(false)}>
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="flex items-center gap-2 w-full p-2 text-xs text-gray-600 border border-gray-200 rounded hover:bg-primary-50"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                {isPartner && (
                  <button
                    onClick={() => {
                      navigate(`/${role}/dashboard/requisition/create`);
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center gap-2 w-full p-2 bg-primary-600 text-white text-xs rounded"
                  >
                    <Plus className="w-3 h-3" />
                    New Requisition
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Responsive */}
      <div className="sticky top-0 bg-white shadow-md z-30">
        <div className="px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMobile && (
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="p-2 text-gray-600 hover:text-primary-600"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <div>
                <h1 className="text-base sm:text-xl font-semibold text-gray-900">Requisition Management</h1>
                <p className="text-xs text-gray-500 hidden xs:block">Create, view and manage requisitions</p>
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-3">
              <motion.button whileHover={{ scale: 1.05 }} onClick={loadData} disabled={loading}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 hover:text-primary-600 border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </motion.button>
              {isPartner && (
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate(`/${role}/dashboard/requisition/create`)}
                  className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-3 sm:px-4 py-2 rounded font-medium shadow-md text-xs sm:text-sm">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">New Requisition</span>
                  <span className="sm:hidden">New</span>
                </motion.button>
              )}
            </div>

            {/* Mobile Actions (small buttons) */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-primary-600 disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {isPartner && (
                <button
                  onClick={() => navigate(`/${role}/dashboard/requisition/create`)}
                  className="p-2 bg-primary-600 text-white rounded shadow-md"
                  title="New Requisition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats - Responsive */}
      <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow border border-gray-100 p-3 sm:p-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 sm:p-3 bg-primary-50 rounded-full flex items-center justify-center">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-lg sm:text-xl font-semibold text-gray-900">{allRequisitions.length}</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow border border-gray-100 p-3 sm:p-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 sm:p-3 bg-green-50 rounded-full flex items-center justify-center">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Completed</p>
                <p className="text-lg sm:text-xl font-semibold text-gray-900">
                  {allRequisitions.filter(r => r.status === 'COMPLETED').length}
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow border border-gray-100 p-3 sm:p-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 sm:p-3 bg-orange-50 rounded-full flex items-center justify-center">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Partial</p>
                <p className="text-lg sm:text-xl font-semibold text-gray-900">
                  {allRequisitions.filter(r => r.status === 'PARTIALLY_FULFILLED').length}
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow border border-gray-100 p-3 sm:p-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 sm:p-3 bg-yellow-50 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Pending</p>
                <p className="text-lg sm:text-xl font-semibold text-gray-900">
                  {allRequisitions.filter(r => r.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Toolbar - Responsive */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="relative flex-1">
              <Search className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search requisitions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-4 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <div className="text-xs text-gray-500 sm:hidden">
                {viewMode === 'table' ? 'Table' : viewMode === 'grid' ? 'Grid' : 'List'}
              </div>
              <div className="flex items-center border border-gray-200 rounded">
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setViewMode('table')}
                  className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:text-primary-600'}`}
                  title="Table View">
                  <List className="w-3 h-3 sm:w-4 sm:h-4" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:text-primary-600'}`}
                  title="Grid View">
                  <Grid3X3 className="w-3 h-3 sm:w-4 sm:h-4" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:text-primary-600'}`}
                  title="List View">
                  <List className="w-3 h-3 sm:w-4 sm:h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs">{error}</div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow border border-gray-100 p-6 sm:p-8 text-center text-gray-600">
            <div className="inline-flex items-center space-x-2">
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs sm:text-sm">Loading requisitions...</span>
            </div>
          </div>
        ) : filteredRequisitions.length === 0 ? (
          <div className="bg-white rounded-lg shadow border border-gray-100 p-6 sm:p-8 text-center">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-lg font-semibold text-gray-900">
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
            <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg shadow-lg text-xs ${operationStatus.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
              {operationStatus.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
              <span className="font-medium">{operationStatus.message}</span>
              <motion.button whileHover={{ scale: 1.1 }} onClick={() => setOperationStatus(null)}>
                <X className="w-3 h-3" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {operationLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-xl">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-700 text-xs font-medium">Processing...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-900">Delete Requisition</h3>
                  <p className="text-xs text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs text-gray-700">
                  Are you sure you want to delete this requisition?
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 sm:gap-3">
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setDeleteConfirm(null)} className="px-3 sm:px-4 py-2 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50">
                  Cancel
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} onClick={handleDelete} className="px-3 sm:px-4 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700">
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-900">Reject Requisition</h3>
                  <p className="text-xs text-gray-500">Provide a reason for rejection</p>
                </div>
              </div>
              <div className="mb-4">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-xs sm:text-sm"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-end gap-2 sm:gap-3">
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => { setRejectConfirm(null); setRejectReason(''); }} className="px-3 sm:px-4 py-2 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50">
                  Cancel
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} onClick={handleReject} disabled={!rejectReason.trim()} className="px-3 sm:px-4 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
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