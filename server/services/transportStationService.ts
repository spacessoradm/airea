/**
 * Transport Station Service for MRT/LRT/KTM station-based property searches
 * Handles geospatial queries and transportation proximity calculations
 */

import { db } from "../db";
import { transportStations, properties } from "@shared/schema";
import { sql, and, or, ilike, desc, asc } from "drizzle-orm";

export interface NearbyStationResult {
  station: {
    id: string;
    stationName: string;
    stationCode: string;
    lineName: string;
    transportType: string;
    latitude: number;
    longitude: number;
    facilities?: string[];
    nearbyLandmarks?: string[];
  };
  distanceMeters: number;
  walkingTimeMinutes: number;
}

export interface PropertyWithNearbyStations {
  property: any;
  nearbyStations: NearbyStationResult[];
  closestStation: NearbyStationResult;
}

class TransportStationService {
  /**
   * Find nearest MRT/LRT station to a property (for display on property cards)
   */
  async findNearestStation(
    latitude: number | string | null | undefined,
    longitude: number | string | null | undefined
  ): Promise<{ name: string; distance: number } | null> {
    try {
      // Validate coordinates
      if (!latitude || !longitude) return null;
      
      const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
      const lon = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
      
      if (isNaN(lat) || isNaN(lon)) return null;

      // Find nearest MRT or LRT station only (within 5km)
      const nearestStation = await db
        .select({
          stationName: transportStations.stationName,
          transportType: transportStations.transportType,
          distanceMeters: sql<number>`ST_DistanceSphere(
            ST_MakePoint(${lon}, ${lat}),
            ST_MakePoint(${transportStations.longitude}, ${transportStations.latitude})
          )`,
        })
        .from(transportStations)
        .where(
          or(
            sql`${transportStations.transportType} = 'MRT'`,
            sql`${transportStations.transportType} = 'LRT'`
          )!
        )
        .orderBy(sql`ST_DistanceSphere(
          ST_MakePoint(${lon}, ${lat}),
          ST_MakePoint(${transportStations.longitude}, ${transportStations.latitude})
        )`)
        .limit(1);

      if (nearestStation.length === 0) return null;

      const station = nearestStation[0];
      const distanceKm = station.distanceMeters / 1000;

      // Only show if within 5km
      if (distanceKm > 5) return null;

      return {
        name: `${station.stationName} ${station.transportType}`,
        distance: parseFloat(distanceKm.toFixed(2))
      };
    } catch (error) {
      console.error("Error finding nearest station:", error);
      return null;
    }
  }

  /**
   * Find all stations within a specified distance of coordinates
   */
  async findStationsNearLocation(
    latitude: number,
    longitude: number,
    radiusMeters: number = 1000,
    transportTypes?: string[]
  ): Promise<NearbyStationResult[]> {
    try {
      const whereConditions = [
        sql`ST_DWithin(
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326),
          geometry,
          ${radiusMeters / 111000}
        )`
      ];

      if (transportTypes && transportTypes.length > 0) {
        whereConditions.push(
          or(...transportTypes.map(type => 
            sql`${transportStations.transportType} = ${type}`
          ))!
        );
      }

      const stations = await db
        .select({
          id: transportStations.id,
          stationName: transportStations.stationName,
          stationCode: transportStations.stationCode,
          lineName: transportStations.lineName,
          transportType: transportStations.transportType,
          latitude: transportStations.latitude,
          longitude: transportStations.longitude,
          facilities: transportStations.facilities,
          nearbyLandmarks: transportStations.nearbyLandmarks,
          distanceMeters: sql<number>`ST_DistanceSphere(
            ST_MakePoint(${longitude}, ${latitude}),
            ST_MakePoint(${transportStations.longitude}, ${transportStations.latitude})
          )`,
        })
        .from(transportStations)
        .where(and(...whereConditions))
        .orderBy(sql`ST_DistanceSphere(
          ST_MakePoint(${longitude}, ${latitude}),
          ST_MakePoint(${transportStations.longitude}, ${transportStations.latitude})
        )`);

      return stations.map(station => ({
        station: {
          id: station.id,
          stationName: station.stationName,
          stationCode: station.stationCode,
          lineName: station.lineName,
          transportType: station.transportType,
          latitude: station.latitude,
          longitude: station.longitude,
          facilities: station.facilities || [],
          nearbyLandmarks: station.nearbyLandmarks || [],
        },
        distanceMeters: Math.round(station.distanceMeters),
        walkingTimeMinutes: Math.ceil(station.distanceMeters / 83), // ~5km/h walking speed
      }));
    } catch (error) {
      console.error("Error finding stations near location:", error);
      return [];
    }
  }

  /**
   * Find properties near MRT/LRT stations
   */
  async findPropertiesNearStations(
    stationTypes: string[],
    maxDistanceMeters: number = 15000,
    propertyFilters?: {
      bedrooms?: number;
      propertyType?: string[];
      priceMin?: number;
      priceMax?: number;
      listingType?: string;
    }
  ): Promise<PropertyWithNearbyStations[]> {
    try {
      // First get all stations of the specified types
      const stationsQuery = db
        .select({
          id: transportStations.id,
          stationName: transportStations.stationName,
          stationCode: transportStations.stationCode,
          lineName: transportStations.lineName,
          transportType: transportStations.transportType,
          latitude: transportStations.latitude,
          longitude: transportStations.longitude,
          facilities: transportStations.facilities,
          nearbyLandmarks: transportStations.nearbyLandmarks,
        })
        .from(transportStations)
        .where(
          or(...stationTypes.map(type => 
            sql`${transportStations.transportType} = ${type}`
          ))!
        );

      const stations = await stationsQuery;

      if (stations.length === 0) {
        return [];
      }

      // Build property filter conditions
      const propertyWhereConditions = [];
      
      if (propertyFilters?.bedrooms) {
        propertyWhereConditions.push(sql`${properties.bedrooms} = ${propertyFilters.bedrooms}`);
      }
      
      if (propertyFilters?.propertyType && propertyFilters.propertyType.length > 0) {
        propertyWhereConditions.push(
          or(...propertyFilters.propertyType.map(type => 
            sql`${properties.propertyType} = ${type}`
          ))!
        );
      }
      
      if (propertyFilters?.priceMin) {
        propertyWhereConditions.push(sql`CAST(${properties.price} AS INTEGER) >= ${propertyFilters.priceMin}`);
      }
      
      if (propertyFilters?.priceMax) {
        propertyWhereConditions.push(sql`CAST(${properties.price} AS INTEGER) <= ${propertyFilters.priceMax}`);
      }
      
      if (propertyFilters?.listingType) {
        propertyWhereConditions.push(sql`${properties.listingType} = ${propertyFilters.listingType}`);
      }

      // Get properties with their distances to all stations
      const propertiesWithStations = await db
        .select({
          property: {
            id: properties.id,
            title: properties.title,
            price: properties.price,
            bedrooms: properties.bedrooms,
            bathrooms: properties.bathrooms,
            propertyType: properties.propertyType,
            listingType: properties.listingType,
            address: properties.address,
            city: properties.city,
            state: properties.state,
            latitude: properties.latitude,
            longitude: properties.longitude,
            images: properties.images,
            amenities: properties.amenities,
          },
          stationId: transportStations.id,
          stationName: transportStations.stationName,
          stationCode: transportStations.stationCode,
          lineName: transportStations.lineName,
          transportType: transportStations.transportType,
          stationLatitude: transportStations.latitude,
          stationLongitude: transportStations.longitude,
          stationFacilities: transportStations.facilities,
          stationLandmarks: transportStations.nearbyLandmarks,
          distanceMeters: sql<number>`ST_DistanceSphere(
            ST_MakePoint(${properties.longitude}, ${properties.latitude}),
            ST_MakePoint(${transportStations.longitude}, ${transportStations.latitude})
          )`,
        })
        .from(properties)
        .leftJoin(
          transportStations,
          sql`ST_DWithin(
            ST_SetSRID(ST_MakePoint(${properties.longitude}, ${properties.latitude}), 4326),
            ${transportStations.geometry},
            ${maxDistanceMeters / 111000}
          ) AND ${or(...stationTypes.map(type => 
            sql`${transportStations.transportType} = ${type}`
          ))!}`
        )
        .where(
          and(
            sql`${properties.latitude} IS NOT NULL`,
            sql`${properties.longitude} IS NOT NULL`,
            sql`${transportStations.id} IS NOT NULL`, // Only properties with nearby stations
            ...propertyWhereConditions
          )
        )
        .orderBy(sql`ST_DistanceSphere(
          ST_MakePoint(${properties.longitude}, ${properties.latitude}),
          ST_MakePoint(${transportStations.longitude}, ${transportStations.latitude})
        )`);

      // Group by property and collect nearby stations
      const propertyMap = new Map<string, PropertyWithNearbyStations>();

      propertiesWithStations.forEach(row => {
        if (!propertyMap.has(row.property.id)) {
          propertyMap.set(row.property.id, {
            property: row.property,
            nearbyStations: [],
            closestStation: {} as NearbyStationResult,
          });
        }

        const stationResult: NearbyStationResult = {
          station: {
            id: row.stationId!,
            stationName: row.stationName!,
            stationCode: row.stationCode!,
            lineName: row.lineName!,
            transportType: row.transportType!,
            latitude: row.stationLatitude!,
            longitude: row.stationLongitude!,
            facilities: row.stationFacilities || [],
            nearbyLandmarks: row.stationLandmarks || [],
          },
          distanceMeters: Math.round(row.distanceMeters),
          walkingTimeMinutes: Math.ceil(row.distanceMeters / 83),
        };

        const propertyData = propertyMap.get(row.property.id)!;
        propertyData.nearbyStations.push(stationResult);

        // Set closest station (first one due to ORDER BY)
        if (!propertyData.closestStation.station) {
          propertyData.closestStation = stationResult;
        }
      });

      return Array.from(propertyMap.values());
    } catch (error) {
      console.error("Error finding properties near stations:", error);
      return [];
    }
  }

  /**
   * Search stations by name or station code
   */
  async searchStations(
    searchQuery: string,
    transportTypes?: string[],
    limit: number = 20
  ): Promise<typeof transportStations.$inferSelect[]> {
    try {
      const whereConditions = [
        or(
          ilike(transportStations.stationName, `%${searchQuery}%`),
          ilike(transportStations.stationCode, `%${searchQuery}%`),
          ilike(transportStations.lineName, `%${searchQuery}%`),
          sql`array_to_string(${transportStations.nearbyLandmarks}, ' ') ILIKE '%${searchQuery}%'`
        )!
      ];

      if (transportTypes && transportTypes.length > 0) {
        whereConditions.push(
          or(...transportTypes.map(type => 
            sql`${transportStations.transportType} = ${type}`
          ))!
        );
      }

      const stations = await db
        .select()
        .from(transportStations)
        .where(and(...whereConditions))
        .orderBy(asc(transportStations.stationName))
        .limit(limit);

      return stations;
    } catch (error) {
      console.error("Error searching stations:", error);
      return [];
    }
  }

  /**
   * Get all available transport types and lines
   */
  async getTransportNetworkInfo() {
    try {
      const networkInfo = await db
        .select({
          transportType: transportStations.transportType,
          lineName: transportStations.lineName,
          stationCount: sql<number>`COUNT(*)::int`,
        })
        .from(transportStations)
        .groupBy(transportStations.transportType, transportStations.lineName)
        .orderBy(transportStations.transportType, transportStations.lineName);

      const summary = networkInfo.reduce((acc, info) => {
        if (!acc[info.transportType]) {
          acc[info.transportType] = { lines: [], totalStations: 0 };
        }
        acc[info.transportType].lines.push({
          lineName: info.lineName,
          stationCount: info.stationCount,
        });
        acc[info.transportType].totalStations += info.stationCount;
        return acc;
      }, {} as Record<string, { lines: { lineName: string; stationCount: number }[]; totalStations: number }>);

      return {
        networkInfo,
        summary,
        totalStations: networkInfo.reduce((sum, info) => sum + info.stationCount, 0),
      };
    } catch (error) {
      console.error("Error getting transport network info:", error);
      return { networkInfo: [], summary: {}, totalStations: 0 };
    }
  }

  /**
   * Get stations along a specific line
   */
  async getStationsByLine(lineName: string) {
    try {
      const stations = await db
        .select()
        .from(transportStations)
        .where(sql`${transportStations.lineName} = ${lineName}`)
        .orderBy(transportStations.stationCode);

      return stations;
    } catch (error) {
      console.error("Error getting stations by line:", error);
      return [];
    }
  }

  /**
   * Enhanced property search with transport filtering
   */
  async enhancedPropertySearchWithTransport(filters: {
    nearTransport?: {
      types: string[];
      maxWalkingMinutes: number;
    };
    bedrooms?: number;
    propertyType?: string[];
    priceRange?: { min: number; max: number };
    listingType?: string;
    limit?: number;
  }) {
    if (!filters.nearTransport) {
      return [];
    }

    const maxDistanceMeters = filters.nearTransport.maxWalkingMinutes * 83; // ~5km/h walking speed

    const results = await this.findPropertiesNearStations(
      filters.nearTransport.types,
      maxDistanceMeters,
      {
        bedrooms: filters.bedrooms,
        propertyType: filters.propertyType,
        priceMin: filters.priceRange?.min,
        priceMax: filters.priceRange?.max,
        listingType: filters.listingType,
      }
    );

    // Apply additional filtering and sorting
    return results
      .filter(result => 
        result.closestStation.walkingTimeMinutes <= filters.nearTransport!.maxWalkingMinutes
      )
      .sort((a, b) => 
        a.closestStation.distanceMeters - b.closestStation.distanceMeters
      )
      .slice(0, filters.limit || 50);
  }
}

export const transportStationService = new TransportStationService();