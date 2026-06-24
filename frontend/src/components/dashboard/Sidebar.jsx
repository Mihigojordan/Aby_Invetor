import {
  Package,
  Users,
  Briefcase,
  Layers,
  Home,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  ShoppingCart,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  X,
  ReceiptPoundSterling,
  FileText,
  UserCheck,
  Shield,
  BoxIcon,
  FolderTree,
  TrendingUp,
  BarChart3,
  Clipboard,
  ClipboardList,
  DollarSign,
  ChevronLeft,
  Download,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import useAdminAuth from "../../context/AdminAuthContext";
import useEmployeeAuth from "../../context/EmployeeAuthContext";
import InstallButton from "./InstallButton";
import Logo from "./Logo";

const Sidebar = ({ isOpen = true, onToggle, role, isExpanded = true, onToggleSidebarSize }) => {
  const { user: adminData } = useAdminAuth();
  const { user: employeeData } = useEmployeeAuth();
  const location = useLocation();

  const adminItems = [
    { key: "dashboard", label: "Dashboard Summary", icon: Home, path: "/admin/dashboard" },
    { key: "employee-list", label: "Employee Management", icon: Users, path: "/admin/dashboard/employee" },
    { key: "employee-report", label: "Employee Report", icon: FileText, path: "/admin/dashboard/employee-report" },
    { key: "permissions", label: "Permission Management", icon: Shield, path: "/admin/dashboard/position" },
    { key: "partners", label: "Partner Management", icon: Briefcase, path: "/admin/dashboard/partner" },
    { key: "product-list", label: "Product Management", icon: Package, path: "/admin/dashboard/product" },
    { key: "category-management", label: "Category Management", icon: FolderTree, path: "/admin/dashboard/category" },
    { key: "stockin", label: "Manage Stock", icon: ArrowDown, path: "/admin/dashboard/stockin" },
    { key: "stockout-movement", label: "Stock Out Management", icon: ArrowUp, path: "/admin/dashboard/stockout" },
    { key: "debt-movement", label: "Debt Management", icon: DollarSign, path: "/admin/dashboard/debt-management" },
    { key: "sales-returns", label: "Sales Returns", icon: RotateCcw, path: "/admin/dashboard/sales-return" },
    { key: "requisition-management", label: "Requisition Management", path: "/admin/dashboard/requisition", icon: Clipboard },
    { key: "stock-requisition-management", label: "Stock Requisition Management", path: "/admin/dashboard/stock-requisition", icon: ClipboardList },
    { key: "expense-movement", label: "Expense Management", icon: ReceiptPoundSterling, path: "/admin/dashboard/expense-management" },
    { key: "credit-movement", label: "Credit Management", icon: ReceiptPoundSterling, path: "/admin/dashboard/credit-management" },
    { key: "sales-report", label: "Sales Report", icon: BarChart3, path: "/admin/dashboard/sales-report" },
    { key: "export-data", label: "Export & Import Data", icon: Download, path: "/admin/dashboard/export-data" },
  ];

  const employeeItems = [
    {
      key: "dashboard",
      label: "Dashboard Summary",
      icon: Home,
      path: "/employee/dashboard",
      alwaysShow: true,
    },
       {
      key: "category-management",
      label: "Category Management",
      icon: FolderTree,
      path: "/employee/dashboard/category",
      features: ["category-management"],
    },
    {
      key: "product-list",
      label: "Product Management",
      icon: Package,
      path: "/employee/dashboard/product",
      features: ["product-list"],
    },

    {
      key: "stockin_receiving",
      label: "Stock  In Management",
      features: ["stockin"],
      icon: ArrowDown,
      path: "/employee/dashboard/stockin",
    },
        {
      key:"partners",
      label: "Partner Management",
      icon: Briefcase,
      path: "/employee/dashboard/partner",
      features: ["partners"],
    },

    {
      key: "stockout-movement",
      label: "Sales  Out Management",
      icon: ArrowUp,
      path: "/employee/dashboard/stockout",
      features: ["stockout-movement"],
    },
    {
      key: "debt-movement",
      label: "Debt Management",
      icon: DollarSign,
      path: "/employee/dashboard/debt-management",
           features: ["debt-movement"],

    },

    {
      key: "sales-returns",
      label: "Sales Returns Management",
      icon: RotateCcw,
      path: "/employee/dashboard/sales-return",
      features: ["sales-returns"],
    },

                {
      key: "expense-movement",
      label: "Expense Management",
      icon: ReceiptPoundSterling,
      path: "/employee/dashboard/expense-management",
        features: ["expense-movement"],
            },
            {
      key: "credit-movement",
      label: "Credit Management",
      icon: ReceiptPoundSterling,
      path: "/employee/dashboard/credit-management",
        features: ["credit-movement"],
            },

    {
      key: "sales-report",
      label: "Sales Report Management",
      icon: BarChart3,
      path: "/employee/dashboard/sales-report",
      features: ["sales-report"],
    },


       {
          key: "requisition-management",
          label: "Requisition Management",
           features: ["requisition-management"],
          path: "/employee/dashboard/requisition",
          icon: Clipboard,
        },
         {
          key: "stock-requisition-management",
          label: "Stock Requisition Management",
          path: "/employee/dashboard/stock-requisition",
          features: ["stock-requisition-management"],
          icon: ClipboardList,
        },


    {
      key: "employee_reports",
      label: "Report Management",
      features: ["employee-report"],
      icon: FileText,
      path: "/employee/dashboard/report",
    },
  ];

  const getFilteredEmployeeItems = () => {
    if (!employeeData || !employeeData.permissions) {
      return employeeItems.filter((item) => item.alwaysShow);
    }
    const accessibleFeatures = employeeData.permissions
      .filter((permission) => permission.access)
      .map((permission) => permission.feature);

    return employeeItems.filter((item) => {
      if (item.alwaysShow) return true;

      if (item.features) {
        return item.features.some((feature) => accessibleFeatures.includes(feature));
      }

      return false;
    });
  };

  const getCurrentMenuItems = () => {
    if (role === "admin") return adminItems;
    if (role === "employee") return getFilteredEmployeeItems();
    return [];
  };

  const currentMenuItems = getCurrentMenuItems();

  const SidebarItem = ({ item, isActive }) => (
    <Link
      to={item.path}
      onClick={() => {
        if (window.innerWidth < 1024) onToggle();
      }}
      title={!isExpanded ? item.label : undefined}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative"
      style={{
        backgroundColor: isActive ? 'rgba(63, 171, 198, 0.1)' : 'transparent',
        color: '#8A93A6',
      }}
    >
      <item.icon
        className="w-5 h-5 flex-shrink-0 transition-colors"
        style={{ color: isActive ? '#3fabc6' : '#8A93A6', fill: isActive ? '#3fabc6' : 'none' }}
      />
      {isExpanded && (
        <span className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">
          {item.label}
        </span>
      )}
      {!isExpanded && (
        <div className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
          {item.label}
        </div>
      )}
    </Link>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <div
        className={`fixed left-0 top-0 min-h-screen bg-white flex flex-col transition-all duration-300 z-50 lg:relative lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          borderRight: '1px solid #E6E9F0',
          width: isExpanded ? '350px' : '80px'
        }}
      >
        {/* Sidebar Header */}
        <div
          className="flex items-center justify-between p-4 lg:p-3"
          style={{
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            background: 'linear-gradient(135deg, rgba(63, 171, 198, 0.05), rgba(224, 72, 75, 0.03))'
          }}
        >
          <Logo isExpanded={isExpanded} subtitle={role === 'admin' ? 'Admin Dashboard' : 'Employee Dashboard'} showSubtitle={isExpanded} />
          <div className="flex gap-1">
            {isExpanded && (
              <button
                onClick={onToggleSidebarSize}
                className="p-1.5 rounded-lg transition-colors lg:flex hidden"
                style={{ backgroundColor: 'rgba(63, 171, 198, 0.1)', color: '#3fabc6' }}
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {!isExpanded && (
              <button
                onClick={onToggleSidebarSize}
                className="p-1.5 rounded-lg transition-colors lg:flex hidden mx-auto"
                style={{ backgroundColor: 'rgba(63, 171, 198, 0.1)', color: '#3fabc6' }}
                title="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onToggle}
              className="lg:hidden p-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: 'rgba(63, 171, 198, 0.1)', color: '#3fabc6' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto p-2">
          <nav className="space-y-1">
            {currentMenuItems.length > 0 ? (
              currentMenuItems.map((item) => (
                <SidebarItem
                  key={item.key}
                  item={item}
                  isActive={location.pathname === item.path}
                />
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-xs font-light" style={{ color: '#8A93A6' }}>
                  No menu items
                </p>
              </div>
            )}
          </nav>
        </div>

        {/* Sidebar Footer */}
        {isExpanded && <InstallButton />}
      </div>
    </>
  );
};

export default Sidebar;