import { db } from "../db";
import { states, cities, areas, buildings } from "@shared/schema";
import { eq, like, or, and, sql } from "drizzle-orm";

export interface LocationSearchResult {
  id: string;
  name: string;
  type: 'state' | 'city' | 'area' | 'building';
  fullPath: string;
  latitude?: string;
  longitude?: string;
  postalCode?: string;
  parentInfo?: {
    city?: string;
    state?: string;
    area?: string;
  };
}

export interface LocationFilterOptions {
  stateId?: string;
  cityId?: string;
  areaId?: string;
  buildingType?: string;
  searchTerm?: string;
  limit?: number;
}

export class LocationService {
  // Search across all location types with autocomplete
  async searchLocations(query: string, limit: number = 20): Promise<LocationSearchResult[]> {
    const searchPattern = `%${query.toLowerCase()}%`;
    const results: LocationSearchResult[] = [];

    try {
      // Search states
      const stateResults = await db
        .select()
        .from(states)
        .where(like(sql`LOWER(${states.name})`, searchPattern))
        .limit(Math.ceil(limit / 4));

      for (const state of stateResults) {
        results.push({
          id: state.id,
          name: state.name,
          type: 'state',
          fullPath: state.name,
        });
      }

      // Search cities with state info
      const cityResults = await db
        .select({
          city: cities,
          state: states
        })
        .from(cities)
        .leftJoin(states, eq(cities.stateId, states.id))
        .where(like(sql`LOWER(${cities.name})`, searchPattern))
        .limit(Math.ceil(limit / 4));

      for (const { city, state } of cityResults) {
        results.push({
          id: city.id,
          name: city.name,
          type: 'city',
          fullPath: `${city.name}, ${state?.name || ''}`,
          latitude: city.latitude,
          longitude: city.longitude,
          parentInfo: {
            state: state?.name
          }
        });
      }

      // Search areas with city and state info
      const areaResults = await db
        .select({
          area: areas,
          city: cities,
          state: states
        })
        .from(areas)
        .leftJoin(cities, eq(areas.cityId, cities.id))
        .leftJoin(states, eq(cities.stateId, states.id))
        .where(like(sql`LOWER(${areas.name})`, searchPattern))
        .limit(Math.ceil(limit / 4));

      for (const { area, city, state } of areaResults) {
        results.push({
          id: area.id,
          name: area.name,
          type: 'area',
          fullPath: `${area.name}, ${city?.name || ''}, ${state?.name || ''}`,
          latitude: area.latitude,
          longitude: area.longitude,
          postalCode: area.postalCode,
          parentInfo: {
            city: city?.name,
            state: state?.name
          }
        });
      }

      // Search buildings with full hierarchy
      const buildingResults = await db
        .select({
          building: buildings,
          area: areas,
          city: cities,
          state: states
        })
        .from(buildings)
        .leftJoin(areas, eq(buildings.areaId, areas.id))
        .leftJoin(cities, eq(areas.cityId, cities.id))
        .leftJoin(states, eq(cities.stateId, states.id))
        .where(like(sql`LOWER(${buildings.name})`, searchPattern))
        .limit(Math.ceil(limit / 4));

      for (const { building, area, city, state } of buildingResults) {
        results.push({
          id: building.id,
          name: building.name,
          type: 'building',
          fullPath: `${building.name}, ${area?.name || ''}, ${city?.name || ''}, ${state?.name || ''}`,
          latitude: building.latitude,
          longitude: building.longitude,
          parentInfo: {
            area: area?.name,
            city: city?.name,
            state: state?.name
          }
        });
      }

      // Sort by relevance (exact matches first, then contains)
      return results
        .sort((a, b) => {
          const aExact = a.name.toLowerCase() === query.toLowerCase() ? 1 : 0;
          const bExact = b.name.toLowerCase() === query.toLowerCase() ? 1 : 0;
          const aStarts = a.name.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
          const bStarts = b.name.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
          
          return (bExact - aExact) || (bStarts - aStarts);
        })
        .slice(0, limit);

    } catch (error) {
      console.error("Error searching locations:", error);
      return [];
    }
  }

  // Get all states
  async getStates() {
    return await db.select().from(states).orderBy(states.name);
  }

  // Get cities by state
  async getCitiesByState(stateId: string) {
    return await db
      .select()
      .from(cities)
      .where(eq(cities.stateId, stateId))
      .orderBy(cities.name);
  }

  // Get areas by city
  async getAreasByCity(cityId: string) {
    return await db
      .select()
      .from(areas)
      .where(eq(areas.cityId, cityId))
      .orderBy(areas.name);
  }

  // Get buildings by area
  async getBuildingsByArea(areaId: string) {
    return await db
      .select()
      .from(buildings)
      .where(eq(buildings.areaId, areaId))
      .orderBy(buildings.name);
  }

  // Get building with full location hierarchy
  async getBuildingWithLocation(buildingId: string) {
    const result = await db
      .select({
        building: buildings,
        area: areas,
        city: cities,
        state: states
      })
      .from(buildings)
      .leftJoin(areas, eq(buildings.areaId, areas.id))
      .leftJoin(cities, eq(areas.cityId, cities.id))
      .leftJoin(states, eq(cities.stateId, states.id))
      .where(eq(buildings.id, buildingId))
      .limit(1);

    return result[0] || null;
  }

  // Filter locations with multiple criteria
  async filterLocations(options: LocationFilterOptions) {
    const { stateId, cityId, areaId, buildingType, searchTerm, limit = 50 } = options;
    
    let query = db
      .select({
        building: buildings,
        area: areas,
        city: cities,
        state: states
      })
      .from(buildings)
      .leftJoin(areas, eq(buildings.areaId, areas.id))
      .leftJoin(cities, eq(areas.cityId, cities.id))
      .leftJoin(states, eq(cities.stateId, states.id));

    const conditions = [];

    if (stateId) {
      conditions.push(eq(states.id, stateId));
    }
    if (cityId) {
      conditions.push(eq(cities.id, cityId));
    }
    if (areaId) {
      conditions.push(eq(areas.id, areaId));
    }
    if (buildingType) {
      conditions.push(eq(buildings.buildingType, buildingType));
    }
    if (searchTerm) {
      const searchPattern = `%${searchTerm.toLowerCase()}%`;
      conditions.push(
        or(
          like(sql`LOWER(${buildings.name})`, searchPattern),
          like(sql`LOWER(${areas.name})`, searchPattern),
          like(sql`LOWER(${cities.name})`, searchPattern)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.limit(limit);
  }

  // Get popular locations (most referenced in properties)
  async getPopularLocations(limit: number = 10) {
    // This would typically join with properties table to count references
    // For now, return verified buildings as popular locations
    return await db
      .select({
        building: buildings,
        area: areas,
        city: cities,
        state: states
      })
      .from(buildings)
      .leftJoin(areas, eq(buildings.areaId, areas.id))
      .leftJoin(cities, eq(areas.cityId, cities.id))
      .leftJoin(states, eq(cities.stateId, states.id))
      .where(eq(buildings.isVerified, true))
      .orderBy(buildings.totalUnits)
      .limit(limit);
  }

  // Add new location (with Google Places integration potential)
  async addBuilding(buildingData: {
    name: string;
    areaId: string;
    buildingType?: string;
    developerName?: string;
    streetAddress?: string;
    latitude?: string;
    longitude?: string;
    googlePlaceId?: string;
    amenities?: string[];
  }) {
    const [building] = await db
      .insert(buildings)
      .values({
        ...buildingData,
        isVerified: false, // New buildings need verification
      })
      .returning();

    return building;
  }

  // Geocode address using existing location data
  async geocodeAddress(address: string): Promise<{latitude?: string, longitude?: string} | null> {
    const searchResults = await this.searchLocations(address, 1);
    
    if (searchResults.length > 0 && searchResults[0].latitude && searchResults[0].longitude) {
      return {
        latitude: searchResults[0].latitude,
        longitude: searchResults[0].longitude
      };
    }

    return null;
  }

  // Get location suggestions for property form autocomplete
  async getLocationSuggestions(query: string, type?: 'city' | 'area' | 'building') {
    if (!type) {
      return await this.searchLocations(query, 10);
    }

    const searchPattern = `%${query.toLowerCase()}%`;

    switch (type) {
      case 'city':
        const cityResults = await db
          .select({
            city: cities,
            state: states
          })
          .from(cities)
          .leftJoin(states, eq(cities.stateId, states.id))
          .where(like(sql`LOWER(${cities.name})`, searchPattern))
          .limit(10);

        return cityResults.map(({ city, state }) => ({
          id: city.id,
          name: city.name,
          type: 'city' as const,
          fullPath: `${city.name}, ${state?.name || ''}`,
          latitude: city.latitude,
          longitude: city.longitude,
        }));

      case 'area':
        const areaResults = await db
          .select({
            area: areas,
            city: cities,
            state: states
          })
          .from(areas)
          .leftJoin(cities, eq(areas.cityId, cities.id))
          .leftJoin(states, eq(cities.stateId, states.id))
          .where(like(sql`LOWER(${areas.name})`, searchPattern))
          .limit(10);

        return areaResults.map(({ area, city, state }) => ({
          id: area.id,
          name: area.name,
          type: 'area' as const,
          fullPath: `${area.name}, ${city?.name || ''}, ${state?.name || ''}`,
          latitude: area.latitude,
          longitude: area.longitude,
          postalCode: area.postalCode,
        }));

      case 'building':
        const buildingResults = await db
          .select({
            building: buildings,
            area: areas,
            city: cities,
            state: states
          })
          .from(buildings)
          .leftJoin(areas, eq(buildings.areaId, areas.id))
          .leftJoin(cities, eq(areas.cityId, cities.id))
          .leftJoin(states, eq(cities.stateId, states.id))
          .where(like(sql`LOWER(${buildings.name})`, searchPattern))
          .limit(10);

        return buildingResults.map(({ building, area, city, state }) => ({
          id: building.id,
          name: building.name,
          type: 'building' as const,
          fullPath: `${building.name}, ${area?.name || ''}, ${city?.name || ''}, ${state?.name || ''}`,
          latitude: building.latitude,
          longitude: building.longitude,
        }));

      default:
        return [];
    }
  }
}

export const locationService = new LocationService();