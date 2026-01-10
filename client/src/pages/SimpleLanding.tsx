import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Home, Building2, Factory, MapPin, Bed, Bath, Maximize, ArrowRight, ChevronRight, BookOpen, TrendingUp, Newspaper, Clock, X } from "lucide-react";
import type { Property, User } from "@shared/schema";
import BottomNav from "@/components/BottomNav";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchHistory } from "@/hooks/useSearchHistory";

export default function SimpleLanding() {
  const [, setLocation] = useLocation();
  const [searchType, setSearchType] = useState<'rent' | 'buy'>('rent');
  const { t } = useLanguage();
  const { history: searchHistory, removeSearch, clearHistory, getRelativeTime } = useSearchHistory();

  // Fetch current user
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Fetch featured properties
  const { data: featuredProperties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties', { featured: true, limit: 6, status: 'online' }],
    retry: false,
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
    }).format(price);
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

  // Get recently viewed properties from localStorage
  const [recentlyViewedProperties, setRecentlyViewedProperties] = useState<Property[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('recentlyViewedProperties');
    if (stored) {
      try {
        const properties = JSON.parse(stored);
        setRecentlyViewedProperties(properties.slice(0, 6)); // Show max 6 recently viewed
      } catch (e) {
        console.error('Failed to parse recently viewed properties', e);
      }
    }
  }, []);

  const malaysianArticles = [
    {
      id: 1,
      title: "2025 Malaysian Property Market Outlook: Key Trends and Predictions",
      category: "Insights",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop",
      excerpt: "Expert analysis on what's shaping the Malaysian property landscape in 2025"
    },
    {
      id: 2,
      title: "Why Selangor Remains the Most Sought-After State for Property Investment",
      category: "Guides",
      image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop",
      excerpt: "Exploring investment opportunities in Petaling Jaya, Subang Jaya, and beyond"
    },
    {
      id: 3,
      title: "First-Time Buyer's Guide: Navigating HOC 2025 in Malaysia",
      category: "Guides",
      image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop",
      excerpt: "Everything you need to know about Home Ownership Campaign incentives"
    },
    {
      id: 4,
      title: "KL's Public Transport Expansion: How MRT3 Will Impact Property Values",
      category: "News",
      image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&auto=format&fit=crop",
      excerpt: "Understanding the property hotspots along the new MRT3 alignment"
    },
    {
      id: 5,
      title: "Affordable Housing in Malaysia: Best Areas Under RM500,000 in 2025",
      category: "Guides",
      image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&auto=format&fit=crop",
      excerpt: "Top locations offering value for money for young professionals and families"
    }
  ];

  const [selectedArticleCategory, setSelectedArticleCategory] = useState<'all' | 'guides' | 'insights' | 'news'>('all');

  const filteredArticles = selectedArticleCategory === 'all' 
    ? malaysianArticles 
    : malaysianArticles.filter(a => a.category.toLowerCase() === selectedArticleCategory);

  // Reference for recommended searches carousel (no auto-scroll on mobile)
  const carouselRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-gray-50 with-bottom-nav">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        {/* AI-Personalized Banner - Primary Search Entry */}
        <div className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-3xl overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
          <div className="relative p-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white mb-2">
                  ✨ {t('aiRecommendations')}
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {t('yourPersonalPropertyAI')}
                </h2>
                <p className="text-white/90 text-sm">
                  {t('searchNaturally')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setLocation('/simple/search')}
                className="px-6 py-2.5 bg-white text-blue-600 rounded-full font-semibold hover:bg-gray-100 transition-all hover:scale-105 inline-flex items-center gap-2 shadow-lg"
                data-testid="button-ai-search"
              >
                {t('tryAISearch')}
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 border-2 border-white"></div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 border-2 border-white"></div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-white"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Searches
              </h3>
              <button
                onClick={clearHistory}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                data-testid="button-clear-history"
              >
                Clear all
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {searchHistory.slice(0, 6).map((item, index) => (
                <div
                  key={`${item.query}-${index}`}
                  className="flex-shrink-0 snap-start group relative"
                >
                  <button
                    onClick={() => setLocation(`/simple/search-results?q=${encodeURIComponent(item.query)}&type=${item.searchType || searchType}`)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center gap-2 pr-8"
                    data-testid={`button-history-${index}`}
                  >
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="max-w-32 truncate">{item.query}</span>
                    <span className="text-xs text-gray-400">{getRelativeTime(item.timestamp)}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSearch(item.query);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`button-remove-history-${index}`}
                  >
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explore by Property Type */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Explore by Property Type
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
            {/* Residential Card */}
            <button
              onClick={() => setLocation(`/search?category=residential&type=${searchType}`)}
              className="flex-shrink-0 snap-start w-44 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-left hover:scale-105 transition-all shadow-md hover:shadow-xl"
              data-testid="button-category-residential"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
                <Home className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-white font-bold text-lg mb-1">Residential</h4>
              <p className="text-white/80 text-xs">Houses, condos & apartments</p>
            </button>

            {/* Commercial Card */}
            <button
              onClick={() => setLocation(`/search?category=commercial&type=${searchType}`)}
              className="flex-shrink-0 snap-start w-44 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-left hover:scale-105 transition-all shadow-md hover:shadow-xl"
              data-testid="button-category-commercial"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-white font-bold text-lg mb-1">Commercial</h4>
              <p className="text-white/80 text-xs">Shops, offices & retail</p>
            </button>

            {/* Industrial Card */}
            <button
              onClick={() => setLocation(`/search?category=industrial&type=${searchType}`)}
              className="flex-shrink-0 snap-start w-44 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-left hover:scale-105 transition-all shadow-md hover:shadow-xl"
              data-testid="button-category-industrial"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
                <Factory className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-white font-bold text-lg mb-1">Industrial</h4>
              <p className="text-white/80 text-xs">Warehouses & factories</p>
            </button>
          </div>
        </div>

        {/* Recently Viewed Listings */}
        {recentlyViewedProperties.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{t('recentViewedListings')}</h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
              {recentlyViewedProperties.map((property) => (
                <div
                  key={property.id}
                  onClick={() => setLocation(`/simple/property/${property.id}`)}
                  className="flex-shrink-0 w-72 bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow cursor-pointer border border-gray-100"
                  data-testid={`card-recently-viewed-${property.id}`}
                >
                  <div className="relative h-48">
                    {property.images && property.images[0] ? (
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Home className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-600">
                      {t('recentlyViewed')}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start gap-1 text-gray-600 text-sm mb-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{property.city}</span>
                    </div>
                    <h4 className="font-bold text-gray-900 line-clamp-2 mb-3 min-h-[3rem]">
                      {property.title}
                    </h4>
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
                    <div className="text-xl font-bold text-blue-600">
                      {formatPrice(Number(property.price))}
                      {property.listingType === 'rent' && <span className="text-sm text-gray-500">/mo</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Featured Properties - Enhanced */}
        {featuredProperties && featuredProperties.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  {t('featuredProperties')}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">Handpicked premium properties for you</p>
              </div>
              <button 
                className="text-sm text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1"
                onClick={() => setLocation('/simple/search?q=featured&type=buy')}
                data-testid="button-view-all-featured"
              >
                {t('viewAll')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
              {featuredProperties.map((property) => (
                <div
                  key={property.id}
                  onClick={() => setLocation(`/simple/property/${property.id}`)}
                  className="flex-shrink-0 w-72 bg-gradient-to-br from-white to-blue-50 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all cursor-pointer border-2 border-blue-200 hover:scale-105"
                  data-testid={`card-featured-${property.id}`}
                >
                  <div className="relative h-48">
                    {property.images && property.images[0] ? (
                      <>
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                        <Home className="w-12 h-12 text-blue-500" />
                      </div>
                    )}
                    {/* Featured Badge */}
                    <div className="absolute top-3 left-3 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full text-xs font-bold text-white shadow-lg">
                      ⭐ FEATURED
                    </div>
                    {/* ROI Badge for Commercial Properties */}
                    {property.roi && Number(property.roi) > 0 && (
                      <div className="absolute top-3 right-3 px-3 py-1.5 bg-green-500 rounded-full text-xs font-bold text-white shadow-lg">
                        {Number(property.roi).toFixed(1)}% ROI
                      </div>
                    )}
                    {/* Property Type Badge */}
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700">
                      {property.propertyType}
                    </div>
                  </div>
                  <div className="p-4 bg-white">
                    <div className="flex items-start gap-1 text-gray-600 text-sm mb-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                      <span className="line-clamp-1 font-medium">{property.city}</span>
                    </div>
                    <h4 className="font-bold text-gray-900 line-clamp-2 mb-3 min-h-[3rem] text-base">
                      {property.title}
                    </h4>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                      {property.bedrooms > 0 && (
                        <div className="flex items-center gap-1">
                          <Bed className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{property.bedrooms}</span>
                        </div>
                      )}
                      {property.bathrooms > 0 && (
                        <div className="flex items-center gap-1">
                          <Bath className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{property.bathrooms}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Maximize className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{property.builtUpSize} sqft</span>
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {formatPrice(Number(property.price))}
                        {property.listingType === 'rent' && <span className="text-sm text-gray-500">/mo</span>}
                      </div>
                      {property.roi && Number(property.roi) > 0 && (
                        <div className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          High ROI
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guides & Insights */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('guidesInsights')}</h3>
          
          {/* Category Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedArticleCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                selectedArticleCategory === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              data-testid="button-category-all"
            >
              {t('all')}
            </button>
            <button
              onClick={() => setSelectedArticleCategory('guides')}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                selectedArticleCategory === 'guides'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              data-testid="button-category-guides"
            >
              <BookOpen className="w-4 h-4 inline mr-1" />
              {t('guides')}
            </button>
            <button
              onClick={() => setSelectedArticleCategory('insights')}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                selectedArticleCategory === 'insights'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              data-testid="button-category-insights"
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              {t('insights')}
            </button>
            <button
              onClick={() => setSelectedArticleCategory('news')}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                selectedArticleCategory === 'news'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              data-testid="button-category-news"
            >
              <Newspaper className="w-4 h-4 inline mr-1" />
              {t('news')}
            </button>
          </div>

          {/* Articles */}
          <div className="space-y-4">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                onClick={() => setLocation(`/simple/article/${article.id}`)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow cursor-pointer border border-gray-100"
                data-testid={`card-article-${article.id}`}
              >
                <div className="flex gap-4">
                  <div className="w-32 h-32 flex-shrink-0">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 p-4">
                    <div className="inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold mb-2">
                      {article.category}
                    </div>
                    <h4 className="font-bold text-gray-900 line-clamp-2 mb-2">
                      {article.title}
                    </h4>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
