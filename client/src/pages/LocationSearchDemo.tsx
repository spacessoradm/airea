import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LocationSearchDropdown } from '@/components/LocationSearchDropdown';
import { locationService, type LocationResult } from '@/services/locationService';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Building, Home } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function LocationSearchDemo() {
  const { t } = useLanguage();
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [nearbyLocations, setNearbyLocations] = useState<LocationResult[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);

  // Default map center (Kuala Lumpur)
  const defaultCenter: [number, number] = [3.139, 101.6869];
  const mapCenter: [number, number] = selectedLocation 
    ? [selectedLocation.latitude, selectedLocation.longitude] 
    : defaultCenter;

  const handleLocationSelect = async (location: LocationResult) => {
    setSelectedLocation(location);
    
    // Fetch nearby locations
    setIsLoadingNearby(true);
    try {
      const nearby = await locationService.getNearbyLocations(
        location.latitude,
        location.longitude,
        5000, // 5km radius
        10    // limit
      );
      setNearbyLocations(nearby.filter(loc => loc.id !== location.id));
    } catch (error) {
      console.error('Failed to fetch nearby locations:', error);
      setNearbyLocations([]);
    } finally {
      setIsLoadingNearby(false);
    }
  };

  const getBuildingTypeIcon = (buildingType?: string) => {
    switch (buildingType?.toLowerCase()) {
      case 'apartments':
      case 'apartment':
        return Building;
      case 'residential':
      case 'house':
        return Home;
      default:
        return MapPin;
    }
  };

  const getBuildingTypeBadge = (buildingType?: string) => {
    if (!buildingType) return null;
    
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      'apartments': 'default',
      'residential': 'secondary',
      'commercial': 'destructive',
      'office': 'outline'
    };
    
    return (
      <Badge variant={variants[buildingType.toLowerCase()] || 'outline'} className="text-xs">
        {buildingType}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('locationSearch.title') || 'Location Search Demo'}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('locationSearch.subtitle') || 'Search for properties and locations across Malaysia using GeoJSON data'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Search Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('locationSearch.searchTitle') || 'Search Locations'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <LocationSearchDropdown
                  onLocationSelect={handleLocationSelect}
                  placeholder={t('locationSearch.placeholder') || 'Search for apartments, buildings, areas...'}
                  className="w-full"
                />

                {/* Selected Location Details */}
                {selectedLocation && (
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded bg-blue-100">
                        {React.createElement(getBuildingTypeIcon(selectedLocation.buildingType), {
                          className: "h-4 w-4 text-blue-600"
                        })}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {selectedLocation.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {[selectedLocation.city, selectedLocation.state].filter(Boolean).join(', ')}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">
                            {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                          </span>
                          {getBuildingTypeBadge(selectedLocation.buildingType)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nearby Locations */}
                {selectedLocation && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      {t('locationSearch.nearby') || 'Nearby Locations'} (5km radius)
                    </h4>
                    
                    {isLoadingNearby ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                      </div>
                    ) : nearbyLocations.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {nearbyLocations.map((location) => (
                          <button
                            key={location.id}
                            onClick={() => handleLocationSelect(location)}
                            className="w-full text-left p-3 rounded border hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <div className="p-1 rounded bg-gray-100">
                                {React.createElement(getBuildingTypeIcon(location.buildingType), {
                                  className: "h-3 w-3 text-gray-600"
                                })}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 truncate">
                                  {location.name}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {[location.city, location.state].filter(Boolean).join(', ')}
                                </div>
                                {location.buildingType && (
                                  <div className="mt-1">
                                    {getBuildingTypeBadge(location.buildingType)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        {t('locationSearch.noNearby') || 'No nearby locations found'}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Map Panel */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardContent className="p-0 h-full">
                <MapContainer
                  center={mapCenter}
                  zoom={selectedLocation ? 16 : 11}
                  className="h-full w-full rounded-lg"
                  key={selectedLocation?.id || 'default'}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Selected Location Marker */}
                  {selectedLocation && (
                    <Marker position={[selectedLocation.latitude, selectedLocation.longitude]}>
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-semibold">{selectedLocation.name}</h3>
                          <p className="text-sm text-gray-600">
                            {[selectedLocation.city, selectedLocation.state].filter(Boolean).join(', ')}
                          </p>
                          {selectedLocation.buildingType && (
                            <div className="mt-2">
                              {getBuildingTypeBadge(selectedLocation.buildingType)}
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Nearby Location Markers */}
                  {nearbyLocations.map((location) => (
                    <Marker
                      key={location.id}
                      position={[location.latitude, location.longitude]}
                    >
                      <Popup>
                        <div className="p-2">
                          <h4 className="font-medium">{location.name}</h4>
                          <p className="text-sm text-gray-600">
                            {[location.city, location.state].filter(Boolean).join(', ')}
                          </p>
                          {location.buildingType && (
                            <div className="mt-2">
                              {getBuildingTypeBadge(location.buildingType)}
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Feature Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Navigation className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Smart Search</h3>
              <p className="text-sm text-gray-600">
                Search locations with natural language queries and instant results
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <MapPin className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Precise Coordinates</h3>
              <p className="text-sm text-gray-600">
                Accurate latitude and longitude data from OpenStreetMap
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Building className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Rich Property Data</h3>
              <p className="text-sm text-gray-600">
                Building types, addresses, and nearby location discovery
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}