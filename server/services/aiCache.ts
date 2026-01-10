// Using simple memoization instead of memoizee for now
import { PropertySearchFilters } from './openai';

interface CacheEntry {
  filters: PropertySearchFilters;
  timestamp: number;
  query: string;
}

interface SearchResultCacheEntry {
  results: any[];
  count: number;
  filters: PropertySearchFilters;
  timestamp: number;
  query: string;
  searchType: 'rent' | 'buy';
  sortBy?: string;
}

// In-memory cache for AI responses
const aiCache = new Map<string, CacheEntry>();

// In-memory cache for complete search results
const searchResultsCache = new Map<string, SearchResultCacheEntry>();

// In-memory cache for location coordinates
const locationCache = new Map<string, { coordinates: {lat: number; lng: number} | null; timestamp: number }>();

// Cache TTL: 24 hours for common queries
const CACHE_TTL = 24 * 60 * 60 * 1000;
// Search results cache TTL: 8 hours for better performance (simple property searches don't change frequently)
const SEARCH_RESULTS_CACHE_TTL = 8 * 60 * 60 * 1000;
// Location cache TTL: 48 hours for stable geocoding
const LOCATION_CACHE_TTL = 48 * 60 * 60 * 1000;

// Common query patterns that should be cached
const COMMON_QUERY_PATTERNS = [
  /condo.*bangsar.*under.*rm.*\d+k?/i,
  /apartment.*klcc.*rent/i,
  /house.*mont\s*kiara.*sale/i,
  /studio.*pj.*under.*rm.*\d+k?/i,
  /\d+\s*bedroom.*near.*\w+.*under.*rm.*\d+k?/i,
  /property.*under.*rm.*\d+k?/i,
  /units?.*for.*rent.*\w+/i,
  /\w+.*residences?/i,
  /apartment.*under.*rm.*\d+.*for.*elderly.*parents/i, // Added pattern for elderly parents searches
  /modern.*condominium.*under.*rm.*\d+/i, // Pattern for modern condo searches
  /property.*type.*under.*rm.*\d+/i, // General property type + price searches
  /\w+.*near.*mrt.*\w+/i, // Transport proximity searches
  /\w+.*near.*lrt.*\w+/i, // LRT proximity searches
  /(condo|condominium).*under.*rm.*\d+k?.*for.*(investment|purchase)/i, // Investment property searches
  /(apartment|condo|house|property).*under.*rm.*\d+k?/i, // Simple property + price searches
  /\w+.*under.*rm.*\d+k?.*for.*investment/i, // General investment searches
];

// Enhanced query normalization for better cache hit rates
function normalizeQueryForCache(query: string): string {
  return query
    .toLowerCase()
    .trim()
    // Normalize price formats
    .replace(/rm\s*/gi, 'rm')
    .replace(/\bk\b/gi, '000')
    .replace(/,(\d{3})/g, '$1') // Remove thousands separators
    .replace(/(\d+)\.0+\b/g, '$1') // Remove trailing zeros: 3000.00 -> 3000
    // Normalize ROI patterns (OPTIMIZATION: Improve cache hit rate for ROI queries)
    .replace(/\broi\s*/gi, 'roi') // Normalize ROI spacing
    .replace(/at\s*least\s*roi/gi, 'roi>=') // "at least ROI" -> "roi>="
    .replace(/roi\s*at\s*least/gi, 'roi>=') // "ROI at least" -> "roi>="
    .replace(/above\s*roi/gi, 'roi>') // "above ROI" -> "roi>"
    .replace(/roi\s*above/gi, 'roi>') // "ROI above" -> "roi>"
    .replace(/below\s*roi/gi, 'roi<') // "below ROI" -> "roi<"
    .replace(/roi\s*below/gi, 'roi<') // "ROI below" -> "roi<"
    .replace(/min(?:imum)?\s*roi/gi, 'roi>=') // "minimum ROI" -> "roi>="
    .replace(/max(?:imum)?\s*roi/gi, 'roi<=') // "maximum ROI" -> "roi<="
    .replace(/(\d+(?:\.\d+)?)\s*%/g, '$1pct') // "4.5%" -> "4.5pct"
    // Normalize time/distance variations
    .replace(/\b(\d+)\s*(minutes?|mins?)\b/gi, '$1min')
    .replace(/\b(fifteen|15)\s*(minutes?|mins?)\b/gi, '15min')
    .replace(/\b(thirty|30)\s*(minutes?|mins?)\b/gi, '30min')
    .replace(/\b(ten|10)\s*(minutes?|mins?)\b/gi, '10min')
    .replace(/\b(\d+)\s*km\b/gi, '$1km')
    // Normalize property type variations
    .replace(/apartment|apt/g, 'apartment')
    .replace(/condominium|condo/g, 'condominium')
    .replace(/terraced?\s*house|terrace\s*house/g, 'terrace')
    .replace(/semi[- ]detached|semi[- ]d/g, 'semidetached')
    // Normalize location variations
    .replace(/mont\s*kiara|mt\s*kiara|mk/g, 'mont_kiara')
    .replace(/petaling\s*jaya|pj/g, 'petaling_jaya')
    .replace(/shah\s*alam/g, 'shah_alam')
    .replace(/subang\s*jaya|sj/g, 'subang_jaya')
    .replace(/bandar\s*utama|bu/g, 'bandar_utama')
    .replace(/kuala\s*lumpur|kl/g, 'kuala_lumpur')
    .replace(/damansara\s*heights/g, 'damansara_heights')
    .replace(/taman\s*tun\s*dr\s*ismail|ttdi/g, 'ttdi')
    // Normalize transport types
    .replace(/\bmrt\b/g, 'mrt')
    .replace(/\blrt\b/g, 'lrt')
    .replace(/\bktm\b/g, 'ktm')
    .replace(/\bmonorail\b/g, 'monorail')
    // Normalize proximity keywords
    .replace(/near\s*(to)?|close\s*to|nearby|next\s*to/g, 'near')
    .replace(/walking\s*distance/g, 'walkdist')
    // Normalize amenities
    .replace(/pet[\s\-]?friendly|petfriendly/g, 'petfriendly')
    .replace(/swimming\s*pool/g, 'pool')
    .replace(/car\s*park|parking/g, 'parking')
    // Normalize bedroom/bathroom variations
    .replace(/(\d+)\s*(bedrooms?|beds?|br)\b/gi, (match, num, unit) => `${num}bed`)
    .replace(/(\d+)\s*(bathrooms?|baths?|ba)\b/gi, (match, num, unit) => `${num}bath`)
    // Final cleanup
    .replace(/\s+/g, ' ')
    .replace(/[\s\-_]+/g, '_')
    .trim();
}

// Generate cache key for search results including search parameters
function generateSearchResultsCacheKey(query: string, searchType: 'rent' | 'buy', sortBy?: string): string {
  const normalizedQuery = normalizeQueryForCache(query);
  const normalizedSortBy = sortBy || ''; // Default to empty string for consistent cache keys
  const key = `${normalizedQuery}_${searchType}`;
  return normalizedSortBy ? `${key}_${normalizedSortBy}` : key;
}

// Generate cache key for location lookups
function generateLocationCacheKey(locationName: string): string {
  return locationName.toLowerCase().trim().replace(/\s+/g, '_');
}

// Check if query matches common patterns worth caching
function shouldCacheQuery(query: string): boolean {
  // Cache ALL queries for maximum performance - normalized keys prevent cache bloat
  return true;
}

// Get cached AI response if available and fresh
export function getCachedAIResponse(query: string): PropertySearchFilters | null {
  const cacheKey = normalizeQueryForCache(query);
  const cached = aiCache.get(cacheKey);
  
  if (!cached) {
    return null;
  }
  
  // Check if cache entry is still fresh
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    aiCache.delete(cacheKey);
    return null;
  }
  
  console.log(`Cache HIT for query: "${query}"`);
  return cached.filters;
}

// Cache AI response if query is worth caching
export function cacheAIResponse(query: string, filters: PropertySearchFilters): void {
  if (!shouldCacheQuery(query)) {
    return;
  }
  
  const cacheKey = normalizeQueryForCache(query);
  aiCache.set(cacheKey, {
    filters,
    timestamp: Date.now(),
    query
  });
  
  console.log(`Cached AI response for: "${query}"`);
}

// Search Results Caching Functions
export function getCachedSearchResults(query: string, searchType: 'rent' | 'buy', sortBy?: string): any | null {
  const cacheKey = generateSearchResultsCacheKey(query, searchType, sortBy);
  const cached = searchResultsCache.get(cacheKey);
  
  if (!cached) {
    return null;
  }
  
  // Check if cache entry is still fresh
  if (Date.now() - cached.timestamp > SEARCH_RESULTS_CACHE_TTL) {
    searchResultsCache.delete(cacheKey);
    return null;
  }
  
  console.log(`🚀 SEARCH CACHE HIT for query: "${query}" (${searchType})`);
  return {
    properties: cached.results,
    count: cached.count,
    filters: cached.filters,
    query: cached.query
  };
}

export function cacheSearchResults(query: string, searchType: 'rent' | 'buy', results: any[], count: number, filters: PropertySearchFilters, sortBy?: string): void {
  if (!shouldCacheQuery(query)) {
    return;
  }
  
  const cacheKey = generateSearchResultsCacheKey(query, searchType, sortBy);
  searchResultsCache.set(cacheKey, {
    results,
    count,
    filters,
    timestamp: Date.now(),
    query,
    searchType,
    sortBy
  });
  
  console.log(`💾 Cached search results for: "${query}" (${count} properties)`);
}

// Location Caching Functions
export function getCachedLocation(locationName: string): {lat: number; lng: number} | null | undefined {
  const cacheKey = generateLocationCacheKey(locationName);
  const cached = locationCache.get(cacheKey);
  
  if (!cached) {
    return undefined;  // Return undefined when no cache exists (distinct from null = negative cache)
  }
  
  // Check if cache entry is still fresh
  if (Date.now() - cached.timestamp > LOCATION_CACHE_TTL) {
    locationCache.delete(cacheKey);
    return undefined;  // Return undefined for expired cache
  }
  
  if (cached.coordinates) {
    console.log(`📍 LOCATION CACHE HIT for: "${locationName}"`);
  }
  
  return cached.coordinates;  // Returns coordinates or null (if explicitly cached as null)
}

export function cacheLocation(locationName: string, coordinates: {lat: number; lng: number} | null): void {
  const cacheKey = generateLocationCacheKey(locationName);
  locationCache.set(cacheKey, {
    coordinates,
    timestamp: Date.now()
  });
  
  if (coordinates) {
    console.log(`🗺️  Cached location for: "${locationName}" -> (${coordinates.lat}, ${coordinates.lng})`);
  } else {
    console.log(`🚫 Cached negative result for location: "${locationName}"`);
  }
}

// Get comprehensive cache statistics
export function getCacheStats() {
  return {
    aiCache: {
      size: aiCache.size,
      entries: Array.from(aiCache.entries()).map(([key, value]) => ({
        key,
        query: value.query,
        age: Date.now() - value.timestamp
      }))
    },
    searchResultsCache: {
      size: searchResultsCache.size,
      totalProperties: Array.from(searchResultsCache.values()).reduce((sum, entry) => sum + entry.count, 0),
      entries: Array.from(searchResultsCache.entries()).map(([key, value]) => ({
        key,
        query: value.query,
        searchType: value.searchType,
        count: value.count,
        age: Date.now() - value.timestamp
      }))
    },
    locationCache: {
      size: locationCache.size,
      successful: Array.from(locationCache.values()).filter(entry => entry.coordinates !== null).length,
      entries: Array.from(locationCache.entries()).map(([key, value]) => ({
        key,
        hasCoordinates: value.coordinates !== null,
        age: Date.now() - value.timestamp
      }))
    }
  };
}

// Clear expired cache entries for all caches
export function cleanExpiredCache(): void {
  const now = Date.now();
  
  // Clean AI cache
  const aiEntries = Array.from(aiCache.entries());
  for (const [key, entry] of aiEntries) {
    if (now - entry.timestamp > CACHE_TTL) {
      aiCache.delete(key);
    }
  }
  
  // Clean search results cache
  const searchEntries = Array.from(searchResultsCache.entries());
  for (const [key, entry] of searchEntries) {
    if (now - entry.timestamp > SEARCH_RESULTS_CACHE_TTL) {
      searchResultsCache.delete(key);
    }
  }
  
  // Clean location cache
  const locationEntries = Array.from(locationCache.entries());
  for (const [key, entry] of locationEntries) {
    if (now - entry.timestamp > LOCATION_CACHE_TTL) {
      locationCache.delete(key);
    }
  }
  
  console.log(`🧹 Cache cleanup completed: AI(${aiCache.size}), Search(${searchResultsCache.size}), Location(${locationCache.size})`);
}

// Clear specific location from cache (useful for fixing negatively cached locations)
export function clearCachedLocation(locationName: string): boolean {
  const cacheKey = generateLocationCacheKey(locationName);
  const existed = locationCache.has(cacheKey);
  locationCache.delete(cacheKey);
  
  if (existed) {
    console.log(`🗑️  Cleared cached location: "${locationName}"`);
  } else {
    console.log(`ℹ️  Location "${locationName}" was not in cache`);
  }
  
  return existed;
}

// Clear all negatively cached locations (locations that returned null coordinates)
export function clearNegativeCachedLocations(): void {
  const locationEntries = Array.from(locationCache.entries());
  let clearedCount = 0;
  
  for (const [key, entry] of locationEntries) {
    if (entry.coordinates === null) {
      locationCache.delete(key);
      clearedCount++;
    }
  }
  
  console.log(`🗑️  Cleared ${clearedCount} negatively cached locations`);
}

// Simple distance calculation cache
const distanceCache = new Map<string, { result: number; timestamp: number }>();
const DISTANCE_CACHE_TTL = 60000; // 1 minute

export function memoizedDistanceCalculation(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const key = `${lat1.toFixed(6)},${lng1.toFixed(6)},${lat2.toFixed(6)},${lng2.toFixed(6)}`;
  const cached = distanceCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < DISTANCE_CACHE_TTL) {
    return cached.result;
  }
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const result = R * c;
  
  distanceCache.set(key, { result, timestamp: Date.now() });
  
  // Clean old entries periodically
  if (distanceCache.size % 100 === 0) {
    const now = Date.now();
    const distanceEntries = Array.from(distanceCache.entries());
    for (const [k, v] of distanceEntries) {
      if (now - v.timestamp > DISTANCE_CACHE_TTL) {
        distanceCache.delete(k);
      }
    }
  }
  
  return result;
}