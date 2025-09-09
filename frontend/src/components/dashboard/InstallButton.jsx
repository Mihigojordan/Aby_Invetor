import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppMode = window.navigator.standalone === true;
    
    if (isStandalone || isInWebAppMode) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    const handleAppInstalled = () => {
      setShowButton(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const timer = setTimeout(() => {
      if (!isInstalled && !deferredPrompt) {
        setShowButton(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, [deferredPrompt, isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        'To install this app:\n\n• On Android Chrome: Tap the menu (⋮) and select "Add to Home screen"\n• On iPhone Safari: Tap the share button (□↑) and select "Add to Home Screen"'
      );
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('User choice:', outcome);

    if (outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
      setShowButton(false);
    } else {
      console.log('❌ User dismissed the install prompt');
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowButton(false);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isInstalled || sessionStorage.getItem('pwa-install-dismissed')) {
    return null;
  }

  if (!showButton) return null;

  return (
    <div className="z-50">
      <div 
        className="bg-gray-50 p-3 border cursor-pointer border-gray-200 relative shadow-md"
        onClick={handleInstallClick}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Download className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-700 truncate">Install Aby Inventory</div>
            <div className="text-xs text-gray-500 truncate">Manage and track your inventory easily</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallButton;
