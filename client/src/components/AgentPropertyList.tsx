import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Edit, Trash, Copy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Property } from "@shared/schema";

interface AgentPropertyListProps {
  properties: Property[];
  onEdit: (property: Property) => void;
  onDelete: (propertyId: string) => void;
  onCopy: (property: Property) => void;
  isLoading?: boolean;
}

export const AgentPropertyList: React.FC<AgentPropertyListProps> = ({ properties, onEdit, onDelete, onCopy, isLoading }) => {
  console.log("🔥 AgentPropertyList rendered with", properties.length, "properties", { isLoading });
  console.log("🔥 COMPONENT RENDERED - AgentPropertyList is working!");

  // Filter properties by status
  const activeProperties = properties.filter(p => p.status === 'available');
  const expiredProperties = properties.filter(p => p.status === 'sold' || p.status === 'rented');
  const draftProperties = properties.filter(p => (p as any).status === 'draft');
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'rented': return 'bg-orange-100 text-orange-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVisibility = (status: string) => {
    if (status === 'available') return { label: 'Public', color: 'text-green-600' };
    if (status === 'draft') return { label: 'Draft', color: 'text-gray-600' };
    return { label: 'Private', color: 'text-blue-600' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const PropertyCard = ({ property }: { property: Property }) => {
    const visibility = getVisibility(property.status || 'available');
    
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex gap-4 p-4">
            {/* Property Image */}
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              {property.images && property.images.length > 0 ? (
                <img 
                  src={property.images[0]} 
                  alt={property.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00OCA2NEw0MCA0OEw1NiA0OEw0OCA2NFoiIGZpbGw9IiM5Q0EzQUYiLz4KPGNpcmNsZSBjeD0iNDAiIGN5PSIzNiIgcj0iNCIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                  }}
                />
              ) : (
                <span className="text-2xl">🏠</span>
              )}
            </div>
            
            {/* Property Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg leading-tight truncate">{property.title}</h3>
                
                {/* Actions Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(property)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCopy(property)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy to Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(property.id)}
                      className="text-red-600"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">{property.address}, {property.city}</p>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{property.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={`${getStatusColor(property.status || 'available')} border-0`}>
                    {(property.status || 'available').charAt(0).toUpperCase() + (property.status || 'available').slice(1)}
                  </Badge>
                  
                  <span className="text-sm text-gray-500">
                    Listed: {property.createdAt ? formatDate(property.createdAt.toString()) : 'Recently'}
                  </span>
                  
                  <span className={`text-sm font-medium ${visibility.color}`}>
                    {visibility.label}
                  </span>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold text-lg">RM {parseFloat(property.price).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">
                    {(property as any).listingType === 'rent' ? 'per month' : 'total'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (properties.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <div className="mb-4">
            <Eye className="h-12 w-12 mx-auto text-gray-300" />
          </div>
          <h3 className="text-lg font-medium mb-2">No properties found</h3>
          <p>Create your first listing to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="active">Active ({activeProperties.length})</TabsTrigger>
        <TabsTrigger value="expired">Expired ({expiredProperties.length})</TabsTrigger>
        <TabsTrigger value="draft">Draft ({draftProperties.length})</TabsTrigger>
      </TabsList>
      
      <TabsContent value="active" className="space-y-4 mt-6">
        {activeProperties.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <h3 className="text-lg font-medium mb-2">No active listings</h3>
              <p>Create your first listing to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="expired" className="space-y-4 mt-6">
        {expiredProperties.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <h3 className="text-lg font-medium mb-2">No expired listings</h3>
              <p>Your sold or rented properties will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {expiredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="draft" className="space-y-4 mt-6">
        {draftProperties.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <h3 className="text-lg font-medium mb-2">No draft listings</h3>
              <p>Copy existing listings to create drafts for editing.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {draftProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};