import React, { useEffect, useState } from 'react';
import stockOutService from '../../../services/stockOutService';
import Swal from 'sweetalert2';

const InvoiceComponent = ({ isOpen, onClose, transactionId }) => {
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({
    email: false,
    pdf: false
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

  // Get user info from invoiceData
  const getUserInfo = () => {
    if (!invoiceData || invoiceData.length === 0) {
      return {
        name: 'Unknown User',
        email: 'N/A',
        title: 'Staff',
        role: 'unknown'
      };
    }

    const firstItem = invoiceData[0];
    
    if (firstItem.admin) {
      return {
        name: firstItem.admin.adminName,
        email: firstItem.admin.adminEmail,
        title: 'Administrator',
        role: 'admin'
      };
    }
    
    if (firstItem.employee) {
      return {
        name: `${firstItem.employee.firstname} ${firstItem.employee.lastname}`,
        email: firstItem.employee.email,
        title: 'Employee',
        role: 'employee'
      };
    }

    return {
      name: 'Unknown User',
      email: 'N/A',
      title: 'Staff',
      role: 'unknown'
    };
  };

  const userInfo = getUserInfo();

  // Extract client info from the first invoice item
  const clientInfo = invoiceData?.length > 0 ? {
    clientName: invoiceData[0].clientName || 'N/A',
    clientEmail: invoiceData[0].clientEmail || 'N/A',
    clientPhone: invoiceData[0].clientPhone || 'N/A'
  } : {
    clientName: 'N/A',
    clientEmail: 'N/A',
    clientPhone: 'N/A'
  };

  // Calculate totals
  const subtotal = invoiceData?.reduce((sum, item) => sum + item.soldPrice, 0) || 0;
  const vatRate = 0.05; // 5% VAT
  const vat = subtotal * vatRate;
  const total = subtotal + vat;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Million', 'Billion'];

    if (num === 0) return 'Zero';

    const convertHundreds = (n) => {
      let result = '';
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + ' ';
        return result;
      }
      if (n > 0) {
        result += ones[n] + ' ';
      }
      return result;
    };

    let result = '';
    let thousandIndex = 0;
    
    while (num > 0) {
      if (num % 1000 !== 0) {
        result = convertHundreds(num % 1000) + thousands[thousandIndex] + ' ' + result;
      }
      num = Math.floor(num / 1000);
      thousandIndex++;
    }
    
    return 'Dollar ' + result.trim();
  };

  // Handle close with confirmation
  const handleClose = () => {
    Swal.fire({
      title: 'Close Invoice?',
      text: 'Are you sure you want to close this invoice? Any unsaved changes will be lost.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, close it',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        onClose();
      }
    });
  };

  // Handle email sending
  const handleSendEmail = async () => {
    setActionLoading(prev => ({ ...prev, email: true }));
    
    try {
      // Simulate API call - replace with your actual email service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Swal.fire({
        icon: 'success',
        title: 'Email Sent!',
        text: `Invoice has been sent to ${clientInfo.clientEmail}`,
        confirmButtonColor: '#10b981',
        timer: 3000,
        timerProgressBar: true
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Failed to Send Email',
        text: 'Please try again later.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, email: false }));
    }
  };

  // Handle PDF generation
  const handleGeneratePDF = async () => {
    setActionLoading(prev => ({ ...prev, pdf: true }));
    
    try {
      // Simulate PDF generation - replace with your actual PDF service
      await new Promise(resolve => setTimeout(resolve, 1500));
      let old_title = document.title
      document.title = `Invoice-${transactionId}, on ${new Date().toDateString()}`
      window.print()
      document.title = old_title
      
      Swal.fire({
        icon: 'success',
        title: 'PDF Generated!',
        text: 'Invoice PDF has been downloaded successfully.',
        confirmButtonColor: '#3b82f6',
        timer: 3000,
        timerProgressBar: true
      });
    } catch (error) {
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

  // Get transaction ID and creation date from first item
  const transactionIdDisplay = invoiceData?.[0]?.transactionId || 'N/A';
  const createdAt = invoiceData?.[0]?.createdAt || new Date().toISOString();

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
<div className="
  fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4
  print:static print:bg-white print:p-0 print:z-0 print:block
">

      <div className="
  bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto
  print:max-h-full print:rounded-none print:shadow-none print:overflow-visible print:w-full
">

        {/* Action Bar */}
       <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg print:hidden">

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Invoice #{transactionIdDisplay}</h2>
            <div className="flex gap-3">
              {/* Email Button */}
              <button 
                onClick={handleSendEmail}
                disabled={actionLoading.email || actionLoading.pdf}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center gap-2 shadow-lg"
              >
                {actionLoading.email ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Email
                  </>
                )}
              </button>

              {/* PDF Button */}
              <button 
                onClick={handleGeneratePDF}
                disabled={actionLoading.email || actionLoading.pdf}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center gap-2 shadow-lg"
              >
                {actionLoading.pdf ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Save PDF
                  </>
                )}
              </button>

              {/* Close Button */}
              <button 
                onClick={handleClose}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center gap-2 shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Invoice Content */}
      <div
  id="print-section"
  className="p-8 bg-white font-sans print:p-0 print:mt-0 print:break-inside-avoid"
>

          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl mr-4">
                {userInfo.role === 'admin' ? 'A' : userInfo.role === 'employee' ? 'E' : 'U'}
              </div>
              <div className=" print:block text-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Aby Intentory Managament</h1>
                <p className="text-sm text-gray-600">Sales & Inventory Management</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-orange-500 text-white px-3 py-1 rounded text-sm font-semibold mb-2">
                INVOICE
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-semibold">Invoice No #{transactionIdDisplay}</p>
                <p>Created Date: {formatDate(createdAt)}</p>
                <p>Due Date: {formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))}</p>
              </div>
            </div>
          </div>

          {/* Company Address */}
          <div className="mb-8">
            <p className="text-gray-600">Nyakabanda, KN 3 Rd, Kigali</p>
          </div>

          {/* From and To Section */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">From</h3>
              <div className="text-gray-700">
                <p className="font-semibold text-lg">{userInfo.name}</p>
                <p className="text-sm">456 Office Avenue, Business District, State 67890</p>
                <p className="text-sm">Email: {userInfo.email}</p>
                <p className="text-sm">Phone: +1 555 123 4567</p>
                <p className="text-sm text-blue-600 font-medium">{userInfo.title}</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">To</h3>
              <div className="text-gray-700">
                <p className="font-semibold text-lg">{clientInfo.clientName}</p>
                <p className="text-sm">Customer Address</p>
                <p className="text-sm">Email: {clientInfo.clientEmail}</p>
                <p className="text-sm">Phone: {clientInfo.clientPhone}</p>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-gray-700">
                <span className="font-semibold">Invoice For:</span> Product Sales Transaction
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-2">Payment Status</p>
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                Pending
              </span>
              <div className="mt-2">
                <div className="w-16 h-16 bg-gray-200 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <span className="text-xs text-gray-500">QR</span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Product Description</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Qty</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Unit Price</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-3 px-4 text-gray-700">
                      {item.stockin?.product?.productName || 'Product'}
                    
                    </td>
                    <td className="py-3 px-4 text-center text-gray-700">{item.quantity}</td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {formatCurrency(item.soldPrice / item.quantity)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700 font-semibold">
                      {formatCurrency(item.soldPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-8">
            <div className="w-80">
              <div className="flex justify-between py-2">
                <span className="text-gray-700">Sub Total</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-700">VAT (5%)</span>
                <span className="font-semibold">{formatCurrency(vat)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="flex justify-between py-2">
                  <span className="text-lg font-bold text-gray-800">Total Amount</span>
                  <span className="text-lg font-bold text-gray-800">{formatCurrency(total)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Amount in Words: {numberToWords(Math.floor(total))}
                </p>
              </div>
            </div>
          </div>

          {/* Terms and Signature */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Terms and Conditions</h4>
              <p className="text-sm text-gray-600 mb-4">
                Please pay within 15 days from the date of invoice, overdue interest @ 14% will be charged on delayed payments.
              </p>
              
              <h4 className="font-semibold text-gray-800 mb-2">Notes</h4>
              <p className="text-sm text-gray-600">
                Please quote invoice number when remitting funds. Thank you for your business!
              </p>
            </div>
            
            <div className="text-right">
              <div className="mb-16">
                <div className="w-32 h-16 ml-auto mb-2 flex items-end justify-center">
                  <div className="text-2xl font-script text-gray-600">Signature</div>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-800">{userInfo.name}</p>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceComponent;