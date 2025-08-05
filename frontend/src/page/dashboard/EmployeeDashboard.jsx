import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  Bell, 
  Settings, 
  LogOut, 
  Download,
  User,
  ShoppingCart,
  DollarSign,
  ArrowDownRight,
  Calendar,
  Filter,
  RefreshCw,
  Boxes,
  TrendingDown,
  CheckCircle,
  Clock,
  Shield,
  Lock,
  Eye,
  UserX,
  Target,
  Zap,
  ArrowUpRight,
  Award,
  Star,
  AlertCircle,
  BarChart2,
  Layers,
  Box
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import productService from "../../services/productService";
import salesReturnService from "../../services/salesReturnService";
import stockOutService from "../../services/stockoutService";
import stockinService from "../../services/stockinService";
import categoryService from "../../services/categoryService";
import useEmployeeAuth from '../../context/EmployeeAuthContext';

const Dashboard = () => {
  const { user } = useEmployeeAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [dashboardData, setDashboardData] = useState({
    products: [],
    stockIns: [],
    stockOuts: [],
    categories: [],
    salesReturns: [],
    summary: null
  });

  const [stats, setStats] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  
  // New chart data states
  const [stockInChartData, setStockInChartData] = useState([]);
  const [stockOutChartData, setStockOutChartData] = useState([]);

  // Permission checks based on user tasks
  const userTasks = user?.tasks || [];
  const canViewSales = userTasks.some(task => task.taskname?.toLowerCase().includes('selling') || task.taskname?.toLowerCase().includes('sales') || task.taskname?.toLowerCase().includes('saling') || task.taskname?.toLowerCase().includes('stockout'));
  const canViewReturns = userTasks.some(task => task.taskname?.toLowerCase().includes('returning') || task.taskname?.toLowerCase().includes('return'));
  const canViewReceiving = userTasks.some(task => task.taskname?.toLowerCase().includes('receiving') || task.taskname?.toLowerCase().includes('stockin'));
  const canViewProducts = canViewReturns || canViewReceiving;
  const canViewCategories = canViewReturns || canViewReceiving;

  // Check if user has any relevant permissions
  const hasAnyPermissions = canViewSales || canViewReturns || canViewReceiving;

  // Responsive helper function to determine grid columns based on visible stats
  const getStatsGridCols = () => {
    const visibleStatsCount = stats.length;
    if (visibleStatsCount === 1) return 'grid-cols-1';
    if (visibleStatsCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (visibleStatsCount === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    if (visibleStatsCount === 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';
  };

  // Get available tabs based on permissions
  const getAvailableTabs = () => {
    const tabs = ['overview'];
    if (canViewReceiving) tabs.push('inventory');
    if (canViewSales) tabs.push('sales');
    if (canViewSales || canViewReturns || canViewCategories) tabs.push('analytics');
    return tabs;
  };

  // Fetch summary counts from your API
  const fetchSummaryCounts = async () => {
    try {
      const response = await fetch("http://localhost:3000/summary");
      if (!response.ok) throw new Error('Failed to fetch summary counts');
      return await response.json();
    } catch (error) {
      console.error('Error fetching summary counts:', error);
      return null;
    }
  };

  // Prepare chart data for stock in/out
  const prepareChartData = (data) => {
    if (canViewReceiving) {
      // Group stock ins by month
      const stockInsByMonth = data.stockIns.reduce((acc, stockIn) => {
        const date = new Date(stockIn.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        
        if (!acc[monthKey]) {
          acc[monthKey] = {
            month: monthName,
            stockIn: 0,
            stockInValue: 0,
            count: 0
          };
        }
        
        acc[monthKey].stockIn += stockIn.quantity || 0;
        acc[monthKey].stockInValue += (stockIn.quantity || 0) * (stockIn.price || 0);
        acc[monthKey].count += 1;
        
        return acc;
      }, {});

      const stockInChart = Object.values(stockInsByMonth)
        .sort((a, b) => new Date(a.month + ' 1') - new Date(b.month + ' 1'))
        .slice(-6); // Last 6 months

      setStockInChartData(stockInChart);
    }

    if (canViewSales) {
      // Group stock outs by month
      const stockOutsByMonth = data.stockOuts.reduce((acc, stockOut) => {
        const date = new Date(stockOut.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        
        if (!acc[monthKey]) {
          acc[monthKey] = {
            month: monthName,
            stockOut: 0,
            stockOutValue: 0,
            count: 0
          };
        }
        
        acc[monthKey].stockOut += stockOut.quantity || 0;
        acc[monthKey].stockOutValue += (stockOut.quantity || 0) * (stockOut.soldPrice || 0);
        acc[monthKey].count += 1;
        
        return acc;
      }, {});

      const stockOutChart = Object.values(stockOutsByMonth)
        .sort((a, b) => new Date(a.month + ' 1') - new Date(b.month + ' 1'))
        .slice(-6); // Last 6 months

      setStockOutChartData(stockOutChart);
    }
  };

  // Load all dashboard data based on permissions
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // If user has no permissions, skip data loading
      if (!hasAnyPermissions) {
        setLoading(false);
        return;
      }

      // Fetch summary first (if user has permissions)
      const summary = await fetchSummaryCounts();

      // Initialize data object
      const data = {
        products: [],
        stockIns: [],
        stockOuts: [],
        categories: [],
        salesReturns: [],
        summary
      };

      // Create promises array based on permissions
      const promises = [];

      if (canViewProducts) {
        promises.push(productService.getAllProducts().then(result => data.products = result));
      }
      
      if (canViewReceiving) {
        promises.push(stockinService.getAllStockIns().then(result => data.stockIns = result));
      }
      
      if (canViewSales) {
        promises.push(stockOutService.getAllStockOuts().then(result => data.stockOuts = result));
      }
      
      if (canViewCategories) {
        promises.push(categoryService.getAllCategories().then(result => data.categories = result));
      }
      
      if (canViewReturns) {
        promises.push(salesReturnService.getAllSalesReturns().then(result => data.salesReturns = result.data || result));
      }

      // Wait for all permitted data to load
      await Promise.all(promises);

      setDashboardData(data);

      // Calculate stats and prepare data based on available data
      if (summary) {
        calculateStats(summary, data);
      } else {
        calculateStatsFromData(data);
      }

      // Prepare chart data
      prepareChartData(data);

      if (canViewReceiving) {
        prepareInventoryData(data);
        prepareLowStockItems(data);
      }
      
      if (canViewSales) {
        prepareSalesData(data);
        prepareTopPerformers(data);
      }
      
      if (canViewCategories) {
        prepareCategoryData(data);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from summary API with permission checks
  const calculateStats = (summary, data) => {
    const newStats = [];

    if (canViewProducts) {
      newStats.push({
        title: 'Total Products',
        value: summary.totalProducts?.toString() || '0',
        icon: Package,
        change: `${summary.totalStockIn || 0} total stock in`,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        trend: '+12%'
      });
    }

    if (canViewReceiving) {
      newStats.push({
        title: 'Low Stock Alerts',
        value: summary.lowStock?.length?.toString() || '0',
        icon: AlertTriangle,
        change: `${summary.lowStock?.filter(item => item.stock <= 0).length || 0} out of stock`,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        trend: '-8%'
      });
    }

    if (canViewSales) {
      newStats.push({
        title: 'Total Sales',
        value: summary.totalStockOut?.toString() || '0',
        icon: TrendingUp,
        change: `${summary.totalSalesReturns || 0} returns`,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        trend: '+23%'
      });
    }

    if (canViewCategories) {
      newStats.push({
        title: 'Categories',
        value: summary.totalCategories?.toString() || '0',
        icon: Layers,
        change: `Most used: ${summary.mostUsedCategory?.name || 'N/A'}`,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        trend: '+3%'
      });
    }

    if (canViewReceiving) {
      newStats.push({
        title: 'High Stock Items',
        value: summary.highStock?.length?.toString() || '0',
        icon: Box,
        change: `Top: ${summary.mostStockedInProduct?.name || 'N/A'}`,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        trend: '+15%'
      });
    }

    setStats(newStats);
  };

  // Fallback calculation from raw data with permission checks
  const calculateStatsFromData = (data) => {
    const newStats = [];

    if (canViewProducts) {
      const totalProducts = data.products.length;
      const totalStockIn = canViewReceiving ? data.stockIns.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
      
      newStats.push({
        title: 'Total Products',
        value: totalProducts.toString(),
        icon: Package,
        change: `${totalStockIn} total stock in`,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        trend: '+12%'
      });
    }

    if (canViewReceiving) {
      const lowStock = data.stockIns.filter(item => (item.quantity || 0) <= 5);
      
      newStats.push({
        title: 'Low Stock Alerts',
        value: lowStock.length.toString(),
        icon: AlertTriangle,
        change: `${lowStock.filter(item => (item.quantity || 0) <= 0).length} out of stock`,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        trend: '-8%'
      });
    }

    if (canViewSales) {
      const totalStockOut = data.stockOuts.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const totalSalesReturns = canViewReturns ? data.salesReturns.length : 0;
      
      newStats.push({
        title: 'Total Sales',
        value: totalStockOut.toString(),
        icon: TrendingUp,
        change: `${totalSalesReturns} returns`,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        trend: '+23%'
      });
    }

    if (canViewCategories) {
      const totalCategories = data.categories.length;
      
      newStats.push({
        title: 'Total Categories',
        value: totalCategories.toString(),
        icon: Layers,
        change: `Active categories`,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        trend: '+5%'
      });
    }

    setStats(newStats);
  };

  // Prepare inventory data for table (only if user can view receiving)
  const prepareInventoryData = (data) => {
    if (!canViewReceiving) {
      setInventoryData([]);
      return;
    }

    const inventory = data.stockIns.map(stockIn => {
      const product = canViewProducts ? data.products.find(p => p.id === stockIn.productId) : null;
      const category = canViewCategories ? data.categories.find(c => c.id === product?.categoryId) : null;
      
      let status = 'In Stock';
      let statusColor = 'bg-green-100 text-green-800';
      
      if ((stockIn.quantity || 0) === 0) {
        status = 'Out of Stock';
        statusColor = 'bg-red-100 text-red-800';
      } else if ((stockIn.quantity || 0) <= 5) {
        status = 'Low Stock';
        statusColor = 'bg-yellow-100 text-yellow-800';
      }

      return {
        id: stockIn.id,
        name: product?.productName || 'Unknown Product',
        sku: stockIn.sku || `SKU-${stockIn.id}`,
        category: category?.name || 'Uncategorized',
        stock: stockIn.quantity || 0,
        price: stockIn.sellingPrice || 0,
        costPrice: stockIn.price || 0,
        status,
        statusColor,
        supplier: stockIn.supplier || 'N/A',
        createdAt: stockIn.createdAt,
        profit: ((stockIn.sellingPrice || 0) - (stockIn.price || 0)) * (stockIn.quantity || 0)
      };
    });

    setInventoryData(inventory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  };

  // Prepare sales data (only if user can view sales)
  const prepareSalesData = (data) => {
    if (!canViewSales) {
      setSalesData([]);
      return;
    }

    const sales = data.stockOuts.map(stockOut => {
      const revenue = (stockOut.soldPrice || 0) * (stockOut.quantity || 0);
      
      return {
        id: stockOut.id,
        client: stockOut.clientName || 'Walk-in Customer',
        quantity: stockOut.quantity || 0,
        unitPrice: stockOut.soldPrice || 0,
        revenue,
        date: stockOut.createdAt,
        status: 'Completed'
      };
    });

    setSalesData(sales.sort((a, b) => new Date(b.date) - new Date(a.date)));
  };

  // Prepare category performance data (only if user can view categories)
  const prepareCategoryData = (data) => {
    if (!canViewCategories) {
      setCategoryData([]);
      return;
    }

    const categoryPerformance = data.categories.map(category => {
      const categoryProducts = canViewProducts ? data.products.filter(p => p.categoryId === category.id) : [];
      
      const totalStock = canViewReceiving ? categoryProducts.reduce((sum, product) => {
        const productStocks = data.stockIns.filter(stock => stock.productId === product.id);
        return sum + productStocks.reduce((stockSum, stock) => stockSum + (stock.quantity || 0), 0);
      }, 0) : 0;

      const totalSales = canViewSales ? categoryProducts.reduce((sum, product) => {
        const productSales = data.stockOuts.filter(sale => {
          const stockIn = data.stockIns.find(stock => stock.productId === product.id);
          return stockIn;
        });
        return sum + productSales.reduce((saleSum, sale) => saleSum + ((sale.soldPrice || 0) * (sale.quantity || 0)), 0);
      }, 0) : 0;

      const avgPrice = categoryProducts.length > 0 && canViewReceiving ? 
        categoryProducts.reduce((sum, p) => {
          const stockIn = data.stockIns.find(s => s.productId === p.id);
          return sum + (stockIn?.sellingPrice || 0);
        }, 0) / categoryProducts.length : 0;

      return {
        id: category.id,
        name: category.name,
        productCount: categoryProducts.length,
        totalStock,
        totalSales,
        avgPrice
      };
    });

    setCategoryData(categoryPerformance.sort((a, b) => b.totalSales - a.totalSales));
  };

  // Prepare low stock items (only if user can view receiving)
  const prepareLowStockItems = (data) => {
    if (!canViewReceiving) {
      setLowStockItems([]);
      return;
    }

    const lowStock = data.stockIns
      .filter(stockIn => (stockIn.quantity || 0) <= 5)
      .map(stockIn => {
        const product = canViewProducts ? data.products.find(p => p.id === stockIn.productId) : null;
        const category = canViewCategories ? data.categories.find(c => c.id === product?.categoryId) : null;
        
        return {
          id: stockIn.id,
          productName: product?.productName || 'Unknown Product',
          category: category?.name || 'Uncategorized',
          currentStock: stockIn.quantity || 0,
          reorderLevel: 10,
          supplier: stockIn.supplier || 'N/A',
          lastRestocked: stockIn.createdAt
        };
      })
      .sort((a, b) => a.currentStock - b.currentStock);

    setLowStockItems(lowStock);
  };

  // Prepare top performers (only if user can view sales and products)
  const prepareTopPerformers = (data) => {
    if (!canViewSales || !canViewProducts) {
      setTopPerformers([]);
      return;
    }

    const productPerformance = data.products.map(product => {
      const stockIns = canViewReceiving ? data.stockIns.filter(stock => stock.productId === product.id) : [];
      const stockOuts = data.stockOuts.filter(sale => {
        return stockIns.some(stock => stock.productId === product.id);
      });

      const totalSold = stockOuts.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
      const totalRevenue = stockOuts.reduce((sum, sale) => sum + ((sale.soldPrice || 0) * (sale.quantity || 0)), 0);
      const currentStock = stockIns.reduce((sum, stock) => sum + (stock.quantity || 0), 0);

      return {
        id: product.id,
        name: product.productName,
        totalSold,
        totalRevenue,
        currentStock,
        averagePrice: totalSold > 0 ? totalRevenue / totalSold : 0
      };
    })
    .filter(item => item.totalSold > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

    setTopPerformers(productPerformance);
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              ></div>
              <span className="text-sm text-gray-600">{entry.name}:</span>
              <span className="font-medium text-gray-900">
                {entry.dataKey.includes('Value') ? formatCurrency(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">Loading Dashboard</h3>
            <p className="text-gray-600">Preparing your inventory insights...</p>
          </div>
        </div>
      </div>
    );
  }

  // No permissions view
  if (!hasAnyPermissions) {
    return (
      <div className="max-h-[90vh] overflow-y-auto bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory Dashboard</h1>
                <p className="text-gray-600 mt-1">Welcome, {user?.firstname} {user?.lastname}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center min-h-96 p-4">
          <div className="text-center max-w-md mx-auto">
            <div className="mb-6">
              <UserX className="w-16 sm:w-24 h-16 sm:h-24 text-gray-300 mx-auto mb-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-700 mb-4">Access Restricted</h2>
            <p className="text-gray-500 mb-6 leading-relaxed text-sm sm:text-base">
              You don't have any assigned tasks that grant access to dashboard features. 
              Please contact your administrator to get the appropriate permissions.
            </p>
            
            <button
              onClick={handleRefresh}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Permissions</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const availableTabs = getAvailableTabs();

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Umusingi Hardware Inventory Dashboard</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Welcome, {user?.firstname} {user?.lastname} - Role-based inventory access</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
                <Eye className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Access: {[
                  canViewSales && 'Sales',
                  canViewReturns && 'Returns', 
                  canViewReceiving && 'Receiving'
                ].filter(Boolean).join(', ')}</span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 hover:scale-105 text-sm sm:text-base"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs - Responsive */}
          <div className="mt-4 overflow-x-auto">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg min-w-fit">
              {availableTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium capitalize transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
     
      <main className="p-4 sm:p-6">
        {/* Stats Cards - Dynamic grid based on visible stats */}
        {stats.length > 0 && (
          <div className={`grid ${getStatsGridCols()} gap-4 sm:gap-6 mb-6 sm:mb-8`}>
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        stat.trend?.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {stat.trend}
                      </span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{stat.change}</p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-xl ${stat.bgColor} ml-3 sm:ml-4 flex-shrink-0`}>
                    <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stock In/Out Charts - Show based on permissions */}
        {(canViewReceiving || canViewSales) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Stock In Chart */}
            {canViewReceiving && stockInChartData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                    <ArrowDownRight className="w-4 sm:w-5 h-4 sm:h-5 mr-2 text-blue-600" />
                    Stock In Trends (Last 6 Months)
                  </h3>
                  <div className="text-xs text-gray-500">
                    Total: {stockInChartData.reduce((sum, item) => sum + item.stockIn, 0)} units
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockInChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }} 
                        stroke="#6b7280"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        stroke="#6b7280"
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="stockIn" 
                        fill="#3b82f6" 
                        name="Units Received"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="stockInValue" 
                        fill="#1d4ed8" 
                        name="Value (RWF)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Stock Out Chart */}
            {canViewSales && stockOutChartData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                    <ArrowUpRight className="w-4 sm:w-5 h-4 sm:h-5 mr-2 text-green-600" />
                    Stock Out Trends (Last 6 Months)
                  </h3>
                  <div className="text-xs text-gray-500">
                    Total: {stockOutChartData.reduce((sum, item) => sum + item.stockOut, 0)} units
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockOutChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }} 
                        stroke="#6b7280"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        stroke="#6b7280"
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="stockOut" 
                        fill="#10b981" 
                        name="Units Sold"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="stockOutValue" 
                        fill="#059669" 
                        name="Revenue (RWF)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Summary Cards - Only show if there's relevant data */}
            {(canViewCategories || canViewProducts) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Award className="w-4 sm:w-5 h-4 sm:h-5 mr-2 text-blue-600" />
                  Key Performance Indicators
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {canViewCategories && (
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium text-blue-600">Most Used Category</p>
                          <p className="text-lg sm:text-xl font-bold text-blue-900 truncate">
                            {dashboardData.summary?.mostUsedCategory?.name || 'N/A'}
                          </p>
                        </div>
                        <Star className="w-6 sm:w-8 h-6 sm:h-8 text-blue-600 flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  )}
                  
                  {canViewProducts && (
                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium text-green-600">Top Product</p>
                          <p className="text-lg sm:text-xl font-bold text-green-900 truncate">
                            {dashboardData.summary?.mostStockedInProduct?.name || 'N/A'}
                          </p>
                        </div>
                        <TrendingUp className="w-6 sm:w-8 h-6 sm:h-8 text-green-600 flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Low Stock Alert - Only show if user can view receiving */}
            {canViewReceiving && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                    <AlertTriangle className="w-4 sm:w-5 h-4 sm:h-5 mr-2 text-amber-600" />
                    Stock Alerts ({lowStockItems.length})
                  </h3>
                </div>
                <div className="p-4">
                  {lowStockItems.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {lowStockItems.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 text-sm truncate">{item.productName}</p>
                            <p className="text-xs sm:text-sm text-gray-500">{item.category}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <p className="text-base sm:text-lg font-bold text-amber-600">{item.currentStock}</p>
                            <p className="text-xs text-gray-500">units left</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                      <p className="text-gray-500">All items are well stocked!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Inventory Tab - Only show if user can view receiving */}
        {activeTab === 'inventory' && canViewReceiving && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-blue-600" />
                  Inventory Overview ({inventoryData.length} items)
                </h3>
                <div className="flex items-center space-x-2">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search inventory..."
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventoryData.slice(0, 10).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.sku}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.stock}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(item.price * item.stock)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.statusColor}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.supplier}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sales Tab - Only show if user can view sales */}
        {activeTab === 'sales' && canViewSales && (
          <div className="space-y-6">
            {/* Top Performers - Only show if user can view both sales and products */}
            {canViewProducts && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-green-600" />
                  Top Performing Products
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {topPerformers.map((product, index) => (
                    <div key={product.id} className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-600">#{index + 1}</span>
                        <Target className="w-4 h-4 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{product.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{product.totalSold} units sold</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(product.totalRevenue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Sales */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2 text-blue-600" />
                  Recent Sales ({salesData.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salesData.slice(0, 10).map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{sale.client}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sale.quantity} units
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(sale.unitPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(sale.revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(sale.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab - Show based on permissions */}
        {activeTab === 'analytics' && (canViewSales || canViewReturns || canViewCategories) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Performance - Only show if user can view categories */}
            {canViewCategories && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <BarChart2 className="w-5 h-5 mr-2 text-purple-600" />
                    Category Performance
                  </h3>
                </div>
                <div className="p-4">
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {categoryData.map((category) => (
                      <div key={category.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{category.name}</h4>
                          <span className="text-sm text-gray-500">{category.productCount} products</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          {canViewReceiving && (
                            <div>
                              <p className="text-sm text-gray-500">Stock</p>
                              <p className="text-lg font-bold text-blue-600">{category.totalStock}</p>
                            </div>
                          )}
                          {canViewSales && (
                            <div>
                              <p className="text-sm text-gray-500">Sales</p>
                              <p className="text-lg font-bold text-green-600">{formatCurrency(category.totalSales)}</p>
                            </div>
                          )}
                          {canViewReceiving && (
                            <div>
                              <p className="text-sm text-gray-500">Avg Price</p>
                              <p className="text-lg font-bold text-purple-600">{formatCurrency(category.avgPrice)}</p>
                            </div>
                          )}
                        </div>
                        {canViewSales && categoryData.length > 0 && (
                          <div className="mt-3">
                            <div className="bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min((category.totalSales / Math.max(...categoryData.map(c => c.totalSales))) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Financial Summary - Show based on available data */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                  Financial Summary
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {/* Total Revenue - Only show if user can view sales */}
                  {canViewSales && (
                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-600">Total Revenue</p>
                          <p className="text-2xl font-bold text-green-900">
                            {formatCurrency(salesData.reduce((sum, sale) => sum + sale.revenue, 0))}
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                  )}

                  {/* Inventory Value - Only show if user can view receiving */}
                  {canViewReceiving && (
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-600">Inventory Value</p>
                          <p className="text-2xl font-bold text-blue-900">
                            {formatCurrency(inventoryData.reduce((sum, item) => sum + (item.price * item.stock), 0))}
                          </p>
                        </div>
                        <Package className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                  )}

                  {/* Average Order Value - Only show if user can view sales */}
                  {canViewSales && (
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-600">Average Order Value</p>
                          <p className="text-2xl font-bold text-purple-900">
                            {formatCurrency(salesData.length > 0 ? salesData.reduce((sum, sale) => sum + sale.revenue, 0) / salesData.length : 0)}
                          </p>
                        </div>
                        <Target className="w-8 h-8 text-purple-600" />
                      </div>
                    </div>
                  )}

                  {/* Returns Rate - Only show if user can view returns */}
                  {canViewReturns && (
                    <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-amber-600">Returns</p>
                          <p className="text-2xl font-bold text-amber-900">
                            {dashboardData.salesReturns.length}
                          </p>
                          {canViewSales && (
                            <p className="text-sm text-amber-700">
                              {salesData.length > 0 ? ((dashboardData.salesReturns.length / salesData.length) * 100).toFixed(1) : 0}% return rate
                            </p>
                          )}
                        </div>
                        <RefreshCw className="w-8 h-8 text-amber-600" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;