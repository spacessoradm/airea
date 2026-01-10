import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Home, Building2, Factory, Check, Upload, Loader2 } from "lucide-react";

interface ListingData {
  listingType: 'rent' | 'sale' | '';
  propertyType: string;
  title: string;
  address: string;
  city: string;
  state: string;
  unitDetails: {
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
  };
  price: number;
  description: string;
  images: File[];
  isAuction: boolean;
  availability: string;
  coAgencyListing: boolean;
  referenceNumber: string;
  // Legal information fields (mandatory)
  tenure: 'freehold' | 'leasehold' | '';
  titleType: 'individual' | 'strata' | 'master' | '';
  landTitleType: 'residential' | 'commercial' | 'industrial' | 'agriculture' | '';
}

const steps = [
  { id: 1, name: "Listing type", completed: false },
  { id: 2, name: "Location", completed: false },
  { id: 3, name: "Unit details", completed: false },
  { id: 4, name: "Price", completed: false },
  { id: 5, name: "Legal information", completed: false },
  { id: 6, name: "Description", completed: false },
  { id: 7, name: "Gallery", completed: false },
  { id: 8, name: "Platform posting", completed: false },
  { id: 9, name: "Preview", completed: false },
];

// Validation utility
const validateStep = (step: number, data: ListingData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  switch (step) {
    case 1: // Listing Type
      if (!data.listingType) errors.push('Please select listing type (Sale/Rent)');
      if (!data.propertyType) errors.push('Please select property type');
      break;

    case 2: // Location
      if (!data.address?.trim()) errors.push('Property address is required');
      if (!data.city) errors.push('City is required');
      if (!data.state) errors.push('State is required');
      break;

    case 3: // Unit Details
      if (!data.unitDetails.bedrooms || data.unitDetails.bedrooms < 0) {
        errors.push('Valid bedroom count is required');
      }
      if (!data.unitDetails.bathrooms || data.unitDetails.bathrooms < 0) {
        errors.push('Valid bathroom count is required');
      }
      if (!data.unitDetails.squareFeet || data.unitDetails.squareFeet <= 0) {
        errors.push('Valid square footage is required');
      }
      break;

    case 4: // Price
      if (!data.price || data.price <= 0) {
        errors.push('Valid price is required');
      }
      break;

    case 5: // Legal Information
      if (!data.tenure) errors.push('Tenure is required');
      if (!data.titleType) errors.push('Title type is required');
      if (!data.landTitleType) errors.push('Land title type is required');
      break;

    case 6: // Description
      if (!data.description?.trim()) {
        errors.push('Property description is required');
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default function CreateListing() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  // Initialization with default value
  const [listingData, setListingData] = useState<ListingData>({
    listingType: "",
    propertyType: "",
    title: "",
    address: "",
    city: "",
    state: "",
    unitDetails: { bedrooms: 0, bathrooms: 0, squareFeet: 0 },
    price: 0,
    description: "",
    images: [],
    isAuction: false,
    availability: "",
    coAgencyListing: false,
    referenceNumber: "",
    // Initialize legal information fields
    tenure: "",
    titleType: "",
    landTitleType: "",
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (propertyData: any) => {
      const response = await fetch('/api/agent/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(propertyData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create property');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Property Listed Successfully!",
        description: `Your property "${data.title}" is now live and searchable.`,
      });
      
      // Navigate to search results to show the new property
      setTimeout(() => {
        navigate(`/search?newListing=${data.id}`);
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create listing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const progress = (currentStep / steps.length) * 100;

  const nextStep = () => {
    // Validate current step
    const validation = validateStep(currentStep, listingData);
    
    if (!validation.isValid) {
      toast({
        title: "Please complete all required fields",
        description: validation.errors.join(', '),
        variant: "destructive",
      });
      return;
    }
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmitListing = () => {
    // Final validation before submission
    const allStepsValid = Array.from({ length: 6 }, (_, i) => i + 1)
      .every(step => validateStep(step, listingData).isValid);

    if (!allStepsValid) {
      toast({
        title: "Incomplete Form",
        description: "Please complete all required fields before submitting",
        variant: "destructive",
      });
      return;
    }

    // Convert the form data with safe defaults
    const propertyData = {
      title: listingData.title?.trim() || `${listingData.propertyType} Property`,
      description: listingData.description?.trim() || 
        `Beautiful ${listingData.propertyType} property with ${listingData.unitDetails.bedrooms} bedrooms and ${listingData.unitDetails.bathrooms} bathrooms.`,
      propertyType: mapPropertyType(listingData.propertyType),
      listingType: listingData.listingType,
      price: (listingData.price || 0).toString(),
      bedrooms: listingData.unitDetails?.bedrooms ?? 0,
      bathrooms: listingData.unitDetails?.bathrooms ?? 0,
      squareFeet: listingData.unitDetails?.squareFeet ?? 0,
      address: listingData.address?.trim() || '',
      city: listingData.city || '',
      state: listingData.state || '',
      amenities: [],
      images: [],
      agentLicense: "REN12345",
      latitude: "3.139",
      longitude: "101.6869",
      // Ensure legal fields are never null
      tenure: listingData.tenure || 'freehold',
      titleType: listingData.titleType || 'individual',
      landTitleType: listingData.landTitleType || 'residential',
    };

    createPropertyMutation.mutate(propertyData);
  };

  // Map property types to match schema
  const mapPropertyType = (type: string) => {
    const mappings: { [key: string]: string } = {
      'residential': 'apartment',
      'commercial': 'shop-office',
      'industrial': 'factory',
    };
    return mappings[type] || 'apartment';
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Listing Type
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">This listing is</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card 
                  className={`cursor-pointer transition-all border-2 ${
                    listingData.propertyType === 'residential' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setListingData({...listingData, propertyType: 'residential'})}
                >
                  <CardContent className="p-6 text-center">
                    <Home className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                    <h3 className="font-semibold text-lg">Residential</h3>
                    <p className="text-sm text-gray-600 mt-2">Bungalow, Condo, Terrace House</p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all border-2 ${
                    listingData.propertyType === 'commercial' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setListingData({...listingData, propertyType: 'commercial'})}
                >
                  <CardContent className="p-6 text-center">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <h3 className="font-semibold text-lg">Commercial</h3>
                    <p className="text-sm text-gray-600 mt-2">Office, Factory, Agricultural Land</p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all border-2 ${
                    listingData.propertyType === 'industrial' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setListingData({...listingData, propertyType: 'industrial'})}
                >
                  <CardContent className="p-6 text-center">
                    <Factory className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                    <h3 className="font-semibold text-lg">Industrial</h3>
                    <p className="text-sm text-gray-600 mt-2">Factory, Warehouse, Industrial Land</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">For</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer transition-all border-2 ${
                    listingData.listingType === 'sale' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setListingData({...listingData, listingType: 'sale'})}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 font-bold">$</span>
                    </div>
                    <h3 className="font-semibold text-lg">Sale</h3>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all border-2 ${
                    listingData.listingType === 'rent' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setListingData({...listingData, listingType: 'rent'})}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">📅</span>
                    </div>
                    <h3 className="font-semibold text-lg">Rent</h3>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="auction"
                  checked={listingData.isAuction}
                  onCheckedChange={(checked) => setListingData({...listingData, isAuction: checked as boolean})}
                />
                <Label htmlFor="auction">This property will be auctioned (optional)</Label>
              </div>

              <div>
                <Label className="text-lg font-semibold">It will be available</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Card 
                    className={`cursor-pointer transition-all border-2 ${
                      listingData.availability === 'immediately' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setListingData({...listingData, availability: 'immediately'})}
                  >
                    <CardContent className="p-4 text-center">
                      <h3 className="font-semibold">Immediately</h3>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-all border-2 ${
                      listingData.availability === 'choose-date' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setListingData({...listingData, availability: 'choose-date'})}
                  >
                    <CardContent className="p-4 text-center">
                      <h3 className="font-semibold">Choose a date</h3>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="coAgency"
                    checked={listingData.coAgencyListing}
                    onCheckedChange={(checked) => setListingData({...listingData, coAgencyListing: checked as boolean})}
                  />
                  <Label htmlFor="coAgency">This is a co-agency listing (optional)</Label>
                </div>

                <div>
                  <Label htmlFor="refNumber">Listing reference number (optional)</Label>
                  <Input
                    id="refNumber"
                    placeholder="eg. 738473"
                    value={listingData.referenceNumber}
                    onChange={(e) => setListingData({...listingData, referenceNumber: e.target.value})}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This listing reference number is for internal reference only and would not be<br />
                    display on the website.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 2: // Location
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Property Location</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Property Title</Label>
                <Input
                  id="title"
                  placeholder="Enter a catchy property title"
                  value={listingData.title}
                  onChange={(e) => setListingData({...listingData, title: e.target.value})}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="address">Property Address</Label>
                <Input
                  id="address"
                  placeholder="Enter the full property address"
                  value={listingData.address}
                  onChange={(e) => setListingData({...listingData, address: e.target.value})}
                  className="mt-2"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">State</Label>
                  <Select value={listingData.state} onValueChange={(value) => setListingData({...listingData, state: value})}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Selangor">Selangor</SelectItem>
                      <SelectItem value="Kuala Lumpur">Kuala Lumpur</SelectItem>
                      <SelectItem value="Penang">Penang</SelectItem>
                      <SelectItem value="Johor">Johor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="city">City</Label>
                  <Select value={listingData.city} onValueChange={(value) => setListingData({...listingData, city: value})}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Petaling Jaya">Petaling Jaya</SelectItem>
                      <SelectItem value="Damansara">Damansara</SelectItem>
                      <SelectItem value="Mont Kiara">Mont Kiara</SelectItem>
                      <SelectItem value="Kepong">Kepong</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 3: // Unit Details
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Unit Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  value={listingData.unitDetails.bedrooms}
                  onChange={(e) => setListingData({
                    ...listingData, 
                    unitDetails: {...listingData.unitDetails, bedrooms: parseInt(e.target.value) || 0}
                  })}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="0"
                  value={listingData.unitDetails.bathrooms}
                  onChange={(e) => setListingData({
                    ...listingData, 
                    unitDetails: {...listingData.unitDetails, bathrooms: parseInt(e.target.value) || 0}
                  })}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="sqft">Square Feet</Label>
                <Input
                  id="sqft"
                  type="number"
                  min="0"
                  value={listingData.unitDetails.squareFeet}
                  onChange={(e) => setListingData({
                    ...listingData, 
                    unitDetails: {...listingData.unitDetails, squareFeet: parseInt(e.target.value) || 0}
                  })}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        );

      case 4: // Price
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Price Information</h2>
            <div>
              <Label htmlFor="price">
                {listingData.listingType === 'sale' ? 'Sale Price (RM)' : 'Monthly Rent (RM)'}
              </Label>
              <Input
                id="price"
                type="number"
                min="0"
                placeholder="Enter amount"
                value={listingData.price}
                onChange={(e) => setListingData({...listingData, price: parseInt(e.target.value) || 0})}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 5: // Legal Information
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Legal Information</h2>
            <p className="text-gray-600 mb-6">Please provide the mandatory legal information for this property. All fields are required.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tenure */}
              <div>
                <Label htmlFor="tenure" className="text-sm font-medium">
                  Property Tenure <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={listingData.tenure}
                  onValueChange={(value) => setListingData({...listingData, tenure: value as any})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select tenure type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="freehold">Freehold</SelectItem>
                    <SelectItem value="leasehold">Leasehold</SelectItem>
                  </SelectContent>
                </Select>
                {!listingData.tenure && (
                  <p className="text-red-500 text-xs mt-1">Tenure is required</p>
                )}
              </div>

              {/* Title Type */}
              <div>
                <Label htmlFor="titleType" className="text-sm font-medium">
                  Title Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={listingData.titleType}
                  onValueChange={(value) => setListingData({...listingData, titleType: value as any})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select title type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual Title</SelectItem>
                    <SelectItem value="strata">Strata Title</SelectItem>
                    <SelectItem value="master">Master Title</SelectItem>
                  </SelectContent>
                </Select>
                {!listingData.titleType && (
                  <p className="text-red-500 text-xs mt-1">Title type is required</p>
                )}
              </div>

              {/* Land Title Type */}
              <div>
                <Label htmlFor="landTitleType" className="text-sm font-medium">
                  Land Title Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={listingData.landTitleType}
                  onValueChange={(value) => setListingData({...listingData, landTitleType: value as any})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select land title type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="agriculture">Agriculture</SelectItem>
                  </SelectContent>
                </Select>
                {!listingData.landTitleType && (
                  <p className="text-red-500 text-xs mt-1">Land title type is required</p>
                )}
              </div>
            </div>

            {/* Information cards */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h4 className="font-medium text-blue-900 mb-2">Legal Information Guide</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <p><strong>Tenure:</strong> Freehold means you own the property indefinitely. Leasehold means you own it for a specified period.</p>
                <p><strong>Title Type:</strong> Individual (single unit), Strata (subdivided building), Master (entire development).</p>
                <p><strong>Land Title:</strong> Indicates the approved land use - must match the property type you're listing.</p>
              </div>
            </div>
          </div>
        );

      case 6: // Description
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Property Description</h2>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the property features, amenities, and location benefits..."
                value={listingData.description}
                onChange={(e) => setListingData({...listingData, description: e.target.value})}
                className="mt-2 min-h-[200px]"
              />
            </div>
          </div>
        );

      case 7: // Gallery
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Property Gallery</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Upload Property Images</h3>
              <p className="text-gray-600 mb-4">Drag and drop images or click to browse</p>
              <Button variant="outline">Choose Files</Button>
            </div>
          </div>
        );

      case 8: // Platform Posting
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Platform Posting</h2>
            <p className="text-gray-600">Choose where to publish your listing:</p>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="airea" defaultChecked />
                <Label htmlFor="airea">Airea Platform</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="external" />
                <Label htmlFor="external">External Platforms</Label>
              </div>
            </div>
          </div>
        );

      case 9: // Preview
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Preview & Submit</h2>
            <Card>
              <CardHeader>
                <CardTitle>Property Listing Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold">Property Type</h4>
                    <p className="text-gray-600 capitalize">{listingData.propertyType}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Listing Type</h4>
                    <p className="text-gray-600 capitalize">{listingData.listingType}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Location</h4>
                    <p className="text-gray-600">{listingData.address || listingData.city}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Price</h4>
                    <p className="text-gray-600">RM {listingData.price?.toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Bedrooms</h4>
                    <p className="text-gray-600">{listingData.unitDetails.bedrooms}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Bathrooms</h4>
                    <p className="text-gray-600">{listingData.unitDetails.bathrooms}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Tenure</h4>
                    <p className="text-gray-600 capitalize">{listingData.tenure || 'Not specified'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Title Type</h4>
                    <p className="text-gray-600 capitalize">{listingData.titleType || 'Not specified'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Land Title Type</h4>
                    <p className="text-gray-600 capitalize">{listingData.landTitleType || 'Not specified'}</p>
                  </div>
                </div>
                {listingData.description && (
                  <div>
                    <h4 className="font-semibold">Description</h4>
                    <p className="text-gray-600">{listingData.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agent/portal">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Portal
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create new listing</h1>
              <p className="text-gray-600 dark:text-gray-400">Step {currentStep} of {steps.length}</p>
            </div>
          </div>
          <Button variant="outline">Save & Exit</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your progress</CardTitle>
                <Progress value={progress} className="mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        step.id === currentStep
                          ? 'bg-primary/10 text-primary'
                          : step.id < currentStep
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                          step.id === currentStep
                            ? 'bg-primary text-white'
                            : step.id < currentStep
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {step.id < currentStep ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <span className="text-sm font-medium">{step.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-8">
                {renderStepContent()}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button 
                variant="outline" 
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              {currentStep === steps.length ? (
                <Button 
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleSubmitListing}
                  disabled={createPropertyMutation.isPending}
                >
                  {createPropertyMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post Listing'
                  )}
                </Button>
              ) : (
                <Button onClick={nextStep}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preview the listing</CardTitle>
                <p className="text-sm text-gray-600">See what your listing looks like</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">Property Image</span>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold">
                      {listingData.title || 
                        (listingData.propertyType ? 
                          `${listingData.propertyType.charAt(0).toUpperCase() + listingData.propertyType.slice(1)} Property` : 
                          'Property Title'
                        )
                      }
                    </h4>
                    <p className="text-2xl font-bold text-primary">
                      {listingData.price ? `RM ${listingData.price.toLocaleString()}` : 'RM 0'}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-sm text-gray-500">Bed</div>
                      <div className="font-semibold">{listingData.unitDetails.bedrooms || 0}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-sm text-gray-500">Bath</div>
                      <div className="font-semibold">{listingData.unitDetails.bathrooms || 0}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-sm text-gray-500">Sqft</div>
                      <div className="font-semibold">{listingData.unitDetails.squareFeet || 0}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium">Property details</h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-600" />
                        <span className="text-gray-600">Furnished</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-600" />
                        <span className="text-gray-600">Listed on 1 Jan 2025</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-600" />
                        <span className="text-gray-600">2,500 sqft floor area</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      Contact
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      Share
                    </Button>
                  </div>

                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="text-sm font-medium">Agent</div>
                    <div className="text-sm text-gray-600">Agent Name</div>
                    <div className="text-xs text-gray-500">REN 12345</div>
                    <Button size="sm" className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white">
                      WhatsApp chat
                    </Button>
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