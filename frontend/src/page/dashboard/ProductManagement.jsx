/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Package, Check, AlertTriangle, Wifi, WifiOff, RefreshCw, ChevronLeft, ChevronRight, Calendar, FileText, Eye, RotateCcw, FolderOpen, FileSpreadsheet, Filter, ChevronDown, ArrowUpDown, Table2, Grid3x3, List } from 'lucide-react';

import UpsertProductModal from '../../components/dashboard/product/UpsertProductModal';
import DeleteProductModal from '../../components/dashboard/product/DeleteProductModal';
import productService from '../../services/productService';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/database';
import { useProductOfflineSync } from '../../hooks/useProductOfflineSync';
import categoryService from '../../services/categoryService';
import { useNetworkStatusContext } from '../../context/useNetworkContext';
import useScreenBelow from '../../hooks/useScreenBelow';

const ProductManagement = ({ role }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [sortOrder, setSortOrder] = useState('newest');
  const { isOnline } = useNetworkStatusContext();
  const navigate = useNavigate();
  const { user: employeeData } = useEmployeeAuth();
  const { user: adminData } = useAdminAuth();
  const { triggerSync, syncError } = useProductOfflineSync();
   const isBelow = useScreenBelow();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  useEffect(() => {
    loadProducts();
    if (isOnline) handleManualSync();
  }, [isOnline]);
     useEffect(()=>{
    if(isBelow){
      setViewMode('grid')
    }
    else{
      setViewMode('table')

    }

  },[isBelow])

  const fetchCategories = async () => {
    try {
      if (isOnline) {
        const response = await categoryService.getAllCategories();
        if (response && response.categories) {
          for (const category of response.categories) {
            await db.categories_all.put({
              id: category.id,
              name: category.name,
              description: category.description,
              lastModified: category.lastModified || new Date(),
              updatedAt: category.updatedAt || new Date()
            });
          }
        }
      }
      const allCategories = await db.categories_all.toArray();
      return allCategories;
    } catch (error) {
      if (!error.response) {
        const allCategories = await db.categories_all.toArray();
        return allCategories;
      }
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    if (syncError) {
      showNotification(`Sync status error: ${syncError}`, 'error');
    }
  }, [syncError]);

  useEffect(() => {
    let filtered = products.filter(product =>
      product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(product => new Date(product.createdAt || product.lastModified) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter(product => new Date(product.createdAt || product.lastModified) <= end);
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.lastModified);
      const dateB = new Date(b.createdAt || b.lastModified);
      
      switch(sortOrder) {
        case 'newest':
          return dateB - dateA;
        case 'oldest':
          return dateA - dateB;
        case 'name-asc':
          return (a.productName || '').localeCompare(b.productName || '');
        case 'name-desc':
          return (b.productName || '').localeCompare(a.productName || '');
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, products, sortOrder]);

  useEffect(() => {
    return () => {
      products.forEach(prod => prod.imageUrls?.forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      }));
    };
  }, [products]);

  const loadProducts = async (showRefreshLoader = false) => {
    if (showRefreshLoader) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      if (isOnline) await triggerSync();

      const [allProducts, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
        db.products_all.toArray(),
        db.products_offline_add.toArray(),
        db.products_offline_update.toArray(),
        db.products_offline_delete.toArray()
      ]);

      const categories = await fetchCategories();

      const deleteIds = new Set(offlineDeletes.map(d => d.id));
      const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));

      const combinedProducts = allProducts
        .filter(p => !deleteIds.has(p.id))
        .map(p => ({
          ...p,
          ...updateMap.get(p.id),
          synced: true,
          category: categories.find(cat => cat.id == p.categoryId)
        }))
        .concat(offlineAdds.map(a => ({
          ...a,
          synced: false,
          category: categories.find(cat => cat.id == a.categoryId)
        })))
        .sort((a, b) => a.synced - b.synced);

      const productsWithImages = await Promise.all(combinedProducts.map(async product => {
        const images = await db.product_images
          .where(product.synced && product.id ? '[entityId+entityType]' : '[entityLocalId+entityType]')
          .equals(product.synced && product.id ? [product.id, 'product'] : [product.localId, 'product'])
          .toArray();
        const imageUrls = await Promise.all(images.map(img => img.from === 'local' && img.imageData instanceof Blob ? URL.createObjectURL(img.imageData) : img.imageData));
        return { ...product, imageUrls };
      }));

      setProducts(productsWithImages);
      setFilteredProducts(productsWithImages);
      if (showRefreshLoader) {
        showNotification('Products refreshed successfully!');
      }
      if (!isOnline && productsWithImages.length === 0) {
        showNotification('No offline data available', 'error');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      showNotification('Failed to load products', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleProductSubmit = async (productData) => {
    setIsLoading(true);
    try {
      const validation = productService.validateImages(productData.images);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      const now = new Date();
      const newProduct = {
        ...productData,
        ...userData,
        lastModified: now,
        createdAt: now,
        updatedAt: now
      };

      const localId = await db.products_offline_add.add(newProduct);

      if (productData.images?.length > 0) {
        for (const file of productData.images) {
          await db.product_images.add({
            entityLocalId: localId,
            entityId: null,
            entityType: 'product',
            imageData: file,
            synced: false,
            from: 'local',
            createdAt: now,
            updatedAt: now
          });
        }
      }

      if (isOnline) {
        try {
          const response = await productService.createProduct({ ...productData, ...userData });
          await db.products_all.put({
            id: response.product.id,
            productName: productData.productName,
            brand: productData.brand,
            categoryId: productData.categoryId,
            description: productData.description,
            lastModified: now,
            updatedAt: response.product.updatedAt || now
          });
          if (response.product.imageUrls?.length > 0) {
            await db.product_images.where('[entityLocalId+entityType]').equals([localId, 'product']).delete();
            for (const url of response.product.imageUrls) {
              await db.product_images.add({
                entityId: response.product.id,
                entityLocalId: null,
                entityType: 'product',
                imageData: productService.getFullImageUrl(url),
                synced: true,
                from: 'server',
                createdAt: now,
                updatedAt: now
              });
            }
          }
          await db.products_offline_add.delete(localId);
          showNotification('Product added successfully!');
        } catch (error) {
          showNotification('Product saved offline (will sync when online)', 'warning');
        }
      } else {
        showNotification('Product saved offline (will sync when online)', 'warning');
      }

      await loadProducts();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding product:', error);
      showNotification(`Failed to add product: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async (productData) => {
    setIsLoading(true);
    try {
      const validation = productService.validateImages(productData.newImages || []);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      const now = new Date();

      if (!isOnline && productData && productData.localId && !productData.synced) {
        await loadProducts();
        setIsEditModalOpen(false);
        setSelectedProduct(null);
        return;
      }

      const updatedData = {
        id: selectedProduct.id,
        productName: productData.productName,
        brand: productData.brand,
        categoryId: productData.categoryId,
        description: productData.description,
        ...userData,
        lastModified: now,
        updatedAt: now
      };

      if (isOnline) {
        try {
          const response = await productService.updateProduct(selectedProduct.id, { ...productData, ...userData });
          await db.products_all.put({
            id: selectedProduct.id,
            productName: productData.productName,
            brand: productData.brand,
            categoryId: productData.categoryId,
            description: productData.description,
            lastModified: now,
            updatedAt: response.product.updatedAt || now
          });
          await db.products_offline_update.delete(selectedProduct.id);
          await db.product_images.where('[entityId+entityType]').equals([selectedProduct.id, 'product']).delete();
          if (response.product.imageUrls?.length > 0) {
            for (const url of response.product.imageUrls) {
              await db.product_images.add({
                entityId: selectedProduct.id,
                entityLocalId: null,
                entityType: 'product',
                imageData: productService.getFullImageUrl(url),
                synced: true,
                from: 'server',
                createdAt: now,
                updatedAt: now
              });
            }
          }
          showNotification('Product updated successfully!');
        } catch (error) {
          await db.products_offline_update.put(updatedData);
          if (productData.newImages?.length > 0) {
            for (const file of productData.newImages) {
              await db.product_images.add({
                entityId: selectedProduct.id,
                entityLocalId: null,
                entityType: 'product',
                imageData: file,
                synced: false,
                from: 'local',
                createdAt: now,
                updatedAt: now
              });
            }
          }
          showNotification('Product updated offline (will sync when online)', 'warning');
        }
      } else {
        await db.products_offline_update.put(updatedData);
        if (productData.newImages?.length > 0) {
          for (const file of productData.newImages) {
            await db.product_images.add({
              entityId: selectedProduct.id,
              entityLocalId: null,
              entityType: 'product',
              imageData: file,
              synced: false,
              from: 'local',
              createdAt: now,
              updatedAt: now
            });
          }
        }
        showNotification('Product updated offline (will sync when online)', 'warning');
      }

      await loadProducts();
      setIsEditModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);
      showNotification(`Failed to update product: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      if (isOnline && selectedProduct.id) {
        await productService.deleteProduct(selectedProduct.id, userData);
        await db.products_all.delete(selectedProduct.id);
        await db.product_images.where('[entityId+entityType]').equals([selectedProduct.id, 'product']).delete();
        showNotification('Product deleted successfully!');
      } else if (selectedProduct.id) {
        await db.products_offline_delete.add({
          id: selectedProduct.id,
          deletedAt: new Date(),
          ...userData
        });
        showNotification('Product deletion queued (will sync when online)', 'warning');
      } else {
        await db.products_offline_add.delete(selectedProduct.localId);
        await db.product_images.where('[entityLocalId+entityType]').equals([selectedProduct.localId, 'product']).delete();
        showNotification('Product deleted!');
      }

      await loadProducts();
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      showNotification(`Failed to delete product: ${error.message}`, 'error');
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
      await loadProducts();
      showNotification('Sync completed successfully!');
    } catch (error) {
      showNotification('Sync failed due to network error—will retry automatically.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = () => {
    showNotification('Excel export feature coming soon!', 'warning');
  };

  const handleExportPDF = () => {
    showNotification('PDF export feature coming soon!', 'warning');
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsAddModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleDeleteProduct = (product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleViewProduct = (product) => {
    if (!product.id) return;
    if (role === 'admin') {
      navigate(`/admin/dashboard/product/${product.id}`);
    } else if (role === 'employee') {
      navigate(`/employee/dashboard/product/${product.id}`);
    }
  };

  const closeAllModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedProduct(null);
  };

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredProducts.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 4;
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

  const formatDate = dateString => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const getFirstImage = imageUrls => imageUrls?.[0] ? productService.getFullImageUrl(imageUrls[0]) : null;
  const parseDescription = description => {
    try {
      return productService.parseDescription?.(description) || (typeof description === 'string' ? JSON.parse(description).details || description : JSON.stringify(description));
    } catch {
      return description || '';
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const syncedProducts = products.filter(p => p.synced).length;
  const pendingSync = products.filter(p => !p.synced).length;
  const totalCategories = [...new Set(products.map(p => p.categoryId))].length;

  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between p-2 border-gray-200 bg-gray-50">
      <div className="flex items-center gap-2">
        <p className="text-xs text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} entries
        </p>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-3 py-2 text-xs border rounded-md transition-colors ${
              currentPage === 1
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft size={14} />
            Previous
          </button>

          <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 text-xs rounded-md transition-colors ${
                  currentPage === page
                    ? 'bg-primary-600 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1 px-3 py-2 text-xs border rounded-md transition-colors ${
              currentPage === totalPages
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );

  const GridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {currentItems.map((product) => (
        <div
          key={product.localId || product.id}
          className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
            product.synced ? 'border-gray-200' : 'border-yellow-200 bg-yellow-50'
          }`}
        >
          <div className="p-2">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getFirstImage(product.imageUrls) ? (
                  <img
                    src={getFirstImage(product.imageUrls)}
                    alt={product.productName}
                    className="w-10 h-10 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-md"
                  style={{ display: getFirstImage(product.imageUrls) ? 'none' : 'flex' }}
                >
                  {product.productName?.[0] || 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate text-sm" title={product.productName}>
                    {product.productName || 'Unnamed Product'}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${product.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span className="text-xs text-gray-500">
                      {product.synced ? 'Active' : 'Syncing...'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {isOnline && (
                  <button
                    onClick={() => handleViewProduct(product)}
                    className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                    title="View"
                  >
                    <Eye size={14} />
                  </button>
                )}
                <button
                  onClick={() => handleEditProduct(product)}
                  disabled={isLoading}
                  className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-md transition-colors"
                  title="Edit"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleDeleteProduct(product)}
                  disabled={isLoading}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-1 mb-3">
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <FileText size={12} className="mt-0.5" />
                <span>{product.category?.name || 'No category'}</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <Package size={12} className="mt-0.5" />
                <span className="line-clamp-2">{product.brand || 'No brand'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar size={10} />
                <span>Created {formatDate(product.createdAt || product.lastModified)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const ListView = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <ul className="divide-y divide-gray-200">
        {currentItems.map((product, index) => (
          <li
            key={product.localId || product.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {startIndex + index + 1}
              </span>
              {getFirstImage(product.imageUrls) ? (
                <img
                  src={getFirstImage(product.imageUrls)}
                  alt={product.productName}
                  className="w-6 h-6 object-cover rounded-full"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="w-6 h-6 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                style={{ display: getFirstImage(product.imageUrls) ? 'none' : 'flex' }}
              >
                {product.productName?.[0] || 'P'}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm">
                  {product.productName || 'Unnamed Product'}
                </div>
                <div className="text-xs text-gray-600 line-clamp-1">
                  {product.category?.name || 'No category'} • {product.brand || 'No brand'}
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  product.synced
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                <div
                  className={`w-1 h-1 rounded-full ${
                    product.synced ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                ></div>
                {product.synced ? 'Active' : 'Syncing'}
              </span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar size={12} />
                {formatDate(product.createdAt || product.lastModified)}
              </div>
            </div>
            <div className="flex gap-2">
              {isOnline && (
                <button
                  onClick={() => handleViewProduct(product)}
                  className="p-1 text-gray-400 hover:text-green-600"
                  title="View"
                >
                  <Eye size={14} />
                </button>
              )}
              <button
                onClick={() => handleEditProduct(product)}
                disabled={isLoading}
                className="p-1 text-gray-400 hover:text-primary-600"
                title="Edit"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => handleDeleteProduct(product)}
                disabled={isLoading}
                className="p-1 text-gray-400 hover:text-red-600"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  const TableView = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto mb-6">
      <table className="w-full min-w-max">
        <thead className="bg-gray-50">
          <tr className="border-b">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {currentItems.map((product, index) => (
            <tr key={product.localId || product.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {startIndex + index + 1}
                </span>
              </td>

              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  {getFirstImage(product.imageUrls) ? (
                    <img
                      src={getFirstImage(product.imageUrls)}
                      alt={product.productName}
                      className="w-8 h-8 object-cover rounded-full"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ display: getFirstImage(product.imageUrls) ? 'none' : 'flex' }}
                  >
                    {product.productName?.[0] || 'P'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {product.productName || 'Unnamed Product'}
                    </div>
                  </div>
                </div>
              </td>

              <td className="px-4 py-3">
                <div className="text-xs text-gray-900">
                  {product.category?.name || 'No category'}
                </div>
              </td>

              <td className="px-4 py-3">
                <div className="text-xs text-gray-900">
                  {product.brand || 'No brand'}
                </div>
              </td>

              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    product.synced
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      product.synced ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                  ></div>
                  {product.synced ? 'Active' : 'Syncing...'}
                </span>
              </td>

              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-600">
                    {formatDate(product.createdAt || product.lastModified)}
                  </span>
                </div>
              </td>

              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {isOnline && (
                    <button
                      onClick={() => handleViewProduct(product)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEditProduct(product)}
                    disabled={isLoading}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product)}
                    disabled={isLoading}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="border w-[99%] bg-gray-50 h-[90vh]">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success'
              ? 'bg-green-500 text-white'
              : notification.type === 'warning'
              ? 'bg-yellow-500 text-white'
              : 'bg-red-500 text-white'
          } animate-in slide-in-from-top-2 duration-300`}
        >
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}

      <div className="h-full">
        {/* Header Section */}
        <div className="mb-4 shadow-md bg-white p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between gap-3 flex-col sm:flex-row">
              <h1 className="text-xl font-bold text-gray-900">Product Management</h1>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div
                className={`p-2 rounded-lg ${
                  isOnline ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}
                title={isOnline ? 'Online' : 'Offline'}
              >
                {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
              </div>
              {isOnline && (
                <button
                  onClick={handleManualSync}
                  disabled={isLoading}
                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Sync now"
                >
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </button>
              )}
              {isOnline && (
                <button
                  onClick={() => loadProducts(true)}
                  disabled={isRefreshing}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RotateCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              )}
              <button
                onClick={handleAddProduct}
                disabled={isLoading}
                className="flex items-center flex-1 sm:flex-none gap-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
              >
                <Plus size={14} />
                Add Product
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Manage your products - works offline and syncs when online
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pl-3 pr-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="p-2 bg-orange-100 rounded-md">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total</p>
              <p className="text-xl font-bold text-gray-900">{products.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="p-2 bg-green-100 rounded-md">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Synced</p>
              <p className="text-xl font-bold text-gray-900">{syncedProducts}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="p-2 bg-yellow-100 rounded-md">
              <RefreshCw className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Pending Sync</p>
              <p className="text-xl font-bold text-gray-900">{pendingSync}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="p-2 bg-blue-100 rounded-md">
              <Wifi className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Connection</p>
              <p className="text-md font-semibold text-gray-900">
                {isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        {/* Filter and Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 ml-3 mr-3 p-2 flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm"
              />
            </div>
            <div className="flex gap-3">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End Date"
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 w-full lg:w-auto justify-end">
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Grid View"
              >
                <Grid3x3 size={16} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Table View"
              >
                <Table2 size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="List View"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading && !isRefreshing ? (
          <div className="text-center py-12 p-3">
            <div className="inline-flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin text-primary-600" />
              <p className="text-gray-600">Loading products...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? 'Try adjusting your search terms.'
                : 'Get started by adding your first product.'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleAddProduct}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus size={20} />
                Add Product
              </button>
            )}
          </div>
        ) : (
          <div className="pl-3 pr-3">
            {viewMode === 'grid' && (
              <>
                <GridView />
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <PaginationComponent />
                </div>
              </>
            )}
            {viewMode === 'list' && (
              <>
                <ListView />
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <PaginationComponent />
                </div>
              </>
            )}
            {viewMode === 'table' && (
              <>
                <TableView />
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                  <PaginationComponent />
                </div>
              </>
            )}
          </div>
        )}

        {/* Modals */}
        <UpsertProductModal
          isOpen={isAddModalOpen || isEditModalOpen}
          onClose={closeAllModals}
          onSubmit={isEditModalOpen ? handleUpdateProduct : handleProductSubmit}
          product={selectedProduct}
          isLoading={isLoading}
          title={isEditModalOpen ? 'Edit Product' : 'Add New Product'}
        />
        <DeleteProductModal
          isOpen={isDeleteModalOpen}
          onClose={closeAllModals}
          onConfirm={handleConfirmDelete}
          product={selectedProduct}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default ProductManagement;