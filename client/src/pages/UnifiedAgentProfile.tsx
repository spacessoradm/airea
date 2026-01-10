import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Building2, 
  Home, 
  MapPin, 
  Phone, 
  Mail,
  Share2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Edit,
  Save,
  X,
  MapPinned,
  Briefcase,
  Camera
} from "lucide-react";
import Header from "@/components/Header";
import PropertyCard from "@/components/PropertyCard";
import type { Agent, Property } from "@shared/schema";

export default function UnifiedAgentProfile() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingExpertise, setIsEditingExpertise] = useState(false);
  const [bio, setBio] = useState("");
  const [areaExpertise, setAreaExpertise] = useState("");
  const [propertyTypes, setPropertyTypes] = useState("");
  const [experience, setExperience] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current user
  const { data: currentUser } = useQuery<{ id: string }>({
    queryKey: ['/api/auth/user'],
  });

  // Determine if viewing own profile or someone else's
  const isOwnProfile = !id || (currentUser?.id === id);
  const agentId = id || currentUser?.id;

  const { data: agent, isLoading: agentLoading } = useQuery<Agent>({
    queryKey: [`/api/agents/${agentId}`],
    enabled: !!agentId,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const ITEMS_PER_PAGE = 20;

  const { data: propertiesResponse, isLoading: propertiesLoading } = useQuery({
    queryKey: [`/api/agents/${agentId}/properties`, currentPage, activeTab],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });
      
      if (activeTab !== 'all') {
        params.append('listingType', activeTab);
      }
      
      const response = await fetch(`/api/agents/${agentId}/properties?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }
      return response.json();
    },
    enabled: !!agentId,
  });

  const properties: (Property & { agent: Agent })[] = propertiesResponse?.properties || [];
  const pagination = propertiesResponse?.pagination || { page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 0 };

  // Initialize form fields when agent data loads
  useEffect(() => {
    if (agent) {
      setBio(agent.bio || "");
      setAreaExpertise(agent.areaExpertise || "");
      setPropertyTypes(agent.specialties?.join(", ") || "");
      setExperience(agent.experience || "");
    }
  }, [agent]);

  const updateAgentMutation = useMutation({
    mutationFn: async (data: Partial<Agent>) => {
      return apiRequest('PATCH', `/api/agents/${agentId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/agents/${agentId}`] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      setIsEditingBio(false);
      setIsEditingExpertise(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      
      const response = await fetch(`/api/agents/${agentId}/profile-photo`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/agents/${agentId}`] });
      toast({
        title: "Photo updated",
        description: "Your profile photo has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile photo",
        variant: "destructive",
      });
    },
  });

  const handleSaveBio = () => {
    updateAgentMutation.mutate({ bio });
  };

  const handleSaveExpertise = () => {
    updateAgentMutation.mutate({
      areaExpertise,
      specialties: propertyTypes.split(",").map(s => s.trim()).filter(Boolean),
      experience,
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      uploadPhotoMutation.mutate(file);
    }
  };

  if (agentLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-600">Loading profile...</p>
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

  const forSaleCount = propertiesResponse?.counts?.sale || 0;
  const forRentCount = propertiesResponse?.counts?.rent || 0;
  const totalCount = propertiesResponse?.counts?.total || properties.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        {!isOwnProfile && (
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900 -ml-2">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Home
              </Button>
            </Link>
          </div>
        )}

        {/* Agent Header */}
        <Card className="mb-6">
          <CardContent className="p-8">
            <div className="flex items-start gap-6">
              <div className="relative">
                <Avatar className="h-32 w-32 ring-4 ring-blue-50">
                  <AvatarImage src={agent.profileImage || undefined} alt={agent.nickname || agent.name} />
                  <AvatarFallback className="text-4xl bg-blue-100 text-blue-600">
                    {(agent.nickname || agent.name)?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                  <>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-0 right-0 h-10 w-10 rounded-full shadow-lg"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadPhotoMutation.isPending}
                      data-testid="button-upload-photo"
                    >
                      <Camera className="h-5 w-5" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                      data-testid="input-profile-photo"
                    />
                  </>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">
                      {agent.nickname || agent.name}
                    </h1>
                    {agent.license && (
                      <p className="text-sm text-gray-600 mb-2">REN {agent.license}</p>
                    )}
                    {agent.company && (
                      <p className="text-sm text-gray-600">{agent.company}</p>
                    )}
                  </div>
                  
                  {isOwnProfile && (
                    <Button variant="outline" className="gap-2" onClick={() => setLocation('/agent/dashboard')}>
                      <ChevronLeft className="h-4 w-4" />
                      Dashboard
                    </Button>
                  )}
                  {!isOwnProfile && (
                    <Button variant="outline" className="gap-2">
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">About {agent.nickname || agent.name}</h2>
              {isOwnProfile && !isEditingBio && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditingBio(true)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {isEditingBio && (
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setBio(agent.bio || "");
                      setIsEditingBio(false);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSaveBio}
                    disabled={updateAgentMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </div>
              )}
            </div>
            
            {isEditingBio ? (
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people about yourself, your experience, and what makes you unique..."
                className="min-h-[120px]"
                data-testid="textarea-bio"
              />
            ) : (
              <p className="text-gray-700 leading-relaxed">
                {agent.bio || (!isOwnProfile ? "No information available" : "+ Add details about yourself")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Expertise Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Expertise</h2>
              {isOwnProfile && !isEditingExpertise && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditingExpertise(true)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {isEditingExpertise && (
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setAreaExpertise(agent.areaExpertise || "");
                      setPropertyTypes(agent.specialties?.join(", ") || "");
                      setExperience(agent.experience || "");
                      setIsEditingExpertise(false);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSaveExpertise}
                    disabled={updateAgentMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {/* Area Expertise */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPinned className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Area expertise</p>
                </div>
                {isEditingExpertise ? (
                  <Input
                    value={areaExpertise}
                    onChange={(e) => setAreaExpertise(e.target.value)}
                    placeholder="e.g., Kuala Lumpur, Selangor, Penang"
                    data-testid="input-area-expertise"
                  />
                ) : (
                  <p className="text-gray-700 ml-6">
                    {agent.areaExpertise || (isOwnProfile ? "+ Add area" : "Not specified")}
                  </p>
                )}
              </div>

              {/* Property Types */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Home className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Property types</p>
                </div>
                {isEditingExpertise ? (
                  <Input
                    value={propertyTypes}
                    onChange={(e) => setPropertyTypes(e.target.value)}
                    placeholder="e.g., Condo, Serviced residence, Terrace house, Commercial"
                    data-testid="input-property-types"
                  />
                ) : agent.specialties && agent.specialties.length > 0 ? (
                  <div className="flex flex-wrap gap-2 ml-6">
                    {agent.specialties.map((specialty, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-700 ml-6">{isOwnProfile ? "Not specified" : "Not specified"}</p>
                )}
              </div>

              {/* Experience */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Experience</p>
                </div>
                {isEditingExpertise ? (
                  <Input
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g., 5 years in real estate"
                    data-testid="input-experience"
                  />
                ) : (
                  <p className="text-gray-700 ml-6">
                    {agent.experience || (isOwnProfile ? "+ Add work experience" : "Not specified")}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Contact details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Email</p>
                </div>
                <p className="text-gray-900 ml-6">{agent.email}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Phone</p>
                </div>
                <p className="text-gray-900 ml-6">
                  🇲🇾 {agent.phone || 'Not provided'}
                </p>
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
                  <p className="text-3xl font-bold text-gray-900">{totalCount}</p>
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

        {/* Properties Section */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Properties by {agent.nickname || agent.name}
            </h2>

            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value);
              setCurrentPage(1);
            }} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="all">
                  All ({totalCount})
                </TabsTrigger>
                <TabsTrigger value="sale">
                  For Sale ({forSaleCount})
                </TabsTrigger>
                <TabsTrigger value="rent">
                  For Rent ({forRentCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {propertiesLoading ? (
                  <p className="text-gray-600 text-center py-8">Loading properties...</p>
                ) : properties.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No properties listed yet</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {properties.map((property) => (
                        <PropertyCard 
                          key={property.id} 
                          property={property} 
                          hideAgentInfo 
                          hideActionButtons={true}
                        />
                      ))}
                    </div>
                    
                    {/* Pagination Controls */}
                    {pagination.totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 pt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        
                        <span className="text-sm text-gray-600">
                          Page {pagination.page} of {pagination.totalPages}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                          disabled={currentPage === pagination.totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
