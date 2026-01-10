import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Bed, Bath, Star, ChevronLeft, ChevronRight, TrendingUp, Eye, Heart } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Property } from "@shared/schema";

interface RecommendedPropertiesProps {
  onSearchClick: (query: string) => void;
}

export default function RecommendedProperties({ onSearchClick }: RecommendedPropertiesProps) {
  const [, setLocation] = useLocation();
  const [recommendedQueries, setRecommendedQueries] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const trendingScrollRef = useRef<HTMLDivElement>(null);
  const similarScrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Get recently searched properties from localStorage
  useEffect(() => {
    try {
      const recentSearches = localStorage.getItem('recentSearchQueries');
      if (recentSearches) {
        const searches = JSON.parse(recentSearches);
        setRecommendedQueries(Array.isArray(searches) ? searches.slice(0, 3) : []);
      }
    } catch (error) {
      console.error('Error parsing recent searches:', error);
      setRecommendedQueries([]);
    }
  }, []);

  // Helper function to format price based on listing type
  const formatPrice = (price: string, listingType: string) => {
    const numPrice = Number(price);
    const formatted = numPrice.toLocaleString();
    return listingType === 'rent' ? `${formatted}/month` : formatted;
  };

  // Fetch trending properties with error handling
  const { data: trendingResponse } = useQuery({
    queryKey: ["/api/recommendations/trending"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/recommendations/trending');
        if (!response.ok) {
          throw new Error("Failed to fetch trending properties");
        }
        return response.json();
      } catch (error) {
        console.error('Trending properties fetch error:', error);
        return { trendingProperties: [] };
      }
    },
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
  });

  // Fetch personalized recommendations with error handling
  const { data: personalizedResponse } = useQuery({
    queryKey: ["/api/recommendations/personalized"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/recommendations/personalized');
        if (!response.ok) {
          throw new Error("Failed to fetch personalized recommendations");
        }
        return response.json();
      } catch (error) {
        console.error('Personalized recommendations fetch error:', error);
        return { similar: [], betterValue: [] };
      }
    },
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
  });

  // Safely extract properties from responses with error handling
  const trendingProperties = useMemo(() => {
    try {
      const props = trendingResponse?.trendingProperties || [];
      return Array.isArray(props) ? props.filter(p => p?.property?.id && p?.property?.title) : [];
    } catch (error) {
      console.error('Error processing trending properties:', error);
      return [];
    }
  }, [trendingResponse]);

  const similarProperties = useMemo(() => {
    try {
      const props = personalizedResponse?.similar || [];
      return Array.isArray(props) ? props.filter(p => p?.property?.id && p?.property?.title).map(p => p.property) : [];
    } catch (error) {
      console.error('Error processing similar properties:', error);
      return [];
    }
  }, [personalizedResponse]);

  const betterValueProperties = useMemo(() => {
    try {
      const props = personalizedResponse?.betterValue || [];
      return Array.isArray(props) ? props.filter(p => p?.property?.id && p?.property?.title).map(p => p.property) : [];
    } catch (error) {
      console.error('Error processing better value properties:', error);
      return [];
    }
  }, [personalizedResponse]);
  
  const handlePropertyClick = (property: any) => {
    try {
      if (property?.id) {
        setLocation(`/property/${property.id}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error handling property click:', error);
    }
  };

  const scrollLeft = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  // Default recommendations if no recent searches
  const defaultRecommendations = [
    "Condos in Mont Kiara under RM3000",
    "3-bedroom apartment near LRT",
    "Properties in KLCC with swimming pool"
  ];

  const displayQueries = recommendedQueries.length > 0 ? recommendedQueries : defaultRecommendations;

  // Don't render if no content
  if (displayQueries.length === 0 && trendingProperties.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t('recommendedForYou')}
          </h2>
          <p className="text-lg text-gray-600">
            Discover trending properties and personalized recommendations
          </p>
        </div>

        {/* Recent Search Recommendations */}
        {displayQueries.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
              {recommendedQueries.length > 0 ? "Based on Your Recent Searches" : t('popularSearches')}
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {displayQueries.map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => onSearchClick(query)}
                  className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 hover:text-blue-800"
                >
                  {query}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Trending Properties */}
        {trendingProperties.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <TrendingUp className="w-6 h-6 text-red-500 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900">
                  Trending Properties
                </h3>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => scrollLeft(trendingScrollRef)}
                  className="p-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => scrollRight(trendingScrollRef)}
                  className="p-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div 
              ref={trendingScrollRef}
              className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {trendingProperties.map((item: any) => {
                const property = item?.property;
                if (!property?.id || !property?.title) return null;
                
                return (
                  <Card 
                    key={property.id} 
                    className="flex-none w-80 group cursor-pointer hover:shadow-lg transition-shadow duration-300"
                    onClick={() => handlePropertyClick(property)}
                  >
                    <div className="relative">
                      <img
                        src={property.images && property.images.length > 0 ? property.images[0] : `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop`}
                        alt={property.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-red-500 text-white">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Trending
                        </Badge>
                      </div>
                      <div className="absolute top-3 right-3">
                        <Badge variant="secondary" className="bg-white/90 text-gray-900">
                          RM {formatPrice(property.price?.toString() || '0', property.listingType || 'rent')}
                        </Badge>
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                        {property.title}
                      </h4>
                      
                      <div className="flex items-center text-gray-600 text-sm mb-3">
                        <MapPin className="w-4 h-4 mr-1" />
                        {property.address || property.location}, {property.city || 'KL'}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Bed className="w-4 h-4 mr-1" />
                          {property.bedrooms || 2} bed
                        </div>
                        <div className="flex items-center">
                          <Bath className="w-4 h-4 mr-1" />
                          {property.bathrooms || 2} bath
                        </div>
                        <div className="text-gray-500">
                          {property.squareFeet || '800'} sq ft
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}