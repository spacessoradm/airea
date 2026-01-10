import { db } from '../db';
import { transportStations } from '@shared/schema';
import { sql } from 'drizzle-orm';

export interface TransportProximityResult {
  isNearTransport: boolean;
  nearestStation?: {
    name: string;
    distance: number;
    walkingTime: number;
    line: string;
    type: string;
  };
  allNearbyStations: Array<{
    name: string;
    distance: number;
    walkingTime: number;
    line: string;
    type: string;
  }>;
  stationsByType: {
    MRT: Array<{name: string; distance: number; walkingTime: number; line: string}>;
    LRT: Array<{name: string; distance: number; walkingTime: number; line: string}>;
    KTM: Array<{name: string; distance: number; walkingTime: number; line: string}>;
    Monorail: Array<{name: string; distance: number; walkingTime: number; line: string}>;
  };
}

export class TransportProximityService {
  
  /**
   * Analyze property coordinates and determine proximity to ALL transport types
   * Walking speed: 83.33 meters per minute (5 km/h average)
   * Maximum walking distance: 1800 meters (22 minutes)
   */
  async analyzePropertyTransportProximity(
    latitude: number, 
    longitude: number
  ): Promise<TransportProximityResult> {
    
    const MAX_WALKING_DISTANCE = 1800; // 22 minutes walking
    const WALKING_SPEED_M_PER_MIN = 83.33; // 5 km/h = 83.33 m/min
    
    console.log(`🚉 Analyzing ALL transport proximity for coordinates: ${latitude}, ${longitude}`);
    
    // Find all transport stations (MRT, LRT, KTM, Monorail) within walking distance
    // Use proper numeric casting to handle coordinate data types
    const nearbyStations = await db.execute(sql.raw(`
      SELECT 
        ts.station_name,
        ts.line_name,
        ts.transport_type,
        ROUND(ST_DistanceSphere(
          ST_MakePoint(${longitude}::numeric, ${latitude}::numeric),
          ST_MakePoint(ts.longitude::numeric, ts.latitude::numeric)
        )) as distance_meters
      FROM transport_stations ts
      WHERE ts.transport_type IN ('MRT', 'LRT', 'KTM', 'Monorail')
        AND ST_DistanceSphere(
          ST_MakePoint(${longitude}::numeric, ${latitude}::numeric),
          ST_MakePoint(ts.longitude::numeric, ts.latitude::numeric)
        ) <= ${MAX_WALKING_DISTANCE}
      ORDER BY distance_meters ASC
    `));
    
    const stationsArray = Array.isArray(nearbyStations) ? nearbyStations : [];
    console.log(`🚉 Found ${stationsArray.length} transport stations within 20-minute walk`);
    
    if (stationsArray.length === 0) {
      return {
        isNearTransport: false,
        allNearbyStations: [],
        stationsByType: { MRT: [], LRT: [], KTM: [], Monorail: [] }
      };
    }
    
    // Process stations and calculate walking times
    const processedStations = stationsArray.map((station: any) => ({
      name: station.station_name,
      distance: parseInt(station.distance_meters),
      walkingTime: Math.round(parseInt(station.distance_meters) / WALKING_SPEED_M_PER_MIN),
      line: station.line_name,
      type: station.transport_type
    }));
    
    // Group by transport type
    const stationsByType = {
      MRT: processedStations.filter(s => s.type === 'MRT'),
      LRT: processedStations.filter(s => s.type === 'LRT'),
      KTM: processedStations.filter(s => s.type === 'KTM'),
      Monorail: processedStations.filter(s => s.type === 'Monorail')
    };
    
    const nearestStation = processedStations[0];
    
    console.log(`🚉 Nearest transport: ${nearestStation.type} ${nearestStation.name} (${nearestStation.distance}m, ${nearestStation.walkingTime} mins)`);
    console.log(`🚉 Transport breakdown: MRT:${stationsByType.MRT.length}, LRT:${stationsByType.LRT.length}, KTM:${stationsByType.KTM.length}, Monorail:${stationsByType.Monorail.length}`);
    
    return {
      isNearTransport: true,
      nearestStation,
      allNearbyStations: processedStations,
      stationsByType
    };
  }
  
  /**
   * Generate automatic distance description for property listing
   */
  generateDistanceDescription(proximityResult: TransportProximityResult): string | null {
    if (!proximityResult.isNearTransport || !proximityResult.nearestStation) {
      return null;
    }
    
    const { nearestStation } = proximityResult;
    
    if (nearestStation.walkingTime <= 1) {
      return `${nearestStation.walkingTime} min walk to ${nearestStation.type} ${nearestStation.name}`;
    } else {
      return `${nearestStation.walkingTime} mins walk to ${nearestStation.type} ${nearestStation.name}`;
    }
  }
  
  /**
   * Generate distance descriptions for each transport type
   */
  generateTransportDistances(proximityResult: TransportProximityResult): {
    distanceToMRT?: string;
    distanceToLRT?: string;
    distanceToKTM?: string;
    distanceToMonorail?: string;
  } {
    const distances: any = {};
    
    if (proximityResult.stationsByType.MRT.length > 0) {
      const nearest = proximityResult.stationsByType.MRT[0];
      distances.distanceToMRT = `${nearest.walkingTime} mins walk to ${nearest.name}`;
    }
    
    if (proximityResult.stationsByType.LRT.length > 0) {
      const nearest = proximityResult.stationsByType.LRT[0];
      distances.distanceToLRT = `${nearest.walkingTime} mins walk to ${nearest.name}`;
    }
    
    if (proximityResult.stationsByType.KTM.length > 0) {
      const nearest = proximityResult.stationsByType.KTM[0];
      distances.distanceToKTM = `${nearest.walkingTime} mins walk to ${nearest.name}`;
    }
    
    if (proximityResult.stationsByType.Monorail.length > 0) {
      const nearest = proximityResult.stationsByType.Monorail[0];
      distances.distanceToMonorail = `${nearest.walkingTime} mins walk to ${nearest.name}`;
    }
    
    return distances;
  }
  
  /**
   * Generate nearby landmarks array including all transport stations
   */
  generateNearbyLandmarks(proximityResult: TransportProximityResult): string[] {
    const landmarks: string[] = [];
    
    if (proximityResult.isNearTransport) {
      // Add top 3 nearest stations as landmarks
      proximityResult.allNearbyStations.slice(0, 3).forEach(station => {
        const stationLandmark = `${station.type}-${station.name}`;
        landmarks.push(stationLandmark);
      });
      
      // Add general distance description
      const distanceDesc = this.generateDistanceDescription(proximityResult);
      if (distanceDesc) {
        landmarks.push(distanceDesc);
      }
    }
    
    return landmarks;
  }
  
  /**
   * Update property with ALL transport proximity information
   */
  async updatePropertyTransportInfo(
    propertyId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    try {
      const proximityResult = await this.analyzePropertyTransportProximity(latitude, longitude);
      
      if (proximityResult.isNearTransport) {
        const transportDistances = this.generateTransportDistances(proximityResult);
        const nearbyLandmarks = this.generateNearbyLandmarks(proximityResult);
        
        // Update the property with all transport information
        const updateFields = [];
        if (transportDistances.distanceToMRT) updateFields.push(`distance_to_mrt = '${transportDistances.distanceToMRT}'`);
        if (transportDistances.distanceToLRT) updateFields.push(`distance_to_lrt = '${transportDistances.distanceToLRT}'`);
        if (transportDistances.distanceToKTM) updateFields.push(`distance_to_ktm = '${transportDistances.distanceToKTM}'`);
        if (transportDistances.distanceToMonorail) updateFields.push(`distance_to_monorail = '${transportDistances.distanceToMonorail}'`);
        
        if (updateFields.length > 0) {
          await db.execute(sql.raw(`
            UPDATE properties 
            SET 
              ${updateFields.join(', ')},
              nearby_landmarks = ARRAY[${nearbyLandmarks.map(l => `'${l}'`).join(',')}]
            WHERE id = '${propertyId}'
          `));
          
          console.log(`✅ Updated property ${propertyId} with transport info: ${Object.values(transportDistances).join(', ')}`);
        }
      } else {
        console.log(`ℹ️ Property ${propertyId} is not near any transport stations`);
      }
    } catch (error) {
      console.error(`❌ Error updating transport info for property ${propertyId}:`, error);
    }
  }
}

export const transportProximityService = new TransportProximityService();

// Backward compatibility
export const mrtProximityService = transportProximityService;