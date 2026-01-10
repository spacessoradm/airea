import { db } from "../db";
import { sql } from "drizzle-orm";

export interface NearbyLocation {
  type: 'transport' | 'landmark' | 'building';
  name: string;
  category: string;
  distance: number;
  walkingTime: string;
}

export interface LocationAnalysis {
  nearbyTransport: NearbyLocation[];
  nearbyLandmarks: NearbyLocation[];
  locationDescription: string;
  primaryTransport?: NearbyLocation;
}

export class LocationIdentificationService {
  
  /**
   * Automatically identify nearby locations when agent creates a property listing
   */
  async analyzeLocation(latitude: number, longitude: number): Promise<LocationAnalysis> {
    console.log(`🔍 LOCATION ANALYSIS: Analyzing location at (${latitude}, ${longitude})`);
    
    const [nearbyTransport, nearbyLandmarks] = await Promise.all([
      this.findNearbyTransport(latitude, longitude),
      this.findNearbyLandmarks(latitude, longitude)
    ]);

    const primaryTransport = nearbyTransport[0]; // Closest transport
    const locationDescription = this.generateLocationDescription(nearbyTransport, nearbyLandmarks);

    console.log(`📍 ANALYSIS COMPLETE: Found ${nearbyTransport.length} transport, ${nearbyLandmarks.length} landmarks`);

    return {
      nearbyTransport,
      nearbyLandmarks,
      locationDescription,
      primaryTransport
    };
  }

  /**
   * Find nearby MRT/LRT/KTM stations within reasonable distance
   */
  private async findNearbyTransport(latitude: number, longitude: number): Promise<NearbyLocation[]> {
    try {
      const result = await db.execute(sql.raw(`
        SELECT 
          station_name,
          transport_type,
          ST_DistanceSphere(
            ST_MakePoint(${longitude}::numeric, ${latitude}::numeric),
            ST_MakePoint(longitude::numeric, latitude::numeric)
          ) as distance_meters
        FROM transport_stations
        WHERE ST_DistanceSphere(
          ST_MakePoint(${longitude}::numeric, ${latitude}::numeric),
          ST_MakePoint(longitude::numeric, latitude::numeric)
        ) <= 3000
        ORDER BY distance_meters ASC
        LIMIT 10
      `));

      return (result?.rows || []).map((station: any) => ({
        type: 'transport' as const,
        name: station.station_name,
        category: station.transport_type,
        distance: Math.round(station.distance_meters),
        walkingTime: this.calculateWalkingTime(station.distance_meters)
      }));
    } catch (error) {
      console.error('❌ Error finding nearby transport:', error);
      return [];
    }
  }

  /**
   * Find nearby landmarks and buildings from location database
   */
  private async findNearbyLandmarks(latitude: number, longitude: number): Promise<NearbyLocation[]> {
    try {
      const result = await db.execute(sql.raw(`
        SELECT 
          name,
          building_type,
          ST_DistanceSphere(
            ST_MakePoint(${longitude}::numeric, ${latitude}::numeric),
            ST_MakePoint(longitude::numeric, latitude::numeric)
          ) as distance_meters
        FROM locations
        WHERE ST_DistanceSphere(
          ST_MakePoint(${longitude}::numeric, ${latitude}::numeric),
          ST_MakePoint(longitude::numeric, latitude::numeric)
        ) <= 2000
        AND building_type IN ('mall', 'school', 'hospital', 'park', 'landmark')
        ORDER BY distance_meters ASC
        LIMIT 8
      `));

      return (result?.rows || []).map((landmark: any) => ({
        type: 'landmark' as const,
        name: landmark.name,
        category: landmark.building_type,
        distance: Math.round(landmark.distance_meters),
        walkingTime: this.calculateWalkingTime(landmark.distance_meters)
      }));
    } catch (error) {
      console.error('❌ Error finding nearby landmarks:', error);
      return [];
    }
  }

  /**
   * Generate human-readable location description
   */
  private generateLocationDescription(transport: NearbyLocation[], landmarks: NearbyLocation[]): string {
    const descriptions: string[] = [];

    // Primary transport access
    if (transport.length > 0) {
      const primary = transport[0];
      if (primary.distance <= 800) {
        descriptions.push(`${primary.walkingTime} walk to ${primary.name} ${primary.category}`);
      } else if (primary.distance <= 2000) {
        descriptions.push(`Near ${primary.name} ${primary.category}`);
      }
    }

    // Secondary transport
    if (transport.length > 1) {
      const secondary = transport[1];
      if (secondary.distance <= 1500) {
        descriptions.push(`Close to ${secondary.name} ${secondary.category}`);
      }
    }

    // Key landmarks
    const keyLandmarks = landmarks.filter(l => l.distance <= 1000);
    if (keyLandmarks.length > 0) {
      const landmark = keyLandmarks[0];
      descriptions.push(`Near ${landmark.name}`);
    }

    return descriptions.length > 0 ? descriptions.join(', ') : 'Strategic location';
  }

  /**
   * Calculate estimated walking time based on distance
   */
  private calculateWalkingTime(distanceMeters: number): string {
    const walkingSpeedMPS = 1.4; // Average walking speed: 1.4 m/s
    const timeSeconds = distanceMeters / walkingSpeedMPS;
    const timeMinutes = Math.round(timeSeconds / 60);

    if (timeMinutes <= 1) return '1 min';
    if (timeMinutes <= 15) return `${timeMinutes} mins`;
    if (timeMinutes <= 30) return `${Math.round(timeMinutes / 5) * 5} mins`; // Round to 5 min intervals
    return `${Math.round(timeMinutes / 10) * 10} mins`; // Round to 10 min intervals
  }

  /**
   * Auto-populate distance fields for property based on analysis
   */
  generateDistanceFields(analysis: LocationAnalysis): {
    distanceToMRT?: string;
    distanceToLRT?: string;
    distanceToMall?: string;
    distanceToSchool?: string;
    nearbyLandmarks: string[];
  } {
    const result: any = {
      nearbyLandmarks: []
    };

    // Set transport distances
    analysis.nearbyTransport.forEach(transport => {
      if (transport.category === 'MRT' && transport.distance <= 2000) {
        result.distanceToMRT = `${transport.walkingTime} to ${transport.name}`;
      } else if (['LRT', 'Monorail'].includes(transport.category) && transport.distance <= 2000) {
        result.distanceToLRT = `${transport.walkingTime} to ${transport.name}`;
      }
    });

    // Set landmark distances
    analysis.nearbyLandmarks.forEach(landmark => {
      if (landmark.category === 'mall' && landmark.distance <= 1500) {
        result.distanceToMall = `${landmark.walkingTime} to ${landmark.name}`;
      } else if (landmark.category === 'school' && landmark.distance <= 1000) {
        result.distanceToSchool = `${landmark.walkingTime} to ${landmark.name}`;
      }
      
      // Add to landmarks list
      if (landmark.distance <= 1500) {
        result.nearbyLandmarks.push(`${landmark.name} (${landmark.walkingTime})`);
      }
    });

    return result;
  }
}

export const locationIdentificationService = new LocationIdentificationService();