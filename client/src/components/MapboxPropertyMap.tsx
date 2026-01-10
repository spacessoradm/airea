import React, { useEffect, useState, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Property {
  id: string;
  title: string;
  price: string;
  latitude: string;
  longitude: string;
  images?: string[];
  propertyType?: string;
}

interface MapboxPropertyMapProps {
  properties: Property[];
  selectedProperty?: Property | null;
  onPropertySelect?: (property: Property) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
}

export default function MapboxPropertyMap({
  properties,
  selectedProperty,
  onPropertySelect,
  center = { lat: 3.139, lng: 101.6869 }, // Kuala Lumpur default
  zoom = 12,
  height = "500px"
}: MapboxPropertyMapProps) {
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [popupInfo, setPopupInfo] = useState<Property | null>(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12');

  // Fetch Mapbox configuration from server
  useEffect(() => {
    const fetchMapConfig = async () => {
      try {
        const response = await fetch('/api/map-config');
        if (response.ok) {
          const config = await response.json();
          if (config.provider === 'mapbox' && config.apiKey) {
            setMapboxToken(config.apiKey);
            setMapLoaded(true);
          } else {
            console.error('Mapbox configuration not available');
            setMapError(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch map configuration:', error);
        setMapError(true);
      }
    };

    fetchMapConfig();
  }, []);

  if (mapError) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Unable to load Mapbox</p>
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

  if (!mapLoaded || !mapboxToken) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading Mapbox...</p>
        </div>
      </div>
    );
  }

  const toggleMapStyle = () => {
    setMapStyle(current => 
      current === 'mapbox://styles/mapbox/streets-v12' 
        ? 'mapbox://styles/mapbox/satellite-v9'
        : 'mapbox://styles/mapbox/streets-v12'
    );
  };

  return (
    <div className="relative" style={{ height }}>
      <Map
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom: zoom
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        onError={(error) => {
          console.error('Mapbox error:', error);
          setMapError(true);
        }}
      >
        {/* Navigation controls */}
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />

        {/* Property markers */}
        {properties.map((property) => {
          const lat = parseFloat(property.latitude || '0');
          const lng = parseFloat(property.longitude || '0');
          
          if (lat === 0 && lng === 0) return null;

          const isSelected = selectedProperty?.id === property.id;
          
          return (
            <Marker
              key={property.id}
              longitude={lng}
              latitude={lat}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo(property);
                onPropertySelect?.(property);
              }}
            >
              <div
                className={`
                  px-2 py-1 rounded-full text-xs font-semibold cursor-pointer
                  transition-all duration-200 transform hover:scale-110
                  ${isSelected 
                    ? 'bg-blue-600 text-white shadow-lg scale-110' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                  }
                  shadow-md border-2 border-white
                `}
              >
                {property.price}
              </div>
            </Marker>
          );
        })}

        {/* Property popup */}
        {popupInfo && (
          <Popup
            longitude={parseFloat(popupInfo.longitude || '0')}
            latitude={parseFloat(popupInfo.latitude || '0')}
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="property-popup"
          >
            <div className="max-w-xs p-2">
              <h3 className="font-semibold text-sm mb-1">{popupInfo.title}</h3>
              <p className="text-blue-600 font-bold mb-1">{popupInfo.price}</p>
              {popupInfo.propertyType && (
                <p className="text-gray-600 text-xs mb-2">{popupInfo.propertyType}</p>
              )}
              {popupInfo.images && popupInfo.images.length > 0 && (
                <img 
                  src={popupInfo.images[0]} 
                  alt={popupInfo.title}
                  className="w-full h-20 object-cover rounded mb-2"
                />
              )}
              <button 
                onClick={() => onPropertySelect?.(popupInfo)}
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 w-full"
              >
                View Details
              </button>
            </div>
          </Popup>
        )}
      </Map>

      {/* Map controls */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={toggleMapStyle}
          className="bg-white px-3 py-2 rounded shadow hover:bg-gray-50 text-sm font-medium"
        >
          {mapStyle.includes('satellite') ? 'Street View' : 'Satellite View'}
        </button>
      </div>

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