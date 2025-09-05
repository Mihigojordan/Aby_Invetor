import React from 'react'
import Navbar from '../components/Landing/Navbar'
import ModernFooter from '../components/Landing/Footer'
import { Outlet } from 'react-router-dom'

function LandingLayout() {
  return (
    <div>
        <Navbar />
        <Outlet />
        <ModernFooter />
    </div>
  )
}

export default LandingLayout