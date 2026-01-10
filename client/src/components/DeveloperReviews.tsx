import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Star, ThumbsUp, Flag, MessageSquare, TrendingUp, Users, Search, Plus } from "lucide-react";
import type { DeveloperReview } from "@shared/schema";

interface DeveloperReviewsProps {
  developerName?: string;
  projectName?: string;
}

interface ReviewWithAuthor extends DeveloperReview {
  authorName: string;
}

export function DeveloperReviews({ developerName, projectName }: DeveloperReviewsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddReview, setShowAddReview] = useState(false);
  const [selectedDeveloper, setSelectedDeveloper] = useState(developerName || "");
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch reviews
  const { data: reviews = [], isLoading } = useQuery<ReviewWithAuthor[]>({
    queryKey: ["/api/reviews", { developer: selectedDeveloper, project: projectName, search: searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDeveloper && selectedDeveloper !== "all") params.append("developer", selectedDeveloper);
      if (projectName) params.append("project", projectName);
      if (searchQuery) params.append("search", searchQuery);
      
      const response = await fetch(`/api/reviews?${params}`);
      if (!response.ok) throw new Error("Failed to fetch reviews");
      return response.json();
    },
  });

  // Fetch developer stats
  const { data: developerStats } = useQuery({
    queryKey: ["/api/reviews/stats", selectedDeveloper],
    queryFn: async () => {
      if (!selectedDeveloper) return null;
      const response = await fetch(`/api/reviews/stats/${encodeURIComponent(selectedDeveloper)}`);
      if (!response.ok) throw new Error("Failed to fetch developer stats");
      return response.json();
    },
    enabled: !!selectedDeveloper
  });

  // Fetch popular developers
  const { data: popularDevelopers = [] } = useQuery({
    queryKey: ["/api/reviews/popular-developers"],
    queryFn: async () => {
      const response = await fetch("/api/reviews/popular-developers");
      if (!response.ok) throw new Error("Failed to fetch popular developers");
      return response.json();
    },
  });

  // Add review mutation
  const addReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      return apiRequest("/api/reviews", "POST", reviewData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/popular-developers"] });
      setShowAddReview(false);
      toast({
        title: "Review Added",
        description: "Your review has been submitted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Vote on review mutation
  const voteMutation = useMutation({
    mutationFn: async ({ reviewId, voteType }: { reviewId: string; voteType: 'helpful' | 'report' }) => {
      return apiRequest(`/api/reviews/${reviewId}/vote`, "POST", { voteType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({
        title: "Vote Recorded",
        description: "Thank you for your feedback.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record vote.",
        variant: "destructive",
      });
    },
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
      />
    ));
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6" data-testid="developer-reviews">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Developer & Project Reviews</h2>
          <p className="text-muted-foreground">
            Real experiences from property buyers, tenants, and industry professionals
          </p>
        </div>
        {isAuthenticated && (
          <Dialog open={showAddReview} onOpenChange={setShowAddReview}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-review">
                <Plus className="w-4 h-4 mr-2" />
                Add Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Share Your Experience</DialogTitle>
              </DialogHeader>
              <AddReviewForm
                onSubmit={(data) => addReviewMutation.mutate(data)}
                isSubmitting={addReviewMutation.isPending}
                defaultDeveloper={selectedDeveloper}
                defaultProject={projectName}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search and Developer Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="developer-select">Developer</Label>
              <Select value={selectedDeveloper || "all"} onValueChange={(value) => setSelectedDeveloper(value === "all" ? "" : value)}>
                <SelectTrigger data-testid="select-developer">
                  <SelectValue placeholder="All developers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All developers</SelectItem>
                  {popularDevelopers.map((dev: any) => (
                    <SelectItem key={dev.developerName} value={dev.developerName}>
                      {dev.developerName} ({dev.totalReviews} reviews)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="search-reviews">Search Reviews</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search-reviews"
                  placeholder="Search by developer, project, or review content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-reviews"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Developer Stats */}
      {developerStats && selectedDeveloper && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {selectedDeveloper} Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{developerStats.totalReviews}</div>
                <div className="text-sm text-muted-foreground">Total Reviews</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-bold">{developerStats.averageRating?.toFixed(1)}</span>
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm font-medium mb-2">Rating Distribution</div>
                <div className="space-y-1">
                  {[5, 4, 3, 2, 1].map((stars) => (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-xs w-6">{stars}★</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{
                            width: `${(developerStats.ratingDistribution[stars] / developerStats.totalReviews) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8">
                        {developerStats.ratingDistribution[stars]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No reviews found</h3>
              <p className="text-muted-foreground mb-4">
                {selectedDeveloper 
                  ? `No reviews found for ${selectedDeveloper}`
                  : "Be the first to share your experience with a developer or project."
                }
              </p>
              {isAuthenticated && (
                <Button onClick={() => setShowAddReview(true)}>
                  Write First Review
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} data-testid={`review-${review.id}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {review.isAnonymous ? "A" : review.authorName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {review.isAnonymous ? "Anonymous" : review.authorName}
                        {review.isVerified && (
                          <Badge variant="secondary" className="ml-2">Verified</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatDate(review.createdAt)}</span>
                        {review.experience && (
                          <>
                            <span>•</span>
                            <Badge variant="outline">{review.experience}</Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {renderStars(review.rating)}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-lg mb-1">{review.title}</h4>
                  <div className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium">{review.developerName}</span>
                    {review.projectName && (
                      <>
                        <span className="mx-1">•</span>
                        <span>{review.projectName}</span>
                      </>
                    )}
                  </div>
                  <p className="text-gray-700 leading-relaxed">{review.review}</p>
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {isAuthenticated && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => voteMutation.mutate({ reviewId: review.id, voteType: 'helpful' })}
                          disabled={voteMutation.isPending}
                          data-testid={`button-helpful-${review.id}`}
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          Helpful ({review.helpfulVotes})
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => voteMutation.mutate({ reviewId: review.id, voteType: 'report' })}
                          disabled={voteMutation.isPending}
                          data-testid={`button-report-${review.id}`}
                        >
                          <Flag className="w-4 h-4 mr-1" />
                          Report
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function AddReviewForm({ 
  onSubmit, 
  isSubmitting, 
  defaultDeveloper, 
  defaultProject 
}: { 
  onSubmit: (data: any) => void; 
  isSubmitting: boolean;
  defaultDeveloper?: string;
  defaultProject?: string;
}) {
  const [formData, setFormData] = useState({
    developerName: defaultDeveloper || "",
    projectName: defaultProject || "",
    rating: 5,
    title: "",
    review: "",
    experience: "",
    isAnonymous: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.developerName || !formData.title || !formData.review) {
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="developer-name">Developer Name *</Label>
        <Input
          id="developer-name"
          value={formData.developerName}
          onChange={(e) => setFormData(prev => ({ ...prev, developerName: e.target.value }))}
          placeholder="e.g., Sime Darby Property"
          required
          data-testid="input-developer-name"
        />
      </div>

      <div>
        <Label htmlFor="project-name">Project Name (Optional)</Label>
        <Input
          id="project-name"
          value={formData.projectName}
          onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
          placeholder="e.g., Serene Heights"
          data-testid="input-project-name"
        />
      </div>

      <div>
        <Label>Rating *</Label>
        <div className="flex items-center gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
              className="p-1"
              data-testid={`rating-star-${star}`}
            >
              <Star
                className={`w-6 h-6 ${
                  star <= formData.rating 
                    ? "fill-yellow-400 text-yellow-400" 
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="review-title">Review Title *</Label>
        <Input
          id="review-title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Summarize your experience..."
          required
          data-testid="input-review-title"
        />
      </div>

      <div>
        <Label htmlFor="review-text">Your Review *</Label>
        <Textarea
          id="review-text"
          value={formData.review}
          onChange={(e) => setFormData(prev => ({ ...prev, review: e.target.value }))}
          placeholder="Share your detailed experience..."
          rows={4}
          required
          data-testid="textarea-review"
        />
      </div>

      <div>
        <Label htmlFor="experience">Your Experience</Label>
        <Select 
          value={formData.experience} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, experience: value }))}
        >
          <SelectTrigger data-testid="select-experience">
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">Property Owner</SelectItem>
            <SelectItem value="tenant">Tenant/Renter</SelectItem>
            <SelectItem value="buyer">Property Buyer</SelectItem>
            <SelectItem value="agent">Real Estate Agent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="anonymous"
          checked={formData.isAnonymous}
          onCheckedChange={(checked) => 
            setFormData(prev => ({ ...prev, isAnonymous: checked as boolean }))
          }
          data-testid="checkbox-anonymous"
        />
        <Label htmlFor="anonymous">Post anonymously</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </Button>
      </div>
    </form>
  );
}