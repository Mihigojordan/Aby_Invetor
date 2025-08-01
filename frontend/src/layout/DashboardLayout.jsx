import React, { useState } from 'react'
import Header from '../components/dashboard/Header'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/dashboard/Sidebar'


const DashboardLayout = ({role}) => {
  const [isOpen, setIsOpen] = useState(false)
 
  const onToggle = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className='flex items-start  min-h-screen w-screen'>
      <Sidebar onToggle={onToggle} role={role} isOpen={isOpen} />
      <div className="min-h-screen max-h-screen  w-full lg:w-10/12 bg-gray-50">
        <Header onToggle={onToggle} role={role} />
        <Outlet />
      

      </div>
    </div>
  )
}

export default DashboardLayout