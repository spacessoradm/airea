import React, { memo } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Bed, Bath, Square, Star, Heart } from "lucide-react";
import { LazyImage } from './LazyImage';
import { SmartPropertyTooltip } from './SmartPropertyTooltip';
import { getPropertyTypeDisplayName } from '@shared/propertyTypes';
import type { Property } from '@shared/schema';

interface PropertyCardProps {
  property: Property & { agent?: any };
  onPropertyClick: (property: Property) => void;
  onFavoriteClick?: (propertyId: string) => void;
  isFavorited?: boolean;
}

// Memoized component to prevent unnecessary re-renders
export const PropertyCardOptimized = memo(function PropertyCard({ 
  property, 
  onPropertyClick, 
  onFavoriteClick,
  isFavorited = false 
}: PropertyCardProps) {
  const handleClick = () => onPropertyClick(property);
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteClick?.(property.id);
  };

  // Format price efficiently
  const formattedPrice = `RM ${Number(property.price).toLocaleString()}${
    property.listingType === 'rent' ? '/month' : ''
  }`;

  return (
    <SmartPropertyTooltip property={property}>
      <Card 
        className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] bg-white border-gray-200"
        onClick={handleClick}
        data-testid={`card-property-${property.id}`}
      >
      <div className="relative overflow-hidden rounded-t-lg">
        <LazyImage
          src={property.images?.[0] || '/placeholder-property.jpg'}
          alt={property.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Quick action buttons */}
        <div className="absolute top-3 right-3 flex gap-2">
          {property.featured && (
            <Badge className="bg-yellow-500 text-white px-2 py-1 text-xs">
              Featured
            </Badge>
          )}
          <button
            onClick={handleFavoriteClick}
            className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
            data-testid={`button-favorite-${property.id}`}
          >
            <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Property type badge */}
        <div className="absolute bottom-3 left-3">
          <Badge variant="secondary" className="bg-white/90 text-gray-800">
            {getPropertyTypeDisplayName(property.propertyType)}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Title and Price */}
          <div className="space-y-1">
            <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">
              {property.title}
            </h3>
            <p className="text-2xl font-bold text-blue-600">
              {formattedPrice}
            </p>
          </div>

          {/* Location */}
          <div className="flex items-center text-gray-600 text-sm">
            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="line-clamp-1">{property.address}</span>
          </div>

          {/* Property details */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Bed className="h-4 w-4 mr-1" />
                <span>{property.bedrooms}</span>
              </div>
              <div className="flex items-center">
                <Bath className="h-4 w-4 mr-1" />
                <span>{property.bathrooms}</span>
              </div>
              {property.squareFeet && (
                <div className="flex items-center">
                  <Square className="h-4 w-4 mr-1" />
                  <span>{property.squareFeet} sqft</span>
                </div>
              )}
            </div>
            
            {/* Rating if available */}
            {property.agent?.rating && (
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                <span>{property.agent.rating}</span>
              </div>
            )}
          </div>

          {/* Agent info */}
          {property.agent && (
            <div className="flex items-center justify-between pt-2 border-t">
              <Link 
                href={`/agents/${property.agent.id || property.agentId}`}
                className="flex items-center space-x-2 hover:opacity-75 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    {(property.agent.nickname || property.agent.name)?.[0]?.toUpperCase() || 'A'}
                  </span>
                </div>
                <span className="text-sm text-gray-600 hover:underline">{property.agent.nickname || property.agent.name}</span>
              </Link>
              <Button size="sm" variant="outline" className="text-xs">
                Contact
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </SmartPropertyTooltip>
  );
});

export default PropertyCardOptimized;