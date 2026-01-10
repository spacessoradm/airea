import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Heart, 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Car,
  MessageCircle, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Phone
} from "lucide-react";
import type { Property, Agent, PropertyWithEnrichments } from "@shared/schema";

interface PropertyCardProps {
  property: (Property | PropertyWithEnrichments) & { agent: Agent };
  hideAgentInfo?: boolean;
  hideActionButtons?: boolean;
}

export default function PropertyCard({ property, hideAgentInfo = false, hideActionButtons = false }: PropertyCardProps) {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: isFavorite = false } = useQuery({
    queryKey: ["/api/favorites", property.id, "check"],
    queryFn: async () => {
      const response = await fetch(`/api/favorites/${property.id}/check`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.isFavorite;
    },
    enabled: isAuthenticated,
  });

  const favoriteMutation = useMutation({
    mutationFn: async (action: 'add' | 'remove') => {
      if (action === 'add') {
        return apiRequest('POST', '/api/favorites', { propertyId: property.id });
      } else {
        return apiRequest('DELETE', `/api/favorites/${property.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", property.id, "check"] });
      toast({
        title: isFavorite ? "Removed from favorites" : "Added to favorites",
        description: isFavorite ? "Property removed from your favorites" : "Property added to your favorites",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized", 
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (price: string, listingType: string) => {
    const numPrice = Number(price);
    const formatted = numPrice.toLocaleString();
    return listingType === 'rent' ? `${formatted}/month` : formatted;
  };

  const formatPricePerSqft = (price: string, sqft: number) => {
    const pricePerSqft = Number(price) / sqft;
    return `RM ${Number(pricePerSqft.toFixed(0)).toLocaleString()}/sq ft`;
  };

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to save favorites",
        variant: "destructive",
      });
      return;
    }
    favoriteMutation.mutate(isFavorite ? 'remove' : 'add');
  };

  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Handle contact agent logic here
    toast({
      title: "Contact Agent",
      description: "Feature coming soon!",
    });
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const phone = property.agent?.phone?.replace(/[^0-9]/g, ''); // Remove non-numeric characters
    if (!phone) {
      toast({
        title: "Contact not available",
        description: "Agent's WhatsApp number is not available",
        variant: "destructive",
      });
      return;
    }

    // Format WhatsApp number (Malaysia: +60)
    const whatsappNumber = phone.startsWith('60') ? phone : `60${phone}`;
    
    // Create property details message
    const message = `Hi, I'm interested in this property:\n\n` +
      `📍 ${property.title}\n` +
      `💰 RM ${formatPrice(property.price, property.listingType)}\n` +
      `📏 ${property.squareFeet?.toLocaleString()} sq ft\n` +
      `🛏️ ${property.bedrooms} bed | 🚿 ${property.bathrooms} bath\n` +
      `📌 ${property.address}\n\n` +
      `Property ID: ${property.id}`;
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Check if property is currently featured (featured = true AND featuredUntil > now)
  const isFeaturedNow = property.featured && property.featuredUntil && new Date(property.featuredUntil) > new Date();
  
  return (
    <Card className={`w-full hover:shadow-lg transition-all duration-300 bg-white h-full ${
      isFeaturedNow ? 'ring-2 ring-yellow-400 shadow-xl shadow-yellow-100' : ''
    }`}>
      <div className="flex flex-col h-full">
        {/* Three Horizontal Photos on Top */}
        <div className="h-60 relative overflow-hidden rounded-t-lg">
          {/* FEATURED Badge - Top Left */}
          {isFeaturedNow && (
            <div className="absolute top-3 left-3 z-20">
              <Badge className="bg-yellow-500 text-white font-extrabold px-4 py-1.5 text-sm shadow-lg tracking-wide">
                FEATURED
              </Badge>
            </div>
          )}
          
          <div className="flex h-full">
            {/* Main large photo (2/3 width) */}
            <div className="w-2/3 relative">
              <Link href={`/property/${property.id}`}>
                <img
                  src={property.images?.[0] || `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop`}
                  alt={property.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </Link>
            </div>
            
            {/* Two smaller photos (1/3 width total) */}
            <div className="w-1/3 flex flex-col">
              {property.images?.[1] && (
                <div className="h-1/2 relative border-l border-b border-gray-200">
                  <Link href={`/property/${property.id}`}>
                    <img
                      src={property.images?.[1] || `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop`}
                      alt={`${property.title} - Photo 2`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                </div>
              )}
              
              {property.images?.[2] ? (
                <div className="h-1/2 relative border-l border-gray-200">
                  <Link href={`/property/${property.id}`}>
                    <img
                      src={property.images?.[2] || `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop`}
                      alt={`${property.title} - Photo 3`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                  {/* Show "+X more" if there are more than 3 images */}
                  {(property.images?.length || 0) > 3 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-medium">+{(property.images?.length || 0) - 3} more</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-1/2 bg-gray-100 border-l border-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">No image</span>
                </div>
              )}
            </div>
          </div>

          {/* Favorite Button */}
          {isAuthenticated && (
            <button
              onClick={handleFavoriteToggle}
              className="absolute top-3 right-3 z-20 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
            >
              <Heart 
                className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
              />
            </button>
          )}


        </div>

        {/* Content Below Photos */}
        <Link href={`/property/${property.id}`} className="flex-grow flex flex-col">
          <div className="p-6 flex-grow flex flex-col">
            {/* Price */}
            <div className="mb-2">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-primary">
                  RM {formatPrice(property.price, property.listingType)}
                </div>
                {(property.roi !== null && property.roi !== undefined) && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    {property.roi}% ROI
                  </Badge>
                )}
              </div>
              {property.squareFeet && (
                <div className="text-sm text-gray-500">
                  {formatPricePerSqft(property.price, property.squareFeet)}
                </div>
              )}
            </div>

            {/* Title and Address */}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                {property.title}
              </h3>
              <div className="flex items-center text-gray-600 text-sm mb-1">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="line-clamp-1">{property.address}, {property.city}</span>
              </div>
              {/* Nearest MRT/LRT Station */}
              {'nearestStation' in property && property.nearestStation && (
                <div className="flex items-center text-blue-600 text-xs mt-1">
                  <span className="font-medium">
                    📍 {property.nearestStation.distance} km from {property.nearestStation.name}
                  </span>
                </div>
              )}
            </div>

            {/* Property Classification Banners - Reordered: Property Type -> Tenure -> Title Type */}
            <div className="flex flex-wrap gap-2 mb-4">
              {/* 1. Property Type Banner (First Priority) */}
              {(() => {
                const getPropertyCategory = (propertyType: string) => {
                  const residential = ['apartment', 'condominium', 'house', 'studio', 'townhouse', 'flat', 'service-residence', 'cluster-house', 'semi-detached-house', 'terraced-house', 'bungalow', 'twin-villa'];
                  const commercial = ['commercial', 'office', 'shop', 'shop-office', 'retail-office', 'retail-space', 'sofo', 'soho', 'sovo', 'hotel-resort'];
                  const industrial = ['industrial', 'warehouse', 'factory', 'cluster-factory', 'semi-d-factory', 'detached-factory', 'terrace-factory'];
                  
                  // For land properties, classify by land type
                  if (propertyType === 'residential-land') return 'residential';
                  if (propertyType === 'commercial-land') return 'commercial';  
                  if (propertyType === 'industrial-land') return 'industrial';
                  if (['land', 'plot', 'development-land'].includes(propertyType)) return 'residential'; // Default land to residential
                  
                  if (residential.includes(propertyType)) return 'residential';
                  if (commercial.includes(propertyType)) return 'commercial';
                  if (industrial.includes(propertyType)) return 'industrial';
                  return 'other';
                };
                
                const category = getPropertyCategory(property.propertyType);
                return (
                  <Badge 
                    variant={category === 'residential' ? 'default' : 
                             category === 'commercial' ? 'secondary' : 'outline'}
                    className={`text-xs font-medium ${
                      category === 'residential' ? 'bg-green-100 text-green-800 border-green-200' :
                      category === 'commercial' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                      category === 'industrial' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                      'bg-gray-100 text-gray-800 border-gray-200'
                    }`}
                  >
                    {category === 'residential' ? '🏠 Residential' :
                     category === 'commercial' ? '🏢 Commercial' :
                     category === 'industrial' ? '🏭 Industrial' : '🏡 Property'}
                  </Badge>
                );
              })()}
              
              {/* 2. Tenure Banner (Second Priority) */}
              {property.tenure && (
                <Badge variant="outline" className="text-xs">
                  📜 {property.tenure === 'freehold' ? 'Freehold' : 'Leasehold'}
                </Badge>
              )}
              
              {/* 3. Title Type Banner (Third Priority) */}
              {property.titleType && (
                <Badge variant="outline" className="text-xs">
                  📋 {property.titleType === 'individual' ? 'Individual' : property.titleType === 'strata' ? 'Strata' : 'Master'} Title
                </Badge>
              )}
            </div>

            {/* Property Details */}
            <div className="flex items-center space-x-6 mb-4 text-gray-600">
              <div className="flex items-center">
                <Bed className="h-4 w-4 mr-1" />
                <span className="text-sm">{property.bedrooms} {t('bedrooms')}</span>
              </div>
              <div className="flex items-center">
                <Bath className="h-4 w-4 mr-1" />
                <span className="text-sm">{property.bathrooms} {t('bathrooms')}</span>
              </div>
              {property.parking && property.parking > 0 && (
                <div className="flex items-center">
                  <Car className="h-4 w-4 mr-1" />
                  <span className="text-sm">{property.parking} Car Park{property.parking > 1 ? 's' : ''}</span>
                </div>
              )}
              {property.lotType && (
                <div className="flex items-center">
                  <span className="text-sm">
                    {property.lotType === 'intermediate' ? 'Intermediate' :
                     property.lotType === 'end_lot' ? 'End Lot' :
                     property.lotType === 'corner_lot' ? 'Corner Lot' : property.lotType}
                  </span>
                </div>
              )}
              <div className="flex items-center">
                <Square className="h-4 w-4 mr-1" />
                <span className="text-sm">{property.squareFeet?.toLocaleString()} {t('sqft')}</span>
              </div>
            </div>

            {/* Additional Legal Information (if any remaining) */}
            {property.landTitleType && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="text-xs">
                  🏢 {property.landTitleType === 'residential' ? 'Residential' : 
                       property.landTitleType === 'commercial' ? 'Commercial' : 
                       property.landTitleType === 'industrial' ? 'Industrial' : 'Agriculture'} Land Title
                </Badge>
              </div>
            )}

            {/* Property Description */}
            <div className="flex-grow">
              <p className="text-gray-700 text-sm mb-4 leading-relaxed line-clamp-3">
                {property.description || 
                 `${property.propertyType ? (property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)) : 'Property'} with built-up area of ${property.squareFeet ? property.squareFeet.toLocaleString() + ' sq. ft.' : 'N/A'}. ${property.featured ? 'Partially furnished' : 'Unfurnished'} unit with excellent connectivity and nearby amenities.`}
              </p>
            </div>

            {/* Agent Info and Action Buttons */}
            {!hideActionButtons && (
              <>
                {!hideAgentInfo ? (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Link 
                      href={`/agents/${property.agent?.id || property.agentId}`}
                      className="flex items-center space-x-3 hover:opacity-75 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={property.agent?.profileImage || undefined} alt={property.agent?.nickname || property.agent?.name} />
                        <AvatarFallback>{(property.agent?.nickname || property.agent?.name)?.charAt(0) || 'A'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900 text-sm hover:underline">{property.agent?.nickname || property.agent?.name || 'Agent'}</p>
                        <p className="text-xs text-gray-600">
                          {property.agent?.company || 'Real Estate Agency'}
                        </p>
                      </div>
                    </Link>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleWhatsAppClick}
                        className="text-sm bg-green-500 text-white hover:bg-green-600 hover:text-white border-green-500"
                        data-testid="button-whatsapp-card"
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                      <Link href={`/property/${property.id}`}>
                        <Button 
                          size="sm" 
                          className="text-sm bg-primary hover:bg-primary/90"
                          data-testid="button-view-details"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex space-x-3 w-full">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleContactClick}
                        className="text-sm flex-1"
                        data-testid="button-send-message"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Send Message
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleWhatsAppClick}
                        className="text-sm flex-1 bg-green-500 text-white hover:bg-green-600 hover:text-white border-green-500"
                        data-testid="button-whatsapp"
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                      <Link href={`/property/${property.id}`} className="flex-1">
                        <Button 
                          size="sm" 
                          className="text-sm bg-primary hover:bg-primary/90 w-full"
                          data-testid="button-view-details"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View details
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Link>
      </div>
    </Card>
  );
}