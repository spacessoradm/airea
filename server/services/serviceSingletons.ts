// Service singleton instances to avoid recreation overhead
import { NLPSearchService } from './nlpSearchService';
import { SimplifiedSearchService } from './simplifiedSearchService';
import { EnhancedGeocodingService } from './enhancedGeocoding';
import { GeospatialSearchService } from './geospatialSearchService';

// Singleton instances
let nlpSearchServiceInstance: NLPSearchService | null = null;
let simplifiedSearchServiceInstance: SimplifiedSearchService | null = null;
let enhancedGeocodingServiceInstance: EnhancedGeocodingService | null = null;
let geospatialSearchServiceInstance: GeospatialSearchService | null = null;

// Lazy initialization of service instances
export function getNLPSearchService(): NLPSearchService {
  if (!nlpSearchServiceInstance) {
    nlpSearchServiceInstance = new NLPSearchService();
    console.log('🔧 Initialized singleton NLPSearchService');
  }
  return nlpSearchServiceInstance;
}

export function getSimplifiedSearchService(): SimplifiedSearchService {
  if (!simplifiedSearchServiceInstance) {
    simplifiedSearchServiceInstance = new SimplifiedSearchService();
    console.log('🔧 Initialized singleton SimplifiedSearchService');
  }
  return simplifiedSearchServiceInstance;
}

export function getEnhancedGeocodingService(): EnhancedGeocodingService {
  if (!enhancedGeocodingServiceInstance) {
    enhancedGeocodingServiceInstance = new EnhancedGeocodingService();
    console.log('🔧 Initialized singleton EnhancedGeocodingService');
  }
  return enhancedGeocodingServiceInstance;
}

export function getGeospatialSearchService(): GeospatialSearchService {
  if (!geospatialSearchServiceInstance) {
    geospatialSearchServiceInstance = new GeospatialSearchService();
    console.log('🔧 Initialized singleton GeospatialSearchService');
  }
  return geospatialSearchServiceInstance;
}

// Optional: Clear singleton instances (useful for testing or memory management)
export function clearServiceSingletons(): void {
  nlpSearchServiceInstance = null;
  simplifiedSearchServiceInstance = null;
  enhancedGeocodingServiceInstance = null;
  geospatialSearchServiceInstance = null;
  console.log('🧹 Cleared all service singletons');
}