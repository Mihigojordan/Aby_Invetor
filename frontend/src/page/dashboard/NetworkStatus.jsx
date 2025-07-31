// src/components/NetworkStatus.js
import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

const NetworkStatus = ({ isOnline }) => {
    if (isOnline) return null;

    return (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
            <WifiOff size={16} />
            <span>You are offline. Changes will be synced when you reconnect.</span>
        </div>
    );
};

export default NetworkStatus;