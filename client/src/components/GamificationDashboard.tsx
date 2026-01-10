import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Target, Gift, TrendingUp, Award, MapPin, Eye, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

interface UserStats {
  userId: string;
  totalPoints: number;
  level: number;
  propertiesViewed: number;
  areasExplored: number;
  typesDiscovered: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  updatedAt: string;
}

interface Challenge {
  id: string;
  userId: string;
  challengeType: string;
  progress: number;
  target: number;
  completed: boolean;
  completedAt: string | null;
  rewardClaimed: boolean;
  createdAt: string;
  updatedAt: string;
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

interface Reward {
  id: string;
  userId: string;
  rewardType: string;
  rewardValue: string;
  earnedFrom: string;
  claimedAt: string;
  expiresAt: string | null;
  rewardInfo: {
    type: 'points' | 'badge' | 'discount' | 'premium_feature';
    value: any;
    displayName: string;
    description: string;
  };
}

export function GamificationDashboard() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user stats
  const { data: userStats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['/api/gamification/stats'],
    enabled: isAuthenticated,
  });

  // Fetch challenges
  const { data: challenges, isLoading: challengesLoading } = useQuery<Challenge[]>({
    queryKey: ['/api/gamification/challenges'],
    enabled: isAuthenticated,
  });

  // Fetch rewards
  const { data: rewards, isLoading: rewardsLoading } = useQuery<Reward[]>({
    queryKey: ['/api/gamification/rewards'],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Join the Property Explorer Challenge!</h3>
        <p className="text-gray-600 mb-4">Sign in to track your progress and earn rewards while exploring properties.</p>
        <Button onClick={() => window.location.href = '/login'}>
          Sign In to Start
        </Button>
      </div>
    );
  }

  if (statsLoading || challengesLoading || rewardsLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  const calculateLevel = (points: number) => Math.floor(points / 500) + 1;
  const getPointsToNextLevel = (points: number) => {
    const currentLevel = calculateLevel(points);
    return (currentLevel * 500) - points;
  };

  const activeChallenges = challenges?.filter(c => !c.completed) || [];
  const completedChallenges = challenges?.filter(c => c.completed) || [];
  const recentRewards = rewards?.slice(0, 5) || [];

  return (
    <div className="space-y-6" data-testid="gamification-dashboard">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{userStats?.totalPoints || 0}</div>
            <p className="text-xs text-gray-600">
              {getPointsToNextLevel(userStats?.totalPoints || 0)} to level {calculateLevel(userStats?.totalPoints || 0) + 1}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Explorer Level</CardTitle>
            <Trophy className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              Level {userStats?.level || 1}
            </div>
            <p className="text-xs text-gray-600">Property Explorer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties Viewed</CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{userStats?.propertiesViewed || 0}</div>
            <p className="text-xs text-gray-600">Unique properties explored</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Areas Explored</CardTitle>
            <MapPin className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{userStats?.areasExplored || 0}</div>
            <p className="text-xs text-gray-600">Different locations visited</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Challenges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Active Challenges
          </CardTitle>
          <CardDescription>
            Complete challenges to earn points and unlock rewards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeChallenges.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              All challenges completed! New challenges will appear as you explore more properties.
            </p>
          ) : (
            activeChallenges.map((challenge) => (
              <div key={challenge.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{challenge.definition.icon}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{challenge.definition.name}</h4>
                      <p className="text-sm text-gray-600">{challenge.definition.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    {challenge.definition.points} points
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">
                      {challenge.progress}/{challenge.target}
                    </span>
                  </div>
                  <Progress 
                    value={(challenge.progress / challenge.target) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Rewards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-600" />
              Recent Rewards
            </CardTitle>
            <CardDescription>
              Rewards you've earned from completing challenges
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentRewards.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                Complete challenges to earn your first rewards!
              </p>
            ) : (
              recentRewards.map((reward) => (
                <div key={reward.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {reward.rewardInfo.type === 'points' ? (
                    <Star className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Award className="h-5 w-5 text-purple-500" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{reward.rewardInfo.displayName}</p>
                    <p className="text-sm text-gray-600">{reward.rewardInfo.description}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(reward.claimedAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Completed Challenges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-orange-600" />
              Achievements
            </CardTitle>
            <CardDescription>
              Challenges you've completed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedChallenges.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                Complete your first challenge by viewing properties!
              </p>
            ) : (
              completedChallenges.slice(0, 5).map((challenge) => (
                <div key={challenge.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <span className="text-xl">{challenge.definition.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{challenge.definition.name}</p>
                    <p className="text-sm text-gray-600">
                      Completed {challenge.completedAt ? new Date(challenge.completedAt).toLocaleDateString() : 'recently'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    ✓ Complete
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Continue Exploring
          </CardTitle>
          <CardDescription>
            Explore more properties to complete challenges and earn rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/search'} className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Browse Properties
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/search?listingType=rent'} className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Explore Areas
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/search?propertyType=apartment'} className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Try New Types
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}