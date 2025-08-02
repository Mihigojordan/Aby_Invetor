import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Eye, Package, DollarSign, Hash, User, Check, AlertTriangle, Calendar, ChevronLeft, ChevronRight, RotateCcw, FileText } from 'lucide-react';
import salesReturnService from '../../services/SaleReturnService';
import UpsertSalesReturnModal from '../../components/dashboard/salesReturn/UpsertSalesReturnModal';
import ViewSalesReturnModal from '../../components/dashboard/salesReturn/ViewSalesReturnModal';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';

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

  const { user: employeeData } = useEmployeeAuth();
  const { user: adminData } = useAdminAuth();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const salesReturnData = await salesReturnService.getAllSalesReturns();
        
        // Ensure we always have an array
        const dataArray = Array.isArray(salesReturnData) ? salesReturnData : 
                         (salesReturnData?.data && Array.isArray(salesReturnData.data)) ? salesReturnData.data :
                         [];
        
        setSalesReturns(dataArray);
        setFilteredSalesReturns(dataArray);
      } catch (error) {
        console.error('Error fetching sales returns:', error);
        showNotification(`Failed to fetch sales returns: ${error.message}`, 'error');
        // Set empty arrays on error to prevent slice issues
        setSalesReturns([]);
        setFilteredSalesReturns([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Ensure salesReturns is always an array before filtering
    const salesReturnsArray = Array.isArray(salesReturns) ? salesReturns : [];
    
    const filtered = salesReturnsArray.filter(salesReturn =>
      salesReturn?.stockout?.product?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      salesReturn?.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      salesReturn?.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredSalesReturns(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, salesReturns]);

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

    // Adjust start page if we're near the end
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
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddSalesReturn = async (returnData) => {
    setIsLoading(true);
    try {
      // Validate user data
      if (!adminData?.id && !employeeData?.id) {
        throw new Error('User authentication required');
      }

      // Prepare user identification data
      const userInfo = {};
      if (role === 'admin' && adminData?.id) {
        userInfo.adminId = adminData.id;
      }
      if (role === 'employee' && employeeData?.id) {
        userInfo.employeeId = employeeData.id;
      }

      let result;
      let successMessage;

      // Handle multiple vs single returns
      if (returnData.returns && Array.isArray(returnData.returns)) {
        // Validate returns array
        if (returnData.returns.length === 0) {
          throw new Error('At least one return is required');
        }

        // Create multiple returns with user info
        const returnsWithUser = {
          returns: returnData.returns,
          ...userInfo
        };

        result = await salesReturnService.createSalesReturn(returnsWithUser);
        successMessage = `Successfully processed ${returnData.returns.length} return${returnData.returns.length > 1 ? 's' : ''}`;
      } else {
        // Single return
        const singleReturnData = {
          returns: [{
            transactionId: returnData.transactionId,
            reason: returnData.reason,
            createdAt: returnData.createdAt
          }],
          ...userInfo
        };
        
        // Validate required fields
        if (!returnData.transactionId) {
          throw new Error('Transaction ID is required');
        }

        result = await salesReturnService.createSalesReturn(singleReturnData);
        successMessage = 'Sales return processed successfully!';
      }

      // Refresh the sales returns list
      const updatedSalesReturns = await salesReturnService.getAllSalesReturns();
      
      // Ensure updated data is an array
      const updatedDataArray = Array.isArray(updatedSalesReturns) ? updatedSalesReturns : 
                              (updatedSalesReturns?.data && Array.isArray(updatedSalesReturns.data)) ? updatedSalesReturns.data :
                              [];
      
      setSalesReturns(updatedDataArray);
      
      // Close modal and show success notification
      setIsAddModalOpen(false);
      showNotification(successMessage);

    } catch (error) {
      console.error('Error processing sales return:', error);
      
      // More specific error messages
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
      day: 'numeric'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const truncateId = (id) => {
    return id ? `${id.substring(0, 8)}...` : 'N/A';
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

  // Pagination Component
  const PaginationComponent = ({ showItemsPerPage = true }) => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, safeFilteredReturns.length)} of {safeFilteredReturns.length} entries
        </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        {currentItems.map((salesReturn, index) => (
          <div key={salesReturn.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    <RotateCcw size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {salesReturn.stockout?.product?.productName || 'Unknown Product'}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                      <span className="text-xs text-gray-500">Returned</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openViewModal(salesReturn)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Hash size={14} />
                  <span>Return ID: {truncateId(salesReturn.id)}</span>
                </div>
                {salesReturn.stockout && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Hash size={14} />
                      <span>Qty Returned: {salesReturn.stockout.quantity}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign size={14} />
                      <span>Unit Price: {formatPrice(salesReturn.stockout.unitPrice)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign size={14} />
                      <span className="font-medium">Total Value: {formatPrice(salesReturn.stockout.totalPrice)}</span>
                    </div>
                  </>
                )}
                {salesReturn.reason && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <FileText size={14} className="mt-0.5" />
                    <span className="line-clamp-2">{salesReturn.reason}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} />
                  <span>Returned {formatDate(salesReturn.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination for Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <PaginationComponent showItemsPerPage={true} />
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Returned</th>
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
                  <span className="text-sm font-mono text-gray-900 bg-primary-50 px-2 py-1 rounded">
                    {truncateId(salesReturn.id)}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white">
                      <RotateCcw size={16} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {salesReturn.stockout?.product?.productName || 'Unknown Product'}
                      </div>
                      {salesReturn.stockout?.product?.sku && (
                        <div className="text-sm text-gray-500">{salesReturn.stockout.product.sku}</div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Hash size={14} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{salesReturn.stockout?.quantity || 0}</span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">
                    {formatPrice(salesReturn.stockout?.unitPrice || 0)}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-semibold text-primary-600">
                    {formatPrice(salesReturn.stockout?.totalPrice || 0)}
                  </span>
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
                  <div className="flex items-center gap-1">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {formatDate(salesReturn.createdAt)}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openViewModal(salesReturn)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Pagination */}
      <PaginationComponent showItemsPerPage={true} />
    </div>
  );

  return (
    <div className="bg-gray-50 p-4 h-[90vh] sm:p-6 lg:p-8">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-primary-500 text-white'
          } animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}

      <div className="h-full overflow-y-auto mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-600 rounded-lg">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Return Management</h1>
          </div>
          <p className="text-gray-600">Manage product returns and track returned inventory</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by product, reason, or return ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus size={20} />
              Process Return
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-gray-600 mt-4">Loading sales returns...</p>
          </div>
        ) : safeFilteredReturns.length === 0 ? (
          <div className="text-center py-12">
            <RotateCcw className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sales returns found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'No returns have been processed yet.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus size={20} />
                Process Return
              </button>
            )}
          </div>
        ) : (
          <>
            <CardView />
            <TableView />
          </>
        )}

        {/* Add Modal Placeholder - You'll need to create this component */}
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
          />
        )}

        {/* View Modal Placeholder - You'll need to create this component */}
        {isViewModalOpen && (
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