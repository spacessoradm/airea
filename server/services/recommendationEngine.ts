import { db } from "../db";
import { properties, favorites } from "@shared/schema";
import { eq, and, sql, desc, ne, gte, lte, inArray, or, like } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface UserPreferences {
  preferredPropertyTypes: string[];
  priceRange: { min: number; max: number };
  preferredBedrooms: number[];
  preferredAreas: string[];
  preferredAmenities: string[];
  budgetFlexibility: number; // 0.1 = 10% flexibility
}

export interface MarketComparison {
  marketMedian: number;
  actualPrice: number;
  savingsAmount: number;
  savingsPercent: number;
}

export interface PropertyRecommendation {
  property: any;
  score: number;
  reason: string;
  type: 'similar' | 'better_value' | 'upgrade' | 'alternative_area';
  marketComparison?: MarketComparison;
}

export class PropertyRecommendationEngine {
  /**
   * Learn user preferences from their interaction history
   */
  async analyzeUserPreferences(userId: number): Promise<UserPreferences> {
    // For now, get user's favorited properties since interactions table will be added later
    const clickedProperties: any[] = [];

    // Get user's favorited properties  
    const favoritedProperties = await db
      .select({ property: properties })
      .from(favorites)
      .innerJoin(properties, eq(favorites.propertyId, properties.id))
      .where(eq(favorites.userId, sql`${userId}::varchar`));

    const allEngagedProperties = [
      ...clickedProperties.map((p: any) => p.property),
      ...favoritedProperties.map(p => p.property)
    ];

    if (allEngagedProperties.length === 0) {
      return this.getDefaultPreferences();
    }

    // Extract patterns from engaged properties
    const propertyTypes = Array.from(new Set(allEngagedProperties.map(p => p.propertyType)));
    const bedrooms = Array.from(new Set(allEngagedProperties.map(p => p.bedrooms).filter(b => b)));
    const areas = Array.from(new Set(allEngagedProperties.map(p => p.city).filter(a => a))); // Use city instead of area
    const prices = allEngagedProperties.map(p => parseFloat(p.price as string)).filter(p => p > 0);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Extract amenities from engaged properties
    const allAmenities = allEngagedProperties
      .flatMap(p => p.amenities || [])
      .filter(Boolean);
    const amenityCounts = allAmenities.reduce((acc: Record<string, number>, amenity: string) => {
      acc[amenity] = (acc[amenity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const preferredAmenities = Object.entries(amenityCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([amenity]) => amenity);

    return {
      preferredPropertyTypes: propertyTypes,
      priceRange: { 
        min: Math.max(0, avgPrice * 0.7), 
        max: avgPrice * 1.3 
      },
      preferredBedrooms: bedrooms,
      preferredAreas: areas,
      preferredAmenities,
      budgetFlexibility: 0.2 // 20% flexibility
    };
  }

  /**
   * Get similar properties based on user preferences
   */
  async getSimilarProperties(
    userId: number, 
    excludePropertyIds: string[] = [],
    limit: number = 10
  ): Promise<PropertyRecommendation[]> {
    const preferences = await this.analyzeUserPreferences(userId);
    
    try {
      // Get all available properties and filter in memory to avoid SQL array issues
      const allProperties = await db
        .select()
        .from(properties)
        .limit(100);
      
      // Filter properties based on preferences
      const similarProperties = allProperties.filter(property => {
        // Exclude specified property IDs
        if (excludePropertyIds.includes(property.id)) return false;
        
        // Check property type preference
        if (preferences.preferredPropertyTypes.length > 0 && 
            !preferences.preferredPropertyTypes.includes(property.propertyType)) {
          return false;
        }
        
        // Check price range with flexibility
        const propertyPrice = parseFloat(property.price.replace(/[^\d.-]/g, ''));
        const minPrice = preferences.priceRange.min * (1 - preferences.budgetFlexibility);
        const maxPrice = preferences.priceRange.max * (1 + preferences.budgetFlexibility);
        
        return propertyPrice >= minPrice && propertyPrice <= maxPrice;
      }).slice(0, limit * 2);

      return this.scoreAndRankProperties(similarProperties, preferences, 'similar');
    } catch (error) {
      console.error('Error in getSimilarProperties:', error);
      return [];
    }
  }

  /**
   * Find better value properties (similar features, lower price with market comparison)
   */
  async getBetterValueProperties(
    userId: number,
    excludePropertyIds: string[] = [],
    limit: number = 5
  ): Promise<PropertyRecommendation[]> {
    const preferences = await this.analyzeUserPreferences(userId);
    
    // Get market medians for comparison
    const marketData = await this.calculateMarketMedians();
    
    // Find properties with similar features but better value
    const candidateProperties = await db
      .select()
      .from(properties)
      .where(
        and(
          excludePropertyIds.length > 0 ? 
            ne(properties.id, excludePropertyIds[0]) : 
            sql`true`,
          sql`${properties.propertyType} = ANY(${preferences.preferredPropertyTypes})`,
          sql`CAST(${properties.price} AS NUMERIC) <= ${preferences.priceRange.max * 1.2}`,
          preferences.preferredBedrooms.length > 0 ? 
            sql`${properties.bedrooms} = ANY(${preferences.preferredBedrooms})` : 
            sql`true`
        )
      )
      .limit(limit * 4); // Get more candidates for better filtering

    // Filter for true best value with market comparison
    const betterValueProperties = candidateProperties.filter(property => {
      const marketKey = `${property.propertyType}_${property.bedrooms}BR_${property.city}`;
      const localMarketKey = `${property.propertyType}_${property.bedrooms}BR`;
      
      const localMedian = marketData[marketKey] || marketData[localMarketKey];
      if (!localMedian) return false;
      
      const propertyPrice = parseFloat(property.price as string);
      const savingsPercent = ((localMedian - propertyPrice) / localMedian) * 100;
      
      // Consider it "best value" if 10% or more below market median
      return savingsPercent >= 10;
    });

    return this.scoreAndRankPropertiesWithMarketData(betterValueProperties, preferences, 'better_value', marketData);
  }

  /**
   * Calculate market medians for property types, bedrooms, and areas
   */
  private async calculateMarketMedians(): Promise<Record<string, number>> {
    const marketData: Record<string, number> = {};
    
    // Get all properties for market analysis
    const allProperties = await db.select().from(properties);
    
    // Group by property type, bedrooms, and city
    const groups: Record<string, number[]> = {};
    
    allProperties.forEach(property => {
      const price = parseFloat(property.price as string);
      if (isNaN(price)) return;
      
      // City-specific median
      const cityKey = `${property.propertyType}_${property.bedrooms}BR_${property.city}`;
      if (!groups[cityKey]) groups[cityKey] = [];
      groups[cityKey].push(price);
      
      // General property type + bedroom median (fallback)
      const generalKey = `${property.propertyType}_${property.bedrooms}BR`;
      if (!groups[generalKey]) groups[generalKey] = [];
      groups[generalKey].push(price);
    });
    
    // Calculate medians
    Object.keys(groups).forEach(key => {
      const prices = groups[key].sort((a, b) => a - b);
      const median = prices.length % 2 === 0
        ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
        : prices[Math.floor(prices.length / 2)];
      marketData[key] = median;
    });
    
    return marketData;
  }

  /**
   * Suggest upgrade properties (better features, reasonable price increase)
   */
  async getUpgradeProperties(
    userId: number,
    excludePropertyIds: string[] = [],
    limit: number = 5
  ): Promise<PropertyRecommendation[]> {
    const preferences = await this.analyzeUserPreferences(userId);
    
    const upgradeProperties = await db
      .select()
      .from(properties)
      .where(
        and(
          excludePropertyIds.length > 0 ? 
            ne(properties.id, excludePropertyIds[0]) : 
            sql`true`,
          sql`${properties.propertyType} = ANY(${preferences.preferredPropertyTypes})`,
          sql`CAST(${properties.price} AS NUMERIC) >= ${preferences.priceRange.max * 0.9}`,
          sql`CAST(${properties.price} AS NUMERIC) <= ${preferences.priceRange.max * 1.5}`, // Up to 50% more
          // Prefer properties with more bedrooms
          preferences.preferredBedrooms.length > 0 ? 
            sql`${properties.bedrooms} >= ${Math.max(...preferences.preferredBedrooms)}` : 
            sql`true`
        )
      )
      .limit(limit * 2);

    return this.scoreAndRankProperties(upgradeProperties, preferences, 'upgrade');
  }

  /**
   * Suggest properties in alternative areas (similar profile, different location)
   */
  async getAlternativeAreaProperties(
    userId: number,
    excludePropertyIds: string[] = [],
    limit: number = 5
  ): Promise<PropertyRecommendation[]> {
    const preferences = await this.analyzeUserPreferences(userId);
    
    const alternativeProperties = await db
      .select()
      .from(properties)
      .where(
        and(
          excludePropertyIds.length > 0 ? 
            ne(properties.id, excludePropertyIds[0]) : 
            sql`true`,
          preferences.preferredAreas.length > 0 ? 
            sql`${properties.city} NOT IN (${sql.join(preferences.preferredAreas.map(area => sql`${area}`), sql`, `)})` : 
            sql`true`,
          sql`${properties.propertyType} = ANY(${preferences.preferredPropertyTypes})`,
          sql`CAST(${properties.price} AS NUMERIC) >= ${preferences.priceRange.min * 0.8}`,
          sql`CAST(${properties.price} AS NUMERIC) <= ${preferences.priceRange.max * 1.2}`
        )
      )
      .limit(limit * 2);

    return this.scoreAndRankProperties(alternativeProperties, preferences, 'alternative_area');
  }

  /**
   * Score and rank properties with market comparison data
   */
  private scoreAndRankPropertiesWithMarketData(
    propertyList: any[],
    preferences: UserPreferences,
    type: PropertyRecommendation['type'],
    marketData: Record<string, number>
  ): PropertyRecommendation[] {
    return propertyList
      .map(property => {
        let score = 0;
        let reasons = [];

        // Get market median for comparison
        const marketKey = `${property.propertyType}_${property.bedrooms}BR_${property.city}`;
        const localMarketKey = `${property.propertyType}_${property.bedrooms}BR`;
        const marketMedian = marketData[marketKey] || marketData[localMarketKey];
        
        const propertyPrice = parseFloat(property.price as string);
        const savingsPercent = marketMedian ? ((marketMedian - propertyPrice) / marketMedian) * 100 : 0;

        // Property type match
        if (preferences.preferredPropertyTypes.includes(property.propertyType)) {
          score += 20;
          reasons.push(`matches your preferred ${property.propertyType} type`);
        }

        // Bedroom preference
        if (preferences.preferredBedrooms.includes(property.bedrooms)) {
          score += 15;
          reasons.push(`has your preferred ${property.bedrooms} bedrooms`);
        }

        // Market value analysis for better_value type
        if (type === 'better_value' && marketMedian) {
          if (savingsPercent >= 20) {
            score += 35;
            reasons.push(`exceptional value: ${savingsPercent.toFixed(0)}% below market median`);
          } else if (savingsPercent >= 15) {
            score += 30;
            reasons.push(`great value: ${savingsPercent.toFixed(0)}% below market median`);
          } else if (savingsPercent >= 10) {
            score += 25;
            reasons.push(`good value: ${savingsPercent.toFixed(0)}% below market median`);
          }
        }

        // Price appropriateness for other types
        const priceRatio = propertyPrice / ((preferences.priceRange.min + preferences.priceRange.max) / 2);
        if (type !== 'better_value') {
          if (type === 'upgrade' && priceRatio > 1.1) {
            score += 20;
            reasons.push('premium features justify the price');
          } else if (priceRatio >= 0.8 && priceRatio <= 1.2) {
            score += 10;
            reasons.push('within your price range');
          }
        }

        // Skip amenity matching for now (amenities column not in schema)

        // Area preference
        if (preferences.preferredAreas.includes(property.city)) {
          score += 10;
          reasons.push(`located in your preferred area of ${property.city}`);
        }

        const reason = reasons.length > 0 ? reasons.join(', ') : 'matches your search patterns';

        // Add market comparison data to the recommendation
        const recommendation: PropertyRecommendation = {
          property,
          score,
          reason,
          type,
          marketComparison: marketMedian ? {
            marketMedian,
            actualPrice: propertyPrice,
            savingsAmount: marketMedian - propertyPrice,
            savingsPercent: savingsPercent
          } : undefined
        };

        return recommendation;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Return top 5
  }

  /**
   * Score and rank properties based on user preferences (fallback for non-market types)
   */
  private scoreAndRankProperties(
    propertyList: any[],
    preferences: UserPreferences,
    type: PropertyRecommendation['type']
  ): PropertyRecommendation[] {
    return propertyList
      .map(property => {
        let score = 0;
        let reasons = [];

        // Property type match
        if (preferences.preferredPropertyTypes.includes(property.propertyType)) {
          score += 20;
          reasons.push(`matches your preferred ${property.propertyType} type`);
        }

        // Bedroom preference
        if (preferences.preferredBedrooms.includes(property.bedrooms)) {
          score += 15;
          reasons.push(`has your preferred ${property.bedrooms} bedrooms`);
        }

        // Price appropriateness
        const priceRatio = parseFloat(property.price as string) / ((preferences.priceRange.min + preferences.priceRange.max) / 2);
        if (type === 'better_value' && priceRatio < 0.9) {
          score += 25;
          reasons.push('excellent value for money');
        } else if (type === 'upgrade' && priceRatio > 1.1) {
          score += 20;
          reasons.push('premium features justify the price');
        } else if (priceRatio >= 0.8 && priceRatio <= 1.2) {
          score += 10;
          reasons.push('within your price range');
        }

        // Skip amenity matching for now (amenities column not in schema)

        // Area preference
        if (preferences.preferredAreas.includes(property.city)) {
          score += 10;
          reasons.push(`located in your preferred area of ${property.city}`);
        }

        const reason = reasons.length > 0 ? reasons.join(', ') : 'matches your search patterns';

        return {
          property,
          score,
          reason,
          type
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Return top 5
  }

  /**
   * Get comprehensive personalized recommendations
   */
  async getPersonalizedRecommendations(
    userId: number,
    excludePropertyIds: string[] = []
  ): Promise<{
    similar: PropertyRecommendation[];
    betterValue: PropertyRecommendation[];
    upgrades: PropertyRecommendation[];
    alternativeAreas: PropertyRecommendation[];
    totalScore: number;
  }> {
    const [similar, betterValue, upgrades, alternativeAreas] = await Promise.all([
      this.getSimilarProperties(userId, excludePropertyIds, 5),
      this.getBetterValueProperties(userId, excludePropertyIds, 3),
      this.getUpgradeProperties(userId, excludePropertyIds, 3),
      this.getAlternativeAreaProperties(userId, excludePropertyIds, 3)
    ]);

    // Calculate overall recommendation confidence
    const totalScore = similar.length * 3 + betterValue.length * 2 + upgrades.length * 2 + alternativeAreas.length;

    return {
      similar,
      betterValue,
      upgrades,
      alternativeAreas,
      totalScore
    };
  }

  /**
   * AI-powered recommendation explanation
   */
  async generateRecommendationInsights(
    userId: number,
    recommendations: PropertyRecommendation[]
  ): Promise<string> {
    const preferences = await this.analyzeUserPreferences(userId);
    
    const context = {
      userPreferences: preferences,
      recommendationCount: recommendations.length,
      topReasons: recommendations.slice(0, 3).map(r => r.reason)
    };

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a Malaysian property expert. Generate a brief, friendly explanation of why these properties are recommended based on the user's preferences. Keep it conversational and under 100 words."
          },
          {
            role: "user", 
            content: `User preferences: ${JSON.stringify(context.userPreferences)}. Top recommendations because: ${context.topReasons.join('; ')}. Explain why these are good matches.`
          }
        ],
        max_tokens: 150
      });

      return response.choices[0].message.content || 
        "Based on your search history, these properties match your preferences for property type, location, and budget range.";

    } catch (error) {
      console.error('AI insight generation failed:', error);
      return "These properties are recommended based on your recent searches and saved properties.";
    }
  }

  /**
   * Default preferences for new users
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      preferredPropertyTypes: ['condominium', 'apartment'],
      priceRange: { min: 300000, max: 800000 },
      preferredBedrooms: [2, 3],
      preferredAreas: ['KLCC', 'Mont Kiara', 'Bangsar'],
      preferredAmenities: ['parking', 'gym', 'pool'],
      budgetFlexibility: 0.3
    };
  }

  /**
   * Track user interaction for learning (placeholder for future implementation)
   */
  async trackInteraction(userId: number, propertyId: string, interactionType: 'click' | 'view' | 'contact') {
    try {
      // TODO: Implement user interaction tracking when table is ready
      console.log(`Tracking ${interactionType} for user ${userId} on property ${propertyId}`);
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }
}

export const recommendationEngine = new PropertyRecommendationEngine();