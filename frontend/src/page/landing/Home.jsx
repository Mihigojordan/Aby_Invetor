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
  Download,
  TerminalSquare
} from 'lucide-react';
import Image from '../../assets/images/applogo.png'
import HeroSlideshow from '../../components/Landing/HeroSection';
import Navbar from '../../components/Landing/Navbar';
import ModernFeaturesSection from '../../components/Landing/ModernFeaturesSection';
import TestimonialSlider from '../../components/Landing/Testimonial';
import ModernBenefitsCTASections from '../../components/Landing/ModernBenefitsCTASections';
import ModernFooter from '../../components/Landing/Footer';
// PWA Install Button Component - FIXED VERSION
const PWAInstallButton = ({ className = "" }) => {
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
  const [, setIsScrolled] = useState(false);

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

  


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
   






<HeroSlideshow />




 <ModernFeaturesSection />
 <ModernBenefitsCTASections />

      <TestimonialSlider />
   
    </div>
  );
}