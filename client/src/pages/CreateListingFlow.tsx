import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Home, Building2, MapPin, DollarSign, FileText, Camera, Upload,
  ArrowLeft, ArrowRight, Check, X, Eye, Factory, Bath, Car, Maximize,
  Minus, Plus
} from "lucide-react";
import GoogleMapPicker from "@/components/GoogleMapPicker";
import { NumberInput } from "@/components/NumberInput";

// Step schemas for validation
const listingTypeSchema = z.object({
  listingType: z.enum(["rent", "sale"]),
  propertyCategory: z.enum(["residential", "commercial", "industrial"]),
  propertyType: z.string().min(1, "Property type is required"),
});

const locationSchema = z.object({
  title: z.string().min(1, "Property title is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

const unitDetailsSchema = z.object({
  bedrooms: z.number().min(0, "Bedrooms cannot be negative").optional(),
  bathrooms: z.number().min(0, "Bathrooms cannot be negative"),
  parking: z.number().min(0, "Parking spaces cannot be negative").optional(),
  lotType: z.enum(["intermediate", "end_lot", "corner_lot"], {
    required_error: "Lot type is required",
  }),
  builtUpSize: z.number().min(1, "Built-up size must be greater than 0"),
  landSize: z.number().min(0, "Land size cannot be negative").optional(),
  price: z.number().min(1, "Price must be greater than 0"),
  roi: z.number().min(0, "ROI cannot be negative").max(100, "ROI cannot exceed 100%").optional(),
  propertyCondition: z.string().optional(),
  furnishedCondition: z.string().optional(),
});

// Removed price schema as it's now part of unit details

const legalSchema = z.object({
  tenure: z.enum(["freehold", "leasehold"]),
  titleType: z.enum(["individual", "master", "strata"]),
  landTitleType: z.enum(["residential", "commercial", "industrial", "agriculture"]),
});

const descriptionSchema = z.object({
  description: z.string().min(1, "Description is required"),
  images: z.array(z.string()).min(3, "Minimum 3 photos required"),
  nearbyLandmarks: z.array(z.string()).optional(),
});

type ListingTypeData = z.infer<typeof listingTypeSchema>;
type LocationData = z.infer<typeof locationSchema>;
type UnitDetailsData = z.infer<typeof unitDetailsSchema>;
type LegalData = z.infer<typeof legalSchema>;
type DescriptionData = z.infer<typeof descriptionSchema>;

export type AllFormData = ListingTypeData & LocationData & UnitDetailsData & LegalData & DescriptionData;

const steps = [
  { id: 1, title: "Listing type", icon: Home, description: "Property category and type" },
  { id: 2, title: "Location", icon: MapPin, description: "Address and location details" },
  { id: 3, title: "Unit details", icon: Building2, description: "Property specifications" },
  { id: 4, title: "Legal", icon: FileText, description: "Legal requirements" },
  { id: 5, title: "Description", icon: FileText, description: "Property description" },
  { id: 6, title: "Preview", icon: Eye, description: "Review and submit" },
];

const propertyTypesByCategory = {
  residential: [
    "apartment", "condominium", "house", "studio", "townhouse", "flat",
    "service-residence", "cluster-house", "semi-detached-house", "1-storey-terrace",
    "1.5-storey-terrace", "2-storey-terrace", "2.5-storey-terrace", "3-storey-terrace",
    "3.5-storey-terrace", "4-storey-terrace", "4.5-storey-terrace", "terraced-house",
    "bungalow", "zero-lot-bungalow", "link-bungalow", "bungalow-land", "twin-villa",
    "residential-land-plot"
  ],
  commercial: [
    "commercial", "office", "shop", "shop-office", "retail-office", "retail-space",
    "sofo", "soho", "sovo", "commercial-bungalow", "commercial-semi-d", "hotel-resort",
    "commercial-land"
  ],
  industrial: [
    "industrial", "warehouse", "factory", "industrial-land", "cluster-factory",
    "semi-d-factory", "detached-factory", "terrace-factory", "agricultural-land"
  ]
};

const malaysianStates = [
  "Selangor", "Kuala Lumpur", "Johor", "Penang", "Perak", "Kedah", "Kelantan",
  "Terengganu", "Pahang", "Negeri Sembilan", "Melaka", "Perlis", "Sabah", "Sarawak", "Labuan"
];

// Removed amenities as per user request

export default function CreateListingFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<AllFormData>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user data for preview
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  // Form for current step
  const getStepSchema = (step: number) => {
    switch (step) {
      case 1: return listingTypeSchema;
      case 2: return locationSchema;
      case 3: return unitDetailsSchema;
      case 4: return legalSchema;
      case 5: return descriptionSchema;
      default: return z.object({});
    }
  };

  const form = useForm({
    resolver: zodResolver(getStepSchema(currentStep)),
    defaultValues: formData,
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (propertyData: AllFormData) => {
      const submitData: any = {
        title: propertyData.title,
        description: propertyData.description,
        propertyType: propertyData.propertyType,
        propertyCategory: propertyData.propertyCategory,
        listingType: propertyData.listingType,
        price: propertyData.price.toString(),
        roi: propertyData.roi ? propertyData.roi.toString() : null,
        bedrooms: propertyData.bedrooms ?? 0,
        bathrooms: propertyData.bathrooms,
        parking: propertyData.parking || null,
        builtUpSize: propertyData.builtUpSize,
        landSize: propertyData.landSize || null,
        furnishedCondition: propertyData.furnishedCondition || null,
        address: propertyData.address,
        city: propertyData.city,
        state: propertyData.state,
        postalCode: propertyData.postalCode,
        propertyCondition: propertyData.propertyCondition || null,
        nearbyLandmarks: [],
        tenure: propertyData.tenure,
        titleType: propertyData.titleType,
        landTitleType: propertyData.landTitleType,
        agentLicense: 'REN12345',
        status: 'online',
        featured: false,
        images: propertyData.images || [],
      };
      
      // Only include coordinates if they are provided (let backend geocode otherwise)
      if (propertyData.latitude && propertyData.longitude) {
        submitData.latitude = propertyData.latitude;
        submitData.longitude = propertyData.longitude;
      }
      
      const response = await fetch('/api/agent/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create property');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const creditMsg = data.creditDeducted > 0 
        ? ` ${data.creditDeducted} AI credits have been deducted. Remaining: ${data.remainingCredits} credits.`
        : '';
      
      toast({
        title: "Success!",
        description: `Property listing created successfully.${creditMsg}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/metrics'] }); // Refresh AI credits display
      // Navigate back to dashboard or property list
      window.location.href = '/comprehensive-agent';
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create property listing",
        variant: "destructive",
      });
    }
  });

  const saveDraftMutation = useMutation({
    mutationFn: async (partialData: Partial<AllFormData>) => {
      // NO VALIDATION - Accept any data and provide safe defaults for missing required fields
      const submitData: any = {
        // Required fields with safe defaults for drafts
        title: partialData.title || 'Draft Listing',
        propertyType: partialData.propertyType || 'apartment',
        listingType: partialData.listingType || 'sale',
        agentLicense: 'REN12345',
        status: 'draft',
        featured: false,
        // Required DB fields with safe defaults (accepting ANY value or using defaults)
        bedrooms: partialData.bedrooms !== undefined && partialData.bedrooms !== null ? partialData.bedrooms : 0,
        bathrooms: partialData.bathrooms !== undefined && partialData.bathrooms !== null ? partialData.bathrooms : 0,
        builtUpSize: (partialData.builtUpSize && partialData.builtUpSize > 0) ? partialData.builtUpSize : 1,
        price: (partialData.price && partialData.price > 0) ? partialData.price.toString() : '1',
        // Required location fields with safe defaults
        address: partialData.address || 'TBD',
        city: partialData.city || 'Kuala Lumpur',
        state: partialData.state || 'Kuala Lumpur',
        lotType: partialData.lotType || 'intermediate',
      };
      
      // Override defaults with user-provided values if they exist
      if (partialData.description) submitData.description = partialData.description;
      if (partialData.propertyCategory) submitData.propertyCategory = partialData.propertyCategory;
      if (partialData.parking !== undefined && partialData.parking !== null) submitData.parking = partialData.parking;
      if (partialData.landSize && partialData.landSize > 0) submitData.landSize = partialData.landSize;
      if (partialData.furnishedCondition) submitData.furnishedCondition = partialData.furnishedCondition;
      if (partialData.postalCode) submitData.postalCode = partialData.postalCode;
      // Override location defaults if user provided values
      if (partialData.address && partialData.address !== 'TBD') submitData.address = partialData.address;
      if (partialData.city && partialData.city !== 'Kuala Lumpur') submitData.city = partialData.city;
      if (partialData.state && partialData.state !== 'Kuala Lumpur') submitData.state = partialData.state;
      if (partialData.propertyCondition) submitData.propertyCondition = partialData.propertyCondition;
      if (partialData.tenure) submitData.tenure = partialData.tenure;
      if (partialData.titleType) submitData.titleType = partialData.titleType;
      if (partialData.landTitleType) submitData.landTitleType = partialData.landTitleType;
      if (partialData.images && partialData.images.length > 0) submitData.images = partialData.images;
      if (partialData.latitude && partialData.longitude) {
        submitData.latitude = partialData.latitude;
        submitData.longitude = partialData.longitude;
      }
      
      const response = await fetch('/api/agent/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save draft');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Draft Saved!",
        description: "Your listing has been saved as a draft. You can continue editing it later.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/properties'] });
      // Navigate back to dashboard
      setTimeout(() => {
        window.location.href = '/comprehensive-agent';
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save draft",
        variant: "destructive",
      });
    }
  });

  const handleSaveAndExit = () => {
    // Merge all form data collected so far
    const currentData = form.getValues();
    const allData = { ...formData, ...currentData };
    
    // Save as draft
    saveDraftMutation.mutate(allData);
  };

  const handleNext = async () => {
    const isValid = await form.trigger();
    
    // Additional validation for Description step (step 5) - require minimum 3 photos
    if (currentStep === 5) {
      const images = form.getValues('images') || [];
      if (images.length < 3) {
        toast({
          title: "Validation Error",
          description: "Please upload at least 3 photos to continue",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (isValid) {
      const stepData = form.getValues();
      setFormData(prev => ({ ...prev, ...stepData }));
      
      if (currentStep < steps.length) {
        setCurrentStep(prev => prev + 1);
        form.reset({ ...formData, ...stepData });
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      form.reset(formData);
    }
  };

  const handleSubmit = () => {
    // Merge formData with current form values to ensure all data is included
    const finalData = { ...formData, ...form.getValues() } as AllFormData;
    console.log('Submitting property with data:', finalData);
    console.log('Images count:', finalData.images?.length || 0);
    createPropertyMutation.mutate(finalData);
  };

  const currentStepData = steps[currentStep - 1];
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-8 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="p-2"
              data-testid="button-back"
            >
              <X className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create new listing</h1>
              <p className="text-gray-500">Step {currentStep} of {steps.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Your progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Progress value={progress} className="mb-4" />
                  
                  {steps.map((step) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    
                    return (
                      <button
                        key={step.id}
                        onClick={() => isCompleted || isActive ? setCurrentStep(step.id) : undefined}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer ${
                          isActive 
                            ? 'bg-blue-50 border-2 border-blue-200' 
                            : isCompleted 
                            ? 'bg-green-50 border-2 border-green-200 hover:bg-green-100'
                            : 'bg-gray-50 border-2 border-gray-200'
                        } ${!isCompleted && !isActive ? 'cursor-not-allowed opacity-60' : ''}`}
                        data-testid={`step-${step.id}`}
                        disabled={!isCompleted && !isActive}
                      >
                        <div className={`p-2 rounded-full ${
                          isActive 
                            ? 'bg-blue-100 text-blue-600' 
                            : isCompleted 
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isCompleted ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Icon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className={`font-medium text-sm ${
                            isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-500'
                          }`}>
                            {step.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {step.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="h-fit min-h-[600px]">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <currentStepData.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
                    <p className="text-gray-600 mt-1">{currentStepData.description}</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 flex-1 flex flex-col">
                <Form {...form}>
                  <div className="flex-1">
                    {/* Step Content */}
                    {currentStep === 1 && <ListingTypeStep form={form} />}
                    {currentStep === 2 && <LocationStep form={form} />}
                    {currentStep === 3 && <UnitDetailsStep form={form} />}
                    {currentStep === 4 && <LegalStep form={form} />}
                    {currentStep === 5 && <DescriptionStep form={form} />}
                    {currentStep === 6 && <PreviewStep formData={{ ...formData, ...form.getValues() }} />}
                  </div>
                </Form>

                {/* Navigation */}
                <div className="flex justify-between items-center mt-auto pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className="px-6 py-2"
                    data-testid="button-previous"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleSaveAndExit}
                      disabled={saveDraftMutation.isPending}
                      className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                      data-testid="button-save-exit"
                    >
                      {saveDraftMutation.isPending ? "Saving..." : "Save and Exit"}
                    </Button>

                    {currentStep < steps.length ? (
                      <Button
                        onClick={handleNext}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                        data-testid="button-next"
                      >
                        Next
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmit}
                        disabled={createPropertyMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                        data-testid="button-submit"
                      >
                        {createPropertyMutation.isPending ? "Creating..." : "Create Listing"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step Components - Exported for reuse in EditPropertyFlow
export function ListingTypeStep({ form, disabled = false }: { form: any; disabled?: boolean }) {
  const category = form.watch("propertyCategory");

  return (
    <div className="space-y-6">
      {/* Listing Category */}
      <div>
        <h3 className="text-lg font-medium mb-4">This listing is</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="propertyCategory"
            render={({ field }) => (
              <FormItem className="h-full">
                <FormControl>
                  <button
                    type="button"
                    onClick={() => !disabled && field.onChange("residential")}
                    disabled={disabled}
                    className={`w-full h-full min-h-[120px] p-6 border-2 rounded-lg text-left transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md'} flex flex-col justify-start ${
                      field.value === "residential" 
                        ? "border-blue-500 bg-blue-50 shadow-md" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    data-testid="button-residential"
                  >
                    <Home className="w-8 h-8 mb-3 text-blue-600" />
                    <div className="font-semibold mb-2">Residential</div>
                    <div className="text-sm text-gray-600 leading-relaxed">
                      Houses, Condos, Apartments, Terraces
                    </div>
                  </button>
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="propertyCategory"
            render={({ field }) => (
              <FormItem className="h-full">
                <FormControl>
                  <button
                    type="button"
                    onClick={() => !disabled && field.onChange("commercial")}
                    disabled={disabled}
                    className={`w-full h-full min-h-[120px] p-6 border-2 rounded-lg text-left transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md'} flex flex-col justify-start ${
                      field.value === "commercial" 
                        ? "border-blue-500 bg-blue-50 shadow-md" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    data-testid="button-commercial"
                  >
                    <Building2 className="w-8 h-8 mb-3 text-blue-600" />
                    <div className="font-semibold mb-2">Commercial</div>
                    <div className="text-sm text-gray-600 leading-relaxed">
                      Offices, Shops, Retail Spaces
                    </div>
                  </button>
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="propertyCategory"
            render={({ field }) => (
              <FormItem className="h-full">
                <FormControl>
                  <button
                    type="button"
                    onClick={() => !disabled && field.onChange("industrial")}
                    disabled={disabled}
                    className={`w-full h-full min-h-[120px] p-6 border-2 rounded-lg text-left transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md'} flex flex-col justify-start ${
                      field.value === "industrial" 
                        ? "border-blue-500 bg-blue-50 shadow-md" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    data-testid="button-industrial"
                  >
                    <Factory className="w-8 h-8 mb-3 text-blue-600" />
                    <div className="font-semibold mb-2">Industrial</div>
                    <div className="text-sm text-gray-600 leading-relaxed">
                      Factories, Warehouses, Land
                    </div>
                  </button>
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Sale/Rent */}
      <div>
        <h3 className="text-lg font-medium mb-4">For</h3>
        <div className="flex w-fit border-2 border-gray-200 rounded-lg overflow-hidden">
          <FormField
            control={form.control}
            name="listingType"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <button
                    type="button"
                    onClick={() => !disabled && field.onChange("sale")}
                    disabled={disabled}
                    className={`px-8 py-3 text-center transition-all border-r border-gray-200 ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${
                      field.value === "sale" 
                        ? "bg-blue-50 text-blue-700" 
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    data-testid="button-sale"
                  >
                    <div className="font-semibold">Sale</div>
                  </button>
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="listingType"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <button
                    type="button"
                    onClick={() => !disabled && field.onChange("rent")}
                    disabled={disabled}
                    className={`px-8 py-3 text-center transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${
                      field.value === "rent" 
                        ? "bg-blue-50 text-blue-700" 
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    data-testid="button-rent"
                  >
                    <div className="font-semibold">Rent</div>
                  </button>
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Property Type */}
      {category && (
        <div>
          <h3 className="text-lg font-medium mb-4">Property Type</h3>
          <FormField
            control={form.control}
            name="propertyType"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled}>
                  <FormControl>
                    <SelectTrigger className="h-10" data-testid="select-property-type" disabled={disabled}>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {propertyTypesByCategory[category as keyof typeof propertyTypesByCategory]?.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}

export function LocationStep({ form, disabled = false }: { form: any; disabled?: boolean }) {
  const [mapMarker, setMapMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>([3.139, 101.6869]); // Default KL center
  const { toast } = useToast();
  
  // Watch form values to potentially center map
  const city = form.watch("city");
  const address = form.watch("address");
  
  const handleMapClick = (lat: number, lng: number) => {
    setMapMarker({ lat, lng });
    // Update hidden coordinate fields
    form.setValue("latitude", lat.toString());
    form.setValue("longitude", lng.toString());
  };

  const searchLocation = async (query: string) => {
    if (!query.trim()) return;
    
    setIsGeocoding(true);
    try {
      // Use backend API for geocoding to keep API key secure
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.result) {
          const { coordinates, properties } = data.result;
          const [lng, lat] = coordinates;
          
          // Use enhanced parsed data if available
          const fullAddress = properties.parsedAddress || properties.name || query;
          const cityName = properties.parsedCity || properties.locality || properties.county || "";
          const stateName = properties.parsedState || properties.region || properties.macroregion || "";
          const postalCode = properties.parsedPostalCode || properties.postcode || "";
          
          // Update form fields
          form.setValue("title", query);
          form.setValue("address", fullAddress);
          if (cityName) form.setValue("city", cityName);
          if (stateName) form.setValue("state", stateName);
          if (postalCode) form.setValue("postalCode", postalCode);
          form.setValue("latitude", lat.toString());
          form.setValue("longitude", lng.toString());
          
          console.log('Auto-filled fields:', { fullAddress, cityName, stateName, postalCode });
          
          // Update map marker and center
          setMapMarker({ lat, lng });
          setMapCenter([lat, lng]);
          
          toast({
            title: "Location Found",
            description: `Auto-filled details for ${query} in ${cityName}`,
          });
        } else {
          toast({
            title: "Location Not Found",
            description: "Please enter the details manually",
            variant: "destructive",
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Geocoding request failed';
        
        toast({
          title: "Location Not Available",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast({
        title: "Search Error",
        description: "Could not search for location. Please enter details manually.",
        variant: "destructive",
      });
    }
    setIsGeocoding(false);
  };

  return (
    <div className="space-y-6">
      {/* Location Search */}
      {!disabled && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium">Location</h3>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-3">
              Search for your property location (e.g., "Casa Indah 1, Kota Damansara") and we'll auto-fill the details for you.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Search property location..."
                value={locationSearchQuery}
                onChange={(e) => setLocationSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    searchLocation(locationSearchQuery);
                  }
                }}
                data-testid="input-location-search"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={() => searchLocation(locationSearchQuery)}
                disabled={isGeocoding || !locationSearchQuery.trim()}
                data-testid="button-search-location"
              >
                {isGeocoding ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Property Title *</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Spacious 3BR Condo in Mont Kiara" {...field} disabled={disabled} data-testid="input-title" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address *</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Enter full property address"
                className="min-h-[80px]"
                {...field}
                disabled={disabled}
                data-testid="textarea-address"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="street"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Street (Optional)</FormLabel>
            <FormControl>
              <Input 
                placeholder="e.g., Jalan Damansara, Persiaran KLCC"
                {...field}
                disabled={disabled}
                data-testid="input-street"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Kuala Lumpur" {...field} disabled={disabled} data-testid="input-city" />
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
              <Select onValueChange={field.onChange} value={field.value} disabled={disabled}>
                <FormControl>
                  <SelectTrigger data-testid="select-state" disabled={disabled}>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {malaysianStates.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Input placeholder="e.g., 50088" {...field} disabled={disabled} data-testid="input-postal-code" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Interactive Map for Location Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium">Pin Property Location</h3>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-2">
            {disabled ? (
              <strong>View only:</strong>
            ) : (
              <strong>Click on the map</strong>
            )} {disabled ? 'Current property location is shown below' : 'to mark the exact location of your property. This helps potential buyers/tenants find your listing easily.'}
          </p>
          {mapMarker && (
            <p className="text-sm text-green-800">
              ✓ Location pinned: {mapMarker.lat.toFixed(6)}, {mapMarker.lng.toFixed(6)}
            </p>
          )}
        </div>
        
        <div className={`h-[400px] border-2 border-gray-200 rounded-lg overflow-hidden ${disabled ? 'opacity-60' : ''}`}>
          <GoogleMapPicker
            center={mapCenter}
            marker={mapMarker}
            onMapClick={disabled ? () => {} : handleMapClick}
            className="h-full w-full"
          />
        </div>
        
        {!mapMarker && !disabled && (
          <p className="text-sm text-gray-600 text-center">
            Click anywhere on the map above to set your property location
          </p>
        )}
      </div>

      {/* Hidden coordinate fields */}
      <div className="hidden">
        <FormField
          control={form.control}
          name="latitude"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input type="hidden" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="longitude"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input type="hidden" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

export function UnitDetailsStep({ form }: { form: any }) {
  // Watch the listing type and property category to dynamically change labels
  const listingType = form.watch("listingType");
  const propertyCategory = form.watch("propertyCategory");
  const isRental = listingType === "rent";
  const isCommercial = propertyCategory === "commercial";
  const isResidential = propertyCategory === "residential";
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Rooms</h3>
        
        {/* Bedrooms - Only show for residential */}
        {isResidential && (
          <FormField
            control={form.control}
            name="bedrooms"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-base font-normal">Bedrooms</FormLabel>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-lg"
                      onClick={() => field.onChange(Math.max(0, (field.value || 0) - 1))}
                      data-testid="button-bedrooms-minus"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-20 text-center text-gray-500" data-testid="text-bedrooms-value">
                      {field.value || "Select"}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-lg"
                      onClick={() => field.onChange((field.value || 0) + 1)}
                      data-testid="button-bedrooms-plus"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="bathrooms"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel className="text-base font-normal">Bathrooms</FormLabel>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-lg"
                    onClick={() => field.onChange(Math.max(0, (field.value || 0) - 1))}
                    data-testid="button-bathrooms-minus"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-20 text-center text-gray-500" data-testid="text-bathrooms-value">
                    {field.value || "Select"}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-lg"
                    onClick={() => field.onChange((field.value || 0) + 1)}
                    data-testid="button-bathrooms-plus"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Car Park - Only show for residential */}
        {isResidential && (
          <FormField
            control={form.control}
            name="parking"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-base font-normal">Car Park (optional)</FormLabel>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-lg"
                      onClick={() => field.onChange(Math.max(0, (field.value || 0) - 1))}
                      data-testid="button-parking-minus"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-20 text-center text-gray-500" data-testid="text-parking-value">
                      {field.value || "Select"}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-lg"
                      onClick={() => field.onChange((field.value || 0) + 1)}
                      data-testid="button-parking-plus"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Lot Type</h3>
        
        <FormField
          control={form.control}
          name="lotType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lot Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-lot-type">
                    <SelectValue placeholder="Select lot type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="end_lot">End Lot</SelectItem>
                  <SelectItem value="corner_lot">Corner Lot</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Size</h3>
        
        <FormField
          control={form.control}
          name="builtUpSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Built-up *</FormLabel>
              <FormControl>
                <div className="relative">
                  <NumberInput 
                    value={field.value}
                    onChange={(value) => field.onChange(value || 0)}
                    placeholder="Enter Built Up" 
                    className="pr-16"
                    data-testid="input-built-up-size"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    sqft
                  </span>
                </div>
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
              <FormLabel>Land Area (optional)</FormLabel>
              <FormControl>
                <div className="relative">
                  <NumberInput 
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Enter Land Area" 
                    className="pr-16"
                    data-testid="input-land-size"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    sqft
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isRental ? "Monthly Rent (RM) *" : "Sale Price (RM) *"}
              </FormLabel>
              <FormControl>
                <NumberInput 
                  value={field.value}
                  onChange={(value) => field.onChange(value || 0)}
                  placeholder={isRental ? "Enter monthly rent" : "Enter sale price"} 
                  data-testid={isRental ? "input-monthly-rent" : "input-sale-price"}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="roi"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ROI (Optional)</FormLabel>
              <FormControl>
                <div className="relative">
                  <NumberInput 
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Enter ROI" 
                    allowDecimal={true}
                    data-testid="input-roi"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    %
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="furnishedCondition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isCommercial ? "Condition" : "Furnished Condition"}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-furnished-condition">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper" className="z-50">
                  {isCommercial ? (
                    <>
                      <SelectItem value="unfurnished">Bare</SelectItem>
                      <SelectItem value="partially_furnished">Partially Fitted</SelectItem>
                      <SelectItem value="fully_furnished">Fully Fitted</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="unfurnished">Unfurnished</SelectItem>
                      <SelectItem value="partially_furnished">Partially Furnished</SelectItem>
                      <SelectItem value="fully_furnished">Fully Furnished</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

// Removed PriceStep - pricing moved to Unit Details

export function LegalStep({ form }: { form: any }) {
  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          <strong>Legal Information Required:</strong> All fields in this section are mandatory for property compliance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          control={form.control}
          name="tenure"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tenure *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-tenure">
                    <SelectValue placeholder="Select tenure" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="freehold">Freehold</SelectItem>
                  <SelectItem value="leasehold">Leasehold</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="titleType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-title-type">
                    <SelectValue placeholder="Select title type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="strata">Strata</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="landTitleType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Land Title Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-land-title-type">
                    <SelectValue placeholder="Select land title type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="agriculture">Agriculture</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

export function DescriptionStep({ 
  form, 
  uploadedImages: externalUploadedImages, 
  setUploadedImages: externalSetUploadedImages 
}: { 
  form: any; 
  uploadedImages?: string[]; 
  setUploadedImages?: (images: string[]) => void; 
}) {
  const [localUploadedImages, setLocalUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Use external state if provided, otherwise use local state
  const uploadedImages = externalUploadedImages || localUploadedImages;
  const setUploadedImages = externalSetUploadedImages || setLocalUploadedImages;
  const { toast } = useToast();

  const uploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid File",
            description: `${file.name} is not an image file`,
            variant: "destructive",
          });
          continue;
        }

        // Create FormData with the image file
        const formData = new FormData();
        formData.append('image', file);
        
        // Upload file with watermark
        const response = await fetch('/api/objects/upload-with-watermark', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) throw new Error('Failed to upload image with watermark');
        
        const { objectPath } = await response.json();
        newImages.push(objectPath);
      }
      
      const allImages = [...uploadedImages, ...newImages];
      setUploadedImages(allImages);
      form.setValue('images', allImages);
      
      toast({
        title: "Success!",
        description: `${newImages.length} watermarked image(s) uploaded successfully`,
      });
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload images with watermark. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      await uploadFiles(files);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    form.setValue('images', newImages);
  };

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Property Description *</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Describe your property in detail. Include key features, nearby amenities, and what makes this property special."
                className="min-h-[120px]"
                {...field}
                data-testid="textarea-description"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Photo Upload Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <FormLabel className="text-base font-medium">Property Photos *</FormLabel>
          <span className="text-sm text-gray-500">{uploadedImages.length} photo(s) uploaded</span>
        </div>
        
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
            disabled={isUploading}
          />
          <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
          <label
            htmlFor="image-upload"
            className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Upload className="w-4 h-4" />
            {isUploading ? 'Uploading...' : 'Choose Photos'}
          </label>
          <p className="mt-2 text-sm text-gray-500">
            {isDragging 
              ? 'Drop your images here' 
              : 'Drag and drop images here, or click to browse. Minimum 3 photos required.'}
          </p>
        </div>

        {/* Image Preview Grid with Drag & Drop Reordering */}
        {uploadedImages.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              Drag photos to reorder them. The first photo will be the main display image.
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {uploadedImages.map((imagePath, index) => (
                <div 
                  key={`${imagePath}-${index}`} 
                  className="relative group cursor-move"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', index.toString());
                    e.currentTarget.style.opacity = '0.5';
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    const dropIndex = index;
                    
                    if (dragIndex !== dropIndex) {
                      const newImages = [...uploadedImages];
                      const draggedImage = newImages[dragIndex];
                      newImages.splice(dragIndex, 1);
                      newImages.splice(dropIndex, 0, draggedImage);
                      setUploadedImages(newImages);
                      form.setValue('images', newImages);
                    }
                  }}
                >
                  <img
                    src={imagePath}
                    alt={`Property ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border hover:border-blue-400 transition-colors"
                  />
                  
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  
                  {/* Main Badge */}
                  {index === 0 && (
                    <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Main
                    </div>
                  )}
                  
                  {/* Position Number */}
                  <div className="absolute top-1 left-1 bg-black/70 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {index + 1}
                  </div>
                  
                  {/* Move Buttons for better UX */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = [...uploadedImages];
                            [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
                            setUploadedImages(newImages);
                            form.setValue('images', newImages);
                          }}
                          className="bg-white text-gray-700 rounded-full p-1 shadow-md hover:bg-gray-50"
                          title="Move left"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                      )}
                      {index < uploadedImages.length - 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = [...uploadedImages];
                            [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
                            setUploadedImages(newImages);
                            form.setValue('images', newImages);
                          }}
                          className="bg-white text-gray-700 rounded-full p-1 shadow-md hover:bg-gray-50"
                          title="Move right"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadedImages.length < 3 && (
          <div className="text-red-500 text-sm">
            {uploadedImages.length === 0 
              ? "Please upload at least 3 photos to continue" 
              : `Please upload ${3 - uploadedImages.length} more photo(s) (minimum 3 required)`}
          </div>
        )}
      </div>
    </div>
  );
}

export function PreviewStep({ formData }: { formData: Partial<AllFormData> }) {
  const { user } = useAuth();
  const currentUser = user;
  const mainImage = formData.images?.[0];
  const pricePerSqFt = formData.price && formData.builtUpSize ? Number((formData.price / formData.builtUpSize).toFixed(0)).toLocaleString() : null;

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-green-800">
          <strong>Review Complete:</strong> Please review all information before submitting your listing.
        </p>
      </div>

      {/* Credit Cost Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-bold text-lg">💳</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-1">AI Credit Cost</h4>
            <p className="text-sm text-blue-800 mb-2">
              Posting this listing will cost <strong>5 AI credits</strong>
            </p>
            <div className="text-sm text-blue-700">
              <div className="flex items-center justify-between bg-white rounded px-3 py-2">
                <span>Current Credits:</span>
                <span className="font-semibold">500 credits</span>
              </div>
              <div className="flex items-center justify-between bg-blue-100 rounded px-3 py-2 mt-1">
                <span>After Posting:</span>
                <span className="font-semibold">495 credits</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Property Card Preview */}
      <div className="max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold mb-4">Listing Preview</h3>
        <Card className="overflow-hidden border border-gray-200 shadow-sm">
          {/* Image Section */}
          <div className="relative h-64 bg-gray-100">
            {mainImage ? (
              <img 
                src={mainImage} 
                alt={formData.title} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Camera className="w-12 h-12 mx-auto mb-2" />
                  <p>No Image</p>
                </div>
              </div>
            )}
            
            {/* For Rent/Sale Badge */}
            <div className="absolute top-4 left-4">
              <Badge className="bg-blue-500 text-white px-3 py-1">
                For {formData.listingType === 'rent' ? 'Rent' : 'Sale'}
              </Badge>
            </div>
          </div>

          <CardContent className="p-6">
            {/* Price */}
            <div className="mb-4">
              <div className="text-2xl font-bold text-blue-600">
                RM {formData.price?.toLocaleString()}{formData.listingType === 'rent' ? '/month' : ''}
              </div>
              {pricePerSqFt && (
                <div className="text-sm text-gray-500">
                  RM {pricePerSqFt}/sq ft
                </div>
              )}
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 mb-2">{formData.title}</h3>

            {/* Location */}
            <div className="flex items-center text-gray-600 mb-4">
              <MapPin className="w-4 h-4 mr-1" />
              <span className="text-sm">{formData.address}, {formData.city}</span>
            </div>

            {/* Property Details */}
            <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
              <div className="flex items-center">
                <Home className="w-4 h-4 mr-1" />
                {formData.bedrooms} Bedrooms
              </div>
              <div className="flex items-center">
                <Bath className="w-4 h-4 mr-1" />
                {formData.bathrooms} Bathrooms
              </div>
              {formData.parking && formData.parking > 0 && (
                <div className="flex items-center">
                  <Car className="w-4 h-4 mr-1" />
                  {formData.parking} Car Parks
                </div>
              )}
              <div className="flex items-center">
                <Maximize className="w-4 h-4 mr-1" />
                {formData.builtUpSize?.toLocaleString()} sq ft
              </div>
            </div>

            {/* Legal Information Badges */}
            <div className="flex gap-2 mb-4">
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                {formData.tenure === 'freehold' ? 'Freehold' : 'Leasehold'}
              </Badge>
              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                {formData.titleType === 'strata' ? 'Strata Title' : 
                 formData.titleType === 'individual' ? 'Individual Title' : 'Master Title'}
              </Badge>
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                {formData.propertyCategory === 'residential' ? 'Residential' : 
                 formData.propertyCategory === 'commercial' ? 'Commercial' : 'Industrial'}
              </Badge>
            </div>

            {/* Description Preview */}
            <div className="text-sm text-gray-700 mb-4">
              {formData.description && formData.description.length > 100 
                ? `${formData.description.substring(0, 100)}...` 
                : formData.description}
            </div>

            {/* Agent Section */}
            <div className="border-t pt-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-gray-600">
                    {currentUser?.nickname?.[0] || currentUser?.firstName?.[0] || currentUser?.email?.[0]?.toUpperCase() || 'A'}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {currentUser?.nickname || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || currentUser?.email || 'Agent'}
                  </div>
                  <div className="text-xs text-gray-500">Airea Enterprise</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <MapPin className="w-4 h-4 mr-1" />
                  Contact
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  View details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}