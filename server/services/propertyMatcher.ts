import { Property } from "@shared/schema";

export interface UserPreferences {
  priceRange: { min: number; max: number };
  propertyTypes: string[];
  locations: string[];
  bedrooms?: number;
  bathrooms?: number;
  amenities: string[];
  maxCommuteDuration?: number;
  commuteDestinations?: string[];
}

export interface PropertyMatch {
  property: Property;
  score: number;
  matchReasons: string[];
  similarProperties: Property[];
}

export interface RecommendationEngine {
  findSimilarProperties(targetProperty: Property, allProperties: Property[]): Property[];
  scorePropertyMatch(property: Property, preferences: UserPreferences): number;
  generateRecommendations(properties: Property[], preferences: UserPreferences): PropertyMatch[];
  getPersonalizedRecommendations(userId: string, properties: Property[]): PropertyMatch[];
}

export class AdvancedPropertyMatcher implements RecommendationEngine {
  
  // Property type categories for better matching
  private readonly COMMERCIAL_TYPES = new Set([
    'commercial', 'shop', 'shop-office', 'retail-space', 'office', 
    'warehouse', 'factory', 'soho', 'sovo', 'sofo'
  ]);
  
  private readonly RESIDENTIAL_TYPES = new Set([
    'condo', 'condominium', 'apartment', 'terrace', 'semi-d', 'bungalow', 
    'townhouse', 'duplex', 'studio', 'penthouse', 'flat', 'landed', 
    'cluster-home', 'serviced-residence'
  ]);
  
  private readonly INDUSTRIAL_TYPES = new Set([
    'industrial', 'warehouse', 'factory', 'industrial-land'
  ]);
  
  /**
   * Get property category (commercial, residential, industrial, other)
   */
  private getPropertyCategory(propertyType: string): string {
    const type = propertyType.toLowerCase();
    if (this.COMMERCIAL_TYPES.has(type)) return 'commercial';
    if (this.RESIDENTIAL_TYPES.has(type)) return 'residential';
    if (this.INDUSTRIAL_TYPES.has(type)) return 'industrial';
    return 'other';
  }
  
  /**
   * Find properties similar to a target property using multiple similarity metrics
   * Prioritizes exact subtype matches with similar pricing
   */
  findSimilarProperties(targetProperty: Property, allProperties: Property[]): Property[] {
    const targetCategory = this.getPropertyCategory(targetProperty.propertyType);
    
    const similarities = allProperties
      .filter(p => {
        // Exclude the target property itself
        if (p.id === targetProperty.id) return false;
        
        // Only include properties from the same category
        const candidateCategory = this.getPropertyCategory(p.propertyType);
        return candidateCategory === targetCategory;
      })
      .map(property => ({
        property,
        score: this.calculateSimilarityScore(targetProperty, property)
      }))
      .sort((a, b) => b.score - a.score);

    return similarities.slice(0, 6).map(s => s.property);
  }

  /**
   * Calculate comprehensive similarity score between two properties
   * Prioritizes: 1) Exact subtype match, 2) Similar pricing, 3) Same location
   */
  private calculateSimilarityScore(target: Property, candidate: Property): number {
    let score = 0;
    let factors = 0;

    // Property type similarity - HIGHEST PRIORITY for exact subtype match
    const targetCategory = this.getPropertyCategory(target.propertyType);
    const candidateCategory = this.getPropertyCategory(candidate.propertyType);
    
    if (target.propertyType === candidate.propertyType) {
      // Exact subtype match (e.g., shop-office = shop-office) - HIGHEST score
      score += 50;
      factors++;
    } else if (targetCategory === candidateCategory && targetCategory !== 'other') {
      // Same category but different subtype (e.g., shop vs office) - lower score
      score += 15;
      factors++;
    }

    // Price similarity - SECOND HIGHEST PRIORITY (expanded to 30% range)
    const targetPrice = parseFloat(target.price);
    const candidatePrice = parseFloat(candidate.price);
    const priceDiff = Math.abs(targetPrice - candidatePrice) / targetPrice;
    if (priceDiff <= 0.3) {
      // Award full 35 points for exact price, scale down as difference increases
      score += 35 * (1 - priceDiff / 0.3);
      factors++;
    }

    // Location similarity (same city/area)
    if (target.city === candidate.city) {
      score += 30;
      factors++;
    }

    // Size similarity (within 30% range)
    if (target.squareFeet && candidate.squareFeet) {
      const sizeDiff = Math.abs(target.squareFeet - candidate.squareFeet) / target.squareFeet;
      if (sizeDiff <= 0.3) {
        score += 15 * (1 - sizeDiff);
        factors++;
      }
    }

    // Bedroom/bathroom similarity
    if (target.bedrooms === candidate.bedrooms) {
      score += 10;
      factors++;
    }
    if (target.bathrooms === candidate.bathrooms) {
      score += 5;
      factors++;
    }

    // Amenities overlap
    const targetAmenities = new Set(target.amenities || []);
    const candidateAmenities = new Set(candidate.amenities || []);
    const overlap = new Set([...targetAmenities].filter(x => candidateAmenities.has(x)));
    const amenityScore = (overlap.size / Math.max(targetAmenities.size, 1)) * 15;
    score += amenityScore;
    factors++;

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Score how well a property matches user preferences
   */
  scorePropertyMatch(property: Property, preferences: UserPreferences): number {
    let score = 0;
    let maxScore = 0;

    // Price range matching (25% weight)
    const propertyPrice = parseFloat(property.price);
    maxScore += 25;
    if (propertyPrice >= preferences.priceRange.min && propertyPrice <= preferences.priceRange.max) {
      score += 25;
    } else {
      // Partial score for close matches
      const minDiff = Math.max(0, preferences.priceRange.min - propertyPrice);
      const maxDiff = Math.max(0, propertyPrice - preferences.priceRange.max);
      const totalDiff = minDiff + maxDiff;
      const avgPrice = (preferences.priceRange.min + preferences.priceRange.max) / 2;
      const penaltyRatio = Math.min(totalDiff / avgPrice, 1);
      score += 25 * (1 - penaltyRatio);
    }

    // Property type matching (20% weight)
    maxScore += 20;
    if (preferences.propertyTypes.includes(property.propertyType)) {
      score += 20;
    }

    // Location matching (20% weight)
    maxScore += 20;
    if (preferences.locations.includes(property.city)) {
      score += 20;
    }

    // Bedroom matching (15% weight)
    maxScore += 15;
    if (preferences.bedrooms && property.bedrooms === preferences.bedrooms) {
      score += 15;
    } else if (preferences.bedrooms) {
      const diff = Math.abs(property.bedrooms - preferences.bedrooms);
      score += Math.max(0, 15 - (diff * 5));
    }

    // Bathroom matching (10% weight)
    maxScore += 10;
    if (preferences.bathrooms && property.bathrooms === preferences.bathrooms) {
      score += 10;
    } else if (preferences.bathrooms) {
      const diff = Math.abs(property.bathrooms - preferences.bathrooms);
      score += Math.max(0, 10 - (diff * 3));
    }

    // Amenities matching (10% weight)
    maxScore += 10;
    const propertyAmenities = new Set(property.amenities || []);
    const preferredAmenities = new Set(preferences.amenities);
    const matchingAmenities = new Set([...preferredAmenities].filter(x => propertyAmenities.has(x)));
    const amenityScore = (matchingAmenities.size / Math.max(preferredAmenities.size, 1)) * 10;
    score += amenityScore;

    return (score / maxScore) * 100;
  }

  /**
   * Generate match reasons for transparency
   */
  private generateMatchReasons(property: Property, preferences: UserPreferences, score: number): string[] {
    const reasons: string[] = [];

    const propertyPrice = parseFloat(property.price);
    if (propertyPrice >= preferences.priceRange.min && propertyPrice <= preferences.priceRange.max) {
      reasons.push(`Within your budget of RM${preferences.priceRange.min.toLocaleString()} - RM${preferences.priceRange.max.toLocaleString()}`);
    }

    if (preferences.propertyTypes.includes(property.propertyType)) {
      reasons.push(`Matches your preferred property type: ${property.propertyType}`);
    }

    if (preferences.locations.includes(property.city)) {
      reasons.push(`Located in your preferred area: ${property.city}`);
    }

    if (preferences.bedrooms && property.bedrooms === preferences.bedrooms) {
      reasons.push(`Has exactly ${property.bedrooms} bedrooms as requested`);
    }

    if (preferences.bathrooms && property.bathrooms === preferences.bathrooms) {
      reasons.push(`Has exactly ${property.bathrooms} bathrooms as requested`);
    }

    const propertyAmenities = new Set(property.amenities || []);
    const preferredAmenities = new Set(preferences.amenities);
    const matchingAmenities = [...preferredAmenities].filter(x => propertyAmenities.has(x));
    if (matchingAmenities.length > 0) {
      reasons.push(`Includes preferred amenities: ${matchingAmenities.join(', ')}`);
    }

    if (score >= 90) {
      reasons.push('Excellent match for your criteria');
    } else if (score >= 75) {
      reasons.push('Strong match for your preferences');
    } else if (score >= 60) {
      reasons.push('Good potential match');
    }

    return reasons;
  }

  /**
   * Generate comprehensive recommendations with scoring and reasoning
   */
  generateRecommendations(properties: Property[], preferences: UserPreferences): PropertyMatch[] {
    const matches = properties.map(property => {
      const score = this.scorePropertyMatch(property, preferences);
      const matchReasons = this.generateMatchReasons(property, preferences, score);
      const similarProperties = this.findSimilarProperties(property, properties);

      return {
        property,
        score,
        matchReasons,
        similarProperties
      };
    });

    // Sort by score and return top matches
    return matches
      .filter(match => match.score >= 30) // Minimum threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }

  /**
   * Get personalized recommendations based on user history and behavior
   */
  getPersonalizedRecommendations(userId: string, properties: Property[]): PropertyMatch[] {
    // In a real implementation, this would analyze user's search history,
    // viewed properties, saved favorites, and behavioral patterns
    
    // For now, we'll create intelligent default preferences
    const defaultPreferences: UserPreferences = {
      priceRange: { min: 1500, max: 8000 },
      propertyTypes: ['condominium', 'apartment', 'house'],
      locations: ['Mont Kiara', 'KLCC', 'Bangsar', 'Damansara Heights', 'Tropicana'],
      bedrooms: 3,
      bathrooms: 2,
      amenities: ['Swimming Pool', 'Gym', 'Security', 'Parking'],
      maxCommuteDuration: 45,
      commuteDestinations: ['KLCC', 'Bangsar']
    };

    return this.generateRecommendations(properties, defaultPreferences);
  }

  /**
   * Advanced filtering with intelligent fallbacks
   */
  intelligentFilter(properties: Property[], preferences: UserPreferences): Property[] {
    let filtered = properties;

    // Apply strict filters first
    filtered = filtered.filter(p => {
      const price = parseFloat(p.price);
      return price >= preferences.priceRange.min && price <= preferences.priceRange.max;
    });

    if (preferences.propertyTypes.length > 0) {
      filtered = filtered.filter(p => preferences.propertyTypes.includes(p.propertyType));
    }

    if (preferences.locations.length > 0) {
      filtered = filtered.filter(p => preferences.locations.includes(p.city));
    }

    // If no results, gradually relax constraints
    if (filtered.length === 0) {
      // Relax price range by 20%
      const priceBuffer = (preferences.priceRange.max - preferences.priceRange.min) * 0.2;
      filtered = properties.filter(p => {
        const price = parseFloat(p.price);
        return price >= (preferences.priceRange.min - priceBuffer) && 
               price <= (preferences.priceRange.max + priceBuffer);
      });
    }

    if (filtered.length === 0) {
      // Further relax by location similarity
      const relaxedLocations = this.getRelatedLocations(preferences.locations);
      filtered = properties.filter(p => relaxedLocations.includes(p.city));
    }

    return filtered;
  }

  /**
   * Get related locations for intelligent fallback
   */
  private getRelatedLocations(originalLocations: string[]): string[] {
    const locationGroups = {
      'premium': ['Mont Kiara', 'KLCC', 'Damansara Heights', 'Bangsar', 'Kenny Hills'],
      'klang_valley': ['Petaling Jaya', 'Subang Jaya', 'Kota Damansara', 'Sri Hartamas', 'TTDI'],
      'south_kl': ['Cheras', 'Ampang', 'Pandan', 'Taman Desa'],
      'new_townships': ['Cyberjaya', 'Putrajaya', 'Tropicana', 'Setia Alam']
    };

    const related = new Set(originalLocations);
    
    for (const location of originalLocations) {
      for (const [group, locations] of Object.entries(locationGroups)) {
        if (locations.includes(location)) {
          locations.forEach(loc => related.add(loc));
        }
      }
    }

    return Array.from(related);
  }
}

// Export singleton instance
export const propertyMatcher = new AdvancedPropertyMatcher();