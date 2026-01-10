import { useState } from "react";
import { LocationFilter } from "@/components/LocationFilter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building, Home, Star, Search } from "lucide-react";

interface LocationSearchResult {
  id: string;
  name: string;
  type: 'state' | 'city' | 'area' | 'building';
  fullPath: string;
  latitude?: string;
  longitude?: string;
  postalCode?: string;
  parentInfo?: {
    city?: string;
    state?: string;
    area?: string;
  };
}

export default function LocationDemo() {
  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult | null>(null);
  const [currentFilters, setCurrentFilters] = useState<any>({});

  const handleLocationSelect = (location: LocationSearchResult) => {
    setSelectedLocation(location);
  };

  const handleFilterChange = (filters: any) => {
    setCurrentFilters(filters);
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'state':
        return <MapPin className="h-5 w-5 text-blue-500" />;
      case 'city':
        return <Home className="h-5 w-5 text-green-500" />;
      case 'area':
        return <MapPin className="h-5 w-5 text-purple-500" />;
      case 'building':
        return <Building className="h-5 w-5 text-orange-500" />;
      default:
        return <MapPin className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'state':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'city':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'area':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'building':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          Location Management System
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Comprehensive Malaysian location database with building names, taman locations, and townships for easy filtering
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            15 States
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Home className="h-3 w-3" />
            39+ Cities
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            31+ Areas
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Building className="h-3 w-3" />
            15+ Buildings
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Location Filter Component */}
        <div>
          <LocationFilter
            onLocationSelect={handleLocationSelect}
            onFilterChange={handleFilterChange}
            showAdvancedFilters={true}
            placeholder="Try searching: Mont Kiara, Kepong, Elmina, KLCC..."
          />
        </div>

        {/* Results Display */}
        <div className="space-y-6">
          {/* Selected Location */}
          {selectedLocation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getLocationIcon(selectedLocation.type)}
                  Selected Location
                </CardTitle>
                <CardDescription>
                  Details about your selected location
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{selectedLocation.name}</span>
                    <Badge className={getTypeColor(selectedLocation.type)} variant="secondary">
                      {selectedLocation.type}
                    </Badge>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">{selectedLocation.fullPath}</p>
                  
                  {selectedLocation.latitude && selectedLocation.longitude && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <strong>Coordinates:</strong> {selectedLocation.latitude}, {selectedLocation.longitude}
                    </div>
                  )}
                  
                  {selectedLocation.postalCode && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <strong>Postal Code:</strong> {selectedLocation.postalCode}
                    </div>
                  )}

                  {selectedLocation.parentInfo && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Location Hierarchy:
                      </div>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        {selectedLocation.parentInfo.state && (
                          <div>• State: {selectedLocation.parentInfo.state}</div>
                        )}
                        {selectedLocation.parentInfo.city && (
                          <div>• City: {selectedLocation.parentInfo.city}</div>
                        )}
                        {selectedLocation.parentInfo.area && (
                          <div>• Area: {selectedLocation.parentInfo.area}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Active Filters</CardTitle>
              <CardDescription>
                Current location filtering criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(currentFilters).length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">No filters applied</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(currentFilters).map(([key, value]) => {
                    if (!value) return null;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <Badge variant="outline">
                          {key.replace('Id', '').toUpperCase()}: {String(value)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Information */}
          <Card>
            <CardHeader>
              <CardTitle>Available APIs</CardTitle>
              <CardDescription>
                Location management endpoints for developers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <code className="text-blue-700 dark:text-blue-300">
                    GET /api/locations/search?q=mont+kiara
                  </code>
                  <p className="text-blue-600 dark:text-blue-400 mt-1">
                    Search across all location types
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <code className="text-green-700 dark:text-green-300">
                    GET /api/locations/states
                  </code>
                  <p className="text-green-600 dark:text-green-400 mt-1">
                    Get all Malaysian states
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                  <code className="text-purple-700 dark:text-purple-300">
                    GET /api/locations/suggestions?q=kepong&type=area
                  </code>
                  <p className="text-purple-600 dark:text-purple-400 mt-1">
                    Get location suggestions by type
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                  <code className="text-orange-700 dark:text-orange-300">
                    POST /api/locations/filter
                  </code>
                  <p className="text-orange-600 dark:text-orange-400 mt-1">
                    Advanced multi-criteria filtering
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>System Features</CardTitle>
          <CardDescription>
            Comprehensive location management capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center space-y-2">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                <Search className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold">Smart Search</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Search across states, cities, areas, and buildings with autocomplete
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                <MapPin className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold">Hierarchical Structure</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                State → City → Area → Building hierarchy for precise filtering
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                <Building className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold">Building Database</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Comprehensive building and development information with amenities
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                <Star className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold">Google Maps Ready</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Coordinates and place IDs ready for Maps integration
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}