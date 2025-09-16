import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  Award,
  Calendar,
  User,
  Hash,
  Eye,
  Edit3,
  Star,
  ChevronLeft,
  ChevronRight,
  CreditCard
} from 'lucide-react';
import stockOutService from '../../services/stockoutService';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/database';
import { useNetworkStatusContext } from '../../context/useNetworkContext';
import stockInService from '../../services/stockinService';
import backOrderService from '../../services/backOrderService';
import productService from '../../services/productService';

const SalesReportPage = ({role}) => {
  const [salesData, setSalesData] = useState([]);
  const [filteredSalesData, setFilteredSalesData] = useState([]);
  const { isOnline } = useNetworkStatusContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState('today');
  const [notification, setNotification] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [periodStats, setPeriodStats] = useState({
    totalSales: 0,
    totalQuantity: 0,
    totalProfit: 0
  });

  const navigate = useNavigate();
  const [stats, setStats] = useState([
    {
      title: 'Total Sales',
      value: '$0',
      change: 'Loading...',
      icon: DollarSign,
      bgColor: 'bg-green-50',
      color: 'text-green-600',
      path: null,
    },
    {
      title: 'Total Quantity Sold',
      value: '0',
      change: 'Loading...',
      icon: ShoppingCart,
      bgColor: 'bg-blue-50',
      path: null,
      color: 'text-blue-600'
    },
    {
      title: 'Lowest Stock Out',
      value: 'Loading...',
      change: 'Product with minimum sales',
      icon: TrendingDown,
      bgColor: 'bg-red-50',
      path: null,
      color: 'text-red-600'
    },
    {
      title: 'Highest Stock Out',
      value: 'Loading...',
      change: 'Product with maximum sales',
      icon: TrendingUp,
      bgColor: 'bg-green-50',
      path: null,
      color: 'text-green-600'
    },
    {
      title: 'Non-Stock sales',
      value: 'Loading...',
      change: 'Product with maximum sales',
      icon: TrendingUp,
      bgColor: 'bg-red-50',
      path: null,
      color: 'text-green-600'
    }
  ]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const data = await stockOutService.getAllStockOuts();
      setSalesData(data);
      calculateStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching sales data:', err);
      loadStockOuts();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOnline) {
      fetchSalesData();
    } else {
      loadStockOuts();
    }
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    filterDataByPeriod();
  }, [salesData, currentPeriod]);

  const loadStockOuts = async () => {
    setLoading(true);
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

      setSalesData(combinedStockOuts);
      calculateStats(combinedStockOuts);
      setError(null);

      if (!isOnline && combinedStockOuts.length === 0) {
        showNotification('No offline data available', 'warning');
      }
    } catch (error) {
      console.error('Error loading stock-outs:', error);
      showNotification('Failed to load stock-outs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockIns = async () => {
    try {
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
        return await db.backorders_all.toArray();
      }
    }
  };

  const fetchProducts = async () => {
    try {
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
        return await db.products_all.toArray();
      }
    }
  };

  const filterDataByPeriod = () => {
    const now = new Date();
    let startDate;

    switch (currentPeriod) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }

    const filtered = salesData.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= startDate;
    });

    setFilteredSalesData(filtered);
    calculatePeriodStats(filtered);
    setCurrentPage(1);
  };

  const calculatePeriodStats = (data) => {
    const totalSales = data.reduce((sum, item) => sum + ((item.soldPrice || 0) * (  ( item.offlineQuantity ?? item.quantity) || 0)), 0);
    const totalQuantity = data.reduce((sum, item) => sum + (( item.offlineQuantity ?? item.quantity) || 0), 0);
    const totalProfit = data.reduce((sum, item) => {
      
      const soldPrice = item.soldPrice || 0;
      const costPrice = item.stockin?.price || 0;
      const quantity = ( item.offlineQuantity ?? item.quantity) || 0;
      return sum + ((soldPrice - costPrice) * quantity);

    }, 0);

    setPeriodStats({
      totalSales,
      totalQuantity,
      totalProfit
    });
  };

  const calculateProfit = (stockOut) => {
    const soldPrice = stockOut.soldPrice || 0;
    const costPrice = stockOut.stockin?.price || 0;
    const quantity = stockOut.quantity || 0;
    return (soldPrice - costPrice) * quantity;
  };

  const getStatsGridCols = () => {
    const visibleStatsCount = stats.length;
    if (visibleStatsCount === 1) return 'grid-cols-1';
    if (visibleStatsCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (visibleStatsCount === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    if (visibleStatsCount === 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    if (visibleStatsCount === 5) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF'
    }).format(price);
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

  const getPeriodLabel = () => {
    switch (currentPeriod) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'All Time';
    }
  };

  const handleViewMoreDetails = (ID) => {
    if (!ID) return Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No stock-out ID provided'
    });
    navigate(`/${role}/dashboard/sales-report/stockout/${ID}`);
  };

  const calculateStats = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      setStats(prevStats => prevStats.map(stat => ({
        ...stat,
        value: stat.title.includes('Total') ? (stat.title.includes('Sales') ? 'RWF 0' : '0') : 'No data',
        change: stat.title.includes('Total') ? 'No sales recorded' : 'No products sold'
      })));
      return;
    }

    const totalSalesAmount = data.reduce((sum, item) => sum + ((item.soldPrice || 0) * (( item.offlineQuantity ?? item.quantity) || 0)), 0);
    const totalQuantitySold = data.reduce((sum, item) => sum + (( item.offlineQuantity ?? item.quantity) || 0), 0);
    const backorderSales = data.filter(item => item.backorderId);
    const totalBackorderSalesAmount = backorderSales.reduce((sum, item) => sum +((item.soldPrice || 0) * (( item.offlineQuantity ?? item.quantity) || 0)), 0);

    const productStats = {};
    data.forEach(item => {
      if (item.stockin && item.stockin.product) {
        const productId = item.stockin.product.id;
        const productName = item.stockin.product.productName || 'Unknown Product';
        if (!productStats[productId]) {
          productStats[productId] = {
            name: productName,
            totalQuantity: 0,
            totalValue: 0,
          };
        }
        productStats[productId].totalQuantity += ( item.offlineQuantity ?? item.quantity) || 0;
        productStats[productId].totalValue += item.soldPrice || 0;
      }
    });

    const backorderStats = {};
    backorderSales.forEach(item => {
      const productName = item.backorder?.productName || 'Unknown Backorder';
      if (!backorderStats[productName]) {
        backorderStats[productName] = {
          name: productName,
          totalQuantity: 0,
          totalValue: 0,
        };
      }
      backorderStats[productName].totalQuantity += ( item.offlineQuantity ?? item.quantity) || 0;
      backorderStats[productName].totalValue += item.soldPrice || 0;
    });

    const productArray = Object.values(productStats);
    let highestProduct = null, lowestProduct = null;
    if (productArray.length > 0) {
      productArray.sort((a, b) => b.totalQuantity - a.totalQuantity);
      highestProduct = productArray[0];
      lowestProduct = productArray[productArray.length - 1];
    }

    const backorderArray = Object.values(backorderStats);
    let highestBackorder = null;
    if (backorderArray.length > 0) {
      backorderArray.sort((a, b) => b.totalQuantity - a.totalQuantity);
      highestBackorder = backorderArray[0];
    }

    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF'
    }).format(amount);

    setStats([
      {
        title: 'Total Sales',
        value: formatCurrency(totalSalesAmount),
        change: `${data.length} transactions`,
        icon: DollarSign,
        bgColor: 'bg-green-50',
        color: 'text-green-600',
        path: role == 'admin' ? '/admin/dashboard/stockout' : '/employee/dashboard/stockout',
      },
      {
        title: 'Total Quantity Sold',
        value: totalQuantitySold.toLocaleString(),
        change: `${Object.keys(productStats).length} products`,
        icon: ShoppingCart,
        bgColor: 'bg-blue-50',
        color: 'text-blue-600',
        path: role == 'admin' ? '/admin/dashboard/stockout' : '/employee/dashboard/stockout',
      },
      {
        title: 'Lowest Stock Out',
        value: lowestProduct ? `${lowestProduct.totalQuantity} units` : 'No data',
        change: lowestProduct ? lowestProduct.name : 'No products sold',
        icon: TrendingDown,
        bgColor: 'bg-red-50',
        color: 'text-red-600',
        path: role == 'admin' ? '/admin/dashboard/sales-report/stockout-analysis' :  '/employee/dashboard/sales-report/stockout-analysis',
      },
      {
        title: 'Highest Stock Out',
        value: highestProduct ? `${highestProduct.totalQuantity} units` : 'No data',
        change: highestProduct ? highestProduct.name : 'No products sold',
        icon: TrendingUp,
        bgColor: 'bg-green-50',
        color: 'text-green-600',
        path: role == 'admin' ?  '/admin/dashboard/sales-report/stockout-analysis' : '/employee/dashboard/sales-report/stockout-analysis',
      },
      {
        title: 'Non-Stock Sales',
        value: formatCurrency(totalBackorderSalesAmount),
        change: highestBackorder
          ? `${highestBackorder.name} (${highestBackorder.totalQuantity} units)`
          : 'No Non-stock sales',
        icon: ShoppingCart,
        bgColor: 'bg-red-50',
        color: 'text-red-600',
        path: role == 'admin' ? '/admin/dashboard/sales-report/non-stock-analysis' : '/employee/dashboard/sales-report/non-stock-analysis',
      },
    ]);
  };

  const refresh = () => {
    if (isOnline) {
      fetchSalesData();
    } else {
      loadStockOuts();
    }
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredSalesData.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredSalesData.length / itemsPerPage);

  const PaginationComponent = () => (
    <div className="px-6 py-1 border-t border-gray-200 bg-white rounded-b-xl">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-700">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredSalesData.length)} of {filteredSalesData.length} results
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-3 py-1 text-xs font-medium">
            {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const CardView = () => (
    <div className="space-y-6 md:hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentItems.map((stockOut, index) => {
          const profit = calculateProfit(stockOut);
          const isProfit = profit > 0;

          return (
            <div key={stockOut.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:border-gray-300">
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                      <ShoppingCart size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        #{startIndex + index + 1}
                      </div>
                    </div>
                  </div>
                  <button
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="View Details"
                    onClick={() => handleViewMoreDetails(stockOut.id)}
                  >
                    <Eye size={14} />
                  </button>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 text-base mb-1 leading-tight">
                    {stockOut.stockin?.product?.productName || stockOut.backorder?.productName || 'Sale Transaction'}
                  </h3>
                  {stockOut.transactionId && (
                    <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                      {stockOut.transactionId}
                    </div>
                  )}
                  {stockOut.backorderId && (
                    <div className="text-xs text-orange-800 font-mono bg-orange-100 px-2 py-1 rounded inline-block">
                      {stockOut.backorderId && 'Non-Stock Sale'}
                    </div>
                  )}
                  {stockOut.stockinId && (
                    <div className="text-xs text-green-800 font-mono bg-green-100 px-2 py-1 rounded inline-block">
                      {stockOut.stockinId && 'Stock In Sale'}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-xs">
                    <User size={12} className="text-gray-400" />
                    <span className="text-gray-600">
                      {stockOut.clientName || 'Walk-in customer'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Hash size={12} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantity</span>
                    </div>
                    <div className="text-base font-semibold text-gray-900">
                      {stockOut.quantity || 'N/A'}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unit Price</span>
                    </div>
                    <div className="text-base font-semibold text-gray-900">
                      {stockOut.soldPrice ? formatPrice(stockOut.soldPrice) : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-1 bg-gray-50 rounded-b-xl">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Profit/Loss
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-base ${isProfit ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {profit !== 0 ? formatPrice(Math.abs(profit)) : '$0.00'}
                        
                      </span>
                      {profit !== 0 && (
                        <span className={`text-xs ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                          {isProfit ? '↗' : '↘'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Date Sold
                    </span>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-600 font-medium">
                        {formatDate(stockOut.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {currentItems.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={24} className="text-gray-400" />
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-2">No stock out records</h3>
          <p className="text-xs text-gray-500">Stock out transactions will appear here once you make some sales.</p>
        </div>
      )}

      <PaginationComponent />
    </div>
  );

  const TableView = () => (
    <div className="bg-white hidden md:block rounded-xl shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product/SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit/Loss</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Sold</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((stockOut, index) => {
              const profit = calculateProfit(stockOut);
              const isProfit = profit > 0;

              return (
                <tr key={stockOut.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-1 whitespace-nowrap">
                    <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {startIndex + index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                        <ShoppingCart size={14} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {stockOut.stockin?.product?.productName || stockOut.backorder?.productName || 'Sale Transaction'}
                        </div>
                        <div className="flex gap-2 items-center">
                          {stockOut.backorderId && (
                            <div className="text-xs text-orange-800 font-mono bg-orange-100 px-2 py-1 rounded inline-block">
                              {stockOut.backorderId && 'Non-Stock Sale'}
                            </div>
                          )}
                          {stockOut.stockinId && (
                            <div className="text-xs text-green-800 font-mono bg-green-100 px-2 py-1 rounded inline-block">
                              {stockOut.stockinId && 'Stock In Sale'}
                            </div>
                          )}
                          {stockOut.transactionId && (
                            <div className="text-xs text-gray-500 font-mono">{stockOut.transactionId}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    {stockOut.clientName ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <User size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-600 truncate max-w-32">
                            {stockOut.clientName}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Walk-in customer</span>
                    )}
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    {stockOut.quantity ? (
                      <div className="flex items-center gap-1">
                        <Hash size={12} className="text-gray-400" />
                        <span className="font-medium text-sm text-gray-900">{stockOut.quantity}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    {stockOut.soldPrice ? (
                      <span className="font-medium text-sm text-gray-900">
                        {formatPrice(stockOut.soldPrice)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    {stockOut.soldPrice && stockOut.quantity ? (
                      <span className="font-medium text-sm text-gray-900">
                        {formatPrice(stockOut.soldPrice * stockOut.quantity)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    <span className={`font-medium text-sm ${isProfit ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {profit !== 0 ? formatPrice(Math.abs(profit)) : '$0.00'}
                      {profit !== 0 && (
                        
                        <span className="text-xs ml-1">
                          {isProfit ? '↗' : '↘'}
                        </span>
                      )}
                     
                    </span>
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-600">
                        {formatDate(stockOut.createdAt)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="View Details"
                        onClick={() => handleViewMoreDetails(stockOut.id)}
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PaginationComponent />
    </div>
  );

  if (loading) {
    return (
      <div className="h-[90vh] overflow-y-auto bg-gray-50 p-6">
        <div className="mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sales Report</h1>
            <p className="text-xs text-gray-600">Loading sales analytics...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 animate-pulse">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-16 mb-1"></div>
                    <div className="h-2 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[90vh] overflow-y-auto bg-gray-50 p-6">
        <div className="mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sales Report</h1>
            <p className="text-xs text-gray-600">Analytics and insights for your sales performance</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
              <div>
                <h3 className="text-base font-semibold text-red-800">Error Loading Sales Data</h3>
                <p className="text-xs text-red-700 mt-1">{error}</p>
                <button
                  onClick={refresh}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[90vh] overflow-y-auto bg-gray-50 p-6">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' : notification.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'} animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
          <span className="text-xs">{notification.message}</span>
        </div>
      )}
      <div className="px-4 mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Sales Report</h1>
              <p className="text-xs text-gray-600">Analytics and insights for your sales performance</p>
            </div>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Package className="w-4 h-4" />
              Refresh Data
            </button>
          </div>
        </div>

        <div className={`grid ${getStatsGridCols()} gap-4 mb-10`}>
          {stats.map((stat, index) => (
            <div key={index}
              className="bg-white rounded-xl cursor-pointer shadow-sm p-3 border border-gray-200 hover:shadow-md transition-shadow"
              onClick={() => stat.path && navigate(stat.path)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div
            className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${currentPeriod === 'today' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
            onClick={() => setCurrentPeriod('today')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Today Sales</p>
                <p className="text-lg font-bold text-gray-900">
                  {currentPeriod === 'today' ? formatPrice(periodStats.totalSales) : 'Click to view'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentPeriod === 'today' ? `${periodStats.totalQuantity} units sold` : 'Today\'s performance'}
                </p>
                {currentPeriod === 'today' && (
                  <p className={`text-xs mt-1 font-medium ${periodStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Profit: {formatPrice(periodStats.totalProfit)}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-xl bg-blue-50">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div
            className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${currentPeriod === 'week' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
            onClick={() => setCurrentPeriod('week')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">This Week</p>
                <p className="text-lg font-bold text-gray-900">
                  {currentPeriod === 'week' ? formatPrice(periodStats.totalSales) : 'Click to view'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentPeriod === 'week' ? `${periodStats.totalQuantity} units sold` : 'Weekly performance'}
                </p>
                {currentPeriod === 'week' && (
                  <p className={`text-xs mt-1 font-medium ${periodStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Profit: {formatPrice(periodStats.totalProfit)}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-xl bg-emerald-50">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div
            className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${currentPeriod === 'month' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
            onClick={() => setCurrentPeriod('month')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">This Month</p>
                <p className="text-lg font-bold text-gray-900">
                  {currentPeriod === 'month' ? formatPrice(periodStats.totalSales) : 'Click to view'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentPeriod === 'month' ? `${periodStats.totalQuantity} units sold` : 'Monthly performance'}
                </p>
                {currentPeriod === 'month' && (
                  <p className={`text-xs mt-1 font-medium ${periodStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Profit: {formatPrice(periodStats.totalProfit)}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-xl bg-purple-50">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Sales Report - {getPeriodLabel()}
            </h2>
            <span className="text-xs text-gray-500">
              {filteredSalesData.length} transactions
            </span>
          </div>

          {filteredSalesData.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Package className="w-10 h-10 text-gray-400 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900 mb-2">No Sales Data</h3>
              <p className="text-xs text-gray-600">No sales transactions found for {getPeriodLabel().toLowerCase()}.</p>
            </div>
          ) : (
            <>
              <CardView />
              <TableView />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesReportPage;