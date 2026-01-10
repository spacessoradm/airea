import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Search, CheckCircle, AlertCircle } from "lucide-react";
import LeafletMap from "./LeafletMap";

interface PropertyMapPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; displayAddress?: string }) => void;
  initialLocation?: { lat: number; lng: number; address: string; displayAddress?: string };
  className?: string;
}

export default function PropertyMapPicker({ 
  onLocationSelect, 
  initialLocation, 
  className = "" 
}: PropertyMapPickerProps) {
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
    initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : null
  );
  const [searchInput, setSearchInput] = useState(initialLocation?.displayAddress || initialLocation?.address || "");
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; address: string; displayAddress?: string } | null>(initialLocation || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle map click to select location
  const handleMapClick = async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use reverse geocoding to get address
      const response = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
      const data = await response.json();
      
      const address = data.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      const location = { lat, lng, address, displayAddress: address };
      
      setSelectedLocation(location);
      setSelectedCoords({ lat, lng });
      setSearchInput(address);
      onLocationSelect(location);
    } catch (err) {
      setError("Failed to get address for selected location");
      // Still allow selection with coordinates
      const location = { 
        lat, 
        lng, 
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        displayAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      };
      setSelectedLocation(location);
      setSelectedCoords({ lat, lng });
      onLocationSelect(location);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input
  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(searchInput)}`);
      const data = await response.json();
      
      if (data.lat && data.lng) {
        const location = {
          lat: data.lat,
          lng: data.lng,
          address: data.address || searchInput,
          displayAddress: data.displayAddress || data.address || searchInput
        };
        
        setSelectedLocation(location);
        setSelectedCoords({ lat: data.lat, lng: data.lng });
        onLocationSelect(location);
      } else {
        setError("Location not found. Please try a different search term.");
      }
    } catch (err) {
      setError("Failed to search for location");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Select Property Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="location-search">Search for Location</Label>
            <div className="flex gap-2">
              <Input
                id="location-search"
                placeholder="Enter address or location name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch}
                disabled={isLoading || !searchInput.trim()}
                className="px-4"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Map */}
          <div className="h-96 w-full border rounded-lg overflow-hidden">
            <LeafletMap
              properties={[]}
              height="100%"
              center={selectedCoords || { lat: 3.1390, lng: 101.6869 }} // Default to KL
              zoom={15}
              onMapClick={handleMapClick}
              showMarkerAt={selectedCoords}
            />
          </div>

          {/* Selected Location Info */}
          {selectedLocation && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 font-medium">
                <CheckCircle className="w-4 h-4" />
                Location Selected
              </div>
              <div className="text-sm text-green-700 mt-1">
                {selectedLocation.displayAddress || selectedLocation.address}
              </div>
              <div className="text-xs text-green-600 mt-1">
                Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </div>
            </div>
          )}

          {/* Confirm Button */}
          {selectedLocation && (
            <Button 
              onClick={handleConfirm}
              className="w-full"
              disabled={isLoading}
            >
              Confirm Location
            </Button>
          )}

          {/* Instructions */}
          <div className="text-sm text-gray-600">
            <p>• Search for a location using the search box above</p>
            <p>• Or click directly on the map to select a location</p>
            <p>• The selected coordinates will be used for your property listing</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}