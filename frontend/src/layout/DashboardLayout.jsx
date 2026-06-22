import React, { useEffect, useRef, useState } from 'react'
import Header from '../components/dashboard/Header'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/dashboard/Sidebar'
import useAdminAuth from '../context/AdminAuthContext'
import { usePartnerAuth } from '../context/PartnerAuthContext'
import { useSocket } from '../context/SocketContext'
import useEmployeeAuth from '../context/EmployeeAuthContext'
import { useNotifications } from '../context/NotificationContext'




const DashboardLayout = ({role}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)

  const { user } = useEmployeeAuth()
  const { user:admin } = useAdminAuth()
  const { partner } = usePartnerAuth()
  const { setRecipient } = useNotifications()
  const { socket, isConnected, emit } = useSocket()
  const isPartnerRegistered = useRef(false);
  const isEmployeeRegistered = useRef(false);
  const isAdminRegistered = useRef(false);

  const onToggle = () => {
    setIsOpen(!isOpen)
  }



  useEffect(() => {
    if (user?.id && isConnected && !isEmployeeRegistered.current && role == 'employee') {
      console.log('online EMPLOYEE :', user.id);
      emit('registerUser', { id: user.id, type: 'EMPLOYEE' });
      isEmployeeRegistered.current = true;
    }
     if (admin?.id && isConnected && !isAdminRegistered.current && role == 'admin') {
      console.log('online ADMIN :', admin.id);
      emit('registerUser', { id: admin.id, type: 'ADMIN' });
      isAdminRegistered.current = true;
    }
     if (partner?.id && isConnected && !isPartnerRegistered.current && role == 'partner') {
      console.log('online PARTNER :', partner.id);
      emit('registerUser', { id: partner.id, type: 'PARTNER' });
      isPartnerRegistered.current = true;
    }
  }, [user?.id, isConnected, emit, socket, admin?.id,partner?.id]);


  useEffect(() => {
    switch (role) {
      case 'employee':
        setRecipient(user?.id, 'EMPLOYEE');
        break
      case 'admin':
        setRecipient(admin?.id, 'ADMIN');
        break
      case 'partner':
        setRecipient(partner?.id, 'PARTNER');
        break
    }
  }, [socket]);





  return (
    <div className='flex items-start w-screen'>
      <Sidebar
        onToggle={onToggle}
        role={role}
        isOpen={isOpen}
        isExpanded={isSidebarExpanded}
        onToggleSidebarSize={() => setIsSidebarExpanded(!isSidebarExpanded)}
      />
      <div className="min-h-screen max-h-screen w-full transition-all duration-300" style={{ backgroundColor: '#F3F5F9' }}>
        <Header
          onToggle={onToggle}
          role={role}
          isSidebarExpanded={isSidebarExpanded}
          onToggleSidebarSize={() => setIsSidebarExpanded(!isSidebarExpanded)}
        />
        <Outlet />
      </div>
    </div>
  )
}

export default DashboardLayout