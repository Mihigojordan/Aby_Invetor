import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Hash, 
  DollarSign, 
  Calendar, 
  ArrowLeft,
  User,
  Phone,
  Mail,
  CreditCard,
  ShoppingCart,
  Receipt,
  Printer,
  Download,
  CheckCircle,
  AlertCircle,
  Barcode,
  Store,
  Box,
  Tag
} from 'lucide-react';
import stockOutService from '../../../services/stockoutService';
import { db } from '../../../db/database';
import productService from '../../../services/productService';
import backOrderService from '../../../services/backOrderService';
import stockInService from '../../../services/stockinService';

import { useNetworkStatusContext } from '../../../context/useNetworkContext';

const TransactionAnalysisDetails = () => {
  const { id:transactionId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const { isOnline } = useNetworkStatusContext();

  useEffect(() => {
    if (transactionId) {
      if (isOnline) {
        fetchTransactionDetails();
      } else {
        loadOfflineTransactionDetails();
      }
    }
  }, [transactionId, isOnline]);

  const fetchTransactionDetails = async () => {
    try {
      setLoading(true);
      const stockOutData = await stockOutService.getStockOutByTransactionId(transactionId);
      
      if (stockOutData && stockOutData.length > 0) {
        const processedTransaction = processTransactionData(stockOutData);
        setTransaction(processedTransaction);
      } else {
        setError('Transaction not found');
      }
    } catch (err) {
      console.error('Error fetching transaction details:', err);
    //   setError(err.message || 'Failed to fetch transaction details');
    //   // Fallback to offline data
     await loadOfflineTransactionDetails();
    } finally {
      setLoading(false);
    }
  };

  const loadOfflineTransactionDetails = async () => {
    try {
      setLoading(true);
      
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
        })));

      // Filter by transaction ID
      const transactionStockOuts = combinedStockOuts.filter(so => so.transactionId === transactionId);
      
      if (transactionStockOuts.length > 0) {
        const processedTransaction = processTransactionData(transactionStockOuts);
        setTransaction(processedTransaction);
      } else {
        setError('Transaction not found');
      }

    } catch (error) {
      console.error('Error loading offline transaction details:', error);
      setError('Failed to load transaction details');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockIns = async () => {
    try {
      const [allStockin, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
        db.stockins_all.toArray(),
        db.stockins_offline_add.toArray(),
        db.stockins_offline_update.toArray(),
        db.stockins_offline_delete.toArray()
      ]);

      const deleteIds = new Set(offlineDeletes.map(d => d.id));
      const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));

      return allStockin
        .filter(c => !deleteIds.has(c.id))
        .map(c => ({
          ...c,
          ...updateMap.get(c.id),
          synced: true
        }))
        .concat(offlineAdds.map(a => ({ ...a, synced: false })));

    } catch (error) {
      console.error('Error fetching stock-ins:', error);
      return await db.stockins_all.toArray();
    }
  };

  const fetchBackorders = async () => {
    try {
      const [allBackOrder, offlineAdds] = await Promise.all([
        db.backorders_all.toArray(),
        db.backorders_offline_add.toArray(),
      ]);

      return allBackOrder
        .map(c => ({
          ...c,
          synced: true
        }))
        .concat(offlineAdds.map(a => ({ ...a, synced: false })));

    } catch (error) {
      console.error('Error fetching backorders:', error);
      return [];
    }
  };

  const fetchProducts = async () => {
    try {
      const [allProducts, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
        db.products_all.toArray(),
        db.products_offline_add.toArray(),
        db.products_offline_update.toArray(),
        db.products_offline_delete.toArray()
      ]);

      const deleteIds = new Set(offlineDeletes.map(d => d.id));
      const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));

      return allProducts
        .filter(c => !deleteIds.has(c.id))
        .map(c => ({
          ...c,
          ...updateMap.get(c.id),
          synced: true
        }))
        .concat(offlineAdds.map(a => ({ ...a, synced: false })));

    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  };

  const processTransactionData = (stockOutData) => {
    if (!stockOutData || stockOutData.length === 0) return null;

    const firstItem = stockOutData[0];
    
    const processedItems = stockOutData.map(item => {
      const isBackOrder = !!item.backorderId || !!item.backorder;
      
      return {
        id: item.id,
        type: isBackOrder ? 'backorder' : 'stockin',
        quantity: item.quantity,
        soldPrice: item.soldPrice,
        totalItemPrice: (item.soldPrice || 0) * (item.quantity || 0),
        // Stock-in item details
        stockin: item.stockin ? {
          id: item.stockin.id,
          sku: item.stockin.sku,
          sellingPrice: item.stockin.sellingPrice,
          supplier: item.stockin.supplier,
          barcodeUrl: item.stockin.barcodeUrl,
          product: item.stockin.product
        } : null,
        // Non-Stock Sales details
        backorder: item.backorder ? {
          id: item.backorder.id,
          productName: item.backorder.productName,
          originalQuantity: item.backorder.quantity,
          originalPrice: item.backorder.soldPrice
        } : null,
        synced: item.synced !== false
      };
    });

    return {
      transactionId: firstItem.transactionId || `single_${firstItem.id}`,
      clientName: firstItem.clientName,
      clientEmail: firstItem.clientEmail,
      clientPhone: firstItem.clientPhone,
      paymentMethod: firstItem.paymentMethod,
      createdAt: firstItem.createdAt,
      updatedAt: firstItem.updatedAt,
      items: processedItems,
      totalAmount: processedItems.reduce((sum, item) => sum + (item.totalItemPrice || 0), 0),
      totalQuantity: processedItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
      itemCount: processedItems.length,
      hasBackOrders: processedItems.some(item => item.type === 'backorder'),
      hasStockIns: processedItems.some(item => item.type === 'stockin')
    };
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 h-[90vh] overflow-y-auto">
        <div className="animate-pulse">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-8 h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-200 rounded-xl h-64"></div>
              <div className="bg-gray-200 rounded-xl h-96"></div>
            </div>
            <div className="bg-gray-200 rounded-xl h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Details</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="p-6 bg-gray-50 h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Details</h1>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="text-yellow-700">Transaction not found</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 h-[90vh] overflow-y-auto">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-yellow-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transaction Details</h1>
            <p className="text-gray-600 mt-1">Transaction ID: {transaction.transactionId}</p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transaction Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white">
                <CheckCircle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Transaction Completed</h2>
                <p className="text-gray-600">Payment processed successfully</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600">Items</p>
                <p className="text-lg font-semibold text-gray-900">{transaction.itemCount}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Hash className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-sm text-gray-600">Quantity</p>
                <p className="text-lg font-semibold text-gray-900">{transaction.totalQuantity}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-lg font-semibold text-gray-900">{formatPrice(transaction.totalAmount)}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="text-lg font-semibold text-gray-900">{new Date(transaction.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ShoppingCart size={20} />
                Items Sold ({transaction.itemCount})
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {transaction.items.map((item, index) => (
                  <div key={item.id} className={`border rounded-lg p-4 ${
                    item.type === 'backorder' ? 'border-orange-200 bg-orange-50' : 'border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {item.type === 'backorder' ? (
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-orange-600" />
                              <span className="text-sm font-medium text-orange-600">Non-Stock Sales</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Box className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-600">Stock Item</span>
                            </div>
                          )}
                          {!item.synced && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                              Offline
                            </span>
                          )}
                        </div>
                        
                        <h4 className="font-semibold text-gray-900">
                          {item.type === 'backorder' 
                            ? item.backorder?.productName || 'Non-Stock Sales Item'
                            : item.stockin?.product?.productName || 'Product'
                          }
                        </h4>
                        
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          {item.type === 'stockin' && item.stockin && (
                            <>
                              {item.stockin.sku && (
                                <div className="flex items-center gap-2">
                                  <Barcode size={14} />
                                  <span>SKU: {item.stockin.sku}</span>
                                </div>
                              )}
                              {item.stockin.supplier && (
                                <div className="flex items-center gap-2">
                                  <Store size={14} />
                                  <span>Supplier: {item.stockin.supplier}</span>
                                </div>
                              )}
                              {item.stockin.product?.brand && (
                                <div>
                                  <span>Brand: {item.stockin.product.brand}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-600 mb-1">
                          Qty: {item.quantity} × {formatPrice(item.soldPrice)}
                        </div>
                        <div className="font-semibold text-lg text-gray-900">
                          {formatPrice(item.totalItemPrice)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User size={20} />
              Customer Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Name</label>
                <p className="font-medium text-gray-900">{transaction.clientName || 'Anonymous Customer'}</p>
              </div>
              {transaction.clientEmail && (
                <div>
                  <label className="text-sm text-gray-600">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" />
                    <p className="text-gray-900">{transaction.clientEmail}</p>
                  </div>
                </div>
              )}
              {transaction.clientPhone && (
                <div>
                  <label className="text-sm text-gray-600">Phone</label>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    <p className="text-gray-900">{transaction.clientPhone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard size={20} />
              Payment Details
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Method</label>
                {transaction.paymentMethod ? (
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                    transaction.paymentMethod === 'CASH' ? 'bg-green-100 text-green-800' :
                    transaction.paymentMethod === 'CARD' ? 'bg-blue-100 text-blue-800' :
                    transaction.paymentMethod === 'MOMO' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {transaction.paymentMethod}
                  </span>
                ) : (
                  <p className="text-gray-500">Not specified</p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600">Total Amount</label>
                <p className="text-2xl font-bold text-green-600">{formatPrice(transaction.totalAmount)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Status</label>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-green-600 font-medium">Completed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">Transaction Created</p>
                  <p className="text-sm text-gray-600">{formatDate(transaction.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">Payment Completed</p>
                  <p className="text-sm text-gray-600">{formatDate(transaction.createdAt)}</p>
                </div>
              </div>
              {transaction.updatedAt !== transaction.createdAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900">Last Updated</p>
                    <p className="text-sm text-gray-600">{formatDate(transaction.updatedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionAnalysisDetails;