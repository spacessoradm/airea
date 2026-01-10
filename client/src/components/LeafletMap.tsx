import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

let DefaultIcon = L.divIcon({
  html: `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
    <path fill="#3b82f6" stroke="#1e40af" stroke-width="1" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0zm0 17c-2.5 0-4.5-2-4.5-4.5S10 8 12.5 8s4.5 2 4.5 4.5S15 17 12.5 17z"/>
  </svg>`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: 'custom-div-icon'
});

L.Marker.prototype.options.icon = DefaultIcon;

export interface Property {
  id: string;
  title: string;
  price: string | number;
  latitude: string | number;
  longitude: string | number;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  listingType: string;
  address?: string;
  distance?: number;
  estimatedTravelTime?: number;
}

interface LeafletMapProps {
  properties: Property[];
  center?: [number, number] | { lat: number; lng: number };
  zoom?: number;
  height?: string;
  onPropertyClick?: (property: Property) => void;
  searchLocation?: { lat: number; lng: number; name: string };
  onMapClick?: (lat: number, lng: number) => void;
  showMarkerAt?: { lat: number; lng: number } | null;
}

// Component to handle map updates and auto-fit bounds
function MapUpdater({ 
  center, 
  zoom, 
  properties, 
  searchLocation 
}: { 
  center: [number, number], 
  zoom: number,
  properties: Property[],
  searchLocation?: { lat: number; lng: number; name: string }
}) {
  const map = useMap();
  
  useEffect(() => {
    if (properties.length > 0) {
      // Auto-fit bounds to show all properties
      const validProperties = properties.filter(property => {
        const lat = typeof property.latitude === 'string' ? parseFloat(property.latitude) : property.latitude;
        const lng = typeof property.longitude === 'string' ? parseFloat(property.longitude) : property.longitude;
        return lat && lng && !isNaN(lat) && !isNaN(lng);
      });

      if (validProperties.length > 0) {
        const bounds = L.latLngBounds(
          validProperties.map(property => {
            const lat = typeof property.latitude === 'string' ? parseFloat(property.latitude) : property.latitude;
            const lng = typeof property.longitude === 'string' ? parseFloat(property.longitude) : property.longitude;
            return [lat, lng] as [number, number];
          })
        );
        
        // Add search location to bounds if available
        if (searchLocation) {
          bounds.extend([searchLocation.lat, searchLocation.lng]);
        }
        
        // Fit the map to show all properties with some padding
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    } else if (searchLocation) {
      // If no properties but search location exists, center on search location
      map.setView([searchLocation.lat, searchLocation.lng], 13);
    } else {
      // Default view
      map.setView(center, zoom);
    }
  }, [map, center, zoom, properties, searchLocation]);
  
  return null;
}

// Component to handle map click events
function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  
  return null;
}

export default function LeafletMap({ 
  properties, 
  center = [3.139, 101.6869], // Kuala Lumpur center
  zoom = 11,
  height = "400px",
  onPropertyClick,
  searchLocation,
  onMapClick,
  showMarkerAt
}: LeafletMapProps) {
  // Normalize center prop
  const normalizedCenter: [number, number] = Array.isArray(center) 
    ? center 
    : [center.lat, center.lng];
    
  const [mapCenter, setMapCenter] = useState<[number, number]>(normalizedCenter);
  const [mapZoom, setMapZoom] = useState(zoom);

  // Update map center when search location changes
  useEffect(() => {
    if (searchLocation) {
      setMapCenter([searchLocation.lat, searchLocation.lng]);
      setMapZoom(13);
    }
  }, [searchLocation]);

  // Custom marker for search location
  const searchLocationIcon = L.divIcon({
    html: `<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
      <circle cx="15" cy="15" r="12" fill="#ef4444" stroke="#dc2626" stroke-width="2"/>
      <circle cx="15" cy="15" r="4" fill="white"/>
    </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
    className: 'search-location-icon'
  });

  const validProperties = properties.filter(property => {
    const lat = typeof property.latitude === 'string' ? parseFloat(property.latitude) : property.latitude;
    const lng = typeof property.longitude === 'string' ? parseFloat(property.longitude) : property.longitude;
    return lat && lng && !isNaN(lat) && !isNaN(lng);
  });

  console.log(`LeafletMap: Displaying ${validProperties.length}/${properties.length} properties with valid coordinates`);

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapUpdater 
          center={mapCenter} 
          zoom={mapZoom} 
          properties={validProperties}
          searchLocation={searchLocation}
        />
        <MapClickHandler onMapClick={onMapClick} />
        
        {/* Map tiles using OpenStreetMap (free alternative to Mapbox) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Search location marker */}
        {searchLocation && (
          <Marker 
            position={[searchLocation.lat, searchLocation.lng]}
            icon={searchLocationIcon}
          >
            <Popup>
              <div className="font-medium">
                📍 {searchLocation.name}
                <div className="text-sm text-gray-600 mt-1">Search location</div>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Custom marker for clicked location */}
        {showMarkerAt && (
          <Marker 
            position={[showMarkerAt.lat, showMarkerAt.lng]}
            icon={L.divIcon({
              html: `<svg width="30" height="41" viewBox="0 0 30 41" xmlns="http://www.w3.org/2000/svg">
                <path fill="#22c55e" stroke="#16a34a" stroke-width="2" d="M15 0C6.7 0 0 6.7 0 15c0 15 15 26 15 26s15-11 15-26C30 6.7 23.3 0 15 0zm0 20c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z"/>
              </svg>`,
              iconSize: [30, 41],
              iconAnchor: [15, 41],
              popupAnchor: [0, -34],
              className: 'custom-green-marker'
            })}
          >
            <Popup>
              <div className="font-medium">
                📍 Property Location
                <div className="text-sm text-gray-600 mt-1">
                  Coordinates: {showMarkerAt.lat.toFixed(6)}, {showMarkerAt.lng.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Property markers */}
        {validProperties.map((property) => {
          const lat = typeof property.latitude === 'string' ? parseFloat(property.latitude) : property.latitude;
          const lng = typeof property.longitude === 'string' ? parseFloat(property.longitude) : property.longitude;
          
          return (
            <Marker
              key={property.id}
              position={[lat, lng]}
              eventHandlers={{
                click: () => onPropertyClick?.(property),
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-semibold text-sm mb-2">{property.title}</h3>
                  <p className="text-lg font-bold text-blue-600 mb-2">
                    RM {typeof property.price === 'number' ? property.price.toLocaleString() : property.price}
                    {property.listingType === 'rent' ? '/month' : ''}
                  </p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>{property.bedrooms} bed • {property.bathrooms} bath</div>
                    <div className="capitalize">{property.propertyType}</div>
                    {property.address && <div>{property.address}</div>}
                    {property.distance && (
                      <div className="text-blue-600 font-medium">
                        📍 {property.distance.toFixed(1)}km away
                        {property.estimatedTravelTime && ` • ~${property.estimatedTravelTime} mins`}
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

      </MapContainer>
    </div>
  );
}