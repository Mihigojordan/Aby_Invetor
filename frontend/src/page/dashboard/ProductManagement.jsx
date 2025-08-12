import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Package, Tag, Image, Check, AlertTriangle, Eye, RefreshCw, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import UpsertProductModal from '../../components/dashboard/product/UpsertProductModal';
import DeleteProductModal from '../../components/dashboard/product/DeleteProductModal';
import productService from '../../services/productService';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';
import ViewProductModal from '../../components/dashboard/product/ViewProductModal';

const ProductManagement = ({ role }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);



  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);


  const { user: employeeData } = useEmployeeAuth()
  const { user: adminData } = useAdminAuth()

  // Fetch all products with better error handling
  const fetchProducts = async (showRefreshLoader = false) => {
    if (showRefreshLoader) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await productService.getAllProducts();
      console.log('response from baceknd', data);
      
      setProducts(data);
      setFilteredProducts(data);

      if (showRefreshLoader) {
        showNotification('Products refreshed successfully!');
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      showNotification(`Failed to fetch products: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, products]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredProducts.slice(startIndex, endIndex);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
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
    setSelectedProduct(product);
    setIsViewModalOpen(true);
  };

 

  // Handle form submission for both create and update
  const handleProductSubmit = async (productData) => {
    setIsLoading(true);
    try {
      // Validate images before submission
      const imagesToValidate = selectedProduct ? productData.newImages : productData.images;
      if (imagesToValidate && imagesToValidate.length > 0) {
        const validation = productService.validateImages(imagesToValidate);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
      }

      if (selectedProduct) {
        if (role == 'admin') {
          // Update existing product
          await productService.updateProduct(selectedProduct.id, {
            productName: productData.productName,
            brand: productData.brand,
            categoryId: productData.categoryId,
            description: productData.description,
            keepImages: productData.keepImages,
            newImages: productData.images || productData.newImages,
            adminId: adminData.id
          });

          if (role == 'employee') {
            // Update existing product
            await productService.updateProduct(selectedProduct.id, {
              productName: productData.productName,
              brand: productData.brand,
              categoryId: productData.categoryId,
              description: productData.description,
              keepImages: productData.keepImages,
              newImages: productData.images || productData.newImages,
              employeeId: employeeData.id
            });
          }
        }
        showNotification('Product updated successfully!');
        console.log('Product updated successfully');
      } else {
        if (role == 'admin') {
          // Create new product
          await productService.createProduct({
            productName: productData.productName,
            brand: productData.brand,
            categoryId: productData.categoryId,
            description: productData.description,
            images: productData.images,
            adminId: adminData.id
          });
        }
        if (role == 'employee') {
            // Create new product
          await productService.createProduct({
            productName: productData.productName,
            brand: productData.brand,
            categoryId: productData.categoryId,
            description: productData.description,
            images: productData.images,
            employeeId: employeeData.id
          });
        }
        showNotification('Product added successfully!');
        console.log('Product created successfully');
      }

      // Refresh products list
      await fetchProducts();

      // Close modals and reset state
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedProduct(null);

    } catch (error) {
      console.error('Failed to save product:', error);
      showNotification(`Failed to save product: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle product deletion with confirmation
  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;

    setIsLoading(true);
    try {

      if(role == 'admin'){

        await productService.deleteProduct(selectedProduct.id,{
          adminId: adminData.id
        });
      }
      
      if(role == 'employee'){
        await productService.deleteProduct(selectedProduct.id,{
          employeeId: employeeData.id
        });

      }

      // Update local state immediately for better UX
      setProducts(prev => prev.filter(product => product.id !== selectedProduct.id));

      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
      showNotification('Product deleted successfully!');
      console.log('Product deleted successfully');
    } catch (error) {
      console.error('Failed to delete product:', error);
      showNotification(`Failed to delete product: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFirstImage = (imageUrls) => {
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return null;
    }
    return productService.getFullImageUrl(imageUrls[0]);
  };

  const parseDescription = (description) => {
    if (!description) return '';
    try {
      // Use productService method if available, otherwise fallback to local parsing
      if (productService.parseDescription) {
        return productService.parseDescription(description);
      }

      const parsed = typeof description === 'string' ? JSON.parse(description) : description;
      if (parsed.details) return parsed.details;
      if (typeof parsed === 'string') return parsed;
      return JSON.stringify(parsed);
    } catch {
      return description;
    }
  };

  const closeAllModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedProduct(null);
  };

  // Pagination handlers
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

  // Pagination Component
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

  // Card View Component (Mobile/Tablet)
  const CardView = () => (
    <div className="md:hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        {currentItems.map((product, index) => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Product Header */}
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
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-500">Available</span>
                    </div>
                  </div>
                </div>
                {/* Action Buttons */}
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

              {/* Product Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Tag size={14} />
                  <span className="truncate">{product.brand || 'No brand'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package size={14} />
                  <span className="truncate">{product.category?.name || 'No category'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Image size={14} />
                  <span>{product.imageUrls?.length || 0} image{(product.imageUrls?.length || 0) !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Description Preview */}
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

              {/* Footer */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} />
                  <span>Added {formatDate(product.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination for Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <PaginationComponent />
      </div>
    </div>
  );

  // Table View Component (Desktop)
  const TableView = () => (
    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((product, index) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
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
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-gray-500">Available</span>
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-900">
                      {product.brand || 'No brand'}
                    </span>
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
                      {formatDate(product.createdAt)}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewProduct(product)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
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

      {/* Table Pagination */}
      <PaginationComponent />
    </div>
  );

  return (
    <div className="bg-gray-50 p-4 h-[90vh] sm:p-6 lg:p-8">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          } animate-in slide-in-from-top-2 duration-300`}>
          {notification.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}

      <div className="h-full overflow-y-auto mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-600 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
          </div>
          <p className="text-gray-600">Manage your product catalog and inventory</p>
        </div>

        {/* Search and Actions Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products by name, brand, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fetchProducts(true)}
                disabled={isRefreshing}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={handleAddProduct}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
              >
                <Plus size={20} />
                Add Product
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && !isRefreshing ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin text-primary-600" />
              <p className="text-gray-600">Loading products...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first product.'}
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
          <>
            <CardView />
            <TableView />
          </>
        )}

        {/* Upsert Product Modal */}
        <UpsertProductModal
          isOpen={isAddModalOpen || isEditModalOpen}
          onClose={closeAllModals}
          onSubmit={handleProductSubmit}
          product={selectedProduct}
          isLoading={isLoading}
          title={isEditModalOpen ? 'Edit Product' : 'Add New Product'}
        />

        <ViewProductModal 
  isOpen={isViewModalOpen}
  onClose={() => setIsViewModalOpen(false)}
  product={selectedProduct}
/>

        {/* Delete Product Modal */}
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