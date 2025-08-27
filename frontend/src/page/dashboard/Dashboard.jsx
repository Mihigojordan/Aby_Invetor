import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Package,
  UserCheck,
  RefreshCw,
  Layers,
  TrendingUp,
  Box,
  Users,
  Award,
  Star,
  AlertCircle,
  BarChart2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

import employeeService from "../../services/employeeService";
import productService from "../../services/productService";
import salesReturnService from "../../services/salesReturnService";
import stockOutService from "../../services/stockoutService";
import stockinService from "../../services/stockinService";
import categoryService from "../../services/categoryService";
import { API_URL } from '../../api/api';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Add error state
  const [dashboardData, setDashboardData] = useState({
    employees: [],
    products: [],
    stockIns: [],
    stockOuts: [],
    categories: [],
    salesReturns: [],
    summary: null
  });

  const [stats, setStats] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('6months');

  // Add debugging function
  const debugData = (data, label) => {
    console.group(`🔍 DEBUG: ${label}`);
    console.log('Data:', data);
    console.log('Type:', typeof data);
    console.log('Is Array:', Array.isArray(data));
    console.log('Length/Keys:', Array.isArray(data) ? data.length : Object.keys(data || {}).length);
    console.groupEnd();
  };

  const fetchSummaryCounts = async () => {
    try {
      console.log('🔄 Fetching summary from:', `${API_URL}/summary`);
      const response = await fetch(`${API_URL}/summary`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const summaryData = await response.json();
      debugData(summaryData, 'Summary API Response');
      return summaryData;
    } catch (error) {
      console.error('❌ Error fetching summary counts:', error);
      return null;
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🚀 Starting dashboard data load...');

      // First try to get summary
      const summary = await fetchSummaryCounts();

      // Then load all other data with error handling for each service
      const results = await Promise.allSettled([
        employeeService.getAllEmployees(),
        productService.getAllProducts(),
        stockinService.getAllStockIns(),
        stockOutService.getAllStockOuts(),
        categoryService.getAllCategories(),
        salesReturnService.getAllSalesReturns(),
      ]);

      // Process results and handle any failed requests
      const [
        employeesResult,
        productsResult,
        stockInsResult,
        stockOutsResult,
        categoriesResult,
        salesReturnsResult,
      ] = results;

      const data = {
        employees: employeesResult.status === 'fulfilled' ? employeesResult.value : [],
        products: productsResult.status === 'fulfilled' ? productsResult.value : [],
        stockIns: stockInsResult.status === 'fulfilled' ? stockInsResult.value : [],
        stockOuts: stockOutsResult.status === 'fulfilled' ? stockOutsResult.value : [],
        categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value : [],
        salesReturns: salesReturnsResult.status === 'fulfilled' ? 
          (salesReturnsResult.value?.data || salesReturnsResult.value) : [],
        summary
      };

      // Debug each data type
      Object.entries(data).forEach(([key, value]) => {
        debugData(value, `${key} data`);
      });

      setDashboardData(data);

      if (summary) {
        calculateStats(summary);
      } else {
        calculateStatsFromData(data);
      }

      prepareInventoryData(data);
      prepareRecentActivities(data);
      prepareChartData(data, selectedPeriod);

      console.log('✅ Dashboard data loaded successfully');

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (summary) => {
    console.log('📊 Calculating stats from summary:', summary);
    
    const newStats = [
      {
        title: 'Total Products',
        value: (summary.totalProducts || 0).toString(),
        icon: Package,
        change: `${summary.totalStockIn || 0} total stock in`,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'Low Stock Items',
        value: (summary.lowStock?.length || 0).toString(),
        icon: AlertTriangle,
        change: `${summary.lowStock?.filter(item => item.stock <= 0).length || 0} out of stock`,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      },
      {
        title: 'Total Employees',
        value: (summary.totalEmployees || 0).toString(),
        icon: UserCheck,
        change: `${summary.totalCategories || 0} categories`,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      },
      {
        title: 'Total Categories',
        value: (summary.totalCategories || 0).toString(),
        icon: Layers,
        change: `Most used: ${summary.mostUsedCategory?.name || 'N/A'}`,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50'
      },
      {
        title: 'High Stock Items',
        value: (summary.highStock?.length || 0).toString(),
        icon: TrendingUp,
        change: `Top product: ${summary.mostStockedInProduct?.name || 'N/A'}`,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50'
      },
      {
        title: 'Total Stock In',
        value: (summary.totalStockIn || 0).toString(),
        icon: Box,
        change: `Most stocked: ${summary.mostStockedInProduct?.name || 'N/A'}`,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50'
      },
      {
        title: 'Sales Returns',
        value: (summary.totalSalesReturns || 0).toString(),
        icon: RefreshCw,
        change: `${summary.totalStockOut || 0} total stock out`,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50'
      }
    ];
    
    console.log('📊 Stats calculated:', newStats);
    setStats(newStats);
  };

  const calculateStatsFromData = (data) => {
    console.log('📊 Calculating stats from raw data...');
    
    // Ensure data is arrays
    const employees = Array.isArray(data.employees) ? data.employees : [];
    const products = Array.isArray(data.products) ? data.products : [];
    const categories = Array.isArray(data.categories) ? data.categories : [];
    const stockIns = Array.isArray(data.stockIns) ? data.stockIns : [];
    const stockOuts = Array.isArray(data.stockOuts) ? data.stockOuts : [];
    const salesReturns = Array.isArray(data.salesReturns) ? data.salesReturns : [];

    const totalProducts = products.length;
    const totalEmployees = employees.length;
    const totalCategories = categories.length;
    const totalStockIn = stockIns.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalStockOut = stockOuts.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalSalesReturns = salesReturns.length;

    // Fix lowStock calculation - should be based on products with current stock
    const lowStock = stockIns.filter(item => (Number(item.quantity) || 0) <= 5);
    const outOfStock = stockIns.filter(item => (Number(item.quantity) || 0) <= 0);

    console.log('📊 Calculated values:', {
      totalProducts,
      totalEmployees,
      totalCategories,
      totalStockIn,
      totalStockOut,
      totalSalesReturns,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length
    });

    const newStats = [
      {
        title: 'Total Products',
        value: totalProducts.toString(),
        icon: Package,
        change: `${totalStockIn} total stock in`,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'Low Stock Items',
        value: lowStock.length.toString(),
        icon: AlertTriangle,
        change: `${outOfStock.length} out of stock`,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      },
      {
        title: 'Total Stock Out',
        value: totalStockOut.toString(),
        icon: ArrowDownRight,
        change: `${totalSalesReturns} sales returns`,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        title: 'Total Employees',
        value: totalEmployees.toString(),
        icon: UserCheck,
        change: `${totalCategories} categories`,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      }
    ];

    setStats(newStats);
  };

  const prepareInventoryData = (data) => {
    console.log('📦 Preparing inventory data...');
    
    if (!Array.isArray(data.stockIns)) {
      console.warn('⚠️ StockIns is not an array:', data.stockIns);
      setInventoryData([]);
      return;
    }

    const inventory = data.stockIns.map(stockIn => {
      const product = data.products?.find(p => p.id === stockIn.productId);
      const category = data.categories?.find(c => c.id === product?.categoryId);
      const quantity = Number(stockIn.quantity) || 0;
      
      let status = 'In Stock';
      if (quantity === 0) status = 'Out of Stock';
      else if (quantity <= 5) status = 'Low Stock';

      return {
        id: stockIn.id,
        name: product?.productName || product?.name || 'Unknown Product',
        sku: stockIn.sku || `SKU-${stockIn.id}`,
        category: category?.name || 'Uncategorized',
        stock: quantity,
        price: Number(stockIn.sellingPrice) || 0,
        costPrice: Number(stockIn.price) || 0,
        status,
        supplier: stockIn.supplier || 'N/A',
        createdAt: stockIn.createdAt
      };
    });

    console.log('📦 Inventory prepared:', inventory.slice(0, 3));
    setInventoryData(inventory);
  };

  const prepareRecentActivities = (data) => {
    console.log('🔄 Preparing recent activities...');
    const activities = [];

    // Handle stock ins
    if (Array.isArray(data.stockIns) && data.stockIns.length > 0) {
      const recentStockIns = [...data.stockIns]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 3);

      recentStockIns.forEach(stockIn => {
        const product = data.products?.find(p => p.id === stockIn.productId);
        activities.push({
          id: `stockin-${stockIn.id}`,
          type: 'stock_in',
          title: 'Stock Added',
          description: `${stockIn.quantity || 0} units of ${product?.productName || product?.name || 'product'} added`,
          time: stockIn.createdAt || new Date().toISOString(),
          icon: ArrowUpRight,
          color: 'text-green-600'
        });
      });
    }

    // Handle stock outs
    if (Array.isArray(data.stockOuts) && data.stockOuts.length > 0) {
      const recentStockOuts = [...data.stockOuts]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 3);

      recentStockOuts.forEach(stockOut => {
        activities.push({
          id: `stockout-${stockOut.id}`,
          type: 'stock_out',
          title: 'Sale Completed',
          description: `${stockOut.quantity || 0} units sold to ${stockOut.clientName || 'customer'}`,
          time: stockOut.createdAt || new Date().toISOString(),
          icon: ArrowDownRight,
          color: 'text-blue-600'
        });
      });
    }

    // Handle returns
    if (Array.isArray(data.salesReturns) && data.salesReturns.length > 0) {
      const recentReturns = [...data.salesReturns]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 2);

      recentReturns.forEach(returnItem => {
        activities.push({
          id: `return-${returnItem.id}`,
          type: 'return',
          title: 'Return Processed',
          description: `Return processed: ${returnItem.reason || 'No reason specified'}`,
          time: returnItem.createdAt || new Date().toISOString(),
          icon: RefreshCw,
          color: 'text-red-600'
        });
      });
    }

    const sortedActivities = activities
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 8);

    console.log('🔄 Activities prepared:', sortedActivities.length, 'activities');
    setRecentActivities(sortedActivities);
  };

  const prepareChartData = (data, period = '6months') => {
    console.log('📈 Preparing chart data for period:', period);
    
    if (!data || !Array.isArray(data.stockIns) || !Array.isArray(data.stockOuts)) {
      console.warn('⚠️ Invalid data for chart preparation');
      setChartData([]);
      return;
    }

    const now = new Date();
    let periods = [];
    
    if (period === '30days') {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const stockInThisDay = data.stockIns
          .filter(item => {
            if (!item.createdAt) return false;
            const itemDate = new Date(item.createdAt);
            return itemDate.toDateString() === date.toDateString();
          })
          .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        
        const stockOutThisDay = data.stockOuts
          .filter(item => {
            if (!item.createdAt) return false;
            const itemDate = new Date(item.createdAt);
            return itemDate.toDateString() === date.toDateString();
          })
          .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        
        periods.push({
          period: dayName,
          stockIn: stockInThisDay,
          stockOut: stockOutThisDay
        });
      }
    } else if (period === '6months') {
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const stockInThisMonth = data.stockIns
          .filter(item => {
            if (!item.createdAt) return false;
            const itemDate = new Date(item.createdAt);
            return itemDate.getMonth() === date.getMonth() && 
                   itemDate.getFullYear() === date.getFullYear();
          })
          .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        
        const stockOutThisMonth = data.stockOuts
          .filter(item => {
            if (!item.createdAt) return false;
            const itemDate = new Date(item.createdAt);
            return itemDate.getMonth() === date.getMonth() && 
                   itemDate.getFullYear() === date.getFullYear();
          })
          .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        
        periods.push({
          period: monthName,
          stockIn: stockInThisMonth,
          stockOut: stockOutThisMonth
        });
      }
    } else if (period === '1year') {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const stockInThisMonth = data.stockIns
          .filter(item => {
            if (!item.createdAt) return false;
            const itemDate = new Date(item.createdAt);
            return itemDate.getMonth() === date.getMonth() && 
                   itemDate.getFullYear() === date.getFullYear();
          })
          .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        
        const stockOutThisMonth = data.stockOuts
          .filter(item => {
            if (!item.createdAt) return false;
            const itemDate = new Date(item.createdAt);
            return itemDate.getMonth() === date.getMonth() && 
                   itemDate.getFullYear() === date.getFullYear();
          })
          .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        
        periods.push({
          period: monthName,
          stockIn: stockInThisMonth,
          stockOut: stockOutThisMonth
        });
      }
    }
    
    console.log('📈 Chart data prepared:', periods);
    setChartData(periods);
  };

  const handlePeriodChange = (period) => {
    console.log('🔄 Period changed to:', period);
    setSelectedPeriod(period);
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case '30days': return 'Last 30 days';
      case '6months': return 'Last 6 months';
      case '1year': return 'Last 12 months';
      default: return 'Last 6 months';
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (dashboardData.stockIns.length > 0 || dashboardData.stockOuts.length > 0) {
      prepareChartData(dashboardData, selectedPeriod);
    }
  }, [selectedPeriod, dashboardData]);

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-lg font-medium text-gray-700">Loading ABY Inventory...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Umusingi Hardware Inventory Management</h1>
            <p className="text-gray-600">Real-time inventory management and analytics</p>
          </div>
          {/* Debug info in development */}
          {/* {process.env.NODE_ENV === 'development' && (
            <div className="text-sm text-gray-500">
              Products: {dashboardData.products.length} | 
              Stock Ins: {dashboardData.stockIns.length} | 
              Stock Outs: {dashboardData.stockOuts.length}
            </div>
          )} */}
        </div>
      </div>

      <main className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rest of your existing JSX remains the same */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Overview</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Most Used Category Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Most Used Category</p>
                    <p className="text-xl font-bold text-gray-900">
                      {dashboardData.summary?.mostUsedCategory?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Used {dashboardData.summary?.mostUsedCategory?.usageCount || 0} times
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50">
                    <Award className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </div>

              {/* Most Stocked Product Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Most Stocked Product</p>
                    <p className="text-xl font-bold text-gray-900">
                      {dashboardData.summary?.mostStockedInProduct?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {dashboardData.summary?.totalStockIn || 0} total stock in
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50">
                    <Star className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>

              {/* Low Stock Alert Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Low Stock Items</p>
                    <p className="text-xl font-bold text-gray-900">
                      {dashboardData.summary?.lowStock?.length || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {dashboardData.summary?.lowStock?.filter(item => item.stock <= 0).length || 0} out of stock
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </div>

              {/* High Stock Summary Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">High Stock Items</p>
                    <p className="text-xl font-bold text-gray-900">
                      {dashboardData.summary?.highStock?.length || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Top product: {dashboardData.summary?.mostStockedInProduct?.name || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-50">
                    <BarChart2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">Recent Stock Movements</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventoryData.slice(0, 3).map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.sku}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.status === 'Out of Stock' 
                              ? 'bg-red-100 text-red-800' 
                              : item.status === 'Low Stock' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.stock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.category}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-600" />
                Recent Activities
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({recentActivities.length} activities)
                </span>
              </h3>
            </div>
            <div className="p-4">
              {recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="p-1 rounded-full bg-gray-100">
                        <activity.icon className={`w-4 h-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-500 truncate">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(activity.time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No recent activities</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stock In vs Stock Out Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart2 className="w-5 h-5 mr-2 text-blue-600" />
                Stock In vs Stock Out Trends
              </h3>
              <p className="text-sm text-gray-500 mt-1">{getPeriodLabel()} comparison of stock movements</p>
            </div>
            
            {/* Period Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handlePeriodChange('30days')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedPeriod === '30days'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => handlePeriodChange('6months')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedPeriod === '6months'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                6 Months
              </button>
              <button
                onClick={() => handlePeriodChange('1year')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedPeriod === '1year'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                1 Year
              </button>
            </div>
          </div>
          
          <div className="h-80">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="period" 
                    stroke="#6b7280"
                    fontSize={12}
                    angle={selectedPeriod === '30days' ? -45 : 0}
                    textAnchor={selectedPeriod === '30days' ? 'end' : 'middle'}
                    height={selectedPeriod === '30days' ? 80 : 60}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="stockIn" 
                    fill="#10b981" 
                    name="Stock In"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="stockOut" 
                    fill="#3b82f6" 
                    name="Stock Out"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No chart data available</p>
                  <p className="text-sm text-gray-400">Check if stock data exists for the selected period</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {chartData.reduce((sum, item) => sum + (item.stockIn || 0), 0)}
              </div>
              <div className="text-sm text-gray-500">Total Stock In ({getPeriodLabel().toLowerCase()})</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {chartData.reduce((sum, item) => sum + (item.stockOut || 0), 0)}
              </div>
              <div className="text-sm text-gray-500">Total Stock Out ({getPeriodLabel().toLowerCase()})</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {chartData.reduce((sum, item) => sum + ((item.stockIn || 0) - (item.stockOut || 0)), 0)}
              </div>
              <div className="text-sm text-gray-500">Net Stock Change</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;