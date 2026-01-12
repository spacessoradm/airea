import { precacheAndRoute } from 'workbox-precaching'

// REQUIRED for injectManifest
precacheAndRoute(self.__WB_MANIFEST)

// Service Worker for instant PWA loading like Instagram
const CACHE_NAME = 'airea-v6'; // Updated to clear old cache after QuickFilters layout fixes
const STATIC_CACHE = 'airea-static-v6';
const DYNAMIC_CACHE = 'airea-dynamic-v6';

// Critical resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/css/index.css',
  '/api/properties',
  '/api/recommendations/trending',
  '/api/recommendations/personalized'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('/api')));
      }),
      // Preload critical API data
      caches.open(DYNAMIC_CACHE).then(cache => {
        return Promise.all(
          STATIC_ASSETS.filter(url => url.startsWith('/api')).map(url => {
            return fetch(url).then(response => {
              if (response.ok) {
                return cache.put(url, response.clone());
              }
            }).catch(() => {});
          })
        );
      })
    ])
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache-first for instant loading
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests with stale-while-revalidate, but skip Google Maps API
  if (request.url.includes('/api/')) {
    // Skip Google Maps API requests completely
    if (request.url.includes('google-maps-key')) {
      return; // Let it fail naturally
    }
    
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(cache => {
        return cache.match(request).then(cachedResponse => {
          const fetchPromise = fetch(request).then(networkResponse => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
          
          // Return cached version immediately if available, otherwise fetch
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Handle static assets with cache-first
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request).then(fetchResponse => {
        // Cache successful responses
        if (fetchResponse.ok) {
          const responseClone = fetchResponse.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return fetchResponse;
      });
    }).catch(() => {
      // Return offline fallback for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('/');
      }
    })
  );
});

// Background sync for better performance
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Preload data for next visit
      Promise.all([
        fetch('/api/properties').then(r => r.ok && caches.open(DYNAMIC_CACHE).then(c => c.put('/api/properties', r))),
        fetch('/api/recommendations/trending').then(r => r.ok && caches.open(DYNAMIC_CACHE).then(c => c.put('/api/recommendations/trending', r)))
      ])
    );
  }
});
