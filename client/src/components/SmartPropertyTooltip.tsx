import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, DollarSign, MapPin, Star, Users, Clock, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Property } from '@shared/schema';

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
  marketComparison?: {
    marketMedian: number;
    actualPrice: number;
    savingsAmount: number;
    savingsPercent: number;
  };
}

interface SmartTooltipData {
  priceInsight: {
    compared_to_market: 'below' | 'above' | 'fair';
    percentage_diff: number;
    market_median: number;
  };
  locationInsights: {
    transport_access: string[];
    nearby_amenities: string[];
    growth_potential: 'high' | 'medium' | 'low';
  };
  similarProperties: PropertyRecommendation[];
  marketTrends: {
    demand_level: 'high' | 'medium' | 'low';
    price_trend: 'rising' | 'stable' | 'falling';
    investment_score: number;
  };
  personalizedInsights: {
    match_score: number;
    reasons: string[];
    recommendations: string[];
  };
}

interface SmartPropertyTooltipProps {
  property: Property;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SmartPropertyTooltip({ property, children, disabled = false }: SmartPropertyTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDelay, setShowDelay] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Fetch smart tooltip data when hovered
  const { data: tooltipData, isLoading } = useQuery<SmartTooltipData>({
    queryKey: ['/api/recommendations/tooltip', property.id],
    enabled: isHovered && !disabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Add 1 second delay before showing tooltip
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isHovered) {
      timer = setTimeout(() => setShowDelay(true), 1000);
    } else {
      setShowDelay(false);
    }
    return () => clearTimeout(timer);
  }, [isHovered]);

  // Track mouse position for cursor-following tooltip
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  if (disabled) {
    return <>{children}</>;
  }

  const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseInt(price) : price;
    if (num >= 1000000) return `RM ${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `RM ${(num / 1000).toFixed(0)}K`;
    return `RM ${num.toLocaleString()}`;
  };

  const getPriceInsightColor = (comparison: 'below' | 'above' | 'fair') => {
    switch (comparison) {
      case 'below': return 'text-green-600';
      case 'above': return 'text-red-600';
      case 'fair': return 'text-blue-600';
    }
  };

  const getTrendIcon = (trend: 'rising' | 'stable' | 'falling') => {
    switch (trend) {
      case 'rising': return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'stable': return <DollarSign className="h-3 w-3 text-blue-600" />;
      case 'falling': return <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />;
    }
  };

  const renderTooltipContent = () => {
    if (isLoading) {
      return (
        <div className="w-72 p-3">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      );
    }

    if (!tooltipData) {
      return (
        <div className="w-72 p-3 text-center text-gray-500 text-sm">
          Analyzing property insights...
        </div>
      );
    }

    return (
      <div className="w-80 max-w-sm">
        {/* Header */}
        <div className="border-b border-gray-100 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="font-medium text-sm">Smart Insights</span>
            <Badge variant="secondary" className="text-xs">
              AI Powered
            </Badge>
          </div>
        </div>

        {/* Price Analysis */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-3 w-3" />
              <span className="text-xs font-medium">Market Position</span>
            </div>
            <div className={`text-xs font-semibold ${getPriceInsightColor(tooltipData.priceInsight.compared_to_market)}`}>
              {tooltipData.priceInsight.percentage_diff > 0 ? '+' : ''}
              {tooltipData.priceInsight.percentage_diff}% vs market
            </div>
          </div>

          {/* Match Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-3 w-3" />
              <span className="text-xs font-medium">Your Match</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="text-xs font-semibold text-purple-600">
                {tooltipData.personalizedInsights.match_score}%
              </div>
              <div className="w-16 bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-purple-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${tooltipData.personalizedInsights.match_score}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Market Trends */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getTrendIcon(tooltipData.marketTrends.price_trend)}
              <span className="text-xs font-medium">Market Trend</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge 
                variant={tooltipData.marketTrends.demand_level === 'high' ? 'default' : 'secondary'} 
                className="text-xs"
              >
                {tooltipData.marketTrends.demand_level} demand
              </Badge>
            </div>
          </div>

          {/* Location Highlights */}
          {tooltipData.locationInsights.transport_access.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-3 w-3" />
                <span className="text-xs font-medium">Transport Access</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {tooltipData.locationInsights.transport_access.slice(0, 2).map((transport, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {transport}
                  </Badge>
                ))}
                {tooltipData.locationInsights.transport_access.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{tooltipData.locationInsights.transport_access.length - 2} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Top Personalized Insight */}
          {tooltipData.personalizedInsights.reasons.length > 0 && (
            <div className="bg-blue-50 p-2 rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-900">Why This Matches You</span>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                {tooltipData.personalizedInsights.reasons[0]}
              </p>
            </div>
          )}

          {/* Similar Properties Count */}
          {tooltipData.similarProperties.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Similar properties found</span>
                <Badge variant="outline">
                  {tooltipData.similarProperties.length} matches
                </Badge>
              </div>
            </div>
          )}

          {/* Investment Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs font-medium">Investment Potential</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="text-xs font-semibold text-green-600">
                {tooltipData.marketTrends.investment_score}/10
              </div>
              <div className="w-12 bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-green-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${(tooltipData.marketTrends.investment_score / 10) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-2 mt-3">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>Updated moments ago</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
        className="cursor-pointer"
      >
        {children}
      </div>
      
      {/* Cursor-following tooltip */}
      {isHovered && showDelay && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: `${mousePosition.x + 15}px`,
            top: `${mousePosition.y + 15}px`,
          }}
        >
          <Card className="border shadow-2xl bg-white w-80 max-w-sm">
            <CardContent className="p-3">
              {renderTooltipContent()}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export default SmartPropertyTooltip;