import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Filter } from "lucide-react";

interface PropertyFilters {
  propertyType?: string[];
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  city?: string;
  amenities?: string[];
  sortBy?: string;
}

interface FilterSidebarProps {
  filters: PropertyFilters;
  onFiltersChange: (filters: PropertyFilters) => void;
}

const propertyTypes = [
  { id: "apartment", label: "Apartment" },
  { id: "condominium", label: "Condominium" },
  { id: "house", label: "House" },
  { id: "studio", label: "Studio" },
  { id: "townhouse", label: "Townhouse" },
];

const malaysianCities = [
  "All Areas",
  "Kuala Lumpur",
  "KLCC",
  "Mont Kiara",
  "Bangsar",
  "Petaling Jaya",
  "Shah Alam",
  "Subang Jaya",
  "Cyberjaya",
  "Putrajaya",
  "Ampang",
  "Cheras",
  "Kepong",
  "Sentul",
];

const commonAmenities = [
  { id: "swimming pool", label: "Swimming Pool" },
  { id: "gym", label: "Gym" },
  { id: "parking", label: "Parking" },
  { id: "security", label: "Security" },
  { id: "wifi", label: "WiFi" },
  { id: "air conditioning", label: "Air Conditioning" },
  { id: "laundry", label: "Laundry" },
  { id: "balcony", label: "Balcony" },
  { id: "garden", label: "Garden" },
  { id: "playground", label: "Playground" },
];

const bedroomOptions = ["Any", "1", "2", "3", "4+"];

export default function FilterSidebar({ filters, onFiltersChange }: FilterSidebarProps) {
  const [localFilters, setLocalFilters] = useState<PropertyFilters>(filters);
  const [priceRange, setPriceRange] = useState([
    filters.minPrice || 500,
    filters.maxPrice || 10000
  ]);

  useEffect(() => {
    setLocalFilters(filters);
    setPriceRange([
      filters.minPrice || 500,
      filters.maxPrice || 10000
    ]);
  }, [filters]);

  const handlePropertyTypeChange = (typeId: string, checked: boolean) => {
    const currentTypes = localFilters.propertyType || [];
    const newTypes = checked
      ? [...currentTypes, typeId]
      : currentTypes.filter(t => t !== typeId);
    
    const newFilters = { ...localFilters, propertyType: newTypes };
    setLocalFilters(newFilters);
  };

  const handleAmenityChange = (amenityId: string, checked: boolean) => {
    const currentAmenities = localFilters.amenities || [];
    const newAmenities = checked
      ? [...currentAmenities, amenityId]
      : currentAmenities.filter(a => a !== amenityId);
    
    const newFilters = { ...localFilters, amenities: newAmenities };
    setLocalFilters(newFilters);
  };

  const handleBedroomSelect = (bedrooms: string) => {
    const bedroomCount = bedrooms === "Any" ? undefined : 
                        bedrooms === "4+" ? 4 : parseInt(bedrooms);
    const newFilters = { ...localFilters, bedrooms: bedroomCount };
    setLocalFilters(newFilters);
  };

  const handlePriceRangeChange = (value: number[]) => {
    setPriceRange(value);
    const newFilters = {
      ...localFilters,
      minPrice: value[0],
      maxPrice: value[1]
    };
    setLocalFilters(newFilters);
  };

  const handleCityChange = (city: string) => {
    const selectedCity = city === "All Areas" ? undefined : city;
    const newFilters = { ...localFilters, city: selectedCity };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  const clearFilters = () => {
    const emptyFilters: PropertyFilters = {};
    setLocalFilters(emptyFilters);
    setPriceRange([500, 10000]);
    onFiltersChange(emptyFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.propertyType?.length) count++;
    if (localFilters.minPrice !== undefined || localFilters.maxPrice !== undefined) count++;
    if (localFilters.city) count++;
    if (localFilters.bedrooms !== undefined) count++;
    if (localFilters.amenities?.length) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className="sticky top-24">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <CardTitle className="text-lg">Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Property Type */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Property Type
          </Label>
          <div className="space-y-3">
            {propertyTypes.map((type) => (
              <div key={type.id} className="flex items-center space-x-2">
                <Checkbox
                  id={type.id}
                  checked={localFilters.propertyType?.includes(type.id) || false}
                  onCheckedChange={(checked) => 
                    handlePropertyTypeChange(type.id, checked as boolean)
                  }
                />
                <Label htmlFor={type.id} className="text-sm text-gray-700 cursor-pointer">
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Price Range */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Price Range (RM)
          </Label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Input
              type="number"
              placeholder="Min"
              value={priceRange[0]}
              onChange={(e) => {
                const newMin = parseInt(e.target.value) || 500;
                setPriceRange([newMin, priceRange[1]]);
              }}
              className="text-sm"
            />
            <Input
              type="number"
              placeholder="Max"
              value={priceRange[1]}
              onChange={(e) => {
                const newMax = parseInt(e.target.value) || 10000;
                setPriceRange([priceRange[0], newMax]);
              }}
              className="text-sm"
            />
          </div>
          <div className="px-2">
            <Slider
              value={priceRange}
              onValueChange={handlePriceRangeChange}
              max={15000}
              min={500}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>RM500</span>
              <span>RM15,000</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Location */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Location
          </Label>
          <Select
            value={localFilters.city || "All Areas"}
            onValueChange={handleCityChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {malaysianCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Bedrooms */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Bedrooms
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {bedroomOptions.map((option) => {
              const isSelected = option === "Any" 
                ? localFilters.bedrooms === undefined
                : option === "4+" 
                ? localFilters.bedrooms === 4
                : localFilters.bedrooms === parseInt(option);

              return (
                <Button
                  key={option}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleBedroomSelect(option)}
                  className="text-sm"
                >
                  {option}
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Amenities */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Amenities
          </Label>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {commonAmenities.map((amenity) => (
              <div key={amenity.id} className="flex items-center space-x-2">
                <Checkbox
                  id={amenity.id}
                  checked={localFilters.amenities?.includes(amenity.id) || false}
                  onCheckedChange={(checked) => 
                    handleAmenityChange(amenity.id, checked as boolean)
                  }
                />
                <Label htmlFor={amenity.id} className="text-sm text-gray-700 cursor-pointer">
                  {amenity.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Apply Filters Button */}
        <Button 
          onClick={applyFilters}
          className="w-full"
          size="lg"
        >
          Apply Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
