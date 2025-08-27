// components/dashboard/product/ProductManagement.js
import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Package, Tag, Image, Check, AlertTriangle, Eye, RefreshCw, ChevronLeft, ChevronRight, Calendar, Wifi, WifiOff } from 'lucide-react';
import UpsertProductModal from '../../components/dashboard/product/UpsertProductModal';
import DeleteProductModal from '../../components/dashboard/product/DeleteProductModal';
import productService from '../../services/productService';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/database';
import { useProductOfflineSync } from '../../hooks/useProductOfflineSync';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import categoryService from '../../services/categoryService';

const ProductManagement = ({ role }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const { isOnline } = useNetworkStatus();
  const navigate = useNavigate();
  const { user: employeeData } = useEmployeeAuth();
  const { user: adminData } = useAdminAuth();
  const { triggerSync, syncError } = useProductOfflineSync();

  const [itemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadProducts();
    if (isOnline) handleManualSync();
  }, [isOnline]);
    const fetchCategories = async () => {
      try {
        if (isOnline) {
          // 1. Fetch from API
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
  
          // 2. Sync any offline adds/updates/deletes
          // await triggerSync();
        }
  
        // 3. Always read from IndexedDB (so offline works too)
        const allCategories = await db.categories_all.toArray();
  
        console.log('log categories : +>', allCategories);
  
        // setCategories(allCategories);
        return allCategories
      } catch (error) {
        if(!error.response){
           const allCategories = await db.categories_all.toArray();
          return allCategories
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
    const filtered = products.filter(product =>
      product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchTerm, products]);

  useEffect(() => {
    return () => {
      products.forEach(prod => prod.imageUrls?.forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      }));
    };
  }, [products]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      if (isOnline) await triggerSync();

      const [allProducts, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
        db.products_all.toArray(),
        db.products_offline_add.toArray(),
        db.products_offline_update.toArray(),
        db.products_offline_delete.toArray()
      ]);

     const categories =  await fetchCategories()


      const deleteIds = new Set(offlineDeletes.map(d => d.id));
      const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));

      const combinedProducts = allProducts
        .filter(p => !deleteIds.has(p.id))
        .map(p => ({
          ...p,
          ...updateMap.get(p.id),
          synced: true,
          category: categories.find(cat => cat.id == p.categoryId )
        }))
        .concat(offlineAdds.map(a => ({
           ...a,
            synced: false,
             category: categories.find(cat => cat.id == p.categoryId )
           })
          ));

          console.warn('combined product:',combinedProducts);
          

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
      if (!isOnline && productsWithImages.length === 0) {
        showNotification('No offline data available', 'error');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      showNotification('Failed to load products', 'error');
    } finally {
      setIsLoading(false);
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
      const savedProduct = { ...newProduct, localId, synced: false };

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

  const handleConfirmDelete = async (productData) => {
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

  // Pagination and UI rendering remain the same as provided
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredProducts.slice(startIndex, endIndex);

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

  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} entries
        </p>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${currentPage === 1
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${currentPage === page
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
            className={`flex items-center gap-1 px-3 py-2 text-sm border rounded-md transition-colors ${currentPage === totalPages
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
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
        {currentItems.map((product, index) => (
          <div 
            key={product.localId || product.id} 
            className={`bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow ${
              product.synced ? 'border-gray-200' : 'border-yellow-200 bg-yellow-50'
            }`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getFirstImage(product.imageUrls) ? (
                    <img
                      src={getFirstImage(product.imageUrls)}
                      alt={product.productName}
                      className="w-12 h-12 object-cover rounded-lg shadow-sm"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-lg"
                    style={{ display: getFirstImage(product.imageUrls) ? 'none' : 'flex' }}>
                    <Package size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate" title={product.productName}>
                      {product.productName || 'Unnamed Product'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {!product.synced && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          Pending sync
                        </span>
                      )}
                    
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleViewProduct(product)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="View product"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Edit product"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete product"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package size={14} />
                  <span className="truncate">{product.category?.name || 'No category'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Image size={14} />
                  <span>{product.imageUrls?.length || 0} image{(product.imageUrls?.length || 0) !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {product.description && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-1">Description</div>
                  <div
                    className="text-sm text-gray-600 line-clamp-2 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: parseDescription(product.description)
                    }}
                  />
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} />
                  <span>Added {formatDate(product.createdAt || product.lastModified)}</span>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
             
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((product, index) => (
              <tr key={product.localId || product.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {startIndex + index + 1}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {getFirstImage(product.imageUrls) ? (
                      <img
                        src={getFirstImage(product.imageUrls)}
                        alt={product.productName}
                        className="w-10 h-10 object-cover rounded-lg shadow-sm"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white"
                      style={{ display: getFirstImage(product.imageUrls) ? 'none' : 'flex' }}>
                      <Package size={16} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {product.productName || 'Unnamed Product'}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {!product.synced && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            Pending sync
                          </span>
                        )}
                       
                      </div>
                    </div>
                  </div>
                </td>

               

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Package size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-900">
                      {product.category?.name || 'No category'}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Image size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {product.imageUrls?.length || 0} image{(product.imageUrls?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {formatDate(product.createdAt || product.lastModified)}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                   {
                    isOnline &&  <button
                      onClick={() => handleViewProduct(product)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                   }
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product)}
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
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 
          notification.type === 'warning' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
        } animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}
      <div className="h-full overflow-y-auto mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-600 rounded-lg"><Package className="w-6 h-6 text-white" /></div>
              <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
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
          <p className="text-gray-600">Manage your product catalog and inventory - works offline and syncs when online</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
            <button
              onClick={handleAddProduct}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus size={20} /> Add Product
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="text-center py-12"><p className="text-gray-600">Loading products...</p></div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">{searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first product.'}</p>
            {!searchTerm && (
              <button
                onClick={handleAddProduct}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus size={20} /> Add Product
              </button>
            )}
          </div>
        ) : (
          <>
           <CardView />
           <TableView />
          </>
        )}
      </div>
      <UpsertProductModal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedProduct(null);
        }}
        onSubmit={isEditModalOpen ? handleUpdateProduct : handleProductSubmit}
        product={selectedProduct}
        isLoading={isLoading}
        title={isEditModalOpen ? 'Edit Product' : 'Add New Product'}
      />
      <DeleteProductModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleConfirmDelete}
        product={selectedProduct}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ProductManagement;