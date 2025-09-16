
import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Package, DollarSign, Hash, User, Check, AlertTriangle, Barcode, Calendar, Eye, RefreshCw, ChevronLeft, ChevronRight, Printer, Wifi, WifiOff, RotateCcw, TrendingUp } from 'lucide-react';
import productService from '../../services/productService';
import UpsertStockInModal from '../../components/dashboard/stockin/UpsertStockInModel';
import DeleteStockInModal from '../../components/dashboard/stockin/DeleteStockInModel';
import ViewStockInModal from '../../components/dashboard/stockin/ViewStockInModal';
import  useEmployeeAuth  from '../../context/EmployeeAuthContext';
import  useAdminAuth  from '../../context/AdminAuthContext';
import stockOutService from '../../services/stockoutService';
import stockInService from '../../services/stockinService';
import { db } from '../../db/database';
import { useStockInOfflineSync } from '../../hooks/useStockInOfflineSync';
import { useNetworkStatusContext } from '../../context/useNetworkContext';
import { useNavigate } from 'react-router-dom';

const StockInManagement = ({ role }) => {
  const [stockIns, setStockIns] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredStockIns, setFilteredStockIns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStockIn, setSelectedStockIn] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const { isOnline } = useNetworkStatusContext();
  const { user: employeeData } = useEmployeeAuth();
  const { user: adminData } = useAdminAuth();
  const { triggerSync, syncError } = useStockInOfflineSync();
  const [itemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    if (isOnline) handleManualSync();
  }, [isOnline]);

  useEffect(() => {
    if (syncError) {
      showNotification(`Sync status error: ${syncError}`, 'error');
    }
  }, [syncError]);

  useEffect(() => {
    let filtered = stockIns || [];
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(stockIn =>
        stockIn.product?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stockIn.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stockIn.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    // Apply date filter
    if (startDate || endDate) {
      filtered = filtered.filter(stockIn => {
        const stockDate = new Date(stockIn.createdAt || stockIn.lastModified);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start && end && start > end) return true; // Invalid range, show all
        if (start && stockDate < start) return false;
        if (end) {
          end.setHours(23, 59, 59, 999); // Include entire end date
          if (stockDate > end) return false;
        }
        return true;
      });
    }
    setFilteredStockIns(filtered);
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, stockIns]);

  const fetchProducts = async () => {
    try {
      if (isOnline) {
        const response = await productService.getAllProducts();
        for (const p of response.products || response) {
          await db.products_all.put({
            id: p.id,
            productName: p.productName,
            categoryId: p.categoryId,
            description: p.description,
            brand: p.brand,
            lastModified: p.createdAt || new Date(),
            updatedAt: p.updatedAt || new Date()
          });
        }
      }
      const [allProducts, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
        db.products_all.toArray(),
        db.products_offline_add.toArray(),
        db.products_offline_update.toArray(),
        db.products_offline_delete.toArray()
      ]);
      const deleteIds = new Set(offlineDeletes.map(d => d.id));
      const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));
      const combinedProducts = allProducts
        .filter(c => !deleteIds.has(c.id))
        .map(c => ({ ...c, ...updateMap.get(c.id), synced: true }))
        .concat(offlineAdds.map(a => ({ ...a, synced: false })))
        .sort((a, b) => a.synced - b.synced);
      return combinedProducts;
    } catch (error) {
      console.error('Error fetching products:', error);
      const [allProducts, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
        db.products_all.toArray(),
        db.products_offline_add.toArray(),
        db.products_offline_update.toArray(),
        db.products_offline_delete.toArray()
      ]);
      const deleteIds = new Set(offlineDeletes.map(d => d.id));
      const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));
      const combinedProducts = allProducts
        .filter(c => !deleteIds.has(c.id))
        .map(c => ({ ...c, ...updateMap.get(c.id), synced: true }))
        .concat(offlineAdds.map(a => ({ ...a, synced: false })))
        .sort((a, b) => a.synced - b.synced);
      return combinedProducts;
    }
  };

  const loadData = async (showRefreshLoader = false) => {
    if (showRefreshLoader) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const productData = await fetchProducts();
      setProducts(productData);
      if (isOnline) await triggerSync();
      const [allStockIns, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
        db.stockins_all.toArray(),
        db.stockins_offline_add.toArray(),
        db.stockins_offline_update.toArray(),
        db.stockins_offline_delete.toArray()
      ]);
      const deleteIds = new Set(offlineDeletes.map(d => d.id));
      const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));
      const combinedStockIns = allStockIns
        .filter(s => !deleteIds.has(s.id))
        .map(s => ({
          ...s,
          ...updateMap.get(s.id),
          synced: true,
          product: productData.find(p => p.id === s.productId) || { productName: 'Unknown Product' }
        }))
        .concat(offlineAdds.map(a => ({
          ...a,
          synced: false,
          product: productData.find(p => p.id === a.productId || p.localId === a.productId) || { productName: 'Unknown Product' }
        }))).sort((a, b) => a.synced - b.synced);
      setStockIns(combinedStockIns);
      setFilteredStockIns(combinedStockIns);
      if (showRefreshLoader) {
        showNotification('Stock entries refreshed successfully!');
      }
      if (!isOnline && combinedStockIns.length === 0) {
        showNotification('No offline data available', 'error');
      }
    } catch (error) {
      console.error('Error loading stock-ins:', error);
      showNotification('Failed to load stock-ins', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddStockIn = async (stockInData) => {
    setIsLoading(true);
    try {
      if (!adminData?.id && !employeeData?.id) {
        throw new Error('User authentication required');
      }
      const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      const now = new Date();
      if (stockInData.purchases && Array.isArray(stockInData.purchases)) {
        const purchases = stockInData.purchases.map(purchase => ({
          ...purchase,
          ...userData,
          lastModified: now,
          createdAt: now,
          updatedAt: now
        }));
        const localIds = [];
        for (const purchase of purchases) {
          const localId = await db.stockins_offline_add.add({ ...purchase, offlineQuantity: purchase.quantity });
          localIds.push(localId);
        }
        if (isOnline) {
          try {
            const response = await stockInService.createMultipleStockIn(purchases, userData);
            await db.transaction('rw', db.stockins_all, db.stockins_offline_add, db.synced_stockin_ids, async () => {
              for (let i = 0; i < response.stockIn.data.length; i++) {
                const serverStockIn = response.stockIn.data[i];
                await db.stockins_all.put({
                  id: serverStockIn.id,
                  productId: serverStockIn.productId,
                  quantity: serverStockIn.quantity,
                  price: serverStockIn.price,
                  sellingPrice: serverStockIn.sellingPrice,
                  supplier: serverStockIn.supplier,
                  sku: serverStockIn.sku,
                  barcodeUrl: serverStockIn.barcodeUrl,
                  lastModified: now,
                  updatedAt: serverStockIn.updatedAt || now
                });
                await db.synced_stockin_ids.add({
                  localId: localIds[i],
                  serverId: serverStockIn.id,
                  syncedAt: now
                });
                await db.stockins_offline_add.delete(localIds[i]);
              }
            });
            showNotification(`Successfully added ${purchases.length} stock entries (${purchases.reduce((sum, p) => sum + p.quantity, 0)} total items)!`);
          } catch (error) {
            showNotification('Stock entries saved offline (will sync when online)', 'warning');
          }
        } else {
          showNotification('Stock entries saved offline (will sync when online)', 'warning');
        }
      } else {
        const newStockIn = {
          ...stockInData,
          ...userData,
          lastModified: now,
          createdAt: now,
          updatedAt: now
        };
        if (!newStockIn.productId || !newStockIn.quantity || !newStockIn.price || !newStockIn.sellingPrice) {
          throw new Error('Missing required fields');
        }
        const localId = await db.stockins_offline_add.add({ ...newStockIn, offlineQuantity: newStockIn.quantity });
        if (isOnline) {
          try {
            const response = await stockInService.createStockIn(newStockIn);
            await db.transaction('rw', db.stockins_all, db.stockins_offline_add, db.synced_stockin_ids, async () => {
              const serverStockInId = response.stockIn.data?.[0]?.id || response.id;
              await db.stockins_all.put({
                id: serverStockInId,
                productId: newStockIn.productId,
                quantity: newStockIn.quantity,
                price: newStockIn.price,
                sellingPrice: newStockIn.sellingPrice,
                supplier: newStockIn.supplier,
                sku: response.stockIn.data?.[0]?.sku,
                barcodeUrl: response.stockIn.data?.[0]?.barcodeUrl,
                lastModified: now,
                updatedAt: response.updatedAt || now
              });
              await db.synced_stockin_ids.add({
                localId: localId,
                serverId: serverStockInId,
                syncedAt: now
              });
              await db.stockins_offline_add.delete(localId);
            });
            showNotification(`Stock entry added successfully (${newStockIn.quantity} items)!`);
          } catch (error) {
            showNotification('Stock entry saved offline (will sync when online)', 'warning');
          }
        } else {
          showNotification('Stock entry saved offline (will sync when online)', 'warning');
        }
      }
      await loadData();
      setIsAddModalOpen(false);
      navigate(role === 'admin' ? '/admin/dashboard/stockin' : '/employee/dashboard/stockin', { replace: true });
    } catch (error) {
      console.error('Error adding stock-in:', error);
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
      const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      const now = new Date();
      if (!isOnline && stockInData && stockInData.localId && !stockInData.synced) {
        await db.stockins_offline_add.update(stockInData.localId, {
          ...stockInData,
          ...userData,
          lastModified: now,
          updatedAt: now
        });
        await loadData();
        setIsEditModalOpen(false);
        setSelectedStockIn(null);
        navigate(role === 'admin' ? '/admin/dashboard/stockin' : '/employee/dashboard/stockin', { replace: true });
        return;
      }
      const updatedData = {
        id: selectedStockIn.id,
        quantity: stockInData.quantity,
        price: stockInData.price,
        sellingPrice: stockInData.sellingPrice,
        supplier: stockInData.supplier,
        ...userData,
        lastModified: now,
        updatedAt: now
      };
      if (isOnline) {
        try {
          await stockInService.updateStockIn(selectedStockIn.id, updatedData);
          await db.transaction('rw', db.stockins_all, db.stockins_offline_update, async () => {
            await db.stockins_all.put({
              id: selectedStockIn.id,
              productId: selectedStockIn.productId,
              quantity: updatedData.quantity,
              price: updatedData.price,
              sellingPrice: updatedData.sellingPrice,
              supplier: updatedData.supplier,
              sku: selectedStockIn.sku,
              barcodeUrl: selectedStockIn.barcodeUrl,
              lastModified: now,
              updatedAt: now
            });
            await db.stockins_offline_update.delete(selectedStockIn.id);
          });
          showNotification('Stock entry updated successfully!');
        } catch (error) {
          await db.stockins_offline_update.put(updatedData);
          showNotification('Stock entry updated offline (will sync when online)', 'warning');
        }
      } else {
        await db.stockins_offline_update.put(updatedData);
        showNotification('Stock entry updated offline (will sync when online)', 'warning');
      }
      await loadData();
      setIsEditModalOpen(false);
      setSelectedStockIn(null);
      navigate(role === 'admin' ? '/admin/dashboard/stockin' : '/employee/dashboard/stockin', { replace: true });
    } catch (error) {
      console.error('Error updating stock-in:', error);
      showNotification(`Failed to update stock entry: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async (stockInData) => {
    setIsLoading(true);
    try {
      const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      if (isOnline && selectedStockIn.id) {
        await stockInService.deleteStockIn(selectedStockIn.id);
        await db.transaction('rw', db.stockins_all, db.stockins_offline_delete, async () => {
          await db.stockins_all.delete(selectedStockIn.id);
          await db.stockins_offline_delete.delete(selectedStockIn.id);
        });
        showNotification('Stock entry deleted successfully!');
      } else if (selectedStockIn.id) {
        await db.stockins_offline_delete.add({
          id: selectedStockIn.id,
          deletedAt: new Date(),
          ...userData
        });
        showNotification('Stock deletion queued (will sync when online)', 'warning');
      } else {
        await db.stockins_offline_add.delete(selectedStockIn.localId);
        showNotification('Stock entry deleted!');
      }
      await loadData();
      setIsDeleteModalOpen(false);
      setSelectedStockIn(null);
    } catch (error) {
      console.error('Error deleting stock-in:', error);
      showNotification(`Failed to delete stock entry: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      showNotification('No internet connection', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await triggerSync();
      await loadData();
      showNotification('Sync completed successfully!');
    } catch (error) {
      showNotification('Sync failed due to network error—will retry automatically.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = (item) => {
    const imgUrl = stockOutService.getBarCodeUrlImage(item.sku);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
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
              border: 1px dashed #ccc;
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
    const images = iframeDoc.querySelectorAll("img");
    let loadedCount = 0;
    images.forEach((img) => {
      img.onload = () => {
        loadedCount++;
        if (loadedCount === images.length) {
          iframe.contentWindow.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        }
      };
      img.onerror = () => {
        showNotification("Failed to load barcode image", "error");
        document.body.removeChild(iframe);
      };
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RWF' }).format(price || 0);
  };

  const calculateStats = () => {
    if (!Array.isArray(filteredStockIns) || filteredStockIns.length === 0) {
      return {
        totalEntries: 0,
        totalQuantity: 0,
        totalValue: 0,
        avgPricePerUnit: 0
      };
    }
    const totalEntries = filteredStockIns.length;
    const totalQuantity = filteredStockIns.reduce((sum, stockIn) => sum + (stockIn.offlineQuantity ?? stockIn.quantity ?? 0), 0);
    const totalValue = filteredStockIns.reduce((sum, stockIn) => sum + ((stockIn.offlineQuantity ?? stockIn.quantity ?? 0) * (stockIn.price || 0)), 0);
    const avgPricePerUnit = totalQuantity ? (totalValue / totalQuantity).toFixed(1) : 0;
    return { totalEntries, totalQuantity, totalValue, avgPricePerUnit };
  };

  const openAddModal = () => {
    navigate(role === 'admin' ? '/admin/dashboard/stockin/create' : '/employee/dashboard/stockin/create');
  };

  const openEditModal = (stockIn) => {
    if (!stockIn.id) return showNotification('Cannot edit unsynced stock entry', 'error');
    navigate(role === 'admin' ? `/admin/dashboard/stockin/update/${stockIn.id}` : `/employee/dashboard/stockin/update/${stockIn.id}`);
  };

  const openViewModal = (stockIn) => {
    setSelectedStockIn(stockIn);
    setIsViewModalOpen(true);
  };

  const openDeleteModal = (stockIn) => {
    setSelectedStockIn(stockIn);
    setIsDeleteModalOpen(true);
  };

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

  const closeAllModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsViewModalOpen(false);
    setSelectedStockIn(null);
    navigate(role === 'admin' ? '/admin/dashboard/stockin' : '/employee/dashboard/stockin', { replace: true });
  };

  const totalPages = Math.ceil((filteredStockIns || []).length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = (filteredStockIns || []).slice(startIndex, endIndex);
  const stats = calculateStats();

  const StatisticsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Total Stock Ins</p>
            <p className="text-sm font-bold text-gray-900">{stats.totalEntries}</p>
          </div>
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-blue-600" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Total Quantity</p>
            <p className="text-sm font-bold text-gray-900">{stats.totalQuantity}</p>
          </div>
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Total Value</p>
            <p className="text-sm font-bold text-gray-900">{formatPrice(stats.totalValue)}</p>
          </div>
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-orange-600" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Avg Price/Unit</p>
            <p className="text-sm font-bold text-gray-900">{formatPrice(stats.avgPricePerUnit)}</p>
          </div>
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Hash className="w-4 h-4 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );

  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4">
        <p className="text-xs text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, (filteredStockIns || []).length)} of {(filteredStockIns || []).length} entries
        </p>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs border rounded-md transition-colors ${currentPage === 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
          >
            <ChevronLeft size={12} />
            Previous
          </button>
          <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${currentPage === page ? 'bg-primary-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs border rounded-md transition-colors ${currentPage === totalPages ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
          >
            Next
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );

  const CardView = () => (
    <div className="md:hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {(currentItems || []).map((stockIn, index) => (
          <div
            key={stockIn.localId || stockIn.id}
            className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${stockIn.synced ? 'border-gray-200' : 'border-yellow-200 bg-yellow-50'}`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white">
                    <Package size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900 truncate" title={stockIn.product?.productName || 'Unknown Product'}>
                      {stockIn.product?.productName || 'Unknown Product'}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${stockIn.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <span className="text-xs text-gray-500">{stockIn.synced ? 'In Stock' : 'Syncing...'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openViewModal(stockIn)}
                    disabled={isLoading}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={12} />
                  </button>
                  <button
                    onClick={() => handlePrint(stockIn)}
                    disabled={isLoading}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="Print Barcode"
                  >
                    <Printer size={12} />
                  </button>
                  <button
                    onClick={() => openEditModal(stockIn)}
                    disabled={isLoading}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(stockIn)}
                    disabled={isLoading}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <Hash size={10} className="mt-0.5" />
                  <span>Qty: {stockIn.offlineQuantity ?? stockIn.quantity}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <DollarSign size={10} className="mt-0.5" />
                  <span>Unit Price: {formatPrice(stockIn.price)}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <DollarSign size={10} className="mt-0.5" />
                  <span className="font-medium">Total: {formatPrice(stockIn.price * (stockIn.offlineQuantity ?? stockIn.quantity))}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <DollarSign size={10} className="mt-0.5" />
                  <span className="font-medium">Sell Price: {formatPrice(stockIn.sellingPrice)}</span>
                </div>
                {stockIn.supplier && (
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <User size={10} className="mt-0.5" />
                    <span className="truncate">{stockIn.supplier}</span>
                  </div>
                )}
                {stockIn.sku && (
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <Barcode size={10} className="mt-0.5" />
                    <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{stockIn.sku}</span>
                  </div>
                )}
              </div>
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={10} />
                  <span>Added {formatDate(stockIn.createdAt || stockIn.lastModified)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <PaginationComponent />
      </div>
    </div>
  );

  const TableView = () => (
    <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sell Price</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(currentItems || []).map((stockIn, index) => (
              <tr key={stockIn.localId || stockIn.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{startIndex + index + 1}</span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white">
                      <Package size={10} />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">{stockIn.product?.productName || 'Unknown Product'}</div>
                      {stockIn.sku && <div className="text-xs text-gray-500">{stockIn.sku}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Hash size={10} className="text-gray-400" />
                    <span className="text-xs text-gray-900">{stockIn.offlineQuantity ?? stockIn.quantity ?? 0}</span>
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className="text-xs text-gray-900">{formatPrice(stockIn.price || 0)}</span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className="text-xs font-semibold text-primary-600">
                    {formatPrice(stockIn.price * (stockIn.offlineQuantity ?? stockIn.quantity))}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className="text-xs font-semibold text-primary-600">{formatPrice(stockIn.sellingPrice || 0)}</span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${stockIn.synced ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${stockIn.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    {stockIn.synced ? 'Synced' : 'Syncing...'}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={10} className="text-gray-400" />
                    <span className="text-xs text-gray-600">{formatDate(stockIn.createdAt || stockIn.lastModified)}</span>
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openViewModal(stockIn)}
                      disabled={isLoading}
                      className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      onClick={() => handlePrint(stockIn)}
                      disabled={isLoading}
                      className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Print Barcode"
                    >
                      <Printer size={12} />
                    </button>
                    <button
                      onClick={() => openEditModal(stockIn)}
                      disabled={isLoading}
                      className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(stockIn)}
                      disabled={isLoading}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
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
    <div className="bg-gray-50 p-4 h-[90vh] sm:p-6 lg:p-8 text-xs">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-xs ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-red-500 text-white'
          } animate-in slide-in-from-top-2 duration-300`}
        >
          {notification.type === 'success' ? <Check size={12} /> : <AlertTriangle size={12} />}
          {notification.message}
        </div>
      )}
      <div className="h-full overflow-y-auto mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-primary-600 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-base font-bold text-gray-900">Stock In Management</h1>
            </div>
          </div>
          <p className="text-xs text-gray-600">Manage your inventory stock entries and track incoming stock - works offline and syncs when online</p>
        </div>
        <StatisticsCards />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
             <div className="relative flex-grow max-w-md">
                             <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                             <input
                               type="text"
                               placeholder="Search by product, client, phone, or transaction..."
                               value={searchTerm}
                               onChange={(e) => setSearchTerm(e.target.value)}
                               className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-xs"
                             />
                           </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="flex gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-xs"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-lg ${isOnline ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                title={isOnline ? 'Online' : 'Offline'}
              >
                {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              </div>
              {isOnline && (
                <button
                  onClick={handleManualSync}
                  disabled={isLoading}
                  className="flex items-center justify-center w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  title="Sync now"
                >
                  <RotateCcw size={12} className={isLoading ? 'animate-spin' : ''} />
                </button>
              )}
              {isOnline && (
                <button
                  onClick={() => loadData(true)}
                  disabled={isRefreshing}
                  className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              )}
              <button
                onClick={openAddModal}
                disabled={isLoading}
                className="flex items-center justify-center px-3 h-8 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg transition-colors shadow-sm text-xs"
                title="Add Stock Entry"
              >
                <Plus size={12} />
                Add Stock Entry
              </button>
            </div>
          </div>
        </div>
        {isLoading && !isRefreshing ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
              <p className="text-xs text-gray-600">Loading stock entries...</p>
            </div>
          </div>
        ) : (filteredStockIns || []).length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">No stock entries found</h3>
            <p className="text-xs text-gray-600 mb-4">{searchTerm || startDate || endDate ? 'Try adjusting your search or date filters.' : 'Get started by adding your first stock entry.'}</p>
            {!(searchTerm || startDate || endDate) && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors text-xs"
              >
                <Plus size={12} />
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
        <ViewStockInModal
          isOpen={isViewModalOpen}
          onClose={closeAllModals}
          stockIn={selectedStockIn}
        />
        <DeleteStockInModal
          isOpen={isDeleteModalOpen}
          onClose={closeAllModals}
          onConfirm={handleConfirmDelete}
          stockIn={selectedStockIn}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default StockInManagement;
