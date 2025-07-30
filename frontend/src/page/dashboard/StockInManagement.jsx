import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Package, DollarSign, Hash, User, Check, AlertTriangle, Barcode, Calendar } from 'lucide-react';
import stockInService from '../../services/stockInService';
import productService from '../../services/productService';
import UpsertStockInModal from '../../components/dashboard/stockin/UpsertStockInModel';
import DeleteModal from '../../components/dashboard/stockin/DeleteStockInModel';




const StockInManagement = () => {
  const [stockIns, setStockIns] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredStockIns, setFilteredStockIns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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
      // Refresh the list to get the updated data with product details
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
      // Refresh the list to get the updated data
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
            <p className="text-gray-600">Loading stock entries...</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStockIns.map((stockIn) => (
              <div key={stockIn.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
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
                        onClick={() => openEditModal(stockIn)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(stockIn)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
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
                        src={stockIn.barcodeUrl} 
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