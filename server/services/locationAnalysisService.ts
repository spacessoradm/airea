import { db } from "../db";
import { transportStations } from "@shared/schema";
import { sql } from "drizzle-orm";

interface TransportProximity {
  stationName: string;
  stationCode: string;
  transportType: string;
  lineName: string;
  distanceMeters: number;
  walkTimeMinutes: number;
}

interface LocationAnalysis {
  nearestMRT: TransportProximity | null;
  nearestLRT: TransportProximity | null;
  nearestKTM: TransportProximity | null;
  nearestMonorail: TransportProximity | null;
  nearestBRT: TransportProximity | null;
  allNearbyStations: TransportProximity[];
}

export class LocationAnalysisService {
  // Calculate distance between two coordinates using Haversine formula
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Estimate walking time based on distance (average walking speed: 5 km/h)
  private calculateWalkTime(distanceMeters: number): number {
    const walkingSpeedKmh = 5;
    const walkingSpeedMs = walkingSpeedKmh * 1000 / 60; // meters per minute
    return Math.round(distanceMeters / walkingSpeedMs);
  }

  // Analyze location proximity to transport stations
  async analyzeLocationProximity(latitude: number, longitude: number): Promise<LocationAnalysis> {
    try {
      console.log(`🔍 Analyzing location proximity for: ${latitude}, ${longitude}`);

      // Get all transport stations within reasonable distance (5km radius)
      // Use latitude/longitude coordinates directly since geometry column is NULL
      const stations = await db
        .select()
        .from(transportStations)
        .where(sql`
          ST_DWithin(
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326),
            5000
          )
        `);

      console.log(`🗺️ Found ${stations.length} stations within 5km radius`);
      if (stations.length > 0) {
        console.log(`🚇 Sample stations: ${stations.slice(0, 3).map(s => `${s.stationName} (${s.transportType})`).join(', ')}`);
      }

      const proximityData: TransportProximity[] = [];

      // Calculate distances for each station
      for (const station of stations) {
        const distance = this.calculateDistance(
          latitude, longitude,
          station.latitude, station.longitude
        );

        // Only include stations within 2km (reasonable walking distance)
        if (distance <= 2000) {
          proximityData.push({
            stationName: station.stationName,
            stationCode: station.stationCode,
            transportType: station.transportType,
            lineName: station.lineName,
            distanceMeters: Math.round(distance),
            walkTimeMinutes: this.calculateWalkTime(distance)
          });
        }
      }

      // Sort by distance
      proximityData.sort((a, b) => a.distanceMeters - b.distanceMeters);

      // Find nearest station for each transport type
      const findNearest = (type: string): TransportProximity | null => {
        return proximityData.find(station => station.transportType === type) || null;
      };

      const analysis: LocationAnalysis = {
        nearestMRT: findNearest('MRT'),
        nearestLRT: findNearest('LRT'),
        nearestKTM: findNearest('KTM'),
        nearestMonorail: findNearest('Monorail'),
        nearestBRT: findNearest('BRT'),
        allNearbyStations: proximityData.slice(0, 10) // Top 10 nearest stations
      };

      console.log(`✅ Location analysis complete. Found ${proximityData.length} nearby stations`);
      
      if (analysis.nearestMRT) {
        console.log(`🚇 Nearest MRT: ${analysis.nearestMRT.stationName} (${analysis.nearestMRT.distanceMeters}m)`);
      }
      if (analysis.nearestLRT) {
        console.log(`🚊 Nearest LRT: ${analysis.nearestLRT.stationName} (${analysis.nearestLRT.distanceMeters}m)`);
      }

      return analysis;

    } catch (error) {
      console.error("Error analyzing location proximity:", error);
      
      // Return empty analysis on error
      return {
        nearestMRT: null,
        nearestLRT: null,
        nearestKTM: null,
        nearestMonorail: null,
        nearestBRT: null,
        allNearbyStations: []
      };
    }
  }

  // Generate transport distance text for property listings
  generateTransportSummary(analysis: LocationAnalysis): {
    distanceToLRT?: string;
    distanceToMRT?: string;
    distanceToKTM?: string;
    distanceToMonorail?: string;
    nearestTransport?: string;
  } {
    const summary: any = {};

    if (analysis.nearestMRT) {
      summary.distanceToMRT = `${analysis.nearestMRT.walkTimeMinutes} mins walk to ${analysis.nearestMRT.stationName}`;
    }

    if (analysis.nearestLRT) {
      summary.distanceToLRT = `${analysis.nearestLRT.walkTimeMinutes} mins walk to ${analysis.nearestLRT.stationName}`;
    }

    if (analysis.nearestKTM) {
      summary.distanceToKTM = `${analysis.nearestKTM.walkTimeMinutes} mins walk to ${analysis.nearestKTM.stationName}`;
    }

    if (analysis.nearestMonorail) {
      summary.distanceToMonorail = `${analysis.nearestMonorail.walkTimeMinutes} mins walk to ${analysis.nearestMonorail.stationName}`;
    }

    // Find the nearest overall transport
    if (analysis.allNearbyStations.length > 0) {
      const nearest = analysis.allNearbyStations[0];
      summary.nearestTransport = `${nearest.walkTimeMinutes} mins walk to ${nearest.stationName} ${nearest.transportType}`;
    }

    return summary;
  }

  // Check if property is "near" transport for search purposes
  isNearTransport(analysis: LocationAnalysis, transportTypes: string[], maxWalkMinutes: number = 15): boolean {
    const relevantStations = analysis.allNearbyStations.filter(station => 
      transportTypes.includes(station.transportType) && 
      station.walkTimeMinutes <= maxWalkMinutes
    );
    
    return relevantStations.length > 0;
  }

  // Get transport tags for property categorization
  getTransportTags(analysis: LocationAnalysis): string[] {
    const tags: string[] = [];

    if (analysis.nearestMRT && analysis.nearestMRT.walkTimeMinutes <= 10) {
      tags.push(`MRT-${analysis.nearestMRT.stationName}`);
    }

    if (analysis.nearestLRT && analysis.nearestLRT.walkTimeMinutes <= 10) {
      tags.push(`LRT-${analysis.nearestLRT.stationName}`);
    }

    if (analysis.nearestKTM && analysis.nearestKTM.walkTimeMinutes <= 15) {
      tags.push(`KTM-${analysis.nearestKTM.stationName}`);
    }

    if (analysis.nearestMonorail && analysis.nearestMonorail.walkTimeMinutes <= 10) {
      tags.push(`Monorail-${analysis.nearestMonorail.stationName}`);
    }

    return tags;
  }
}

export const locationAnalysisService = new LocationAnalysisService();