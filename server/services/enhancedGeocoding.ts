import { db } from "../db";
import { sql } from "drizzle-orm";
import { openRouteService } from "./openrouteService";
import OpenAI from "openai";
import { storage } from "../storage";

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationResult extends Coordinates {
  name: string;
  source: 'database' | 'google_maps' | 'openroute' | 'openai';
  confidence: number;
}

export class EnhancedGeocodingService {
  // Major Malaysian landmarks that should never be permanently negatively cached
  private readonly MAJOR_LANDMARKS = [
    'klcc', 'kl city centre', 'kuala lumpur city centre',
    'pavilion', 'pavilion bukit bintang', 'bukit bintang',
    'mid valley', 'midvalley', 'sunway pyramid',
    'one utama', '1utama', 'the gardens',
    'ioi city mall', 'paradigm mall', 'tropicana city mall',
    'mont kiara', 'mont-kiara', 'mont\'kiara',
    'bangsar', 'damansara heights', 'ttdi', 'taman tun dr ismail',
    'bandar utama', 'centrepoint bandar utama', 'kota damansara'
  ];

  // Normalize query for consistent cache lookups
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s'-]/g, '') // Remove special chars except hyphens and apostrophes
      .replace(/\b(malaysia|kuala lumpur|kl)\b/gi, '') // Remove common location prefixes
      .trim();
  }

  /**
   * Get coordinates for a location with multiple fallback strategies
   * Now with persistent database caching and API usage tracking
   */
  async getLocationCoordinates(locationName: string): Promise<LocationResult | null> {
    const normalizedName = locationName.toLowerCase().trim();
    const normalizedQuery = this.normalizeQuery(locationName);
    const isMajorLandmark = this.MAJOR_LANDMARKS.includes(normalizedName);
    console.log(`🔍 Enhanced geocoding for: "${locationName}" (normalized: "${normalizedQuery}")${isMajorLandmark ? ' [MAJOR LANDMARK]' : ''}`);

    // Check persistent database cache FIRST (cross-session cache)
    const persistentCache = await storage.getCachedGeocoding(normalizedQuery);
    if (persistentCache && (persistentCache.confidence ?? 0) >= 0.8) {
      console.log(`💾 PERSISTENT CACHE HIT: ${locationName} from ${persistentCache.source} (hit count: ${persistentCache.hitCount})`);
      
      // Log cache hit (no cost!)
      await storage.logApiUsage({
        service: `${persistentCache.source}_geocoding`,
        endpoint: 'cache',
        requestType: 'geocode',
        query: locationName,
        cacheHit: true,
        estimatedCost: 0, // Cache hits are free!
        responseTime: 0,
        success: true
      });
      
      return {
        name: persistentCache.formattedAddress || locationName,
        lat: persistentCache.latitude,
        lng: persistentCache.longitude,
        source: persistentCache.source as any,
        confidence: persistentCache.confidence || 1.0
      };
    }

    // Import request-level memoization and global caching
    const { requestMemo } = await import('./requestMemoization');
    const { getCachedLocation, cacheLocation } = await import('./aiCache');
    
    // For major landmarks, skip negative cache and always try database lookup first
    if (!isMajorLandmark) {
      // Check request-level cache first (fastest) - but only for non-major landmarks
      const requestCached = requestMemo.getGeocoding(locationName);
      if (requestCached !== undefined) {
        if (requestCached) {
          return {
            name: locationName,
            lat: requestCached.lat,
            lng: requestCached.lng,
            source: 'database',
            confidence: 1.0
          };
        } else {
          return null;
        }
      }
      
      // Check global cache second - but only for non-major landmarks
      const cachedCoords = getCachedLocation(locationName);
      if (cachedCoords !== undefined) {
        // Cache in request memo too
        requestMemo.setGeocoding(locationName, cachedCoords);
        
        if (cachedCoords) {
          return {
            name: locationName,
            lat: cachedCoords.lat,
            lng: cachedCoords.lng,
            source: 'database',
            confidence: 1.0
          };
        } else {
          // Cached negative result - location not found
          console.log(`🚫 LOCATION CACHE: Negative result cached for "${locationName}"`);
          return null;
        }
      }
    } else {
      // For major landmarks, only use positive cache results
      const requestCached = requestMemo.getGeocoding(locationName);
      if (requestCached !== undefined && requestCached !== null) {
        console.log(`🏛️  MAJOR LANDMARK CACHE HIT: ${locationName}`);
        return {
          name: locationName,
          lat: requestCached.lat,
          lng: requestCached.lng,
          source: 'database',
          confidence: 1.0
        };
      }
      
      const cachedCoords = getCachedLocation(locationName);
      if (cachedCoords !== undefined && cachedCoords !== null) {
        console.log(`🏛️  MAJOR LANDMARK CACHE HIT: ${locationName}`);
        requestMemo.setGeocoding(locationName, cachedCoords);
        return {
          name: locationName,
          lat: cachedCoords.lat,
          lng: cachedCoords.lng,
          source: 'database',
          confidence: 1.0
        };
      }
      
      if (cachedCoords === null) {
        console.log(`🔄 MAJOR LANDMARK: Bypassing negative cache for "${locationName}" - forcing database lookup`);
      }
    }

    // Strategy 1: Try exact database lookup first (no partial matches yet)
    const dbResult = await this.getDatabaseLocation(normalizedName);
    if (dbResult && dbResult.confidence >= 0.9) {
      console.log(`✅ Found exact match in database:`, dbResult);
      // Cache in both request memo and global cache
      const coords = { lat: dbResult.lat, lng: dbResult.lng };
      requestMemo.setGeocoding(locationName, coords);
      cacheLocation(locationName, coords);
      return dbResult;
    }

    // Strategy 2: Use Google Maps Geocoding API (highest accuracy for Malaysian locations - prioritized for specific locations)
    const startTime = Date.now();
    const googleMapsResult = await this.getGoogleMapsLocation(locationName);
    const responseTime = Date.now() - startTime;
    
    // Log API usage
    await storage.logApiUsage({
      service: 'google_geocoding',
      endpoint: 'geocode/json',
      requestType: 'geocode',
      query: locationName,
      cacheHit: false,
      estimatedCost: 0.005, // $5 per 1000 requests
      responseTime,
      success: !!googleMapsResult
    });
    
    if (googleMapsResult && this.isValidMalaysianCoordinate(googleMapsResult.lat, googleMapsResult.lng)) {
      // Save to database for future use
      await this.saveLocationToDatabase(locationName, normalizedName, googleMapsResult.lat, googleMapsResult.lng, 'google_maps');
      
      // Save to persistent cache
      await storage.saveCachedGeocoding({
        normalizedQuery,
        originalQuery: locationName,
        latitude: googleMapsResult.lat,
        longitude: googleMapsResult.lng,
        formattedAddress: googleMapsResult.name,
        source: 'google',
        confidence: 0.95
      });
      
      // Cache the successful Google Maps result
      cacheLocation(locationName, { lat: googleMapsResult.lat, lng: googleMapsResult.lng });
      console.log(`✅ Found via Google Maps:`, googleMapsResult);
      return googleMapsResult;
    }

    // Strategy 3: Try partial matches in database (only if Google Maps fails)
    const partialResult = await this.getPartialDatabaseMatch(normalizedName);
    if (partialResult) {
      console.log(`✅ Found partial match in database:`, partialResult);
      // Cache in both request memo and global cache
      const coords = { lat: partialResult.lat, lng: partialResult.lng };
      requestMemo.setGeocoding(locationName, coords);
      cacheLocation(locationName, coords);
      return partialResult;
    }

    // Strategy 4: Use OpenRouteService (with confidence check)
    const startTime4 = Date.now();
    const openRouteResult = await this.getOpenRouteLocation(locationName);
    const responseTime4 = Date.now() - startTime4;
    
    await storage.logApiUsage({
      service: 'openroute_geocoding',
      endpoint: 'geocode/search',
      requestType: 'geocode',
      query: locationName,
      cacheHit: false,
      estimatedCost: 0.004, // ~$4 per 1000 requests (beyond free tier)
      responseTime: responseTime4,
      success: !!openRouteResult
    });
    
    if (openRouteResult && this.isValidMalaysianCoordinate(openRouteResult.lat, openRouteResult.lng) && openRouteResult.confidence >= 0.6) {
      // Save to database for future use
      await this.saveLocationToDatabase(locationName, normalizedName, openRouteResult.lat, openRouteResult.lng, 'openroute');
      
      // Save to persistent cache
      await storage.saveCachedGeocoding({
        normalizedQuery,
        originalQuery: locationName,
        latitude: openRouteResult.lat,
        longitude: openRouteResult.lng,
        formattedAddress: openRouteResult.name,
        source: 'openroute',
        confidence: openRouteResult.confidence
      });
      
      // Cache the successful OpenRoute result
      cacheLocation(locationName, { lat: openRouteResult.lat, lng: openRouteResult.lng });
      console.log(`✅ Found via OpenRouteService:`, openRouteResult);
      return openRouteResult;
    } else if (openRouteResult && openRouteResult.confidence < 0.6) {
      console.log(`⚠️  OpenRouteService result rejected: low confidence (${openRouteResult.confidence})`);
    }

    // Strategy 5: Enhanced OpenRouteService with Malaysian context (with confidence check)
    const contextualResult = await this.getContextualLocation(locationName);
    if (contextualResult && this.isValidMalaysianCoordinate(contextualResult.lat, contextualResult.lng) && contextualResult.confidence >= 0.5) {
      await this.saveLocationToDatabase(locationName, normalizedName, contextualResult.lat, contextualResult.lng, 'openroute');
      // Cache the successful contextual search result
      cacheLocation(locationName, { lat: contextualResult.lat, lng: contextualResult.lng });
      console.log(`✅ Found via contextual search:`, contextualResult);
      return contextualResult;
    } else if (contextualResult && contextualResult.confidence < 0.5) {
      console.log(`⚠️  Contextual search result rejected: low confidence (${contextualResult.confidence})`);
    }

    // Strategy 6: Use OpenAI as final fallback for Malaysian location intelligence (with confidence check)
    const openaiResult = await this.getOpenAILocation(locationName);
    if (openaiResult && this.isValidMalaysianCoordinate(openaiResult.lat, openaiResult.lng) && openaiResult.confidence >= 0.7) {
      await this.saveLocationToDatabase(locationName, normalizedName, openaiResult.lat, openaiResult.lng, 'openai');
      // Cache the successful OpenAI result
      cacheLocation(locationName, { lat: openaiResult.lat, lng: openaiResult.lng });
      console.log(`✅ Found via OpenAI:`, openaiResult);
      return openaiResult;
    } else if (openaiResult && openaiResult.confidence < 0.7) {
      console.log(`⚠️  OpenAI result rejected: low confidence (${openaiResult.confidence})`);
    }

    console.log(`❌ Location "${locationName}" not found in any source`);
    // Cache the negative result ONLY in request memo (not global cache)
    // This prevents repeated API calls in the same request, but allows retries in future requests
    requestMemo.setGeocoding(locationName, null);
    // DO NOT cache negative results globally - they prevent future retries
    return null;
  }

  /**
   * Look up location in database
   */
  private async getDatabaseLocation(normalizedName: string): Promise<LocationResult | null> {
    try {
      // First try the malaysian_locations table
      const locationsResult = await db.execute(
        sql`SELECT name, latitude, longitude, confidence_score 
            FROM malaysian_locations 
            WHERE normalized_name = ${normalizedName} 
            LIMIT 1`
      );

      if (locationsResult.rows.length > 0) {
        const row = locationsResult.rows[0] as any;
        return {
          name: row.name,
          lat: parseFloat(row.latitude),
          lng: parseFloat(row.longitude),
          source: 'database',
          confidence: parseFloat(row.confidence_score || '1.0')
        };
      }

      // If not found, try the cities table
      const citiesResult = await db.execute(
        sql`SELECT c.name, c.latitude, c.longitude, s.name as state_name
            FROM cities c
            JOIN states s ON c.state_id = s.id
            WHERE LOWER(c.name) = ${normalizedName}
            LIMIT 1`
      );

      if (citiesResult.rows.length > 0) {
        const row = citiesResult.rows[0] as any;
        return {
          name: row.name,
          lat: parseFloat(row.latitude),
          lng: parseFloat(row.longitude),
          source: 'database',
          confidence: 0.9
        };
      }
    } catch (error) {
      console.error('Database lookup error:', error);
    }
    return null;
  }

  /**
   * Try partial matches in database (for variations like "pavilion" matching "pavilion bukit bintang")
   */
  private async getPartialDatabaseMatch(normalizedName: string): Promise<LocationResult | null> {
    try {
      // Try substring matches in malaysian_locations table
      const locationsResult = await db.execute(
        sql`SELECT name, latitude, longitude, confidence_score,
                   CASE 
                     WHEN normalized_name = ${normalizedName} THEN 1.0
                     WHEN normalized_name LIKE ${`%${normalizedName}%`} OR ${normalizedName} LIKE CONCAT('%', normalized_name, '%') THEN 0.8
                     ELSE 0.6
                   END as match_score
            FROM malaysian_locations 
            WHERE normalized_name LIKE ${`%${normalizedName}%`} 
               OR ${normalizedName} LIKE CONCAT('%', normalized_name, '%')
            ORDER BY match_score DESC, confidence_score DESC
            LIMIT 1`
      );

      if (locationsResult.rows.length > 0) {
        const row = locationsResult.rows[0] as any;
        return {
          name: row.name,
          lat: parseFloat(row.latitude),
          lng: parseFloat(row.longitude),
          source: 'database',
          confidence: parseFloat(row.match_score) * parseFloat(row.confidence_score || '1.0')
        };
      }

      // Also try partial matches in cities table
      const citiesResult = await db.execute(
        sql`SELECT c.name, c.latitude, c.longitude, s.name as state_name,
                   CASE 
                     WHEN LOWER(c.name) = ${normalizedName} THEN 1.0
                     WHEN LOWER(c.name) LIKE ${`%${normalizedName}%`} OR ${normalizedName} LIKE CONCAT('%', LOWER(c.name), '%') THEN 0.8
                     ELSE 0.6
                   END as match_score
            FROM cities c
            JOIN states s ON c.state_id = s.id
            WHERE LOWER(c.name) LIKE ${`%${normalizedName}%`} 
               OR ${normalizedName} LIKE CONCAT('%', LOWER(c.name), '%')
            ORDER BY match_score DESC
            LIMIT 1`
      );

      if (citiesResult.rows.length > 0) {
        const row = citiesResult.rows[0] as any;
        return {
          name: row.name,
          lat: parseFloat(row.latitude),
          lng: parseFloat(row.longitude),
          source: 'database',
          confidence: parseFloat(row.match_score) * parseFloat(row.confidence_score || '1.0')
        };
      }
    } catch (error) {
      console.error('Partial database lookup error:', error);
    }
    return null;
  }

  /**
   * Use Google Maps Geocoding API for accurate Malaysian location geocoding
   */
  private async getGoogleMapsLocation(locationName: string): Promise<LocationResult | null> {
    try {
      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!googleApiKey) {
        console.log('⚠️  Google Maps API key not configured');
        return null;
      }

      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&region=MY&key=${googleApiKey}`;
      const response = await fetch(geocodeUrl);
      const data = await response.json() as any;

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        
        return {
          name: result.formatted_address,
          lat: location.lat,
          lng: location.lng,
          source: 'google_maps',
          confidence: 0.95 // Google Maps has high confidence
        };
      } else {
        console.log(`⚠️  Google Maps API returned status: ${data.status}`);
      }
    } catch (error) {
      console.error('Google Maps API error:', error);
    }
    return null;
  }

  /**
   * Use OpenRouteService for geocoding
   */
  private async getOpenRouteLocation(locationName: string): Promise<LocationResult | null> {
    try {
      const places = await openRouteService.searchPlaces(locationName);
      if (places && places.length > 0) {
        const place = places[0];
        return {
          name: place.name,
          lat: place.coordinates.lat,
          lng: place.coordinates.lng,
          source: 'openroute',
          confidence: 0.7
        };
      }
    } catch (error) {
      console.error('OpenRouteService error:', error);
    }
    return null;
  }

  /**
   * Try contextual search by adding "Malaysia" or "Kuala Lumpur" to the query
   */
  private async getContextualLocation(locationName: string): Promise<LocationResult | null> {
    const contexts = [
      `${locationName}, Malaysia`,
      `${locationName}, Kuala Lumpur, Malaysia`,
      `${locationName} shopping mall, Malaysia`,
      `${locationName} station, Malaysia`
    ];

    for (const contextQuery of contexts) {
      try {
        const places = await openRouteService.searchPlaces(contextQuery);
        if (places && places.length > 0) {
          const place = places[0];
          if (this.isValidMalaysianCoordinate(place.coordinates.lat, place.coordinates.lng)) {
            return {
              name: place.name,
              lat: place.coordinates.lat,
              lng: place.coordinates.lng,
              source: 'openroute',
              confidence: 0.6
            };
          }
        }
      } catch (error) {
        console.error(`Contextual search error for "${contextQuery}":`, error);
      }
    }
    return null;
  }

  /**
   * Use OpenAI for intelligent Malaysian location geocoding
   */
  private async getOpenAILocation(locationName: string): Promise<LocationResult | null> {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a Malaysian location expert. Given a location name, identify its precise coordinates in Malaysia. 

Rules:
1. Only provide coordinates for locations within Malaysia
2. Be very specific - if it's a shopping center, business area, or landmark, find the exact coordinates
3. SS2, SS3, etc. refer to sections in Petaling Jaya, Malaysia
4. "The Hub" likely refers to shopping centers or commercial areas
5. Always respond with valid JSON in this exact format: {"name": "Full Location Name", "latitude": 3.1234, "longitude": 101.5678, "area": "City/Area Name", "confidence": 0.8}
6. If you cannot confidently identify the location in Malaysia, respond with {"error": "Location not found in Malaysia"}

Examples:
- "The Hub SS2" → The Hub shopping center in SS2, Petaling Jaya
- "1 Utama" → 1 Utama shopping center in Bandar Utama
- "Pavilion KL" → Pavilion Kuala Lumpur in Bukit Bintang`
          },
          {
            role: "user", 
            content: `Where is "${locationName}" in Malaysia? Provide exact coordinates.`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      if (result.error) {
        console.log(`🤖 OpenAI couldn't locate "${locationName}" in Malaysia`);
        return null;
      }

      if (result.latitude && result.longitude && result.name) {
        return {
          name: result.name,
          lat: parseFloat(result.latitude),
          lng: parseFloat(result.longitude),
          source: 'openai',
          confidence: parseFloat(result.confidence || '0.8')
        };
      }
    } catch (error) {
      console.error('OpenAI geocoding error:', error);
    }
    return null;
  }

  /**
   * Check if coordinates are within Malaysia bounds (stricter validation)
   */
  private isValidMalaysianCoordinate(lat: number, lng: number): boolean {
    // Stricter Malaysia bounds focusing on populated areas
    // Peninsular Malaysia: 1.2°-7.0°N, 99.8°-104.5°E  
    // East Malaysia: 0.8°-7.4°N, 109.5°-119.3°E
    
    const peninsularLat = lat >= 1.2 && lat <= 7.0 && lng >= 99.8 && lng <= 104.5;
    const eastMalaysiaLat = lat >= 0.8 && lat <= 7.4 && lng >= 109.5 && lng <= 119.3;
    
    // Additional check: reject coordinates in the sea between Peninsular and East Malaysia
    const inSeaBetween = lat >= 1.0 && lat <= 6.0 && lng >= 104.5 && lng <= 109.5;
    
    const isValid = (peninsularLat || eastMalaysiaLat) && !inSeaBetween;
    
    // Extra validation: ensure it's not in known uninhabited areas
    if (isValid && this.isInUninhabitedArea(lat, lng)) {
      console.log(`❌ Coordinates (${lat}, ${lng}) are in uninhabited area`);
      return false;
    }
    
    if (!isValid) {
      console.log(`❌ Coordinates (${lat}, ${lng}) are outside Malaysia populated bounds`);
    }
    
    return isValid;
  }

  /**
   * Check if coordinates are in known uninhabited areas
   */
  private isInUninhabitedArea(lat: number, lng: number): boolean {
    // Reject coordinates in remote jungle areas, small islands, or sea areas
    // These are approximate areas that are unlikely to have properties
    
    // Central jungle areas of Peninsular Malaysia
    const centralJungle = lat >= 3.5 && lat <= 5.5 && lng >= 101.5 && lng <= 102.5;
    
    // Remote areas of East Malaysia interior
    const remoteInterior = lat >= 2.0 && lat <= 4.0 && lng >= 115.0 && lng <= 117.0;
    
    // Small island coordinates that are clearly not mainland
    const tinyIslands = (
      (lat < 2.0 && lng > 103.0 && lng < 105.0) || // Southern islands
      (lat < 3.0 && lng > 118.0) // Remote eastern islands
    );
    
    return centralJungle || remoteInterior || tinyIslands;
  }

  /**
   * Save a new location to database with enhanced logging and aliases
   */
  private async saveLocationToDatabase(
    name: string, 
    normalizedName: string, 
    lat: number, 
    lng: number, 
    source: string,
    confidence: number = 0.7
  ): Promise<void> {
    try {
      // Save the main location
      await db.execute(
        sql`INSERT INTO malaysian_locations (name, normalized_name, latitude, longitude, type, source, confidence_score)
            VALUES (${name}, ${normalizedName}, ${lat}, ${lng}, 'area', ${source}, ${confidence})
            ON CONFLICT (normalized_name) DO UPDATE SET
              latitude = EXCLUDED.latitude,
              longitude = EXCLUDED.longitude,
              source = EXCLUDED.source,
              confidence_score = EXCLUDED.confidence_score,
              updated_at = NOW()`
      );
      
      console.log(`💾 AUTO-SAVED LOCATION: "${name}" (${normalizedName}) -> (${lat}, ${lng}) from ${source.toUpperCase()}`);
      
      // Save common variations/aliases for better future matching
      await this.saveLocationAliases(name, normalizedName, lat, lng, source, confidence);
      
    } catch (error) {
      console.error('❌ Error saving location to database:', error);
    }
  }

  /**
   * Save common variations and aliases of a location
   */
  private async saveLocationAliases(
    originalName: string,
    originalNormalizedName: string, 
    lat: number, 
    lng: number, 
    source: string,
    confidence: number
  ): Promise<void> {
    const aliases: string[] = [];
    
    // Generate common aliases
    if (originalName.includes('Shopping')) {
      aliases.push(originalName.replace('Shopping', '').trim());
      aliases.push(originalName.replace('Shopping Center', 'Mall').trim());
    }
    
    if (originalName.includes('Mall')) {
      aliases.push(originalName.replace('Mall', '').trim());
      aliases.push(originalName.replace('Mall', 'Shopping Center').trim());
    }
    
    if (originalName.includes('The ')) {
      aliases.push(originalName.replace('The ', '').trim());
    }
    
    // Add abbreviations for common Malaysian location patterns
    if (originalName.includes('SS2') || originalName.includes('SS3') || originalName.includes('SS')) {
      const ssMatch = originalName.match(/(SS\d+)/i);
      if (ssMatch) {
        aliases.push(`${ssMatch[1]} Petaling Jaya`);
        aliases.push(`${ssMatch[1]} PJ`);
      }
    }
    
    // Save each unique alias
    for (const alias of aliases) {
      if (alias && alias !== originalName) {
        const normalizedAlias = alias.toLowerCase().trim();
        if (normalizedAlias !== originalNormalizedName) {
          try {
            await db.execute(
              sql`INSERT INTO malaysian_locations (name, normalized_name, latitude, longitude, type, source, confidence_score)
                  VALUES (${alias}, ${normalizedAlias}, ${lat}, ${lng}, 'area', ${source}, ${confidence * 0.8})
                  ON CONFLICT (normalized_name) DO NOTHING`
            );
            console.log(`  📝 Added alias: "${alias}" -> "${originalName}"`);
          } catch (error) {
            // Ignore conflicts, just log for debugging
            console.log(`  ⚠️  Alias conflict ignored: "${alias}"`);
          }
        }
      }
    }
  }

  /**
   * Get all locations from database for debugging
   */
  async getAllLocations(): Promise<any[]> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM malaysian_locations ORDER BY name`
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching all locations:', error);
      return [];
    }
  }
}

export const enhancedGeocodingService = new EnhancedGeocodingService();