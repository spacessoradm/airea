/**
 * Property Enrichment Service
 * Adds computed fields to properties (nearest station, etc.)
 */

import { transportStationService } from './transportStationService';
import type { Property, PropertyWithEnrichments } from '@shared/schema';

/**
 * Enrich a single property with nearest MRT/LRT station
 */
export async function enrichPropertyWithStation(
  property: Property & { agent?: any }
): Promise<PropertyWithEnrichments & { agent?: any }> {
  try {
    const nearestStation = await transportStationService.findNearestStation(
      property.latitude,
      property.longitude
    );

    return {
      ...property,
      nearestStation
    };
  } catch (error) {
    console.error(`Error enriching property ${property.id} with station:`, error);
    return {
      ...property,
      nearestStation: null
    };
  }
}

/**
 * Enrich multiple properties with nearest MRT/LRT stations
 * Processes in batches for efficiency
 */
export async function enrichPropertiesWithStations<T extends Property>(
  properties: (T & { agent?: any })[]
): Promise<(PropertyWithEnrichments & T & { agent?: any })[]> {
  console.log(`🚉 ENRICHMENT: Starting to enrich ${properties.length} properties with nearest stations`);
  
  try {
    // Process all properties in parallel for speed
    const enrichedProperties = await Promise.all(
      properties.map(async (property) => {
        const nearestStation = await transportStationService.findNearestStation(
          property.latitude,
          property.longitude
        );

        if (nearestStation) {
          console.log(`🚉 Property ${property.id}: ${nearestStation.distance}km from ${nearestStation.name}`);
        }

        return {
          ...property,
          nearestStation
        } as PropertyWithEnrichments & T & { agent?: any };
      })
    );

    const withStations = enrichedProperties.filter(p => p.nearestStation !== null).length;
    console.log(`🚉 ENRICHMENT: Enriched ${withStations}/${properties.length} properties with station data`);
    
    return enrichedProperties;
  } catch (error) {
    console.error('Error enriching properties with stations:', error);
    // Return properties without enrichment on error
    return properties.map(p => ({ ...p, nearestStation: null }));
  }
}
