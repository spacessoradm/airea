import { db } from "../db";
import { properties, transportStations } from "@shared/schema";
import { sql, eq, and, or, gte, lte, ilike } from "drizzle-orm";

interface GeospatialSearchFilters {
  bedrooms?: number;
  propertyType?: string;
  listingType?: 'rent' | 'sale';
  minPrice?: number;
  maxPrice?: number;
  minROI?: number;
  maxROI?: number;
  nearTransport?: {
    types: string[]; // ['MRT', 'LRT', 'Monorail', 'KTM', 'BRT']
    maxDistanceMeters: number;
    stationNames?: string[]; // Specific stations if provided
  };
  city?: string;
  state?: string;
  autoFilterResidential?: boolean;
  limit?: number;
  offset?: number;
  originalQuery?: string;
}

interface PropertyWithDistance {
  property: any;
  nearestStation?: {
    name: string;
    code: string;
    type: string;
    line: string;
    distanceMeters: number;
    walkingMinutes: number;
  };
}

export class GeospatialSearchService {
  /**
   * Search properties with geospatial proximity to transport stations
   */
  async searchPropertiesNearTransport(filters: GeospatialSearchFilters): Promise<{
    results: PropertyWithDistance[];
    count: number;
    searchSummary: any;
  }> {
    try {
      const limit = filters.limit || 100; // Increase limit to show more diverse results across stations
      const offset = filters.offset || 0;

      // Build the base query conditions
      const whereConditions = [];

      // Standard property filters
      if (filters.bedrooms) {
        whereConditions.push(eq(properties.bedrooms, filters.bedrooms));
      }
      if (filters.propertyType) {
        whereConditions.push(eq(properties.propertyType, filters.propertyType as any));
      }
      
      // Handle property type filtering based on original query
      const queryLower = filters.originalQuery?.toLowerCase() || '';
      
      if (queryLower.includes('serviced residence') || queryLower.includes('service residence')) {
        whereConditions.push(eq(properties.propertyType, 'service-residence'));
        console.log('🏢 Filtering for service-residence properties only');
      } else if (queryLower.includes('unit') && !queryLower.includes('commercial') && !queryLower.includes('office')) {
        // For "unit" searches, don't add additional property type filtering to show all residential options
        console.log('🏠 Unit search: including all residential property types');
      }
      // No auto-filtering - show all property types (residential, commercial, industrial)
      if (filters.listingType) {
        whereConditions.push(eq(properties.listingType, filters.listingType));
      }
      if (filters.minPrice) {
        // Convert minPrice from thousands to actual amount for comparison
        // AI parser returns prices in thousands (e.g., 2 for RM2k = RM2,000)
        const minPriceInActualAmount = filters.minPrice * 1000;
        whereConditions.push(sql`${properties.price}::numeric >= ${minPriceInActualAmount}`);
      }
      if (filters.maxPrice) {
        // Convert maxPrice from thousands to actual amount for comparison
        // AI parser returns prices in thousands (e.g., 3 for RM3k = RM3,000)
        const maxPriceInActualAmount = filters.maxPrice * 1000;
        whereConditions.push(sql`${properties.price}::numeric <= ${maxPriceInActualAmount}`);
      }
      if (filters.minROI !== undefined) {
        whereConditions.push(sql`${properties.roi}::numeric >= ${filters.minROI}`);
      }
      if (filters.maxROI !== undefined) {
        whereConditions.push(sql`${properties.roi}::numeric <= ${filters.maxROI}`);
      }
      if (filters.city) {
        whereConditions.push(ilike(properties.city, `%${filters.city}%`));
      }
      if (filters.state) {
        whereConditions.push(ilike(properties.state, `%${filters.state}%`));
      }

      // If no transport proximity specified, return regular search
      if (!filters.nearTransport) {
        const regularResults = await db
          .select()
          .from(properties)
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
          .limit(limit)
          .offset(offset);

        return {
          results: regularResults.map(p => ({ property: p })),
          count: regularResults.length,
          searchSummary: { 
            filters: filters,
            transportProximity: false 
          }
        };
      }

      // Geospatial query with transport proximity
      const transportTypes = filters.nearTransport.types;
      // Use the distance from NLP parsing, or default to reasonable Malaysian transport search distance
      // Default set to 1250m (15 mins walking) for consistent walking distance searches
      const maxDistance = filters.nearTransport.maxDistanceMeters || 1250;
      console.log(`🎯 Using search radius: ${maxDistance} meters (${Math.round(maxDistance/1000)}km) for transport search`);
      
      // Build station filter conditions
      const stationWhereConditions = [];
      if (transportTypes.length > 0 && !transportTypes.includes('all')) {
        stationWhereConditions.push(
          or(...transportTypes.map(type => 
            eq(transportStations.transportType, type)
          ))!
        );
      }
      if (filters.nearTransport.stationNames?.length) {
        stationWhereConditions.push(
          or(...filters.nearTransport.stationNames.map(name =>
            ilike(transportStations.stationName, `%${name}%`)
          ))!
        );
        console.log(`🚉 Filtering by specific stations: ${filters.nearTransport.stationNames.join(', ')}`);
      }

      // Enhanced search strategy: Include both spatial proximity AND AI-analyzed properties
      let spatialQuery;
      let aiAnalyzedQuery;
      
      // Strategy 1: Traditional spatial proximity to stations
      if (stationWhereConditions.length > 0) {
        spatialQuery = db
          .select({
            property: properties,
            station: transportStations,
            distance: sql<number>`ST_Distance(
              ST_SetSRID(ST_MakePoint(CAST(${properties.longitude} AS NUMERIC), CAST(${properties.latitude} AS NUMERIC)), 4326),
              ST_SetSRID(ST_MakePoint(${transportStations.longitude}, ${transportStations.latitude}), 4326)
            )`.as('distance')
          })
          .from(properties)
          .leftJoin(
            transportStations,
            sql`ST_DWithin(
              ST_SetSRID(ST_MakePoint(CAST(${properties.longitude} AS NUMERIC), CAST(${properties.latitude} AS NUMERIC)), 4326),
              ST_SetSRID(ST_MakePoint(${transportStations.longitude}, ${transportStations.latitude}), 4326),
              ${maxDistance}
            )`
          )
          .where(
            and(
              ...(whereConditions.length > 0 ? whereConditions : []),
              ...(stationWhereConditions.length > 0 ? stationWhereConditions : []),
              sql`${transportStations.id} IS NOT NULL` // Ensure we found nearby stations
            )
          );
      }

      // Strategy 2: AI-analyzed properties with transport distance fields
      const transportDistanceFields = transportTypes.map(type => {
        switch(type.toUpperCase()) {
          case 'MRT': return 'distance_to_mrt';
          case 'LRT': return 'distance_to_lrt';
          case 'KTM': return 'distance_to_ktm';
          case 'MONORAIL': return 'distance_to_monorail';
          default: return null;
        }
      }).filter(Boolean);

      if (transportDistanceFields.length > 0) {
        let aiAnalyzedWhere = [];
        
        // If specific station names are provided, search only in pre-calculated distance fields
        if (filters.nearTransport.stationNames?.length) {
          const stationConditions = [];
          for (const stationName of filters.nearTransport.stationNames) {
            console.log(`🚉 Searching for station name: "${stationName}" in pre-calculated distance fields only`);
            stationConditions.push(
              // Only search in accurate pre-calculated distance fields
              sql`distance_to_mrt ILIKE ${'%' + stationName + '%'}`,
              sql`distance_to_lrt ILIKE ${'%' + stationName + '%'}`,
              sql`distance_to_ktm ILIKE ${'%' + stationName + '%'}`,
              sql`distance_to_monorail ILIKE ${'%' + stationName + '%'}`
            );
            console.log(`🔍 Added condition for station "${stationName}" in distance fields`);
          }
          aiAnalyzedWhere.push(or(...stationConditions)!);
        } else {
          // General transport type filtering
          const distanceConditions = transportDistanceFields.map(field => 
            sql.raw(`${field} IS NOT NULL AND ${field} != ''`)
          );
          
          const combinedDistanceCondition = distanceConditions.length > 1 ? 
            or(...distanceConditions) : distanceConditions[0];
          aiAnalyzedWhere.push(combinedDistanceCondition);
        }

        aiAnalyzedQuery = db
          .select()
          .from(properties)
          .where(
            and(
              ...(whereConditions.length > 0 ? whereConditions : []),
              ...aiAnalyzedWhere
            )
          );
      }

      // Execute both queries and combine results
      let spatialResults: any[] = [];
      let aiAnalyzedResults: any[] = [];

      if (spatialQuery) {
        spatialResults = await spatialQuery;
        console.log(`📍 Found ${spatialResults.length} properties via spatial proximity`);
      }

      if (aiAnalyzedQuery) {
        aiAnalyzedResults = await aiAnalyzedQuery;
        console.log(`🤖 Found ${aiAnalyzedResults.length} properties via AI analysis`);
      }

      // Combine and process results
      const propertyMap = new Map<string, PropertyWithDistance>();

      // Process spatial results first (traditional proximity)
      for (const result of spatialResults) {
        if (result.property && result.station) {
          const distanceMeters = Math.round(result.distance * 111139); // Convert degrees to meters approximately
          const walkingMinutes = Math.round(distanceMeters / 83.33);
          
          if (distanceMeters <= maxDistance) {
            propertyMap.set(result.property.id, {
              property: result.property,
              nearestStation: {
                name: result.station.stationName,
                code: result.station.stationCode,
                type: result.station.transportType,
                line: result.station.lineName,
                distanceMeters,
                walkingMinutes
              }
            });
          }
        }
      }

      // Process AI-analyzed results (properties with transport distance fields)
      for (const property of aiAnalyzedResults) {
        if (!propertyMap.has(property.id)) {
          // Extract transport info from AI-analyzed fields using correct field names
          let nearestTransportInfo = null;
          
          const transportFieldMappings = {
            'MRT': 'distance_to_mrt',
            'LRT': 'distance_to_lrt', 
            'KTM': 'distance_to_ktm',
            'MONORAIL': 'distance_to_monorail'
          };
          
          for (const type of transportTypes) {
            const fieldName = transportFieldMappings[type.toUpperCase() as keyof typeof transportFieldMappings];
            const distanceText = property[fieldName];
            
            if (distanceText && distanceText.includes('mins walk')) {
              const walkingMinutes = parseInt(distanceText.split(' ')[0]);
              const stationName = distanceText.split(' to ')[1] || 'Unknown Station';
              
              // Only include properties within 22 minutes walking distance
              if (walkingMinutes <= 22) {
                nearestTransportInfo = {
                  name: stationName,
                  code: 'AI-ANALYZED',
                  type: type.toUpperCase(),
                  line: 'AI Analysis',
                  distanceMeters: walkingMinutes * 83.33, // Convert walking minutes to meters
                  walkingMinutes
                };
                break;
              }
            }
          }

          if (nearestTransportInfo) {
            propertyMap.set(property.id, {
              property,
              nearestStation: nearestTransportInfo
            });
          }
        }
      }

      // If no results from enhanced search, fall back to basic spatial search
      if (propertyMap.size === 0) {
        console.log('🔄 No enhanced results found, falling back to basic spatial search');
        
        const baseProperties = await db
          .select()
          .from(properties)
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
          .limit(limit * 2);

        if (baseProperties.length === 0) {
          return {
            results: [],
            count: 0,
            searchSummary: {
              filters: filters,
              transportProximity: true,
              message: "No properties match the criteria"
            }
          };
        }

        const stations = await db
          .select()
          .from(transportStations)
          .where(stationWhereConditions.length > 0 ? and(...stationWhereConditions) : undefined);

        // Calculate distances for fallback
        for (const property of baseProperties) {
          if (!property.latitude || !property.longitude) continue;
          
          let nearestStation = null;
          let minDistance = Infinity;

          for (const station of stations) {
            if (!station.latitude || !station.longitude) continue;
            
            const distanceMeters = GeospatialSearchService.calculateDistance(
              typeof property.latitude === 'string' ? parseFloat(property.latitude) : property.latitude,
              typeof property.longitude === 'string' ? parseFloat(property.longitude) : property.longitude, 
              typeof station.latitude === 'string' ? parseFloat(station.latitude) : station.latitude,
              typeof station.longitude === 'string' ? parseFloat(station.longitude) : station.longitude
            );
            
            // Apply 22-minute walking distance filter (1800 meters)
            if (distanceMeters <= 1800 && distanceMeters < minDistance) {
              minDistance = distanceMeters;
              nearestStation = {
                name: station.stationName,
                code: station.stationCode,
                type: station.transportType,
                line: station.lineName,
                distanceMeters: Math.round(distanceMeters),
                walkingMinutes: Math.round(distanceMeters / 83.33)
              };
            }
          }

          if (nearestStation) {
            propertyMap.set(property.id, {
              property,
              nearestStation
            });
          }
        }
      }

      // For station-specific searches, ensure all relevant properties are included
      const allResults = Array.from(propertyMap.values());
      let finalResults: PropertyWithDistance[] = [];
      
      if (filters.nearTransport.stationNames?.length) {
        console.log(`🎯 Station-specific search: ensuring all matching properties are included`);
        
        // Get AI-analyzed properties (properties that mention the specific station)
        const aiResultIds = new Set(aiAnalyzedResults.map(p => p.id));
        const aiPrioritizedResults = allResults.filter(result => aiResultIds.has(result.property.id));
        
        // Also include spatial results that are close to the station, but prioritize AI results
        const spatialResults = allResults.filter(result => !aiResultIds.has(result.property.id));
        
        if (aiPrioritizedResults.length > 0) {
          console.log(`✅ Found ${aiPrioritizedResults.length} properties specifically mentioning the station`);
          
          // Sort AI results by distance (nearest to farthest)
          const sortedAiResults = aiPrioritizedResults
            .sort((a, b) => {
              const distanceA = a.nearestStation?.distanceMeters || Infinity;
              const distanceB = b.nearestStation?.distanceMeters || Infinity;
              return distanceA - distanceB;
            });
          
          // For station-specific searches, primarily show AI-analyzed results
          // but include some spatial results if we have room
          finalResults = [
            ...sortedAiResults.slice(0, Math.max(limit - 5, sortedAiResults.length)),
            ...spatialResults
              .sort((a, b) => {
                const distanceA = a.nearestStation?.distanceMeters || Infinity;
                const distanceB = b.nearestStation?.distanceMeters || Infinity;
                return distanceA - distanceB;
              })
              .slice(0, Math.max(5, limit - sortedAiResults.length))
          ].slice(0, limit);
          
          console.log(`✅ Returning ${sortedAiResults.length} station-specific + ${finalResults.length - sortedAiResults.length} proximity properties`);
        } else {
          // Fallback to spatial results if no AI matches
          finalResults = spatialResults
            .sort((a, b) => {
              const distanceA = a.nearestStation?.distanceMeters || Infinity;
              const distanceB = b.nearestStation?.distanceMeters || Infinity;
              return distanceA - distanceB;
            })
            .slice(0, limit);
          console.log(`⚠️ No station matches found, using ${finalResults.length} proximity results (sorted by distance)`);
        }
      } else {
        // For general transport searches, ensure diverse station representation
        // Group results by station to ensure we show properties from different stations
        const resultsByStation = new Map<string, PropertyWithDistance[]>();
        
        for (const result of allResults) {
          const stationName = result.nearestStation?.name || 'Unknown';
          if (!resultsByStation.has(stationName)) {
            resultsByStation.set(stationName, []);
          }
          resultsByStation.get(stationName)!.push(result);
        }
        
        // Sort each station's properties by distance
        for (const [station, stationProperties] of Array.from(resultsByStation.entries())) {
          stationProperties.sort((a: PropertyWithDistance, b: PropertyWithDistance) => {
            const distanceA = a.nearestStation?.distanceMeters || Infinity;
            const distanceB = b.nearestStation?.distanceMeters || Infinity;
            return distanceA - distanceB;
          });
        }
        
        // Distribute results across stations (round-robin style)  
        finalResults = []; // Reset to empty array for distribution
        const maxPerStation = Math.max(3, Math.floor(limit / Math.min(resultsByStation.size, 15)));
        const stationArrays = Array.from(resultsByStation.values());
        
        console.log(`🔧 Debug: Found ${resultsByStation.size} stations, maxPerStation: ${maxPerStation}, total properties: ${allResults.length}`);
        
        // First, take top properties from each station
        for (let i = 0; i < maxPerStation && finalResults.length < limit; i++) {
          for (const stationResults of stationArrays) {
            if (stationResults[i] && finalResults.length < limit) {
              finalResults.push(stationResults[i]);
            }
          }
        }
        
        console.log(`🔧 Debug: After station distribution: ${finalResults.length} properties`);
        
        // Fill remaining slots with closest properties overall (within 20min walking distance)
        if (finalResults.length < limit) {
          const remaining = allResults
            .filter(result => {
              // Only include properties within 20 minutes walking distance
              const walkingMinutes = result.nearestStation?.walkingMinutes || result.nearestStation?.distanceMeters / 83.33 || Infinity;
              return walkingMinutes <= 20 && !finalResults.some(fr => fr.property.id === result.property.id);
            })
            .sort((a, b) => {
              const distanceA = a.nearestStation?.distanceMeters || Infinity;
              const distanceB = b.nearestStation?.distanceMeters || Infinity;
              return distanceA - distanceB;
            })
            .slice(0, limit - finalResults.length);
          finalResults.push(...remaining);
          console.log(`🔧 Debug: After filling remaining slots (≤20min): ${finalResults.length} properties`);
        }
        
        // Fallback: if still no results, use top results by distance
        if (finalResults.length === 0) {
          console.log(`⚠️ No distributed results, falling back to distance-sorted results`);
          finalResults = allResults
            .sort((a, b) => {
              const distanceA = a.nearestStation?.distanceMeters || Infinity;
              const distanceB = b.nearestStation?.distanceMeters || Infinity;
              return distanceA - distanceB;
            })
            .slice(0, limit);
        }
        
        console.log(`📍 Distributed transport search results across ${resultsByStation.size} stations - returning ${finalResults.length} properties`);
        console.log(`🚉 Stations included: ${Array.from(resultsByStation.keys()).slice(0, 10).join(', ')}${resultsByStation.size > 10 ? '...' : ''}`);
        console.log(`🔧 Debug: Final results sample:`, finalResults.slice(0, 3).map(r => ({ id: r.property.id, title: r.property.title, station: r.nearestStation?.name })));
      }

      console.log(`🚨 CRITICAL: Returning ${(finalResults || []).length} results to API`);
      console.log(`🚨 First result check:`, finalResults && finalResults[0] ? { id: finalResults[0].property.id, title: finalResults[0].property.title } : 'NO RESULTS');
      
      return {
        results: finalResults || [],
        count: (finalResults || []).length,
        searchSummary: {
          filters: filters,
          transportProximity: true,
          transportTypes: transportTypes,
          maxDistanceMeters: maxDistance,
          maxWalkingMinutes: Math.round(maxDistance / 83.33)
        }
      };

    } catch (error) {
      console.error("Error in geospatial search:", error);
      return {
        results: [],
        count: 0,
        searchSummary: { error: (error as Error).message, filters }
      };
    }
  }

  /**
   * Find all transport stations within radius of a property
   */
  async getStationsNearProperty(
    latitude: number, 
    longitude: number, 
    radiusMeters: number = 15000,
    transportTypes?: string[]
  ) {
    try {
      const stationWhereConditions = [];
      
      if (transportTypes?.length && !transportTypes.includes('all')) {
        stationWhereConditions.push(
          or(...transportTypes.map(type => 
            eq(transportStations.transportType, type)
          ))!
        );
      }

      // Use JavaScript distance calculation for better compatibility
      const allStations = await db
        .select()
        .from(transportStations)
        .where(stationWhereConditions.length > 0 ? and(...stationWhereConditions) : undefined);

      const nearbyStations = allStations
        .map(station => {
          if (!station.latitude || !station.longitude) return null;
          
          const distance = GeospatialSearchService.calculateDistance(
            latitude,
            longitude,
            typeof station.latitude === 'string' ? parseFloat(station.latitude) : station.latitude,
            typeof station.longitude === 'string' ? parseFloat(station.longitude) : station.longitude
          );
          
          if (distance <= radiusMeters) {
            return {
              ...station,
              distanceMeters: Math.round(distance),
              walkingMinutes: Math.round(distance / 83.33)
            };
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => (a?.distanceMeters || 0) - (b?.distanceMeters || 0));

      return nearbyStations;

    } catch (error) {
      console.error("Error finding stations near property:", error);
      return [];
    }
  }

  /**
   * Calculate precise distance between two points using Haversine formula
   */
  static calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const geospatialSearchService = new GeospatialSearchService();