import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SmartPropertyTooltip } from '@/components/SmartPropertyTooltip';
import { MapPin, Bed, Bath, Square, Star, Info, Lightbulb } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Property } from '@shared/schema';

const SmartTooltipDemo: React.FC = () => {
  // Fetch some properties for the demo
  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    staleTime: 5 * 60 * 1000,
  });

  const demoProperties = properties.slice(0, 6);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">Loading properties...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Lightbulb className="h-8 w-8 text-yellow-500" />
            <h1 className="text-4xl font-bold text-gray-900">Smart Property Recommendation Tooltips</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Hover over any property card below to see intelligent, AI-powered insights including 
            market analysis, personalized matching scores, transport access, and investment potential.
          </p>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-left">
                <h3 className="font-semibold text-blue-900 mb-2">How to Use Smart Tooltips:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Hover</strong> over any property card to trigger the smart tooltip</li>
                  <li>• View <strong>market position</strong> - see if the property is priced above/below market</li>
                  <li>• Check your <strong>personal match score</strong> based on your preferences</li>
                  <li>• Discover <strong>transport access</strong> and nearby amenities</li>
                  <li>• See <strong>investment potential</strong> and market trends</li>
                  <li>• Get <strong>personalized reasons</strong> why this property matches you</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {demoProperties.map((property) => (
            <SmartPropertyTooltip key={property.id} property={property}>
              <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                {/* Property Image */}
                <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 rounded-t-lg relative overflow-hidden">
                  {property.images && property.images.length > 0 ? (
                    <img 
                      src={property.images[0]} 
                      alt={property.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgMTMwTDEyMCA5MEwxODAgOTBMMTUwIDEzMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPGNpcmNsZSBjeD0iMTMwIiBjeT0iNzAiIHI9IjEwIiBmaWxsPSIjOUNBM0FGIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIiBmb250LXNpemU9IjE0cHgiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+UHJvcGVydHkgSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-blue-500">
                      <span className="text-6xl">🏠</span>
                    </div>
                  )}
                  
                  {/* Overlay badge */}
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-yellow-500 text-yellow-900 border-0">
                      🧠 AI Powered
                    </Badge>
                  </div>
                  
                  {/* Hover instruction */}
                  <div className="absolute bottom-3 left-3 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    Hover for smart insights
                  </div>
                </div>

                <CardContent className="p-4">
                  {/* Property Title */}
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-1">
                    {property.title}
                  </h3>
                  
                  {/* Price */}
                  <div className="text-2xl font-bold text-blue-600 mb-3">
                    RM {parseFloat(property.price).toLocaleString()}
                    {property.listingType === 'rent' && <span className="text-sm text-gray-500">/month</span>}
                  </div>

                  {/* Location */}
                  <div className="flex items-center text-gray-600 text-sm mb-3">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="line-clamp-1">{property.address}, {property.city}</span>
                  </div>

                  {/* Property Details */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center">
                        <Bed className="h-4 w-4 mr-1" />
                        <span>{property.bedrooms} bed</span>
                      </div>
                      <div className="flex items-center">
                        <Bath className="h-4 w-4 mr-1" />
                        <span>{property.bathrooms} bath</span>
                      </div>
                      {property.squareFeet && (
                        <div className="flex items-center">
                          <Square className="h-4 w-4 mr-1" />
                          <span>{property.squareFeet} sqft</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Property Type Badge */}
                  <div className="mt-3">
                    <Badge variant="outline" className="capitalize">
                      {property.propertyType}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </SmartPropertyTooltip>
          ))}
        </div>

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center p-6">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold mb-2">Market Analysis</h3>
            <p className="text-sm text-gray-600">See if properties are priced above or below market median</p>
          </Card>
          
          <Card className="text-center p-6">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-semibold mb-2">Personal Match</h3>
            <p className="text-sm text-gray-600">AI-calculated compatibility score based on your preferences</p>
          </Card>
          
          <Card className="text-center p-6">
            <div className="text-3xl mb-3">🚇</div>
            <h3 className="font-semibold mb-2">Transport Access</h3>
            <p className="text-sm text-gray-600">Nearby MRT, LRT, and bus connections at a glance</p>
          </Card>
          
          <Card className="text-center p-6">
            <div className="text-3xl mb-3">📈</div>
            <h3 className="font-semibold mb-2">Investment Score</h3>
            <p className="text-sm text-gray-600">Market trends and growth potential analysis</p>
          </Card>
        </div>

        {/* Technical Info */}
        <div className="mt-12 bg-gray-100 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Technical Implementation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-medium mb-2">Frontend Features:</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• React component with hover-triggered tooltips</li>
                <li>• TypeScript for type safety</li>
                <li>• Radix UI for accessible tooltip primitives</li>
                <li>• React Query for efficient data caching</li>
                <li>• 300ms hover delay to prevent accidental triggers</li>
                <li>• Responsive design with smart positioning</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Backend Intelligence:</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• AI-powered property similarity scoring</li>
                <li>• Real-time market comparison analysis</li>
                <li>• User preference learning algorithms</li>
                <li>• Transport accessibility data integration</li>
                <li>• Investment potential calculation engine</li>
                <li>• Personalized recommendation reasoning</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SmartTooltipDemo;