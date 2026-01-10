import { db } from "../db";
import { rentalYieldData, properties } from "@shared/schema";
import { eq, sql, and, gte, lte } from "drizzle-orm";
import type { InsertRentalYieldData, RentalYieldData } from "@shared/schema";

export class RentalYieldService {
  // Calculate and update rental yield for an area
  async calculateRentalYield(area: string, city: string, state: string) {
    // Get all rental and sale properties in the area
    const areaProperties = await db
      .select({
        listingType: properties.listingType,
        price: properties.price,
        latitude: properties.latitude,
        longitude: properties.longitude
      })
      .from(properties)
      .where(
        and(
          eq(properties.city, city),
          sql`${properties.address} ILIKE ${`%${area}%`}`
        )
      );

    const rentalProperties = areaProperties.filter(p => p.listingType === 'rent');
    const saleProperties = areaProperties.filter(p => p.listingType === 'sale');

    if (rentalProperties.length === 0 || saleProperties.length === 0) {
      return null; // Cannot calculate yield without both rental and sale data
    }

    // Calculate averages
    const avgRentPrice = rentalProperties.reduce((sum, p) => sum + parseFloat(p.price), 0) / rentalProperties.length;
    const avgSalePrice = saleProperties.reduce((sum, p) => sum + parseFloat(p.price), 0) / saleProperties.length;

    // Calculate annual rental yield percentage
    const annualRent = avgRentPrice * 12;
    const rentalYield = (annualRent / avgSalePrice) * 100;

    // Get average coordinates for the area
    const allProperties = [...rentalProperties, ...saleProperties];
    const avgLat = allProperties.reduce((sum, p) => sum + parseFloat(p.latitude), 0) / allProperties.length;
    const avgLng = allProperties.reduce((sum, p) => sum + parseFloat(p.longitude), 0) / allProperties.length;

    // Update or insert yield data
    const existingData = await db
      .select()
      .from(rentalYieldData)
      .where(
        and(
          eq(rentalYieldData.area, area),
          eq(rentalYieldData.city, city),
          eq(rentalYieldData.state, state)
        )
      )
      .limit(1);

    const yieldDataValues: InsertRentalYieldData = {
      area,
      city,
      state,
      latitude: avgLat.toFixed(8),
      longitude: avgLng.toFixed(8),
      averageRentPrice: avgRentPrice.toFixed(2),
      averagePropertyPrice: avgSalePrice.toFixed(2),
      rentalYield: rentalYield.toFixed(2),
      propertyCount: allProperties.length,
      lastUpdated: new Date()
    };

    if (existingData.length > 0) {
      const [updated] = await db
        .update(rentalYieldData)
        .set(yieldDataValues)
        .where(eq(rentalYieldData.id, existingData[0].id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db
        .insert(rentalYieldData)
        .values(yieldDataValues)
        .returning();
      return inserted;
    }
  }

  // Get rental yield data for heat map
  async getYieldHeatMapData(
    state?: string,
    minYield?: number,
    maxYield?: number,
    limit = 100
  ): Promise<RentalYieldData[]> {
    let query = db.select().from(rentalYieldData);

    const conditions = [];
    if (state) {
      conditions.push(eq(rentalYieldData.state, state));
    }
    if (minYield !== undefined) {
      conditions.push(gte(rentalYieldData.rentalYield, minYield.toString()));
    }
    if (maxYield !== undefined) {
      conditions.push(lte(rentalYieldData.rentalYield, maxYield.toString()));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(sql`${rentalYieldData.rentalYield} DESC`)
      .limit(limit);

    return results;
  }

  // Get top performing areas by rental yield
  async getTopYieldAreas(state?: string, limit = 10) {
    let query = db
      .select({
        area: rentalYieldData.area,
        city: rentalYieldData.city,
        state: rentalYieldData.state,
        rentalYield: rentalYieldData.rentalYield,
        averageRentPrice: rentalYieldData.averageRentPrice,
        averagePropertyPrice: rentalYieldData.averagePropertyPrice,
        propertyCount: rentalYieldData.propertyCount,
        lastUpdated: rentalYieldData.lastUpdated
      })
      .from(rentalYieldData);

    if (state) {
      query = query.where(eq(rentalYieldData.state, state));
    }

    const results = await query
      .orderBy(sql`${rentalYieldData.rentalYield} DESC`)
      .limit(limit);

    return results;
  }

  // Calculate yield trends over time (if we had historical data)
  async getYieldTrends(area: string, city: string, state: string) {
    // For now, return current data with placeholder historical trend
    const current = await db
      .select()
      .from(rentalYieldData)
      .where(
        and(
          eq(rentalYieldData.area, area),
          eq(rentalYieldData.city, city),
          eq(rentalYieldData.state, state)
        )
      )
      .limit(1);

    if (current.length === 0) {
      return null;
    }

    // Return current yield with trend indicator
    return {
      ...current[0],
      trend: 'stable', // Could be 'increasing', 'decreasing', 'stable'
      trendPercentage: 0 // Percentage change from previous period
    };
  }

  // Batch calculate yields for all areas
  async recalculateAllYields() {
    // Get all unique area/city combinations from properties
    const uniqueAreas = await db
      .selectDistinct({
        city: properties.city,
        area: sql<string>`split_part(${properties.address}, ',', 1)`.as('area')
      })
      .from(properties)
      .where(sql`${properties.city} IS NOT NULL AND ${properties.address} IS NOT NULL`);

    const results = [];
    for (const location of uniqueAreas) {
      try {
        const result = await this.calculateRentalYield(location.area, location.city, 'Kuala Lumpur');
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Error calculating yield for ${location.area}, ${location.city}:`, error);
      }
    }

    return results;
  }

  // Get comparative analysis for an area
  async getAreaComparison(area: string, city: string, state: string) {
    const targetArea = await db
      .select()
      .from(rentalYieldData)
      .where(
        and(
          eq(rentalYieldData.area, area),
          eq(rentalYieldData.city, city),
          eq(rentalYieldData.state, state)
        )
      )
      .limit(1);

    if (targetArea.length === 0) {
      return null;
    }

    // Get similar areas in the same city
    const similarAreas = await db
      .select()
      .from(rentalYieldData)
      .where(
        and(
          eq(rentalYieldData.city, city),
          eq(rentalYieldData.state, state),
          sql`${rentalYieldData.area} != ${area}`
        )
      )
      .orderBy(sql`ABS(${rentalYieldData.rentalYield} - ${targetArea[0].rentalYield})`)
      .limit(5);

    return {
      target: targetArea[0],
      similar: similarAreas,
      cityAverage: await this.getCityYieldAverage(city, state)
    };
  }

  // Get city-wide rental yield average
  async getCityYieldAverage(city: string, state: string) {
    const [result] = await db
      .select({
        avgYield: sql<number>`AVG(${rentalYieldData.rentalYield})`.as('avgYield'),
        avgRent: sql<number>`AVG(${rentalYieldData.averageRentPrice})`.as('avgRent'),
        avgPrice: sql<number>`AVG(${rentalYieldData.averagePropertyPrice})`.as('avgPrice'),
        totalProperties: sql<number>`SUM(${rentalYieldData.propertyCount})`.as('totalProperties')
      })
      .from(rentalYieldData)
      .where(
        and(
          eq(rentalYieldData.city, city),
          eq(rentalYieldData.state, state)
        )
      );

    return result;
  }
}

export const rentalYieldService = new RentalYieldService();