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
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAdminAuth from "../../context/AdminAuthContext";
import useEmployeeAuth from "../../context/EmployeeAuthContext";
import InstallButton from "./InstallButton";

const Sidebar = ({ isOpen = true, onToggle, role }) => {
  const [openDropdown, setOpenDropdown] = useState(null);
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
      "/admin/dashboard/sales-report"
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
      key: "employees",
      label: "Employee Management",
      icon: Users,
      isDropdown: true,
      children: [
        {
          key: "employee-list",
          label: "Employee List",
          path: "/admin/dashboard/employee",
        },
        {
          key: "employee-report",
          label: "Employee Report",
          path: "/admin/dashboard/employee-report",
        },
        {
          key: "permissions",
          label: "Permission Management",
          path: "/admin/dashboard/position",
        },
      ],
    },
    {
      key: "products",
      label: "Product Management",
      icon: Package,
      isDropdown: true,
      children: [
        {
          key: "product-list",
          label: "Product List",
          path: "/admin/dashboard/product",
        },
        {
          key: "category-management",
          label: "Category List",
          path: "/admin/dashboard/category",
        },
      ],
    },
    {
      key: "stockin",
      label: "Manage Stock",
      icon: ArrowDown,
      path: "/admin/dashboard/stockin",
    },
    {
      key: "stockout",
      label: "Stock Adjustment",
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
      key: "products",
      label: "Product Management",
      icon: Package,
      isDropdown: true,
      taskname: ["receiving", "returning", "return", "stockin"],
      children: [
        {
          key: "product-list",
          label: "Product List",
          path: "/employee/dashboard/product",
          taskname: ["receiving", "returning", "return", "stockin"],
        },
        {
          key: "category-management",
          label: "Category List",
          path: "/employee/dashboard/category",
          taskname: ["receiving", "returning", "return", "stockin"],
        },
      ],
    },
    {
      key: "stockin_receiving",
      label: "Manage Stock",
      taskname: ["receiving", "stockin"],
      icon: ArrowDown,
      path: "/employee/dashboard/stockin",
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
      ],
    },
    {
      key: "employee_reports",
      label: "Report Management",
      taskname: ["receiving", "stockin","returning", "return","saling", "selling", "sales", "stockout", "returning", "return"],
      icon: ArrowDown,
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
        const hasRequiredTask = item.taskname.some((task) => employeeTaskNames.includes(task));
        if (hasRequiredTask && item.isDropdown) {
          // Filter submenu items based on employee tasks
          item.children = item.children.filter((child) => {
            if (!child.taskname) return true;
            return child.taskname.some((task) => employeeTaskNames.includes(task));
          });
          return item.children.length > 0; // Only show if has accessible submenu items
        }
        return hasRequiredTask;
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

  const SidebarItem = ({ item, isActive, onClick }) => (
    <button
      onClick={() => onClick(item.key)}
      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-primary-100 text-primary-700 border-r-2 border-primary-600"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      <item.icon
        className={`w-5 h-5 ${isActive ? "text-primary-600" : "text-gray-400"}`}
      />
      <span className="font-medium">{item.label}</span>
    </button>
  );

  const DropdownItem = ({ item, isActive }) => (
    <Link
      to={item.path}
      className={`flex items-center space-x-3 px-6 py-2 rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-primary-50 text-primary-700"
          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
      }`}
      onClick={() => {
        if (window.innerWidth < 1024) onToggle();
      }}
    >
      <span className="text-sm font-normal">{item.label}</span>
    </Link>
  );

  const DropdownHeader = ({ item, isOpen, onToggle }) => {
    const hasActiveChild = item.children?.some(child => location.pathname === child.path);
    
    return (
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${
          hasActiveChild
            ? "bg-primary-50 text-primary-700"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        }`}
      >
        <div className="flex items-center space-x-2">
          <item.icon
            className={`w-5 h-5 ${hasActiveChild ? "text-primary-600" : "text-gray-400"}`}
          />
          <span className="font-medium">{item.label}</span>
        </div>
        <div className="transition-transform duration-200">
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>
    );
  };

  const renderMenuItem = (item) => {
    if (item.isDropdown) {
      const isOpen = openDropdown === item.key;
      
      return (
        <div key={item.key} className="mb-1">
          <DropdownHeader
            item={item}
            isOpen={isOpen}
            onToggle={() => toggleDropdown(item.key)}
          />
          {isOpen && (
            <div className="space-y-1 ml-2 mt-2">
              {item.children.map((child) => (
                <DropdownItem
                  key={child.key}
                  item={child}
                  isActive={location.pathname === child.path}
                />
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <Link
        key={item.key}
        to={item.path}
        className="block"
        onClick={() => {
          if (window.innerWidth < 1024) onToggle();
        }}
      >
        <SidebarItem
          item={item}
          isActive={location.pathname === item.path}
          onClick={() => {}}
        />
      </Link>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <div
        className={`fixed left-0 top-0 min-h-screen bg-white flex flex-col shadow-lg transform transition-transform duration-300 z-50 lg:relative lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:w-3/12 xl:w-2/12`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                ABY Inventory
              </h1>
              <p className="text-xs text-gray-500 capitalize">
                {role} Dashboard
              </p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto p-2 font-light">
          <nav className="space-y-1">
            {currentMenuItems.length > 0 ? (
              currentMenuItems.map(renderMenuItem)
            ) : (
              <div className="text-center py-3">
                <p className="text-gray-500 text-sm font-light">
                  No additional menu items available
                </p>
                {role === "employee" && (
                  <p className="text-gray-400 text-xs mt-2">
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