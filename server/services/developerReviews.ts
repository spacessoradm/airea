import { db } from "../db";
import { developerReviews, reviewVotes, users, type DeveloperReview, type InsertDeveloperReview } from "@shared/schema";
import { eq, sql, desc, and } from "drizzle-orm";

export class DeveloperReviewService {
  // Get reviews for a specific developer
  async getReviewsByDeveloper(developerName: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const reviews = await db
      .select({
        id: developerReviews.id,
        userId: developerReviews.userId,
        developerName: developerReviews.developerName,
        projectName: developerReviews.projectName,
        rating: developerReviews.rating,
        title: developerReviews.title,
        review: developerReviews.review,
        experience: developerReviews.experience,
        isAnonymous: developerReviews.isAnonymous,
        isVerified: developerReviews.isVerified,
        helpfulVotes: developerReviews.helpfulVotes,
        reportCount: developerReviews.reportCount,
        createdAt: developerReviews.createdAt,
        // Join user info for non-anonymous reviews
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(developerReviews)
      .leftJoin(users, eq(developerReviews.userId, users.id))
      .where(
        and(
          eq(sql`LOWER(${developerReviews.developerName})`, developerName.toLowerCase()),
          eq(developerReviews.status, "active")
        )
      )
      .orderBy(desc(developerReviews.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(developerReviews)
      .where(
        and(
          eq(sql`LOWER(${developerReviews.developerName})`, developerName.toLowerCase()),
          eq(developerReviews.status, "active")
        )
      );

    return {
      reviews,
      total: totalCount[0]?.count || 0,
      page,
      limit,
      totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
    };
  }

  // Get developer statistics and average rating
  async getDeveloperStats(developerName: string) {
    const stats = await db
      .select({
        averageRating: sql<number>`AVG(${developerReviews.rating})`,
        totalReviews: sql<number>`COUNT(*)`,
        ratingDistribution: sql<string>`jsonb_build_object(
          '1', COUNT(CASE WHEN ${developerReviews.rating} = 1 THEN 1 END),
          '2', COUNT(CASE WHEN ${developerReviews.rating} = 2 THEN 1 END),
          '3', COUNT(CASE WHEN ${developerReviews.rating} = 3 THEN 1 END),
          '4', COUNT(CASE WHEN ${developerReviews.rating} = 4 THEN 1 END),
          '5', COUNT(CASE WHEN ${developerReviews.rating} = 5 THEN 1 END)
        )`,
      })
      .from(developerReviews)
      .where(
        and(
          eq(sql`LOWER(${developerReviews.developerName})`, developerName.toLowerCase()),
          eq(developerReviews.status, "active")
        )
      );

    return stats[0] || { averageRating: 0, totalReviews: 0, ratingDistribution: '{"1":0,"2":0,"3":0,"4":0,"5":0}' };
  }

  // Create a new review
  async createReview(reviewData: InsertDeveloperReview): Promise<DeveloperReview> {
    const [review] = await db
      .insert(developerReviews)
      .values({
        ...reviewData,
        helpfulVotes: 0,
        reportCount: 0,
        status: "active",
      })
      .returning();

    return review;
  }

  // Vote on a review (helpful or report)
  async voteOnReview(userId: string, reviewId: string, voteType: 'helpful' | 'report') {
    // Check if user already voted on this review
    const existingVote = await db
      .select()
      .from(reviewVotes)
      .where(
        and(
          eq(reviewVotes.userId, userId),
          eq(reviewVotes.reviewId, reviewId)
        )
      );

    if (existingVote.length > 0) {
      throw new Error("You have already voted on this review");
    }

    // Create the vote
    await db.insert(reviewVotes).values({
      userId,
      reviewId,
      voteType,
    });

    // Update the review vote count
    if (voteType === 'helpful') {
      await db
        .update(developerReviews)
        .set({
          helpfulVotes: sql`${developerReviews.helpfulVotes} + 1`,
        })
        .where(eq(developerReviews.id, reviewId));
    } else if (voteType === 'report') {
      await db
        .update(developerReviews)
        .set({
          reportCount: sql`${developerReviews.reportCount} + 1`,
        })
        .where(eq(developerReviews.id, reviewId));
    }

    return { success: true };
  }

  // Get popular developers with review counts
  async getPopularDevelopers(limit = 20) {
    const developers = await db
      .select({
        developerName: developerReviews.developerName,
        averageRating: sql<number>`AVG(${developerReviews.rating})`,
        totalReviews: sql<number>`COUNT(*)`,
        recentReviews: sql<number>`COUNT(CASE WHEN ${developerReviews.createdAt} > NOW() - INTERVAL '30 days' THEN 1 END)`,
      })
      .from(developerReviews)
      .where(eq(developerReviews.status, "active"))
      .groupBy(developerReviews.developerName)
      .having(sql`COUNT(*) >= 3`) // Only developers with at least 3 reviews
      .orderBy(desc(sql`AVG(${developerReviews.rating})`), desc(sql`COUNT(*)`))
      .limit(limit);

    return developers;
  }

  // Search reviews by project name or content
  async searchReviews(query: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const reviews = await db
      .select({
        id: developerReviews.id,
        userId: developerReviews.userId,
        developerName: developerReviews.developerName,
        projectName: developerReviews.projectName,
        rating: developerReviews.rating,
        title: developerReviews.title,
        review: developerReviews.review,
        experience: developerReviews.experience,
        isAnonymous: developerReviews.isAnonymous,
        isVerified: developerReviews.isVerified,
        helpfulVotes: developerReviews.helpfulVotes,
        reportCount: developerReviews.reportCount,
        createdAt: developerReviews.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(developerReviews)
      .leftJoin(users, eq(developerReviews.userId, users.id))
      .where(
        and(
          sql`(
            LOWER(${developerReviews.developerName}) LIKE LOWER(${`%${query}%`}) OR
            LOWER(${developerReviews.projectName}) LIKE LOWER(${`%${query}%`}) OR
            LOWER(${developerReviews.title}) LIKE LOWER(${`%${query}%`}) OR
            LOWER(${developerReviews.review}) LIKE LOWER(${`%${query}%`})
          )`,
          eq(developerReviews.status, "active")
        )
      )
      .orderBy(desc(developerReviews.helpfulVotes), desc(developerReviews.createdAt))
      .limit(limit)
      .offset(offset);

    return reviews;
  }
}

export const developerReviewService = new DeveloperReviewService();