import React, { useEffect, useState } from 'react';
import LeafletMap from './LeafletMap';
import type { Property } from "@shared/schema";

interface PropertyMapNewProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
  searchLocation?: { lat: number; lng: number; name: string } | null;
}

export default function PropertyMapNew({ 
  properties, 
  onPropertyClick,
  searchLocation
}: PropertyMapNewProps) {
  return (
    <div className="h-full w-full">
      <LeafletMap
        properties={properties}
        onPropertyClick={onPropertyClick}
        searchLocation={searchLocation}
        height="100%"
      />
    </div>
  );
}