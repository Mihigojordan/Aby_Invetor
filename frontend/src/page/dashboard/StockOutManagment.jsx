/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Package, DollarSign, Hash, User, Check, AlertTriangle, Calendar, Eye, Phone, Mail, Receipt, Wifi, WifiOff, RotateCcw, RefreshCw, ChevronLeft, ChevronRight, FileText, TrendingUp, X, Grid3x3, Table2, Filter, Truck, ShoppingBag, ArrowUpToLine } from 'lucide-react';
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
import { useNavigate } from 'react-router-dom';
import useScreenBelow from '../../hooks/useScreenBelow';

const StockOutManagement = ({ role }) => {
  const [stockOuts, setStockOuts] = useState([]);
  const [stockIns, setStockIns] = useState([]);
  const [filteredStockOuts, setFilteredStockOuts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStockOut, setSelectedStockOut] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const { isOnline } = useNetworkStatusContext();
  const { triggerSync, syncError } = useStockOutOfflineSync();
  const [isInvoiceNoteOpen, setIsInvoiceNoteOpen] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const { user: employeeData } = useEmployeeAuth();
  const { user: adminData } = useAdminAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState('table');
  const navigate = useNavigate();
   const isBelow = useScreenBelow();

     useEffect(()=>{
    if(isBelow){
      setViewMode('grid')
    }
    else{
      setViewMode('table')

    }

  },[isBelow])

  useEffect(() => {
    loadStockOuts();
    const params = new URLSearchParams(window.location.search);
    const trId = params.get("transactionId");
    if (trId?.trim()) {
      setTransactionId(trId);
      setIsInvoiceNoteOpen(true);
    }
  }, [isOnline]);

  useEffect(() => {
    if (syncError) {
      setNotification({
        type: 'error',
        message: `Sync error: ${syncError}`,
      });
    }
  }, [syncError]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const filtered = stockOuts.filter(stockOut => {
      const matchesSearch =
        stockOut.stockin?.product?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stockOut.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stockOut.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stockOut.clientPhone?.includes(searchTerm) ||
        stockOut.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());

      const stockOutDate = new Date(stockOut.createdAt || stockOut.lastModified);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);

      const matchesDate =
        (!start || stockOutDate >= start) &&
        (!end || stockOutDate <= end);

      return matchesSearch && matchesDate;
    });
    setFilteredStockOuts(filtered);
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, stockOuts]);

  useEffect(() => {
    const stats = calculateStockOutStatistics(filteredStockOuts);
    setStatistics(stats);
  }, [filteredStockOuts]);

  const calculateStockOutStatistics = (stockOuts) => {
    if (!Array.isArray(stockOuts) || stockOuts.length === 0) {
      return {
        totalStockOuts: 0,
        totalQuantity: 0,
        totalSalesValue: 0,
        averageQuantityPerStockOut: 0,
        totalClients: 0,
        recentSales: 0
      };
    }

    const totalQuantity = stockOuts.reduce((sum, so) => sum + (so.offlineQuantity ?? so.quantity ?? 0), 0);
    const totalSalesValue = stockOuts.reduce((sum, so) => {
      const quantity = so.offlineQuantity ?? so.quantity ?? 0;
      const price = so.soldPrice ?? 0;
      return sum + (quantity * price);
    }, 0);
    const uniqueClients = new Set(stockOuts.map(s => s.clientPhone).filter(Boolean)).size;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSales = stockOuts.filter(stockOut => 
      new Date(stockOut.createdAt || stockOut.lastModified) > thirtyDaysAgo
    ).length;

    return {
      totalStockOuts: stockOuts.length,
      totalQuantity,
      totalSalesValue: totalSalesValue.toFixed(2),
      averageQuantityPerStockOut: stockOuts.length > 0 ? (totalQuantity / stockOuts.length).toFixed(1) : 0,
      totalClients: uniqueClients,
      recentSales
    };
  };

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
  .concat(
    offlineAdds.map(a => ({
      ...a,
      synced: false,
      backorder: backOrderMap.get(a.backorderLocalId),
      stockin: stockinMap.get(a.stockinId)
    }))
  )
  .sort((a, b) => {
    // 1️⃣ Unsynced first
    if (a.synced !== b.synced) {
      return a.synced - b.synced;
    }

    // 2️⃣ Then sort by date
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

      const convertedStockIns = Array.from(stockinMap.values());

      setStockOuts(combinedStockOuts);
      setFilteredStockOuts(combinedStockOuts);
      setStockIns(convertedStockIns);

      if (showRefreshLoader) {
        setNotification({
          type: 'success',
          message: 'Stock-outs refreshed successfully!'
        });
      }
      if (!isOnline && combinedStockOuts.length === 0) {
        setNotification({
          type: 'warning',
          message: 'No offline data available'
        });
      }
    } catch (error) {
      console.error('Error loading stock-outs:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load stock-outs'
      });
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
            offlineQuantity: sale.quantity,
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
            offlineQuantity: sale.quantity,
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
          setNotification({
            type: 'success',
            message: `Stock out transaction created successfully with ${salesArray.length} entries!`
          });
          updateSearchParam('transactionId', response.transactionId);
          setTransactionId(response.transactionId);
          setIsInvoiceNoteOpen(true);
        } catch (error) {
          console.warn('Error posting to server, keeping offline:', error);
          setNotification({
            type: 'warning',
            message: 'Stock out saved offline (will sync when online)'
          });
        }
      } else {
        updateSearchParam('transactionId', localTransactionId);
        setTransactionId(localTransactionId);
        setIsInvoiceNoteOpen(true);
        setNotification({
          type: 'warning',
          message: 'Stock out saved offline (will sync when online)'
        });
      }

      await loadStockOuts();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding stock out:', error);
      setNotification({
        type: 'error',
        message: `Failed to add stock out: ${error.message}`
      });
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
        ...stockOutData,
        id: selectedStockOut.id,
        quantity: stockOutData.quantity,
        offlineQuantity: stockOutData.quantity,
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
          setNotification({
            type: 'success',
            message: 'Stock out updated successfully!'
          });
        } catch (error) {
          await db.stockouts_offline_update.put(updatedData);
          setNotification({
            type: 'warning',
            message: 'Stock out updated offline (will sync when online)'
          });
        }
      } else {
        await db.stockouts_offline_update.put(updatedData);
        setNotification({
            type: 'warning',
            message: 'Stock out updated offline (will sync when online)'
        });
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
      setNotification({
        type: 'error',
        message: `Failed to update stock out: ${error.message}`
      });
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
        setNotification({
          type: 'success',
          message: 'Stock out deleted successfully!'
        });
      } else if (selectedStockOut.id) {
        await db.stockouts_offline_delete.add({
          id: selectedStockOut.id,
          deletedAt: now,
          ...userData
        });
        setNotification({
          type: 'warning',
          message: 'Stock out deletion queued (will sync when online)'
        });
      } else {
        await db.stockouts_offline_add.delete(selectedStockOut.localId);
        setNotification({
          type: 'success',
          message: 'Stock out deleted!'
        });
      }

      await loadStockOuts();
      setIsDeleteModalOpen(false);
      setSelectedStockOut(null);
    } catch (error) {
      console.error('Error deleting stock out:', error);
      setNotification({
        type: 'error',
        message: `Failed to delete stock out: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      setNotification({
        type: 'error',
        message: 'No internet connection'
      });
      return;
    }
    setIsLoading(true);
    try {
      await triggerSync();
      await loadStockOuts();
      setNotification({
        type: 'success',
        message: 'Sync completed successfully!'
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Sync failed. Will retry automatically.'
      });
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
    if (!transactionId) {
      setNotification({
        type: 'error',
        message: 'Please select the transaction ID'
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(transactionId);
      setNotification({
        type: 'success',
        message: 'Successfully copied the transaction ID'
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to copy the transaction ID'
      });
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

  const openAddModal = () => {
    navigate(role === 'admin' ? '/admin/dashboard/stockout/create' : '/employee/dashboard/stockout/create');
  };

  const openEditModal = (stockOut) => {
    if (!stockOut.id) return setNotification({message:'Cannot edit unsynced stock entry', type:'error'});
    navigate(role === 'admin' ? `/admin/dashboard/stockout/update/${stockOut.id}` : `/employee/dashboard/stockout/update/${stockOut.id}`);
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

  const handleClearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setFilteredStockOuts(stockOuts);
    setCurrentPage(1);
  };

  const StatisticsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2 p-3">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Total Stock Outs</p>
            <p className="text-lg font-bold text-gray-900">{statistics?.totalStockOuts || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{statistics?.recentSales || 0} recent sales</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Total Quantity</p>
            <p className="text-lg font-bold text-gray-900">{statistics?.totalQuantity || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Items sold</p>
          </div>
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Total Sales Value</p>
            <p className="text-lg font-bold text-gray-900">{formatPrice(statistics?.totalSalesValue || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Revenue generated</p>
          </div>
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Clients</p>
            <p className="text-lg font-bold text-gray-900">{statistics?.totalClients || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Unique customers</p>
          </div>
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <User className="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );

  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-t border-gray-200 bg-white">
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
            <ChevronLeft size={12} />
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
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );

  
  const TableView = () => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6 p-3 ml-3 mr-3">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Product/Transaction</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Quantity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Unit Price</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Payment Method</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Total Price</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(currentItems || []).map((stockOut, index) => (
              <tr key={stockOut.localId || stockOut.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                      <Package size={14} className="text-primary-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        {stockOut.stockin?.product?.productName || stockOut?.backorder?.productName || 'Sale Transaction'}
                      </div>
                      {stockOut.transactionId && (
                        <div className="text-xs text-gray-500 mt-1">{stockOut.transactionId}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900 truncate max-w-[120px]" title={stockOut.clientName}>
                    {stockOut.clientName || stockOut.clientPhone || 'N/A'}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">{stockOut.offlineQuantity ?? stockOut.quantity ?? '0'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{formatPrice(stockOut.soldPrice)}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm font-semibold text-green-600">
                    {formatPrice(((stockOut.offlineQuantity ?? stockOut.quantity) || 1) * stockOut.soldPrice)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                 {stockOut.paymentMethod}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stockOut.synced ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    <div className={`w-2 h-2 rounded-full ${stockOut.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    {stockOut.synced ? 'Synced' : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">{formatDate(stockOut.createdAt || stockOut.lastModified)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openViewModal(stockOut)}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    {stockOut.transactionId && (
                      <button
                        onClick={() => handleShowInvoiceComponent(stockOut.transactionId)}
                        disabled={isLoading}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 rounded-lg transition-colors"
                        title="View Invoice"
                      >
                        <Receipt size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(stockOut)}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(stockOut)}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
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

  const CardView = () => (
    <div className="p-4">
      <div className="grid grid-cols-1 d:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 mb-6">
        {(currentItems || []).map((stockOut, index) => (
          <div
            key={stockOut.localId || stockOut.id}
            className={`bg-white rounded-lg border hover:shadow-md transition-shadow ${stockOut.synced ? 'border-gray-200' : 'border-yellow-200'}`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                    <Package size={16} className="text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900 truncate" title={stockOut.stockin?.product?.productName || stockOut?.backorder?.productName}>
                      {stockOut.stockin?.product?.productName || stockOut?.backorder?.productName || 'Sale Transaction'}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${stockOut.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <span className="text-xs text-gray-500">{stockOut.synced ? 'Synced' : 'Pending Sync'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openViewModal(stockOut)}
                    disabled={isLoading}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex items-start justify-between text-xs">
                  <span className="font-medium text-gray-600">Quantity:</span>
                  <span className="font-bold text-primary-600">{stockOut.offlineQuantity ?? stockOut.quantity ?? 'N/A'}</span>
                </div>
                <div className="flex items-start justify-between text-xs">
                  <span className="font-medium text-gray-600">Unit Price:</span>
                  <span className="text-gray-900">{formatPrice(stockOut.soldPrice)}</span>
                </div>
                <div className="flex items-start justify-between text-xs">
                  <span className="font-medium text-gray-600">Total Price:</span>
                  <span className="font-bold text-green-600">{formatPrice(((stockOut.offlineQuantity ?? stockOut.quantity) || 1) * stockOut.soldPrice)}</span>
                </div>
                {stockOut.clientName && (
                  <div className="flex items-start justify-between text-xs">
                    <span className="font-medium text-gray-600">Client:</span>
                    <span className="text-gray-900 truncate max-w-[150px]" title={stockOut.clientName}>{stockOut.clientName}</span>
                  </div>
                )}
              </div>
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={12} />
                    <span>{formatDate(stockOut.createdAt || stockOut.lastModified)}</span>
                  </div>
                  <div className="flex gap-1">
                    {stockOut.transactionId && (
                      <button
                        onClick={() => handleShowInvoiceComponent(stockOut.transactionId)}
                        disabled={isLoading}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 rounded-lg transition-colors"
                        title="View Invoice"
                      >
                        <Receipt size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(stockOut)}
                      disabled={isLoading}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(stockOut)}
                      disabled={isLoading}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        <PaginationComponent />
      </div>
    </div>
  );

  return (
  <div className="bg-gray-50 min-h-[90vh] ">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-red-500 text-white'
          } animate-in slide-in-from-top-2 duration-300`}
        >
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}
      <InvoiceComponent isOpen={isInvoiceNoteOpen} onClose={handleCloseInvoiceModal} transactionId={transactionId} />
    <div className="h-full">
        {/* Header Section */}
        <div className="mb-4 shadow-md bg-white p-2">
          <div className="flex items-center justify-between flex-wrap">

            <div>
              <div className="flex items-center gap-3 mb-2">
          
                <div>
                  <h1 className="text-2xl lg:text-2xl font-bold text-gray-900">Stock Out Management</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage sales transactions, track outgoing stock, and generate invoices</p>
                </div>
              </div>
            </div>


            
            <div className="flex items-center gap-4 flex-wrap">

   {/* Sync and Refresh buttons */}
                <div className="flex gap-4">
                  {(searchTerm || startDate || endDate) && (
                    <button
                      onClick={handleClearFilters}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors shadow-sm text-sm"
                      title="Clear Filters"
                    >
                      <X size={16} />
                      <span className="text-sm font-medium">Clear</span>
                    </button>
                  )}
                  
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                    <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                  
                  {isOnline && (
                    <button
                      onClick={handleManualSync}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                      title="Sync now"
                    >
                      <RotateCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                      <span className="text-sm font-medium">Sync</span>
                    </button>
                  )}
                  
                  {isOnline && (
                    <button
                      onClick={() => loadStockOuts(true)}
                      disabled={isRefreshing}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                      title="Refresh"
                    >
                      <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                      <span className="text-sm font-medium">Refresh</span>
                    </button>
                  )}
                </div>
             

              <button
                onClick={openAddModal}
                disabled={isLoading}
                className="flex items-center flex-1 md:flex-none gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <Plus size={18} />
                <span className="text-sm font-semibold">New Sale</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && <StatisticsCards />}

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 p-2 ml-3 mr-3">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="w-full lg:w-[45%] ">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by product, client, phone, or transaction..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-xs"
                 />
              </div>
            </div>
            
             <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-[90%] ml-6 items-start sm:items-center">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-xs"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-xs"
                  />
                </div>
              </div>
              
      
                
              </div>
                      {/* View mode toggle in filter section */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1 border border-gray-300 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="Grid View"
                  >
                    <Grid3x3 size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded transition-colors ${viewMode === 'table' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="Table View"
                  >
                    <Table2 size={18} />
                  </button>
                </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {isLoading && !isRefreshing ? (
          <div className="text-center py-16">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                <Package className="w-8 h-8 text-primary-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">Loading Sales Transactions</p>
                <p className="text-sm text-gray-600">Please wait while we fetch your sales data...</p>
              </div>
            </div>
          </div>
        ) : filteredStockOuts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-12 h-12 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No Sales Transactions Found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || startDate || endDate 
                  ? 'Try adjusting your search or date filters to find what you\'re looking for.' 
                  : 'Get started by adding your first sales transaction.'}
              </p>
              {!(searchTerm || startDate || endDate) && (
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
                >
                  <Plus size={18} />
                  Add First Sale
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <CardView />
              
            ) : (
              <>
                <TableView />
              </>
            )}
          </>
        )}

        {/* Modals */}
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