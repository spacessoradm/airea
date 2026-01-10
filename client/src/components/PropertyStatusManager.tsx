import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, DollarSign } from "lucide-react";
import type { Property } from "@shared/schema";

interface PropertyStatusManagerProps {
  property: Property;
}

export const PropertyStatusManager: React.FC<PropertyStatusManagerProps> = ({ property }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(property.status || 'available');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const statusUpdateMutation = useMutation({
    mutationFn: async () => {
      const data: any = { status: selectedStatus };
      return apiRequest('PUT', `/api/properties/${property.id}/status`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", property.id] });
      
      toast({
        title: "Status Updated",
        description: `Property status changed to ${getStatusDisplayName(selectedStatus)}`,
      });
      
      setIsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update property status. Please try again.",
        variant: "destructive",
      });
    }
  });

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'sold': return 'Sold';
      case 'rented': return 'Rented';
      case 'on_hold': return 'On Hold';
      default: return status;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available': return 'default';
      case 'sold': return 'destructive';
      case 'rented': return 'secondary';
      case 'on_hold': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getStatusBadgeVariant(property.status || 'available')}>
        {getStatusDisplayName(property.status || 'available')}
      </Badge>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <Settings className="w-3 h-3" />
            Update Status
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Property Status</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as 'available' | 'sold' | 'rented' | 'on_hold')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Sold, Rented, and On Hold properties will be hidden from public view
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => statusUpdateMutation.mutate()}
                disabled={statusUpdateMutation.isPending}
              >
                {statusUpdateMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};