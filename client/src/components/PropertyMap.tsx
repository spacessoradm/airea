import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import OpenStreetMap from './OpenStreetMap';
import type { Property } from "@shared/schema";

interface PropertyMapProps {
  properties: Property[];
  loading?: boolean;
  selectedProperty?: Property | null;
  onPropertySelect?: (property: Property) => void;
}

// Real map implementation using OpenStreetMap/Leaflet
export default function PropertyMap({ 
  properties, 
  loading = false, 
  selectedProperty, 
  onPropertySelect 
}: PropertyMapProps) {
  const [mapCenter] = useState({ lat: 3.139, lng: 101.6869 }); // Kuala Lumpur
  const [zoomLevel] = useState(12);

  if (loading) {
    return (
      <Card className="h-96">
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading map...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <Card className="overflow-hidden">
        <OpenStreetMap
          properties={properties}
          selectedProperty={selectedProperty}
          onPropertySelect={onPropertySelect}
          center={mapCenter}
          zoom={zoomLevel}
          height="400px"
        />
      </Card>
    </div>
  );
}