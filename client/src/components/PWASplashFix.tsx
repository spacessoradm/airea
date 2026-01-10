// Optimized PWA splash screen for iOS & Android
import React, { useEffect, useState } from 'react';

export const PWASplashFix: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [isReady, setIsReady] = useState(false);
  
  // Check if we're on /simple route
  const isSimpleRoute = window.location.pathname === '/simple' || window.location.pathname.startsWith('/simple/');
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone === true;
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  useEffect(() => {
    // iOS PWA optimizations
    if (isPWA) {
      document.body.style.overscrollBehavior = 'none';
      document.body.classList.add('pwa-mode');
      
      // Set proper viewport for iOS
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no'
        );
      }
    }
    
    // Remove HTML splash immediately when React loads - show content instantly
    const htmlSplash = document.getElementById('splash-screen');
    if (htmlSplash) {
      htmlSplash.style.opacity = '0';
      setTimeout(() => htmlSplash.remove(), 300);
    }
    
    // Set flag that splash was shown
    sessionStorage.setItem('pwa_splash_shown', 'true');
    
    // Show content immediately
    setShowSplash(false);
  }, [isPWA]);
  
  return <>{children}</>;
};