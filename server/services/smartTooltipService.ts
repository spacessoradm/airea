import { storage } from "../storage";
import type { Property } from "@shared/schema";

interface SmartTooltipData {
  priceInsight: {
    compared_to_market: 'below' | 'above' | 'fair';
    percentage_diff: number;
    market_median: number;
  };
  locationInsights: {
    transport_access: string[];
    nearby_amenities: string[];
    growth_potential: 'high' | 'medium' | 'low';
  };
  similarProperties: any[];
  marketTrends: {
    demand_level: 'high' | 'medium' | 'low';
    price_trend: 'rising' | 'stable' | 'falling';
    investment_score: number;
  };
  personalizedInsights: {
    match_score: number;
    reasons: string[];
    recommendations: string[];
  };
}

export class SmartTooltipService {
  /**
   * Generate comprehensive smart tooltip data for a property
   */
  async generateTooltipData(propertyId: string, userId?: string): Promise<SmartTooltipData> {
    try {
      const property = await storage.getProperty(propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      // Run all analyses in parallel for better performance
      const [
        priceInsight,
        locationInsights,
        similarProperties,
        marketTrends,
        personalizedInsights
      ] = await Promise.all([
        this.analyzePricePosition(property),
        this.analyzeLocationInsights(property),
        this.findSimilarProperties(property),
        this.getMarketTrends(property),
        this.getPersonalizedInsights(property, userId)
      ]);

      return {
        priceInsight,
        locationInsights,
        similarProperties,
        marketTrends,
        personalizedInsights
      };
    } catch (error) {
      console.error('Error generating tooltip data:', error);
      // Return fallback data
      return this.getFallbackData();
    }
  }

  /**
   * Analyze property price position relative to market
   */
  private async analyzePricePosition(property: Property) {
    try {
      const allProperties = await storage.getProperties({});
      
      // Filter similar properties (same type and city)
      const similarProperties = allProperties.filter(p => 
        p.propertyType === property.propertyType && 
        p.city === property.city &&
        p.id !== property.id
      );

      if (similarProperties.length === 0) {
        return {
          compared_to_market: 'fair' as const,
          percentage_diff: 0,
          market_median: parseFloat(property.price)
        };
      }

      const prices = similarProperties.map(p => parseFloat(p.price)).sort((a, b) => a - b);
      const marketMedian = prices[Math.floor(prices.length / 2)];
      const propertyPrice = parseFloat(property.price);
      
      const percentageDiff = Math.round(((propertyPrice - marketMedian) / marketMedian) * 100);
      
      let comparison: 'below' | 'above' | 'fair';
      if (percentageDiff < -5) comparison = 'below';
      else if (percentageDiff > 5) comparison = 'above';
      else comparison = 'fair';

      return {
        compared_to_market: comparison,
        percentage_diff: percentageDiff,
        market_median: marketMedian
      };
    } catch (error) {
      console.error('Error analyzing price position:', error);
      return {
        compared_to_market: 'fair' as const,
        percentage_diff: 0,
        market_median: parseFloat(property.price)
      };
    }
  }

  /**
   * Analyze location-based insights
   */
  private async analyzeLocationInsights(property: Property) {
    try {
      // Simulate transport access analysis
      const transportOptions = this.getTransportOptions(property);
      const nearbyAmenities = this.getNearbyAmenities(property);
      const growthPotential = this.assessGrowthPotential(property);

      return {
        transport_access: transportOptions,
        nearby_amenities: nearbyAmenities,
        growth_potential: growthPotential
      };
    } catch (error) {
      console.error('Error analyzing location insights:', error);
      return {
        transport_access: [],
        nearby_amenities: [],
        growth_potential: 'medium' as const
      };
    }
  }

  /**
   * Find similar properties
   */
  private async findSimilarProperties(property: Property) {
    try {
      const allProperties = await storage.getProperties({});
      
      // Simple similarity scoring
      const scored = allProperties
        .filter(p => p.id !== property.id)
        .map(p => ({
          property: p,
          score: this.calculateSimilarityScore(property, p)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return scored.map(s => ({
        property: {
          id: s.property.id,
          title: s.property.title,
          propertyType: s.property.propertyType,
          bedrooms: s.property.bedrooms,
          bathrooms: s.property.bathrooms,
          price: s.property.price,
          city: s.property.city,
          address: s.property.address,
          images: s.property.images || [],
          amenities: s.property.amenities || [],
          builtUpSize: s.property.squareFeet?.toString()
        },
        score: s.score,
        reason: this.generateSimilarityReason(property, s.property),
        type: 'similar' as const
      }));
    } catch (error) {
      console.error('Error finding similar properties:', error);
      return [];
    }
  }

  /**
   * Get market trends analysis
   */
  private async getMarketTrends(property: Property) {
    try {
      const allProperties = await storage.getProperties({});
      const cityProperties = allProperties.filter(p => p.city === property.city);
      
      // Simulate demand level based on property count and type
      const demandLevel = this.calculateDemandLevel(cityProperties, property);
      const priceTrend = this.calculatePriceTrend(property);
      const investmentScore = this.calculateInvestmentScore(property, cityProperties);

      return {
        demand_level: demandLevel,
        price_trend: priceTrend,
        investment_score: investmentScore
      };
    } catch (error) {
      console.error('Error getting market trends:', error);
      return {
        demand_level: 'medium' as const,
        price_trend: 'stable' as const,
        investment_score: 6
      };
    }
  }

  /**
   * Generate personalized insights
   */
  private async getPersonalizedInsights(property: Property, userId?: string) {
    try {
      if (!userId) {
        return {
          match_score: 75,
          reasons: ["This property matches current market preferences"],
          recommendations: ["Consider viewing similar properties in the area"]
        };
      }

      // Get user preferences and search history
      const userPreferences = await storage.getUserPreferences(userId);
      const searchHistory = await storage.getUserSearchHistory(userId);

      const matchScore = this.calculatePersonalMatchScore(property, userPreferences, searchHistory);
      const reasons = this.generatePersonalizedReasons(property, userPreferences, searchHistory);
      const recommendations = this.generatePersonalizedRecommendations(property, userPreferences);

      return {
        match_score: matchScore,
        reasons,
        recommendations
      };
    } catch (error) {
      console.error('Error getting personalized insights:', error);
      return {
        match_score: 75,
        reasons: ["This property has good market potential"],
        recommendations: ["Consider comparing with similar properties"]
      };
    }
  }

  /**
   * Helper methods
   */
  private calculateSimilarityScore(property1: Property, property2: Property): number {
    let score = 0;
    
    // Location match (highest weight)
    if (property1.city === property2.city) score += 40;
    
    // Property type match
    if (property1.propertyType === property2.propertyType) score += 30;
    
    // Price similarity (within 30% range)
    const price1 = parseFloat(property1.price);
    const price2 = parseFloat(property2.price);
    const priceDiff = Math.abs(price1 - price2) / price1;
    if (priceDiff <= 0.3) score += 20 * (1 - priceDiff);
    
    // Bedroom/bathroom match
    if (property1.bedrooms === property2.bedrooms) score += 5;
    if (property1.bathrooms === property2.bathrooms) score += 5;
    
    return Math.round(score);
  }

  private generateSimilarityReason(property1: Property, property2: Property): string {
    const reasons = [];
    
    if (property1.city === property2.city) reasons.push("same area");
    if (property1.propertyType === property2.propertyType) reasons.push("same property type");
    if (property1.bedrooms === property2.bedrooms) reasons.push("same bedroom count");
    
    return `Similar because of ${reasons.join(", ")}`;
  }

  private getTransportOptions(property: Property): string[] {
    // Simulate based on property location and city
    const transportOptions = [];
    
    if (property.city.toLowerCase().includes('kuala lumpur') || property.city.toLowerCase().includes('kl')) {
      transportOptions.push('LRT', 'MRT', 'Bus');
    } else if (property.city.toLowerCase().includes('petaling jaya') || property.city.toLowerCase().includes('pj')) {
      transportOptions.push('LRT', 'Bus', 'RapidKL');
    } else {
      transportOptions.push('Bus', 'Highway Access');
    }
    
    return transportOptions;
  }

  private getNearbyAmenities(property: Property): string[] {
    // Simulate based on property location
    return ['Shopping Mall', 'Schools', 'Hospital', 'Restaurants'];
  }

  private assessGrowthPotential(property: Property): 'high' | 'medium' | 'low' {
    // Simulate based on location and property type
    if (property.city.toLowerCase().includes('kuala lumpur')) return 'high';
    if (property.city.toLowerCase().includes('petaling jaya')) return 'high';
    if (property.city.toLowerCase().includes('shah alam')) return 'medium';
    return 'medium';
  }

  private calculateDemandLevel(cityProperties: Property[], property: Property): 'high' | 'medium' | 'low' {
    const typeCount = cityProperties.filter(p => p.propertyType === property.propertyType).length;
    if (typeCount > 50) return 'high';
    if (typeCount > 20) return 'medium';
    return 'low';
  }

  private calculatePriceTrend(property: Property): 'rising' | 'stable' | 'falling' {
    // Simulate trend based on property characteristics
    const price = parseFloat(property.price);
    if (price > 800000) return 'stable';
    if (price < 300000) return 'rising';
    return 'stable';
  }

  private calculateInvestmentScore(property: Property, cityProperties: Property[]): number {
    let score = 5; // Base score
    
    // Location bonus
    if (property.city.toLowerCase().includes('kuala lumpur')) score += 2;
    if (property.city.toLowerCase().includes('petaling jaya')) score += 1;
    
    // Property type bonus
    if (property.propertyType === 'condominium') score += 1;
    if (property.propertyType === 'apartment') score += 1;
    
    // Price positioning
    const price = parseFloat(property.price);
    if (price < 500000) score += 1; // Affordable segment
    
    return Math.min(Math.max(score, 1), 10);
  }

  private calculatePersonalMatchScore(property: Property, userPreferences: any, searchHistory: any[]): number {
    let score = 50; // Base score
    
    // Add scoring logic based on user preferences
    if (userPreferences?.preferredPropertyTypes?.includes(property.propertyType)) {
      score += 20;
    }
    
    if (userPreferences?.preferredCities?.includes(property.city)) {
      score += 15;
    }
    
    // Search history matching
    if (searchHistory.length > 0) {
      const hasMatchingSearches = searchHistory.some(search => 
        search.propertyType === property.propertyType || 
        search.city === property.city
      );
      if (hasMatchingSearches) score += 15;
    }
    
    return Math.min(Math.max(score, 30), 95);
  }

  private generatePersonalizedReasons(property: Property, userPreferences: any, searchHistory: any[]): string[] {
    const reasons = [];
    
    if (userPreferences?.preferredPropertyTypes?.includes(property.propertyType)) {
      reasons.push(`Matches your preferred property type: ${property.propertyType}`);
    }
    
    if (userPreferences?.preferredCities?.includes(property.city)) {
      reasons.push(`Located in your preferred area: ${property.city}`);
    }
    
    if (searchHistory.length > 0) {
      const recentSearches = searchHistory.slice(0, 5);
      const hasMatchingBedrooms = recentSearches.some(s => s.bedrooms === property.bedrooms);
      if (hasMatchingBedrooms) {
        reasons.push(`${property.bedrooms} bedrooms matches your recent searches`);
      }
    }
    
    if (reasons.length === 0) {
      reasons.push("This property has strong market fundamentals");
    }
    
    return reasons;
  }

  private generatePersonalizedRecommendations(property: Property, userPreferences: any): string[] {
    const recommendations = [];
    
    recommendations.push("Schedule a viewing to see this property in person");
    recommendations.push("Compare with similar properties in the same area");
    
    if (property.propertyType === 'condominium') {
      recommendations.push("Check the maintenance fees and facilities");
    }
    
    return recommendations;
  }

  private getFallbackData(): SmartTooltipData {
    return {
      priceInsight: {
        compared_to_market: 'fair',
        percentage_diff: 0,
        market_median: 500000
      },
      locationInsights: {
        transport_access: ['Bus', 'Highway Access'],
        nearby_amenities: ['Shopping', 'Schools'],
        growth_potential: 'medium'
      },
      similarProperties: [],
      marketTrends: {
        demand_level: 'medium',
        price_trend: 'stable',
        investment_score: 6
      },
      personalizedInsights: {
        match_score: 75,
        reasons: ["This property has good market potential"],
        recommendations: ["Consider viewing this property"]
      }
    };
  }
}

export const smartTooltipService = new SmartTooltipService();