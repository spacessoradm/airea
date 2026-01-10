import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Home, 
  MapPin, 
  Phone, 
  Mail,
  Share2,
  ChevronLeft,
  TrendingUp
} from "lucide-react";
import Header from "@/components/Header";
import PropertyCard from "@/components/PropertyCard";
import type { Agent, Property } from "@shared/schema";

export default function AgentDetails() {
  const { id } = useParams();

  const { data: agent, isLoading: agentLoading } = useQuery<Agent>({
    queryKey: [`/api/agents/${id}`],
  });

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<(Property & { agent: Agent })[]>({
    queryKey: [`/api/agents/${id}/properties`],
  });

  if (agentLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-600">Loading agent details...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <p className="text-gray-600">Agent not found</p>
          <Link href="/">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const forSaleCount = properties.filter(p => p.listingType === 'sale').length;
  const forRentCount = properties.filter(p => p.listingType === 'rent').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 -ml-2">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>

        {/* Agent Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24 ring-4 ring-blue-50">
                  <AvatarImage src={agent.profileImage || undefined} alt={agent.nickname || agent.name} />
                  <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">
                    {(agent.nickname || agent.name)?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {agent.nickname || agent.name}
                  </h1>
                  {agent.license && (
                    <p className="text-sm text-gray-600 mb-4">REN {agent.license}</p>
                  )}
                  
                  {agent.company && (
                    <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-4 mb-4">
                      <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Agency</p>
                        <p className="text-base text-gray-900">{agent.company}</p>
                      </div>
                    </div>
                  )}

                  {agent.bio && (
                    <p className="text-gray-600 mb-4">{agent.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {agent.email && (
                      <Button variant="outline" size="sm" className="gap-2">
                        <Mail className="h-4 w-4" />
                        {agent.email}
                      </Button>
                    )}
                    {agent.phone && (
                      <Button variant="outline" size="sm" className="gap-2">
                        <Phone className="h-4 w-4" />
                        {agent.phone}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2" data-testid="button-contact-agent">
                  <Phone className="h-4 w-4" />
                  Contact Agent
                </Button>
                <Button variant="outline" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Properties Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Properties</p>
                  <p className="text-3xl font-bold text-gray-900">{properties.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Total listings</p>
                </div>
                <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Home className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">For Sale</p>
                  <p className="text-3xl font-bold text-gray-900">{forSaleCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Active listings</p>
                </div>
                <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">For Rent</p>
                  <p className="text-3xl font-bold text-gray-900">{forRentCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Active listings</p>
                </div>
                <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expertise Section */}
        {agent.specialties && agent.specialties.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Expertise</h2>
              <div>
                <p className="text-sm text-gray-600 mb-3">Property Types</p>
                <div className="flex flex-wrap gap-2">
                  {agent.specialties.map((specialty, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Properties Section */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Properties by {agent.nickname || agent.name}
            </h2>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="all">
                  All ({properties.length})
                </TabsTrigger>
                <TabsTrigger value="sale">
                  For Sale ({forSaleCount})
                </TabsTrigger>
                <TabsTrigger value="rent">
                  For Rent ({forRentCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {propertiesLoading ? (
                  <p className="text-gray-600 text-center py-8">Loading properties...</p>
                ) : properties.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No properties listed yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property) => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sale" className="space-y-4">
                {propertiesLoading ? (
                  <p className="text-gray-600 text-center py-8">Loading properties...</p>
                ) : forSaleCount === 0 ? (
                  <p className="text-gray-600 text-center py-8">No properties for sale</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties
                      .filter(p => p.listingType === 'sale')
                      .map((property) => (
                        <PropertyCard key={property.id} property={property} />
                      ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rent" className="space-y-4">
                {propertiesLoading ? (
                  <p className="text-gray-600 text-center py-8">Loading properties...</p>
                ) : forRentCount === 0 ? (
                  <p className="text-gray-600 text-center py-8">No properties for rent</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties
                      .filter(p => p.listingType === 'rent')
                      .map((property) => (
                        <PropertyCard key={property.id} property={property} />
                      ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
