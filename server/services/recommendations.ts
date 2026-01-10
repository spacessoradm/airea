import { storage } from "../storage";
import type { Property, UserPreferences } from "@shared/schema";
import { AdvancedPropertyMatcher } from "./propertyMatcher";

interface PropertyScore {
  property: Property;
  score: number;
}

/**
 * Generate property recommendations based on user's search history and preferences
 */
export async function generateRecommendations(userId: string, limit: number = 10): Promise<Property[]> {
  try {
    // Get user's search history and preferences
    const searchHistory = await storage.getUserSearchHistory(userId);
    const userPreferences = await storage.getUserPreferences(userId);
    
    // If no search history, return featured properties
    if (searchHistory.length === 0) {
      return await storage.getFeaturedProperties(limit);
    }

    // Analyze search patterns to extract preferences
    const derivedPreferences = derivePreferencesFromSearchHistory(searchHistory);
    
    // Merge with existing user preferences
    const combinedPreferences = mergePreferences(userPreferences, derivedPreferences);
    
    // Update user preferences in database
    if (combinedPreferences) {
      await storage.updateUserPreferences(userId, combinedPreferences);
    }

    // Get all available properties
    const allProperties = await storage.getProperties({});
    
    // Score and rank properties based on preferences
    const scoredProperties = scorePropertiesForUser(allProperties, combinedPreferences);
    
    // Return top recommendations
    return scoredProperties
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(sp => sp.property);
      
  } catch (error) {
    console.error("Error generating recommendations:", error);
    // Fallback to featured properties
    return await storage.getFeaturedProperties(limit);
  }
}

/**
 * Derive user preferences from search history patterns
 */
function derivePreferencesFromSearchHistory(searchHistory: any[]): Partial<UserPreferences> {
  const preferences: any = {
    preferredPropertyTypes: [],
    preferredCities: [],
    preferredAmenities: [],
    priceRangeMin: null,
    priceRangeMax: null,
    preferredBedrooms: null,
    preferredBathrooms: null,
  };

  // Count frequency of search criteria
  const typeCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};
  const amenityCounts: Record<string, number> = {};
  const prices: number[] = [];
  const bedrooms: number[] = [];
  const bathrooms: number[] = [];

  searchHistory.forEach(search => {
    const filters = search.parsedFilters || {};
    
    // Property types
    if (filters.propertyType) {
      if (Array.isArray(filters.propertyType)) {
        filters.propertyType.forEach((type: string) => {
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
      } else {
        typeCounts[filters.propertyType] = (typeCounts[filters.propertyType] || 0) + 1;
      }
    }

    // Cities
    if (filters.city) {
      cityCounts[filters.city] = (cityCounts[filters.city] || 0) + 1;
    }

    // Amenities
    if (filters.amenities && Array.isArray(filters.amenities)) {
      filters.amenities.forEach((amenity: string) => {
        amenityCounts[amenity] = (amenityCounts[amenity] || 0) + 1;
      });
    }

    // Price ranges
    if (filters.minPrice) prices.push(filters.minPrice);
    if (filters.maxPrice) prices.push(filters.maxPrice);

    // Bedrooms and bathrooms
    if (filters.bedrooms) bedrooms.push(filters.bedrooms);
    if (filters.bathrooms) bathrooms.push(filters.bathrooms);
  });

  // Extract top preferences
  preferences.preferredPropertyTypes = Object.entries(typeCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([type]) => type);

  preferences.preferredCities = Object.entries(cityCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([city]) => city);

  preferences.preferredAmenities = Object.entries(amenityCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([amenity]) => amenity);

  // Calculate price range preferences
  if (prices.length > 0) {
    preferences.priceRangeMin = Math.min(...prices);
    preferences.priceRangeMax = Math.max(...prices);
  }

  // Most common bedroom/bathroom counts
  if (bedrooms.length > 0) {
    preferences.preferredBedrooms = Math.round(bedrooms.reduce((a, b) => a + b, 0) / bedrooms.length);
  }
  
  if (bathrooms.length > 0) {
    preferences.preferredBathrooms = Math.round(bathrooms.reduce((a, b) => a + b, 0) / bathrooms.length);
  }

  return preferences;
}

/**
 * Merge user preferences with derived preferences from search history
 */
function mergePreferences(existing: UserPreferences | null, derived: Partial<UserPreferences>): Partial<UserPreferences> {
  if (!existing) {
    return derived;
  }

  return {
    preferredPropertyTypes: derived.preferredPropertyTypes || existing.preferredPropertyTypes,
    preferredCities: derived.preferredCities || existing.preferredCities,
    preferredAmenities: derived.preferredAmenities || existing.preferredAmenities,
    priceRangeMin: derived.priceRangeMin || existing.priceRangeMin,
    priceRangeMax: derived.priceRangeMax || existing.priceRangeMax,
    preferredBedrooms: derived.preferredBedrooms || existing.preferredBedrooms,
    preferredBathrooms: derived.preferredBathrooms || existing.preferredBathrooms,
  };
}

/**
 * Score properties based on how well they match user preferences
 */
function scorePropertiesForUser(properties: Property[], preferences: Partial<UserPreferences> | null): PropertyScore[] {
  if (!preferences) {
    return properties.map(property => ({ property, score: 0 }));
  }

  return properties.map(property => {
    let score = 0;

    // Property type match (30 points)
    if (preferences.preferredPropertyTypes?.includes(property.propertyType)) {
      score += 30;
    }

    // City match (25 points)
    if (preferences.preferredCities?.includes(property.city)) {
      score += 25;
    }

    // Price range match (20 points)
    const price = parseFloat(property.price);
    if (preferences.priceRangeMin && preferences.priceRangeMax) {
      const minPrice = parseFloat(preferences.priceRangeMin.toString());
      const maxPrice = parseFloat(preferences.priceRangeMax.toString());
      if (price >= minPrice && price <= maxPrice) {
        score += 20;
      } else {
        // Partial points for being close to range
        const minDiff = Math.abs(price - minPrice);
        const maxDiff = Math.abs(price - maxPrice);
        const minDistance = Math.min(minDiff, maxDiff);
        score += Math.max(0, 20 - (minDistance / 1000) * 5); // Reduce score based on distance
      }
    }

    // Bedroom match (10 points)
    if (preferences.preferredBedrooms && property.bedrooms === preferences.preferredBedrooms) {
      score += 10;
    }

    // Bathroom match (5 points)
    if (preferences.preferredBathrooms && property.bathrooms === preferences.preferredBathrooms) {
      score += 5;
    }

    // Amenities match (10 points max, distributed)
    if (preferences.preferredAmenities && property.amenities) {
      const matchingAmenities = preferences.preferredAmenities.filter(amenity => 
        property.amenities?.includes(amenity)
      );
      score += Math.min(10, matchingAmenities.length * 2);
    }

    // Featured properties get bonus points (5 points)
    if (property.featured) {
      score += 5;
    }

    // Recency bonus - newer properties get slight preference (max 5 points)
    if (property.createdAt) {
      const daysSinceCreated = (Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 5 - daysSinceCreated / 10);
    }

    return { property, score };
  });
}

/**
 * Get recommendations for properties similar to a specific property
 * Uses AdvancedPropertyMatcher for intelligent category-based matching
 */
export async function getSimilarProperties(propertyId: string, limit: number = 5): Promise<Property[]> {
  try {
    const targetProperty = await storage.getProperty(propertyId);
    if (!targetProperty) {
      return [];
    }

    // Get all properties with same listing type (rent with rent, sale with sale)
    const allProperties = await storage.getProperties({});
    const sameListingTypeProperties = allProperties.filter(p => 
      p.listingType === targetProperty.listingType
    );

    // Use AdvancedPropertyMatcher for intelligent similarity matching
    // Prioritizes: 1) Exact subtype, 2) Similar pricing, 3) Same location
    const matcher = new AdvancedPropertyMatcher();
    const similarProperties = matcher.findSimilarProperties(
      targetProperty, 
      sameListingTypeProperties
    );

    return similarProperties.slice(0, limit);

  } catch (error) {
    console.error("Error getting similar properties:", error);
    return [];
  }
}