import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, ShoppingCart, DollarSign, Hash, User, Check, AlertTriangle, Calendar, Eye, Phone, Mail, Package, TrendingUp } from 'lucide-react';
import stockOutService from '../../services/stockOutService';
import stockInService from '../../services/stockInService';
import UpsertStockOutModal from '../../components/dashboard/stockout/UpsertStockOutModal';
// import DeleteModal from '../../components/dashboard/stockout/DeleteStockOutModal';
import ViewStockOutModal from '../../components/dashboard/stockout/ViewStockOutModal';

const StockOutManagement = () => {
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
      stockOut.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStockOuts(filtered);
  }, [searchTerm, stockOuts]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddStockOut = async (stockOutData) => {
    setIsLoading(true);
    try {
      await stockOutService.createStockOut(stockOutData);
      const updatedStockOuts = await stockOutService.getAllStockOuts();
      setStockOuts(updatedStockOuts);
      setIsAddModalOpen(false);
      showNotification('Stock out entry added successfully!');
    } catch (error) {
      showNotification(`Failed to add stock out entry: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStockOut = async (stockOutData) => {
    setIsLoading(true);
    try {
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
      currency: 'USD'
    }).format(price || 0);
  };

  const truncateId = (id) => {
    return id ? `${id.substring(0, 8)}...` : 'N/A';
  };

  const calculateRevenue = (stockOut) => {
    return (stockOut.quantity || 0) * (stockOut.soldPrice || 0);
  };

  const calculateProfit = (stockOut) => {
    if (!stockOut.stockin || !stockOut.quantity || !stockOut.soldPrice) return 0;
    const costPrice = stockOut.stockin.price || 0;
    const soldPrice = stockOut.soldPrice || 0;
    return (soldPrice - costPrice) * stockOut.quantity;
  };

  // Card View Component (Mobile/Tablet)
  const CardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:hidden">
      {filteredStockOuts.map((stockOut) => (
        <div key={stockOut.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {stockOut.stockin?.product?.productName || 'Sale Transaction'}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
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
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => openEditModal(stockOut)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit3 size={16} />
                </button>
                {/* <button
                  onClick={() => openDeleteModal(stockOut)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button> */}
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
              {/* {stockOut.quantity && stockOut.soldPrice && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <TrendingUp size={14} />
                  <span className="font-medium text-green-600">Revenue: {formatPrice(calculateRevenue(stockOut))}</span>
                </div>
              )} */}
              {/* {stockOut.stockin && stockOut.quantity && stockOut.soldPrice && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign size={14} />
                  <span className={`font-medium ${calculateProfit(stockOut) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Profit: {formatPrice(calculateProfit(stockOut))}
                  </span>
                </div>
              )} */}
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
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th> */}
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th> */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Sold</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStockOuts.map((stockOut) => (
              <tr key={stockOut.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {truncateId(stockOut.id)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                      <ShoppingCart size={16} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {stockOut.stockin?.product?.productName || 'Sale Transaction'}
                      </div>
                      {stockOut.sku && (
                        <div className="text-xs text-gray-500 font-mono">{stockOut.sku}</div>
                      )}
                      {stockOut.stockin?.product?.brand && (
                        <div className="text-sm text-gray-500">{stockOut.stockin.product.brand}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {stockOut.clientName || stockOut.clientEmail || stockOut.clientPhone ? (
                    <div className="flex flex-col gap-1">
                      {stockOut.clientName && (
                        <div className="flex items-center gap-1">
                          <User size={12} className="text-gray-400" />
                          <span className="text-sm text-gray-600 truncate max-w-32">
                            {stockOut.clientName}
                          </span>
                        </div>
                      )}
                      {stockOut.clientEmail && (
                        <div className="flex items-center gap-1">
                          <Mail size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-500 truncate max-w-32">
                            {stockOut.clientEmail}
                          </span>
                        </div>
                      )}
                      {stockOut.clientPhone && (
                        <div className="flex items-center gap-1">
                          <Phone size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {stockOut.clientPhone}
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
                {/* <td className="px-6 py-4 whitespace-nowrap">
                  {stockOut.quantity && stockOut.soldPrice ? (
                    <span className="font-semibold text-green-600">
                      {formatPrice(calculateRevenue(stockOut))}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">N/A</span>
                  )}
                </td> */}
                {/* <td className="px-6 py-4 whitespace-nowrap">
                  {stockOut.stockin && stockOut.quantity && stockOut.soldPrice ? (
                    <span className={`font-semibold ${calculateProfit(stockOut) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPrice(calculateProfit(stockOut))}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">N/A</span>
                  )}
                </td> */}
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
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={16} />
                    </button>
                    {/* <button
                      onClick={() => openDeleteModal(stockOut)}
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
            Showing {filteredStockOuts.length} of {stockOuts.length} sales transactions
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
          notification.type === 'success' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
        } animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}

      <div className="h-full overflow-y-auto mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
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
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus size={20} />
              Add Sale Transaction
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
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