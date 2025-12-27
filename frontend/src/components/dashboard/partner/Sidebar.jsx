// components/dashboard/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import {
  Home,
  Package,
  ShoppingCart,
  TrendingUp,
  Settings,
  LogOut,
  ChevronDown,
  ChevronUp,
  X,
  BarChart3,
  FileText,
  User,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePartnerAuth } from '../../../context/PartnerAuthContext'; // Adjust path
import InstallButton from '../InstallButton'; // Optional PWA install button

const Sidebar = ({ isOpen = true, onToggle }) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const { partner, logout } = usePartnerAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-open relevant dropdown based on current path
  useEffect(() => {
    const path = location.pathname;

    if (path.includes('/inventory') || path.includes('/category')) {
      setOpenDropdown('inventory');
    } else if (path.includes('/orders') || path.includes('/sales') || path.includes('/returns')) {
      setOpenDropdown('orders');
    } else if (path.includes('/reports') || path.includes('/analytics')) {
      setOpenDropdown('reports');
    } else {
      setOpenDropdown(null);
    }
  }, [location.pathname]);

  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/partner/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const menuItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/partner/dashboard',
    },
    
    {
      key: 'orders',
      label: "Requisitions",
      icon: ShoppingCart,
     path: '/partner/dashboard/requisition',
    },
   
  ];

  const DropdownHeader = ({ item, isOpen }) => {
    const hasActiveChild = item.children?.some(child => location.pathname.startsWith(child.path));

    return (
      <button
        onClick={() => toggleDropdown(item.key)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${
          hasActiveChild || openDropdown === item.key
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center space-x-3">
          <item.icon className={`w-5 h-5 ${hasActiveChild ? 'text-primary-600' : 'text-gray-400'}`} />
          <span className="font-medium text-sm">{item.label}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
    );
  };

  const DropdownItem = ({ child }) => {
    const isActive = location.pathname === child.path;

    return (
      <Link
        to={child.path}
        className={`flex items-center space-x-3 px-9 py-2 text-sm rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-primary-100 text-primary-700 font-medium'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
        onClick={() => window.innerWidth < 1024 && onToggle?.()}
      >
        <span>{child.label}</span>
      </Link>
    );
  };

  const SingleItem = ({ item }) => {
    const isActive = location.pathname === item.path;

    return (
      <Link
        to={item.path}
        className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-primary-100 text-primary-700 border-r-4 border-primary-600'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
        onClick={() => window.innerWidth < 1024 && onToggle?.()}
      >
        <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
        <span className="font-medium text-sm">{item.label}</span>
      </Link>
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
      <aside
        className={`fixed left-0 top-0 min-h-screen w-72 bg-white flex flex-col shadow-xl transform transition-transform duration-300 z-50 lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ABY Inventory</h1>
              <p className="text-xs text-gray-500">Partner Portal</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              if (item.isDropdown) {
                const isOpen = openDropdown === item.key;
                return (
                  <div key={item.key} className="mb-1">
                    <DropdownHeader item={item} isOpen={isOpen} />
                    {isOpen && (
                      <div className="mt-1 space-y-0.5">
                        {item.children.map((child) => (
                          <DropdownItem key={child.key} child={child} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return <SingleItem key={item.key} item={item} />;
            })}
          </nav>
        </div>

        {/* Footer: Logout */}
        <div className="p-4 border-t border-gray-200">
     
          {/* Optional: PWA Install Button */}
          <div className="mt-3">
            <InstallButton />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;