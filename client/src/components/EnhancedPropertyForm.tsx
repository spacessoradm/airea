import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getPropertyTypesByCategory, getPropertyTypeDisplayName } from '@shared/propertyTypes';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PropertyMapPicker from "./PropertyMapPicker";
import { 
  MapPin, 
  FileText, 
  Camera, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Building, 
  Calendar,
  Ruler,
  Star,
  Plus,
  X
} from "lucide-react";
import type { InsertProperty, Property } from "@shared/schema";

// Enhanced form schema with strict validation
const enhancedPropertyFormSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters").max(100, "Title too long").optional().or(z.literal("")),
  description: z.string().min(50, "Description must be at least 50 characters to provide adequate details").optional().or(z.literal("")),
  propertyType: z.string().min(1, "Property type is required").optional().or(z.literal("")),
  listingType: z.enum(["rent", "sale"]).optional().default("rent"),
  price: z.string().optional().or(z.literal("")),
  bedrooms: z.number().min(0).max(20).optional().default(0),
  bathrooms: z.number().min(1).max(20).optional().default(1),
  squareFeet: z.number().min(100, "Minimum 100 sq ft required").optional().nullable(),
  address: z.string().min(10, "Complete address is required").optional().or(z.literal("")),
  city: z.string().min(2, "City is required").optional().or(z.literal("")),
  state: z.string().min(2, "State is required").optional().or(z.literal("")),
  postalCode: z.string().min(5, "Valid postal code required").optional().or(z.literal("")),
  latitude: z.string().optional().or(z.literal("")),
  longitude: z.string().optional().or(z.literal("")),
  landSize: z.number().min(1, "Land size must be greater than 0").optional().nullable(),
  propertyCondition: z.enum(["excellent", "good", "fair", "needs_renovation"]).optional().nullable(),
  agentLicense: z.string().min(5, "Valid agent license is required").optional().or(z.literal("")),
  distanceToLRT: z.string().optional().nullable(),
  distanceToMall: z.string().optional().nullable(),
  distanceToSchool: z.string().optional().nullable(),
  images: z.array(z.string()).min(1, "At least one property image is required").optional().default([]),
});

type EnhancedPropertyFormData = z.infer<typeof enhancedPropertyFormSchema>;

interface EnhancedPropertyFormProps {
  onSubmit: (data: InsertProperty) => void;
  initialData?: Property;
  isLoading?: boolean;
}

// Get all property types from our comprehensive mapping
const RESIDENTIAL_TYPES = getPropertyTypesByCategory('residential');
const COMMERCIAL_TYPES = getPropertyTypesByCategory('commercial');
const INDUSTRIAL_TYPES = getPropertyTypesByCategory('industrial');
const LAND_TYPES = getPropertyTypesByCategory('land');

const ALL_PROPERTY_TYPES = [
  ...RESIDENTIAL_TYPES,
  ...COMMERCIAL_TYPES,
  ...INDUSTRIAL_TYPES,
  ...LAND_TYPES
];

// Removed COMMON_AMENITIES constant

export default function EnhancedPropertyForm({ 
  onSubmit, 
  initialData, 
  isLoading = false 
}: EnhancedPropertyFormProps) {
  const [descriptionCount, setDescriptionCount] = useState(0);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const form = useForm<EnhancedPropertyFormData>({
    resolver: zodResolver(enhancedPropertyFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      propertyType: initialData?.propertyType || "apartment",
      listingType: initialData?.listingType || "rent",
      price: initialData?.price?.toString() || "",
      bedrooms: initialData?.bedrooms || 1,
      bathrooms: initialData?.bathrooms || 1,
      squareFeet: initialData?.squareFeet || undefined,
      address: initialData?.address || "",
      city: initialData?.city || "",
      state: initialData?.state || "Kuala Lumpur",
      postalCode: initialData?.postalCode || "",
      latitude: initialData?.latitude?.toString() || "",
      longitude: initialData?.longitude?.toString() || "",
      landSize: (initialData as any)?.landSize || undefined,
      propertyCondition: (initialData?.propertyCondition as any) || "good",
      agentLicense: initialData?.agentLicense || "",
      distanceToLRT: initialData?.distanceToLRT || "",
      distanceToMall: initialData?.distanceToMall || "",
      distanceToSchool: initialData?.distanceToSchool || "",
      images: initialData?.images || [],
    },
  });

  // Remove useEffect hooks for amenities and landmarks

  const handleLocationSelect = (location: { lat: number; lng: number; address: string; displayAddress?: string }) => {
    form.setValue("latitude", location.lat.toString());
    form.setValue("longitude", location.lng.toString());
    form.setValue("address", location.address); // Use full address for database
    
    // Try to extract city and postal code from full address
    const addressParts = location.address.split(', ');
    if (addressParts.length > 1) {
      const postalMatch = location.address.match(/\b\d{5}\b/);
      if (postalMatch) {
        form.setValue("postalCode", postalMatch[0]);
      }
    }
  };

  // Removed amenity and landmark helper functions

  const handleFormSubmit = (data: EnhancedPropertyFormData) => {
    // Clear previous errors
    setFormErrors([]);
    
    // Additional validation
    const errors: string[] = [];
    
    if (!data.latitude || !data.longitude) {
      errors.push("Property location must be selected on the map");
    }
    
    if (data.images.length === 0) {
      errors.push("At least one property image is required");
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    // Convert form data to InsertProperty format
    const propertyData: InsertProperty = {
      ...data,
      price: data.price, // Keep as string for now
      squareFeet: data.squareFeet ?? null,
      landSize: data.landSize ?? null,
      amenities: [], // Set empty array since amenities are removed
      nearbyLandmarks: [], // Set empty array since landmarks are removed
      agentId: "", // Will be set by the parent component
    };

    onSubmit(propertyData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        {/* Form Errors */}
        {formErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {formErrors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Basic Property Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Basic Property Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Spacious 3BR Condo in Mont Kiara" {...field} />
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
                    <FormLabel>Property Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ALL_PROPERTY_TYPES.map((typeObj) => (
                          <SelectItem key={typeObj.type} value={typeObj.type}>
                            {typeObj.displayName}
                          </SelectItem>
                        ))}
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
                  <FormLabel>Property Description * (Minimum 50 characters)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Provide detailed description including layout, condition, nearby facilities, and any unique features..."
                      className="min-h-[120px]"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setDescriptionCount(e.target.value.length);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {descriptionCount}/50 characters minimum ({Math.max(0, 50 - descriptionCount)} more needed)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="listingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Listing Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="rent">For Rent</SelectItem>
                        <SelectItem value="sale">For Sale</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (RM) *</FormLabel>
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
                    <FormLabel>Bedrooms *</FormLabel>
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
                    <FormLabel>Bathrooms *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location & Map */}
        <PropertyMapPicker 
          onLocationSelect={handleLocationSelect}
          initialLocation={
            form.watch("latitude") && form.watch("longitude") 
              ? {
                  lat: parseFloat(form.watch("latitude")),
                  lng: parseFloat(form.watch("longitude")),
                  address: form.watch("address"),
                  displayAddress: form.watch("title") // Use property title as display name if available
                }
              : undefined
          }
        />

        {/* Additional Location Details */}
        <Card>
          <CardHeader>
            <CardTitle>Address Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
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
                    <FormLabel>State *</FormLabel>
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
                    <FormLabel>Postal Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="50088" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Removed Amenities and Landmarks sections */}

        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="squareFeet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Square Feet</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1200"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="landSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Land Size (sq ft)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="5000"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional - applicable for landed properties
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="propertyCondition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Condition *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="needs_renovation">Needs Renovation</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Agent Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Agent Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="agentLicense"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent License Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., REN12345" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your registered real estate agent license number for verification
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button 
            type="submit"
            disabled={isLoading}
            className="min-w-[150px]"
          >
            {isLoading ? "Creating Property..." : initialData ? "Update Property" : "Create Property"}
          </Button>
        </div>
      </form>
    </Form>
  );
}