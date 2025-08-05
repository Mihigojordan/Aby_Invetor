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
  User,
  X
} from 'lucide-react';
import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import useAdminAuth from '../../context/AdminAuthContext';
import useEmployeeAuth from '../../context/EmployeeAuthContext';

const Sidebar = ({ isOpen = true, onToggle, role }) => {
  const [expandedMenus, setExpandedMenus] = useState({});
  const { user: adminData } = useAdminAuth();
  const { user: employeeData } = useEmployeeAuth();
  const navigate = useNavigate();

  const toggleSubmenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const adminItems = [
    { key: 'dashboard', label: 'Dashboard Summary', icon: Home, path: '/admin/dashboard' },
    { key: 'employees', label: 'Employees Management', icon: Users, path: '/admin/dashboard/employee' },
    { key: 'positions', label: 'Permission Management', icon: Briefcase, path: '/admin/dashboard/position' },
    { key: 'category', label: 'Category Management', icon: Layers, path: '/admin/dashboard/category' },
    { key: 'products', label: 'Products Management', icon: Package, path: '/admin/dashboard/product' },
    { key: 'stockin', label: 'Stock In Movement', icon: ArrowDown, path: '/admin/dashboard/stockin' },
    { key: 'stockout', label: 'Stock Out Movement', icon: ArrowUp, path: '/admin/dashboard/stockout' },
    // { key: 'returning', label: 'Sales Returns', icon: RotateCcw, path: '/admin/dashboard/sales-return' },
  ];

const employeeItems = [
 { key: 'dashboard', label: 'Dashboard Summary', icon: Home, path: '/employee/dashboard', alwaysShow: true },
  {
    key: 'category_receiving_returning',
    label: 'Category Management',
    taskname: ['receiving', 'returning','return','stockin'],
    icon: Layers, // Good choice, keep as is
    path: '/employee/dashboard/category'
  },
  {
    key: 'product_receiving_returning',
    label: 'Product Management',
    taskname: ['receiving', 'returning','return','stockin'],
    icon: Package, // Better than TagIcon for products
    path: '/employee/dashboard/product'
  },
  {
    key: 'stockin_receiving',
    label: 'Stock In Management',
    taskname: ['receiving','stockin'],
    icon: ArrowDown, // Clear indication of incoming stock
    path: '/employee/dashboard/stockin'
  },
  {
    key: 'stockout',
    label: 'Stock Out Management',
    taskname: ['saling','selling','sales','stockout'],
    icon: ShoppingCart, // More specific for sales than generic ArrowUp
    path: '/employee/dashboard/stockout'
  },
  // {
  //   key: 'returning',
  //   label: 'Sales Returns Management',
  //   taskname: ['returning','return'],
  //   icon: RotateCcw, // Better than Undo2Icon for returns
  //   path: '/employee/dashboard/sales-return'
  // },
];
 

  const getProfileRoute = () => role === 'admin' ? '/admin/dashboard/profile' : '/employee/dashboard/profile';

  const handleNavigateProfile = () => {
    const route = getProfileRoute();
    if (route) navigate(route, { replace: true });
  };

  const getFilteredEmployeeItems = () => {
    if (!employeeData || !employeeData.tasks) {
      return employeeItems.filter(item => item.alwaysShow);
    }
    const employeeTaskNames = employeeData.tasks.map(task => task.taskname);
    return employeeItems.filter(item =>
      item.alwaysShow || (item.taskname && item.taskname.some(task => employeeTaskNames.includes(task)))
    );
  };

  const getCurrentMenuItems = () => {
    if (role === 'admin') return adminItems;
    if (role === 'employee') return getFilteredEmployeeItems();
    return [];
  };

  const currentMenuItems = getCurrentMenuItems();

  useEffect(() => {
    const activePath = window.location.pathname;
    currentMenuItems.forEach(item => {
      if (item.submenu) {
        const isSubmenuActive = item.submenu.some(subItem => activePath.startsWith(subItem.path));
        if (isSubmenuActive) {
          setExpandedMenus(prev => ({ ...prev, [item.key]: true }));
        }
      }
    });
  }, [currentMenuItems]);

  const renderMenuItem = (item) => {
    const Icon = item.icon;
    const isExpanded = expandedMenus[item.key];

    return (
      <div key={item.key} className="mb-1">
        {item.hasSubmenu ? (
          <button
            onClick={() => toggleSubmenu(item.key)}
            className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-all duration-200 group ${isExpanded ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-100 hover:text-primary-600'}`}
          >
            <div className="flex items-center space-x-2">
              <Icon className={`w-5 h-5 ${isExpanded ? 'text-primary-600' : 'text-gray-500 group-hover:text-primary-600'}`} />
              <span className="font-normal">{item.label}</span>
            </div>
            <ChevronRight className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <NavLink
            to={item.path}
            end
            className={({ isActive }) =>
              `w-full flex items-center justify-between px-2 py-3 text-left rounded-lg transition-all duration-200 group ${isActive ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600' : 'text-gray-700 hover:bg-gray-100 hover:text-primary-600'}`
            }
            onClick={() => {
              if (window.innerWidth < 1024) onToggle();
            }}
          >
            <div className="flex items-center space-x-2">
              <Icon className="w-4 h-4 text-gray-500 group-hover:text-primary-600" />
              <span className="font-normal">{item.label}</span>
            </div>
          </NavLink>
        )}

        {item.hasSubmenu && (
          <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="ml-6 mt-4 space-y-1">
              {item.submenu.map(subItem => (
                <NavLink
                  key={subItem.key}
                  to={subItem.path}
                  end
                  className={({ isActive }) =>
                    `w-full block text-left px-3 py-1.5 text-sm rounded-md transition-colors ${isActive ? 'bg-primary-100 text-primary-700 font-normal border-r-2 border-primary-600' : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'}`
                  }
                  onClick={() => {
                    if (window.innerWidth < 1024) onToggle();
                  }}
                >
                  {subItem.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onToggle} />
      )}

      <div className={`fixed left-0 top-0 min-h-screen bg-white flex flex-col shadow-lg transform transition-transform duration-300 z-50 lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:w-3/12 xl:w-2/12`}>

        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">ABY Inventory</h1>
              <p className="text-xs text-gray-500 capitalize">{role} Dashboard</p>
            </div>
          </div>
          <button onClick={onToggle} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto p-2  font-light">
          <nav className="space-y-1 ">
            {currentMenuItems.length > 0 ? (
              currentMenuItems.map(renderMenuItem)
            ) : (
              <div className="text-center py-3">
                <p className="text-gray-500 text-sm font-light">No additional menu items available</p>
                {role === 'employee' && (
                  <p className="text-gray-400 text-xs mt-2">Contact admin to assign tasks for more options</p>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 cursor-pointer" onClick={handleNavigateProfile}>
          <div className="flex items-center space-x-3 p-3 bg-primary-50 rounded-lg">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            {role === 'admin' ? (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-normal text-gray-900 truncate">
                  {adminData?.adminName || 'Admin User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {adminData?.adminEmail || 'admin@example.com'}
                </p>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-normal text-gray-900 truncate">
                  {employeeData?.firstname} {employeeData?.lastname}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {employeeData?.email}
                </p>
                {employeeData?.tasks && (
                  <p className="text-xs text-gray-400 truncate">Tasks: {employeeData.tasks.length}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
