import { db } from "../db";
import { sql } from "drizzle-orm";
import { cities, areas, malaysianBuildings, transportStations } from "../../shared/schema";
import { EnhancedGeocodingService } from "./enhancedGeocoding";
import { expandMalaysianAbbreviation } from "./gptAbbreviationService";

export interface DetectedLocation {
  name: string;
  normalizedName: string;
  latitude: number;
  longitude: number;
  source: 'cities' | 'areas' | 'malaysian_locations' | 'buildings' | 'transport_stations' | 'external';
  confidence: number;
  type: 'city' | 'area' | 'building' | 'station' | 'landmark';
  parentInfo?: {
    city?: string;
    state?: string;
    area?: string;
  };
}

export interface LocationDetectionResult {
  locations: DetectedLocation[];
  extractedAreas: string[];
  confidence: number;
}

// Comprehensive Malaysian location patterns
const MALAYSIAN_LOCATION_PATTERNS = {
  // Major cities and their common abbreviations (English, Malay, Mandarin, Tamil)
  cities: {
    'kuala lumpur': ['kl', 'kuala lumpur', 'k.l', 'k l', 'klang valley', 'kl city', '吉隆坡', 'கோலாலம்பூர்'],
    'petaling jaya': ['pj', 'petaling jaya', 'p.j', 'p j', '八打灵再也', 'பெட்டாலிங் ஜெயா'],
    'shah alam': ['shah alam', 'sa', '莎亚南'],
    'subang jaya': ['subang jaya', 'sj', 'subang', '梳邦再也'],
    'klang': ['klang', 'port klang', '巴生'],
    'kajang': ['kajang', '加影'],
    'ampang': ['ampang', '安邦'],
    'cheras': ['cheras', '蕉赖', 'சேரஸ்'],
    'puchong': ['puchong', '蒲种'],
    'cyberjaya': ['cyberjaya', 'cyber', '赛城'],
    'putrajaya': ['putrajaya', 'pjaya', '布城'],
    'bandar sunway': ['sunway', 'bandar sunway', '双威'],
    'usj': ['usj', 'subang jaya'],
    'damansara': ['damansara', 'damansara heights', '白沙罗'],
    'bandar utama': ['bandar utama', 'bu', 'b.u', 'b u', '万达镇'],
    'bangsar': ['bangsar', '孟沙', 'பாங்சார்'],
    'mont kiara': ['mont kiara', 'mont\'kiara', 'mk', 'mont-kiara', '满家乐'],
    'kota damansara': ['kota damansara', 'kd', 'k.d'],
    'ttdi': ['ttdi', 'taman tun dr ismail'],
    'setapak': ['setapak'],
    'wangsa maju': ['wangsa maju'],
    'kepong': ['kepong', '甲洞'],
    'selayang': ['selayang'],
    'batu caves': ['batu caves', '黑风洞'],
    // Other major Malaysian cities (with Mandarin & Tamil variants)
    'penang': ['penang', 'pulau pinang', 'georgetown', 'george town', 'pg', '槟城', '槟岛', 'பெனாங்', 'பெனாங்கில்'],
    'johor bahru': ['johor bahru', 'jb', 'johor', 'iskandar', '新山', 'ஜோஹர் பாரு', 'ஜோஹர்'],
    'ipoh': ['ipoh', 'perak', '怡保', 'ஈப்போ'],
    'melaka': ['melaka', 'malacca', 'bandar melaka', '马六甲', 'மலாக்கா'],
    'kota kinabalu': ['kota kinabalu', 'kk', 'sabah', '亚庇', '沙巴'],
    'kuching': ['kuching', 'sarawak', '古晋', '砂拉越'],
    'seremban': ['seremban', 'negeri sembilan', 'ns', '芙蓉'],
    'alor setar': ['alor setar', 'kedah', '亚罗士打'],
    'kuantan': ['kuantan', 'pahang', '关丹'],
    'kota bharu': ['kota bharu', 'kelantan', 'kb', '哥打巴鲁'],
    'kuala terengganu': ['kuala terengganu', 'terengganu', 'kt', '瓜拉丁加奴'],
  },
  
  // Popular areas and landmarks
  landmarks: {
    'klcc': ['klcc', 'kl city centre', 'kuala lumpur city centre', 'kl city center'],
    'bukit bintang': ['bukit bintang', 'bb', 'bintang walk'],
    'mid valley': ['mid valley', 'midvalley'],
    '1 utama': ['1utama', '1 utama', 'one utama'],
    'pavilion': ['pavilion', 'pavilion kl', 'pavilion bukit bintang'],
    'the gardens': ['gardens mall', 'the gardens', 'gardens'],
    'sunway pyramid': ['sunway pyramid', 'pyramid'],
    'ioi city mall': ['ioi city mall', 'ioi mall', 'ioi city'],
    'paradigm mall': ['paradigm mall', 'paradigm'],
    'tropicana city mall': ['tropicana city', 'tropicana mall'],
  },
  
  // Transport stations (common ones)
  transport: {
    'lrt': ['lrt', 'light rail'],
    'mrt': ['mrt', 'mass rapid transit'],
    'ktm': ['ktm', 'komuter'],
    'monorail': ['monorail'],
    'klia': ['klia', 'kl international airport', 'kuala lumpur international airport'],
    'klia2': ['klia2', 'klia 2'],
    'erl': ['erl', 'express rail link'],
  },
  
  // Sectional areas (SS, USJ, etc.)
  sections: {
    'ss': /ss\s*(\d+)/i, // SS2, SS15, etc.
    'usj': /usj\s*(\d+)/i, // USJ1, USJ21, etc.
    'pj': /pj\s*(\d+)/i, // PJ areas
    'sri petaling': /sri\s+petaling/i,
    'bandar utama': /bandar\s+utama/i,
    'kelana jaya': /kelana\s+jaya/i,
    'taman': /taman\s+[\w\s]+/i, // Taman areas
    'bandar': /bandar\s+[\w\s]+/i, // Bandar areas
  }
};

// Cache for performance optimization
const LOCATION_CACHE = new Map<string, DetectedLocation[]>();
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes
const CACHE_TIMESTAMPS = new Map<string, number>();

export class MalaysianLocationDetectionService {
  private enhancedGeocoding: EnhancedGeocodingService;

  constructor() {
    this.enhancedGeocoding = new EnhancedGeocodingService();
  }

  /**
   * Main function to extract locations from a query
   */
  async extractLocationsFromQuery(query: string): Promise<string[]> {
    const result = await this.detectLocations(query);
    return result.extractedAreas;
  }

  /**
   * Comprehensive location detection with multiple strategies
   */
  async detectLocations(query: string): Promise<LocationDetectionResult> {
    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = normalizedQuery;
    
    // VALIDATION STEP 1: Reject obviously invalid input before processing
    if (!this.isValidSearchText(query)) {
      console.log(`🚫 REJECTED INVALID INPUT: "${query}" - not a valid search term`);
      return {
        locations: [],
        extractedAreas: [],
        confidence: 0
      };
    }
    
    // Check cache first
    if (this.isValidCache(cacheKey)) {
      const cached = LOCATION_CACHE.get(cacheKey)!;
      console.log(`🎯 CACHE HIT: Found ${cached.length} cached locations for "${query}"`);
      return {
        locations: cached,
        extractedAreas: cached.map(loc => loc.name),
        confidence: cached.length > 0 ? 0.9 : 0
      };
    }

    console.log(`🔍 MALAYSIAN LOCATION DETECTION: Starting analysis for "${query}"`);
    
    const detectedLocations: DetectedLocation[] = [];

    // Strategy 1: Check exact database matches across all tables
    const dbMatches = await this.findDatabaseMatches(normalizedQuery);
    detectedLocations.push(...dbMatches);

    // Strategy 2: Check pattern-based matches (abbreviations, sections, etc.)
    const patternMatches = await this.findPatternMatches(normalizedQuery);
    detectedLocations.push(...patternMatches);

    // Strategy 3: Check partial matches and fuzzy search
    const fuzzyMatches = await this.findFuzzyMatches(normalizedQuery);
    detectedLocations.push(...fuzzyMatches);

    // Strategy 4: Use enhanced geocoding for unknown locations (with strict validation)
    if (detectedLocations.length === 0 && this.isValidForExternalSearch(query)) {
      const externalMatches = await this.findExternalMatches(query);
      detectedLocations.push(...externalMatches);
    }

    // Remove duplicates and sort by confidence
    const uniqueLocations = this.deduplicateAndSort(detectedLocations);
    
    // VALIDATION STEP 2: Reject locations containing attribute keywords (prevents bad data from leaking through)
    const BANNED_KEYWORDS = ['roi', 'rm', 'price', 'bedroom', 'bathroom', 'sqft', '%', 'at least', 'above', 'below', 'under', 'over'];
    const attributeFilteredLocations = uniqueLocations.filter(loc => {
      const nameLower = loc.name.toLowerCase();
      const normalizedNameLower = loc.normalizedName.toLowerCase();
      
      // Check both the result name AND the original query
      const hasBannedKeyword = BANNED_KEYWORDS.some(keyword => 
        nameLower.includes(keyword) || normalizedNameLower.includes(keyword)
      );
      
      if (hasBannedKeyword) {
        console.log(`🚫 REJECTED ATTRIBUTE KEYWORD: "${loc.name}" (query: "${loc.normalizedName}") contains banned keyword (likely bad data or attribute query)`);
        return false;
      }
      return true;
    });
    
    // VALIDATION STEP 3: Final confidence check - reject low confidence results
    const validLocations = attributeFilteredLocations.filter(loc => {
      if (loc.source === 'external' && loc.confidence < 0.6) {
        console.log(`🚫 REJECTED LOW CONFIDENCE: "${loc.name}" (confidence: ${loc.confidence})`);
        return false;
      }
      return true;
    });
    
    // Cache the results
    LOCATION_CACHE.set(cacheKey, validLocations);
    CACHE_TIMESTAMPS.set(cacheKey, Date.now());

    const extractedAreas = validLocations.map(loc => loc.name);
    const confidence = this.calculateOverallConfidence(validLocations);

    console.log(`✅ DETECTED LOCATIONS: Found ${validLocations.length} locations: ${extractedAreas.join(', ')}`);

    return {
      locations: validLocations,
      extractedAreas,
      confidence
    };
  }

  /**
   * Strategy 1: Database exact matches across all location tables
   */
  private async findDatabaseMatches(normalizedQuery: string): Promise<DetectedLocation[]> {
    const matches: DetectedLocation[] = [];
    console.log(`🗄️ DATABASE SEARCH: Checking for "${normalizedQuery}"`);

    // Extract individual words that might be city names
    const words = normalizedQuery.split(/\s+/).filter(word => 
      word.length >= 3 && // Minimum 3 characters
      !['for', 'in', 'at', 'near', 'the', 'and', 'apartment', 'condo', 'house', 'room', 'unit', 'first-time', 'buyers', 'modern', 'new', 'under', 'above', 'below'].includes(word)
    );
    
    // Generate multi-word combinations (2-word and 3-word)
    const multiWordCombos: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      // 2-word combinations
      multiWordCombos.push(`${words[i]} ${words[i + 1]}`);
      
      // 3-word combinations
      if (i < words.length - 2) {
        multiWordCombos.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
      }
    }
    
    const searchTerms = [normalizedQuery, ...multiWordCombos, ...words]; // Search full query, multi-word combos, and individual words
    console.log(`🔍 SEARCH TERMS: Checking ${searchTerms.length} terms: [${searchTerms.join(', ')}]`);

    try {
      for (const searchTerm of searchTerms) {
        // Check cities table (note: no state info in direct query for now)
        const cityMatches = await db.execute(
          sql`SELECT name, latitude, longitude, 'city' as type
              FROM cities 
              WHERE LOWER(name) = ${searchTerm}
              LIMIT 3`
        );

        for (const row of cityMatches.rows) {
          const city = row as any;
          matches.push({
            name: city.name,
            normalizedName: searchTerm,
            latitude: parseFloat(city.latitude),
            longitude: parseFloat(city.longitude),
            source: 'cities',
            confidence: 1.0,
            type: 'city'
          });
          console.log(`🏙️ FOUND CITY: ${city.name} at (${city.latitude}, ${city.longitude}) via term "${searchTerm}"`);
        }

        // Check areas table (note: no city_name in direct query for now)
        const areaMatches = await db.execute(
          sql`SELECT name, latitude, longitude, 'area' as type
              FROM areas 
              WHERE LOWER(name) = ${searchTerm}
              LIMIT 3`
        );

        for (const row of areaMatches.rows) {
          const area = row as any;
          matches.push({
            name: area.name,
            normalizedName: searchTerm,
            latitude: parseFloat(area.latitude),
            longitude: parseFloat(area.longitude),
            source: 'areas',
            confidence: 0.95,
            type: 'area'
          });
          console.log(`🏘️ FOUND AREA: ${area.name} at (${area.latitude}, ${area.longitude}) via term "${searchTerm}"`);
        }

        // Check malaysian_locations table
        const locationMatches = await db.execute(
          sql`SELECT name, latitude, longitude, type, confidence_score
              FROM malaysian_locations 
              WHERE normalized_name = ${searchTerm}
              LIMIT 3`
        );

        for (const row of locationMatches.rows) {
          const location = row as any;
          matches.push({
            name: location.name,
            normalizedName: searchTerm,
            latitude: parseFloat(location.latitude),
            longitude: parseFloat(location.longitude),
            source: 'malaysian_locations',
            confidence: parseFloat(location.confidence_score || '0.9'),
            type: location.type === 'area' ? 'area' : 'landmark'
          });
          console.log(`📍 FOUND LOCATION: ${location.name} at (${location.latitude}, ${location.longitude}) via term "${searchTerm}"`);
        }
        // Check malaysian buildings table
        const buildingMatches = await db.execute(
          sql`SELECT name, latitude, longitude, area, city, type
              FROM malaysian_buildings 
              WHERE LOWER(name) = ${searchTerm}
              LIMIT 3`
        );

        for (const row of buildingMatches.rows) {
          const building = row as any;
          matches.push({
            name: building.name,
            normalizedName: searchTerm,
            latitude: parseFloat(building.latitude),
            longitude: parseFloat(building.longitude),
            source: 'buildings',
            confidence: 0.9,
            type: 'building',
            parentInfo: { area: building.area, city: building.city }
          });
          console.log(`🏢 FOUND BUILDING: ${building.name} at (${building.latitude}, ${building.longitude}) via term "${searchTerm}"`);
        }

        // Check transport stations
        const stationMatches = await db.execute(
          sql`SELECT station_name as name, latitude, longitude, transport_type, line_name
              FROM transport_stations 
              WHERE LOWER(station_name) = ${searchTerm}
              LIMIT 3`
        );

        for (const row of stationMatches.rows) {
          const station = row as any;
          matches.push({
            name: station.name,
            normalizedName: searchTerm,
            latitude: parseFloat(station.latitude),
            longitude: parseFloat(station.longitude),
            source: 'transport_stations',
            confidence: 0.95,
            type: 'station',
            parentInfo: { area: `${station.transport_type} - ${station.line_name}` }
          });
          console.log(`🚇 FOUND STATION: ${station.name} (${station.transport_type}) at (${station.latitude}, ${station.longitude}) via term "${searchTerm}"`);
        }
      }

    } catch (error) {
      console.error('Database search error:', error);
    }

    return matches;
  }

  /**
   * Strategy 2: Pattern-based matching for abbreviations and special cases
   */
  private async findPatternMatches(normalizedQuery: string): Promise<DetectedLocation[]> {
    const matches: DetectedLocation[] = [];
    console.log(`🎯 PATTERN SEARCH: Checking patterns for "${normalizedQuery}"`);

    // Check city abbreviations (with word boundary matching to prevent false positives like "sa" in "desa")
    for (const [fullName, abbreviations] of Object.entries(MALAYSIAN_LOCATION_PATTERNS.cities)) {
      if (abbreviations.some(abbr => {
        // Check if abbreviation contains non-ASCII (Chinese, Tamil, etc.) - use substring matching
        const isNonLatin = /[^\x00-\x7F]/.test(abbr);
        if (isNonLatin) {
          // For Chinese/Tamil characters, use substring matching directly
          return normalizedQuery.includes(abbr);
        }
        
        // For Latin characters, use word boundaries for short abbreviations
        if (abbr.length <= 2) {
          // Use word boundary or start/end of string for 2-char abbreviations
          const wordBoundaryRegex = new RegExp(`(^|\\s|[^a-zA-Z])${abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|[^a-zA-Z]|$)`, 'i');
          return wordBoundaryRegex.test(normalizedQuery);
        } else {
          return normalizedQuery.toLowerCase().includes(abbr.toLowerCase());
        }
      })) {
        // Look up the full city name in database
        const cityData = await this.lookupCityByName(fullName);
        if (cityData) {
          matches.push({
            ...cityData,
            confidence: 0.85 // Slightly lower confidence for abbreviations
          });
          console.log(`🔤 PATTERN MATCH: "${normalizedQuery}" → "${fullName}"`);
        }
      }
    }

    // Check landmark patterns
    for (const [landmark, variants] of Object.entries(MALAYSIAN_LOCATION_PATTERNS.landmarks)) {
      if (variants.some(variant => normalizedQuery.includes(variant))) {
        const landmarkData = await this.lookupLandmark(landmark);
        if (landmarkData) {
          matches.push({
            ...landmarkData,
            confidence: 0.8
          });
          console.log(`🏢 LANDMARK MATCH: "${normalizedQuery}" → "${landmark}"`);
        }
      }
    }

    // Check sectional patterns (SS2, USJ1, etc.)
    for (const [sectionType, pattern] of Object.entries(MALAYSIAN_LOCATION_PATTERNS.sections)) {
      if (typeof pattern === 'object' && pattern.test && pattern.test(normalizedQuery)) {
        const match = normalizedQuery.match(pattern);
        if (match) {
          const sectionData = await this.lookupSection(sectionType, match[0]);
          if (sectionData) {
            matches.push({
              ...sectionData,
              confidence: 0.75
            });
            console.log(`📍 SECTION MATCH: "${normalizedQuery}" → "${match[0]}"`);
          }
        }
      }
    }

    return matches;
  }

  /**
   * Strategy 3: Fuzzy/partial matching across all tables
   */
  private async findFuzzyMatches(normalizedQuery: string): Promise<DetectedLocation[]> {
    const matches: DetectedLocation[] = [];
    console.log(`🔍 FUZZY SEARCH: Partial matching for "${normalizedQuery}"`);

    if (normalizedQuery.length < 3) {
      return matches; // Skip fuzzy search for very short queries
    }

    try {
      // Fuzzy search in cities
      const fuzzyCity = await db.execute(
        sql`SELECT name, latitude, longitude, 'city' as type,
                   CASE 
                     WHEN LOWER(name) LIKE ${normalizedQuery + '%'} THEN 0.9
                     WHEN LOWER(name) LIKE ${`%${normalizedQuery}%`} THEN 0.7
                     ELSE 0.5
                   END as match_score
            FROM cities 
            WHERE LOWER(name) LIKE ${`%${normalizedQuery}%`}
            ORDER BY match_score DESC
            LIMIT 2`
      );

      for (const row of fuzzyCity.rows) {
        const city = row as any;
        matches.push({
          name: city.name,
          normalizedName: normalizedQuery,
          latitude: parseFloat(city.latitude),
          longitude: parseFloat(city.longitude),
          source: 'cities',
          confidence: parseFloat(city.match_score),
          type: 'city'
        });
        console.log(`🔍 FUZZY CITY: "${normalizedQuery}" → "${city.name}" (confidence: ${city.match_score})`);
      }

      // Fuzzy search in areas
      const fuzzyArea = await db.execute(
        sql`SELECT name, latitude, longitude, 'area' as type,
                   CASE 
                     WHEN LOWER(name) LIKE ${normalizedQuery + '%'} THEN 0.85
                     WHEN LOWER(name) LIKE ${`%${normalizedQuery}%`} THEN 0.65
                     ELSE 0.45
                   END as match_score
            FROM areas 
            WHERE LOWER(name) LIKE ${`%${normalizedQuery}%`}
            ORDER BY match_score DESC
            LIMIT 2`
      );

      for (const row of fuzzyArea.rows) {
        const area = row as any;
        matches.push({
          name: area.name,
          normalizedName: normalizedQuery,
          latitude: parseFloat(area.latitude),
          longitude: parseFloat(area.longitude),
          source: 'areas',
          confidence: parseFloat(area.match_score),
          type: 'area'
        });
        console.log(`🔍 FUZZY AREA: "${normalizedQuery}" → "${area.name}" (confidence: ${area.match_score})`);
      }

    } catch (error) {
      console.error('Fuzzy search error:', error);
    }

    return matches;
  }

  /**
   * Strategy 4: External geocoding fallback with GPT abbreviation expansion
   */
  private async findExternalMatches(query: string): Promise<DetectedLocation[]> {
    const matches: DetectedLocation[] = [];
    console.log(`🌐 EXTERNAL SEARCH: Using geocoding for "${query}"`);

    try {
      // Try GPT abbreviation expansion first (for unknown abbreviations like "BU", "TTDI", etc.)
      const abbreviationResult = await expandMalaysianAbbreviation(query);
      if (abbreviationResult) {
        matches.push({
          name: abbreviationResult.expandedName,
          normalizedName: query.toLowerCase().trim(),
          latitude: abbreviationResult.latitude,
          longitude: abbreviationResult.longitude,
          source: 'external',
          confidence: abbreviationResult.confidence,
          type: 'area'
        });
        console.log(`🤖 GPT ABBREVIATION MATCH: "${query}" → "${abbreviationResult.expandedName}" at (${abbreviationResult.latitude}, ${abbreviationResult.longitude})`);
        return matches; // Return early if GPT found a match
      }

      // Fall back to full geocoding service
      const geocodingResult = await this.enhancedGeocoding.getLocationCoordinates(query);
      if (geocodingResult) {
        matches.push({
          name: geocodingResult.name,
          normalizedName: query.toLowerCase().trim(),
          latitude: geocodingResult.lat,
          longitude: geocodingResult.lng,
          source: 'external',
          confidence: geocodingResult.confidence,
          type: 'landmark'
        });
        console.log(`🌐 EXTERNAL MATCH: "${query}" → "${geocodingResult.name}" at (${geocodingResult.lat}, ${geocodingResult.lng})`);
      }
    } catch (error) {
      console.error('External geocoding error:', error);
    }

    return matches;
  }

  // Hardcoded coordinates for common Malaysian cities (fallback when DB lookup fails)
  private static readonly CITY_COORDINATES: Record<string, { lat: number; lng: number; display: string }> = {
    // Klang Valley / Greater KL
    'kuala lumpur': { lat: 3.1390, lng: 101.6869, display: 'Kuala Lumpur' },
    'petaling jaya': { lat: 3.1073, lng: 101.6067, display: 'Petaling Jaya' },
    'shah alam': { lat: 3.0738, lng: 101.5183, display: 'Shah Alam' },
    'subang jaya': { lat: 3.0565, lng: 101.5860, display: 'Subang Jaya' },
    'klang': { lat: 3.0449, lng: 101.4455, display: 'Klang' },
    'kajang': { lat: 2.9927, lng: 101.7909, display: 'Kajang' },
    'ampang': { lat: 3.1540, lng: 101.7601, display: 'Ampang' },
    'cheras': { lat: 3.1073, lng: 101.7263, display: 'Cheras' },
    'puchong': { lat: 3.0233, lng: 101.6172, display: 'Puchong' },
    'cyberjaya': { lat: 2.9213, lng: 101.6559, display: 'Cyberjaya' },
    'putrajaya': { lat: 2.9264, lng: 101.6964, display: 'Putrajaya' },
    'bandar sunway': { lat: 3.0738, lng: 101.6014, display: 'Bandar Sunway' },
    'damansara': { lat: 3.1373, lng: 101.6175, display: 'Damansara' },
    'bangsar': { lat: 3.1289, lng: 101.6710, display: 'Bangsar' },
    'mont kiara': { lat: 3.1730, lng: 101.6526, display: 'Mont Kiara' },
    'kepong': { lat: 3.2105, lng: 101.6374, display: 'Kepong' },
    'usj': { lat: 3.0440, lng: 101.5895, display: 'USJ, Subang Jaya' },
    'ttdi': { lat: 3.1415, lng: 101.6302, display: 'TTDI' },
    'setapak': { lat: 3.1938, lng: 101.7170, display: 'Setapak' },
    'wangsa maju': { lat: 3.2024, lng: 101.7362, display: 'Wangsa Maju' },
    'selayang': { lat: 3.2564, lng: 101.6372, display: 'Selayang' },
    'batu caves': { lat: 3.2379, lng: 101.6840, display: 'Batu Caves' },
    // Other major Malaysian cities
    'george town': { lat: 5.4141, lng: 100.3288, display: 'George Town, Penang' },
    'penang': { lat: 5.4141, lng: 100.3288, display: 'Penang' },
    'johor bahru': { lat: 1.4927, lng: 103.7414, display: 'Johor Bahru' },
    'ipoh': { lat: 4.5975, lng: 101.0901, display: 'Ipoh' },
    'melaka': { lat: 2.1896, lng: 102.2501, display: 'Melaka' },
    'kota kinabalu': { lat: 5.9804, lng: 116.0735, display: 'Kota Kinabalu' },
    'kuching': { lat: 1.5535, lng: 110.3593, display: 'Kuching' },
    'seremban': { lat: 2.7297, lng: 101.9381, display: 'Seremban' },
    'alor setar': { lat: 6.1248, lng: 100.3678, display: 'Alor Setar' },
    'kuantan': { lat: 3.8077, lng: 103.3260, display: 'Kuantan' },
    'kota bharu': { lat: 6.1254, lng: 102.2381, display: 'Kota Bharu' },
    'kuala terengganu': { lat: 5.3117, lng: 103.1324, display: 'Kuala Terengganu' },
  };

  /**
   * Helper: Look up city by full name
   */
  private async lookupCityByName(cityName: string): Promise<DetectedLocation | null> {
    const normalizedCityName = cityName.toLowerCase().trim();
    
    try {
      const result = await db.execute(
        sql`SELECT name, latitude, longitude
            FROM cities 
            WHERE LOWER(name) = ${normalizedCityName}
            LIMIT 1`
      );

      if (result.rows.length > 0) {
        const row = result.rows[0] as any;
        return {
          name: row.name,
          normalizedName: normalizedCityName,
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          source: 'cities',
          confidence: 0.9,
          type: 'city'
        };
      }
    } catch (error) {
      console.error(`Error looking up city ${cityName}:`, error);
    }

    // Fallback to hardcoded coordinates for common cities
    const fallback = MalaysianLocationDetectionService.CITY_COORDINATES[normalizedCityName];
    if (fallback) {
      console.log(`📍 FALLBACK COORDS: Using hardcoded coordinates for "${cityName}"`);
      return {
        name: fallback.display,
        normalizedName: normalizedCityName,
        latitude: fallback.lat,
        longitude: fallback.lng,
        source: 'cities',
        confidence: 0.85,
        type: 'city'
      };
    }

    return null;
  }

  /**
   * Helper: Look up landmark 
   */
  private async lookupLandmark(landmarkName: string): Promise<DetectedLocation | null> {
    try {
      // First check malaysian_locations
      const locationResult = await db.execute(
        sql`SELECT name, latitude, longitude, confidence_score
            FROM malaysian_locations 
            WHERE LOWER(name) LIKE ${`%${landmarkName.toLowerCase()}%`}
            LIMIT 1`
      );

      if (locationResult.rows.length > 0) {
        const row = locationResult.rows[0] as any;
        return {
          name: row.name,
          normalizedName: landmarkName.toLowerCase(),
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          source: 'malaysian_locations',
          confidence: parseFloat(row.confidence_score || '0.8'),
          type: 'landmark'
        };
      }

      // Then check buildings
      const buildingResult = await db.execute(
        sql`SELECT name, latitude, longitude, area, city
            FROM malaysian_buildings 
            WHERE LOWER(name) LIKE ${`%${landmarkName.toLowerCase()}%`}
            LIMIT 1`
      );

      if (buildingResult.rows.length > 0) {
        const row = buildingResult.rows[0] as any;
        return {
          name: row.name,
          normalizedName: landmarkName.toLowerCase(),
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          source: 'buildings',
          confidence: 0.8,
          type: 'building',
          parentInfo: { area: row.area, city: row.city }
        };
      }
    } catch (error) {
      console.error(`Error looking up landmark ${landmarkName}:`, error);
    }

    return null;
  }

  /**
   * Helper: Look up sectional areas (SS2, USJ1, etc.)
   */
  private async lookupSection(sectionType: string, sectionName: string): Promise<DetectedLocation | null> {
    try {
      // Look for sectional areas in the areas table
      const result = await db.execute(
        sql`SELECT name, latitude, longitude
            FROM areas 
            WHERE LOWER(name) LIKE ${`%${sectionName.toLowerCase()}%`}
            LIMIT 1`
      );

      if (result.rows.length > 0) {
        const row = result.rows[0] as any;
        return {
          name: row.name,
          normalizedName: sectionName.toLowerCase(),
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          source: 'areas',
          confidence: 0.75,
          type: 'area'
        };
      }
    } catch (error) {
      console.error(`Error looking up section ${sectionName}:`, error);
    }

    return null;
  }

  /**
   * Remove duplicates and sort by confidence
   */
  private deduplicateAndSort(locations: DetectedLocation[]): DetectedLocation[] {
    const seen = new Set<string>();
    const unique: DetectedLocation[] = [];

    // Sort by confidence first, then by source priority
    const sorted = locations.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      
      const sourcePriority = {
        'cities': 1,
        'areas': 2,
        'malaysian_locations': 3,
        'buildings': 4,
        'transport_stations': 5,
        'external': 6
      };
      
      return (sourcePriority[a.source] || 7) - (sourcePriority[b.source] || 7);
    });

    for (const location of sorted) {
      const key = `${location.name.toLowerCase()}-${location.latitude.toFixed(4)}-${location.longitude.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(location);
      }
    }

    return unique.slice(0, 3); // Return top 3 results
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(locations: DetectedLocation[]): number {
    if (locations.length === 0) return 0;
    
    const avgConfidence = locations.reduce((sum, loc) => sum + loc.confidence, 0) / locations.length;
    const countBonus = Math.min(locations.length * 0.1, 0.3); // Bonus for multiple matches
    
    return Math.min(avgConfidence + countBonus, 1.0);
  }

  /**
   * Cache management
   */
  private isValidCache(key: string): boolean {
    const timestamp = CACHE_TIMESTAMPS.get(key);
    if (!timestamp) return false;
    
    const isValid = Date.now() - timestamp < CACHE_EXPIRY;
    if (!isValid) {
      LOCATION_CACHE.delete(key);
      CACHE_TIMESTAMPS.delete(key);
    }
    
    return isValid && LOCATION_CACHE.has(key);
  }

  /**
   * Clear cache (for testing/debugging)
   */
  public clearCache(): void {
    LOCATION_CACHE.clear();
    CACHE_TIMESTAMPS.clear();
    console.log('🧹 Location detection cache cleared');
  }

  /**
   * VALIDATION STEP 1: Check if search text is valid before processing
   */
  private isValidSearchText(query: string): boolean {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Reject empty or very short nonsensical input
    if (normalizedQuery.length < 2) {
      return false;
    }
    
    // Reject if contains only numbers or special characters
    if (/^[\d\s\-_!@#$%^&*()]+$/.test(normalizedQuery)) {
      return false;
    }
    
    // Reject obvious nonsensical patterns
    // - Random character sequences (like "jhszugjaka")
    // - More than 3 consecutive consonants without vowels (indicating gibberish)
    // - All consonants or very few vowels
    const vowelCount = (normalizedQuery.match(/[aeiou]/g) || []).length;
    const consonantCount = (normalizedQuery.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
    const totalLetters = vowelCount + consonantCount;
    
    // If it's mostly letters but has very few vowels, likely nonsensical
    if (totalLetters > 4 && vowelCount < totalLetters * 0.2) {
      console.log(`🚫 NONSENSICAL TEXT: "${query}" has too few vowels (${vowelCount}/${totalLetters})`);
      return false;
    }
    
    // Check for consecutive consonants indicating gibberish
    if (/[bcdfghjklmnpqrstvwxyz]{5,}/.test(normalizedQuery)) {
      console.log(`🚫 NONSENSICAL TEXT: "${query}" has too many consecutive consonants`);
      return false;
    }
    
    // Reject if it looks like random typing (alternating unusual character patterns)
    if (/^[a-z]{2,}[a-z]{2,}[a-z]{2,}$/.test(normalizedQuery) && 
        !this.containsKnownLocationWords(normalizedQuery)) {
      console.log(`🚫 NONSENSICAL TEXT: "${query}" appears to be random typing`);
      return false;
    }
    
    return true;
  }

  /**
   * Check if query contains known location-related words
   */
  private containsGenuineLocationWords(query: string): boolean {
    // Only GENUINE location keywords (not property types)
    const locationKeywords = [
      // Malaysian cities and areas
      'kuala', 'lumpur', 'petaling', 'jaya', 'shah', 'alam', 'subang', 'klang', 
      'kajang', 'ampang', 'cheras', 'puchong', 'cyberjaya', 'putrajaya', 'bangsar',
      'mont', 'kiara', 'ttdi', 'setapak', 'wangsa', 'maju', 'kepong', 'selayang',
      'batu', 'caves', 'damansara', 'sunway', 'usj',
      
      // Location-specific terms (not property types)
      'mall', 'shopping', 'center', 'centre', 'station', 'mrt', 'lrt', 'ktm', 
      'monorail', 'near', 'close', 'walking', 'distance', 'area', 'district',
      'taman', 'bandar', 'jalan', 'road', 'street', 'avenue', 'plaza', 'tower',
      'building', 'block', ' in ', ' near '  // " in Bangsar", " near KLCC"
    ];
    
    return locationKeywords.some(keyword => query.includes(keyword));
  }

  /**
   * VALIDATION STEP 2: Determine if external search should be attempted
   */
  private isValidForExternalSearch(query: string): boolean {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Don't use external search for very short queries
    if (normalizedQuery.length < 3) {
      return false;
    }
    
    // PRIORITY CHECK 1: Check for attribute keywords FIRST (before location check)
    // This prevents "Shop with ROI 4.5%" from triggering expensive external geocoding
    const attributeKeywords = [
      'roi', 'return on investment', 
      'bedroom', 'bed', 'bedrooms',
      'bathroom', 'bath', 'bathrooms',
      'under rm', 'above rm', 'below rm', 
      'sqft', 'square feet', 'size',
      'at least', 'minimum', 'maximum', '%'
    ];
    
    const hasAttributeKeywords = attributeKeywords.some(keyword => 
      normalizedQuery.includes(keyword)
    );
    
    // If has attribute keywords, only allow external search if GENUINE location words are present
    if (hasAttributeKeywords) {
      if (this.containsGenuineLocationWords(normalizedQuery)) {
        console.log(`✅ MIXED QUERY: "${query}" has both attributes and location - external search allowed for location extraction`);
        return true; // "Shop in Bangsar with ROI 4.5%" → allow for "Bangsar"
      } else {
        console.log(`🚫 LOCATION DETECTION SKIPPED: "${query}" is a pure attribute-based search (no genuine location keywords)`);
        return false; // "Shop with ROI 4.5%" → skip external search
      }
    }
    
    // PRIORITY CHECK 2: If query contains genuine location words, allow external search
    if (this.containsGenuineLocationWords(normalizedQuery)) {
      return true;
    }
    
    // Allow external search for sectional patterns (SS2, USJ1, etc.)
    if (/^(ss|usj|pj)\s*\d+$/i.test(normalizedQuery)) {
      return true;
    }
    
    // Allow for queries that look like building names (proper capitalization)
    const originalQuery = query.trim();
    if (/^[A-Z][a-zA-Z0-9\s]{2,}$/.test(originalQuery)) {
      return true;
    }
    
    console.log(`🚫 EXTERNAL SEARCH BLOCKED: "${query}" doesn't appear to be a location`);
    return false;
  }
}

// Export singleton instance
export const malaysianLocationDetection = new MalaysianLocationDetectionService();