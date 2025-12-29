import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Package, DollarSign, Hash, User, Check, AlertTriangle, Calendar, Eye, Phone, Mail, Receipt, Wifi, WifiOff, RotateCcw, RefreshCw, ChevronLeft, ChevronRight, FileText, TrendingUp, X, Grid3x3, Table2, Filter, RotateCcw as ReturnIcon, ArrowUpToLine, ShoppingBag, Menu, MoreVertical } from 'lucide-react';
import salesReturnService from '../../services/salesReturnService';
import UpsertSalesReturnModal from '../../components/dashboard/salesReturn/UpsertSalesReturnModal';
import ViewSalesReturnModal from '../../components/dashboard/salesReturn/ViewSalesReturnModal';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';
import CreditNoteComponent from '../../components/dashboard/salesReturn/CreditNote';
import { db } from '../../db/database';
import { useNetworkStatusContext } from '../../context/useNetworkContext';
import { useSalesReturnOfflineSync } from '../../hooks/useSalesReturnOfflineSync';
import stockOutService from '../../services/stockoutService';
import stockInService from '../../services/stockinService';
import backOrderService from '../../services/backOrderService';
import productService from '../../services/productService';
import { useNavigate } from 'react-router-dom';

const SalesReturnManagement = ({ role }) => {
  const [salesReturns, setSalesReturns] = useState([]);
  const [filteredSalesReturns, setFilteredSalesReturns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedSalesReturn, setSelectedSalesReturn] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const { isOnline } = useNetworkStatusContext();
  const { triggerSync, syncError } = useSalesReturnOfflineSync();
  const [isCreditNoteOpen, setIsCreditNoteOpen] = useState(false);
  const [salesReturnId, setSalesReturnId] = useState(null);
  const { user: employeeData } = useEmployeeAuth();
  const { user: adminData } = useAdminAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState('table');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Check screen size and adjust view mode
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('card');
      } else if (window.innerWidth < 1024) {
        setViewMode('grid');
      }
    };
    
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadSalesReturns();
    const params = new URLSearchParams(window.location.search);
    const saleId = params.get("salesReturnId");
    if (saleId?.trim()) {
      setSalesReturnId(saleId);
      setIsCreditNoteOpen(true);
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
    const filtered = salesReturns.filter(salesReturn => {
      const matchesSearch =
        salesReturn.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        salesReturn.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        salesReturn.creditnoteId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        salesReturn.items?.some(item =>
          item.stockout?.stockin?.product?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.stockout?.backorder?.productName?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const salesReturnDate = new Date(salesReturn.createdAt || salesReturn.lastModified);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);

      const matchesDate =
        (!start || salesReturnDate >= start) &&
        (!end || salesReturnDate <= end);

      return matchesSearch && matchesDate;
    });
    setFilteredSalesReturns(filtered);
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, salesReturns]);

  useEffect(() => {
    const stats = calculateSalesReturnStatistics(filteredSalesReturns);
    setStatistics(stats);
  }, [filteredSalesReturns]);

  const calculateSalesReturnStatistics = (returns) => {
    if (!Array.isArray(returns) || returns.length === 0) {
      return {
        totalReturns: 0,
        totalItems: 0,
        totalQuantity: 0,
        averageItemsPerReturn: 0,
        recentReturns: 0
      };
    }

    const totalItems = returns.reduce((sum, ret) => sum + (ret.items?.length || 0), 0);
    const totalQuantity = returns.reduce((sum, ret) =>
      sum + (ret.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentReturns = returns.filter(salesReturn => 
      new Date(salesReturn.createdAt || salesReturn.lastModified) > thirtyDaysAgo
    ).length;

    return {
      totalReturns: returns.length,
      totalItems,
      totalQuantity,
      averageItemsPerReturn: returns.length > 0 ? (totalItems / returns.length).toFixed(1) : 0,
      recentReturns
    };
  };

  const loadSalesReturns = async (showRefreshLoader = false) => {
    if (showRefreshLoader) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      if (isOnline) await triggerSync();

      const [
        allSalesReturns,
        offlineAdds,
        offlineUpdates,
        offlineDeletes,
        allReturnItems,
        offlineItemAdds,
        stockOutsData
      ] = await Promise.all([
        db.sales_returns_all.toArray(),
        db.sales_returns_offline_add.toArray(),
        db.sales_returns_offline_update.toArray(),
        db.sales_returns_offline_delete.toArray(),
        db.sales_return_items_all.toArray(),
        db.sales_return_items_offline_add.toArray(),
        fetchStockOuts()
      ]);

      const deleteIds = new Set(offlineDeletes.map(d => d.id));
      const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));
      const stockOutMap = new Map(stockOutsData.map(s => [s.id || s.localId, s]));

      const combinedReturnItems = allReturnItems
        .concat(offlineItemAdds.map(a => ({ ...a, synced: false })))
        .reduce((acc, item) => {
          const key = item.salesReturnId;
          if (!acc[key]) acc[key] = [];
          acc[key].push({
            ...item,
            stockout: stockOutMap.get(item.stockoutId),
            synced: item.synced || true
          });
          return acc;
        }, {});

      const syncedReturns = allSalesReturns
        .filter(sr => !deleteIds.has(sr.id))
        .map(sr => ({
          ...sr,
          ...updateMap.get(sr.id),
          synced: !updateMap.has(sr.id),
          items: combinedReturnItems[sr.id] || []
        }));

      const offlineReturns = offlineAdds.map(sr => ({
        ...sr,
        synced: false,
        items: combinedReturnItems[sr.localId] || []
      }));

      const combinedSalesReturns = [...syncedReturns, ...offlineReturns]
        .sort((a, b) => new Date(b.createdAt || b.lastModified) - new Date(a.createdAt || a.lastModified));

      setSalesReturns(combinedSalesReturns);
      setFilteredSalesReturns(combinedSalesReturns);

      if (showRefreshLoader) {
        setNotification({
          type: 'success',
          message: 'Sales returns refreshed successfully!'
        });
      }
      
      if (!isOnline && combinedSalesReturns.length === 0) {
        setNotification({
          type: 'warning',
          message: 'No offline data available'
        });
      }
    } catch (error) {
      console.error('Error loading sales returns:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load sales returns'
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchStockOuts = async () => {
    try {
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
          synced: !updateMap.has(so.id),
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

      return combinedStockOuts;
    } catch (error) {
      console.error('Error loading stock-outs:', error);
      return [];
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
        .map(c => ({ ...c, ...updateMap.get(c.id), synced: !updateMap.has(c.id) }))
        .concat(offlineAdds.map(a => ({ ...a, synced: false })))
        .sort((a, b) => a.synced - b.synced);

      return combinedStockin;
    } catch (error) {
      console.error('Error fetching stock-ins:', error);
      return [];
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
      return [];
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
        .map(c => ({ ...c, ...updateMap.get(c.id), synced: !updateMap.has(c.id) }))
        .concat(offlineAdds.map(a => ({ ...a, synced: false })))
        .sort((a, b) => a.synced - b.synced);

      return combinedProducts;
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  };

  const handleAddSalesReturn = async (returnData) => {
    setIsLoading(true);
    try {
      if (!adminData?.id && !employeeData?.id) {
        throw new Error('User authentication required');
      }

      const userInfo = role === 'admin' && adminData?.id
        ? { adminId: adminData.id }
        : { employeeId: employeeData.id };

      const now = new Date();
      const creditNoteID = `credit-note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (!returnData.transactionId) {
        throw new Error('Transaction ID is required');
      }
      if (!returnData.items || returnData.items.length === 0) {
        throw new Error('At least one item must be provided');
      }

      const newReturn = {
        transactionId: returnData.transactionId,
        reason: returnData.reason,
        creditnoteId: returnData.creditnoteId || creditNoteID,
        ...userInfo,
        lastModified: now,
        createdAt: now,
        updatedAt: now
      };

      const localId = await db.sales_returns_offline_add.add(newReturn);

      for (const item of returnData.items) {
        if (!item.stockoutId || !item.quantity) {
          throw new Error('Each item must have a stockoutId and quantity');
        }

        const itemRecord = {
          salesReturnId: localId,
          stockoutId: item.stockoutId,
          quantity: item.quantity,
          ...userInfo,
          createdAt: now,
          updatedAt: now
        };

        await db.sales_return_items_offline_add.add(itemRecord);
        await restoreStockQuantity(item.stockoutId, item.quantity);
      }

      if (isOnline) {
        try {
          const requestData = {
            transactionId: newReturn.transactionId,
            reason: newReturn.reason,
            creditnoteId: newReturn.creditnoteId,
            items: returnData.items.map(i => ({
              stockoutId: i.stockoutId,
              quantity: i.quantity
            })),
            ...userInfo,
            createdAt: now
          };

          const response = await salesReturnService.createSalesReturn(requestData);

          await db.sales_returns_all.put({
            id: response.salesReturn.id,
            transactionId: response.salesReturn.transactionId,
            reason: response.salesReturn.reason,
            creditnoteId: response.salesReturn.creditnoteId,
            ...userInfo,
            createdAt: response.salesReturn.createdAt || now,
            updatedAt: response.salesReturn.updatedAt || now,
            lastModified: response.salesReturn.lastModified || now
          });

          for (const item of response.salesReturn.items) {
            await db.sales_return_items_all.put({
              id: item.id,
              salesReturnId: item.salesReturnId,
              stockoutId: item.stockoutId,
              quantity: item.quantity,
              ...userInfo,
              createdAt: item.createdAt || now,
              updatedAt: item.updatedAt || now
            });
          }

          await db.sales_returns_offline_add.delete(localId);
          await db.sales_return_items_offline_add
            .where('salesReturnId')
            .equals(localId)
            .delete();

          await db.synced_sales_return_ids.add({
            localId,
            serverId: response.salesReturn.id,
            syncedAt: now
          });

          updateSearchParam('salesReturnId', response.salesReturn.id);
          setSalesReturnId(response.salesReturn.id);
          setIsCreditNoteOpen(true);
          
          setNotification({
            type: 'success',
            message: 'Sales return processed successfully!'
          });
        } catch (error) {
          console.warn('Error posting sales return to server, keeping offline:', error);
          updateSearchParam('salesReturnId', localId);
          setSalesReturnId(localId);
          setIsCreditNoteOpen(true);
          
          setNotification({
            type: 'warning',
            message: 'Sales return saved offline (will sync when online)'
          });
        }
      } else {
        updateSearchParam('salesReturnId', localId);
        setSalesReturnId(localId);
        setIsCreditNoteOpen(true);
        
        setNotification({
          type: 'warning',
          message: 'Sales return saved offline (will sync when online)'
        });
      }

      await loadSalesReturns();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error processing sales return:', error);
      setNotification({
        type: 'error',
        message: `Failed to process sales return: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const restoreStockQuantity = async (stockoutId, returnQuantity) => {
    try {
      const stockout =
        (await db.stockouts_all.get(stockoutId)) ||
        (await db.stockouts_offline_add.where('localId').equals(stockoutId).first()) ||
        (await db.stockouts_offline_update.get(stockoutId));

      if (!stockout) {
        console.warn(`Stockout ${stockoutId} not found`);
        return;
      }

      if (stockout.id) {
        const existingStockout = await db.stockouts_all.get(stockout.id);
        if (existingStockout) {
          const newQuantity = (existingStockout.quantity || 0) - returnQuantity;
          await db.stockouts_all.update(stockout.id, { quantity: newQuantity });
        }
      }

      if (stockout.localId) {
        const offlineStockout = await db.stockouts_offline_add.get(stockout.localId);
        if (offlineStockout) {
          const newQuantity = (offlineStockout.offlineQuantity || offlineStockout.quantity || 0) - returnQuantity;
          await db.stockouts_offline_add.update(stockout.localId, { offlineQuantity: newQuantity });
        }
      }

      if (stockout.stockinId) {
        const stockin = await db.stockins_all.get(stockout.stockinId);
        if (stockin) {
          const newQuantity = (stockin.quantity || 0) + returnQuantity;
          await db.stockins_all.update(stockout.stockinId, { quantity: newQuantity });
        } else {
          const offlineStockin = await db.stockins_offline_add.get(stockout.stockinId);
          if (offlineStockin) {
            const newQuantity = (offlineStockin.offlineQuantity || offlineStockin.quantity || 0) + returnQuantity;
            await db.stockins_offline_add.update(stockout.stockinId, { offlineQuantity: newQuantity });
          }
        }
      }
    } catch (error) {
      console.error('Error restoring stock quantity:', error);
    }
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      const now = new Date();

      if (selectedSalesReturn.id) {
        if (isOnline) {
          await salesReturnService.deleteSalesReturn(selectedSalesReturn.id, userData);
          await db.sales_returns_all.delete(selectedSalesReturn.id);
          setNotification({
            type: 'success',
            message: 'Sales return deleted successfully!'
          });
        } else {
          await db.sales_returns_offline_delete.add({
            id: selectedSalesReturn.id,
            deletedAt: now,
            ...userData
          });
          setNotification({
            type: 'warning',
            message: 'Sales return deletion queued (will sync when online)'
          });
        }
      } else {
        await db.sales_returns_offline_add.delete(selectedSalesReturn.localId);
        await db.sales_return_items_offline_add
          .where('salesReturnId')
          .equals(selectedSalesReturn.localId)
          .delete();
        
        setNotification({
          type: 'success',
          message: 'Sales return deleted!'
        });
      }

      await loadSalesReturns();
      setIsDeleteModalOpen(false);
      setSelectedSalesReturn(null);
    } catch (error) {
      console.error('Error deleting sales return:', error);
      setNotification({
        type: 'error',
        message: `Failed to delete sales return: ${error.message}`
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
      await loadSalesReturns();
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

  const handleCloseCreditModal = () => {
    setIsCreditNoteOpen(false);
    setSalesReturnId(null);
    updateSearchParam("salesReturnId");
  };

  const openAddModal = () => {
    navigate(role === 'admin' ? '/admin/dashboard/sales-return/create' : '/employee/dashboard/sales-return/create');
  };

  const openEditModal = (salesReturn) => {
    if (!salesReturn.id) return setNotification({message:'Cannot edit unsynced sales return', type:'error'});
    navigate(role === 'admin' ? `/admin/dashboard/sales-return/update/${salesReturn.id}` : `/employee/dashboard/sales-return/update/${salesReturn.id}`);
  };

  const openDeleteModal = (salesReturn) => {
    setSelectedSalesReturn(salesReturn);
    setIsDeleteModalOpen(true);
  };

  const openViewModal = (salesReturn) => {
    setSelectedSalesReturn(salesReturn);
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

  const getProductNames = (salesReturn) => {
    if (!salesReturn.items || salesReturn.items.length === 0) return 'No items';

    const names = salesReturn.items
      .map(item => item.stockout?.stockin?.product?.productName || item.stockout?.backorder?.productName)
      .filter(name => name)
      .slice(0, 2);

    if (salesReturn.items.length > 2) {
      return `${names.join(', ')} +${salesReturn.items.length - 2} more`;
    }

    return names.join(', ') || 'Unknown products';
  };

  const getTotalItemsCount = (salesReturn) => {
    return salesReturn.items ? salesReturn.items.length : 0;
  };

  const getTotalQuantity = (salesReturn) => {
    return salesReturn.items ?
      salesReturn.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
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

  const handleClearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setFilteredSalesReturns(salesReturns);
    setCurrentPage(1);
  };

  const handleOpenCreditNote = (Id) => {
    if (!Id) return setNotification({message:'Please select a sales return', type:'error'});
    updateSearchParam('salesReturnId', Id);
    setSalesReturnId(Id);
    setIsCreditNoteOpen(true);
  };

  const totalPages = Math.ceil(filteredSalesReturns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredSalesReturns.slice(startIndex, endIndex);

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

  const StatisticsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-2 p-2 md:p-3">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 md:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs md:text-xs font-medium text-gray-600">Total Returns</p>
            <p className="text-base md:text-lg font-bold text-gray-900">{statistics?.totalReturns || 0}</p>
            <p className="text-xs text-gray-500 mt-0.5 md:mt-1">{statistics?.recentReturns || 0} recent</p>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <ReturnIcon className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 md:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs md:text-xs font-medium text-gray-600">Total Items</p>
            <p className="text-base md:text-lg font-bold text-gray-900">{statistics?.totalItems || 0}</p>
            <p className="text-xs text-gray-500 mt-0.5 md:mt-1">Items returned</p>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 md:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs md:text-xs font-medium text-gray-600">Total Quantity</p>
            <p className="text-base md:text-lg font-bold text-gray-900">{statistics?.totalQuantity || 0}</p>
            <p className="text-xs text-gray-500 mt-0.5 md:mt-1">Units returned</p>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 md:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs md:text-xs font-medium text-gray-600">Avg Items/Return</p>
            <p className="text-base md:text-lg font-bold text-gray-900">{statistics?.averageItemsPerReturn || 0}</p>
            <p className="text-xs text-gray-500 mt-0.5 md:mt-1">Per transaction</p>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Hash className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );

  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-white">
      <div className="flex items-center gap-2">
        <p className="text-xs text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredSalesReturns.length)} of {filteredSalesReturns.length}
        </p>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-2 py-1.5 text-xs border rounded-md transition-colors ${
              currentPage === 1
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft size={10} />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <div className="flex items-center gap-1 mx-1">
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-2.5 py-1.5 text-xs rounded-md transition-colors ${
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
            className={`flex items-center gap-1 px-2 py-1.5 text-xs border rounded-md transition-colors ${
              currentPage === totalPages
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={10} />
          </button>
        </div>
      )}
    </div>
  );

  const GridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mb-6">
      {(currentItems || []).map((salesReturn, index) => (
        <div
          key={salesReturn.localId || salesReturn.id}
          className={`bg-white rounded-lg border hover:shadow-md transition-all duration-200 ${salesReturn.synced ? 'border-gray-200' : 'border-yellow-200'}`}
        >
          <div className="p-3 md:p-4">
            <div className="flex items-start justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <ReturnIcon size={14} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs md:text-sm text-gray-900 truncate" title={salesReturn.transactionId}>
                    Return #{salesReturn.transactionId?.substring(0, 8)}...
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${salesReturn.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span className="text-xs text-gray-500">{salesReturn.synced ? 'Synced' : 'Pending'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5 md:space-y-2 mb-2 md:mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Items:</span>
                <span className="text-xs font-bold text-primary-600">{getTotalItemsCount(salesReturn)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Quantity:</span>
                <span className="text-xs text-gray-900">{getTotalQuantity(salesReturn)}</span>
              </div>
              {salesReturn.reason && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Reason:</span>
                  <span className="text-xs text-gray-900 truncate max-w-[100px] md:max-w-[120px]" title={salesReturn.reason}>{salesReturn.reason}</span>
                </div>
              )}
            </div>
            
            <div className="pt-2 md:pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar size={10} className="md:hidden" />
                  <Calendar size={12} className="hidden md:block" />
                  <span className="text-xs">{formatDate(salesReturn.createdAt)}</span>
                </div>
                <div className="flex gap-0.5 md:gap-1">
                  <button
                    onClick={() => openViewModal(salesReturn)}
                    disabled={isLoading}
                    className="p-1 md:p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={12} className="md:hidden" />
                    <Eye size={14} className="hidden md:block" />
                  </button>
                  {salesReturn.creditnoteId && (
                    <button
                      onClick={() => handleOpenCreditNote(salesReturn.id || salesReturn.localId)}
                      disabled={isLoading}
                      className="p-1 md:p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="View Credit Note"
                    >
                      <Receipt size={12} className="md:hidden" />
                      <Receipt size={14} className="hidden md:block" />
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(salesReturn)}
                    disabled={isLoading}
                    className="p-1 md:p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={12} className="md:hidden" />
                    <Edit3 size={14} className="hidden md:block" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(salesReturn)}
                    disabled={isLoading}
                    className="p-1 md:p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} className="md:hidden" />
                    <Trash2 size={14} className="hidden md:block" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const TableView = () => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6 p-2 md:p-3 mx-1 md:mx-3">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Transaction</th>
              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b hidden md:table-cell">Items</th>
              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b hidden lg:table-cell">Quantity</th>
              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b hidden lg:table-cell">Products</th>
              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b hidden xl:table-cell">Reason</th>
              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Status</th>
              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Date</th>
              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(currentItems || []).map((salesReturn, index) => (
              <tr key={salesReturn.localId || salesReturn.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <ReturnIcon size={12} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-xs md:text-sm text-gray-900 truncate max-w-[80px] md:max-w-none">
                        {salesReturn.transactionId || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 md:hidden">{getTotalItemsCount(salesReturn)} items</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap hidden md:table-cell">
                  <div className="text-sm text-gray-900">
                    {getTotalItemsCount(salesReturn)} items
                  </div>
                </td>
                <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap hidden lg:table-cell">
                  <div className="flex items-center gap-1 md:gap-2">
                    <TrendingUp size={12} className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">{getTotalQuantity(salesReturn)}</span>
                  </div>
                </td>
                <td className="px-3 py-2 md:px-4 md:py-3 hidden lg:table-cell">
                  <span className="text-sm text-gray-900 truncate max-w-[150px] md:max-w-[200px] block">
                    {getProductNames(salesReturn)}
                  </span>
                </td>
                <td className="px-3 py-2 md:px-4 md:py-3 hidden xl:table-cell">
                  <span className="text-sm text-gray-600 truncate max-w-[120px] md:max-w-[150px] block">
                    {salesReturn.reason || 'No reason'}
                  </span>
                </td>
                <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium ${salesReturn.synced ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${salesReturn.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span className="hidden sm:inline">{salesReturn.synced ? 'Synced' : 'Pending'}</span>
                  </span>
                </td>
                <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 md:gap-2">
                    <Calendar size={12} className="text-gray-400 hidden md:block" />
                    <span className="text-xs md:text-sm text-gray-600">{formatDate(salesReturn.createdAt)}</span>
                  </div>
                </td>
                <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap">
                  <div className="flex items-center gap-0.5 md:gap-1">
                    <button
                      onClick={() => openViewModal(salesReturn)}
                      disabled={isLoading}
                      className="p-1.5 md:p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={14} className="md:hidden" />
                      <Eye size={16} className="hidden md:block" />
                    </button>
                    {salesReturn.creditnoteId && (
                      <button
                        onClick={() => handleOpenCreditNote(salesReturn.id || salesReturn.localId)}
                        disabled={isLoading}
                        className="p-1.5 md:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 rounded-lg transition-colors"
                        title="View Credit Note"
                      >
                        <Receipt size={14} className="md:hidden" />
                        <Receipt size={16} className="hidden md:block" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(salesReturn)}
                      disabled={isLoading}
                      className="p-1.5 md:p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={14} className="md:hidden" />
                      <Edit3 size={16} className="hidden md:block" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(salesReturn)}
                      disabled={isLoading}
                      className="p-1.5 md:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} className="md:hidden" />
                      <Trash2 size={16} className="hidden md:block" />
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
    <div className="md:hidden">
      <div className="grid grid-cols-1 gap-3 mb-6">
        {(currentItems || []).map((salesReturn, index) => (
          <div
            key={salesReturn.localId || salesReturn.id}
            className={`bg-white rounded-lg border hover:shadow-md transition-shadow ${salesReturn.synced ? 'border-gray-200' : 'border-yellow-200'}`}
          >
            <div className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <ReturnIcon size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-gray-900 truncate max-w-[150px]" title={salesReturn.transactionId}>
                        Return #{salesReturn.transactionId?.substring(0, 10)}...
                      </h3>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openViewModal(salesReturn)}
                          disabled={isLoading}
                          className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={() => openEditModal(salesReturn)}
                          disabled={isLoading}
                          className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${salesReturn.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <span className="text-xs text-gray-500">{salesReturn.synced ? 'Synced' : 'Pending'}</span>
                      <span className="text-xs text-gray-500 mx-2">•</span>
                      <Calendar size={10} className="text-gray-400" />
                      <span className="text-xs text-gray-500">{formatDate(salesReturn.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 mb-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-600">Items:</span>
                  <span className="font-bold text-primary-600">{getTotalItemsCount(salesReturn)} items</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-600">Quantity:</span>
                  <span className="text-gray-900">{getTotalQuantity(salesReturn)} units</span>
                </div>
                {salesReturn.reason && (
                  <div className="text-xs">
                    <span className="font-medium text-gray-600">Reason: </span>
                    <span className="text-gray-900 truncate">{salesReturn.reason}</span>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {salesReturn.creditnoteId && (
                      <button
                        onClick={() => handleOpenCreditNote(salesReturn.id || salesReturn.localId)}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                      >
                        <Receipt size={10} />
                        Credit Note
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => openDeleteModal(salesReturn)}
                    disabled={isLoading}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
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

  const MobileHeaderActions = () => (
    <div className="md:hidden">
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
        >
          <Menu size={20} />
        </button>
        
        <div className="flex gap-2">
          {(searchTerm || startDate || endDate) && (
            <button
              onClick={handleClearFilters}
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              title="Clear Filters"
            >
              <X size={16} />
            </button>
          )}
          
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
          >
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="text-xs font-medium">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {isOnline && (
            <button
              onClick={handleManualSync}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              <RotateCcw size={16} className={isLoading ? 'animate-spin' : ''} />
              Sync Now
            </button>
          )}
          
          {isOnline && (
            <button
              onClick={() => loadSalesReturns(true)}
              disabled={isRefreshing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh Data
            </button>
          )}
          
          <div className="flex gap-2 border-t border-gray-100 pt-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded transition-colors text-xs ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Grid3x3 size={14} />
              Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded transition-colors text-xs ${viewMode === 'table' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Table2 size={14} />
              Table
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-[90vh] px-2 md:px-0">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-red-500 text-white'
          } animate-in slide-in-from-top-2 duration-300`}
        >
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span className="text-xs md:text-sm">{notification.message}</span>
        </div>
      )}
      <CreditNoteComponent isOpen={isCreditNoteOpen} onClose={handleCloseCreditModal} salesReturnId={salesReturnId} />
      
      <div className="h-full">
        {/* Header Section - Responsive */}
        <div className="mb-4 shadow-md bg-white p-3 md:p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-start justify-between md:block">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">Sales Returns</h1>
                  <p className="text-xs md:text-sm text-gray-600 mt-1 hidden md:block">
                    Manage product returns, track returned inventory, and generate credit notes
                  </p>
                  <p className="text-xs text-gray-600 mt-1 md:hidden">
                    Manage returns and credit notes
                  </p>
                </div>
                
                {/* Mobile header actions */}
                <div className="md:hidden">
                  <button
                    onClick={openAddModal}
                    disabled={isLoading}
                    className="p-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    title="New Return"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop header actions */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex gap-2">
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
                    onClick={() => loadSalesReturns(true)}
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
                className="flex items-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <Plus size={18} />
                <span className="text-sm font-semibold">New Return</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile header actions menu */}
        <MobileHeaderActions />

        {/* Statistics Cards */}
        {statistics && <StatisticsCards />}

        {/* Search and Filter Bar - Responsive */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 p-3 mx-1 md:mx-3">
          <div className="flex flex-col gap-4">
            {/* Search input - full width on mobile */}
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
                <input
                  type="text"
                  placeholder="Search by transaction ID, reason, product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 md:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-xs"
                />
              </div>
            </div>
            
            {/* Date filters and view toggle - responsive layout */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-none">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full sm:w-40 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-xs"
                    />
                  </div>
                  <div className="flex-1 sm:flex-none">
                    <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full sm:w-40 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* View mode toggle - desktop only (mobile is in MobileHeaderActions) */}
              <div className="hidden md:flex items-center gap-2">
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
        </div>

        {/* Main Content */}
        {isLoading && !isRefreshing ? (
          <div className="text-center py-12 md:py-16">
            <div className="inline-flex flex-col items-center gap-3 md:gap-4">
              <div className="relative">
                <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                <ReturnIcon className="w-6 h-6 md:w-8 md:h-8 text-primary-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div>
                <p className="text-base md:text-lg font-medium text-gray-900 mb-1 md:mb-2">Loading Sales Returns</p>
                <p className="text-xs md:text-sm text-gray-600">Please wait while we fetch your return data...</p>
              </div>
            </div>
          </div>
        ) : filteredSalesReturns.length === 0 ? (
          <div className="text-center py-12 md:py-16 bg-white rounded-lg border border-gray-200 mx-2 md:mx-0">
            <div className="max-w-md mx-auto px-4">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <ReturnIcon className="w-8 h-8 md:w-12 md:h-12 text-blue-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3">No Sales Returns Found</h3>
              <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6">
                {searchTerm || startDate || endDate 
                  ? 'Try adjusting your search or date filters.' 
                  : 'Get started by processing your first sales return.'}
              </p>
              {!(searchTerm || startDate || endDate) && (
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors text-sm md:text-base"
                >
                  <Plus size={16} className="md:hidden" />
                  <Plus size={18} className="hidden md:block" />
                  <span>Process First Return</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <GridView />
            ) : viewMode === 'card' ? (
              <CardView />
            ) : (
              <>
                <CardView />
                <TableView />
              </>
            )}
          </>
        )}

        {/* Modals */}
        <ViewSalesReturnModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedSalesReturn(null);
          }}
          salesReturn={selectedSalesReturn}
        />
     
      </div>
    </div>
  );
};

export default SalesReturnManagement;