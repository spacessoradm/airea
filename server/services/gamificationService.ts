import { db } from "../db";
import { 
  userChallenges, 
  userRewards, 
  userExplorations, 
  userStats,
  type InsertUserChallenge,
  type InsertUserReward,
  type InsertUserExploration,
  type InsertUserStats,
  type UserStats,
  type UserChallenge,
  type UserReward
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface ChallengeDefinition {
  type: string;
  name: string;
  description: string;
  target: number;
  points: number;
  badge?: string;
  icon: string;
}

export interface RewardInfo {
  type: 'points' | 'badge' | 'discount' | 'premium_feature';
  value: any;
  displayName: string;
  description: string;
}

// Challenge definitions
export const CHALLENGE_DEFINITIONS: Record<string, ChallengeDefinition> = {
  property_explorer_1: {
    type: "property_explorer",
    name: "Property Explorer",
    description: "View 5 different properties",
    target: 5,
    points: 50,
    badge: "🏠 Explorer",
    icon: "🏠"
  },
  property_explorer_2: {
    type: "property_explorer",
    name: "Property Enthusiast",
    description: "View 15 different properties",
    target: 15,
    points: 150,
    badge: "🔍 Enthusiast",
    icon: "🔍"
  },
  property_explorer_3: {
    type: "property_explorer",
    name: "Property Master",
    description: "View 50 different properties",
    target: 50,
    points: 500,
    badge: "👑 Master",
    icon: "👑"
  },
  area_discoverer_1: {
    type: "area_discoverer",
    name: "Area Scout",
    description: "Explore 3 different areas",
    target: 3,
    points: 75,
    badge: "🗺️ Scout",
    icon: "🗺️"
  },
  area_discoverer_2: {
    type: "area_discoverer",
    name: "City Explorer",
    description: "Explore 10 different areas",
    target: 10,
    points: 250,
    badge: "🌆 City Explorer",
    icon: "🌆"
  },
  type_collector_1: {
    type: "type_collector",
    name: "Type Collector",
    description: "View 3 different property types",
    target: 3,
    points: 100,
    badge: "📋 Collector",
    icon: "📋"
  },
  type_collector_2: {
    type: "type_collector",
    name: "Property Specialist",
    description: "View 7 different property types",
    target: 7,
    points: 300,
    badge: "🎯 Specialist",
    icon: "🎯"
  }
};

export class GamificationService {
  
  async initializeUserStats(userId: string): Promise<UserStats> {
    // Check if user stats exist
    const [existingStats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId));

    if (existingStats) {
      return existingStats;
    }

    // Create new user stats
    const [newStats] = await db
      .insert(userStats)
      .values({
        userId,
        totalPoints: 0,
        level: 1,
        propertiesViewed: 0,
        areasExplored: 0,
        typesDiscovered: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: new Date()
      })
      .returning();

    // Initialize starter challenges
    await this.createInitialChallenges(userId);

    return newStats;
  }

  async createInitialChallenges(userId: string): Promise<void> {
    const initialChallenges = [
      'property_explorer_1',
      'area_discoverer_1', 
      'type_collector_1'
    ];

    for (const challengeKey of initialChallenges) {
      const challenge = CHALLENGE_DEFINITIONS[challengeKey];
      await db.insert(userChallenges).values({
        userId,
        challengeType: challenge.type,
        progress: 0,
        target: challenge.target,
        completed: false,
        rewardClaimed: false
      });
    }
  }

  async recordPropertyView(userId: string, propertyId: string, area: string, propertyType: string): Promise<void> {
    // Record exploration
    await db.insert(userExplorations).values({
      userId,
      propertyId,
      area,
      propertyType,
      action: 'viewed'
    });

    // Update user stats
    await this.updateUserStats(userId);
    
    // Check and update challenges
    await this.updateChallenges(userId);
  }

  async updateUserStats(userId: string): Promise<void> {
    // Get unique counts
    const uniqueProperties = await db
      .select({ count: sql<number>`count(distinct ${userExplorations.propertyId})` })
      .from(userExplorations)
      .where(and(
        eq(userExplorations.userId, userId),
        eq(userExplorations.action, 'viewed')
      ));

    const uniqueAreas = await db
      .select({ count: sql<number>`count(distinct ${userExplorations.area})` })
      .from(userExplorations)
      .where(and(
        eq(userExplorations.userId, userId),
        eq(userExplorations.action, 'viewed')
      ));

    const uniqueTypes = await db
      .select({ count: sql<number>`count(distinct ${userExplorations.propertyType})` })
      .from(userExplorations)
      .where(and(
        eq(userExplorations.userId, userId),
        eq(userExplorations.action, 'viewed')
      ));

    // Update stats
    await db
      .update(userStats)
      .set({
        propertiesViewed: uniqueProperties[0]?.count || 0,
        areasExplored: uniqueAreas[0]?.count || 0,
        typesDiscovered: uniqueTypes[0]?.count || 0,
        lastActiveDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userStats.userId, userId));
  }

  async updateChallenges(userId: string): Promise<UserChallenge[]> {
    const stats = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId));

    if (!stats[0]) return [];

    const userStatsData = stats[0];
    const completedChallenges: UserChallenge[] = [];

    // Get active challenges
    const activeChallenges = await db
      .select()
      .from(userChallenges)
      .where(and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.completed, false)
      ));

    for (const challenge of activeChallenges) {
      let currentProgress = 0;
      
      switch (challenge.challengeType) {
        case 'property_explorer':
          currentProgress = userStatsData.propertiesViewed;
          break;
        case 'area_discoverer':
          currentProgress = userStatsData.areasExplored;
          break;
        case 'type_collector':
          currentProgress = userStatsData.typesDiscovered;
          break;
      }

      // Update progress
      const updatedProgress = Math.min(currentProgress, challenge.target);
      const isCompleted = updatedProgress >= challenge.target;

      await db
        .update(userChallenges)
        .set({
          progress: updatedProgress,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(userChallenges.id, challenge.id));

      if (isCompleted && !challenge.completed) {
        // Award points and create reward
        await this.awardChallengeCompletion(userId, challenge.id);
        completedChallenges.push({
          ...challenge,
          progress: updatedProgress,
          completed: true,
          completedAt: new Date()
        });

        // Create next level challenge if available
        await this.createNextLevelChallenge(userId, challenge.challengeType);
      }
    }

    return completedChallenges;
  }

  async awardChallengeCompletion(userId: string, challengeId: string): Promise<void> {
    const challengeKey = this.findChallengeKey(challengeId);
    const challengeDef = challengeKey ? CHALLENGE_DEFINITIONS[challengeKey] : null;
    
    if (!challengeDef) return;

    // Award points
    await db.insert(userRewards).values({
      userId,
      rewardType: 'points',
      rewardValue: JSON.stringify({ points: challengeDef.points }),
      earnedFrom: challengeId,
      claimedAt: new Date()
    });

    // Award badge if available
    if (challengeDef.badge) {
      await db.insert(userRewards).values({
        userId,
        rewardType: 'badge',
        rewardValue: JSON.stringify({ 
          badge: challengeDef.badge, 
          name: challengeDef.name,
          icon: challengeDef.icon
        }),
        earnedFrom: challengeId,
        claimedAt: new Date()
      });
    }

    // Update user total points
    await db
      .update(userStats)
      .set({
        totalPoints: sql`${userStats.totalPoints} + ${challengeDef.points}`,
        updatedAt: new Date()
      })
      .where(eq(userStats.userId, userId));
  }

  private findChallengeKey(challengeId: string): string | null {
    // This is a simplified approach - in a real app you'd store the challenge key in the DB
    const challenges = ['property_explorer_1', 'property_explorer_2', 'property_explorer_3', 
                       'area_discoverer_1', 'area_discoverer_2', 
                       'type_collector_1', 'type_collector_2'];
    return challenges[0]; // Simplified for demo
  }

  async createNextLevelChallenge(userId: string, challengeType: string): Promise<void> {
    const nextChallenges: Record<string, string[]> = {
      'property_explorer': ['property_explorer_2', 'property_explorer_3'],
      'area_discoverer': ['area_discoverer_2'],
      'type_collector': ['type_collector_2']
    };

    const nextChallenge = nextChallenges[challengeType]?.[0];
    if (!nextChallenge) return;

    const challengeDef = CHALLENGE_DEFINITIONS[nextChallenge];
    if (!challengeDef) return;

    // Check if challenge already exists
    const existing = await db
      .select()
      .from(userChallenges)
      .where(and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.challengeType, challengeType),
        eq(userChallenges.target, challengeDef.target)
      ));

    if (existing.length === 0) {
      await db.insert(userChallenges).values({
        userId,
        challengeType: challengeDef.type,
        progress: 0,
        target: challengeDef.target,
        completed: false,
        rewardClaimed: false
      });
    }
  }

  async getUserStats(userId: string): Promise<UserStats | null> {
    const [stats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId));
    
    return stats || null;
  }

  async getUserChallenges(userId: string): Promise<(UserChallenge & { definition: ChallengeDefinition })[]> {
    const challenges = await db
      .select()
      .from(userChallenges)
      .where(eq(userChallenges.userId, userId))
      .orderBy(desc(userChallenges.createdAt));

    return challenges.map(challenge => {
      const definition = this.getChallengeDefinition(challenge.challengeType, challenge.target);
      return { ...challenge, definition };
    });
  }

  private getChallengeDefinition(type: string, target: number): ChallengeDefinition {
    const matching = Object.values(CHALLENGE_DEFINITIONS).find(
      def => def.type === type && def.target === target
    );
    
    return matching || {
      type,
      name: "Unknown Challenge",
      description: `Complete ${target} ${type} actions`,
      target,
      points: target * 10,
      icon: "🎯"
    };
  }

  async getUserRewards(userId: string): Promise<(UserReward & { rewardInfo: RewardInfo })[]> {
    const rewards = await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.userId, userId))
      .orderBy(desc(userRewards.claimedAt));

    return rewards.map(reward => {
      const rewardInfo = this.parseRewardInfo(reward.rewardType, reward.rewardValue);
      return { ...reward, rewardInfo };
    });
  }

  private parseRewardInfo(type: string, value: string): RewardInfo {
    try {
      const parsed = JSON.parse(value);
      
      switch (type) {
        case 'points':
          return {
            type: 'points',
            value: parsed.points,
            displayName: `${parsed.points} Points`,
            description: `Earned ${parsed.points} exploration points`
          };
        case 'badge':
          return {
            type: 'badge',
            value: parsed,
            displayName: parsed.badge || "Badge",
            description: `Unlocked: ${parsed.name}`
          };
        default:
          return {
            type: 'points',
            value: 0,
            displayName: "Unknown Reward",
            description: "Unknown reward type"
          };
      }
    } catch {
      return {
        type: 'points',
        value: 0,
        displayName: "Unknown Reward",
        description: "Invalid reward data"
      };
    }
  }

  calculateLevel(totalPoints: number): number {
    // Level calculation: every 500 points = 1 level
    return Math.floor(totalPoints / 500) + 1;
  }

  getPointsToNextLevel(totalPoints: number): number {
    const currentLevel = this.calculateLevel(totalPoints);
    const nextLevelPoints = currentLevel * 500;
    return nextLevelPoints - totalPoints;
  }
}

export const gamificationService = new GamificationService();