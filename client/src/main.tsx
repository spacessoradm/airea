import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { preloadCriticalResources, warmCache } from "./lib/preloader";

// Enhanced error handling for debugging without interfering with React
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error, e.filename, e.lineno, e.colno);
  // Only show alerts for critical errors, not React internal errors
  if (!e.filename?.includes('node_modules') && !e.filename?.includes('chunk-')) {
    console.warn('Non-React error detected:', e.error?.message || e.message);
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  console.error('Stack trace:', e.reason?.stack);
  // Log but don't alert promise rejections as they might be handled by React Query
});

// iOS Safari performance optimization
const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

// Register Service Worker for PWA - optimized for performance
if ('serviceWorker' in navigator && 'caches' in window) {
  // For iOS Safari, register SW immediately for faster subsequent loads
  const registerSW = () => {
    navigator.serviceWorker.register('/sw.js', {
      updateViaCache: 'none',
      scope: '/'
    })
      .then((registration) => {
        console.log('SW registered: ', registration);
        if (!isIOSSafari) {
          registration.update();
          setInterval(() => registration.update(), 60000);
        }
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  };

  if (isIOSSafari) {
    // iOS Safari: Register immediately for faster loading
    registerSW();
  } else {
    // Other browsers: Wait for load event
    window.addEventListener('load', registerSW);
  }
}

// iOS Safari optimizations
if (isIOSSafari) {
  // iOS Safari specific optimizations
  document.addEventListener('touchstart', function() {}, { passive: true });
  
  // Reduce initial bundle parsing on iOS
  setTimeout(() => {
    preloadCriticalResources();
  }, 100);
} else {
  // Start preloading critical resources immediately for other browsers
  preloadCriticalResources();
}

try {
  console.log('Starting React app...');
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  // iOS Safari optimization: Use RAF for smoother rendering
  const renderApp = () => {
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log('React app rendered successfully');
  };

  if (isIOSSafari) {
    // Use requestAnimationFrame for smoother rendering on iOS
    requestAnimationFrame(renderApp);
  } else {
    renderApp();
  }
  
  // Start cache warming after initial render
  warmCache();
} catch (error) {
  console.error('Failed to render React app:', error);
  alert(`Failed to start app: ${error}`);
}
