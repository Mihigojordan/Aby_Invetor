/* eslint-disable no-unused-vars */
// components/dashboard/category/CategoryManagement.js
import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Check,
  AlertTriangle,
  Folder,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  Eye,
  RotateCcw,
  FileDown,        // For export
  Table,           // For table view icon
  Grid,            // New: for grid view icon (assuming lucide has Grid, else use another)
  List,            // New: for list view icon
} from "lucide-react";
import UpsertCategoryModal from "../../components/dashboard/category/UpsertCategoryModal";
import DeleteCategoryModal from "../../components/dashboard/category/DeleteCategoryModal";
import categoryService from "../../services/categoryService";
import useEmployeeAuth from "../../context/EmployeeAuthContext";
import useAdminAuth from "../../context/AdminAuthContext";
import { db } from "../../db/database";
import { useCategoryOfflineSync } from "../../hooks/useCategoryOffline";
import { useNetworkStatusContext } from "../../context/useNetworkContext";
import useScreenBelow from "../../hooks/useScreenBelow";

const CategoryManagement = ({ role }) => {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(""); // New: for date range filter
  const [endDate, setEndDate] = useState("");     // New: for date range filter
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // New: 'table', 'grid', 'list'
   const isBelow = useScreenBelow();

  // Pagination state - Changed to 5 items per page
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const { isOnline } = useNetworkStatusContext();
  const { triggerSync, syncError } = useCategoryOfflineSync();
  const { user: employeeData } = useEmployeeAuth();
  const { user: adminData } = useAdminAuth();

  useEffect(() => {
    loadCategories();
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

  useEffect(() => {
    if (syncError) {
      showNotification(`Sync status error: ${syncError}`, "error");
    }
  }, [syncError]);

  useEffect(() => {
    let filtered = categories.filter(
      (category) =>
        category.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (category.description || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );

    // Apply date range filter
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(cat => new Date(cat.updatedAt || cat.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter(cat => new Date(cat.updatedAt || cat.createdAt) <= end);
    }

    setFilteredCategories(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, startDate, endDate, categories]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredCategories.slice(startIndex, endIndex);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 4;
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

  const loadCategories = async (showRefreshLoader = false) => {
    if (showRefreshLoader) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      if (isOnline) await triggerSync();

      const [allCategories, offlineAdds, offlineUpdates, offlineDeletes] =
        await Promise.all([
          db.categories_all.toArray(),
          db.categories_offline_add.toArray(),
          db.categories_offline_update.toArray(),
          db.categories_offline_delete.toArray(),
        ]);

      const deleteIds = new Set(offlineDeletes.map((d) => d.id));
      const updateMap = new Map(offlineUpdates.map((u) => [u.id, u]));

      const combinedCategories = allCategories
        .filter((c) => !deleteIds.has(c.id))
        .map((c) => ({
          ...c,
          ...updateMap.get(c.id),
          synced: true,
        }))
        .concat(offlineAdds.map((a) => ({ ...a, synced: false })))
        .sort((a, b) => a.synced - b.synced);

      setCategories(combinedCategories);
      setFilteredCategories(combinedCategories);

      if (showRefreshLoader) {
        showNotification("Categories refreshed successfully!");
      }

      if (!isOnline && combinedCategories.length === 0) {
        showNotification("No offline data available", "error");
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      showNotification("Failed to load categories", "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCategorySubmit = async (categoryData) => {
    setIsLoading(true);
    try {
      const validation = categoryService.validateCategoryData(categoryData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      const userData =
        role === "admin"
          ? { adminId: adminData.id }
          : { employeeId: employeeData.id };
      const now = new Date();
      const newCategory = {
        ...categoryData,
        ...userData,
        lastModified: now,
        createdAt: now,
        updatedAt: now,
      };

      const localId = await db.categories_offline_add.add(newCategory);
      const savedCategory = { ...newCategory, localId, synced: false };

      if (isOnline) {
        try {
          const response = await categoryService.createCategory({
            ...categoryData,
            ...userData,
          });
          await db.categories_all.put({
            id: response.category.id,
            name: categoryData.name,
            description: categoryData.description,
            lastModified: now,
            updatedAt: response.category.updatedAt || now,
          });
          await db.categories_offline_add.delete(localId);
          showNotification("Category added successfully!");
        } catch (error) {
          showNotification(
            "Category saved offline (will sync when online)",
            "warning"
          );
        }
      } else {
        showNotification(
          "Category saved offline (will sync when online)",
          "warning"
        );
      }

      await loadCategories();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Error adding category:", error);
      showNotification(`Failed to add category: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCategory = async (categoryData) => {
    setIsLoading(true);
    try {
      const validation = categoryService.validateCategoryData(categoryData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      const userData =
        role === "admin"
          ? { adminId: adminData.id }
          : { employeeId: employeeData.id };
      const now = new Date();
      const updatedData = {
        id: selectedCategory.id,
        name: categoryData.name,
        description: categoryData.description,
        ...userData,
        lastModified: now,
        updatedAt: now,
      };

      if (isOnline) {
        try {
          const response = await categoryService.updateCategory(
            selectedCategory.id,
            { ...categoryData, ...userData }
          );
          await db.categories_all.put({
            id: selectedCategory.id,
            name: categoryData.name,
            description: categoryData.description,
            lastModified: now,
            updatedAt: response.category.updatedAt || now,
          });
          await db.categories_offline_update.delete(selectedCategory.id);
          showNotification("Category updated successfully!");
        } catch (error) {
          await db.categories_offline_update.put(updatedData);
          showNotification(
            "Category updated offline (will sync when online)",
            "warning"
          );
        }
      } else {
        await db.categories_offline_update.put(updatedData);
        showNotification(
          "Category updated offline (will sync when online)",
          "warning"
        );
      }

      await loadCategories();
      setIsEditModalOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error("Error updating category:", error);
      showNotification(`Failed to update category: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async (categoryData) => {
    setIsLoading(true);
    try {
      const userData =
        role === "admin"
          ? { adminId: adminData.id }
          : { employeeId: employeeData.id };
      if (isOnline && selectedCategory.id) {
        await categoryService.deleteCategory(selectedCategory.id, userData);
        await db.categories_all.delete(selectedCategory.id);
        showNotification("Category deleted successfully!");
      } else if (selectedCategory.id) {
        await db.categories_offline_delete.add({
          id: selectedCategory.id,
          deletedAt: new Date(),
          ...userData,
        });
        showNotification(
          "Category deletion queued (will sync when online)",
          "warning"
        );
      } else {
        await db.categories_offline_add.delete(selectedCategory.localId);
        showNotification("Category deleted!");
      }

      await loadCategories();
      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error("Error deleting category:", error);
      showNotification(`Failed to delete category: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      showNotification("No internet connection", "error");
      return;
    }
    setIsLoading(true);
    try {
      await triggerSync();
      await loadCategories();
      showNotification("Sync completed successfully!");
    } catch (error) {
      showNotification(
        "Sync failed due to network error—will retry automatically.",
        "error"
      );
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

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const closeAllModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedCategory(null);
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

  // Placeholder export handler for PDF
  const handleExportPDF = () => {
    showNotification("Export to PDF feature coming soon", "warning");
  };

  // Pagination Component
  const PaginationComponent = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between  p-2  border-gray-200 bg-gray-50 ">
      <div className="flex items-center gap-2">
        <p className="text-xs text-gray-600">
          Showing {startIndex + 1} to{" "}
          {Math.min(endIndex, filteredCategories.length)} of{" "}
          {filteredCategories.length} entries
        </p>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-3 py-2 text-xs border rounded-md transition-colors ${
              currentPage === 1
                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                : "border-gray-300 text-gray-700 hover:bg-gray-100"
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
                    ? "bg-primary-600 text-white"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-100"
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
                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                : "border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );

  // Card View Component (Grid/Mobile)
  const CardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 ">
      {currentItems.map((category, index) => (
        <div
          key={category.localId || category.id}
          className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
            category.synced
              ? "border-gray-200"
              : "border-yellow-200 bg-yellow-50"
          }`}
        >
          <div className="p-2">
            {/* Category Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-md">
                  {category.name?.[0] || "C"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold text-gray-900 truncate text-sm"
                    title={category.name}
                  >
                    {category.name}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        category.synced ? "bg-green-500" : "bg-yellow-500"
                      }`}
                    ></div>
                    <span className="text-xs text-gray-500">
                      {category.synced ? "Active" : "Syncing..."}
                    </span>
                  </div>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex gap-1">
                <button
                  onClick={() => openEditModal(category)}
                  disabled={isLoading}
                  className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-md transition-colors"
                  title="Edit category"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => openDeleteModal(category)}
                  disabled={isLoading}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-md transition-colors"
                  title="Delete category"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Category Details */}
            <div className="space-y-1 mb-3">
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <FileText size={12} className="mt-0.5" />
                <span className="line-clamp-2">
                  {category.description || "No description provided"}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar size={10} />
                <span>Created {formatDate(category.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // List View Component (New: Simple list)
  const ListView = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <ul className="divide-y divide-gray-200">
        {currentItems.map((category, index) => (
          <li
            key={category.localId || category.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {startIndex + index + 1}
              </span>
              <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                {category.name?.[0] || "C"}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm">
                  {category.name}
                </div>
                <div className="text-xs text-gray-600 line-clamp-1">
                  {category.description || "No description"}
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  category.synced
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                <div
                  className={`w-1 h-1 rounded-full ${
                    category.synced ? "bg-green-500" : "bg-yellow-500"
                  }`}
                ></div>
                {category.synced ? "Active" : "Syncing"}
              </span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar size={12} />
                {formatDate(category.updatedAt)}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openEditModal(category)}
                disabled={isLoading}
                className="p-1 text-gray-400 hover:text-primary-600"
                title="Edit"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => openDeleteModal(category)}
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

  // Table View Component (Desktop)
  const TableView = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto mb-6">
      <table className="w-full min-w-max">
        <thead className="bg-gray-50">
          <tr className="border-b ">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider  ">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {currentItems.map((category, index) => (
            <tr
              key={category.localId || category.id}
              className="hover:bg-gray-50 transition-colors"
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {startIndex + index + 1}
                </span>
              </td>

              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {category.name?.[0] || "C"}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {category.name}
                    </div>
                  </div>
                </div>
              </td>

              <td className="px-4 py-3">
                <div className="text-xs text-gray-900 max-w-md">
                  <div className="line-clamp-2">
                    {category.description || "No description provided"}
                  </div>
                </div>
              </td>

              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    category.synced
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      category.synced ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  ></div>
                  {category.synced ? "Active" : "Syncing..."}
                </span>
              </td>

              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-600">
                    {formatDate(category.updatedAt)}
                  </span>
                </div>
              </td>

              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(category)}
                    disabled={isLoading}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(category)}
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

  // Compute summary stats
  const totalCategories = categories.length;
  const syncedCount = categories.filter(c => c.synced).length;
  const pendingSyncCount = categories.filter(c => !c.synced).length;

  return (
    <div className=" border w-[99%]  bg-gray-50 h-[90vh]"> {/* Reduced padding */}
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : notification.type === "warning"
              ? "bg-yellow-500 text-white"
              : "bg-red-500 text-white"
          } animate-in slide-in-from-top-2 duration-300`}
        >
          {notification.type === "success" ? (
            <Check size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}
          {notification.message}
        </div>
      )}

      <div className="h-full">
        {/* Header Section with bottom shadow */}
        <div className="mb-4 shadow-md bg-white  p-2"> {/* Bottom shadow */}
          <div className="flex sm:items-center  justify-between gap-2  flex-col md:flex-row">
            <div className="flex items-center justify-between gap-3">
           
              <h1 className="text-xl font-bold text-gray-900"> {/* Smaller text */}
                Category Management
              </h1>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Online/Offline Icon */}
              <div
                className={`p-2 rounded-lg ${
                  isOnline
                    ? "bg-green-100 text-green-600"
                    : "bg-red-100 text-red-600"
                }`}
                title={isOnline ? "Online" : "Offline"}
              >
                {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
              </div>
              {/* Sync Icon */}
              {isOnline && (
                <button
                  onClick={handleManualSync}
                  disabled={isLoading}
                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Sync now"
                >
                  <span></span>
                  <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                </button>
              )}
              {/* Refresh Icon */}
              {isOnline && (
                <button
                  onClick={() => loadCategories(true)}
                  disabled={isRefreshing}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RotateCcw size={16} className={isRefreshing ? "animate-spin" : ""} />
                </button>
                
              )}
                <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={isLoading}
              className="flex items-center gap-1 flex-1 md:flex-none px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
            >
              <Plus size={14} />
              Add Category
            </button>

            </div>
            



          </div>
          <p className="text-xs text-gray-600 mt-1">
            Manage your categories - works offline and syncs when online
          </p>
        </div>

        {/* Summary Stats Cards - Enhanced with hover effects and transitions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pl-3 pr-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="p-2 bg-orange-100 rounded-md">
              <Folder className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total</p>
              <p className="text-xl font-bold text-gray-900">{totalCategories}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="p-2 bg-green-100 rounded-md">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Synced</p>
              <p className="text-xl font-bold text-gray-900">{syncedCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="p-2 bg-yellow-100 rounded-md">
              <RefreshCw className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Pending Sync</p>
              <p className="text-xl font-bold text-gray-900">{pendingSyncCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="p-2 bg-blue-100 rounded-md">
              <Wifi className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Connection</p>
              <p className="text-md font-semibold text-gray-900">
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        </div>

        {/* Filter and Actions Bar - Enhanced with date range and view switchers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 ml-3 mr-3 p-2 flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center ">
          {/* Search and Date Range */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto ">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search categories..."
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

          {/* Actions: Export PDF, Add Category, View Switchers */}
          <div className="flex gap-2 w-full lg:w-auto justify-end">
         
          
            {/* View Switchers */}
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Grid View"
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Table View"
              >
                <Table size={16} />
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

        {/* Loading State */}
        {isLoading && !isRefreshing ? (
          <div className="text-center py-12 p-3">
            <div className="inline-flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin text-primary-600" />
              <p className="text-gray-600">Loading categories...</p>
            </div>
          </div>
        ) : filteredCategories.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No categories found
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? "Try adjusting your search terms."
                : "Get started by adding your first category."}
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
          < div className="pl-3 pr-3">
            {/* Conditional View Rendering */}
            {viewMode === 'grid' && (
              <>
                <CardView />
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

        {/* Modal Components - Reduced padding for professional look */}
        <UpsertCategoryModal
          isOpen={isAddModalOpen || isEditModalOpen}
          onClose={closeAllModals}
          onSubmit={
            isEditModalOpen ? handleUpdateCategory : handleCategorySubmit
          }
          category={selectedCategory}
          isLoading={isLoading}
          title={isEditModalOpen ? "Edit Category" : "Add New Category"}
        />

        <DeleteCategoryModal
          isOpen={isDeleteModalOpen}
          onClose={closeAllModals}
          onConfirm={handleConfirmDelete}
          category={selectedCategory}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default CategoryManagement;