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
  Box,
  Check
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import productService from "../../services/productService";
import salesReturnService from "../../services/salesReturnService";
import stockOutService from "../../services/stockoutService";
import stockinService from "../../services/stockinService";
import categoryService from "../../services/categoryService";
import backOrderService from "../../services/backOrderService"; // Assuming this exists
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import { useNetworkStatusContext } from '../../context/useNetworkContext';
import { db } from '../../db/database';

const Dashboard = () => {
  const { user } = useEmployeeAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { isOnline } = useNetworkStatusContext();
  const [notification, setNotification] = useState(null);

  // Data states
  const [dashboardData, setDashboardData] = useState({
    products: [],
    stockIns: [],
    stockOuts: [],
    categories: [],
    salesReturns: [],
    backOrders: [],
    summary: null
  });
  const [stats, setStats] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [stockInChartData, setStockInChartData] = useState([]);
  const [stockOutChartData, setStockOutChartData] = useState([]);

  // Permission checks based on user tasks
  const userTasks = user?.tasks || [];
  const canViewSales = userTasks.some(task => task.taskname?.toLowerCase().includes('selling') || task.taskname?.toLowerCase().includes('sales') || task.taskname?.toLowerCase().includes('saling') || task.taskname?.toLowerCase().includes('stockout'));
  const canViewReturns = userTasks.some(task => task.taskname?.toLowerCase().includes('returning') || task.taskname?.toLowerCase().includes('return'));
  const canViewReceiving = userTasks.some(task => task.taskname?.toLowerCase().includes('receiving') || task.taskname?.toLowerCase().includes('stockin'));
  const canViewProducts = canViewReturns || canViewReceiving;
  const canViewCategories = canViewReturns || canViewReceiving;
  const hasAnyPermissions = canViewSales || canViewReturns || canViewReceiving;

  // Responsive helper function to determine grid columns based on visible stats
  const getStatsGridCols = () => {
    const visibleStatsCount = stats.length;
    if (visibleStatsCount === 1) return 'grid-cols-1';
    if (visibleStatsCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (visibleStatsCount === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    if (visibleStatsCount === 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    if (visibleStatsCount === 5) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  // Get available tabs based on permissions
  const getAvailableTabs = () => {
    const tabs = ['overview'];
    if (canViewReceiving) tabs.push('inventory');
    if (canViewSales) tabs.push('sales');
    if (canViewSales || canViewReturns || canViewCategories) tabs.push('analytics');
    return tabs;
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
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

  const fetchStockOuts = async () => {
    try {
      if (isOnline) {
        const response = await stockOutService.getAllStockOuts();
        for (const so of response) {
          await db.stockouts_all.put({
            id: so.id,
            stockinId: so.stockinId,
            quantity: so.quantity,
            soldPrice: so.soldPrice,
            backorderId: so.backorderId,
            clientName: so.clientName,
            clientEmail: so.clientEmail,
            clientPhone: so.clientPhone,
            paymentMethod: so.paymentMethod,
            adminId: so.adminId,
            employeeId: so.employeeId,
            transactionId: so.transactionId,
            lastModified: new Date(),
            createdAt: so.createdAt || new Date(),
            updatedAt: so.updatedAt || new Date()
          });

          if (so.stockin && !(await db.stockins_all.get(so.stockin.id))) {
            await db.stockins_all.put({
              id: so.stockin.id,
              productId: so.stockin.productId,
              quantity: so.stockin.quantity,
              price: so.stockin.price,
              sellingPrice: so.stockin.sellingPrice,
              supplier: so.stockin.supplier,
              sku: so.stockin.sku,
              barcodeUrl: so.stockin.barcodeUrl,
              lastModified: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }

      const [allStockout, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
        db.stockouts_all.toArray(),
        db.stockouts_offline_add.toArray(),
        db.stockouts_offline_update.toArray(),
        db.stockouts_offline_delete.toArray()
      ]);

      const deleteIds = new Set(offlineDeletes.map(d => d.id));
      const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));

      const combinedStockout = allStockout
        .filter(c => !deleteIds.has(c.id))
        .map(c => ({
          ...c,
          ...updateMap.get(c.id),
          synced: true
        }))
        .concat(offlineAdds.map(a => ({ ...a, synced: false })))
        .sort((a, b) => a.synced - b.synced);

      return combinedStockout;
    } catch (error) {
      console.error('Error fetching stock-outs:', error);
      if (!error.response) {
        return await db.stockouts_all.toArray();
      }
    }
  };

  const fetchProducts = async () => {
    try {
      if (isOnline) {
        const response = await productService.getAllProducts();
        for (const p of response.products || response) {
          await db.products_all.put({
            id: p.id,
            productName: p.productName,
            categoryId: p.categoryId,
            description: p.description,
            brand: p.brand,
            lastModified: p.createdAt || new Date(),
            updatedAt: p.updatedAt || new Date()
          });
        }
      }

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

  const fetchStockIns = async () => {
    setLoading(true);
    try {
      const productData = await fetchProducts();
      const [allStockIns, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
        db.stockins_all.toArray(),
        db.stockins_offline_add.toArray(),
        db.stockins_offline_update.toArray(),
        db.stockins_offline_delete.toArray()
      ]);

      const deleteIds = new Set(offlineDeletes.map(d => d.id));
      const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));

      const combinedStockIns = allStockIns
        .filter(s => !deleteIds.has(s.id))
        .map(s => ({
          ...s,
          ...updateMap.get(s.id),
          synced: true,
          product: productData.find(p => p.id === s.productId) || { productName: 'Unknown Product' }
        }))
        .concat(offlineAdds.map(a => ({
          ...a,
          synced: false,
          product: productData.find(p => p.id === a.productId || p.localId === a.productId) || { productName: 'Unknown Product' }
        })))
        .sort((a, b) => a.synced - b.synced);

      return combinedStockIns;
    } catch (error) {
      console.error('Error loading stock-ins:', error);
      showNotification('Failed to load stock-ins', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackorders = async () => {
    try {
      if (isOnline) {
        const response = await backOrderService.getAllBackOrders();
        for (const b of response.backorders || response) {
          await db.backorders_all.put({
            id: b.id,
            quantity: b.quantity,
            soldPrice: b.soldPrice,
            productName: b.productName,
            adminId: b.adminId,
            employeeId: b.employeeId,
            lastModified: b.lastModified || new Date(),
            createdAt: b.createdAt || new Date(),
            updatedAt: b.updatedAt || new Date()
          });
        }
      }

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
      }
    }
  };

  const fetchCategories = async () => {
    try {
      if (isOnline) {
        const response = await categoryService.getAllCategories();
        if (response && response.categories) {
          for (const category of response.categories) {
            await db.categories_all.put({
              id: category.id,
              name: category.name,
              description: category.description,
              lastModified: category.lastModified || new Date(),
              updatedAt: category.updatedAt || new Date()
            });
          }
        }
      }

      const allCategories = await db.categories_all.toArray();
      return allCategories;
    } catch (error) {
      if (!error.response) {
        const allCategories = await db.categories_all.toArray();
        return allCategories;
      }
      console.error("Error fetching categories:", error);
    }
  };

  const getSummaryFrontend = async () => {
    try {
      const [categories, products, stockIns, stockOuts] = await Promise.all([
        fetchCategories(),
        fetchProducts(),
        fetchStockIns(),
        fetchStockOuts(),
      ]);

      const totalCategories = categories.length;
      const totalProducts = products.length;
      const totalEmployees = 0;

      const categoryCountMap = products.reduce((acc, p) => {
        acc[p.categoryId] = (acc[p.categoryId] || 0) + 1;
        return acc;
      }, {});
      const mostUsedCategoryId = Object.keys(categoryCountMap).sort(
        (a, b) => categoryCountMap[b] - categoryCountMap[a]
      )[0];
      const mostUsedCategory = mostUsedCategoryId
        ? {
            name: categories.find((c) => c.id === mostUsedCategoryId)?.name || "Unknown Category",
            usageCount: categoryCountMap[mostUsedCategoryId],
          }
        : null;

      const totalStockIn = stockIns.reduce((sum, si) => sum + (si.quantity || 0), 0);
      const totalStockOut = stockOuts.reduce((sum, so) => sum + (so.quantity || 0), 0);

      const stockInByProduct = stockIns.reduce((acc, si) => {
        acc[si.productId] = (acc[si.productId] || 0) + (si.quantity || 0);
        return acc;
      }, {});
      const mostStockedInProductId = Object.keys(stockInByProduct).sort(
        (a, b) => stockInByProduct[b] - stockInByProduct[a]
      )[0];
      const mostStockedInProduct = mostStockedInProductId
        ? {
            id: parseInt(mostStockedInProductId),
            name: products.find((p) => p.id === mostStockedInProductId)?.productName || "Unknown Product",
          }
        : null;

      const stockOutByStockIn = stockOuts.reduce((acc, so) => {
        acc[so.stockinId] = (acc[so.stockinId] || 0) + (so.quantity || 0);
        return acc;
      }, {});

      const stockLevels = products.map((product) => {
        const productStockIns = stockIns.filter((si) => si.productId === product.id);
        const totalIn = productStockIns.reduce((sum, si) => sum + (si.quantity || 0), 0);
        const totalOut = productStockIns.reduce((sum, si) => sum + (stockOutByStockIn[si.id] || 0), 0);

        return {
          productId: product.id,
          productName: product.productName,
          stock: totalIn - totalOut,
        };
      });

      const sortedStock = [...stockLevels].sort((a, b) => a.stock - b.stock);
      const lowStock = sortedStock.slice(0, 5);
      const highStock = sortedStock.slice(-5).reverse();

      return {
        totalCategories,
        totalProducts,
        totalEmployees,
        totalStockIn,
        totalStockOut,
        mostUsedCategory,
        mostStockedInProduct,
        lowStock,
        highStock,
      };
    } catch (error) {
      console.error("Error building summary frontend:", error);
      return null;
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF'
    }).format(price);
  };

  const prepareChartData = (data) => {
    if (canViewReceiving) {
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
        .slice(-6);
      setStockInChartData(stockInChart);
    }
    if (canViewSales) {
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
        .slice(-6);
      setStockOutChartData(stockOutChart);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      if (!hasAnyPermissions) {
        setLoading(false);
        return;
      }

      let summary;
      if (isOnline) {
        summary = await fetchSummaryCounts();
      } else {
        summary = await getSummaryFrontend();
      }

      const data = {
        products: [],
        stockIns: [],
        stockOuts: [],
        categories: [],
        salesReturns: [],
        backOrders: [],
        summary
      };

      const promises = [];
      if (isOnline) {
        if (canViewProducts) {
          promises.push(productService.getAllProducts().then(result => data.products = result));
        }
        if (canViewReceiving) {
          promises.push(stockinService.getAllStockIns().then(result => data.stockIns = result));
        }
        if (canViewSales) {
          promises.push(stockOutService.getAllStockOuts().then(result => data.stockOuts = result));
          promises.push(fetchBackorders().then(result => data.backOrders = result));
        }
        if (canViewCategories) {
          promises.push(categoryService.getAllCategories().then(result => data.categories = result));
        }
        if (canViewReturns) {
          promises.push(salesReturnService.getAllSalesReturns().then(result => data.salesReturns = result.data || result));
        }
      } else {
        if (canViewProducts) {
          promises.push(fetchProducts().then(result => data.products = result));
        }
        if (canViewReceiving) {
          promises.push(fetchStockIns().then(result => data.stockIns = result));
        }
        if (canViewSales) {
          promises.push(fetchStockOuts().then(result => data.stockOuts = result));
          promises.push(fetchBackorders().then(result => data.backOrders = result));
        }
        if (canViewCategories) {
          promises.push(fetchCategories().then(result => data.categories = result));
        }
        if (canViewReturns) {
          promises.push(salesReturnService.getAllSalesReturns().then(result => data.salesReturns = result.data || result));
        }
      }

      await Promise.all(promises);
      setDashboardData(data);

      if (summary) {
        calculateStats(summary, data);
      } else {
        calculateStatsFromData(data);
      }

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

  const calculateStats = (summary, data) => {
    const newStats = [];
    const backOrders = Array.isArray(data.backOrders) ? data.backOrders : [];
    const totalBackOrders = backOrders.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalSoldPriceBackOrders = backOrders.reduce((sum, item) => sum + (Number(item.soldPrice) || 0), 0);

    if (canViewProducts) {
      newStats.push({
        title: 'Total Products',
        value: summary.totalProducts?.toString() || '0',
        icon: Package,
        change: `${summary.totalStockIn || 0} total stock in`,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
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
      });
      newStats.push({
        title: 'Non-Stock Sale',
        value: totalBackOrders.toString() || '0',
        icon: ShoppingCart,
        change: `Sales: ${formatPrice(totalSoldPriceBackOrders?.toString())}`,
        color: 'text-red-600',
        bgColor: 'bg-red-50'
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
      });
    }
    setStats(newStats);
  };

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
        createdAt: stockIn.createdAt || stockIn.lastModified,
        profit: ((stockIn.sellingPrice || 0) - (stockIn.price || 0)) * (stockIn.quantity || 0)
      };
    });
    setInventoryData(inventory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  };

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
        date: stockOut.createdAt || stockOut.lastModified,
        status: 'Completed'
      };
    });
    setSalesData(sales.sort((a, b) => new Date(b.date) - new Date(a.date)));
  };

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
          lastRestocked: stockIn.createdAt || stockIn.lastModified
        };
      })
      .sort((a, b) => a.currentStock - b.currentStock);
    setLowStockItems(lowStock);
  };

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

  const handleRefresh = async () => {
    window.location.reload();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-xs">
          <p className="font-semibold text-gray-900 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              ></div>
              <span className="text-xs text-gray-600">{entry.name}:</span>
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-sm">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold text-gray-900">Loading Dashboard</h3>
            <p className="text-gray-600 text-xs">Preparing your inventory insights...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAnyPermissions) {
    return (
      <div className="max-h-[90vh] overflow-y-auto bg-gray-50 text-sm">
        <div className="bg-white border-b border-gray-200">
          <div className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Inventory Dashboard</h1>
                <p className="text-gray-600 mt-1 text-xs">Welcome, {user?.firstname} {user?.lastname}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-80 p-3">
          <div className="text-center max-w-md mx-auto">
            <div className="mb-4">
              <UserX className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-3" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-gray-700 mb-3">Access Restricted</h2>
            <p className="text-gray-500 mb-4 leading-relaxed text-xs">
              You don't have any assigned tasks that grant access to dashboard features.
              Please contact your administrator to get the appropriate permissions.
            </p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Permissions</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const availableTabs = getAvailableTabs();

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-gray-50 text-sm">
      {notification && (
        <div className={`fixed top-3 right-3 z-50 flex items-center gap-1 px-3 py-2 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' : notification.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'} animate-in slide-in-from-top-2 duration-300 text-xs`}>
          {notification.type === 'success' ? <Check size={12} /> : <AlertTriangle size={12} />}
          {notification.message}
        </div>
      )}
      <div className="bg-white border-b border-gray-200">
        <div className="p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Umusingi Hardware Inventory Dashboard</h1>
              <p className="text-gray-600 mt-1 text-xs">Welcome, {user?.firstname} {user?.lastname} - Role-based inventory access</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Eye className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Access: {[
                  canViewSales && 'Sales',
                  canViewReturns && 'Returns',
                  canViewReceiving && 'Receiving'
                ].filter(Boolean).join(', ')}</span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 hover:scale-105 text-xs"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg min-w-fit">
              {availableTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all duration-200 whitespace-nowrap ${
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

      <main className="p-3 sm:p-4">
        {stats.length > 0 && (
          <div className={`grid ${getStatsGridCols()} gap-3 sm:gap-4 mb-4 sm:mb-6`}>
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-3 sm:p-4 border border-gray-200 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-gray-600 truncate">{stat.title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        stat.trend?.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {stat.trend}
                      </span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-xs text-gray-500 truncate">{stat.change}</p>
                  </div>
                  <div className={`p-1.5 sm:p-2 rounded-lg ${stat.bgColor} ml-2 sm:ml-3 flex-shrink-0`}>
                    <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(canViewReceiving || canViewSales) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {canViewReceiving && stockInChartData.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center">
                    <ArrowDownRight className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 text-blue-600" />
                    Stock In Trends (Last 6 Months)
                  </h3>
                  <div className="text-xs text-gray-500">
                    Total: {stockInChartData.reduce((sum, item) => sum + item.stockIn, 0)} units
                  </div>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockInChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10 }}
                        stroke="#6b7280"
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
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
            {canViewSales && stockOutChartData.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center">
                    <ArrowUpRight className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 text-green-600" />
                    Stock Out Trends (Last 6 Months)
                  </h3>
                  <div className="text-xs text-gray-500">
                    Total: {stockOutChartData.reduce((sum, item) => sum + item.stockOut, 0)} units
                  </div>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockOutChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10 }}
                        stroke="#6b7280"
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
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

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {(canViewCategories || canViewProducts) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center">
                  <Award className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 text-blue-600" />
                  Key Performance Indicators
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {canViewCategories && (
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-blue-600">Most Used Category</p>
                          <p className="text-base sm:text-lg font-bold text-blue-900 truncate">
                            {dashboardData.summary?.mostUsedCategory?.name || 'N/A'}
                          </p>
                        </div>
                        <Star className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600 flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  )}
                  {canViewProducts && (
                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-green-600">Top Product</p>
                          <p className="text-base sm:text-lg font-bold text-green-900 truncate">
                            {dashboardData.summary?.mostStockedInProduct?.name || 'N/A'}
                          </p>
                        </div>
                        <TrendingUp className="w-5 sm:w-6 h-5 sm:h-6 text-green-600 flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {canViewReceiving && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 sm:p-4 border-b border-gray-200">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center">
                    <AlertTriangle className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 text-amber-600" />
                    Stock Alerts ({lowStockItems.length})
                  </h3>
                </div>
                <div className="p-3">
                  {lowStockItems.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {lowStockItems.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 text-xs truncate">{item.productName}</p>
                            <p className="text-xs text-gray-500">{item.category}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="text-sm font-bold text-amber-600">{item.currentStock}</p>
                            <p className="text-xs text-gray-500">units left</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-xs">All items are well stocked!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && canViewReceiving && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center">
                  <Package className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 text-blue-600" />
                  Inventory Overview ({inventoryData.length} items)
                </h3>
                <div className="flex items-center space-x-1.5">
                  <Search className="w-3 h-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search inventory..."
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventoryData.slice(0, 10).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <div className="text-xs font-medium text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.sku}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {item.category}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs font-medium text-gray-900">{item.stock}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
                        {formatCurrency(item.price * item.stock)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-1.5 inline-flex text-xs leading-4 font-semibold rounded-full ${item.statusColor}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {item.supplier}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sales' && canViewSales && (
          <div className="space-y-4">
            {canViewProducts && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center">
                  <Award className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 text-green-600" />
                  Top Performing Products
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  {topPerformers.map((product, index) => (
                    <div key={product.id} className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-green-600">#{index + 1}</span>
                        <Target className="w-3 h-3 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 text-xs mb-1">{product.name}</h4>
                      <p className="text-xs text-gray-600 mb-2">{product.totalSold} units sold</p>
                      <p className="text-base font-bold text-green-600">{formatCurrency(product.totalRevenue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-3 sm:p-4 border-b border-gray-200">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center">
                  <ShoppingCart className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 text-blue-600" />
                  Recent Sales ({salesData.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salesData.slice(0, 10).map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-xs font-medium text-gray-900">{sale.client}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                          {sale.quantity} units
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                          {formatCurrency(sale.unitPrice)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
                          {formatCurrency(sale.revenue)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                          {formatDate(sale.date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-1.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-green-100 text-green-800">
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

        {activeTab === 'analytics' && (canViewSales || canViewReturns || canViewCategories) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {canViewCategories && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 sm:p-4 border-b border-gray-200">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center">
                    <BarChart2 className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 text-purple-600" />
                    Category Performance
                  </h3>
                </div>
                <div className="p-3">
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {categoryData.map((category) => (
                      <div key={category.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 text-xs">{category.name}</h4>
                          <span className="text-xs text-gray-500">{category.productCount} products</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          {canViewReceiving && (
                            <div>
                              <p className="text-xs text-gray-500">Stock</p>
                              <p className="text-base font-bold text-blue-600">{category.totalStock}</p>
                            </div>
                          )}
                          {canViewSales && (
                            <div>
                              <p className="text-xs text-gray-500">Sales</p>
                              <p className="text-base font-bold text-green-600">{formatCurrency(category.totalSales)}</p>
                            </div>
                          )}
                          {canViewReceiving && (
                            <div>
                              <p className="text-xs text-gray-500">Avg Price</p>
                              <p className="text-base font-bold text-purple-600">{formatCurrency(category.avgPrice)}</p>
                            </div>
                          )}
                        </div>
                        {canViewSales && categoryData.length > 0 && (
                          <div className="mt-2">
                            <div className="bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-3 sm:p-4 border-b border-gray-200">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center">
                  <DollarSign className="w-3 sm:w-4 h-3 sm:h-4 mr-1.5 text-green-600" />
                  Financial Summary
                </h3>
              </div>
              <div className="p-3 sm:p-4">
                <div className="space-y-4">
                  {canViewSales && (
                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-green-600">Total Revenue</p>
                          <p className="text-lg font-bold text-green-900">
                            {formatCurrency(salesData.reduce((sum, sale) => sum + sale.revenue, 0))}
                          </p>
                        </div>
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  )}
                  {canViewReceiving && (
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-blue-600">Inventory Value</p>
                          <p className="text-lg font-bold text-blue-900">
                            {formatCurrency(inventoryData.reduce((sum, item) => sum + (item.price * item.stock), 0))}
                          </p>
                        </div>
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  )}
                  {canViewSales && (
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-purple-600">Average Order Value</p>
                          <p className="text-lg font-bold text-purple-900">
                            {formatCurrency(salesData.length > 0 ? salesData.reduce((sum, sale) => sum + sale.revenue, 0) / salesData.length : 0)}
                          </p>
                        </div>
                        <Target className="w-6 h-6 text-purple-600" />
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