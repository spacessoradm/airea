import { openRouteService } from './openrouteService';
import { db } from '../db';
import { properties } from '@shared/schema';
import { eq, isNull, or } from 'drizzle-orm';

export class BatchGeocodingService {
  private batchSize = 10; // Process in small batches to avoid rate limits
  private delayBetweenBatches = 1000; // 1 second delay between batches
  
  /**
   * Get all properties that don't have coordinates
   */
  async getPropertiesWithoutCoordinates(): Promise<Array<{
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
  }>> {
    const result = await db
      .select({
        id: properties.id,
        title: properties.title,
        address: properties.address,
        city: properties.city,
        state: properties.state,
      })
      .from(properties)
      .where(
        or(
          isNull(properties.latitude),
          isNull(properties.longitude)
        )
      );
    
    return result;
  }

  /**
   * Geocode a single property using OpenRouteService
   */
  async geocodeProperty(property: {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
  }): Promise<{ lat: number; lng: number } | null> {
    
    // Create search query from address components
    const searchParts = [
      property.address,
      property.city,
      property.state,
      'Malaysia'
    ].filter(part => part && part.trim() !== '');
    
    const searchQuery = searchParts.join(', ');
    
    console.log(`🔍 Geocoding: "${property.title}" with query: "${searchQuery}"`);
    
    try {
      // Use OpenRouteService searchPlaces method
      const results = await openRouteService.searchPlaces(searchQuery);
      
      if (results && results.length > 0) {
        const bestResult = results[0];
        console.log(`✅ Found coordinates for "${property.title}": ${bestResult.coordinates.lat}, ${bestResult.coordinates.lng}`);
        
        return {
          lat: bestResult.coordinates.lat,
          lng: bestResult.coordinates.lng
        };
      }
      
      // Try with just city and state if full address fails
      if (searchParts.length > 3) {
        const cityQuery = `${property.city}, ${property.state}, Malaysia`;
        console.log(`🔄 Retry with city only: "${cityQuery}"`);
        
        const cityResults = await openRouteService.searchPlaces(cityQuery);
        if (cityResults && cityResults.length > 0) {
          const cityResult = cityResults[0];
          console.log(`✅ Found city coordinates for "${property.title}": ${cityResult.coordinates.lat}, ${cityResult.coordinates.lng}`);
          
          return {
            lat: cityResult.coordinates.lat,
            lng: cityResult.coordinates.lng
          };
        }
      }
      
      console.log(`❌ No coordinates found for "${property.title}"`);
      return null;
      
    } catch (error) {
      console.error(`❌ Geocoding error for "${property.title}":`, error);
      return null;
    }
  }

  /**
   * Update property coordinates in database
   */
  async updatePropertyCoordinates(propertyId: string, lat: number, lng: number): Promise<void> {
    try {
      await db
        .update(properties)
        .set({
          latitude: lat.toString(),
          longitude: lng.toString(),
          updatedAt: new Date()
        })
        .where(eq(properties.id, propertyId));
      
      console.log(`💾 Updated coordinates for property ${propertyId}`);
    } catch (error) {
      console.error(`❌ Failed to update coordinates for property ${propertyId}:`, error);
    }
  }

  /**
   * Process all properties without coordinates in batches
   */
  async geocodeAllProperties(): Promise<{
    total: number;
    processed: number;
    successful: number;
    failed: number;
  }> {
    console.log('🚀 Starting batch geocoding process...');
    
    const propertiesToGeocode = await this.getPropertiesWithoutCoordinates();
    const total = propertiesToGeocode.length;
    
    console.log(`📊 Found ${total} properties without coordinates`);
    
    if (total === 0) {
      return { total: 0, processed: 0, successful: 0, failed: 0 };
    }
    
    let processed = 0;
    let successful = 0;
    let failed = 0;
    
    // Process in batches
    for (let i = 0; i < propertiesToGeocode.length; i += this.batchSize) {
      const batch = propertiesToGeocode.slice(i, i + this.batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(propertiesToGeocode.length / this.batchSize)} (${batch.length} properties)`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (property) => {
        const coordinates = await this.geocodeProperty(property);
        processed++;
        
        if (coordinates) {
          await this.updatePropertyCoordinates(property.id, coordinates.lat, coordinates.lng);
          successful++;
          return true;
        } else {
          failed++;
          return false;
        }
      });
      
      await Promise.all(batchPromises);
      
      // Progress reporting
      const progress = Math.round((processed / total) * 100);
      console.log(`📈 Progress: ${processed}/${total} (${progress}%) - Success: ${successful}, Failed: ${failed}`);
      
      // Delay between batches to respect rate limits
      if (i + this.batchSize < propertiesToGeocode.length) {
        console.log(`⏳ Waiting ${this.delayBetweenBatches}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
      }
    }
    
    const result = { total, processed, successful, failed };
    console.log('✅ Batch geocoding completed!', result);
    
    return result;
  }

  /**
   * Geocode specific properties by IDs (useful for testing)
   */
  async geocodeSpecificProperties(propertyIds: string[]): Promise<{
    total: number;
    successful: number;
    failed: number;
  }> {
    console.log(`🎯 Geocoding specific properties: ${propertyIds.join(', ')}`);
    
    const propertiesData = await db
      .select({
        id: properties.id,
        title: properties.title,
        address: properties.address,
        city: properties.city,
        state: properties.state,
      })
      .from(properties)
      .where(
        // Create OR conditions for each property ID
        propertyIds.length === 1 
          ? eq(properties.id, propertyIds[0])
          : or(...propertyIds.map(id => eq(properties.id, id)))
      );
    
    let successful = 0;
    let failed = 0;
    
    for (const property of propertiesData) {
      const coordinates = await this.geocodeProperty(property);
      
      if (coordinates) {
        await this.updatePropertyCoordinates(property.id, coordinates.lat, coordinates.lng);
        successful++;
      } else {
        failed++;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return { total: propertiesData.length, successful, failed };
  }
}

export const batchGeocodingService = new BatchGeocodingService();