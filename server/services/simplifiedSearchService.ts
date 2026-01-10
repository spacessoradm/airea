import { db } from '../db';
import { properties, transportStations } from '@shared/schema';
import { sql, and, or, ilike, eq, isNotNull } from 'drizzle-orm';

export interface SimplifiedSearchResult {
  results: any[];
  count: number;
  searchSummary: {
    searchType: 'general_mrt' | 'specific_station' | 'keyword' | 'general_transport';
    message: string;
    proximityRadius?: string;
    transportTypes?: string[];
  };
}

export class SimplifiedSearchService {
  /**
   * Property type priority for sorting (lower number = higher priority)
   */
  private getPropertyTypePriority(propertyType: string): number {
    const type = propertyType?.toLowerCase() || '';
    
    // Residential properties (priority 1)
    if (['condominium', 'apartment', 'house', 'townhouse', 'studio', 'service-residence', 'villa'].includes(type)) {
      return 1;
    }
    
    // Commercial properties (priority 2) 
    if (['office', 'shop', 'retail', 'commercial', 'restaurant', 'hotel', 'mall'].includes(type)) {
      return 2;
    }
    
    // Industrial properties (priority 3)
    if (['warehouse', 'industrial', 'factory', 'logistics'].includes(type)) {
      return 3;
    }
    
    // Land properties (priority 4)
    if (['land', 'plot', 'development-land', 'residential-land', 'commercial-land', 'industrial-land'].includes(type)) {
      return 4;
    }
    
    // Others/unknown (priority 5)
    return 5;
  }

  /**
   * Check if a property is currently featured (has active featured status)
   * Handles both camelCase (featuredUntil) and snake_case (featured_until) property names
   */
  private isFeatured(property: any): boolean {
    if (!property.featured) return false;
    
    // Handle both camelCase and snake_case property names
    const featuredUntilDate = property.featuredUntil || property.featured_until;
    if (!featuredUntilDate) return false;
    
    const now = new Date();
    const featuredUntil = new Date(featuredUntilDate);
    return featuredUntil > now;
  }

  /**
   * Smart sorting based on search type:
   * - ALWAYS: Featured properties first (if featuredUntil > now)
   * - Location-based: Distance first, then property type priority
   * - Building-specific: Latest to oldest
   */
  private applySortingLogic(results: any[], searchType: 'location' | 'building' | 'general', sortBy: 'distance' | 'recency' = 'distance'): any[] {
    if (searchType === 'location' && sortBy === 'distance') {
      // For location searches: Featured first, then distance, then property type priority
      return results.sort((a: any, b: any) => {
        // PRIORITY 0: Featured properties always first
        const aIsFeatured = this.isFeatured(a);
        const bIsFeatured = this.isFeatured(b);
        
        if (aIsFeatured && !bIsFeatured) return -1;
        if (!aIsFeatured && bIsFeatured) return 1;
        
        // Primary sort: Distance (ascending - nearest first)
        const distanceA = parseFloat(a.distance_meters || '999999');
        const distanceB = parseFloat(b.distance_meters || '999999');
        
        if (Math.abs(distanceA - distanceB) > 50) { // 50m difference threshold
          return distanceA - distanceB;
        }
        
        // Secondary sort: Property type priority (residential > commercial > industrial)
        const priorityA = this.getPropertyTypePriority(a.property_type);
        const priorityB = this.getPropertyTypePriority(b.property_type);
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // Tertiary sort: Latest first
        const dateA = new Date(a.created_at || '1970-01-01').getTime();
        const dateB = new Date(b.created_at || '1970-01-01').getTime();
        return dateB - dateA;
      });
    } else if (searchType === 'building' || sortBy === 'recency') {
      // For building/location name searches: Featured first, then latest to oldest
      return results.sort((a: any, b: any) => {
        // PRIORITY 0: Featured properties always first
        const aIsFeatured = this.isFeatured(a);
        const bIsFeatured = this.isFeatured(b);
        
        if (aIsFeatured && !bIsFeatured) return -1;
        if (!aIsFeatured && bIsFeatured) return 1;
        
        const dateA = new Date(a.created_at || '1970-01-01').getTime();
        const dateB = new Date(b.created_at || '1970-01-01').getTime();
        return dateB - dateA; // Descending order (newest first)
      });
    } else {
      // General transport: Featured first, then property type priority, then recency
      return results.sort((a: any, b: any) => {
        // PRIORITY 0: Featured properties always first
        const aIsFeatured = this.isFeatured(a);
        const bIsFeatured = this.isFeatured(b);
        
        if (aIsFeatured && !bIsFeatured) return -1;
        if (!aIsFeatured && bIsFeatured) return 1;
        
        // Primary sort: Property type priority
        const priorityA = this.getPropertyTypePriority(a.property_type);
        const priorityB = this.getPropertyTypePriority(b.property_type);
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // Secondary sort: Latest first
        const dateA = new Date(a.created_at || '1970-01-01').getTime();
        const dateB = new Date(b.created_at || '1970-01-01').getTime();
        return dateB - dateA;
      });
    }
  }

  /**
   * Main search entry point - determines search type and executes appropriate query
   */
  async searchProperties(query: string, filters: any = {}, limit: number = 20): Promise<SimplifiedSearchResult> {
    const lowerQuery = query.toLowerCase();
    
    // HOTFIX: Direct handler for Bukit Bintang MRT queries
    if (lowerQuery.includes('bukit bintang') && (lowerQuery.includes('mrt') || lowerQuery.includes('near'))) {
      console.log(`🚨 HOTFIX: Detected Bukit Bintang query - forcing station search`);
      const sortBy = (filters.sortBy as 'distance' | 'recency') || 'distance';
      return await this.searchSpecificStation('Bukit Bintang', 'MRT', filters, limit, sortBy);
    }
    
    // Check if this is a general transport search  
    if (this.isGeneralTransportQuery(lowerQuery)) {
      return await this.searchGeneralTransport(filters, limit);
    }
    
    // Check if this is a specific transport station search (use original query for capitalization)
    const stationDetails = this.detectSpecificStation(query);
    if (stationDetails) {
      const sortBy = (filters.sortBy as 'distance' | 'recency') || 'distance';
      console.log(`🎯 Station search with sortBy parameter: "${filters.sortBy}" -> parsed as: "${sortBy}"`);
      console.log(`📍 LOCATION-BASED SEARCH: Will sort by distance + property type priority (residential > commercial > industrial)`);
      return await this.searchSpecificStation(stationDetails.stationName, stationDetails.transportType, filters, limit, sortBy);
    }
    
    // Fallback to keyword search (building/location name search)
    console.log(`🏢 BUILDING/LOCATION SEARCH: Will sort by recency (latest to oldest) for "${query}"`);
    return await this.searchByKeyword(query, filters, limit);
  }

  /**
   * Detect if query is a general transport search (e.g., "near MRT", "near LRT", "near transport")
   */
  private isGeneralTransportQuery(query: string): boolean {
    // Clean the query - remove trailing spaces and normalize
    const cleanQuery = query.trim();
    
    const generalPatterns = [
      // Basic patterns
      /^near (mrt|lrt|ktm|monorail)$/i,
      /^near transport$/i,
      /^properties near (mrt|lrt|ktm|monorail)$/i,
      /^(mrt|lrt|ktm|monorail) properties$/i,
      /^near (mrt|lrt|ktm|monorail) stations?$/i,
      /^near train stations?$/i,
      /^close to (mrt|lrt|ktm|monorail)$/i,
      /^walking distance to (mrt|lrt|ktm|monorail)$/i,
      /^walkable to (mrt|lrt|ktm|monorail)$/i,
      /^within walking distance (of )?(.* )?(mrt|lrt|ktm|monorail)$/i,
      
      // Price-filtered general transport (no property type prefix)
      /^near (mrt|lrt|ktm|monorail)\s+(?:below|under|above|over|less than|more than|within)\s+rm\s*[\d.,]+k?$/i,
      /^close to (mrt|lrt|ktm|monorail)\s+(?:below|under|above|over|less than|more than|within)\s+rm\s*[\d.,]+k?$/i,
      /^walking distance to (mrt|lrt|ktm|monorail)\s+(?:below|under|above|over|less than|more than|within)\s+rm\s*[\d.,]+k?$/i,
      
      // Property type + general transport (simple patterns)
      /^(condo|condominium|apartment|serviced? residence|service-residence|unit|units) near (mrt|lrt|ktm|monorail)(?:\s+(?:below|under|above|over|less than|more than|within)\s+rm\s*[\d.,]+k?)?$/i,
      /^(condo|condominium|apartment|serviced? residence|service-residence|unit|units) near transport$/i,
      /^(townhouse|house|commercial|industrial|office|shop|retail) near (mrt|lrt|ktm|monorail)(?:\s+(?:below|under|above|over|less than|more than|within)\s+rm\s*[\d.,]+k?)?$/i,
      
      // ENHANCED: Complex patterns with descriptive text - the key fix for the bug
      // Pattern: "Property type [price] for [description] near transport"
      /^(condo|condominium|apartment|serviced? residence|service-residence|unit|units|townhouse|house)\s+(?:(?:below|under|above|over|less than|more than|within)\s+rm\s*[\d.,]+k?\s+)?for\s+[\w\s]+near\s+(mrt|lrt|ktm|monorail)$/i,
      
      // Pattern: Property type + price + descriptive text + near transport (no specific station)
      // This catches: "Condo under RM2500 for elderly parents near MRT"
      /^(condo|condominium|apartment|serviced? residence|service-residence|unit|units|townhouse|house)\s+(?:below|under|above|over|less than|more than|within)\s+rm\s*[\d.,]+k?\s+[\w\s]*(?:for|suitable|ideal)\s+[\w\s]*?near\s+(mrt|lrt|ktm|monorail)(?:\s+(?:station|stations))?$(?!\s+[A-Z][A-Za-z]+)/i,
      
      // Pattern: General "near transport" at the end without specific station name
      // This is a fallback pattern to catch queries ending with generic transport references
      /\bnear\s+(mrt|lrt|ktm|monorail)(?:\s+(?:station|stations))?$(?!\s+[A-Z][A-Za-z]+)/i,
      
      // CRITICAL FIX: Patterns with price filters AFTER transport type
      // These handle queries like "I want 3 rooms unit near MRT below RM3k"
      /\bnear\s+(mrt|lrt|ktm|monorail)\s+(?:below|under|above|over|less\s+than|more\s+than|within)\s+rm\s*[\d.,]+k?\b/i,
      /\b(?:close\s+to|nearby|walking\s+distance\s+to)\s+(mrt|lrt|ktm|monorail)\s+(?:below|under|above|over|less\s+than|more\s+than|within)\s+rm\s*[\d.,]+k?\b/i,
      
      // Pattern: Bedroom count + near transport + price filter
      // "3 rooms unit near MRT below RM3k", "2 bedroom near LRT under RM2500"
      /\b\d+\s+(?:room|rooms|bedroom|bedrooms?|bed)\s+(?:unit|units?|condo|apartment)?\s*near\s+(mrt|lrt|ktm|monorail)\s+(?:below|under|above|over|less\s+than|more\s+than|within)\s+rm\s*[\d.,]+k?\b/i,
      
      // Pattern: General query prefix + near transport (handles "I want", "Looking for", etc.)
      // "I want 3 rooms near MRT", "Looking for condo near LRT under RM3k"
      /(?:i\s+want|looking\s+for|need|searching\s+for).*?\bnear\s+(mrt|lrt|ktm|monorail)(?:\s+(?:below|under|above|over|less\s+than|more\s+than|within)\s+rm\s*[\d.,]+k?)?\b/i
    ];
    
    console.log(`🔍 GENERAL TRANSPORT CHECK: Testing "${cleanQuery}"`);
    
    // Test each pattern and log which one matches (if any)
    for (let i = 0; i < generalPatterns.length; i++) {
      const pattern = generalPatterns[i];
      if (pattern.test(cleanQuery)) {
        console.log(`✅ GENERAL TRANSPORT MATCH: Pattern ${i + 1} matched for "${cleanQuery}"`);
        return true;
      }
    }
    
    console.log(`❌ NO GENERAL TRANSPORT MATCH: "${cleanQuery}" will proceed to specific station detection`);
    return false;
  }

  /**
   * Extract specific station name and transport type from query
   */
  private detectSpecificStation(query: string): { stationName: string; transportType: string } | null {
    console.log(`🔍 STATION DETECTION: Testing query "${query}"`);
    
    // More restrictive patterns to avoid false positives
    // Note: Using case-sensitive patterns for station names, case-insensitive for transport types
    const stationPatterns = [
      // Pattern 1: "near MRT Surian", "MRT KLCC" - transport type followed by station name
      // Must be at the end or followed by price info only
      /\b(?:near\s+)?(mrt|lrt|ktm|monorail|MRT|LRT|KTM|Monorail)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,1})(?:\s+[Ss]tation)?(?:$|\s+(?:below|under|above|over|less\s+than|more\s+than)\s+[Rr][Mm])/,
      
      // Pattern 2: "Surian MRT", "KLCC LRT" - station name followed by transport type  
      // Must be at the end or followed by price info only
      /^(?:[\w\s]*?\s)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,1})\s+(mrt|lrt|ktm|monorail|MRT|LRT|KTM|Monorail)(?:\s+[Ss]tation)?(?:$|\s+(?:below|under|above|over|less\s+than|more\s+than)\s+[Rr][Mm])/
    ];
    
    for (const pattern of stationPatterns) {
      const match = query.match(pattern);
      if (match) {
        const normalizeTransportType = (type: string) => {
          const normalized = type.toLowerCase();
          if (normalized === 'mrt') return 'MRT';
          if (normalized === 'lrt') return 'LRT';
          if (normalized === 'ktm') return 'KTM';
          if (normalized === 'monorail') return 'Monorail';
          if (normalized === 'brt') return 'BRT';
          return type.toUpperCase();
        };

        let stationName: string = '';
        let transportType: string = '';
        
        if (pattern === stationPatterns[0]) {
          // Pattern 1: transport type first (MRT Surian)
          transportType = match[1];
          stationName = match[2].trim();
        } else if (pattern === stationPatterns[1]) {
          // Pattern 2: station name first (Surian MRT)  
          stationName = match[1].trim();
          transportType = match[2];
        }
        
        // Ensure we have valid values before proceeding
        if (!stationName || !transportType) {
          console.log(`🚫 PATTERN MATCH FAILED: Could not extract station name or transport type from "${query}"`);
          continue;
        }
        
        // Enhanced validation to prevent false positives
        // NOTE: Removed price keywords ('below', 'under', 'above', 'over', 'rm', 'k', 'thousand') to allow price-filtered queries
        const invalidStationTerms = ['ringgit'];  // Only truly invalid terms
        const queryTerms = ['parents', 'elderly', 'family', 'investment', 'couple', 'for', 'rent', 'sale', 'condo', 'apartment', 'property', 'properties'];
        const commonWords = ['the', 'and', 'or', 'but', 'with', 'without', 'from', 'to', 'in', 'on', 'at', 'by'];
        
        // Check if station name contains any disqualifying terms
        const stationLower = stationName.toLowerCase();
        const isInvalidStation = invalidStationTerms.some(term => stationLower.includes(term));
        const isQueryTerm = queryTerms.some(term => stationLower.includes(term));
        const hasCommonWords = commonWords.some(term => stationLower.includes(term));
        
        // Known valid stations that should always be allowed
        const knownStations = ['bukit bintang', 'klcc', 'surian', 'kelana jaya', 'ampang park', 'sentul', 'cheras', 'bangsar'];
        const isKnownStation = knownStations.includes(stationLower);
        
        // Additional validation: station name should look like a proper noun and be reasonable length
        const isProperNoun = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(stationName);
        
        console.log(`🚉 STATION DETECTION: Pattern matched - Station: "${stationName}", Transport: "${transportType}"`);
        console.log(`🔍 Validation checks - Invalid: ${isInvalidStation}, QueryTerm: ${isQueryTerm}, CommonWords: ${hasCommonWords}, ProperNoun: ${isProperNoun}, Known: ${isKnownStation}`);
        
        // Enhanced validation: only allow if it's a known station OR (proper noun without disqualifying terms and reasonable length)
        const allowSearch = isKnownStation || (stationName.length >= 3 && stationName.length <= 20 && isProperNoun && !isInvalidStation && !isQueryTerm && !hasCommonWords);
        console.log(`🔧 ALLOWING STATION SEARCH: ${allowSearch} for "${stationName}"`);
        
        if (allowSearch) {
          return {
            stationName: stationName,
            transportType: normalizeTransportType(transportType)
          };
        } else {
          console.log(`🚫 STATION REJECTED: "${stationName}" failed validation (not a valid station name or too long)`);
        }
      }
    }
    
    console.log(`🔍 No specific station detected, will try general transport search`);
    return null;
  }

  /**
   * General transport search: Properties within specified distance of ANY transport station OR mentioning transport
   */
  async searchGeneralTransport(filters: any, limit: number): Promise<SimplifiedSearchResult> {
    console.log('🚉 GENERAL TRANSPORT SEARCH: Finding properties near any transport station (MRT/LRT/KTM/Monorail)');
    
    // Use dynamic distance from filters, or default to 1250m for general searches (walking distance)
    const maxDistanceMeters = filters.maxDistanceMeters || 1250; 
    console.log(`📏 Using search radius: ${maxDistanceMeters}m for transport proximity search`);
    
    // Simplified approach: First get geospatial results, then add text mentions
    const listingType = filters.listingType || 'rent';
    const propertyType = filters.propertyType;
    const bedrooms = filters.bedrooms;
    const bathrooms = filters.bathrooms;
    const bedroomMatchType = filters.bedroomMatchType || 'exact'; // Default to exact match
    
    // For general transport searches, we want to show many results
    // Only apply property type filter if it won't severely limit results
    let propertyTypeFilter = '';
    if (propertyType && propertyType !== 'condominium' && propertyType !== 'service-residence') {
      // Apply filter for less common property types
      propertyTypeFilter = `AND p.property_type = '${propertyType}'`;
      console.log(`🏢 APPLYING PROPERTY TYPE FILTER: ${propertyType} for general transport search`);
    } else if (propertyType) {
      console.log(`🔄 SKIPPING PROPERTY TYPE FILTER for general search to show more results. Will filter after query for: ${propertyType}`);
    }
    
    // Build bedroom/bathroom filters (exact or >= based on matchType)
    let bedroomFilter = '';
    let bathroomFilter = '';
    if (bedrooms && bedrooms > 0) {
      if (bedroomMatchType === 'exact') {
        bedroomFilter = `AND p.bedrooms = ${bedrooms}`;
        console.log(`🛏️ APPLYING BEDROOM FILTER: = ${bedrooms} bedrooms (EXACT MATCH)`);
      } else {
        bedroomFilter = `AND p.bedrooms >= ${bedrooms}`;
        console.log(`🛏️ APPLYING BEDROOM FILTER: >= ${bedrooms} bedrooms (MINIMUM MATCH)`);
      }
    }
    if (bathrooms && bathrooms > 0) {
      bathroomFilter = `AND p.bathrooms >= ${bathrooms}`;
      console.log(`🚿 APPLYING BATHROOM FILTER: >= ${bathrooms} bathrooms`);
    }
    
    // Get properties near ALL transport stations geospatially with agent info
    console.log(`🔍 Running spatial query for ${listingType} properties...`);
    const spatialResults = await db.execute(sql.raw(`
      SELECT DISTINCT 
        p.id as property_id,
        p.*,
        a.*,
        a.id as agent_id
      FROM properties p
      LEFT JOIN agents a ON p.agent_id = a.id
      WHERE p.listing_type = '${listingType}'
        ${propertyTypeFilter}
        ${bedroomFilter}
        ${bathroomFilter}
        AND EXISTS (
          SELECT 1 FROM transport_stations ts
          WHERE ts.transport_type IN ('MRT', 'LRT', 'KTM', 'Monorail')
          AND ST_DistanceSphere(
            ST_MakePoint(p.longitude::numeric, p.latitude::numeric),
            ST_MakePoint(ts.longitude::numeric, ts.latitude::numeric)
          ) <= ${maxDistanceMeters}
        )
      ORDER BY p.created_at DESC
      LIMIT ${limit * 5}
    `));
    console.log(`🔍 Raw spatial results:`, spatialResults?.rows ? spatialResults.rows.length : 'no rows property', typeof spatialResults);
    console.log(`🔍 SpatialResults keys:`, Object.keys(spatialResults || {}).slice(0, 10));
    // db.execute for raw SQL returns an array-like object, try different accessors
    console.log(`🔍 Checking Result type:`, Array.isArray(spatialResults), 'rows length:', spatialResults?.rows?.length, spatialResults?.rows?.[0] ? 'has index 0' : 'no index 0');
    
    // Get properties mentioning any transport type with agent info
    // For walking distance searches (maxDistanceMeters <= 1500), also apply distance filter to mention query
    console.log(`🔍 Running mention query for ${listingType} properties...`);
    let mentionQuery;
    if (maxDistanceMeters <= 1500) {
      console.log(`🚶 WALKING DISTANCE: Applying ${maxDistanceMeters}m distance filter to mention query`);
      mentionQuery = `
        SELECT DISTINCT 
          p.id as property_id,
          p.*,
          a.*,
          a.id as agent_id
        FROM properties p
        LEFT JOIN agents a ON p.agent_id = a.id
        WHERE p.listing_type = '${listingType}'
          ${propertyTypeFilter}
          ${bedroomFilter}
          ${bathroomFilter}
          AND (p.title ILIKE '%MRT%' OR p.description ILIKE '%MRT%' 
               OR p.title ILIKE '%LRT%' OR p.description ILIKE '%LRT%'
               OR p.title ILIKE '%KTM%' OR p.description ILIKE '%KTM%'
               OR p.title ILIKE '%Monorail%' OR p.description ILIKE '%Monorail%')
          AND EXISTS (
            SELECT 1 FROM transport_stations ts
            WHERE ts.transport_type IN ('MRT', 'LRT', 'KTM', 'Monorail')
            AND ST_DistanceSphere(
              ST_MakePoint(p.longitude::numeric, p.latitude::numeric),
              ST_MakePoint(ts.longitude::numeric, ts.latitude::numeric)
            ) <= ${maxDistanceMeters}
          )
        ORDER BY p.created_at DESC
        LIMIT ${limit * 2}`;
    } else {
      console.log(`🚗 GENERAL SEARCH: Using unrestricted mention query for ${maxDistanceMeters}m search`);
      mentionQuery = `
        SELECT DISTINCT 
          p.id as property_id,
          p.*,
          a.*,
          a.id as agent_id
        FROM properties p
        LEFT JOIN agents a ON p.agent_id = a.id
        WHERE p.listing_type = '${listingType}'
          ${propertyTypeFilter}
          ${bedroomFilter}
          ${bathroomFilter}
          AND (p.title ILIKE '%MRT%' OR p.description ILIKE '%MRT%' 
               OR p.title ILIKE '%LRT%' OR p.description ILIKE '%LRT%'
               OR p.title ILIKE '%KTM%' OR p.description ILIKE '%KTM%'
               OR p.title ILIKE '%Monorail%' OR p.description ILIKE '%Monorail%')
        ORDER BY p.created_at DESC
        LIMIT ${limit * 2}`;
    }
    
    const mentionResults = await db.execute(sql.raw(mentionQuery));
    console.log(`🔍 Raw mention results:`, mentionResults?.rows ? mentionResults.rows.length : 'no rows property', typeof mentionResults);
    
    // Extract the actual results array from db.execute() response  
    const spatialArray = spatialResults?.rows || [];
    const mentionArray = mentionResults?.rows || [];
    
    // Combine results using a Map for more efficient deduplication
    const propertyMap = new Map();
    
    // Add spatial results first (prioritize them)
    spatialArray.forEach((property: any) => {
      const propertyId = property.property_id || property.id;
      if (propertyId && !propertyMap.has(propertyId)) {
        propertyMap.set(propertyId, { ...property, id: propertyId });
      }
    });
    
    // Add mention results that aren't already included
    mentionArray.forEach((property: any) => {
      const propertyId = property.property_id || property.id;
      if (propertyId && !propertyMap.has(propertyId)) {
        propertyMap.set(propertyId, { ...property, id: propertyId });
      }
    });
    
    // Filter by property type post-query if needed
    let combinedResults = Array.from(propertyMap.values());
    if (propertyType && !propertyTypeFilter) {
      // Apply property type filter after query to ensure we have enough results
      // In Malaysia, "condo" searches should include condominiums, service residences, and apartments (as fallback)
      const allowedTypes = propertyType === 'condominium' 
        ? ['condominium', 'service-residence', 'apartment'] 
        : [propertyType];
      
      const filtered = combinedResults.filter((property: any) => 
        allowedTypes.includes(property.property_type)
      );
      console.log(`🔍 POST-QUERY FILTER: ${combinedResults.length} -> ${filtered.length} properties after filtering for ${propertyType} (includes: ${allowedTypes.join(', ')})`);
      
      // Always use filtered results when user specifies a property type
      combinedResults = filtered;
      if (filtered.length === 0) {
        console.log(`⚠️ No ${propertyType} properties found near transport stations`);
      } else {
        console.log(`✅ Found ${filtered.length} ${propertyType} properties near transport stations`);
      }
    }
    
    // Apply price filtering post-query if needed
    if (filters.maxPrice || filters.minPrice) {
      const beforePriceCount = combinedResults.length;
      combinedResults = combinedResults.filter((property: any) => {
        const price = parseFloat(property.price) || 0;
        
        // Apply min price filter
        if (filters.minPrice && price < filters.minPrice) {
          return false;
        }
        
        // Apply max price filter  
        if (filters.maxPrice && price > filters.maxPrice) {
          return false;
        }
        
        return true;
      });
      
      console.log(`💰 PRICE FILTER: ${beforePriceCount} -> ${combinedResults.length} properties after filtering by price (min: ${filters.minPrice || 'none'}, max: ${filters.maxPrice || 'none'})`);
      
      if (combinedResults.length === 0) {
        console.log(`⚠️ No properties found within price range near transport stations`);
      }
    }
    
    // Apply bedroom/bathroom filtering post-query as safety net
    if (filters.bedrooms || filters.bathrooms) {
      const beforeCount = combinedResults.length;
      combinedResults = combinedResults.filter((property: any) => {
        const propertyBedrooms = parseInt(property.bedrooms) || 0;
        const propertyBathrooms = parseInt(property.bathrooms) || 0;
        
        // Apply bedroom filter (exact or >= based on matchType)
        if (filters.bedrooms) {
          if (bedroomMatchType === 'exact') {
            if (propertyBedrooms !== filters.bedrooms) {
              return false;
            }
          } else {
            if (propertyBedrooms < filters.bedrooms) {
              return false;
            }
          }
        }
        
        // Apply bathroom filter (>= match)
        if (filters.bathrooms && propertyBathrooms < filters.bathrooms) {
          return false;
        }
        
        return true;
      });
      
      const matchTypeLabel = bedroomMatchType === 'exact' ? '=' : '>=';
      console.log(`🛏️🚿 BEDROOM/BATHROOM FILTER: ${beforeCount} -> ${combinedResults.length} properties after filtering (bedrooms ${matchTypeLabel} ${filters.bedrooms || 'any'}, bathrooms >= ${filters.bathrooms || 'any'})`);
      
      if (combinedResults.length === 0) {
        console.log(`⚠️ No properties found matching bedroom/bathroom requirements near transport stations`);
      }
    }
    
    // Convert back to array and sort by property type priority, then recency
    console.log(`🎯 GENERAL TRANSPORT: Applying chronological sorting (latest to oldest)`);
    const sortedResults = this.applySortingLogic(combinedResults, 'general', 'recency');
    
    // Limit final results to requested limit
    const results = sortedResults.slice(0, limit);
    
    console.log(`🔧 Spatial results: ${spatialArray.length}, Mention results: ${mentionArray.length}, Total unique: ${sortedResults.length}, Final limited: ${results.length}`);
    console.log(`🔍 First 5 spatial property_ids:`, spatialArray.slice(0, 5).map((p: any) => p.property_id || p.id));
    console.log(`🔍 First 5 mention property_ids:`, mentionArray.slice(0, 5).map((p: any) => p.property_id || p.id));
    console.log(`🔍 Final unique IDs:`, results.slice(0, 10).map((p: any) => p.id));
    const resultRows = results;

    // Calculate walking minutes from maxDistanceMeters (5 km/h = 83.33 m/min)
    const walkingMinutes = Math.round(maxDistanceMeters / 83.33);
    const distanceKm = (maxDistanceMeters / 1000).toFixed(1);

    console.log(`✅ General transport search found ${resultRows.length} properties (limited from ${sortedResults.length} total)`);
    
    return {
      results: resultRows.map((p: any) => ({ property: p })),
      count: resultRows.length,
      searchSummary: {
        searchType: 'general_transport',
        message: `Found ${results.length} properties within ${walkingMinutes}-minute walking distance of transport stations (MRT/LRT/KTM/Monorail)`,
        proximityRadius: `${distanceKm} km`,
        transportTypes: ['MRT', 'LRT', 'KTM', 'Monorail']
      }
    };
  }

  /**
   * Specific station search: Properties within 1.8km of specific station OR mentioning that station
   * Enhanced with agent information and distance-based sorting
   */
  async searchSpecificStation(stationName: string, transportType: string, filters: any, limit: number, sortBy: 'distance' | 'recency' = 'distance'): Promise<SimplifiedSearchResult> {
    console.log(`🎯 SPECIFIC STATION SEARCH: Finding properties near ${transportType} ${stationName}`);
    
    // Get properties near specific MRT station
    const listingType = filters.listingType || 'rent';
    const propertyType = filters.propertyType;
    
    // Build property type filter SQL - be more lenient for specific stations
    let propertyTypeFilter = '';
    let shouldPostFilter = false;
    
    if (propertyType) {
      // For specific stations, if it's a common property type, try post-filtering first
      if (propertyType === 'condominium' || propertyType === 'service-residence') {
        shouldPostFilter = true;
        console.log(`🔄 WILL POST-FILTER for ${propertyType} at station ${stationName} to ensure enough results`);
      } else {
        // Apply immediate filter for less common types
        propertyTypeFilter = `AND p.property_type = '${propertyType}'`;
        console.log(`🏢 APPLYING PROPERTY TYPE FILTER: ${propertyType} for station ${stationName}`);
      }
    }
    
    // Enhanced geospatial search for specific station with agent data
    // Note: We'll do smart sorting in JavaScript for better control over priority logic
    const orderClause = `ORDER BY p.created_at DESC`; // Initial ordering, will be re-sorted later

    const spatialResults = await db.execute(sql.raw(`
      SELECT DISTINCT 
        p.id as property_id,
        p.*,
        a.*,
        a.id as agent_id,
        (
          SELECT MIN(ST_DistanceSphere(
            ST_MakePoint(p.longitude::numeric, p.latitude::numeric),
            ST_MakePoint(ts.longitude::numeric, ts.latitude::numeric)
          ))
          FROM transport_stations ts
          WHERE ts.transport_type = '${transportType}' 
            AND ts.station_name ILIKE '%${stationName}%'
        ) as distance_meters
      FROM properties p
      LEFT JOIN agents a ON p.agent_id = a.id
      WHERE p.listing_type = '${listingType}'
        ${propertyTypeFilter}
        AND EXISTS (
          SELECT 1 FROM transport_stations ts
          WHERE ts.transport_type = '${transportType}'
            AND ts.station_name ILIKE '%${stationName}%'
            AND ST_DistanceSphere(
              ST_MakePoint(p.longitude::numeric, p.latitude::numeric),
              ST_MakePoint(ts.longitude::numeric, ts.latitude::numeric)
            ) <= 1800
        )
      ${orderClause}
      LIMIT ${limit}
    `));
    
    // Text search for station mentions
    const mentionResults = await db.execute(sql.raw(`
      SELECT DISTINCT 
        p.id as property_id,
        p.*,
        a.*,
        a.id as agent_id
      FROM properties p
      LEFT JOIN agents a ON p.agent_id = a.id
      WHERE p.listing_type = '${listingType}'
        ${propertyTypeFilter}
        AND (p.title ILIKE '%${stationName}%' 
             OR p.description ILIKE '%${stationName}%'
             OR p.distance_to_mrt ILIKE '%${stationName}%')
      ORDER BY p.created_at DESC
      LIMIT ${limit}
    `));
    
    // Extract the actual results array from db.execute() response and deduplicate  
    const spatialArray = spatialResults?.rows || [];
    const mentionArray = mentionResults?.rows || [];
    
    // Combine results using a Map for more efficient deduplication
    const propertyMap = new Map();
    
    // Add spatial results first (prioritize them)
    spatialArray.forEach((property: any) => {
      const propertyId = property.property_id || property.id;
      if (propertyId && !propertyMap.has(propertyId)) {
        propertyMap.set(propertyId, { ...property, id: propertyId });
      }
    });
    
    // Calculate distances for mention-only properties (those not in spatial results)
    for (const property of mentionArray) {
      const propertyId = property.property_id || property.id;
      if (propertyId && property.latitude && property.longitude) {
        // Calculate distance for mention properties if they don't have spatial distance data
        if (!property.distance_meters) {
          try {
            const distanceQuery = await db.execute(sql.raw(`
              SELECT MIN(ST_DistanceSphere(
                ST_MakePoint(${property.longitude}::numeric, ${property.latitude}::numeric),
                ST_MakePoint(ts.longitude::numeric, ts.latitude::numeric)
              )) as calculated_distance
              FROM transport_stations ts
              WHERE ts.transport_type IN ('MRT', 'LRT', 'KTM', 'Monorail')
            `));
            
            const calculatedDistance = distanceQuery?.rows?.[0]?.calculated_distance;
            if (calculatedDistance && typeof calculatedDistance === 'number') {
              property.distance_meters = calculatedDistance;
              console.log(`📏 Calculated distance for ${property.title}: ${Math.round(calculatedDistance)}m (mention-only)`);
              
              // Update existing property in map if present
              if (propertyMap.has(propertyId)) {
                const existingProperty = propertyMap.get(propertyId);
                if (!existingProperty.distance_meters) {
                  existingProperty.distance_meters = calculatedDistance;
                  propertyMap.set(propertyId, existingProperty);
                  console.log(`📏 Updated existing property ${property.title} with distance: ${Math.round(calculatedDistance)}m`);
                }
              }
            } else if (calculatedDistance && typeof calculatedDistance === 'string') {
              const numericDistance = parseFloat(calculatedDistance);
              if (!isNaN(numericDistance)) {
                property.distance_meters = numericDistance;
                console.log(`📏 Calculated distance for ${property.title}: ${Math.round(numericDistance)}m (mention-only, converted from string)`);
                
                // Update existing property in map if present
                if (propertyMap.has(propertyId)) {
                  const existingProperty = propertyMap.get(propertyId);
                  if (!existingProperty.distance_meters) {
                    existingProperty.distance_meters = numericDistance;
                    propertyMap.set(propertyId, existingProperty);
                    console.log(`📏 Updated existing property ${property.title} with distance: ${Math.round(numericDistance)}m`);
                  }
                }
              } else {
                property.distance_meters = 999999;
                console.log(`⚠️  Invalid distance format for ${property.title}, assigned max distance for sorting`);
              }
            } else {
              // If no distance can be calculated, assign a high distance for sorting
              property.distance_meters = 999999;
              console.log(`⚠️  No distance calculated for ${property.title}, assigned max distance for sorting`);
            }
          } catch (error) {
            console.error(`❌ Error calculating distance for ${property.title}:`, error);
            property.distance_meters = 999999; // Fallback for sorting
          }
        }
        
        // Add to map if not already present
        if (!propertyMap.has(propertyId)) {
          propertyMap.set(propertyId, { ...property, id: propertyId });
        }
      }
    }
    
    // Apply post-filtering if needed
    let allProperties = Array.from(propertyMap.values());
    if (shouldPostFilter && propertyType) {
      const filtered = allProperties.filter((property: any) => 
        property.property_type === propertyType
      );
      console.log(`🔍 POST-QUERY FILTER for ${stationName}: ${allProperties.length} -> ${filtered.length} properties after filtering for ${propertyType}`);
      
      // Always use filtered results when user specifies a property type
      allProperties = filtered;
      if (filtered.length === 0) {
        console.log(`⚠️ No ${propertyType} properties found near ${stationName}`);
      } else {
        console.log(`✅ Found ${filtered.length} ${propertyType} properties near ${stationName}`);
      }
    }
    
    // Apply price filtering after property type filtering
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const beforeCount = allProperties.length;
      allProperties = allProperties.filter((property: any) => {
        const price = parseFloat(property.rental_price || property.price || 0);
        
        if (filters.minPrice !== undefined && price < filters.minPrice) {
          return false;
        }
        if (filters.maxPrice !== undefined && price > filters.maxPrice) {
          return false;
        }
        return true;
      });
      
      console.log(`💰 PRICE FILTER: ${beforeCount} -> ${allProperties.length} properties after filtering by price (min: ${filters.minPrice || 'none'}, max: ${filters.maxPrice || 'none'})`);
    }
    
    // Apply smart sorting: distance + property type priority for location searches
    console.log(`🎯 SPECIFIC STATION: Applying smart sorting (distance + property type priority) for ${stationName}`);
    const results = this.applySortingLogic(allProperties, 'location', sortBy);
    
    console.log(`🔧 Station spatial: ${spatialArray.length}, Station mentions: ${mentionArray.length}, Total unique: ${results.length} for ${stationName} (sorted by ${sortBy})`);
    console.log(`🔍 Station spatial property_ids:`, spatialArray.slice(0, 10).map((p: any) => p.property_id || p.id));
    console.log(`🔍 Station mention property_ids:`, mentionArray.slice(0, 10).map((p: any) => p.property_id || p.id));
    console.log(`🔍 Station final IDs:`, results.slice(0, 10).map((p: any) => p.id));
    console.log(`🔍 Spatial array first items:`, spatialArray.slice(0, 3).map((p: any) => ({ property_id: p.property_id, id: p.id, title: p.title })));
    const resultRows = results;

    console.log(`✅ Station-specific search found ${resultRows.length} properties near ${transportType} ${stationName}`);
    
    return {
      results: resultRows.map((p: any) => ({ property: p })),
      count: resultRows.length,
      searchSummary: {
        searchType: 'specific_station',
        message: results.length > 0 
          ? `Found ${results.length} properties near ${transportType} ${stationName}`
          : `No ${transportType} station found at ${stationName}. ${transportType} ${stationName} does not exist.`
      }
    };
  }

  /**
   * Fallback keyword search - for building/location name searches
   * Sorted by recency (latest to oldest)
   */
  async searchByKeyword(query: string, filters: any, limit: number): Promise<SimplifiedSearchResult> {
    // VALIDATION: Reject obviously invalid queries that shouldn't return all properties
    if (!this.isValidKeywordQuery(query)) {
      console.log(`🚫 KEYWORD SEARCH REJECTED: "${query}" is not a valid search term`);
      return {
        results: [],
        count: 0,
        searchSummary: {
          searchType: 'keyword',
          message: `No properties found for "${query}" - invalid search term`
        }
      };
    }
    
    const whereConditions = [];
    
    // Add basic filters
    if (filters.listingType) {
      whereConditions.push(eq(properties.listingType, filters.listingType));
    }
    
    if (filters.minPrice) {
      whereConditions.push(sql`${properties.price}::numeric >= ${filters.minPrice}`);
    }
    
    if (filters.maxPrice) {
      whereConditions.push(sql`${properties.price}::numeric <= ${filters.maxPrice}`);
    }
    
    if (filters.propertyType) {
      whereConditions.push(eq(properties.propertyType, filters.propertyType));
    }
    
    if (filters.city) {
      whereConditions.push(ilike(properties.city, `%${filters.city}%`));
    }
    
    // Add search query condition - only if query is meaningful
    whereConditions.push(
      or(
        ilike(properties.title, `%${query}%`),
        ilike(properties.description, `%${query}%`)
      )!
    );

    const rawResults = await db
      .select()
      .from(properties)
      .where(and(...whereConditions))
      .limit(limit);

    // Apply building search sorting (latest to oldest)
    const results = this.applySortingLogic(rawResults, 'building', 'recency');

    return {
      results: results.map(p => ({ property: p })),
      count: results.length,
      searchSummary: {
        searchType: 'keyword',
        message: `Found ${results.length} properties matching "${query}"`
      }
    };
  }

  /**
   * Validate if a query is suitable for keyword search to prevent nonsensical searches
   */
  private isValidKeywordQuery(query: string): boolean {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Reject very short queries
    if (normalizedQuery.length < 2) {
      return false;
    }
    
    // Reject queries that are obviously nonsensical (similar to location detection validation)
    // Check vowel/consonant ratio - nonsensical text often has too few vowels
    const vowelCount = (normalizedQuery.match(/[aeiou]/g) || []).length;
    const consonantCount = (normalizedQuery.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
    const totalLetters = vowelCount + consonantCount;
    
    // If it's mostly letters but has very few vowels, likely nonsensical
    if (totalLetters > 4 && vowelCount < totalLetters * 0.2) {
      console.log(`🚫 KEYWORD REJECTED: "${query}" has too few vowels (${vowelCount}/${totalLetters})`);
      return false;
    }
    
    // Check for consecutive consonants indicating gibberish
    if (/[bcdfghjklmnpqrstvwxyz]{5,}/.test(normalizedQuery)) {
      console.log(`🚫 KEYWORD REJECTED: "${query}" has too many consecutive consonants`);
      return false;
    }
    
    // Reject if contains only special characters or numbers
    if (/^[\d\s\-_!@#$%^&*()]+$/.test(normalizedQuery)) {
      return false;
    }
    
    // Check if it contains any meaningful terms that could be searched
    const meaningfulTerms = [
      // Malaysian location terms
      'kuala', 'lumpur', 'petaling', 'jaya', 'shah', 'alam', 'subang', 'klang', 
      'kajang', 'ampang', 'cheras', 'puchong', 'cyberjaya', 'putrajaya', 'bangsar',
      'mont', 'kiara', 'ttdi', 'setapak', 'wangsa', 'maju', 'kepong', 'selayang',
      'batu', 'caves', 'damansara', 'sunway', 'usj',
      
      // Property terms
      'condo', 'condominium', 'apartment', 'house', 'studio', 'office', 'shop',
      'retail', 'commercial', 'industrial', 'warehouse', 'factory', 'land',
      
      // Building/location terms
      'mall', 'shopping', 'center', 'centre', 'tower', 'plaza', 'building',
      'block', 'unit', 'floor', 'level', 'street', 'road', 'avenue', 'jalan',
      
      // Search-worthy terms
      'near', 'close', 'walking', 'distance', 'area', 'district', 'taman', 'bandar',
      
      // General building names that could exist
      'the', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 
      'first', 'second', 'third', 'new', 'old', 'grand', 'royal', 'golden', 'silver',
      'green', 'blue', 'red', 'white', 'park', 'garden', 'view', 'height', 'hill',
      'valley', 'river', 'lake', 'sea', 'bay', 'island', 'square', 'circle',
      
      // Numbers that could be part of building names
      'ss2', 'ss3', 'ss15', 'usj1', 'usj21', 'pj'
    ];
    
    // If query contains any meaningful terms, allow it
    if (meaningfulTerms.some(term => normalizedQuery.includes(term))) {
      return true;
    }
    
    // Check if it looks like a proper building name (starts with capital)
    const originalQuery = query.trim();
    if (/^[A-Z][a-zA-Z0-9\s]{1,}$/.test(originalQuery) && originalQuery.length <= 50) {
      return true;
    }
    
    // Final check: if it's a sequence of random characters, reject it
    if (/^[a-z]+$/.test(normalizedQuery) && normalizedQuery.length > 6 && 
        !meaningfulTerms.some(term => normalizedQuery.includes(term))) {
      console.log(`🚫 KEYWORD REJECTED: "${query}" appears to be random characters`);
      return false;
    }
    
    return true;
  }

  /**
   * Build common property filters (listing type, price range, etc.)
   */
  private buildPropertyFilters(filters: any): string {
    const conditions = [];
    
    if (filters.listingType) {
      conditions.push(`p.listing_type = '${filters.listingType}'`);
    }
    
    if (filters.minPrice) {
      conditions.push(`p.price >= ${filters.minPrice}`);
    }
    
    if (filters.maxPrice) {
      conditions.push(`p.price <= ${filters.maxPrice}`);
    }
    
    if (filters.propertyType) {
      conditions.push(`p.property_type ILIKE '%${filters.propertyType}%'`);
    }
    
    if (filters.city) {
      conditions.push(`p.city ILIKE '%${filters.city}%'`);
    }
    
    return conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
  }
}