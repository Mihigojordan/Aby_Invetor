import React, { useEffect, useState } from 'react';
import stockOutService from '../../../services/stockoutService';
import Swal from 'sweetalert2';
import CompanyLogo from '../../../assets/images/applogo_rm_bg.png'

const InvoiceComponent = ({ isOpen, onClose, transactionId }) => {
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({
    print: false
  });

  useEffect(() => {
    const getInvoiceData = async () => {
      try {
        setLoading(true);
        const response = await stockOutService.getStockOutByTransactionId(transactionId);
        setInvoiceData(response);
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
  const total = invoiceData?.reduce((sum, item) => sum + item.soldPrice, 0) || 0;

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
                    <span>{item.quantity}x{formatCurrency(item.soldPrice / item.quantity)}</span>
                    <span className="font-bold">{formatCurrency(item.soldPrice)}</span>
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