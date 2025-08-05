import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Eye, Package, DollarSign, Hash, User, Check, AlertTriangle, Calendar, ChevronLeft, ChevronRight, RotateCcw, FileText, Filter, Download, RefreshCw, TrendingUp } from 'lucide-react';
import salesReturnService from '../../services/salesReturnService';
import UpsertSalesReturnModal from '../../components/dashboard/salesReturn/UpsertSalesReturnModal';
import ViewSalesReturnModal from '../../components/dashboard/salesReturn/ViewSalesReturnModal';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';
import CreditNoteComponent from '../../components/dashboard/salesReturn/CreditNote';

const SalesReturnManagement = ({ role }) => {
  const [salesReturns, setSalesReturns] = useState([]);
  const [filteredSalesReturns, setFilteredSalesReturns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedSalesReturn, setSelectedSalesReturn] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    reason: 'all',
    startDate: '',
    endDate: ''
  });

  const [isCreditNoteOpen, setIsCreditNoteOpen] = useState(false)
  const [salesReturnId, setSalesReturnId] = useState(null)

  const { user: employeeData } = useEmployeeAuth();
  const { user: adminData } = useAdminAuth();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    fetchSalesReturns();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, salesReturns, filters]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const saleId = params.get("salesReturnId");

    if (saleId?.trim()) {
      setSalesReturnId(saleId)
      setIsCreditNoteOpen(true);
    }
  }, [])


  function updateSearchParam(key, value) {
    const params = new URLSearchParams(window.location.search);

    if (!value) {
      // Remove the key if value is null, undefined, or empty string
      params.delete(key);
    } else {
      // Add or update the key with the value
      params.set(key, value);
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, "", newUrl);
  }

  const handleCloseCreditModal = () => {
    setIsCreditNoteOpen(false);
    setSalesReturnId(null);
    updateSearchParam("salesReturnId");
  };

  const fetchSalesReturns = async () => {
    setIsLoading(true);
    try {
      const response = await salesReturnService.getAllSalesReturns();

      // Handle different response structures from backend
      const dataArray = Array.isArray(response) ? response :
        (response?.data && Array.isArray(response.data)) ? response.data :
          [];

      setSalesReturns(dataArray);
      setFilteredSalesReturns(dataArray);

      // Calculate statistics
      const stats = salesReturnService.calculateReturnStatistics(dataArray);
      setStatistics(stats);

    } catch (error) {
      console.error('Error fetching sales returns:', error);
      showNotification(`Failed to fetch sales returns: ${error.message}`, 'error');
      setSalesReturns([]);
      setFilteredSalesReturns([]);
      setStatistics(null);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    const salesReturnsArray = Array.isArray(salesReturns) ? salesReturns : [];

    let filtered = salesReturnsArray.filter(salesReturn => {
      // Search term filter
      const searchMatch = !searchTerm ||
        salesReturn?.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        salesReturn?.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        salesReturn?.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        salesReturn?.items?.some(item =>
          item?.stockout?.stockin?.product?.productName?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      // Date range filter
      let dateMatch = true;
      if (filters.dateRange !== 'all') {
        const returnDate = new Date(salesReturn.createdAt);
        const now = new Date();

        switch (filters.dateRange) {
          case 'today':
            dateMatch = returnDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateMatch = returnDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateMatch = returnDate >= monthAgo;
            break;
          case 'custom':
            if (filters.startDate && filters.endDate) {
              const startDate = new Date(filters.startDate);
              const endDate = new Date(filters.endDate);
              dateMatch = returnDate >= startDate && returnDate <= endDate;
            }
            break;
        }
      }

      // Reason filter
      const reasonMatch = filters.reason === 'all' ||
        (filters.reason === 'no-reason' && !salesReturn.reason) ||
        (filters.reason !== 'no-reason' && salesReturn.reason?.toLowerCase().includes(filters.reason.toLowerCase()));

      return searchMatch && dateMatch && reasonMatch;
    });

    setFilteredSalesReturns(filtered);
    setCurrentPage(1);
  };

  // Ensure filteredSalesReturns is always an array for pagination
  const safeFilteredReturns = Array.isArray(filteredSalesReturns) ? filteredSalesReturns : [];

  // Pagination calculations
  const totalPages = Math.ceil(safeFilteredReturns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = safeFilteredReturns.slice(startIndex, endIndex);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleAddSalesReturn = async (returnData) => {
    setIsLoading(true);
    try {
      // Validate user data
      if (!adminData?.id && !employeeData?.id) {
        throw new Error('User authentication required');
      }

      // Prepare data for backend (single return with items structure)
      const requestData = {
        transactionId: returnData.transactionId,
        reason: returnData.reason,
        createdAt: returnData.createdAt,
        items: returnData.items || [], // Array of {stockoutId, quantity}
        adminId: role === 'admin' && adminData?.id ? adminData.id : undefined,
        employeeId: role === 'employee' && employeeData?.id ? employeeData.id : undefined,
      };

      // Validate required fields
      if (!requestData.transactionId) {
        throw new Error('Transaction ID is required');
      }
      if (!requestData.items || requestData.items.length === 0) {
        throw new Error('At least one item must be provided');
      }

      const response = await salesReturnService.createSalesReturn(requestData);
      updateSearchParam('salesReturnId', response.salesReturn.id)
      setSalesReturnId(response.salesReturn.id); // ← set it right away
      setIsCreditNoteOpen(true);


      // Refresh the sales returns list
      await fetchSalesReturns();

      // Close modal and show success notification
      setIsAddModalOpen(false);
      showNotification('Sales return processed successfully!');

    } catch (error) {
      console.error('Error processing sales return:', error);

      let errorMessage = 'Failed to process sales return';
      if (error.message.includes('required')) {
        errorMessage = 'Please fill in all required fields';
      } else if (error.message.includes('authentication')) {
        errorMessage = 'Please log in again';
      } else {
        errorMessage = `Failed to process sales return: ${error.message}`;
      }

      showNotification(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openViewModal = (salesReturn) => {
    setSelectedSalesReturn(salesReturn);
    setIsViewModalOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF'
    }).format(price || 0);
  };

  const truncateId = (id) => {
    return id ? `${id.substring(0, 8)}...` : 'N/A';
  };

  const getTotalItemsCount = (salesReturn) => {
    return salesReturn.items ? salesReturn.items.length : 0;
  };

  const getTotalQuantity = (salesReturn) => {
    return salesReturn.items ?
      salesReturn.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
  };

  const getProductNames = (salesReturn) => {
    if (!salesReturn.items || salesReturn.items.length === 0) return 'No items';

    const names = salesReturn.items
      .map(item => item.stockout?.stockin?.product?.productName)
      .filter(name => name)
      .slice(0, 2);

    if (salesReturn.items.length > 2) {
      return `${names.join(', ')} +${salesReturn.items.length - 2} more`;
    }

    return names.join(', ') || 'Unknown products';
  };

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleRefresh = () => {
    fetchSalesReturns();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    showNotification('Export functionality will be implemented soon', 'info');
  };

  // Statistics Cards Component
  const StatisticsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Returns</p>
            <p className="text-2xl font-bold text-gray-900">{statistics?.totalReturns || 0}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <RotateCcw className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Items</p>
            <p className="text-2xl font-bold text-gray-900">{statistics?.totalItems || 0}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Quantity</p>
            <p className="text-2xl font-bold text-gray-900">{statistics?.totalQuantity || 0}</p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Avg Items/Return</p>
            <p className="text-2xl font-bold text-gray-900">{statistics?.averageItemsPerReturn || 0}</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Hash className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );

  // Filters Component
  const FiltersComponent = () => (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 mb-6 transition-all duration-300 ${showFilters ? 'p-6' : 'p-0 h-0 overflow-hidden'}`}>
      {showFilters && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {filters.dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </>
            )}

          
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilters({ dateRange: 'all', reason: 'all', startDate: '', endDate: '' })}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Pagination Component
  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, safeFilteredReturns.length)} of {safeFilteredReturns.length} entries
        </p>
        {/* <select
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
        </select> */}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${currentPage === 1
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${currentPage === page
                  ? 'bg-primary-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${currentPage === totalPages
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );

  // Card View Component (Mobile/Tablet)
  const CardView = () => (
    <div className="md:hidden">
      <div className="grid grid-cols-1 gap-4 mb-6">
        {currentItems.map((salesReturn, index) => (
          <div key={salesReturn.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                    <RotateCcw size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Return #{truncateId(salesReturn.id)}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-500">Processed</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openViewModal(salesReturn)}
                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <Eye size={16} />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Hash size={14} />
                  <span>Transaction: {salesReturn.transactionId || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package size={14} />
                  <span>Items: {getTotalItemsCount(salesReturn)} ({getTotalQuantity(salesReturn)} qty)</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <FileText size={14} className="mt-0.5" />
                  <span className="line-clamp-2">{getProductNames(salesReturn)}</span>
                </div>
                {salesReturn.reason && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <FileText size={14} className="mt-0.5" />
                    <span className="line-clamp-2">Reason: {salesReturn.reason}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} />
                  <span>{formatDate(salesReturn.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <PaginationComponent />
      </div>
    </div>
  );

  // Table View Component (Desktop)
  const TableView = () => (
    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((salesReturn, index) => (
              <tr key={salesReturn.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {startIndex + index + 1}
                  </span>
                </td>


                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">
                    {salesReturn.transactionId || 'N/A'}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <div className="font-medium">{getTotalItemsCount(salesReturn)} items</div>
                    <div className="text-gray-500">{getTotalQuantity(salesReturn)} qty total</div>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    <span className="text-sm text-gray-900 line-clamp-2">
                      {getProductNames(salesReturn)}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    {salesReturn.reason ? (
                      <span className="text-sm text-gray-600 line-clamp-2">
                        {salesReturn.reason}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">No reason provided</span>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600">
                    {formatDate(salesReturn.createdAt)}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => openViewModal(salesReturn)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationComponent />
    </div>
  );

  return (
    <div className="bg-gray-50 p-4 max-h-[90vh] overflow-y-auto sm:p-6 lg:p-8">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
          } animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}

      <CreditNoteComponent isOpen={isCreditNoteOpen} onClose={handleCloseCreditModal} salesReturnId={salesReturnId} />



      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-600 rounded-lg">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Return Management</h1>
          </div>
          <p className="text-gray-600">Manage product returns and track returned inventory</p>
        </div>

        {/* Statistics */}
        {statistics && <StatisticsCards />}

        {/* Search and Actions Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by transaction ID, reason, or return ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg font-medium transition-colors ${showFilters
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Filter size={20} />
                Filters
              </button>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
          
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
              >
                <Plus size={20} />
                Process Return
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <FiltersComponent />

        {/* Content */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
              <p className="text-gray-600">Loading sales returns...</p>
            </div>
          </div>
        ) : safeFilteredReturns.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <RotateCcw className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sales returns found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || showFilters ? 'Try adjusting your search terms or filters.' : 'No returns have been processed yet.'}
              </p>
              {!searchTerm && !showFilters && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <Plus size={20} />
                  Process Your First Return
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <CardView />
            <TableView />
          </>
        )}

        {/* Modals */}
        {isAddModalOpen && (
          <UpsertSalesReturnModal
            isOpen={isAddModalOpen}
            onClose={() => {
              setIsAddModalOpen(false);
              setSelectedSalesReturn(null);
            }}
            onSubmit={handleAddSalesReturn}
            isLoading={isLoading}
            title="Process Sales Return"
            currentUser={role === 'admin' ? adminData : employeeData}
            userRole={role}
          />
        )}

        {isViewModalOpen && selectedSalesReturn && (
          <ViewSalesReturnModal
            isOpen={isViewModalOpen}
            onClose={() => {
              setIsViewModalOpen(false);
              setSelectedSalesReturn(null);
            }}
            salesReturn={selectedSalesReturn}
          />
        )}
      </div>
    </div>
  );
};

export default SalesReturnManagement;