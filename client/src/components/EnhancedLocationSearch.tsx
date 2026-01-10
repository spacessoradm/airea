import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Building, Home, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { locationService, type LocationResult } from '@/services/locationService';
import { cn } from '@/lib/utils';

interface PropertyResult {
  id: string;
  title: string;
  location: string;
  propertyType: string;
  price: number;
  category: 'property';
}

interface SearchResult {
  locations: LocationResult[];
  properties: PropertyResult[];
}

interface EnhancedLocationSearchProps {
  onLocationSelect?: (location: LocationResult) => void;
  onPropertySelect?: (property: PropertyResult) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function EnhancedLocationSearch({
  onLocationSelect,
  onPropertySelect,
  onSearch,
  placeholder,
  className
}: EnhancedLocationSearchProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ locations: [], properties: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock property search function - in real app, this would call the properties API
  const searchProperties = useCallback(async (searchQuery: string): Promise<PropertyResult[]> => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    try {
      // Mock implementation - replace with actual API call to /api/properties/search
      const response = await fetch(`/api/properties?search=${encodeURIComponent(searchQuery)}&limit=5`);
      if (!response.ok) return [];
      
      const properties = await response.json();
      return properties.slice(0, 5).map((prop: any) => ({
        id: prop.id,
        title: prop.title,
        location: `${prop.location?.area || prop.location?.city || ''}, ${prop.location?.state || ''}`,
        propertyType: prop.propertyType,
        price: prop.price,
        category: 'property' as const
      }));
    } catch (error) {
      console.error('Property search failed:', error);
      return [];
    }
  }, []);

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults({ locations: [], properties: [] });
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      // Search both locations and properties simultaneously
      const [locations, properties] = await Promise.all([
        locationService.searchLocations({ query: searchQuery, limit: 8 }),
        searchProperties(searchQuery)
      ]);

      setResults({ locations, properties });
      setIsOpen(locations.length > 0 || properties.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search failed:', error);
      setResults({ locations: [], properties: [] });
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [searchProperties]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalResults = results.locations.length + results.properties.length;
    
    if (!isOpen || totalResults === 0) {
      if (e.key === 'Enter' && query.trim()) {
        onSearch?.(query.trim());
        setIsOpen(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalResults);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev <= 0 ? totalResults - 1 : prev - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelection(selectedIndex);
        } else if (query.trim()) {
          onSearch?.(query.trim());
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelection = (index: number) => {
    if (index < results.locations.length) {
      const location = results.locations[index];
      setQuery(location.displayName || location.name);
      onLocationSelect?.(location);
    } else {
      const propertyIndex = index - results.locations.length;
      const property = results.properties[propertyIndex];
      setQuery(property.title);
      onPropertySelect?.(property);
    }
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const getResultIcon = (type: 'location' | 'property', subtype?: string) => {
    if (type === 'property') {
      return subtype?.toLowerCase().includes('condo') || subtype?.toLowerCase().includes('apartment') 
        ? Building 
        : Home;
    }
    return MapPin;
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `RM${(price / 1000000).toFixed(1)}M`;
    }
    return `RM${(price / 1000).toFixed(0)}K`;
  };

  return (
    <div ref={searchRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder || t('search.placeholder') || 'Search locations, areas, condos...'}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          data-testid="input-enhanced-search"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        )}
        {!isLoading && isOpen && (
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (results.locations.length > 0 || results.properties.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Location Results */}
          {results.locations.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                {t('search.areas') || 'Areas & Locations'}
              </div>
              {results.locations.map((location, index) => {
                const Icon = getResultIcon('location');
                const isSelected = selectedIndex === index;
                
                return (
                  <button
                    key={location.id}
                    onClick={() => handleSelection(index)}
                    className={cn(
                      "w-full px-3 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-b-0",
                      isSelected && "bg-blue-50"
                    )}
                    data-testid={`location-result-${index}`}
                  >
                    <div className={cn(
                      "p-1 rounded-full mt-0.5",
                      location.buildingType?.toLowerCase().includes('area') ? "bg-green-100" : "bg-blue-100"
                    )}>
                      <Icon className={cn(
                        "h-3 w-3",
                        location.buildingType?.toLowerCase().includes('area') ? "text-green-600" : "text-blue-600"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {location.name}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {location.displayName || `${location.city}, ${location.state}`}
                      </div>
                      {location.buildingType && (
                        <div className="text-xs text-gray-400 mt-1">
                          {location.buildingType}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Property Results */}
          {results.properties.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                {t('search.properties') || 'Properties & Condos'}
              </div>
              {results.properties.map((property, propertyIndex) => {
                const index = results.locations.length + propertyIndex;
                const Icon = getResultIcon('property', property.propertyType);
                const isSelected = selectedIndex === index;
                
                return (
                  <button
                    key={property.id}
                    onClick={() => handleSelection(index)}
                    className={cn(
                      "w-full px-3 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-b-0",
                      isSelected && "bg-blue-50"
                    )}
                    data-testid={`property-result-${propertyIndex}`}
                  >
                    <div className="p-1 rounded-full bg-purple-100 mt-0.5">
                      <Icon className="h-3 w-3 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {property.title}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {property.location}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          {property.propertyType}
                        </span>
                        <span className="text-xs font-medium text-gray-700">
                          {formatPrice(property.price)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}