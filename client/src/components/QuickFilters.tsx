import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { PropertyTypeModal } from "./PropertyTypeModal"
import { X, MapPin, Home, Bed, Bath, Car, Building, Factory, TreePine, Filter, ChevronDown, ChevronUp, Maximize, Search } from "lucide-react"

interface PropertyFilters {
  propertyType?: string[]
  userSelectedPropertyTypes?: string[] // User's explicit selections (for UI count display)
  listingType?: string
  minPrice?: number
  maxPrice?: number
  minSquareFeet?: number
  maxSquareFeet?: number
  bedrooms?: number
  bathrooms?: number
  city?: string
  location?: string
  parking?: number
  amenities?: string[]
  sortBy?: string
  searchType?: 'building' | 'general'
  tenure?: string[]
  titleType?: string[]
  landTitleType?: string[]
}

interface QuickFiltersProps {
  filters: PropertyFilters
  onFiltersChange: (filters: PropertyFilters) => void
  onApplyFilters?: (filters: PropertyFilters) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  hasSearched?: boolean
}

// Import property types from shared module
import { getPropertyTypesByCategory, getPropertyTypeDisplayName } from "../../../shared/propertyTypes"

// Property type categories with actual database property types
const propertyCategories = {
  residential: {
    label: "Residential",
    icon: Home,
    types: getPropertyTypesByCategory('residential').map(p => ({ 
      value: p.type, 
      label: p.displayName 
    }))
  },
  commercial: {
    label: "Commercial",
    icon: Building,
    types: getPropertyTypesByCategory('commercial').map(p => ({ 
      value: p.type, 
      label: p.displayName 
    }))
  },
  industrial: {
    label: "Industrial",
    icon: Factory,
    types: getPropertyTypesByCategory('industrial').map(p => ({ 
      value: p.type, 
      label: p.displayName 
    }))
  },
  land: {
    label: "Land",
    icon: TreePine,
    types: getPropertyTypesByCategory('land').map(p => ({ 
      value: p.type, 
      label: p.displayName 
    }))
  }
}

// Price range configurations
const rentPriceConfig = {
  min: 0,
  max: 50000,
  step: 250,
  defaultRange: [1000, 5000]
};

const salePriceConfig = {
  min: 0,
  max: 20000000,
  step: 50000,
  defaultRange: [300000, 1500000]
};

// Square footage configuration
const squareFeetConfig = {
  min: 300,
  max: 5000,
  step: 50,
  defaultRange: [300, 5000]
};

const popularLocations = [
  "Kuala Lumpur", "Petaling Jaya", "Subang Jaya", "Mont Kiara", 
  "KLCC", "Bangsar", "Damansara", "Shah Alam", "Johor Bahru", "Penang"
]

// Helper function to get all property types from all categories
const getAllPropertyTypes = () => {
  return Object.values(propertyCategories).flatMap(category => category.types)
}

export function QuickFilters({ 
  filters, 
  onFiltersChange,
  onApplyFilters,
  isCollapsed = false, 
  onToggleCollapse, 
  hasSearched = false 
}: QuickFiltersProps) {
  const [isPropertyTypeModalOpen, setIsPropertyTypeModalOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<PropertyFilters>(filters)
  
  // Update local filters when props change (e.g., from AI search)
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);
  
  const updateFilter = (key: keyof PropertyFilters, value: any) => {
    setLocalFilters({ ...localFilters, [key]: value })
  }
  
  const handleApplyFilters = () => {
    console.log('🟦 QuickFilters handleApplyFilters called with localFilters:', localFilters);
    if (onApplyFilters) {
      console.log('🟦 Calling onApplyFilters prop function');
      onApplyFilters(localFilters);
    } else {
      console.log('🟦 Calling onFiltersChange prop function');
      onFiltersChange(localFilters);
    }
  }

  // Price input handlers - replaced slider with separate inputs

  // Reset price range when switching between rent and sale
  useEffect(() => {
    if (localFilters.listingType) {
      const newPriceConfig = localFilters.listingType === 'sale' ? salePriceConfig : rentPriceConfig;
      
      // Only reset if current prices are way outside the new range
      const isWayOutsideRange = localFilters.minPrice && localFilters.maxPrice && (
        localFilters.maxPrice < newPriceConfig.min || 
        localFilters.minPrice > newPriceConfig.max ||
        Math.abs(localFilters.maxPrice - localFilters.minPrice) > (newPriceConfig.max - newPriceConfig.min)
      );
      
      if (isWayOutsideRange) {
        setLocalFilters(prev => ({
          ...prev,
          minPrice: undefined,
          maxPrice: undefined
        }));
      }
    }
  }, [localFilters.listingType]);

  // Get current price config based on listing type
  const priceConfig = localFilters.listingType === 'sale' ? salePriceConfig : rentPriceConfig;

  const clearFilter = (key: keyof PropertyFilters) => {
    const newFilters = { ...localFilters }
    delete newFilters[key]
    setLocalFilters(newFilters)
  }

  const clearPriceRange = () => {
    const newFilters = { ...localFilters }
    delete newFilters.minPrice
    delete newFilters.maxPrice
    setLocalFilters(newFilters)
  }

  const clearSquareFeetRange = () => {
    const newFilters = { ...localFilters }
    delete newFilters.minSquareFeet
    delete newFilters.maxSquareFeet
    setLocalFilters(newFilters)
  }

  const clearAllFilters = () => {
    setLocalFilters({ listingType: "rent" }) // Keep default listing type
  }

  const activeFiltersCount = Object.entries(localFilters).filter(([key, value]) => {
    if (key === "sortBy" || key === "listingType") return false
    if (value === undefined || value === "") return false
    if (Array.isArray(value) && value.length === 0) return false
    return true
  }).length

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Quick Filters</h3>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-500 hover:text-gray-700"
              data-testid="button-clear-all-filters"
            >
              Clear All ({activeFiltersCount})
            </Button>
          )}
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="text-gray-500 hover:text-gray-700"
              data-testid="button-toggle-filters-collapse"
              title={isCollapsed ? "Expand filters" : "Collapse filters"}
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-6">
          {/* Section 1: Basic Search */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">Basic Search</h4>
            
            {/* Property Categories */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 mb-2 block">Property Categories</label>
              <div className="h-20 overflow-y-auto border border-gray-100 rounded-lg p-3 bg-gray-50">
                <div className="flex flex-wrap gap-2 h-full items-start content-start">
                  {Object.entries(propertyCategories).map(([categoryKey, category]) => {
                    const Icon = category.icon
                    const categoryTypes = category.types.map(t => t.value)
                    const selectedInCategory = categoryTypes.filter(type => 
                      localFilters.propertyType?.includes(type)
                    ).length
                    const isActive = selectedInCategory > 0
                    
                    return (
                      <Button
                        key={categoryKey}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (isActive) {
                            const newTypes = (localFilters.propertyType || []).filter(type => 
                              !categoryTypes.includes(type)
                            )
                            updateFilter("propertyType", newTypes.length > 0 ? newTypes : undefined)
                          } else {
                            const currentTypes = localFilters.propertyType || []
                            const newTypes = Array.from(new Set([...currentTypes, ...categoryTypes]))
                            updateFilter("propertyType", newTypes)
                          }
                        }}
                        className="flex items-center gap-2 h-8 text-xs px-3"
                        data-testid={`button-category-${categoryKey}`}
                      >
                        <Icon className="h-3 w-3" />
                        <span className="font-medium">{category.label}</span>
                        {selectedInCategory > 0 && (
                          <Badge variant="secondary" className="text-xs bg-white text-blue-600 h-4 px-1">
                            {selectedInCategory}
                          </Badge>
                        )}
                      </Button>
                    )
                  })}
                </div>
              </div>
              

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPropertyTypeModalOpen(true)}
                className="flex items-center gap-2 w-full justify-start h-10 mt-2"
                data-testid="button-property-type"
              >
                <Filter className="h-4 w-4" />
                Advanced Property Types
                {localFilters.propertyType && localFilters.propertyType.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {localFilters.propertyType.length} selected
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Section 2: Property Details */}
          <div className="space-y-4 mt-6">
            <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">Property Details</h4>
            
            {/* Bedrooms & Bathrooms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Bedrooms</label>
                <Select 
                  value={localFilters.bedrooms?.toString() || "any"} 
                  onValueChange={(value) => updateFilter("bedrooms", value === "any" ? undefined : parseInt(value))}
                >
                  <SelectTrigger className="w-full" data-testid="select-bedrooms">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="1">1 Bedroom</SelectItem>
                    <SelectItem value="2">2 Bedrooms</SelectItem>
                    <SelectItem value="3">3 Bedrooms</SelectItem>
                    <SelectItem value="4">4 Bedrooms</SelectItem>
                    <SelectItem value="5">5+ Bedrooms</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Bathrooms</label>
                <Select 
                  value={localFilters.bathrooms?.toString() || "any"} 
                  onValueChange={(value) => updateFilter("bathrooms", value === "any" ? undefined : parseInt(value))}
                >
                  <SelectTrigger className="w-full" data-testid="select-bathrooms">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="1">1 Bathroom</SelectItem>
                    <SelectItem value="2">2 Bathrooms</SelectItem>
                    <SelectItem value="3">3 Bathrooms</SelectItem>
                    <SelectItem value="4">4+ Bathrooms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price Range */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-medium text-gray-600">
                  Price Range ({localFilters.listingType === 'sale' ? 'RM' : 'RM/month'})
                </label>
                {(localFilters.minPrice || localFilters.maxPrice) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearPriceRange}
                    className="text-xs text-gray-500 hover:text-gray-700 h-auto p-1"
                    data-testid="button-clear-price"
                  >
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Min Price Dropdown */}
                <div className="relative">
                  <select
                    value={localFilters.minPrice || ''}
                    onChange={(e) => setLocalFilters(prev => ({
                      ...prev,
                      minPrice: e.target.value ? parseInt(e.target.value) : undefined
                    }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
                    data-testid="select-min-price"
                  >
                    <option value="">RM Min</option>
                    {localFilters.listingType === 'sale' ? (
                      <>
                        <option value="100000">RM 100k</option>
                        <option value="200000">RM 200k</option>
                        <option value="300000">RM 300k</option>
                        <option value="500000">RM 500k</option>
                        <option value="750000">RM 750k</option>
                        <option value="1000000">RM 1M</option>
                        <option value="1500000">RM 1.5M</option>
                        <option value="2000000">RM 2M</option>
                        <option value="3000000">RM 3M</option>
                        <option value="5000000">RM 5M</option>
                      </>
                    ) : (
                      <>
                        <option value="500">RM 500</option>
                        <option value="1000">RM 1,000</option>
                        <option value="1500">RM 1,500</option>
                        <option value="2000">RM 2,000</option>
                        <option value="2500">RM 2,500</option>
                        <option value="3000">RM 3,000</option>
                        <option value="4000">RM 4,000</option>
                        <option value="5000">RM 5,000</option>
                        <option value="7500">RM 7,500</option>
                        <option value="10000">RM 10,000</option>
                      </>
                    )}
                  </select>
                  {/* Dropdown Arrow */}
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Max Price Dropdown */}
                <div className="relative">
                  <select
                    value={localFilters.maxPrice || ''}
                    onChange={(e) => setLocalFilters(prev => ({
                      ...prev,
                      maxPrice: e.target.value ? parseInt(e.target.value) : undefined
                    }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
                    data-testid="select-max-price"
                  >
                    <option value="">RM Max</option>
                    {localFilters.listingType === 'sale' ? (
                      <>
                        <option value="200000">RM 200k</option>
                        <option value="300000">RM 300k</option>
                        <option value="500000">RM 500k</option>
                        <option value="750000">RM 750k</option>
                        <option value="1000000">RM 1M</option>
                        <option value="1500000">RM 1.5M</option>
                        <option value="2000000">RM 2M</option>
                        <option value="3000000">RM 3M</option>
                        <option value="5000000">RM 5M</option>
                        <option value="10000000">RM 10M</option>
                        <option value="20000000">RM 20M</option>
                      </>
                    ) : (
                      <>
                        <option value="1000">RM 1,000</option>
                        <option value="1500">RM 1,500</option>
                        <option value="2000">RM 2,000</option>
                        <option value="2500">RM 2,500</option>
                        <option value="3000">RM 3,000</option>
                        <option value="4000">RM 4,000</option>
                        <option value="5000">RM 5,000</option>
                        <option value="7500">RM 7,500</option>
                        <option value="10000">RM 10,000</option>
                        <option value="15000">RM 15,000</option>
                        <option value="25000">RM 25,000</option>
                        <option value="50000">RM 50,000</option>
                      </>
                    )}
                  </select>
                  {/* Dropdown Arrow */}
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Parking */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Parking Spaces</label>
              <Select 
                value={localFilters.parking?.toString() || "any"} 
                onValueChange={(value) => updateFilter("parking", value === "any" ? undefined : parseInt(value))}
              >
                <SelectTrigger className="w-full" data-testid="select-parking">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="0">No Parking</SelectItem>
                  <SelectItem value="1">1 Space</SelectItem>
                  <SelectItem value="2">2 Spaces</SelectItem>
                  <SelectItem value="3">3+ Spaces</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 3: Legal Information */}
          <div className="space-y-4 mt-6">
            <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">Legal Information</h4>
            
            {/* Tenure */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-3 block">Tenure</label>
              <div className="flex gap-6">
                {['freehold', 'leasehold'].map((tenure) => (
                  <div key={tenure} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`tenure-${tenure}`}
                      checked={localFilters.tenure?.includes(tenure) || false}
                      onCheckedChange={(checked) => {
                        const current = localFilters.tenure || []
                        if (checked) {
                          updateFilter("tenure", [...current, tenure])
                        } else {
                          updateFilter("tenure", current.filter(t => t !== tenure))
                        }
                      }}
                    />
                    <label 
                      htmlFor={`tenure-${tenure}`} 
                      className="text-sm font-medium text-gray-700 capitalize cursor-pointer"
                    >
                      {tenure}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Title Type */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-3 block">Title Type</label>
              <div className="flex gap-6">
                {['individual', 'strata', 'master'].map((titleType) => (
                  <div key={titleType} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`title-${titleType}`}
                      checked={localFilters.titleType?.includes(titleType) || false}
                      onCheckedChange={(checked) => {
                        const current = localFilters.titleType || []
                        if (checked) {
                          updateFilter("titleType", [...current, titleType])
                        } else {
                          updateFilter("titleType", current.filter(t => t !== titleType))
                        }
                      }}
                    />
                    <label 
                      htmlFor={`title-${titleType}`} 
                      className="text-sm font-medium text-gray-700 capitalize cursor-pointer"
                    >
                      {titleType}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Land Title Type */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-3 block">Land Title Type</label>
              <div className="flex flex-wrap gap-6">
                {['residential', 'commercial', 'industrial', 'agriculture'].map((landType) => (
                  <div key={landType} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`land-${landType}`}
                      checked={localFilters.landTitleType?.includes(landType) || false}
                      onCheckedChange={(checked) => {
                        const current = localFilters.landTitleType || []
                        if (checked) {
                          updateFilter("landTitleType", [...current, landType])
                        } else {
                          updateFilter("landTitleType", current.filter(t => t !== landType))
                        }
                      }}
                    />
                    <label 
                      htmlFor={`land-${landType}`} 
                      className="text-sm font-medium text-gray-700 capitalize cursor-pointer"
                    >
                      {landType}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="pt-6 mt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-gray-600">Active filters:</span>
                
                {localFilters.propertyType && localFilters.propertyType.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {localFilters.propertyType.map(type => 
                      getAllPropertyTypes().find((t: any) => t.value === type)?.label
                    ).join(", ")}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter("propertyType")} />
                  </Badge>
                )}
                
                {localFilters.bedrooms && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Bed className="h-3 w-3" />
                    {localFilters.bedrooms} bed{localFilters.bedrooms !== 1 ? 's' : ''}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter("bedrooms")} />
                  </Badge>
                )}
                
                {localFilters.bathrooms && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Bath className="h-3 w-3" />
                    {localFilters.bathrooms} bath{localFilters.bathrooms !== 1 ? 's' : ''}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter("bathrooms")} />
                  </Badge>
                )}
                
                {(localFilters.minPrice || localFilters.maxPrice) && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    💰 {localFilters.listingType === 'sale' 
                      ? `${localFilters.minPrice ? `RM${(localFilters.minPrice / 1000).toFixed(0)}k` : 'Any'} - ${localFilters.maxPrice ? `RM${(localFilters.maxPrice / 1000).toFixed(0)}k` : 'Any'}`
                      : `${localFilters.minPrice ? `RM${localFilters.minPrice.toLocaleString()}` : 'Any'} - ${localFilters.maxPrice ? `RM${localFilters.maxPrice.toLocaleString()}` : 'Any'}`
                    }
                    <X className="h-3 w-3 cursor-pointer" onClick={() => clearPriceRange()} />
                  </Badge>
                )}

                {localFilters.parking !== undefined && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Car className="h-3 w-3" />
                    {localFilters.parking === 0 ? 'No parking' : `${localFilters.parking} parking`}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter("parking")} />
                  </Badge>
                )}

                {/* Legal Property Filter Badges */}
                {localFilters.tenure && localFilters.tenure.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    🏠 {localFilters.tenure.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter("tenure")} />
                  </Badge>
                )}
                
                {localFilters.titleType && localFilters.titleType.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    📄 {localFilters.titleType.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")} Title
                    <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter("titleType")} />
                  </Badge>
                )}
                
                {localFilters.landTitleType && localFilters.landTitleType.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    🌍 {localFilters.landTitleType.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")} Land
                    <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter("landTitleType")} />
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Apply Filter Button */}
          <div className="pt-6 mt-6 border-t border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                disabled={activeFiltersCount === 0}
                className="text-gray-600 hover:text-gray-800"
              >
                Clear All
              </Button>
              
              <Button
                onClick={() => {
                  console.log('🟦 BUTTON CLICKED - Apply Filters');
                  console.log('🟦 Local Filters:', localFilters);
                  console.log('🟦 onApplyFilters prop exists:', !!onApplyFilters);
                  try {
                    handleApplyFilters();
                    console.log('🟦 handleApplyFilters completed successfully');
                  } catch (error) {
                    console.error('🟦 ERROR in handleApplyFilters:', error);
                  }
                }}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                data-testid="button-apply-filters"
              >
                Apply Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </Button>
            </div>
          </div>
        </div>
      )}

      <PropertyTypeModal
        isOpen={isPropertyTypeModalOpen}
        onClose={() => setIsPropertyTypeModalOpen(false)}
        selectedTypes={localFilters.userSelectedPropertyTypes || localFilters.propertyType || []}
        onApply={(propertyTypes) => {
          if (propertyTypes.length > 0) {
            // Store both the user's selection and the same value for search
            // The backend will handle cross-mapping expansion
            updateFilter("propertyType", propertyTypes)
            updateFilter("userSelectedPropertyTypes", propertyTypes)
          } else {
            clearFilter("propertyType")
            clearFilter("userSelectedPropertyTypes")
          }
          setIsPropertyTypeModalOpen(false)
        }}
      />
    </div>
  )
}