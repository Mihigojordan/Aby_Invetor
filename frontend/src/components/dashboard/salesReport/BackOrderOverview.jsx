import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertCircle, 
  DollarSign, 
  Calendar,
  Users,
  ShoppingCart,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  ArrowLeft
} from 'lucide-react';
import stockOutService from '../../../services/stockoutService'; // Adjust import path
import { db } from '../../../db/database';
import productService from '../../../services/productService';
import { useNetworkStatusContext } from '../../../context/useNetworkContext';

const BackOrderDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalBackOrders: 0,
    totalBackOrderValue: 0,
    pendingBackOrders: 0,
    completedBackOrders: 0,
    recentBackOrders: [],
    topProducts: [],
    paymentMethodStats: {},
    monthlyTrends: [],
    averageOrderValue: 0,
    totalClients: 0
  });
  
  const {isOnline}  =useNetworkStatusContext()
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30'); // days

  useEffect(() => {
   if(isOnline){
     fetchDashboardData();
   }else{
    loadStockOuts()
   }
  }, [timeRange,isOnline]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const stockOutData = await stockOutService.getAllStockOuts();
      
      // Filter back orders from stock out data
      const backOrders = stockOutData.filter(item => item.backorder);
      
      // Calculate dashboard metrics
      const metrics = calculateDashboardMetrics(backOrders);
      setDashboardData(metrics);
      
    } catch (err) {
      loadStockOuts()
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }
  


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
          .sort((a, b) => a.synced - b.synced)
          ;
  
        const convertedStockIns = Array.from(stockinMap.values())
  
        console.warn('STOCK INS', backOrderMap);
  
         // Group by transaction ID
   

       const backOrders = combinedStockOuts.filter(item => item.backorder);
      
      // Calculate dashboard metrics
      const metrics = calculateDashboardMetrics(backOrders);
      setDashboardData(metrics);
      
  
     
  
      } catch (error) {
        console.error('Error loading stock-outs:', error);
        
      } finally {
        setLoading(false);
      }
    };
  
  
  
    const fetchStockIns = async () => {
      try {
    
  
        // 3. Merge all data (works offline too)
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
  
        console.warn('THIS THE COMBINED STOCK IN :', combinedStockin);
  
  
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
        console.warn('backend', combinedBackOrder);
  
        return combinedBackOrder;
  
      } catch (error) {
        console.error('Error fetching backorders:', error);
  
        // Fallback: return local cache if API fails or offline
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
          console.warn('backend', combinedBackOrder);
  
          return combinedBackOrder;
  
        }
      }
    };
  
  
    const fetchProducts = async () => {
      try {
     
  
        // 3. Merge all data (works offline too)
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
  
          // 3. Merge all data (works offline too)
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
  ;

  const calculateDashboardMetrics = (backOrders) => {
    const currentDate = new Date();
    const timeRangeDate = new Date();
    timeRangeDate.setDate(currentDate.getDate() - parseInt(timeRange));

    // Filter by time range
    const filteredOrders = backOrders.filter(order => 
      new Date(order.createdAt) >= timeRangeDate
    );

    // Total back orders
    const totalBackOrders = filteredOrders.length;

    // Total value calculation
    const totalBackOrderValue = filteredOrders.reduce((sum, order) => 
      sum + ((order.soldPrice) || 0), 0
    );

    // Status-based calculations (assuming we track status somehow)
    const pendingBackOrders = filteredOrders.filter(order => 
      !order.completedAt // Assuming completedAt field exists
    ).length;
    
    const completedBackOrders = totalBackOrders - pendingBackOrders;

    // Recent orders (last 7 days)
    const recentDate = new Date();
    recentDate.setDate(currentDate.getDate() - 7);
    const recentBackOrders = filteredOrders
      .filter(order => new Date(order.createdAt) >= recentDate)
      .slice(0, 5);

    // Top products by quantity
    const productStats = {};
    filteredOrders.forEach(order => {
      if (order.backorder?.productName) {
        const product = order.backorder.productName;
        if (!productStats[product]) {
          productStats[product] = { quantity: 0, value: 0, orders: 0 };
        }
        productStats[product].quantity += order.quantity || 0;
        productStats[product].value += order.soldPrice || 0;
        productStats[product].orders += 1;
      }
    });

    const topProducts = Object.entries(productStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Payment method statistics
    const paymentMethodStats = {};
    filteredOrders.forEach(order => {
      const method = order.paymentMethod || 'Unknown';
      paymentMethodStats[method] = (paymentMethodStats[method] || 0) + 1;
    });

    // Monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(currentDate.getMonth() - i);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthOrders = backOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });

      monthlyTrends.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        orders: monthOrders.length,
        value: monthOrders.reduce((sum, order) => sum + (order.soldPrice || 0), 0)
      });
    }

    // Average order value
    const averageOrderValue = totalBackOrders > 0 ? totalBackOrderValue / totalBackOrders : 0;

    // Unique clients
    const uniqueClients = new Set();
    filteredOrders.forEach(order => {
      if (order.clientEmail) uniqueClients.add(order.clientEmail);
      else if (order.clientPhone) uniqueClients.add(order.clientPhone);
      else if (order.clientName) uniqueClients.add(order.clientName);
    });

    return {
      totalBackOrders,
      totalBackOrderValue,
      pendingBackOrders,
      completedBackOrders,
      recentBackOrders,
      topProducts,
      paymentMethodStats,
      monthlyTrends,
      averageOrderValue,
      totalClients: uniqueClients.size
    };
  };

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = "blue" }) => {
    const colorClasses = {
      blue: "border-blue-200 bg-blue-50 text-blue-600",
      green: "border-green-200 bg-green-50 text-green-600",
      yellow: "border-yellow-200 bg-yellow-50 text-yellow-600",
      red: "border-red-200 bg-red-50 text-red-600",
      purple: "border-purple-200 bg-purple-50 text-purple-600",
      indigo: "border-indigo-200 bg-indigo-50 text-indigo-600"
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <div className="flex items-center mt-2">
                {trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {trendValue}%
                </span>
                <span className="text-sm text-gray-500 ml-1">vs last period</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">Error loading dashboard: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 h-[90vh] overflow-y-auto">

      {/* Header */}
       <button className="flex items-center text-gray-600 hover:text-gray-900 mb-4" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stock Outs
          </button>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Non-Stock Sales Dashboard</h1>
          <p className="text-gray-600">Overview and analytics for Non-Stock Sales management</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Back Orders"
          value={formatNumber(dashboardData.totalBackOrders)}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Total Value"
          value={formatCurrency(dashboardData.totalBackOrderValue)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Pending Orders"
          value={formatNumber(dashboardData.pendingBackOrders)}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Completed Orders"
          value={formatNumber(dashboardData.completedBackOrders)}
          icon={ShoppingCart}
          color="purple"
        />
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Average Order Value"
          value={formatCurrency(dashboardData.averageOrderValue)}
          icon={BarChart3}
          color="indigo"
        />
        <StatCard
          title="Unique Clients"
          value={formatNumber(dashboardData.totalClients)}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Recent Orders (7d)"
          value={formatNumber(dashboardData.recentBackOrders.length)}
          icon={Activity}
          color="red"
        />
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2  gap-8 mb-8">
        {/* Top Products */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Non-Stock Sales Products</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {dashboardData.topProducts.length > 0 ? (
              dashboardData.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      {product.orders} orders • {formatCurrency(product.value)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{product.quantity}</p>
                    <p className="text-sm text-gray-500">units</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No Non-Stock Sales products found</p>
            )}
          </div>
        </div>

<div className="flex gap-4 flex-col h-full">

        {/* Payment Methods */}
        <div className="bg-white flex-1  rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {Object.entries(dashboardData.paymentMethodStats).length > 0 ? (
              Object.entries(dashboardData.paymentMethodStats).map(([method, count]) => {
                const percentage = ((count / dashboardData.totalBackOrders) * 100).toFixed(1);
                return (
                  <div key={method} className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 capitalize">{method.toLowerCase()}</span>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 mr-2">{count}</span>
                      <span className="text-sm font-medium text-gray-900">({percentage}%)</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-4">No payment data available</p>
            )}
          </div>
        </div>
 {/* Monthly Trends */}
        <div className="bg-white flex-auto rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Trends</h3>
          <BarChart3 className="w-5 h-5 text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <div className="flex space-x-4 min-w-max">
            {dashboardData.monthlyTrends.map((month, index) => (
              <div key={index} className="text-center min-w-24">
                <div className="bg-blue-100 rounded-lg p-3 mb-2">
                  <p className="text-lg font-bold text-blue-600">{month.orders}</p>
                </div>
                <p className="text-sm text-gray-600 mb-1">{month.month}</p>
                <p className="text-xs text-gray-500">{formatCurrency(month.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
</div>
      </div>

     
      

      {/* Recent Back Orders */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Back Orders</h3>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-2 font-medium text-gray-900">Product</th>
                <th className="text-left p-2 font-medium text-gray-900">Client</th>
                <th className="text-left p-2 font-medium text-gray-900">Quantity</th>
                <th className="text-left p-2 font-medium text-gray-900">Value</th>
                <th className="text-left p-2 font-medium text-gray-900">Date</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.recentBackOrders.length > 0 ? (
                dashboardData.recentBackOrders.map((order, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-2 font-medium text-gray-900">
                      {order.backorder?.productName || 'N/A'}
                    </td>
                    <td className="p-2 text-gray-600">
                      {order.clientName || order.clientEmail || 'Anonymous'}
                    </td>
                    <td className="p-2 text-gray-600">{order.quantity}</td>
                    <td className="p-2 text-gray-600">{formatCurrency(order.soldPrice)}</td>
                    <td className="p-2 text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-gray-500">
                    No recent back orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BackOrderDashboard;