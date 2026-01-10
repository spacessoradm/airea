import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { X, Clock, Search, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useLanguage } from "@/contexts/LanguageContext";

interface RecentSearch {
  query: string;
  searchType: 'rent' | 'buy';
  timestamp: number;
}

export default function SimpleSearch() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<'rent' | 'buy'>('rent');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // Get category from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get('category') as 'residential' | 'commercial' | 'industrial' | null;
  const urlSearchType = urlParams.get('type') as 'rent' | 'buy' | null;

  // Set search type from URL on mount
  useEffect(() => {
    if (urlSearchType) {
      setSearchType(urlSearchType);
    }
  }, [urlSearchType]);

  // Property type specific recommendations
  const residentialRentSuggestions = [
    "Condo under RM4000",
    "3 bedroom apartment",
    "Service residence under RM6000",
    "2-storey terrace",
    "Apartment under RM1000",
    "4 bedroom terrace"
  ];

  const residentialBuySuggestions = [
    "Condo under RM1M",
    "3 bedroom terrace house",
    "Service residence",
    "2-storey terrace under RM1.5M",
    "Apartment under RM900k",
    "Semi-detached house"
  ];

  const commercialRentSuggestions = [
    "Shop or office",
    "Office space",
    "Shop",
    "Commercial space",
    "Retail space",
    "Ground floor shop"
  ];

  const commercialBuySuggestions = [
    "Commercial with at least 4% ROI",
    "Shop",
    "Office space for investment",
    "Commercial property",
    "Retail property under RM3M",
    "Shop lot"
  ];

  const industrialRentSuggestions = [
    "Factory",
    "Warehouse",
    "Industrial space",
    "Factory under RM20k",
    "Manufacturing space",
    "Industrial property"
  ];

  const industrialBuySuggestions = [
    "Factory or warehouse",
    "Industrial property",
    "Factory",
    "Warehouse for investment",
    "Industrial space under RM5M",
    "Manufacturing facility"
  ];

  // Rotating placeholder suggestions
  const rentPlaceholders = [
    "Try 'Condo under RM4000'",
    "Try 'Service residence under RM6000'",
    "Try '3 bedroom apartment'",
  ];

  const salePlaceholders = [
    "Ask me anything - e.g. Condo under RM1M",
    "Try '3 bedroom terrace house'",
    "Try 'Service residence'",
  ];

  const placeholders = searchType === 'rent' ? rentPlaceholders : salePlaceholders;

  // Select recommendations based on category and search type
  let recommendedSuggestions: string[] = [];
  
  if (category === 'residential') {
    recommendedSuggestions = searchType === 'rent' ? residentialRentSuggestions : residentialBuySuggestions;
  } else if (category === 'commercial') {
    recommendedSuggestions = searchType === 'rent' ? commercialRentSuggestions : commercialBuySuggestions;
  } else if (category === 'industrial') {
    recommendedSuggestions = searchType === 'rent' ? industrialRentSuggestions : industrialBuySuggestions;
  } else {
    // Default recommendations when no category is specified
    recommendedSuggestions = searchType === 'rent' ? [
      "Condo under RM4000",
      "3 bedroom apartment",
      "Service residence under RM6000",
      "2-storey terrace",
      "Apartment under RM1000",
      "Factory"
    ] : [
      "Condo under RM1M",
      "3 bedroom terrace house",
      "Service residence",
      "2-storey terrace under RM1.5M",
      "Commercial with at least 4% ROI",
      "Factory or warehouse"
    ];
  }

  useEffect(() => {
    // Load recent searches from localStorage
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        const searches = JSON.parse(stored);
        setRecentSearches(searches);
      } catch (e) {
        console.error('Error loading recent searches:', e);
      }
    }
  }, []);

  // Rotate placeholder text every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [placeholders.length]);

  // Reset placeholder index when search type changes
  useEffect(() => {
    setPlaceholderIndex(0);
  }, [searchType]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Save to recent searches
      const newSearch: RecentSearch = {
        query: searchQuery.trim(),
        searchType,
        timestamp: Date.now()
      };
      
      // Remove duplicates and limit to 10 recent searches
      const updated = [
        newSearch,
        ...recentSearches.filter(s => s.query.toLowerCase() !== searchQuery.toLowerCase().trim())
      ].slice(0, 10);
      
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      
      // Navigate to search results
      setLocation(`/simple/search-results?q=${encodeURIComponent(searchQuery.trim())}&type=${searchType}`);
    }
  };

  const handleRecentSearchClick = (search: RecentSearch) => {
    setLocation(`/simple/search-results?q=${encodeURIComponent(search.query)}&type=${search.searchType}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    // Navigate to search results with the suggestion
    const newSearch: RecentSearch = {
      query: suggestion,
      searchType,
      timestamp: Date.now()
    };
    const updated = [
      newSearch,
      ...recentSearches.filter(s => s.query.toLowerCase() !== suggestion.toLowerCase())
    ].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
    setLocation(`/simple/search-results?q=${encodeURIComponent(suggestion)}&type=${searchType}`);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white with-bottom-nav">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-blue-100 z-50">
        <div className="flex items-center gap-4 px-4 py-4">
          <button
            onClick={() => setLocation('/simple')}
            className="p-2 -ml-2 rounded-full hover:bg-blue-50 transition-colors"
            data-testid="button-back"
          >
            <X className="h-6 w-6 text-gray-900" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">{t('searchButton')}</h1>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Buy/Rent Tabs */}
        <div className="flex bg-white p-1 rounded-xl mb-6 shadow-sm border border-blue-100">
          <button
            onClick={() => setSearchType("buy")}
            className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all ${
              searchType === "buy"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-blue-50"
            }`}
            data-testid="button-tab-buy"
          >
            {t('forSale')}
          </button>
          <button
            onClick={() => setSearchType("rent")}
            className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all ${
              searchType === "rent"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-blue-50"
            }`}
            data-testid="button-tab-rent"
          >
            {t('forRent')}
          </button>
        </div>

        {/* Search Input with AI Icon and Suggestions */}
        <div className="relative mb-8" ref={inputRef}>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-400" />
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowSuggestions(true)}
              placeholder={placeholders[placeholderIndex]}
              className="w-full pl-20 pr-4 py-4 text-base bg-white border-2 border-blue-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-left placeholder-gray-400 placeholder:text-left shadow-sm"
              autoFocus
              data-testid="input-search"
            />
          </div>
          
          {/* Suggestions Dropdown */}
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden z-50">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-100">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                  <Sparkles className="h-4 w-4" />
                  <span>{t('aiPoweredSuggestions')}</span>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {recommendedSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-100 last:border-0"
                    data-testid={`button-suggestion-${index}`}
                  >
                    <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <span className="text-sm text-gray-900">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Searches */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4 border-b-2 border-blue-600 pb-2 inline-block">
            {t('recent')}
          </h2>
          
          {recentSearches.length > 0 ? (
            <div className="space-y-2">
              {recentSearches.map((search, index) => (
                <button
                  key={`${search.query}-${search.timestamp}`}
                  onClick={() => handleRecentSearchClick(search)}
                  className="w-full flex items-start gap-3 p-3 hover:bg-blue-50 bg-white border border-blue-100 rounded-xl transition-colors text-left shadow-sm"
                  data-testid={`button-recent-${index}`}
                >
                  <Clock className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-normal">
                      {search.query}
                    </p>
                    <span className="inline-block mt-1.5 px-3 py-0.5 text-xs font-medium bg-blue-50 border border-blue-200 rounded-full text-blue-700">
                      {search.searchType === 'buy' ? t('forSale') : t('forRent')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-4">No recent searches</p>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
