import React, { useEffect, useState } from 'react';
import stockOutService from '../../../services/stockoutService';
import Swal from 'sweetalert2';
import CompanyLogo from '../../../assets/images/applogo_rm_bg.png'
import signature from '../../../assets/images/signature.webp'
import html2pdf from 'html2pdf.js';

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
        title: '',
        role: 'unknown'
      };
    }



    return {
      name: 'Umusingi Hardware',
      email: 'umusingihardware7@gmail.com',
      title: '',
      phone: '+250 787 487 953',
      role: 'unknown'
    };
  };

  const userInfo = getUserInfo();

  const companyInfo = {
    logo: CompanyLogo,
    companyName: 'Umusingi Hardware',
    companyAddress: 'Nyamata ,Bugesera , Rwanda',


  }

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
  const total = subtotal ;

  'ABTR34665'

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF'
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

    return result.trim() + ' RWANDA FRANCS ';
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
    // eslint-disable-next-line no-unused-vars
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

  // Handle PDF generation with html2pdf.js
  const handleGeneratePDF = async () => {
    setActionLoading(prev => ({ ...prev, pdf: true }));

    try {
      const element = document.getElementById('print-section');

      if (!element) {
        throw new Error('Print section not found');
      }

      // Configure html2pdf options
      const options = {
        margin: [10, 10, 10, 10],
        filename: `Invoice-${transactionId}-${new Date().toDateString()}.pdf`,
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

      // Generate and download PDF
      await html2pdf().set(options).from(element).save();

      Swal.fire({
        icon: 'success',
        title: 'PDF Generated!',
        text: 'Invoice PDF has been downloaded successfully.',
        confirmButtonColor: '#3b82f6',
        timer: 3000,
        timerProgressBar: true
      });
    // eslint-disable-next-line no-unused-vars
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Action Bar */}
        <div className="sticky z-40 top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Invoice #{transactionIdDisplay}</h2>
            <div className="flex gap-3">
              {/* Email Button */}
              {/*               
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
              */}

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
          className="p-8 bg-white font-sans"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex flex-col">
              <img
                src={companyInfo.logo}
                className="  w-44 h-44 scale-125 flex items-center justify-center font-bold text-xl mr-4"
              />

              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-800">{companyInfo.companyName}</h1>
                <p className="text-sm text-gray-600">{companyInfo.companyAddress}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-blue-500 text-white px-3 py-2 flex justify-end rounded text-sm font-semibold mb-2">
                <p>INVOICE</p>
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-semibold">Invoice No #{transactionIdDisplay}</p>
                <p>Due Date: {formatDate(createdAt)}</p>
              </div>
            </div>
          </div>

          {/* From and To Section */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div>
              <h3 className="font-semibold  text-gray-800 mb-2">From</h3>
              <div className="text-gray-700">
                <p className="font-semibold text-lg">{userInfo.name}</p>
                <p className="text-sm">Email: {userInfo.email}</p>
                <p className="text-sm">Phone: {userInfo.phone}</p>
                <p className="text-sm text-blue-600 font-medium">{userInfo.title}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">To</h3>
              <div className="text-gray-700">
                <p className="font-semibold text-lg">{clientInfo.clientName}</p>
                <p className="text-sm">Email: {clientInfo.clientEmail}</p>
                <p className="text-sm">Phone: {clientInfo.clientPhone}</p>
              </div>
            </div>


            <div className="flex items-center">
              <img src={stockOutService.getBarCodeUrlImage(transactionId)} className='h-20 object-contain' alt="" />
            </div>
          </div>

          {/* Payment Status */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-gray-700">
                <span className="font-semibold">Invoice For:</span> Product Sales Transaction
              </p>
            </div>


          </div>

          {/* Invoice Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
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
            
             
              <div className="   pt-2 mt-2">
                <div className="flex border-b border-gray-300 justify-between py-2">
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
            <div className=''>
            </div>

            <div className="text-right">

              <div className='flex items-end flex-col'>

              
                <p className="font-semibold text-lg capitalize text-gray-800">{userInfo.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceComponent;