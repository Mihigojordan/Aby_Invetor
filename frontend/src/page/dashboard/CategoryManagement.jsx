// components/dashboard/category/CategoryManagement.js
import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Check, AlertTriangle, Folder, Wifi, WifiOff } from 'lucide-react';
import UpsertCategoryModal from '../../components/dashboard/category/UpsertCategoryModal';
import DeleteCategoryModal from '../../components/dashboard/category/DeleteCategoryModal';
import categoryService from '../../services/categoryService';
import useEmployeeAuth from '../../context/EmployeeAuthContext';
import useAdminAuth from '../../context/AdminAuthContext';
import { db } from '../../db/database';
import { useCategoryOfflineSync } from '../../hooks/useCategoryOffline';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const CategoryManagement = ({ role }) => {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const { isOnline } = useNetworkStatus();
  const { triggerSync, syncError } = useCategoryOfflineSync();
  const { user: employeeData } = useEmployeeAuth();
  const { user: adminData } = useAdminAuth();

  useEffect(() => {
    loadCategories();
    if (isOnline) handleManualSync();
  }, [isOnline]);

  useEffect(() => {
    if (syncError) {
      showNotification(`Sync status error: ${syncError}`, 'error');
    }
  }, [syncError]);

  useEffect(() => {
    const filtered = categories.filter(category =>
      category.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCategories(filtered);
  }, [searchTerm, categories]);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      if (isOnline) await triggerSync();

      const [allCategories, offlineAdds, offlineUpdates, offlineDeletes] = await Promise.all([
        db.categories_all.toArray(),
        db.categories_offline_add.toArray(),
        db.categories_offline_update.toArray(),
        db.categories_offline_delete.toArray()
      ]);

      const deleteIds = new Set(offlineDeletes.map(d => d.id));
      const updateMap = new Map(offlineUpdates.map(u => [u.id, u]));

      const combinedCategories = allCategories
        .filter(c => !deleteIds.has(c.id))
        .map(c => ({
          ...c,
          ...updateMap.get(c.id),
          synced: true
        }))
        .concat(offlineAdds.map(a => ({ ...a, synced: false })));

      setCategories(combinedCategories);
      setFilteredCategories(combinedCategories);
      if (!isOnline && combinedCategories.length === 0) {
        showNotification('No offline data available', 'error');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      showNotification('Failed to load categories', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCategorySubmit = async (categoryData) => {
    setIsLoading(true);
    try {
      const validation = categoryService.validateCategoryData(categoryData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      const now = new Date();
      const newCategory = {
        ...categoryData,
        ...userData,
        lastModified: now,
        createdAt: now,
        updatedAt: now
      };

      const localId = await db.categories_offline_add.add(newCategory);
      const savedCategory = { ...newCategory, localId, synced: false };

      if (isOnline) {
        try {
          const response = await categoryService.createCategory({ ...categoryData, ...userData });
          await db.categories_all.put({
            id: response.category.id,
            name: categoryData.name,
            description: categoryData.description,
            lastModified: now,
            updatedAt: response.category.updatedAt || now
          });
          await db.categories_offline_add.delete(localId);
          showNotification('Category added successfully!');
        } catch (error) {
          showNotification('Category saved offline (will sync when online)', 'warning');
        }
      } else {
        showNotification('Category saved offline (will sync when online)', 'warning');
      }

      await loadCategories();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding category:', error);
      showNotification(`Failed to add category: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCategory = async (categoryData) => {
    setIsLoading(true);
    try {
      const validation = categoryService.validateCategoryData(categoryData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      const now = new Date();
      const updatedData = {
        id: selectedCategory.id,
        name: categoryData.name,
        description: categoryData.description,
        ...userData,
        lastModified: now,
        updatedAt: now
      };

      if (isOnline) {
        try {
          const response = await categoryService.updateCategory(selectedCategory.id, { ...categoryData, ...userData });
          await db.categories_all.put({
            id: selectedCategory.id,
            name: categoryData.name,
            description: categoryData.description,
            lastModified: now,
            updatedAt: response.category.updatedAt || now
          });
          await db.categories_offline_update.delete(selectedCategory.id);
          showNotification('Category updated successfully!');
        } catch (error) {
          await db.categories_offline_update.put(updatedData);
          showNotification('Category updated offline (will sync when online)', 'warning');
        }
      } else {
        await db.categories_offline_update.put(updatedData);
        showNotification('Category updated offline (will sync when online)', 'warning');
      }

      await loadCategories();
      setIsEditModalOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error('Error updating category:', error);
      showNotification(`Failed to update category: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async (categoryData) => {
    setIsLoading(true);
    try {
      const userData = role === 'admin' ? { adminId: adminData.id } : { employeeId: employeeData.id };
      if (isOnline && selectedCategory.id) {
        await categoryService.deleteCategory(selectedCategory.id, userData);
        await db.categories_all.delete(selectedCategory.id);
        showNotification('Category deleted successfully!');
      } else if (selectedCategory.id) {
        await db.categories_offline_delete.add({
          id: selectedCategory.id,
          deletedAt: new Date(),
          ...userData
        });
        showNotification('Category deletion queued (will sync when online)', 'warning');
      } else {
        await db.categories_offline_add.delete(selectedCategory.localId);
        showNotification('Category deleted!');
      }

      await loadCategories();
      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      showNotification(`Failed to delete category: ${error.message}`, 'error');
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
      await loadCategories();
      showNotification('Sync completed successfully!');
    } catch (error) {
      showNotification('Sync failed due to network error—will retry automatically.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (category) => {
    setSelectedCategory(category);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (category) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

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
              <div className="p-2 bg-primary-600 rounded-lg">
                <Folder className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Category Management</h1>
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
          <p className="text-gray-600">Manage your categories - works offline and syncs when online</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus size={20} />
              Add Category
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first category.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus size={20} />
                Add Category
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <div
                key={category.localId || category.id}
                className={`bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow ${
                  category.synced ? 'border-gray-200' : 'border-yellow-200 bg-yellow-50'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {category.name?.[0] || 'C'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          {!category.synced && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                              Pending sync
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(category)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(category)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Description:</span> {category.description || 'No description'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <UpsertCategoryModal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedCategory(null);
        }}
        onSubmit={isEditModalOpen ? handleUpdateCategory : handleCategorySubmit}
        category={selectedCategory}
        isLoading={isLoading}
        title={isEditModalOpen ? 'Edit Category' : 'Add New Category'}
      />

      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCategory(null);
        }}
        onConfirm={handleConfirmDelete}
        category={selectedCategory}
        isLoading={isLoading}
      />
    </div>
  );
};

export default CategoryManagement;