import React, { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'

// Main layout
import AdminLayout from '../layout/Admin/AdminLayout'

// Sub-layouts
import AdminAuthLayout from '../layout/Admin/AdminAuthLayout'
import AdminProtectedLayout from '../layout/Admin/AdminProtectedLayout'

// NotFound
import NotFound from '../pages/NotFound'

// Lazy pages
const Login = lazy(() => import('../pages/Auth/Login'))
const LockScreen = lazy(() => import('../pages/Auth/LockScreen'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const Settings = lazy(() => import('../pages/Settings'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      {
        path: '',
        element: <AdminAuthLayout />,
        children: [
          { index: true, element: <Login /> },
          { path: 'lock', element: <LockScreen /> },
        ],
      },
      {
        path: 'admin',
        element: <AdminProtectedLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default router
