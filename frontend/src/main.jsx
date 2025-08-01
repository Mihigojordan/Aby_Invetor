import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AdminAuthContextProvider } from './context/AdminAuthContext.jsx'
import { EmployeeAuthContextProvider } from './context/EmployeeAuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AdminAuthContextProvider>
      <EmployeeAuthContextProvider>
      <App />
      </EmployeeAuthContextProvider>
    </AdminAuthContextProvider>
  </StrictMode>,
)
