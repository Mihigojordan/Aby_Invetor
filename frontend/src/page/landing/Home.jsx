import React, { useEffect, useState } from 'react';
import { 
  Package, 
  Users, 
  ShieldCheck, 
  TrendingUp, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  ArrowRight,
  Warehouse,
  UserCheck,
  Settings,
  Download
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
     const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    // Handle scroll for button visibility
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallButton(false);
      }
      setDeferredPrompt(null);
    }
  };
  const features = [
    {
      icon: <Package className="h-8 w-8" />,
      title: "Product Management",
      description: "Comprehensive product tracking with real-time inventory updates and automated stock alerts."
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Multi-Role Access",
      description: "Separate admin and employee interfaces with role-based permissions and access controls."
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "Analytics Dashboard",
      description: "Advanced reporting and analytics to track inventory trends and optimize stock levels."
    },
    {
      icon: <ShieldCheck className="h-8 w-8" />,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with audit trails and backup systems for your data."
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Real-time Tracking",
      description: "Monitor product movements in real-time with detailed logs and notifications."
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Automated Workflows",
      description: "Streamline operations with automated reorder points and workflow management."
    }
  ];

  const benefits = [
    "Reduce inventory costs by up to 30%",
    "Eliminate stockouts and overstock situations",
    "Improve operational efficiency",
    "Real-time visibility across all locations"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
         {showInstallButton && (
        <div className={`fixed right-6 z-50 transition-all duration-300 ${
          isScrolled ? 'bottom-6' : 'top-24'
        }`}>
          <button
            onClick={handleInstallClick}
            className="flex items-center space-x-2 px-4 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Download className="h-5 w-5" />
            <span className="font-medium">Install App</span>
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-primary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-500 p-2 rounded-lg">
                <Warehouse className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-primary-900">Aby Inventory Management</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-primary-700 hover:text-primary-900 font-medium">Features</a>
              <a href="#about" className="text-primary-700 hover:text-primary-900 font-medium">About</a>
              <a href="#contact" className="text-primary-700 hover:text-primary-900 font-medium">Contact</a>
            </nav>
            <div className="flex space-x-3">
                <Link to={'/auth/admin/login'}>
              <button className="px-4 py-2 text-primary-600 hover:text-primary-800 font-medium">Login</button>
                </Link>
             
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-primary-900 mb-6">
              Streamline Your 
              <span className="text-primary-500 block">Inventory Management</span>
            </h2>
            <p className="text-xl text-primary-700 mb-8 max-w-3xl mx-auto">
              Complete inventory solution with admin controls, employee access, and real-time product tracking. 
              Manage your stock levels efficiently with our powerful dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
           <Link to={'/auth/admin/login'}>
              <button className="px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-lg transition-all transform hover:scale-105 flex items-center justify-center">
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              </Link>
            
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-primary-900 mb-4">
              Powerful Features for Modern Inventory
            </h3>
            <p className="text-xl text-primary-600 max-w-2xl mx-auto">
              Everything you need to manage your inventory efficiently, from product tracking to team collaboration.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-primary-50 p-6 rounded-xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="text-primary-500 mb-4">
                  {feature.icon}
                </div>
                <h4 className="text-xl font-semibold text-primary-900 mb-2">{feature.title}</h4>
                <p className="text-primary-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-r from-primary-500 to-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Transform Your Business Operations
              </h3>
              <p className="text-primary-100 text-lg mb-8">
                Join thousands of businesses that have revolutionized their inventory management 
                with our comprehensive solution.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-primary-200" />
                    <span className="text-white font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-2xl">
              <h4 className="text-2xl font-bold text-primary-900 mb-6">Role-Based Access</h4>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-primary-50 rounded-lg">
                  <Settings className="h-8 w-8 text-primary-500" />
                  <div>
                    <h5 className="font-semibold text-primary-900">Admin Dashboard</h5>
                    <p className="text-primary-600 text-sm">Full system control and analytics</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-primary-50 rounded-lg">
                  <UserCheck className="h-8 w-8 text-primary-500" />
                  <div>
                    <h5 className="font-semibold text-primary-900">Employee Portal</h5>
                    <p className="text-primary-600 text-sm">Streamlined inventory operations</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-950">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Optimize Your Inventory?
          </h3>
          <p className="text-xl text-primary-200 mb-8">
            Start your free trial today and see the difference professional inventory management makes.
          </p>
          <button className="px-8 py-4 bg-primary-400 hover:bg-primary-300 text-primary-950 rounded-xl font-semibold text-lg transition-all transform hover:scale-105">
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-primary-500 p-2 rounded-lg">
                  <Warehouse className="h-5 w-5 text-white" />
                </div>
                <h4 className="text-white font-bold">Aby Inventory Management</h4>
              </div>
              <p className="text-primary-300 text-sm">
                Professional inventory management solution for modern businesses.
              </p>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-3">Product</h5>
              <ul className="space-y-2 text-primary-300 text-sm">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Demo</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-3">Support</h5>
              <ul className="space-y-2 text-primary-300 text-sm">
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-3">Company</h5>
              <ul className="space-y-2 text-primary-300 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-800 mt-8 pt-8 text-center">
            <p className="text-primary-400 text-sm">
              © 2025 Aby Inventory Management. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}