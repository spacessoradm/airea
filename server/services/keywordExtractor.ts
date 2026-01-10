import { PropertySearchFilters } from './openai';
import { malaysianLocationDetection } from './malaysianLocationDetection';

// Property type keywords mapping - multi-language support (English, Malay, Mandarin, Tamil)
// Uses valid schema enum values from propertyTypeEnum
const PROPERTY_TYPE_KEYWORDS: Record<string, string[]> = {
  apartment: ['apartment', 'apt', 'flat', 'apartmen', 'pangsapuri', 'அபார்ட்மெண்ட்', '公寓'],
  condominium: ['condo', 'condominium', 'condos', 'kondo', 'காண்டோ', '康斗'],
  house: ['houses', 'house', 'landed', 'rumah', 'banglo', 'வீடு', '房子', '房屋', '住宅'],
  'terraced-house': ['terrace', 'terrace house', 'teres', 'rumah teres', '排屋'],
  'semi-detached-house': ['semi-d', 'semi detached', 'semi-detached', '半独立'],
  bungalow: ['bungalow', 'banglo', 'bungalow house', '独立式洋房'],
  studio: ['studio', 'studio apartment', 'studio apartmen', 'ஸ்டுடியோ'],
  townhouse: ['townhouse', 'town house', 'townhome', 'rumah bandar'],
  'service-residence': ['serviced apartment', 'service apartment', 'serviced apt', 'serviced residence', 'service residence', '服务式公寓'],
  shop: ['shop', 'shop lot', 'kedai', 'கடை', '店铺', '商店'],
  'shop-office': ['shop office', 'shophouse', 'kedai pejabat'],
  'retail-space': ['retail', 'retail space', 'ruang runcit'],
  office: ['office', 'office building', 'commercial office', 'office space', 'pejabat', 'அலுவலகம்', '办公室'],
  warehouse: ['warehouse', 'gudang', 'கிடங்கு', '仓库'],
  factory: ['factory', 'kilang', 'தொழிற்சாலை', '工厂'],
  land: ['land', 'vacant land', 'development land', 'tanah', 'நிலம்', '土地'],
  commercial: ['commercial', 'komersial', '商业'] // Standalone commercial keyword for broad commercial property searches
};

// Listing type keywords - multi-language support (English, Malay, Mandarin, Tamil)
const LISTING_TYPE_KEYWORDS: Record<string, string[]> = {
  rent: ['rent', 'rental', 'to rent', 'for rent', 'lease', 'letting', 'sewa', 'untuk disewa', 'வாடகை', 'வாடகைக்கு', '出租', '租', '租房'],
  sale: ['buy', 'purchase', 'sale', 'for sale', 'to buy', 'buying', 'selling', 'jual', 'dijual', 'untuk dijual', 'விற்பனை', 'வாங்க', '出售', '卖', '买', '售']
};

// Multi-language slang normalization mappings
const SLANG_NORMALIZATIONS: Record<string, { normalized: string; priceHint?: number }> = {
  // Malay slang
  'murah': { normalized: 'cheap', priceHint: 3000 },
  'mahal': { normalized: 'expensive' },
  'besar': { normalized: 'large' },
  'kecil': { normalized: 'small' },
  'dekat': { normalized: 'near' },
  'bilik': { normalized: 'bedroom' },
  'rumah': { normalized: 'house' },
  // Mandarin slang  
  '便宜': { normalized: 'cheap', priceHint: 3000 },
  '贵': { normalized: 'expensive' },
  '大': { normalized: 'large' },
  '小': { normalized: 'small' },
  '附近': { normalized: 'near' },
  '房': { normalized: 'bedroom' },
  '房子': { normalized: 'house' },
  // Tamil slang
  'மலிவான': { normalized: 'cheap', priceHint: 3000 },
  'அருகில்': { normalized: 'near' },
  'வீடு': { normalized: 'house' },
  // Manglish
  'cheap': { normalized: 'cheap', priceHint: 3000 },
  'budget low': { normalized: 'cheap', priceHint: 3000 },
};

// Bedroom keywords - multi-language patterns (English, Malay, Mandarin)
const BEDROOM_PATTERNS = [
  /(\d+)\s*[-\s]?(?:bed|bedroom|br|room)/i,
  /(\d+)r/i, // e.g., "3r"
  /(\d+)\s*bed/i,
  /(\d+)\s*bilik/i, // Malay: "3 bilik"
  /(\d+)\s*房/i, // Mandarin: "3房"
  /(\d+)\s*kamar/i // Malay alternate: "3 kamar"
];

// Price patterns
const PRICE_PATTERNS = [
  /(?:under|below|less than|max|maximum)\s*(?:rm\s*)?(\d+(?:\.\d+)?)\s*k?/i,
  /(?:above|over|more than|min|minimum)\s*(?:rm\s*)?(\d+(?:\.\d+)?)\s*k?/i,
  /(?:rm\s*)?(\d+(?:\.\d+)?)\s*k?\s*-\s*(?:rm\s*)?(\d+(?:\.\d+)?)\s*k?/i,
  /budget\s*(?:rm\s*)?(\d+(?:\.\d+)?)\s*k?/i
];

// ROI patterns for commercial properties
const ROI_PATTERNS = {
  minROI: [
    /roi\s*(?:at least|above|>=|>)\s*(\d+(?:\.\d+)?)\s*%?/i,
    /(?:at least|above|>=|>)\s*roi\s*(\d+(?:\.\d+)?)\s*%?/i,
    /(?:at least|above|>=|>)\s*(\d+(?:\.\d+)?)\s*%?\s*roi/i, // "at least 4.5% ROI"
    /min(?:imum)?\s*roi\s*(\d+(?:\.\d+)?)\s*%?/i,
    /min(?:imum)?\s*(\d+(?:\.\d+)?)\s*%?\s*roi/i // "minimum 4.5% ROI"
  ],
  maxROI: [
    /roi\s*(?:below|under|<=|<|max|maximum)\s*(\d+(?:\.\d+)?)\s*%?/i,
    /(?:below|under|<=|<|max|maximum)\s*roi\s*(\d+(?:\.\d+)?)\s*%?/i,
    /(?:below|under|<=|<|max|maximum)\s*(\d+(?:\.\d+)?)\s*%?\s*roi/i // "below 4.5% ROI"
  ]
};

// Dynamic location detection will replace this hardcoded array
// This will be populated from database queries automatically

// Amenity keywords - multi-language support
const AMENITY_KEYWORDS = [
  'parking', 'gym', 'pool', 'swimming pool', 'security', 'lift', 'elevator',
  'balcony', 'garden', 'playground', 'tennis court', 'sauna', 'jacuzzi',
  'bbq', 'function room', 'surau', 'mosque', 'covered parking',
  // Malay
  'tempat letak kereta', 'kolam renang', 'keselamatan', 'taman', 'balkoni',
  // Mandarin
  '停车', '游泳池', '健身房', '花园', '阳台',
  // Pet-friendly variations
  'pet-friendly', 'pet friendly', 'boleh bawa pet', 'boleh haiwan'
];

export interface KeywordExtractionResult {
  propertyTypes: string[];
  listingType: string | null;
  bedrooms: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  minROI: number | null;
  maxROI: number | null;
  locations: string[];
  amenities: string[];
  confidence: number; // 0-1 confidence score
  slangPriceHint?: number; // Price hint from slang (e.g., "murah" -> 3000)
}

/**
 * Preprocess query to normalize multi-language slang
 * Returns normalized query and any inferred values
 */
function preprocessSlang(query: string): { normalizedQuery: string; priceHint?: number; isNearQuery: boolean } {
  let normalizedQuery = query;
  let priceHint: number | undefined;
  let isNearQuery = false;
  
  for (const [slang, info] of Object.entries(SLANG_NORMALIZATIONS)) {
    if (query.includes(slang)) {
      console.log(`SlangPreprocess: Detected "${slang}" -> "${info.normalized}"`);
      if (info.priceHint) {
        priceHint = info.priceHint;
      }
      if (info.normalized === 'near') {
        isNearQuery = true;
      }
    }
  }
  
  return { normalizedQuery, priceHint, isNearQuery };
}

/**
 * Unicode-safe keyword matching that works for non-Latin scripts (Mandarin, Tamil)
 */
function matchesKeyword(query: string, keyword: string): boolean {
  // For non-ASCII characters (Mandarin, Tamil), use simple includes
  const hasNonAscii = /[^\x00-\x7F]/.test(keyword);
  if (hasNonAscii) {
    return query.includes(keyword);
  }
  
  // For ASCII keywords, use word boundary matching to prevent partial matches
  const escapedKeyword = keyword.replace(/[\s-]/g, '[\\s-]?').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
  return regex.test(query);
}

export async function extractKeywords(query: string): Promise<KeywordExtractionResult> {
  const lowerQuery = query.toLowerCase().trim();
  
  // Preprocess slang first
  const { priceHint, isNearQuery } = preprocessSlang(lowerQuery);
  
  // Extract property types with Unicode-safe matching
  const propertyTypes: string[] = [];
  for (const [type, keywords] of Object.entries(PROPERTY_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (matchesKeyword(lowerQuery, keyword.toLowerCase())) {
        console.log(`KeywordExtractor DEBUG: Found match for type "${type}" with keyword "${keyword}" in query "${query}"`);
        propertyTypes.push(type);
        break; // Only add the type once even if multiple keywords match
      }
    }
  }
  
  // Extract listing type with Unicode-safe matching
  let listingType: string | null = null;
  for (const [type, keywords] of Object.entries(LISTING_TYPE_KEYWORDS)) {
    if (keywords.some(keyword => matchesKeyword(lowerQuery, keyword.toLowerCase()))) {
      listingType = type;
      break;
    }
  }
  
  // Extract bedrooms
  let bedrooms: number | null = null;
  for (const pattern of BEDROOM_PATTERNS) {
    const match = lowerQuery.match(pattern);
    if (match) {
      bedrooms = parseInt(match[1]);
      break;
    }
  }
  
  // Extract prices
  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  
  // Check for "under/below" patterns with comma handling - Support k (thousand) and mil (million)
  const underMatch = lowerQuery.match(/(?:under|below|less than|max|maximum)\s*(?:rm\s*)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:k|mil|million)?/i);
  if (underMatch) {
    console.log(`Keyword extractor: Processing under/below pattern: "${underMatch[0]}"`);
    const numberPart = underMatch[1].replace(/,/g, ''); // Remove commas
    const value = parseFloat(numberPart);
    
    // Handle different multipliers
    if (underMatch[0].includes('mil')) {
      maxPrice = value * 1000000; // million
    } else if (underMatch[0].includes('k')) {
      maxPrice = value * 1000; // thousand  
    } else {
      maxPrice = value; // no multiplier
    }
    
    console.log(`Keyword extractor: Parsed maxPrice ${maxPrice} from "${underMatch[0]}" (numberPart: "${numberPart}")`);
  }
  
  // Check for "above/over" patterns with comma handling - Support k (thousand) and mil (million)
  const overMatch = lowerQuery.match(/(?:above|over|more than|min|minimum)\s*(?:rm\s*)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:k|mil|million)?/i);
  if (overMatch) {
    console.log(`Keyword extractor: Processing above/over pattern: "${overMatch[0]}"`);
    const numberPart = overMatch[1].replace(/,/g, ''); // Remove commas
    const value = parseFloat(numberPart);
    
    // Handle different multipliers
    if (overMatch[0].includes('mil')) {
      minPrice = value * 1000000; // million
    } else if (overMatch[0].includes('k')) {
      minPrice = value * 1000; // thousand  
    } else {
      minPrice = value; // no multiplier
    }
    
    console.log(`Keyword extractor: Parsed minPrice ${minPrice} from "${overMatch[0]}" (numberPart: "${numberPart}")`);
  }
  
  // Check for range patterns
  const rangeMatch = lowerQuery.match(/(?:rm\s*)?(\d+(?:\.\d+)?)\s*k?\s*-\s*(?:rm\s*)?(\d+(?:\.\d+)?)\s*k?/i);
  if (rangeMatch) {
    const val1 = parseFloat(rangeMatch[1]);
    const val2 = parseFloat(rangeMatch[2]);
    minPrice = rangeMatch[0].includes('k') ? val1 * 1000 : val1;
    maxPrice = rangeMatch[0].includes('k') ? val2 * 1000 : val2;
  }
  
  // Extract locations dynamically using Malaysian location detection service
  const locations: string[] = await malaysianLocationDetection.extractLocationsFromQuery(query);
  
  // Extract amenities
  const amenities: string[] = [];
  for (const amenity of AMENITY_KEYWORDS) {
    if (lowerQuery.includes(amenity.toLowerCase())) {
      amenities.push(amenity);
    }
  }
  
  // Extract ROI for commercial properties
  let minROI: number | null = null;
  let maxROI: number | null = null;
  
  // Check for minimum ROI patterns
  for (const pattern of ROI_PATTERNS.minROI) {
    const match = lowerQuery.match(pattern);
    if (match) {
      minROI = parseFloat(match[1]);
      console.log(`Keyword extractor: Parsed minROI ${minROI}% from "${match[0]}"`);
      break;
    }
  }
  
  // Check for maximum ROI patterns
  for (const pattern of ROI_PATTERNS.maxROI) {
    const match = lowerQuery.match(pattern);
    if (match) {
      maxROI = parseFloat(match[1]);
      console.log(`Keyword extractor: Parsed maxROI ${maxROI}% from "${match[0]}"`);
      break;
    }
  }
  
  // Apply slang price hint if no explicit price was found
  if (priceHint && maxPrice === null && minPrice === null) {
    maxPrice = priceHint;
    console.log(`Keyword extractor: Applied slang price hint maxPrice=${priceHint}`);
  }
  
  // Calculate confidence based on extracted information
  let confidence = 0;
  if (propertyTypes.length > 0) confidence += 0.4; // Increased: property type is very important
  if (listingType) confidence += 0.2;
  if (bedrooms !== null) confidence += 0.2;
  if (minPrice !== null || maxPrice !== null) confidence += 0.3; // Increased: price is very important
  if (locations.length > 0) confidence += 0.2;
  if (amenities.length > 0) confidence += 0.1;
  
  // Boost confidence for ROI queries - these are precise commercial property searches
  if ((minROI !== null || maxROI !== null) && propertyTypes.length > 0) {
    confidence += 0.2;
    console.log(`Keyword extractor: Boosted confidence by 0.2 for ROI query (ROI + property type detected)`);
  }
  
  // Boost confidence if we detected slang-based price hint
  if (priceHint) {
    confidence += 0.15;
    console.log(`Keyword extractor: Boosted confidence by 0.15 for slang price hint`);
  }
  
  confidence = Math.min(confidence, 1.0);
  
  return {
    propertyTypes,
    listingType,
    bedrooms,
    minPrice,
    maxPrice,
    minROI,
    maxROI,
    locations,
    amenities,
    confidence,
    slangPriceHint: priceHint
  };
}

export function shouldUseAI(extractionResult: KeywordExtractionResult, query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  // OPTIMIZATION: ROI queries with property types are simple and don't need AI
  const hasROI = extractionResult.minROI !== null || extractionResult.maxROI !== null;
  if (hasROI && extractionResult.propertyTypes.length > 0) {
    console.log(`✅ KEYWORD PATH: ROI query with property type detected - bypassing AI for fast local parsing`);
    return false; // Use local parsing, skip AI
  }
  
  // FORCE AI for complex filter queries that need special extraction:
  // - Lot types: corner lot, end lot, intermediate
  // - Property condition: new, renovated, brand new
  // - Price sorting: cheap, murah, budget, 便宜, 不要太贵 (Mandarin for "not too expensive")
  // - Minimum bedrooms: at least X, minimum X
  const complexFilterKeywords = [
    'corner lot', 'corner', 'end lot', 'intermediate',
    'new house', 'new build', 'brand new', 'renovated', 'sudah renovate',
    'at least', 'minimum', 'min ',
    'cheap', 'murah', 'budget', 'affordable', // English and Malay price sorting keywords
    '角落', '新', '翻新', // Mandarin: corner, new, renovated
    '不要太贵', '便宜', // Mandarin: not too expensive, cheap (needs sortBy)
  ];
  
  const needsComplexParsing = complexFilterKeywords.some(keyword => lowerQuery.includes(keyword));
  if (needsComplexParsing) {
    console.log(`🔧 COMPLEX FILTER DETECTED: Query "${query}" requires AI parsing for special filters`);
    return true;
  }
  
  // Use AI if confidence is low, BUT be more lenient for simple property + price queries
  const hasBasicRequirements = extractionResult.propertyTypes.length > 0 && 
    (extractionResult.minPrice !== null || extractionResult.maxPrice !== null);
  
  const confidenceThreshold = hasBasicRequirements ? 0.4 : 0.6;
  
  if (extractionResult.confidence < confidenceThreshold) {
    return true;
  }
  
  // Use AI for complex queries with multiple conditions
  // Don't treat "investment" or "family" as complexity - they're just context
  const complexityScore = 
    (extractionResult.propertyTypes.length > 1 ? 1 : 0) +
    (extractionResult.locations.length > 1 ? 1 : 0) +
    (extractionResult.amenities.length > 2 ? 1 : 0) +
    (query.includes('near') || query.includes('within') ? 1 : 0);
  
  // Only use AI if truly complex (2+ complexity factors)
  return complexityScore >= 2;
}

// Helper function to find the most relevant location from multiple detected locations
function findMostRelevantLocation(locations: string[], query: string): string {
  if (locations.length === 1) return locations[0];
  
  const queryLower = query.toLowerCase();
  
  // Find locations with their positions in the query
  const locationPositions = locations.map(location => {
    const position = queryLower.lastIndexOf(location.toLowerCase());
    return { location, position };
  }).filter(item => item.position !== -1);
  
  if (locationPositions.length === 0) {
    return locations[0]; // Fallback to first location
  }
  
  // Prioritize location that appears latest in the query (most specific)
  // e.g., "Apartment under RM2500 for elderly parents in Bangsar" -> Bangsar comes last
  const mostRelevant = locationPositions.reduce((latest, current) => 
    current.position > latest.position ? current : latest
  );
  
  console.log(`🎯 LOCATION RELEVANCE: "${mostRelevant.location}" appears at position ${mostRelevant.position} (most relevant)`);
  return mostRelevant.location;
}

export function convertToFilters(extraction: KeywordExtractionResult, query: string): PropertySearchFilters {
  const filters: PropertySearchFilters = {};
  
  if (extraction.propertyTypes.length > 0) {
    // STEP 1: Store the user's explicit selections BEFORE cross-mapping
    // This preserves what the user actually selected in the UI for accurate count display
    filters.userSelectedPropertyTypes = [...extraction.propertyTypes];
    
    // STEP 2: Apply cross-mapping for properties to match Malaysian property market conventions
    // This expanded list is used for the actual database search
    const mappedTypes = extraction.propertyTypes.flatMap(type => {
      if (type === 'factory' || type === 'warehouse') {
        return [type, 'factory', 'warehouse', 'industrial']; // Include all industrial variants
      }
      // In Malaysia, "condo" refers to ALL high-rise residential properties
      if (type === 'condominium') {
        return ['apartment', 'condominium', 'studio', 'flat', 'service-residence']; // Include all high-rise types
      }
      // CRITICAL: "Commercial" keyword should match ALL commercial property types
      if (type === 'commercial') {
        return ['commercial', 'shop', 'shop-office', 'retail-space', 'office', 'warehouse', 'factory', 'soho', 'sovo', 'sofo'];
      }
      // OPTIMIZATION: For commercial "shop" searches, include all shop-related types
      if (type === 'shop') {
        return ['shop', 'shop-office', 'retail-space']; // Include shop-office and retail-space
      }
      // For office searches with ROI, include all office types
      if (type === 'office' && (extraction.minROI !== null || extraction.maxROI !== null)) {
        return ['office', 'shop-office', 'soho', 'sovo']; // Include hybrid office types for ROI queries
      }
      return [type];
    });
    
    // STEP 3: Remove duplicates and set the EXPANDED property types (for search execution)
    filters.propertyType = Array.from(new Set(mappedTypes));
    console.log(`KeywordExtractor: User selected: ${filters.userSelectedPropertyTypes.join(', ')}, Expanded for search: ${filters.propertyType.join(', ')}`);
  }
  
  if (extraction.listingType) {
    filters.listingType = extraction.listingType;
  }
  
  // CRITICAL: ROI only applies to sale properties (not rentals)
  // Auto-force listingType to 'sale' when ROI is detected
  if (extraction.minROI !== null || extraction.maxROI !== null) {
    filters.listingType = 'sale';
    console.log(`KeywordExtractor: ROI detected - forcing listingType to 'sale' (ROI only applies to sale properties)`);
  }
  
  if (extraction.bedrooms !== null) {
    filters.bedrooms = extraction.bedrooms;
  }
  
  if (extraction.minPrice !== null) {
    filters.minPrice = extraction.minPrice;
  }
  
  if (extraction.maxPrice !== null) {
    filters.maxPrice = extraction.maxPrice;
  }
  
  if (extraction.locations.length > 0) {
    // Find the most relevant location by prioritizing locations that appear later in the query
    // e.g., "Apartment under RM2500 for elderly parents in Bangsar" -> Bangsar is more relevant
    const mostRelevantLocation = findMostRelevantLocation(extraction.locations, query);
    
    filters.location = {
      area: mostRelevantLocation
    };
    
    // DO NOT set filters.city for Malaysian locations because:
    // - Properties have city="Selangor" but address="Selangor - Shah Alam" 
    // - City filtering uses exact matching which fails
    // - Area filtering uses substring matching across address fields which works
    console.log(`🗺️ LOCATION PRIORITY: Selected "${mostRelevantLocation}" from [${extraction.locations.join(', ')}] as most relevant for query "${query}"`);
  }
  
  if (extraction.amenities.length > 0) {
    filters.amenities = extraction.amenities;
  }
  
  // Add ROI filters for commercial properties
  if (extraction.minROI !== null) {
    filters.minROI = extraction.minROI;
    console.log(`KeywordExtractor: Added minROI filter: ${extraction.minROI}%`);
  }
  
  if (extraction.maxROI !== null) {
    filters.maxROI = extraction.maxROI;
    console.log(`KeywordExtractor: Added maxROI filter: ${extraction.maxROI}%`);
  }
  
  // Determine search type
  const isBuilding = /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(query.trim()) && 
                   extraction.propertyTypes.length === 0 && 
                   !query.toLowerCase().includes('for') &&
                   !query.toLowerCase().includes('under');
  
  filters.searchType = isBuilding ? 'building' : 'general';
  
  return filters;
}