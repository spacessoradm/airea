import { storage } from "../storage";
import { parseNaturalLanguageQuery, type PropertySearchFilters } from "./openai";
import type { Property, InsertSearchAnalytics } from "@shared/schema";
import { enhancedGeocodingService } from './enhancedGeocoding';
import { filterPropertiesByDistance, type Coordinates } from './spatialService';
import { NLPSearchService } from './nlpSearchService';
import { SimplifiedSearchService } from './simplifiedSearchService';
import { geospatialSearchService } from './geospatialSearchService';

export interface SearchResult {
  properties: Property[];
  count: number;
  filters: PropertySearchFilters;
  query: string;
  typoCorrections?: Array<{ original: string; corrected: string; type: string; score: number }>;
  originalQuery?: string;
  correctedQuery?: string;
}

/**
 * Normalizes searchType parameter to canonical 'rent' | 'buy' format
 * Accepts common synonyms: sale, sell, purchase → buy
 */
export function normalizeSearchType(searchType: string): 'rent' | 'buy' {
  const normalized = searchType.toLowerCase().trim();
  
  // Map synonyms to canonical values
  if (normalized === 'sale' || normalized === 'sell' || normalized === 'purchase' || normalized === 'buy') {
    return 'buy';
  }
  
  // Default to rent for any other value
  return 'rent';
}

export async function processAISearch(query: string, searchType: 'rent' | 'buy' = 'rent', sortBy?: string): Promise<SearchResult> {
  const searchStartTime = Date.now();
  console.log(`\n🔍 ========== SEARCH PERFORMANCE TRACKING ==========`);
  console.log(`📊 Query: "${query}" (${searchType})`);
  
  // Import optimization modules
  const { requestMemo } = await import('./requestMemoization');
  const { getCachedSearchResults, cacheSearchResults } = await import('./aiCache');
  
  // Clear request cache for this new search
  requestMemo.clearRequestCache();
  
  // Check cache first for entire search results
  const cacheCheckStart = Date.now();
  const cachedResult = getCachedSearchResults(query, searchType, sortBy);
  console.log(`⏱️  Cache check: ${Date.now() - cacheCheckStart}ms`);
  
  if (cachedResult) {
    console.log(`⚡ SEARCH CACHE HIT: Returning ${cachedResult.count} cached properties for "${query}"`);
    console.log(`⏱️  TOTAL TIME: ${Date.now() - searchStartTime}ms (cache hit)\n`);
    return cachedResult;
  }

  // CATEGORY FAST TRACK: Detect if query is ONLY a property category keyword
  const categoryQuery = query.toLowerCase().trim();
  const categoryMap: Record<string, string[]> = {
    'residential': [
      'apartment', 'condominium', 'house', 'studio', 'townhouse', 'flat', 'service-residence',
      'cluster-house', 'semi-detached-house', '1-storey-terrace', '1.5-storey-terrace', 
      '2-storey-terrace', '2.5-storey-terrace', '3-storey-terrace', '3.5-storey-terrace',
      '4-storey-terrace', '4.5-storey-terrace', 'terraced-house', 'bungalow', 
      'zero-lot-bungalow', 'link-bungalow', 'bungalow-land', 'twin-villa', 'residential-land-plot'
    ],
    'commercial': [
      'commercial', 'office', 'shop', 'shop-office', 'retail-office', 'retail-space', 
      'sofo', 'soho', 'sovo', 'commercial-bungalow', 'commercial-semi-d', 'hotel-resort', 'commercial-land'
    ],
    'industrial': [
      'industrial', 'warehouse', 'factory', 'industrial-land', 'cluster-factory', 
      'semi-d-factory', 'detached-factory', 'terrace-factory', 'agricultural-land'
    ]
  };

  // Check if query matches a category keyword (including variations like "residential properties")
  const categoryVariations: Record<string, string[]> = {
    'residential': ['residential', 'residential properties', 'residential property', 'rumah kediaman', 'kediaman'],
    'commercial': ['commercial', 'commercial properties', 'commercial property', 'komersial', 'kedai'],
    'industrial': ['industrial', 'industrial properties', 'industrial property', 'industri', 'kilang']
  };
  
  let detectedCategory: string | null = null;
  for (const [category, variations] of Object.entries(categoryVariations)) {
    if (variations.includes(categoryQuery)) {
      detectedCategory = category;
      break;
    }
  }
  
  if (detectedCategory) {
    console.log(`🚀 CATEGORY FAST TRACK: Query "${query}" is a direct category search (detected: ${detectedCategory})`);
    
    // Get property types for detected category
    const propertyTypes = categoryMap[detectedCategory];
    
    // Use storage.searchProperties with filters for proper filtering
    const categoryProperties = await storage.searchProperties('', {
      propertyType: propertyTypes,
      listingType: searchType === 'buy' ? 'sale' : 'rent'
    });

    console.log(`✅ CATEGORY SEARCH RESULT: Found ${categoryProperties.length} ${detectedCategory} properties for "${query}"`);
    
    const categoryResult: SearchResult = {
      properties: categoryProperties,
      count: categoryProperties.length,
      filters: {
        searchType: 'general' as const,
        listingType: searchType === 'buy' ? 'sale' : 'rent',
        propertyType: propertyTypes
      },
      query
    };

    // Cache the result
    cacheSearchResults(query, searchType, categoryResult.properties, categoryResult.count, categoryResult.filters, sortBy);
    console.log(`⏱️  TOTAL TIME: ${Date.now() - searchStartTime}ms (category fast track)\n`);
    return categoryResult;
  }
  // Use simplified search service for all MRT/transport queries
  const lowerQuery = query.toLowerCase();
  const transportTypes = ['mrt', 'lrt', 'ktm', 'monorail', 'brt'];
  const nearKeywords = ['near', 'close to', 'walking distance', 'nearby', 'next to', 'dekat'];
  
  const hasTransportKeyword = transportTypes.some(type => lowerQuery.includes(type));
  const hasNearKeyword = nearKeywords.some(keyword => lowerQuery.includes(keyword));
  
  if (hasTransportKeyword && (hasNearKeyword || lowerQuery.includes('mrt'))) {
    console.log(`🚆 TRANSPORT QUERY: "${query}" - using simplified search`);
    
    // Import service singletons to avoid recreation overhead
    const { getNLPSearchService, getSimplifiedSearchService } = await import('./serviceSingletons');
    
    // Parse property type from the query using NLP service singleton
    let parsedQuery = requestMemo.getNLPParsing(query);
    if (!parsedQuery) {
      parsedQuery = await getNLPSearchService().parseSearchQuery(query);
      requestMemo.setNLPParsing(query, parsedQuery);
    }
    
    const filters = {
      listingType: searchType === 'buy' ? 'sale' : 'rent',
      sortBy: sortBy,
      propertyType: parsedQuery.propertyType, // Add property type filter
      maxPrice: parsedQuery.maxPrice, // Add max price filter
      minPrice: parsedQuery.minPrice, // Add min price filter
      minROI: parsedQuery.minROI, // Add minimum ROI filter
      maxROI: parsedQuery.maxROI, // Add maximum ROI filter
      bedrooms: parsedQuery.bedrooms, // Add bedroom filter
      bedroomMatchType: (parsedQuery as any).bedroomMatchType || 'exact', // exact or minimum
      bathrooms: parsedQuery.bathrooms, // Add bathroom filter
      maxDistanceMeters: parsedQuery.nearTransport?.maxDistanceMeters // Pass through walking distance limit
    };
    
    console.log(`🏢 PROPERTY TYPE FILTER: "${parsedQuery.propertyType}" detected from query "${query}"`);
    console.log(`💰 PRICE FILTERS: min=${parsedQuery.minPrice}, max=${parsedQuery.maxPrice} passed to SimplifiedSearchService`);
    console.log(`🔧 FILTERS OBJECT:`, JSON.stringify(filters, null, 2));
    
    const result = await getSimplifiedSearchService().searchProperties(query, filters, 20);
    
    console.log(`✅ Simplified search returned ${result.count} properties`);
    
    const searchResult = {
      properties: result.results.map((r: any) => {
        const property = r.property;
        // EMERGENCY FIX: Simple field mapping to restore functionality
        return {
          ...property,
          // Critical field mappings for frontend compatibility
          propertyType: property.property_type || 'condominium',
          listingType: property.listing_type || 'rent',
          // Convert null values to undefined to prevent React crashes
          postalCode: property.postal_code || undefined,
          squareFeet: property.square_feet || undefined,
          agentId: property.agent_id || property.agentId,
          createdAt: property.created_at || property.createdAt,
          updatedAt: property.updated_at || property.updatedAt,
          // Clean up agent info
          agent: {
            id: property.agent_id || property.id,
            name: property.name || 'Unknown Agent',
            email: property.email || '',
            phone: property.phone || '',
            company: property.company || '',
            license: property.license || '',
            bio: property.bio || '',
            rating: property.rating || 0,
            totalReviews: property.total_reviews || 0
          }
        };
      }),
      count: result.count,
      filters: {
        searchType: 'general' as const,
        listingType: searchType === 'buy' ? 'sale' : 'rent',
        location: {
          area: result.searchSummary.searchType === 'general_transport' ? 'Keyword search' : 
                result.searchSummary.searchType === 'specific_station' ? `Near specific station` : 'Keyword search',
          maxDistance: 18, // ~1.5km in walking minutes
          transportation: 'walking' as const
        }
      },
      query
    };
    
    // Cache the search result for future use
    cacheSearchResults(query, searchType, searchResult.properties, searchResult.count, searchResult.filters, sortBy);
    
    return searchResult;
  }
  // Try AI parsing first, fall back to local parsing if needed
  let smartFilters;
  try {
    const aiParseStart = Date.now();
    console.log(`Attempting AI parsing for query: "${query}"`);
    const aiFilters = await parseNaturalLanguageQuery(query);
    console.log(`⏱️  AI Parsing: ${Date.now() - aiParseStart}ms`);
    
    // Extract area from location object if present
    console.log(`🔍 DEBUG AI FILTERS STRUCTURE:`, JSON.stringify(aiFilters, null, 2));
    
    // CRITICAL FIX: Fallback to keyword extraction for location when AI misses it
    // This handles cases like "15 mins from KLCC" where AI detects maxDistance but not area
    if (aiFilters.location?.maxDistance && (!aiFilters.location?.area || aiFilters.location.area === '')) {
      // Import keyword extraction to get locations
      const { extractKeywords } = await import('./keywordExtractor');
      const keywordResult = await extractKeywords(query);
      
      if (keywordResult.locations && keywordResult.locations.length > 0) {
        aiFilters.location.area = keywordResult.locations[0]; // Use first detected location
        console.log(`🔧 FALLBACK: AI missed location area, using keyword-extracted location "${aiFilters.location.area}"`);
      }
    }
    
    if (aiFilters.location?.area) {
      // DO NOT map location.area to filters.area to avoid triggering coordinates-based area filtering
      // This ensures Malaysian locations use text-based search instead of exact coordinates matching
      console.log(`🗺️  MAPPED AREA: Extracted area "${aiFilters.location.area}" from location object (keeping in location structure)`);
    }
    
    // CRITICAL FIX: ALWAYS override listingType from searchType (don't trust cached AI results)
    // Cached AI responses may have old listingType - we must use the current tab's searchType
    aiFilters.listingType = searchType === 'buy' ? 'sale' : 'rent';
    console.log(`🔄 LISTING TYPE OVERRIDE: Set listingType to "${aiFilters.listingType}" based on searchType "${searchType}"`);
    
    // Convert AI distance-based location query to proximityFilter
    let proximityFilter = undefined;
    
    // Check if this is an EXPLICIT proximity search with distance/near keywords
    const proximityKeywords = ['near', 'close to', 'nearby', 'next to', 'within', 'minutes', 'mins from', 'minutes from', 'mins away', 'minutes away', 'km from', 'km away', 'away from', 'walking distance'];
    const isExplicitProximityQuery = proximityKeywords.some(keyword => query.toLowerCase().includes(keyword));
    
    // CRITICAL: Only use proximity filter if user explicitly mentions distance/proximity
    // Otherwise treat as city/area name search (find properties IN that location)
    if (isExplicitProximityQuery && aiFilters.location?.area) {
      
      // FIX: Extract proximity time/distance from query if AI didn't capture it
      if (!aiFilters.location.maxDistance) {
        // Regex patterns to extract time/distance from query
        const proximityPattern = /(\d+)\s*(min|mins|minutes|hour|hours|km|kilometers?)\s+(?:near|from|to|away)/i;
        const match = query.match(proximityPattern);
        
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          
          if (unit.includes('min')) {
            aiFilters.location.maxDistance = value;
            console.log(`✅ REGEX EXTRACTION: Parsed ${value} minutes from query`);
          } else if (unit.includes('hour')) {
            aiFilters.location.maxDistance = value * 60; // Convert to minutes
            console.log(`✅ REGEX EXTRACTION: Parsed ${value} hours (${value * 60} minutes) from query`);
          } else if (unit.includes('km')) {
            // Store as maxKilometers for now, will be converted below
            aiFilters.location.maxDistance = value; // Use as-is for km
            console.log(`✅ REGEX EXTRACTION: Parsed ${value} km from query`);
          }
        }
      }
      
      // For "near" queries without explicit time/distance, default to 15 minutes
      const distance = aiFilters.location.maxDistance || 15;
      const transportation = aiFilters.location.transportation || 'driving';
      
      console.log(`🎯 PROXIMITY SEARCH: User query contains proximity keywords - searching within ${distance} mins of "${aiFilters.location.area}"`);
      
      // Try enhanced geocoding using Google Maps → service singleton
      console.log(`🔍 Attempting to geocode using Google Maps API: "${aiFilters.location.area}"`);
      const { getEnhancedGeocodingService } = await import('./serviceSingletons');
      const coordinates = await getEnhancedGeocodingService().getLocationCoordinates(aiFilters.location.area);
      console.log(`🔍 Geocoding result:`, coordinates);
      
      if (coordinates) {
        // Malaysian traffic speed estimates for proximity searches (mode-aware):
        // - Driving: 50 km/h average (mixed urban/highway) → 1 min = 0.83 km
        // - Cycling: 15 km/h average → 1 min = 0.25 km
        // - Walking: 5 km/h average → 1 min = 0.083 km
        const speedMap = {
          driving: 0.83,   // 50 km/h - realistic Malaysian mixed traffic
          cycling: 0.25,   // 15 km/h - typical cycling speed
          walking: 0.083   // 5 km/h - typical walking speed
        };
        const travelMode = (transportation === 'cycling' ? 'cycling' : 
                           transportation === 'walking' ? 'walking' : 
                           'driving') as 'driving' | 'walking' | 'cycling';
        const kmPerMinute = speedMap[travelMode];
        let estimatedKm = Math.round(distance * kmPerMinute * 10) / 10; // Round to 1 decimal
        
        // CAP AT 10KM MAXIMUM for proximity searches
        const MAX_PROXIMITY_KM = 10;
        if (estimatedKm > MAX_PROXIMITY_KM) {
          estimatedKm = MAX_PROXIMITY_KM;
          console.log(`⚠️  CAPPED: Distance capped at ${MAX_PROXIMITY_KM}km (original: ${Math.round(distance * kmPerMinute * 10) / 10}km)`);
        }
        
        proximityFilter = {
          targetLocation: { lat: coordinates.lat, lng: coordinates.lng },
          maxMinutes: distance,
          maxKilometers: estimatedKm,
          travelMode,
          locationName: aiFilters.location.area
        };
        console.log(`✅ PROXIMITY FILTER: Searching ${distance} mins from "${aiFilters.location.area}" by ${travelMode} (≈${estimatedKm} km radius)`);
        console.log(`📍 Target coordinates: ${coordinates.lat}, ${coordinates.lng} (source: ${coordinates.source})`);
      } else {
        console.log(`❌ Could not geocode "${aiFilters.location.area}" - will fall back to text search`);
        
        // FALLBACK: For distance searches where we can't find coordinates,
        // convert to a broad text search to find any properties mentioning this location
        console.log(`🔄 FALLBACK: Converting distance search to text search for "${aiFilters.location.area}"`);
        
        // Remove the location distance properties but keep the area for text search
        if (aiFilters.location) {
          delete aiFilters.location.maxDistance;
          delete aiFilters.location.transportation;
        }
        
        // Don't return early - continue with the normal area-based text search logic below
        console.log(`🔄 CONTINUING: Will process as area-based text search using existing logic`);
      }
    } else if (aiFilters.location?.area) {
      // This is a city/area name search (e.g., "Bandar Utama") without proximity keywords
      // Remove any maxDistance to prevent proximity filtering
      console.log(`🏙️ CITY/AREA SEARCH: Query "${query}" will search for properties IN "${aiFilters.location.area}" (not proximity)`);
      if (aiFilters.location) {
        delete aiFilters.location.maxDistance;
        delete aiFilters.location.transportation;
      }
    }

    // Check if AI extracted nearTransport and route to geospatial search
    if (aiFilters.nearTransport) {
      console.log(`🚇 AI EXTRACTED TRANSPORT FILTER: Routing to geospatial search`);
      console.log(`Transport filter details:`, JSON.stringify(aiFilters.nearTransport, null, 2));
      
      // Import service singleton
      const { getGeospatialSearchService } = await import('./serviceSingletons');
      
      // Route to geospatial search service
      const geospatialResult = await getGeospatialSearchService().searchPropertiesNearTransport({
        bedrooms: aiFilters.bedrooms,
        propertyType: Array.isArray(aiFilters.propertyType) ? aiFilters.propertyType[0] : aiFilters.propertyType,
        listingType: (aiFilters.listingType === 'rent' || aiFilters.listingType === 'sale') ? aiFilters.listingType : (searchType === 'buy' ? 'sale' : 'rent'),
        minPrice: aiFilters.minPrice,
        maxPrice: aiFilters.maxPrice,
        minROI: aiFilters.minROI,
        maxROI: aiFilters.maxROI,
        city: aiFilters.city,
        state: aiFilters.state,
        nearTransport: aiFilters.nearTransport,
        originalQuery: query, // Pass original query for property type detection
        limit: 20,
        offset: 0
      });
      
      // Convert geospatial results to AI search format
      const properties = geospatialResult.results.map((result: { property: Property; distance?: number; transportStations?: any[] }) => result.property);
      
      const geospatialSearchResult = {
        properties,
        count: properties.length,
        filters: {
          searchType: 'general' as const,
          propertyType: aiFilters.propertyType,
          listingType: aiFilters.listingType || (searchType === 'buy' ? 'sale' : 'rent'),
          bedrooms: aiFilters.bedrooms,
          minPrice: aiFilters.minPrice,
          maxPrice: aiFilters.maxPrice,
          nearTransport: aiFilters.nearTransport,
          location: {
            area: `Near ${aiFilters.nearTransport.types.join('/')} ${aiFilters.nearTransport.stationNames ? aiFilters.nearTransport.stationNames.join('/') : 'stations'}`,
            maxDistance: Math.round(aiFilters.nearTransport.maxDistanceMeters / 83.33), // Convert to walking minutes
            transportation: 'walking' as const
          }
        },
        query
      };
      
      // Cache the geospatial search result
      cacheSearchResults(query, searchType, geospatialSearchResult.properties, geospatialSearchResult.count, geospatialSearchResult.filters, sortBy);
      
      return geospatialSearchResult;
    }

    smartFilters = {
      searchText: '',
      filters: aiFilters,
      proximityFilter
    };
    console.log(`AI parsing successful, searchType: ${aiFilters.searchType}`);
  } catch (error) {
    console.log(`AI parsing failed, using local parsing fallback:`, error);
    // Use request memo for local parsing too
    let localFilters = requestMemo.getKeywordExtraction(`local_${query}`);
    if (!localFilters) {
      localFilters = await parseQueryLocally(query, searchType);
      requestMemo.setKeywordExtraction(`local_${query}`, localFilters);
    }
    smartFilters = localFilters;
  }
  

  
  // Use searchText for location-based searches like "sri hartamas"
  let searchText = smartFilters.searchText;
  
  // Check if this is a fallback from failed geocoding
  if ((smartFilters as any).useTextSearch && (smartFilters as any).searchText) {
    console.log(`🔄 PROCESSING FALLBACK: Using text search for "${(smartFilters as any).searchText}"`);
    searchText = (smartFilters as any).searchText;
    
    // For fallback searches, broaden the search by also including partial matches
    const properties = await storage.getProperties({});
    
    // Search for properties mentioning the building name in title, description, or location
    const buildingName = (smartFilters as any).searchText.toLowerCase();
    const matchingProperties = properties.filter((property: Property) => {
      const searchableText = [
        property.title,
        property.description,
        property.address,
        property.street,
        property.city
      ].join(' ').toLowerCase();
      
      return searchableText.includes(buildingName);
    });
    
    console.log(`🔍 FALLBACK RESULTS: Found ${matchingProperties.length} properties mentioning "${(smartFilters as any).searchText}"`);
    
    const fallbackResult = {
      properties: matchingProperties,
      count: matchingProperties.length,
      filters: smartFilters.filters,
      query: query
    };
    
    // Cache the fallback search result
    cacheSearchResults(query, searchType, fallbackResult.properties, fallbackResult.count, fallbackResult.filters, sortBy);
    
    return fallbackResult;
  }

  
  // If we have a specific search text (like building name), prioritize text search
  // and apply only essential filters (like listing type)
  let filtersToApply = { ...smartFilters.filters };
  
  // Expand property types: "house" should include all terrace types
  if (filtersToApply.propertyType && Array.isArray(filtersToApply.propertyType)) {
    if (filtersToApply.propertyType.includes('house')) {
      filtersToApply.propertyType = [
        'house', 'bungalow', 'terraced-house', 'semi-detached-house', 'cluster-house', 'townhouse',
        '1-storey-terrace', '1.5-storey-terrace', '2-storey-terrace', '2.5-storey-terrace',
        '3-storey-terrace', '3.5-storey-terrace', '4-storey-terrace', '4.5-storey-terrace',
        'zero-lot-bungalow', 'link-bungalow', 'bungalow-land', 'twin-villa'
      ];
      console.log(`🏠 EXPANDED PROPERTY TYPE: "house" → all house types including terraces`);
    }
  }
  
  // CRITICAL FIX: ALWAYS override listingType from searchType (don't trust cached AI results)
  // This ensures that when user switches tabs (rent/buy), we always use the current tab's listing type
  filtersToApply.listingType = searchType === 'buy' ? 'sale' : 'rent';
  console.log(`🔄 FINAL LISTING TYPE OVERRIDE: Set filtersToApply.listingType to "${filtersToApply.listingType}" based on searchType "${searchType}"`);
  
  // For general property searches with lifestyle terms (like "cozy home", "family house"), 
  // prioritize filters over text search to avoid overly restrictive matching
  const lifestyleTerms = ['cozy', 'comfortable', 'family', 'spacious', 'modern', 'luxury', 'affordable', 'budget'];
  const hasLifestyleTerms = lifestyleTerms.some(term => query.toLowerCase().includes(term));
  
  // Check for amenity-related terms that should prioritize filter search
  const amenityTerms = ['parking', 'gym', 'pool', 'swimming', 'security', 'lift', 'elevator', 'balcony', 'garden'];
  const hasAmenityTerms = amenityTerms.some(term => query.toLowerCase().includes(term));
  
  if (smartFilters.filters.location?.area) {
    // Enhanced area name normalization for text search
    // This ensures Malaysian locations like "Shah Alam" match "Selangor - Shah Alam" addresses
    let normalizedArea = smartFilters.filters.location.area;
    const lowerArea = normalizedArea.toLowerCase().replace(/[.\s]/g, '');
    
    if (lowerArea.includes('mtkiara') || normalizedArea.toLowerCase().includes('mt kiara')) {
      normalizedArea = 'Mont Kiara';
      smartFilters.filters.location.area = 'Mont Kiara';
      console.log(`🔄 Normalized area: "${smartFilters.filters.location.area}" → "Mont Kiara"`);
    } else if (lowerArea.includes('kpong')) {
      normalizedArea = 'Kepong';
      smartFilters.filters.location.area = 'Kepong';
      console.log(`🔄 Normalized area: "${smartFilters.filters.location.area}" → "Kepong"`);
    } else if (lowerArea.includes('damansra')) {
      normalizedArea = 'Damansara';
      smartFilters.filters.location.area = 'Damansara';
      console.log(`🔄 Normalized area: "${smartFilters.filters.location.area}" → "Damansara"`);
    }
    
    console.log(`🗺️ AREA SEARCH: Converting area "${normalizedArea}" to text search for "State - City" format matching`);
    console.log(`🎯 EXPECTED MATCH: Properties with addresses like "Selangor - ${normalizedArea}" should be found`);
    
    // For area searches like "KLCC", use text search instead of filter since area filter doesn't exist in storage
    // This applies whether or not city is also detected
    searchText = normalizedArea;
    
    // CRITICAL: Store listingType before modifying filters
    const preservedListingType = filtersToApply.listingType;
    filtersToApply = { ...filtersToApply }; // Remove area from filters
    delete filtersToApply.area;
    
    // CRITICAL: Remove city filter when we have area to prioritize area-based text search
    // This fixes the issue where Shah Alam gets city="Shah Alam" but properties have city="Selangor"
    if (filtersToApply.city) {
      console.log(`🔧 REMOVING CITY FILTER: Removing city="${filtersToApply.city}" to prioritize area-based text search for "${normalizedArea}"`);
      delete filtersToApply.city;
    }
    
    // CRITICAL: Also remove area from smartFilters to prevent coordinates-based area filtering from running
    // This ensures only text-based search runs for Malaysian locations with "State - City" format
    console.log(`🔧 DISABLING COORDS FILTER: Removing smartFilters.filters.area and location.area to prevent conflicting proximity filtering`);
    smartFilters.filters.area = undefined;
    if (smartFilters.filters.location) {
      smartFilters.filters.location.area = undefined;
    }
    
    // CRITICAL: Restore listingType after area filter removal
    if (preservedListingType) {
      filtersToApply.listingType = preservedListingType;
    } else {
      filtersToApply.listingType = searchType === 'buy' ? 'sale' : 'rent';
    }
    
    console.log(`Using area-based text search: "${searchText}" with filters:`, filtersToApply);
    console.log(`🔍 AREA-BASED LISTING TYPE CHECK: filtersToApply.listingType = "${filtersToApply.listingType}", searchType = "${searchType}"`);
  } else if (smartFilters.filters.city && !smartFilters.filters.area) {
    searchText = ''; // Clear text search for city-based queries only
  } else if (hasLifestyleTerms && (smartFilters.filters.maxPrice || smartFilters.filters.minPrice)) {
    searchText = ''; // Clear text search for lifestyle-based queries with price filters
  } else if (hasLifestyleTerms && smartFilters.filters.propertyType) {
    searchText = ''; // Clear text search for lifestyle queries with property type (e.g., "spacious condo")
  } else if (hasAmenityTerms && smartFilters.filters.propertyType) {
    searchText = ''; // Clear text search for amenity queries with property type (e.g., "condo with parking")
  } else if (smartFilters.filters.propertyType && smartFilters.filters.bedrooms && smartFilters.filters.bathrooms) {
    searchText = ''; // Only clear text search when we have very specific property requirements
  } else if (smartFilters.filters.tenure || smartFilters.filters.titleType || smartFilters.filters.landTitleType) {
    searchText = ''; // Clear text search for legal property filter queries
  }
  
  // Smart property type filtering: Default to residential for general searches
  if (!filtersToApply.propertyType || filtersToApply.propertyType.length === 0) {
    const queryLower = query.toLowerCase();
    
    // Check for commercial keywords
    const commercialKeywords = ['commercial', 'office', 'shop', 'shoplot', 'shop lot', 'retail', 'mall unit', 'co-working'];
    const hasCommercial = commercialKeywords.some(keyword => queryLower.includes(keyword));
    
    // Check for industrial keywords  
    const industrialKeywords = ['industrial', 'factory', 'warehouse', 'logistics', 'cold storage'];
    const hasIndustrial = industrialKeywords.some(keyword => queryLower.includes(keyword));
    
    if (hasCommercial) {
      filtersToApply.propertyType = [
        'commercial', 'office', 'shop', 'shop-office', 'retail-office', 'retail-space', 
        'sofo', 'soho', 'sovo', 'commercial-bungalow', 'commercial-semi-d', 'hotel-resort', 'commercial-land'
      ];
      console.log(`🏢 AUTO-FILTER: Applied commercial filter for query: "${query}"`);
    } else if (hasIndustrial) {
      filtersToApply.propertyType = [
        'industrial', 'warehouse', 'factory', 'industrial-land', 'cluster-factory', 
        'semi-d-factory', 'detached-factory', 'terrace-factory', 'agricultural-land'
      ];  
      console.log(`🏭 AUTO-FILTER: Applied industrial filter for query: "${query}"`);
    } else {
      // Default to residential for general searches - use all residential property types
      filtersToApply.propertyType = [
        'apartment', 'condominium', 'house', 'studio', 'townhouse', 'flat', 'service-residence',
        'cluster-house', 'semi-detached-house', '1-storey-terrace', '1.5-storey-terrace', 
        '2-storey-terrace', '2.5-storey-terrace', '3-storey-terrace', '3.5-storey-terrace',
        '4-storey-terrace', '4.5-storey-terrace', 'terraced-house', 'bungalow', 
        'zero-lot-bungalow', 'link-bungalow', 'bungalow-land', 'twin-villa', 'residential-land-plot'
      ];
      console.log(`🏠 AUTO-FILTER: Applied residential filter for general query: "${query}"`);
    }
  }
  
  // Don't apply default listing type - show both rent and sale properties when no type is specified
  
  // For proximity searches, don't use location-based filtering - we want to search ALL properties first
  if (smartFilters.proximityFilter) {
    searchText = ''; // Clear searchText for proximity searches
    // Keep the existing filtersToApply with auto-filtered property type
    const proximityFilters = {
      listingType: filtersToApply.listingType, // Keep listing type filter
      // Remove city and area filters for proximity searches
      minPrice: smartFilters.filters.minPrice,
      maxPrice: smartFilters.filters.maxPrice,
      minROI: smartFilters.filters.minROI,
      maxROI: smartFilters.filters.maxROI,
      bedrooms: smartFilters.filters.bedrooms,
      bathrooms: smartFilters.filters.bathrooms,
      minSquareFeet: smartFilters.filters.minSquareFeet,
      maxSquareFeet: smartFilters.filters.maxSquareFeet,
      propertyType: filtersToApply.propertyType, // Use the auto-filtered property type
      // Preserve legal information filters
      tenure: smartFilters.filters.tenure,
      titleType: smartFilters.filters.titleType,
      landTitleType: smartFilters.filters.landTitleType,
      // Preserve complex filters (5.1 fix)
      sortBy: smartFilters.filters.sortBy,
      lotType: smartFilters.filters.lotType,
      minBedrooms: smartFilters.filters.minBedrooms,
      condition: smartFilters.filters.condition,
      amenities: smartFilters.filters.amenities,
    };
    filtersToApply = proximityFilters;
  } else if (searchText && searchText.length > 2) {
    // For location searches like "Kepong", use area-specific search with proximity filtering
    // Keep searchText for area-specific searches to find exact location matches
    console.log(`Location search for: "${searchText}" with area: ${smartFilters.filters.area}`);
    
    // For specific area searches, preserve searchText to find location-specific properties
    filtersToApply = {
      listingType: filtersToApply.listingType, // Use detected or default listing type
      city: smartFilters.filters.city, // Preserve city filter for location searches
      // Keep area information for proximity filtering
      minPrice: smartFilters.filters.minPrice,
      maxPrice: smartFilters.filters.maxPrice,
      minROI: smartFilters.filters.minROI,
      maxROI: smartFilters.filters.maxROI,
      bedrooms: smartFilters.filters.bedrooms,
      bathrooms: smartFilters.filters.bathrooms,
      minSquareFeet: smartFilters.filters.minSquareFeet,
      maxSquareFeet: smartFilters.filters.maxSquareFeet,
      propertyType: filtersToApply.propertyType, // Use the auto-filtered property type
      // Preserve legal information filters
      tenure: smartFilters.filters.tenure,
      titleType: smartFilters.filters.titleType,
      landTitleType: smartFilters.filters.landTitleType,
      // Preserve complex filters (5.1 fix)
      sortBy: smartFilters.filters.sortBy,
      lotType: smartFilters.filters.lotType,
      minBedrooms: smartFilters.filters.minBedrooms,
      condition: smartFilters.filters.condition,
      amenities: smartFilters.filters.amenities,
    };
  }
  
  // Search properties using local parsing
  console.log(`🔍 STORAGE SEARCH: searchText="${searchText}"`);
  console.log(`🔍 FILTERS APPLIED:`, JSON.stringify(filtersToApply, null, 2));
  console.log(`🔄 LISTING TYPE CHECK: UI searchType="${searchType}" -> DB listingType="${filtersToApply.listingType}"`);

  // CRITICAL FIX: Check if user mentioned a specific location that wasn't found
  // If user searches "in [location]" but no location was detected, return 0 results instead of general search
  // EXCEPTION: Skip this check if query contains property attribute keywords (ROI, bedrooms, price, etc.)
  const propertyAttributeKeywords = /\b(roi|bedroom|bathroom|price|sqft|square feet|rm\s*\d|furnished|parking|gym|pool|under|below|above|between|highway)\b/i;
  const isAttributeSearch = propertyAttributeKeywords.test(query);
  
  if (!isAttributeSearch) {
    const locationMentionPattern = /\b(in|at|near|around)\s+([a-zA-Z\s]+?)(?:\s+(?:under|below|above|between|rm|with|for)|\s*$)/i;
    const locationMatch = query.match(locationMentionPattern);
    if (locationMatch && !smartFilters.filters.area && !smartFilters.filters.city && !smartFilters.proximityFilter && searchText === "") {
      const mentionedLocation = locationMatch[2].trim();
      console.log(`🚫 LOCATION NOT FOUND: User mentioned "${mentionedLocation}" but no valid location detected - returning 0 results`);
      console.log(`⏱️  TOTAL TIME: ${Date.now() - searchStartTime}ms (no results)\n`);
      return {
        properties: [],
        count: 0,
        filters: filtersToApply,
        query,
      };
    }
  }

  const dbQueryStart = Date.now();
  const properties = await storage.searchProperties(searchText, filtersToApply);
  console.log(`⏱️  Database Query: ${Date.now() - dbQueryStart}ms`);
  console.log(`🔍 STORAGE RETURNED: ${properties.length} properties`);
  
  // Apply proximity filtering if proximityFilter is set
  let filteredProperties = properties;
  let proximitySorted = false; // Track if distance-based sorting was actually applied
  
  if (smartFilters.proximityFilter && smartFilters.proximityFilter.targetLocation) {
    const { targetLocation, maxKilometers, maxMinutes, locationName } = smartFilters.proximityFilter;
    console.log(`📍 PROXIMITY FILTER: Filtering properties within ${maxKilometers}km (${maxMinutes} mins) of ${locationName}`);
    console.log(`📍 TARGET COORDINATES:`, targetLocation);
    
    // ALSO search for properties IN the location (text-based address matching)
    // This ensures "near Bandar Utama" includes properties AT Bandar Utama
    console.log(`🔍 ALSO SEARCHING: Properties with "${locationName}" in their address`);
    const propertiesInLocation = await storage.searchProperties(locationName, filtersToApply);
    console.log(`📍 FOUND IN LOCATION: ${propertiesInLocation.length} properties with "${locationName}" in address`);
    
    // Combine properties from general search + location text search
    // Use a Map to deduplicate by property ID
    const combinedPropertiesMap = new Map();
    properties.forEach(p => combinedPropertiesMap.set(p.id, p));
    propertiesInLocation.forEach(p => combinedPropertiesMap.set(p.id, p));
    const combinedProperties = Array.from(combinedPropertiesMap.values());
    console.log(`🔗 COMBINED: ${combinedProperties.length} unique properties (${properties.length} from general + ${propertiesInLocation.length} from location text search)`);
    
    // First, filter for valid coordinates
    const propertiesWithCoords = combinedProperties.filter(property => {
      const lat = parseFloat(property.latitude as string);
      const lng = parseFloat(property.longitude as string);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
    
    // Filter out mass duplicate coordinates (data quality issue)
    // Keep up to MAX_PROPERTIES_PER_COORDINATE per unique coordinate
    const MAX_PROPERTIES_PER_COORDINATE = 5;
    
    const coordinateMap = new Map<string, typeof propertiesWithCoords>();
    propertiesWithCoords.forEach(property => {
      // Normalize coordinates by rounding to 6 decimals to catch formatting variations
      const lat = parseFloat(property.latitude as string).toFixed(6);
      const lng = parseFloat(property.longitude as string).toFixed(6);
      const coordKey = `${lat},${lng}`;
      
      if (!coordinateMap.has(coordKey)) {
        coordinateMap.set(coordKey, []);
      }
      coordinateMap.get(coordKey)!.push(property);
    });
    
    // Keep only first MAX_PROPERTIES_PER_COORDINATE per coordinate cluster
    // This filters out mass duplicate coordinates while preserving legitimate multi-unit buildings
    const uniqueCoordProperties: typeof propertiesWithCoords = [];
    coordinateMap.forEach((propertiesAtCoord) => {
      if (propertiesAtCoord.length <= MAX_PROPERTIES_PER_COORDINATE) {
        uniqueCoordProperties.push(...propertiesAtCoord);
      } else {
        // Take first N properties, log the filtering
        uniqueCoordProperties.push(...propertiesAtCoord.slice(0, MAX_PROPERTIES_PER_COORDINATE));
        console.log(`⚠️  Filtered ${propertiesAtCoord.length - MAX_PROPERTIES_PER_COORDINATE} properties with duplicate coordinates (keeping ${MAX_PROPERTIES_PER_COORDINATE})`);
      }
    });
    
    console.log(`📊 Properties with valid coordinates: ${propertiesWithCoords.length} out of ${combinedProperties.length}`);
    console.log(`🔍 Properties with unique coordinates: ${uniqueCoordProperties.length} (filtered out ${propertiesWithCoords.length - uniqueCoordProperties.length} duplicates)`);
    
    // SEPARATE PROCESSING: Proximity-based vs Address-based
    // 1. Get proximity-based results (within radius)
    let proximityResults: typeof properties = [];
    if (uniqueCoordProperties.length > 0) {
      proximityResults = uniqueCoordProperties.filter(property => {
        const lat = parseFloat(property.latitude as string);
        const lng = parseFloat(property.longitude as string);
        const distance = calculateDistance(targetLocation.lat, targetLocation.lng, lat, lng);
        const isWithinRange = distance <= maxKilometers;
        
        if (isWithinRange) {
          console.log(`✅ PROXIMITY: "${property.title}" at ${distance.toFixed(2)}km from ${locationName}`);
        }
        
        return isWithinRange;
      });
      console.log(`🎯 PROXIMITY RESULTS: ${proximityResults.length} properties within ${maxKilometers}km`);
    } else {
      console.log(`⚠️  No properties with coordinates found for proximity filtering`);
    }
    
    // 2. Combine proximity results + address-based results (regardless of distance)
    // Use a Map to deduplicate by property ID
    const finalResultsMap = new Map();
    proximityResults.forEach(p => finalResultsMap.set(p.id, p));
    propertiesInLocation.forEach(p => {
      if (!finalResultsMap.has(p.id)) {
        console.log(`📍 ADDRESS MATCH: Adding "${p.title}" from address search (may be outside radius)`);
      }
      finalResultsMap.set(p.id, p);
    });
    
    filteredProperties = Array.from(finalResultsMap.values());
    console.log(`🔗 COMBINED RESULTS: ${filteredProperties.length} unique properties (${proximityResults.length} proximity + ${propertiesInLocation.length} address matches)`);
    
    // 3. Sort by distance (featured first, then by distance within each group)
    if (filteredProperties.length > 0) {
      // Helper function to check if a property is currently featured
      const isFeaturedProperty = (property: any): boolean => {
        if (!property.featured) return false;
        if (!property.featuredUntil) return true; // No expiry date means always featured
        const now = new Date();
        const featuredUntil = new Date(property.featuredUntil);
        return featuredUntil > now;
      };
      
      filteredProperties.sort((a, b) => {
        const latA = parseFloat(a.latitude as string);
        const lngA = parseFloat(a.longitude as string);
        const latB = parseFloat(b.latitude as string);
        const lngB = parseFloat(b.longitude as string);
        
        const hasValidCoordsA = !isNaN(latA) && !isNaN(lngA) && latA !== 0 && lngA !== 0;
        const hasValidCoordsB = !isNaN(latB) && !isNaN(lngB) && latB !== 0 && lngB !== 0;
        
        // PRIORITY 1: Featured properties always first
        const aIsFeatured = isFeaturedProperty(a);
        const bIsFeatured = isFeaturedProperty(b);
        
        if (aIsFeatured && !bIsFeatured) return -1;
        if (!aIsFeatured && bIsFeatured) return 1;
        
        // PRIORITY 2: Within same group (both featured OR both normal), sort by distance
        // Properties without coords go to bottom (assign Infinity distance)
        const distA = hasValidCoordsA ? calculateDistance(targetLocation.lat, targetLocation.lng, latA, lngA) : Infinity;
        const distB = hasValidCoordsB ? calculateDistance(targetLocation.lat, targetLocation.lng, latB, lngB) : Infinity;
        
        return distA - distB;
      });
      proximitySorted = true;
      console.log(`📏 SORTED BY DISTANCE WITH FEATURED PRIORITY: ${filteredProperties.length} properties (featured first, then by distance)`);
    }
  }
  
  // Additional local filtering for amenities (preserve existing filtering and sorting)
  if (smartFilters.filters.amenities && smartFilters.filters.amenities.length > 0) {
    filteredProperties = filteredProperties.filter(property => {
      if (!property.amenities) return false;
      return smartFilters.filters.amenities.some((amenity: string) => 
        property.amenities!.some(propAmenity => 
          propAmenity.toLowerCase().includes(amenity.toLowerCase())
        )
      );
    });
    console.log(`🏠 AMENITIES FILTER: ${filteredProperties.length} properties match amenity requirements`);
  }
  
  // Optimize sorting with memoization to avoid reprocessing same data sets
  const SORT_CACHE = new Map<string, Property[]>();
  const sortCacheKey = `${filteredProperties.length}_${sortBy || 'default'}_${JSON.stringify(filtersToApply)}`;
  
  let sortedProperties = SORT_CACHE.get(sortCacheKey);
  if (!sortedProperties) {

  // For area-specific searches (like "kepong"), apply proximity filtering to ensure accuracy
  console.log(`🔍 DEBUG: Checking area filter - smartFilters.filters.area: "${smartFilters.filters.area}", proximityFilter: ${!!smartFilters.proximityFilter}`);
  
  // Fix: Only apply area filter if area is defined and not "undefined"
  if (smartFilters.filters.area && smartFilters.filters.area !== "undefined" && !smartFilters.proximityFilter) {
    const searchArea = smartFilters.filters.area.toLowerCase();
    console.log(`🗺️  AREA SEARCH: Starting area filter for "${smartFilters.filters.area}"`);
    
    const areaCoords = getLocationCoordinates(searchArea);
    console.log(`📍 COORDINATES: Looking up coordinates for area: "${smartFilters.filters.area}" (normalized: "${searchArea}") -> ${areaCoords ? 'Found' : 'Not found'}`);
    if (areaCoords) {
      console.log(`✅ COORDS FOUND:`, areaCoords);
    }
    console.log('Available matching locations:', Object.keys(malaysianLocations).filter(k => k.includes(searchArea) || searchArea.includes(k)));
    
    if (areaCoords) {
      console.log(`Applying area-specific proximity filter for "${smartFilters.filters.area}" at coords:`, areaCoords);
      
      const propertiesWithCoords = filteredProperties.filter(property => {
        const lat = parseFloat(property.latitude as string);
        const lng = parseFloat(property.longitude as string);
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
      });
      
      console.log(`Found ${propertiesWithCoords.length} properties with coordinates out of ${filteredProperties.length} total`);
      
      if (propertiesWithCoords.length > 0) {
        // Use a reasonable distance for area searches (10km radius) - more inclusive than before
        const maxDistanceKm = 10;
        console.log(`Filtering properties within ${maxDistanceKm}km of ${smartFilters.filters.area}`);
        
        const filteredByArea = propertiesWithCoords.filter(property => {
          const lat = parseFloat(property.latitude as string);
          const lng = parseFloat(property.longitude as string);
          const distance = calculateDistance(areaCoords.lat, areaCoords.lng, lat, lng);
          return distance <= maxDistanceKm;
        });
        
        console.log(`Area proximity filter result: ${filteredByArea.length} properties within ${maxDistanceKm}km of ${smartFilters.filters.area}`);
        
        // Apply area filter if we get any results at all
        if (filteredByArea.length > 0) {
          // Sort by distance from area center (nearest first)
          filteredProperties = filteredByArea.sort((a, b) => {
            const latA = parseFloat(a.latitude as string);
            const lngA = parseFloat(a.longitude as string);
            const latB = parseFloat(b.latitude as string);
            const lngB = parseFloat(b.longitude as string);
            const distA = calculateDistance(areaCoords.lat, areaCoords.lng, latA, lngA);
            const distB = calculateDistance(areaCoords.lat, areaCoords.lng, latB, lngB);
            return distA - distB;
          });
          proximitySorted = true; // Mark as proximity sorted to preserve distance order
          console.log(`📏 AREA DISTANCE SORT: Sorted ${filteredProperties.length} properties by distance from ${smartFilters.filters.area} center`);
        } else {
          console.log(`No properties found within ${maxDistanceKm}km - trying text-based filtering as fallback`);
          // Fallback to text-based filtering
          const beforeTextFilter = filteredProperties.length;
          filteredProperties = filteredProperties.filter(property => 
            property.city?.toLowerCase().includes(smartFilters.filters.area!.toLowerCase()) ||
            property.address?.toLowerCase().includes(smartFilters.filters.area!.toLowerCase()) ||
            property.title?.toLowerCase().includes(smartFilters.filters.area!.toLowerCase())
          );
          console.log(`Text-based fallback: ${filteredProperties.length} properties found for "${smartFilters.filters.area}" (from ${beforeTextFilter})`);
        }
      }
    } else {
      console.log(`No coordinates found for area "${smartFilters.filters.area}" - using text-based area filtering`);
      
      // Fallback: Apply text-based area filtering to property addresses/cities
      const beforeTextFilter = filteredProperties.length;
      const searchTerm = smartFilters.filters.area!.toLowerCase();
      
      // Enhanced text matching with fuzzy search capabilities
      filteredProperties = filteredProperties.filter(property => {
        const city = property.city?.toLowerCase() || '';
        const address = property.address?.toLowerCase() || '';
        const title = property.title?.toLowerCase() || '';
        
        // Direct matching
        if (city.includes(searchTerm) || address.includes(searchTerm) || title.includes(searchTerm)) {
          return true;
        }
        
        // Fuzzy matching for common location variations
        if (searchTerm.includes('mont') || searchTerm.includes('kiara')) {
          return city.includes('mont kiara') || address.includes('mont kiara') || title.includes('mont kiara');
        }
        
        if (searchTerm.includes('kpong')) {
          return city.includes('kepong') || address.includes('kepong') || title.includes('kepong');
        }
        
        return false;
      });
      console.log(`Text-based area filter: ${filteredProperties.length} properties found for "${smartFilters.filters.area}" (from ${beforeTextFilter})`);
    }
  }

  // Note: Proximity filtering and sorting is already handled above (lines 496-544)
  // The duplicate proximity filter has been removed to prevent re-sorting
  
  // Helper function to check if a property is currently featured
  const isFeatured = (property: any): boolean => {
    if (!property.featured) return false;
    if (!property.featuredUntil) return true; // No expiry date means always featured
    const now = new Date();
    const featuredUntil = new Date(property.featuredUntil);
    return featuredUntil > now;
  };
  
    // Apply sorting based on sortBy parameter or default to creation date
    // Skip sorting if proximity sorting was already applied
    if (proximitySorted && !sortBy) {
      // For proximity searches, DISTANCE is the PRIMARY criterion
      // Keep the distance-based sorting from filterPropertiesByDistance (nearest to furthest)
      // DO NOT re-sort by featured status - users searching by location want nearest properties first
      sortedProperties = filteredProperties;
      console.log(`📏 KEEPING PROXIMITY SORT: Preserving distance-based sorting for ${sortedProperties.length} properties (nearest to furthest)`);
    } else if (sortBy === 'price-low-high') {
      sortedProperties = [...filteredProperties].sort((a, b) => {
        // PRIORITY 0: Featured properties always first
        const aIsFeatured = isFeatured(a);
        const bIsFeatured = isFeatured(b);
        
        if (aIsFeatured && !bIsFeatured) return -1;
        if (!aIsFeatured && bIsFeatured) return 1;
        
        // Then price low to high
        return (parseFloat(a.price?.toString() || '0')) - (parseFloat(b.price?.toString() || '0'));
      });
      console.log(`💰 SORTED BY PRICE: Low to high for ${sortedProperties.length} properties (featured first)`);
    } else if (sortBy === 'price-high-low') {
      sortedProperties = [...filteredProperties].sort((a, b) => {
        // PRIORITY 0: Featured properties always first
        const aIsFeatured = isFeatured(a);
        const bIsFeatured = isFeatured(b);
        
        if (aIsFeatured && !bIsFeatured) return -1;
        if (!aIsFeatured && bIsFeatured) return 1;
        
        // Then price high to low
        return (parseFloat(b.price?.toString() || '0')) - (parseFloat(a.price?.toString() || '0'));
      });
      console.log(`💰 SORTED BY PRICE: High to low for ${sortedProperties.length} properties (featured first)`);
    } else {
      // Default: Sort by creation date (newest to oldest) for location/building searches
      sortedProperties = [...filteredProperties].sort((a, b) => {
        // PRIORITY 0: Featured properties always first
        const aIsFeatured = isFeatured(a);
        const bIsFeatured = isFeatured(b);
        
        if (aIsFeatured && !bIsFeatured) return -1;
        if (!aIsFeatured && bIsFeatured) return 1;
        
        // Then by date
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Most recent first
      });
      console.log(`📅 SORTED BY DATE: Newest to oldest for ${sortedProperties.length} properties (featured first)`);
    }
    
    // Cache the sorted result for future use
    SORT_CACHE.set(sortCacheKey, sortedProperties);
    console.log(`🕒 Optimized sorting for ${sortedProperties.length} properties (${sortBy || 'default'})`);
  } else {
    console.log(`⚡ SORT CACHE HIT: Reusing sorted results for ${sortedProperties.length} properties`);
  }
  
  const finalResult = {
    properties: sortedProperties,
    count: sortedProperties.length,
    filters: {
      ...filtersToApply,
      searchType: smartFilters.filters.searchType || 'general' // Ensure searchType is always included
    }, // Return the actual filters used for the search (including defaults)
    query,
  };
  
  // Cache the final search result for performance
  cacheSearchResults(query, searchType, finalResult.properties, finalResult.count, finalResult.filters, sortBy);
  
  const totalTime = Date.now() - searchStartTime;
  console.log(`✅ SEARCH COMPLETE: ${finalResult.count} properties found`);
  console.log(`⏱️  TOTAL SEARCH TIME: ${totalTime}ms`);
  console.log(`========== END SEARCH PERFORMANCE TRACKING ==========\n`);
  
  // Log search analytics for algorithm improvement tracking
  // TODO: Uncomment when search_analytics table is deployed to database
  /*
  try {
    await logSearchAnalytics({
      query,
      searchType,
      parsedFilters: smartFilters.filters,
      parsingMethod: cachedResult ? 'cache' : (aiParseStart ? 'gpt' : 'keyword'),
      parsingTimeMs: aiParseEnd ? aiParseEnd - aiParseStart : undefined,
      resultsCount: finalResult.count,
      databaseQueryTimeMs: dbQueryEnd ? dbQueryEnd - dbQueryStart : undefined,
      totalTimeMs: totalTime,
      cacheHit: !!cachedResult,
      locationDetected: smartFilters.filters.area || smartFilters.filters.city,
      geocodingSource: coordinates?.source,
      proximitySearch: !!smartFilters.proximityFilter,
      failureReason: finalResult.count === 0 ? 'no_results' : undefined,
    });
  } catch (err) {
    console.error('Failed to log search analytics:', err);
  }
  */
  
  return finalResult;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Calculate distance between two points using Haversine formula
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

export function estimateDrivingTime(distanceKm: number): number {
  // Simple estimation: assume average speed of 30 km/h in urban areas
  const averageSpeedKmh = 30;
  return Math.round((distanceKm / averageSpeedKmh) * 60); // Return minutes
}

// Malaysian cities and their approximate coordinates for location matching
export const malaysianLocations = {
  'kuala lumpur': { lat: 3.139, lng: 101.6869 },
  'klcc': { lat: 3.1578, lng: 101.7123 },
  'bukit bintang': { lat: 3.1478, lng: 101.7103 },
  'pavilion bukit bintang': { lat: 3.1472, lng: 101.7120 },
  'pavilion kl': { lat: 3.1472, lng: 101.7120 },
  'mont kiara': { lat: 3.1724, lng: 101.6505 },
  'mt kiara': { lat: 3.1724, lng: 101.6505 },
  'montkiara': { lat: 3.1724, lng: 101.6505 },
  'bangsar': { lat: 3.1319, lng: 101.6731 },
  'petaling jaya': { lat: 3.1073, lng: 101.6041 },
  'shah alam': { lat: 3.0733, lng: 101.5185 },
  'subang jaya': { lat: 3.0437, lng: 101.5810 },
  'cyberjaya': { lat: 2.9213, lng: 101.6559 },
  'putrajaya': { lat: 2.9264, lng: 101.6964 },
  'ampang': { lat: 3.1478, lng: 101.7635 },
  'cheras': { lat: 3.0319, lng: 101.7532 },
  'kepong': { lat: 3.2288, lng: 101.6424 },
  'kpong': { lat: 3.2288, lng: 101.6424 }, // Common typo for Kepong
  'sentul': { lat: 3.1853, lng: 101.6953 },
  'wangsa maju': { lat: 3.2016, lng: 101.7315 },
  'setapak': { lat: 3.2010, lng: 101.7185 },
  'sri hartamas': { lat: 3.1664, lng: 101.6379 },
  'damansara': { lat: 3.1540, lng: 101.5947 },
  'ara damansara': { lat: 3.1540, lng: 101.5947 },
  'lrt ara damansara': { lat: 3.1540, lng: 101.5947 },
  'mutiara damansara': { lat: 3.1520, lng: 101.5929 },
  'damansara utama': { lat: 3.1473, lng: 101.5882 },
  'kota damansara': { lat: 3.1627, lng: 101.5940 },
  'bandar utama': { lat: 3.1492, lng: 101.5770 },
  'bu': { lat: 3.1492, lng: 101.5770 },
  'b.u': { lat: 3.1492, lng: 101.5770 },
  'centrepoint bandar utama': { lat: 3.1492, lng: 101.5770 },
  'casa indah': { lat: 3.1627, lng: 101.5940 }, // Casa Indah in Kota Damansara
  'casa indah 1': { lat: 3.1627, lng: 101.5940 }, // Casa Indah in Kota Damansara
  'centrepoint bu': { lat: 3.1492, lng: 101.5770 },
  'bandar sri damansara': { lat: 3.1821, lng: 101.5869 },
  'sungai buloh': { lat: 3.2675, lng: 101.5830 },
  'hospital sungai buloh': { lat: 3.2675, lng: 101.5830 },
  'elmina': { lat: 3.1755, lng: 101.5115 },
  'elmina green': { lat: 3.1755, lng: 101.5115 },
  'elmina east': { lat: 3.1800, lng: 101.5140 },
  'elmina central': { lat: 3.1825, lng: 101.5120 },
  'elmina west': { lat: 3.1750, lng: 101.5095 },
  'temu elmina': { lat: 3.1785, lng: 101.5118 }, // Central point between all Elmina areas for better proximity coverage
  'elmina lakeside mall': { lat: 3.1755, lng: 101.5115 },
  'sunway giza': { lat: 3.0688, lng: 101.5983 },
  'sunway giza mall': { lat: 3.0688, lng: 101.5983 },
  'one utama': { lat: 3.1492, lng: 101.5770 },
  'one utama mall': { lat: 3.1492, lng: 101.5770 },
  'mid valley': { lat: 3.1176, lng: 101.6776 },
  'midvalley': { lat: 3.1176, lng: 101.6776 },
  'mid valley megamall': { lat: 3.1176, lng: 101.6776 },
  'gombak': { lat: 3.2570, lng: 101.6565 },
  'batu caves': { lat: 3.2370, lng: 101.6840 },
  
  // Major Malaysian cities outside Klang Valley
  'johor bahru': { lat: 1.4927, lng: 103.7414 },
  'jb': { lat: 1.4927, lng: 103.7414 },
  'penang': { lat: 5.4164, lng: 100.3327 },
  'george town': { lat: 5.4164, lng: 100.3327 },
  'georgetown': { lat: 5.4164, lng: 100.3327 },
  'ipoh': { lat: 4.5975, lng: 101.0901 },
  'kuching': { lat: 1.5533, lng: 110.3592 },
  'miri': { lat: 4.4148, lng: 113.9636 },
  'kota kinabalu': { lat: 5.9788, lng: 116.0753 },
  'kk': { lat: 5.9788, lng: 116.0753 },
  'malacca': { lat: 2.2055, lng: 102.2502 },
  'melaka': { lat: 2.2055, lng: 102.2502 },
  'kota bahru': { lat: 6.1254, lng: 102.2381 },
  'alor setar': { lat: 6.1254, lng: 100.3673 },
  'kuantan': { lat: 3.8126, lng: 103.3256 },
  'seremban': { lat: 2.7297, lng: 101.9381 },
  'kangar': { lat: 6.4414, lng: 100.1986 },
  'kuala terengganu': { lat: 5.3302, lng: 103.1408 },
  'sandakan': { lat: 5.8402, lng: 118.1174 },
  'tawau': { lat: 4.2515, lng: 117.8845 },
  'sibu': { lat: 2.3, lng: 111.8167 },
  'bintulu': { lat: 3.1667, lng: 113.0333 },
} as const;

/**
 * Quick coordinate lookup for Malaysian locations
 * Checks local malaysianLocations object first for fast, synchronous lookup
 * For more comprehensive geocoding with external services, use enhancedGeocodingService
 */
function getLocationCoordinates(locationName: string): { lat: number; lng: number } | null {
  const normalizedName = locationName.toLowerCase().trim();
  
  // First check exact match in malaysianLocations object
  if (malaysianLocations[normalizedName as keyof typeof malaysianLocations]) {
    return malaysianLocations[normalizedName as keyof typeof malaysianLocations];
  }
  
  // Check for partial matches in malaysianLocations
  for (const [key, coords] of Object.entries(malaysianLocations)) {
    if (key.includes(normalizedName) || normalizedName.includes(key)) {
      return coords;
    }
  }
  
  return null;
}

// Deprecated: Use getEnhancedGeocodingService().getLocationCoordinates() instead
// This function is kept for backward compatibility but should be replaced
export async function geocodeLocation(locationName: string): Promise<{ lat: number; lng: number } | null> {
  const { getEnhancedGeocodingService } = await import('./serviceSingletons');
  const result = await getEnhancedGeocodingService().getLocationCoordinates(locationName);
  return result ? { lat: result.lat, lng: result.lng } : null;
}


export interface ProximityFilter {
  targetLocation: { lat: number; lng: number };
  maxMinutes?: number;
  maxKilometers?: number;
  locationName?: string;
  travelMode?: 'driving' | 'walking' | 'transit' | 'bicycling';
}

export async function applyProximityFilter(properties: Property[], proximityFilter: ProximityFilter): Promise<Property[]> {
  const { targetLocation, maxMinutes, maxKilometers, locationName, travelMode = 'driving' } = proximityFilter;
  
  // Filter properties that have coordinates
  const propertiesWithCoords = properties.filter(property => 
    property.latitude && property.longitude
  );
  
  console.log(`Found ${propertiesWithCoords.length} properties with coordinates out of ${properties.length} total`);
  console.log('First few properties with coordinates:', propertiesWithCoords.slice(0, 3).map(p => ({
    title: p.title,
    lat: p.latitude,
    lng: p.longitude,
    latType: typeof p.latitude,
    lngType: typeof p.longitude
  })));
  
  if (propertiesWithCoords.length === 0) {
    return [];
  }
  
  // If we only have distance constraint and no time constraint, use simple distance calculation
  if (maxKilometers && !maxMinutes) {
    const propertiesWithDistance = propertiesWithCoords.map(property => {
      const distance = calculateDistance(
        targetLocation.lat,
        targetLocation.lng,
        parseFloat(property.latitude!),
        parseFloat(property.longitude!)
      );
      return { property, distance };
    }).filter(({ distance }) => distance <= maxKilometers);
    
    // Sort by distance (nearest to farthest)
    propertiesWithDistance.sort((a, b) => a.distance - b.distance);
    
    return propertiesWithDistance.map(({ property }) => property);
  }
  
  // For time-based filtering, use Haversine distance calculation
  if (maxMinutes) {
    try {
      console.log(`Filtering ${propertiesWithCoords.length} properties by travel time:`, {
        targetLocation,
        maxMinutes,
        travelMode,
        locationName
      });
      
      const validProperties = await filterPropertiesByTravelTime(
        propertiesWithCoords,
        targetLocation,
        maxMinutes,
        travelMode
      );
      
      // Sort by distance for time-based queries too (nearest to farthest)
      const propertiesWithDistance = validProperties.map(property => {
        const distance = calculateDistance(
          targetLocation.lat,
          targetLocation.lng,
          parseFloat(property.latitude!),
          parseFloat(property.longitude!)
        );
        return { property, distance };
      });
      
      propertiesWithDistance.sort((a, b) => a.distance - b.distance);
      return propertiesWithDistance.map(({ property }) => property);
    } catch (error) {
      console.error('Error filtering by travel time:', error);
      // For time-based queries, if OpenRouteService API fails, return empty results rather than fallback
      // This prevents showing potentially incorrect results
      console.log('Time-based filtering failed, returning empty results to maintain accuracy');
      return [];
    }
  }
  
  return propertiesWithCoords;
}

// OpenRouteService Distance Matrix API integration
async function filterPropertiesByTravelTime(
  properties: Property[],
  origin: { lat: number; lng: number },
  maxMinutes: number,
  travelMode: 'driving' | 'walking' | 'transit' | 'bicycling'
): Promise<Property[]> {
  const { geocodingService } = await import('./geocoding');
  
  // Map travel modes for OpenRouteService
  const modeMap: Record<string, 'driving' | 'walking' | 'cycling'> = {
    'driving': 'driving',
    'walking': 'walking',
    'transit': 'driving', // Use driving for transit as OpenRoute doesn't have transit
    'bicycling': 'cycling'
  };
  
  const openRouteMode = modeMap[travelMode] || 'driving';
  const validProperties: Property[] = [];

  try {
    // Prepare destinations
    const destinations = properties.map(p => ({
      lat: parseFloat(p.latitude || '0'),
      lng: parseFloat(p.longitude || '0')
    }));

    console.log(`Calculating travel times for ${destinations.length} properties using OpenRouteService`);
    
    // Get distance matrix using OpenRouteService
    const results = await geocodingService.getDistanceMatrix(origin, destinations, openRouteMode);

    for (let i = 0; i < results.length && i < properties.length; i++) {
      const result = results[i];
      const property = properties[i];

      if (result && result.duration <= maxMinutes) {
        console.log(`✓ Property ${property.title} passes filter: ${result.duration}min <= ${maxMinutes}min`);
        console.log(`   Location: ${property.latitude}, ${property.longitude} | Distance: ${(result.distance / 1000).toFixed(1)} km`);
        
        // Add travel time info to property for display
        const propertyWithTime = {
          ...property,
          travelTime: {
            duration: result.duration,
            distance: `${(result.distance / 1000).toFixed(1)} km`,
            mode: travelMode
          }
        };
        validProperties.push(propertyWithTime);
      } else if (result) {
        console.log(`✗ Property ${property.title} too far: ${result.duration}min > ${maxMinutes}min`);
      } else {
        console.log(`Could not calculate travel time for property ${property.title}`);
      }
    }
  } catch (error) {
    console.error('Error calculating travel times with OpenRouteService:', error);
    throw error;
  }

  // Sort properties by travel time (nearest first)
  validProperties.sort((a: any, b: any) => {
    const aDuration = a.travelTime?.duration || 0;
    const bDuration = b.travelTime?.duration || 0;
    return aDuration - bDuration;
  });
  
  console.log(`Travel time filtering result: ${validProperties.length}/${properties.length} properties within ${maxMinutes} minutes by ${travelMode}`);
  return validProperties;
}

// Estimate maximum distance based on travel time and mode
function estimateMaxDistanceFromTime(minutes: number, travelMode: string): number {
  const speedMap = {
    driving: 20, // km/h average in Malaysian urban traffic (more realistic)
    walking: 5,  // km/h average walking speed
    bicycling: 15, // km/h average cycling speed
    transit: 15   // km/h average public transport speed in Malaysia
  };
  
  const speed = speedMap[travelMode as keyof typeof speedMap] || 20;
  return (minutes / 60) * speed;
}

/**
 * Validate if a search query is meaningful for local parsing (same logic as AI parsing)
 */
function isValidLocalSearchQuery(query: string): boolean {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Reject very short queries
  if (normalizedQuery.length < 2) {
    return false;
  }
  
  // Check vowel/consonant ratio - nonsensical text often has too few vowels
  const vowelCount = (normalizedQuery.match(/[aeiou]/g) || []).length;
  const consonantCount = (normalizedQuery.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
  const totalLetters = vowelCount + consonantCount;
  
  // If it's mostly letters but has very few vowels, likely nonsensical
  if (totalLetters > 4 && vowelCount < totalLetters * 0.2) {
    console.log(`🚫 LOCAL QUERY REJECTED: "${query}" has too few vowels (${vowelCount}/${totalLetters})`);
    return false;
  }
  
  // Check for consecutive consonants indicating gibberish
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/.test(normalizedQuery)) {
    console.log(`🚫 LOCAL QUERY REJECTED: "${query}" has too many consecutive consonants`);
    return false;
  }
  
  // Reject if contains only special characters or numbers
  if (/^[\d\s\-_!@#$%^&*()]+$/.test(normalizedQuery)) {
    return false;
  }
  
  // Check if it contains any meaningful terms that could be property-related
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
    'rent', 'sale', 'buy', 'price', 'rm', 'bedroom', 'bathroom', 'parking',
    
    // Transport terms
    'mrt', 'lrt', 'ktm', 'monorail', 'brt', 'station', 'transport',
    
    // General building names that could exist
    'the', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 
    'first', 'second', 'third', 'new', 'old', 'grand', 'royal', 'golden', 'silver',
    'green', 'blue', 'red', 'white', 'park', 'garden', 'view', 'height', 'hill',
    'valley', 'river', 'lake', 'sea', 'bay', 'island', 'square', 'circle'
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
    console.log(`🚫 LOCAL QUERY REJECTED: "${query}" appears to be random characters`);
    return false;
  }
  
  return true;
}

// Smart local parsing without OpenAI
async function parseQueryLocally(query: string, searchType: 'rent' | 'buy' = 'rent'): Promise<{ searchText: string; filters: any; proximityFilter?: ProximityFilter }> {
  // VALIDATION: Reject obviously invalid queries before processing
  if (!isValidLocalSearchQuery(query)) {
    console.log(`🚫 LOCAL PARSER REJECTED: "${query}" is not a valid search term`);
    throw new Error(`Invalid search query: "${query}" is not a valid property search term`);
  }

  const lowercaseQuery = query.toLowerCase();
  const filters: any = {}; // Remove status filter to see all properties
  let searchText = '';
  let proximityFilter: ProximityFilter | undefined;

  // Determine searchType based on query pattern
  // Building searches: specific building names (usually title-cased or proper nouns)
  // General searches: generic intent like "units for rent", "3 bedroom house", etc.
  
  const isGeneralIntent = (
    lowercaseQuery.includes('units for') ||
    lowercaseQuery.includes('properties for') ||
    lowercaseQuery.includes('houses for') ||
    lowercaseQuery.includes('apartments for') ||
    lowercaseQuery.includes('condos for') ||
    lowercaseQuery.includes('bedroom') ||
    lowercaseQuery.includes('bathroom') ||
    lowercaseQuery.includes('under rm') ||
    lowercaseQuery.includes('below rm') ||
    lowercaseQuery.includes('rent in') ||
    lowercaseQuery.includes('sale in') ||
    lowercaseQuery.includes('near ') ||
    lowercaseQuery.includes('with ') ||
    (lowercaseQuery.length > 3 && (lowercaseQuery.includes('for rent') || lowercaseQuery.includes('for sale')))
  );
  
  // Check if it looks like a specific building name (contains capital letters, doesn't match general patterns)
  const hasProperNoun = query !== lowercaseQuery; // Has capital letters
  const isShortPhrase = query.trim().split(' ').length <= 3;
  const isBuildingName = hasProperNoun && isShortPhrase && !isGeneralIntent;
  
  filters.searchType = isBuildingName ? 'building' : 'general';
  
  console.log(`Local parser - Query: "${query}"`);
  console.log(`Local parser - isGeneralIntent: ${isGeneralIntent}, hasProperNoun: ${hasProperNoun}, isShortPhrase: ${isShortPhrase}`);
  console.log(`Local parser - Final searchType: ${filters.searchType}`);
  
  // Set default listing type based on searchType parameter
  filters.listingType = searchType === 'buy' ? 'sale' : 'rent';
  
  // Override if query explicitly specifies listing type
  if (lowercaseQuery.includes('for rent') || lowercaseQuery.includes('to rent') || lowercaseQuery.includes('rental') || lowercaseQuery.includes('/month')) {
    filters.listingType = 'rent';
  } else if (lowercaseQuery.includes('for sale') || lowercaseQuery.includes('to buy') || lowercaseQuery.includes('purchase') || lowercaseQuery.includes('buying') || lowercaseQuery.includes('sale') || lowercaseQuery.includes('want buy') || lowercaseQuery.includes('buy ')) {
    filters.listingType = 'sale';
  }
  
  
  // Extract property types with expanded mappings
  const propertyTypeMap = {
    // Landed house types - must be checked before 'land' to avoid conflicts
    'house': ['house', 'bungalow', 'terraced-house', 'semi-detached-house', 'cluster-house', 'townhouse', '1-storey-terrace', '1.5-storey-terrace', '2-storey-terrace', '2.5-storey-terrace', '3-storey-terrace', '3.5-storey-terrace', '4-storey-terrace', '4.5-storey-terrace', 'zero-lot-bungalow', 'link-bungalow'],
    'houses': ['house', 'bungalow', 'terraced-house', 'semi-detached-house', 'cluster-house', 'townhouse', '1-storey-terrace', '1.5-storey-terrace', '2-storey-terrace', '2.5-storey-terrace', '3-storey-terrace', '3.5-storey-terrace', '4-storey-terrace', '4.5-storey-terrace', 'zero-lot-bungalow', 'link-bungalow'],
    'landed': ['house', 'bungalow', 'terraced-house', 'semi-detached-house', 'cluster-house', 'townhouse'],
    'landed house': ['house', 'bungalow', 'terraced-house', 'semi-detached-house', 'cluster-house', 'townhouse'],
    'landed houses': ['house', 'bungalow', 'terraced-house', 'semi-detached-house', 'cluster-house', 'townhouse'],
    'landed property': ['house', 'bungalow', 'terraced-house', 'semi-detached-house', 'cluster-house', 'townhouse'],
    'landed properties': ['house', 'bungalow', 'terraced-house', 'semi-detached-house', 'cluster-house', 'townhouse'],
    
    // Industrial property type mappings - key fix for warehouse/factory searches
    'warehouse': ['warehouse', 'factory', 'industrial'],
    'factory': ['factory', 'warehouse', 'industrial'],
    'industrial': ['industrial', 'factory', 'warehouse'],
    // Basic types
    'condo': 'condominium',
    'villa': 'bungalow',
    'bungalow': 'bungalow',
    'terrace': 'terraced-house',
    'terrace house': 'terraced-house',
    'terrace houses': 'terraced-house',
    'terraced house': 'terraced-house',
    'terraced houses': 'terraced-house',
    'link': 'terraced-house',
    'semi-detached': 'semi-detached-house',
    'semi detached': 'semi-detached-house',
    'cluster': 'cluster-house',
    'flat': 'flat',
    'service residence': 'service-residence',
    'serviced residence': 'service-residence',
    // Commercial building types - must be checked before 'commercial' in basicTypes
    'commercial building': ['commercial', 'office', 'shop', 'retail-space'],
    'commercial buildings': ['commercial', 'office', 'shop', 'retail-space'],
    'commercial property': ['commercial', 'office', 'shop', 'retail-space'],
    'commercial properties': ['commercial', 'office', 'shop', 'retail-space'],
    // Specific commercial subsectors - fallback to 'commercial' since database uses broad categories
    'office': ['office', 'commercial'],  // Search for office first, fallback to commercial
    'office building': ['office', 'commercial'],
    'office buildings': ['office', 'commercial'],
    'office space': ['office', 'commercial'],
    'office spaces': ['office', 'commercial'],
    'shop': ['shop', 'commercial'],  // Search for shop first, fallback to commercial
    'shops': ['shop', 'commercial'],
    'retail': ['retail-space', 'commercial'],
    'retail space': ['retail-space', 'commercial'],
    'shopping mall': ['retail-space', 'commercial'],
    'shopping centre': ['retail-space', 'commercial'],
    'sofo': 'sofo',
    'soho': 'soho',
    'sovo': 'sovo',
    'hotel': 'hotel-resort',
    'resort': 'hotel-resort',
    // Remove duplicate industrial types as they're already handled above
    'industrial land': 'industrial-land',
    'agricultural': 'agricultural-land',
    'agricultural land': 'agricultural-land',
    // Land types (should be last to avoid conflicts with 'landed')
    'residential land': 'residential-land-plot',
    'commercial land': 'commercial-land',
    'bungalow land': 'bungalow-land',
  };

  for (const [searchTerm, mappedType] of Object.entries(propertyTypeMap)) {
    if (lowercaseQuery.includes(searchTerm)) {
      // Handle both single property types and arrays of property types
      if (Array.isArray(mappedType)) {
        filters.propertyType = mappedType;
      } else {
        filters.propertyType = [mappedType];
      }
      console.log(`🏭 WAREHOUSE DEBUG: Detected property type mapping: "${searchTerm}" -> ${JSON.stringify(mappedType)}`);
      console.log(`🏭 WAREHOUSE DEBUG: Final propertyType filter: ${JSON.stringify(filters.propertyType)}`);
      break;
    }
  }
  
  // Also check for basic property types that don't need mapping
  // Note: 'office', 'shop', 'retail' are handled in propertyTypeMap with fallbacks
  const basicTypes = ['apartment', 'condominium', 'house', 'studio', 'townhouse', 'commercial', 'industrial', 'land'];
  for (const type of basicTypes) {
    if (lowercaseQuery.includes(type) && !filters.propertyType) {
      filters.propertyType = [type];
      console.log(`Detected basic property type: "${type}"`);
      break;
    }
  }

  // Extract legal information filters
  // Tenure - check for freehold/leasehold
  if (lowercaseQuery.includes('freehold')) {
    filters.tenure = ['freehold'];
    console.log('Detected tenure: freehold');
  } else if (lowercaseQuery.includes('leasehold')) {
    filters.tenure = ['leasehold'];
    console.log('Detected tenure: leasehold');
  }

  // Title Type - check for individual/strata/master
  if (lowercaseQuery.includes('individual title') || lowercaseQuery.includes('individual')) {
    filters.titleType = ['individual'];
    console.log('Detected title type: individual');
  } else if (lowercaseQuery.includes('strata title') || lowercaseQuery.includes('strata')) {
    filters.titleType = ['strata'];
    console.log('Detected title type: strata');
  } else if (lowercaseQuery.includes('master title') || lowercaseQuery.includes('master')) {
    filters.titleType = ['master'];
    console.log('Detected title type: master');
  }

  // Land Title Type - check for residential/commercial/industrial/agriculture
  // Only set land title type if no specific property type was already set
  if (lowercaseQuery.includes('residential land') || 
      (lowercaseQuery.includes('residential') && !lowercaseQuery.includes('non-residential') && !filters.propertyType)) {
    filters.landTitleType = ['residential'];
    console.log('Detected land title type: residential');
  } else if (lowercaseQuery.includes('commercial land') || 
             (lowercaseQuery.includes('commercial') && !lowercaseQuery.includes('non-commercial') && !filters.propertyType)) {
    filters.landTitleType = ['commercial'];
    console.log('Detected land title type: commercial');
  } else if (lowercaseQuery.includes('industrial land') || 
             (lowercaseQuery.includes('industrial') && !lowercaseQuery.includes('non-industrial'))) {
    filters.landTitleType = ['industrial'];
    console.log('Detected land title type: industrial');
  } else if (lowercaseQuery.includes('agriculture') || lowercaseQuery.includes('agricultural')) {
    filters.landTitleType = ['agriculture'];
    console.log('Detected land title type: agriculture');
  }
  
  // Extract locations with priority for specific areas over general ones
  const locations = Object.keys(malaysianLocations);
  
  // Define location priority groups - more specific locations take precedence
  const highPriorityLocations = [
    'elmina', 'elmina green', 'elmina east', 'elmina central', 'elmina west', 'elmina lakeside mall',
    'mont kiara', 'sri hartamas', 'kepong', 'mutiara damansara', 'damansara utama', 'kota damansara', 
    'bandar utama', 'bandar sri damansara', 'centrepoint bandar utama', 'centrepoint bu'
  ];
  
  const mediumPriorityLocations = [
    'damansara', 'petaling jaya', 'sungai buloh', 'subang jaya', 'cyberjaya'
  ];
  
  const lowPriorityLocations = [
    'shah alam', 'kuala lumpur', 'kl', 'ampang', 'cheras'
  ];
  
  // Check high priority locations first
  const allLocationsByPriority = [
    ...highPriorityLocations,
    ...mediumPriorityLocations, 
    ...lowPriorityLocations,
    ...locations.filter(loc => 
      !highPriorityLocations.includes(loc) && 
      !mediumPriorityLocations.includes(loc) && 
      !lowPriorityLocations.includes(loc)
    )
  ];
  
  // Find all matching locations and prioritize by length (longer matches are more specific)
  const matchingLocations = allLocationsByPriority.filter(location => 
    lowercaseQuery.includes(location)
  );
  
  // Sort by length (descending) to prioritize longer, more specific matches
  matchingLocations.sort((a, b) => b.length - a.length);
  
  if (matchingLocations.length > 0) {
    const location = matchingLocations[0]; // Take the longest/most specific match
    console.log(`Location match found: "${location}" in query: "${lowercaseQuery}"`);
    console.log(`Location "${location}" priority: ${
      highPriorityLocations.includes(location) ? 'HIGH' :
      mediumPriorityLocations.includes(location) ? 'MEDIUM' :
      lowPriorityLocations.includes(location) ? 'LOW' : 'UNLISTED'
    }`);
    if (matchingLocations.length > 1) {
      console.log(`Other potential matches (ignored):`, matchingLocations.slice(1));
    }
    // Use the original location name for search (not normalized)
    searchText = location; // Use the original lowercase for text search

      // Set city filter for exact location matching
      if (location === 'kepong') {
        filters.city = 'Kepong';
      } else if (location === 'mont kiara') {
        filters.city = 'Mont Kiara';
      } else if (location === 'sri hartamas') {
        // Sri Hartamas properties are found in addresses, use text search only
        searchText = 'sri hartamas';
        // Don't set city filter to avoid conflicts
      } else if (location === 'kuala lumpur' || location === 'kl') {
        filters.city = 'Kuala Lumpur';
      } else if (location === 'elmina' || location.includes('elmina')) {
        filters.city = 'Elmina';
        console.log(`Set city filter to Elmina for location: ${location}`);
      } else if (location === 'mutiara damansara') {
        // Mutiara Damansara properties are found in addresses, use text search only
        searchText = 'mutiara damansara';

        // Don't set city filter to avoid conflicts, let text search handle it
      } else if (location === 'kota damansara') {
        filters.city = 'Kota Damansara';
      } else if (location === 'damansara utama') {
        // Damansara Utama properties are found in addresses, use text search only
        searchText = 'damansara utama';
      } else if (location === 'bandar sri damansara') {
        filters.city = 'Bandar Sri Damansara';
      } else if (location === 'damansara') {
        filters.city = 'Damansara';
      } else if (location === 'petaling jaya') {
        filters.city = 'Petaling Jaya';
      } else if (location === 'shah alam') {
        filters.city = 'Shah Alam';
        console.log(`Set city filter to Shah Alam for location: ${location}`);
      }
      console.log(`Final filters after location match:`, filters);
  }
  
  // Extract square footage/built-up area filters FIRST (before price parsing to avoid conflicts)
  const sqftMinMatches = lowercaseQuery.match(/(?:more than|above|over|minimum|min|at least)\s+(?:built\s*up\s*)?(\d+(?:,\d+)*)(k)?\s*(?:sq\s*ft|sqft|square\s*feet|sf)/i);
  if (sqftMinMatches) {
    let minSqft = parseInt(sqftMinMatches[1].replace(/,/g, ''));
    // Handle 'k' suffix for thousands (e.g., "1k sqft" = 1000 sqft)
    if (sqftMinMatches[2]) {
      minSqft = minSqft * 1000;
    }
    filters.minSquareFeet = minSqft;
  }
  
  const sqftMaxMatches = lowercaseQuery.match(/(?:less than|below|under|maximum|max|up to)\s+(?:built\s*up\s*)?(\d+(?:,\d+)*)(k)?\s*(?:sq\s*ft|sqft|square\s*feet|sf)/i);
  if (sqftMaxMatches) {
    let maxSqft = parseInt(sqftMaxMatches[1].replace(/,/g, ''));
    // Handle 'k' suffix for thousands
    if (sqftMaxMatches[2]) {
      maxSqft = maxSqft * 1000;
    }
    filters.maxSquareFeet = maxSqft;
  }

  // Extract price ranges - improved to handle RM currency prefix and k/K suffix
  // Always parse prices regardless of proximity patterns, but exclude time/distance units
  console.log('Regular price parsing for query:', lowercaseQuery);
  const priceMatches = lowercaseQuery.match(/(?:under|below|less than|<)\s*(?:rm)?\s*(\d+(?:\.\d+)?(?:,\d+)*)(k)?(?!\s*(?:sq\s*ft|sqft|square\s*feet|sf|min|mins|minutes|hour|hours|km|kilometers?))/i);
  
  // Check for "within" only when it's clearly about price, not time/distance
  const withinPriceMatches = lowercaseQuery.match(/(?:within)\s*(?:rm|budget|price|budget\s+of|price\s+range\s+of)\s*(\d+(?:\.\d+)?(?:,\d+)*)(k)?/i);
  
  console.log('Regular price matches:', priceMatches);
  console.log('Within price matches:', withinPriceMatches);
  if (priceMatches) {
    let maxPrice = parseFloat(priceMatches[1].replace(/,/g, ''));
    // Handle 'k' or 'K' suffix for thousands (e.g., "2.5k" = 2500)
    if (priceMatches[2]) {
      maxPrice = maxPrice * 1000;
    }
    filters.maxPrice = maxPrice;
    console.log(`Regular price filter: maxPrice = ${maxPrice} (from "${priceMatches[0]}")`);
  } else if (withinPriceMatches) {
    let maxPrice = parseFloat(withinPriceMatches[1].replace(/,/g, ''));
    // Handle 'k' or 'K' suffix for thousands (e.g., "2.5k" = 2500)
    if (withinPriceMatches[2]) {
      maxPrice = maxPrice * 1000;
    }
    filters.maxPrice = maxPrice;
    console.log(`Within price filter: maxPrice = ${maxPrice} (from "${withinPriceMatches[0]}")`);
  }
  
  const priceAboveMatches = lowercaseQuery.match(/(?:above|over|more than|>)\s*(?:rm)?\s*(\d+(?:,\d+)*)(k)?(?!\s*(?:sq\s*ft|sqft|square\s*feet|sf))/i);
  if (priceAboveMatches) {
    let minPrice = parseInt(priceAboveMatches[1].replace(/,/g, ''));
    // Handle 'k' or 'K' suffix for thousands
    if (priceAboveMatches[2]) {
      minPrice = minPrice * 1000;
    }
    filters.minPrice = minPrice;
  }
  
  // Extract price ranges like "RM2000-3000" or "2000 to 3000" with k suffix support
  const rangeMaches = lowercaseQuery.match(/(?:rm)?\s*(\d+(?:,\d+)*)(k)?\s*[-to]\s*(?:rm)?\s*(\d+(?:,\d+)*)(k)?/i);
  if (rangeMaches) {
    let minPrice = parseInt(rangeMaches[1].replace(/,/g, ''));
    let maxPrice = parseInt(rangeMaches[3].replace(/,/g, ''));
    
    // Handle 'k' suffix for min price
    if (rangeMaches[2]) {
      minPrice = minPrice * 1000;
    }
    // Handle 'k' suffix for max price
    if (rangeMaches[4]) {
      maxPrice = maxPrice * 1000;
    }
    
    filters.minPrice = minPrice;
    filters.maxPrice = maxPrice;
  }
  
  // Extract bedroom counts
  const bedroomMatches = lowercaseQuery.match(/(\d+)[\s-]*(bed|bedroom|br)/);
  if (bedroomMatches) {
    filters.bedrooms = parseInt(bedroomMatches[1]);
    console.log(`Explicit bedroom count found: ${filters.bedrooms}`);
  }
  
  console.log(`Checking family size patterns in query: "${lowercaseQuery}"`);
  // Infer bedroom requirements from family size - multiple patterns
  let familySize = null;
  
  // Pattern 1: "family of X"
  const familyOf = lowercaseQuery.match(/family\s+of\s+(\d+)/i);
  if (familyOf) {
    familySize = parseInt(familyOf[1]);
  }
  
  // Pattern 2: "X people family" 
  const peopleFamily = lowercaseQuery.match(/(\d+)\s+people\s+family/i);
  if (peopleFamily) {
    familySize = parseInt(peopleFamily[1]);
  }
  
  // Pattern 3: "X person family"
  const personFamily = lowercaseQuery.match(/(\d+)\s+person\s+family/i);
  if (personFamily) {
    familySize = parseInt(personFamily[1]);
  }
  
  // Pattern 4: "family with X people"
  const familyWith = lowercaseQuery.match(/family\s+with\s+(\d+)\s+people/i);
  if (familyWith) {
    familySize = parseInt(familyWith[1]);
  }
  
  // Pattern 5: "X member family"
  const memberFamily = lowercaseQuery.match(/(\d+)\s+member\s+family/i);
  if (memberFamily) {
    familySize = parseInt(memberFamily[1]);
  }
  
  // Apply bedroom inference if family size detected and no explicit bedroom count
  if (familySize && !filters.bedrooms) {
    console.log(`Family size detected: ${familySize} people - inferring bedroom requirements`);
    // Estimate bedroom needs: 1-2 people = 1 bedroom, 3 people = 2 bedrooms, 4-5 people = 3 bedrooms, 6+ people = 4 bedrooms
    if (familySize <= 2) {
      filters.bedrooms = 1;
    } else if (familySize === 3) {
      filters.bedrooms = 2;
    } else if (familySize <= 5) {
      filters.bedrooms = 3;
    } else {
      filters.bedrooms = 4;
    }
    console.log(`Inferred ${filters.bedrooms} bedrooms for ${familySize} people`);
  }
  
  // Extract bathroom counts
  const bathroomMatches = lowercaseQuery.match(/(\d+)[\s-]*(bath|bathroom|ba)/);
  if (bathroomMatches) {
    filters.bathrooms = parseInt(bathroomMatches[1]);
  }
  

  
  // Extract exact square footage requirements
  const sqftExactMatches = lowercaseQuery.match(/(\d+(?:,\d+)*)\s*(?:sq\s*ft|sqft|square\s*feet|sf)(?:\s+(?:built\s*up|area))?/i);
  if (sqftExactMatches && !sqftMinMatches && !sqftMaxMatches) {
    filters.minSquareFeet = parseInt(sqftExactMatches[1].replace(/,/g, ''));
  }

  
  // Extract amenities - but only apply strict amenity filtering for specific keywords that commonly appear in property listings
  // For less common amenities like "garden", we'll rely on description/title matching instead
  const strictAmenityKeywords = ['gym', 'pool', 'swimming', 'parking', 'security', 'playground', 'tennis'];
  const foundAmenities = strictAmenityKeywords.filter(amenity => lowercaseQuery.includes(amenity));
  if (foundAmenities.length > 0) {
    filters.amenities = foundAmenities;
  }
  
  // For garden/outdoor space, check if mentioned but don't add to strict amenities filter
  // This allows for more flexible matching in title/description
  if (lowercaseQuery.includes('garden') || lowercaseQuery.includes('outdoor')) {
    // Don't add to amenities filter, let it match through text search or description
  }

  
  // Helper function to clean location names
  const cleanLocationName = (locationName: string): string => {
    return locationName
      // Remove travel mode keywords
      .replace(/\b(walking|driving|cycling|biking|transit|public transport)\s*(distance)?\b/gi, '')
      // Remove price constraints
      .replace(/\b(below|under|above|over|around|approximately|about|max|maximum|min|minimum)\s*(rm|ringgit|k|thousand)?\s*[\d.,]+\s*(k|thousand|rm|ringgit|budget)?\b/gi, '')
      // Remove standalone budget/price keywords
      .replace(/\b(budget|price|cost|rent|rental)\b/gi, '')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Check for proximity-based searches with enhanced travel mode detection
  // Patterns like "1 hour driving distance from Bandar Sri Damansara" or "5km from KLCC"
  const distanceWithModePattern = /(\d+)\s*(min|mins|minutes|hour|hours|km|kilometers?)\s+(driving|walking|cycling|biking|transit|public transport)\s+(?:distance\s+)?(?:near|from|to)\s+([^,]+)/i;
  const proximityPattern = /(\d+)\s*(min|mins|minutes|hour|hours|km|kilometers?)\s+(?:near|from|to)\s+([^,]+)/i;
  const nearPattern = /(?:near|close to|around)\s+([^,\d]+?)(?:\s+(?:within|in)\s+(\d+)\s*(min|mins|minutes|hour|hours|km|kilometers?))?$/i;
  // New pattern: "near [location] [time] away" format
  const nearAwayPattern = /(?:near|close to|around)\s+(.+?)\s+(\d+)\s*(min|mins|minutes|hour|hours|km|kilometers?)\s+away/i;
  // Pattern for "[time] away near [location]" format
  const timeAwayNearPattern = /(\d+)\s*(min|mins|minutes|hour|hours|km|kilometers?)\s+away\s+(?:near|from|to)\s+(.+)/i;
  // New pattern: "near [location] [travel mode] distance [time] away" format
  const nearModeDistancePattern = /(?:near|close to|around)\s+(.+?)\s+(walking|driving|cycling|biking|transit|public transport)\s+distance\s+(\d+)\s*(min|mins|minutes|hour|hours|km|kilometers?)\s+away/i;
  // Pattern for "near your location" or similar user-location-based queries
  const nearYourLocationPattern = /(?:near|close to|around)\s+(?:your|my)\s+(?:location|area|place|here)(?:\s+(\d+)\s*(min|mins|minutes|hour|hours|km|kilometers?)\s+away)?/i;
  // Pattern for "X mins from me" format
  const timeFromMePattern = /(\d+)\s*(min|mins|minutes|hour|hours|km|kilometers?)\s+from\s+(?:me|my\s+location|here)/i;
  // Pattern for "within X minutes from location" format
  const withinTimeFromPattern = /within\s+(\d+)\s*(min|mins|minutes|hour|hours|km|kilometers?)\s+(?:from|of)\s+(.+)/i;
  // Pattern for "X mins away from location" format
  const timeAwayFromPattern = /(\d+)\s*(min|mins|minutes|hour|hours|km|kilometers?)\s+away\s+from\s+(.+)/i;
  let distanceWithModeMatch = lowercaseQuery.match(distanceWithModePattern);
  let proximityMatch = lowercaseQuery.match(proximityPattern);
  let nearMatch = lowercaseQuery.match(nearPattern);
  let nearAwayMatch = lowercaseQuery.match(nearAwayPattern);
  let timeAwayNearMatch = lowercaseQuery.match(timeAwayNearPattern);
  let nearModeDistanceMatch = lowercaseQuery.match(nearModeDistancePattern);
  let nearYourLocationMatch = lowercaseQuery.match(nearYourLocationPattern);
  let timeFromMeMatch = lowercaseQuery.match(timeFromMePattern);
  let withinTimeFromMatch = lowercaseQuery.match(withinTimeFromPattern);
  let timeAwayFromMatch = lowercaseQuery.match(timeAwayFromPattern);
  

  
  if (distanceWithModeMatch || nearMatch || proximityMatch || nearAwayMatch || timeAwayNearMatch || nearModeDistanceMatch || nearYourLocationMatch || timeFromMeMatch || withinTimeFromMatch || timeAwayFromMatch) {
    let targetLocationName: string | undefined;
    let maxTime: number | undefined;
    let maxDistance: number | undefined;
    let travelMode: 'driving' | 'walking' | 'transit' | 'bicycling' = 'driving';
    
    if (nearYourLocationMatch) {
      // Handle "near your location [time/distance] away" pattern
      // Use Elmina as reference (user mentioned they're in Elmina)
      targetLocationName = 'elmina'; // Use lowercase to match malaysianlocation keys
      
      // Check if time/distance constraint is provided
      if (nearYourLocationMatch[1]) {
        const value = parseInt(nearYourLocationMatch[1]);
        const unit = nearYourLocationMatch[2].toLowerCase();
        
        if (unit.includes('min')) {
          maxTime = value;
        } else if (unit.includes('hour')) {
          maxTime = value * 60; // Convert hours to minutes
        } else if (unit.includes('km')) {
          maxDistance = value;
        }
      } else {
        maxDistance = 10; // Default to 10km radius from user location
      }
    } else if (timeFromMeMatch) {
      // Handle "10 mins from me" pattern
      // Use Gombak as reference (user mentioned they're in Gombak)
      targetLocationName = 'elmina';
      
      const value = parseInt(timeFromMeMatch[1]);
      const unit = timeFromMeMatch[2].toLowerCase();
      
      if (unit.includes('min')) {
        maxTime = value;
      } else if (unit.includes('hour')) {
        maxTime = value * 60; // Convert hours to minutes
      } else if (unit.includes('km')) {
        maxDistance = value;
      }
    } else if (withinTimeFromMatch) {
      // Handle "within X minutes from location" format
      const value = parseInt(withinTimeFromMatch[1]);
      const unit = withinTimeFromMatch[2].toLowerCase();
      targetLocationName = cleanLocationName(withinTimeFromMatch[3]);
      
      console.log(`Parsed withinTimeFromMatch: value=${value}, unit=${unit}, original location="${withinTimeFromMatch[3]}", cleaned="${targetLocationName}"`);
      
      if (unit.includes('min')) {
        maxTime = value;
      } else if (unit.includes('hour')) {
        maxTime = value * 60; // Convert hours to minutes
      } else if (unit.includes('km')) {
        maxDistance = value;
      }
    } else if (timeAwayFromMatch) {
      // Handle "X mins away from location" pattern
      const value = parseInt(timeAwayFromMatch[1]);
      const unit = timeAwayFromMatch[2].toLowerCase();
      const originalLocationName = timeAwayFromMatch[3].trim();
      
      // Clean the location name
      targetLocationName = cleanLocationName(originalLocationName);
      
      console.log(`Parsed timeAwayFromMatch: value=${value}, unit=${unit}, original location="${originalLocationName}", cleaned="${targetLocationName}"`);
      
      if (unit.includes('min')) {
        maxTime = value;
      } else if (unit.includes('hour')) {
        maxTime = value * 60; // Convert hours to minutes
      } else if (unit.includes('km')) {
        maxDistance = value;
      }
    } else if (distanceWithModeMatch) {
      // Handle "1 hour driving distance from Bandar Sri Damansara"
      const value = parseInt(distanceWithModeMatch[1]);
      const unit = distanceWithModeMatch[2].toLowerCase();
      const mode = distanceWithModeMatch[3].toLowerCase();
      targetLocationName = cleanLocationName(distanceWithModeMatch[4]);
      
      if (unit.includes('min')) {
        maxTime = value;
      } else if (unit.includes('hour')) {
        maxTime = value * 60; // Convert hours to minutes
      } else if (unit.includes('km')) {
        maxDistance = value;
      }
      
      // Map travel mode
      if (mode.includes('walk')) {
        travelMode = 'walking';
      } else if (mode.includes('cycl') || mode.includes('bik')) {
        travelMode = 'bicycling';
      } else if (mode.includes('transit') || mode.includes('public')) {
        travelMode = 'transit';
      } else {
        travelMode = 'driving';
      }
    } else if (nearModeDistanceMatch) {
      // Handle "near [location] walking distance [time] away" format
      targetLocationName = cleanLocationName(nearModeDistanceMatch[1]);
      const mode = nearModeDistanceMatch[2].toLowerCase();
      const value = parseInt(nearModeDistanceMatch[3]);
      const unit = nearModeDistanceMatch[4].toLowerCase();
      
      if (unit.includes('min')) {
        maxTime = value;
      } else if (unit.includes('hour')) {
        maxTime = value * 60; // Convert hours to minutes
      } else if (unit.includes('km')) {
        maxDistance = value;
      }
      
      // Map travel mode
      if (mode.includes('walk')) {
        travelMode = 'walking';
      } else if (mode.includes('cycl') || mode.includes('bik')) {
        travelMode = 'bicycling';
      } else if (mode.includes('transit') || mode.includes('public')) {
        travelMode = 'transit';
      } else {
        travelMode = 'driving';
      }
    } else if (timeAwayNearMatch) {
      // Handle "[time] away near [location]" format (e.g., "40 mins away near Elmina Lakeside Mall")
      const value = parseInt(timeAwayNearMatch[1]);
      const unit = timeAwayNearMatch[2].toLowerCase();
      targetLocationName = cleanLocationName(timeAwayNearMatch[3]);
      
      if (unit.includes('min')) {
        maxTime = value;
      } else if (unit.includes('hour')) {
        maxTime = value * 60; // Convert hours to minutes
      } else if (unit.includes('km')) {
        maxDistance = value;
      }
    } else if (nearAwayMatch) {
      // Handle "near [location] [time] away" format (prioritize this over generic nearMatch)
      targetLocationName = cleanLocationName(nearAwayMatch[1]);
      const value = parseInt(nearAwayMatch[2]);
      const unit = nearAwayMatch[3].toLowerCase();
      
      if (unit.includes('min')) {
        maxTime = value;
      } else if (unit.includes('hour')) {
        maxTime = value * 60; // Convert hours to minutes
      } else if (unit.includes('km')) {
        maxDistance = value;
      }
    } else if (proximityMatch) {
      const value = parseInt(proximityMatch[1]);
      const unit = proximityMatch[2].toLowerCase();
      targetLocationName = cleanLocationName(proximityMatch[3]);
      
      if (unit.includes('min')) {
        maxTime = value;
      } else if (unit.includes('hour')) {
        maxTime = value * 60; // Convert hours to minutes
      } else if (unit.includes('km')) {
        maxDistance = value;
      }
    } else if (nearMatch) {
      targetLocationName = cleanLocationName(nearMatch[1]);
      if (nearMatch[2] && nearMatch[3]) {
        const value = parseInt(nearMatch[2]);
        const unit = nearMatch[3].toLowerCase();
        if (unit.includes('min')) {
          maxTime = value;
        } else if (unit.includes('hour')) {
          maxTime = value * 60; // Convert hours to minutes
        } else if (unit.includes('km')) {
          maxDistance = value;
        }
      } else {
        // If no distance/time specified for "close to/near" searches, default to 5km radius
        maxDistance = 5;
      }
    }
    
    // Additional travel mode detection for queries that mention travel mode elsewhere
    // Check the full query for travel mode keywords if not already detected
    if (travelMode === 'driving') {
      if (lowercaseQuery.includes('walking') || lowercaseQuery.includes('walk')) {
        travelMode = 'walking';
      } else if (lowercaseQuery.includes('cycling') || lowercaseQuery.includes('biking') || lowercaseQuery.includes('bicycle')) {
        travelMode = 'bicycling';
      } else if (lowercaseQuery.includes('transit') || lowercaseQuery.includes('public transport') || lowercaseQuery.includes('bus') || lowercaseQuery.includes('train')) {
        travelMode = 'transit';
      }
    }
    
    // Get coordinates for the target location - prioritize local database
    if (targetLocationName) {
      // First try local database
      let targetCoords = getLocationCoordinates(targetLocationName);
      
      // For Malaysian property platform, only use local database
      // This ensures all locations are verified Malaysian locations
      
      console.log(`Location lookup for "${targetLocationName}":`, targetCoords);
      
      if (targetCoords) {
        proximityFilter = {
          targetLocation: targetCoords,
          maxMinutes: maxTime,
          maxKilometers: maxDistance,
          locationName: targetLocationName,
          travelMode: travelMode
        };
        
        // Also add the proximity filter info to the main filters for frontend display
        filters.proximityFilter = proximityFilter;
        filters.searchType = 'proximity';
        
        console.log('Created proximity filter:', proximityFilter);
        
        // For proximity searches, only parse explicit price constraints that are clearly separate from distance/time
        // Look for explicit budget or price mentions with RM currency
        const explicitPriceMatches = lowercaseQuery.match(/(?:budget|price|cost|rental\s+(?:budget|price|cost))\s*(?:is|of|around|approximately|under|below|less\s+than|<)\s*rm\s*(\d+(?:\.\d+)?(?:,\d+)*)(k)?/i);
        if (explicitPriceMatches) {
          let maxPrice = parseFloat(explicitPriceMatches[1].replace(/,/g, ''));
          // Handle 'k' or 'K' suffix for thousands (e.g., "2.5k" = 2500)
          if (explicitPriceMatches[2]) {
            maxPrice = maxPrice * 1000;
          }
          filters.maxPrice = maxPrice;
          console.log(`Proximity search price filter: maxPrice = ${maxPrice} (from "${explicitPriceMatches[0]}")`);
        }
        
        const explicitMinPriceMatches = lowercaseQuery.match(/(?:budget|price|cost|rental\s+(?:budget|price|cost))\s*(?:is|of|around|approximately|above|over|more\s+than|>)\s*rm\s*(\d+(?:\.\d+)?(?:,\d+)*)(k)?/i);
        if (explicitMinPriceMatches) {
          let minPrice = parseFloat(explicitMinPriceMatches[1].replace(/,/g, ''));
          // Handle 'k' or 'K' suffix for thousands
          if (explicitMinPriceMatches[2]) {
            minPrice = minPrice * 1000;
          }
          filters.minPrice = minPrice;
          console.log(`Proximity search price filter: minPrice = ${minPrice} (from "${explicitMinPriceMatches[0]}")`);
        }
        
        // Don't set regular location filters if we're doing proximity search
        searchText = '';
        // Clear any location-based filters that might have been set
        filters.city = undefined;
        filters.area = undefined;
      } else {
        console.log(`Location "${targetLocationName}" not found`);
      }
    }
  }

  // If no proximity search, check for regular location extraction
  if (!proximityFilter) {
    // Remove transaction-related words, generic property words, and price expressions before determining search text
    const transactionWords = ['for', 'rent', 'sale', 'buy', 'purchase', 'buying', 'to', 'rental'];
    const genericPropertyWords = ['unit', 'units', 'property', 'properties', 'place', 'places', 'home', 'homes', 'room', 'rooms'];
    const priceWords = ['under', 'below', 'above', 'over', 'rm', 'ringgit', 'million', 'k', 'm'];
    const wordsToRemove = [...transactionWords, ...genericPropertyWords, ...priceWords];
    
    // Also remove numeric values that might be prices
    let cleanedQuery = lowercaseQuery.split(' ')
      .filter(word => {
        // Remove words in our filter list
        if (wordsToRemove.includes(word)) return false;
        // Remove numeric values (likely prices) - including rm4000, 4000k, etc.
        if (/^(rm)?\d+[km]?$/.test(word) || /^\d{4,}$/.test(word)) return false;
        return true;
      })
      .join(' ')
      .trim();
    
    // For compound queries like "desa park city", use the cleaned query as search text
    // rather than trying to extract individual location names
    if (cleanedQuery.split(' ').length > 1) {
      // First, check for location extractions in compound queries
      const locations = Object.keys(malaysianLocations);
      for (const location of locations) {
        if (cleanedQuery.includes(location)) {
          if (location === 'mont kiara') {
            filters.city = 'Mont Kiara';
          } else if (location === 'kepong') {
            filters.city = 'Kepong';
          } else if (location === 'kuala lumpur' || location === 'kl') {
            filters.city = 'Kuala Lumpur';
          }
          break;
        }
      }
      
      // Check if we already have specific location filters that would make text search redundant
      if (filters.city || filters.area) {
        // We have location filters, so focus on property-type matching only
        const locationTerms = ['mont', 'kiara', 'kl', 'kuala', 'lumpur', 'petaling', 'jaya', 'subang', 'damansara', 'sri', 'hartamas', 'kepong'];
        const prepositionWords = ['in', 'at', 'near', 'around', 'on', 'by', 'from', 'to', 'with', 'within', 'of'];
        const nonLocationWords = cleanedQuery.split(' ').filter(word => !locationTerms.includes(word) && !prepositionWords.includes(word));
        
        if (nonLocationWords.length > 0) {
          // Check if the remaining words are property types that we already have in filters
          const propertyTypeWords = ['condo', 'condos', 'condominium', 'apartment', 'house', 'villa', 'studio', 'townhouse', 'commercial', 'industrial', 'land', 'office', 'shop', 'retail', 'warehouse', 'factory'];
          const isOnlyPropertyTypes = nonLocationWords.every(word => propertyTypeWords.includes(word));
          
          if (isOnlyPropertyTypes && filters.propertyType && filters.propertyType.length > 0) {
            // Property type is already captured in filters, use broad search
            searchText = '';
          } else {
            // Convert property type terms for better matching
            let propertySearchText = nonLocationWords.join(' ');
            if (propertySearchText.includes('condo')) {
              propertySearchText = propertySearchText.replace(/\bcondos?\b/g, 'condominium');
            }
            searchText = propertySearchText;
          }
        } else {
          // All words were location terms that are already filtered - use broad search
          searchText = '';
        }
      } else {
        // Check if searchText was already set for specific location handling (like 'mutiara damansara')

        if (!searchText || searchText === '') {
          // No specific location filters, use full compound search with property type conversion
          let propertySearchText = cleanedQuery;
          if (propertySearchText.includes('condo')) {
            propertySearchText = propertySearchText.replace(/\bcondos?\b/g, 'condominium');
          }
          searchText = propertySearchText;

        }
      }
    } else if (cleanedQuery.length > 0) {
      // For single-word queries, try to match against known locations
      const locations = Object.keys(malaysianLocations);
      for (const location of locations) {
        if (cleanedQuery === location || cleanedQuery.includes(location)) {
          // Use the original location name for search (not normalized)
          searchText = location; // Use the original lowercase for text search
          // Set city filter for exact location matching
          if (location === 'kepong') {
            filters.city = 'Kepong';
          } else if (location === 'mont kiara') {
            filters.city = 'Mont Kiara';
          } else if (location === 'sri hartamas') {
            // Sri Hartamas properties are found in addresses, use text search only
            searchText = 'sri hartamas';
            // Don't set city filter to avoid conflicts
          } else if (location === 'damansara utama') {
            // Damansara Utama properties are found in addresses, use text search only
            searchText = 'damansara utama';
            // Don't set city filter to avoid conflicts
          } else if (location === 'kuala lumpur' || location === 'kl') {
            filters.city = 'Kuala Lumpur';
          }
          break;
        }
      }
    } else {
      // If query is just transaction words (like "unit for sale"), leave search text empty
      searchText = '';
    }
  }


  
  // Final cleanup: Clear searchText for lifestyle-based queries with price filters
  // This must be done at the end after all other processing
  const lifestyleTerms = ['cozy', 'comfortable', 'family', 'spacious', 'modern', 'luxury', 'affordable', 'budget', 'nice', 'beautiful', 'good', 'great'];
  const hasLifestyleTerms = lifestyleTerms.some(term => lowercaseQuery.includes(term));
  
  if (hasLifestyleTerms && (filters.maxPrice || filters.minPrice)) {
    searchText = ''; // Clear text search for lifestyle-based queries with price filters
  }
  

  
  return { searchText, filters, proximityFilter };
}

// Progressive loading interface
interface ProgressiveSearchCallbacks {
  onProgress: (batch: {
    type: 'batch';
    properties: Property[];
    batchNumber: number;
    totalInBatch: number;
    totalLoaded: number;
    isFirstBatch: boolean;
    filters?: PropertySearchFilters;
  }) => void;
  onComplete: (summary: {
    totalCount: number;
    query: string;
    filters: PropertySearchFilters;
    totalTime: number;
  }) => void;
  onError: (error: Error) => void;
}

// Progressive AI search function that streams results in batches
export async function processAISearchProgressive(
  query: string, 
  searchType: 'rent' | 'buy' = 'rent', 
  sortBy?: string,
  callbacks?: ProgressiveSearchCallbacks
): Promise<void> {
  const startTime = Date.now();
  console.log(`🚀 PROGRESSIVE SEARCH: Starting for "${query}" (${searchType})`);
  
  try {
    // Import optimization modules
    const { requestMemo } = await import('./requestMemoization');
    const { getCachedSearchResults, cacheSearchResults } = await import('./aiCache');
    
    // Clear request cache for this new search
    requestMemo.clearRequestCache();
    
    // Check cache first for entire search results
    const cachedResult = getCachedSearchResults(query, searchType, sortBy);
    if (cachedResult && callbacks) {
      console.log(`⚡ PROGRESSIVE CACHE HIT: Streaming ${cachedResult.count} cached properties`);
      
      // Stream cached results in batches
      const BATCH_SIZE = 20;
      const batches = Math.ceil(cachedResult.properties.length / BATCH_SIZE);
      
      for (let i = 0; i < batches; i++) {
        const startIdx = i * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, cachedResult.properties.length);
        const batchProperties = cachedResult.properties.slice(startIdx, endIdx);
        
        callbacks.onProgress({
          type: 'batch',
          properties: batchProperties,
          batchNumber: i + 1,
          totalInBatch: batchProperties.length,
          totalLoaded: endIdx,
          isFirstBatch: i === 0,
          filters: cachedResult.filters
        });
        
        // Add small delay between batches for smooth streaming effect
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      callbacks.onComplete({
        totalCount: cachedResult.count,
        query: cachedResult.query,
        filters: cachedResult.filters,
        totalTime: Date.now() - startTime
      });
      return;
    }

    // Use simplified search service for all MRT/transport queries
    const lowerQuery = query.toLowerCase();
    const transportTypes = ['mrt', 'lrt', 'ktm', 'monorail', 'brt'];
    const nearKeywords = ['near', 'close to', 'walking distance', 'nearby', 'next to', 'dekat'];
    
    const hasTransportKeyword = transportTypes.some(type => lowerQuery.includes(type));
    const hasNearKeyword = nearKeywords.some(keyword => lowerQuery.includes(keyword));
    
    if (hasTransportKeyword && (hasNearKeyword || lowerQuery.includes('mrt'))) {
      console.log(`🚆 PROGRESSIVE TRANSPORT QUERY: "${query}" - using simplified search`);
      
      // Import service singletons to avoid recreation overhead
      const { getNLPSearchService, getSimplifiedSearchService } = await import('./serviceSingletons');
      
      // Parse property type from the query using NLP service singleton
      let parsedQuery = requestMemo.getNLPParsing(query);
      if (!parsedQuery) {
        parsedQuery = await getNLPSearchService().parseSearchQuery(query);
        requestMemo.setNLPParsing(query, parsedQuery);
      }
      
      const filters = {
        listingType: searchType === 'buy' ? 'sale' : 'rent',
        sortBy: sortBy,
        propertyType: parsedQuery.propertyType,
        maxPrice: parsedQuery.maxPrice,
        minPrice: parsedQuery.minPrice,
        maxDistanceMeters: parsedQuery.nearTransport?.maxDistanceMeters
      };
      
      // Get initial batch quickly (first 20)
      const initialResult = await getSimplifiedSearchService().searchProperties(query, filters, 20);
      
      if (callbacks && initialResult.results.length > 0) {
        // Send first batch immediately
        const firstBatchProperties = initialResult.results.slice(0, 20).map((r: any) => {
          const property = r.property;
          return {
            ...property,
            propertyType: property.property_type || 'condominium',
            listingType: property.listing_type || 'rent',
            postalCode: property.postal_code || undefined,
            squareFeet: property.square_feet || undefined,
            agentId: property.agent_id || property.agentId,
            createdAt: property.created_at || property.createdAt,
            updatedAt: property.updated_at || property.updatedAt,
            agent: {
              id: property.agent_id || property.id,
              name: property.name || 'Unknown Agent',
              email: property.email || '',
              phone: property.phone || '',
              company: property.company || '',
              license: property.license || '',
              bio: property.bio || '',
              rating: property.rating || 0,
              totalReviews: property.total_reviews || 0
            }
          };
        });

        const searchFilters = {
          searchType: 'general' as const,
          listingType: searchType === 'buy' ? 'sale' : 'rent',
          location: {
            area: initialResult.searchSummary.searchType === 'general_transport' ? 'Keyword search' : 
                  initialResult.searchSummary.searchType === 'specific_station' ? `Near specific station` : 'Keyword search',
            maxDistance: 18,
            transportation: 'walking' as const
          }
        };

        callbacks.onProgress({
          type: 'batch',
          properties: firstBatchProperties,
          batchNumber: 1,
          totalInBatch: firstBatchProperties.length,
          totalLoaded: firstBatchProperties.length,
          isFirstBatch: true,
          filters: searchFilters
        });

        // Cache and complete
        cacheSearchResults(query, searchType, firstBatchProperties, initialResult.count, searchFilters, sortBy);
        
        callbacks.onComplete({
          totalCount: initialResult.count,
          query,
          filters: searchFilters,
          totalTime: Date.now() - startTime
        });
      }
      return;
    }

    // For non-transport queries, use the regular AI search but stream results
    console.log(`🤖 PROGRESSIVE AI SEARCH: Processing "${query}"`);
    
    // Get the full search result first
    const fullResult = await processAISearch(query, searchType, sortBy);
    
    if (callbacks && fullResult.properties.length > 0) {
      // Stream results in batches
      const BATCH_SIZE = 20;
      const batches = Math.ceil(fullResult.properties.length / BATCH_SIZE);
      
      for (let i = 0; i < batches; i++) {
        const startIdx = i * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, fullResult.properties.length);
        const batchProperties = fullResult.properties.slice(startIdx, endIdx);
        
        callbacks.onProgress({
          type: 'batch',
          properties: batchProperties,
          batchNumber: i + 1,
          totalInBatch: batchProperties.length,
          totalLoaded: endIdx,
          isFirstBatch: i === 0,
          filters: fullResult.filters
        });
        
        // Add small delay between batches for smooth streaming
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }
      
      callbacks.onComplete({
        totalCount: fullResult.count,
        query: fullResult.query,
        filters: fullResult.filters,
        totalTime: Date.now() - startTime
      });
    }

  } catch (error) {
    console.error("Error in progressive AI search:", error);
    if (callbacks) {
      callbacks.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}
