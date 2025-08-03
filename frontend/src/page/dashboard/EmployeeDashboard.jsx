import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
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
  BarChart3,
  PieChartIcon,
  Shield,
  Lock,
  Eye,
  UserX
} from 'lucide-react';

// Import real services
import productService from "../../services/productService";
import salesReturnService from "../../services/salesReturnService";
import stockOutService from "../../services/stockoutService";
import stockinService from "../../services/stockinService";
import categoryService from "../../services/categoryService";
import useEmployeeAuth from '../../context/EmployeeAuthContext';


const Dashboard = () => {
  const { user } = useEmployeeAuth();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [dateRange, setDateRange] = useState({ 
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0] // today
  });
  
  // Data states
  const [dashboardData, setDashboardData] = useState({
    products: [],
    stockIns: [],
    stockOuts: [],
    categories: [],
    salesReturns: []
  });

  // Computed states
  const [stats, setStats] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [chartData, setChartData] = useState({
    stockByCategory: [],
    salesTrend: [],
    inventoryDistribution: [],
    quickStats: {}
  });

  // Permission checks based on user tasks
  const userTasks = user?.tasks || [];
  const canViewSales = userTasks.some(task => task.taskname?.toLowerCase().includes('selling') || task.taskname?.toLowerCase().includes('sales') || task.taskname?.toLowerCase().includes('saling') || task.taskname?.toLowerCase().includes('stockout'))  ;
  const canViewReturns = userTasks.some(task => task.taskname?.toLowerCase().includes('returning') || task.taskname?.toLowerCase().includes('return'));
  const canViewReceiving = userTasks.some(task => task.taskname?.toLowerCase().includes('receiving') || task.taskname?.toLowerCase().includes('stockin'));
  const canViewProducts = canViewReturns || canViewReceiving;
  const canViewCategories = canViewReturns || canViewReceiving;

  // Check if user has any relevant permissions
  const hasAnyPermissions = canViewSales || canViewReturns || canViewReceiving;

  // Check what content sections are available for responsive layout
  const hasStockByCategory = canViewCategories && canViewReceiving && chartData.stockByCategory.length > 0;
  const hasSalesTrend = (canViewSales || canViewReturns) && chartData.salesTrend.length > 0;
  const hasInventoryDistribution = chartData.inventoryDistribution.length > 0;
  const hasQuickStats = Object.keys(chartData.quickStats).length > 0;

  // Calculate responsive grid classes based on available content
  const getAnalyticsGridClass = () => {
    const availableCharts = [hasStockByCategory, hasSalesTrend].filter(Boolean).length;
    
    if (availableCharts === 1) {
      return "grid grid-cols-1 gap-6 mb-8"; // Single chart takes full width
    }
    return "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"; // Two charts side by side on large screens
  };

  const getBottomSectionGridClass = () => {
    const availableSections = [hasInventoryDistribution, hasQuickStats].filter(Boolean).length;
    
    if (availableSections === 1) {
      return "grid grid-cols-1 gap-6"; // Single section takes full width
    }
    return "grid grid-cols-1 lg:grid-cols-2 gap-6"; // Two sections side by side on large screens
  };

  // Load data based on user permissions
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const promises = [];
      const data = {
        products: [],
        stockIns: [],
        stockOuts: [],
        categories: [],
        salesReturns: []
      };

      // Load data based on permissions
      if (canViewProducts) {
        promises.push(productService.getAllProducts().then(result => data.products = result));
      }
      
      if (canViewCategories) {
        promises.push(categoryService.getAllCategories().then(result => data.categories = result));
      }
      
      if (canViewReceiving) {
        promises.push(stockinService.getAllStockIns().then(result => data.stockIns = result));
      }
      
      if (canViewSales) {
        promises.push(stockOutService.getAllStockOuts().then(result => data.stockOuts = result));
      }
      
      if (canViewReturns) {
        promises.push(salesReturnService.getAllSalesReturns().then(result => data.salesReturns = result.data || []));
      }

      // Wait for all permitted data to load
      await Promise.all(promises);

      console.log('Loaded data based on permissions:', data);
      
      setDashboardData(data);
      
      if (hasAnyPermissions) {
        calculateStats(data);
        prepareInventoryData(data);
        await prepareChartData(data);
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate dashboard statistics based on available data
  const calculateStats = (data) => {
    const newStats = [];

    if (canViewProducts) {
      const totalProducts = data.products.length;
      const totalStock = data.stockIns.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
      
      newStats.push({
        title: 'Total Products', 
        value: totalProducts.toString(), 
        icon: Package, 
        change: `${totalStock} total stock`, 
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      });
    }

    if (canViewReceiving) {
      const lowStockItems = data.stockIns.filter(stock => (stock.quantity || 0) <= 5 && (stock.quantity || 0) > 0).length;
      const outOfStockItems = data.stockIns.filter(stock => (stock.quantity || 0) === 0).length;
      
      newStats.push({
        title: 'Low Stock Items', 
        value: lowStockItems.toString(), 
        icon: AlertTriangle, 
        change: `${outOfStockItems} out of stock`, 
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      });
    }

    if (canViewSales) {
      const totalRevenue = data.stockOuts.reduce((sum, sale) => sum + ((sale.soldPrice || 0) * (sale.quantity || 0)), 0);
      
      newStats.push({
        title: 'Total Revenue', 
        value: `$${totalRevenue.toLocaleString()}`, 
        icon: DollarSign, 
        change: `${data.stockOuts.length} sales`, 
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      });
    }

    if (canViewReturns) {
      const totalReturns = data.salesReturns.length;
      
      newStats.push({
        title: 'Returns Processed', 
        value: totalReturns.toString(), 
        icon: RefreshCw, 
        change: `${data.categories.length} categories`, 
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      });
    }

    setStats(newStats);
  };

  // Prepare inventory table data (only if user can view receiving)
  const prepareInventoryData = (data) => {
    if (!canViewReceiving) {
      setInventoryData([]);
      return;
    }

    const inventory = data.stockIns.map(stockIn => {
      const product = data.products.find(p => p.id === stockIn.productId);
      const category = data.categories.find(c => c.id === product?.categoryId);
      
      let status = 'In Stock';
      if (stockIn.quantity === 0) status = 'Out of Stock';
      else if (stockIn.quantity <= 5) status = 'Low Stock';

      return {
        id: stockIn.id,
        name: product?.productName || 'Unknown Product',
        sku: stockIn.sku || 'N/A',
        category: category?.name || 'Uncategorized',
        stock: stockIn.quantity || 0,
        price: stockIn.sellingPrice || 0,
        costPrice: stockIn.price || 0,
        status,
        supplier: stockIn.supplier || 'N/A',
        createdAt: stockIn.createdAt
      };
    });

    setInventoryData(inventory);
  };

  // Prepare dynamic chart data based on permissions
  const prepareChartData = async (data) => {
    try {
      let stockByCategory = [];
      let salesTrend = [];
      let inventoryDistribution = [];
      let quickStats = {};

      // Stock by Category - Only if user can view categories and receiving
      if (canViewCategories && canViewReceiving) {
        stockByCategory = data.categories.map(category => {
          const categoryProducts = data.products.filter(p => p.categoryId === category.id);
          const totalStock = categoryProducts.reduce((sum, product) => {
            const productStocks = data.stockIns.filter(stock => stock.productId === product.id);
            return sum + productStocks.reduce((stockSum, stock) => stockSum + (stock.quantity || 0), 0);
          }, 0);

          return {
            name: category.name,
            stock: totalStock,
            value: totalStock
          };
        }).filter(item => item.stock > 0);
      }

      // Sales Trend - Only if user can view sales and returns
      if (canViewSales || canViewReturns) {
        salesTrend = await generateSalesTrend(data);
      }

      // Inventory Distribution - Only if user has relevant permissions
      if (canViewReceiving || canViewSales) {
        const totalStockValue = data.stockIns.reduce((sum, stock) => 
          sum + ((stock.price || 0) * (stock.quantity || 0)), 0);
        const totalSalesValue = data.stockOuts.reduce((sum, sale) => 
          sum + ((sale.soldPrice || 0) * (sale.quantity || 0)), 0);
        
        const returnsValue = data.salesReturns.reduce((sum, returnItem) => {
          const avgSellingPrice = data.stockOuts.length > 0 ? 
            data.stockOuts.reduce((s, sale) => s + (sale.soldPrice || 0), 0) / data.stockOuts.length : 0;
          return sum + (avgSellingPrice * 0.1);
        }, 0);

        inventoryDistribution = [
          canViewReceiving && { 
            name: 'Active Stock', 
            value: Math.max(0, totalStockValue - totalSalesValue), 
            fill: '#3b82f6' 
          },
          canViewSales && { 
            name: 'Sold', 
            value: totalSalesValue, 
            fill: '#10b981' 
          },
          canViewReturns && { 
            name: 'Returns', 
            value: returnsValue, 
            fill: '#ef4444' 
          }
        ].filter(item => item && item.value > 0);
      }

      // Quick Stats based on permissions
      if (canViewReceiving) {
        quickStats.lowStock = data.stockIns.filter(stock => 
          (stock.quantity || 0) <= 5 && (stock.quantity || 0) > 0).length;
        quickStats.outOfStock = data.stockIns.filter(stock => (stock.quantity || 0) === 0).length;
      }
      
      if (canViewReturns) {
        quickStats.totalReturns = data.salesReturns.length;
      }
      
      if (canViewSales) {
        quickStats.pendingOrders = data.stockOuts.filter(sale => {
          const saleDate = new Date(sale.createdAt);
          const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
          return saleDate > threeDaysAgo;
        }).length;
      }

      setChartData({
        stockByCategory,
        salesTrend,
        inventoryDistribution,
        quickStats
      });

    } catch (error) {
      console.error('Error preparing chart data:', error);
    }
  };

  // Generate sales trend from actual data
  const generateSalesTrend = async (data) => {
    try {
      const months = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        
        let salesValue = 0;
        let returnsValue = 0;

        if (canViewSales) {
          const monthlySales = data.stockOuts.filter(sale => {
            const saleDate = new Date(sale.createdAt);
            return saleDate >= date && saleDate <= endDate;
          });
          salesValue = monthlySales.reduce((sum, sale) => 
            sum + ((sale.soldPrice || 0) * (sale.quantity || 0)), 0);
        }

        if (canViewReturns) {
          const monthlyReturns = data.salesReturns.filter(returnItem => {
            const returnDate = new Date(returnItem.createdAt);
            return returnDate >= date && returnDate <= endDate;
          });
          returnsValue = monthlyReturns.length * 500;
        }

        months.push({
          month: monthName,
          sales: salesValue,
          returns: returnsValue
        });
      }

      return months;
    } catch (error) {
      console.error('Error generating sales trend:', error);
      return [];
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

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

  // No permissions view
  if (!hasAnyPermissions) {
    return (
      <div className="max-h-[90vh] overflow-y-auto bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome, {user?.firstname} {user?.lastname}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md mx-auto">
            <div className="mb-6">
              <UserX className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            </div>
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Access Restricted</h2>
            <p className="text-gray-500 mb-6 leading-relaxed">
              You don't have any assigned tasks that grant access to dashboard features. 
              Please contact your administrator to get the appropriate permissions.
            </p>
            
            <button
              onClick={handleRefresh}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Permissions</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome, {user?.firstname} {user?.lastname} - Role-based inventory access</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Eye className="w-4 h-4" />
              <span>Access: {[
                canViewSales && 'Sales',
                canViewReturns && 'Returns', 
                canViewReceiving && 'Receiving'
              ].filter(Boolean).join(', ')}</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>
     
      <main className="p-6">
        {/* Stats Cards - Responsive grid based on number of stats */}
        {stats.length > 0 && (
          <div className={`grid gap-6 mb-8 ${
            stats.length === 1 ? 'grid-cols-1 md:grid-cols-1' :
            stats.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
            stats.length === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          }`}>
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
        )}

        {/* Analytics Dashboard Section - Responsive based on available charts */}
        {(hasStockByCategory || hasSalesTrend) && (
          <div className={getAnalyticsGridClass()}>
            {/* Stock by Category Chart */}
            {hasStockByCategory && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                    Stock by Category
                  </h3>
                  <span className="text-sm text-gray-500">
                    {chartData.stockByCategory.length} categories
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.stockByCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#f8fafc', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="stock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Sales Trend Chart */}
            {hasSalesTrend && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                    Sales & Returns Trend
                  </h3>
                  <span className="text-sm text-gray-500">Last 6 months</span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#f8fafc', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                      formatter={(value, name) => [
                        `$${value.toLocaleString()}`, 
                        name === 'sales' ? 'Sales' : 'Returns'
                      ]}
                    />
                    {canViewSales && (
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      />
                    )}
                    {canViewReturns && (
                      <Line 
                        type="monotone" 
                        dataKey="returns" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Bottom Section - Responsive based on available sections */}
        {(hasInventoryDistribution || hasQuickStats) && (
          <div className={getBottomSectionGridClass()}>
            {/* Inventory Distribution Pie Chart */}
            {hasInventoryDistribution && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <PieChartIcon className="w-5 h-5 mr-2 text-purple-600" />
                    Inventory Value Distribution
                  </h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.inventoryDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={40}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {chartData.inventoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Quick Stats */}
            {hasQuickStats && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                    Quick Stats
                  </h3>
                </div>
                <div className="space-y-4">
                  {canViewReceiving && chartData.quickStats.lowStock !== undefined && (
                    <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <span className="text-amber-700 font-medium">Low Stock Items</span>
                      </div>
                      <span className="text-amber-900 font-bold text-lg">{chartData.quickStats.lowStock}</span>
                    </div>
                  )}
                  
                  {canViewReceiving && chartData.quickStats.outOfStock !== undefined && (
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-center space-x-3">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                        <span className="text-red-700 font-medium">Out of Stock</span>
                      </div>
                      <span className="text-red-900 font-bold text-lg">{chartData.quickStats.outOfStock}</span>
                    </div>
                  )}
                  
                  {canViewReturns && chartData.quickStats.totalReturns !== undefined && (
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center space-x-3">
                        <RefreshCw className="w-5 h-5 text-green-600" />
                        <span className="text-green-700 font-medium">Total Returns</span>
                      </div>
                      <span className="text-green-900 font-bold text-lg">{chartData.quickStats.totalReturns}</span>
                    </div>
                  )}
                  
                  {canViewSales && chartData.quickStats.pendingOrders !== undefined && (
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <span className="text-blue-700 font-medium">Recent Orders</span>
                      </div>
                      <span className="text-blue-900 font-bold text-lg">{chartData.quickStats.pendingOrders}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
       
      </main>
    </div>
  );
};

export default Dashboard;