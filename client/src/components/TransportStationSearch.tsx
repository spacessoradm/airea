import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Search, Train, Navigation, Clock, MapPin, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface TransportStation {
  id: string;
  stationName: string;
  stationCode: string;
  lineName: string;
  transportType: string;
  latitude: number;
  longitude: number;
  facilities?: string[];
  nearbyLandmarks?: string[];
}

interface NearbyStationResult {
  station: TransportStation;
  distanceMeters: number;
  walkingTimeMinutes: number;
}

interface PropertyWithStations {
  property: {
    id: string;
    title: string;
    price: string;
    bedrooms: number;
    bathrooms: number;
    propertyType: string;
    city: string;
    address: string;
    images: string[];
  };
  nearbyStations: NearbyStationResult[];
  closestStation: NearbyStationResult;
}

const TransportStationSearch: React.FC = () => {
  const [searchMode, setSearchMode] = useState<'stations' | 'properties'>('stations');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['MRT', 'LRT']);
  const [maxWalkingMinutes, setMaxWalkingMinutes] = useState([10]);
  const [propertyFilters, setPropertyFilters] = useState({
    bedrooms: '',
    priceMax: '',
    propertyType: [] as string[],
  });

  const transportTypes = ['MRT', 'LRT', 'Monorail', 'KTM', 'BRT'];
  const propertyTypes = ['condominium', 'apartment', 'townhouse', 'landed'];

  // Search stations
  const { data: stationsResult, isLoading: stationsLoading, refetch: searchStations } = useQuery({
    queryKey: ['transport-stations', 'search', searchQuery, selectedTypes],
    queryFn: async () => {
      if (!searchQuery.trim()) return null;
      const params = new URLSearchParams({
        q: searchQuery,
        types: selectedTypes.join(','),
        limit: '20'
      });
      const response = await fetch(`/api/transport-stations/search?${params}`);
      return response.json();
    },
    enabled: false
  });

  // Get network info
  const { data: networkInfo } = useQuery({
    queryKey: ['transport-stations', 'network-info'],
    queryFn: async () => {
      const response = await fetch('/api/transport-stations/network-info');
      return response.json();
    }
  });

  // Search properties near stations
  const { data: propertiesResult, isLoading: propertiesLoading, refetch: searchProperties } = useQuery({
    queryKey: ['transport-stations', 'properties', selectedTypes, maxWalkingMinutes, propertyFilters],
    queryFn: async () => {
      const response = await fetch('/api/transport-stations/nearby-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationTypes: selectedTypes,
          maxWalkingMinutes: maxWalkingMinutes[0],
          propertyFilters: {
            bedrooms: propertyFilters.bedrooms ? parseInt(propertyFilters.bedrooms) : undefined,
            priceMax: propertyFilters.priceMax ? parseInt(propertyFilters.priceMax) : undefined,
            propertyType: propertyFilters.propertyType.length > 0 ? propertyFilters.propertyType : undefined,
          },
          limit: 50
        })
      });
      return response.json();
    },
    enabled: false
  });

  const handleSearch = () => {
    if (searchMode === 'stations') {
      searchStations();
    } else {
      searchProperties();
    }
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handlePropertyTypeToggle = (type: string) => {
    setPropertyFilters(prev => ({
      ...prev,
      propertyType: prev.propertyType.includes(type)
        ? prev.propertyType.filter(t => t !== type)
        : [...prev.propertyType, type]
    }));
  };

  const formatPrice = (price: string) => {
    const num = parseInt(price);
    if (num >= 1000000) return `RM ${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `RM ${(num / 1000).toFixed(0)}K`;
    return `RM ${num.toLocaleString()}`;
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'MRT': return <Train className="w-4 h-4 text-blue-600" />;
      case 'LRT': return <Zap className="w-4 h-4 text-green-600" />;
      case 'Monorail': return <Navigation className="w-4 h-4 text-purple-600" />;
      case 'KTM': return <Train className="w-4 h-4 text-orange-600" />;
      case 'BRT': return <MapPin className="w-4 h-4 text-red-600" />;
      default: return <Train className="w-4 h-4 text-gray-600" />;
    }
  };

  const StationCard: React.FC<{ station: TransportStation; distance?: number; walkTime?: number }> = ({ 
    station, distance, walkTime 
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              {getTransportIcon(station.transportType)}
              {station.stationName}
            </CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              {station.stationCode} • {station.lineName}
            </div>
          </div>
          <Badge variant="outline">{station.transportType}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(distance !== undefined && walkTime !== undefined) && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {distance}m away
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {walkTime} min walk
              </div>
            </div>
          )}
          
          {station.facilities && station.facilities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {station.facilities.slice(0, 3).map((facility, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {facility.replace('_', ' ')}
                </Badge>
              ))}
              {station.facilities.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{station.facilities.length - 3} more
                </Badge>
              )}
            </div>
          )}
          
          {station.nearbyLandmarks && station.nearbyLandmarks.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <strong>Nearby:</strong> {station.nearbyLandmarks.slice(0, 2).join(', ')}
              {station.nearbyLandmarks.length > 2 && '...'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const PropertyCard: React.FC<{ propertyData: PropertyWithStations }> = ({ propertyData }) => {
    const { property, closestStation } = propertyData;
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
          {property.images && property.images.length > 0 ? (
            <img 
              src={property.images[0]} 
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No image available
            </div>
          )}
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold line-clamp-1">
            {property.title}
          </CardTitle>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-1" />
            {property.city}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-primary">
                {formatPrice(property.price)}
              </span>
              <div className="text-sm text-muted-foreground">
                {property.bedrooms}BR • {property.bathrooms}BA
              </div>
            </div>
            
            <Badge variant="outline" className="text-xs">
              {property.propertyType}
            </Badge>
            
            {/* Closest station info */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-1">Nearest Transport</div>
              <div className="flex items-center gap-2">
                {getTransportIcon(closestStation.station.transportType)}
                <span className="text-sm">{closestStation.station.stationName}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span>{closestStation.distanceMeters}m</span>
                <span>{closestStation.walkingTimeMinutes} min walk</span>
                <Badge variant="outline" className="text-xs">
                  {closestStation.station.transportType}
                </Badge>
              </div>
            </div>
            
            {/* All nearby stations summary */}
            {propertyData.nearbyStations.length > 1 && (
              <div className="text-xs text-muted-foreground">
                +{propertyData.nearbyStations.length - 1} other stations nearby
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Train className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Transport Station Search</h2>
          <p className="text-muted-foreground">
            Find stations and properties near MRT, LRT, Monorail, and KTM stations
          </p>
        </div>
      </div>

      {/* Network Overview */}
      {networkInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Malaysia Transport Network</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(networkInfo.summary).map(([type, info]: [string, any]) => (
                <div key={type} className="text-center">
                  <div className="flex justify-center mb-2">
                    {getTransportIcon(type)}
                  </div>
                  <div className="font-semibold">{info.totalStations}</div>
                  <div className="text-sm text-muted-foreground">{type} Stations</div>
                  <div className="text-xs text-muted-foreground">{info.lines.length} Lines</div>
                </div>
              ))}
            </div>
            <div className="text-center mt-4 pt-4 border-t">
              <div className="text-2xl font-bold">{networkInfo.totalStations}</div>
              <div className="text-sm text-muted-foreground">Total Stations</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Button
              variant={searchMode === 'stations' ? 'default' : 'outline'}
              onClick={() => setSearchMode('stations')}
              className="flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search Stations
            </Button>
            <Button
              variant={searchMode === 'properties' ? 'default' : 'outline'}
              onClick={() => setSearchMode('properties')}
              className="flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Find Properties
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Transport Type Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Transport Types</label>
            <div className="flex flex-wrap gap-2">
              {transportTypes.map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={() => handleTypeToggle(type)}
                  />
                  <label htmlFor={type} className="text-sm flex items-center gap-1">
                    {getTransportIcon(type)}
                    {type}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {searchMode === 'stations' ? (
            /* Station Search */
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Station Name or Code</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., KLCC, KJ11, Bukit Bintang"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Property Search */
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Maximum Walking Distance: {maxWalkingMinutes[0]} minutes
                </label>
                <Slider
                  value={maxWalkingMinutes}
                  onValueChange={setMaxWalkingMinutes}
                  max={30}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Bedrooms</label>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={propertyFilters.bedrooms}
                    onChange={(e) => setPropertyFilters(prev => ({ ...prev, bedrooms: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Max Price (RM)</label>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={propertyFilters.priceMax}
                    onChange={(e) => setPropertyFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Property Type</label>
                  <div className="flex flex-wrap gap-1">
                    {propertyTypes.map(type => (
                      <div key={type} className="flex items-center space-x-1">
                        <Checkbox
                          id={`prop-${type}`}
                          checked={propertyFilters.propertyType.includes(type)}
                          onCheckedChange={() => handlePropertyTypeToggle(type)}
                        />
                        <label htmlFor={`prop-${type}`} className="text-xs">
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Button onClick={handleSearch} className="w-full">
                <MapPin className="w-4 h-4 mr-2" />
                Find Properties Near Transport
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {searchMode === 'stations' && stationsResult && (
        <div>
          <h3 className="text-xl font-semibold mb-4">
            Station Search Results ({stationsResult.count})
          </h3>
          {stationsLoading ? (
            <div className="text-center py-8">Searching stations...</div>
          ) : stationsResult.stations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stationsResult.stations.map((station: TransportStation) => (
                <StationCard key={station.id} station={station} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No stations found for "{stationsResult.query}"
            </div>
          )}
        </div>
      )}

      {searchMode === 'properties' && propertiesResult && (
        <div>
          <h3 className="text-xl font-semibold mb-4">
            Properties Near Transport ({propertiesResult.count})
          </h3>
          <p className="text-muted-foreground mb-4">{propertiesResult.message}</p>
          {propertiesLoading ? (
            <div className="text-center py-8">Searching properties...</div>
          ) : propertiesResult.properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {propertiesResult.properties.map((propertyData: PropertyWithStations) => (
                <PropertyCard key={propertyData.property.id} propertyData={propertyData} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No properties found within {maxWalkingMinutes[0]} minutes of selected transport types
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransportStationSearch;