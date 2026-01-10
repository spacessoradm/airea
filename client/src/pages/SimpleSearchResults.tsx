import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Heart, Bookmark, Sparkles, SlidersHorizontal, ArrowUpDown, X, ArrowLeft, Eye, Clock, MapPin, Bed, Bath, Maximize, Home, User, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@shared/schema";
import BottomNav from "@/components/BottomNav";
import { Slider } from "@/components/ui/slider";
import { useSearchHistory } from "@/hooks/useSearchHistory";

interface PropertyWithAgent extends Property {
  agentName?: string;
}

interface FilterState {
  propertyTypes: string[];
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
}

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

// Filter Page Component
function FilterPage({ filters, onApply, onClose, searchType }: {
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  onClose: () => void;
  searchType: 'rent' | 'buy';
}) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  const propertyTypeOptions = [
    { value: 'condominium', label: 'Condominium' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'service-residence', label: 'Service Residence' },
    { value: 'terraced-house', label: 'Terraced House' },
    { value: 'semi-detached-house', label: 'Semi-Detached' },
    { value: 'bungalow', label: 'Bungalow' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'studio', label: 'Studio' },
  ];

  const bedroomOptions = [1, 2, 3, 4, 5];
  const bathroomOptions = [1, 2, 3, 4, 5];

  // Price slider bounds based on listing type
  const priceConfig = searchType === 'rent' ? {
    min: 0,
    max: 10000,
    step: 100,
    formatDisplay: (val: number) => {
      if (val === 0) return 'Min';
      if (val >= 10000) return 'Max';
      return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)} K`;
    }
  } : {
    min: 0,
    max: 10000000,
    step: 50000,
    formatDisplay: (val: number) => {
      if (val === 0) return 'Min';
      if (val >= 10000000) return 'Max';
      if (val >= 1000000) {
        const millions = val / 1000000;
        return millions % 1 === 0 ? `${millions}mil` : `${millions.toFixed(1)}mil`;
      }
      return `${(val / 1000).toFixed(0)} K`;
    }
  };

  // Initialize slider values from filters
  const getSliderValues = (): [number, number] => {
    const min = localFilters.minPrice ?? priceConfig.min;
    const max = localFilters.maxPrice ?? priceConfig.max;
    return [min, max];
  };

  const handlePriceChange = (values: number[]) => {
    const [min, max] = values;
    setLocalFilters(prev => ({
      ...prev,
      minPrice: min === priceConfig.min ? null : min,
      maxPrice: max === priceConfig.max ? null : max,
    }));
  };

  const togglePropertyType = (type: string) => {
    setLocalFilters(prev => ({
      ...prev,
      propertyTypes: prev.propertyTypes.includes(type)
        ? prev.propertyTypes.filter(t => t !== type)
        : [...prev.propertyTypes, type]
    }));
  };

  const handleClearAll = () => {
    setLocalFilters({
      propertyTypes: [],
      minPrice: null,
      maxPrice: null,
      bedrooms: null,
      bathrooms: null,
    });
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto with-bottom-nav">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            data-testid="button-close-filter-page"
          >
            <X className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Filters</h1>
          <button
            onClick={handleClearAll}
            className="text-sm font-semibold text-blue-600"
            data-testid="button-clear-all"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-8">
        {/* Property Type */}
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-4">Property Type</h3>
          <div className="grid grid-cols-2 gap-3">
            {propertyTypeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => togglePropertyType(option.value)}
                className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  localFilters.propertyTypes.includes(option.value)
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                }`}
                data-testid={`button-property-type-${option.value}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Price (RM)</h3>
            <span className="text-sm font-semibold text-gray-900">
              {priceConfig.formatDisplay(getSliderValues()[0])} - {priceConfig.formatDisplay(getSliderValues()[1])}
            </span>
          </div>
          <div className="px-2">
            <Slider
              min={priceConfig.min}
              max={priceConfig.max}
              step={priceConfig.step}
              value={getSliderValues()}
              onValueChange={handlePriceChange}
              className="w-full"
              data-testid="slider-price-range"
            />
          </div>
        </div>

        {/* Bedrooms */}
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-4">Bedrooms</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setLocalFilters(prev => ({ ...prev, bedrooms: null }))}
              className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                localFilters.bedrooms === null
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
              }`}
              data-testid="button-bedrooms-any"
            >
              Any
            </button>
            {bedroomOptions.map((num) => (
              <button
                key={num}
                onClick={() => setLocalFilters(prev => ({ ...prev, bedrooms: num }))}
                className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  localFilters.bedrooms === num
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                }`}
                data-testid={`button-bedrooms-${num}`}
              >
                {num}+
              </button>
            ))}
          </div>
        </div>

        {/* Bathrooms */}
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-4">Bathrooms</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setLocalFilters(prev => ({ ...prev, bathrooms: null }))}
              className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                localFilters.bathrooms === null
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
              }`}
              data-testid="button-bathrooms-any"
            >
              Any
            </button>
            {bathroomOptions.map((num) => (
              <button
                key={num}
                onClick={() => setLocalFilters(prev => ({ ...prev, bathrooms: num }))}
                className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  localFilters.bathrooms === num
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                }`}
                data-testid={`button-bathrooms-${num}`}
              >
                {num}+
              </button>
            ))}
          </div>
        </div>

        {/* Apply Button */}
        <div className="pt-4">
          <button
            onClick={() => onApply(localFilters)}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors"
            data-testid="button-apply-filters"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SimpleSearchResults() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { addSearch } = useSearchHistory();
  const [currentQuery, setCurrentQuery] = useState("");
  const [searchType, setSearchType] = useState<'rent' | 'buy'>('rent');
  const [isSearching, setIsSearching] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortBy, setSortBy] = useState<'relevant' | 'price-low' | 'price-high' | 'newest'>('relevant');
  const [filters, setFilters] = useState<FilterState>({
    propertyTypes: [],
    minPrice: null,
    maxPrice: null,
    bedrooms: null,
    bathrooms: null,
  });
  
  const [results, setResults] = useState<{ 
    properties: PropertyWithAgent[], 
    count: number,
    typoCorrections?: Array<{ original: string; corrected: string; type: string; score: number }>;
    originalQuery?: string;
    correctedQuery?: string;
  } | null>(null);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [agentPhones, setAgentPhones] = useState<Record<string, string>>({});

  // Handle WhatsApp click for a property
  const handleWhatsAppClick = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const phone = agentPhones[property.agentId || '']?.replace(/[^0-9]/g, '');
    if (!phone) {
      toast({
        title: "Contact not available",
        description: "Agent's WhatsApp number is not available",
        variant: "destructive",
      });
      return;
    }

    const whatsappNumber = phone.startsWith('60') ? phone : `60${phone}`;
    const message = `Hi, I'm interested in this property:\n\n` +
      `📍 ${property.title}\n` +
      `💰 RM ${Number(property.price).toLocaleString()}${property.listingType === 'rent' ? '/mo' : ''}\n` +
      `📏 ${property.builtUpSize?.toLocaleString() || 'N/A'} sq ft\n` +
      `🛏️ ${property.bedrooms} bed | 🚿 ${property.bathrooms} bath\n` +
      `📌 ${property.address}\n\n` +
      `Property ID: ${property.id}`;
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Format relative time from date
  const formatRelativeTime = (date: Date | string | null) => {
    if (!date) return 'Listed recently';
    
    const now = new Date();
    const createdDate = new Date(date);
    const diffInMs = now.getTime() - createdDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    
    if (diffInMinutes < 60) {
      return 'Listed recently';
    } else if (diffInHours < 24) {
      return `Listed ${diffInHours}h ago`;
    } else if (diffInDays === 1) {
      return 'Listed 1d ago';
    } else if (diffInDays < 7) {
      return `Listed ${diffInDays}d ago`;
    } else if (diffInWeeks === 1) {
      return 'Listed 1w ago';
    } else if (diffInWeeks < 4) {
      return `Listed ${diffInWeeks}w ago`;
    } else if (diffInMonths === 1) {
      return 'Listed 1M ago';
    } else if (diffInMonths < 12) {
      return `Listed ${diffInMonths}M ago`;
    } else {
      return `Listed ${Math.floor(diffInMonths / 12)}y ago`;
    }
  };

  // Get query from URL and execute search
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || '';
    const type = params.get('type') as 'rent' | 'buy' || 'rent';
    const category = params.get('category') as 'residential' | 'commercial' | 'industrial' | null;
    setSearchType(type);
    
    // Scroll to top when page loads
    window.scrollTo(0, 0);
    
    // Auto-execute search if query exists
    if (q) {
      executeSearch(q, type);
    } else if (category && CATEGORY_PROPERTY_TYPES[category]) {
      // Category-based search: filter by property types
      const categoryFilters: FilterState = {
        propertyTypes: CATEGORY_PROPERTY_TYPES[category],
        minPrice: null,
        maxPrice: null,
        bedrooms: null,
        bathrooms: null,
      };
      setFilters(categoryFilters);
      setCurrentQuery(CATEGORY_LABELS[category] || category);
      executeCategorySearch(type, categoryFilters, category);
    }
  }, []);

  const executeCategorySearch = async (type: 'rent' | 'buy', categoryFilters: FilterState, categoryName: string) => {
    setIsSearching(true);
    
    try {
      // Use direct properties endpoint for category searches to ensure results
      const listingType = type === 'buy' ? 'sale' : 'rent';
      const propertyTypesParam = categoryFilters.propertyTypes.join(',');
      
      const response = await fetch(`/api/properties?listingType=${listingType}&status=online&limit=100`);
      
      if (!response.ok) throw new Error('Search failed');
      
      const allProperties = await response.json();
      
      // Filter by category property types
      const allowedTypes = categoryFilters.propertyTypes;
      const filteredProperties = (allProperties ?? []).filter((p: Property) => 
        allowedTypes.includes(p.propertyType)
      );
      
      setResults({
        properties: filteredProperties,
        count: filteredProperties.length
      });
      
      // Fetch agent names and phones for filtered properties
      if (filteredProperties.length > 0) {
        const agentIds = Array.from(new Set(filteredProperties.map((p: Property) => p.agentId).filter(Boolean)));
        const names: Record<string, string> = {};
        const phones: Record<string, string> = {};
        
        await Promise.all(
          agentIds.map(async (agentId: any) => {
            try {
              const agentResponse = await fetch(`/api/users/${agentId}`);
              if (agentResponse.ok) {
                const agent = await agentResponse.json();
                names[agentId as string] = `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Agent';
                phones[agentId as string] = agent.phone || '';
              }
            } catch {
              names[agentId as string] = 'Agent';
            }
          })
        );
        
        setAgentNames(names);
        setAgentPhones(phones);
      }
      
      setIsSearching(false);
    } catch (error) {
      setIsSearching(false);
      toast({ title: "Search Error", description: "Failed to process search", variant: "destructive" });
    }
  };

  const executeSearch = async (query: string, type: 'rent' | 'buy', appliedFilters?: FilterState) => {
    setIsSearching(true);
    setCurrentQuery(query);
    
    try {
      const searchBody: any = { query, searchType: type };
      
      // Add filters if provided
      if (appliedFilters) {
        if (appliedFilters.propertyTypes.length > 0) {
          searchBody.propertyType = appliedFilters.propertyTypes;
        }
        if (appliedFilters.minPrice !== null) {
          searchBody.minPrice = appliedFilters.minPrice;
        }
        if (appliedFilters.maxPrice !== null) {
          searchBody.maxPrice = appliedFilters.maxPrice;
        }
        if (appliedFilters.bedrooms !== null) {
          searchBody.bedrooms = appliedFilters.bedrooms;
        }
        if (appliedFilters.bathrooms !== null) {
          searchBody.bathrooms = appliedFilters.bathrooms;
        }
      }
      
      const response = await fetch('/api/search/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchBody),
      });
      
      if (!response.ok) throw new Error('Search failed');
      
      const result = await response.json();
      setResults(result);
      
      // Save search to history
      if (query.trim()) {
        addSearch(query, type, result.properties?.length || 0);
      }
      
      // Fetch agent names and phones for all properties
      if (result.properties && result.properties.length > 0) {
        const agentIds = Array.from(new Set(result.properties.map((p: Property) => p.agentId).filter(Boolean)));
        const names: Record<string, string> = {};
        const phones: Record<string, string> = {};
        
        await Promise.all(
          agentIds.map(async (agentId: any) => {
            try {
              const agentResponse = await fetch(`/api/users/${agentId}`);
              if (agentResponse.ok) {
                const agent = await agentResponse.json();
                names[agentId as string] = `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Agent';
                phones[agentId as string] = agent.phone || '';
              }
            } catch {
              names[agentId as string] = 'Agent';
            }
          })
        );
        
        setAgentNames(names);
        setAgentPhones(phones);
      }
      
      setIsSearching(false);
    } catch (error) {
      setIsSearching(false);
      toast({ title: "Search Error", description: "Failed to process search", variant: "destructive" });
    }
  };

  // Re-search when searchType changes
  useEffect(() => {
    if (currentQuery) {
      executeSearch(currentQuery, searchType, filters);
      window.history.pushState({}, '', `/simple/search-results?q=${encodeURIComponent(currentQuery)}&type=${searchType}`);
    }
  }, [searchType]);

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    setShowFilterModal(false);
    executeSearch(currentQuery, searchType, newFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.propertyTypes.length > 0) count++;
    if (filters.minPrice !== null || filters.maxPrice !== null) count++;
    if (filters.bedrooms !== null) count++;
    if (filters.bathrooms !== null) count++;
    return count;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleClearSearch = () => {
    setLocation('/simple/search');
  };

  const getSortedProperties = () => {
    if (!results?.properties) return [];
    
    const props = [...results.properties];
    switch (sortBy) {
      case 'price-low':
        return props.sort((a, b) => Number(a.price) - Number(b.price));
      case 'price-high':
        return props.sort((a, b) => Number(b.price) - Number(a.price));
      case 'newest':
        return props.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      default:
        return props;
    }
  };

  if (!currentQuery) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center with-bottom-nav">
        <div className="text-center px-4">
          <p className="text-gray-500 mb-4">Start your property search</p>
          <button
            onClick={() => setLocation('/simple')}
            className="text-blue-600 hover:text-blue-700 font-medium"
            data-testid="button-back-home"
          >
            ← Back to Home
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const sortedProperties = getSortedProperties();

  return (
    <div className="min-h-screen bg-gray-50 with-bottom-nav">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation('/simple')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold text-gray-900">Search results</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLocation('/simple/saved')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="button-saved"
              >
                <Bookmark className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Search Bar with AI Badge */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setLocation('/simple/search')}
              className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-left"
              data-testid="button-search-bar"
            >
              <div className="flex items-center gap-1.5 text-blue-600">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-semibold">AI</span>
              </div>
              <div className="h-4 w-px bg-gray-300"></div>
              <span className="flex-1 text-sm text-gray-700 line-clamp-1" data-testid="text-search-query">
                {currentQuery}
              </span>
              <X className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => setShowFilterModal(true)}
              className="relative p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              data-testid="button-filter"
            >
              <SlidersHorizontal className="w-5 h-5" />
              {getActiveFilterCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {getActiveFilterCount()}
                </span>
              )}
            </button>
          </div>

          {/* Sale/Rent Tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSearchType("buy")}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                searchType === "buy"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              data-testid="button-tab-buy"
            >
              Sale
            </button>
            <button
              onClick={() => setSearchType("rent")}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                searchType === "rent"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              data-testid="button-tab-rent"
            >
              Rent
            </button>
          </div>

          {/* Results Summary and Sort */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {searchType === 'buy' ? 'Residential properties for sale' : 'Residential properties for rent'}
              </p>
              <p className="text-xs text-blue-600" data-testid="text-result-count">
                {results?.count || 0} properties
              </p>
            </div>
            <button
              onClick={() => setShowSortModal(true)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-full transition-colors"
              data-testid="button-sort"
            >
              <ArrowUpDown className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Typo Correction Notification */}
        {results?.typoCorrections && results.typoCorrections.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl" data-testid="typo-correction-notice">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="text-gray-700">Showing results for </span>
                <span className="font-semibold text-blue-700">"{results.correctedQuery}"</span>
                <span className="text-gray-500 block text-xs mt-1">
                  Did you mean: {results.typoCorrections.map((c, i) => (
                    <span key={i}>
                      <span className="line-through text-gray-400">{c.original}</span>
                      {' → '}
                      <span className="text-blue-600">{c.corrected}</span>
                      {i < results.typoCorrections!.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </div>
        )}

        {isSearching ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Finding your perfect property...</p>
          </div>
        ) : results && sortedProperties.length > 0 ? (
          <div className="space-y-4">
            {sortedProperties.map((property, index) => (
              <div
                key={property.id}
                onClick={() => setLocation(`/simple/property/${property.id}`)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-100"
                data-testid={`card-property-${property.id}`}
              >
                {/* Property Image with Action Buttons */}
                <div className="relative h-56">
                  {property.images && property.images[0] ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <Home className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Action Buttons Overlay */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast({ title: "Coming Soon", description: "Quick view feature will be available soon" });
                      }}
                      className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                      data-testid={`button-quick-view-${property.id}`}
                    >
                      <Eye className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast({ title: "Coming Soon", description: "Favorite feature will be available soon" });
                      }}
                      className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                      data-testid={`button-favorite-${property.id}`}
                    >
                      <Heart className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>

                  {/* Badges Row */}
                  <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                    {/* Featured Badge */}
                    {property.featured && (
                      <div className="px-3 py-1 bg-yellow-500 rounded-full text-xs font-bold text-white shadow-md">
                        FEATURED
                      </div>
                    )}
                    
                    {/* ROI Badge */}
                    {(property.roi !== null && property.roi !== undefined && !isNaN(Number(property.roi))) && (
                      <div className="px-3 py-1 bg-green-500 rounded-full text-xs font-bold text-white shadow-md">
                        {property.roi}% ROI
                      </div>
                    )}
                    
                    {/* Property Type Badge - Always shown */}
                    <div className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-900">
                      {property.propertyType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </div>
                  </div>
                </div>

                {/* Property Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 line-clamp-1 mb-1" data-testid={`text-title-${property.id}`}>
                        {property.title}
                      </h3>
                      <div className="flex items-center gap-1 text-gray-600 text-sm mb-2">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="line-clamp-1">{property.city}, {property.state}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-2xl font-bold text-gray-900 mb-3" data-testid={`text-price-${property.id}`}>
                    {formatPrice(Number(property.price))}
                    {property.listingType === 'rent' && <span className="text-sm text-gray-500 font-normal">/mo</span>}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4" />
                      <span>{property.bedrooms}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="w-4 h-4" />
                      <span>{property.bathrooms}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Maximize className="w-4 h-4" />
                      <span>{property.builtUpSize} sqft</span>
                    </div>
                  </div>

                  {/* Agent Name */}
                  {property.agentId && agentNames[property.agentId] && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-700 mb-2 bg-gray-50 px-3 py-2 rounded-lg">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{agentNames[property.agentId]}</span>
                    </div>
                  )}

                  {/* Time Posted */}
                  {property.createdAt && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(property.createdAt)}</span>
                    </div>
                  )}

                  {/* WhatsApp Button */}
                  <button
                    onClick={(e) => handleWhatsAppClick(property, e)}
                    className="w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                    data-testid={`button-whatsapp-${property.id}`}
                  >
                    <Phone className="w-4 h-4" />
                    WhatsApp Agent
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
            <button
              onClick={() => setLocation('/simple/search')}
              className="px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700"
              data-testid="button-new-search"
            >
              New Search
            </button>
          </div>
        )}
      </div>

      {/* Sort Modal */}
      {showSortModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowSortModal(false)}>
          <div
            className="bg-white rounded-t-3xl w-full p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Sort by</h3>
              <button
                onClick={() => setShowSortModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
                data-testid="button-close-sort"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                { value: 'relevant', label: 'Most Relevant (AI)', icon: Sparkles },
                { value: 'price-low', label: 'Price: Low to High', icon: ArrowUpDown },
                { value: 'price-high', label: 'Price: High to Low', icon: ArrowUpDown },
                { value: 'newest', label: 'Newest First', icon: Clock },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value as any);
                      setShowSortModal(false);
                      toast({ title: "Sorted", description: `Sorted by ${option.label}` });
                    }}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors ${
                      sortBy === option.value
                        ? 'bg-blue-50 border-2 border-blue-600'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    data-testid={`button-sort-${option.value}`}
                  >
                    <Icon className={`w-5 h-5 ${sortBy === option.value ? 'text-blue-600' : 'text-gray-600'}`} />
                    <span className={`font-semibold ${sortBy === option.value ? 'text-blue-600' : 'text-gray-900'}`}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal - Full Page */}
      {showFilterModal && <FilterPage filters={filters} onApply={handleApplyFilters} onClose={() => setShowFilterModal(false)} searchType={searchType} />}

      <BottomNav />

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
