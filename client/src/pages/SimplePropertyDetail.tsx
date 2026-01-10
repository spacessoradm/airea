import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapPin, Bed, Bath, Maximize, ArrowLeft, Heart, Share2, MessageCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import SimilarProperties from "@/components/SimilarProperties";
import type { Property } from "@shared/schema";

export default function SimplePropertyDetail() {
  const [, params] = useRoute("/simple/property/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check if user is authenticated
  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/me'],
  });

  // Fetch property details
  const { data: property, isLoading } = useQuery<Property>({
    queryKey: [`/api/properties/${params?.id}`],
    enabled: !!params?.id,
  });

  // Track viewed properties
  useEffect(() => {
    if (property) {
      try {
        const stored = localStorage.getItem('recentlyViewedProperties');
        const viewedProperties: Property[] = stored ? JSON.parse(stored) : [];
        
        // Remove this property if it exists, then add it to the front
        const filtered = viewedProperties.filter(p => p.id !== property.id);
        const updated = [property, ...filtered].slice(0, 10); // Keep max 10 properties
        
        localStorage.setItem('recentlyViewedProperties', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save viewed property', e);
      }
    }
  }, [property]);

  // Fetch agent details to get WhatsApp number
  const { data: agent } = useQuery<{ whatsappNumber?: string; phone?: string }>({
    queryKey: [`/api/users/${property?.agentId}`],
    enabled: !!property?.agentId,
  });

  // Create inquiry (lead) mutation
  const createInquiryMutation = useMutation({
    mutationFn: async (data: { propertyId: string; message: string }) => {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create inquiry');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inquiries'] });
    },
  });

  const handleWhatsAppContact = async () => {
    if (!property) return;

    // Check if user is signed in
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to contact the agent",
      });
      // Redirect to login with return URL
      setLocation(`/auth/login?redirect=/simple/property/${property.id}`);
      return;
    }

    try {
      // Create inquiry/lead record
      await createInquiryMutation.mutateAsync({
        propertyId: property.id,
        message: `Interested in ${property.title}`,
      });

      // Get agent WhatsApp number
      const agentWhatsApp = agent?.whatsappNumber || agent?.phone || "60123456789"; // Fallback to placeholder if no number set
      
      // Format WhatsApp message
      const message = encodeURIComponent(
        `Hi! I'm interested in your property:\n\n${property.title}\n${property.city}, ${property.state}\nPrice: RM ${Number(property.price).toLocaleString()}\n\nCan you provide more details?`
      );

      // Open WhatsApp with pre-filled message
      const whatsappUrl = `https://wa.me/${agentWhatsApp}?text=${message}`;
      window.open(whatsappUrl, '_blank');

      toast({
        title: "Opening WhatsApp",
        description: "Your inquiry has been recorded",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create inquiry",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatPropertyType = (type: string) => {
    return type
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">Property not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* PWA-Style Header with Back Button */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setLocation('/simple')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                toast({ title: "Coming Soon", description: "Share feature will be available soon" });
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              data-testid="button-share"
            >
              <Share2 className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => {
                toast({ title: "Coming Soon", description: "Favorite feature will be available soon" });
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              data-testid="button-favorite"
            >
              <Heart className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main>
        {/* Horizontal Scrollable Photo Gallery */}
        {property.images && property.images.length > 0 ? (
          <div className="relative w-full">
            {/* Scrollable Images Container */}
            <div 
              ref={scrollContainerRef}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onScroll={(e) => {
                const container = e.currentTarget;
                const scrollLeft = container.scrollLeft;
                const itemWidth = container.offsetWidth;
                const index = Math.round(scrollLeft / itemWidth);
                setCurrentImageIndex(index);
              }}
            >
              {property.images.map((img: string, idx: number) => (
                <div 
                  key={idx} 
                  className="w-full h-80 flex-shrink-0 snap-center"
                >
                  <img 
                    src={img} 
                    alt={`${property.title} - Photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                    data-testid={`img-photo-${idx}`}
                  />
                </div>
              ))}
            </div>
            
            {/* Photo Counter Badge */}
            <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full">
              <span className="text-white text-xs font-semibold">
                {currentImageIndex + 1} / {property.images.length}
              </span>
            </div>
            
            {/* Dot Indicators */}
            {property.images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {property.images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const container = scrollContainerRef.current;
                      if (container) {
                        container.scrollTo({
                          left: idx * container.offsetWidth,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentImageIndex 
                        ? 'w-6 bg-white' 
                        : 'w-1.5 bg-white/50'
                    }`}
                    data-testid={`dot-indicator-${idx}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-80 bg-gray-200 flex items-center justify-center">
            <Home className="w-20 h-20 text-gray-400" />
          </div>
        )}

        {/* Property Info Card */}
        <div className="px-4 py-5 space-y-5">
          {/* Title and Location */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-900 flex-1 pr-2" data-testid="text-title">
                {property.title}
              </h1>
              {(property.roi !== null && property.roi !== undefined && !isNaN(Number(property.roi))) && (
                <div className="px-3 py-1 bg-green-100 rounded-full text-sm font-bold text-green-700">
                  {property.roi}% ROI
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{property.city}, {property.state}</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900" data-testid="text-price">
              {formatPrice(Number(property.price))}
            </span>
            {property.listingType === 'rent' && (
              <span className="text-lg text-gray-500">/mo</span>
            )}
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-2xl p-4">
            <div className="text-center">
              <Bed className="h-5 w-5 text-gray-400 mx-auto mb-1" />
              <div className="text-lg font-semibold text-gray-900">{property.bedrooms || 0}</div>
              <div className="text-xs text-gray-500">Bedrooms</div>
            </div>
            <div className="text-center">
              <Bath className="h-5 w-5 text-gray-400 mx-auto mb-1" />
              <div className="text-lg font-semibold text-gray-900">{property.bathrooms || 0}</div>
              <div className="text-xs text-gray-500">Bathrooms</div>
            </div>
            <div className="text-center">
              <Maximize className="h-5 w-5 text-gray-400 mx-auto mb-1" />
              <div className="text-lg font-semibold text-gray-900">{property.builtUpSize || 0}</div>
              <div className="text-xs text-gray-500">sqft</div>
            </div>
          </div>

          {/* Description */}
          {property.description && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Description</h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>
          )}

          {/* Property Details */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Property Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Property Type</span>
                <span className="text-sm font-semibold text-gray-900">{formatPropertyType(property.propertyType)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Listing Type</span>
                <span className="text-sm font-semibold text-gray-900 capitalize">{property.listingType}</span>
              </div>
              {property.tenure && (
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Tenure</span>
                  <span className="text-sm font-semibold text-gray-900 capitalize">{property.tenure}</span>
                </div>
              )}
              {property.furnishedCondition && (
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Furnishing</span>
                  <span className="text-sm font-semibold text-gray-900 capitalize">{property.furnishedCondition.replace('_', ' ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Similar Properties Section */}
        <div className="mt-6 px-4">
          <SimilarProperties propertyId={property.id} limit={4} />
        </div>
      </main>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40">
        <Button 
          className="w-full h-14 text-base font-bold bg-green-600 hover:bg-green-700" 
          onClick={handleWhatsAppContact}
          disabled={createInquiryMutation.isPending}
          data-testid="button-whatsapp"
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          {createInquiryMutation.isPending ? 'Please wait...' : 'Contact via WhatsApp'}
        </Button>
        {!user && (
          <p className="text-xs text-center text-gray-500 mt-2">
            Sign in required to contact agent
          </p>
        )}
      </div>
    </div>
  );
}
