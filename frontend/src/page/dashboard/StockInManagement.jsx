
import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Package, DollarSign, Hash, User, Check, AlertTriangle, Barcode, Calendar, Eye, RefreshCw, ChevronLeft, ChevronRight, Printer, Wifi, WifiOff } from 'lucide-react';

import productService from '../../services/productService';
import UpsertStockInModal from '../../components/dashboard/stockin/UpsertStockInModel';
import DeleteStockInModal from '../../components/dashboard/stockin/DeleteStockInModel';
import ViewStockInModal from '../../components/dashboard/stockin/ViewStockInModal';
import { API_URL } from '../../api/api';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';
import stockOutService from '../../services/stockoutService';
import  stockInService from '../../services/stockinService'
import { db } from '../../db/database';
import { useStockInOfflineSync } from '../../hooks/useStockInOfflineSync';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useNetworkStatusContext } from '../../context/useNetworkContext';

// Barcode Service Class
class BarcodeService {
  constructor() {
    this.API_URL = API_URL || 'http://localhost:3000';
  }

  // Generate print-ready barcode HTML for a single item
  generateBarcodeHTML(stockItem) {
    return `
      <div style="
        width: 4in; 
        height: 2in; 
        padding: 0.25in; 
        margin: 0; 
        page-break-after: always;
        border: 1px solid #000;
        font-family: Arial, sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      ">
        <div style="text-align: center; margin-bottom: 0.1in;">
          <h3 style="margin: 0 0 0.05in 0; font-size: 12px; font-weight: bold;">
            ${stockItem.product?.productName || 'Product'}
          </h3>
          <p style="margin: 0; font-size: 10px; color: #666;">
            SKU: ${stockItem.sku}
          </p>
        </div>
        
        <div style="margin: 0.1in 0;">
          <img 
            src="${this.API_URL}${stockItem.barcodeUrl}" 
            alt="Barcode" 
            style="height: 0.8in; max-width: 3in; object-fit: contain;"
            onload="this.style.display='block'"
            onerror="this.style.display='none'"
          />
        </div>
        
        <div style="text-align: center; font-size: 10px;">
          <p style="margin: 0 0 0.02in 0;">Price: $${stockItem.sellingPrice?.toFixed(2)}</p>
          <p style="margin: 0; font-weight: bold;">${stockItem.sku}</p>
        </div>
      </div>
    `;
  }

  // Generate HTML for multiple barcodes
  generateMultipleBarcodeHTML(stockItems) {
    const barcodeHTMLs = stockItems.map(item => this.generateBarcodeHTML(item));
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Print</title>
          <style>
            @page {
              size: 4in 2in;
              margin: 0;
            }
            
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
            
            .print-container {
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${barcodeHTMLs.join('')}
          </div>
          
          <script>
            // Auto-print when page loads
            window.onload = function() {
              // Wait for images to load
              const images = document.querySelectorAll('img');
              let loadedImages = 0;
              
              if (images.length === 0) {
                setTimeout(() => window.print(), 500);
                return;
              }
              
              images.forEach(img => {
                if (img.complete) {
                  loadedImages++;
                } else {
                  img.onload = () => {
                    loadedImages++;
                    if (loadedImages === images.length) {
                      setTimeout(() => window.print(), 500);
                    }
                  };
                  img.onerror = () => {
                    loadedImages++;
                    if (loadedImages === images.length) {
                      setTimeout(() => window.print(), 500);
                    }
                  };
                }
              });
              
              if (loadedImages === images.length) {
                setTimeout(() => window.print(), 500);
              }
              
              // Fallback timeout
              setTimeout(() => window.print(), 3000);
            };
          </script>
        </body>
      </html>
    `;
  }

  // Print barcodes using window.print()
  async printBarcodes(stockItems) {
    if (!Array.isArray(stockItems)) {
      stockItems = [stockItems];
    }

    try {
      // Wait for barcode images to be generated (give server time)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const printHTML = this.generateMultipleBarcodeHTML(stockItems);
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for barcode printing.');
      }

      printWindow.document.write(printHTML);
      printWindow.document.close();
      
      return true;
    } catch (error) {
      console.error('Error printing barcodes:', error);
      throw error;
    }
  }

  // Alternative: Print using iframe (more reliable for some browsers)
  async printBarcodesViaIframe(stockItems) {
    if (!Array.isArray(stockItems)) {
      stockItems = [stockItems];
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const printHTML = this.generateMultipleBarcodeHTML(stockItems);
      
      // Create invisible iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-1000px';
      iframe.style.left = '-1000px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(printHTML);
      doc.close();

      // Wait for content to load then print
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.print();
          // Remove iframe after printing
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      };

      return true;
    } catch (error) {
      console.error('Error printing barcodes via iframe:', error);
      throw error;
    }
  }

  // Print individual barcode
  async printSingleBarcode(stockItem) {
    return this.printBarcodes([stockItem]);
  }
}

const barcodeService = new BarcodeService();

// Print Barcode Button Component
const PrintBarcodeButton = ({ stockItems, onPrint, showNotification }) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    if (!stockItems || stockItems.length === 0) {
      showNotification('No items to print', 'warning');
      return;
    }

    setIsPrinting(true);
    try {
      await barcodeService.printBarcodes(stockItems);
      showNotification(`Printing ${stockItems.length} barcode(s)...`, 'success');
      if (onPrint) onPrint();
    } catch (error) {
      console.error('Print failed:', error);
      showNotification(`Print failed: ${error.message}`, 'error');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <button
      onClick={handlePrint}
      disabled={isPrinting || !stockItems || stockItems.length === 0}
      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPrinting ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Printing...
        </>
      ) : (
        <>
          <Printer size={16} />
          Print Barcodes
        </>
      )}
    </button>
  );
};

const StockInManagement = ({ role }) => {
  const [stockIns, setStockIns] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredStockIns, setFilteredStockIns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStockIn, setSelectedStockIn] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const { isOnline } = useNetworkStatusContext();
  const { user: employeeData } = useEmployeeAuth();
  const { user: adminData } = useAdminAuth();
  const { triggerSync, syncError } = useStockInOfflineSync();
  

  const [itemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  const [recentlyAddedItems, setRecentlyAddedItems] = useState([]);
      

  useEffect(() => {
    console.log('Starting loadData');
    loadData();
    if (isOnline) handleManualSync()
  }, [isOnline]);

  
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
      if(!error?.response){
        return await db.products_all.toArray();
      }
      
    }
  };

    const loadData = async () => {
      setIsLoading(true);
      try {
        const productData = await fetchProducts();
        setProducts(productData);

        if (isOnline) await triggerSync();

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
            product: productData.find(p => p.id === a.productId ||  p.localId === a.productId) || { productName: 'Unknown Product' }
          }))) .sort((a, b) => a.synced - b.synced);

        setStockIns(combinedStockIns);
        setFilteredStockIns(combinedStockIns);
        if (!isOnline && combinedStockIns.length === 0) {
          showNotification('No offline data available', 'error');
        }
      } catch (error) {
        console.error('Error loading stock-ins:', error);
        showNotification('Failed to load stock-ins', 'error');
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    if (syncError) {
      showNotification(`Sync status error: ${syncError}`, 'error');
    }
  }, [syncError]);

  useEffect(() => {
    const filtered = (stockIns || []).filter(stockIn =>
      stockIn.product?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockIn.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockIn.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStockIns(filtered);
    setCurrentPage(1);
  }, [searchTerm, stockIns]);

  const totalPages = Math.ceil((filteredStockIns || []).length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = (filteredStockIns || []).slice(startIndex, endIndex);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddStockIn = async (stockInData) => {
    setIsLoading(true);
    try {
      if (!adminData?.id && !employeeData?.id) {
        throw new Error('User authentication required');
      }

      const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      const now = new Date();

      if (stockInData.purchases && Array.isArray(stockInData.purchases)) {
        const purchases = stockInData.purchases.map(purchase => ({
          ...purchase,
          ...userData,
          lastModified: now,
          createdAt: now,
          updatedAt: now
        }));

        const localIds = [];
        for (const purchase of purchases) {
          const localId = await db.stockins_offline_add.add(purchase);
          localIds.push(localId);
        }

        if (isOnline) {
          try {
            const response = await stockInService.createMultipleStockIn(purchases, userData);
            await db.transaction('rw', db.stockins_all, db.stockins_offline_add, db.synced_stockin_ids, async () => {
              for (let i = 0; i < response.stockIn.data.length; i++) {
                const serverStockIn = response.stockIn.data[i];
                await db.stockins_all.put({
                  id: serverStockIn.id,
                  productId: serverStockIn.productId,
                  quantity: serverStockIn.quantity,
                  price: serverStockIn.price,
                  sellingPrice: serverStockIn.sellingPrice,
                  supplier: serverStockIn.supplier,
                  sku: serverStockIn.sku,
                  barcodeUrl: serverStockIn.barcodeUrl,
                  lastModified: now,
                  updatedAt: serverStockIn.updatedAt || now
                });
                await db.synced_stockin_ids.add({
                  localId: localIds[i],
                  serverId: serverStockIn.id,
                  syncedAt: now
                });
                await db.stockins_offline_add.delete(localIds[i]);
              }
            });
            showNotification(`Successfully added ${purchases.length} stock entries (${purchases.reduce((sum, p) => sum + p.quantity, 0)} total items)!`);
          } catch (error) {
            showNotification('Stock entries saved offline (will sync when online)', 'warning');
          }
        } else {
          showNotification('Stock entries saved offline (will sync when online)', 'warning');
        }
      } else {
        const newStockIn = {
          ...stockInData,
          ...userData,
          lastModified: now,
          createdAt: now,
          updatedAt: now
        };

        if (!newStockIn.productId || !newStockIn.quantity || !newStockIn.price || !newStockIn.sellingPrice) {
          throw new Error('Missing required fields');
        }

        const localId = await db.stockins_offline_add.add(newStockIn);
        const savedStockIn = { ...newStockIn, localId, synced: false };

        if (isOnline) {
          try {
            const response = await stockInService.createStockIn(newStockIn);
            await db.transaction('rw', db.stockins_all, db.stockins_offline_add, db.synced_stockin_ids, async () => {
              const serverStockInId = response.stockIn.data?.[0]?.id || response.id;
              await db.stockins_all.put({
                id: serverStockInId,
                productId: newStockIn.productId,
                quantity: newStockIn.quantity,
                price: newStockIn.price,
                sellingPrice: newStockIn.sellingPrice,
                supplier: newStockIn.supplier,
                sku: response.stockIn.data?.[0]?.sku,
                barcodeUrl: response.stockIn.data?.[0]?.barcodeUrl,
                lastModified: now,
                updatedAt: response.updatedAt || now
              });
              await db.synced_stockin_ids.add({
                localId: localId,
                serverId: serverStockInId,
                syncedAt: now
              });
              await db.stockins_offline_add.delete(localId);
            });
            showNotification(`Stock entry added successfully (${newStockIn.quantity} items)!`);
          } catch (error) {
            showNotification('Stock entry saved offline (will sync when online)', 'warning');
          }
        } else {
          showNotification('Stock entry saved offline (will sync when online)', 'warning');
        }
      }

      await loadData();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding stock-in:', error);
      let errorMessage = 'Failed to add stock entry';
      if (error.message.includes('required')) {
        errorMessage = 'Please fill in all required fields';
      } else if (error.message.includes('authentication')) {
        errorMessage = 'Please log in again';
      } else {
        errorMessage = `Failed to add stock entry: ${error.message}`;
      }
      showNotification(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStockIn = async (stockInData) => {
    setIsLoading(true);
    try {
      const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      const now = new Date();
      const updatedData = {
        id: selectedStockIn.id,
        quantity: stockInData.quantity,
        price: stockInData.price,
        sellingPrice: stockInData.sellingPrice,
        supplier: stockInData.supplier,
        ...userData,
        lastModified: now,
        updatedAt: now
      };

      if (isOnline) {
        try {
          await stockInService.updateStockIn(selectedStockIn.id, updatedData);
          await db.transaction('rw', db.stockins_all, db.stockins_offline_update, async () => {
            await db.stockins_all.put({
              id: selectedStockIn.id,
              productId: selectedStockIn.productId,
              quantity: updatedData.quantity,
              price: updatedData.price,
              sellingPrice: updatedData.sellingPrice,
              supplier: updatedData.supplier,
              sku: selectedStockIn.sku,
              barcodeUrl: selectedStockIn.barcodeUrl,
              lastModified: now,
              updatedAt: now
            });
            await db.stockins_offline_update.delete(selectedStockIn.id);
          });
          showNotification('Stock entry updated successfully!');
        } catch (error) {
          await db.stockins_offline_update.put(updatedData);
          showNotification('Stock entry updated offline (will sync when online)', 'warning');
        }
      } else {
        await db.stockins_offline_update.put(updatedData);
        showNotification('Stock entry updated offline (will sync when online)', 'warning');
      }

      await loadData();
      setIsEditModalOpen(false);
      setSelectedStockIn(null);
    } catch (error) {
      console.error('Error updating stock-in:', error);
      showNotification(`Failed to update stock entry: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async (stockInData) => {
    setIsLoading(true);
    try {
      const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      if (isOnline && selectedStockIn.id) {
        await stockInService.deleteStockIn(selectedStockIn.id);
        await db.transaction('rw', db.stockins_all, db.stockins_offline_delete, async () => {
          await db.stockins_all.delete(selectedStockIn.id);
          await db.stockins_offline_delete.delete(selectedStockIn.id);
        });
        showNotification('Stock entry deleted successfully!');
      } else if (selectedStockIn.id) {
        await db.stockins_offline_delete.add({
          id: selectedStockIn.id,
          deletedAt: new Date(),
          ...userData
        });
        showNotification('Stock deletion queued (will sync when online)', 'warning');
      } else {
        await db.stockins_offline_add.delete(selectedStockIn.localId);
        showNotification('Stock entry deleted!');
      }

      await loadData();
      setIsDeleteModalOpen(false);
      setSelectedStockIn(null);
    } catch (error) {
      console.error('Error deleting stock-in:', error);
      showNotification(`Failed to delete stock entry: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      showNotification('No internet connection', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await triggerSync();
      await loadData();
      showNotification('Sync completed successfully!');
    } catch (error) {
      showNotification('Sync failed due to network error—will retry automatically.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = (item) => {
    const imgUrl = stockOutService.getBarCodeUrlImage(item.sku);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    let barcodeImages = "";
    for (let i = 0; i < item.quantity; i++) {
      barcodeImages += `<div class="barcode"><img src="${imgUrl}" alt="Barcode" /></div>`;
    }

    iframeDoc.write(`
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            body {
              display: grid;
              grid-template-columns: repeat(1, 1fr);
              gap: 20px;
              padding: 20px;
              margin: 0;
            }
            .barcode {
              display: flex;
              justify-content: center;
              align-items: center;
              border: 1px dashed #ccc;
              padding: 10px;
            }
            img {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          ${barcodeImages}
        </body>
      </html>
    `);
    iframeDoc.close();

    const images = iframeDoc.querySelectorAll("img");
    let loadedCount = 0;

    images.forEach((img) => {
      img.onload = () => {
        loadedCount++;
        if (loadedCount === images.length) {
          iframe.contentWindow.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        }
      };
      img.onerror = () => {
        showNotification("Failed to load barcode image", "error");
        document.body.removeChild(iframe);
      };
    });
  };

  const openEditModal = (stockIn) => {
    setSelectedStockIn(stockIn);
    setIsEditModalOpen(true);
  };

  const openViewModal = (stockIn) => {
    setSelectedStockIn(stockIn);
    setIsViewModalOpen(true);
  };

  const openDeleteModal = (stockIn) => {
    setSelectedStockIn(stockIn);
    setIsDeleteModalOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RWF' }).format(price);
  };

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

  // Print individual barcode from table/card
  const handlePrintSingleBarcode = async (stockIn) => {
    try {
      const stockWithProduct = {
        ...stockIn,
        product: stockIn.product || { productName: 'Unknown Product' }
      };
      await barcodeService.printSingleBarcode(stockWithProduct);
      showNotification('Printing barcode...', 'success');
    } catch (error) {
      showNotification(`Print failed: ${error.message}`, 'error');
    }
  };

  // Pagination Component
  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, (filteredStockIns || []).length)} of {(filteredStockIns || []).length} entries
        </p>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${currentPage === 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${currentPage === page ? 'bg-primary-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${currentPage === totalPages ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );

  const CardView = () => (
    <div className="md:hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        {(currentItems || []).map((stockIn) => (
          <div key={stockIn.localId || stockIn.id} className={`bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow ${stockIn.synced ? 'border-gray-200' : 'border-yellow-200 bg-yellow-50'}`}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{stockIn.product?.productName || 'Unknown Product'}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      {!stockIn.synced && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Pending sync</span>
                      )}
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-500">In Stock</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                 
                  <button
                    onClick={() => handlePrint(stockIn)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Print Barcode"
                  >
                    <Printer size={16} />
                  </button>
                  <button
                    onClick={() => openEditModal(stockIn)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(stockIn)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Hash size={14} />
                  <span>Qty: {stockIn.quantity}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign size={14} />
                  <span>Unit Price: {formatPrice(stockIn.price)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign size={14} />
                  <span className="font-medium">Total: {formatPrice(stockIn.price * stockIn.quantity)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign size={14} />
                  <span className="font-medium">Sell Price: {formatPrice(stockIn.sellingPrice)}</span>
                </div>
                {stockIn.supplier && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User size={14} />
                    <span className="truncate">{stockIn.supplier}</span>
                  </div>
                )}
              </div>
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">SKU & Barcode</div>
                {stockIn.sku && (
                  <div className="flex items-center gap-2 mb-2">
                    <Barcode size={14} className="text-gray-500" />
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{stockIn.sku}</span>
                  </div>
                )}
                {stockIn.barcodeUrl && (
                  <img src={`${API_URL}${stockIn.barcodeUrl}`} alt="Barcode" className="h-8 object-contain" />
                )}
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} />
                  <span>Added {formatDate(stockIn.createdAt || stockIn.lastModified)}</span>
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

  const TableView = () => (
    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sell Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(currentItems || []).map((stockIn, index) => (
              <tr key={stockIn.localId || stockIn.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">{startIndex + index + 1}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white">
                      <Package size={16} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{stockIn.product?.productName || 'Unknown Product'}</div>
                      {!stockIn.synced && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Pending sync</span>
                      )}
                      {stockIn.sku && <div className="text-sm text-gray-500">{stockIn.sku}</div>}
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Hash size={14} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{stockIn.quantity || 0}</span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">{formatPrice(stockIn.price || 0)}</span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-semibold text-primary-600">{formatPrice((stockIn.price * stockIn.quantity) || 0)}</span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-semibold text-primary-600">{formatPrice(stockIn.sellingPrice || 0)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">{formatDate(stockIn.createdAt || stockIn.lastModified)}</span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {/* <button
                      onClick={() => handlePrintSingleBarcode(stockIn)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Print Barcode"
                    >
                      <Printer size={16} />
                    </button> */}
                    <button
                      onClick={() => openViewModal(stockIn)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handlePrint(stockIn)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Print Barcode"
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      onClick={() => openEditModal(stockIn)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(stockIn)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
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

  return (
    <div className="bg-gray-50 p-4 h-[90vh] sm:p-6 lg:p-8">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' : notification.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'} animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}
      <div className="h-full overflow-y-auto mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-600 rounded-lg"><Package className="w-6 h-6 text-white" /></div>
              <h1 className="text-3xl font-bold text-gray-900">Stock In Management</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                {isOnline ? 'Online' : 'Offline'}
              </div>
              {isOnline && (
                <button
                  onClick={handleManualSync}
                  disabled={isLoading}
                  className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-full transition-colors disabled:opacity-50"
                >
                  Sync
                </button>
              )}
            </div>
          </div>
          <p className="text-gray-600">Manage your inventory stock entries and track incoming stock - works offline and syncs when online</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by product, supplier, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
            <div className="flex gap-3">
              {recentlyAddedItems.length > 0 && (
                <PrintBarcodeButton
                  stockItems={recentlyAddedItems}
                  onPrint={() => setRecentlyAddedItems([])}
                  showNotification={showNotification}
                />
              )}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
              >
                <Plus size={20} />
                Add Stock Entry
              </button>
            </div>
          </div>
        </div>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-gray-600 mt-4">Loading stock entries...</p>
          </div>
        ) : (filteredStockIns || []).length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stock entries found</h3>
            <p className="text-gray-600 mb-4">{searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first stock entry.'}</p>
            {!searchTerm && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus size={20} />
                Add Stock Entry
              </button>
            )}
          </div>
        ) : (
          <>
            <CardView />
            <TableView />
          </>
        )}
        <UpsertStockInModal
          isOpen={isAddModalOpen || isEditModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            setSelectedStockIn(null);
          }}
          onSubmit={isEditModalOpen ? handleEditStockIn : handleAddStockIn}
          stockIn={selectedStockIn}
          products={products}
          isLoading={isLoading}
          title={isEditModalOpen ? 'Edit Stock Entry' : 'Add New Stock Entry'}
        />
        <ViewStockInModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedStockIn(null);
          }}
          stockIn={selectedStockIn}
        />
        <DeleteStockInModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedStockIn(null);
          }}
          onConfirm={handleConfirmDelete}
          stockIn={selectedStockIn}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default StockInManagement;