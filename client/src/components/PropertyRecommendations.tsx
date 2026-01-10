import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, TrendingUp, DollarSign, MapPin, Heart, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface MarketComparison {
  marketMedian: number;
  actualPrice: number;
  savingsAmount: number;
  savingsPercent: number;
}

interface PropertyRecommendation {
  property: {
    id: string;
    title: string;
    propertyType: string;
    bedrooms: number;
    bathrooms: number;
    price: string;
    city: string;
    address: string;
    images: string[];
    amenities: string[];
    builtUpSize?: string;
  };
  score: number;
  reason: string;
  type: 'similar' | 'better_value' | 'upgrade' | 'alternative_area' | 'trending';
  marketComparison?: MarketComparison;
}

interface RecommendationResponse {
  similar: PropertyRecommendation[];
  betterValue: PropertyRecommendation[];
  upgrades: PropertyRecommendation[];
  alternativeAreas: PropertyRecommendation[];
  insights: {
    totalRecommendations: number;
    marketTrends: string;
    bestValueCount: number;
    averageSavings: number;
  };
  totalScore: number;
}

const PropertyRecommendations: React.FC = () => {
  const [activeTab, setActiveTab] = useState('personalized');

  // Fetch personalized recommendations
  const { data: personalizedRecs, isLoading: personalizedLoading } = useQuery<RecommendationResponse>({
    queryKey: ['/api/recommendations/personalized'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch trending properties
  const { data: trendingRecs, isLoading: trendingLoading } = useQuery<{
    trendingProperties: PropertyRecommendation[];
    count: number;
    message: string;
  }>({
    queryKey: ['/api/recommendations/trending'],
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Fetch user preferences
  const { data: userPreferences } = useQuery<{
    preferences: {
      preferredPropertyTypes: string[];
      priceRange: { min: number; max: number };
      preferredBedrooms: number[];
      preferredAreas: string[];
      preferredAmenities: string[];
    };
  }>({
    queryKey: ['/api/recommendations/preferences'],
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const trackInteraction = async (propertyId: string, interactionType: 'click' | 'view' | 'contact') => {
    try {
      await fetch('/api/recommendations/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, interactionType })
      });
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  };

  const formatPrice = (price: string) => {
    const num = parseInt(price);
    if (num >= 1000000) return `RM ${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `RM ${(num / 1000).toFixed(0)}K`;
    return `RM ${num.toLocaleString()}`;
  };

  const BestValuePropertyCard: React.FC<{
    rec: PropertyRecommendation;
    onInteraction?: (type: 'click' | 'view') => void;
  }> = ({ rec, onInteraction }) => {
    const { property, marketComparison } = rec;
    
    const handleClick = () => {
      onInteraction?.('click');
      trackInteraction(property.id, 'click');
    };

    const formatCurrency = (amount: number) => {
      if (amount >= 1000000) return `RM ${(amount / 1000000).toFixed(1)}M`;
      if (amount >= 1000) return `RM ${(amount / 1000).toFixed(0)}K`;
      return `RM ${amount.toLocaleString()}`;
    };

    return (
      <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-green-200" onClick={handleClick}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Property Image */}
          <div className="aspect-video lg:aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {property.images && property.images.length > 0 ? (
              <img 
                src={property.images[0]} 
                alt={property.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No image available
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="lg:col-span-1 space-y-3">
            <div>
              <CardTitle className="text-lg font-semibold line-clamp-2 mb-2">
                {property.title}
              </CardTitle>
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <MapPin className="w-4 h-4 mr-1" />
                {property.city}
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {property.propertyType}
                </Badge>
                <Badge variant="default" className="text-xs bg-green-500">
                  Best Value
                </Badge>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              {property.bedrooms}BR • {property.bathrooms}BA
              {property.builtUpSize && ` • ${property.builtUpSize} sq ft`}
            </div>

            {property.amenities && property.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {property.amenities.slice(0, 3).map((amenity: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
                {property.amenities.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{property.amenities.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Market Comparison */}
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                Market Analysis
              </h4>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Property Price:</span>
                  <span className="font-semibold text-green-700">
                    {formatCurrency(parseFloat(property.price))}
                  </span>
                </div>
                
                {marketComparison && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Market Median:</span>
                      <span className="text-sm text-gray-500 line-through">
                        {formatCurrency(marketComparison.marketMedian)}
                      </span>
                    </div>
                    
                    <div className="border-t border-green-200 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-green-800">You Save:</span>
                        <span className="font-bold text-green-700">
                          {formatCurrency(marketComparison.savingsAmount)}
                        </span>
                      </div>
                      <div className="text-center mt-2">
                        <Badge variant="default" className="bg-green-500 text-white">
                          {marketComparison.savingsPercent.toFixed(0)}% Below Market
                        </Badge>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="text-sm text-muted-foreground italic">
              {rec.reason}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const TrendingPropertyCard: React.FC<{
    property: any;
    onInteraction?: (type: 'click' | 'view') => void;
  }> = ({ property, onInteraction }) => {
    const handleClick = () => {
      onInteraction?.('click');
      trackInteraction(property.id, 'click');
    };

    const handleView = () => {
      onInteraction?.('view');
      trackInteraction(property.id, 'view');
    };

    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
        <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
          {property.images && property.images.length > 0 ? (
            <img 
              src={property.images[0]} 
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No image available
            </div>
          )}
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg font-semibold line-clamp-1">
              {property.title}
            </CardTitle>
            <Badge variant="secondary" className="ml-2">
              <TrendingUp className="w-3 h-3" />
            </Badge>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-1" />
            {property.city}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-primary">
                {formatPrice(property.price)}
              </span>
              <div className="text-sm text-muted-foreground">
                {property.bedrooms}BR • {property.bathrooms}BA
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <Badge variant="outline" className="text-xs">
                {property.propertyType}
              </Badge>
              <Badge variant="default" className="text-xs">
                Trending
              </Badge>
            </div>

            {property.amenities && property.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {property.amenities.slice(0, 3).map((amenity: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
                {property.amenities.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{property.amenities.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const PropertyCard: React.FC<{ 
    rec: PropertyRecommendation; 
    showReason?: boolean;
    onInteraction?: (type: 'click' | 'view') => void;
  }> = ({ rec, showReason = true, onInteraction }) => {
    const handleClick = () => {
      onInteraction?.('click');
      trackInteraction(rec.property.id, 'click');
    };

    const handleView = () => {
      onInteraction?.('view');
      trackInteraction(rec.property.id, 'view');
    };

    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
        <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
          {rec.property.images && rec.property.images.length > 0 ? (
            <img 
              src={rec.property.images[0]} 
              alt={rec.property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No image available
            </div>
          )}
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg font-semibold line-clamp-1">
              {rec.property.title}
            </CardTitle>
            <Badge variant="secondary" className="ml-2">
              {rec.score}
            </Badge>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-1" />
            {rec.property.city}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-primary">
                {formatPrice(rec.property.price)}
              </span>
              <div className="text-sm text-muted-foreground">
                {rec.property.bedrooms}BR • {rec.property.bathrooms}BA
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <Badge variant="outline" className="text-xs">
                {rec.property.propertyType}
              </Badge>
              <Badge 
                variant={rec.type === 'better_value' ? 'default' : 'outline'} 
                className="text-xs"
              >
                {rec.type.replace('_', ' ')}
              </Badge>
            </div>

            {showReason && (
              <p className="text-sm text-muted-foreground italic">
                {rec.reason}
              </p>
            )}

            {rec.property.amenities && rec.property.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {rec.property.amenities.slice(0, 3).map((amenity: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
                {rec.property.amenities.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{rec.property.amenities.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleView();
                }}
              >
                <Eye className="w-4 h-4 mr-1" />
                View Details
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  // Add to favorites logic would go here
                }}
              >
                <Heart className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (personalizedLoading && trendingLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Sparkles className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">AI Property Recommendations</h2>
          <p className="text-muted-foreground">
            Personalized suggestions based on your preferences and behavior
          </p>
        </div>
      </div>

      {personalizedRecs?.insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2" />
              AI Market Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">{personalizedRecs.insights.marketTrends}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{personalizedRecs.insights.totalRecommendations}</div>
                  <div className="text-sm text-gray-600">Total Recommendations</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{personalizedRecs.insights.bestValueCount}</div>
                  <div className="text-sm text-gray-600">Best Value Properties</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{personalizedRecs.insights.averageSavings}%</div>
                  <div className="text-sm text-gray-600">Average Savings</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personalized" className="flex items-center">
            <Sparkles className="w-4 h-4 mr-1" />
            For You
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center">
            <TrendingUp className="w-4 h-4 mr-1" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="value" className="flex items-center">
            <DollarSign className="w-4 h-4 mr-1" />
            Best Value
          </TabsTrigger>
          <TabsTrigger value="premium" className="flex items-center">
            <Heart className="w-4 h-4 mr-1" />
            Premium
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personalized" className="space-y-6">
          {personalizedRecs ? (
            <div className="space-y-8">
              {/* Similar Properties */}
              {personalizedRecs?.similar && personalizedRecs.similar.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
                    Similar to Your Interests ({personalizedRecs.similar.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {personalizedRecs.similar.map((rec, index) => (
                      <PropertyCard key={`similar-${index}`} rec={rec} />
                    ))}
                  </div>
                </div>
              )}

              {/* Better Value */}
              {personalizedRecs?.betterValue && personalizedRecs.betterValue.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                    Better Value Deals ({personalizedRecs.betterValue.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {personalizedRecs.betterValue.map((rec, index) => (
                      <PropertyCard key={`value-${index}`} rec={rec} />
                    ))}
                  </div>
                </div>
              )}

              {/* Upgrades */}
              {personalizedRecs?.upgrades && personalizedRecs.upgrades.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-purple-500" />
                    Premium Upgrades ({personalizedRecs.upgrades.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {personalizedRecs.upgrades.map((rec, index) => (
                      <PropertyCard key={`upgrade-${index}`} rec={rec} />
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Areas */}
              {personalizedRecs?.alternativeAreas && personalizedRecs.alternativeAreas.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-orange-500" />
                    Alternative Areas ({personalizedRecs.alternativeAreas.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {personalizedRecs.alternativeAreas.map((rec, index) => (
                      <PropertyCard key={`alt-${index}`} rec={rec} />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {(!personalizedRecs?.similar?.length && 
                !personalizedRecs?.betterValue?.length && 
                !personalizedRecs?.upgrades?.length && 
                !personalizedRecs?.alternativeAreas?.length) && (
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    Start exploring to get recommendations
                  </h3>
                  <p className="text-muted-foreground">
                    View and favorite some properties to get personalized suggestions
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading personalized recommendations...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          {trendingRecs && Array.isArray(trendingRecs.trendingProperties) ? (
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-red-500" />
                Trending Properties ({trendingRecs.count || trendingRecs.trendingProperties.length})
              </h3>
              {trendingRecs.message && (
                <p className="text-muted-foreground mb-6">{trendingRecs.message}</p>
              )}
              {trendingRecs.trendingProperties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trendingRecs.trendingProperties.map((property, index) => (
                    <TrendingPropertyCard key={`trending-${index}`} property={property} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No trending properties available</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading trending properties...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="value" className="space-y-4">
          {personalizedRecs?.betterValue && personalizedRecs.betterValue.length > 0 ? (
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                Best Value Properties
              </h3>
              <div className="grid grid-cols-1 gap-6">
                {personalizedRecs.betterValue.map((rec, index) => (
                  <BestValuePropertyCard key={`value-focus-${index}`} rec={rec} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No better value properties found</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="premium" className="space-y-4">
          {personalizedRecs?.upgrades && personalizedRecs.upgrades.length > 0 ? (
            <div>
              <h3 className="text-xl font-semibent mb-4 flex items-center">
                <Heart className="w-5 h-5 mr-2 text-purple-500" />
                Premium Properties
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {personalizedRecs.upgrades.map((rec, index) => (
                  <PropertyCard key={`premium-focus-${index}`} rec={rec} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No premium upgrades available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* User Preferences Debug Info */}
      {userPreferences && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Your Learning Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium">Property Types:</p>
                <p className="text-muted-foreground">
                  {userPreferences.preferences.preferredPropertyTypes.join(', ') || 'Learning...'}
                </p>
              </div>
              <div>
                <p className="font-medium">Budget Range:</p>
                <p className="text-muted-foreground">
                  {formatPrice(userPreferences.preferences.priceRange.min.toString())} - {formatPrice(userPreferences.preferences.priceRange.max.toString())}
                </p>
              </div>
              <div>
                <p className="font-medium">Bedrooms:</p>
                <p className="text-muted-foreground">
                  {userPreferences.preferences.preferredBedrooms.join(', ') || 'Any'}
                </p>
              </div>
              <div>
                <p className="font-medium">Areas:</p>
                <p className="text-muted-foreground">
                  {userPreferences.preferences.preferredAreas.join(', ') || 'Learning...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PropertyRecommendations;