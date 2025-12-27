import React, { useState } from 'react';
import { 
  Package, TrendingUp, TrendingDown, AlertCircle, 
  Menu, X, Bell, User, Search, Settings, LogOut,
  ShoppingCart, DollarSign, Box, BarChart3,
  ChevronRight, Clock, CheckCircle, ArrowUpRight,
  ArrowDownRight, RefreshCw, Layers, Award, Star
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

export default function PartnerDashboardHome() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('6months');

  const stats = [
    { 
      label: 'Total Products', 
      value: '1,247', 
      change: '+12%', 
      trend: 'up',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      label: 'Low Stock Items', 
      value: '23', 
      change: '-5%', 
      trend: 'down',
      icon: AlertCircle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    { 
      label: 'Active Orders', 
      value: '186', 
      change: '+8%', 
      trend: 'up',
      icon: ShoppingCart,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      label: 'Monthly Revenue', 
      value: 'RWF 45,250', 
      change: '+18%', 
      trend: 'up',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      label: 'Total Categories',
      value: '12',
      change: 'Electronics most used',
      trend: 'neutral',
      icon: Layers,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      label: 'High Stock Items',
      value: '45',
      change: 'Top: USB Cables',
      trend: 'neutral',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    }
  ];

  const recentOrders = [
    { id: 'ORD-001', product: 'Laptop Stand', quantity: 50, status: 'delivered', date: '2024-12-15', client: 'Tech Store Ltd' },
    { id: 'ORD-002', product: 'Wireless Mouse', quantity: 150, status: 'pending', date: '2024-12-16', client: 'Office Supplies Co' },
    { id: 'ORD-003', product: 'USB-C Cable', quantity: 200, status: 'processing', date: '2024-12-17', client: 'Electronics Hub' },
    { id: 'ORD-004', product: 'Keyboard', quantity: 75, status: 'delivered', date: '2024-12-18', client: 'Computer World' },
  ];

  const lowStockItems = [
    { name: 'HDMI Cable', current: 15, minimum: 50, category: 'Cables' },
    { name: 'Power Adapter', current: 8, minimum: 30, category: 'Accessories' },
    { name: 'Phone Case', current: 22, minimum: 100, category: 'Mobile' },
    { name: 'Screen Protector', current: 35, minimum: 80, category: 'Mobile' },
  ];

  const inventoryOverview = [
    { title: 'Most Used Category', value: 'Electronics', subtitle: 'Used 245 times', icon: Award, color: 'indigo' },
    { title: 'Most Stocked Product', value: 'USB-C Cables', subtitle: '1,247 total stock', icon: Star, color: 'emerald' },
    { title: 'Low Stock Items', value: '23', subtitle: '5 out of stock', icon: AlertCircle, color: 'amber' },
    { title: 'High Stock Items', value: '45', subtitle: 'Top: Keyboards', icon: BarChart3, color: 'green' },
  ];

  const recentActivities = [
    { id: 1, type: 'stock_in', title: 'Stock Added', description: '150 units of Wireless Mouse added', time: '2h ago', icon: ArrowUpRight, color: 'text-green-600' },
    { id: 2, type: 'stock_out', title: 'Sale Completed', description: '50 units sold to Tech Store Ltd', time: '3h ago', icon: ArrowDownRight, color: 'text-blue-600' },
    { id: 3, type: 'stock_in', title: 'Stock Added', description: '200 units of USB-C Cable added', time: '5h ago', icon: ArrowUpRight, color: 'text-green-600' },
    { id: 4, type: 'return', title: 'Return Processed', description: 'Return processed: Defective item', time: '6h ago', icon: RefreshCw, color: 'text-red-600' },
    { id: 5, type: 'stock_out', title: 'Sale Completed', description: '75 units sold to Computer World', time: '8h ago', icon: ArrowDownRight, color: 'text-blue-600' },
  ];

  const chartData = {
    '30days': [
      { period: 'Dec 1', stockIn: 120, stockOut: 80 },
      { period: 'Dec 5', stockIn: 150, stockOut: 90 },
      { period: 'Dec 10', stockIn: 180, stockOut: 120 },
      { period: 'Dec 15', stockIn: 200, stockOut: 150 },
      { period: 'Dec 20', stockIn: 170, stockOut: 130 },
    ],
    '6months': [
      { period: 'Jul 2024', stockIn: 1200, stockOut: 900 },
      { period: 'Aug 2024', stockIn: 1400, stockOut: 1100 },
      { period: 'Sep 2024', stockIn: 1600, stockOut: 1300 },
      { period: 'Oct 2024', stockIn: 1800, stockOut: 1500 },
      { period: 'Nov 2024', stockIn: 1700, stockOut: 1400 },
      { period: 'Dec 2024', stockIn: 1900, stockOut: 1600 },
    ],
    '1year': [
      { period: 'Jan 2024', stockIn: 1000, stockOut: 800 },
      { period: 'Feb 2024', stockIn: 1100, stockOut: 850 },
      { period: 'Mar 2024', stockIn: 1300, stockOut: 1000 },
      { period: 'Apr 2024', stockIn: 1200, stockOut: 950 },
      { period: 'May 2024', stockIn: 1400, stockOut: 1100 },
      { period: 'Jun 2024', stockIn: 1500, stockOut: 1200 },
      { period: 'Jul 2024', stockIn: 1600, stockOut: 1300 },
      { period: 'Aug 2024', stockIn: 1700, stockOut: 1400 },
      { period: 'Sep 2024', stockIn: 1800, stockOut: 1500 },
      { period: 'Oct 2024', stockIn: 1900, stockOut: 1600 },
      { period: 'Nov 2024', stockIn: 2000, stockOut: 1700 },
      { period: 'Dec 2024', stockIn: 2100, stockOut: 1800 },
    ]
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'inventory', label: 'My Inventory', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getCardColor = (color) => {
    const colors = {
      blue: 'bg-blue-50',
      orange: 'bg-orange-50',
      green: 'bg-green-50',
      purple: 'bg-purple-50',
      indigo: 'bg-indigo-50',
      emerald: 'bg-emerald-50',
      amber: 'bg-amber-50'
    };
    return colors[color] || colors.blue;
  };

  const getIconColor = (color) => {
    const colors = {
      indigo: 'text-indigo-600',
      emerald: 'text-emerald-600',
      amber: 'text-amber-600',
      green: 'text-green-600'
    };
    return colors[color] || 'text-blue-600';
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case '30days': return 'Last 30 days';
      case '6months': return 'Last 6 months';
      case '1year': return 'Last 12 months';
      default: return 'Last 6 months';
    }
  };

  const currentChartData = chartData[selectedPeriod];
  const totalStockIn = currentChartData.reduce((sum, item) => sum + item.stockIn, 0);
  const totalStockOut = currentChartData.reduce((sum, item) => sum + item.stockOut, 0);
  const netChange = totalStockIn - totalStockOut;

  return (
    <div className="flex h-screen bg-gray-50">
     

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
    

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-white rounded-xl shadow-sm py-3 px-4 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-sm text-gray-500 mt-1 flex items-center">
                        {stat.trend === 'up' && <TrendingUp className="w-4 h-4 mr-1 text-green-600" />}
                        {stat.trend === 'down' && <TrendingDown className="w-4 h-4 mr-1 text-red-600" />}
                        {stat.change}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Inventory Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Overview</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {inventoryOverview.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">{item.title}</p>
                          <p className="text-xl font-bold text-gray-900">{item.value}</p>
                          <p className="text-sm text-gray-500 mt-1">{item.subtitle}</p>
                        </div>
                        <div className={`p-3 rounded-xl ${getCardColor(item.color)}`}>
                          <Icon className={`w-6 h-6 ${getIconColor(item.color)}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                      {recentOrders.slice(0, 3).map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{order.product}</div>
                            <div className="text-sm text-gray-500">{order.id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            Electronics
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
                <p className="text-sm text-gray-500">({recentActivities.length} activities)</p>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  {recentActivities.map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="p-1 rounded-full bg-gray-100">
                          <Icon className={`w-4 h-4 ${activity.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-500 truncate">{activity.description}</p>
                          <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
              </div>
              <button className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {lowStockItems.map((item, index) => (
                <div key={index} className="border-l-4 border-orange-500 pl-4 py-2 bg-orange-50 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>
                    <span className="text-sm font-semibold text-orange-600">
                      {item.current}/{item.minimum}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all"
                      style={{ width: `${(item.current / item.minimum) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock In vs Stock Out Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                  Stock In vs Stock Out Trends
                </h3>
                <p className="text-sm text-gray-500 mt-1">{getPeriodLabel()} comparison of stock movements</p>
              </div>
              
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSelectedPeriod('30days')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedPeriod === '30days'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  30 Days
                </button>
                <button
                  onClick={() => setSelectedPeriod('6months')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedPeriod === '6months'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  6 Months
                </button>
                <button
                  onClick={() => setSelectedPeriod('1year')}
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={currentChartData}
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
                  />
                  <Legend />
                  <Bar 
                    dataKey="stockIn" 
                    fill="#10b981" 
                    name="Stock In"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="stockOut" 
                    fill="#3b82f6" 
                    name="Stock Out"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalStockIn}</div>
                <div className="text-sm text-gray-500">Total Stock In</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalStockOut}</div>
                <div className="text-sm text-gray-500">Total Stock Out</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{netChange}</div>
                <div className="text-sm text-gray-500">Net Stock Change</div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}