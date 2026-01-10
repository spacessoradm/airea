import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import { LocationInput } from "@/components/LocationInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertPropertySchema, type InsertProperty, type Property } from "@shared/schema";
import { Plus, Edit, Trash2, Eye, MessageSquare, BarChart3, Home } from "lucide-react";
import { PropertyStatusManager } from "@/components/PropertyStatusManager";
import { AgentPropertyList } from "@/components/AgentPropertyList";
import { z } from "zod";

const propertyFormSchema = insertPropertySchema.extend({
  amenities: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

const AgentDashboard: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [validatedCoordinates, setValidatedCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // UAT MODE: Authentication check disabled for testing
  // Redirect if not authenticated or not an agent
  // useEffect(() => {
  //   if (!authLoading && (!isAuthenticated || user?.role !== 'agent')) {
  //     toast({
  //       title: "Access Denied", 
  //       description: "You need to be an agent to access this page.",
  //       variant: "destructive",
  //     });
  //     setTimeout(() => {
  //       window.location.href = "/";
  //     }, 1000);
  //   }
  // }, [isAuthenticated, user, authLoading, toast]);

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      title: "",
      description: "",
      propertyType: "apartment",
      price: "",
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: undefined,
      address: "",
      city: "",
      state: "Kuala Lumpur",
      postalCode: "",
      latitude: "",
      longitude: "",
      amenities: "",
      images: [],
    },
  });

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/agent/properties"],
    enabled: true, // UAT MODE: Always enabled for testing
  });

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/messages/unread/count"],
    enabled: isAuthenticated,
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      return apiRequest('POST', '/api/properties', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/properties"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Property created",
        description: "Your property has been successfully listed",
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
        description: "Failed to create property",
        variant: "destructive",
      });
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProperty> }) => {
      return apiRequest('PUT', `/api/properties/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/properties"] });
      setIsDialogOpen(false);
      setSelectedProperty(null);
      form.reset();
      toast({
        title: "Property updated",
        description: "Your property has been successfully updated",
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
        description: "Failed to update property",
        variant: "destructive",
      });
    },
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/properties"] });
      toast({
        title: "Property deleted",
        description: "Your property has been successfully removed",
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
        description: "Failed to delete property",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PropertyFormData) => {
    const amenitiesArray = data.amenities 
      ? data.amenities.split(',').map(a => a.trim()).filter(Boolean)
      : [];

    const propertyData: InsertProperty = {
      ...data,
      price: data.price.toString(),
      latitude: data.latitude || "0",
      longitude: data.longitude || "0", 
      agentId: (user as any)?.claims?.sub || (user as any)?.id || "test-agent",
    } as any;
    
    // Add amenities separately since it might not be in the schema
    (propertyData as any).amenities = amenitiesArray;

    if (selectedProperty) {
      updatePropertyMutation.mutate({ id: selectedProperty.id, data: propertyData });
    } else {
      createPropertyMutation.mutate(propertyData);
    }
  };

  const handleEdit = (property: Property) => {
    setSelectedProperty(property);
    form.reset({
      title: property.title,
      description: property.description || "",
      propertyType: property.propertyType,
      price: property.price,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      squareFeet: property.squareFeet ? Number(property.squareFeet) : undefined,
      address: property.address,
      city: property.city,
      state: property.state,
      postalCode: property.postalCode || "",
      latitude: property.latitude || "0",
      longitude: property.longitude || "0",
      amenities: (property as any).amenities?.join(", ") || "",
      images: property.images || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (property && confirm(`Are you sure you want to delete "${property.title}"?`)) {
      deletePropertyMutation.mutate(propertyId);
    }
  };

  const handleCopy = (property: Property) => {
    // Create a copy of the property as a draft
    const draftProperty = {
      ...property,
      status: 'draft' as const,
      title: `Copy of ${property.title}`,
    };
    
    // Remove the id field before creating
    const { id, ...propertyData } = draftProperty;
    
    createPropertyMutation.mutate(propertyData as any);
    
    toast({
      title: "Property Copied",
      description: "Property has been copied to drafts for editing.",
    });
  };

  const stats = {
    totalProperties: properties.length,
    availableProperties: properties.filter((p: Property) => p.status === 'available').length,
    rentedProperties: properties.filter((p: Property) => p.status === 'rented').length,
    pendingProperties: properties.filter((p: Property) => p.status === 'sold' || p.status === 'on_hold').length,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // UAT MODE: Skip authentication check
  // if (!isAuthenticated || user?.role !== 'agent') {
  //   return null;
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
            <p className="text-gray-600">Manage your property listings and communications</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setSelectedProperty(null);
                form.reset();
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedProperty ? "Edit Property" : "Add New Property"}
                </DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Luxury 2BR Apartment" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="propertyType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="apartment">Apartment</SelectItem>
                              <SelectItem value="condominium">Condominium</SelectItem>
                              <SelectItem value="house">House</SelectItem>
                              <SelectItem value="studio">Studio</SelectItem>
                              <SelectItem value="townhouse">Townhouse</SelectItem>
                              <SelectItem value="commercial">Commercial</SelectItem>
                              <SelectItem value="industrial">Industrial</SelectItem>
                              <SelectItem value="land">Land</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your property..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (RM/month)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="2500" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bedrooms</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="bathrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bathrooms</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="squareFeet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Square Feet (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1200"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Smart Location Input with Hybrid Search */}
                  <div className="space-y-4">
                    <LocationInput
                      value={form.watch("address")}
                      onChange={(location, coordinates) => {
                        form.setValue("address", location);
                        if (coordinates) {
                          form.setValue("latitude", coordinates.lat.toString());
                          form.setValue("longitude", coordinates.lng.toString());
                          setValidatedCoordinates(coordinates);
                        }
                      }}
                      onValidationChange={(isValid, coordinates) => {
                        if (isValid && coordinates) {
                          setValidatedCoordinates(coordinates);
                        } else {
                          setValidatedCoordinates(null);
                        }
                      }}
                      placeholder="Enter building name, landmark, or full address (e.g., 'IKEA Damansara', 'KLCC', '123 Jalan Sultan')"
                      label="Property Location"
                      required
                      showValidationStatus
                      className="mb-4"
                    />

                    {/* Additional Location Details (Optional) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Kuala Lumpur" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Kuala Lumpur" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="50088" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="amenities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amenities (comma-separated)</FormLabel>
                        <FormControl>
                          <Input placeholder="Swimming Pool, Gym, Parking, Security" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createPropertyMutation.isPending || updatePropertyMutation.isPending}
                    >
                      {selectedProperty ? "Update Property" : "Create Property"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="messages">
              Messages
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mr-4">
                      <Home className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{stats.totalProperties}</div>
                      <div className="text-sm text-gray-500">Total Properties</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="bg-secondary/10 rounded-full w-12 h-12 flex items-center justify-center mr-4">
                      <BarChart3 className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{stats.availableProperties}</div>
                      <div className="text-sm text-gray-500">Active Listings</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="bg-accent/10 rounded-full w-12 h-12 flex items-center justify-center mr-4">
                      <MessageSquare className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{stats.rentedProperties}</div>
                      <div className="text-sm text-gray-500">Rented</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mr-4">
                      <Eye className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{stats.pendingProperties}</div>
                      <div className="text-sm text-gray-500">Pending</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Properties */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Properties</CardTitle>
              </CardHeader>
              <CardContent>
                {propertiesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 animate-pulse">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                ) : properties.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No properties yet. Create your first listing!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {properties.slice(0, 5).map((property: Property) => (
                      <div key={property.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {property.images && property.images.length > 0 ? (
                            <img 
                              src={property.images[0]} 
                              alt={property.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMiA0Mkw0MCAyOEwyNCAyOEwzMiA0MloiIGZpbGw9IiM5Q0EzQUYiLz4KPGNpcmNsZSBjeD0iMjgiIGN5PSIyMCIgcj0iMyIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                              }}
                            />
                          ) : (
                            <span className="text-xl">🏠</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{property.title}</h4>
                          <p className="text-sm text-gray-500">{property.city}</p>
                        </div>
                        <Badge variant={property.status === 'available' ? 'default' : 'secondary'}>
                          {property.status}
                        </Badge>
                        <div className="text-right">
                          <div className="font-medium">RM {parseFloat(property.price).toLocaleString()}</div>
                          <div className="text-xs text-gray-500">per month</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">My Listings</h2>
                  <p className="text-gray-600">Manage your property listings</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Button>
              </div>
              
              <AgentPropertyList 
                properties={properties}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCopy={handleCopy}
                isLoading={propertiesLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Message Center</h3>
                  <p>Your messages from interested renters will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AgentDashboard;
