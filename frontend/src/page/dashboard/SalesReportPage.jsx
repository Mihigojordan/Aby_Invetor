import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Package,
  DollarSign,
  Hash,
  User,
  Check,
  AlertTriangle,
  Calendar,
  Eye,
  Phone,
  Mail,
  Receipt,
  Wifi,
  WifiOff,
  RotateCcw,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  TrendingUp,
  X,
  Grid3x3,
  Table2,
  Filter,
  TrendingDown,
  ShoppingCart,
  Clock,
  ArrowUpToLine,
  ShoppingBag,
  Award,
  Star,
  CreditCard,
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState('today');
  const [notification, setNotification] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [periodStats, setPeriodStats] = useState({
    totalSales: 0,
    totalQuantity: 0,
    totalProfit: 0
  });
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
      title: 'Non-Stock Sales',
      value: 'Loading...',
      change: 'Backorder sales',
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

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    filterDataByPeriod();
  }, [salesData, currentPeriod, searchTerm, startDate, endDate]);

  const loadStockOuts = async (showRefreshLoader = false) => {
    if (showRefreshLoader) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    
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

      if (showRefreshLoader) {
        setNotification({
          type: 'success',
          message: 'Sales data refreshed successfully!'
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
        message: 'Failed to load sales data'
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
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
      return [];
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
      return [];
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
      return [];
    }
  };

  const filterDataByPeriod = () => {
    const now = new Date();
    let periodStartDate;

    switch (currentPeriod) {
      case 'today':
        periodStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        periodStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        periodStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        periodStartDate = new Date(0);
    }

    const filtered = salesData.filter(item => {
      const itemDate = new Date(item.createdAt);
      
      // Filter by period
      const matchesPeriod = itemDate >= periodStartDate;
      
      // Filter by custom date range
      const matchesDateRange = (!startDate || itemDate >= new Date(startDate)) &&
                             (!endDate || itemDate <= new Date(endDate));
      
      // Filter by search term
      const matchesSearch = !searchTerm ||
        item.stockin?.product?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.backorder?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesPeriod && matchesDateRange && matchesSearch;
    });

    setFilteredSalesData(filtered);
    calculatePeriodStats(filtered);
    setCurrentPage(1);
  };

  const calculatePeriodStats = (data) => {
    const totalSales = data.reduce((sum, item) => sum + ((item.soldPrice || 0) * ((item.offlineQuantity ?? item.quantity) || 0)), 0);
    const totalQuantity = data.reduce((sum, item) => sum + ((item.offlineQuantity ?? item.quantity) || 0), 0);
    const totalProfit = data.reduce((sum, item) => {
      const soldPrice = item.soldPrice || 0;
      const costPrice = item.stockin?.price || 0;
      const quantity = (item.offlineQuantity ?? item.quantity) || 0;
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
    }).format(price || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

    const totalSalesAmount = data.reduce((sum, item) => sum + ((item.soldPrice || 0) * ((item.offlineQuantity ?? item.quantity) || 0)), 0);
    const totalQuantitySold = data.reduce((sum, item) => sum + ((item.offlineQuantity ?? item.quantity) || 0), 0);
    const backorderSales = data.filter(item => item.backorderId);
    const totalBackorderSalesAmount = backorderSales.reduce((sum, item) => sum + ((item.soldPrice || 0) * ((item.offlineQuantity ?? item.quantity) || 0)), 0);

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
        productStats[productId].totalQuantity += (item.offlineQuantity ?? item.quantity) || 0;
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
      backorderStats[productName].totalQuantity += (item.offlineQuantity ?? item.quantity) || 0;
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

  const refresh = async () => {
    if (isOnline) {
      await loadStockOuts(true);
    } else {
      setNotification({
        type: 'error',
        message: 'No internet connection'
      });
    }
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
    setCurrentPeriod('today');
  };

  const totalPages = Math.ceil(filteredSalesData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredSalesData.slice(startIndex, endIndex);

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-2 p-3">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => stat.path && navigate(stat.path)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">{stat.title}</p>
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
            </div>
            <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const PeriodCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 ml-3 mr-3 -mt-3">
      {['today', 'week', 'month'].map((period) => (
        <div
          key={period}
          className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer ${
            currentPeriod === period ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
          }`}
          onClick={() => setCurrentPeriod(period)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">
                {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
              </p>
              <p className="text-lg font-bold text-gray-900">
                {currentPeriod === period ? formatPrice(periodStats.totalSales) : 'Click to view'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {currentPeriod === period ? `${periodStats.totalQuantity} units sold` : `${period === 'today' ? 'Today\'s' : period === 'week' ? 'Weekly' : 'Monthly'} performance`}
              </p>
              {currentPeriod === period && (
                <p className={`text-xs mt-1 font-medium ${periodStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Profit: {formatPrice(periodStats.totalProfit)}
                </p>
              )}
            </div>
            <div className="p-2 rounded-lg bg-blue-50">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-t border-gray-200 bg-white">
      <div className="flex items-center gap-4">
        <p className="text-xs text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredSalesData.length)} of {filteredSalesData.length} entries
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

  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
      {(currentItems || []).map((stockOut, index) => {
        const profit = calculateProfit(stockOut);
        const isProfit = profit > 0;

        return (
          <div
            key={stockOut.id || stockOut.localId}
            className={`bg-white rounded-lg border hover:shadow-md transition-all duration-200 ${stockOut.synced ? 'border-gray-200' : 'border-yellow-200'}`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <ShoppingCart size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900 truncate">
                      {stockOut.stockin?.product?.productName || stockOut.backorder?.productName || 'Sale Transaction'}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <div className={`w-2 h-2 rounded-full ${stockOut.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <span className="text-xs text-gray-500">{stockOut.synced ? 'Synced' : 'Pending Sync'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Quantity:</span>
                  <span className="text-xs font-bold text-primary-600">{stockOut.offlineQuantity ?? stockOut.quantity ?? 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Unit Price:</span>
                  <span className="text-xs text-gray-900">{formatPrice(stockOut.soldPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Total Price:</span>
                  <span className="text-xs font-bold text-green-600">
                    {formatPrice(((stockOut.offlineQuantity ?? stockOut.quantity) || 1) * stockOut.soldPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Profit/Loss:</span>
                  <span className={`text-xs font-bold ${isProfit ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {formatPrice(Math.abs(profit))}
                    {profit !== 0 && (
                      <span className="ml-1">{isProfit ? '↗' : '↘'}</span>
                    )}
                  </span>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={12} />
                    <span>{formatDate(stockOut.createdAt)}</span>
                  </div>
                  <button
                    onClick={() => handleViewMoreDetails(stockOut.id)}
                    disabled={loading}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Total Price</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Profit/Loss</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(currentItems || []).map((stockOut, index) => {
              const profit = calculateProfit(stockOut);
              const isProfit = profit > 0;

              return (
                <tr key={stockOut.localId || stockOut.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <ShoppingCart size={14} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900">
                          {stockOut.stockin?.product?.productName || stockOut.backorder?.productName || 'Sale Transaction'}
                        </div>
                        {stockOut.transactionId && (
                          <div className="text-xs text-gray-500 mt-1">{stockOut.transactionId}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 truncate max-w-[120px]" title={stockOut.clientName}>
                      {stockOut.clientName || stockOut.clientPhone || 'Walk-in'}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Hash size={14} className="text-gray-400" />
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
                    <span className={`text-sm font-semibold ${isProfit ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {formatPrice(Math.abs(profit))}
                      {profit !== 0 && (
                        <span className="text-xs ml-1">{isProfit ? '↗' : '↘'}</span>
                      )}
                    </span>
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
                      <span className="text-sm text-gray-600">{formatDate(stockOut.createdAt)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewMoreDetails(stockOut.id)}
                        disabled={loading}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} />
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

  const CardView = () => (
    <div className="md:hidden">
      <div className="grid grid-cols-1 gap-4 mb-6">
        {(currentItems || []).map((stockOut, index) => {
          const profit = calculateProfit(stockOut);
          const isProfit = profit > 0;

          return (
            <div
              key={stockOut.localId || stockOut.id}
              className={`bg-white rounded-lg border hover:shadow-md transition-shadow ${stockOut.synced ? 'border-gray-200' : 'border-yellow-200'}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <ShoppingCart size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">
                        {stockOut.stockin?.product?.productName || stockOut.backorder?.productName || 'Sale Transaction'}
                      </h3>
                      <div className="flex items-center gap-1 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${stockOut.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <span className="text-xs text-gray-500">{stockOut.synced ? 'Synced' : 'Pending Sync'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewMoreDetails(stockOut.id)}
                    disabled={loading}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={14} />
                  </button>
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
                  <div className="flex items-start justify-between text-xs">
                    <span className="font-medium text-gray-600">Profit/Loss:</span>
                    <span className={`font-bold ${isProfit ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {formatPrice(Math.abs(profit))}
                      {profit !== 0 && (
                        <span className="ml-1">{isProfit ? '↗' : '↘'}</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar size={12} />
                      <span>{formatDate(stockOut.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        <PaginationComponent />
      </div>
    </div>
  );

  if (loading && !isRefreshing) {
    return (
      <div className="bg-gray-50 min-h-[90vh]">
        <div className="text-center py-16">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
              <ShoppingCart className="w-8 h-8 text-primary-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">Loading Sales Report</p>
              <p className="text-sm text-gray-600">Please wait while we fetch your sales data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
     <div className=" border w-[99%]  bg-gray-50 h-[90vh]"> {/* Reduced padding */}
      {/* Notification Toast */}
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
      
      <div className="h-full">
        {/* Header Section */}
        <div className="mb-4 shadow-md bg-white p-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div>
                  <h1 className="text-2xl lg:text-2xl font-bold text-gray-900">Sales Report</h1>
                  <p className="text-sm text-gray-600 mt-1">Analytics and insights for your sales performance</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Sync and Refresh buttons */}
              <div className="flex gap-2">
                {(searchTerm || startDate || endDate || currentPeriod !== 'today') && (
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
                    onClick={refresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    title="Sync now"
                  >
                    <RotateCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                    <span className="text-sm font-medium">Sync</span>
                  </button>
                )}
                
                {isOnline && (
                  <button
                    onClick={refresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    title="Refresh"
                  >
                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                    <span className="text-sm font-medium">Refresh</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && <StatisticsCards />}

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 p-2 ml-3 mr-3">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="w-full lg:w-[45%]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by product, client, or transaction..."
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

        {/* Period Cards */}
        <PeriodCards />

        {/* Main Content */}
        {filteredSalesData.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No Sales Data Found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || startDate || endDate || currentPeriod !== 'today'
                  ? 'Try adjusting your search, date filters, or period selection.'
                  : 'No sales transactions found for the selected period.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <GridView />
            ) : (
              <>
                <CardView />
                <TableView />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SalesReportPage;