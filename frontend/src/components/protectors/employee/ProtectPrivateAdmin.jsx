import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import useEmployeeAuth from '../../../context/EmployeeAuthContext';

const ProtectPrivateEmployee = ({ children }) => {
  const { isAuthenticated, isLocked, isLoading, user } = useEmployeeAuth();
  const location = useLocation();


// Route to task mapping (matches your ProtectPrivateEmployee logic)
const routeTaskMapping = {
  // saling
  '/employee/dashboard/stockout': ['saling','selling','sales','stockout'],
  // returning and receiving (both can access these routes)
  '/employee/dashboard/sales-return': ['returning','return'],
  '/employee/dashboard/category':['receiving', 'returning','return','stockin'],
  '/employee/dashboard/product':['receiving', 'returning','return','stockin'],
  // receiving
  '/employee/dashboard/stockin': ['receiving','stockin'],
};


// Check if the current route requires a specific task
const checkTaskPermission = () => {
  const currentPath = location.pathname;
 
  // Find if current path matches any protected route
  const matchedRoute = Object.keys(routeTaskMapping).find(route =>
    currentPath.includes(route) || currentPath === route
  );
 
  if (!matchedRoute) {
    // Route doesn't require task permission, allow access
    return true;
  }

  const requiredTasks = routeTaskMapping[matchedRoute]; // Now this is an array
 
  // Check if user has the required task
  if (!user || !user.tasks || !Array.isArray(user.tasks)) {
    return false;
  }

  const userTaskNames = user.tasks.map(task => task.taskname);
  
  // Check if user has ANY of the required tasks for this route
  return requiredTasks?.some(requiredTask => 
    userTaskNames.includes(requiredTask)
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