import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import useEmployeeAuth from '../../../context/EmployeeAuthContext';

const ProtectPrivateEmployee = ({ children }) => {
  const { isAuthenticated, isLocked, isLoading, user } = useEmployeeAuth();
  const location = useLocation();


// Route to feature mapping (reads from the employee's permission matrix)
const routeFeatureMapping = {
  '/employee/dashboard/stockout': ['stockout-movement'],
  '/employee/dashboard/sales-report': ['sales-report'],
  '/employee/dashboard/sales-return': ['sales-returns'],
  '/employee/dashboard/category': ['category-management'],
  '/employee/dashboard/product': ['product-list'],
  '/employee/dashboard/stockin': ['stockin'],
  '/employee/dashboard/debt-management': ['debt-movement'],
  '/employee/dashboard/expense-management': ['expense-movement'],
  '/employee/dashboard/credit-management': ['credit-movement'],
  '/employee/dashboard/requisition': ['requisition-management'],
  '/employee/dashboard/stock-requisition': ['stock-requisition-management'],
  '/employee/dashboard/partner': ['partners'],
  '/employee/dashboard/report': ['employee-report'],
};


// Check if the current route requires a specific permission
const checkTaskPermission = () => {
  const currentPath = location.pathname;

  // Find if current path matches any protected route
  const matchedRoute = Object.keys(routeFeatureMapping).find(route =>
    currentPath.includes(route) || currentPath === route
  );

  if (!matchedRoute) {
    // Route doesn't require a specific permission, allow access
    return true;
  }

  const requiredFeatures = routeFeatureMapping[matchedRoute];

  // Check if user has any permissions loaded
  if (!user || !user.permissions || !Array.isArray(user.permissions)) {
    return false;
  }

  const accessibleFeatures = user.permissions
    .filter(permission => permission.access)
    .map(permission => permission.feature);

  // Check if user has access to ANY of the required features for this route
  return requiredFeatures?.some(requiredFeature =>
    accessibleFeatures.includes(requiredFeature)
  );
};

  // Show loading state
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

  // Check authentication first
  if (!isAuthenticated) {
    return <Navigate to="/auth/employee/login" state={{ from: location }} replace />;
  }

  // Check if account is locked
  if (isLocked) {
    return <Navigate to="/auth/employee/unlock" state={{ from: location }} replace />;
  }

  // Check task permissions (only after user is loaded and authenticated)
  if (!checkTaskPermission()) {
    return <Navigate to="/employee/dashboard" replace />;
  }

  // All checks passed, render children
  return children;
};

export default ProtectPrivateEmployee;