import { db } from "../db";
import { propertyAnalytics, marketAnalytics, inquiries } from "@shared/schema";
import { eq, sql, and, gte, lte, desc, asc } from "drizzle-orm";

export class AnalyticsService {
  // Property Performance Metrics
  async getPropertyMetrics(propertyId: string, startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate 
      ? and(gte(propertyAnalytics.date, startDate), lte(propertyAnalytics.date, endDate))
      : undefined;

    const metrics = await db
      .select({
        totalViews: sql<number>`COALESCE(SUM(${propertyAnalytics.views}), 0)`,
        totalInquiries: sql<number>`COALESCE(SUM(${propertyAnalytics.inquiries}), 0)`,
        totalApplications: sql<number>`COALESCE(SUM(${propertyAnalytics.applications}), 0)`,
        totalConversions: sql<number>`COALESCE(SUM(${propertyAnalytics.conversions}), 0)`,
        conversionRate: sql<number>`
          CASE 
            WHEN SUM(${propertyAnalytics.inquiries}) > 0 
            THEN (SUM(${propertyAnalytics.conversions})::float / SUM(${propertyAnalytics.inquiries})::float) * 100
            ELSE 0 
          END
        `,
      })
      .from(propertyAnalytics)
      .where(
        dateFilter 
          ? and(eq(propertyAnalytics.propertyId, propertyId), dateFilter)
          : eq(propertyAnalytics.propertyId, propertyId)
      );

    return metrics[0] || {
      totalViews: 0,
      totalInquiries: 0,
      totalApplications: 0,
      totalConversions: 0,
      conversionRate: 0,
    };
  }


  // Market Analytics
  async getMarketAnalytics(area?: string, propertyType?: string, year?: number, month?: number) {
    let whereClause = sql`1=1`;
    
    if (area) {
      whereClause = sql`${whereClause} AND ${marketAnalytics.area} = ${area}`;
    }
    if (propertyType) {
      whereClause = sql`${whereClause} AND ${marketAnalytics.propertyType} = ${propertyType}`;
    }
    if (year) {
      whereClause = sql`${whereClause} AND ${marketAnalytics.year} = ${year}`;
    }
    if (month) {
      whereClause = sql`${whereClause} AND ${marketAnalytics.month} = ${month}`;
    }

    const analytics = await db
      .select()
      .from(marketAnalytics)
      .where(whereClause)
      .orderBy(desc(marketAnalytics.year), desc(marketAnalytics.month));

    return analytics;
  }

  // Lead Generation Reports
  async getLeadGenerationReports(agentId: string, startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate 
      ? and(gte(inquiries.createdAt, startDate), lte(inquiries.createdAt, endDate))
      : undefined;

    // Get inquiries by property
    const inquiriesByProperty = await db
      .select({
        propertyId: inquiries.propertyId,
        propertyTitle: sql<string>`p.title`,
        inquiryCount: sql<number>`COUNT(*)`,
        conversionCount: sql<number>`SUM(CASE WHEN ${inquiries.status} = 'closed' THEN 1 ELSE 0 END)`,
        conversionRate: sql<number>`
          CASE 
            WHEN COUNT(*) > 0 
            THEN (SUM(CASE WHEN ${inquiries.status} = 'closed' THEN 1 ELSE 0 END)::float / COUNT(*)::float) * 100
            ELSE 0 
          END
        `,
      })
      .from(inquiries)
      .leftJoin(sql`properties p`, sql`p.id = ${inquiries.propertyId}`)
      .where(
        dateFilter
          ? and(eq(inquiries.agentId, agentId), dateFilter)
          : eq(inquiries.agentId, agentId)
      )
      .groupBy(inquiries.propertyId, sql`p.title`)
      .orderBy(desc(sql`COUNT(*)`));

    // Get inquiries by source
    const inquiriesBySource = await db
      .select({
        source: inquiries.source,
        count: sql<number>`COUNT(*)`,
        conversionRate: sql<number>`
          CASE 
            WHEN COUNT(*) > 0 
            THEN (SUM(CASE WHEN ${inquiries.status} = 'closed' THEN 1 ELSE 0 END)::float / COUNT(*)::float) * 100
            ELSE 0 
          END
        `,
      })
      .from(inquiries)
      .where(
        dateFilter
          ? and(eq(inquiries.agentId, agentId), dateFilter)
          : eq(inquiries.agentId, agentId)
      )
      .groupBy(inquiries.source)
      .orderBy(desc(sql`COUNT(*)`));

    return {
      inquiriesByProperty,
      inquiriesBySource,
    };
  }

  // Track property view
  async trackPropertyView(propertyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if analytics record exists for today
    const existingRecord = await db
      .select()
      .from(propertyAnalytics)
      .where(
        and(
          eq(propertyAnalytics.propertyId, propertyId),
          gte(propertyAnalytics.date, today)
        )
      )
      .limit(1);

    if (existingRecord.length > 0) {
      // Update existing record
      await db
        .update(propertyAnalytics)
        .set({
          views: sql`${propertyAnalytics.views} + 1`
        })
        .where(eq(propertyAnalytics.id, existingRecord[0].id));
    } else {
      // Create new record
      await db
        .insert(propertyAnalytics)
        .values({
          propertyId,
          date: today,
          views: 1,
          inquiries: 0,
          applications: 0,
          conversions: 0,
        });
    }
  }

  // Track inquiry
  async trackPropertyInquiry(propertyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingRecord = await db
      .select()
      .from(propertyAnalytics)
      .where(
        and(
          eq(propertyAnalytics.propertyId, propertyId),
          gte(propertyAnalytics.date, today)
        )
      )
      .limit(1);

    if (existingRecord.length > 0) {
      await db
        .update(propertyAnalytics)
        .set({
          inquiries: sql`${propertyAnalytics.inquiries} + 1`
        })
        .where(eq(propertyAnalytics.id, existingRecord[0].id));
    } else {
      await db
        .insert(propertyAnalytics)
        .values({
          propertyId,
          date: today,
          views: 0,
          inquiries: 1,
          applications: 0,
          conversions: 0,
        });
    }
  }

}