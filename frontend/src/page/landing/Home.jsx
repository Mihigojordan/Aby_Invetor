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

// PWA Install Button Component - FIXED VERSION
const PWAInstallButton = ({ className = "", isScrolled = false }) => {
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    // Fixed iOS detection function
    const detectIOS = () => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        return /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    };

    // Fixed PWA installation detection
    const detectPWAInstalled = () => {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true ||
               document.referrer.includes('android-app://');
    };

    useEffect(() => {
        console.log('PWA Button initializing...');
        
        // Check iOS status
        const iosDevice = detectIOS();
        setIsIOS(iosDevice);
        console.log('Is iOS device:', iosDevice);

        // Check if already installed
        const alreadyInstalled = detectPWAInstalled();
        setIsInstalled(alreadyInstalled);
        console.log('Is PWA installed:', alreadyInstalled);

        // For iOS devices that aren't already installed, show install button
        if (iosDevice && !alreadyInstalled) {
            console.log('iOS device detected, showing install button');
            setIsInstallable(true);
        }

        // Listen for PWA events from the main index.html
        const handlePWAStatus = (e) => {
            console.log('PWA Status event:', e.detail);
            const { installed, canInstall, isIOS: isIOSFromEvent } = e.detail;
            
            setIsInstalled(installed);
            setIsIOS(isIOSFromEvent);
            setIsInstallable(canInstall || isIOSFromEvent);
        };

        const handleInstallable = (e) => {
            console.log('PWA installable event:', e.detail);
            setIsInstallable(true);
        };

        const handleInstalled = () => {
            console.log('PWA installed event');
            setIsInstalled(true);
            setIsInstallable(false);
        };

        // Listen for events from index.html
        window.addEventListener('pwa-status', handlePWAStatus);
        window.addEventListener('pwa-installable', handleInstallable);
        window.addEventListener('pwa-installed', handleInstalled);

        // Also listen for beforeinstallprompt (Android/Desktop)
        const handleBeforeInstallPrompt = (e) => {
            console.log('beforeinstallprompt event');
            e.preventDefault();
            setIsInstallable(true);
        };
        
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Cleanup
        return () => {
            window.removeEventListener('pwa-status', handlePWAStatus);
            window.removeEventListener('pwa-installable', handleInstallable);
            window.removeEventListener('pwa-installed', handleInstalled);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = async () => {
        console.log('Install button clicked', { isIOS, isInstallable });
        
        if (isIOS) {
            console.log('Showing iOS instructions');
            setShowIOSInstructions(true);
            return;
        }

        // Try to use the global install function from index.html
        if (window.PWAUtils && window.PWAUtils.installPWA) {
            const installed = await window.PWAUtils.installPWA();
            if (installed) {
                setIsInstalled(true);
                setIsInstallable(false);
            }
        } else if (window.installPWA) {
            // Fallback to direct function
            const installed = await window.installPWA();
            if (installed) {
                setIsInstalled(true);
                setIsInstallable(false);
            }
        } else {
            console.log('PWA install function not available');
        }
    };

    const IOSInstructions = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-auto">
                <h3 className="text-lg font-semibold mb-4 text-primary-900">Install ABY Inventory</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
                            1
                        </div>
                        <span>Tap the Share button in Safari</span>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                        </svg>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
                            2
                        </div>
                        <span>Scroll down and tap "Add to Home Screen"</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
                            3
                        </div>
                        <span>Tap "Add" to install the app</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setShowIOSInstructions(false);
                        // Mark as dismissed so we don't show auto-prompt again
                        sessionStorage.setItem('ios-install-dismissed', 'true');
                    }}
                    className="mt-4 w-full bg-primary-500 text-white py-2 px-4 rounded-lg hover:bg-primary-600 transition-colors"
                >
                    Got it!
                </button>
            </div>
        </div>
    );

    // Debug logging
    console.log('PWA Button state:', {
        isIOS,
        isInstalled,
        isInstallable,
        shouldShow: (isInstallable || isIOS) && !isInstalled
    });

    // Don't show if installed
    if (isInstalled) {
        return null; // Or return installed status if you want
    }

    // Show button if installable OR if iOS (and not installed)
    if (!isInstallable && !isIOS) {
        console.log('Button not showing: not installable and not iOS');
        return null;
    }

    return (
        <>
            <button
                onClick={handleInstall}
                className={`flex items-center space-x-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium ${className}`}
                id="install-button"
            >
                <Download className="h-5 w-5" />
                <span>Install App</span>
            </button>

            {showIOSInstructions && <IOSInstructions />}
        </>
    );
};

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Handle scroll for button visibility
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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
      {/* Floating PWA Install Button */}
      <div className={`fixed right-6 z-50 transition-all duration-300 ${
        isScrolled ? 'bottom-6' : 'top-24'
      }`}>
        <PWAInstallButton />
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-primary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-500 p-2 rounded-lg">
                <Warehouse className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-primary-900">ABY Inventory Management</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-primary-700 hover:text-primary-900 font-medium">Features</a>
              <a href="#about" className="text-primary-700 hover:text-primary-900 font-medium">About</a>
              <a href="#contact" className="text-primary-700 hover:text-primary-900 font-medium">Contact</a>
            </nav>
            <div className="flex items-center space-x-3">
              <PWAInstallButton className="hidden sm:flex text-sm" />
              <a href="/auth/" className="px-4 py-2 text-primary-600 hover:text-primary-800 font-medium">Login</a>
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="/auth/admin/">
                <button className="px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-lg transition-all transform hover:scale-105 flex items-center justify-center">
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </a>
              <PWAInstallButton className="sm:hidden" />
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
              <div className="mt-6 text-center">
                <PWAInstallButton className="inline-flex" />
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="px-8 py-4 bg-primary-400 hover:bg-primary-300 text-primary-950 rounded-xl font-semibold text-lg transition-all transform hover:scale-105">
              Get Started Now
            </button>
            <PWAInstallButton />
          </div>
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
                <h4 className="text-white font-bold">ABY Inventory Management</h4>
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
              © 2025 ABY Inventory Management. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}