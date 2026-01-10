import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Home, 
  Plus, 
  BarChart3, 
  MessageSquare, 
  Eye, 
  Edit, 
  Trash2, 
  MapPin, 
  Shield, 
  Star,
  CheckCircle,
  AlertTriangle,
  Building,
  Calendar,
  Users,
  TrendingUp
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import EnhancedPropertyForm from "@/components/EnhancedPropertyForm";
import Header from "@/components/Header";
import type { InsertProperty, Property } from "@shared/schema";

export default function EnhancedAgentDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Mock data for demonstration
  const mockProperties = [
    {
      id: "1",
      title: "Luxury 3BR Condo in Mont Kiara",
      propertyType: "condominium",
      listingType: "rent" as const,
      price: "3500",
      bedrooms: 3,
      bathrooms: 2,
      address: "Mont Kiara, Kuala Lumpur",
      city: "Kuala Lumpur",
      state: "Kuala Lumpur",
      description: "Beautiful modern condominium with stunning city views, fully furnished with premium amenities including swimming pool, gym, and 24-hour security.",
      verificationStatus: "verified" as const,
      amenities: ["Swimming Pool", "Gym", "Security", "Parking"],
      nearbyLandmarks: ["IKEA Damansara", "Publika Mall", "Mont Kiara International School"],
      agentLicense: "REN12345",
      latitude: "3.1698",  
      longitude: "101.6502"
    },
    {
      id: "2", 
      title: "Modern Studio in KLCC",
      propertyType: "studio",
      listingType: "rent" as const,
      price: "2200",
      bedrooms: 0,
      bathrooms: 1,
      address: "KLCC, Kuala Lumpur",
      city: "Kuala Lumpur", 
      state: "Kuala Lumpur",
      description: "Compact yet stylish studio apartment in the heart of KLCC with easy access to public transport and shopping centers.",
      verificationStatus: "pending" as const,
      amenities: ["Air Conditioning", "Furnished"],
      nearbyLandmarks: ["KLCC Twin Towers", "Suria KLCC", "KLCC Park"],
      agentLicense: "REN12345",
      latitude: "3.1578",
      longitude: "101.7123"
    }
  ];

  const mockStats = {
    totalProperties: 12,
    activeListings: 8,
    pendingVerification: 2,
    totalViews: 1247,
    inquiries: 23,
    verificationRate: 85
  };

  const createPropertyMutation = useMutation({
    mutationFn: (data: InsertProperty) => apiRequest('/api/properties', 'POST', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Property created successfully with enhanced verification",
      });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create property",
        variant: "destructive",
      });
    },
  });

  const handleEnhancedSubmit = (data: InsertProperty) => {
    // Add mock agent ID
    const propertyData = {
      ...data,
      agentId: "mock-agent-id",
    };
    createPropertyMutation.mutate(propertyData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              Enhanced Agent Portal
            </h1>
            <p className="text-gray-600 mt-2">
              Comprehensive property management with accountability and verification features
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => setSelectedProperty(null)}
              >
                <Plus className="h-4 w-4" />
                Add Verified Property
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Add New Property with Enhanced Verification
                </DialogTitle>
              </DialogHeader>
              
              <EnhancedPropertyForm
                onSubmit={handleEnhancedSubmit}
                initialData={selectedProperty || undefined}
                isLoading={createPropertyMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Accountability Alert */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-blue-800">
            <strong>Enhanced Verification System:</strong> All properties require agent license verification, 
            precise GPS coordinates, detailed descriptions (50+ characters), amenities, and nearby landmarks 
            to ensure accountability and prevent misuse.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Properties
            </TabsTrigger>
            <TabsTrigger value="verification" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Verification
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockStats.totalProperties}</div>
                  <p className="text-xs text-muted-foreground">+2 from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockStats.activeListings}</div>
                  <p className="text-xs text-muted-foreground">Verified & Published</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockStats.totalViews}</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Verification Rate</CardTitle>
                  <Shield className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockStats.verificationRate}%</div>
                  <Progress value={mockStats.verificationRate} className="mt-2" />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Enhanced Accountability Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Agent License Verification</p>
                      <p className="text-sm text-gray-600">Required license number for all listings</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">GPS Coordinate Validation</p>
                      <p className="text-sm text-gray-600">Precise location mapping required</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Detailed Property Information</p>
                      <p className="text-sm text-gray-600">Minimum 50-character descriptions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Mandatory Amenities & Landmarks</p>
                      <p className="text-sm text-gray-600">Required for user navigation</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm">Property "Luxury 3BR Condo" verified</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm">New inquiry from potential tenant</p>
                      <p className="text-xs text-gray-500">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm">Studio property pending verification</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Property Listings</h2>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                {mockProperties.length} Properties
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mockProperties.map((property) => (
                <Card key={property.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{property.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {property.propertyType} • {property.bedrooms} bed • {property.bathrooms} bath
                        </p>
                      </div>
                      <Badge 
                        variant={property.verificationStatus === 'verified' ? "default" : "secondary"}
                        className={property.verificationStatus === 'verified' ? "bg-green-600" : "bg-yellow-600"}
                      >
                        {property.verificationStatus}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-2xl font-bold text-blue-600">
                      RM {property.price}
                      <span className="text-sm font-normal text-gray-600">/month</span>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {property.description}
                    </p>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {property.address}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">License: {property.agentLicense}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {property.amenities?.slice(0, 3).map((amenity) => (
                          <Badge key={amenity} variant="outline" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                        {property.amenities && property.amenities.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{property.amenities.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="flex items-center gap-1">
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Messages
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Verification Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    All properties must meet these enhanced verification requirements to prevent misuse and ensure quality listings.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Required Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Agent license number (minimum 5 characters)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Precise GPS coordinates via map selection</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Detailed description (50+ characters)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">At least one amenity specification</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Nearby landmarks for user navigation</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Validation Features</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Star className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Google Maps integration for location accuracy</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Star className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Property condition assessment required</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Star className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Year built and renovation history</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Star className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Square footage validation (min 100 sq ft)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Star className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Complete address with postal code</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Enhanced Accountability Benefits</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Prevents incomplete or misleading property listings</li>
                    <li>• Ensures agents are verified and accountable</li>
                    <li>• Provides accurate location data for users</li>
                    <li>• Maintains high-quality property database</li>
                    <li>• Reduces fraudulent listings and misuse</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Recent Inquiries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Inquiry about Luxury 3BR Condo</p>
                      <p className="text-sm text-gray-600">From: John Doe • 2 hours ago</p>
                    </div>
                    <Badge variant="secondary">New</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Question about KLCC Studio availability</p>
                      <p className="text-sm text-gray-600">From: Sarah Lee • 1 day ago</p>
                    </div>
                    <Badge variant="outline">Replied</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}