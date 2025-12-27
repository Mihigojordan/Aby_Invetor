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
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAdminAuth from "../../context/AdminAuthContext";
import useEmployeeAuth from "../../context/EmployeeAuthContext";
import InstallButton from "./InstallButton";

const Sidebar = ({ isOpen = true, onToggle, role }) => {
  const { user: adminData } = useAdminAuth();
  const { user: employeeData } = useEmployeeAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-open dropdowns if current path matches any child item
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Check if current path is within employee management section
    const employeePages = [
      "/admin/dashboard/employee",
      "/employee/dashboard/employee",
      "/admin/dashboard/employee-report",
      "/employee/dashboard/report",
      "/admin/dashboard/position",
      "/employee/dashboard/position"
    ];
    
    // Check if current path is within product management section
    const productPages = [
      "/admin/dashboard/product",
      "/employee/dashboard/product",
      "/admin/dashboard/category",
      "/employee/dashboard/category"
    ];
    
    // Check if current path is within stockout management section
    const stockoutPages = [
      "/admin/dashboard/stockout",
      "/employee/dashboard/stockout",
      "/admin/dashboard/sales-return",
      "/employee/dashboard/sales-return",
      "/admin/dashboard/sales-report",
      "/employee/dashboard/requisition",
      "/admin/dashboard/requisition",

    ];
    
    if (employeePages.includes(currentPath)) {
      setOpenDropdown('employees');
    } else if (productPages.includes(currentPath)) {
      setOpenDropdown('products');
    } else if (stockoutPages.includes(currentPath)) {
      setOpenDropdown('stockout');
    } else {
      setOpenDropdown(null);
    }
  }, [location.pathname]);

  const toggleDropdown = (dropdownId) => {
    setOpenDropdown(openDropdown === dropdownId ? null : dropdownId);
  };

  const adminItems = [
    {
      key: "dashboard",
      label: "Dashboard Summary",
      icon: Home,
      path: "/admin/dashboard",
    },
    {
      key: "employee-list",
      label: "Employee List",
      icon: Users,
      path: "/admin/dashboard/employee",
    },
    {
      key:"partners",
      label: "Partner Management",
      icon: Briefcase,
      path: "/admin/dashboard/partner",
    },
    
    {
      key: "products",
      label: "Product Management",
      icon: Package,
      path: "/admin/dashboard/product",
    },
    {
      key: "category-management",
      label: "Category List",
      icon: FolderTree,
      path: "/admin/dashboard/category",
    },
    {
      key: "stockin",
      label: "Manage Stock",
      icon: ArrowDown,
      path: "/admin/dashboard/stockin",
    },
    {
      key: "stockout-movement",
      label: "Stock Out List",
      icon: ArrowUp,
      isDropdown: true,
      children: [
        {
          key: "stockout-movement",
          label: "Stock Out List",
          path: "/admin/dashboard/stockout",
        },
        {
          key: "sales-returns",
          label: "Sales Returns",
          path: "/admin/dashboard/sales-return",
        },
        {
          key: "sales-report",
          label: "Sales Report",
          path: "/admin/dashboard/sales-report",
        },
        {
          key: "requisition-management",
          label: "Requisition Management",
          path: "/admin/dashboard/requisition",
        },
      ],
    },
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
      taskname: ["receiving", "returning", "return", "stockin"],
    },
    {
      key: "product-list",
      label: "Product Management",
      icon: Package,
      path: "/employee/dashboard/product",
      taskname: ["receiving", "returning", "return", "stockin"],
    },
 
    {
      key: "stockin_receiving",
      label: "Stock  In Management",
      taskname: ["receiving", "stockin"],
      icon: ArrowDown,
      path: "/employee/dashboard/stockin",
    },
        {
      key:"partners",
      label: "Partner Management",
      icon: Briefcase,
      path: "/employee/dashboard/partner",
    },
    
    {
      key: "stockout",
      label: "Stock Adjustment",
      icon: ShoppingCart,
      isDropdown: true,
      taskname: ["saling", "selling", "sales", "stockout", "returning", "return"],
      children: [
        {
          key: "stockout-movement",
          label: "Stock Out List",
          path: "/employee/dashboard/stockout",
          taskname: ["saling", "selling", "sales", "stockout"],
        },
        {
          key: "sales-returns",
          label: "Sales Returns",
          path: "/employee/dashboard/sales-return",
          taskname: ["returning", "return"],
        },
        {
          key: "sales-report",
          label: "Sales Report",
          path: "/employee/dashboard/sales-report",
          taskname: ["saling", "selling", "sales", "stockout"],
        },
        {
          key: "requisition-management",
          label: "Requisition Management",
          path: "/employee/dashboard/requisition",
          taskname: ["saling", "selling", "sales", "stockout"],
        },
      ],
    },
    {
      key: "employee_reports",
      label: "Report Management",
      taskname: ["receiving", "stockin", "returning", "return", "saling", "selling", "sales", "stockout", "returning", "return"],
      icon: FileText,
      path: "/employee/dashboard/report",
    },
  ];

  const getProfileRoute = () =>
    role === "admin"
      ? "/admin/dashboard/profile"
      : "/employee/dashboard/profile";

  const handleNavigateProfile = () => {
    const route = getProfileRoute();
    if (route) navigate(route, { replace: true });
  };

  const getFilteredEmployeeItems = () => {
    if (!employeeData || !employeeData.tasks) {
      return employeeItems.filter((item) => item.alwaysShow);
    }
    const employeeTaskNames = employeeData.tasks.map((task) => task.taskname);
    
    return employeeItems.filter((item) => {
      if (item.alwaysShow) return true;
      
      if (item.taskname) {
        return item.taskname.some((task) => employeeTaskNames.includes(task));
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
      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-primary-100 text-primary-700 border-r-2 border-primary-600"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      <item.icon
        className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-primary-600" : "text-gray-400"}`}
      />
      <span className="font-medium text-sm">{item.label}</span>
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
        className={`fixed left-0 top-0 min-h-screen bg-white flex flex-col border-r border-primary-200 transform transition-transform duration-300 z-50 lg:relative lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:w-3/12 xl:w-[21%]`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-2.5 border-b border-primary-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                ABY Inventory
              </h1>
              <p className="text-[0.7rem] text-gray-500 capitalize">
                {role} Dashboard
              </p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
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
              <div className="text-center py-2">
                <p className="text-gray-500 text-sm font-light">
                  No additional menu items available
                </p>
                {role === "employee" && (
                  <p className="text-gray-400 text-xs mt-1">
                    Contact admin to assign tasks for more options
                  </p>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <InstallButton /> 
      </div>
    </>
  );
};

export default Sidebar;