import React from 'react'
import { Outlet } from 'react-router-dom'

const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global header/sidebar if needed */}
      <Outlet />
    </div>
  )
}

export default AdminLayout
