import OpenAI from "openai";
import { storage } from "../storage";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ParsedSearchQuery {
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  listingType?: 'rent' | 'sale';
  minPrice?: number;
  maxPrice?: number;
  minROI?: number;
  maxROI?: number;
  nearTransport?: {
    types: string[];
    maxDistanceMeters: number;
    stationNames?: string[];
  };
  city?: string;
  state?: string;
  amenities?: string[];
  originalQuery: string;
  confidence: number;
}

export class NLPSearchService {
  /**
   * Parse natural language search query into structured filters
   */
  async parseSearchQuery(query: string): Promise<ParsedSearchQuery> {
    try {
      // Normalize query for cache lookup
      const normalizedQuery = query.trim().toLowerCase();
      
      // Check cache first (70-85% cost reduction)
      const cached = await storage.getCachedAiQuery(normalizedQuery);
      if (cached && cached.parsedFilters) {
        console.log(`🎯 AI Query Cache HIT: "${query}" (saved ~${cached.tokensUsed || 0} tokens)`);
        await storage.logApiUsage({
          service: 'openai_query_parsing',
          requestType: 'parse_query',
          query: query,
          cacheHit: true,
          estimatedCost: 0, // No cost for cached queries
          responseTime: 0,
          success: true
        });
        
        return {
          ...(cached.parsedFilters as any),
          originalQuery: query,
          confidence: cached.confidence || 0.8
        } as ParsedSearchQuery;
      }

      // Try simple regex/keyword parsing first for speed
      const simpleResult = this.simpleParseQuery(query);
      if (simpleResult.confidence > 0.7) {
        // Cache simple parsing results too
        await storage.saveCachedAiQuery({
          normalizedQuery,
          originalQuery: query,
          parsedFilters: simpleResult,
          searchType: simpleResult.listingType,
          confidence: simpleResult.confidence,
          modelUsed: 'heuristic',
          tokensUsed: 0
        });
        
        console.log(`✅ Simple parsing (confidence: ${simpleResult.confidence})`);
        return simpleResult;
      }

      // Use AI for complex queries
      const aiResult = await this.aiParseQuery(query);
      
      // Cache AI parsing results
      await storage.saveCachedAiQuery({
        normalizedQuery,
        originalQuery: query,
        parsedFilters: aiResult,
        searchType: aiResult.listingType,
        confidence: aiResult.confidence || 0.8,
        modelUsed: 'gpt-4o-mini',
        tokensUsed: 150 // Estimate for gpt-4o-mini
      });
      
      return aiResult;
    } catch (error) {
      console.error("Error parsing search query:", error);
      // Fallback to simple parsing
      return this.simpleParseQuery(query);
    }
  }

  /**
   * Simple regex-based parsing for common patterns (fast)
   */
  private simpleParseQuery(query: string): ParsedSearchQuery {
    // Trim and normalize the query to handle trailing spaces
    const normalizedQuery = query.trim().replace(/\s+/g, ' ');
    const lowerQuery = normalizedQuery.toLowerCase();
    const result: ParsedSearchQuery = {
      originalQuery: normalizedQuery,
      confidence: 0.5
    };

    // Extract bedrooms with match type (exact or minimum)
    // Check for "at least", "more than", "minimum" patterns first
    const minBedroomPatterns = [
      /(?:at least|minimum|min|more than)\s+(\d+)\s*(?:bed|bedroom|br)s?/i,
      /(\d+)\s*(?:bed|bedroom|br)s?\s+(?:or more|and above|\+)/i
    ];
    
    let bedroomMatchType: 'exact' | 'minimum' = 'exact'; // Default to exact match
    
    for (const pattern of minBedroomPatterns) {
      const match = query.match(pattern);
      if (match) {
        result.bedrooms = parseInt(match[1]);
        bedroomMatchType = 'minimum';
        result.confidence += 0.2;
        break;
      }
    }
    
    // If no minimum pattern found, try exact patterns
    if (!result.bedrooms) {
      const bedroomPatterns = [
        /(\d+)\s*(?:bed|bedroom|br)s?/i,
        /(\d+)\s*r\d*m/i, // e.g., "3r2b", "2rm"
        /(\d+)\s*(?:bilik|rooms?)/i // Malay
      ];
      
      for (const pattern of bedroomPatterns) {
        const match = query.match(pattern);
        if (match) {
          result.bedrooms = parseInt(match[1]);
          bedroomMatchType = 'exact'; // Exact match by default
          result.confidence += 0.2;
          break;
        }
      }
    }
    
    // Store match type for downstream use
    (result as any).bedroomMatchType = bedroomMatchType;

    // Extract bathrooms  
    const bathroomPatterns = [
      /(\d+)\s*(?:bath|bathroom|washroom)s?/i,
      /\d+r(\d+)b/i, // e.g., "3r2b"
      /(\d+)\s*(?:bilik air|toilet)/i // Malay
    ];
    
    for (const pattern of bathroomPatterns) {
      const match = query.match(pattern);
      if (match) {
        result.bathrooms = parseInt(match[1]);
        result.confidence += 0.1;
        break;
      }
    }

    // Extract property type (ensure enum compatibility)
    const propertyTypeMap = {
      'condominium': ['condo', 'condominium', 'kondominium'],
      'apartment': ['apartment', 'apt', 'flat'],
      'house': ['house', 'rumah', 'landed', 'terrace', 'semi-d', 'bungalow'],
      'studio': ['studio'],
      'service-residence': ['service residence', 'serviced residence', 'serviced apartment', 'soho'],
      'commercial': ['shop', 'office', 'retail', 'commercial', 'workspace'],
      'industrial': ['warehouse', 'factory', 'industrial', 'logistics', 'storage', 'gudang']
    };

    // Check industrial first (highest priority for warehouse/factory terms)
    if (propertyTypeMap.industrial.some(keyword => lowerQuery.includes(keyword))) {
      result.propertyType = 'industrial';
      result.confidence += 0.3;
    } else if (propertyTypeMap.commercial.some(keyword => lowerQuery.includes(keyword))) {
      // Check commercial keywords explicitly
      result.propertyType = 'commercial';
      result.confidence += 0.3;
    } else {
      // Check other specific property types with exact matching
      for (const [type, keywords] of Object.entries(propertyTypeMap)) {
        if (type !== 'industrial' && type !== 'commercial') {
          for (const keyword of keywords) {
            // Use word boundary matching to avoid partial matches
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(query)) {
              result.propertyType = type;
              result.confidence += 0.2;
              console.log(`🏢 Detected property type: "${type}" from keyword: "${keyword}"`);
              break;
            }
          }
          if (result.propertyType) break;
        }
      }
    }

    // Extract listing type
    if (lowerQuery.includes('rent') || lowerQuery.includes('rental') || lowerQuery.includes('sewa')) {
      result.listingType = 'rent';
      result.confidence += 0.1;
    } else if (lowerQuery.includes('buy') || lowerQuery.includes('sale') || lowerQuery.includes('purchase') || lowerQuery.includes('beli')) {
      result.listingType = 'sale';
      result.confidence += 0.1;
    }

    // Extract transport proximity
    const transportKeywords = {
      'MRT': ['mrt', 'mass rapid transit'],
      'LRT': ['lrt', 'light rail', 'light rail transit'],
      'Monorail': ['monorail'],
      'KTM': ['ktm', 'keretapi', 'train'],
      'BRT': ['brt', 'bus rapid transit']
    };

    const nearKeywords = ['near', 'close to', 'walking distance', 'nearby', 'next to', 'dekat', 'berhampiran'];
    const hasNearKeyword = nearKeywords.some(keyword => lowerQuery.includes(keyword));

    if (hasNearKeyword) {
      const detectedTypes = [];
      const stationNames = [];
      
      for (const [type, keywords] of Object.entries(transportKeywords)) {
        if (keywords.some(keyword => lowerQuery.includes(keyword))) {
          detectedTypes.push(type);
          
          // Extract station name after transport type - improved extraction
          const typeKeyword = keywords.find(keyword => lowerQuery.includes(keyword));
          if (typeKeyword) {
            // Look for station name after the transport type keyword
            // Support multiple patterns: "MRT Surian", "near MRT Surian", "MRT KLCC station"
            // Exclude price patterns like "below RM3000", "under RM2000", etc.
            const patterns = [
              // Pattern for clear station names: "MRT Surian", "LRT Kelana Jaya"
              // Must be followed by end of string or station keyword  
              new RegExp(`${typeKeyword}\\s+([A-Z][A-Za-z0-9\\s]{2,15})(?:\\s+station|(?=\\s*$))`, 'i'),
              // Pattern that stops before common query terms (prevents "rly parents near" extraction)
              new RegExp(`${typeKeyword}\\s+([A-Z][A-Za-z0-9\\s]{2,15})(?=\\s+(?:for|under|below|above|rm|near|within|walking|station))`, 'i')
            ];
            
            for (const regex of patterns) {
              const stationMatch = query.match(regex);
              if (stationMatch) {
                const stationName = stationMatch[1].trim();
                // Enhanced filtering to prevent false positives like "rly parents near"
                const priceKeywords = ['below', 'under', 'above', 'rm', 'ringgit', 'k', 'thousand'];
                const propertyKeywords = ['condo', 'apartment', 'house', 'office', 'shop', 'land', 'near', 'close'];
                const queryTerms = ['for', 'elderly', 'parents', 'family', 'investment', 'couple'];
                
                const isPriceRelated = priceKeywords.some(keyword => 
                  stationName.toLowerCase().includes(keyword)
                );
                const isPropertyKeyword = propertyKeywords.some(keyword => 
                  stationName.toLowerCase().includes(keyword)
                );
                const isQueryTerm = queryTerms.some(keyword => 
                  stationName.toLowerCase().includes(keyword)
                );
                
                if (stationName && stationName.length > 0 && !isPriceRelated && !isPropertyKeyword && !isQueryTerm) {
                  stationNames.push(stationName);
                  console.log(`🚉 Extracted station name: "${stationName}" for ${type}`);
                  break;
                }
              }
            }
          }
        }
      }

      if (detectedTypes.length > 0) {
        result.nearTransport = {
          types: detectedTypes,
          maxDistanceMeters: this.extractDistanceFromQuery(lowerQuery) || 1250, // Default 15 mins walking (1250m)
          stationNames: stationNames.length > 0 ? stationNames : undefined
        };
        result.confidence += 0.3;
        
        console.log(`🚉 Transport search detected:`, result.nearTransport);
        // No auto-filtering - show all property types for transport searches
      }
    }

    // Extract specific locations/cities
    const malaysianCities = [
      'kuala lumpur', 'kl', 'petaling jaya', 'pj', 'mont kiara', 'klcc', 
      'ampang', 'cheras', 'kepong', 'setiawangsa', 'wangsa maju', 'sri hartamas',
      'damansara', 'subang jaya', 'shah alam', 'cyberjaya', 'putrajaya',
      'kajang', 'seremban', 'selangor', 'johor', 'penang'
    ];

    for (const city of malaysianCities) {
      if (lowerQuery.includes(city)) {
        result.city = city;
        result.confidence += 0.1;
        break;
      }
    }

    // Extract price range - enhanced patterns
    // Pattern 1: "below RM3000", "under RM5000", "below RM2.7k"
    const belowPriceMatch = query.match(/(?:below|under)\s*rm\s*([\d,.]+k?)/i);
    if (belowPriceMatch) {
      let priceStr = belowPriceMatch[1].replace(/,/g, '');
      // Handle 'k' suffix for thousands (e.g., '2.7k' -> 2700)
      if (priceStr.toLowerCase().endsWith('k')) {
        const numericPart = parseFloat(priceStr.slice(0, -1));
        result.maxPrice = Math.round(numericPart * 1000);
      } else {
        result.maxPrice = parseInt(priceStr);
      }
      result.confidence += 0.2;
      console.log(`💰 Extracted max price: RM${result.maxPrice} from "below/under" pattern`);
    }
    
    // Pattern 2: "above RM2000", "over RM3000"
    const abovePriceMatch = query.match(/(?:above|over)\s*rm\s*([\d,]+)/i);
    if (abovePriceMatch) {
      result.minPrice = parseInt(abovePriceMatch[1].replace(/,/g, ''));
      result.confidence += 0.2;
      console.log(`💰 Extracted min price: RM${result.minPrice} from "above/over" pattern`);
    }
    
    // Pattern 3: Range "RM2000-RM5000" or specific "RM3000"
    const rangePriceMatch = query.match(/rm\s*([\d,]+)(?:\s*[-to]\s*rm\s*([\d,]+))?/i);
    if (rangePriceMatch && !belowPriceMatch && !abovePriceMatch) {
      const price1 = parseInt(rangePriceMatch[1].replace(/,/g, ''));
      if (rangePriceMatch[2]) {
        const price2 = parseInt(rangePriceMatch[2].replace(/,/g, ''));
        result.minPrice = Math.min(price1, price2);
        result.maxPrice = Math.max(price1, price2);
        console.log(`💰 Extracted price range: RM${result.minPrice}-RM${result.maxPrice}`);
      } else {
        result.maxPrice = price1;
        console.log(`💰 Extracted max price: RM${result.maxPrice} from specific amount`);
      }
      result.confidence += 0.2;
    }

    // Extract ROI (Return on Investment) filters
    const roiPatterns = [
      /roi\s*(?:at least|minimum|min|above|over|>\s*)\s*(\d+(?:\.\d+)?)\s*%?/i,
      /roi\s*(?:below|under|max|maximum|<\s*)\s*(\d+(?:\.\d+)?)\s*%?/i,
      /(?:at least|minimum|min)\s*(\d+(?:\.\d+)?)\s*%?\s*roi/i,
      /(?:below|under|max|maximum)\s*(\d+(?:\.\d+)?)\s*%?\s*roi/i
    ];

    // Check for minimum ROI (at least, above, over)
    const minROIMatch = lowerQuery.match(/roi\s*(?:at least|minimum|min|above|over|>\s*)\s*(\d+(?:\.\d+)?)\s*%?/i) ||
                       lowerQuery.match(/(?:at least|minimum|min)\s*(\d+(?:\.\d+)?)\s*%?\s*roi/i);
    if (minROIMatch) {
      result.minROI = parseFloat(minROIMatch[1]);
      result.confidence += 0.2;
      console.log(`📈 Extracted minimum ROI: ${result.minROI}%`);
    }

    // Check for maximum ROI (below, under, max)
    const maxROIMatch = lowerQuery.match(/roi\s*(?:below|under|max|maximum|<\s*)\s*(\d+(?:\.\d+)?)\s*%?/i) ||
                       lowerQuery.match(/(?:below|under|max|maximum)\s*(\d+(?:\.\d+)?)\s*%?\s*roi/i);
    if (maxROIMatch) {
      result.maxROI = parseFloat(maxROIMatch[1]);
      result.confidence += 0.2;
      console.log(`📉 Extracted maximum ROI: ${result.maxROI}%`);
    }

    return result;
  }

  /**
   * AI-powered query parsing for complex natural language
   */
  private async aiParseQuery(query: string): Promise<ParsedSearchQuery> {
    try {
      const prompt = `Parse this Malaysian property search query into structured filters. Extract relevant information and return JSON.

Query: "${query}"

Extract these fields if mentioned:
- bedrooms: number of bedrooms (1-10)
- bathrooms: number of bathrooms (1-10)  
- propertyType: one of [apartment, condominium, house, studio, service-residence, commercial, industrial, warehouse, factory, land]
- listingType: "rent" or "sale"
- minPrice: minimum price in RM
- maxPrice: maximum price in RM
- minROI: minimum Return on Investment percentage (e.g., "ROI at least 4%" -> minROI: 4)
- maxROI: maximum Return on Investment percentage (e.g., "ROI below 6%" -> maxROI: 6)
- nearTransport: if mentions proximity to transport, include:
  - types: array of ["MRT", "LRT", "Monorail", "KTM", "BRT"]
  - maxDistanceMeters: distance in meters (default 1250 for "near" = 15 mins walking, 500 for "walking distance", 2000 for "close to")
  - stationNames: specific station names if mentioned
- city: Malaysian city/area name
- state: Malaysian state if mentioned
- amenities: array of mentioned amenities
- confidence: 0-1 score of parsing confidence

Examples:
"3 bedroom condo near MRT KLCC" -> {"bedrooms": 3, "propertyType": "condominium", "nearTransport": {"types": ["MRT"], "maxDistanceMeters": 1250, "stationNames": ["KLCC"]}}
"near MRT" -> {"nearTransport": {"types": ["MRT"], "maxDistanceMeters": 1250}}
"properties near LRT stations" -> {"nearTransport": {"types": ["LRT"], "maxDistanceMeters": 1250}}
"2rm apartment for rent in Mont Kiara under RM3000" -> {"bedrooms": 2, "propertyType": "apartment", "listingType": "rent", "city": "Mont Kiara", "maxPrice": 3000}
"properties with ROI at least 4%" -> {"minROI": 4}
"investment property with ROI above 5%" -> {"minROI": 5}
"commercial property ROI below 8%" -> {"propertyType": "commercial", "maxROI": 8}

Return only valid JSON:`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use mini for cost optimization
        messages: [
          { role: "system", content: "You are a Malaysian property search query parser. Return only valid JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        ...parsed,
        originalQuery: query,
        confidence: parsed.confidence || 0.8
      };

    } catch (error) {
      console.error("AI parsing failed:", error);
      // Fallback to simple parsing
      return this.simpleParseQuery(query);
    }
  }

  /**
   * Extract distance from query text
   */
  private extractDistanceFromQuery(query: string): number | null {
    // Look for patterns like "within 500m", "1km", "walking distance"
    const distancePatterns = [
      /within\s+(\d+)\s*m/i,
      /(\d+)\s*meters?/i,
      /(\d+)\s*km/i,
      /(\d+\.?\d*)\s*k?m/i
    ];

    for (const pattern of distancePatterns) {
      const match = query.match(pattern);
      if (match) {
        let distance = parseFloat(match[1]);
        // Convert km to meters
        if (pattern.toString().includes('km') || query.includes('km')) {
          distance *= 1000;
        }
        return distance;
      }
    }

    // Keyword-based distance mapping
    if (query.includes('walking distance') || query.includes('walkable')) {
      return 1250; // 1250m for 15 minutes walking distance (5 km/h walking speed)
    }
    if (query.includes('very close') || query.includes('next to')) {
      return 300;
    }
    if (query.includes('nearby') || query.includes('near')) {
      return 1250; // 1.25km default (15 mins walking)
    }
    if (query.includes('close to')) {
      return 1500;
    }

    return null;
  }

  /**
   * Generate search suggestions based on partial input
   */
  async generateSearchSuggestions(partialQuery: string): Promise<string[]> {
    const suggestions = [];
    const lower = partialQuery.toLowerCase();

    // Common Malaysian property search patterns
    const patterns = [
      "3 bedroom condo near MRT KLCC",
      "2rm apartment for rent in Mont Kiara", 
      "house for sale in Petaling Jaya under RM800k",
      "studio near LRT Ampang Park",
      "commercial office in Kuala Lumpur",
      "landed property in Selangor",
      "service residence near Monorail KL Sentral",
      "warehouse for rent Shah Alam",
      "condo near MRT Bukit Binjai",
      "apartment walking distance to LRT",
      "2 bedroom near transport hub",
      "luxury condo KLCC area under RM1mil",
      "affordable house Subang Jaya",
      "office space Damansara Heights",
      "rumah sewa dekat LRT",
      "apartment near university"
    ];

    // Filter patterns that start with or contain the partial input
    for (const pattern of patterns) {
      const patternLower = pattern.toLowerCase();
      if (patternLower.startsWith(lower) || 
          (lower.length >= 3 && patternLower.includes(lower))) {
        suggestions.push(pattern);
      }
    }

    // If no matches and input is short, show popular searches
    if (suggestions.length === 0 && lower.length <= 3) {
      return patterns.slice(0, 5);
    }

    return suggestions.slice(0, 8);
  }
}

export const nlpSearchService = new NLPSearchService();