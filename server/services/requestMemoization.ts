// Request-scoped memoization to prevent duplicate operations within a single search request
import { PropertySearchFilters } from './openai';

interface RequestCache {
  // AI parsing results
  aiParsing: Map<string, PropertySearchFilters>;
  // Location geocoding results
  geocoding: Map<string, {lat: number; lng: number} | null>;
  // Keyword extraction results
  keywordExtraction: Map<string, any>;
  // NLP parsing results
  nlpParsing: Map<string, any>;
  // Database location lookups
  dbLocationLookups: Map<string, any>;
  // OpenRoute service calls
  openRouteResults: Map<string, any>;
}

// Request-scoped cache that gets cleared after each search request
class RequestMemoization {
  private cache: RequestCache = this.createEmptyCache();

  private createEmptyCache(): RequestCache {
    return {
      aiParsing: new Map(),
      geocoding: new Map(),
      keywordExtraction: new Map(),
      nlpParsing: new Map(),
      dbLocationLookups: new Map(),
      openRouteResults: new Map(),
    };
  }

  // Clear the request cache at the start of each new search
  clearRequestCache(): void {
    this.cache = this.createEmptyCache();
    console.log('🧹 Cleared request-scoped cache for new search');
  }

  // AI Parsing Memoization
  getAIParsing(query: string): PropertySearchFilters | undefined {
    const result = this.cache.aiParsing.get(query);
    if (result) {
      console.log(`⚡ REQUEST MEMO: AI parsing cache hit for "${query}"`);
    }
    return result;
  }

  setAIParsing(query: string, result: PropertySearchFilters): void {
    this.cache.aiParsing.set(query, result);
    console.log(`💾 REQUEST MEMO: Cached AI parsing for "${query}"`);
  }

  // Geocoding Memoization
  getGeocoding(locationName: string): {lat: number; lng: number} | null | undefined {
    const result = this.cache.geocoding.get(locationName);
    if (result !== undefined) {
      console.log(`⚡ REQUEST MEMO: Geocoding cache hit for "${locationName}"`);
    }
    return result;
  }

  setGeocoding(locationName: string, result: {lat: number; lng: number} | null): void {
    this.cache.geocoding.set(locationName, result);
    console.log(`💾 REQUEST MEMO: Cached geocoding for "${locationName}"`);
  }

  // Keyword Extraction Memoization
  getKeywordExtraction(query: string): any | undefined {
    const result = this.cache.keywordExtraction.get(query);
    if (result) {
      console.log(`⚡ REQUEST MEMO: Keyword extraction cache hit for "${query}"`);
    }
    return result;
  }

  setKeywordExtraction(query: string, result: any): void {
    this.cache.keywordExtraction.set(query, result);
    console.log(`💾 REQUEST MEMO: Cached keyword extraction for "${query}"`);
  }

  // NLP Parsing Memoization
  getNLPParsing(query: string): any | undefined {
    const result = this.cache.nlpParsing.get(query);
    if (result) {
      console.log(`⚡ REQUEST MEMO: NLP parsing cache hit for "${query}"`);
    }
    return result;
  }

  setNLPParsing(query: string, result: any): void {
    this.cache.nlpParsing.set(query, result);
    console.log(`💾 REQUEST MEMO: Cached NLP parsing for "${query}"`);
  }

  // Database Location Lookups Memoization
  getDbLocationLookup(key: string): any | undefined {
    const result = this.cache.dbLocationLookups.get(key);
    if (result !== undefined) {
      console.log(`⚡ REQUEST MEMO: DB location lookup cache hit for "${key}"`);
    }
    return result;
  }

  setDbLocationLookup(key: string, result: any): void {
    this.cache.dbLocationLookups.set(key, result);
    console.log(`💾 REQUEST MEMO: Cached DB location lookup for "${key}"`);
  }

  // OpenRoute Service Memoization
  getOpenRouteResult(query: string): any | undefined {
    const result = this.cache.openRouteResults.get(query);
    if (result !== undefined) {
      console.log(`⚡ REQUEST MEMO: OpenRoute service cache hit for "${query}"`);
    }
    return result;
  }

  setOpenRouteResult(query: string, result: any): void {
    this.cache.openRouteResults.set(query, result);
    console.log(`💾 REQUEST MEMO: Cached OpenRoute result for "${query}"`);
  }

  // Get cache statistics for debugging
  getCacheStats() {
    return {
      aiParsing: this.cache.aiParsing.size,
      geocoding: this.cache.geocoding.size,
      keywordExtraction: this.cache.keywordExtraction.size,
      nlpParsing: this.cache.nlpParsing.size,
      dbLocationLookups: this.cache.dbLocationLookups.size,
      openRouteResults: this.cache.openRouteResults.size,
    };
  }
}

// Singleton instance for request-scoped memoization
export const requestMemo = new RequestMemoization();