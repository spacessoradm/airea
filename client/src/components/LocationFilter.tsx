import { useState, useEffect, useCallback } from "react";
import { Search, MapPin, Building, Home, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";

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

interface LocationFilterProps {
  onLocationSelect?: (location: LocationSearchResult) => void;
  onFilterChange?: (filters: {
    stateId?: string;
    cityId?: string;
    areaId?: string;
    buildingType?: string;
  }) => void;
  showAdvancedFilters?: boolean;
  placeholder?: string;
}

export function LocationFilter({
  onLocationSelect,
  onFilterChange,
  showAdvancedFilters = true,
  placeholder = "Search for locations, buildings, or areas..."
}: LocationFilterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Search locations
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['/api/locations/search', debouncedSearchTerm],
    enabled: debouncedSearchTerm.length > 2,
    queryFn: async () => {
      const response = await fetch(`/api/locations/search?q=${encodeURIComponent(debouncedSearchTerm)}&limit=10`);
      if (!response.ok) throw new Error('Failed to search locations');
      return response.json() as Promise<LocationSearchResult[]>;
    },
  });

  // Get all states
  const { data: states } = useQuery({
    queryKey: ['/api/locations/states'],
    queryFn: async () => {
      const response = await fetch('/api/locations/states');
      if (!response.ok) throw new Error('Failed to fetch states');
      return response.json();
    },
  });

  // Get cities by state
  const { data: cities } = useQuery({
    queryKey: ['/api/locations/states', selectedState, 'cities'],
    enabled: !!selectedState && selectedState !== "all",
    queryFn: async () => {
      const response = await fetch(`/api/locations/states/${selectedState}/cities`);
      if (!response.ok) throw new Error('Failed to fetch cities');
      return response.json();
    },
  });

  // Get areas by city
  const { data: areas } = useQuery({
    queryKey: ['/api/locations/cities', selectedCity, 'areas'],
    enabled: !!selectedCity && selectedCity !== "all",
    queryFn: async () => {
      const response = await fetch(`/api/locations/cities/${selectedCity}/areas`);
      if (!response.ok) throw new Error('Failed to fetch areas');
      return response.json();
    },
  });

  // Handle location selection from search results
  const handleLocationSelect = (location: LocationSearchResult) => {
    setSearchTerm(location.fullPath);
    onLocationSelect?.(location);
  };

  // Handle filter changes with useCallback to prevent infinite loops
  const handleFilterChange = useCallback(() => {
    onFilterChange?.({
      stateId: selectedState && selectedState !== "all" ? selectedState : undefined,
      cityId: selectedCity && selectedCity !== "all" ? selectedCity : undefined,
      areaId: selectedArea && selectedArea !== "all" ? selectedArea : undefined,
    });
  }, [onFilterChange, selectedState, selectedCity, selectedArea]);

  useEffect(() => {
    handleFilterChange();
  }, [handleFilterChange]);

  // Reset dependent selections when parent changes
  useEffect(() => {
    if (selectedState && selectedState !== "all") {
      setSelectedCity("all");
      setSelectedArea("all");
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedCity && selectedCity !== "all") {
      setSelectedArea("all");
    }
  }, [selectedCity]);

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'state':
        return <MapPin className="h-4 w-4 text-blue-500" />;
      case 'city':
        return <Home className="h-4 w-4 text-green-500" />;
      case 'area':
        return <MapPin className="h-4 w-4 text-purple-500" />;
      case 'building':
        return <Building className="h-4 w-4 text-orange-500" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Location Filter
        </CardTitle>
        <CardDescription>
          Find properties by location, building name, or area
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Search */}
        <div className="space-y-2">
          <Label htmlFor="location-search">Quick Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="location-search"
              data-testid="input-location-search"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            
            {/* Search Results Dropdown */}
            {searchResults && searchResults.length > 0 && searchTerm.length > 2 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    data-testid={`button-location-${result.type}-${result.id}`}
                    onClick={() => handleLocationSelect(result)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 flex items-center gap-3"
                  >
                    {getLocationIcon(result.type)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {result.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {result.fullPath}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                        {result.type}
                        {result.postalCode && ` • ${result.postalCode}`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Loading indicator */}
            {isSearching && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  Searching locations...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                data-testid="button-toggle-advanced-filters"
              >
                Advanced Location Filters
                <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              {/* State Selection */}
              <div className="space-y-2">
                <Label htmlFor="state-select">State</Label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger data-testid="select-state">
                    <SelectValue placeholder="Select a state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {states?.map((state: any) => (
                      <SelectItem key={state.id} value={state.id}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* City Selection */}
              <div className="space-y-2">
                <Label htmlFor="city-select">City/Township</Label>
                <Select 
                  value={selectedCity} 
                  onValueChange={setSelectedCity}
                  disabled={!selectedState || selectedState === "all"}
                >
                  <SelectTrigger data-testid="select-city">
                    <SelectValue placeholder={selectedState ? "Select a city" : "Select a state first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities?.map((city: any) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Area Selection */}
              <div className="space-y-2">
                <Label htmlFor="area-select">Area/Taman</Label>
                <Select 
                  value={selectedArea} 
                  onValueChange={setSelectedArea}
                  disabled={!selectedCity || selectedCity === "all"}
                >
                  <SelectTrigger data-testid="select-area">
                    <SelectValue placeholder={selectedCity ? "Select an area" : "Select a city first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {areas?.map((area: any) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                        {area.areaType && ` (${area.areaType})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedState("all");
                  setSelectedCity("all");
                  setSelectedArea("all");
                  setSearchTerm("");
                }}
                data-testid="button-clear-filters"
                className="w-full"
              >
                Clear All Filters
              </Button>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}