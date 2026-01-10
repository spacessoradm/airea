// OpenRouteService API integration for geocoding, routing, and places
// More cost-effective alternative to Google Maps API

import { storage } from "../storage";

interface OpenRouteCoordinates {
  lat: number;
  lng: number;
}

interface OpenRouteGeocodingResponse {
  features: Array<{
    geometry: {
      coordinates: [number, number]; // [lng, lat]
    };
    properties: {
      label: string;
      name: string;
      country: string;
      region?: string;
      locality?: string;
      street?: string;
      housenumber?: string;
    };
  }>;
}

interface OpenRouteDirectionsResponse {
  routes: Array<{
    summary: {
      distance: number; // meters
      duration: number; // seconds
    };
  }>;
}

interface OpenRoutePlacesResponse {
  features: Array<{
    geometry: {
      coordinates: [number, number]; // [lng, lat]
    };
    properties: {
      name: string;
      category: string;
      street?: string;
      city?: string;
    };
  }>;
}

class OpenRouteService {
  private apiKey: string;
  private baseUrl = 'https://api.openrouteservice.org';

  // Malaysia geographic bounds for strict filtering
  private malaysiaBounds = {
    minLat: 0.8,
    maxLat: 7.4,
    minLng: 99.6,
    maxLng: 119.3
  };

  constructor() {
    this.apiKey = process.env.OPENROUTE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenRouteService API key not found in environment variables');
    }
  }

  /**
   * Validate if coordinates are within Malaysia bounds
   */
  private isValidMalaysianCoordinate(lat: number, lng: number): boolean {
    return lat >= this.malaysiaBounds.minLat && 
           lat <= this.malaysiaBounds.maxLat && 
           lng >= this.malaysiaBounds.minLng && 
           lng <= this.malaysiaBounds.maxLng;
  }

  // Geocoding - convert address to coordinates (Malaysia only)
  async geocode(address: string): Promise<OpenRouteCoordinates | null> {
    if (!this.apiKey) {
      console.error('OpenRouteService API key not available');
      return null;
    }

    try {
      // Add Malaysia to improve accuracy for Malaysian addresses
      const searchQuery = address.includes('Malaysia') ? address : `${address}, Malaysia`;
      
      // Enhanced URL with stricter Malaysia filtering
      const url = `${this.baseUrl}/geocode/search?` + 
        `api_key=${this.apiKey}&` +
        `text=${encodeURIComponent(searchQuery)}&` +
        `boundary.country=MY&` +
        `boundary.rect.min_lon=${this.malaysiaBounds.minLng}&` +
        `boundary.rect.min_lat=${this.malaysiaBounds.minLat}&` +
        `boundary.rect.max_lon=${this.malaysiaBounds.maxLng}&` +
        `boundary.rect.max_lat=${this.malaysiaBounds.maxLat}&` +
        `focus.point.lon=101.6869&` +  // Kuala Lumpur center
        `focus.point.lat=3.139&` +    // Kuala Lumpur center
        `size=3`; // Get multiple results to filter best match
      
      const response = await fetch(url);
      const data: OpenRouteGeocodingResponse = await response.json();
      
      if (data.features && data.features.length > 0) {
        // Filter results to only Malaysian coordinates
        for (const feature of data.features) {
          const coords = feature.geometry.coordinates;
          const lat = coords[1];
          const lng = coords[0];
          
          if (this.isValidMalaysianCoordinate(lat, lng)) {
            console.log(`✅ OpenRouteService found Malaysian location: "${address}" -> (${lat}, ${lng})`);
            return { lat, lng };
          } else {
            console.log(`❌ Filtered out non-Malaysian coordinates for "${address}": (${lat}, ${lng})`);
          }
        }
        console.log(`❌ No valid Malaysian coordinates found for "${address}"`);
      }
      
      return null;
    } catch (error) {
      console.error('OpenRouteService geocoding error:', error);
      return null;
    }
  }

  // Reverse geocoding - convert coordinates to address
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (!this.apiKey) {
      console.error('OpenRouteService API key not available');
      return null;
    }

    try {
      const url = `${this.baseUrl}/geocode/reverse?api_key=${this.apiKey}&point.lon=${lng}&point.lat=${lat}&size=1`;
      
      const response = await fetch(url);
      const data: OpenRouteGeocodingResponse = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].properties.label;
      }
      
      return null;
    } catch (error) {
      console.error('OpenRouteService reverse geocoding error:', error);
      return null;
    }
  }

  // Calculate travel time and distance between two points
  async getDirections(
    origin: OpenRouteCoordinates,
    destination: OpenRouteCoordinates,
    mode: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Promise<{ duration: number; distance: number } | null> {
    if (!this.apiKey) {
      console.error('OpenRouteService API key not available');
      return null;
    }

    try {
      // Check cache first (70% cost reduction on travel time calculations)
      const cached = await storage.getCachedTravelTime(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng,
        mode
      );

      if (cached) {
        console.log(`🎯 Travel Time Cache HIT: ${origin.lat},${origin.lng} → ${destination.lat},${destination.lng} (${mode})`);
        await storage.logApiUsage({
          service: 'openroute_directions',
          requestType: 'directions',
          query: `${origin.lat},${origin.lng} to ${destination.lat},${destination.lng}`,
          cacheHit: true,
          estimatedCost: 0,
          responseTime: 0,
          success: true
        });

        return {
          duration: Math.round(cached.durationSeconds / 60), // Convert seconds to minutes for display
          distance: cached.distanceMeters // Already in meters
        };
      }

      // Map travel modes to OpenRoute profiles
      const profileMap = {
        driving: 'driving-car',
        walking: 'foot-walking',
        cycling: 'cycling-regular'
      };

      const profile = profileMap[mode];
      const coordinates = [[origin.lng, origin.lat], [destination.lng, destination.lat]];
      
      const url = `${this.baseUrl}/v2/directions/${profile}`;
      
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coordinates,
          format: 'json'
        })
      });

      const data: OpenRouteDirectionsResponse = await response.json();
      const responseTime = Date.now() - startTime;
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const durationMinutes = Math.round(route.summary.duration / 60);
        const distanceMeters = Math.round(route.summary.distance);

        // Save to cache (store in raw API units: seconds and meters)
        await storage.saveCachedTravelTime({
          originLat: origin.lat,
          originLng: origin.lng,
          destLat: destination.lat,
          destLng: destination.lng,
          durationSeconds: route.summary.duration, // Store raw seconds from API
          distanceMeters: route.summary.distance, // Store raw meters from API
          mode,
          route: null
        });

        // Log API usage
        await storage.logApiUsage({
          service: 'openroute_directions',
          requestType: 'directions',
          query: `${origin.lat},${origin.lng} to ${destination.lat},${destination.lng}`,
          cacheHit: false,
          estimatedCost: 0.004, // ~$4 per 1000 requests
          responseTime,
          success: true
        });

        return {
          duration: durationMinutes,
          distance: distanceMeters
        };
      }
      
      return null;
    } catch (error) {
      console.error('OpenRouteService directions error:', error);
      return null;
    }
  }

  // Search for places (Malaysia only)
  async searchPlaces(query: string, coordinates?: OpenRouteCoordinates): Promise<Array<{
    name: string;
    coordinates: OpenRouteCoordinates;
    address: string;
  }> | null> {
    if (!this.apiKey) {
      console.error('OpenRouteService API key not available');
      return null;
    }

    try {
      // Use geocoding for place search as OpenRoute doesn't have a dedicated places API
      const searchQuery = query.includes('Malaysia') ? query : `${query}, Malaysia`;
      
      // Enhanced URL with Malaysia bounds
      const url = `${this.baseUrl}/geocode/search?` + 
        `api_key=${this.apiKey}&` +
        `text=${encodeURIComponent(searchQuery)}&` +
        `boundary.country=MY&` +
        `boundary.rect.min_lon=${this.malaysiaBounds.minLng}&` +
        `boundary.rect.min_lat=${this.malaysiaBounds.minLat}&` +
        `boundary.rect.max_lon=${this.malaysiaBounds.maxLng}&` +
        `boundary.rect.max_lat=${this.malaysiaBounds.maxLat}&` +
        `focus.point.lon=101.6869&` +  // Kuala Lumpur center
        `focus.point.lat=3.139&` +    // Kuala Lumpur center
        `size=10`;
      
      const response = await fetch(url);
      const data: OpenRouteGeocodingResponse = await response.json();
      
      if (data.features && data.features.length > 0) {
        // Filter to only Malaysian coordinates
        const validFeatures = data.features.filter(feature => {
          const lat = feature.geometry.coordinates[1];
          const lng = feature.geometry.coordinates[0];
          return this.isValidMalaysianCoordinate(lat, lng);
        });

        console.log(`🔍 OpenRouteService: Found ${data.features.length} results, ${validFeatures.length} in Malaysia for "${query}"`);
        
        return validFeatures.map(feature => ({
          name: feature.properties.name || feature.properties.label,
          coordinates: {
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0]
          },
          address: feature.properties.label
        }));
      }
      
      return [];
    } catch (error) {
      console.error('OpenRouteService places search error:', error);
      return null;
    }
  }

  // Batch calculate travel times for multiple destinations using Matrix API
  async getDistanceMatrix(
    origin: OpenRouteCoordinates,
    destinations: OpenRouteCoordinates[],
    mode: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Promise<Array<{ duration: number; distance: number } | null>> {
    if (!this.apiKey) {
      console.error('OpenRouteService API key not available');
      return new Array(destinations.length).fill(null);
    }

    try {
      // Check cache for all destinations first
      const results: Array<{ duration: number; distance: number } | null> = [];
      const uncachedIndices: number[] = [];
      const uncachedDestinations: OpenRouteCoordinates[] = [];

      let cacheHits = 0;
      for (let i = 0; i < destinations.length; i++) {
        const cached = await storage.getCachedTravelTime(
          origin.lat,
          origin.lng,
          destinations[i].lat,
          destinations[i].lng,
          mode
        );

        if (cached) {
          cacheHits++;
          results[i] = {
            duration: Math.round(cached.durationSeconds / 60), // Convert seconds to minutes
            distance: cached.distanceMeters // Already in meters
          };
        } else {
          uncachedIndices.push(i);
          uncachedDestinations.push(destinations[i]);
          results[i] = null; // Placeholder
        }
      }

      if (cacheHits > 0) {
        console.log(`🎯 Travel Time Matrix Cache: ${cacheHits}/${destinations.length} hits (${Math.round(cacheHits/destinations.length*100)}%)`);
      }

      // If all cached, return early
      if (uncachedDestinations.length === 0) {
        return results;
      }

      // Fetch uncached destinations
      const profileMap = {
        driving: 'driving-car',
        walking: 'foot-walking',
        cycling: 'cycling-regular'
      };

      const profile = profileMap[mode];
      const maxBatchSize = 50;
      
      for (let i = 0; i < uncachedDestinations.length; i += maxBatchSize) {
        const batch = uncachedDestinations.slice(i, i + maxBatchSize);
        const batchIndices = uncachedIndices.slice(i, i + maxBatchSize);
        
        const locations = [
          [origin.lng, origin.lat],
          ...batch.map(dest => [dest.lng, dest.lat])
        ];
        
        const url = `${this.baseUrl}/v2/matrix/${profile}`;
        
        const requestBody = {
          locations,
          sources: [0],
          destinations: Array.from({ length: batch.length }, (_, i) => i + 1),
          metrics: ['duration', 'distance'],
          units: 'm'
        };
        
        const startTime = Date.now();
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        const responseTime = Date.now() - startTime;

        if (!response.ok) {
          console.error(`OpenRoute Matrix API error: ${response.status} ${response.statusText}`);
          continue;
        }

        const data = await response.json();
        
        if (data.durations && data.durations[0] && data.distances && data.distances[0]) {
          const durations = data.durations[0];
          const distances = data.distances[0];
          
          for (let j = 0; j < batch.length; j++) {
            const duration = durations[j];
            const distance = distances[j];
            const originalIndex = batchIndices[j];
            
            if (duration !== null && distance !== null && duration !== undefined && distance !== undefined) {
              const durationMinutes = Math.round(duration / 60);
              const distanceMeters = Math.round(distance);
              
              results[originalIndex] = {
                duration: durationMinutes,
                distance: distanceMeters
              };

              // Cache the result (store in raw API units)
              await storage.saveCachedTravelTime({
                originLat: origin.lat,
                originLng: origin.lng,
                destLat: batch[j].lat,
                destLng: batch[j].lng,
                durationSeconds: duration, // Store raw seconds from API
                distanceMeters: distance, // Store raw meters from API
                mode,
                route: null
              });
            }
          }

          // Log API usage for the batch
          await storage.logApiUsage({
            service: 'openroute_matrix',
            requestType: 'distance_matrix',
            query: `${batch.length} destinations from ${origin.lat},${origin.lng}`,
            cacheHit: false,
            estimatedCost: 0.004 * batch.length, // ~$4 per 1000 requests
            responseTime,
            success: true
          });
        }
        
        if (i + maxBatchSize < uncachedDestinations.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const validResults = results.filter(r => r !== null).length;
      console.log(`OpenRoute Matrix: ${validResults}/${destinations.length} valid results (${cacheHits} from cache)`);
      return results;
      
    } catch (error) {
      console.error('OpenRouteService Matrix API error:', error);
      return new Array(destinations.length).fill(null);
    }
  }
}

// Export singleton instance
export const openRouteService = new OpenRouteService();
export type { OpenRouteCoordinates };