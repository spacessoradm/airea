import { useEffect, useRef, useState } from "react";
import { Wrapper } from "@googlemaps/react-wrapper";
import { MapPin, Loader2 } from "lucide-react";

interface GoogleMapPickerProps {
  center: [number, number]; // [lat, lng]
  marker?: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  className?: string;
}

function MapComponent({ center, marker, onMapClick }: GoogleMapPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerInstance, setMarkerInstance] = useState<google.maps.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new google.maps.Map(ref.current, {
        center: { lat: center[0], lng: center[1] },
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // Add click listener
      newMap.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          onMapClick(e.latLng.lat(), e.latLng.lng());
        }
      });

      setMap(newMap);
    }
  }, [ref, map]);

  // Update center when it changes
  useEffect(() => {
    if (map) {
      map.setCenter({ lat: center[0], lng: center[1] });
    }
  }, [map, center]);

  // Update marker
  useEffect(() => {
    if (map) {
      // Remove old marker
      if (markerInstance) {
        markerInstance.setMap(null);
      }

      // Add new marker if exists
      if (marker) {
        const newMarker = new google.maps.Marker({
          position: { lat: marker.lat, lng: marker.lng },
          map: map,
          title: "Property Location",
          animation: google.maps.Animation.DROP,
        });
        setMarkerInstance(newMarker);
      } else {
        setMarkerInstance(null);
      }
    }
  }, [map, marker]);

  return <div ref={ref} className="w-full h-full" />;
}

export default function GoogleMapPicker({ center, marker, onMapClick, className = "" }: GoogleMapPickerProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  if (!apiKey) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Google Maps API key not configured</p>
        </div>
      </div>
    );
  }

  const render = (status: string) => {
    if (status === "LOADING") {
      return (
        <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      );
    }
    if (status === "FAILURE") {
      return (
        <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
          <div className="text-center p-8">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="text-red-600">Failed to load Google Maps</p>
          </div>
        </div>
      );
    }
    return <div />;
  };

  return (
    <div className={className}>
      <Wrapper apiKey={apiKey} render={render}>
        <MapComponent center={center} marker={marker} onMapClick={onMapClick} />
      </Wrapper>
    </div>
  );
}
