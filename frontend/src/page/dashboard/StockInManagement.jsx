import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Package, DollarSign, Hash, User, Check, AlertTriangle, Barcode, Calendar, Eye, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import stockInService from '../../services/stockinService';
import productService from '../../services/productService';
import UpsertStockInModal from '../../components/dashboard/stockin/UpsertStockInModel';
// import DeleteModal from '../../components/dashboard/stockin/DeleteStockInModel';
import ViewStockInModal from '../../components/dashboard/stockin/ViewStockInModal';
import { API_URL } from '../../api/api';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';
import stockOutService from '../../services/stockoutService';

const StockInManagement = ({ role }) => {
  const [stockIns, setStockIns] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredStockIns, setFilteredStockIns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStockIn, setSelectedStockIn] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);


  const { user: employeeData } = useEmployeeAuth()
  const { user: adminData } = useAdminAuth()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage,] = useState(5);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [stockInData, productData] = await Promise.all([
          stockInService.getAllStockIns(),
          productService.getAllProducts()
        ]);
        setStockIns(stockInData);
        setFilteredStockIns(stockInData);
        setProducts(productData);
      } catch (error) {
        showNotification(`Failed to fetch data: ${error.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

const handlePrint = (item) => {
  const imgUrl = stockOutService.getBarCodeUrlImage(item.sku);

  // Create a hidden iframe to handle printing
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

  // Generate multiple barcode <img> elements based on quantity
  let barcodeImages = "";
  for (let i = 0; i < item.quantity; i++) {
    barcodeImages += `<div class="barcode"><img src="${imgUrl}" alt="Barcode" /></div>`;
  }

  iframeDoc.write(`
    <html>
      <head>
        <title>Print Barcode</title>
        <style>
          body {
            display: grid;
            grid-template-columns: repeat(1, 1fr);
            gap: 20px;
            padding: 20px;
            margin: 0;
          }
          .barcode {
            display: flex;
            justify-content: center;
            align-items: center;
            border: 1px dashed #ccc; /* optional for alignment preview */
            padding: 10px;
          }
          img {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        ${barcodeImages}
      </body>
    </html>
  `);
  iframeDoc.close();

  // Wait for images to load before printing
  const images = iframeDoc.querySelectorAll("img");
  let loadedCount = 0;

  images.forEach((img) => {
    img.onload = () => {
      loadedCount++;
      if (loadedCount === images.length) {
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }
    };

    img.onerror = () => {
      showNotification("Failed to load barcode image", "error");
      document.body.removeChild(iframe);
    };
  });
};

  useEffect(() => {
    const filtered = stockIns.filter(stockIn =>
      stockIn.product?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockIn.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockIn.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStockIns(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, stockIns]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredStockIns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredStockIns.slice(startIndex, endIndex);

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

  const handleAddStockIn = async (stockInData) => {
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
    let totalItems = 0;

    // Handle multiple vs single purchases
    if (stockInData.purchases && Array.isArray(stockInData.purchases)) {
      // Validate purchases array
      if (stockInData.purchases.length === 0) {
        throw new Error('At least one purchase is required');
      }

      // Calculate total items for notification
      totalItems = stockInData.purchases.reduce((sum, purchase) => sum + (purchase.quantity || 0), 0);

      // Create multiple purchases
      result = await stockInService.createMultipleStockIn(stockInData.purchases, userInfo);
      successMessage = `Successfully added ${stockInData.purchases.length} purchase${stockInData.purchases.length > 1 ? 's' : ''} (${totalItems} total items)`;
    } else {
      // Single purchase
      const singleStockData = {
        ...stockInData,
        ...userInfo
      };
      
      // Validate required fields
      if (!singleStockData.productId || !singleStockData.quantity || !singleStockData.price || !singleStockData.sellingPrice) {
        throw new Error('Missing required fields');
      }

      // eslint-disable-next-line no-unused-vars
      result = await stockInService.createStockIn(singleStockData);
      successMessage = `Stock entry added successfully! (${singleStockData.quantity} items)`;
    }

    // Refresh the stock list
    const updatedStockIns = await stockInService.getAllStockIns();
    setStockIns(updatedStockIns);
    
    // Close modal and show success notification
    setIsAddModalOpen(false);
    showNotification(successMessage);

    // Optional: Additional success actions
    // You could add analytics tracking, audit logging, etc. here

  } catch (error) {
    console.error('Error adding stock:', error);
    
    // More specific error messages
    let errorMessage = 'Failed to add stock entry';
    if (error.message.includes('required')) {
      errorMessage = 'Please fill in all required fields';
    } else if (error.message.includes('authentication')) {
      errorMessage = 'Please log in again';
    } else {
      errorMessage = `Failed to add stock entry: ${error.message}`;
    }
    
    showNotification(errorMessage, 'error');
  } finally {
    setIsLoading(false);
  }
};
  const handleEditStockIn = async (stockInData) => {
    setIsLoading(true);
    try {
      if (role == 'admin') {
        stockInData.adminId = adminData.id
      }
      if (role == 'employee') {
        stockInData.employeeId = employeeData.id
      }
      await stockInService.updateStockIn(selectedStockIn.id, stockInData);
      const updatedStockIns = await stockInService.getAllStockIns();
      setStockIns(updatedStockIns);
      setIsEditModalOpen(false);
      setSelectedStockIn(null);
      showNotification('Stock entry updated successfully!');
    } catch (error) {
      showNotification(`Failed to update stock entry: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // const handleDeleteStockIn = async () => {
  //   setIsLoading(true);
  //   try {
  //     await stockInService.deleteStockIn(selectedStockIn.id);
  //     setStockIns(prev => prev.filter(stock => stock.id !== selectedStockIn.id));
  //     setIsDeleteModalOpen(false);
  //     setSelectedStockIn(null);
  //     showNotification('Stock entry deleted successfully!');
  //   } catch (error) {
  //     showNotification(`Failed to delete stock entry: ${error.message}`, 'error');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const openEditModal = (stockIn) => {
    setSelectedStockIn(stockIn);
    setIsEditModalOpen(true);
  };

  const openViewModal = (stockIn) => {
    setSelectedStockIn(stockIn);
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
    }).format(price);
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
  // eslint-disable-next-line no-empty-pattern
  const PaginationComponent = ({ }) => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredStockIns.length)} of {filteredStockIns.length} entries
        </p>
        {/* {showItemsPerPage && filteredStockIns.length > 0 && (
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
        )} */}
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
        {currentItems.map((stockIn) => (
          <div key={stockIn.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {stockIn.product?.productName || 'Unknown Product'}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-500">In Stock</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openViewModal(stockIn)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Eye size={16} />
                  </button>
                       <button
                      onClick={() => handlePrint(stockIn)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Printer size={16} />
                    </button>
                  <button
                    onClick={() => openEditModal(stockIn)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Hash size={14} />
                  <span>Qty: {stockIn.quantity}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign size={14} />
                  <span>Unit Price: {formatPrice(stockIn.price)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign size={14} />
                  <span className="font-medium">Total: {formatPrice(stockIn.totalPrice)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign size={14} />
                  <span className="font-medium">Sell Price: {formatPrice(stockIn.sellingPrice)}</span>
                </div>
                {stockIn.supplier && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User size={14} />
                    <span className="truncate">{stockIn.supplier}</span>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">SKU & Barcode</div>
                {stockIn.sku && (
                  <div className="flex items-center gap-2 mb-2">
                    <Barcode size={14} className="text-gray-500" />
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {stockIn.sku}
                    </span>
                  </div>
                )}
                {stockIn.barcodeUrl && (
                  <img
                    src={`${API_URL}${stockIn.barcodeUrl}`}
                    alt="Barcode"
                    className="h-8 object-contain"
                  />
                )}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} />
                  <span>Added {formatDate(stockIn.createdAt)}</span>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sell Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((stockIn, index) => (
              <tr key={stockIn.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {startIndex + index + 1}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white">
                      <Package size={16} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {stockIn.product?.productName || 'Unknown Product'}
                      </div>
                      {stockIn.sku && (
                        <div className="text-sm text-gray-500">{stockIn.sku}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Hash size={14} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{stockIn.quantity || 0}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">
                    {formatPrice(stockIn.price || 0)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-semibold text-primary-600">
                    {formatPrice(stockIn.totalPrice || 0)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-semibold text-primary-600">
                    {formatPrice(stockIn.sellingPrice || 0)}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {formatDate(stockIn.createdAt)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openViewModal(stockIn)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handlePrint(stockIn)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      onClick={() => openEditModal(stockIn)}
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
      <PaginationComponent showItemsPerPage={true} />
    </div>
  );

  return (
    <div className="bg-gray-50 p-4 h-[90vh] sm:p-6 lg:p-8">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          } animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}

      <div className="h-full overflow-y-auto mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-600 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Stock In Management</h1>
          </div>
          <p className="text-gray-600">Manage your inventory stock entries and track incoming stock</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by product, supplier, or SKU..."
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
              Add Stock Entry
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-gray-600 mt-4">Loading stock entries...</p>
          </div>
        ) : filteredStockIns.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stock entries found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first stock entry.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus size={20} />
                Add Stock Entry
              </button>
            )}
          </div>
        ) : (
          <>
            <CardView />
            <TableView />
          </>
        )}

        <UpsertStockInModal
          isOpen={isAddModalOpen || isEditModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            setSelectedStockIn(null);
          }}
          onSubmit={isEditModalOpen ? handleEditStockIn : handleAddStockIn}
          stockIn={selectedStockIn}
          products={products}
          isLoading={isLoading}
          title={isEditModalOpen ? 'Edit Stock Entry' : 'Add New Stock Entry'}
        />

        <ViewStockInModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedStockIn(null);
          }}
          stockIn={selectedStockIn}
        />
      </div>
    </div>
  );
};

export default StockInManagement;