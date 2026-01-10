import { openRouteService, type OpenRouteCoordinates } from "./openrouteService";
import { malaysianLocations } from './propertySearch';

interface Coordinates {
  lat: number;
  lng: number;
}

export class GeocodingService {
  /**
   * Get coordinates for a location name, trying local database first, then OpenRouteService
   */
  async getLocationCoordinates(locationName: string): Promise<Coordinates | null> {
    const normalizedName = locationName.toLowerCase().trim();
    
    // First, try local database
    const localResult = this.getLocalLocationCoordinates(normalizedName);
    if (localResult) {
      console.log(`Found location in local database: ${locationName}`, localResult);
      return localResult;
    }

    // For Malaysian property platform, only allow locations from local database
    // This prevents incorrect matches like "Midvalley" -> Borneo coordinates
    console.log(`Location "${locationName}" not found in Malaysian locations database`);
    return null;
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    return await openRouteService.reverseGeocode(lat, lng);
  }

  /**
   * Search for places using OpenRouteService
   */
  async searchPlaces(query: string): Promise<Array<{
    name: string;
    coordinates: Coordinates;
    address: string;
  }> | null> {
    return await openRouteService.searchPlaces(query);
  }

  /**
   * Get coordinates from local Malaysian locations database
   */
  private getLocalLocationCoordinates(locationName: string): Coordinates | null {
    const normalizedName = locationName.toLowerCase().trim();
    
    // Direct match
    if (malaysianLocations[normalizedName as keyof typeof malaysianLocations]) {
      return malaysianLocations[normalizedName as keyof typeof malaysianLocations];
    }

    // Partial matches for common location variations
    const locationKeys = Object.keys(malaysianLocations);
    for (const key of locationKeys) {
      // Check if the search term contains the location key or vice versa
      if (
        normalizedName.includes(key) ||
        key.includes(normalizedName) ||
        // Handle common variations like "kl" for "kuala lumpur"
        (normalizedName === 'kl' && key.includes('kuala lumpur')) ||
        (normalizedName.includes('kl') && key.includes('kuala lumpur'))
      ) {
        return malaysianLocations[key as keyof typeof malaysianLocations];
      }
    }

    return null;
  }

  /**
   * Get travel time and distance between two locations using OpenRouteService
   */
  async getDirections(
    origin: Coordinates,
    destination: Coordinates,
    mode: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Promise<{ duration: number; distance: number } | null> {
    return await openRouteService.getDirections(origin, destination, mode);
  }

  /**
   * Calculate distance matrix for multiple destinations
   */
  async getDistanceMatrix(
    origin: Coordinates,
    destinations: Coordinates[],
    mode: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Promise<Array<{ duration: number; distance: number } | null>> {
    return await openRouteService.getDistanceMatrix(origin, destinations, mode);
  }
}

export const geocodingService = new GeocodingService();