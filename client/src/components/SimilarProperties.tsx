import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Bed, Bath, Square, Heart } from "lucide-react";
import { Link } from "wouter";
import { getPropertyTypeDisplayName } from '@shared/propertyTypes';
import type { Property } from "@shared/schema";

interface SimilarPropertiesProps {
  propertyId: string;
  limit?: number;
  className?: string;
}

export function SimilarProperties({ propertyId, limit = 4, className }: SimilarPropertiesProps) {
  const { data: similarProperties, isLoading, error } = useQuery<Property[]>({
    queryKey: [`/api/properties/${propertyId}/similar?limit=${limit}`],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  if (isLoading) {
    return (
      <div className={className}>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Similar Properties</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[280px]">
              <Card className="animate-pulse h-full">
                <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-t-lg"></div>
                <CardHeader className="pb-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !similarProperties || similarProperties.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Similar Properties</h3>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400">
          Smart Match
        </Badge>
      </div>

      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide scroll-smooth">
          {similarProperties.map((property) => (
            <div key={property.id} className="flex-shrink-0 w-[280px] snap-start">
              <SimilarPropertyCard property={property} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SimilarPropertyCardProps {
  property: Property;
}

function SimilarPropertyCard({ property }: SimilarPropertyCardProps) {
  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
    }).format(numPrice);
  };

  const primaryImage = property.images && property.images.length > 0 ? property.images[0] : null;

  return (
    <Link href={`/property/${property.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group h-full cursor-pointer border-2 hover:border-primary dark:bg-gray-800 dark:border-gray-700 dark:hover:border-primary">
        <div className="relative h-40 bg-gray-100 dark:bg-gray-700">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
              <Square className="h-10 w-10" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <Badge className="bg-blue-600 text-white text-xs font-semibold shadow-sm hover:bg-blue-700">
              {getPropertyTypeDisplayName(property.propertyType)}
            </Badge>
          </div>
          {property.featured && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-yellow-500 text-white text-xs font-semibold shadow-sm">
                Featured
              </Badge>
            </div>
          )}
        </div>

        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold line-clamp-2 min-h-[3rem] dark:text-white">
            {property.title}
          </CardTitle>
          <CardDescription className="flex items-center text-xs dark:text-gray-400">
            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="line-clamp-1">{property.city}, {property.state}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-3">
          <div className="mb-3">
            <div className="text-xl font-bold text-primary dark:text-primary">
              {formatPrice(property.price)}
            </div>
            {property.listingType === 'rent' && (
              <div className="text-xs text-muted-foreground dark:text-gray-400">
                per month
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center">
              <Bed className="h-4 w-4 mr-1" />
              <span className="font-medium">{property.bedrooms}</span>
            </div>
            <div className="flex items-center">
              <Bath className="h-4 w-4 mr-1" />
              <span className="font-medium">{property.bathrooms}</span>
            </div>
            {property.builtUpSize && (
              <div className="flex items-center">
                <Square className="h-4 w-4 mr-1" />
                <span className="font-medium">{property.builtUpSize} sq ft</span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <Button size="sm" className="w-full text-xs font-semibold group-hover:bg-primary group-hover:text-white transition-colors">
            View Details
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}

export default SimilarProperties;