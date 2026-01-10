import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PropertyCard from '@/components/PropertyCard';
import LeafletMap from '@/components/LeafletMap';
import { List, Map, MapPin, MessageCircle } from 'lucide-react';
import { useChatContext } from '@/contexts/ChatContext';
import type { Property, Agent } from '@shared/schema';

// Extended property type for search results that may include distance/travel time
type SearchProperty = Property & { 
  agent: Agent;
  distance?: number;
  estimatedTravelTime?: number;
};

interface PropertySearchResultsProps {
  properties: SearchProperty[];
  count: number;
  isLoading?: boolean;
  searchLocation?: { lat: number; lng: number; name: string };
}

export default function PropertySearchResults({
  properties,
  count,
  isLoading = false,
  searchLocation
}: PropertySearchResultsProps) {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const { openChat } = useChatContext();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">
            {count} Properties Found
          </h2>
          {searchLocation && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Near {searchLocation.name}
            </Badge>
          )}
        </div>
        
        {/* View Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="flex items-center gap-2"
          >
            <List className="w-4 h-4" />
            List
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('map')}
            className="flex items-center gap-2"
          >
            <Map className="w-4 h-4" />
            Map
          </Button>
        </div>
      </div>

      {/* Results Content */}
      {count === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-6">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No properties found</h3>
            <p className="mb-6">Try adjusting your search criteria or expanding your search area.</p>
          </div>
          
          {/* Ask AI Assistant Button */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
            <h4 className="text-blue-900 font-medium mb-2">Need help with your search?</h4>
            <p className="text-blue-700 text-sm mb-4">
              Our AI assistant can help you find properties, suggest areas, or provide market insights.
            </p>
            <Button
              onClick={openChat}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg flex items-center gap-2 mx-auto"
              data-testid="button-ask-ai-assistant"
            >
              <MessageCircle className="w-4 h-4" />
              Ask AI Assistant
            </Button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
            />
          ))}
        </div>
      ) : (
        <div className="h-[600px] bg-gray-100 rounded-lg overflow-hidden">
          <LeafletMap
            properties={properties as any}
            searchLocation={searchLocation}
            height="100%"
          />
        </div>
      )}
    </div>
  );
}