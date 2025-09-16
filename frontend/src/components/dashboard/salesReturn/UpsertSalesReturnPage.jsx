
import { useEffect, useState } from "react";
import { Search, Package, DollarSign, Hash, User, Mail, Phone, Calendar, RotateCcw, AlertTriangle, Check, X, Info } from 'lucide-react';
import stockOutService from "../../../services/stockoutService";
import { useNetworkStatusContext } from "../../../context/useNetworkContext";
import { db } from "../../../db/database";
import useAdminAuth from "../../../context/AdminAuthContext";
import useEmployeeAuth from "../../../context/EmployeeAuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import salesReturnService from "../../../services/salesReturnService";

const UpsertSalesReturnPage = ({ role }) => {
  const [transactionId, setTransactionId] = useState('');
  const [reason, setReason] = useState('');
  const [soldProducts, setSoldProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user: adminData } = useAdminAuth();
  const { user: employeeData } = useEmployeeAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const { isOnline } = useNetworkStatusContext();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = role === 'admin' ? adminData : employeeData;
  const title = "Process Sales Return";

  // Predefined return reasons
  const commonReasons = [
    'Defective product',
    'Wrong item ordered',
    'Damaged during shipping',
    'Customer changed mind',
    'Product expired',
    'Size/color mismatch',
    'Quality issues',
    'Not as described',
    'Duplicate order',
    'Other'
  ];

  // Check for transactionId in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlTransactionId = params.get('transactionId');
    if (urlTransactionId) {
      setTransactionId(urlTransactionId);
      handleSearchTransaction(urlTransactionId);
    }
  }, [location.search]);

  const fetchTransactionData = async (transactionId) => {
    if (transactionId) {
      return isOnline
        ? await fetchTransactionDetails(transactionId)
        : await loadOfflineTransactionDetails(transactionId);
    }
  };

  const fetchTransactionDetails = async (transactionId) => {
    try {
      setIsSearching(true);
      const stockOutData = await stockOutService.getStockOutByTransactionId(transactionId);
      if (stockOutData && stockOutData.length > 0) {
        return stockOutData.map((item) => (
            {...item, synced: true}

        ));
      } else {
        setSearchError('Transaction not found');
        return [];
      }
    } catch (err) {
      console.error('Error fetching transaction details:', err);
      return await loadOfflineTransactionDetails(transactionId);
    } finally {
      setIsSearching(false);
    }
  };

   
  
    const loadOfflineTransactionDetails = async (transactionId) => {
      try {
        setIsSearching(true);
        
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
         return transactionStockOuts;
        } else {
          setSearchError('Transaction not found');
        }
  
      } catch (error) {
        console.error('Error loading offline transaction details:', error);
        setSearchError('Failed to load transaction details');
      } finally {
        setIsSearching(false);
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

  const resetForm = () => {
    setTransactionId('');
    setReason('');
    setSoldProducts([]);
    setSelectedItems([]);
    setIsSearching(false);
    setSearchError('');
    setHasSearched(false);
    setValidationErrors({});
    navigate({ search: '' }, { replace: true }); // Clear URL parameters
  };

  const onClose = (salesReturnId) => {
    if (salesReturnId) {
      return navigate(
        role === 'admin'
          ? `/admin/dashboard/sales-return?salesReturnId=${salesReturnId}`
          : `/employee/dashboard/sales-return?salesReturnId=${salesReturnId}`,
        { replace: true }
      );
    }
    navigate(
      role === 'admin' ? '/admin/dashboard/sales-return' : '/employee/dashboard/sales-return',
      { replace: true }
    );
    resetForm();
  };

  const handleAddSalesReturn = async (returnData) => {
    setIsLoading(true);
    try {
      if (!adminData?.id && !employeeData?.id) {
        throw new Error('User authentication required');
      }

      const userInfo = role === 'admin' && adminData?.id
        ? { adminId: adminData.id }
        : { employeeId: employeeData.id };

      const now = new Date();
      const CreditNoteID = `credit-note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (!returnData.transactionId) {
        throw new Error('Transaction ID is required');
      }
      if (!returnData.items || returnData.items.length === 0) {
        throw new Error('At least one item must be provided');
      }

      const newReturn = {
        transactionId: returnData.transactionId,
        reason: returnData.reason,
        creditnoteId: returnData.creditnoteId || CreditNoteID,
        ...userInfo,
        lastModified: now,
        createdAt: now,
        updatedAt: now
      };

      const localId = await db.sales_returns_offline_add.add(newReturn);
      const savedItems = [];
      for (const item of returnData.items) {
        if (!item.stockoutId || !item.quantity) {
          throw new Error('Each item must have a stockoutId and quantity');
        }

        const itemRecord = {
          salesReturnId: localId,
          stockoutId: item.stockoutId,
          quantity: item.quantity,
          ...userInfo,
          createdAt: now,
          updatedAt: now
        };

        await db.sales_return_items_offline_add.add(itemRecord);
        savedItems.push(itemRecord);
        await restoreStockQuantity(item.stockoutId, item.quantity);
      }

      if (isOnline) {
        try {
          const requestData = {
            transactionId: newReturn.transactionId,
            reason: newReturn.reason,
            creditnoteId: newReturn.creditnoteId,
            items: returnData.items.map(i => ({
              stockoutId: i.stockoutId,
              quantity: i.quantity
            })),
            ...userInfo,
            createdAt: now
          };

          const response = await salesReturnService.createSalesReturn(requestData);
          await db.sales_returns_all.put({
            id: response.salesReturn.id,
            transactionId: response.salesReturn.transactionId,
            reason: response.salesReturn.reason,
            creditnoteId: response.salesReturn.creditnoteId,
            ...userInfo,
            createdAt: response.salesReturn.createdAt || now,
            updatedAt: response.salesReturn.updatedAt || now,
            lastModified: response.salesReturn.lastModified || now
          });

          for (const item of response.salesReturn.items) {
            await db.sales_return_items_all.put({
              id: item.id,
              salesReturnId: item.salesReturnId,
              stockoutId: item.stockoutId,
              quantity: item.quantity,
              ...userInfo,
              createdAt: item.createdAt || now,
              updatedAt: item.updatedAt || now
            });
          }

          await db.sales_returns_offline_add.delete(localId);
          await db.sales_return_items_offline_add
            .where('salesReturnId')
            .equals(localId)
            .delete();

          await db.synced_sales_return_ids.add({
            localId,
            serverId: response.salesReturn.id,
            syncedAt: now
          });

          setNotification({ type: 'success', message: 'Sales return processed successfully!' });
          onClose(response.salesReturn.id);
        } catch (error) {
          console.warn('Error posting sales return to server, keeping offline:', error);
          setNotification({ type: 'warning', message: 'Sales return saved offline (will sync when online)' });
          onClose(localId);
        }
      } else {
        setNotification({ type: 'warning', message: 'Sales return saved offline (will sync when online)' });
        onClose(localId);
      }
    } catch (error) {
      console.error('Error processing sales return:', error);
      setNotification({ type: 'error', message: `Failed to process sales return: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const restoreStockQuantity = async (stockoutId, returnQuantity) => {
    try {
      const stockout =
        (await db.stockouts_all.get(stockoutId)) ||
        (await db.stockouts_offline_add.where('localId').equals(stockoutId).first()) ||
        (await db.stockouts_offline_update.get(stockoutId));

      if (!stockout) {
        console.warn(`Stockout ${stockoutId} not found`);
        return;
      }

      const stockout_all = await db.stockouts_all.get(stockoutId);
      if (stockout_all) {
        await db.stockouts_all.update(stockoutId, {
          quantity: (stockout_all?.offlineQuantity ?? stockout_all.quantity) - returnQuantity,
        });
      }

      const stock_add = await db.stockouts_offline_add.get(stockoutId);
      if (stock_add) {
        await db.stockouts_offline_add.update(stockoutId, {
          offlineQuantity: (stock_add?.offlineQuantity ?? stock_add.quantity) - returnQuantity,
        });
      }

      const stock_update = await db.stockouts_offline_update.get(stockoutId);
      if (stock_update) {
        await db.stockouts_offline_update.update(stockoutId, {
          offlineQuantity: (stock_update?.offlineQuantity ?? stock_update.quantity) - returnQuantity,
        });
      }

      if (stockout.stockinId) {
        const stockin = await db.stockins_all.get(stockout.stockinId);
        if (stockin) {
          const newQuantity = (stockin.offlineQuantity ?? stockin.quantity) + returnQuantity;
          await db.stockins_all.update(stockout.stockinId, { quantity: newQuantity });
        } else {
          const offlineStockin = await db.stockins_offline_add.get(stockout.stockinId);
          if (offlineStockin) {
            const newQuantity = (offlineStockin.offlineQuantity ?? offlineStockin.quantity) + returnQuantity;
            await db.stockins_offline_add.update(stockout.stockinId, { offlineQuantity: newQuantity });
          }
        }
      }
    } catch (error) {
      console.error('Error restoring stock quantity:', error);
    }
  };

  const handleSearchTransaction = async (id = transactionId) => {
    if (!id.trim()) {
      setSearchError('Please enter a transaction ID');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setHasSearched(false);

    try {
      const response = await fetchTransactionData(id.trim());
      if (response && response.length > 0) {
        const availableProducts = response.filter(product => {
          return (product?.offlineQuantity ?? product.quantity) > 0;
        });

        if (availableProducts.length > 0) {
          setSoldProducts(availableProducts);
          setHasSearched(true);
          setSelectedItems([]);
          navigate({ search: `?transactionId=${id.trim()}` }, { replace: true }); // Update URL
        } else {
          setSoldProducts([]);
          setSearchError('All products from this transaction have already been returned');
          setHasSearched(true);
        }
      } else {
        setSoldProducts([]);
        setSearchError('No products found for this transaction ID');
        setHasSearched(true);
      }
    } catch (error) {
      console.error('Error searching transaction:', error);
      setSearchError(`Failed to find transaction: ${error.message}`);
      setSoldProducts([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleItemSelect = (stockoutId, isSelected) => {
    if (isSelected) {
      const product = soldProducts.find(p => p.id === stockoutId || p.localId === stockoutId);
      if (product) {
        const newItem = {
          stockoutId: stockoutId,
          quantity: 1,
          maxQuantity: product.offlineQuantity ?? product.quantity,
          productName: product.stockin?.product?.productName || product?.backorder?.productName || 'Unknown Product',
          sku: product.stockin?.sku || 'N/A',
          unitPrice: product.soldPrice ?? 0,
          soldPrice: product.soldPrice ? product.soldPrice * (product?.offlineQuantity ?? product.quantity ?? 0) : 0,
          soldQuantity: product?.offlineQuantity ?? product.quantity
        };
        setSelectedItems(prev => [...prev, newItem]);
      }
    } else {
      setSelectedItems(prev => prev.filter(item => item.stockoutId !== stockoutId));
    }

    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[stockoutId];
      return newErrors;
    });
  };

  const handleQuantityChange = (stockoutId, quantity) => {
    const numQuantity = parseInt(quantity) ?? 0;
    setSelectedItems(prev =>
      prev.map(item =>
        item.stockoutId === stockoutId
          ? { ...item, quantity: Math.min(Math.max(0, numQuantity), item.maxQuantity) }
          : item
      )
    );

    if (numQuantity > 0) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[stockoutId];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    if (!transactionId.trim()) {
      setSearchError('Transaction ID is required');
      return false;
    }

    if (!reason.trim()) {
      setSearchError('Return reason is required');
      return false;
    }

    if (selectedItems.length === 0) {
      setSearchError('Please select at least one item to return');
      return false;
    }

    selectedItems.forEach(item => {
      if (item.quantity <= 0) {
        errors[item.stockoutId] = 'Quantity must be greater than 0';
        isValid = false;
      }
      if (item.quantity > item.maxQuantity) {
        errors[item.stockoutId] = `Quantity cannot exceed ${item.maxQuantity}`;
        isValid = false;
      }
    });

    setValidationErrors(errors);
    if (!isValid) {
      setSearchError('Please fix the quantity errors below');
    }
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const returnData = {
      transactionId: transactionId.trim(),
      reason: reason.trim(),
      items: selectedItems.map(item => ({
        stockoutId: item.stockoutId,
        quantity: item.quantity
      }))
    };

    handleAddSalesReturn(returnData);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateTotalRefund = () => {
    return selectedItems.reduce((total, item) => {
      return total + (item.unitPrice * item.quantity);
    }, 0);
  };

  const calculateTotalQuantity = () => {
    return selectedItems.reduce((total, item) => total + item.quantity, 0);
  };

  const isItemSelected = (stockoutId) => {
    return selectedItems.some(item => item.stockoutId === stockoutId);
  };

  const getSelectedItem = (stockoutId) => {
    return selectedItems.find(item => item.stockoutId === stockoutId);
  };

  return (
    <div className="flex bg-white items-center justify-center">
      <div className="w-full mx-4 flex flex-col h-[90vh] overflow-y-auto text-xs">
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-xs ${
              notification.type === 'success' ? 'bg-green-500 text-white' :
              notification.type === 'warning' ? 'bg-yellow-500 text-white' :
              'bg-red-500 text-white'
            } animate-in slide-in-from-top-2 duration-300`}
          >
            {notification.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
            {notification.message}
          </div>
        )}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-primary-600" />
                {title}
              </h2>
              <p className="text-xs text-gray-600 mt-1">Search for a transaction and select items to return</p>
            </div>
          </div>
        </div>
        <div className="">
          <div className="p-6">
            {currentUser && (
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User size={12} className="text-blue-600" />
                  <span className="font-medium text-blue-900 text-sm">Processing as: {role}</span>
                </div>
                <p className="text-xs text-blue-700">
                  {role === 'admin' ? currentUser.adminName : `${currentUser.firstname} ${currentUser.lastname}`}
                  {currentUser.email && ` (${currentUser.email})`}
                </p>
              </div>
            )}
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Transaction ID <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => {
                      setTransactionId(e.target.value);
                      setSearchError('');
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchTransaction()}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-xs"
                    placeholder="Enter transaction ID (e.g., ABTR64943)"
                    disabled={isSearching}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSearchTransaction()}
                  disabled={isSearching || !transactionId.trim()}
                  className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors font-medium text-xs"
                >
                  {isSearching ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Search size={12} />
                  )}
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
              {searchError && (
                <div className="mt-2 flex items-center gap-2 text-red-600 text-xs bg-red-50 p-2 rounded-lg border border-red-200">
                  <AlertTriangle size={12} />
                  {searchError}
                </div>
              )}
            </div>
            {hasSearched && soldProducts.length > 0 && (
              <>
                <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-900 text-sm mb-3 flex items-center gap-2">
                    <Info size={12} className="text-gray-600" />
                    Transaction Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <Hash size={10} className="text-gray-400" />
                      <span className="text-gray-600">ID:</span>
                      <span className="font-medium">{soldProducts[0]?.transactionId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={10} className="text-gray-400" />
                      <span className="text-gray-600">Client:</span>
                      <span className="font-medium">{soldProducts[0]?.clientName || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={10} className="text-gray-400" />
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{formatDate(soldProducts[0]?.createdAt)}</span>
                    </div>
                    {soldProducts[0]?.clientEmail && (
                      <div className="flex items-center gap-2">
                        <Mail size={10} className="text-gray-400" />
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium text-xs">{soldProducts[0].clientEmail}</span>
                      </div>
                    )}
                    {soldProducts[0]?.clientPhone && (
                      <div className="flex items-center gap-2">
                        <Phone size={10} className="text-gray-400" />
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{soldProducts[0].clientPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Package size={10} className="text-gray-400" />
                      <span className="text-gray-600">Total Items:</span>
                      <span className="font-medium">{soldProducts.length}</span>
                    </div>
                  </div>
                </div>
                <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 text-sm mb-3 flex items-center gap-2">
                    <Info size={12} className="text-yellow-600" />
                    Return Reason <span className="text-red-500">*</span>
                  </h3>
                  <p className="text-xs text-gray-600 mb-4">
                    Please provide a reason for this return. This will apply to all returned items.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Select Common Reason
                      </label>
                      <select
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          setSearchError('');
                        }}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-xs"
                      >
                        <option value="">Select a reason...</option>
                        {commonReasons.map((commonReason) => (
                          <option key={commonReason} value={commonReason}>{commonReason}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Or Enter Custom Reason
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          setSearchError('');
                        }}
                        rows={2}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-xs"
                        placeholder="Enter custom reason"
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 text-sm mb-4 flex items-center gap-2">
                    <Package size={12} className="text-gray-600" />
                    Select Items to Return
                  </h3>
                  <div className="space-y-3">
                    {soldProducts.map((product) => {
                      const isSelected = isItemSelected(product?.id || product?.localId);
                      const selectedItem = getSelectedItem(product?.id || product?.localId);
                      const hasError = validationErrors[product?.id || product?.localId];
                      const unitPrice = product.soldPrice || 0;

                      return (
                        <div
                          key={product?.id || product?.localId}
                          className={`border rounded-lg p-3 transition-all duration-200 ${
                            isSelected
                              ? 'border-primary-300 bg-primary-50 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          } ${hasError ? 'border-red-300 bg-red-50' : ''}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex items-center pt-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleItemSelect(product?.id ?? product?.localId, e.target.checked)}
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white">
                                    <Package size={14} />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm text-gray-900">
                                      {product?.stockin?.product?.productName || product?.backorder?.productName || 'Unknown Product'}
                                         {!product?.synced && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            Pending sync
                          </span>
                        )}
                                    </h4>
                                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                      {product?.stockin?.sku && <span>SKU: {product.stockin?.sku || 'N/A'}</span>}
                                      {product?.backorder?.id && <span>Non-Stock Sales</span>}
                                      <span>•</span>
                                      <span>Available: {product?.offlineQuantity ?? product.quantity} units</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-sm text-gray-900">
                                    {formatPrice(product.soldPrice)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatPrice(unitPrice)} per unit
                                  </div>
                                </div>
                              </div>
                              {isSelected && selectedItem && (
                                <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-2">
                                        Quantity to Return <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        max={selectedItem.maxQuantity}
                                        value={selectedItem.quantity}
                                        onChange={(e) => handleQuantityChange(product?.id || product?.localId, e.target.value)}
                                        className={`w-full px-3 py-1.5 border rounded-lg focus:ring-2 text-center font-medium text-xs ${
                                          hasError
                                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                            : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                                        }`}
                                      />
                                      <p className="text-xs text-gray-500 mt-1 text-center">
                                        Max: {selectedItem.maxQuantity}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-2">
                                        Refund Amount
                                      </label>
                                      <div className="w-full px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-center">
                                        <span className="font-bold text-green-600 text-sm">
                                          {formatPrice(selectedItem.unitPrice * selectedItem.quantity)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1 text-center">
                                        {formatPrice(selectedItem.unitPrice)} × {selectedItem.quantity}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {hasError && (
                                <div className="mt-3 flex items-center gap-2 text-red-600 text-xs bg-red-100 p-2 rounded-lg">
                                  <AlertTriangle size={12} />
                                  {hasError}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {selectedItems.length > 0 && (
                  <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 text-sm mb-3 flex items-center gap-2">
                      <Check size={12} />
                      Return Summary
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                      <div className="text-center p-2 bg-white rounded-lg">
                        <div className="text-sm font-bold text-green-700">{selectedItems.length}</div>
                        <div className="text-green-600">Items</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg">
                        <div className="text-sm font-bold text-green-700">{calculateTotalQuantity()}</div>
                        <div className="text-green-600">Total Qty</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg">
                        <div className="text-sm font-bold text-green-700">{formatPrice(calculateTotalRefund())}</div>
                        <div className="text-green-600">Total Refund</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg">
                        <div className="text-sm font-bold text-green-700">
                          {formatPrice(calculateTotalRefund() / calculateTotalQuantity() || 0)}
                        </div>
                        <div className="text-green-600">Avg/Unit</div>
                      </div>
                    </div>
                    {reason && (
                      <div className="mt-4 p-2 bg-white rounded-lg border border-green-200">
                        <div className="text-xs text-gray-600">Return Reason:</div>
                        <div className="font-medium text-gray-900 text-sm">{reason}</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {hasSearched && soldProducts.length === 0 && !searchError && (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RotateCcw className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">No Products Found</h3>
                <p className="text-xs text-gray-600">
                  No returnable products found for transaction ID: <strong>{transactionId}</strong>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  This could mean the transaction doesn't exist or all items have already been returned.
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || selectedItems.length === 0 || !reason.trim()}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium text-xs"
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw size={12} />
                  Process Return ({selectedItems.length} items, {calculateTotalQuantity()} qty)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpsertSalesReturnPage;
