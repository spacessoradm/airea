import OpenAI from "openai";
import { storage } from "../storage";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AbbreviationResult {
  originalAbbreviation: string;
  expandedName: string;
  latitude: number;
  longitude: number;
  state: string;
  confidence: number;
  source: 'gpt' | 'cache';
}

const ABBREVIATION_CACHE = new Map<string, AbbreviationResult | null>();

// Known Malaysian abbreviations - these are checked locally first (no GPT call needed)
const KNOWN_ABBREVIATIONS: Record<string, { lat: number; lng: number; name: string; state: string }> = {
  'bu': { lat: 3.1492, lng: 101.5770, name: 'Bandar Utama', state: 'Selangor' },
  'b.u': { lat: 3.1492, lng: 101.5770, name: 'Bandar Utama', state: 'Selangor' },
  'ttdi': { lat: 3.1415, lng: 101.6302, name: 'Taman Tun Dr Ismail', state: 'Kuala Lumpur' },
  'pj': { lat: 3.1073, lng: 101.6067, name: 'Petaling Jaya', state: 'Selangor' },
  'kl': { lat: 3.1390, lng: 101.6869, name: 'Kuala Lumpur', state: 'Kuala Lumpur' },
  'jb': { lat: 1.4927, lng: 103.7414, name: 'Johor Bahru', state: 'Johor' },
  'kd': { lat: 3.1570, lng: 101.5860, name: 'Kota Damansara', state: 'Selangor' },
  'mk': { lat: 3.1730, lng: 101.6526, name: 'Mont Kiara', state: 'Kuala Lumpur' },
  'mont k': { lat: 3.1730, lng: 101.6526, name: 'Mont Kiara', state: 'Kuala Lumpur' },
  'bb': { lat: 3.1466, lng: 101.7132, name: 'Bukit Bintang', state: 'Kuala Lumpur' },
  'klcc': { lat: 3.1579, lng: 101.7116, name: 'KLCC', state: 'Kuala Lumpur' },
  'usj': { lat: 3.0440, lng: 101.5895, name: 'USJ, Subang Jaya', state: 'Selangor' },
  'ss2': { lat: 3.1151, lng: 101.6234, name: 'SS2, Petaling Jaya', state: 'Selangor' },
  'ss15': { lat: 3.0748, lng: 101.5882, name: 'SS15, Subang Jaya', state: 'Selangor' },
  'kk': { lat: 5.9804, lng: 116.0735, name: 'Kota Kinabalu', state: 'Sabah' },
  'pg': { lat: 5.4141, lng: 100.3288, name: 'Penang', state: 'Penang' },
  'ns': { lat: 2.7297, lng: 101.9381, name: 'Seremban', state: 'Negeri Sembilan' },
  'kb': { lat: 6.1254, lng: 102.2381, name: 'Kota Bharu', state: 'Kelantan' },
  'kt': { lat: 5.3117, lng: 103.1324, name: 'Kuala Terengganu', state: 'Terengganu' },
};

const SYSTEM_PROMPT = `You are an expert on Malaysian locations and real estate. Your task is to expand Malaysian location abbreviations and slang into their full canonical names with coordinates.

Common Malaysian location abbreviations include:
- BU = Bandar Utama (Selangor)
- TTDI = Taman Tun Dr Ismail (KL)
- PJ = Petaling Jaya (Selangor)
- KL = Kuala Lumpur
- JB = Johor Bahru
- SS2, SS15 = Sections in Subang/PJ
- USJ = Subang Jaya sections
- KD = Kota Damansara
- Mont K / MK = Mont Kiara
- BB = Bukit Bintang
- KLCC = KL City Centre

You must respond in JSON format ONLY with this exact structure:
{
  "expandedName": "Full canonical name of the location",
  "state": "Malaysian state (e.g., Selangor, Kuala Lumpur, Johor)",
  "latitude": 3.1234,
  "longitude": 101.5678,
  "confidence": 0.95
}

If you cannot identify the location or it's not a Malaysian location, respond with:
{
  "expandedName": null,
  "state": null,
  "latitude": null,
  "longitude": null,
  "confidence": 0
}

Only expand location abbreviations. Ignore other parts of the query like "for own stay", "under RM500k", etc.`;

export async function expandMalaysianAbbreviation(abbreviation: string): Promise<AbbreviationResult | null> {
  const normalized = abbreviation.toLowerCase().trim();
  
  // Check in-memory cache first (includes GPT-learned abbreviations)
  if (ABBREVIATION_CACHE.has(normalized)) {
    const cached = ABBREVIATION_CACHE.get(normalized);
    if (cached) {
      console.log(`⚡ ABBREVIATION CACHE HIT: "${abbreviation}" → "${cached.expandedName}"`);
      return { ...cached, source: 'cache' };
    }
    return null;
  }
  
  // Check local known abbreviations (fast, free)
  const knownLocation = KNOWN_ABBREVIATIONS[normalized];
  if (knownLocation) {
    console.log(`📍 LOCAL ABBREVIATION: "${abbreviation}" → "${knownLocation.name}" (${knownLocation.state})`);
    const result: AbbreviationResult = {
      originalAbbreviation: abbreviation,
      expandedName: knownLocation.name,
      latitude: knownLocation.lat,
      longitude: knownLocation.lng,
      state: knownLocation.state,
      confidence: 1.0,
      source: 'cache'
    };
    ABBREVIATION_CACHE.set(normalized, result);
    return result;
  }

  const locationKeywords = extractLocationPart(abbreviation);
  if (!locationKeywords) {
    console.log(`🚫 NO LOCATION DETECTED: "${abbreviation}" doesn't appear to contain a location abbreviation`);
    ABBREVIATION_CACHE.set(normalized, null);
    return null;
  }

  try {
    console.log(`🤖 GPT ABBREVIATION EXPANSION: Asking GPT about "${locationKeywords}"`);
    
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Expand this Malaysian location abbreviation: "${locationKeywords}"` }
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: "json_object" }
    });
    
    const responseTime = Date.now() - startTime;
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      console.log(`❌ GPT returned empty response for "${abbreviation}"`);
      ABBREVIATION_CACHE.set(normalized, null);
      return null;
    }
    
    const parsed = JSON.parse(content);
    console.log(`📍 GPT RESPONSE:`, parsed);
    
    await storage.logApiUsage({
      service: 'openai_abbreviation',
      endpoint: 'chat/completions',
      requestType: 'abbreviation_expansion',
      query: abbreviation,
      cacheHit: false,
      estimatedCost: 0.0001,
      responseTime,
      success: !!parsed.expandedName
    });
    
    if (!parsed.expandedName || parsed.confidence < 0.5) {
      console.log(`🚫 GPT couldn't identify location: "${abbreviation}"`);
      ABBREVIATION_CACHE.set(normalized, null);
      return null;
    }
    
    if (!isValidMalaysianCoordinate(parsed.latitude, parsed.longitude)) {
      console.log(`⚠️ Invalid coordinates from GPT: (${parsed.latitude}, ${parsed.longitude})`);
      ABBREVIATION_CACHE.set(normalized, null);
      return null;
    }
    
    const result: AbbreviationResult = {
      originalAbbreviation: abbreviation,
      expandedName: parsed.expandedName,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      state: parsed.state || 'Unknown',
      confidence: parsed.confidence,
      source: 'gpt'
    };
    
    ABBREVIATION_CACHE.set(normalized, result);
    
    await saveLearnedAbbreviation(normalized, result);
    
    console.log(`✅ GPT EXPANSION SUCCESS: "${abbreviation}" → "${result.expandedName}" at (${result.latitude}, ${result.longitude})`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ GPT abbreviation expansion failed:`, error);
    ABBREVIATION_CACHE.set(normalized, null);
    return null;
  }
}

function extractLocationPart(query: string): string | null {
  const cleaned = query.toLowerCase()
    .replace(/for (own stay|investment|rent|sale)/gi, '')
    .replace(/under rm\s*[\d,]+k?/gi, '')
    .replace(/above rm\s*[\d,]+k?/gi, '')
    .replace(/below rm\s*[\d,]+k?/gi, '')
    .replace(/\d+\s*(bedroom|bed|bath|bathroom|sqft|sq ft)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (cleaned.length < 2) return null;
  
  const abbreviationPatterns = [
    /^[a-z]{2,4}$/i,
    /^[a-z]+\s*\d+$/i,
    /^[a-z\.\s]+$/i
  ];
  
  for (const pattern of abbreviationPatterns) {
    if (pattern.test(cleaned)) {
      return cleaned;
    }
  }
  
  const words = cleaned.split(' ');
  if (words.length <= 3 && words.some(w => w.length >= 2)) {
    return cleaned;
  }
  
  return null;
}

function isValidMalaysianCoordinate(lat: number, lng: number): boolean {
  const MALAYSIA_BOUNDS = {
    minLat: 0.8,
    maxLat: 7.5,
    minLng: 99.5,
    maxLng: 119.5
  };
  
  return (
    lat >= MALAYSIA_BOUNDS.minLat &&
    lat <= MALAYSIA_BOUNDS.maxLat &&
    lng >= MALAYSIA_BOUNDS.minLng &&
    lng <= MALAYSIA_BOUNDS.maxLng
  );
}

async function saveLearnedAbbreviation(normalized: string, result: AbbreviationResult): Promise<void> {
  try {
    await storage.saveCachedGeocoding({
      normalizedQuery: normalized,
      originalQuery: result.originalAbbreviation,
      latitude: result.latitude,
      longitude: result.longitude,
      formattedAddress: result.expandedName,
      source: 'gpt_abbreviation',
      confidence: result.confidence
    });
    
    console.log(`💾 SAVED LEARNED ABBREVIATION: "${normalized}" → "${result.expandedName}"`);
  } catch (error) {
    console.error(`Failed to save learned abbreviation:`, error);
  }
}

export async function loadCachedAbbreviations(): Promise<void> {
  try {
    console.log(`📚 Loading cached abbreviations from database...`);
  } catch (error) {
    console.error(`Failed to load cached abbreviations:`, error);
  }
}

export function getAbbreviationCacheStats() {
  return {
    size: ABBREVIATION_CACHE.size,
    entries: Array.from(ABBREVIATION_CACHE.entries()).map(([key, value]) => ({
      abbreviation: key,
      expanded: value?.expandedName || null,
      confidence: value?.confidence || 0
    }))
  };
}
