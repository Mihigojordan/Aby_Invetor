import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  Award,
  Calendar,
  User,
  Hash,
  ShoppingCart,
  Star,
  BarChart3,
  RefreshCw,
  Eye,
  Phone,
  Mail,
  ArrowLeft
} from 'lucide-react';
import stockOutService from '../../../services/stockoutService'; // Adjust path as needed
import { db } from '../../../db/database';
import { useNetworkStatusContext } from '../../../context/useNetworkContext';
import stockInService from '../../../services/stockinService';
import backOrderService from '../../../services/backOrderService';
import productService from '../../../services/productService';

const StockOutAnalyticsPage = () => {

  const [stockOutData, setStockOutData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highestStockOut, setHighestStockOut] = useState(null);
  const [notification, setNotification] = useState(null);
  const [lowestStockOut, setLowestStockOut] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalProducts: 0,
    totalRevenue: 0,
    totalProfit: 0,
    averageProfit: 0
  });
  const { isOnline } = useNetworkStatusContext()



  useEffect(() => {
    if (isOnline) {

      fetchStockOutData();
    }
    else {
      loadStockOuts()
    }
  }, []);

  const fetchStockOutData = async () => {
    try {
      setLoading(true);
      const data = await stockOutService.getAllStockOuts();
      setStockOutData(data);
      analyzeStockOutData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching stock-out data:', err);
      loadStockOuts()
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };
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


      analyzeStockOutData(combinedStockOuts);
      setStockOutData(combinedStockOuts);


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


  const calculateProfit = (stockOut) => {
    const soldPrice = stockOut.soldPrice || 0;
    const costPrice = stockOut.stockin?.price || 0;
    const quantity = stockOut.quantity || 0;
    return (soldPrice - costPrice) * quantity;
  };

  const analyzeStockOutData = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    // Group by product to get comprehensive analytics
    const productAnalytics = {};
    let totalRevenue = 0;
    let totalProfit = 0;

    data.forEach(item => {
      const productId = item.stockin?.product?.id;
      if (!productId) return;

      const productName = item.stockin.product.productName || 'Unknown Product';
      const brand = item.stockin.product.brand || '';
      const quantity = item.quantity || 0;
      const soldPrice = item.soldPrice || 0;
      const costPrice = item.stockin?.price || 0;
      const revenue = soldPrice * quantity;
      const profit = calculateProfit(item);

      totalRevenue += revenue;
      totalProfit += profit;

      if (!productAnalytics[productId]) {
        productAnalytics[productId] = {
          id: productId,
          name: productName,
          brand: brand,
          totalQuantitySold: 0,
          totalRevenue: 0,
          totalProfit: 0,
          totalCost: 0,
          transactionCount: 0,
          averageSellingPrice: 0,
          lastSaleDate: item.createdAt,
          topSale: null,
          clients: new Set()
        };
      }

      const product = productAnalytics[productId];
      product.totalQuantitySold += quantity;
      product.totalRevenue += revenue;
      product.totalProfit += profit;
      product.totalCost += (costPrice * quantity);
      product.transactionCount += 1;

      // Track top sale for this product
      if (!product.topSale || revenue > (product.topSale.soldPrice * product.topSale.quantity)) {
        product.topSale = item;
      }

      // Track unique clients
      if (item.clientName) {
        product.clients.add(item.clientName);
      }

      // Track most recent sale
      if (new Date(item.createdAt) > new Date(product.lastSaleDate)) {
        product.lastSaleDate = item.createdAt;
      }
    });

    // Calculate averages and finalize data
    Object.values(productAnalytics).forEach(product => {
      product.averageSellingPrice = product.totalQuantitySold > 0
        ? product.totalRevenue / product.totalQuantitySold
        : 0;
      product.clientCount = product.clients.size;
      product.profitMargin = product.totalRevenue > 0
        ? (product.totalProfit / product.totalRevenue) * 100
        : 0;
    });

    // Find highest and lowest performing products by total quantity sold
    const productArray = Object.values(productAnalytics);

    if (productArray.length > 0) {
      // Sort by total quantity sold
      const sortedByQuantity = [...productArray].sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);
      setHighestStockOut(sortedByQuantity[0]);
      setLowestStockOut(sortedByQuantity[sortedByQuantity.length - 1]);

      // Set overall analytics
      setAnalytics({
        totalProducts: productArray.length,
        totalRevenue,
        totalProfit,
        averageProfit: productArray.length > 0 ? totalProfit / productArray.length : 0
      });
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF'
    }).format(price || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const ProductCard = ({ product, type, icon: Icon, bgColor, textColor, borderColor }) => (
    <div className={`bg-white rounded-xl shadow-lg border-2 ${borderColor} p-6 hover:shadow-xl transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${bgColor}`}>
            <Icon className={`w-6 h-6 ${textColor}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{type} Performer</h3>
            <p className="text-sm text-gray-500">By total units sold</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
          #{type === 'Highest' ? '1' : product ? analytics.totalProducts : '0'}
        </div>
      </div>

      {product ? (
        <>
          {/* Product Info */}
          <div className="mb-4">
            <h4 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h4>
            {product.brand && (
              <p className="text-sm text-gray-600 mb-2">Brand: {product.brand}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Hash size={14} />
                {product.totalQuantitySold} units sold
              </span>
              <span className="flex items-center gap-1">
                <ShoppingCart size={14} />
                {product.transactionCount} transactions
              </span>
            </div>
          </div>

          {/* Financial Metrics */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
              <p className="text-lg font-bold text-gray-900">{formatPrice(product.totalRevenue)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Total Profit</p>
              <p className={`text-lg font-bold ${product.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPrice(product.totalProfit)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Avg. Selling Price</p>
              <p className="text-lg font-bold text-gray-900">{formatPrice(product.averageSellingPrice)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Profit Margin</p>
              <p className={`text-lg font-bold ${product.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Unique Customers</span>
              <span className="font-medium text-gray-900">
                {product.clientCount > 0 ? product.clientCount : 'Walk-in sales'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Last Sale Date</span>
              <span className="font-medium text-gray-900 flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(product.lastSaleDate)}
              </span>
            </div>
            {product.topSale && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-blue-600 font-medium mb-1">Top Single Sale</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    {product.topSale.quantity} units × {formatPrice(product.topSale.soldPrice)}
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {formatPrice(product.topSale.soldPrice * product.topSale.quantity)}
                  </span>
                </div>
                {product.topSale.clientName && (
                  <p className="text-xs text-gray-500 mt-1">
                    Client: {product.topSale.clientName}
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No data available</p>
        </div>
      )}
    </div>
  );

  const refresh = () => {
    if (isOnline) {

      fetchStockOutData();
    }
    else {
      loadStockOuts()
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">StockOut Analytics</h1>
            <p className="text-gray-600">Loading performance analytics...</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[1, 2].map((index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                  <div>
                    <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-8 bg-gray-200 rounded w-48"></div>
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="bg-gray-100 rounded-lg p-3">
                        <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                      </div>
                    ))}
                  </div>
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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">StockOut Analytics</h1>
            <p className="text-gray-600">Performance insights for your products</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Error Loading Analytics</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={refresh}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={16} />
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
    <div className="h-[90vh] overflow-y-auto  bg-gray-50 p-6">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' : notification.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'} animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}
      <div className=" mx-auto">
        {/* Header */}
        <button className="flex items-center text-gray-600 hover:text-gray-900 mb-4" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Stock Outs
        </button>
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">StockOut Analytics</h1>
              <p className="text-gray-600">Performance insights for your highest and lowest selling products</p>
            </div>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalProducts}</p>
                <p className="text-sm text-gray-500 mt-1">With sales data</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(analytics.totalRevenue)}</p>
                <p className="text-sm text-gray-500 mt-1">All transactions</p>
              </div>
              <div className="p-3 rounded-xl bg-green-50">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Profit</p>
                <p className={`text-2xl font-bold ${analytics.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPrice(analytics.totalProfit)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Net profit/loss</p>
              </div>
              <div className={`p-3 rounded-xl ${analytics.totalProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <TrendingUp className={`w-6 h-6 ${analytics.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Avg Profit</p>
                <p className={`text-2xl font-bold ${analytics.averageProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPrice(analytics.averageProfit)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Per product</p>
              </div>
              <div className={`p-3 rounded-xl ${analytics.averageProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <BarChart3 className={`w-6 h-6 ${analytics.averageProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Performance Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Highest Performer */}
          <ProductCard
            product={highestStockOut}
            type="Highest"
            icon={TrendingUp}
            bgColor="bg-green-50"
            textColor="text-green-600"
            borderColor="border-green-200"
          />

          {/* Lowest Performer */}
          <ProductCard
            product={lowestStockOut}
            type="Lowest"
            icon={TrendingDown}
            bgColor="bg-red-50"
            textColor="text-red-600"
            borderColor="border-red-200"
          />
        </div>

        {/* Data Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Data Summary</h2>
            <span className="text-sm text-gray-500">
              Based on {stockOutData.length} total transactions
            </span>
          </div>

          {stockOutData.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No StockOut Data</h3>
              <p className="text-gray-600">No stock-out transactions have been recorded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{analytics.totalProducts}</div>
                <div className="text-sm text-gray-600">Products Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">{stockOutData.length}</div>
                <div className="text-sm text-gray-600">Total Transactions</div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold mb-2 ${analytics.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {((analytics.totalProfit / analytics.totalRevenue) * 100 || 0).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Overall Profit Margin</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockOutAnalyticsPage;