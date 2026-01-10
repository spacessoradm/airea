// Location search service for frontend
export interface LocationResult {
  id: string;
  name: string;
  city?: string;
  state?: string;
  latitude: number;
  longitude: number;
  buildingType?: string;
  displayName: string;
}

export interface LocationSearchOptions {
  query: string;
  limit?: number;
}

export class LocationService {
  private baseUrl = '/api/locations';

  async searchLocations(options: LocationSearchOptions): Promise<LocationResult[]> {
    const { query, limit = 10 } = options;
    
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      // Use the existing location service endpoint which has different format
      const response = await fetch(
        `${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform the existing API response to match our LocationResult interface
      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        city: item.parentInfo?.city || '',
        state: item.parentInfo?.state || '',
        latitude: parseFloat(item.latitude || '0'),
        longitude: parseFloat(item.longitude || '0'),
        buildingType: item.type,
        displayName: item.fullPath || `${item.name}${item.parentInfo?.city ? `, ${item.parentInfo.city}` : ''}${item.parentInfo?.state ? `, ${item.parentInfo.state}` : ''}`
      }));
    } catch (error) {
      console.error('Location search failed:', error);
      return [];
    }
  }

  async getLocationById(id: string): Promise<LocationResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get location failed:', error);
      return null;
    }
  }

  async getNearbyLocations(
    latitude: number, 
    longitude: number, 
    radius: number = 5000, 
    limit: number = 10
  ): Promise<LocationResult[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/nearby/${latitude}/${longitude}?radius=${radius}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Nearby locations search failed:', error);
      return [];
    }
  }
}

export const locationService = new LocationService();