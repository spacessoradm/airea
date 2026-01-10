import React, { useEffect, useState, useRef } from 'react';

// OpenStreetMap implementation using direct HTML and JavaScript
declare global {
  interface Window {
    L: any;
  }
}

interface Property {
  id: string;
  title: string;
  price: string;
  latitude: string;
  longitude: string;
  images?: string[];
  propertyType?: string;
}

interface OpenStreetMapProps {
  properties: Property[];
  selectedProperty?: Property | null;
  onPropertySelect?: (property: Property) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
}

// Load Leaflet from CDN
const loadLeaflet = () => {
  return new Promise<void>((resolve, reject) => {
    if (window.L) {
      resolve();
      return;
    }

    // Load CSS
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
    document.head.appendChild(css);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Leaflet'));
    document.head.appendChild(script);
  });
};

export default function OpenStreetMap({
  properties,
  selectedProperty,
  onPropertySelect,
  center = { lat: 3.139, lng: 101.6869 }, // Kuala Lumpur default
  zoom = 12,
  height = "500px"
}: OpenStreetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [leafletMap, setLeafletMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);

  useEffect(() => {
    const initMap = async () => {
      try {
        await loadLeaflet();
        
        if (mapRef.current && window.L && !leafletMap) {
          const map = window.L.map(mapRef.current).setView([center.lat, center.lng], zoom);
          
          // Add OpenStreetMap tile layer
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(map);
          
          setLeafletMap(map);
          setMapLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load map:', error);
        setMapError(true);
      }
    };

    initMap();
  }, [center, zoom, leafletMap]);

  // Add property markers
  useEffect(() => {
    if (!leafletMap || !window.L) return;

    // Clear existing markers
    markers.forEach(marker => leafletMap.removeLayer(marker));

    const newMarkers = properties.map((property) => {
      const lat = parseFloat(property.latitude || '0');
      const lng = parseFloat(property.longitude || '0');
      
      if (lat === 0 && lng === 0) return null;

      // Create custom icon
      const icon = window.L.divIcon({
        html: `
          <div style="
            background: #3B82F6;
            color: white;
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            ${property.price}
          </div>
        `,
        className: 'custom-property-marker',
        iconSize: [60, 30],
        iconAnchor: [30, 30],
      });

      const marker = window.L.marker([lat, lng], { icon }).addTo(leafletMap);
      
      // Add popup
      const popupContent = `
        <div class="max-w-xs">
          <h3 class="font-semibold text-sm mb-1">${property.title}</h3>
          <p class="text-blue-600 font-bold">${property.price}</p>
          ${property.propertyType ? `<p class="text-gray-600 text-xs mt-1">${property.propertyType}</p>` : ''}
          ${property.images && property.images.length > 0 ? 
            `<img src="${property.images[0]}" alt="${property.title}" class="w-full h-20 object-cover rounded mt-2">` : 
            ''
          }
          <button onclick="window.selectProperty('${property.id}')" class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 mt-2">
            View Details
          </button>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      
      marker.on('click', () => {
        if (onPropertySelect) {
          onPropertySelect(property);
        }
      });

      return marker;
    }).filter(Boolean);

    setMarkers(newMarkers);

    // Add global function for property selection
    (window as any).selectProperty = (propertyId: string) => {
      const property = properties.find(p => p.id === propertyId);
      if (property && onPropertySelect) {
        onPropertySelect(property);
      }
    };

    // Auto-fit map to show all markers
    if (newMarkers.length > 0) {
      const group = window.L.featureGroup(newMarkers);
      leafletMap.fitBounds(group.getBounds().pad(0.1));
    }
  }, [leafletMap, properties, onPropertySelect, markers]);

  if (mapError) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Unable to load map</p>
          <button 
            onClick={() => {
              setMapError(false);
              setMapLoaded(false);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!mapLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        style={{ height }} 
        className="rounded-lg overflow-hidden"
      />
      
      {/* Property count indicator */}
      {properties.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded shadow">
          <span className="text-sm font-medium">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'}
          </span>
        </div>
      )}
    </div>
  );
}

// Export a simpler version for basic map needs
export function SimpleMap({ 
  center = { lat: 3.139, lng: 101.6869 }, 
  zoom = 12, 
  height = "300px",
  markers = []
}: {
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  markers?: Array<{ lat: number; lng: number; title?: string; }>;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const initMap = async () => {
      try {
        await loadLeaflet();
        
        if (mapRef.current && window.L) {
          const map = window.L.map(mapRef.current).setView([center.lat, center.lng], zoom);
          
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(map);
          
          markers.forEach(marker => {
            const leafletMarker = window.L.marker([marker.lat, marker.lng]).addTo(map);
            if (marker.title) {
              leafletMarker.bindPopup(marker.title);
            }
          });
          
          setMapLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load simple map:', error);
      }
    };

    initMap();
  }, [center, zoom, markers]);

  if (!mapLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg" style={{ height }}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div ref={mapRef} style={{ height }} className="rounded-lg overflow-hidden" />
  );
}