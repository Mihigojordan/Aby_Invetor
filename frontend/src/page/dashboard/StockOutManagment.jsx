import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, ShoppingCart, DollarSign, Hash, User, Check, AlertTriangle, Calendar, Eye, Phone, Mail, Package, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import stockOutService from '../../services/stockoutService';
import stockInService from '../../services/stockinService';
import UpsertStockOutModal from '../../components/dashboard/stockout/UpsertStockOutModal';
// import DeleteModal from '../../components/dashboard/stockout/DeleteStockOutModal';
import ViewStockOutModal from '../../components/dashboard/stockout/ViewStockOutModal';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';
import InvoiceComponent from '../../components/dashboard/stockout/InvoiceComponent';

const StockOutManagement = ({ role }) => {
  const [stockOuts, setStockOuts] = useState([]);
  const [stockIns, setStockIns] = useState([]);
  const [filteredStockOuts, setFilteredStockOuts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  //   const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStockOut, setSelectedStockOut] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isInvoiceNoteOpen,setIsInvoiceNoteOpen ] = useState(false)
  const [transactionId,setTransactionId ] = useState(null)

  const { user: employeeData } = useEmployeeAuth()
  const { user: adminData } = useAdminAuth()


  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [stockOutData, stockInData] = await Promise.all([
          stockOutService.getAllStockOuts(),
          stockInService.getAllStockIns()
        ]);
        setStockOuts(stockOutData);
        setFilteredStockOuts(stockOutData);
        setStockIns(stockInData);
      } catch (error) {
        showNotification(`Failed to fetch data: ${error.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const filtered = stockOuts.filter(stockOut =>
      stockOut.stockin?.product?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockOut.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockOut.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockOut.clientPhone?.includes(searchTerm) ||
      stockOut.transactionId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStockOuts(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, stockOuts]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredStockOuts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredStockOuts.slice(startIndex, endIndex);

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

useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trId = params.get("transactionId");

    if (trId?.trim()) {
      setTransactionId(trId)
      setIsInvoiceNoteOpen(true);
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

const handleCloseInvoiceModal = () => {
  setIsInvoiceNoteOpen(false);
  setTransactionId(null);
  updateSearchParam("transactionId");
};

const handleAddStockOut = async (stockOutData) => {
  setIsLoading(true);
  try {
    // Prepare user info
    const userInfo = {};
    if (role === 'admin') {
      userInfo.adminId = adminData.id;
    }
    if (role === 'employee') {
      userInfo.employeeId = employeeData.id;
    }

    // Check if it's multiple entries (new create mode) or single entry (legacy support)
    if (stockOutData.salesArray && Array.isArray(stockOutData.salesArray)) {
      // Multiple entries - use the new bulk create service
     const response =  await stockOutService.createMultipleStockOut(
        stockOutData.salesArray, 
        stockOutData.clientInfo || {}, 
        userInfo
      );
      updateSearchParam('transactionId',response.transactionId)
      setTransactionId(response.transactionId); // ← set it right away
setIsInvoiceNoteOpen(true);     
      showNotification(`Stock out transaction created successfully with ${stockOutData.salesArray.length} entries!`);
    } else {
      // Single entry - use existing single create service
      const singleEntryData = {
        ...stockOutData,
        ...userInfo
      };
      const  response = await stockOutService.createStockOut(singleEntryData);
      updateSearchParam('transactionId',response.transactionId)
      setTransactionId(response.transactionId); // ← set it right away
setIsInvoiceNoteOpen(true);     
      showNotification('Stock out entry added successfully!');
    }

    // Refresh the stock-out list
    const updatedStockOuts = await stockOutService.getAllStockOuts();
    setStockOuts(updatedStockOuts);
    setIsAddModalOpen(false);
  } catch (error) {
    console.error('Error adding stock out:', error);
    showNotification(`Failed to add stock out entry: ${error.message}`, 'error');
  } finally {
    setIsLoading(false);
  }
};

  const handleEditStockOut = async (stockOutData) => {
    setIsLoading(true);
    try {
      if(role == 'admin'){
        stockOutData.adminId = adminData.id
      }
      if (role == 'employee') {
        stockOutData.employeeId = employeeData.id
      }
      await stockOutService.updateStockOut(selectedStockOut.id, stockOutData);
      const updatedStockOuts = await stockOutService.getAllStockOuts();
      setStockOuts(updatedStockOuts);
      setIsEditModalOpen(false);
      setSelectedStockOut(null);
      showNotification('Stock out entry updated successfully!');
    } catch (error) {
      showNotification(`Failed to update stock out entry: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };


  //   const handleDeleteStockOut = async () => {
  //     setIsLoading(true);
  //     try {
  //       await stockOutService.deleteStockOut(selectedStockOut.id);
  //       setStockOuts(prev => prev.filter(stock => stock.id !== selectedStockOut.id));
  //       setIsDeleteModalOpen(false);
  //       setSelectedStockOut(null);
  //       showNotification('Stock out entry deleted successfully!');
  //     } catch (error) {
  //       showNotification(`Failed to delete stock out entry: ${error.message}`, 'error');
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  const openEditModal = (stockOut) => {
    setSelectedStockOut(stockOut);
    setIsEditModalOpen(true);
  };

  //   const openDeleteModal = (stockOut) => {
  //     setSelectedStockOut(stockOut);
  //     setIsDeleteModalOpen(true);
  //   };

  const openViewModal = (stockOut) => {
    setSelectedStockOut(stockOut);
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
      currency: 'RWF'
    }).format(price || 0);
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

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  // Pagination Component
  const PaginationComponent = ({ showItemsPerPage = true }) => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredStockOuts.length)} of {filteredStockOuts.length} entries
        </p>
        {showItemsPerPage && filteredStockOuts.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Show:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
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
        {currentItems.map((stockOut) => (
          <div key={stockOut.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {stockOut.stockin?.product?.productName || 'Sale Transaction'}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                      <span className="text-xs text-gray-500">Sold</span>
                    </div>
                    {stockOut.sku && (
                      <span className="text-xs text-gray-500 font-mono">{stockOut.sku}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openViewModal(stockOut)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => openEditModal(stockOut)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {stockOut.quantity && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Hash size={14} />
                    <span>Qty: {stockOut.quantity}</span>
                  </div>
                )}
                {stockOut.soldPrice && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign size={14} />
                    <span>Unit Price: {formatPrice(stockOut.soldPrice)}</span>
                  </div>
                )}
              </div>

              {/* Client Information */}
              {(stockOut.clientName || stockOut.clientEmail || stockOut.clientPhone) && (
                <div className="mb-4 p-3 bg-orange-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">Client</div>
                  {stockOut.clientName && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <User size={14} />
                      <span className="truncate">{stockOut.clientName}</span>
                    </div>
                  )}
                  {stockOut.clientEmail && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Mail size={14} />
                      <span className="truncate">{stockOut.clientEmail}</span>
                    </div>
                  )}
                  {stockOut.clientPhone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={14} />
                      <span>{stockOut.clientPhone}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} />
                  <span>Sold {formatDate(stockOut.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination for Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <PaginationComponent showItemsPerPage={false} />
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product/SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Sold</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((stockOut, index) => (
              <tr key={stockOut.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {startIndex + index + 1}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white">
                      <ShoppingCart size={16} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {stockOut.stockin?.product?.productName || 'Sale Transaction'}
                      </div>
                      {stockOut.transactionId && (
                        <div className="text-xs text-gray-500 font-mono">{stockOut.transactionId}</div>
                      )}
                      {stockOut.stockin?.product?.brand && (
                        <div className="text-sm text-gray-500">{stockOut.stockin.product.brand}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {stockOut.clientName ? (
                    <div className="flex flex-col gap-1">
                      {stockOut.clientName && (
                        <div className="flex items-center gap-1">
                          <User size={12} className="text-gray-400" />
                          <span className="text-sm text-gray-600 truncate max-w-32">
                            {stockOut.clientName}
                          </span>
                        </div>
                      )}
              
                            </div>
                  ) : (
                    <span className="text-sm text-gray-400">No client info</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {stockOut.quantity ? (
                    <div className="flex items-center gap-1">
                      <Hash size={14} className="text-gray-400" />
                      <span className="font-medium text-gray-900">{stockOut.quantity}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {stockOut.soldPrice ? (
                    <span className="font-medium text-gray-900">
                      {formatPrice(stockOut.soldPrice)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {formatDate(stockOut.createdAt)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openViewModal(stockOut)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => openEditModal(stockOut)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Pagination */}
      <PaginationComponent showItemsPerPage={false} />
    </div>
  );

  return (
    <div className="bg-gray-50 p-4 h-[90vh] sm:p-6 lg:p-8">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-primary-500 text-white' : 'bg-red-500 text-white'
          } animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}
      <InvoiceComponent isOpen={isInvoiceNoteOpen} onClose={handleCloseInvoiceModal} transactionId={transactionId} />

      <div className="h-full overflow-y-auto mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-600 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Out Management</h1>
          </div>
          <p className="text-gray-600">Manage your sales transactions and track outgoing stock</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by product, client, phone, or SKU..."
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
              Add Sale Transaction
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-gray-600 mt-4">Loading sales transactions...</p>
          </div>
        ) : filteredStockOuts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sales transactions found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by recording your first sale.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus size={20} />
                Add Sale Transaction
              </button>
            )}
          </div>
        ) : (
          <>
            <CardView />
            <TableView />
          </>
        )}

        <UpsertStockOutModal
          isOpen={isAddModalOpen || isEditModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            setSelectedStockOut(null);
          }}
          onSubmit={isEditModalOpen ? handleEditStockOut : handleAddStockOut}
          stockOut={selectedStockOut}
          stockIns={stockIns}
          isLoading={isLoading}
          title={isEditModalOpen ? 'Edit Sale Transaction' : 'Add New Sale Transaction'}
        />

        <ViewStockOutModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedStockOut(null);
          }}
          stockOut={selectedStockOut}
        />

        {/* <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedStockOut(null);
          }}
          onConfirm={handleDeleteStockOut}
          stockOut={selectedStockOut}
          isLoading={isLoading}
        /> */}
      </div>
    </div>
  );
};

export default StockOutManagement;