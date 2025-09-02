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
  ChevronRight
} from 'lucide-react';
import stockOutService from '../../services/stockoutService'; // Adjust path as needed
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

const SalesReportPage = () => {
  const [salesData, setSalesData] = useState([]);
  const [filteredSalesData, setFilteredSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState('today');
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
      path:null,
    },
    {
      title: 'Total Quantity Sold',
      value: '0',
      change: 'Loading...',
      icon: ShoppingCart,
      bgColor: 'bg-blue-50',
      path:null,
      color: 'text-blue-600'
    },
    {
      title: 'Lowest Stock Out',
      value: 'Loading...',
      change: 'Product with minimum sales',
      icon: TrendingDown,
      bgColor: 'bg-red-50',
      path:null,
      color: 'text-red-600'
    },
    {
      title: 'Highest Stock Out',
      value: 'Loading...',
      change: 'Product with maximum sales',
      icon: TrendingUp,
      bgColor: 'bg-green-50',
      path:null,
      color: 'text-green-600'
    }
  ]);

  useEffect(() => {
    fetchSalesData();
  }, []);

  useEffect(() => {
    filterDataByPeriod();
  }, [salesData, currentPeriod]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const data = await stockOutService.getAllStockOuts();
      setSalesData(data);
      calculateStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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
    const totalSales = data.reduce((sum, item) => sum + (item.soldPrice || 0), 0);
    const totalQuantity = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalProfit = data.reduce((sum, item) => {
      const soldPrice = item.soldPrice || 0;
      const costPrice = item.stockin?.price || 0;
      const quantity = item.quantity || 0;
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

     const handleViewMoreDetails = (ID)=>{
      if(!ID) return Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No stock-out ID provided'
      });
      navigate(`/admin/dashboard/sales-report/stockout/${ID}`);
    }


  const calculateStats = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      setStats(prevStats => prevStats.map(stat => ({
        ...stat,
        value: stat.title.includes('Total') ? (stat.title.includes('Sales') ? '$0' : '0') : 'No data',
        change: stat.title.includes('Total') ? 'No sales recorded' : 'No products sold'
      })));
      return;
    }

    // Calculate total sales amount and quantity
    const totalSalesAmount = data.reduce((sum, item) => sum + (item.soldPrice || 0), 0);
    const totalQuantitySold = data.reduce((sum, item) => sum + (item.quantity || 0), 0);

    // Group by product to find highest and lowest selling products
    const productStats = {};
    
    data.forEach(item => {
      if (item.stockin && item.stockin.product) {
        const productName = item.stockin.product.productName || 'Unknown Product';
        const productId = item.stockin.product.id;
        
        if (!productStats[productId]) {
          productStats[productId] = {
            name: productName,
            totalQuantity: 0,
            totalValue: 0,
            salesCount: 0
          };
        }
        
        productStats[productId].totalQuantity += item.quantity || 0;
        productStats[productId].totalValue += item.soldPrice || 0;
        productStats[productId].salesCount += 1;
      }
    });

    // Find highest and lowest selling products
    const productArray = Object.values(productStats);
    
    let highestProduct = null;
    let lowestProduct = null;
    
    if (productArray.length > 0) {
      // Sort by total quantity sold
      productArray.sort((a, b) => b.totalQuantity - a.totalQuantity);
      highestProduct = productArray[0];
      lowestProduct = productArray[productArray.length - 1];
    }

 
    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'RWF'
      }).format(amount);
    };

    // Update stats
    setStats([
      {
        title: 'Total Sales',
        value: formatCurrency(totalSalesAmount),
        change: `${data.length} transactions`,
        icon: DollarSign,
        bgColor: 'bg-green-50',
        color: 'text-green-600',
         path:'/admin/dashboard/stockout'
      },
      {
        title: 'Total Quantity Sold',
        value: totalQuantitySold.toLocaleString(),
        change: `${Object.keys(productStats).length} products`,
        icon: ShoppingCart,
        bgColor: 'bg-blue-50',
        color: 'text-blue-600',
        path:'/admin/dashboard/stockout'
      },
      {
        title: 'Lowest Stock Out',
        value: lowestProduct ? `${lowestProduct.totalQuantity} units` : 'No data',
        change: lowestProduct ? lowestProduct.name : 'No products sold',
        icon: TrendingDown,
        bgColor: 'bg-red-50',
        color: 'text-red-600',
         path:'/admin/dashboard/sales-report/stockout-analysis'
      },
      {
        title: 'Highest Stock Out',
        value: highestProduct ? `${highestProduct.totalQuantity} units` : 'No data',
        change: highestProduct ? highestProduct.name : 'No products sold',
        icon: TrendingUp,
        bgColor: 'bg-green-50',
        color: 'text-green-600',
        path:'/admin/dashboard/sales-report/stockout-analysis',
      }
    ]);
  };

  const refresh = () => {
    fetchSalesData();
  };

  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredSalesData.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredSalesData.length / itemsPerPage);

  const PaginationComponent = () => (
    <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-xl">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredSalesData.length)} of {filteredSalesData.length} results
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="px-3 py-1 text-sm font-medium">
            {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  // Card View Component
const CardView = () => (
  <div className="space-y-6 md:hidden">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {currentItems.map((stockOut, index) => {
        const profit = calculateProfit(stockOut);
        const isProfit = profit > 0;
        
        return (
          <div key={stockOut.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:border-gray-300">
            {/* Card Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      #{startIndex + index + 1}
                    </div>
                  </div>
                </div>
                <button
                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="View Details"
                  onClick={() => handleViewMoreDetails(stockOut.id)}
                >
                  <Eye size={18} />
                </button>
              </div>

              {/* Product Info */}
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 text-lg mb-1 leading-tight">
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

              {/* Client Info */}
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <User size={16} className="text-gray-400" />
                  <span className="text-gray-600">
                    {stockOut.clientName || 'Walk-in customer'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Body - Stats */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Hash size={14} className="text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantity</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {stockOut.quantity || 'N/A'}
                  </div>
                </div>

                {/* Unit Price */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unit Price</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {stockOut.soldPrice ? formatPrice(stockOut.soldPrice) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl">
              <div className="flex items-center justify-between">
                {/* Profit/Loss */}
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Profit/Loss
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-lg ${isProfit ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {profit !== 0 ? formatPrice(Math.abs(profit)) : '$0.00'}
                    </span>
                    {profit !== 0 && (
                      <span className={`text-sm ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                        {isProfit ? '↗' : '↘'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Date */}
                <div className="flex flex-col items-end">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Date Sold
                  </span>
                  <div className="flex items-center gap-1">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600 font-medium">
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

    {/* No Data State */}
    {currentItems.length === 0 && (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingCart size={32} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No stock out records</h3>
        <p className="text-gray-500">Stock out transactions will appear here once you make some sales.</p>
      </div>
    )}

    <PaginationComponent />
  </div>
);

  // Table View Component
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {startIndex + index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                        <ShoppingCart size={16} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    {stockOut.clientName ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <User size={12} className="text-gray-400" />
                          <span className="text-sm text-gray-600 truncate max-w-32">
                            {stockOut.clientName}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Walk-in customer</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {stockOut.quantity ? (
                      <div className="flex items-center gap-1">
                        <Hash size={14} className="text-gray-400" />
                        <span className="font-medium text-gray-900">{stockOut.quantity}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {stockOut.soldPrice ? (
                      <span className="font-medium text-gray-900">
                        {formatPrice(stockOut.soldPrice)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-medium ${isProfit ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {profit !== 0 ? formatPrice(Math.abs(profit)) : '$0.00'}
                      {profit !== 0 && (
                        <span className="text-xs ml-1">
                          {isProfit ? '↗' : '↘'}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {formatDate(stockOut.createdAt)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="View Details"
                        onClick={()=> handleViewMoreDetails(stockOut.id)}
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

  if (loading) {
    return (
      <div className="h-[90vh] overflow-y-auto bg-gray-50 p-6">
        <div className=" mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Report</h1>
            <p className="text-gray-600">Loading sales analytics...</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 animate-pulse">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
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
        <div className=" mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Report</h1>
            <p className="text-gray-600">Analytics and insights for your sales performance</p>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Error Loading Sales Data</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button 
                  onClick={refresh}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
      <div className="px-4 mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Report</h1>
              <p className="text-gray-600">Analytics and insights for your sales performance</p>
            </div>
            <button 
              onClick={refresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} 
            className="bg-white rounded-xl cursor-pointer shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
            onClick={() =>  stat.path && navigate(stat.path)}
            >
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

        {/* Period Filter Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Today Card */}
          <div 
            className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${currentPeriod === 'today' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
            onClick={() => setCurrentPeriod('today')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Today Sales</p>
                <p className="text-xl font-bold text-gray-900">
                  {currentPeriod === 'today' ? formatPrice(periodStats.totalSales) : 'Click to view'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {currentPeriod === 'today' ? `${periodStats.totalQuantity} units sold` : 'Today\'s performance'}
                </p>
                {currentPeriod === 'today' && (
                  <p className={`text-xs mt-1 font-medium ${periodStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Profit: {formatPrice(periodStats.totalProfit)}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-xl bg-blue-50">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Week Card */}
          <div 
            className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${currentPeriod === 'week' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
            onClick={() => setCurrentPeriod('week')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">This Week</p>
                <p className="text-xl font-bold text-gray-900">
                  {currentPeriod === 'week' ? formatPrice(periodStats.totalSales) : 'Click to view'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {currentPeriod === 'week' ? `${periodStats.totalQuantity} units sold` : 'Weekly performance'}
                </p>
                {currentPeriod === 'week' && (
                  <p className={`text-xs mt-1 font-medium ${periodStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Profit: {formatPrice(periodStats.totalProfit)}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-xl bg-emerald-50">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Month Card */}
          <div 
            className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${currentPeriod === 'month' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
            onClick={() => setCurrentPeriod('month')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">This Month</p>
                <p className="text-xl font-bold text-gray-900">
                  {currentPeriod === 'month' ? formatPrice(periodStats.totalSales) : 'Click to view'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {currentPeriod === 'month' ? `${periodStats.totalQuantity} units sold` : 'Monthly performance'}
                </p>
                {currentPeriod === 'month' && (
                  <p className={`text-xs mt-1 font-medium ${periodStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Profit: {formatPrice(periodStats.totalProfit)}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-xl bg-purple-50">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Sales Report - {getPeriodLabel()}
            </h2>
            <span className="text-sm text-gray-500">
              {filteredSalesData.length} transactions
            </span>
          </div>
          
          {filteredSalesData.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Sales Data</h3>
              <p className="text-gray-600">No sales transactions found for {getPeriodLabel().toLowerCase()}.</p>
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