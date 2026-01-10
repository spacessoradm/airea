import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useGamification } from "@/hooks/useGamification";
import Header from "@/components/Header";
import SimilarProperties from "@/components/SimilarProperties";
import { RewardNotification } from "@/components/RewardNotification";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MapPin, Bed, Bath, Square, Car, Wifi, Dumbbell, Shield, MessageCircle, Phone, Mail, ArrowLeft, Edit2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { getPropertyTypeDisplayName } from '@shared/propertyTypes';
import type { Property } from "@shared/schema";

export default function PropertyDetail() {
  const [match, params] = useRoute("/property/:id");
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [hasRecordedView, setHasRecordedView] = useState(false);
  
  const { recordPropertyView, completedChallenges, clearCompletedChallenges } = useGamification();

  const { data: property, isLoading } = useQuery({
    queryKey: ["/api/properties", params?.id],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${params?.id}`);
      if (!response.ok) {
        throw new Error("Property not found");
      }
      return response.json();
    },
    enabled: !!params?.id,
  });

  const { data: isFavorite = false } = useQuery({
    queryKey: ["/api/favorites", params?.id, "check"],
    queryFn: async () => {
      const response = await fetch(`/api/favorites/${params?.id}/check`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.isFavorite;
    },
    enabled: !!params?.id && isAuthenticated,
  });

  const favoriteMutation = useMutation({
    mutationFn: async (action: 'add' | 'remove') => {
      if (action === 'add') {
        return apiRequest('POST', '/api/favorites', { propertyId: params?.id });
      } else {
        return apiRequest('DELETE', `/api/favorites/${params?.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", params?.id, "check"] });
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

  const messageMutation = useMutation({
    mutationFn: async (messageData: { receiverId: string; propertyId: string; content: string }) => {
      return apiRequest('POST', '/api/messages', messageData);
    },
    onSuccess: () => {
      setMessage("");
      toast({
        title: "Message sent",
        description: "Your message has been sent to the agent",
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
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Scroll to top when navigating to a different property
  useEffect(() => {
    // Use requestAnimationFrame to ensure scroll happens after render
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, [params?.id]);

  // Record property view for gamification (only once per session)
  useEffect(() => {
    if (property && isAuthenticated && !hasRecordedView) {
      recordPropertyView(property.id, property.city, property.propertyType);
      setHasRecordedView(true);
    }
  }, [property, isAuthenticated, hasRecordedView, recordPropertyView]);

  const handleFavoriteToggle = () => {
    if (!isAuthenticated) {
      toast({
        title: "Please sign in",
        description: "You need to sign in to save favorites",
      });
      return;
    }
    favoriteMutation.mutate(isFavorite ? 'remove' : 'add');
  };

  const handleSendMessage = () => {
    if (!isAuthenticated) {
      toast({
        title: "Please sign in",
        description: "You need to sign in to send messages",
      });
      return;
    }
    
    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message to send",
        variant: "destructive",
      });
      return;
    }

    messageMutation.mutate({
      receiverId: property.agentId,
      propertyId: property.id,
      content: message,
    });
  };

  const handleWhatsAppClick = () => {
    if (!property?.agent?.phone) {
      toast({
        title: "Contact not available",
        description: "Agent's WhatsApp number is not available",
        variant: "destructive",
      });
      return;
    }

    const phone = property.agent.phone.replace(/[^0-9]/g, ''); // Remove non-numeric characters
    const whatsappNumber = phone.startsWith('60') ? phone : `60${phone}`; // Format for Malaysia
    
    // Create property details message
    const formatPrice = (price: string, listingType: string) => {
      const numPrice = Number(price);
      const formatted = numPrice.toLocaleString();
      return listingType === 'rent' ? `${formatted}/month` : formatted;
    };

    const whatsappMessage = `Hi, I'm interested in this property:\n\n` +
      `📍 ${property.title}\n` +
      `💰 RM ${formatPrice(property.price, property.listingType)}\n` +
      `📏 ${property.squareFeet?.toLocaleString()} sq ft\n` +
      `🛏️ ${property.bedrooms} bed | 🚿 ${property.bathrooms} bath\n` +
      `📌 ${property.address}\n\n` +
      `Property ID: ${property.id}`;
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const amenityIcons = {
    'swimming pool': '🏊',
    'gym': '🏋️',
    'parking': '🚗',
    'security': '🛡️',
    'wifi': '📶',
    'air conditioning': '❄️',
    'laundry': '🧺',
    'balcony': '🏖️',
    'garden': '🌿',
    'playground': '🛝',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="h-96 bg-gray-200 rounded-xl mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-32 bg-gray-200 rounded mb-4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <div className="text-6xl mb-4">🏠</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Property not found</h1>
          <p className="text-gray-600 mb-8">The property you're looking for doesn't exist or has been removed.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Search
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Reward Notifications */}
      {completedChallenges.length > 0 && (
        <RewardNotification
          completedChallenges={completedChallenges}
          onClose={clearCompletedChallenges}
        />
      )}
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span>›</span>
          <span>{property.city}</span>
          <span>›</span>
          <span className="text-gray-900">{property.title}</span>
        </div>

        {/* Image Gallery */}
        <div className="mb-8">
          {property.images && property.images.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 relative">
                <Link 
                  href={`/property/${property.id}/gallery?images=${encodeURIComponent(JSON.stringify(property.images))}&title=${encodeURIComponent(property.title)}&start=${selectedImageIndex}`}
                  className="block cursor-pointer group relative"
                >
                  <img
                    src={property.images[selectedImageIndex] || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&w=800&h=600&fit=crop"}
                    alt={property.title}
                    className="w-full h-96 object-cover rounded-xl group-hover:opacity-95 transition-opacity"
                    data-testid="img-main-property"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-xl">
                    <div className="bg-white/90 px-4 py-2 rounded-lg text-sm font-medium">
                      Click to view all {property.images.length} photos
                    </div>
                  </div>
                </Link>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-1 gap-2">
                {property.images.slice(0, 4).map((image: string, index: number) => (
                  <Link
                    key={index}
                    href={`/property/${property.id}/gallery?images=${encodeURIComponent(JSON.stringify(property.images))}&title=${encodeURIComponent(property.title)}&start=${index}`}
                    className={`h-20 md:h-24 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity ${
                      selectedImageIndex === index ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <img
                      src={image || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&w=200&h=200&fit=crop"}
                      alt={`${property.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-96 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">🏠</div>
                <p>No images available</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Details */}
          <div className="lg:col-span-2">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {getPropertyTypeDisplayName(property.propertyType)}
                  </Badge>
                </div>
                <p className="text-lg text-gray-600 flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  {property.address}, {property.city}
                </p>
              </div>
              <div className="flex space-x-3">
                {/* Edit button for property owner */}
                {isAuthenticated && user?.claims?.sub === property.agentId && (
                  <Link href={`/edit-property/${property.id}`}>
                    <Button
                      variant="outline"
                      size="lg"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      data-testid="button-edit-property"
                    >
                      <Edit2 className="mr-2 h-5 w-5" />
                      Edit Listing
                    </Button>
                  </Link>
                )}
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleFavoriteToggle}
                  disabled={favoriteMutation.isPending}
                  className={isFavorite ? "text-red-500 border-red-200 hover:bg-red-50" : ""}
                  data-testid="button-favorite-toggle"
                >
                  <Heart className={`mr-2 h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
                  {isFavorite ? "Favorited" : t('save')}
                </Button>
              </div>
            </div>

            {/* Property Info */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className={`grid grid-cols-2 ${property.roi !== null && property.roi !== undefined ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-6`}>
                  <div className="text-center">
                    <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                      <Bed className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{property.bedrooms}</div>
                    <div className="text-sm text-gray-500">{t('bedrooms')}</div>
                  </div>
                  <div className="text-center">
                    <div className="bg-secondary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                      <Bath className="h-6 w-6 text-secondary" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{property.bathrooms}</div>
                    <div className="text-sm text-gray-500">{t('bathrooms')}</div>
                  </div>
                  <div className="text-center">
                    <div className="bg-accent/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                      <Square className="h-6 w-6 text-accent" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{property.squareFeet || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{t('sqft')}</div>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                      <span className="text-primary font-bold">RM</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{parseFloat(property.price).toLocaleString()}</div>
                    <div className="text-sm text-gray-500">{property.listingType === 'rent' ? t('rent') : t('sale')}</div>
                  </div>
                  {(property.roi !== null && property.roi !== undefined) && (
                    <div className="text-center">
                      <div className="bg-green-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                        <span className="text-green-600 font-bold">%</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{property.roi}%</div>
                      <div className="text-sm text-gray-500">ROI</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">{t('description')}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {property.description || "No description provided for this property."}
                </p>
              </CardContent>
            </Card>

            {/* Legal Information */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">{t('legalInformation')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="bg-blue-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold text-lg">📜</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900 capitalize">
                      {property.tenure || 'Not specified'}
                    </div>
                    <div className="text-sm text-gray-500">{t('tenure')}</div>
                  </div>
                  <div className="text-center">
                    <div className="bg-green-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                      <span className="text-green-600 font-bold text-lg">🏷️</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900 capitalize">
                      {property.titleType ? property.titleType.replace('-', ' ') : 'Not specified'}
                    </div>
                    <div className="text-sm text-gray-500">{t('titleType')}</div>
                  </div>
                  <div className="text-center">
                    <div className="bg-purple-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                      <span className="text-purple-600 font-bold text-lg">🏛️</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900 capitalize">
                      {property.landTitleType ? property.landTitleType.replace('-', ' ') : 'Not specified'}
                    </div>
                    <div className="text-sm text-gray-500">{t('landTitleType')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <Card className="mb-8">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">{t('amenities')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {property.amenities.map((amenity: string, index: number) => (
                      <div key={index} className="flex items-center space-x-3">
                        <span className="text-lg">
                          {amenityIcons[amenity.toLowerCase() as keyof typeof amenityIcons] || '✓'}
                        </span>
                        <span className="capitalize">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Contact Agent */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-primary mb-1">
                    RM {parseFloat(property.price).toLocaleString()}
                  </div>
                  {property.listingType === 'rent' && (
                    <div className="text-sm text-gray-500">{t('perMonth')}</div>
                  )}
                </div>

                <Separator className="mb-6" />

                <div className="mb-6">
                  <h4 className="font-semibold mb-4">{t('contactAgent')}</h4>
                  
                  {/* Agent Information */}
                  {property.agent && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={property.agent.profileImage || undefined} alt={property.agent.nickname || property.agent.name} />
                          <AvatarFallback>{(property.agent.nickname || property.agent.name)?.charAt(0) || 'A'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="font-semibold text-gray-900">
                            {property.agent.nickname || property.agent.name}
                          </div>
                          {property.agent.license && (
                            <div className="text-sm text-gray-600">
                              REN: {property.agent.license}
                            </div>
                          )}
                          {property.agent.company && (
                            <div className="text-sm text-gray-600">
                              {property.agent.company}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-600 mb-4">
                    {t('interestedMessage')}
                  </div>
                  
                  <Textarea
                    placeholder={t('messagePlaceholder')}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mb-4"
                    rows={4}
                  />
                  
                  <Button 
                    className="w-full mb-3"
                    onClick={handleSendMessage}
                    disabled={messageMutation.isPending}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {messageMutation.isPending ? t('sending') : t('sendMessage')}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full bg-green-500 text-white hover:bg-green-600 hover:text-white border-green-500"
                    onClick={handleWhatsAppClick}
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                </div>

                <Separator className="mb-6" />

                <div className="text-xs text-gray-500 text-center">
                  <Shield className="h-4 w-4 inline mr-1" />
                  {t('secureInquiry')}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Similar Properties Section */}
        {property && (
          <div className="mt-16 pt-12 border-t border-gray-200">
            <SimilarProperties propertyId={property.id} limit={4} />
          </div>
        )}
      </main>
    </div>
  );
}
