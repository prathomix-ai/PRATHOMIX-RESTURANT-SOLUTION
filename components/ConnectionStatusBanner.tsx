'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function ConnectionStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [reconnectedNotice, setReconnectedNotice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
      setReconnectedNotice(true);

      // Dispatch global reconnected event so active pages can refresh state
      window.dispatchEvent(new CustomEvent('prathomix:reconnected'));

      const timer = setTimeout(() => {
        setReconnectedNotice(false);
      }, 4000);
      return () => clearTimeout(timer);
    }

    function handleOffline() {
      setIsOnline(false);
      setReconnectedNotice(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !reconnectedNotice) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[99999] pointer-events-none transition-all duration-300 transform translate-y-0"
    >
      {!isOnline ? (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#141210]/95 backdrop-blur-md border border-[#E05252]/40 shadow-2xl text-white text-xs font-medium tracking-wide">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E05252] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E05252]"></span>
          </span>
          <WifiOff className="w-4 h-4 text-[#E05252]" />
          <span className="text-[#EAE6DF]">
            Connection interrupted. <span className="text-[#C5A880]">Reconnecting...</span>
          </span>
          <RefreshCw className="w-3.5 h-3.5 text-[#C5A880] animate-spin ml-1" />
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#141210]/95 backdrop-blur-md border border-[#48BB78]/40 shadow-2xl text-white text-xs font-medium tracking-wide">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#48BB78]"></span>
          <Wifi className="w-4 h-4 text-[#48BB78]" />
          <span className="text-[#EAE6DF]">
            Connected · <span className="text-[#C5A880]">Live state synchronized</span>
          </span>
        </div>
      )}
    </div>
  );
}
