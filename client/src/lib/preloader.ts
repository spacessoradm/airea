// Preloader for critical resources
export function preloadCriticalResources() {
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  // Only preload if we have good network conditions
  if ('connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') {
      return; // Skip preloading on slow connections
    }
  }

  // iOS Safari optimization: Use requestIdleCallback for non-blocking preloading
  const preloadFunction = () => {
    // Preload critical API endpoints
    const criticalEndpoints = [
      '/api/properties?limit=6',
      '/api/recommendations/trending'
    ];

    // For iOS Safari, reduce initial preloading to essential endpoints only
    const endpointsToPreload = isIOSSafari ? criticalEndpoints.slice(0, 1) : criticalEndpoints;

    endpointsToPreload.forEach(endpoint => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = endpoint;
      document.head.appendChild(link);
    });

    // Skip font preloading on iOS Safari for faster initial load
    if (!isIOSSafari) {
      const criticalCSS = [
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
      ];

      criticalCSS.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = href;
        document.head.appendChild(link);
      });
    }
  };

  // Use requestIdleCallback for iOS Safari
  if (isIOSSafari && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(preloadFunction, { timeout: 2000 });
  } else {
    preloadFunction();
  }
}

// Cache warming for frequently accessed data
export function warmCache() {
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  // iOS Safari: Delay cache warming longer to prioritize initial render
  const delay = isIOSSafari ? 4000 : 2000;
  
  setTimeout(() => {
    // Warm the cache with background requests
    fetch('/api/properties?limit=12').catch(() => {});
    if (!isIOSSafari) {
      // Only warm trending on non-iOS for better performance
      fetch('/api/recommendations/trending').catch(() => {});
    }
  }, delay);
}