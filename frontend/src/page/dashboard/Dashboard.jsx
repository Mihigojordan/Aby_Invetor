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
  BarChart2,
  Clock,
  PackageX,
  ShoppingCart,
  RotateCcw
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
import backOrderService from '../../services/backOrderService';
import { useNetworkStatusContext } from '../../context/useNetworkContext';
import { db } from '../../db/database';

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

  const {isOnline} = useNetworkStatusContext()
  const [notification, setNotification] = useState(null);
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

    const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
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

  const fetchStockOuts = async () => {
  try {
    if (isOnline) {
      const response = await stockOutService.getAllStockOuts();
      for (const so of response) {
        // Save stockout
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

        // Optional: make sure stockin exists in db
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

    // 3. Merge local + remote (offline support)
    const [allStockout, offlineAdds, offlineUpdates, offlineDeletes,stockIns] = await Promise.all([
      db.stockouts_all.toArray(),
      db.stockouts_offline_add.toArray(),
      db.stockouts_offline_update.toArray(),
      db.stockouts_offline_delete.toArray(),
      fetchStockIns()
    ]);

    const deleteIds = new Set(offlineDeletes.map(d => d.id));
    const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));

    const combinedStockout = allStockout
      .filter(c => !deleteIds.has(c.id))
      .map(c => ({
        ...c,
        ...updateMap.get(c.id),
        synced: true,
        stockin: stockIns.find(s => s.id == c.stockinId )
      }))
      .concat(offlineAdds.map(a => ({
         ...a, 
         synced: false,
          stockin: stockIns.find(s => s.id == a.stockinId )
         })))
      .sort((a, b) => a.synced - b.synced);

    console.warn('📦 COMBINED STOCK OUT:', combinedStockout);

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
        // Assuming a productService.getAllProducts() exists, similar to categories
        const response = await productService.getAllProducts(); // Adjust if needed
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
          db.products_offline_delete.toArray(),
          
        ]);

        const deleteIds = new Set(offlineDeletes.map(d => d.id));
        const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));

        const combinedProducts = allProducts
          .filter(c => !deleteIds.has(c.id))
          .map(c => ({
            ...c,
            ...updateMap.get(c.id),
            synced: true,
            
          }))
          .concat(offlineAdds.map(a => ({ 
            ...a, 
            synced: false,
            
          })))
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
        }))).sort((a, b) => a.synced - b.synced);

      
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
        // Assuming you have a backorderService similar to productService
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
        // 3. Merge all data (works offline too)


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
  const fetchCategories = async () => {
    try {
      if (isOnline) {
        // 1. Fetch from API
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

        // 2. Sync any offline adds/updates/deletes
        // await triggerSync();
      }

      // 3. Always read from IndexedDB (so offline works too)
      const allCategories = await db.categories_all.toArray();

      console.log('log categories : +>', allCategories);

      // setCategories(allCategories);
      return allCategories
    } catch (error) {
      if (!error.response) {
        const allCategories = await db.categories_all.toArray();
        return allCategories
      }
      console.error("Error fetching categories:", error);
    }
  };

   const fetchSalesReturnData = async () => {
     setLoading(true);
     try {
      
 
       // Load all offline data
       const [
         allSalesReturns,
         offlineAdds,
         offlineUpdates,
         offlineDeletes,
         allReturnItems,
         offlineItemAdds,
         stockOutsData
       ] = await Promise.all([
         db.sales_returns_all.toArray(),
         db.sales_returns_offline_add.toArray(),
         db.sales_returns_offline_update.toArray(),
         db.sales_returns_offline_delete.toArray(),
         db.sales_return_items_all.toArray(),
         db.sales_return_items_offline_add.toArray(),
         fetchStockOuts()
       ]);
 
       // Create maps for efficient lookups
       const deleteIds = new Set(offlineDeletes.map(d => d.id));
       const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));
       const stockOutMap = new Map(stockOutsData.map(s => [s.id || s.localId, s]));
 
       // Combine all return items
       const combinedReturnItems = allReturnItems
         .concat(offlineItemAdds.map(a => ({ ...a, synced: false })))
         .reduce((acc, item) => {
           const key = item.salesReturnId || item.salesReturnLocalId;
           if (!acc[key]) acc[key] = [];
           acc[key].push({
             ...item,
             stockout: stockOutMap.get(item.stockoutId)
           });
           return acc;
         }, {});
 
       // Process synced sales returns
       const syncedReturns = allSalesReturns
         .filter(sr => !deleteIds.has(sr.id))
         .map(sr => ({
           ...sr,
           ...updateMap.get(sr.id),
           synced: true,
           items: combinedReturnItems[sr.id] || []
         }));
 
       // Process offline sales returns
       const offlineReturns = offlineAdds.map(sr => ({
         ...sr,
         synced: false,
         items: combinedReturnItems[sr.localId] || []
       }));
 
       const combinedSalesReturns = [...syncedReturns, ...offlineReturns]
         .sort((a, b) => new Date(b.createdAt || b.lastModified) - new Date(a.createdAt || a.lastModified));
 
    return combinedSalesReturns
     } catch (error) {
       console.error('Error loading sales returns:', error);
       showNotification('Failed to load sales returns', 'error');
     } finally {
       setLoading(false);
     }
   }; 


  const getSummaryFrontend = async () => {
  try {
    // 1. Fetch all required data from IndexedDB (using your fetchers)
    const [categories, products, stockIns, stockOuts] = await Promise.all([
      fetchCategories(),
      fetchProducts(),
      fetchStockIns(),
      fetchStockOuts(),
    ]);

    // 2. Totals
    const totalCategories = categories.length;
    const totalProducts = products.length;
    const totalEmployees = 0; // You’ll need fetchEmployees() if you track employees in IndexedDB

    // 3. Most used category (by number of products)
    const categoryCountMap = products.reduce((acc, p) => {
      acc[p.categoryId] = (acc[p.categoryId] || 0) + 1;
      return acc;
    }, {});
    const mostUsedCategoryId = Object.keys(categoryCountMap).sort(
      (a, b) => categoryCountMap[b] - categoryCountMap[a]
    )[0];
    const mostUsedCategory = mostUsedCategoryId
      ? {
          name:
            categories.find((c) => c.id === mostUsedCategoryId)?.name ||
            "Unknown Category",
          usageCount: categoryCountMap[mostUsedCategoryId],
        }
      : null;

    // 4. Total stockIn quantity
    const totalStockIn = stockIns.reduce(
      (sum, si) => sum + (si.quantity || 0),
      0
    );

    // 5. Total stockOut quantity
    const totalStockOut = stockOuts.reduce(
      (sum, so) => sum + (so.quantity || 0),
      0
    );

    // 6. Product with most stockIn quantity
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
          name:
            products.find((p) => p.id === mostStockedInProductId)
              ?.productName || "Unknown Product",
        }
      : null;

    // 7. Calculate stock levels (stockIn - stockOut)
    const stockOutByStockIn = stockOuts.reduce((acc, so) => {
      acc[so.stockinId] = (acc[so.stockinId] || 0) + (so.quantity || 0);
      return acc;
    }, {});

    const stockLevels = products.map((product) => {
      // total stockIn for this product
      const productStockIns = stockIns.filter(
        (si) => si.productId === product.id
      );
      const totalIn = productStockIns.reduce(
        (sum, si) => sum + (si.quantity || 0),
        0
      );

      // total stockOut linked to this product's stockIns
      const totalOut = productStockIns.reduce((sum, si) => {
        return sum + (stockOutByStockIn[si.id] || 0);
      }, 0);

      return {
        productId: product.id,
        productName: product.productName,
        stock: totalIn - totalOut,
      };
    });

    // 8. Low stock (lowest 5) and high stock (highest 5)
    const sortedStock = [...stockLevels].sort((a, b) => a.stock - b.stock);
    const lowStock = sortedStock.slice(0, 5);
    const highStock = sortedStock.slice(-5).reverse();

    // ✅ Return same shape as backend
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


  const loadDashboardData = async () => {
    setLoading(true);
    try {
      setError(null);
      console.log('🚀 Starting dashboard data load...');

      // First try to get summary
      let summary ;
      if(isOnline){
        summary = await fetchSummaryCounts()
      }else{
        summary = await getSummaryFrontend()
      }

      // Then load all other data with error handling for each service
      let results ;

      if(isOnline){
        results  = await Promise.allSettled([
        employeeService.getAllEmployees(),
        productService.getAllProducts(),
        stockinService.getAllStockIns(),
        stockOutService.getAllStockOuts(),
        categoryService.getAllCategories(),
        salesReturnService.getAllSalesReturns(),
        backOrderService.getAllBackOrders()
      ]);
      }
else{
  results = await Promise.allSettled([
 employeeService.getAllEmployees(),
 fetchProducts(),
 fetchStockIns(),
 fetchStockOuts(),
 fetchCategories(),
fetchSalesReturnData(),
 fetchBackorders(),
])
}
      // Process results and handle any failed requests
      const [
        employeesResult,
        productsResult,
        stockInsResult,
        stockOutsResult,
        categoriesResult,
        salesReturnsResult,
       backOrderResult,
      ] = results;

      const data = {
        employees: employeesResult.status === 'fulfilled' ? employeesResult.value : [],
        products: productsResult.status === 'fulfilled' ? productsResult.value : [],
        stockIns: stockInsResult.status === 'fulfilled' ? stockInsResult.value : [],
        stockOuts: stockOutsResult.status === 'fulfilled' ? stockOutsResult.value : [],
        categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value : [],
        salesReturns: salesReturnsResult.status === 'fulfilled' ? 
          (salesReturnsResult.value?.data || salesReturnsResult.value) : [],
        backOrders: backOrderResult.status === 'fulfilled' ? 
          (backOrderResult.value?.data || backOrderResult.value) : [],
        summary
      };

      // Debug each data type
      Object.entries(data).forEach(([key, value]) => {
        debugData(value, `${key} data`);
      });

      setDashboardData(data);

      if (summary) {
        calculateStats(summary,data);
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

    const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF'
    }).format(price);
  };

const calculateStats = (summary, data) => {
  console.log('📊 Calculating stats from summary:', summary);

  const backOrders = Array.isArray(data.backOrders) ? data.backOrders : [];
  const stockOuts = Array.isArray(data.stockOuts) ? data.stockOuts : [];

  const totalBackOrders = stockOuts
    .filter((b) => b.backorderId != null)
    .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const totalSoldPriceBackOrders = stockOuts
    .filter((b) => b.backorderId != null)
    .reduce((sum, item) => sum + (Number(item.soldPrice) || 0), 0);

  // ✅ Sales Return Stats
  const salesReturnStats = calculateSalesReturnStats(data.salesReturns);

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
      title: 'Non-Stock Quantity Sold',
      value: totalBackOrders.toString(),
      icon: ShoppingCart , 
      change:  `Sales : ${formatPrice(totalSoldPriceBackOrders?.toString())}  `,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
,
    {
      title: "Sales Returns",
      value: (salesReturnStats.totalReturns || 0).toString(),
      icon: RotateCcw, // e.g. from lucide-react
      change: `${salesReturnStats.totalReturnedItems} items returned`,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Refunded Amount",
      value: formatPrice(salesReturnStats.totalRefundAmount || 0),
      icon: DollarSign,
      change: `Top returned: ${
        salesReturnStats.mostReturnedProduct?.name || "N/A"
      } (${salesReturnStats.mostReturnedProduct?.returnedQty || 0})`,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
  ];

  console.log("📊 Stats calculated:", newStats);
  setStats(newStats);
};
const calculateSalesReturnStats = (salesReturns = []) => {
  let totalReturns = salesReturns.length;
  let totalReturnedItems = 0;
  let totalRefundAmount = 0;

  // count by product
  const productReturnCount = {};

  salesReturns.forEach((sr) => {
    sr.items.forEach((item) => {
      console.warn('item :',item);
      
      const qty = item.quantity || 0;
      const stockout = item.stockout;

      totalReturnedItems += qty;

      if (stockout?.soldPrice) {
        totalRefundAmount += qty * stockout.soldPrice;
      }

      const product = stockout?.stockin?.product;
      console.warn(product);
      
      if (product) {
        productReturnCount[product.id] =
          (productReturnCount[product.id] || 0) + qty;
      }
    });
  });

  // most returned product
  const mostReturnedProductId = Object.keys(productReturnCount).sort(
    (a, b) => productReturnCount[b] - productReturnCount[a]
  )[0];

  console.warn('product id :',mostReturnedProductId);
  

  const mostReturnedProduct = mostReturnedProductId
    ? {
        id: mostReturnedProductId,
        name:
          salesReturns
            .flatMap((sr) =>{
console.warn('sale:',sr);

             return sr.items.map((it) => it.stockout?.stockin?.product)
            }
            )
            .find((p) => p?.id === mostReturnedProductId)?.productName ||
          "Unknown Product",
        returnedQty: productReturnCount[mostReturnedProductId],
      }
    : null;

  return {
    totalReturns,
    totalReturnedItems,
    totalRefundAmount,
    mostReturnedProduct,
  };
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

    const backOrders = Array.isArray(data.backOrders) ? data.backOrders : [];
    
    
    
  const totalProducts = products.length;
  const totalEmployees = employees.length;
  const totalCategories = categories.length;
  const totalStockIn = stockIns.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalStockOut = stockOuts.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalBackOrders = backOrders.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
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
    totalBackOrders,
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
    },
    {
      title: 'Non-Stock Sale',
      value: totalBackOrders.toString(),
      icon: Clock, // ⏰ or use another icon from lucide-react
      change: `${totalBackOrders} pending`,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
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
            console.log('hiroshima',item);
            //

            const itemDate = new Date(item.createdAt || item.lastModified);
            
            return itemDate.toDateString() === date.toDateString();
          })
          .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

          console.warn('kanye',stockInThisDay);
          
        
        const stockOutThisDay = data.stockOuts
          .filter(item => {
           
            const itemDate = new Date(item.createdAt || item.lastModified);
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
           
            const itemDate = new Date(item.createdAt ?? item.lastModified);
            return itemDate.getMonth() === date.getMonth() && 
                   itemDate.getFullYear() === date.getFullYear();
          })
          .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        
        const stockOutThisMonth = data.stockOuts
          .filter(item => {
           
            const itemDate = new Date(item.createdAt || item.lastModified);
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
           
            const itemDate = new Date(item.createdAt || item.lastModified);
            return itemDate.getMonth() === date.getMonth() && 
                   itemDate.getFullYear() === date.getFullYear();
          })
          .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        
        const stockOutThisMonth = data.stockOuts
          .filter(item => {
           
            const itemDate = new Date(item.createdAt || item.lastModified);
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
          {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' : notification.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'} animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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