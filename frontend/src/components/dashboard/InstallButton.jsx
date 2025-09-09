import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkIfInstalled = () => {
      // Method 1: Check display mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      
      // Method 2: Check iOS standalone
      const isInWebAppMode = window.navigator.standalone === true;
      
      // Method 3: Check if previously dismissed
      const wasDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
      
      // Method 4: Check if manually installed (custom flag)
      const wasManuallyInstalled = localStorage.getItem('pwa-manually-installed') === 'true';

      return isStandalone || isInWebAppMode || wasManuallyInstalled;
    };

    if (checkIfInstalled()) {
      setIsInstalled(true);
      setShowButton(false);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      console.log('🎯 beforeinstallprompt fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    const handleAppInstalled = () => {
      console.log('✅ App installed');
      setShowButton(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-manually-installed', 'true');
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Fallback timer for browsers that don't fire beforeinstallprompt
    const timer = setTimeout(() => {
      if (!isInstalled && !deferredPrompt && !localStorage.getItem('pwa-install-dismissed')) {
        console.log('⏰ Fallback timer: showing install button');
        setShowButton(true);
      }
    }, 3000);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Show manual install instructions
      const userAgent = navigator.userAgent.toLowerCase();
      let instructions = '';

      if (userAgent.includes('chrome') && userAgent.includes('android')) {
        instructions = 'To install this app:\n\n1. Tap the menu (⋮) in the top-right corner\n2. Select "Add to Home screen"\n3. Tap "Add" to confirm';
      } else if (userAgent.includes('safari') && userAgent.includes('iphone')) {
        instructions = 'To install this app:\n\n1. Tap the share button (□↑) at the bottom\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm';
      } else if (userAgent.includes('firefox')) {
        instructions = 'To install this app:\n\n1. Tap the menu (⋮) in the top-right corner\n2. Select "Install"\n3. Tap "Add" to confirm';
      } else {
        instructions = 'To install this app, look for an "Install" or "Add to Home Screen" option in your browser menu.';
      }

      alert(instructions);
      return;
    }

    try {
      console.log('🚀 Triggering install prompt');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('User choice:', outcome);

      if (outcome === 'accepted') {
        console.log('✅ User accepted the install prompt');
        setShowButton(false);
        setIsInstalled(true);
        localStorage.setItem('pwa-manually-installed', 'true');
      } else {
        console.log('❌ User dismissed the install prompt');
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error during installation:', error);
    }
  };

  const handleDismiss = (e) => {
    e.stopPropagation(); // Prevent triggering install when clicking dismiss
    setShowButton(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if already installed or dismissed
  if (isInstalled || localStorage.getItem('pwa-install-dismissed') === 'true') {
    return null;
  }

  if (!showButton) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div 
          className="cursor-pointer" 
          onClick={handleInstallClick}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-800 truncate">
                Install Aby Inventory
              </div>
              <div className="text-xs text-gray-500 truncate">
                Quick access from your home screen
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallButton;