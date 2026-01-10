import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Heart, Home, MapPin, Bed, Bath, Maximize, ArrowLeft } from "lucide-react";
import type { Property, Favorite, User } from "@shared/schema";
import BottomNav from "@/components/BottomNav";

export default function SimpleSaved() {
  const [, setLocation] = useLocation();

  // Fetch current user
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Fetch user's favorites
  const { data: favorites, isLoading } = useQuery<Favorite[]>({
    queryKey: ['/api/favorites'],
    enabled: !!user,
    retry: false,
  });

  // Fetch all favorited properties
  const { data: properties } = useQuery<Property[]>({
    queryKey: ['/api/properties', { ids: favorites?.map(f => f.propertyId) }],
    enabled: !!favorites && favorites.length > 0,
    retry: false,
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 with-bottom-nav">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation('/simple')}
                className="p-2 hover:bg-gray-100 rounded-full"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Saved Properties</h1>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to save properties</h2>
          <p className="text-gray-500 mb-6">Create an account to save your favorite properties</p>
          <button
            onClick={() => setLocation('/login?redirect=/simple/saved')}
            className="px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700"
            data-testid="button-go-to-signin"
          >
            Go to Sign In
          </button>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 with-bottom-nav">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation('/simple')}
              className="p-2 hover:bg-gray-100 rounded-full"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Saved Properties</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : !properties || properties.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No saved properties yet</h2>
            <p className="text-gray-500 mb-6">Start saving properties you love</p>
            <button
              onClick={() => setLocation('/simple/search')}
              className="px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700"
              data-testid="button-start-searching"
            >
              Start Searching
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {properties.map((property) => (
              <div
                key={property.id}
                onClick={() => setLocation(`/simple/property/${property.id}`)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow cursor-pointer border border-gray-100"
                data-testid={`card-saved-property-${property.id}`}
              >
                <div className="flex gap-4">
                  <div className="relative w-32 h-32 flex-shrink-0">
                    {property.images && property.images[0] ? (
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Home className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex items-start gap-1 text-gray-600 text-xs mb-1">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{property.city}</span>
                    </div>
                    <h4 className="font-bold text-gray-900 line-clamp-2 mb-2">
                      {property.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Bed className="w-3 h-3" />
                        <span>{property.bedrooms}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bath className="w-3 h-3" />
                        <span>{property.bathrooms}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Maximize className="w-3 h-3" />
                        <span>{property.builtUpSize} sqft</span>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatPrice(Number(property.price))}
                      {property.listingType === 'rent' && <span className="text-xs text-gray-500">/mo</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
