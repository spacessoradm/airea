import { db } from "../db";
import { developerReviews, reviewVotes, users } from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import type { InsertDeveloperReview, DeveloperReview } from "@shared/schema";

export class ReviewService {
  // Create a new review
  async createReview(reviewData: InsertDeveloperReview): Promise<DeveloperReview> {
    const [review] = await db
      .insert(developerReviews)
      .values(reviewData)
      .returning();
    return review;
  }

  // Get reviews for a specific developer
  async getReviewsByDeveloper(developerName: string, limit = 10, offset = 0) {
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
        status: developerReviews.status,
        createdAt: developerReviews.createdAt,
        updatedAt: developerReviews.updatedAt,
        authorName: sql<string>`CASE 
          WHEN ${developerReviews.isAnonymous} = true THEN 'Anonymous'
          ELSE COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'User')
        END`.as('authorName')
      })
      .from(developerReviews)
      .leftJoin(users, eq(developerReviews.userId, users.id))
      .where(
        and(
          eq(developerReviews.developerName, developerName),
          eq(developerReviews.status, 'active')
        )
      )
      .orderBy(desc(developerReviews.createdAt))
      .limit(limit)
      .offset(offset);

    return reviews;
  }

  // Get reviews for a specific project
  async getReviewsByProject(projectName: string, limit = 10, offset = 0) {
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
        status: developerReviews.status,
        createdAt: developerReviews.createdAt,
        updatedAt: developerReviews.updatedAt,
        authorName: sql<string>`CASE 
          WHEN ${developerReviews.isAnonymous} = true THEN 'Anonymous'
          ELSE COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'User')
        END`.as('authorName')
      })
      .from(developerReviews)
      .leftJoin(users, eq(developerReviews.userId, users.id))
      .where(
        and(
          eq(developerReviews.projectName, projectName),
          eq(developerReviews.status, 'active')
        )
      )
      .orderBy(desc(developerReviews.createdAt))
      .limit(limit)
      .offset(offset);

    return reviews;
  }

  // Get developer statistics
  async getDeveloperStats(developerName: string) {
    const [stats] = await db
      .select({
        totalReviews: sql<number>`COUNT(*)`.as('totalReviews'),
        averageRating: sql<number>`AVG(${developerReviews.rating})`.as('averageRating'),
        ratingDistribution: sql<any>`
          jsonb_build_object(
            '5', COUNT(CASE WHEN ${developerReviews.rating} = 5 THEN 1 END),
            '4', COUNT(CASE WHEN ${developerReviews.rating} = 4 THEN 1 END),
            '3', COUNT(CASE WHEN ${developerReviews.rating} = 3 THEN 1 END),
            '2', COUNT(CASE WHEN ${developerReviews.rating} = 2 THEN 1 END),
            '1', COUNT(CASE WHEN ${developerReviews.rating} = 1 THEN 1 END)
          )
        `.as('ratingDistribution')
      })
      .from(developerReviews)
      .where(
        and(
          eq(developerReviews.developerName, developerName),
          eq(developerReviews.status, 'active')
        )
      );

    return stats;
  }

  // Vote on review (helpful or report)
  async voteOnReview(userId: string, reviewId: string, voteType: 'helpful' | 'report') {
    // Check if user already voted
    const existingVote = await db
      .select()
      .from(reviewVotes)
      .where(
        and(
          eq(reviewVotes.userId, userId),
          eq(reviewVotes.reviewId, reviewId),
          eq(reviewVotes.voteType, voteType)
        )
      )
      .limit(1);

    if (existingVote.length > 0) {
      throw new Error('User has already voted on this review');
    }

    // Add vote
    await db.insert(reviewVotes).values({
      userId,
      reviewId,
      voteType
    });

    // Update review counts
    if (voteType === 'helpful') {
      await db
        .update(developerReviews)
        .set({
          helpfulVotes: sql`${developerReviews.helpfulVotes} + 1`
        })
        .where(eq(developerReviews.id, reviewId));
    } else {
      await db
        .update(developerReviews)
        .set({
          reportCount: sql`${developerReviews.reportCount} + 1`
        })
        .where(eq(developerReviews.id, reviewId));
    }

    return { success: true };
  }

  // Get popular developers by review count and ratings
  async getPopularDevelopers(limit = 10) {
    const developers = await db
      .select({
        developerName: developerReviews.developerName,
        totalReviews: sql<number>`COUNT(*)`.as('totalReviews'),
        averageRating: sql<number>`AVG(${developerReviews.rating})`.as('averageRating'),
        totalHelpfulVotes: sql<number>`SUM(${developerReviews.helpfulVotes})`.as('totalHelpfulVotes')
      })
      .from(developerReviews)
      .where(eq(developerReviews.status, 'active'))
      .groupBy(developerReviews.developerName)
      .having(sql`COUNT(*) >= 3`) // At least 3 reviews
      .orderBy(
        desc(sql`AVG(${developerReviews.rating})`),
        desc(sql`COUNT(*)`)
      )
      .limit(limit);

    return developers;
  }

  // Search reviews by keyword
  async searchReviews(query: string, limit = 20, offset = 0) {
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
        status: developerReviews.status,
        createdAt: developerReviews.createdAt,
        updatedAt: developerReviews.updatedAt,
        authorName: sql<string>`CASE 
          WHEN ${developerReviews.isAnonymous} = true THEN 'Anonymous'
          ELSE COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'User')
        END`.as('authorName')
      })
      .from(developerReviews)
      .leftJoin(users, eq(developerReviews.userId, users.id))
      .where(
        and(
          sql`(
            ${developerReviews.developerName} ILIKE ${`%${query}%`} OR 
            ${developerReviews.projectName} ILIKE ${`%${query}%`} OR 
            ${developerReviews.title} ILIKE ${`%${query}%`} OR 
            ${developerReviews.review} ILIKE ${`%${query}%`}
          )`,
          eq(developerReviews.status, 'active')
        )
      )
      .orderBy(desc(developerReviews.helpfulVotes), desc(developerReviews.createdAt))
      .limit(limit)
      .offset(offset);

    return reviews;
  }
}

export const reviewService = new ReviewService();