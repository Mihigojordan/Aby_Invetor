import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Eye, Package, DollarSign, Hash, User, Check, AlertTriangle, Calendar, ChevronLeft, ChevronRight, RotateCcw, FileText, Filter, Download, RefreshCw, TrendingUp, Wifi, WifiOff, Receipt } from 'lucide-react';
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedSalesReturn, setSelectedSalesReturn] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    reason: 'all',
    startDate: '',
    endDate: ''
  });

    
  const [isCreditNoteOpen, setIsCreditNoteOpen] = useState(false);
  const [salesReturnId, setSalesReturnId] = useState(null);

  const { user: employeeData } = useEmployeeAuth();
  const { user: adminData } = useAdminAuth();
  const { isOnline } = useNetworkStatusContext();
  const { triggerSync, syncError } = useSalesReturnOfflineSync();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const navigate =  useNavigate();

  useEffect(() => {
    loadSalesReturns();
    if (isOnline) handleManualSync();

    const params = new URLSearchParams(window.location.search);
    const saleId = params.get("salesReturnId");
    if (saleId?.trim()) {
      setSalesReturnId(saleId);
      setIsCreditNoteOpen(true);
    }
  }, [isOnline]);

  useEffect(() => {
    if (syncError) {
      showNotification(`Sync error: ${syncError}`, 'error');
    }
  }, [syncError]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, salesReturns, filters]);

  const loadSalesReturns = async () => {
    setIsLoading(true);
    try {
      if (isOnline) await triggerSync();

      // Load all offline data
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

      // Create maps for efficient lookups
      const deleteIds = new Set(offlineDeletes.map(d => d.id));
      const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));
      const stockOutMap = new Map(stockOutsData.map(s => [s.id || s.localId, s]));

      // Combine all return items
      const combinedReturnItems = allReturnItems
        .concat(offlineItemAdds.map(a => ({ ...a, synced: false })))
        .reduce((acc, item) => {
          const key = item.salesReturnId || item.salesReturnId;
          if (!acc[key]) acc[key] = [];
          acc[key].push({
            ...item,
            stockout: stockOutMap.get(item.stockoutId)
          });
          return acc;
        }, {});

      // Process synced sales returns
      const syncedReturns = allSalesReturns
        .filter(sr => !deleteIds.has(sr.id))
        .map(sr => ({
          ...sr,
          ...updateMap.get(sr.id),
          synced: true,
          items: combinedReturnItems[sr.id] || []
        }));

      // Process offline sales returns
      const offlineReturns = offlineAdds.map(sr => ({
        ...sr,
        synced: false,
        items: combinedReturnItems[sr.localId] || []
      }));

      const combinedSalesReturns = [...syncedReturns, ...offlineReturns]
        .sort((a, b) => new Date(b.createdAt || b.lastModified) - new Date(a.createdAt || a.lastModified));

      setSalesReturns(combinedSalesReturns);
      setFilteredSalesReturns(combinedSalesReturns);

      // Calculate statistics
      const stats = calculateReturnStatistics(combinedSalesReturns);
      setStatistics(stats);

      if (!isOnline && combinedSalesReturns.length === 0) {
        showNotification('No offline data available', 'warning');
      }
    } catch (error) {
      console.error('Error loading sales returns:', error);
      showNotification('Failed to load sales returns', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStockOuts = async () => {
    setIsLoading(true);
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
          synced:updateMap.get(so.id) ? false : true ,
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
      showNotification('Failed to load stock-outs', 'error');
    } finally {
      setIsLoading(false);
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
        .map(c => ({
          ...c,
          ...updateMap.get(c.id),
          synced: true
        }))
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
        .map(c => ({
          ...c,
          synced: true
        }))
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
          .map(c => ({
            ...c,
            synced: true
          }))
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
        .map(c => ({
          ...c,
          ...updateMap.get(c.id),
          synced: true
        }))
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
          .map(c => ({
            ...c,
            ...updateMap.get(c.id),
            synced: true
          }))
          .concat(offlineAdds.map(a => ({ ...a, synced: false })))
          .sort((a, b) => a.synced - b.synced);

        return combinedProducts;
      }
    }
  };

  const calculateReturnStatistics = (returns) => {
    if (!Array.isArray(returns) || returns.length === 0) {
      return {
        totalReturns: 0,
        totalItems: 0,
        totalQuantity: 0,
        averageItemsPerReturn: 0
      };
    }

    const totalItems = returns.reduce((sum, ret) => sum + (ret.items?.length || 0), 0);
    const totalQuantity = returns.reduce((sum, ret) =>
      sum + (ret.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0);

    return {
      totalReturns: returns.length,
      totalItems,
      totalQuantity,
      averageItemsPerReturn: returns.length > 0 ? (totalItems / returns.length).toFixed(1) : 0
    };
  };

  const applyFilters = () => {
    const salesReturnsArray = Array.isArray(salesReturns) ? salesReturns : [];

    let filtered = salesReturnsArray.filter(salesReturn => {
      const searchMatch = !searchTerm ||
        salesReturn?.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        salesReturn?.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        salesReturn?.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        salesReturn?.items?.some(item =>
          item?.stockout?.stockin?.product?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item?.stockout?.backorder?.productName?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      let dateMatch = true;
      if (filters.dateRange !== 'all') {
        const returnDate = new Date(salesReturn.createdAt);
        const now = new Date();

        switch (filters.dateRange) {
          case 'today':
            dateMatch = returnDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateMatch = returnDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateMatch = returnDate >= monthAgo;
            break;
          case 'custom':
            if (filters.startDate && filters.endDate) {
              const startDate = new Date(filters.startDate);
              const endDate = new Date(filters.endDate);
              dateMatch = returnDate >= startDate && returnDate <= endDate;
            }
            break;
        }
      }

      const reasonMatch = filters.reason === 'all' ||
        (filters.reason === 'no-reason' && !salesReturn.reason) ||
        (filters.reason !== 'no-reason' && salesReturn.reason?.toLowerCase().includes(filters.reason.toLowerCase()));

      return searchMatch && dateMatch && reasonMatch;
    });

    setFilteredSalesReturns(filtered);
    setCurrentPage(1);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
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
      const CreditNoteID = `credit-note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (!returnData.transactionId) {
        throw new Error('Transaction ID is required');
      }
      if (!returnData.items || returnData.items.length === 0) {
        throw new Error('At least one item must be provided');
      }

      const newReturn = {
        transactionId: returnData.transactionId,
        reason: returnData.reason,
        creditnoteId: returnData.creditnoteId || CreditNoteID,
        ...userInfo,
        lastModified: now,
        createdAt: now,
        updatedAt: now
      };

      const localId = await db.sales_returns_offline_add.add(newReturn);

      const savedItems = [];
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
        savedItems.push(itemRecord);
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
          showNotification('Sales return processed successfully!');
        } catch (error) {
          console.warn('Error posting sales return to server, keeping offline:', error);
          updateSearchParam('salesReturnId', localId);
          setSalesReturnId(localId);
          setIsCreditNoteOpen(true);
          showNotification('Sales return saved offline (will sync when online)', 'warning');
        }
      } else {
        updateSearchParam('salesReturnId', localId);
        setSalesReturnId(localId);
        setIsCreditNoteOpen(true);
        showNotification('Sales return saved offline (will sync when online)', 'warning');
      }

      await loadSalesReturns();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error processing sales return:', error);
      showNotification(`Failed to process sales return: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

const restoreStockQuantity = async (stockoutId, returnQuantity) => {
  try {
    // Find stockout from either online or offline tables
    const stockout =
      (await db.stockouts_all.get(stockoutId)) ||
      (await db.stockouts_offline_add.where('localId').equals(stockoutId).first()) ||
      (await db.stockouts_offline_update.get(stockoutId));

    if (!stockout) {
      console.warn(`Stockout ${stockoutId} not found`);
      return;
    }

    // Update online stockouts
    const stockout_all = await db.stockouts_all.get(stockoutId);
    if (stockout_all) {
      await db.stockouts_all.update(stockoutId, {
        quantity: (stockout_all?.offlineQuantity ?? stockout_all.quantity) - returnQuantity,
      });
    }

    // Update offline added stockouts
    const stock_add = await db.stockouts_offline_add.get(stockoutId);
    if (stock_add) {
      await db.stockouts_offline_add.update(stockoutId, {
        offlineQuantity: (stock_add?.offlineQuantity ?? stock_add.quantity) - returnQuantity,
      });
    }

    // Update offline updated stockouts
    const stock_update = await db.stockouts_offline_update.get(stockoutId);
    if (stock_update) {
      await db.stockouts_offline_update.update(stockoutId, {
        offlineQuantity: (stock_update?.offlineQuantity ?? stock_update.quantity) - returnQuantity,
      });
    }

    // Restore quantity to stockin
    if (stockout.stockinId) {
      const stockin = await db.stockins_all.get(stockout.stockinId);
      if (stockin) {
        const newQuantity = (stockin.offlineQuantity ?? stockin.quantity) + returnQuantity;
        await db.stockins_all.update(stockout.stockinId, { quantity: newQuantity });
      } else {
        const offlineStockin = await db.stockins_offline_add.get(stockout.stockinId);
        if (offlineStockin) {
          const newQuantity = (offlineStockin.offlineQuantity ?? offlineStockin.quantity) + returnQuantity;
          await db.stockins_offline_add.update(stockout.stockinId, { offlineQuantity: newQuantity });
        }
      }
    }
  } catch (error) {
    console.error('Error restoring stock quantity:', error);
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
      await loadSalesReturns();
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

  const handleCloseCreditModal = () => {
    setIsCreditNoteOpen(false);
    setSalesReturnId(null);
    updateSearchParam("salesReturnId");
  };

  const openViewModal = (salesReturn) => {
    setSelectedSalesReturn(salesReturn);
    setIsViewModalOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalItemsCount = (salesReturn) => {
    return salesReturn.items ? salesReturn.items.length : 0;
  };

  const getTotalQuantity = (salesReturn) => {
    return salesReturn.items ?
      salesReturn.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
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

  const handleRefresh = () => {
    loadSalesReturns();
  };


  const  handleProcessReturns  = ()=>{
    const url = role == 'admin' ? '/admin/dashboard/sales-return/create' : '/employee/dashboard/sales-return/create';
    navigate(url);
  }

  const safeFilteredReturns = Array.isArray(filteredSalesReturns) ? filteredSalesReturns : [];

  const totalPages = Math.ceil(safeFilteredReturns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = safeFilteredReturns.slice(startIndex, endIndex);

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

  const handleOpenCreditNote = (Id) => {
    if (!Id) return showNotification('Didnt choose the transaction');
    updateSearchParam('salesReturnId', Id);
    setSalesReturnId(Id);
    setIsCreditNoteOpen(true);
  };

  const StatisticsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Total Returns</p>
            <p className="text-lg font-bold text-gray-900">{statistics?.totalReturns || 0}</p>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Total Items</p>
            <p className="text-lg font-bold text-gray-900">{statistics?.totalItems || 0}</p>
          </div>
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Total Quantity</p>
            <p className="text-lg font-bold text-gray-900">{statistics?.totalQuantity || 0}</p>
          </div>
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">Avg Items/Return</p>
            <p className="text-lg font-bold text-gray-900">{statistics?.averageItemsPerReturn || 0}</p>
          </div>
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Hash className="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );

  const FiltersComponent = () => (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 mb-4 transition-all duration-300 ${showFilters ? 'p-4' : 'p-0 h-0 overflow-hidden'}`}>
      {showFilters && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Filters</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {filters.dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilters({ dateRange: 'all', reason: 'all', startDate: '', endDate: '' })}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, safeFilteredReturns.length)} of {safeFilteredReturns.length} entries
        </p>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-2 py-1 text-xs border rounded-md transition-colors ${currentPage === 1
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
                className={`px-2 py-1 text-xs rounded-md transition-colors ${currentPage === page
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
            className={`flex items-center gap-1 px-2 py-1 text-xs border rounded-md transition-colors ${currentPage === totalPages
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
      <div className="grid grid-cols-1 gap-3 mb-4">
        {currentItems.map((salesReturn) => (
          <div
            key={salesReturn.id || salesReturn.localId}
            className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${salesReturn?.synced ? 'border-gray-200' : 'border-yellow-200 bg-yellow-50'
              }`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                    <RotateCcw size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mt-1">
                      {!salesReturn?.synced && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">
                          Pending sync
                        </span>
                      )}
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-500">Processed</span>
                    </div>
                  </div>
                </div>
                <div className='flex gap-2'>
                  <button
                    onClick={() => openViewModal(salesReturn)}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => handleOpenCreditNote(salesReturn.id || salesReturn.localId)}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Receipt size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Hash size={12} />
                  <span>Transaction: {salesReturn.transactionId || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Package size={12} />
                  <span>Items: {getTotalItemsCount(salesReturn)} ({getTotalQuantity(salesReturn)} qty)</span>
                </div>
                <div className="flex items-start gap-1.5 text-xs text-gray-600">
                  <FileText size={12} className="mt-0.5" />
                  <span className="line-clamp-2">{getProductNames(salesReturn)}</span>
                </div>
                {salesReturn.reason && (
                  <div className="flex items-start gap-1.5 text-xs text-gray-600">
                    <FileText size={12} className="mt-0.5" />
                    <span className="line-clamp-2">Reason: {salesReturn.reason}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar size={12} />
                  <span>{formatDate(salesReturn.createdAt)}</span>
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
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((salesReturn, index) => (
              <tr key={salesReturn.id || salesReturn.localId} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                    {startIndex + index + 1}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-900">
                      {salesReturn.transactionId || 'N/A'}
                    </span>
                    {!salesReturn?.synced && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">
                        Offline
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-xs text-gray-900">
                    <div className="font-medium">{getTotalItemsCount(salesReturn)} items</div>
                    <div className="text-gray-500">{getTotalQuantity(salesReturn)} qty total</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-xs">
                    <span className="text-xs text-gray-900 line-clamp-2">
                      {getProductNames(salesReturn)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-xs">
                    {salesReturn.reason ? (
                      <span className="text-xs text-gray-600 line-clamp-2">
                        {salesReturn.reason}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No reason provided</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs text-gray-600">
                    {formatDate(salesReturn.createdAt)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className='flex gap-2'>
                    <button
                      onClick={() => openViewModal(salesReturn)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handleOpenCreditNote(salesReturn.id || salesReturn.localId)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Receipt size={14} />
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
    <div className="bg-gray-50 p-3 max-h-[90vh] overflow-y-auto sm:p-4 lg:p-6">
      {notification && (
        <div className={`fixed top-3 right-3 z-50 flex items-center gap-1.5 px-3 py-2 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
          } animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
          <span className="text-xs">{notification.message}</span>
        </div>
      )}

      <CreditNoteComponent isOpen={isCreditNoteOpen} onClose={handleCloseCreditModal} salesReturnId={salesReturnId} />

      <div className="mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-primary-600 rounded-lg">
                <RotateCcw className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg lg:text-xl font-bold text-gray-900">Sales Return Management</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                {isOnline ? 'Online' : 'Offline'}
              </div>
              {isOnline && (
                <button
                  onClick={handleManualSync}
                  disabled={isLoading}
                  className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-full transition-colors disabled:opacity-50"
                >
                  Sync
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-600">Manage product returns and track returned inventory - works offline and syncs when online</p>
        </div>

        {/* Statistics */}
        {statistics && <StatisticsCards />}

        {/* Search and Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 p-4">
          <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by transaction ID, reason, or return ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg font-medium text-sm transition-colors ${showFilters
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Filter size={16} />
                Filters
              </button>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={handleProcessReturns}
                className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
              >
                <Plus size={16} />
                Process Return
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <FiltersComponent />

        {/* Content */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mb-3"></div>
              <p className="text-xs text-gray-600">Loading sales returns...</p>
            </div>
          </div>
        ) : safeFilteredReturns.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10">
            <div className="text-center">
              <RotateCcw className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-medium text-gray-900 mb-1">No sales returns found</h3>
              <p className="text-xs text-gray-600 mb-4">
                {searchTerm || showFilters ? 'Try adjusting your search terms or filters.' : 'No returns have been processed yet.'}
              </p>
              {!searchTerm && !showFilters && (
                <button
                  onClick={() => handleProcessReturns()}
                  className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
                >
                  <Plus size={16} />
                  Process Your First Return
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <CardView />
            <TableView />
          </>
        )}

        {/* Modals */}
        {isAddModalOpen && (
          <UpsertSalesReturnModal
            isOpen={isAddModalOpen}
            onClose={() => {
              setIsAddModalOpen(false);
              setSelectedSalesReturn(null);
            }}
            onSubmit={handleAddSalesReturn}
            isLoading={isLoading}
            title="Process Sales Return"
            currentUser={role === 'admin' ? adminData : employeeData}
            userRole={role}
          />
        )}

        {isViewModalOpen && selectedSalesReturn && (
          <ViewSalesReturnModal
            isOpen={isViewModalOpen}
            onClose={() => {
              setIsViewModalOpen(false);
              setSelectedSalesReturn(null);
            }}
            salesReturn={selectedSalesReturn}
          />
        )}
      </div>
    </div>
  );
};

export default SalesReturnManagement;