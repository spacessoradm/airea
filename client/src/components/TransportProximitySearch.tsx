import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { MapPin, Train, Bus, Clock, Search, Filter } from 'lucide-react';

interface SearchResult {
  property: {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
    price: string;
    bedrooms: number;
    bathrooms: number;
    propertyType: string;
    listingType: string;
    squareFeet: number;
    images: string[];
  };
  nearestStation?: {
    name: string;
    code: string;
    type: string;
    line: string;
    distanceMeters: number;
    walkingMinutes: number;
  };
}

interface SearchFilters {
  transportTypes: string[];
  maxDistanceMeters: number;
  bedrooms?: number;
  propertyType?: string;
  listingType?: 'rent' | 'sale';
  maxPrice?: number;
  city?: string;
}

export function TransportProximitySearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'natural' | 'filters'>('natural');
  const [filters, setFilters] = useState<SearchFilters>({
    transportTypes: ['MRT', 'LRT'],
    maxDistanceMeters: 1000,
  });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const queryClient = useQueryClient();

  // Natural language search mutation
  const naturalLanguageSearch = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch('/api/search/natural-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    onSuccess: (data) => {
      setSearchResults(data.results || []);
    },
  });

  // Geospatial search mutation
  const geospatialSearch = useMutation({
    mutationFn: async (searchFilters: any) => {
      const response = await fetch('/api/search/geospatial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...searchFilters,
          nearTransport: searchFilters.transportTypes.length > 0 ? {
            types: searchFilters.transportTypes,
            maxDistanceMeters: searchFilters.maxDistanceMeters,
          } : undefined,
        }),
      });
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    onSuccess: (data) => {
      setSearchResults(data.results || []);
    },
  });

  // Search suggestions query
  const { data: suggestions } = useQuery({
    queryKey: ['/api/search/suggestions', searchQuery.slice(0, -1)],
    queryFn: async () => {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery.slice(0, -1))}`);
      if (!response.ok) return { suggestions: [] };
      return response.json();
    },
    enabled: searchQuery.length > 2 && searchMode === 'natural',
  });

  const handleNaturalSearch = () => {
    if (searchQuery.trim()) {
      naturalLanguageSearch.mutate(searchQuery.trim());
    }
  };

  const handleFilterSearch = () => {
    geospatialSearch.mutate(filters);
  };

  const handleTransportTypeChange = (type: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      transportTypes: checked 
        ? [...prev.transportTypes, type]
        : prev.transportTypes.filter(t => t !== type)
    }));
  };

  const transportTypes = [
    { id: 'MRT', label: 'MRT', icon: Train, color: 'bg-blue-500' },
    { id: 'LRT', label: 'LRT', icon: Train, color: 'bg-green-500' },
    { id: 'Monorail', label: 'Monorail', icon: Train, color: 'bg-purple-500' },
    { id: 'KTM', label: 'KTM', icon: Train, color: 'bg-red-500' },
    { id: 'BRT', label: 'BRT', icon: Bus, color: 'bg-orange-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Property Search by Transport Proximity</h1>
        <p className="text-gray-600">Find properties near MRT, LRT, and other public transport stations</p>
      </div>

      <Tabs value={searchMode} onValueChange={(value: any) => setSearchMode(value)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="natural">Natural Language Search</TabsTrigger>
          <TabsTrigger value="filters">Advanced Filters</TabsTrigger>
        </TabsList>

        <TabsContent value="natural" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                AI-Powered Search
              </CardTitle>
              <CardDescription>
                Search using natural language: "3 bedroom condo near MRT KLCC under RM500k"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    data-testid="input-natural-search"
                    placeholder="e.g., 2 bedroom apartment near MRT in Mont Kiara"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleNaturalSearch()}
                    className="pr-4"
                  />
                  {/* Search Suggestions */}
                  {suggestions?.suggestions?.length > 0 && searchQuery.length > 2 && (
                    <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg z-10 mt-1">
                      {suggestions.suggestions.map((suggestion: string, index: number) => (
                        <button
                          key={index}
                          data-testid={`suggestion-${index}`}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                          onClick={() => {
                            setSearchQuery(suggestion);
                            naturalLanguageSearch.mutate(suggestion);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button 
                  data-testid="button-natural-search"
                  onClick={handleNaturalSearch}
                  disabled={naturalLanguageSearch.isPending}
                >
                  {naturalLanguageSearch.isPending ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Advanced Search Filters
              </CardTitle>
              <CardDescription>
                Use specific filters for precise property search
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Transport Types */}
              <div className="space-y-3">
                <h3 className="font-medium">Transport Types</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {transportTypes.map((type) => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <Checkbox
                        data-testid={`checkbox-transport-${type.id.toLowerCase()}`}
                        id={type.id}
                        checked={filters.transportTypes.includes(type.id)}
                        onCheckedChange={(checked) => 
                          handleTransportTypeChange(type.id, checked as boolean)
                        }
                      />
                      <label htmlFor={type.id} className="text-sm font-medium flex items-center gap-1">
                        <type.icon className={`w-4 h-4 text-white rounded p-0.5 ${type.color}`} />
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distance */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Maximum Distance</h3>
                  <span className="text-sm text-gray-600">
                    {filters.maxDistanceMeters}m (~{Math.round(filters.maxDistanceMeters / 83.33)} min walk)
                  </span>
                </div>
                <Slider
                  data-testid="slider-distance"
                  value={[filters.maxDistanceMeters]}
                  onValueChange={([value]) => setFilters(prev => ({ ...prev, maxDistanceMeters: value }))}
                  min={200}
                  max={2000}
                  step={100}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>200m</span>
                  <span>1km</span>
                  <span>2km</span>
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bedrooms</label>
                  <Input
                    data-testid="input-bedrooms"
                    type="number"
                    min="1"
                    max="10"
                    placeholder="Any"
                    value={filters.bedrooms || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      bedrooms: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Property Type</label>
                  <select 
                    data-testid="select-property-type"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={filters.propertyType || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      propertyType: e.target.value || undefined 
                    }))}
                  >
                    <option value="">Any Type</option>
                    <option value="condominium">Condominium</option>
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="service-residence">Service Residence</option>
                    <option value="studio">Studio</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Listing Type</label>
                  <select 
                    data-testid="select-listing-type"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={filters.listingType || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      listingType: e.target.value as 'rent' | 'sale' || undefined 
                    }))}
                  >
                    <option value="">For Rent & Sale</option>
                    <option value="rent">For Rent</option>
                    <option value="sale">For Sale</option>
                  </select>
                </div>
              </div>

              <Button 
                data-testid="button-filter-search"
                onClick={handleFilterSearch}
                disabled={geospatialSearch.isPending}
                className="w-full"
              >
                {geospatialSearch.isPending ? 'Searching...' : 'Search Properties'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Search Results ({searchResults.length} properties)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {searchResults.map((result) => (
              <Card key={result.property.id} className="overflow-hidden">
                <div className="relative">
                  {result.property.images?.[0] && (
                    <img 
                      src={result.property.images[0]} 
                      alt={result.property.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary">
                      {result.property.listingType === 'rent' ? 'For Rent' : 'For Sale'}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-600 text-white">
                      RM {result.property.price}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg line-clamp-2">
                      {result.property.title}
                    </h3>
                    
                    <div className="flex items-center text-gray-600 text-sm">
                      <MapPin className="w-4 h-4 mr-1" />
                      {result.property.address}, {result.property.city}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{result.property.bedrooms} bed</span>
                      <span>{result.property.bathrooms} bath</span>
                      {result.property.squareFeet && (
                        <span>{result.property.squareFeet} sqft</span>
                      )}
                    </div>

                    {result.nearestStation && (
                      <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 text-sm">
                          <Train className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-800">
                            {result.nearestStation.name} ({result.nearestStation.code})
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-blue-600 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {result.nearestStation.distanceMeters}m away
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {result.nearestStation.walkingMinutes} min walk
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {result.nearestStation.type}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {(naturalLanguageSearch.isSuccess || geospatialSearch.isSuccess) && searchResults.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Properties Found</h3>
            <p className="text-gray-500">
              Try adjusting your search criteria or expanding the distance radius.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}