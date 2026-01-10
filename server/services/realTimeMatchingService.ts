import type { Property, Agent } from "@shared/schema";
import { storage } from "../storage";
import type { DatabaseStorage } from "../storage";

interface PopularSearch {
  query: string;
  searchType: 'rent' | 'buy';
  expectedResults: number;
}

export class RealTimeMatchingService {
  private storage: DatabaseStorage;
  
  // Popular searches that we want to provide real-time updates for
  private popularSearches: PopularSearch[] = [
    // Rental searches
    { query: "Budget-friendly apartment under RM2000", searchType: 'rent', expectedResults: 15 },
    { query: "Apartment under RM2500 for elderly parents", searchType: 'rent', expectedResults: 30 },
    { query: "Premium condominium with facilities", searchType: 'rent', expectedResults: 92 },
    { query: "Spacious apartment for growing family", searchType: 'rent', expectedResults: 45 },
    { query: "Studio apartment for young professionals", searchType: 'rent', expectedResults: 12 },
    { query: "Condo near MRT under RM3000", searchType: 'rent', expectedResults: 18 },
    { query: "Condo near KLCC for professionals", searchType: 'rent', expectedResults: 8 },
    { query: "Apartment near MRT for daily commute", searchType: 'rent', expectedResults: 25 },
    { query: "Modern condominium under RM3500", searchType: 'rent', expectedResults: 67 },
    
    // Purchase searches  
    { query: "Modern apartment for first-time buyers", searchType: 'buy', expectedResults: 67 },
    { query: "Condominium under RM500k for investment", searchType: 'buy', expectedResults: 109 },
    { query: "Affordable apartment for young buyers", searchType: 'buy', expectedResults: 45 },
    { query: "Budget apartment under RM400k", searchType: 'buy', expectedResults: 27 },
    { query: "Serviced residence for rental income", searchType: 'buy', expectedResults: 15 },
    { query: "Premium condominium for purchase", searchType: 'buy', expectedResults: 38 }
  ];

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  /**
   * Check if a newly posted property matches any popular search criteria
   */
  async checkPropertyMatchesPopularSearches(property: Property & { agent: Agent }): Promise<string[]> {
    const matchingQueries: string[] = [];

    for (const popularSearch of this.popularSearches) {
      if (await this.doesPropertyMatchSearch(property, popularSearch)) {
        matchingQueries.push(popularSearch.query);
      }
    }

    return matchingQueries;
  }

  /**
   * Determine if a property matches a specific popular search criteria
   */
  private async doesPropertyMatchSearch(
    property: Property & { agent: Agent }, 
    search: PopularSearch
  ): Promise<boolean> {
    const query = search.query.toLowerCase();
    const propertyType = property.propertyType?.toLowerCase() || '';
    const title = property.title?.toLowerCase() || '';
    const description = property.description?.toLowerCase() || '';
    const price = parseFloat(property.price);
    const listingType = property.listingType;

    // Check if listing type matches search type
    if ((search.searchType === 'rent' && listingType !== 'rent') || 
        (search.searchType === 'buy' && listingType !== 'sale')) {
      return false;
    }

    // Property type matching
    if (query.includes('apartment') && !propertyType.includes('apartment')) {
      return false;
    }
    if (query.includes('condominium') && !propertyType.includes('condominium')) {
      return false;
    }
    if (query.includes('studio') && !propertyType.includes('studio') && !title.includes('studio')) {
      return false;
    }

    // Price range matching
    if (search.searchType === 'rent') {
      if (query.includes('under rm2000') && price >= 2000) {
        return false;
      }
      if (query.includes('under rm2500') && price >= 2500) {
        return false;
      }
      if (query.includes('under rm3000') && price >= 3000) {
        return false;
      }
      if (query.includes('under rm3500') && price >= 3500) {
        return false;
      }
    } else {
      // Purchase price checks (convert to thousands)
      const priceInK = price / 1000;
      if (query.includes('under rm400k') && priceInK >= 400) {
        return false;
      }
      if (query.includes('under rm500k') && priceInK >= 500) {
        return false;
      }
    }

    // Location/transport matching
    if (query.includes('near mrt')) {
      const hasNearbyMRT = property.distanceToMRT || 
                          (property.nearbyLandmarks && property.nearbyLandmarks.some(l => l.includes('MRT'))) ||
                          title.includes('mrt') || description.includes('mrt');
      if (!hasNearbyMRT) {
        return false;
      }
    }

    if (query.includes('near klcc')) {
      const nearKLCC = property.city?.toLowerCase().includes('kuala lumpur') ||
                      title.includes('klcc') || description.includes('klcc') ||
                      property.address?.toLowerCase().includes('klcc');
      if (!nearKLCC) {
        return false;
      }
    }

    // Feature matching
    if (query.includes('premium') || query.includes('luxury')) {
      const isPremium = title.includes('premium') || title.includes('luxury') ||
                       description.includes('premium') || description.includes('luxury') ||
                       price > (search.searchType === 'rent' ? 3000 : 600000);
      if (!isPremium) {
        return false;
      }
    }

    if (query.includes('facilities')) {
      const hasFacilities = description.includes('facilities') || description.includes('amenities') ||
                           description.includes('pool') || description.includes('gym') ||
                           description.includes('security') || description.includes('playground');
      if (!hasFacilities) {
        return false;
      }
    }

    if (query.includes('budget') || query.includes('affordable')) {
      const isBudget = search.searchType === 'rent' ? price < 2500 : price < 450000;
      if (!isBudget) {
        return false;
      }
    }

    // Target audience matching
    if (query.includes('elderly parents')) {
      // Properties good for elderly: ground floor, near facilities, lower price
      const elderlyFriendly = description.includes('ground') || description.includes('elderly') ||
                             description.includes('accessible') || price < 2500;
      if (!elderlyFriendly) {
        return false;
      }
    }

    if (query.includes('growing family') || query.includes('family')) {
      // Family properties: 3+ bedrooms or explicitly family-oriented
      const familyFriendly = (property.bedrooms && property.bedrooms >= 3) ||
                            description.includes('family') || title.includes('family');
      if (!familyFriendly) {
        return false;
      }
    }

    if (query.includes('young professionals') || query.includes('professionals')) {
      // Professional properties: studio/1BR, near transport, modern
      const professionalFriendly = (property.bedrooms && property.bedrooms <= 2) ||
                                  propertyType.includes('studio') ||
                                  description.includes('professional') ||
                                  title.includes('modern');
      if (!professionalFriendly) {
        return false;
      }
    }

    if (query.includes('first-time buyers')) {
      const firstTimeBuyerFriendly = price < 500000 || description.includes('first') ||
                                    title.includes('affordable') || title.includes('starter');
      if (!firstTimeBuyerFriendly) {
        return false;
      }
    }

    if (query.includes('investment') || query.includes('rental income')) {
      const investmentFriendly = description.includes('investment') || description.includes('rental') ||
                               description.includes('yield') || propertyType.includes('serviced');
      if (!investmentFriendly) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all popular searches for real-time monitoring
   */
  getPopularSearches(): PopularSearch[] {
    return this.popularSearches;
  }

  /**
   * Get popular searches by type
   */
  getPopularSearchesByType(searchType: 'rent' | 'buy'): PopularSearch[] {
    return this.popularSearches.filter(search => search.searchType === searchType);
  }
}