import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import EnhancedPropertyForm from "./EnhancedPropertyForm";
import type { InsertProperty } from "@shared/schema";

export function CreatePropertyListing({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPropertyMutation = useMutation({
    mutationFn: async (propertyData: InsertProperty) => {
      return apiRequest('/api/agent/properties', 'POST', propertyData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Property listing created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/properties'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to create property listing",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: InsertProperty) => {
    createPropertyMutation.mutate(data);
  };

  return (
    <EnhancedPropertyForm 
      onSubmit={handleSubmit}
      isLoading={createPropertyMutation.isPending}
    />
  );
}