import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight } from "lucide-react";

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
  tenure: 'freehold' | 'leasehold' | '';
  titleType: 'individual' | 'strata' | 'master' | '';
  landTitleType: 'residential' | 'commercial' | 'industrial' | 'agriculture' | '';
}

const steps = [
  { id: 1, name: "Listing type" },
  { id: 2, name: "Location" },
  { id: 3, name: "Unit details" },
  { id: 4, name: "Price" },
  { id: 5, name: "Legal information" },
  { id: 6, name: "Preview" },
];

export default function CreateListingFixed() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [listingData, setListingData] = useState<ListingData>({
    listingType: "",
    propertyType: "",
    title: "",
    address: "",
    city: "",
    state: "",
    unitDetails: { bedrooms: 0, bathrooms: 0, squareFeet: 0 },
    price: 0,
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

  const nextStep = () => {
    if (currentStep === 5) {
      if (!listingData.tenure || !listingData.titleType || !listingData.landTitleType) {
        toast({
          title: "Missing Legal Information",
          description: "Please fill in all required legal information fields.",
          variant: "destructive",
        });
        return;
      }
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

  const handleSubmit = () => {
    const propertyData = {
      title: listingData.title || `${listingData.propertyType} Property`,
      description: `Beautiful ${listingData.propertyType} property with ${listingData.unitDetails.bedrooms} bedrooms and ${listingData.unitDetails.bathrooms} bathrooms.`,
      propertyType: listingData.propertyType === 'residential' ? 'apartment' : 'shop-office',
      listingType: listingData.listingType,
      price: listingData.price.toString(),
      bedrooms: listingData.unitDetails.bedrooms,
      bathrooms: listingData.unitDetails.bathrooms,
      squareFeet: listingData.unitDetails.squareFeet,
      address: listingData.address,
      city: listingData.city,
      state: listingData.state,
      amenities: [],
      images: [],
      agentLicense: "REN12345",
      latitude: "3.139",
      longitude: "101.6869",
      tenure: listingData.tenure,
      titleType: listingData.titleType,
      landTitleType: listingData.landTitleType,
    };

    createPropertyMutation.mutate(propertyData);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Listing Type</h2>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant={listingData.listingType === 'rent' ? 'default' : 'outline'}
                onClick={() => setListingData({...listingData, listingType: 'rent'})}
                className="h-20"
              >
                For Rent
              </Button>
              <Button 
                variant={listingData.listingType === 'sale' ? 'default' : 'outline'}
                onClick={() => setListingData({...listingData, listingType: 'sale'})}
                className="h-20"
              >
                For Sale
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <Button 
                variant={listingData.propertyType === 'residential' ? 'default' : 'outline'}
                onClick={() => setListingData({...listingData, propertyType: 'residential'})}
              >
                Residential
              </Button>
              <Button 
                variant={listingData.propertyType === 'commercial' ? 'default' : 'outline'}
                onClick={() => setListingData({...listingData, propertyType: 'commercial'})}
              >
                Commercial
              </Button>
              <Button 
                variant={listingData.propertyType === 'industrial' ? 'default' : 'outline'}
                onClick={() => setListingData({...listingData, propertyType: 'industrial'})}
              >
                Industrial
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Location</h2>
            <div className="space-y-4">
              <div>
                <Label>Property Title</Label>
                <Input
                  value={listingData.title}
                  onChange={(e) => setListingData({...listingData, title: e.target.value})}
                  placeholder="Enter property title"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={listingData.address}
                  onChange={(e) => setListingData({...listingData, address: e.target.value})}
                  placeholder="Enter full address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Select value={listingData.city} onValueChange={(value) => setListingData({...listingData, city: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kuala Lumpur">Kuala Lumpur</SelectItem>
                      <SelectItem value="Shah Alam">Shah Alam</SelectItem>
                      <SelectItem value="Petaling Jaya">Petaling Jaya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>State</Label>
                  <Select value={listingData.state} onValueChange={(value) => setListingData({...listingData, state: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Selangor">Selangor</SelectItem>
                      <SelectItem value="Kuala Lumpur">Kuala Lumpur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Unit Details</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Bedrooms</Label>
                <Input
                  type="number"
                  min="0"
                  value={listingData.unitDetails.bedrooms}
                  onChange={(e) => setListingData({
                    ...listingData, 
                    unitDetails: {...listingData.unitDetails, bedrooms: parseInt(e.target.value) || 0}
                  })}
                />
              </div>
              <div>
                <Label>Bathrooms</Label>
                <Input
                  type="number"
                  min="0"
                  value={listingData.unitDetails.bathrooms}
                  onChange={(e) => setListingData({
                    ...listingData, 
                    unitDetails: {...listingData.unitDetails, bathrooms: parseInt(e.target.value) || 0}
                  })}
                />
              </div>
              <div>
                <Label>Square Feet</Label>
                <Input
                  type="number"
                  min="0"
                  value={listingData.unitDetails.squareFeet}
                  onChange={(e) => setListingData({
                    ...listingData, 
                    unitDetails: {...listingData.unitDetails, squareFeet: parseInt(e.target.value) || 0}
                  })}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Price Information</h2>
            <div>
              <Label>
                {listingData.listingType === 'sale' ? 'Sale Price (RM)' : 'Monthly Rent (RM)'}
              </Label>
              <Input
                type="number"
                min="0"
                value={listingData.price}
                onChange={(e) => setListingData({...listingData, price: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Legal Information</h2>
            <p className="text-gray-600">Please provide the mandatory legal information for this property.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label>Property Tenure <span className="text-red-500">*</span></Label>
                <Select value={listingData.tenure} onValueChange={(value) => setListingData({...listingData, tenure: value as any})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="freehold">Freehold</SelectItem>
                    <SelectItem value="leasehold">Leasehold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Title Type <span className="text-red-500">*</span></Label>
                <Select value={listingData.titleType} onValueChange={(value) => setListingData({...listingData, titleType: value as any})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select title type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual Title</SelectItem>
                    <SelectItem value="strata">Strata Title</SelectItem>
                    <SelectItem value="master">Master Title</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Land Title Type <span className="text-red-500">*</span></Label>
                <Select value={listingData.landTitleType} onValueChange={(value) => setListingData({...listingData, landTitleType: value as any})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select land title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="agriculture">Agriculture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Legal Information Guide</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>Tenure:</strong> Freehold means you own the property indefinitely. Leasehold means you own it for a specified period.</p>
                <p><strong>Title Type:</strong> Individual (single unit), Strata (subdivided building), Master (entire development).</p>
                <p><strong>Land Title:</strong> Indicates the approved land use - must match the property type you're listing.</p>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Preview & Submit</h2>
            <Card>
              <CardHeader>
                <CardTitle>Property Listing Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold">Property Type</h4>
                    <p className="capitalize">{listingData.propertyType}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Listing Type</h4>
                    <p className="capitalize">{listingData.listingType}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Location</h4>
                    <p>{listingData.address || listingData.city}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Price</h4>
                    <p>RM {listingData.price?.toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Tenure</h4>
                    <p className="capitalize">{listingData.tenure}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Title Type</h4>
                    <p className="capitalize">{listingData.titleType}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agent/portal">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Portal
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Create New Listing</h1>
              <p className="text-gray-600">Step {currentStep} of {steps.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Progress</CardTitle>
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
                        {step.id}
                      </div>
                      <span className="text-sm font-medium">{step.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-8">
                {renderStepContent()}
              </CardContent>
            </Card>

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
                  onClick={handleSubmit}
                  disabled={createPropertyMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createPropertyMutation.isPending ? 'Creating...' : 'Create Property'}
                </Button>
              ) : (
                <Button onClick={nextStep}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}