import React from 'react';
import { 
  Home, 
  ArrowLeft, 
  Search, 
  Package, 
  AlertTriangle,
  Warehouse,
  RefreshCw
} from 'lucide-react';

export default function NotFoundPage() {
  const suggestions = [
    {
      icon: <Home className="h-5 w-5" />,
      title: "Go to Dashboard",
      description: "Return to your main dashboard",
      action: "dashboard"
    },
    {
      icon: <Package className="h-5 w-5" />,
      title: "View Products",
      description: "Browse your product inventory",
      action: "products"
    },
    {
      icon: <Search className="h-5 w-5" />,
      title: "Search Inventory",
      description: "Find what you're looking for",
      action: "search"
    }
  ];

  const handleNavigation = (action) => {
    // This would integrate with your routing system
    console.log(`Navigate to: ${action}`);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full text-center">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="bg-primary-100 p-6 rounded-full">
                <Warehouse className="h-16 w-16 text-primary-400" />
              </div>
              <div className="absolute -top-2 -right-2 bg-orange-100 p-2 rounded-full">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold text-primary-500 mb-4">404</h1>
          <h2 className="text-2xl md:text-3xl font-bold text-primary-900 mb-4">
            Page Not Found
          </h2>
          <p className="text-primary-600 text-lg mb-8">
            Oops! The inventory page you're looking for seems to have moved or doesn't exist. 
            Let's get you back on track.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleGoBack}
              className="flex items-center justify-center px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-all transform hover:scale-105"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Go Back
            </button>
            <button
              onClick={handleRefresh}
              className="flex items-center justify-center px-6 py-3 border-2 border-primary-300 text-primary-700 hover:bg-primary-50 rounded-lg font-medium transition-colors"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Refresh Page
            </button>
          </div>
        </div>

      
        {/* Help Text */}
        <div className="mt-8 p-4 bg-primary-100 rounded-lg">
          <p className="text-primary-700 text-sm">
            <strong>Still having trouble?</strong> Contact our support team for assistance with your inventory management system.
          </p>
          <button className="mt-2 text-primary-600 hover:text-primary-800 font-medium text-sm underline">
            Contact Support
          </button>
        </div>

        {/* Error Details (for development) */}
        <div className="mt-6 text-xs text-primary-400">
          Error Code: 404 | Page Not Found | Aby Inventory Management v2.0
        </div>
      </div>
    </div>
  );
}