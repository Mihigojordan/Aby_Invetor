import React, { useState, useEffect } from 'react';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  Hash,
  Building2,
  ShoppingCart,
  Barcode,
  ArrowLeft,
  Activity,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import stockOutService from '../../../services/stockoutService';
import productService from '../../../services/productService';
import { db } from '../../../db/database';
import { useNetworkStatusContext } from '../../../context/useNetworkContext';
import stockInService from '../../../services/stockinService';



const ViewStockoutReport = () => {
  const {id} = useParams();
  const [stockOut, setStockOut] = useState(null);
  const [loading, setLoading] = useState(true);
 const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);
  const {isOnline} = useNetworkStatusContext()

  useEffect(() => {
    const fetchStockOut = async () => {
      try {
        setLoading(true);
        const data = await stockOutService.getStockOutById(id);
        setStockOut(data);
      } catch (err) {
        setError('Failed to fetch stock out details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if(id){

      if (isOnline) {
        fetchStockOut();
      }
      else{
        loadStockOuts();
      }
    }
  }, [id]);


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
        .sort((a, b) => a.synced - b.synced)
        ;

      const convertedStockIns = Array.from(stockinMap.values())

      console.warn('STOCK INS', backOrderMap);

      const found_stock_out =  combinedStockOuts.find(out=> out?.id == id)
      setStockOut(found_stock_out);
  
    

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


  


  console.log(stockOut);
  

  if (loading) {
    return (
      <div className="min-h-[90vh]  bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Activity className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading stock out details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[90vh]  bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!stockOut) {
    return (
      <div className="min-h-[90vh] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Stock Out Not Found</h2>
          <p className="text-gray-600">The requested stock out record could not be found.</p>
        </div>
      </div>
    );
  }

  // Calculate profit/loss
  const costPrice = stockOut.stockin?.price || 0;
  const soldPrice = stockOut.soldPrice || 0;
  const quantity = stockOut.quantity || 0;
  const profitPerUnit = soldPrice - costPrice;
  const totalProfit = profitPerUnit * quantity;
  const totalRevenue = soldPrice * quantity;
  const totalCost = costPrice * quantity;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0;

    const formatCurrency = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF'
    }).format(price || 0);
  };;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();
  const formatDateTime = (dateString) => new Date(dateString).toLocaleString();

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'CARD': return <CreditCard className="w-4 h-4" />;
      case 'MOMO': return <Phone className="w-4 h-4" />;
      case 'CASH': return <DollarSign className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-[90vh] overflow-y-auto bg-gray-50 py-8">
          {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' : notification.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'} animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}
    
      <div className=" mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button className="flex items-center text-gray-600 hover:text-gray-900 mb-4" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stock Outs
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Stock Out Details</h1>
              <p className="text-gray-600 mt-1">Transaction ID: {stockOut.transactionId}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Sale Date</div>
              <div className="text-lg font-semibold">{formatDate(stockOut.createdAt)}</div>
            </div>
          </div>
        </div>

        {/* Profit/Loss Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Package className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {totalProfit >= 0 ? 
                  <TrendingUp className="w-6 h-6 text-green-600" /> : 
                  <TrendingDown className="w-6 h-6 text-red-600" />
                }
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {totalProfit >= 0 ? 'Profit' : 'Loss'}
                </p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(totalProfit))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${profitMargin >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                <Activity className={`w-6 h-6 ${profitMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                <p className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {profitMargin}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Information */}
        {
          stockOut?.stockin && (
             <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Product Information
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Name</label>
                  <p className="mt-1 text-sm text-gray-900">{stockOut.stockin?.product?.productName || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Brand</label>
                    <p className="mt-1 text-sm text-gray-900">{stockOut.stockin?.product?.brand || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <p className="mt-1 text-sm text-gray-900">{stockOut.stockin?.product?.category?.name || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SKU</label>
                    <div className="flex items-center mt-1">
                      <Hash className="w-4 h-4 text-gray-400 mr-1" />
                      <p className="text-sm text-gray-900">{stockOut.stockin?.sku || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier</label>
                    <div className="flex items-center mt-1">
                      <Building2 className="w-4 h-4 text-gray-400 mr-1" />
                      <p className="text-sm text-gray-900">{stockOut.stockin?.supplier || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )
        }


          {/* Backorder Details */}

           {
          stockOut?.backorder && (
             <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2" />
              Backorder  Product Information
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700">Product Name</label>
                  <p className="mt-1 text-sm text-gray-900">{stockOut?.backorder?.productName || 'N/A'}</p>
                </div>
               
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700">quantity</label>
                    <div className="flex items-center mt-1">
                      <Hash className="w-4 h-4 text-gray-400 mr-1" />
                      <p className="text-sm text-gray-900">{stockOut?.backorder?.quantity || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700">SoldPrice</label>
                    <div className="flex items-center mt-1">
                      <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                      <p className="text-sm text-gray-900">{stockOut.backorder?.soldPrice || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )
        }



          {/* Transaction Details */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Transaction Details
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity Sold</label>
                    <p className="mt-1 text-sm text-gray-900">{quantity} units</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(soldPrice)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cost Per Unit</label>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(costPrice)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Profit Per Unit</label>
                    <p className={`mt-1 text-sm font-medium ${profitPerUnit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitPerUnit >= 0 ? '+' : ''}{formatCurrency(profitPerUnit)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <div className="flex items-center mt-1">
                    {getPaymentMethodIcon(stockOut.paymentMethod)}
                    <p className="ml-2 text-sm text-gray-900">{stockOut.paymentMethod || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Transaction Date</label>
                  <div className="flex items-center mt-1">
                    <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                    <p className="text-sm text-gray-900">{formatDateTime(stockOut.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Customer Information
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                  <p className="mt-1 text-sm text-gray-900">{stockOut.clientName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="flex items-center mt-1">
                    <Mail className="w-4 h-4 text-gray-400 mr-1" />
                    <p className="text-sm text-gray-900">{stockOut.clientEmail || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <div className="flex items-center mt-1">
                    <Phone className="w-4 h-4 text-gray-400 mr-1" />
                    <p className="text-sm text-gray-900">{stockOut.clientPhone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                System Information
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Processed By</label>
                  <div className="flex items-center mt-1">
                    <User className="w-4 h-4 text-gray-400 mr-1" />
                    <p className="text-sm text-gray-900">
                      {stockOut.admin ? `${stockOut.admin.adminName} (${stockOut.admin.adminEmail})` : 'System'}
                    </p>
                  </div>
                </div>
               
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock In Date</label>
                  <div className="flex items-center mt-1">
                    <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                    <p className="text-sm text-gray-900">{formatDate(stockOut.stockin?.createdAt)}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDateTime(stockOut.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profit Analysis Summary */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              {totalProfit >= 0 ? 
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" /> :
                <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
              }
              Financial Analysis
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
                <div className="text-xs text-gray-500 mt-1">{quantity} units × {formatCurrency(soldPrice)}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</div>
                <div className="text-sm text-gray-600">Total Cost</div>
                <div className="text-xs text-gray-500 mt-1">{quantity} units × {formatCurrency(costPrice)}</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
                </div>
                <div className="text-sm text-gray-600">Net {totalProfit >= 0 ? 'Profit' : 'Loss'}</div>
                <div className="text-xs text-gray-500 mt-1">Margin: {profitMargin}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewStockoutReport;