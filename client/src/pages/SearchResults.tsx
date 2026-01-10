import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { QuickFilters } from "@/components/QuickFilters";
import PropertyCard from "@/components/PropertyCard";
import PropertyMapNew from "@/components/PropertyMapNew";
import { PlayfulLoadingAnimation } from "@/components/PlayfulLoadingAnimation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, Map, Search, Loader2, ArrowLeft, ChevronLeft, ChevronRight, Filter, TrendingUp, MessageCircle, MapPin } from "lucide-react";
import { SearchWithSuggestions } from "@/components/SearchWithSuggestions";
import { debounceWithControl } from "@/utils/performance";
import { SmartRecommendations } from "@/components/SmartRecommendations";
import { useChatContext } from "@/contexts/ChatContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  IntelligentSorter, 
  SORT_OPTIONS, 
  getPerformanceMetrics, 
  clearSortCache 
} from "@/utils/sortingUtils";
import { 
  useVirtualScroll, 
  usePagination, 
  useInfiniteScroll, 
  getOptimalRenderingStrategy 
} from "@/utils/virtualScrolling";
import { 
  propertyDataManager, 
  getPropertyDataState, 
  addPropertyBatch, 
  replacePropertyData, 
  clearPropertyData, 
  getPropertyEfficiencyMetrics 
} from "@/utils/progressiveDataManager";
import type { Property, Agent } from "@shared/schema";

interface PropertyFilters {
  propertyType?: string[]
  userSelectedPropertyTypes?: string[] // User's explicit selections (for UI count display)
  listingType?: string
  minPrice?: number
  maxPrice?: number
  minSquareFeet?: number
  maxSquareFeet?: number
  bedrooms?: number
  bathrooms?: number
  city?: string
  location?: string | { area: string; maxDistance?: number; transportation?: string }
  parking?: number
  amenities?: string[]
  sortBy?: string
  searchType?: 'building' | 'general'
  tenure?: string[]
  titleType?: string[]
  landTitleType?: string[]
}

export default function SearchResults() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PropertyFilters>({ listingType: "rent" });
  const [searchType, setSearchType] = useState<'rent' | 'buy'>('rent'); // Track buy/rent tab
  const [searchQuery, setSearchQuery] = useState("");
  const [newSearchQuery, setNewSearchQuery] = useState("");
  const [isDebouncePending, setIsDebouncePending] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [aiSearchResults, setAiSearchResults] = useState<(Property & { agent: Agent })[] | null>(null);
  const [isAiSearchActive, setIsAiSearchActive] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true); // Start with filters collapsed after search
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingConflictResolutionFilters, setPendingConflictResolutionFilters] = useState<PropertyFilters | null>(null);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Progressive loading state
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false);
  
  // Intelligent sorting and performance state
  const [intelligentSorter, setIntelligentSorter] = useState(() => 
    new IntelligentSorter<Property & { agent: Agent }>([], false)
  );
  const [sortPerformanceVisible, setSortPerformanceVisible] = useState(false);
  const [renderingStrategy, setRenderingStrategy] = useState<'virtual' | 'pagination' | 'simple'>('pagination');
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(false);
  
  // Concurrency control for progressive searches
  const currentSearchRef = useRef<{ 
    abortController: AbortController;
    searchId: string;
  } | null>(null);
  
  // Request deduplication - track last search query to prevent duplicates
  const lastSearchQueryRef = useRef<string>("");
  const pendingSearchRef = useRef<Promise<any> | null>(null);
  const [progressiveLoadingStats, setProgressiveLoadingStats] = useState<{
    totalLoaded: number;
    currentBatch: number;
    totalCount?: number;
    isFirstBatch: boolean;
    loadingTime: number;
  } | null>(null);
  
  // Check if current search is transport-related
  const isTransportSearch = searchQuery && (
    searchQuery.toLowerCase().includes('near mrt') ||
    searchQuery.toLowerCase().includes('near lrt') ||
    searchQuery.toLowerCase().includes('near ktm') ||
    searchQuery.toLowerCase().includes('near monorail') ||
    searchQuery.toLowerCase().includes('mrt station') ||
    searchQuery.toLowerCase().includes('lrt station')
  );
  const ITEMS_PER_PAGE = 20;
  const VIRTUAL_ITEM_HEIGHT = 400; // Estimated height of PropertyCard in pixels
  const CONTAINER_HEIGHT = 800; // Height of scrollable container

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { openChat } = useChatContext();

  // Define aiSearchMutation FIRST so it can be used in other functions
  const aiSearchMutation = useMutation({
    mutationFn: async (params: string | { query: string; searchType: 'rent' | 'buy' }) => {
      console.log('🔥 POPULAR SEARCH: Starting fast search', params);
      setIsSearching(true);
      
      // Handle both string and object parameters
      const searchParams = typeof params === 'string' 
        ? { query: params, searchType: searchType }
        : params;
      
      // REQUEST DEDUPLICATION: Check if same query is already in progress
      const queryKey = `${searchParams.query}|${searchParams.searchType}`;
      if (lastSearchQueryRef.current === queryKey && pendingSearchRef.current) {
        console.log('🔄 DEDUP: Reusing in-flight request for:', queryKey);
        return pendingSearchRef.current;
      }
      
      // Update last query and create new request
      lastSearchQueryRef.current = queryKey;
      console.log('🔥 POPULAR SEARCH: Making request with', searchParams);
      
      // Add timeout for search requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Create and store the request promise
      const requestPromise: Promise<any> = (async () => {
        try {
          const response = await fetch('/api/search/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchParams),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          console.log('🔥 POPULAR SEARCH: Got response', data.count, 'properties in fast time');
          
          return data;
        } catch (error: any) {
          clearTimeout(timeoutId);
          console.log('🚨 FETCH ERROR:', error.name, error.message);
          if (error.name === 'AbortError') {
            console.log('🚨 ABORT ERROR: Search was aborted/timed out');
            throw new Error('Search timeout - please try again');
          }
          throw error;
        }
      })();
      
      // Store and track completion
      pendingSearchRef.current = requestPromise;
      requestPromise.finally(() => {
        if (pendingSearchRef.current === requestPromise) {
          pendingSearchRef.current = null;
        }
      });
      
      return requestPromise;
    },
    onSuccess: (result) => {
      console.log('🔥 SUCCESS: Received', result.count, 'properties');
      console.log('🔥 SUCCESS: Properties array length:', result.properties?.length);
      console.log('🔥 SUCCESS: Full result object:', result);
      console.log('🔥 SUCCESS: result.properties exists?', !!result.properties);
      console.log('🔥 SUCCESS: result.properties type:', typeof result.properties);
      console.log('🔥 SUCCESS: result.properties is array?', Array.isArray(result.properties));
      
      // CRITICAL DEBUG: Log the actual properties being set
      const propertiesToSet = result.properties || [];
      console.log('🔥 SUCCESS: Setting aiSearchResults to:', propertiesToSet.length, 'properties');
      console.log('🔥 SUCCESS: Sample properties:', propertiesToSet.slice(0, 2).map((p: any) => ({ id: p?.id, title: p?.title })));
      
      // Set results immediately
      setAiSearchResults(propertiesToSet);
      setIsAiSearchActive(true);
      setHasSearched(true);
      setIsSearching(false);
      setSearchQuery(result.query);
      
      // Preserve userSelectedPropertyTypes when merging filters
      setFilters(prev => ({
        ...prev,
        ...result.filters,
        // Ensure userSelectedPropertyTypes is preserved from backend response
        userSelectedPropertyTypes: result.filters.userSelectedPropertyTypes ?? prev.userSelectedPropertyTypes
      }));
      
      // Auto-switch to "For Sale" tab when ROI is detected (ROI only applies to sale properties)
      const forcedSearchType = result.filters.listingType === 'sale' ? 'buy' : searchType;
      if (result.filters.listingType === 'sale' && searchType !== 'buy') {
        console.log('🏢 AUTO-SWITCH: ROI detected - switching to "For Sale" tab');
        setSearchType('buy');
      }
      
      setCurrentPage(1);
      
      console.log('🔥 SUCCESS: State updated - aiSearchResults should now have', propertiesToSet.length, 'properties');
      
      // Cache the search results in sessionStorage for instant restoration
      try {
        const CACHE_VERSION = '2.0'; // Increment this to invalidate old caches
        const cacheKey = `search_cache_${result.query}_${forcedSearchType}`;
        const cacheData = {
          version: CACHE_VERSION,
          properties: propertiesToSet,
          query: result.query,
          filters: result.filters,
          count: result.count,
          timestamp: Date.now()
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('💾 CACHE: Saved search results for', cacheKey);
      } catch (e) {
        console.error('Failed to cache search results:', e);
      }
      
      // Extract search location for map centering
      if (result.filters?.location && typeof result.filters.location === 'object' && 'area' in result.filters.location) {
        // For area-based searches, try to get coordinates
        const area = result.filters.location.area;
        // Known major locations in Malaysia for quick mapping
        const knownLocations: Record<string, { lat: number; lng: number }> = {
          'KLCC': { lat: 3.1578, lng: 101.7123 },
          'Mont Kiara': { lat: 3.1727, lng: 101.6500 },
          'Bukit Bintang': { lat: 3.1478, lng: 101.7103 },
          'Damansara': { lat: 3.1319, lng: 101.5742 },
          'Petaling Jaya': { lat: 3.1073, lng: 101.5951 },
          'Cheras': { lat: 3.1319, lng: 101.7185 },
          'Ampang': { lat: 3.1478, lng: 101.7605 },
          'Shah Alam': { lat: 3.0859, lng: 101.5353 },
          'Kuala Lumpur': { lat: 3.139, lng: 101.6869 },
          'KL': { lat: 3.139, lng: 101.6869 },
        };
        
        if (area && knownLocations[area]) {
          setSearchLocation({
            lat: knownLocations[area].lat,
            lng: knownLocations[area].lng,
            name: area
          });
        }
      } else {
        setSearchLocation(null);
      }
      
      // Update URL with search type (use forcedSearchType to reflect ROI auto-switch)
      const typeParam = forcedSearchType === 'buy' ? 'buy' : 'rent';
      window.history.pushState({}, '', `/search?q=${encodeURIComponent(result.query)}&type=${typeParam}`);
      
      // Scroll to top when search results are loaded (with longer delay to ensure page is rendered)
      setTimeout(() => {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 500);
      
      // Don't show toast notifications for search results to avoid UI clutter
      // The property count is already visible in the results header
    },
    onError: (error: any) => {
      console.error("🔥 POPULAR SEARCH ERROR:", error);
      
      // Set empty results for invalid queries instead of falling back to all properties
      setAiSearchResults([]);
      setIsAiSearchActive(true); // Keep AI search active to prevent showing all properties
      setHasSearched(true);
      
      const isTimeout = error.message?.includes('timeout');
      const errorMessage = isTimeout 
        ? "Search timed out. Please try again - our servers may be busy."
        : "Unable to complete search. Please try again.";
      
      toast({
        title: isTimeout ? "Search Timeout" : "Search Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always clear loading state regardless of success or error
      setIsSearching(false);
    },
  });

  // Enhanced search function with immediate feedback for popular searches
  const performProgressiveSearch = useCallback((query: string, searchTypeParam: 'rent' | 'buy' = searchType) => {
    console.log(`🔥 POPULAR CLICK: Triggered search for "${query}" (${searchTypeParam})`);
    
    // Immediate visual feedback
    setIsSearching(true);
    setNewSearchQuery(query);
    
    // Clear any previous results immediately to show loading state
    setAiSearchResults([]);
    setIsAiSearchActive(true);
    setHasSearched(true);
    
    // Trigger the fast search (removed toast - loading state is already visible in UI)
    aiSearchMutation.mutate({ query, searchType: searchTypeParam });
  }, [aiSearchMutation, toast]);

  // Create debounced search function for typing
  const debouncedSearch = useMemo(() => {
    return debounceWithControl((query: string) => {
      console.log(`🔄 DEBOUNCED: Using simple search for "${query}"`);
      setIsDebouncePending(false);
      aiSearchMutation.mutate({ query, searchType });
    }, 450); // 450ms debounce for typing
  }, [aiSearchMutation, searchType]);

  // Handle search input changes with debouncing
  const handleSearchInputChange = useCallback((query: string) => {
    setNewSearchQuery(query);
    
    if (query.trim().length >= 2) {
      console.log(`⏱️  DEBOUNCE: Starting debounced search timer for "${query}"`);
      setIsDebouncePending(true);
      debouncedSearch(query);
    } else {
      // Cancel debounced search for short queries
      debouncedSearch.cancel();
      setIsDebouncePending(false);
    }
  }, [debouncedSearch]);

  // Handle immediate search (button clicks, Enter key)
  const handleImmediateSearch = useCallback((query?: string) => {
    const searchQueryValue = query || newSearchQuery;
    
    if (!searchQueryValue.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    console.log(`⚡ IMMEDIATE: Using simple search for "${searchQueryValue}"`);
    
    // Cancel any pending debounced searches
    debouncedSearch.cancel();
    setIsDebouncePending(false);
    
    // Execute search immediately with simplified mutation
    aiSearchMutation.mutate({ query: searchQueryValue, searchType });
  }, [newSearchQuery, debouncedSearch, aiSearchMutation, searchType, toast]);

  // Create intelligent debounced sort change function
  const debouncedSortChange = useMemo(() => {
    return debounceWithControl(async (sortValue: string) => {
      console.log(`🔄 DEBOUNCED: Executing intelligent sort change to "${sortValue}"`);
      
      if (isAiSearchActive && searchQuery) {
        // Use intelligent sorting if we have data, otherwise trigger new search
        const currentData = aiSearchResults || [];
        
        if (currentData.length > 0 && intelligentSorter) {
          try {
            // Try intelligent sorting first
            const sortResult = await intelligentSorter.sort(sortValue, async (sortBy: string) => {
              // Fallback to server-side sorting by triggering new search
              performProgressiveSearch(searchQuery, searchType);
              return [];
            });
            
            if (sortResult.method === 'client') {
              // Update with client-side sorted results
              setAiSearchResults(sortResult.sortedData);
              console.log(`⚡ CLIENT SORT: Sorted ${sortResult.sortedData.length} items in ${sortResult.duration.toFixed(2)}ms`);
            }
          } catch (error) {
            console.error('Intelligent sorting failed, falling back to search:', error);
            performProgressiveSearch(searchQuery, searchType);
          }
        } else {
          // No data available, trigger new search
          performProgressiveSearch(searchQuery, searchType);
        }
      }
    }, 300); // 300ms debounce for sort changes
  }, [isAiSearchActive, searchQuery, performProgressiveSearch, searchType, aiSearchResults, intelligentSorter]);

  // Auto-scroll to top when page changes
  useEffect(() => {
    if (currentPage > 1) { // Only scroll for page changes, not initial load
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  // Get search query and filters from URL
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryParam = urlParams.get('q');
      const typeParam = urlParams.get('type'); // Check for search type in URL
      
      // Read filter params from URL
      const propertyTypeParam = urlParams.get('propertyType');
      const minPriceParam = urlParams.get('minPrice');
      const maxPriceParam = urlParams.get('maxPrice');
      const bedroomsParam = urlParams.get('bedrooms');
      const bathroomsParam = urlParams.get('bathrooms');
      const sortByParam = urlParams.get('sortBy');
      const categoryParam = urlParams.get('category');
      
      // Category-based property type mappings
      const CATEGORY_PROPERTY_TYPES: Record<string, string[]> = {
        residential: [
          'apartment', 'condominium', 'house', 'studio', 'townhouse', 'flat',
          'service-residence', 'cluster-house', 'semi-detached-house',
          '1-storey-terrace', '1.5-storey-terrace', '2-storey-terrace', '2.5-storey-terrace',
          '3-storey-terrace', '3.5-storey-terrace', '4-storey-terrace', '4.5-storey-terrace',
          'terraced-house', 'bungalow', 'zero-lot-bungalow', 'link-bungalow',
          'bungalow-land', 'twin-villa', 'residential-land-plot'
        ],
        commercial: [
          'commercial', 'office', 'shop', 'shop-office', 'retail-office', 'retail-space',
          'sofo', 'soho', 'sovo', 'commercial-bungalow', 'commercial-semi-d',
          'hotel-resort', 'commercial-land'
        ],
        industrial: [
          'industrial', 'warehouse', 'factory', 'industrial-land', 'cluster-factory',
          'semi-d-factory', 'detached-factory', 'terrace-factory', 'agricultural-land', 'land'
        ]
      };
      
      const CATEGORY_LABELS: Record<string, string> = {
        residential: 'Residential Properties',
        commercial: 'Commercial Properties',
        industrial: 'Industrial Properties'
      };
      
      let searchTypeFromUrl: 'rent' | 'buy' = 'rent'; // Default to rent
      
      if (typeParam === 'buy' || typeParam === 'sale') {
        searchTypeFromUrl = 'buy';
        setSearchType('buy');
        setFilters(prev => ({ ...prev, listingType: 'sale' }));
        console.log('🔄 URL indicates BUY mode - setting searchType to buy and listingType to sale');
      } else if (typeParam === 'rent') {
        searchTypeFromUrl = 'rent';
        setSearchType('rent');
        setFilters(prev => ({ ...prev, listingType: 'rent' }));
        console.log('🔄 URL indicates RENT mode - setting searchType to rent and listingType to rent');
      }
      
      // Apply filters from URL
      if (propertyTypeParam || minPriceParam || maxPriceParam || bedroomsParam || bathroomsParam || sortByParam) {
        setFilters(prev => ({
          ...prev,
          propertyType: propertyTypeParam ? propertyTypeParam.split(',') : prev.propertyType,
          minPrice: minPriceParam ? parseInt(minPriceParam) : prev.minPrice,
          maxPrice: maxPriceParam ? parseInt(maxPriceParam) : prev.maxPrice,
          bedrooms: bedroomsParam ? parseInt(bedroomsParam) : prev.bedrooms,
          bathrooms: bathroomsParam ? parseInt(bathroomsParam) : prev.bathrooms,
          sortBy: sortByParam || prev.sortBy,
        }));
        
        console.log('🔗 Applied filters from URL:', {
          propertyType: propertyTypeParam,
          minPrice: minPriceParam,
          maxPrice: maxPriceParam,
          bedrooms: bedroomsParam,
          bathrooms: bathroomsParam,
          sortBy: sortByParam,
        });
      }
      
      // Handle category-based search (from landing page category cards)
      if (categoryParam && CATEGORY_PROPERTY_TYPES[categoryParam]) {
        const categoryTypes = CATEGORY_PROPERTY_TYPES[categoryParam];
        const categoryLabel = CATEGORY_LABELS[categoryParam] || categoryParam;
        
        console.log(`📂 Category search: ${categoryParam} with types:`, categoryTypes);
        
        setSearchQuery(categoryLabel);
        setNewSearchQuery(categoryLabel);
        setFilters(prev => ({ 
          ...prev, 
          propertyType: categoryTypes,
          listingType: searchTypeFromUrl === 'buy' ? 'sale' : 'rent'
        }));
        setHasSearched(true);
        setIsSearching(true);
        
        // Fetch from direct API endpoint for category-based search
        const fetchCategoryProperties = async () => {
          try {
            const listingTypeParam = searchTypeFromUrl === 'buy' ? 'sale' : 'rent';
            const apiUrl = `/api/properties?propertyType=${categoryTypes.join(',')}&listingType=${listingTypeParam}&status=online`;
            console.log('🔍 Category API request:', apiUrl);
            
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Failed to fetch properties');
            
            const data = await response.json();
            console.log(`✅ Category search returned ${data.length} properties`);
            
            setAiSearchResults(data);
            setIsAiSearchActive(true);
            setIsSearching(false);
            setCurrentPage(1);
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (error) {
            console.error('Category search error:', error);
            setIsSearching(false);
          }
        };
        
        fetchCategoryProperties();
        return; // Don't continue to query-based search
      }
      
      if (queryParam) {
        setSearchQuery(queryParam);
        setNewSearchQuery(queryParam);
        
        // Check for cached results first
        const cacheKey = `search_cache_${queryParam}_${searchTypeFromUrl}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        
        if (cachedData) {
          try {
            const cached = JSON.parse(cachedData);
            const CACHE_VERSION = '2.0'; // Must match the version in cache creation
            const cacheAge = Date.now() - cached.timestamp;
            const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes
            
            // Check cache version to invalidate old caches with wrong sorting
            if (cached.version !== CACHE_VERSION) {
              console.log('💾 CACHE INVALID: Old cache version detected, clearing and running fresh search');
              sessionStorage.removeItem(cacheKey);
            } else if (cacheAge < CACHE_MAX_AGE) {
              console.log('⚡ CACHE HIT: Restoring cached search results instantly for:', queryParam);
              
              // Restore cached results immediately
              setAiSearchResults(cached.properties || []);
              setIsAiSearchActive(true);
              setHasSearched(true);
              setSearchQuery(cached.query);
              setFilters(cached.filters);
              setCurrentPage(1);
              
              // Scroll to top
              setTimeout(() => {
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 100);
              
              return; // Don't run the search
            } else {
              console.log('💾 CACHE EXPIRED: Cache is older than 30 minutes, running fresh search');
            }
          } catch (e) {
            console.error('Failed to parse cached results:', e);
          }
        }
        
        console.log(`🚀 Using simple search with query: "${queryParam}" and searchType: "${searchTypeFromUrl}"`);
        
        // No cache or expired - run the search
        setTimeout(() => {
          aiSearchMutation.mutate({ query: queryParam, searchType: searchTypeFromUrl });
          // Force scroll to top after search is triggered from URL
          setTimeout(() => {
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 500);
        }, 100);
      }
    } catch (error) {
      console.error('Error parsing URL parameters:', error);
      // Clear malformed URL and redirect to clean search page
      window.history.replaceState({}, '', '/search');
    }
  }, []);
  
  // Update URL when filters change (for shareable links)
  const initialMountRef = useRef(true);
  
  useEffect(() => {
    // Skip URL update on initial mount only (we already read from URL on mount)
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }

    const params = new URLSearchParams();
    
    // Add search query and type
    if (searchQuery) {
      params.set('q', searchQuery);
    }
    params.set('type', searchType);
    
    // Add essential filters to URL
    if (filters.propertyType?.length) {
      params.set('propertyType', filters.propertyType.join(','));
    }
    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      params.set('minPrice', filters.minPrice.toString());
    }
    if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
      params.set('maxPrice', filters.maxPrice.toString());
    }
    if (filters.bedrooms !== undefined && filters.bedrooms > 0) {
      params.set('bedrooms', filters.bedrooms.toString());
    }
    if (filters.bathrooms !== undefined && filters.bathrooms > 0) {
      params.set('bathrooms', filters.bathrooms.toString());
    }
    if (filters.sortBy) {
      params.set('sortBy', filters.sortBy);
    }
    
    // Update URL without reloading page
    const newUrl = `/search?${params.toString()}`;
    if (window.location.pathname + window.location.search !== newUrl) {
      window.history.replaceState({}, '', newUrl);
      console.log('🔗 Updated URL with filters:', newUrl);
    }
  }, [searchQuery, searchType, filters.propertyType, filters.minPrice, filters.maxPrice, filters.bedrooms, filters.bathrooms, filters.sortBy]);

  // Cleanup on component unmount - FIXED: Don't abort ongoing searches
  useEffect(() => {
    return () => {
      // CRITICAL FIX: Don't abort ongoing searches on unmount as this breaks the search flow
      // Only clean up the ref without aborting
      if (currentSearchRef.current) {
        console.log('🧹 PROGRESSIVE: Cleaning up search ref (not aborting active search)');
        currentSearchRef.current = null;
      }
      
      // FIX: Cancel pending debounced operations to prevent setState warnings
      console.log('🧹 DEBOUNCE: Cleaning up debounced functions on unmount');
      debouncedSearch.cancel();
      debouncedSortChange.cancel();
    };
  }, [debouncedSearch, debouncedSortChange]);

  const { data: regularProperties = [], isLoading } = useQuery<(Property & { agent: Agent })[]>({
    queryKey: ["/api/properties", filters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
      
      if (filters.propertyType && filters.propertyType.length > 0) {
        params.append("propertyType", filters.propertyType.join(","));
      }
      if (filters.listingType) {
        params.append("listingType", filters.listingType);
      }
      if (filters.minPrice !== undefined) {
        params.append("minPrice", filters.minPrice.toString());
      }
      if (filters.maxPrice !== undefined) {
        params.append("maxPrice", filters.maxPrice.toString());
      }
      if (filters.minSquareFeet !== undefined) {
        params.append("minSquareFeet", filters.minSquareFeet.toString());
      }
      if (filters.maxSquareFeet !== undefined) {
        params.append("maxSquareFeet", filters.maxSquareFeet.toString());
      }
      if (filters.bedrooms !== undefined) {
        params.append("bedrooms", filters.bedrooms.toString());
      }
      if (filters.bathrooms !== undefined) {
        params.append("bathrooms", filters.bathrooms.toString());
      }
      if (filters.location) {
        const locationStr = typeof filters.location === 'string' 
          ? filters.location 
          : filters.location.area;
        params.append("location", locationStr);
      }
      if (filters.city) {
        params.append("city", filters.city);
      }
      if (filters.parking !== undefined) {
        params.append("parking", filters.parking.toString());
      }
      if (filters.sortBy) {
        params.append("sortBy", filters.sortBy);
      }

        const response = await fetch(`/api/properties?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch properties");
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching properties:', error);
        toast({
          title: "Error Loading Properties",
          description: "Failed to load properties. Please refresh the page.",
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: !isAiSearchActive && !searchQuery && !hasSearched && !newSearchQuery, // Don't load default properties when there's a search query or search has been performed
  });

  // Function to apply QuickFilters to any property list
  const applyQuickFilters = (properties: (Property & { agent: Agent })[]) => {
    let filtered = [...properties];
    
    console.log('🔍 ApplyQuickFilters Debug:', {
      originalCount: properties.length,
      isAiSearchActive,
      listingTypeFilter: filters.listingType,
      bedroomsFilter: filters.bedrooms,
      maxPriceFilter: filters.maxPrice,
      propertyTypeFilter: filters.propertyType,
      tenureFilter: filters.tenure,
      locationFilter: typeof filters.location === 'string' 
        ? filters.location 
        : (filters.location && typeof filters.location === 'object') 
          ? (filters.location.area || JSON.stringify(filters.location)) 
          : null
    });

    // CRITICAL DEBUG: Log sample properties before filtering
    console.log('🔍 Sample properties before filtering:', filtered.slice(0, 3).map(p => ({
      id: p.id,
      title: p.title,
      listingType: p.listingType,
      propertyType: p.propertyType,
      price: p.price,
      tenure: p.tenure
    })));

    // For AI search results, we still need to apply QuickFilters when user explicitly applies them
    // This allows users to refine AI search results with additional filters
    if (isAiSearchActive) {
      console.log('AI search active - applying QuickFilters on top of AI results for refinement');
      // Continue with filtering logic below to allow refinement
    }

    // Apply listing type filter - SKIP for AI transport searches to preserve AI results
    // Transport searches should return properties matching the searched listing type, not filter them out
    const isTransportSearch = searchQuery?.toLowerCase().includes('mrt') || 
                             searchQuery?.toLowerCase().includes('lrt') || 
                             searchQuery?.toLowerCase().includes('ktm') || 
                             searchQuery?.toLowerCase().includes('monorail') ||
                             searchQuery?.toLowerCase().includes('transport') ||
                             searchQuery?.toLowerCase().includes('near');
    
    if (filters.listingType && !isAiSearchActive) {
      // Only apply listing type filter for regular property browsing, not AI searches
      filtered = filtered.filter(property => property.listingType === filters.listingType);
      console.log('After listing type filter (regular search):', filtered.length);
    } else if (isAiSearchActive && isTransportSearch) {
      console.log('SKIPPING listing type filter for AI transport search - preserving AI matched results');
    } else if (isAiSearchActive && filters.listingType) {
      // For non-transport AI searches, still apply the filter as refinement
      const beforeCount = filtered.length;
      filtered = filtered.filter(property => property.listingType === filters.listingType);
      console.log(`After listing type filter (AI search refinement): ${filtered.length} from ${beforeCount}`);
    }

    // Apply property type filter - SKIP if this is a conflict resolution search result
    // The conflict resolution search already includes the property type in the query
    const isConflictResolutionActive = pendingConflictResolutionFilters !== null;
    if (filters.propertyType && filters.propertyType.length > 0 && !isConflictResolutionActive) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(property => 
        filters.propertyType!.includes(property.propertyType)
      );
      console.log(`After property type filter (${filters.propertyType.join(', ')}):`, filtered.length, 'from', beforeCount);
      if (filtered.length === 0 && beforeCount > 0) {
        console.log('⚠️ WARNING: Property type filter resulted in 0 properties! This might indicate a conflicting filter scenario.');
      }
    } else if (isConflictResolutionActive) {
      console.log('🔄 SKIPPING property type filter for conflict resolution search - property type already in AI query');
    }

    // Apply price range filter for regular browsing only
    if (filters.minPrice !== undefined) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(property => Number(property.price) >= filters.minPrice!);
      console.log(`After min price filter (>=${filters.minPrice}):`, filtered.length, 'from', beforeCount);
    }
    if (filters.maxPrice !== undefined) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(property => Number(property.price) <= filters.maxPrice!);
      console.log(`After max price filter (<=${filters.maxPrice}):`, filtered.length, 'from', beforeCount);
    }

    // Apply bedrooms filter
    if (filters.bedrooms !== undefined) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(property => property.bedrooms >= filters.bedrooms!);
      console.log(`After bedrooms filter (>=${filters.bedrooms}):`, filtered.length, 'from', beforeCount);
    }

    // Apply bathrooms filter
    if (filters.bathrooms !== undefined) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(property => property.bathrooms >= filters.bathrooms!);
      console.log(`After bathrooms filter (>=${filters.bathrooms}):`, filtered.length, 'from', beforeCount);
    }

    // Apply tenure filter (freehold/leasehold)
    if (filters.tenure && filters.tenure.length > 0) {
      const beforeCount = filtered.length;
      console.log(`Applying tenure filter: ${filters.tenure.join(', ')}`);
      console.log('Sample property tenures before filter:', filtered.slice(0, 3).map(p => p.tenure));
      filtered = filtered.filter(property => 
        property.tenure && filters.tenure!.includes(property.tenure)
      );
      console.log(`After tenure filter (${filters.tenure.join(', ')}):`, filtered.length, 'from', beforeCount);
      if (filtered.length === 0) {
        console.log('WARNING: Tenure filter resulted in 0 properties!');
      }
    }

    // Apply title type filter
    if (filters.titleType && filters.titleType.length > 0) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(property => 
        property.titleType && filters.titleType!.includes(property.titleType)
      );
      console.log(`After title type filter (${filters.titleType.join(', ')}):`, filtered.length, 'from', beforeCount);
    }

    // Apply land title type filter  
    if (filters.landTitleType && filters.landTitleType.length > 0) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(property => 
        property.landTitleType && filters.landTitleType!.includes(property.landTitleType)
      );
      console.log(`After land title type filter (${filters.landTitleType.join(', ')}):`, filtered.length, 'from', beforeCount);
    }

    // Apply location filter - DISABLE for AI transport searches to avoid removing AI results
    if (filters.location && typeof filters.location === 'string') {
      // Only apply location filtering for manual location searches (string format)
      // Skip for AI transport searches which have object format with transportation info
      const locationStr = filters.location;
      
      // Don't apply location filtering if we're refining AI search results
      // The AI has already filtered by location/transport proximity
      if (locationStr && !isAiSearchActive) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(property => 
          property.city.toLowerCase().includes(locationStr.toLowerCase()) ||
          property.address.toLowerCase().includes(locationStr.toLowerCase())
        );
        console.log(`After location filter (${locationStr}):`, filtered.length, 'from', beforeCount);
      } else if (isAiSearchActive) {
        console.log('Skipping location filter for AI search refinement - preserving AI location context');
      }
    } else if (filters.location && typeof filters.location === 'object') {
      // For transport proximity searches, don't apply additional location filtering
      // The AI has already filtered by proximity to transport stations
      console.log('Skipping location filter for transport proximity search');
    }

    // Note: Parking filter not implemented as parking is not a field in the Property schema
    
    console.log('Final filtered count:', filtered.length);
    return filtered;
  };

  // Always apply QuickFilters to whatever results we have
  // If AI search is active or we have a search query, use AI results
  // Only use regular properties if no search has been performed
  console.log('🔍 Property selection debug:', {
    isAiSearchActive,
    aiSearchResultsExists: aiSearchResults !== null,
    aiSearchResultsCount: aiSearchResults?.length || 0,
    searchQuery,
    hasSearched,
    filters: filters
  });
  
  const rawProperties = (isAiSearchActive && aiSearchResults !== null) 
    ? aiSearchResults || []
    : (hasSearched ? [] : regularProperties);
    
  console.log('🔍 Raw properties before filtering:', rawProperties.length);
  console.log('🔍 Sample raw properties:', rawProperties.slice(0, 2).map(p => ({
    id: p.id,
    title: p.title,
    propertyType: p.propertyType
  })));
  
  const allProperties = applyQuickFilters(rawProperties);
    
  // Debug logging to understand what's being displayed
  if (process.env.NODE_ENV === 'development' && searchQuery) {
    console.log('Search Debug:', {
      searchQuery,
      isAiSearchActive,
      aiSearchResultsCount: aiSearchResults?.length || 0,
      regularPropertiesCount: regularProperties.length,
      allPropertiesCount: allProperties.length,
      propertyTypes: allProperties.slice(0, 10).map(p => p.propertyType)
    });
  }
  
  // Smart pagination and virtual scrolling setup
  const totalProperties = allProperties.length;
  const totalPages = Math.ceil(totalProperties / ITEMS_PER_PAGE);
  
  // Virtual scrolling setup
  const virtualScrollProps = useVirtualScroll(
    allProperties,
    {
      itemHeight: VIRTUAL_ITEM_HEIGHT,
      containerHeight: CONTAINER_HEIGHT,
      overscan: 3,
      threshold: 5
    },
    // Load more function for infinite scrolling
    () => {
      if (isProgressiveLoading) return;
      console.log('🔄 VIRTUAL SCROLL: Loading more items...');
      // Could trigger more data loading here if needed
    }
  );
  
  // Enhanced pagination setup
  const paginationProps = usePagination({
    itemsPerPage: ITEMS_PER_PAGE,
    totalItems: totalProperties,
    onPageChange: (page: number) => {
      setCurrentPage(page);
      // Scroll to top smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    preloadPages: 1
  });
  
  // CRITICAL FIX: Simplified rendering logic with comprehensive debugging
  let properties: (Property & { agent: Agent })[];
  let renderingMode: 'virtual' | 'pagination' | 'simple';
  
  // Enhanced debugging for rendering decisions
  console.log(`🎯 RENDER DECISION: totalProperties=${totalProperties}, useVirtualScrolling=${useVirtualScrolling}, renderingStrategy=${renderingStrategy}`);
  console.log(`🎯 RENDER DECISION: isProgressiveLoading=${isProgressiveLoading}, isAiSearchActive=${isAiSearchActive}`);
  console.log(`🎯 RENDER DECISION: aiSearchResults.length=${aiSearchResults?.length || 0}, allProperties.length=${allProperties.length}`);
  
  // CRITICAL FIX: For progressive loading, always show results immediately regardless of strategy
  if (isProgressiveLoading && allProperties.length > 0) {
    // During progressive loading, show all loaded results to provide immediate feedback
    properties = allProperties;
    renderingMode = 'simple';
    console.log(`🔄 PROGRESSIVE RENDER: Showing all ${properties.length} loaded items during progressive loading`);
  } else if (useVirtualScrolling && totalProperties > 100) {
    properties = virtualScrollProps.virtualState.visibleItems;
    renderingMode = 'virtual';
    console.log(`🎯 RENDER: Virtual scrolling - showing ${properties.length} of ${totalProperties} items`);
  } else if (totalProperties > 50) {
    // Use pagination for medium datasets
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    properties = allProperties.slice(startIndex, endIndex);
    renderingMode = 'pagination';
    console.log(`📄 RENDER: Pagination - showing ${properties.length} items (page ${currentPage}/${totalPages})`);
  } else {
    // Show all items for small datasets
    properties = allProperties;
    renderingMode = 'simple';
    console.log(`📝 RENDER: Simple - showing all ${properties.length} items`);
  }
  
  // CRITICAL DEBUG: Log final rendering state
  console.log(`🎯 FINAL RENDER: mode=${renderingMode}, properties.length=${properties.length}, will render=${properties.length > 0}`);
  
  // Debug rendering strategy - remove in production
  if (process.env.NODE_ENV === 'development') {
    console.log('Rendering Debug:', {
      totalProperties,
      renderingMode,
      renderingStrategy,
      useVirtualScrolling,
      currentPage: renderingMode === 'pagination' ? currentPage : 'N/A',
      totalPages: renderingMode === 'pagination' ? totalPages : 'N/A',
      propertiesShown: properties.length,
      virtualVisible: renderingMode === 'virtual' ? virtualScrollProps.virtualState.visibleItems.length : 'N/A'
    });
  }

  const performAISearch = (query: string) => {
    setCurrentPage(1); // Reset to page 1 for new searches
    performProgressiveSearch(query, searchType);
  };

  const handleSortChange = (sortValue: string) => {
    const newFilters = { ...filters, sortBy: sortValue };
    setFilters(newFilters);
    setCurrentPage(1); // Reset to page 1 when sort changes
    
    console.log(`🔄 SORT: Sort changed to "${sortValue}", debouncing search...`);
    
    // FIX: If it's any AI search and we're changing sort order, debounce the re-search
    if (isAiSearchActive && searchQuery) {
      debouncedSortChange(sortValue);
    }
  };

  const handleFiltersChange = (newFilters: PropertyFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to page 1 when filters change
    // Scroll to top when filters change
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Don't reset AI search - maintain the context and apply filters to AI results
    // This ensures location context is preserved when changing Quick Filters
    setHasSearched(true); // Mark that user has performed a search
  };

  const handleApplyFilters = (newFilters: PropertyFilters) => {
    console.log('🔧 handleApplyFilters called with:', newFilters);
    console.log('🔧 Current search state:', { searchQuery, isAiSearchActive, filters });
    
    // Add a test alert to verify this function is being called
    if (process.env.NODE_ENV === 'development') {
      console.log('🚨 DEBUG: Apply filters function triggered!');
    }
    
    // Check if this is a property type change that conflicts with AI auto-filtering
    const isConflictingPropertyTypeChange = isAiSearchActive && 
      newFilters.propertyType && newFilters.propertyType.length > 0 &&
      searchQuery && (searchQuery.toLowerCase().includes('near ') || searchQuery.toLowerCase().includes('close to '));
    
    // Force conflict resolution for industrial filter as test
    const forceIndustrialConflictResolution = newFilters.propertyType?.includes('industrial') && 
      isAiSearchActive && searchQuery;
    
    console.log('🔧 Conflict detection debug:', {
      isAiSearchActive,
      hasPropertyTypeFilter: !!(newFilters.propertyType && newFilters.propertyType.length > 0),
      propertyTypeValues: newFilters.propertyType,
      searchQueryValue: searchQuery,
      hasNearOrCloseTo: searchQuery ? (searchQuery.toLowerCase().includes('near ') || searchQuery.toLowerCase().includes('close to ')) : false,
      isConflictingPropertyTypeChange
    });
    
    // Add simple alert for debugging - remove after fix
    if (process.env.NODE_ENV === 'development' && newFilters.propertyType?.includes('industrial')) {
      console.error('🚨 INDUSTRIAL FILTER DETECTED - DEBUG TRACE');
      console.error('Search Query:', searchQuery);
      console.error('Is AI Active:', isAiSearchActive);
      console.error('Should trigger conflict:', isConflictingPropertyTypeChange);
    }
    
    if (isConflictingPropertyTypeChange || forceIndustrialConflictResolution) {
      console.log('🔄 Detected conflicting property type change - performing new AI search');
      
      // Extract the transport/location part from the original search
      const transportMatch = searchQuery.match(/(near|close to)\s+(MRT|LRT|KTM|monorail|BRT)/i);
      console.log('🔍 Transport match result:', transportMatch);
      console.log('🔍 Search query for matching:', `"${searchQuery}"`);
      
      // Fallback: if no transport match but it's a "near" query, use the full query
      const isNearQuery = searchQuery.toLowerCase().includes('near');
      console.log('🔍 Is near query:', isNearQuery);
      if (transportMatch || isNearQuery) {
        const baseQuery = transportMatch ? transportMatch[0] : searchQuery; // e.g., "near KTM" or full query
        const propertyTypeNames = (newFilters.propertyType || []).map(type => {
          if (type === 'condo') return 'condo';
          if (type === 'apartment') return 'apartment';  
          if (type === 'landed') return 'house';
          if (type === 'commercial') return 'office';
          if (type === 'industrial') return 'industrial';
          if (type === 'warehouse') return 'warehouse';
          if (type === 'factory') return 'factory';
          return type;
        });
        
        // Create new search query that combines location with specific property type
        const newQuery = propertyTypeNames.length === 1 
          ? `${propertyTypeNames[0]} ${baseQuery}` // e.g., "industrial near KTM"
          : `${baseQuery}`; // Keep original if multiple types selected
        
        console.log('🔍 Performing new AI search with query:', newQuery);
        console.log('🔍 Base query:', baseQuery);
        console.log('🔍 Property types:', propertyTypeNames);
        
        // Store the filters we want to preserve after the AI search
        setPendingConflictResolutionFilters(newFilters);
        
        // Perform new AI search with the modified query
        setCurrentPage(1);
        performProgressiveSearch(newQuery, searchType);
        return;
      } else {
        console.error('🚨 No transport match found and not a near query - this should not happen!');
        console.error('🚨 Search query:', searchQuery);
        console.error('🚨 Transport match:', transportMatch);
        console.error('🚨 Is near query:', isNearQuery);
      }
    }
    
    // Standard filter application for non-conflicting changes
    setFilters(newFilters);
    setCurrentPage(1); // Reset to page 1 when filters change
    setHasSearched(true); // Mark that user has performed a search
    setFiltersCollapsed(true); // Collapse filters after applying
    
    // Count active filters for feedback
    const activeFiltersCount = Object.entries(newFilters).filter(([key, value]) => {
      if (key === "sortBy" || key === "listingType") return false
      if (value === undefined || value === "") return false
      if (Array.isArray(value) && value.length === 0) return false
      return true
    }).length;
    
    // Show feedback toast
    toast({
      title: "Filters Applied",
      description: activeFiltersCount > 0 
        ? `Applied ${activeFiltersCount} filter${activeFiltersCount === 1 ? '' : 's'}`
        : "All filters cleared",
    });
    
    // Force immediate refresh of results
    if (isAiSearchActive) {
      // For AI search results, the filters are applied in applyQuickFilters function
      // Just trigger a re-render by updating the aiSearchResults reference
      console.log('Applying new filters to AI search results:', newFilters);
      setAiSearchResults(prev => prev ? [...prev] : []); // Force re-render with new filter state
    } else {
      // For regular search, invalidate the cache to force immediate refresh
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      console.log('Invalidated property cache for immediate refresh');
    }
  };

  // Convert location object to string for QuickFilters compatibility
  const getFiltersForQuickFilters = () => {
    const quickFilters = { ...filters };
    if (filters.location && typeof filters.location === 'object') {
      quickFilters.location = filters.location.area || '';
    }
    return quickFilters as any; // Type assertion to handle the interface mismatch
  };



  const handleNewSearch = () => {
    handleImmediateSearch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNewSearch();
    }
  };

  const goBackToLanding = () => {
    setLocation('/');
  };

  // Error boundary for handling syntax errors
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error && event.error.message && event.error.message.includes('string did not match')) {
        setHasError(true);
        setErrorMessage('Data format error detected. Please refresh the page.');
        console.error('SyntaxError caught:', event.error);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && event.reason.message.includes('string did not match')) {
        setHasError(true);
        setErrorMessage('Data format error detected. Please refresh the page.');
        console.error('Promise rejection caught:', event.reason);
        event.preventDefault(); // Prevent the error from showing in console
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Page Error</h2>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <Button 
            onClick={() => {
              setHasError(false);
              setErrorMessage('');
              window.location.reload();
            }}
            className="mr-4"
          >
            Refresh Page
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              setHasError(false);
              setErrorMessage('');
              window.location.href = '/';
            }}
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col scroll-container">
      <Header />
      
      {/* Search Bar */}
      <section className="bg-white py-4 md:py-6 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 md:space-x-4">
            <Button
              variant="ghost"
              onClick={goBackToLanding}
              className="flex-shrink-0 p-2 md:px-4 md:py-2"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Back to Home</span>
            </Button>
            
            <div className="flex-1 min-w-0 relative">
              <SearchWithSuggestions
                value={newSearchQuery}
                onChange={handleSearchInputChange}
                onSearch={handleNewSearch}
                placeholder="Search properties..."
                disabled={isSearching || isProgressiveLoading}
                className="w-full text-sm md:text-base"
                searchType={searchType}
              />
              
              {/* Debounce loading indicator */}
              {isDebouncePending && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          </div>
          
          {/* Transport Search Sort Options - Only show for transport searches */}
          {isTransportSearch && hasSearched && (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {searchQuery && `Results for "${searchQuery}"`}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <Select value={filters.sortBy || "distance"} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-32 text-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance">Closest First</SelectItem>
                    <SelectItem value="recency">Newest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Quick Filters - Normal flow positioning, no overlap */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <QuickFilters 
            filters={getFiltersForQuickFilters()}
            onFiltersChange={handleFiltersChange}
            onApplyFilters={handleApplyFilters}
            isCollapsed={filtersCollapsed}
            onToggleCollapse={() => setFiltersCollapsed(!filtersCollapsed)}
            hasSearched={hasSearched}
          />
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Buy/Rent Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => {
                console.log('🔄 TAB SWITCH: Switching to For Sale');
                setSearchType('buy');
                setFilters(prev => ({ ...prev, listingType: 'sale' }));
                // If there's an active AI search, re-run it with the new listing type
                if (searchQuery || isAiSearchActive) {
                  const queryToUse = searchQuery || newSearchQuery;
                  console.log(`🔄 RE-SEARCHING: "${queryToUse}" for SALE properties`);
                  // Pass 'buy' directly to ensure correct searchType is used
                  performProgressiveSearch(queryToUse, 'buy');
                }
              }}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                searchType === 'buy'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
              data-testid="tab-for-sale"
            >
              For Sale
            </button>
            <button
              onClick={() => {
                console.log('🔄 TAB SWITCH: Switching to For Rent');
                setSearchType('rent');
                setFilters(prev => ({ ...prev, listingType: 'rent' }));
                // If there's an active AI search, re-run it with the new listing type
                if (searchQuery || isAiSearchActive) {
                  const queryToUse = searchQuery || newSearchQuery;
                  console.log(`🔄 RE-SEARCHING: "${queryToUse}" for RENTAL properties`);
                  // Pass 'rent' directly to ensure correct searchType is used
                  performProgressiveSearch(queryToUse, 'rent');
                }
              }}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                searchType === 'rent'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
              data-testid="tab-for-rent"
            >
              For Rent
            </button>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6 space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">
              {isLoading ? "Searching..." : `${totalProperties} Properties Found`} {totalPages > 1 && !isLoading && `(Page ${currentPage} of ${totalPages})`}
            </h2>
            {searchQuery && (
              <span className="text-xs md:text-sm text-gray-500">
                for "{searchQuery}"
              </span>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3">
            {/* Enhanced Sort Dropdown with Performance Indicators */}
            {!isTransportSearch && (
              <div className="flex items-center space-x-2">
                <Select value={filters.sortBy || "newest"} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-36 md:w-52 text-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center justify-between w-full">
                          <span>{option.label}</span>
                          {option.clientSide && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Fast
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Performance Monitor Toggle */}
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSortPerformanceVisible(!sortPerformanceVisible)}
                    className="p-2"
                    title="Toggle performance metrics"
                  >
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* View Toggle */}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "list" | "map")}>
              <TabsList className="grid grid-cols-2 w-24 md:w-32">
                <TabsTrigger value="list" className="flex items-center justify-center p-1.5 md:p-2">
                  <List className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline ml-1">List</span>
                </TabsTrigger>
                <TabsTrigger value="map" className="flex items-center justify-center p-1.5 md:p-2">
                  <Map className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline ml-1">Map</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content Area */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "list" | "map")}>
          {/* List View */}
          <TabsContent value="list" className="mt-0">
            {isSearching ? (
              <PlayfulLoadingAnimation 
                searchQuery={newSearchQuery || searchQuery}
                searchType={searchType}
              />
            ) : isProgressiveLoading && progressiveLoadingStats && properties.length > 0 ? (
              <div className="space-y-4">
                {/* CRITICAL FIX: Always show results during progressive loading */}
                <div className="space-y-6">
                  {properties.map((property) => (
                    <PropertyCard 
                      key={property.id} 
                      property={property} 
                      data-testid={`property-card-${property.id}`}
                    />
                  ))}
                </div>
                
                {/* Progressive Loading Indicator - moved to bottom */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Loading more results...
                      </span>
                    </div>
                    <span className="text-xs text-blue-600 dark:text-blue-300">
                      Batch {progressiveLoadingStats.currentBatch}
                    </span>
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    {progressiveLoadingStats.totalLoaded} results loaded
                    {progressiveLoadingStats.totalCount && ` of ${progressiveLoadingStats.totalCount}`}
                    {' • '}{Math.round(progressiveLoadingStats.loadingTime / 1000 * 10) / 10}s
                  </div>
                  {progressiveLoadingStats.totalCount && (
                    <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${Math.min(100, (progressiveLoadingStats.totalLoaded / progressiveLoadingStats.totalCount) * 100)}%` 
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : isProgressiveLoading && properties.length === 0 ? (
              // CRITICAL FIX: Handle case where progressive loading is active but no results yet
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-center space-x-2 py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-lg font-medium text-blue-800 dark:text-blue-200">
                      Loading search results...
                    </span>
                  </div>
                </div>
              </div>
            ) : isLoading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex">
                      <div className="w-2/5 h-80 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1 ml-6">
                        <div className="bg-gray-200 h-8 rounded mb-4 w-1/2"></div>
                        <div className="bg-gray-200 h-6 rounded mb-2 w-3/4"></div>
                        <div className="bg-gray-200 h-4 rounded mb-4 w-1/2"></div>
                        <div className="bg-gray-200 h-4 rounded mb-2"></div>
                        <div className="bg-gray-200 h-4 rounded w-2/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : properties.length > 0 ? (
              <div className="property-list-container">
                {renderingMode === 'virtual' ? (
                  // Virtual Scrolling Rendering
                  <div {...virtualScrollProps.scrollElementProps}>
                    <div {...virtualScrollProps.containerProps}>
                      {properties.map((property, index) => (
                        <div key={property.id} {...virtualScrollProps.itemProps(index)}>
                          <PropertyCard 
                            property={property} 
                            data-testid={`property-card-${property.id}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Standard Grid/List Rendering
                  <div className="space-y-6">
                    {properties.map((property) => (
                      <PropertyCard 
                        key={property.id} 
                        property={property}
                        data-testid={`property-card-${property.id}`}
                      />
                    ))}
                  </div>
                )}
                
                {/* Performance Metrics Panel (Development Only) */}
                {sortPerformanceVisible && process.env.NODE_ENV === 'development' && (
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <h3 className="text-sm font-medium mb-3 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Performance Metrics
                    </h3>
                    {(() => {
                      const analytics = intelligentSorter.getPerformanceAnalytics();
                      const dataMetrics = getPropertyEfficiencyMetrics();
                      return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <div className="font-medium text-gray-600">Avg Client Sort</div>
                            <div className="text-green-600">{analytics.averageClientSideTime.toFixed(1)}ms</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Avg Server Sort</div>
                            <div className="text-blue-600">{analytics.averageServerSideTime.toFixed(1)}ms</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Rendering Mode</div>
                            <div className="text-purple-600 capitalize">{renderingMode}</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Cache Hit Rate</div>
                            <div className="text-orange-600">{(dataMetrics.cacheHitRate * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Data States</div>
                            <div className="text-gray-600">{dataMetrics.totalDataStates}</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Memory Usage</div>
                            <div className="text-red-600">{(dataMetrics.memoryUsageEstimate / 1024).toFixed(1)}KB</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Total Sorts</div>
                            <div className="text-indigo-600">{analytics.totalSorts}</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Items Shown</div>
                            <div className="text-teal-600">{properties.length}/{totalProperties}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-6">
                  <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No properties found</h3>
                  <p className="mb-6">Try adjusting your search criteria or expanding your search area.</p>
                </div>
                

                {/* Smart Recommendations */}
                <SmartRecommendations 
                  originalQuery={searchQuery}
                  searchType={searchType}
                  onRecommendationClick={(recommendedQuery) => {
                    setNewSearchQuery(recommendedQuery);
                    setSearchQuery(recommendedQuery);
                    // Scroll to top when loading new results
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    // Update URL with the new search
                    window.history.pushState(
                      {}, 
                      "", 
                      `/search?q=${encodeURIComponent(recommendedQuery)}&type=${searchType}`
                    );
                    // Trigger the search
                    performProgressiveSearch(recommendedQuery, searchType);
                  }}
                />
              </div>
            )}
            
            {/* Pagination Info */}
            {(totalProperties > 0 || hasSearched) && (
              <div className="mt-8 pt-6 border-t">
                <div className="text-center mb-4 text-sm text-gray-600">
                  {process.env.NODE_ENV === 'development' && `Debug: ${totalProperties} total, ${totalPages} pages, showing ${properties.length} items`}
                  {totalProperties > ITEMS_PER_PAGE && renderingMode === 'pagination' && (
                    <span>Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalProperties)} of {totalProperties} properties</span>
                  )}
                </div>
              </div>
            )}
            
            {/* Smart Pagination - Only show for pagination mode */}
            {renderingMode === 'pagination' && totalPages > 1 && (
              <div className="mt-4">
                <div className="text-center mb-4">
                  <span className="text-sm text-gray-600">
                    Showing {paginationProps.pageItems[0] + 1}-{Math.min(paginationProps.pageItems[paginationProps.pageItems.length - 1] + 1, totalProperties)} of {totalProperties} properties
                  </span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={paginationProps.previousPage}
                    disabled={!paginationProps.hasPreviousPage || paginationProps.isLoading}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, paginationProps.totalPages) }, (_, i) => {
                    let pageNum;
                    if (paginationProps.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (paginationProps.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (paginationProps.currentPage >= paginationProps.totalPages - 2) {
                      pageNum = paginationProps.totalPages - 4 + i;
                    } else {
                      pageNum = paginationProps.currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={paginationProps.currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => paginationProps.goToPage(pageNum)}
                        disabled={paginationProps.isLoading}
                        className="w-10 h-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={paginationProps.nextPage}
                    disabled={!paginationProps.hasNextPage || paginationProps.isLoading}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Map View */}
          <TabsContent value="map" className="mt-0">
            {isSearching || isProgressiveLoading ? (
              <PlayfulLoadingAnimation 
                searchQuery={newSearchQuery || searchQuery}
                searchType={searchType}
              />
            ) : (
              <div className="h-[400px] md:h-[600px] rounded-lg overflow-hidden shadow-lg scroll-container">
                <PropertyMapNew 
                  properties={properties} 
                  searchLocation={searchLocation}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}