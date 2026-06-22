import { LogOut, Settings, User, Lock, ChevronDown, Moon, Sun, Wifi, WifiOff, ShoppingCart } from 'lucide-react'
import { FaBars, FaSearch, FaExpand, FaGlobe, FaBell } from 'react-icons/fa'
import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAdminAuth from '../../context/AdminAuthContext'
import useEmployeeAuth from '../../context/EmployeeAuthContext'
import { API_URL } from '../../api/api'
import 'flag-icons/css/flag-icons.min.css'
import NotificationBell from './notification/NotificationBell'
import { useNetworkStatusContext } from '../../context/useNetworkContext'

const Header = ({ onToggle, role, onToggleSidebarSize, isSidebarExpanded }) => {
  const adminAuth = useAdminAuth()
  const employeeAuth = useEmployeeAuth()
  const authContext = role === 'admin' ? adminAuth : employeeAuth
  const { user, logout, lockAdmin, lockEmployee } = authContext
  const { isOnline } = useNetworkStatusContext()

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [language, setLanguage] = useState('US')
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const handlePOS = () => {
    navigate('/pos')
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const onLogout = async () => logout()

  const handleLock = async () => {
    role === 'admin' ? await lockAdmin() : await lockEmployee()
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  const handleLanguageChange = () => {
    const newLang = language === 'US' ? 'FR' : 'US'
    setLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'US'
    setLanguage(savedLanguage)
  }, [])

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
    <header style={{ height: "64px", backgroundColor: "#ffffff", borderBottom: "1px solid #E7EBF1", display: "flex", alignItems: "center", gap: "12px", padding: "0 18px", position: "sticky", top: 0, zIndex: 40 }}>
      {/* Menu Button */}
      <button
        onClick={onToggle}
        style={{
          width: "40px",
          height: "40px",
          border: "1px solid #E7EBF1",
          backgroundColor: "#ffffff",
          borderRadius: "9px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#1B2536",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => { e.target.style.backgroundColor = "#E4F4F8"; e.target.style.color = "#3FABC6"; }}
        onMouseLeave={(e) => { e.target.style.backgroundColor = "#ffffff"; e.target.style.color = "#1B2536"; }}
        title="Toggle sidebar"
      >
        <FaBars size={19} />
      </button>

      {/* Sidebar Toggle Button - All Screens */}
      <button
        onClick={onToggleSidebarSize}
        style={{
          width: "40px",
          height: "40px",
          border: "1px solid #E7EBF1",
          backgroundColor: "#ffffff",
          borderRadius: "9px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#6A788D",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => { e.target.style.backgroundColor = "#E4F4F8"; e.target.style.color = "#3FABC6"; }}
        onMouseLeave={(e) => { e.target.style.backgroundColor = "#ffffff"; e.target.style.color = "#6A788D"; }}
        title="Toggle sidebar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18M9 3h12v18H9" />
        </svg>
      </button>

      {/* Search Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "9px",
          height: "40px",
          padding: "0 12px",
          border: "1px solid #E7EBF1",
          backgroundColor: "#F5F7FB",
          borderRadius: "9px",
          width: "320px",
          maxWidth: "34vw",
        }}
      >
        <FaSearch size={16} style={{ color: "#6A788D", flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search anything…"
          style={{
            border: "none",
            backgroundColor: "transparent",
            outline: "none",
            fontSize: "13px",
            color: "#1B2536",
            width: "100%",
          }}
          onFocus={(e) => e.target.parentElement.style.borderColor = "#3FABC6"}
          onBlur={(e) => e.target.parentElement.style.borderColor = "#E7EBF1"}
        />
        <kbd
          style={{
            fontSize: "10.5px",
            fontWeight: "700",
            color: "#6A788D",
            backgroundColor: "#ffffff",
            border: "1px solid #E7EBF1",
            borderRadius: "6px",
            padding: "2px 6px",
            flexShrink: 0,
          }}
        >
          ⌘K
        </kbd>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
        {/* Online/Offline Indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            borderRadius: "9px",
            border: "1px solid #E7EBF1",
            backgroundColor: "#ffffff",
            color: isOnline ? "#15A24A" : "#D88A0C",
            cursor: "default",
          }}
          title={isOnline ? "Connected to server" : "Working offline"}
        >
          {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
        </div>

        {/* POS Button */}
        <button
          onClick={handlePOS}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            height: "40px",
            padding: "0 17px",
            backgroundColor: "rgb(222, 55, 163)",
            border: "1px solid rgb(222, 55, 163)",
            borderRadius: "9px",
            cursor: "pointer",
            color: "#ffffff",
            transition: "all 0.2s",
            fontWeight: "600",
            fontSize: "13px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgb(202, 35, 143)"
            e.currentTarget.style.borderColor = "rgb(202, 35, 143)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgb(222, 55, 163)"
            e.currentTarget.style.borderColor = "rgb(222, 55, 163)"
          }}
          title="Open POS Module"
        >
          <ShoppingCart size={18} />
          <span>POS</span>
        </button>

        {/* Fullscreen Button - All Screens */}
        <button
          onClick={handleFullscreen}
          style={{
            width: "40px",
            height: "40px",
            border: "1px solid #E7EBF1",
            backgroundColor: "#ffffff",
            borderRadius: "9px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#6A788D",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { e.target.style.backgroundColor = "#E4F4F8"; e.target.style.color = "#3FABC6"; }}
          onMouseLeave={(e) => { e.target.style.backgroundColor = "#ffffff"; e.target.style.color = "#6A788D"; }}
          title="Enter fullscreen"
        >
          <FaExpand size={18} />
        </button>

        {/* Language Button - All Screens */}
        <button
          onClick={handleLanguageChange}
          style={{
            width: "auto",
            minWidth: "40px",
            height: "40px",
            border: "1px solid #E7EBF1",
            backgroundColor: "#ffffff",
            borderRadius: "9px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#6A788D",
            transition: "all 0.2s",
            gap: "6px",
            padding: "0 11px",
          }}
          onMouseEnter={(e) => { e.target.style.backgroundColor = "#E4F4F8"; e.target.style.color = "#3FABC6"; }}
          onMouseLeave={(e) => { e.target.style.backgroundColor = "#ffffff"; e.target.style.color = "#6A788D"; }}
          title="Change language"
        >
          <span className={`fi ${language === 'US' ? 'fi-us' : 'fi-fr'}`} style={{ fontSize: "1.2em", lineHeight: "1" }} />
          <span style={{ fontSize: "12.5px", fontWeight: "700", color: "inherit" }}>{language}</span>
        </button>

        {/* Dark Mode Button */}
        <button
          onClick={() => setIsDark(!isDark)}
          style={{
            width: "40px",
            height: "40px",
            border: "1px solid #E7EBF1",
            backgroundColor: "#ffffff",
            borderRadius: "9px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#6A788D",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { e.target.style.backgroundColor = "#E4F4F8"; e.target.style.color = "#3FABC6"; }}
          onMouseLeave={(e) => { e.target.style.backgroundColor = "#ffffff"; e.target.style.color = "#6A788D"; }}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* Notifications Button */}
        <button
          style={{
            width: "40px",
            height: "40px",
            border: "1px solid #E7EBF1",
            backgroundColor: "#ffffff",
            borderRadius: "9px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#6A788D",
            transition: "all 0.2s",
            position: "relative",
          }}
          onMouseEnter={(e) => { e.target.style.backgroundColor = "#E4F4F8"; e.target.style.color = "#3FABC6"; }}
          onMouseLeave={(e) => { e.target.style.backgroundColor = "#ffffff"; e.target.style.color = "#6A788D"; }}
          title="Notifications"
        >
          <FaBell size={18} />
          <span
            style={{
              position: "absolute",
              top: "8px",
              right: "9px",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#DE37A3",
              border: "1.5px solid #ffffff",
            }}
          />
        </button>

        {/* Profile Chip */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "4px 10px 4px 4px",
              border: "1px solid #E7EBF1",
              borderRadius: "24px",
              marginLeft: "4px",
              cursor: "pointer",
              backgroundColor: "#ffffff",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => e.target.style.borderColor = "#3FABC6"}
            onBlur={(e) => e.target.style.borderColor = "#E7EBF1"}
          >
            {user?.profileImg ? (
              <img src={`${API_URL}${user.profileImg}`} style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} alt="Profile" />
            ) : (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#2CB8DE",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "13px",
                  flexShrink: 0,
                  background: "linear-gradient(135deg,#2CB8DE,#2B8EA6)",
                }}
              >
                {getDisplayName().charAt(0)}
              </div>
            )}
            <div className="hidden sm:block">
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#1B2536", whiteSpace: "nowrap", lineHeight: "1.15" }}>
                {getDisplayName()}
              </div>
              <div style={{ fontSize: "10.5px", color: "#6A788D", whiteSpace: "nowrap" }}>
                {role === 'admin' ? 'Administrator' : 'Employee'}
              </div>
            </div>
            <ChevronDown style={{ width: "15px", height: "15px", color: "#6A788D", flexShrink: 0 }} />
          </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl overflow-hidden z-50" style={{ border: '1px solid #E6E9F0' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #E6E9F0', backgroundColor: 'rgba(63, 171, 198, 0.05)' }}>
                  <p className="font-semibold text-sm" style={{ color: '#38435C' }}>{getDisplayName()}</p>
                  <p className="text-xs capitalize" style={{ color: '#8A93A6' }}>{role}</p>
                </div>
                <button
                  onClick={() => { navigate(getProfileRoute()); setIsDropdownOpen(false); }}
                  className="flex w-full items-center px-4 py-3 text-sm transition-colors"
                  style={{ color: '#38435C' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEF4F9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <User className="w-4 h-4 mr-3" style={{ color: '#3fabc6' }} /> Profile
                </button>
                <button
                  onClick={() => { handleLock(); setIsDropdownOpen(false); }}
                  className="flex w-full items-center px-4 py-3 text-sm transition-colors"
                  style={{ color: '#38435C' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEF4F9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Lock className="w-4 h-4 mr-3" style={{ color: '#3fabc6' }} /> Lock
                </button>
                <button
                  onClick={() => { onLogout(); setIsDropdownOpen(false); }}
                  className="flex w-full items-center px-4 py-3 text-sm transition-colors"
                  style={{ color: '#E0484B' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(224, 72, 75, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LogOut className="w-4 h-4 mr-3" /> Logout
                </button>
              </div>
            )}
        </div>
      </div>
    </header>
  )
}

export default Header