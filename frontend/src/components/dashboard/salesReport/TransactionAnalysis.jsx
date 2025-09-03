import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Hash, 
  DollarSign, 
  Calendar, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  User,
  Phone,
  CreditCard,
  ShoppingCart,
  TrendingUp,
  Receipt,
  Search,
  Filter,
  Download,
  ArrowLeft
} from 'lucide-react';
import stockOutService from '../../../services/stockoutService';
import { db } from '../../../db/database';
import productService from '../../../services/productService';
import backOrderService from '../../../services/backOrderService';
import stockInService from '../../../services/stockinService';

import { useNavigate } from 'react-router-dom';
import { useNetworkStatusContext } from '../../../context/useNetworkContext';

const TransactionAnalysis = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalRevenue: 0,
    totalItems: 0,
    averageTransactionValue: 0
  });
const  [notification,setNotification]  =useState(null)
const {isOnline} = useNetworkStatusContext()

const navigate = useNavigate();

  useEffect(() => {
    if(isOnline){

        fetchStockOutData();
    }else{
        loadStockOuts()
    }
  }, [isOnline]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, paymentFilter, dateFilter]);

  const fetchStockOutData = async () => {
    try {
      setLoading(true);
      const stockOutData = await stockOutService.getAllStockOuts();
      
      // Group by transaction ID
      const groupedTransactions = groupByTransactionId(stockOutData);
      setTransactions(groupedTransactions);
      
      // Calculate stats
      const calculatedStats = calculateStats(groupedTransactions);
      setStats(calculatedStats);
      
    } catch (err) {
        console.log(err);
        
   await loadStockOuts()
    } finally {
      setLoading(false);
    }
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
  
         // Group by transaction ID
      const groupedTransactions = groupByTransactionId(combinedStockOuts);
      setTransactions(groupedTransactions);
      
      // Calculate stats
      const calculatedStats = calculateStats(groupedTransactions);
      setStats(calculatedStats);
  
     
  
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
  
    const showNotification = (message, type = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 4000);
    };

  const groupByTransactionId = (stockOutData) => {
    const grouped = {};
    
    stockOutData.forEach(item => {
      const transactionId = item.transactionId || `single_${item.id}`;
      
      if (!grouped[transactionId]) {
        grouped[transactionId] = {
          transactionId,
          items: [],
          clientName: item.clientName,
          clientEmail: item.clientEmail,
          clientPhone: item.clientPhone,
          paymentMethod: item.paymentMethod,
          createdAt: item.createdAt,
          totalAmount: 0,
          totalQuantity: 0,
          itemCount: 0
        };
      }
      
      grouped[transactionId].items.push(item);
      grouped[transactionId].totalAmount += item.soldPrice || 0;
      grouped[transactionId].totalQuantity += item.quantity || 0;
      grouped[transactionId].itemCount += 1;
      
      // Use the latest date if multiple items
      if (!grouped[transactionId].createdAt || new Date(item.createdAt) > new Date(grouped[transactionId].createdAt)) {
        grouped[transactionId].createdAt = item.createdAt;
      }
    });
    
    return Object.values(grouped).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const calculateStats = (transactions) => {
    const totalTransactions = transactions.length;
    const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalItems = transactions.reduce((sum, t) => sum + t.totalQuantity, 0);
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    return {
      totalTransactions,
      totalRevenue,
      totalItems,
      averageTransactionValue
    };
  };

  const filterTransactions = () => {
    let filtered = [...transactions];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction => 
        transaction.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.clientPhone?.includes(searchTerm) ||
        transaction.transactionId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Payment method filter
    if (paymentFilter) {
      filtered = filtered.filter(transaction => 
        transaction.paymentMethod === paymentFilter
      );
    }
    
    // Date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.createdAt);
        return transactionDate.toDateString() === filterDate.toDateString();
      });
    }
    
    setFilteredTransactions(filtered);
    setCurrentPage(1);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0
    }).format(price || 0);
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

  // Pagination logic
  const totalPages = Math.ceil((filteredTransactions || []).length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = (filteredTransactions || []).slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const StatCard = ({ title, value, icon: Icon, color = "blue", subtitle }) => {
    const colorClasses = {
      blue: "border-blue-200 bg-blue-50 text-blue-600",
      green: "border-green-200 bg-green-50 text-green-600",
      purple: "border-purple-200 bg-purple-50 text-purple-600",
      orange: "border-orange-200 bg-orange-50 text-orange-600"
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
  };

  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, (filteredTransactions || []).length)} of {(filteredTransactions || []).length} transactions
        </p>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${
              currentPage === 1 
                ? 'border-gray-200 text-gray-400 cursor-not-allowed' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  currentPage === page 
                    ? 'bg-blue-600 text-white' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${
              currentPage === totalPages 
                ? 'border-gray-200 text-gray-400 cursor-not-allowed' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );

  const TableView = () => (
    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(currentItems || []).map((transaction, index) => (
              <tr key={transaction.transactionId} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {transaction.transactionId}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="font-medium text-gray-900">
                      {transaction.clientName || 'Anonymous Customer'}
                    </div>
                    {transaction.clientPhone && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Phone size={12} />
                        {transaction.clientPhone}
                      </div>
                    )}
                    {transaction.clientEmail && (
                      <div className="text-sm text-gray-500">{transaction.clientEmail}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Package size={14} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{transaction.itemCount}</span>
                    <span className="text-sm text-gray-500">items</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Hash size={14} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{transaction.totalQuantity}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-semibold text-green-600">
                    {formatPrice(transaction.totalAmount)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {transaction.paymentMethod ? (
                    <div className="flex items-center gap-1">
                      <CreditCard size={14} className="text-gray-400" />
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        transaction.paymentMethod === 'CASH' ? 'bg-green-100 text-green-800' :
                        transaction.paymentMethod === 'CARD' ? 'bg-blue-100 text-blue-800' :
                        transaction.paymentMethod === 'MOMO' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.paymentMethod}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {formatDate(transaction.createdAt)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(transaction.transactionId)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    {/* <button
                      onClick={() => console.log('Print receipt:', transaction.transactionId)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Print Receipt"
                    >
                      <Receipt size={16} />
                    </button> */}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationComponent />
    </div>
  );

  const CardView = () => (
    <div className="md:hidden">
      <div className="grid grid-cols-1 gap-6 mb-6">
        {(currentItems || []).map((transaction) => (
          <div key={transaction.transactionId} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {transaction.transactionId}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-500">Completed</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() =>navigate(transaction.transactionId)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                  {/* <button
                    onClick={() => console.log('Print receipt:', transaction.transactionId)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Print Receipt"
                  >
                    <Receipt size={16} />
                  </button> */}
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Customer:</span>
                  <span className="font-medium text-gray-900">
                    {transaction.clientName || 'Anonymous'}
                  </span>
                </div>
                
                {transaction.clientPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <div className="flex items-center gap-1">
                      <Phone size={12} className="text-gray-400" />
                      <span className="text-sm text-gray-900">{transaction.clientPhone}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Items:</span>
                  <div className="flex items-center gap-1">
                    <Package size={12} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{transaction.itemCount} items</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Quantity:</span>
                  <div className="flex items-center gap-1">
                    <Hash size={12} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{transaction.totalQuantity}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="font-semibold text-green-600">
                    {formatPrice(transaction.totalAmount)}
                  </span>
                </div>
                
                {transaction.paymentMethod && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Payment:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      transaction.paymentMethod === 'CASH' ? 'bg-green-100 text-green-800' :
                      transaction.paymentMethod === 'CARD' ? 'bg-blue-100 text-blue-800' :
                      transaction.paymentMethod === 'MOMO' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.paymentMethod}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} />
                  <span>{formatDate(transaction.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <PaginationComponent />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 rounded-xl h-32"></div>
            ))}
          </div>
          <div className="bg-gray-200 rounded-xl h-96"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <Package className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">Error loading transactions: {error}</span>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Transactions</h1>
          <p className="text-gray-600">Manage and view all stock out transactions</p>
        </div>
        {/* <div className="mt-4 sm:mt-0 flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={16} />
            Export
          </button>
        </div> */}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Transactions"
          value={stats.totalTransactions.toLocaleString()}
          icon={Receipt}
          color="blue"
        />
        <StatCard
          title="Total Revenue"
          value={formatPrice(stats.totalRevenue)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Items Sold"
          value={stats.totalItems.toLocaleString()}
          icon={Package}
          color="purple"
        />
        <StatCard
          title="Average Transaction"
          value={formatPrice(stats.averageTransactionValue)}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="MOMO">Mobile Money</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Data Views */}
      <TableView />
      <CardView />
    </div>
  );
};

export default TransactionAnalysis;