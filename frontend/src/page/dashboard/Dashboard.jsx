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

import employeeService from "../../services/employeeService";
import productService from "../../services/productService";
import salesReturnService from "../../services/salesReturnService";
import stockOutService from "../../services/stockOutService";
import stockinService from "../../services/stockinService";
import categoryService from "../../services/categoryService";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
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

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const summary = await fetchSummaryCounts();

      const [
        employees,
        products,
        stockIns,
        stockOuts,
        categories,
        salesReturns,
      ] = await Promise.all([
        employeeService.getAllEmployees(),
        productService.getAllProducts(),
        stockinService.getAllStockIns(),
        stockOutService.getAllStockOuts(),
        categoryService.getAllCategories(),
        salesReturnService.getAllSalesReturns(),
      ]);

      const data = {
        employees,
        products,
        stockIns,
        stockOuts,
        categories,
        salesReturns: salesReturns.data,
        summary
      };

      setDashboardData(data);

      if (summary) {
        calculateStats(summary);
      } else {
        calculateStatsFromData(data);
      }

      prepareInventoryData(data);
      prepareRecentActivities(data);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (summary) => {
    const newStats = [
      {
        title: 'Total Products',
        value: summary.totalProducts.toString(),
        icon: Package,
        change: `${summary.totalStockIn} total stock in`,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'Low Stock Items',
        value: summary.lowStock.length.toString(),
        icon: AlertTriangle,
        change: `${summary.lowStock.filter(item => item.stock <= 0).length} out of stock`,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      },
      {
        title: 'Total Stock Out',
        value: summary.totalStockOut.toString(),
        icon: ArrowDownRight,
        change: `${summary.totalSalesReturns} sales returns`,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        title: 'Total Employees',
        value: summary.totalEmployees.toString(),
        icon: UserCheck,
        change: `${summary.totalCategories} categories`,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      },
      {
        title: 'Total Categories',
        value: summary.totalCategories.toString(),
        icon: Layers,
        change: `Most used: ${summary.mostUsedCategory?.name || 'N/A'}`,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50'
      },
      {
        title: 'High Stock Items',
        value: summary.highStock.length.toString(),
        icon: TrendingUp,
        change: `Top product: ${summary.mostStockedInProduct?.name || 'N/A'}`,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50'
      },
      {
        title: 'Total Stock In',
        value: summary.totalStockIn.toString(),
        icon: Box,
        change: `Most stocked: ${summary.mostStockedInProduct?.name || 'N/A'}`,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50'
      },
      {
        title: 'Sales Returns',
        value: summary.totalSalesReturns.toString(),
        icon: RefreshCw,
        change: `${summary.totalStockOut} total stock out`,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50'
      }
    ];
    setStats(newStats);
  };

  const calculateStatsFromData = (data) => {
    const totalProducts = data.products.length;
    const totalEmployees = data.employees.length;
    const totalCategories = data.categories.length;
    const totalStockIn = data.stockIns.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalStockOut = data.stockOuts.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalSalesReturns = data.salesReturns.length;

    const lowStock = data.stockIns.filter(item => item.quantity <= 5);

    setStats([
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
        change: `${lowStock.filter(item => item.quantity <= 0).length} out of stock`,
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
    ]);
  };

  const prepareInventoryData = (data) => {
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

  const prepareRecentActivities = (data) => {
    const activities = [];

    const recentStockIns = data.stockIns
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);

    recentStockIns.forEach(stockIn => {
      const product = data.products.find(p => p.id === stockIn.productId);
      activities.push({
        id: `stockin-${stockIn.id}`,
        type: 'stock_in',
        title: 'Stock Added',
        description: `${stockIn.quantity} units of ${product?.productName || 'product'} added`,
        time: stockIn.createdAt,
        icon: ArrowUpRight,
        color: 'text-green-600'
      });
    });

    const recentStockOuts = data.stockOuts
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);

    recentStockOuts.forEach(stockOut => {
      activities.push({
        id: `stockout-${stockOut.id}`,
        type: 'stock_out',
        title: 'Sale Completed',
        description: `${stockOut.quantity} units sold to ${stockOut.clientName || 'customer'}`,
        time: stockOut.createdAt,
        icon: ArrowDownRight,
        color: 'text-blue-600'
      });
    });

    const recentReturns = data.salesReturns
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 2);

    recentReturns.forEach(returnItem => {
      activities.push({
        id: `return-${returnItem.id}`,
        type: 'return',
        title: 'Return Processed',
        description: `Return processed: ${returnItem.reason}`,
        time: returnItem.createdAt,
        icon: RefreshCw,
        color: 'text-red-600'
      });
    });

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    setRecentActivities(activities.slice(0, 8));
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

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

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ABY Inventory Dashboard</h1>
            <p className="text-gray-600">Real-time inventory management and analytics</p>
          </div>
        </div>
      </div>

      <main className="p-6">
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
      </main>
    </div>
  );
};

export default Dashboard;