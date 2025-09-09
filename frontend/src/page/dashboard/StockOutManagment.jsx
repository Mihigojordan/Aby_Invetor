import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Package, DollarSign, Hash, User, Check, AlertTriangle, Calendar, Eye, Phone, Mail, Receipt, Wifi, WifiOff, RotateCcw, RefreshCw, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import stockOutService from '../../services/stockoutService';
import stockInService from '../../services/stockinService';
import UpsertStockOutModal from '../../components/dashboard/stockout/UpsertStockOutModal';
import DeleteStockOutModal from '../../components/dashboard/stockout/DeleteStockOutModel';
import ViewStockOutModal from '../../components/dashboard/stockout/ViewStockOutModal';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';
import InvoiceComponent from '../../components/dashboard/stockout/InvoiceComponent';
import { useStockOutOfflineSync } from '../../hooks/useStockOutOfflineSync';
import { db } from '../../db/database';
import productService from '../../services/productService';
import backOrderService from '../../services/backOrderService';
import { useNetworkStatusContext } from '../../context/useNetworkContext';
import { stockOutSyncService } from '../../services/sync/stockOutSyncService';

const StockOutManagement = ({ role }) => {
  const [stockOuts, setStockOuts] = useState([]);
  const [stockIns, setStockIns] = useState([]);
  const [filteredStockOuts, setFilteredStockOuts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStockOut, setSelectedStockOut] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const { isOnline } = useNetworkStatusContext();
  const { triggerSync, syncError } = useStockOutOfflineSync();
  const [isInvoiceNoteOpen, setIsInvoiceNoteOpen] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const { user: employeeData } = useEmployeeAuth();
  const { user: adminData } = useAdminAuth();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  useEffect(() => {
    loadStockOuts();
    if (isOnline) handleManualSync();
    const params = new URLSearchParams(window.location.search);
    const trId = params.get("transactionId");
    if (trId?.trim()) {
      setTransactionId(trId);
      setIsInvoiceNoteOpen(true);
    }
  }, [isOnline]);

  useEffect(() => {
    if (syncError) {
      showNotification(`Sync error: ${syncError}`, 'error');
    }
  }, [syncError]);

  useEffect(() => {
    const filtered = stockOuts.filter(stockOut =>
      stockOut.stockin?.product?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockOut.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockOut.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockOut.clientPhone?.includes(searchTerm) ||
      stockOut.transactionId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStockOuts(filtered);
    setCurrentPage(1);
  }, [searchTerm, stockOuts]);

  const loadStockOuts = async (showRefreshLoader = false) => {
    if (showRefreshLoader) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      if (isOnline) await triggerSync();

      const [allStockOuts, offlineAdds, offlineUpdates, offlineDeletes, stockinsData, productsData, backOrderData] = await Promise.all([
        db.stockouts_all.toArray(),
        db.stockouts_offline_add.toArray(),
        db.stockouts_offline_update.toArray(),
        db.stockouts_offline_delete.toArray(),
        fetchStockIns(),
        fetchProducts(),
        fetchBackorders()
      ]);

      const deleteIds = new Set(offlineDeletes.map(d => d.id));
      const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));
      const backOrderMap = new Map(backOrderData.map(b => [b.id || b.localId, b]));
      const productMap = new Map(productsData.map(p => [p.id || p.localId, p]));
      const stockinMap = new Map(stockinsData.map(s => [s.id || s.localId, { ...s, product: productMap.get(s.productId) }]));
      const combinedStockOuts = allStockOuts
        .filter(so => !deleteIds.has(so.id))
        .map(so => ({
          ...so,
          ...updateMap.get(so.id),
          synced: true,
          stockin: stockinMap.get(so.stockinId),
          backorder: backOrderMap.get(so.backorderId)
        }))
        .concat(offlineAdds.map(a => ({
          ...a,
          synced: false,
          backorder: backOrderMap.get(a.backorderLocalId),
          stockin: stockinMap.get(a.stockinId)
        })))
        .sort((a, b) => a.synced - b.synced);

      const convertedStockIns = Array.from(stockinMap.values());

      setStockOuts(combinedStockOuts);
      setFilteredStockOuts(combinedStockOuts);
      setStockIns(convertedStockIns);

      if (showRefreshLoader) {
        showNotification('Stock-outs refreshed successfully!');
      }
      if (!isOnline && combinedStockOuts.length === 0) {
        showNotification('No offline data available', 'warning');
      }
    } catch (error) {
      console.error('Error loading stock-outs:', error);
      showNotification('Failed to load stock-outs', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchStockIns = async () => {
    try {
      if (isOnline) {
        const response = await stockInService.getAllStockIns();
        for (const si of response) {
          await db.stockins_all.put({
            id: si.id,
            productId: si.productId,
            quantity: si.quantity,
            price: si.price,
            sellingPrice: si.sellingPrice,
            supplier: si.supplier,
            sku: si.sku,
            barcodeUrl: si.barcodeUrl,
            lastModified: new Date(),
            updatedAt: si.updatedAt || new Date()
          });
          if (si.product && !(await db.products_all.get(si.product.id))) {
            await db.products_all.put({
              id: si.product.id,
              productName: si.product.productName,
              categoryId: si.product.categoryId,
              description: si.product.description,
              brand: si.product.brand,
              lastModified: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }
      const [allStockin, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
        db.stockins_all.toArray(),
        db.stockins_offline_add.toArray(),
        db.stockins_offline_update.toArray(),
        db.stockins_offline_delete.toArray()
      ]);
      const deleteIds = new Set(offlineDeletes.map(d => d.id));
      const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));
      const combinedStockin = allStockin
        .filter(c => !deleteIds.has(c.id))
        .map(c => ({ ...c, ...updateMap.get(c.id), synced: true }))
        .concat(offlineAdds.map(a => ({ ...a, synced: false })))
        .sort((a, b) => a.synced - b.synced);
      return combinedStockin;
    } catch (error) {
      console.error('Error fetching stock-ins:', error);
      if (!error.response) {
        return await db.stockins_all.toArray();
      }
    }
  };

  const fetchBackorders = async () => {
    try {
      if (isOnline) {
        const response = await backOrderService.getAllBackOrders();
        for (const b of response.backorders || response) {
          await db.backorders_all.put({
            id: b.id,
            quantity: b.quantity,
            soldPrice: b.soldPrice,
            productName: b.productName,
            adminId: b.adminId,
            employeeId: b.employeeId,
            lastModified: b.lastModified || new Date(),
            createdAt: b.createdAt || new Date(),
            updatedAt: b.updatedAt || new Date()
          });
        }
      }
      const [allBackOrder, offlineAdds] = await Promise.all([
        db.backorders_all.toArray(),
        db.backorders_offline_add.toArray(),
      ]);
      const combinedBackOrder = allBackOrder
        .map(c => ({ ...c, synced: true }))
        .concat(offlineAdds.map(a => ({ ...a, synced: false })))
        .sort((a, b) => a.synced - b.synced);
      return combinedBackOrder;
    } catch (error) {
      console.error('Error fetching backorders:', error);
      if (!error?.response) {
        const [allBackOrder, offlineAdds] = await Promise.all([
          db.backorders_all.toArray(),
          db.backorders_offline_add.toArray(),
        ]);
        const combinedBackOrder = allBackOrder
          .map(c => ({ ...c, synced: true }))
          .concat(offlineAdds.map(a => ({ ...a, synced: false })))
          .sort((a, b) => a.synced - b.synced);
        return combinedBackOrder;
      }
    }
  };

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
      if (!error?.response) {
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
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddStockOut = async (stockOutData) => {
    setIsLoading(true);
    try {
      const userInfo = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      const now = new Date();
      const salesArray = stockOutData.salesEntries || [{
        stockinId: stockOutData.stockinId,
        quantity: stockOutData.quantity,
        soldPrice: stockOutData.soldPrice,
        isBackOrder: false,
        backOrder: null
      }];
      const clientInfo = {
        clientName: stockOutData.clientName,
        clientEmail: stockOutData.clientEmail,
        clientPhone: stockOutData.clientPhone,
        paymentMethod: stockOutData.paymentMethod
      };
      let localTransactionId = `local-trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let createdStockouts = [];

      for (const sale of salesArray) {
        let newStockout;
        let backorderLocalId = null;

        if (sale.isBackOrder) {
          const backOrderRecord = {
            quantity: sale.quantity,
            soldPrice: sale.soldPrice,
            sellingPrice: sale.soldPrice,
            productName: sale.backOrder.productName,
            ...userInfo,
            lastModified: now,
            createdAt: now,
            updatedAt: now
          };
          backorderLocalId = await db.backorders_offline_add.add(backOrderRecord);
          newStockout = {
            stockinId: null,
            quantity: sale.quantity,
            soldPrice: sale.soldPrice,
            clientName: clientInfo.clientName,
            clientEmail: clientInfo.clientEmail,
            clientPhone: clientInfo.clientPhone,
            paymentMethod: clientInfo.paymentMethod,
            ...userInfo,
            transactionId: localTransactionId,
            isBackOrder: true,
            backorderLocalId,
            lastModified: now,
            createdAt: now,
            updatedAt: now
          };
          const localId = await db.stockouts_offline_add.add(newStockout);
          createdStockouts.push({ ...newStockout, localId, synced: false });
        } else {
          const stockins = await fetchStockIns();
          const stockin = stockins.find(s => s.id === sale.stockinId || s.localId === sale.stockinId);
          if (!stockin) throw new Error(`Stock-in not found for ID: ${sale.stockinId}`);
          if (stockin.quantity < sale.quantity) {
            throw new Error(`Not enough stock for ID: ${sale.stockinId}. Available: ${stockin.quantity}, Requested: ${sale.quantity}`);
          }
          const soldPrice = sale.soldPrice || (stockin.sellingPrice * sale.quantity);
          newStockout = {
            stockinId: sale.stockinId,
            quantity: sale.quantity,
            soldPrice,
            clientName: clientInfo.clientName,
            clientEmail: clientInfo.clientEmail,
            clientPhone: clientInfo.clientPhone,
            paymentMethod: clientInfo.paymentMethod,
            ...userInfo,
            transactionId: localTransactionId,
            isBackOrder: false,
            lastModified: now,
            createdAt: now,
            updatedAt: now
          };
          const localId = await db.stockouts_offline_add.add(newStockout);
          createdStockouts.push({ ...newStockout, localId, synced: false });
          const newQuantity = (stockin.offlineQuantity ?? stockin.quantity) - sale.quantity;
          const existingStockin = await db.stockins_all.get(sale.stockinId);
          if (existingStockin) {
            await db.stockins_all.update(sale.stockinId, { quantity: newQuantity });
          } else {
            const offlineStockin = await db.stockins_offline_add.get(sale.stockinId);
            if (offlineStockin) {
              await db.stockins_offline_add.update(sale.stockinId, { offlineQuantity: newQuantity });
            }
          }
        }
      }

      if (isOnline) {
        try {
          const response = await stockOutService.createMultipleStockOut(salesArray, clientInfo, userInfo);
          await Promise.all(
            response.data.map(async (serverSo, idx) => {
              const local = createdStockouts[idx];
              await db.synced_stockout_ids.add({
                localId: local.localId,
                serverId: serverSo.id,
                syncedAt: now,
              });
              await db.stockouts_all.put({
                id: serverSo.id,
                stockinId: serverSo.stockinId,
                backorderId: serverSo.backorderId || null,
                quantity: serverSo.quantity,
                soldPrice: serverSo.soldPrice,
                clientName: serverSo.clientName,
                transactionId: serverSo.transactionId,
                clientEmail: serverSo.clientEmail,
                clientPhone: serverSo.clientPhone,
                paymentMethod: serverSo.paymentMethod,
                lastModified: serverSo.lastModified || now,
                updatedAt: serverSo.updatedAt || now,
              });
              await db.stockouts_offline_add.delete(local.localId);
              if (serverSo.backorderId && local.backorderLocalId) {
                await db.backorders_all.put({
                  id: serverSo.backorderId,
                  quantity: serverSo.quantity,
                  soldPrice: serverSo.soldPrice,
                  productName: serverSo.productName,
                  ...userInfo,
                  lastModified: now,
                  createdAt: serverSo.createdAt || now,
                  updatedAt: serverSo.updatedAt || now,
                });
                await db.backorders_offline_add.delete(local.backorderLocalId);
              }
            })
          );
          showNotification(`Stock out transaction created successfully with ${salesArray.length} entries!`);
          updateSearchParam('transactionId', response.transactionId);
          setTransactionId(response.transactionId);
          setIsInvoiceNoteOpen(true);
        } catch (error) {
          console.warn('Error posting to server, keeping offline:', error);
          showNotification('Stock out saved offline (will sync when online)', 'warning');
        }
      } else {
        updateSearchParam('transactionId', localTransactionId);
        setTransactionId(localTransactionId);
        setIsInvoiceNoteOpen(true);
        showNotification('Stock out saved offline (will sync when online)', 'warning');
      }

      await loadStockOuts();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding stock out:', error);
      showNotification(`Failed to add stock out: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStockOut = async (stockOutData) => {
    setIsLoading(true);
    try {
      const userInfo = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      const now = new Date();
      const updatedData = {
        id: selectedStockOut.id,
        quantity: stockOutData.quantity,
        soldPrice: stockOutData.soldPrice,
        clientName: stockOutData.clientName,
        clientEmail: stockOutData.clientEmail,
        clientPhone: stockOutData.clientPhone,
        paymentMethod: stockOutData.paymentMethod,
        ...userInfo,
        lastModified: now,
        updatedAt: now
      };

      if (isOnline) {
        try {
          const response = await stockOutService.updateStockOut(selectedStockOut.id, { ...stockOutData, ...userInfo });
          await db.stockouts_all.put({
            id: response.id,
            stockinId: response.stockinId,
            quantity: response.quantity,
            soldPrice: response.soldPrice,
            clientName: response.clientName,
            clientEmail: response.clientEmail,
            clientPhone: response.clientPhone,
            paymentMethod: response.paymentMethod,
            adminId: response.adminId,
            backorderId: response.backorderId,
            employeeId: response.employeeId,
            transactionId: response.transactionId,
            lastModified: response.createdAt || new Date(),
            createdAt: response.createdAt,
            updatedAt: response.updatedAt || new Date()
          });
          await db.stockouts_offline_update.delete(selectedStockOut.id);
          showNotification('Stock out updated successfully!');
        } catch (error) {
          await db.stockouts_offline_update.put(updatedData);
          showNotification('Stock out updated offline (will sync when online)', 'warning');
        }
      } else {
        await db.stockouts_offline_update.put(updatedData);
        showNotification('Stock out updated offline (will sync when online)', 'warning');
      }
      if (selectedStockOut.stockinId) {
        const stockin = await db.stockins_all.get(selectedStockOut.stockinId);
        if (stockin) {
          const oldQuantity = selectedStockOut.quantity;
          const quantityDelta = stockOutData.quantity - oldQuantity;
          const newStockQuantity = stockin.quantity - quantityDelta;
          await db.stockins_all.update(selectedStockOut.stockinId, { quantity: newStockQuantity });
        }
      }

      await loadStockOuts();
      setIsEditModalOpen(false);
      setSelectedStockOut(null);
    } catch (error) {
      console.error('Error updating stock out:', error);
      showNotification(`Failed to update stock out: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      const now = new Date();

      if (selectedStockOut.stockinId) {
        const existingStockin = await db.stockins_all.get(selectedStockOut.stockinId);
        if (existingStockin) {
          const newQuantity = existingStockin.quantity + selectedStockOut.quantity;
          await db.stockins_all.update(selectedStockOut.stockinId, { quantity: newQuantity });
        } else {
          const offlineStockin = await db.stockins_offline_add.get(selectedStockOut.stockinId);
          if (offlineStockin) {
            const newQuantity = offlineStockin.quantity + selectedStockOut.quantity;
            await db.stockins_offline_add.update(selectedStockOut.stockinId, { offlineQuantity: newQuantity });
          }
        }
      }

      if (isOnline && selectedStockOut.id) {
        await stockOutService.deleteStockOut(selectedStockOut.id, userData);
        await db.stockouts_all.delete(selectedStockOut.id);
        showNotification('Stock out deleted successfully!');
      } else if (selectedStockOut.id) {
        await db.stockouts_offline_delete.add({
          id: selectedStockOut.id,
          deletedAt: now,
          ...userData
        });
        showNotification('Stock out deletion queued (will sync when online)', 'warning');
      } else {
        await db.stockouts_offline_add.delete(selectedStockOut.localId);
        showNotification('Stock out deleted!');
      }

      await loadStockOuts();
      setIsDeleteModalOpen(false);
      setSelectedStockOut(null);
    } catch (error) {
      console.error('Error deleting stock out:', error);
      showNotification(`Failed to delete stock out: ${error.message}`, 'error');
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
      await loadStockOuts();
      showNotification('Sync completed successfully!');
    } catch (error) {
      showNotification('Sync failed. Will retry automatically.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  function updateSearchParam(key, value) {
    const params = new URLSearchParams(window.location.search);
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, "", newUrl);
  }

  const handleCopyTransactionId = async (transactionId) => {
    if (!transactionId) return showNotification('Please select the transaction ID', 'error');
    try {
      await navigator.clipboard.writeText(transactionId);
      showNotification('Successfully copied the transaction ID');
    } catch (error) {
      showNotification('Failed to copy the transaction ID', 'error');
    }
  };

  const handleShowInvoiceComponent = (transactionId) => {
    updateSearchParam('transactionId', transactionId);
    setTransactionId(transactionId);
    setIsInvoiceNoteOpen(true);
  };

  const handleCloseInvoiceModal = () => {
    setIsInvoiceNoteOpen(false);
    setTransactionId(null);
    updateSearchParam("transactionId");
  };

  const openEditModal = (stockOut) => {
    setSelectedStockOut(stockOut);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (stockOut) => {
    setSelectedStockOut(stockOut);
    setIsDeleteModalOpen(true);
  };

  const openViewModal = (stockOut) => {
    setSelectedStockOut(stockOut);
    setIsViewModalOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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

  const totalPages = Math.ceil(filteredStockOuts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredStockOuts.slice(startIndex, endIndex);

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

  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4">
        <p className="text-xs text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredStockOuts.length)} of {filteredStockOuts.length} entries
        </p>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-3 py-2 text-xs border rounded-md transition-colors ${
              currentPage === 1
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft size={14} />
            Previous
          </button>
          <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 text-xs rounded-md transition-colors ${
                  currentPage === page
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
            className={`flex items-center gap-1 px-3 py-2 text-xs border rounded-md transition-colors ${
              currentPage === totalPages
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );

  const CardView = () => (
    <div className="md:hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        {currentItems.map((stockOut) => (
          <div
            key={stockOut.localId || stockOut.id}
            className={`bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow ${
              stockOut.synced ? 'border-gray-200' : 'border-yellow-200 bg-yellow-50'
            }`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    <Package size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate" title={stockOut.stockin?.product?.productName || stockOut?.backorder?.productName}>
                      {stockOut.stockin?.product?.productName || stockOut?.backorder?.productName || 'Sale Transaction'}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <div className={`w-2 h-2 rounded-full ${stockOut.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <span className="text-xs text-gray-500">{stockOut.synced ? 'Active' : 'Syncing...'}</span>
                      {stockOut.transactionId && (
                        <span
                          className="text-xs text-gray-500 font-mono underline cursor-pointer hover:text-gray-700"
                          onClick={() => handleCopyTransactionId(stockOut.transactionId.trim())}
                        >
                          {stockOut.transactionId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openViewModal(stockOut)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="View stock out"
                  >
                    <Eye size={14} />
                  </button>
                  {stockOut.synced && (
                    <button
                      onClick={() => openEditModal(stockOut)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit stock out"
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                  {stockOut.transactionId && (
                    <button
                      onClick={() => handleShowInvoiceComponent(stockOut.transactionId)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="View Invoice"
                    >
                      <Receipt size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {stockOut.quantity && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <Hash size={14} className="mt-0.5" />
                    <span>Qty: {stockOut.quantity}</span>
                  </div>
                )}
                {stockOut.soldPrice && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <DollarSign size={14} className="mt-0.5" />
                    <span>Unit Price: {formatPrice(stockOut.soldPrice)}</span>
                  </div>
                )}
                {(stockOut.clientName || stockOut.clientEmail || stockOut.clientPhone) && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <User size={14} className="mt-0.5" />
                    <span className="line-clamp-2">
                      {stockOut.clientName || stockOut.clientEmail || stockOut.clientPhone || 'No client info'}
                    </span>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} />
                  <span>Created {formatDate(stockOut.createdAt || stockOut.lastModified)}</span>
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

  const TableView = () => (
    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product/Transaction</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((stockOut, index) => (
              <tr key={stockOut.localId || stockOut.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {startIndex + index + 1}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                      <Package size={16} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {stockOut.stockin?.product?.productName || stockOut?.backorder?.productName || 'Sale Transaction'}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${stockOut.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <span className="text-xs text-gray-500">{stockOut.synced ? 'Active' : 'Syncing...'}</span>
                        {stockOut.transactionId && (
                          <span
                            className="text-xs text-gray-500 font-mono underline cursor-pointer hover:text-gray-700"
                            onClick={() => handleCopyTransactionId(stockOut.transactionId.trim())}
                          >
                            {stockOut.transactionId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-gray-900 max-w-xs">
                    <div className="line-clamp-2">
                      {stockOut.clientName || stockOut.clientEmail || stockOut.clientPhone || 'No client info'}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Hash size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-900">{stockOut.quantity || 'N/A'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-900">{formatPrice(stockOut.soldPrice)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      stockOut.synced ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${stockOut.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    {stockOut.synced ? 'Active' : 'Syncing...'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {formatDate(stockOut.createdAt || stockOut.lastModified)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openViewModal(stockOut)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                    {stockOut.synced && (
                      <button
                        onClick={() => openEditModal(stockOut)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                    {stockOut.transactionId && (
                      <button
                        onClick={() => handleShowInvoiceComponent(stockOut.transactionId)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="View Invoice"
                      >
                        <Receipt size={14} />
                      </button>
                    )}
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
    <div className="bg-gray-50 p-4 h-[90vh] sm:p-6 lg:p-8">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
          } animate-in slide-in-from-top-2 duration-300`}
        >
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}
      <InvoiceComponent isOpen={isInvoiceNoteOpen} onClose={handleCloseInvoiceModal} transactionId={transactionId} />
      <div className="h-full overflow-y-auto mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-600 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Stock Out Management</h1>
            </div>
          </div>
          <p className="text-sm text-gray-600">Manage your sales transactions and track outgoing stock - works offline and syncs when online</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by product, client, phone, or transaction..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm"
              />
            </div>
            <div className="flex gap-2">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                  isOnline ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}
                title={isOnline ? 'Online' : 'Offline'}
              >
                {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
              </div>
              {isOnline && (
                <button
                  onClick={handleManualSync}
                  disabled={isLoading}
                  className="flex items-center justify-center w-10 h-10 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  title="Sync now"
                >
                  <RotateCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                </button>
              )}
              {isOnline && (
                <button
                  onClick={() => loadStockOuts(true)}
                  disabled={isRefreshing}
                  className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              )}
              <button
                onClick={() => setIsAddModalOpen(true)}
                disabled={isLoading}
                className="flex items-center justify-center px-3 h-10 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg transition-colors shadow-sm"
                title="Add Sale Transaction"
              >
                <Plus size={16} />
                Add Sale
              </button>
            </div>
          </div>
        </div>
        {isLoading && !isRefreshing ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin text-primary-600" />
              <p className="text-gray-600">Loading stock-outs...</p>
            </div>
          </div>
        ) : filteredStockOuts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stock-outs found</h3>
            <p className="text-gray-600 mb-4">{searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first sale transaction.'}</p>
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
          onSubmit={isEditModalOpen ? handleUpdateStockOut : handleAddStockOut}
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
        <DeleteStockOutModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedStockOut(null);
          }}
          onConfirm={handleConfirmDelete}
          stockOut={selectedStockOut}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default StockOutManagement;