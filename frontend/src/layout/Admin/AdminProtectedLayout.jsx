import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'

const AdminProtectedLayout = () => {
  return (
    <div className="flex">
      <aside className="w-60 bg-gray-800 text-white p-4 h-screen">
        <h1 className="text-2xl font-bold mb-6">Admin</h1>
        <NavLink to="/admin" className="block mb-2">Dashboard</NavLink>
        <NavLink to="/admin/settings" className="block">Settings</NavLink>
      </aside>
      <main className="flex-1 p-6 bg-gray-100">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminProtectedLayout
