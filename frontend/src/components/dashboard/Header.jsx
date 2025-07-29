import { Bell, LogOut, Menu, Package, Settings, User } from 'lucide-react'
import React from 'react'

const Header = ({onToggle}) => {
    const onLogout =()=>{

    }
  return (
 
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4 ">
          <div className="flex md:items-center flex-wrap  justify-center gap-3 md:gap-0 md:justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-600 rounded-lg lg:hidden flex items-center justify-center" onClick={onToggle}>
                  <Menu className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900"> welcome to aby inventory management</h1>
              </div>
            </div>

            <div className="flex md:items-center space-x-4">
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">John Doe</span>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
  )
}

export default Header