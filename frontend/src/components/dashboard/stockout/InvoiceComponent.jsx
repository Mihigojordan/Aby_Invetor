import React, { useEffect, useState } from 'react';
import stockOutService from '../../../services/stockoutService';
import Swal from 'sweetalert2';
import CompanyLogo from '../../../assets/images/applogo_rm_bg.png'
import { useNetworkStatusContext } from '../../../context/useNetworkContext';
import { db } from '../../../db/database';

const InvoiceComponent = ({ isOpen, onClose, transactionId }) => {
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const {isOnline} = useNetworkStatusContext()
  const [actionLoading, setActionLoading] = useState({
    print: false
  });

  useEffect(() => {
    const getInvoiceData = async () => {
      setLoading(true);
      try {

        if(isOnline){
        const response = await stockOutService.getStockOutByTransactionId(transactionId);
        setInvoiceData(response);
        }

        else if(!isOnline){
       const response = await   fetchStockOutWithTrID()

       setInvoiceData(response)
        }
    
      } catch (error) {
        console.log(error.message);
        Swal.fire({
          icon: 'error',
          title: 'Error Loading Invoice',
          text: 'Failed to load invoice data. Please try again.',
          confirmButtonColor: '#3b82f6'
        });
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && transactionId) {
      getInvoiceData();
    }
  }, [transactionId, isOpen]);



  
  const fetchStockOutWithTrID = async () => {
    try {
      if (isOnline) {
         const response = await stockOutService.getStockOutByTransactionId(transactionId);
         return response
      }
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
           .filter(so=> so.transactionId == transactionId )
        .sort((a, b) => a.synced - b.synced)
        ;
        console.warn('SHKSKKD: :D__D  ',combinedStockOuts);
        
        return combinedStockOuts;

    } catch (error) {
      console.error('Error fetching stockouts:', error);
      if (!error?.response) {

        // 3. Merge all data (works offline too)
         const [allStockOuts, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
        db.stockouts_all.toArray(),
        db.stockouts_offline_add.toArray(),
        db.stockouts_offline_update.toArray(),
        db.stockouts_offline_delete.toArray()
      ]);

      const deleteIds = new Set(offlineDeletes.map(d => d.id));
      const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));

      const combinedProducts = allStockOuts
        .filter(c => !deleteIds.has(c.id))
        .filter(c=> c.transactionId == transactionId)
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
    try {
      if (isOnline) {
        const response = await stockInService.getAllStockIns();
        for (const si of response) {
          await db.stockins_all.put({
            id: si.id,
            productId: si.productId,
            quantity: si.quantity,
            price: si.price,
            sellingPrice: si.sellingPrice,
            supplier: si.supplier,
            sku: si.sku,
            barcodeUrl: si.barcodeUrl,
            lastModified: new Date(),
            updatedAt: si.updatedAt || new Date()
          });;
          if (si.product && !(await db.products_all.get(si.product.id))) {
            await db.products_all.put({
              id: si.product.id,
              productName: si.product.productName,
              categoryId: si.product.categoryId,
              description: si.product.description,
              brand: si.product.brand,
              lastModified: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }

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




  const companyInfo = {
    logo: CompanyLogo,
    companyName: 'UMUSINGI HARDWARE',
    address: 'NYAMATA, BUGESERA',
    phone: '+250 787 487 953',
    email: 'umusingihardware7@gmail.com'
  };

  // Extract client info from the first invoice item
  const clientInfo = invoiceData?.length > 0 ? {
    clientName: invoiceData[0].clientName || 'WALK-IN CUSTOMER',
    clientPhone: invoiceData[0].clientPhone || 'N/A'
  } : {
    clientName: 'WALK-IN CUSTOMER',
    clientPhone: 'N/A'
  };

  // Calculate totals
  const total = (invoiceData?.reduce((sum, item) => sum + (item?.soldPrice * item?.quantity), 0)) || 0;

 

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-RW', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Handle print
  const handlePrint = () => {
    setActionLoading(prev => ({ ...prev, print: true }));
    setTimeout(() => {
      window.print();
      setActionLoading(prev => ({ ...prev, print: false }));
    }, 100);
  };

  const transactionIdDisplay = invoiceData?.[0]?.transactionId || transactionId;
  const createdAt = invoiceData?.[0]?.createdAt || new Date().toISOString();
  const itemCount = invoiceData?.length || 0;

  if (!isOpen) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Invoice</h3>
            <p className="text-gray-600">Please wait while we fetch your invoice data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invoiceData || invoiceData.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Invoice Data</h3>
            <p className="text-gray-600 mb-4">Unable to load invoice information.</p>
            <button
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-invoice, #print-invoice * {
            visibility: visible;
          }
          #print-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            font-size: 12px;
          }
          .no-print {
            display: none !important;
          }
          .print-header {
            text-align: center;
            margin-bottom: 10px;
          }
          .print-divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
        }
      `}</style>

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Action Bar - No Print */}
          <div className="no-print sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Invoice #{transactionIdDisplay}</h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  disabled={actionLoading.print}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-semibold transition-all flex items-center gap-1"
                >
                  {actionLoading.print ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Printing...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-semibold transition-all flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* Invoice Content */}
          <div id="print-invoice" className="p-6 bg-white font-mono text-sm">
            {/* Header */}
            <div className="print-header text-center mb-4">
              <img
                src={companyInfo.logo}
                alt="Logo"
                className="w-16 h-16 mx-auto mb-2 object-contain"
              />
              <div className="font-bold text-lg">{companyInfo.companyName}</div>
              <div className="text-xs">{companyInfo.address}</div>
              <div className="text-xs">TEL: {companyInfo.phone}</div>
              <div className="text-xs">EMAIL: {companyInfo.email}</div>
            </div>

            <div className="print-divider"></div>

            {/* Transaction Info */}
            <div className="mb-4 text-xs">
              <div>CLIENT NAME: {clientInfo.clientName}</div>
              {clientInfo.clientPhone  && (
                <div>CLIENT PHONE: {clientInfo.clientPhone}</div>
              )}
            </div>

            <div className="print-divider"></div>

            {/* Items */}
            <div className="mb-4">
              {invoiceData.map((item, index) => (
                <div key={item.id} className="mb-3 text-xs">
                  <div className="font-semibold">
                    
                    {item.stockin?.product?.productName || item?.backorder?.productName || `ITEM ${index + 1}`}
                  </div>
                  <div className="flex justify-between">
                    <span>{item.quantity}x{formatCurrency( item.soldPrice )}</span>
                    <span className="font-bold">{formatCurrency(item.soldPrice * (item?.quantity || 0) ) }</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="print-divider"></div>

            {/* Totals */}
            <div className="mb-4">
              <div className="flex justify-between font-bold text-base">
                <span>TOTAL</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>CASH</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="print-divider"></div>

            {/* Footer Info */}
            <div className="text-xs text-center">
              <div>ITEM NUMBER: {itemCount}</div>
              <div className="print-divider"></div>
              <div>INVOICE INFORMATION</div>
              <div>Date: {formatDate(createdAt)} Time: {formatTime(createdAt)}</div>
              <div>INVOICE ID: {transactionIdDisplay}</div>
             
              
              <div className="mt-4">
                <img 
                  src={stockOutService.getBarCodeUrlImage(transactionId)} 
                  alt="Barcode" 
                  className="h-12 mx-auto object-contain"
                />
              </div>

              <div className="print-divider"></div>
              <div className="font-bold">Thank You For Your Business!</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoiceComponent;