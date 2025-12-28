
import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Package, DollarSign, Hash, User, Check, AlertTriangle, Calendar, Eye, Phone, Mail, Receipt, Wifi, WifiOff, RotateCcw, RefreshCw, ChevronLeft, ChevronRight, FileText, TrendingUp, X } from 'lucide-react';
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
import { useNavigate } from 'react-router-dom';

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
  const [itemsPerPage] = useState(5);
  const navigate =  useNavigate()
  useEffect(() => {
    loadStockOuts();
    // if (isOnline) handleManualSync();
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
        averageQuantityPerStockOut: 0
      };
    }

    const totalQuantity = stockOuts.reduce((sum, so) => sum + (so.offlineQuantity ?? so.quantity ?? 0), 0);
    const totalSalesValue = stockOuts.reduce((sum, so) => {
      const quantity = so.offlineQuantity ?? so.quantity ?? 0;
      const price = so.soldPrice ?? 0;
      return sum + (quantity * price);
    }, 0);

    return {
      totalStockOuts: stockOuts.length,
      totalQuantity,
      totalSalesValue: totalSalesValue.toFixed(2),
      averageQuantityPerStockOut: stockOuts.length > 0 ? (totalQuantity / stockOuts.length).toFixed(1) : 0
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

  const confirmDeleteLocal = async () => {
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

      await db.stockouts_offline_add.delete(selectedStockOut.localId);
      setNotification({
        type: 'success',
        message: 'Stock out deleted!'
      });

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Total Stock Outs</p>
            <p className="text-sm font-bold text-gray-900">{statistics?.totalStockOuts || 0}</p>
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
            <p className="text-sm font-bold text-gray-900">{statistics?.totalQuantity || 0}</p>
          </div>
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Total Sales Value</p>
            <p className="text-sm font-bold text-gray-900">{formatPrice(statistics?.totalSalesValue || 0)}</p>
          </div>
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Avg Quantity/Stock Out</p>
            <p className="text-sm font-bold text-gray-900">{statistics?.averageQuantityPerStockOut || 0}</p>
          </div>
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Hash className="w-4 h-4 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );

  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50 text-xs">
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredStockOuts.length)} of {filteredStockOuts.length} entries
        </p>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-2 py-1 text-xs border rounded-md transition-colors ${
              currentPage === 1
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft size={12} />
            Previous
          </button>
          <div className="flex items-center gap-1 mx-1">
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
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
            className={`flex items-center gap-1 px-2 py-1 text-xs border rounded-md transition-colors ${
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

  const CardView = () => (
    <div className="md:hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {currentItems.map((stockOut) => (
          <div
            key={stockOut.localId || stockOut.id}
            className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
              stockOut.synced ? 'border-gray-200' : 'border-yellow-200 bg-yellow-50'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    <Package size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900 truncate" title={stockOut.stockin?.product?.productName || stockOut?.backorder?.productName}>
                      {stockOut.stockin?.product?.productName || stockOut?.backorder?.productName || 'Sale Transaction'}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${stockOut.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <span className="text-xs text-gray-500">{stockOut.synced ? 'Synced' : 'Syncing...'}</span>
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
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="View stock out"
                  >
                    <Eye size={12} />
                  </button>
                  {stockOut.synced && (
                    <button
                      onClick={() => openEditModal(stockOut)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit stock out"
                    >
                      <Edit3 size={12} />
                    </button>
                  )}
                  {stockOut.transactionId && (
                    <button
                      onClick={() => handleShowInvoiceComponent(stockOut.transactionId)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="View Invoice"
                    >
                      <Receipt size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => openDeleteModal(stockOut)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete stock out"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 mb-3">
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <Hash size={12} className="mt-0.5" />
                  <span>Qty: {stockOut.offlineQuantity ?? stockOut.quantity ?? 'N/A'}</span>
                </div>
                {stockOut.soldPrice && (
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <DollarSign size={12} className="mt-0.5" />
                    <span>Unit Price: {formatPrice(stockOut.soldPrice)}</span>
                  </div>
                )}
                {stockOut.soldPrice && (
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <DollarSign size={12} className="mt-0.5" />
                    <span>Total Price: {formatPrice(((stockOut.offlineQuantity ?? stockOut.quantity) || 1) * stockOut.soldPrice)}</span>
                  </div>
                )}
                {(stockOut.clientName || stockOut.clientEmail || stockOut.clientPhone) && (
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <User size={12} className="mt-0.5" />
                    <span className="line-clamp-2">
                      {stockOut.clientName || stockOut.clientEmail || stockOut.clientPhone || 'No client info'}
                    </span>
                  </div>
                )}
              </div>
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={10} />
                  <span>Created {formatDate(stockOut.createdAt || stockOut.lastModified)}</span>
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
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product/Transaction</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((stockOut, index) => (
              <tr key={stockOut.localId || stockOut.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                    {startIndex + index + 1}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                      <Package size={12} />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        {stockOut.stockin?.product?.productName || stockOut?.backorder?.productName || 'Sale Transaction'}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <div className={`w-1 h-1 rounded-full ${stockOut.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <span className="text-xs text-gray-500">{stockOut.synced ? 'Synced' : 'Syncing...'}</span>
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
                <td className="px-3 py-2">
                  <div className="text-xs text-gray-900 max-w-xs">
                    <div className="line-clamp-2">
                      {stockOut.clientName || stockOut.clientEmail || stockOut.clientPhone || 'No client info'}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Hash size={12} className="text-gray-400" />
                    <span className="text-sm text-gray-900">{stockOut.offlineQuantity ?? stockOut.quantity ?? '0'}</span>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <DollarSign size={12} className="text-gray-400" />
                    <span className="text-sm text-gray-900">{formatPrice(stockOut.soldPrice)}</span>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <DollarSign size={12} className="text-gray-400" />
                    <span className="text-sm text-gray-900">{formatPrice(((stockOut.offlineQuantity ?? stockOut.quantity) || 1) * stockOut.soldPrice)}</span>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      stockOut?.synced ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    <div className={`w-1 h-1 rounded-full ${stockOut.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    {stockOut?.synced ? 'Synced' : 'Syncing...'}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={10} className="text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {formatDate(stockOut.createdAt || stockOut.lastModified)}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openViewModal(stockOut)}
                      className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={12} />
                    </button>
                    {stockOut.synced && (
                      <button
                        onClick={() => openEditModal(stockOut)}
                        className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={12} />
                      </button>
                    )}
                    {stockOut.transactionId && (
                      <button
                        onClick={() => handleShowInvoiceComponent(stockOut.transactionId)}
                        className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="View Invoice"
                      >
                        <Receipt size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => openDeleteModal(stockOut)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          {notification.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
          {notification.message}
        </div>
      )}
      <InvoiceComponent isOpen={isInvoiceNoteOpen} onClose={handleCloseInvoiceModal} transactionId={transactionId} />
      <div className="h-full overflow-y-auto mx-auto">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary-600 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg lg:text-xl font-bold text-gray-900">Stock Out Management</h1>
            </div>

          </div>
          <p className="text-xs text-gray-600">Manage your sales transactions and track outgoing stock - works offline and syncs when online</p>
        </div>
        {statistics && <StatisticsCards />}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 p-3">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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
              <div className="relative">
                <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-36 pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-xs"
                  placeholder="Start Date"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full sm:w-36 pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-xs"
                  placeholder="End Date"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {(searchTerm || startDate || endDate) && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center justify-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors shadow-sm text-xs"
                  title="Clear Filters"
                >
                  <X size={14} />
                  Clear Filters
                </button>
              )}
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                  isOnline ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}
                title={isOnline ? 'Online' : 'Offline'}
              >
                {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              </div>
              {isOnline && (
                <button
                  onClick={handleManualSync}
                  disabled={isLoading}
                  className="flex items-center justify-center w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  title="Sync now"
                >
                  <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} />
                </button>
              )}
              {isOnline && (
                <button
                  onClick={() => loadStockOuts(true)}
                  disabled={isRefreshing}
                  className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              )}
              <button
                onClick={openAddModal}
                disabled={isLoading}
                className="flex items-center justify-center px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg transition-colors shadow-sm text-xs"
                title="Add Sale Transaction"
              >
                <Plus size={14} />
                Add Sale
              </button>
            </div>
          </div>
        </div>
        {isLoading && !isRefreshing ? (
          <div className="text-center py-10">
            <div className="inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
              <p className="text-xs text-gray-600">Loading stock-outs...</p>
            </div>
          </div>
        ) : filteredStockOuts.length === 0 ? (
          <div className="text-center py-10">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">No stock-outs found</h3>
            <p className="text-xs text-gray-600 mb-3">{searchTerm || startDate || endDate ? 'Try adjusting your filters.' : 'Get started by adding your first sale transaction.'}</p>
            {!searchTerm && !startDate && !endDate && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors text-xs"
              >
                <Plus size={14} />
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
        {/* <UpsertStockOutModal
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
        /> */}
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