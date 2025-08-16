import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AdminAuthContextProvider } from './context/AdminAuthContext.jsx'
import { EmployeeAuthContextProvider } from './context/EmployeeAuthContext.jsx'

// // PWA Auto-Update Registration
// import { registerSW } from 'virtual:pwa-register'

// // Register Service Worker with auto-update
// const updateSW = registerSW({
//   onNeedRefresh() {
//     console.log('🔄 New version available, updating automatically...')
//     // Auto-update without user prompt
//     updateSW(true)
//     // Optional: Show a brief toast notification before reload
//     showUpdateNotification()
//     setTimeout(() => {
//       window.location.reload()
//     }, 1500) // Give user time to see the notification
//   },
//   onOfflineReady() {
//     console.log('✅ App is ready to work offline!')
//     // Dispatch custom event for components to listen to
//     window.dispatchEvent(new CustomEvent('pwa-offline-ready'))
//   },
//   onRegistered(registration) {
//     console.log('🚀 Service Worker registered successfully')
//     // Check for updates every 30 seconds
//     setInterval(() => {
//       registration?.update()
//     }, 30000)
//   },
//   onRegisterError(error) {
//     console.error('❌ Service Worker registration failed:', error)
//   }
// })

// // Optional: Show update notification
// function showUpdateNotification() {
//   // Create a temporary notification element
//   const notification = document.createElement('div')
//   notification.innerHTML = `
//     <div style="
//       position: fixed;
//       top: 20px;
//       right: 20px;
//       background: #10b981;
//       color: white;
//       padding: 12px 20px;
//       border-radius: 8px;
//       font-family: system-ui, -apple-system, sans-serif;
//       font-size: 14px;
//       z-index: 9999;
//       box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
//       animation: slideIn 0.3s ease-out;
//     ">
//       🔄 Updating to latest version...
//     </div>
//     <style>
//       @keyframes slideIn {
//         from { transform: translateX(100%); opacity: 0; }
//         to { transform: translateX(0); opacity: 1; }
//       }
//     </style>
//   `
  
//   document.body.appendChild(notification)
  
//   // Remove notification after reload
//   setTimeout(() => {
//     notification.remove()
//   }, 2000)
// }

// // Global PWA utilities for your components
// window.PWAUpdate = {
//   // Force check for updates
//   checkForUpdates: () => {
//     if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
//       navigator.serviceWorker.getRegistration().then(registration => {
//         registration?.update()
//       })
//     }
//   },
  
//   // Get update status
//   isUpdateAvailable: false,
  
//   // Manual update trigger (if you want to add manual control later)
//   manualUpdate: () => {
//     updateSW(true)
//     window.location.reload()
//   }
// }

// // Listen for app updates and network status
// window.addEventListener('online', () => {
//   console.log('📶 Back online - checking for updates...')
//   window.PWAUpdate.checkForUpdates()
// })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AdminAuthContextProvider>
      <EmployeeAuthContextProvider>
        <App />
      </EmployeeAuthContextProvider>
    </AdminAuthContextProvider>
  </StrictMode>,
)