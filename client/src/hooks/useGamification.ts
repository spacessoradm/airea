import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface CompletedChallenge {
  id: string;
  userId: string;
  challengeType: string;
  progress: number;
  target: number;
  completed: boolean;
  completedAt: string;
  definition: {
    type: string;
    name: string;
    description: string;
    target: number;
    points: number;
    badge?: string;
    icon: string;
  };
}

interface RecordViewResponse {
  success: boolean;
  completedChallenges?: CompletedChallenge[];
}

export function useGamification() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [completedChallenges, setCompletedChallenges] = useState<CompletedChallenge[]>([]);

  const recordViewMutation = useMutation({
    mutationFn: async ({ propertyId, area, propertyType }: {
      propertyId: string;
      area: string;
      propertyType: string;
    }) => {
      return await apiRequest(`/api/gamification/record-view`, {
        method: "POST",
        body: JSON.stringify({ propertyId, area, propertyType })
      }) as RecordViewResponse;
    },
    onSuccess: (data) => {
      // Invalidate gamification queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/rewards'] });

      // Show reward notifications if any challenges were completed
      if (data.completedChallenges && data.completedChallenges.length > 0) {
        setCompletedChallenges(data.completedChallenges);
      }
    },
    onError: (error) => {
      console.error("Error recording property view:", error);
    }
  });

  const recordPropertyView = (propertyId: string, area: string, propertyType: string) => {
    if (!isAuthenticated) return;
    
    recordViewMutation.mutate({ propertyId, area, propertyType });
  };

  const clearCompletedChallenges = () => {
    setCompletedChallenges([]);
  };

  return {
    recordPropertyView,
    completedChallenges,
    clearCompletedChallenges,
    isRecording: recordViewMutation.isPending
  };
}