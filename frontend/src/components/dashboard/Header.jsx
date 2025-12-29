import { Bell, LogOut, Menu, Settings, User, Lock, ChevronDown, Moon, Sun, Maximize2, Grid } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAdminAuth from '../../context/AdminAuthContext'
import useEmployeeAuth from '../../context/EmployeeAuthContext'
import { API_URL } from '../../api/api'
import ReactCountryFlag from 'react-country-flag'

const Header = ({ onToggle, role }) => {
  const adminAuth = useAdminAuth()
  const employeeAuth = useEmployeeAuth()
  const authContext = role === 'admin' ? adminAuth : employeeAuth
  const { user, logout, lockAdmin, lockEmployee } = authContext

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [language, setLanguage] = useState('US')
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const onLogout = async () => logout()

  const handleLock = async () => {
    role === 'admin' ? await lockAdmin() : await lockEmployee()
  }

  const getDisplayName = () =>
    role === 'admin'
      ? user?.adminName || 'Admin'
      : `${user?.firstname || ''} ${user?.lastname || ''}`.trim() || 'Employee'

  const getProfileRoute = () =>
    role === 'admin'
      ? '/admin/dashboard/profile'
      : '/employee/dashboard/profile?tab=general'

  useEffect(() => {
    const handler = (e) => dropdownRef.current && !dropdownRef.current.contains(e.target) && setIsDropdownOpen(false)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="bg-white border-b border-primary-200">
      <div className="px-3 sm:px-4 md:px-6 py-2 flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={onToggle} className="lg:hidden p-2 rounded-lg bg-primary-600 text-white">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="hidden xl:block text-xl font-bold text-gray-900"> Welcome to Umusingi Hardware</h1>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
          {/* Language */}
          <button onClick={() => setLanguage(language === 'US' ? 'FR' : 'US')} className="p-2 rounded-lg hover:bg-gray-100">
            <ReactCountryFlag svg countryCode={language} style={{ width: '1.5em', height: '1.5em' }} />
          </button>

          {/* Fullscreen */}
          <button onClick={() => document.documentElement.requestFullscreen()} className="p-2 rounded-lg hover:bg-gray-100">
            <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          </button>

          {/* App Grid */}
          <button className="p-2 rounded-lg hover:bg-gray-100">
            <Grid className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-gray-100">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Dark Mode */}
          <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-lg hover:bg-gray-100">
            {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />}
          </button>

          {/* Profile */}
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-1 sm:gap-2 p-2 rounded-lg hover:bg-gray-100">
              {user?.profileImg ? (
                <img src={`${API_URL}${user.profileImg}`} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" alt="Profile" />
              ) : (
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              )}
              <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-500 transition ${isDropdownOpen && 'rotate-180'}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border rounded-xl shadow-lg overflow-hidden z-50">
                <div className="px-4 py-3 border-b">
                  <p className="font-medium text-gray-900">{getDisplayName()}</p>
                  <p className="text-xs text-gray-500">{role}</p>
                </div>
                <button onClick={() => navigate(getProfileRoute())} className="flex w-full items-center px-4 py-2 text-sm hover:bg-gray-100">
                  <User className="w-4 h-4 mr-2" /> Profile
                </button>
                <button onClick={handleLock} className="flex w-full items-center px-4 py-2 text-sm hover:bg-gray-100">
                  <Lock className="w-4 h-4 mr-2" /> Lock
                </button>
                <button onClick={onLogout} className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header