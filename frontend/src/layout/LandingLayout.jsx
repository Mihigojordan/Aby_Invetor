import React, { useEffect } from 'react'
import Navbar from '../components/Landing/Navbar'
import ModernFooter from '../components/Landing/Footer'
import { Outlet, useLocation } from 'react-router-dom'

function LandingLayout() {

  const location = useLocation()
  useEffect(() => {
    document.body.scrollIntoView({
      behavior:'smooth',
      block:'start'
    })
  
  }, [location.pathname])
  

  return (
    <div>
        <Navbar />
        <Outlet />
        <ModernFooter />
    </div>
  )
}

export default LandingLayout