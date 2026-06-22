import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaCheck,
  FaExclamationTriangle,
  FaFolder,
  FaWifi,
  FaBan,
  FaSync,
  FaChevronLeft,
  FaChevronRight,
  FaCalendar,
  FaThLarge,
  FaList,
} from "react-icons/fa";
import UpsertCategoryModal from "../../components/dashboard/category/UpsertCategoryModal";
import DeleteCategoryModal from "../../components/dashboard/category/DeleteCategoryModal";
import ImportCategoryModal from "../../components/dashboard/category/ImportCategoryModal";
import ExportCategoryModal from "../../components/dashboard/category/ExportCategoryModal";
import categoryService from "../../services/categoryService";
import useEmployeeAuth from "../../context/EmployeeAuthContext";
import useAdminAuth from "../../context/AdminAuthContext";
import { db } from "../../db/database";
import { useCategoryOfflineSync } from "../../hooks/useCategoryOffline";
import { useNetworkStatusContext } from "../../context/useNetworkContext";
import useScreenBelow from "../../hooks/useScreenBelow";

// Design System Colors
const COLORS = {
  bg: "#F3F5F9",
  panel: "#ffffff",
  panel2: "#F5F7FB",
  ink: "#1B2536",
  muted: "#6A788D",
  line: "#E7EBF1",
  primary: "#3FABC6",
  primaryd: "#2B8EA6",
  primarysoft: "#E4F4F8",
  green: "#15A24A",
  greensoft: "#E6F6EC",
  amber: "#D88A0C",
  ambersoft: "#FDF3E0",
  orange: "rgb(222, 55, 163)",
  orangesoft: "#FCE4EC",
  red: "#E04848",
  redsoft: "#FDECEC",
  shadow: "0 1px 2px rgba(16,30,54,.04),0 6px 18px rgba(16,30,54,.06)",
};

// Category color palette
const CATEGORY_COLORS = [
  { bg: "#E3F2FD", text: "#1976D2" }, // Blue
  { bg: "#F3E5F5", text: "#7B1FA2" }, // Purple
  { bg: "#E0F2F1", text: "#00796B" }, // Teal
  { bg: "#FFF3E0", text: "#E65100" }, // Orange
  { bg: "#FCE4EC", text: "#C2185B" }, // Pink
  { bg: "#E8F5E9", text: "#388E3C" }, // Green
  { bg: "#F1F8E9", text: "#558B2F" }, // Light Green
  { bg: "#EDEDED", text: "#424242" }, // Grey
  { bg: "#FFE0B2", text: "#E65100" }, // Deep Orange
  { bg: "#E0F7FA", text: "#0097A7" }, // Cyan
];

const getCategoryColor = (categoryName) => {
  if (!categoryName) return CATEGORY_COLORS[0];
  const hash = categoryName.charCodeAt(0) + categoryName.charCodeAt(categoryName.length - 1);
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
};

const CategoryManagement = ({ role }) => {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const isBelow = useScreenBelow();

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

  useEffect(() => {
    if (isBelow) {
      setViewMode("grid");
    } else {
      setViewMode("table");
    }
  }, [isBelow]);

  useEffect(() => {
    if (syncError) {
      showNotification(`Sync status error: ${syncError}`, "error");
    }
  }, [syncError]);

  useEffect(() => {
    let filtered = categories.filter((category) =>
      category.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(
        (cat) => new Date(cat.updatedAt || cat.createdAt) >= start
      );
    }
    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter(
        (cat) => new Date(cat.updatedAt || cat.createdAt) <= end
      );
    }

    setFilteredCategories(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startDate, endDate, categories]);

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredCategories.slice(startIndex, endIndex);

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
    setTimeout(() => setNotification(null), 3000);
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

      if (isOnline) {
        try {
          const response = await categoryService.createCategory({
            ...categoryData,
            ...userData,
          });
          await db.categories_all.put({
            id: response.category.id,
            name: categoryData.name,
            subcategory: categoryData.subcategory,
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
        subcategory: categoryData.subcategory,
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
            subcategory: categoryData.subcategory,
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

  const handleBulkImport = async (importedCategories) => {
    setIsLoading(true);
    try {
      const userData =
        role === "admin"
          ? { adminId: adminData.id }
          : { employeeId: employeeData.id };
      const now = new Date();

      let successCount = 0;
      let errorCount = 0;

      for (const categoryData of importedCategories) {
        try {
          const newCategory = {
            ...categoryData,
            ...userData,
            lastModified: now,
            createdAt: now,
            updatedAt: now,
          };

          const localId = await db.categories_offline_add.add(newCategory);

          if (isOnline) {
            try {
              const response = await categoryService.createCategory({
                ...categoryData,
                ...userData,
              });
              await db.categories_all.put({
                id: response.category.id,
                name: categoryData.name,
                subcategory: categoryData.subcategory,
                description: categoryData.description,
                lastModified: now,
                updatedAt: response.category.updatedAt || now,
              });
              await db.categories_offline_add.delete(localId);
              successCount++;
            } catch (error) {
              successCount++;
            }
          } else {
            successCount++;
          }
        } catch (error) {
          console.error("Error importing category:", error);
          errorCount++;
        }
      }

      await loadCategories();
      setIsImportModalOpen(false);

      const message =
        errorCount === 0
          ? `Successfully imported ${successCount} categories!`
          : `Imported ${successCount} categories${isOnline ? "" : " (offline)"}, ${errorCount} failed`;

      showNotification(message, errorCount > 0 ? "warning" : "success");
    } catch (error) {
      console.error("Error in bulk import:", error);
      showNotification(`Failed to import categories: ${error.message}`, "error");
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

  const closeAllModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedCategory(null);
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

  const totalCategoriesCount = categories.length;
  const syncedCount = categories.filter((c) => c.synced).length;
  const pendingSyncCount = totalCategoriesCount - syncedCount;
  const usedCategoriesCount = categories.filter((c) => c.products && c.products > 0).length;

  return (
    <div style={{ padding: "16px 30px 16px 10px" }}>
      {notification && (
        <div
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-lg text-white z-50"
          style={{
            backgroundColor:
              notification.type === "success" ? COLORS.green : COLORS.red,
            boxShadow: COLORS.shadow,
          }}
        >
          {notification.type === "success" ? (
            <FaCheckCircle size={18} />
          ) : (
            <FaExclamationTriangle size={18} />
          )}
          <span style={{ fontSize: "13.5px", fontWeight: "600" }}>
            {notification.message}
          </span>
        </div>
      )}

      {/* Header Card */}
      <div
        style={{
          backgroundColor: COLORS.panel,
          border: `1px solid ${COLORS.line}`,
          borderRadius: "10px",
          boxShadow: COLORS.shadow,
          padding: "12px 20px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: COLORS.ink }}>
              Category Management
            </h1>
            <p style={{ margin: "5px 0 0", fontSize: "13px", color: COLORS.muted }}>
              Manage your categories — works offline and syncs when online
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap" }}>
          <button
            onClick={() => setIsImportModalOpen(true)}
            disabled={isLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              height: "40px",
              padding: "0 15px",
              backgroundColor: COLORS.greensoft,
              color: COLORS.green,
              border: `1px solid ${COLORS.line}`,
              borderRadius: "8px",
              fontSize: "13.5px",
              fontWeight: 700,
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.5 : 1,
              transition: "all 0.2s ease",
            }}
            title="Import categories from CSV or Excel"
          >
            <FaPlus size={16} />
            Import
          </button>

          <div style={{ position: "relative" }}>
            <button
              onClick={() => setIsExportModalOpen(true)}
              disabled={isLoading || categories.length === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                height: "40px",
                padding: "0 15px",
                backgroundColor: "#FCE4EC",
                color: "rgb(222, 55, 163)",
                border: `1px solid ${COLORS.line}`,
                borderRadius: "8px",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: isLoading || categories.length === 0 ? "not-allowed" : "pointer",
                opacity: isLoading || categories.length === 0 ? 0.5 : 1,
                transition: "all 0.2s ease",
              }}
              title="Export categories to CSV, Excel, or PDF"
            >
              <FaSync size={16} />
              Export
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={isLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              height: "40px",
              padding: "0 16px",
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryd})`,
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "13.5px",
              fontWeight: 700,
              cursor: isLoading ? "not-allowed" : "pointer",
              boxShadow: "0 6px 15px rgba(63,171,198,.3)",
              whiteSpace: "nowrap",
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <FaPlus size={16} />
            Add Category
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(224px, 1fr))", gap: "14px", marginBottom: "16px" }}>
        <div
          style={{
            backgroundColor: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: "10px",
            boxShadow: COLORS.shadow,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "13px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "9px",
                backgroundColor: COLORS.orangesoft,
                color: COLORS.orange,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FaFolder size={21} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: COLORS.muted, fontWeight: 600 }}>
                Total
              </div>
              <div style={{ fontSize: "23px", fontWeight: 800, color: COLORS.ink, letterSpacing: "-0.5px" }}>
                {totalCategoriesCount}
              </div>
            </div>
          </div>
          <svg width="52" height="32" viewBox="0 0 52 32" style={{ minWidth: "52px" }}>
            <rect x="4" y="14" width="6" height="14" fill={COLORS.orange} opacity="0.6" rx="1" />
            <rect x="14" y="8" width="6" height="20" fill={COLORS.orange} opacity="0.8" rx="1" />
            <rect x="24" y="4" width="6" height="24" fill={COLORS.orange} rx="1" />
            <rect x="34" y="10" width="6" height="18" fill={COLORS.orange} opacity="0.7" rx="1" />
            <rect x="44" y="6" width="6" height="22" fill={COLORS.orange} opacity="0.8" rx="1" />
          </svg>
        </div>

        <div
          style={{
            backgroundColor: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: "10px",
            boxShadow: COLORS.shadow,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "13px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "9px",
                backgroundColor: COLORS.greensoft,
                color: COLORS.green,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FaCheck size={21} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: COLORS.muted, fontWeight: 600 }}>
                Synced
              </div>
              <div style={{ fontSize: "23px", fontWeight: 800, color: COLORS.ink, letterSpacing: "-0.5px" }}>
                {syncedCount}
              </div>
            </div>
          </div>
          <svg width="52" height="32" viewBox="0 0 52 32" style={{ minWidth: "52px" }}>
            <polyline points="4,20 10,12 16,18 22,8 28,14 34,6 40,16 46,10 52,4" stroke={COLORS.green} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div
          style={{
            backgroundColor: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: "10px",
            boxShadow: COLORS.shadow,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "13px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "9px",
                backgroundColor: COLORS.orangesoft,
                color: COLORS.orange,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FaSync size={21} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: COLORS.muted, fontWeight: 600 }}>
                Pending Sync
              </div>
              <div style={{ fontSize: "23px", fontWeight: 800, color: COLORS.ink, letterSpacing: "-0.5px" }}>
                {pendingSyncCount}
              </div>
            </div>
          </div>
          <svg width="52" height="32" viewBox="0 0 52 32" style={{ minWidth: "52px" }}>
            <rect x="4" y="18" width="6" height="10" fill={COLORS.orange} opacity="0.6" rx="1" />
            <rect x="14" y="12" width="6" height="16" fill={COLORS.orange} opacity="0.8" rx="1" />
            <rect x="24" y="14" width="6" height="14" fill={COLORS.orange} rx="1" />
            <rect x="34" y="16" width="6" height="12" fill={COLORS.orange} opacity="0.7" rx="1" />
            <rect x="44" y="10" width="6" height="18" fill={COLORS.orange} opacity="0.8" rx="1" />
          </svg>
        </div>

        <div
          style={{
            backgroundColor: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: "10px",
            boxShadow: COLORS.shadow,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "13px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "9px",
                backgroundColor: "#F0F4F8",
                color: "#6B7280",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FaThLarge size={21} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: COLORS.muted, fontWeight: 600 }}>
                Used Categories
              </div>
              <div style={{ fontSize: "23px", fontWeight: 800, color: COLORS.ink, letterSpacing: "-0.5px" }}>
                {usedCategoriesCount}
              </div>
            </div>
          </div>
          <svg width="52" height="32" viewBox="0 0 52 32" style={{ minWidth: "52px" }}>
            <rect x="4" y="10" width="6" height="18" fill="#6B7280" opacity="0.6" rx="1" />
            <rect x="14" y="6" width="6" height="22" fill="#6B7280" opacity="0.8" rx="1" />
            <rect x="24" y="8" width="6" height="20" fill="#6B7280" rx="1" />
            <rect x="34" y="12" width="6" height="16" fill="#6B7280" opacity="0.7" rx="1" />
            <rect x="44" y="4" width="6" height="24" fill="#6B7280" opacity="0.8" rx="1" />
          </svg>
        </div>
      </div>

      {/* Filter Card */}
      <div
        style={{
          backgroundColor: COLORS.panel,
          border: `1px solid ${COLORS.line}`,
          borderRadius: "10px",
          boxShadow: COLORS.shadow,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: "11px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "190px", maxWidth: "330px" }}>
          <FaSearch
            style={{
              position: "absolute",
              left: "13px",
              top: "50%",
              transform: "translateY(-50%)",
              color: COLORS.muted,
            }}
            size={16}
          />
          <input
            type="text"
            placeholder="Search categories…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              height: "40px",
              border: `1px solid ${COLORS.line}`,
              backgroundColor: COLORS.panel2,
              borderRadius: "8px",
              padding: "0 12px 0 38px",
              fontSize: "13px",
              outline: "none",
              color: COLORS.ink,
            }}
            onFocus={(e) => (e.target.style.borderColor = COLORS.primary)}
            onBlur={(e) => (e.target.style.borderColor = COLORS.line)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            height: "40px",
            border: `1px solid ${COLORS.line}`,
            backgroundColor: COLORS.panel2,
            borderRadius: "8px",
            padding: "0 12px",
            fontSize: "13px",
            outline: "none",
            color: COLORS.ink,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <option value="all">All status</option>
          <option value="Active">Active only</option>
          <option value="Inactive">Inactive only</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{
            height: "40px",
            border: `1px solid ${COLORS.line}`,
            backgroundColor: COLORS.panel2,
            borderRadius: "8px",
            padding: "0 12px",
            fontSize: "12.5px",
            outline: "none",
            color: COLORS.ink,
          }}
        />

        <span style={{ fontSize: "13px", color: COLORS.muted }}>–</span>

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{
            height: "40px",
            border: `1px solid ${COLORS.line}`,
            backgroundColor: COLORS.panel2,
            borderRadius: "8px",
            padding: "0 12px",
            fontSize: "12.5px",
            outline: "none",
            color: COLORS.ink,
          }}
        />

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "3px",
            border: `1px solid ${COLORS.line}`,
            borderRadius: "8px",
            padding: "3px",
            backgroundColor: COLORS.panel2,
          }}
        >
          <button
            onClick={() => setViewMode("table")}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "7px",
              border: "none",
              backgroundColor: viewMode === "table" ? COLORS.panel : "transparent",
              color: viewMode === "table" ? COLORS.primary : COLORS.muted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow:
                viewMode === "table"
                  ? "0 1px 3px rgba(16,30,54,.12)"
                  : "none",
            }}
            title="Table view"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M3 9h18M3 14.5h18M9 4v16"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "7px",
              border: "none",
              backgroundColor: viewMode === "grid" ? COLORS.panel : "transparent",
              color: viewMode === "grid" ? COLORS.primary : COLORS.muted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow:
                viewMode === "grid"
                  ? "0 1px 3px rgba(16,30,54,.12)"
                  : "none",
            }}
            title="Grid view"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="3"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <rect
                x="14"
                y="3"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <rect
                x="3"
                y="14"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <rect
                x="14"
                y="14"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("list")}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "7px",
              border: "none",
              backgroundColor: viewMode === "list" ? COLORS.panel : "transparent",
              color: viewMode === "list" ? COLORS.primary : COLORS.muted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow:
                viewMode === "list"
                  ? "0 1px 3px rgba(16,30,54,.12)"
                  : "none",
            }}
            title="List view"
          >
            <FaList size={17} />
          </button>
        </div>
      </div>

      {/* Data Views */}
      {isLoading && !isRefreshing ? (
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "12px" }}>
            <FaSync
              size={20}
              style={{ animation: "spin 1s linear infinite", color: COLORS.primary }}
            />
            <p style={{ color: COLORS.muted }}>Loading categories...</p>
          </div>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "16px",
              backgroundColor: COLORS.panel2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
            }}
          >
            <FaFolder size={38} style={{ color: COLORS.muted }} />
          </div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: COLORS.ink }}>
            {searchTerm ? "No categories match" : "No categories yet"}
          </div>
          <div style={{ fontSize: "13px", color: COLORS.muted, margin: "6px 0 18px" }}>
            {searchTerm
              ? "Try adjusting your search, status or date filters."
              : "Create your first category to get started."}
          </div>
          {!searchTerm && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                height: "38px",
                padding: "0 16px",
                border: "none",
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryd})`,
                color: "#fff",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Add Category
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        <>
          <TableView
            items={currentItems}
            startIndex={startIndex}
            onEdit={openEditModal}
            onDelete={openDeleteModal}
            colors={COLORS}
          />
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            pages={getPageNumbers()}
            startIndex={startIndex}
            endIndex={endIndex}
            total={filteredCategories.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onPrevious={handlePreviousPage}
            onNext={handleNextPage}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
            colors={COLORS}
          />
        </>
      ) : viewMode === "grid" ? (
        <>
          <GridView
            items={currentItems}
            onEdit={openEditModal}
            onDelete={openDeleteModal}
            colors={COLORS}
          />
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            pages={getPageNumbers()}
            startIndex={startIndex}
            endIndex={endIndex}
            total={filteredCategories.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onPrevious={handlePreviousPage}
            onNext={handleNextPage}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
            colors={COLORS}
          />
        </>
      ) : (
        <>
          <ListView
            items={currentItems}
            startIndex={startIndex}
            onEdit={openEditModal}
            onDelete={openDeleteModal}
            colors={COLORS}
          />
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            pages={getPageNumbers()}
            startIndex={startIndex}
            endIndex={endIndex}
            total={filteredCategories.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onPrevious={handlePreviousPage}
            onNext={handleNextPage}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
            colors={COLORS}
          />
        </>
      )}

      {/* Modals */}
      <UpsertCategoryModal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={closeAllModals}
        onSubmit={isEditModalOpen ? handleUpdateCategory : handleCategorySubmit}
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

      <ImportCategoryModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleBulkImport}
        isLoading={isLoading}
      />

      <ExportCategoryModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        categories={categories}
      />

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

// Table View Component
const TableView = ({ items, startIndex, onEdit, onDelete, colors }) => (
  <div
    style={{
      backgroundColor: colors.panel,
      border: `1px solid ${colors.line}`,
      borderRadius: "10px",
      boxShadow: colors.shadow,
      overflow: "hidden",
      marginBottom: "16px",
    }}
  >
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ backgroundColor: colors.panel2, borderBottom: `1px solid ${colors.line}` }}>
            <th
              style={{
                padding: "8px 18px",
                textAlign: "left",
                fontSize: "11px",
                fontWeight: 700,
                color: colors.muted,
                letterSpacing: "0.4px",
                textTransform: "uppercase",
                width: "40px",
              }}
            >
              #
            </th>
            <th
              style={{
                padding: "12px 18px",
                textAlign: "left",
                fontSize: "11px",
                fontWeight: 700,
                color: colors.muted,
                letterSpacing: "0.4px",
                textTransform: "uppercase",
                width: "130px",
              }}
            >
              Category
            </th>
            <th
              style={{
                padding: "12px 18px",
                textAlign: "left",
                fontSize: "11px",
                fontWeight: 700,
                color: colors.muted,
                letterSpacing: "0.4px",
                textTransform: "uppercase",
                width: "130px",
              }}
            >
              Sub Category
            </th>
            <th
              style={{
                padding: "12px 18px",
                textAlign: "left",
                fontSize: "11px",
                fontWeight: 700,
                color: colors.muted,
                letterSpacing: "0.4px",
                textTransform: "uppercase",
                width: "160px",
              }}
            >
              Description
            </th>
            <th
              style={{
                padding: "12px 18px",
                textAlign: "left",
                fontSize: "11px",
                fontWeight: 700,
                color: colors.muted,
                letterSpacing: "0.4px",
                textTransform: "uppercase",
                width: "100px",
              }}
            >
              Status
            </th>
            <th
              style={{
                padding: "12px 18px",
                textAlign: "left",
                fontSize: "11px",
                fontWeight: 700,
                color: colors.muted,
                letterSpacing: "0.4px",
                textTransform: "uppercase",
                width: "120px",
              }}
            >
              Created
            </th>
            <th
              style={{
                padding: "12px 18px",
                textAlign: "left",
                fontSize: "11px",
                fontWeight: 700,
                color: colors.muted,
                letterSpacing: "0.4px",
                textTransform: "uppercase",
                width: "90px",
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={item.id || item.localId}
              style={{
                borderBottom: `1px solid ${colors.line}`,
                fontSize: "13px",
                backgroundColor: idx % 2 === 0 ? colors.panel : colors.panel2,
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.primarysoft;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = idx % 2 === 0 ? colors.panel : colors.panel2;
              }}
            >
              <td style={{ padding: "6px 18px", color: colors.muted, fontWeight: 600, width: "40px" }}>
                {startIndex + idx + 1}
              </td>
              <td style={{ padding: "6px 18px", width: "130px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {(() => {
                    const categoryColor = getCategoryColor(item.name);
                    return (
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          backgroundColor: categoryColor.bg,
                          color: categoryColor.text,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "13px",
                          flexShrink: 0,
                        }}
                      >
                        {item.name?.charAt(0) || "C"}
                      </div>
                    );
                  })()}
                  <div style={{ fontWeight: 700, color: colors.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "13px" }}>
                    {item.name}
                  </div>
                </div>
              </td>
              <td
                style={{
                  padding: "10px 18px",
                  color: colors.muted,
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "130px",
                }}
              >
                {item.subcategory ? (
                  (() => {
                    const categoryColor = getCategoryColor(item.name);
                    return (
                      <span style={{
                        display: "inline-block",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 600,
                        backgroundColor: categoryColor.bg,
                        color: categoryColor.text,
                        maxWidth: "100%",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {item.subcategory}
                      </span>
                    );
                  })()
                ) : (
                  <span style={{ color: colors.line }}>—</span>
                )}
              </td>
              <td
                style={{
                  padding: "10px 18px",
                  color: colors.muted,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "160px",
                  fontSize: "13px",
                }}
              >
                {item.description || "—"}
              </td>
              <td style={{ padding: "6px 18px", width: "100px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    backgroundColor: item.synced ? colors.greensoft : colors.panel2,
                    color: item.synced ? colors.green : colors.muted,
                  }}
                >
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      backgroundColor: item.synced ? colors.green : colors.muted,
                    }}
                  />
                  {item.synced ? "Active" : "Syncing"}
                </span>
              </td>
              <td style={{ padding: "6px 18px", color: colors.ink, width: "120px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                  <FaCalendar size={13} style={{ color: colors.muted, flexShrink: 0 }} />
                  <span style={{ fontSize: "12px" }}>
                    {new Date(item.updatedAt || item.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </td>
              <td style={{ padding: "6px 18px", display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-start", width: "90px" }}>
                <button
                  onClick={() => onEdit(item)}
                  style={{
                    width: "36px",
                    height: "36px",
                    border: `1px solid ${colors.line}`,
                    backgroundColor: colors.panel,
                    borderRadius: "7px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: colors.muted,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.primarysoft;
                    e.currentTarget.style.color = colors.primary;
                    e.currentTarget.style.borderColor = colors.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.panel;
                    e.currentTarget.style.color = colors.muted;
                    e.currentTarget.style.borderColor = colors.line;
                  }}
                  title="Edit category"
                >
                  <FaEdit size={16} />
                </button>
                <button
                  onClick={() => onDelete(item)}
                  style={{
                    width: "36px",
                    height: "36px",
                    border: `1px solid ${colors.redsoft}`,
                    backgroundColor: colors.panel,
                    borderRadius: "7px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: colors.red,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.redsoft;
                    e.currentTarget.style.borderColor = colors.red;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.panel;
                    e.currentTarget.style.borderColor = colors.redsoft;
                  }}
                  title="Delete category"
                >
                  <FaTrash size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Grid View Component
const GridView = ({ items, onEdit, onDelete, colors }) => (
  <div
    style={{
      padding: "18px",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
      gap: "14px",
      marginBottom: "16px",
    }}
  >
    {items.map((item) => (
      <div
        key={item.id || item.localId}
        style={{
          border: `1px solid ${colors.line}`,
          borderRadius: "9px",
          padding: "15px",
          backgroundColor: colors.panel,
          boxShadow: colors.shadow,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          {(() => {
            const categoryColor = getCategoryColor(item.name);
            return (
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "9px",
                  backgroundColor: categoryColor.bg,
                  color: categoryColor.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "17px",
                  flexShrink: 0,
                }}
              >
                {item.name?.charAt(0) || "C"}
              </div>
            );
          })()}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: colors.ink,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.name}
              </div>
              {item.subcategory && (() => {
                const categoryColor = getCategoryColor(item.name);
                return (
                  <span style={{
                    display: "inline-block",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 600,
                    backgroundColor: categoryColor.bg,
                    color: categoryColor.text,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}>
                    {item.subcategory.substring(0, 15)}
                  </span>
                );
              })()}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: colors.muted,
                marginTop: "1px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.description || "No description"}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "14px",
            paddingTop: "13px",
            borderTop: `1px solid ${colors.line}`,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 9px",
              borderRadius: "6px",
              fontSize: "11.5px",
              fontWeight: 700,
              backgroundColor: item.synced ? colors.greensoft : colors.panel2,
              color: item.synced ? colors.green : colors.muted,
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: item.synced ? colors.green : colors.muted,
              }}
            />
            {item.synced ? "Active" : "Syncing"}
          </span>
          <span style={{ fontSize: "12.5px", fontWeight: 700, color: colors.ink }}>
            {item.products || 0}{" "}
            <span style={{ color: colors.muted, fontWeight: 500, fontSize: "11px" }}>
              items
            </span>
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "11px",
          }}
        >
          <span style={{ fontSize: "11.5px", color: colors.muted, display: "flex", alignItems: "center", gap: "5px" }}>
            <FaCalendar size={13} />
            {new Date(item.updatedAt || item.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => onEdit(item)}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "7px",
                border: "none",
                backgroundColor: "transparent",
                color: colors.muted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Edit"
            >
              <FaEdit size={14} />
            </button>
            <button
              onClick={() => onDelete(item)}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "7px",
                border: "none",
                backgroundColor: "transparent",
                color: colors.red,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Delete"
            >
              <FaTrash size={14} />
            </button>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// List View Component
const ListView = ({ items, startIndex, onEdit, onDelete, colors }) => (
  <div
    style={{
      backgroundColor: colors.panel,
      border: `1px solid ${colors.line}`,
      borderRadius: "10px",
      boxShadow: colors.shadow,
      marginBottom: "16px",
    }}
  >
    {items.map((item, idx) => (
      <div
        key={item.id || item.localId}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "13px",
          padding: "12px 18px",
          borderBottom: idx < items.length - 1 ? `1px solid ${colors.line}` : "none",
        }}
      >
        {(() => {
          const categoryColor = getCategoryColor(item.name);
          return (
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                backgroundColor: categoryColor.bg,
                color: categoryColor.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              {item.name?.charAt(0) || "C"}
            </div>
          );
        })()}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: colors.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {item.name}
            </div>
            {item.subcategory && (() => {
              const categoryColor = getCategoryColor(item.name);
              return (
                <span style={{
                  display: "inline-block",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  fontWeight: 600,
                  backgroundColor: categoryColor.bg,
                  color: categoryColor.text,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}>
                  {item.subcategory}
                </span>
              );
            })()}
          </div>
          <div style={{ fontSize: "12px", color: colors.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.description || "No description"} · {item.products || 0} items
          </div>
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 9px",
            borderRadius: "6px",
            fontSize: "11.5px",
            fontWeight: 700,
            backgroundColor: item.synced ? colors.greensoft : colors.panel2,
            color: item.synced ? colors.green : colors.muted,
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: item.synced ? colors.green : colors.muted,
            }}
          />
          {item.synced ? "Active" : "Syncing"}
        </span>

        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={() => onEdit(item)}
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "7px",
              border: "none",
              backgroundColor: "transparent",
              color: colors.muted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            title="Edit"
          >
            <FaEdit size={14} />
          </button>
          <button
            onClick={() => onDelete(item)}
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "7px",
              border: "none",
              backgroundColor: "transparent",
              color: colors.red,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            title="Delete"
          >
            <FaTrash size={14} />
          </button>
        </div>
      </div>
    ))}
  </div>
);

// Pagination Component
const PaginationBar = ({
  currentPage,
  totalPages,
  pages,
  startIndex,
  endIndex,
  total,
  itemsPerPage,
  onPageChange,
  onPrevious,
  onNext,
  onItemsPerPageChange,
  colors,
}) => (
  <div
    style={{
      backgroundColor: colors.panel,
      border: `1px solid ${colors.line}`,
      borderRadius: "10px",
      boxShadow: colors.shadow,
      padding: "14px 18px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "14px",
      flexWrap: "wrap",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
      <span style={{ fontSize: "13px", color: colors.muted }}>
        Showing {startIndex + 1} to {Math.min(endIndex, total)} of {total} entries
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <span style={{ fontSize: "12.5px", color: colors.muted }}>Rows</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          style={{
            height: "34px",
            border: `1px solid ${colors.line}`,
            backgroundColor: colors.panel2,
            borderRadius: "7px",
            padding: "0 8px",
            fontSize: "12.5px",
            outline: "none",
            color: colors.ink,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>
    </div>

    {totalPages > 1 && (
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <button
          onClick={onPrevious}
          disabled={currentPage === 1}
          style={{
            width: "34px",
            height: "34px",
            border: `1px solid ${colors.line}`,
            backgroundColor: colors.panel,
            borderRadius: "7px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: currentPage === 1 ? "default" : "pointer",
            color: currentPage === 1 ? colors.line : colors.muted,
          }}
          title="Previous page"
        >
          <FaChevronLeft size={16} />
        </button>

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={{
              minWidth: "34px",
              height: "34px",
              padding: "0 8px",
              border: `1px solid ${currentPage === page ? colors.primary : colors.line}`,
              backgroundColor: currentPage === page ? colors.primary : colors.panel,
              color: currentPage === page ? "#fff" : colors.ink,
              borderRadius: "7px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {page}
          </button>
        ))}

        <button
          onClick={onNext}
          disabled={currentPage >= totalPages}
          style={{
            width: "34px",
            height: "34px",
            border: `1px solid ${colors.line}`,
            backgroundColor: colors.panel,
            borderRadius: "7px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: currentPage >= totalPages ? "default" : "pointer",
            color: currentPage >= totalPages ? colors.line : colors.muted,
          }}
          title="Next page"
        >
          <FaChevronRight size={16} />
        </button>
      </div>
    )}
  </div>
);

export default CategoryManagement;
