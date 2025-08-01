import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import useEmployeeAuth from '../../../context/EmployeeAuthContext';

const ProtectPrivateEmployee = ({ children }) => {
  const { isAuthenticated, isLocked, isLoading } = useEmployeeAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 font-inter">Verifying employee access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to employee login page with the current location as state
    return <Navigate to="/auth/employee/login" state={{ from: location }} replace />;
  }

  if (isLocked) {
    // Redirect to employee unlock screen with the current location as state
    return <Navigate to="/auth/employee/unlock" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectPrivateEmployee;