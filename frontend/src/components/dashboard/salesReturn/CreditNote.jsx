import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import html2pdf from 'html2pdf.js';
import salesReturnService from '../../../services/salesReturnService';
import CompanyLogo from '../../../assets/images/applogo_rm_bg.png'
import stockOutService from '../../../services/stockoutService';
import { useNetworkStatusContext } from '../../../context/useNetworkContext';
import { db } from '../../../db/database';

const CreditNoteComponent = ({ isOpen, onClose, salesReturnId }) => {
  const [creditNoteData, setCreditNoteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({
    email: false,
    pdf: false,
    print: false
  });

  const {isOnline} = useNetworkStatusContext()

  useEffect(() => {
    if (isOpen && salesReturnId) {
      if(isOnline){
        getCreditNoteData();
      }else{
        loadSalesReturns()
      }
    }
  }, [salesReturnId, isOpen]);

  const getCreditNoteData = async () => {
    try {
      setLoading(true);
      const response = await salesReturnService.getSalesReturnById(salesReturnId)
      setCreditNoteData(response.data);
    } catch (error) {
      console.log(error.message);
      await loadSalesReturns()
    } finally {
      setLoading(false);
    }
  };

  const loadSalesReturns = async () => {
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
        .sort((a, b) => new Date(b.createdAt || b.lastModified) - new Date(a.createdAt || a.lastModified))
        .find(s=> s.id== salesReturnId || s.localId == salesReturnId);

      console.warn(combinedSalesReturns);

      setCreditNoteData(combinedSalesReturns)
    } catch (error) {
      console.error('Error loading sales returns:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error Loading Credit Note',
        text: 'Failed to load credit note data. Please try again.',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStockOuts = async () => {
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
        })));

      return combinedStockOuts;
    } catch (error) {
      console.error('Error loading offline transaction details:', error);
      setError('Failed to load transaction details');
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

  // Get user info (same as invoice)
  const getUserInfo = () => {
    return {
      name: 'Sadiki Rukara',
      email: 'umusingihardware7@gmail.com',
      title: '',
      phone: '250 787487953',
      role: 'unknown'
    };
  };

  const userInfo = getUserInfo();

  const companyInfo = {
    logo: CompanyLogo,
    companyName: 'UMUSINGI HARDWARE',
    address: 'NYAMATA, BUGESERA',
    phone: '+250 787 487 953',
    email: 'umusingihardware7@gmail.com'
  };

  // Extract client info from the first invoice item
  const clientInfo = creditNoteData?.items?.length > 0 ? {
    clientName: creditNoteData.items[0].stockout?.clientName || 'WALK-IN CUSTOMER',
    clientPhone: creditNoteData.items[0].stockout?.clientPhone || 'N/A'
  } : {
    clientName: 'WALK-IN CUSTOMER',
    clientPhone: 'N/A'
  };

  // Calculate totals
  const total = creditNoteData?.items?.reduce((sum, item) => sum + item.stockout.soldPrice, 0) || 0;
  const itemCount = creditNoteData?.items?.length || 0;

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

  // Handle PDF generation
  const handleGeneratePDF = async () => {
    setActionLoading(prev => ({ ...prev, pdf: true }));

    try {
      const element = document.getElementById('credit-note-print-section');

      if (!element) {
        throw new Error('Print section not found');
      }

      const options = {
        margin: [10, 10, 10, 10],
        filename: `Credit-Note-${creditNoteData?.creditnoteId}-${new Date().toDateString()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          letterRendering: true
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        }
      };

      await html2pdf().set(options).from(element).save();

      Swal.fire({
        icon: 'success',
        title: 'PDF Generated!',
        text: 'Credit Note PDF has been downloaded successfully.',
        confirmButtonColor: '#3b82f6',
        timer: 3000,
        timerProgressBar: true
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Failed to Generate PDF',
        text: 'Please try again later.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  const creditNoteId = creditNoteData?.creditnoteId || salesReturnId;
  const createdAt = creditNoteData?.createdAt || new Date().toISOString();
  const transactionId = creditNoteData?.transactionId || 'N/A';

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
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Credit Note</h3>
            <p className="text-gray-600">Please wait while we fetch your credit note data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!creditNoteData || !creditNoteData.items || creditNoteData.items.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-neutral-500 text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Credit Note Data</h3>
            <p className="text-gray-600 mb-4">Unable to load credit note information.</p>
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
          #print-credit-note, #print-credit-note * {
            visibility: visible;
          }
          #print-credit-note {
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
          <div className="no-print sticky top-0 bg-gradient-to-r from-neutral-600 to-orange-600 text-white p-4 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Credit Note #{creditNoteId}</h2>
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
                  onClick={handleGeneratePDF}
                  disabled={actionLoading.pdf}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-semibold transition-all flex items-center gap-1"
                >
                  {actionLoading.pdf ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PDF
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

          {/* Credit Note Content */}
          <div id="print-credit-note" className="p-6 bg-white font-mono text-sm">
            <div id="credit-note-print-section">
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

              {/* Credit Note Type */}
              <div className="text-center mb-4">
                <div className="font-bold text-base text-neutral-600">CREDIT NOTE</div>
                <div className="text-xs">Return Transaction</div>
              </div>

              <div className="print-divider"></div>

              {/* Transaction Info */}
              <div className="mb-4 text-xs">
                <div>CLIENT NAME: {clientInfo.clientName}</div>
                {clientInfo.clientPhone !== 'N/A' && (
                  <div>CLIENT PHONE: {clientInfo.clientPhone}</div>
                )}
                <div>RETURN REASON: {creditNoteData.reason}</div>
              </div>

              <div className="print-divider"></div>

              {/* Items */}
              <div className="mb-4">
                {creditNoteData.items.map((item, index) => (
                  <div key={item.id || item.localId} className="mb-3 text-xs">
                    <div className="font-semibold">
                      {item.stockout?.stockin?.product?.productName || item.stockout?.backorder?.productName || `ITEM ${index + 1}`}
                    </div>
                    <div className="flex justify-between">
                      <span>{item.quantity}x{formatCurrency(item.stockout.soldPrice / item.quantity)}</span>
                      <span className="font-bold text-neutral-600">-{formatCurrency(item.stockout.soldPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="print-divider"></div>

              {/* Totals */}
              <div className="mb-4">
                <div className="flex justify-between font-bold text-base text-neutral-600">
                  <span>TOTAL CREDIT</span>
                  <span>-{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>REFUND AMOUNT</span>
                  <span className="text-neutral-600">-{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="print-divider"></div>

              {/* Footer Info */}
              <div className="text-xs text-center">
                <div>ITEM COUNT: {itemCount}</div>
                <div className="print-divider"></div>
                <div>CREDIT NOTE INFORMATION</div>
                <div>Date: {formatDate(createdAt)} Time: {formatTime(createdAt)}</div>
                <div>CREDIT NOTE ID: {creditNoteId}</div>
                <div>ORIGINAL TRANSACTION: {transactionId}</div>
                
                <div className="mt-4">
                  <img 
                    src={stockOutService.getBarCodeUrlImage(transactionId)} 
                    alt="Barcode" 
                    className="h-12 mx-auto object-contain"
                  />
                </div>

                <div className="print-divider"></div>
                <div className="font-bold">Thank You For Your Understanding!</div>
                <div className="text-xs mt-2">This credit note confirms the return of goods</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreditNoteComponent;