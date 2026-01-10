import OpenAI from "openai";
import type { SearchCriteria } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

// Use shared SearchCriteria type for consistency across services  
export interface PropertySearchFilters extends Omit<SearchCriteria, 'listingType'> {
  // Override listingType to maintain backward compatibility with string type
  listingType?: 'rent' | 'sale' | string;
  
  // Track user's explicit property type selections (for UI display count)
  // This is separate from the expanded propertyType array used for search execution
  // Example: User selects "Office" → userSelectedPropertyTypes: ["office"]
  //          Backend expands to propertyType: ["office", "shop-office", "soho", "sovo"]
  //          UI shows "1 selected" but searches across all 4 types
  userSelectedPropertyTypes?: string[];
}

export async function parseNaturalLanguageQuery(query: string): Promise<PropertySearchFilters> {
  // Import optimization modules
  const { requestMemo } = await import('./requestMemoization');
  const { getCachedAIResponse, cacheAIResponse } = await import('./aiCache');
  const { extractKeywords, shouldUseAI, convertToFilters } = await import('./keywordExtractor');
  
  try {
    // VALIDATION STEP: Reject obviously invalid queries before any processing
    if (!isValidSearchQuery(query)) {
      console.log(`🚫 INVALID SEARCH QUERY: "${query}" rejected as nonsensical`);
      throw new Error(`Invalid search query: "${query}" is not a valid property search term`);
    }
    
    // Step 1: Check request-level cache first (fastest)
    const requestCached = requestMemo.getAIParsing(query);
    if (requestCached) {
      return requestCached;
    }
    
    // Step 2: Check global cache
    const cachedResult = getCachedAIResponse(query);
    if (cachedResult) {
      // Cache in request memo for this request too
      requestMemo.setAIParsing(query, cachedResult);
      return cachedResult;
    }
    
    // Step 3: Try keyword extraction (with request memoization)
    let keywordResult = requestMemo.getKeywordExtraction(query);
    if (!keywordResult) {
      keywordResult = await extractKeywords(query);
      requestMemo.setKeywordExtraction(query, keywordResult);
    }
    console.log(`Keyword extraction result:`, keywordResult);
    
    // Step 4: Decide if AI is needed
    if (!shouldUseAI(keywordResult, query)) {
      console.log(`Using keyword-based parsing for: "${query}"`);
      const filters = convertToFilters(keywordResult, query);
      // Cache in both request memo and global cache
      requestMemo.setAIParsing(query, filters);
      cacheAIResponse(query, filters);
      return filters;
    }
    
    console.log(`Using AI parsing for complex query: "${query}"`);
    
    // Pre-process query: normalize whitespace and expand abbreviations
    console.log(`Original query: "${query}"`);
    // CRITICAL FIX: Normalize whitespace to prevent AI parsing inconsistencies
    let processedQuery = query.trim().replace(/\s+/g, ' ');  // Remove trailing spaces and normalize multiple spaces
    
    if (processedQuery !== query) {
      console.log(`🔧 Normalized query: "${query}" -> "${processedQuery}"`);
    }
    
    // Handle "k" abbreviations (2.5k = 2500)
    processedQuery = processedQuery.replace(/(\d+(?:\.\d+)?)\s*k\b/gi, (match, number) => {
      const expanded = (parseFloat(number) * 1000).toString();
      console.log(`Pre-processing: Expanded "${match}" to "${expanded}" in query`);
      return expanded;
    });
    
    // Handle comma-separated numbers (RM2,000 = RM2000)
    processedQuery = processedQuery.replace(/RM\s*(\d{1,3}(?:,\d{3})+)/g, (match, number) => {
      const cleaned = number.replace(/,/g, '');
      console.log(`Pre-processing: Cleaned "${match}" to "RM${cleaned}" in query`);
      return `RM${cleaned}`;
    });
    
    console.log(`Processed query: "${processedQuery}"`);
    
    const prompt = `
You are AIREA's Property Search Query Interpreter - Malaysia's smartest AI property assistant.

YOUR CORE ABILITIES:
1. MULTI-LANGUAGE UNDERSTANDING: You fluently understand and parse queries in:
   - English ("3 bedroom condo under RM500k")
   - Bahasa Malaysia ("rumah landed yang murah dekat Sunway")
   - Mandarin ("找便宜的公寓在KLCC附近")
   - Tamil ("குவாலாலம்பூரில் வீடு வேண்டும்")
   - Manglish/Mixed ("Cari rumah landed yang murah la, near Sunway… at least 3 bilik")
   - Code-mixed queries ("我想找一个便宜的 landed near Kuchai Lama, but not old house")

2. SLANG & COLLOQUIAL NORMALIZATION:
   - "rumah" = house/home
   - "bilik" = bedroom/room  
   - "murah" / "cheap" / "budget low" / "便宜" = affordable, set reasonable maxPrice
   - "besar sikit" = prefer larger size
   - "dekat" / "near" / "附近" = proximity search
   - "pet friendly" / "boleh bawa pet" = pet-friendly amenity
   - "la", "lah", "bro", "weh" = Malaysian speech particles (ignore)
   - "senang access" / "easy access" = good transport connectivity

3. INTENT INFERENCE: When user is vague, infer reasonable Malaysian market defaults:
   - "murah" for rent → maxPrice: 2500-3000
   - "murah" for sale → maxPrice: 500000-700000
   - "family" intent → bedrooms: 3+
   - "young professional" → studio/1-bed near transport
   - "elderly parents" → ground floor, lift access

IMPORTANT RULES:
- "k" means thousands (1k = 1000, 2.5k = 2500)
- Handle comma-separated numbers (RM2,000 = 2000)
- Never hallucinate listings - only output search filters
- Always produce clean JSON with no explanations

Query: "${processedQuery}"

Extract and return a JSON object with the following possible fields:
- searchType: "building" or "general" (REQUIRED - determines filter display behavior)
- propertyType: array of property types - COMPREHENSIVE LIST (use exact database enum values):
  RESIDENTIAL: apartment, condominium, house, studio, townhouse, bungalow, terraced-house, semi-detached-house, service-residence, flat
  COMMERCIAL: office, shop, shop-office, retail-space, soho, sovo, sofo, commercial
  INDUSTRIAL: warehouse, factory, industrial
  TERRACE VARIANTS: 1-storey-terrace, 2-storey-terrace, 3-storey-terrace (for specific terrace queries)
  Only include if specifically mentioned or clearly implied
- listingType: "rent" or "sale" (based on context like "for rent", "to buy", "for sale")
- minPrice: minimum price in RM (convert from other currencies if mentioned, interpret "k" as thousands, e.g., "2.5k" = 2500)
- maxPrice: maximum price in RM (convert from other currencies if mentioned, interpret "k" as thousands, e.g., "2.5k" = 2500)
- minROI: minimum ROI percentage for commercial properties (extract from phrases like "at least ROI 4.5%", "ROI above 5%")
- maxROI: maximum ROI percentage for commercial properties (extract from phrases like "ROI below 6%", "max ROI 7%")
- bedrooms: number of bedrooms (if mentioned)
- bathrooms: number of bathrooms (if mentioned)
- city: city name (focus on Malaysian cities like Kuala Lumpur, Petaling Jaya, Shah Alam, etc.)
- amenities: array of amenities and features - extract from these terms:
  COMFORT: air conditioning, furnished, high ceiling
  FACILITIES: gym, pool, swimming pool, parking, covered parking
  SECURITY: security guard, CCTV, 24h access  
  PET/FAMILY: pet-friendly, loading bay
  Only include if explicitly mentioned
- nearTransport: object for transport proximity searches with:
  - types: array of transport types ["MRT", "LRT", "KTM", "Monorail", "BRT"]
  - stationNames: array of specific station names (e.g., ["Surian", "Kelana Jaya"])
  - maxDistanceMeters: distance in meters (default 1250 for "near" - 15 mins walking)
- lotType: lot position type (if mentioned):
  - "corner" / "corner lot" / "角落" -> "corner"
  - "intermediate" / "tengah" -> "intermediate"  
  - "end lot" / "hujung" -> "end"
- condition: property condition (if mentioned):
  - "new" / "baru" / "新" / "brand new" -> "new"
  - "renovated" / "sudah renovate" / "翻新" -> "renovated"
  - "original" / "asal" -> "original"
- sortBy: sorting preference based on user intent:
  - When user wants cheap/affordable/murah/便宜/不要太贵/budget-conscious -> "price_asc"
  - When user wants luxury/expensive/mahal/高档 -> "price_desc"
  - Default: null (uses featured sorting)
- minBedrooms: minimum number of bedrooms (for "at least X rooms" / "minimum X bilik")
- lifestyleIntent: string indicating user's lifestyle needs (optional) - detect from phrases like:
  - "family-friendly" or "for family" -> automatically suggest bedrooms >= 3
  - "for investment" -> prioritize commercial properties with ROI tracking
  - "for elderly" or "for parents" -> suggest ground floor, elevator, near amenities
  - "young professional" or "single" -> suggest studio, 1-bedroom, near transport
  - "couple" -> suggest 1-2 bedrooms
  - "budget-conscious" or "affordable" -> suggest lower price range with ±8% elasticity AND sortBy: "price_asc"
- location: object with area name and optional maxDistance (in minutes) and transportation type
  IMPORTANT: Parse location context correctly:
  - "in [area]" -> direct area search (no maxDistance)
  - "near [area]" -> ALWAYS add maxDistance: 15 and transportation: "driving" for proximity search
  - "within [X]km" -> set maxDistance in minutes (assume 5km = 10min driving)
  - "[X] mins from [area]" -> set maxDistance to X minutes
  
  CRITICAL: When query contains "near" + location, ALWAYS include maxDistance: 15 in the location object!
  
  IMPORTANT: Property type queries - Do NOT treat standalone property types as locations:
  - "house" -> property type only, NO location field
  - "condominium" -> property type only, NO location field  
  - "apartment" -> property type only, NO location field
  - Only add location when an actual area/place name is mentioned

CRITICAL LOCATION NORMALIZATIONS (always normalize these EXACT spelling variations):
- "Mt Kiara", "mt kiara", "montkiara", "Mt. Kiara" -> ALWAYS use "Mont Kiara"
- "Kpong", "kpong", "K'pong" -> ALWAYS use "Kepong"  
- "Damansra", "damansra" -> ALWAYS use "Damansara"
- Always prioritize these normalizations over literal interpretation

EXAMPLES - ENGLISH:
- "Units for rent near KLCC within 10 mins driving below RM3000" -> {"searchType": "general", "listingType": "rent", "maxPrice": 3000, "city": "Kuala Lumpur", "location": {"area": "KLCC", "maxDistance": 10, "transportation": "driving"}}
- "3-bedroom condo for sale in Mont Kiara under RM500000" -> {"searchType": "general", "propertyType": ["condominium"], "listingType": "sale", "bedrooms": 3, "maxPrice": 500000, "location": {"area": "Mont Kiara"}}
- "Pet-friendly apartment in Kepong" -> {"searchType": "general", "propertyType": ["apartment"], "location": {"area": "Kepong"}, "amenities": ["pet-friendly"]}
- "Commercial with at least 4.5% ROI" -> {"searchType": "general", "propertyType": ["office", "shop", "shop-office", "retail-space", "commercial"], "minROI": 4.5}

EXAMPLES - BAHASA MALAYSIA (IMPORTANT: murah = cheap = sortBy: "price_asc"):
- "rumah landed yang murah dekat Sunway" -> {"searchType": "general", "propertyType": ["house", "terraced-house", "semi-detached-house", "bungalow"], "maxPrice": 700000, "sortBy": "price_asc", "location": {"area": "Sunway", "maxDistance": 15, "transportation": "driving"}}
- "Cari rumah landed yang murah la, near Sunway… at least 3 bilik… pet friendly" -> {"searchType": "general", "propertyType": ["house", "terraced-house", "semi-detached-house"], "bedrooms": 3, "maxPrice": 600000, "sortBy": "price_asc", "location": {"area": "Sunway", "maxDistance": 15, "transportation": "driving"}, "amenities": ["pet-friendly"]}
- "apartmen untuk sewa murah KL" -> {"searchType": "general", "propertyType": ["apartment"], "listingType": "rent", "maxPrice": 2500, "sortBy": "price_asc", "location": {"area": "Kuala Lumpur"}}
- "bilik sewa dekat LRT" -> {"searchType": "general", "listingType": "rent", "nearTransport": {"types": ["LRT"], "maxDistanceMeters": 1250}}

EXAMPLES - MANDARIN (IMPORTANT: 便宜 = cheap = sortBy: "price_asc"):
- "找便宜的公寓在KLCC附近" -> {"searchType": "general", "propertyType": ["apartment", "condominium"], "maxPrice": 3000, "sortBy": "price_asc", "location": {"area": "KLCC", "maxDistance": 15, "transportation": "driving"}}
- "我想找一个便宜的 landed near Kuchai Lama" -> {"searchType": "general", "propertyType": ["house", "terraced-house", "semi-detached-house"], "maxPrice": 750000, "sortBy": "price_asc", "location": {"area": "Kuchai Lama", "maxDistance": 15, "transportation": "driving"}}
- "三房公寓出租" -> {"searchType": "general", "propertyType": ["apartment", "condominium"], "bedrooms": 3, "listingType": "rent"}
- "找便宜 condo near KLCC 有 swimming pool 的?" -> {"searchType": "general", "propertyType": ["condominium"], "maxPrice": 3500, "sortBy": "price_asc", "location": {"area": "KLCC", "maxDistance": 15, "transportation": "driving"}, "amenities": ["swimming pool"]}

EXAMPLES - TAMIL (IMPORTANT: மலிவான = cheap = sortBy: "price_asc"):
- "KLCC அருகில் வீடு வேண்டும்" -> {"searchType": "general", "propertyType": ["house"], "location": {"area": "KLCC", "maxDistance": 15, "transportation": "driving"}}
- "மலிவான காண்டோ KL" -> {"searchType": "general", "propertyType": ["condominium"], "maxPrice": 3000, "sortBy": "price_asc", "location": {"area": "Kuala Lumpur"}}
- "வாடகைக்கு அபார்ட்மெண்ட்" -> {"searchType": "general", "propertyType": ["apartment"], "listingType": "rent"}

EXAMPLES - MANGLISH (MIXED, cheap = sortBy: "price_asc"):
- "Gimme cheap house dekat Penang 3 bilik rm300k below" -> {"searchType": "general", "propertyType": ["house", "terraced-house"], "bedrooms": 3, "maxPrice": 300000, "sortBy": "price_asc", "location": {"area": "Penang"}}
- "Need condo with 2 car parks la bro" -> {"searchType": "general", "propertyType": ["condominium"], "amenities": ["parking"]}
- "Rumah landed yang besar sikit dekat Damansara" -> {"searchType": "general", "propertyType": ["house", "semi-detached-house", "bungalow"], "location": {"area": "Damansara", "maxDistance": 15, "transportation": "driving"}}

EXAMPLES - LIFESTYLE INTENT:
- "apartment for elderly parents near hospital" -> {"searchType": "general", "propertyType": ["apartment", "condominium"], "amenities": ["lift"]}
- "condo for young professional near MRT" -> {"searchType": "general", "propertyType": ["studio", "condominium"], "nearTransport": {"types": ["MRT"], "maxDistanceMeters": 1250}}
- "family home with garden 4 bedrooms" -> {"searchType": "general", "propertyType": ["house", "semi-detached-house", "bungalow"], "bedrooms": 4}

EXAMPLES - COMPLEX REQUIREMENTS (EXTRACT ALL FILTERS):
- "Landed, corner lot, near MRT, budget 1.2m, new house only, must have 4 rooms" -> {"searchType": "general", "propertyType": ["house", "terraced-house", "semi-detached-house", "bungalow"], "lotType": "corner", "condition": "new", "minBedrooms": 4, "maxPrice": 1200000, "nearTransport": {"types": ["MRT"], "maxDistanceMeters": 1500}}
- "corner lot landed house 4 bilik near Shah Alam" -> {"searchType": "general", "propertyType": ["house", "terraced-house", "semi-detached-house"], "lotType": "corner", "minBedrooms": 4, "location": {"area": "Shah Alam", "maxDistance": 15, "transportation": "driving"}}
- "renovated condo 3 rooms with parking" -> {"searchType": "general", "propertyType": ["condominium"], "condition": "renovated", "minBedrooms": 3, "amenities": ["parking"]}
- "new house bungalow minimum 5 bedrooms" -> {"searchType": "general", "propertyType": ["bungalow", "house"], "condition": "new", "minBedrooms": 5}

EXAMPLES - PRICE SORTING (cheap/murah/便宜 = sort by price ascending):
- "我想要sunway那边的公寓，价钱不要太贵" -> {"searchType": "general", "propertyType": ["apartment", "condominium"], "location": {"area": "Sunway"}, "sortBy": "price_asc"}
- "cheap condo near KLCC" -> {"searchType": "general", "propertyType": ["condominium"], "location": {"area": "KLCC", "maxDistance": 15, "transportation": "driving"}, "maxPrice": 3500, "sortBy": "price_asc"}
- "rumah murah PJ" -> {"searchType": "general", "propertyType": ["house"], "location": {"area": "Petaling Jaya"}, "maxPrice": 700000, "sortBy": "price_asc"}
- "找便宜apartment Bangsar" -> {"searchType": "general", "propertyType": ["apartment"], "location": {"area": "Bangsar"}, "maxPrice": 3000, "sortBy": "price_asc"}
- "budget-friendly studio KL" -> {"searchType": "general", "propertyType": ["studio"], "location": {"area": "Kuala Lumpur"}, "maxPrice": 2000, "sortBy": "price_asc"}

EXAMPLES - BUILDING/LOCATION:
- "Casa Indah" -> {"searchType": "building", "location": {"area": "Casa Indah"}}
- "Pavilion Residences" -> {"searchType": "building", "location": {"area": "Pavilion Residences"}}
- "Mt Kiara" -> {"searchType": "general", "location": {"area": "Mont Kiara"}}
- "near MRT Surian" -> {"searchType": "general", "nearTransport": {"types": ["MRT"], "stationNames": ["Surian"], "maxDistanceMeters": 1250}}

Return only the JSON object, no additional text.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using cost-efficient GPT-4o mini for natural language parsing
      messages: [
        {
          role: "system",
          content: `You are AIREA's Property Search Query Interpreter - Malaysia's most intelligent AI property assistant.

Your job:
1. Understand ANY user query in ANY language (Malay, English, Mandarin, Tamil, mixed/Manglish)
2. Convert the query into structured search filters as clean JSON
3. Never hallucinate listings - only output search filters
4. When user is vague, infer reasonable Malaysian market defaults
5. Normalize slang: "rumah"=house, "bilik"=bedroom, "murah"=affordable, "dekat"=near
6. Handle mixed-language: "找便宜 condo near KLCC" or "Cari rumah landed la bro"
7. CRITICAL: 'k' = thousands (2.5k = 2500), handle comma prices (RM2,000 = 2000)`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.15, // Slightly higher for better language understanding
      max_tokens: 600, // Slightly more for complex multi-language queries
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    console.log(`AI raw parsing result for query "${query}":`, JSON.stringify(result, null, 2));
    console.log(`Extracted searchType: "${result.searchType}" for query: "${query}"`);
    
    // Validate and clean the result
    const filters: PropertySearchFilters = {};
    
    // Validate searchType - this is critical for UI behavior
    if (result.searchType && typeof result.searchType === 'string') {
      if (['building', 'general'].includes(result.searchType)) {
        filters.searchType = result.searchType;
      }
    }
    // Default to 'general' if not specified
    if (!filters.searchType) {
      filters.searchType = 'general';
    }
    
    if (result.propertyType && Array.isArray(result.propertyType)) {
      // Accept comprehensive property types without restrictive filtering
      const validPropertyTypes = [
        // Residential types
        'apartment', 'condominium', 'house', 'studio', 'townhouse', 'bungalow', 
        'landed house', 'service-residence', 'condo', 'flat', 'terrace',
        // Commercial types
        'office', 'shop', 'shop lot', 'retail', 'mall unit', 'co-working space', 
        'commercial space', 'retail space', 'office space', 'commercial',
        // Industrial types
        'warehouse', 'factory', 'logistics hub', 'cold storage', 'industrial space',
        'industrial', 'land'
      ];
      
      // Map property types to what exists in the database including cross-type mappings
      let mappedTypes = [];
      for (const type of result.propertyType) {
        const normalizedType = type.toLowerCase();
        
        // Industrial property cross-mapping: warehouse/factory/industrial all search for all three
        if (normalizedType === 'factory') {
          mappedTypes.push('factory', 'warehouse', 'industrial');
        } else if (normalizedType === 'warehouse') {
          mappedTypes.push('warehouse', 'factory', 'industrial');
        } else if (normalizedType === 'industrial') {
          mappedTypes.push('industrial', 'factory', 'warehouse');
        }
        // Map shop lot variations to valid enum values
        else if (normalizedType === 'shop lot' || normalizedType === 'shoplot') {
          mappedTypes.push('shop-office');
        }
        // Map retail to retail-space
        else if (normalizedType === 'retail' || normalizedType === 'retail space') {
          mappedTypes.push('retail-space');
        }
        // Map commercial variations
        else if (normalizedType === 'mall unit') {
          mappedTypes.push('retail-space');
        }
        else {
          mappedTypes.push(type);
        }
      }
      
      // Remove duplicates using Array.from
      mappedTypes = Array.from(new Set(mappedTypes));
      
      filters.propertyType = mappedTypes.filter((type: string) => {
        const normalizedType = type.toLowerCase();
        // Direct match or partial match for complex types
        return validPropertyTypes.some(validType => 
          validType.toLowerCase() === normalizedType || 
          normalizedType.includes(validType.toLowerCase())
        );
      });
      
      console.log(`Filtered property types: ${JSON.stringify(result.propertyType)} -> ${JSON.stringify(filters.propertyType)}`);
    }
    
    if (result.listingType && typeof result.listingType === 'string') {
      if (['rent', 'sale'].includes(result.listingType)) {
        filters.listingType = result.listingType;
      }
    }
    
    if (result.minPrice && typeof result.minPrice === 'number' && result.minPrice > 0) {
      // Fix common "k" abbreviation parsing errors - if price is suspiciously low and query contains "k", multiply by 1000
      let minPrice = result.minPrice;
      if (minPrice < 500 && (query.toLowerCase().includes('k') || query.toLowerCase().includes('thousand'))) {
        minPrice = minPrice * 1000;
        console.log(`Fixed minPrice parsing: ${result.minPrice} -> ${minPrice} (detected 'k' abbreviation)`);
      }
      filters.minPrice = minPrice;
    }
    
    if (result.maxPrice && typeof result.maxPrice === 'number' && result.maxPrice > 0) {
      // Fix common "k" abbreviation parsing errors and comma-separated numbers
      let maxPrice = result.maxPrice;
      
      // Handle cases where AI parsed comma-separated numbers incorrectly
      if (maxPrice < 500 && (query.toLowerCase().includes('k') || query.toLowerCase().includes('thousand') || query.includes(','))) {
        maxPrice = maxPrice * 1000;
        console.log(`Fixed maxPrice parsing: ${result.maxPrice} -> ${maxPrice} (detected 'k' abbreviation or comma format)`);
      }
      
      // Special handling for RM2,000 format that might still be parsed as 2
      if (maxPrice < 10 && query.toLowerCase().includes('rm') && query.includes(',')) {
        // Extract the actual number from query manually
        const priceMatch = query.match(/rm\s*(\d{1,3}(?:,\d{3})*)/i);
        if (priceMatch) {
          const extractedPrice = parseInt(priceMatch[1].replace(/,/g, ''));
          if (extractedPrice > maxPrice) {
            maxPrice = extractedPrice;
            console.log(`Fixed maxPrice from comma format: ${result.maxPrice} -> ${maxPrice} (extracted from "${priceMatch[0]}")`);
          }
        }
      }
      
      filters.maxPrice = maxPrice;
    }
    
    if (result.bedrooms && typeof result.bedrooms === 'number' && result.bedrooms > 0) {
      filters.bedrooms = result.bedrooms;
    }
    
    // Handle minBedrooms for "at least X rooms" queries
    if (result.minBedrooms && typeof result.minBedrooms === 'number' && result.minBedrooms > 0) {
      // minBedrooms takes precedence for "minimum X" queries
      filters.minBedrooms = result.minBedrooms;
      console.log(`Extracted minBedrooms: ${filters.minBedrooms} (at least X rooms query)`);
    }
    
    // 🛡️ FALLBACK: If AI missed bedrooms but keyword extraction found it, use keyword result
    if (!filters.bedrooms && !filters.minBedrooms && keywordResult.bedrooms && keywordResult.bedrooms > 0) {
      filters.bedrooms = keywordResult.bedrooms;
      console.log(`🔧 FALLBACK: Used keyword-extracted bedrooms: ${keywordResult.bedrooms} (AI missed it)`);
    }
    
    if (result.bathrooms && typeof result.bathrooms === 'number' && result.bathrooms > 0) {
      filters.bathrooms = result.bathrooms;
    }
    
    // Handle lotType for corner/intermediate/end lot queries
    if (result.lotType && typeof result.lotType === 'string') {
      const validLotTypes = ['corner', 'intermediate', 'end'];
      if (validLotTypes.includes(result.lotType.toLowerCase())) {
        filters.lotType = result.lotType.toLowerCase();
        console.log(`Extracted lotType: ${filters.lotType}`);
      }
    }
    
    // Handle condition for new/renovated/original property queries
    if (result.condition && typeof result.condition === 'string') {
      const validConditions = ['new', 'renovated', 'original'];
      if (validConditions.includes(result.condition.toLowerCase())) {
        filters.condition = result.condition.toLowerCase();
        console.log(`Extracted condition: ${filters.condition}`);
      }
    }
    
    // Handle sortBy for price sorting preference (cheap = ascending, luxury = descending)
    if (result.sortBy && typeof result.sortBy === 'string') {
      const validSortBy = ['price_asc', 'price_desc', 'featured', 'newest'];
      if (validSortBy.includes(result.sortBy)) {
        filters.sortBy = result.sortBy;
        console.log(`Extracted sortBy: ${filters.sortBy} (user wants ${result.sortBy === 'price_asc' ? 'cheapest first' : 'most expensive first'})`);
      }
    }
    
    // ROI filtering for commercial properties
    if (result.minROI && typeof result.minROI === 'number' && result.minROI > 0) {
      filters.minROI = result.minROI;
      console.log(`Extracted minROI: ${filters.minROI}%`);
    }
    
    if (result.maxROI && typeof result.maxROI === 'number' && result.maxROI > 0) {
      filters.maxROI = result.maxROI;
      console.log(`Extracted maxROI: ${filters.maxROI}%`);
    }
    
    if (result.city && typeof result.city === 'string') {
      filters.city = result.city;
    }
    
    if (result.amenities && Array.isArray(result.amenities)) {
      filters.amenities = result.amenities.filter((amenity: string) => typeof amenity === 'string');
    }
    
    // Transport filters are handled separately in the search system
    if (result.nearTransport && typeof result.nearTransport === 'object') {
      console.log(`🚉 AI detected transport filter:`, result.nearTransport);
      // Transport proximity handled by specialized transport search services
    }
    
    if (result.location && typeof result.location === 'object') {
      let area = result.location.area || '';
      
      // Enhanced normalization for common location variations
      const normalizedArea = area.toLowerCase().replace(/[.\s]/g, '');
      
      if (normalizedArea.includes('mtkiara') || normalizedArea.includes('mtkirara') || area.toLowerCase().includes('mt kiara')) {
        area = 'Mont Kiara';
        console.log(`Normalized "${result.location.area}" to "Mont Kiara"`);
      } else if (normalizedArea.includes('kpong') || area.toLowerCase().includes('kpong')) {
        area = 'Kepong';
        console.log(`Normalized "${result.location.area}" to "Kepong"`);
      } else if (normalizedArea.includes('damansra')) {
        area = 'Damansara';
        console.log(`Normalized "${result.location.area}" to "Damansara"`);
      }
      
      // CRITICAL FIX: Fallback to keyword extraction if AI missed the location area
      // This handles queries like "15 mins from KLCC" where AI detects maxDistance but not area
      if (result.location.maxDistance && (!area || area === '')) {
        if (keywordResult.locations && keywordResult.locations.length > 0) {
          area = keywordResult.locations[0];
          console.log(`🔧 AI FALLBACK: AI missed location area, using keyword-extracted location "${area}"`);
        }
      }
      
      filters.location = {
        area: area,
        maxDistance: result.location.maxDistance,
        transportation: result.location.transportation,
      };
    }
    
    // 🛡️ CRITICAL FALLBACK: If AI completely missed location but keyword extraction found one
    // This handles abbreviations (JB, PJ, KL, KK) and non-Latin scripts (新山, 槟城, பெனாங்)
    if (!filters.location && keywordResult.locations && keywordResult.locations.length > 0) {
      filters.location = {
        area: keywordResult.locations[0],
      };
      console.log(`🔧 LOCATION FALLBACK: AI missed location entirely, using keyword-extracted location "${keywordResult.locations[0]}"`);
    }
    
    console.log(`FINAL SEARCHTYPE VALUE: "${filters.searchType}" for query "${query}"`);
    
    // Cache the AI result in both request memo and global cache
    requestMemo.setAIParsing(query, filters);
    cacheAIResponse(query, filters);
    
    return filters;
  } catch (error) {
    console.error("Error parsing natural language query:", error);
    throw new Error("Failed to parse search query: " + (error as Error).message);
  }
}

/**
 * Validate if a search query is meaningful and not nonsensical
 */
function isValidSearchQuery(query: string): boolean {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Reject very short queries
  if (normalizedQuery.length < 2) {
    return false;
  }
  
  // Reject queries that are obviously nonsensical (similar validation as in location detection)
  // Check vowel/consonant ratio - nonsensical text often has too few vowels
  const vowelCount = (normalizedQuery.match(/[aeiou]/g) || []).length;
  const consonantCount = (normalizedQuery.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
  const totalLetters = vowelCount + consonantCount;
  
  // If it's mostly letters but has very few vowels, likely nonsensical
  if (totalLetters > 4 && vowelCount < totalLetters * 0.2) {
    console.log(`🚫 QUERY REJECTED: "${query}" has too few vowels (${vowelCount}/${totalLetters})`);
    return false;
  }
  
  // Check for consecutive consonants indicating gibberish
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/.test(normalizedQuery)) {
    console.log(`🚫 QUERY REJECTED: "${query}" has too many consecutive consonants`);
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
    console.log(`🚫 QUERY REJECTED: "${query}" appears to be random characters`);
    return false;
  }
  
  return true;
}

export async function generateSearchSuggestions(userInput: string): Promise<string[]> {
  try {
    const prompt = `
Generate 3 helpful property search suggestions based on the user's partial input: "${userInput}"

Focus on Malaysian property market with RM currency and local areas like:
- KLCC, Mont Kiara, Bangsar, Petaling Jaya, Shah Alam
- Property types: apartments, condominiums, houses, studios
- Price ranges in RM (500-10000+ per month)
- Common amenities: swimming pool, gym, parking, security

Return only a JSON array of 3 suggestion strings, no additional text.

Example format: ["Condos in Mont Kiara under RM2500", "3-bedroom house near LRT station", "Studio apartment in Bangsar with gym"]
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a Malaysian property search assistant. Generate helpful search suggestions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
    return Array.isArray(result.suggestions) ? result.suggestions.slice(0, 3) : [];
  } catch (error) {
    console.error("Error generating search suggestions:", error);
    return [
      "Condos in Mont Kiara under RM2500",
      "3-bedroom house near LRT station", 
      "Studio apartment in Bangsar with gym"
    ];
  }
}
