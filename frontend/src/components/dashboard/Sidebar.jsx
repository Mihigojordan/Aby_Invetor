import { 
  Package, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  Bell, 
  Settings, 
  LogOut, 
  Plus, 
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  ShoppingCart,
  Truck,
  User,
  Menu,
  X,
  Home,
  FileText,
  PieChart,
  Calendar,
  CreditCard,
  Archive,
  UserCheck,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Building,
  Activity,
  Target,
  DollarSign,
  Layers,
  Tag,
  User2,
  PresentationIcon,
  ClipboardList
} from 'lucide-react';
import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import useAdminAuth from '../../context/AdminAuthContext';

// Sidebar Component with NavLink
const Sidebar = ({ isOpen =true , onToggle }) => {
  const [expandedMenus, setExpandedMenus] = useState({});
  const {user} = useAdminAuth()

  const toggleSubmenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const menuItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/admin/dashboard'
    },
    {
      key: 'employee',
      label: 'Employee',
      icon: User2,
     path:'/admin/dashboard/employee'
    },
    {
      key: 'postions',
      label: 'Position',
      icon: ClipboardList,
      path:'/admin/dashboard/position'
    },
    {
      key: 'suppliers',
      label: 'Suppliers',
      icon: Truck,
      hasSubmenu: true,
      submenu: [
        { key: 'all-suppliers', label: 'All Suppliers', path: '/admin/dashboard/suppliers' },
        { key: 'add-supplier', label: 'Add Supplier', path: '/admin/dashboard/suppliers/add' },
        { key: 'supplier-orders', label: 'Purchase Orders', path: '/admin/dashboard/suppliers/orders' }
      ]
    },
 
  ];

  // Auto-expand parent menu if a submenu item is active
  useEffect(() => {
    const activePath = window.location.pathname;
    menuItems.forEach(item => {
      if (item.submenu) {
        const isSubmenuActive = item.submenu.some(subItem => activePath.startsWith(subItem.path));
        if (isSubmenuActive) {
          setExpandedMenus(prev => ({
            ...prev,
            [item.key]: true
          }));
        }
      }
    });
  }, []);

  const renderMenuItem = (item) => {
    const Icon = item.icon;
    const isExpanded = expandedMenus[item.key];

    return (
      <div key={item.key} className="mb-1">
        {/* Main Menu Item */}
        {item.hasSubmenu ? (
          <button
            onClick={() => toggleSubmenu(item.key)}
            className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-all duration-200 group ${
              isExpanded
                ? 'bg-primary-50 text-primary-600'
                : 'text-gray-700 hover:bg-gray-100 hover:text-primary-600'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Icon className={`w-5 h-5 transition-colors ${
                isExpanded ? 'text-primary-600' : 'text-gray-500 group-hover:text-primary-600'
              }`} />
              <span className="font-medium">{item.label}</span>
            </div>
            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        ) : (
          <NavLink
            to={item.path}
            end
            className={({ isActive }) =>
              `w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-primary-600'
              }`
            }
            onClick={() => {
              if (window.innerWidth < 1024) {
                onToggle();
              }
            }}
          >
            <div className="flex items-center space-x-3">
              <Icon className="w-5 h-5 transition-colors text-gray-500 group-hover:text-primary-600" />
              <span className="font-medium">{item.label}</span>
            </div>
          </NavLink>
        )}

        {/* Submenu */}
        {item.hasSubmenu && (
          <div className={`overflow-hidden transition-all duration-300 ${
            isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="ml-8 mt-2 space-y-1">
              {item.submenu.map((subItem) => (
                <NavLink
                  key={subItem.key}
                  to={subItem.path}
                  end
                  className={({ isActive }) =>
                    `w-full block text-left px-4 py-2 text-sm rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700 font-medium border-r-2 border-primary-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                    }`
                  }
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      onToggle();
                    }
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
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 min-h-screen bg-white flex flex-col shadow-lg transform transition-transform duration-300 z-50 lg:relative lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } xl:w-2/12`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ABY Inventory</h1>
              <p className="text-xs text-gray-500">Admin Dashboard</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-2">
            {menuItems.map(renderMenuItem)}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 p-3 bg-primary-50 rounded-lg">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.adminName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.adminEmail}</p>
            </div>
          </div>
          
        
        </div>
      </div>
    </>
  );
};

export default Sidebar;