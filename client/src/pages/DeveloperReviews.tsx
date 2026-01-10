import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { StarIcon, ThumbsUpIcon, FlagIcon, PlusIcon, SearchIcon, TrendingUpIcon, HomeIcon, ArrowLeftIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";

interface DeveloperReview {
  id: string;
  userId?: string;
  developerName: string;
  projectName?: string;
  rating: number;
  title: string;
  review: string;
  experience?: string;
  isAnonymous: boolean;
  isVerified: boolean;
  helpfulVotes: number;
  reportCount: number;
  createdAt: string;
  userFirstName?: string;
  userLastName?: string;
}

interface DeveloperStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    [key: string]: number;
  };
}

interface PopularDeveloper {
  developerName: string;
  averageRating: number;
  totalReviews: number;
  recentReviews: number;
}

export default function DeveloperReviews() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeveloper, setSelectedDeveloper] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch popular developers
  const { data: popularDevelopers } = useQuery({
    queryKey: ["/api/developer-reviews/popular-developers"],
    queryFn: async (): Promise<PopularDeveloper[]> => {
      const response = await fetch("/api/developer-reviews/popular-developers");
      if (!response.ok) throw new Error("Failed to fetch popular developers");
      return response.json();
    },
  });

  // Fetch reviews based on filters
  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ["/api/developer-reviews", { developer: selectedDeveloper, search: searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDeveloper) params.append("developer", selectedDeveloper);
      if (searchQuery) params.append("search", searchQuery);
      params.append("limit", "20");
      const response = await fetch(`/api/developer-reviews?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch reviews");
      return response.json();
    },
  });

  // Fetch developer stats when a developer is selected
  const { data: developerStats } = useQuery({
    queryKey: ["/api/developer-reviews/stats", selectedDeveloper],
    queryFn: async (): Promise<DeveloperStats> => {
      const response = await fetch(`/api/developer-reviews/stats/${encodeURIComponent(selectedDeveloper)}`);
      if (!response.ok) throw new Error("Failed to fetch developer stats");
      return response.json();
    },
    enabled: !!selectedDeveloper,
  });

  const createReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      const response = await fetch("/api/developer-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewData),
      });
      if (!response.ok) throw new Error("Failed to create review");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developer-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/developer-reviews/popular-developers"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Review Posted",
        description: "Your developer review has been posted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post review",
        variant: "destructive",
      });
    },
  });

  const voteOnReviewMutation = useMutation({
    mutationFn: async ({ reviewId, voteType }: { reviewId: string; voteType: string }) => {
      const response = await fetch(`/api/developer-reviews/${reviewId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType }),
      });
      if (!response.ok) throw new Error("Failed to vote");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developer-reviews"] });
      toast({
        title: "Vote Recorded",
        description: "Your vote has been recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to vote",
        variant: "destructive",
      });
    },
  });

  const handleCreateReview = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const reviewData = {
      developerName: formData.get("developerName") as string,
      projectName: formData.get("projectName") as string || undefined,
      rating: parseInt(formData.get("rating") as string),
      title: formData.get("title") as string,
      review: formData.get("review") as string,
      experience: formData.get("experience") as string || undefined,
      isAnonymous: formData.get("isAnonymous") === "on",
    };

    createReviewMutation.mutate(reviewData);
  };

  const handleVote = (reviewId: string, voteType: "helpful" | "report") => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to vote on reviews.",
        variant: "destructive",
      });
      return;
    }
    voteOnReviewMutation.mutate({ reviewId, voteType });
  };

  const renderStars = (rating: number, size = "h-4 w-4") => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`${size} ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation breadcrumb */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              <Button variant="ghost" size="sm" className="p-0 h-auto font-normal">
                <HomeIcon className="h-4 w-4 mr-1" />
                Home
              </Button>
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Project Reviews</span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Developer Reviews</h1>
              <p className="text-lg text-gray-600">
                Real experiences from property owners, tenants, and buyers
              </p>
            </div>
            
            {isAuthenticated && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-review">
                <PlusIcon className="h-4 w-4 mr-2" />
                Write Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Write a Developer Review</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateReview} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="developerName">Developer Name *</Label>
                    <Input 
                      id="developerName"
                      name="developerName" 
                      required 
                      placeholder="e.g., Sime Darby Property"
                      data-testid="input-developer-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="projectName">Project Name</Label>
                    <Input 
                      id="projectName"
                      name="projectName" 
                      placeholder="e.g., Elmina Green"
                      data-testid="input-project-name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rating">Rating *</Label>
                    <Select name="rating" required>
                      <SelectTrigger data-testid="select-rating">
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">⭐⭐⭐⭐⭐ Excellent</SelectItem>
                        <SelectItem value="4">⭐⭐⭐⭐ Good</SelectItem>
                        <SelectItem value="3">⭐⭐⭐ Average</SelectItem>
                        <SelectItem value="2">⭐⭐ Poor</SelectItem>
                        <SelectItem value="1">⭐ Terrible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="experience">Your Experience</Label>
                    <Select name="experience">
                      <SelectTrigger data-testid="select-experience">
                        <SelectValue placeholder="Select experience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Property Owner</SelectItem>
                        <SelectItem value="tenant">Tenant</SelectItem>
                        <SelectItem value="buyer">Buyer</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Review Title *</Label>
                  <Input 
                    id="title"
                    name="title" 
                    required 
                    placeholder="Brief summary of your experience"
                    data-testid="input-review-title"
                  />
                </div>

                <div>
                  <Label htmlFor="review">Review *</Label>
                  <Textarea 
                    id="review"
                    name="review" 
                    required 
                    rows={4}
                    placeholder="Share your detailed experience with this developer..."
                    data-testid="textarea-review"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="isAnonymous" name="isAnonymous" data-testid="checkbox-anonymous" />
                  <Label htmlFor="isAnonymous">Post anonymously</Label>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-review"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createReviewMutation.isPending}
                    data-testid="button-submit-review"
                  >
                    {createReviewMutation.isPending ? "Posting..." : "Post Review"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <SearchIcon className="h-5 w-5 mr-2" />
                Search Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-reviews"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSearchQuery("");
                  setSelectedDeveloper("");
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>

          {/* Popular Developers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <TrendingUpIcon className="h-5 w-5 mr-2" />
                Top Developers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {popularDevelopers?.slice(0, 10).map((dev: PopularDeveloper) => (
                  <div 
                    key={dev.developerName}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      selectedDeveloper === dev.developerName ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" : ""
                    }`}
                    onClick={() => setSelectedDeveloper(dev.developerName)}
                    data-testid={`card-developer-${dev.developerName}`}
                  >
                    <div className="font-medium text-sm mb-1">{dev.developerName}</div>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center">
                        {renderStars(Math.round(dev.averageRating), "h-3 w-3")}
                        <span className="ml-1">{dev.averageRating.toFixed(1)}</span>
                      </div>
                      <span>{dev.totalReviews} reviews</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Developer Stats */}
          {selectedDeveloper && developerStats && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl">{selectedDeveloper}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {(developerStats as DeveloperStats).averageRating.toFixed(1)}
                    </div>
                    <div className="flex justify-center mb-2">
                      {renderStars(Math.round((developerStats as DeveloperStats).averageRating), "h-5 w-5")}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {(developerStats as DeveloperStats).totalReviews} reviews
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const stats = developerStats as DeveloperStats;
                        const count = parseInt(JSON.parse(typeof stats.ratingDistribution === 'string' ? stats.ratingDistribution : JSON.stringify(stats.ratingDistribution))[rating.toString()]) || 0;
                        const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                        
                        return (
                          <div key={rating} className="flex items-center space-x-2 text-sm">
                            <span className="w-8">{rating}★</span>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-yellow-400 h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-8 text-gray-600 dark:text-gray-400">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading reviews...</p>
              </div>
            ) : (reviewsData as any)?.reviews?.length > 0 ? (
              (reviewsData as any).reviews.map((review: DeveloperReview) => (
                <Card key={review.id} data-testid={`card-review-${review.id}`}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Review Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            {renderStars(review.rating)}
                            <span className="font-medium">{review.title}</span>
                            {review.isVerified && (
                              <Badge variant="secondary" className="text-xs">Verified</Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-x-2">
                            <span>
                              {review.isAnonymous ? "Anonymous" : 
                                (review.userFirstName && review.userLastName ? 
                                  `${review.userFirstName} ${review.userLastName.charAt(0)}.` : 
                                  "User")}
                            </span>
                            {review.experience && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{review.experience}</span>
                              </>
                            )}
                            {review.projectName && (
                              <>
                                <span>•</span>
                                <span>{review.projectName}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Review Content */}
                      <p className="text-gray-700 dark:text-gray-300">{review.review}</p>

                      {/* Review Actions */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <button
                            onClick={() => handleVote(review.id, "helpful")}
                            className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400"
                            data-testid={`button-helpful-${review.id}`}
                          >
                            <ThumbsUpIcon className="h-4 w-4" />
                            <span>Helpful ({review.helpfulVotes})</span>
                          </button>
                          <button
                            onClick={() => handleVote(review.id, "report")}
                            className="flex items-center space-x-1 hover:text-red-600 dark:hover:text-red-400"
                            data-testid={`button-report-${review.id}`}
                          >
                            <FlagIcon className="h-4 w-4" />
                            <span>Report</span>
                          </button>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {review.developerName}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400">
                    {searchQuery || selectedDeveloper ? 
                      "No reviews found matching your criteria." : 
                      "No reviews available. Be the first to write one!"}
                  </div>
                  {isAuthenticated && (
                    <Button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="mt-4"
                      data-testid="button-write-first-review"
                    >
                      Write First Review
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}