import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Search, Building, MapPin, Globe, Clock, TrendingUp, Loader2, MapPinIcon, Home, Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { debounce } from "@/utils/performance";

interface Suggestion {
  text: string;
  type: 'building' | 'area' | 'city' | 'recent' | 'trending' | 'location' | 'property';
  count?: number;
  distance?: string;
  price?: number;
  propertyType?: string;
  id?: string;
}

interface SearchWithSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchType?: 'rent' | 'buy';
  hideSearchIcon?: boolean;
  showAiIndicator?: boolean;
  isSearching?: boolean;
}

export const SearchWithSuggestions: React.FC<SearchWithSuggestionsProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = "Search for properties, areas, or buildings...",
  className,
  disabled = false,
  searchType = 'rent',
  hideSearchIcon = false,
  showAiIndicator = true,
  isSearching = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied or unavailable');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
      );
    }
  }, []);

  // Debounced query value to reduce API calls
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  // Debounce the search input
  const debouncedSetValue = useMemo(
    () => debounce((newValue: string) => setDebouncedValue(newValue), 300),
    []
  );
  
  useEffect(() => {
    debouncedSetValue(value);
  }, [value, debouncedSetValue]);

  // Determine if query should use fuzzy search or AI search
  const shouldUseFuzzySearch = (query: string): boolean => {
    const trimmed = query.trim().toLowerCase();
    
    // Use FUZZY search for complex natural language queries
    const complexPhrases = ['near', 'around', 'close to', 'within', 'walking distance', 'for rent', 'for sale', 'under', 'above', 'below', 'bedroom', 'bathroom', 'mrt', 'lrt', 'ktm', 'monorail'];
    const hasComplexPhrase = complexPhrases.some(phrase => trimmed.includes(phrase));
    
    // If it contains complex natural language, use fuzzy search (AI search)
    if (hasComplexPhrase) return true;
    
    // Use FUZZY search for location-based queries like "damansara", "mont kiara", etc.
    // Include common misspellings to ensure consistent behavior
    const locationPatterns = /^(daman|mont|kiara|bangsar|ttdi|subang|klcc|kl|pj|usj|shah|alam|cheras|ampang|kepong|kpong|wangsa|sentul|setapak|sri|petaling)/i;
    if (locationPatterns.test(trimmed)) return true;
    
    // Use ENHANCED search for building/property names (short queries without spaces)
    // This ensures property names like "Casa Magna", "Casa Vista" etc are found in dropdown
    if (trimmed.length <= 15 && !trimmed.includes(' ')) return false;
    
    // Default to fuzzy search for other complex queries
    return true;
  };

  // Fuzzy search query
  const { data: fuzzyData, isLoading: fuzzyLoading } = useQuery({
    queryKey: ['/api/search/fuzzy', debouncedValue],
    queryFn: async () => {
      const response = await fetch(`/api/search/fuzzy?q=${encodeURIComponent(debouncedValue)}`);
      if (!response.ok) throw new Error('Fuzzy search failed');
      return response.json();
    },
    enabled: debouncedValue.trim().length >= 2 && shouldUseFuzzySearch(debouncedValue),
    staleTime: 0, // Disable cache for incognito compatibility
    gcTime: 0,
  });

  // Enhanced suggestions with auto-complete, trending, location-aware, and properties (AI search)
  const { data: suggestionsData, isLoading: aiLoading, refetch } = useQuery({
    queryKey: ['/api/search/suggestions-enhanced', debouncedValue, searchType, userLocation], // Remove timestamp to fix caching
    staleTime: 1000, // 1 second cache to prevent excessive requests
    gcTime: 5000, // 5 second garbage collection
    enabled: debouncedValue.length >= 2, // Only when there's meaningful input
    retry: 1, // Reduce retries
    queryFn: async () => {
      const queryToUse = debouncedValue || value || '';
      
      const response = await fetch('/api/search/suggestions-enhanced', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ 
          query: queryToUse,
          searchType,
          userLocation,
          includeDefaults: queryToUse.length === 0,
          includeProperties: false  // Only show areas, locations, and buildings
        })
      });
      
      return await response.json();
    },
  });

  // Remove forced refetch to prevent infinite loading
  // useEffect(() => {
  //   if (inputFocused && value.length > 0) {
  //     refetch();
  //   }
  // }, [inputFocused, value, refetch]);

  // Combine fuzzy and AI suggestions - prioritize fuzzy for location queries and filter out property suggestions
  const suggestions: Suggestion[] = useMemo(() => {
    let rawSuggestions: Suggestion[] = [];
    
    if (shouldUseFuzzySearch(debouncedValue)) {
      // For location queries like "Damansara", use fuzzy search results
      const fuzzyResults = fuzzyData || [];
      const aiResults = suggestionsData?.suggestions || [];
      
      // Combine both but prioritize fuzzy results for location-based searches
      rawSuggestions = fuzzyResults.length > 0 ? fuzzyResults : aiResults;
    } else {
      rawSuggestions = suggestionsData?.suggestions || [];
    }
    
    // Filter out property suggestions - only keep areas, locations, buildings, cities, recent, trending
    return rawSuggestions.filter((suggestion: any) => 
      suggestion.type !== 'property' && 
      !('price' in suggestion) && 
      !('propertyType' in suggestion) && 
      !('id' in suggestion && suggestion.type === 'property')
    );
  }, [debouncedValue, fuzzyData, suggestionsData]);

  // Combined loading state
  const isLoading = shouldUseFuzzySearch(debouncedValue) ? fuzzyLoading : aiLoading;

  // Update dropdown position when input ref changes
  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  // Force show dropdown when input is focused - simplified for incognito compatibility
  useEffect(() => {
    if (inputFocused) {
      setIsOpen(true);
      updateDropdownPosition();
    } else {
      setIsOpen(false);
    }
  }, [inputFocused]);

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    onChange(suggestion.text);
    setIsOpen(false);
    setInputFocused(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch();
      setIsOpen(false);
      setInputFocused(false);
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      setInputFocused(false);
      inputRef.current?.blur();
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'building':
        return <Building className="h-4 w-4" />;
      case 'property':
        return <Home className="h-4 w-4" />;
      case 'area':
        return <MapPin className="h-4 w-4" />;
      case 'city':
        return <Globe className="h-4 w-4" />;
      case 'recent':
        return <Clock className="h-4 w-4" />;
      case 'trending':
        return <TrendingUp className="h-4 w-4" />;
      case 'location':
        return <MapPinIcon className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getSuggestionLabel = (type: string) => {
    switch (type) {
      case 'recent':
        return 'Recent';
      case 'trending':
        return 'Trending';
      case 'location':
        return 'Near you';
      case 'property':
        return 'Property';
      case 'area':
        return 'Area';
      case 'city':
        return 'City';
      case 'building':
        return 'Building';
      default:
        return '';
    }
  };

  const getLeftPadding = () => {
    if (!hideSearchIcon) return "pl-12"; // Space for search icon
    return "pl-4"; // Minimal padding
  };

  const getRightPadding = () => {
    return "pr-16"; // Space for search button
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex items-center gap-3">
        {/* AI Indicator - Left of search bar */}
        {showAiIndicator && (
          <div className="flex-shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        )}
        
        <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 flex-1">        
        {/* Search Icon */}
        {!hideSearchIcon && (
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        )}
        
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setInputFocused(true);
            updateDropdownPosition();
            // Force show suggestions on focus if we have content
            if (value.length > 0 && suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onBlur={() => {
            // Delay hiding to allow suggestion clicks to process
            setTimeout(() => {
              setInputFocused(false);
              setIsOpen(false);
            }, 200);
          }}
          onKeyDown={handleKeyDown}
          className={cn("border-0 focus:ring-0 bg-transparent h-12 text-lg", getLeftPadding(), getRightPadding())}
          disabled={disabled || isSearching}
        />

        {/* Search Button */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <Button
            onClick={onSearch}
            size="sm"
            disabled={disabled || isSearching || !value.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        </div>
        
        {isOpen && createPortal(
          <div 
            data-suggestions-dropdown
            className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-2xl max-h-80 overflow-y-auto"
            style={{ 
              zIndex: 999999999,
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              backgroundColor: 'white',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e5e7eb'
            }}
          >
            {suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.type}-${suggestion.text}-${index}`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input from losing focus
                    handleSuggestionSelect(suggestion);
                  }}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors"
                >
                  <div className="text-muted-foreground flex-shrink-0">
                    {getSuggestionIcon(suggestion.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{suggestion.text}</div>
                    {suggestion.type === 'building' && suggestion.distance ? (
                      <div className="text-sm text-muted-foreground">{suggestion.distance}</div>
                    ) : getSuggestionLabel(suggestion.type) && (
                      <div className="text-sm text-muted-foreground">{getSuggestionLabel(suggestion.type)}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {suggestion.count !== undefined && suggestion.type !== 'building' && (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5 whitespace-nowrap">
                        {suggestion.count} {suggestion.count === 1 ? 'property' : 'properties'}
                      </Badge>
                    )}
                    {suggestion.type === 'building' && (
                      <Badge variant="default" className="text-xs px-2 py-0.5 whitespace-nowrap bg-blue-100 text-blue-700">
                        Building
                      </Badge>
                    )}
                    {suggestion.distance && suggestion.type !== 'building' && (
                      <Badge variant="outline" className="text-xs px-2 py-0.5 whitespace-nowrap">
                        {suggestion.distance}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            ) : isLoading ? (
              <div className="flex items-center gap-3 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="text-gray-500">Finding suggestions...</span>
              </div>
            ) : value.length === 0 ? (
              <div className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Search className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Start typing to see suggestions...</span>
                </div>
                <div className="text-xs text-gray-400">
                  Try: "condo near MRT", "3 bedroom house", "luxury apartment"
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">
                <Search className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">No suggestions found. Try a different search.</span>
              </div>
            )}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};