import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, Save, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { insertPropertySchema, type InsertProperty, type Property } from "@shared/schema";
import { z } from "zod";

// Import step components from CreateListingFlow
import {
  ListingTypeStep,
  LocationStep,
  UnitDetailsStep,
  LegalStep,
  DescriptionStep,
  PreviewStep,
  type AllFormData,
} from "./CreateListingFlow";

const editPropertySchema = insertPropertySchema.extend({
  amenities: z.string().optional(),
});

type EditPropertyFormData = z.infer<typeof editPropertySchema>;

// Helper function to derive property category from property type
function getPropertyCategory(propertyType: string): "residential" | "commercial" | "industrial" {
  const residential = ["apartment", "condominium", "house", "studio", "townhouse", "flat",
    "service-residence", "cluster-house", "semi-detached-house", "1-storey-terrace",
    "1.5-storey-terrace", "2-storey-terrace", "2.5-storey-terrace", "3-storey-terrace"];
  const commercial = ["commercial", "office", "shop", "shop-office", "retail-office", "retail-space",
    "sofo", "soho", "sovo", "commercial-bungalow", "commercial-semi-d", "hotel-resort", "commercial-land"];
  const industrial = ["industrial", "warehouse", "factory", "industrial-land", "cluster-factory",
    "semi-d-factory", "detached-factory", "terrace-factory", "agricultural-land"];
  
  if (residential.includes(propertyType)) return "residential";
  if (commercial.includes(propertyType)) return "commercial";
  if (industrial.includes(propertyType)) return "industrial";
  return "residential"; // default
}

export default function EditPropertyFlow() {
  const [match, params] = useRoute("/agent/properties/edit/:id");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showPostConfirmation, setShowPostConfirmation] = useState(false);

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
  }) as { data: Property | undefined; isLoading: boolean };

  // Fetch user credits
  const { data: userCredits } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/user");
      if (!response.ok) return 500;
      const userData = await response.json();
      console.log('User data:', userData);
      console.log('AI Credits:', userData.aiCredits);
      const credits = Number(userData.aiCredits);
      console.log('Parsed credits:', credits);
      return !isNaN(credits) ? credits : 500;
    },
    enabled: isAuthenticated,
  }) as { data: number | undefined };

  const [formData, setFormData] = useState<Partial<AllFormData>>({});

  const form = useForm<any>({
    resolver: zodResolver(editPropertySchema),
  });

  // Populate form when property loads
  useEffect(() => {
    if (property) {
      const derivedCategory = getPropertyCategory(property.propertyType);
      const initialFormData = {
        title: property.title,
        description: property.description || "",
        listingType: property.listingType as "sale" | "rent",
        propertyCategory: derivedCategory,
        propertyType: property.propertyType,
        price: parseFloat(property.price.toString()),
        roi: property.roi ? parseFloat(property.roi.toString()) : undefined,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        parking: property.parking || undefined,
        lotType: property.lotType || "intermediate",
        builtUpSize: property.builtUpSize || 0,
        landSize: property.landSize || undefined,
        address: property.address,
        street: property.street || "",
        city: property.city,
        state: property.state,
        postalCode: property.postalCode || "",
        latitude: property.latitude?.toString() || "",
        longitude: property.longitude?.toString() || "",
        tenure: property.tenure || "freehold",
        titleType: property.titleType || "strata",
        landTitleType: property.landTitleType || "residential",
        propertyCondition: property.propertyCondition as "excellent" | "good" | "fair" | "needs_renovation" | undefined,
        furnishedCondition: property.furnishedCondition || undefined,
        nearbyLandmarks: property.nearbyLandmarks || [],
        distanceToLRT: property.distanceToLRT || "",
        distanceToMall: property.distanceToMall || "",
        distanceToSchool: property.distanceToSchool || "",
        images: property.images || [],
      };
      setFormData(initialFormData as Partial<AllFormData>);
      form.reset(initialFormData);
      setUploadedImages(property.images || []);
    }
  }, [property, form]);

  const updatePropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!params?.id) {
        throw new Error("Property ID is missing");
      }
      
      const formattedData: any = {
        ...data,
        price: data.price.toString(),
        latitude: data.latitude ? data.latitude.toString() : null,
        longitude: data.longitude ? data.longitude.toString() : null,
        amenities: data.amenities
          ? data.amenities.split(",").map((item: string) => item.trim()).filter(Boolean)
          : [],
        images: uploadedImages,
      };

      // Don't send postedAt from client - let backend handle it
      delete formattedData.postedAt;

      return apiRequest("PUT", `/api/properties/${params.id}`, formattedData);
    },
    onSuccess: (updatedProperty: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }); // Refresh credits
      
      // Check if this was a draft being posted
      const wasPosted = property?.status === 'draft' && updatedProperty.status === 'online';
      
      const creditMsg = wasPosted && updatedProperty.creditDeducted > 0
        ? ` ${updatedProperty.creditDeducted} AI credits have been deducted. Remaining: ${updatedProperty.remainingCredits} credits.`
        : '';
      
      toast({
        title: wasPosted ? "Listing Posted Successfully!" : "Property Updated",
        description: wasPosted 
          ? `Your listing is now online and visible to users.${creditMsg}`
          : "Your property listing has been successfully updated",
      });
      setLocation('/comprehensive-agent');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update property. Please try again.",
        variant: "destructive",
      });
      console.error("Update error:", error);
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async (partialData: any) => {
      if (!params?.id) {
        throw new Error("Property ID is missing");
      }
      
      // NO VALIDATION - Format data with safe defaults
      const formattedData: any = {
        ...partialData,
        price: partialData.price ? partialData.price.toString() : '1',
        latitude: partialData.latitude ? partialData.latitude.toString() : null,
        longitude: partialData.longitude ? partialData.longitude.toString() : null,
        amenities: partialData.amenities
          ? partialData.amenities.split(",").map((item: string) => item.trim()).filter(Boolean)
          : [],
        images: uploadedImages,
        // Preserve current status (don't demote online listings)
        status: property?.status || 'draft',
      };

      // Don't send postedAt from client
      delete formattedData.postedAt;

      return apiRequest("PUT", `/api/properties/${params.id}`, formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/properties"] });
      
      toast({
        title: "Draft Saved!",
        description: "Your changes have been saved. You can continue editing later.",
      });
      
      // Navigate back to dashboard
      setTimeout(() => {
        setLocation('/comprehensive-agent');
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
      });
      console.error("Save draft error:", error);
    },
  });

  const steps = [
    { id: 1, title: "Property Type", description: "Basic property information" },
    { id: 2, title: "Location", description: "Address and coordinates" },
    { id: 3, title: "Unit Details", description: "Size, rooms, and amenities" },
    { id: 4, title: "Legal Information", description: "Tenure and title details" },
    { id: 5, title: "Description & Photos", description: "Details and images" },
    { id: 6, title: "Review", description: "Confirm all details" },
  ];

  const handleNext = async () => {
    const fields = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fields);
    
    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleSaveAndExit = () => {
    // NO VALIDATION - Get current form state and save as draft
    const currentData = form.getValues();
    const allData = { ...formData, ...currentData };
    saveDraftMutation.mutate(allData);
  };

  const handleSubmit = () => {
    // Check if this is a draft being completed
    if (property?.status === 'draft') {
      setShowPostConfirmation(true);
    } else {
      const formData = form.getValues();
      updatePropertyMutation.mutate(formData);
    }
  };

  const confirmPost = () => {
    const formData = form.getValues();
    // Add status: online to the update when posting a draft
    // postedAt will be set automatically by the backend when status changes to 'online'
    updatePropertyMutation.mutate({ ...formData, status: 'online' });
    setShowPostConfirmation(false);
  };

  const getFieldsForStep = (step: number): (keyof EditPropertyFormData)[] => {
    switch (step) {
      case 1: return ["listingType", "propertyType"];
      case 2: return ["title", "address", "city", "state"];
      case 3: return ["bedrooms", "bathrooms", "builtUpSize", "price"];
      case 4: return ["tenure", "titleType", "landTitleType"];
      case 5: return ["description", "images"];
      default: return [];
    }
  };

  if (isLoading || !property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="h-96 bg-gray-200 rounded-xl mb-8"></div>
          </div>
        </div>
      </div>
    );
  }

  const currentStepData = steps[currentStep - 1];
  
  // Check if this is a posted listing (online, offline, or expired)
  const isPostedListing = property.status === 'online' || property.status === 'offline' || property.status === 'expired';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/agent/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Edit Property Listing</h1>
              <p className="text-gray-600 mt-2">Update your property details</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Edit Progress</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600 mb-4">
                  <span>Step {currentStep} of {steps.length}</span>
                  <span>{Math.round((currentStep / steps.length) * 100)}%</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / steps.length) * 100}%` }}
                  ></div>
                </div>

                <div className="space-y-3">
                  {steps.map((step, index) => {
                    const isActive = currentStep === step.id;
                    // For posted listings, show all steps as completed (green tick)
                    const isCompleted = isPostedListing ? true : currentStep > step.id;

                    return (
                      <button
                        key={step.id}
                        onClick={() => setCurrentStep(step.id)}
                        className={`w-full p-3 text-left rounded-lg transition-all flex items-center gap-3 ${
                          isActive
                            ? 'bg-blue-50 border-2 border-blue-200 hover:bg-blue-100'
                            : isCompleted
                            ? 'bg-green-50 border-2 border-green-200 hover:bg-green-100'
                            : 'bg-gray-50 border-2 border-gray-200'
                        }`}
                        data-testid={`step-${step.id}`}
                      >
                        <div className={`p-2 rounded-full ${
                          isActive 
                            ? 'bg-blue-100 text-blue-600' 
                            : isCompleted 
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isCompleted ? "✓" : step.id}
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
                    <span className="text-blue-600 font-semibold">{currentStep}</span>
                  </div>
                  <div>
                    <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
                    <p className="text-gray-600 mt-1">{currentStepData.description}</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 flex-1 flex flex-col">
                {isPostedListing && (currentStep === 1 || currentStep === 2) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-amber-800">
                      <strong>View Only:</strong> Property type and location cannot be changed for posted listings. You can view the information below.
                    </p>
                  </div>
                )}
                <Form {...form}>
                  <div className="flex-1">
                    {/* Step Content - Reuse from CreateListingFlow */}
                    {currentStep === 1 && <ListingTypeStep form={form} disabled={isPostedListing} />}
                    {currentStep === 2 && <LocationStep form={form} disabled={isPostedListing} />}
                    {currentStep === 3 && <UnitDetailsStep form={form} />}
                    {currentStep === 4 && <LegalStep form={form} />}
                    {currentStep === 5 && (
                      <DescriptionStep 
                        form={form} 
                        uploadedImages={uploadedImages}
                        setUploadedImages={setUploadedImages}
                      />
                    )}
                    {currentStep === 6 && (
                      <div className="space-y-6">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                          <p className="text-sm text-green-800">
                            <strong>Ready to Update:</strong> Please review all information before updating your listing.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Basic Info */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900">Property Details</h4>
                            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                              <p><strong>Title:</strong> {form.getValues("title")}</p>
                              <p><strong>Type:</strong> {form.getValues("propertyType")}</p>
                              <p><strong>Price:</strong> RM {parseFloat(form.getValues("price") || "0").toLocaleString()}</p>
                              <p><strong>Bedrooms:</strong> {form.getValues("bedrooms")}</p>
                              <p><strong>Bathrooms:</strong> {form.getValues("bathrooms")}</p>
                            </div>
                          </div>
                          
                          {/* Location */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900">Location</h4>
                            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                              <p><strong>Address:</strong> {form.getValues("address")}</p>
                              <p><strong>City:</strong> {form.getValues("city")}</p>
                              <p><strong>State:</strong> {form.getValues("state")}</p>
                              <p><strong>Legal:</strong> {form.getValues("tenure")} / {form.getValues("titleType")}</p>
                            </div>
                          </div>
                        </div>
                        
                        {uploadedImages.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900">Photos ({uploadedImages.length})</h4>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                              {uploadedImages.map((image, index) => (
                                <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                  <img 
                                    src={image} 
                                    alt={`Property photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                        disabled={updatePropertyMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                        data-testid="button-update"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updatePropertyMutation.isPending 
                          ? (property?.status === 'draft' ? "Posting..." : "Updating...")
                          : (property?.status === 'draft' ? "Post Listing" : "Update Listing")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Posting Draft */}
      <AlertDialog open={showPostConfirmation} onOpenChange={setShowPostConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post Listing Online?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will post your listing online and make it visible to all users.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-800">AI Credits Cost:</span>
                  <span className="font-semibold text-blue-900">5 credits</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-blue-800">Remaining Credits:</span>
                  <span className="font-semibold text-blue-900">
                    {typeof userCredits === 'number' && !isNaN(userCredits) 
                      ? (userCredits - 5) 
                      : 495} credits
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Credits are non-refundable once spent on posting.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmPost}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm & Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}