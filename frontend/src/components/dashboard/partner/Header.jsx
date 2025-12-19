// components/dashboard/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, User, Settings, Lock, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePartnerAuth } from '../../../context/PartnerAuthContext'; // Adjust path

const Header = ({ onToggle }) => {
  const { partner, logout } = usePartnerAuth();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close with Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/partner/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleProfile = () => {
    navigate('/partner/dashboard/profile');
    setIsDropdownOpen(false);
  };

  const handleSettings = () => {
    navigate('/partner/dashboard/settings');
    setIsDropdownOpen(false);
  };

  // Display name fallback
  const displayName = partner?.name || 'Partner Store';
  const email = partner?.email || 'partner@example.com';

  // Initials for avatar fallback
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">

          {/* Left: Menu Button + Title */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            <div>
              <h1 className="text-xl font-bold text-gray-900">ABY Inventory</h1>
              <p className="text-sm text-gray-600 hidden sm:block">
                Partner Portal • Real-time inventory management
              </p>
            </div>
          </div>

          {/* Right: Actions + User Dropdown */}
          <div className="flex items-center space-x-3">

            {/* Notification Bell */}
            <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Settings Icon */}
            <button
              onClick={handleSettings}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition hidden sm:block"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* User Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition"
              >
                {/* Avatar */}
                <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm">
                  {initials || <User className="w-5 h-5" />}
                </div>

                {/* User Info (hidden on small screens) */}
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500">Partner</p>
                </div>

                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                  {/* User Info Header */}
                  <div className="px-4 py-3 bg-primary-50 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {initials || <User className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                        <p className="text-xs text-gray-600 truncate max-w-44">{email}</p>
                        <p className="text-xs font-medium text-primary-600 mt-0.5">Partner Account</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={handleProfile}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      <User className="w-4 h-4 mr-3 text-gray-500" />
                      My Profile
                    </button>

                    <button
                      onClick={handleSettings}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      <Settings className="w-4 h-4 mr-3 text-gray-500" />
                      Settings
                    </button>

                    {/* Optional: Lock Screen (if you have lock functionality) */}
                    {/* 
                    <button
                      onClick={handleLock}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      <Lock className="w-4 h-4 mr-3 text-gray-500" />
                      Lock Screen
                    </button>
                    */}

                    <div className="border-t border-gray-200 my-1"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;