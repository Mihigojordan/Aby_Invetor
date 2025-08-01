import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Package, DollarSign, Hash, User, Check, AlertTriangle, Barcode, Calendar, Eye } from 'lucide-react';
import stockInService from '../../services/stockInService';
import productService from '../../services/productService';
import UpsertStockInModal from '../../components/dashboard/stockin/UpsertStockInModel';
import DeleteModal from '../../components/dashboard/stockin/DeleteStockInModel';
import ViewStockInModal from '../../components/dashboard/stockin/ViewStockInModal';
import { API_URL } from '../../api/api';

const StockInManagement = () => {
  const [stockIns, setStockIns] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredStockIns, setFilteredStockIns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStockIn, setSelectedStockIn] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

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

  useEffect(() => {
    const filtered = stockIns.filter(stockIn =>
      stockIn.product?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockIn.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockIn.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStockIns(filtered);
  }, [searchTerm, stockIns]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddStockIn = async (stockInData) => {
    setIsLoading(true);
    try {
      const newStockIn = await stockInService.createStockIn(stockInData);
      const updatedStockIns = await stockInService.getAllStockIns();
      setStockIns(updatedStockIns);
      setIsAddModalOpen(false);
      showNotification('Stock entry added successfully!');
    } catch (error) {
      showNotification(`Failed to add stock entry: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStockIn = async (stockInData) => {
    setIsLoading(true);
    try {
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

  const handleDeleteStockIn = async () => {
    setIsLoading(true);
    try {
      await stockInService.deleteStockIn(selectedStockIn.id);
      setStockIns(prev => prev.filter(stock => stock.id !== selectedStockIn.id));
      setIsDeleteModalOpen(false);
      setSelectedStockIn(null);
      showNotification('Stock entry deleted successfully!');
    } catch (error) {
      showNotification(`Failed to delete stock entry: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (stockIn) => {
    setSelectedStockIn(stockIn);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (stockIn) => {
    setSelectedStockIn(stockIn);
    setIsDeleteModalOpen(true);
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
      currency: 'USD'
    }).format(price);
  };

  const truncateId = (id) => {
    return id ? `${id.substring(0, 8)}...` : 'N/A';
  };

  // Card View Component (Mobile/Tablet)
  const CardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:hidden">
      {filteredStockIns.map((stockIn) => (
        <div key={stockIn.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
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
                  onClick={() => openEditModal(stockIn)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit3 size={16} />
                </button>
                {/* <button
                  onClick={() => openDeleteModal(stockIn)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button> */}
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
                <span className="font-medium">Total: {formatPrice(stockIn.sellingPrice)}</span>
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
  );

  // Table View Component (Desktop)
  const TableView = () => (
    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode & SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sell Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStockIns.map((stockIn) => (
              <tr key={stockIn.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {truncateId(stockIn.id)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-2">
                    {stockIn.barcodeUrl && (
                      <img 
                        src={`${API_URL}${stockIn.barcodeUrl}`} 
                        alt="Barcode" 
                        className="h-6 object-contain"
                      />
                    )}
                    {stockIn.sku && (
                      <div className="flex items-center gap-1">
                        <Barcode size={12} className="text-gray-400" />
                        <span className="text-xs font-mono text-gray-600">
                          {stockIn.sku}
                        </span>
                      </div>
                    )}
                    {!stockIn.barcodeUrl && !stockIn.sku && (
                      <span className="text-sm text-gray-400">No barcode/SKU</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                      <Package size={16} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {stockIn.product?.productName || 'Unknown Product'}
                      </div>
                      {stockIn.product?.brand && (
                        <div className="text-sm text-gray-500">{stockIn.product.brand}</div>
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
                  <span className="font-semibold text-blue-600">
                    {formatPrice(stockIn.totalPrice || 0)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-semibold text-blue-600">
                    {formatPrice(stockIn.sellingPrice || 0)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {stockIn.supplier ? (
                    <div className="flex items-center gap-1">
                      <User size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-600 truncate max-w-32">
                        {stockIn.supplier}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">No supplier</span>
                  )}
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
                      onClick={() => openEditModal(stockIn)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={16} />
                    </button>
                    {/* <button
                      onClick={() => openDeleteModal(stockIn)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button> */}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filteredStockIns.length} of {stockIns.length} stock entries
          </p>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100 transition-colors">
              Previous
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
              1
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100 transition-colors">
              2
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100 transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 p-4 h-[90vh] sm:p-6 lg:p-8">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        } animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}

      <div className="h-full overflow-y-auto mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
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
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus size={20} />
              Add Stock Entry
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
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

        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedStockIn(null);
          }}
          onConfirm={handleDeleteStockIn}
          stockIn={selectedStockIn}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default StockInManagement;