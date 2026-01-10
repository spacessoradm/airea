// Mapbox API integration for geocoding and directions
const MAPBOX_API_KEY = process.env.MAPBOX_API_KEY || 'default_key';
const MAPBOX_BASE_URL = 'https://api.mapbox.com';

export interface MapboxCoordinates {
  lat: number;
  lng: number;
}

export interface MapboxDirectionsResult {
  duration: number; // in minutes
  distance: number; // in meters
}

class MapboxService {
  /**
   * Geocode a location name to coordinates using Mapbox Geocoding API
   */
  async geocode(locationName: string): Promise<MapboxCoordinates | null> {
    try {
      // Focus search on Malaysia with enhanced location search
      const searchTerms = [
        locationName,
        `${locationName} Mall`,
        `${locationName} Shopping Centre`,
        `${locationName} Malaysia`
      ];

      for (const searchTerm of searchTerms) {
        const url = `${MAPBOX_BASE_URL}/geocoding/v5/mapbox.places/${encodeURIComponent(searchTerm)}.json?` +
          `access_token=${MAPBOX_API_KEY}&` +
          `country=MY&` + // Restrict to Malaysia
          `limit=1&` +
          `types=poi,place,address,locality,neighborhood&` +
          `proximity=101.6869,3.139`; // Bias towards KL area

        try {
          const response = await fetch(url);
          
          if (!response.ok) {
            console.error(`Mapbox geocoding API error for "${searchTerm}": ${response.status} ${response.statusText}`);
            continue;
          }

          const data = await response.json();
          
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            const [lng, lat] = feature.center;
            
            console.log(`Mapbox geocoded "${locationName}" (using "${searchTerm}") to:`, { lat, lng });
            return { lat, lng };
          }
        } catch (error) {
          console.error(`Error geocoding "${searchTerm}":`, error);
          continue;
        }
      }

      console.log(`Mapbox: No results found for "${locationName}" with any search variations`);
      return null;
    } catch (error) {
      console.error('Error in Mapbox geocoding:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const url = `${MAPBOX_BASE_URL}/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
        `access_token=${MAPBOX_API_KEY}&` +
        `types=address,poi,place`;

      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Mapbox reverse geocoding error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }

      return null;
    } catch (error) {
      console.error('Error in Mapbox reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Search for places using Mapbox Places API
   */
  async searchPlaces(query: string): Promise<Array<{
    name: string;
    coordinates: MapboxCoordinates;
    address: string;
  }> | null> {
    try {
      const url = `${MAPBOX_BASE_URL}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${MAPBOX_API_KEY}&` +
        `country=MY&` +
        `limit=5&` +
        `types=address,poi,place,locality,neighborhood`;

      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Mapbox places search error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features.map((feature: any) => {
          const [lng, lat] = feature.center;
          return {
            name: feature.text || feature.place_name,
            coordinates: { lat, lng },
            address: feature.place_name
          };
        });
      }

      return [];
    } catch (error) {
      console.error('Error in Mapbox places search:', error);
      return null;
    }
  }

  /**
   * Get directions between two points using Mapbox Directions API
   */
  async getDirections(
    origin: MapboxCoordinates,
    destination: MapboxCoordinates,
    mode: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Promise<MapboxDirectionsResult | null> {
    try {
      // Map travel modes to Mapbox profiles
      const profileMap: Record<string, string> = {
        'driving': 'driving',
        'walking': 'walking',
        'cycling': 'cycling'
      };

      const profile = profileMap[mode] || 'driving';
      const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
      
      const url = `${MAPBOX_BASE_URL}/directions/v5/mapbox/${profile}/${coordinates}?` +
        `access_token=${MAPBOX_API_KEY}&` +
        `overview=false&` +
        `geometries=geojson`;

      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Mapbox directions API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          duration: Math.round(route.duration / 60), // Convert seconds to minutes
          distance: route.distance // meters
        };
      }

      return null;
    } catch (error) {
      console.error('Error in Mapbox directions:', error);
      return null;
    }
  }

  /**
   * Get distance matrix for multiple destinations using Mapbox Matrix API
   */
  async getDistanceMatrix(
    origin: MapboxCoordinates,
    destinations: MapboxCoordinates[],
    mode: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Promise<Array<MapboxDirectionsResult | null>> {
    try {
      // Mapbox Matrix API has a limit of 25 destinations per request
      const BATCH_SIZE = 25;
      const results: Array<MapboxDirectionsResult | null> = [];

      for (let i = 0; i < destinations.length; i += BATCH_SIZE) {
        const batch = destinations.slice(i, i + BATCH_SIZE);
        const batchResults = await this.processBatch(origin, batch, mode);
        results.push(...batchResults);

        // Add delay between batches to respect rate limits
        if (i + BATCH_SIZE < destinations.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return results;
    } catch (error) {
      console.error('Error in Mapbox distance matrix:', error);
      return destinations.map(() => null);
    }
  }

  /**
   * Process a batch of destinations for the distance matrix
   */
  private async processBatch(
    origin: MapboxCoordinates,
    destinations: MapboxCoordinates[],
    mode: string
  ): Promise<Array<MapboxDirectionsResult | null>> {
    try {
      const profileMap: Record<string, string> = {
        'driving': 'driving',
        'walking': 'walking',
        'cycling': 'cycling'
      };

      const profile = profileMap[mode] || 'driving';
      
      // Build coordinates string: origin first, then all destinations
      const coords = [origin, ...destinations]
        .map(coord => `${coord.lng},${coord.lat}`)
        .join(';');

      const url = `${MAPBOX_BASE_URL}/directions-matrix/v1/mapbox/${profile}/${coords}?` +
        `access_token=${MAPBOX_API_KEY}&` +
        `sources=0&` + // Origin is at index 0
        `annotations=duration,distance`;

      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Mapbox matrix API error: ${response.status}`);
        return destinations.map(() => null);
      }

      const data = await response.json();
      
      if (data.durations && data.distances && data.durations[0] && data.distances[0]) {
        const durations = data.durations[0]; // First row (from origin)
        const distances = data.distances[0]; // First row (from origin)
        
        return destinations.map((_, index) => {
          const duration = durations[index + 1]; // +1 because origin is at index 0
          const distance = distances[index + 1];
          
          if (duration !== null && distance !== null) {
            return {
              duration: Math.round(duration / 60), // Convert seconds to minutes
              distance: distance // meters
            };
          }
          
          return null;
        });
      }

      return destinations.map(() => null);
    } catch (error) {
      console.error('Error processing Mapbox batch:', error);
      return destinations.map(() => null);
    }
  }
}

export const mapboxService = new MapboxService();