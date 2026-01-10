import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Sparkles, 
  Loader2, 
  Home, 
  MapPin, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Users, 
  Calculator, 
  Award, 
  Brain, 
  Target, 
  Factory, 
  Upload, 
  CheckCircle,
  Calendar,
  MessageCircle,
  Bot
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SearchWithSuggestions } from "@/components/SearchWithSuggestions";

const suggestionQueries = [
  "15 mins away from KLCC",
  "Condo near MRT under RM4000",
  "3 bedroom near LRT",
  "Commercial Ground floor under RM10k",
  "Apartment near MRT under RM3000",
  "Factory near highway under RM20k/month",
  "Condo 10 mins from Sunway",
  "2 bedroom near KTM Sentul",
  "Apartment near LRT Kelana Jaya"
];

const buySuggestionQueries = [
  "15 mins away from KLCC",
  "Apartment in Bangsar under RM600k",
  "3 bedroom near LRT",
  "Condo near MRT under RM500k",
  "Commercial with at least 4.5% ROI",
  "Apartment 20 mins from KLCC under RM700k"
];

const Landing: React.FC = () => {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"rent" | "buy">("rent");
  const [isSearching, setIsSearching] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // Detect PWA mode for mobile app styling
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;

  const aiSearchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      setIsSearching(true);
      const response = await fetch('/api/search/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: searchQuery,
          searchType: searchType 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process AI search');
      }

      return response.json();
    },
    onSuccess: (result) => {
      // Navigate to search results page with the results and search type
      setIsSearching(false);
      setLocation(`/search?q=${encodeURIComponent(result.query)}&type=${searchType}`);
    },
    onError: (error) => {
      setIsSearching(false);
      toast({
        title: "Search Error",
        description: "Failed to process your search. Please try again.",
        variant: "destructive",
      });
      console.error("AI search error:", error);
    },
  });

  const handleSearch = () => {
    if (!query.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    // Auto-detect search type from query and switch tabs
    const queryLower = query.toLowerCase();
    const buyKeywords = ['buy', 'purchase', 'sale', 'for sale', 'selling'];
    const rentKeywords = ['rent', 'rental', 'for rent', 'lease', 'leasing'];
    
    if (buyKeywords.some(keyword => queryLower.includes(keyword))) {
      setSearchType("buy");
    } else if (rentKeywords.some(keyword => queryLower.includes(keyword))) {
      setSearchType("rent");
    }

    // Save search query to localStorage for recommendations
    saveSearchQuery(query);
    aiSearchMutation.mutate(query);
  };

  const saveSearchQuery = (searchQuery: string) => {
    try {
      const existing = localStorage.getItem('recentSearchQueries');
      let queries = existing ? JSON.parse(existing) : [];
      
      // Remove if already exists and add to front
      queries = queries.filter((q: string) => q !== searchQuery);
      queries.unshift(searchQuery);
      
      // Keep only last 5 searches
      queries = queries.slice(0, 5);
      
      localStorage.setItem('recentSearchQueries', JSON.stringify(queries));
    } catch (error) {
      console.error('Error saving search query:', error);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    
    // Auto-detect search type from suggestion and switch tabs
    const suggestionLower = suggestion.toLowerCase();
    const buyKeywords = ['buy', 'purchase', 'sale', 'for sale', 'selling'];
    const rentKeywords = ['rent', 'rental', 'for rent', 'lease', 'leasing'];
    
    if (buyKeywords.some(keyword => suggestionLower.includes(keyword))) {
      setSearchType("buy");
    } else if (rentKeywords.some(keyword => suggestionLower.includes(keyword))) {
      setSearchType("rent");
    }
    
    saveSearchQuery(suggestion);
    aiSearchMutation.mutate(suggestion);
  };


  return (
    <div className={`min-h-screen ${isPWA ? 'bg-gradient-to-b from-blue-500 to-blue-700' : 'bg-white'}`}>
      {!isPWA && <Header />}
      
      {/* PWA Design - Matching Screenshot */}
      {isPWA ? (
        <section className="min-h-screen flex items-center justify-center px-6 py-20">
          <div className="w-full max-w-sm mx-auto text-center space-y-8">
            <div className="space-y-6">
              <h1 className="text-3xl font-semibold text-white leading-tight">
                {t('heroTitle')}
              </h1>
              <p className="text-white/90 text-base leading-relaxed px-2">
                {t('heroSubtitle')}
              </p>
            </div>

            {/* White Card with Search - Exactly like screenshot */}
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              {/* Buy/Rent Toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                <button
                  onClick={() => setSearchType("buy")}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                    searchType === "buy"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  {t('forSale')}
                </button>
                <button
                  onClick={() => setSearchType("rent")}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                    searchType === "rent"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  {t('forRent')}
                </button>
              </div>

              {/* Search Input */}
              <div className="relative z-[1]">
                <div className="bg-gray-50 rounded-xl p-1">
                  <SearchWithSuggestions
                    value={query}
                    onChange={setQuery}
                    onSearch={handleSearch}
                    placeholder={searchType === "buy" ? "Ask me anything - e.g. Condo near LRT under RM600k" : t('searchPlaceholderMain')}
                    searchType={searchType}
                    hideSearchIcon={false}
                    showAiIndicator={true}
                    isSearching={isSearching}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Desktop Design */
        <section className="relative flex items-center min-h-[80vh] bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600">
          {/* Hero Background with decorative elements */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-32 h-32 bg-white rounded-full opacity-10 blur-xl"></div>
            <div className="absolute bottom-20 right-10 w-40 h-40 bg-white rounded-full opacity-10 blur-xl"></div>
            <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-white rounded-full opacity-20 blur-lg"></div>
          </div>
          
          {/* Hero Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-center min-h-[600px] md:min-h-[700px] pt-8 md:pt-12">
            <div className="max-w-4xl text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl mb-4 md:mb-6 mt-0 md:mt-2 px-2 font-bold leading-tight text-white" data-testid="hero-title">
                {t('heroTitle')}
              </h1>
              <p className="text-lg md:text-xl mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed px-4 text-white" data-testid="hero-subtitle">
                {t('heroSubtitle')}
              </p>
            
              {/* Search Box */}
              <div className="mt-8">
                {/* Buy/Rent Tabs */}
                <div className="flex justify-center mb-6 md:mb-8 px-4">
                  <div className="flex bg-blue-50 p-1 rounded-xl border border-blue-100 w-full max-w-xs">
                    <button
                      onClick={() => setSearchType("buy")}
                      className={`flex-1 py-2.5 md:py-3 px-4 md:px-8 text-sm md:text-base font-semibold rounded-lg transition-all ${
                        searchType === "buy"
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-blue-600 hover:bg-blue-100"
                      }`}
                    >
                      {t('forSale')}
                    </button>
                    <button
                      onClick={() => setSearchType("rent")}
                      className={`flex-1 py-2.5 md:py-3 px-4 md:px-8 text-sm md:text-base font-semibold rounded-lg transition-all ${
                        searchType === "rent"
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-blue-600 hover:bg-blue-100"
                      }`}
                    >
                      {t('forRent')}
                    </button>
                  </div>
                </div>
                
                <div className="w-full max-w-3xl mx-auto px-4 relative z-50">
                  <SearchWithSuggestions
                    value={query}
                    onChange={setQuery}
                    onSearch={handleSearch}
                    placeholder={searchType === "buy" ? "Ask me anything - e.g. Condo near LRT under RM600k" : t('searchPlaceholderMain')}
                    searchType={searchType}
                    hideSearchIcon={false}
                    showAiIndicator={true}
                    isSearching={isSearching}
                    className="w-full"
                  />
                </div>
                
                {/* AI Feature Highlight - Simplified for MVP */}
                <div className="mt-8 flex items-center justify-center text-white text-base font-medium">
                  <Sparkles className="w-5 h-5 mr-2" />
                  <span>Powered by Advanced AI • Understands Natural Language</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Popular AI Searches Section - Only show on desktop */}
      {!isPWA && (
        <section className="py-16 bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                ✨ Popular AI searches for {searchType === "rent" ? "rent" : "buy"}
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Get inspired by what others are searching for. Click any suggestion to try it instantly.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {(searchType === "rent" ? suggestionQueries : buySuggestionQueries).slice(0, 6).map((suggestion, index) => (
                <button
                  key={`${searchType}-${index}`}
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setQuery(suggestion);
                    handleSuggestionClick(suggestion);
                  }}
                  data-testid={`suggestion-${index}`}
                  className="group p-4 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 rounded-xl text-left transition-all duration-200 hover:shadow-md hover:scale-105 transform"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-900 transition-colors leading-relaxed">
                        {suggestion}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Search className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Explore by Property Type Section - Only show on desktop */}
      {!isPWA && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                🏢 Explore by Property Type
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Find the perfect property for your needs - residential, commercial, or industrial.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Residential Card */}
              <button
                onClick={() => {
                  window.scrollTo(0, 0);
                  setLocation(`/search?category=residential&type=${searchType}`);
                }}
                className="group bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-2xl p-8 text-left transition-all duration-200 hover:shadow-2xl hover:scale-105 transform w-full"
                data-testid="button-category-residential-desktop"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                  <Home className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Residential</h3>
                <p className="text-white/90 text-sm mb-4">Houses, condos & apartments for your family</p>
                <div className="flex items-center text-white/80 text-xs font-medium">
                  <span>Explore properties</span>
                  <Search className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Commercial Card */}
              <button
                onClick={() => {
                  window.scrollTo(0, 0);
                  setLocation(`/search?category=commercial&type=${searchType}`);
                }}
                className="group bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-2xl p-8 text-left transition-all duration-200 hover:shadow-2xl hover:scale-105 transform w-full"
                data-testid="button-category-commercial-desktop"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Commercial</h3>
                <p className="text-white/90 text-sm mb-4">Shops, offices & retail spaces for your business</p>
                <div className="flex items-center text-white/80 text-xs font-medium">
                  <span>Explore properties</span>
                  <Search className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Industrial Card */}
              <button
                onClick={() => {
                  window.scrollTo(0, 0);
                  setLocation(`/search?category=industrial&type=${searchType}`);
                }}
                className="group bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-2xl p-8 text-left transition-all duration-200 hover:shadow-2xl hover:scale-105 transform w-full"
                data-testid="button-category-industrial-desktop"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                  <Factory className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Industrial</h3>
                <p className="text-white/90 text-sm mb-4">Warehouses, factories & logistics spaces</p>
                <div className="flex items-center text-white/80 text-xs font-medium">
                  <span>Explore properties</span>
                  <Search className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        </section>
      )}
      
      {/* Footer - Only show on desktop */}
      {!isPWA && <Footer />}
    </div>
  );
};

export default Landing;