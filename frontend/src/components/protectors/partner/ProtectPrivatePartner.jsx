import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePartnerAuth } from '../../../context/PartnerAuthContext';

const ProtectPrivatePartner = ({ children }) => {
  const { isAuthenticated, isLoading } = usePartnerAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 font-inter">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to partner login page
    return <Navigate to="/auth/partner/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectPrivatePartner;
