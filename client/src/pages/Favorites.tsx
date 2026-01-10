import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import type { Property, Favorite, User } from "@shared/schema";
import Header from "@/components/Header";
import PropertyCard from "@/components/PropertyCard";

export default function Favorites() {
  const [, setLocation] = useLocation();

  // Fetch current user
  const { data: user, isLoading: isLoadingUser, isError: isErrorUser } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Fetch user's favorites
  const { data: favorites, isLoading: isLoadingFavorites, isError: isErrorFavorites } = useQuery<Favorite[]>({
    queryKey: ['/api/favorites'],
    enabled: !!user,
    retry: false,
  });

  // Fetch all favorited properties
  const favoriteIds = favorites?.map(f => f.propertyId) || [];
  const hasFavorites = favoriteIds.length > 0;
  
  const { data: properties, isLoading: isLoadingProperties, isError: isErrorProperties } = useQuery<Property[]>({
    queryKey: hasFavorites ? ['/api/properties', { ids: favoriteIds }] : [],
    enabled: hasFavorites,
    retry: false,
  });

  if (isLoadingUser) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </>
    );
  }

  if (isErrorUser) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error loading favorites</h2>
          <p className="text-gray-500 mb-6">Unable to load your account. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to view favorites</h2>
          <p className="text-gray-500 mb-6">Create an account to save your favorite properties</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
            data-testid="button-sign-in"
          >
            Sign In
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Favorites</h1>
          <p className="text-gray-600">
            {properties?.length || 0} {properties?.length === 1 ? 'property' : 'properties'} saved
          </p>
        </div>

        {isLoadingFavorites || isLoadingProperties ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading favorites...</p>
          </div>
        ) : isErrorFavorites || isErrorProperties ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error loading favorites</h2>
            <p className="text-gray-500 mb-6">Please try refreshing the page</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
            >
              Refresh
            </button>
          </div>
        ) : !properties || properties.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No favorites yet</h2>
            <p className="text-gray-500 mb-6">Start saving properties you love</p>
            <button
              onClick={() => setLocation('/')}
              className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
              data-testid="button-explore-properties"
            >
              Explore Properties
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <PropertyCard 
                key={property.id} 
                property={property as any}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
