import { db } from '../db';
import { properties } from '@shared/schema';
import { isNull, or, eq } from 'drizzle-orm';
import { batchGeocodingService } from '../services/batchGeocodingService';

async function batchGeocodeAndCleanup() {
  console.log('🚀 Starting batch geocoding and cleanup process...');
  console.log('📝 Step 1: Geocoding all properties without coordinates');
  
  // Use the existing batch geocoding service
  const result = await batchGeocodingService.geocodeAllProperties();
  
  console.log('\n📊 Geocoding Results:');
  console.log(`   - Total properties processed: ${result.total}`);
  console.log(`   - Successfully geocoded: ${result.successful}`);
  console.log(`   - Failed to geocode: ${result.failed}`);
  
  // Step 2: Delete properties that still don't have coordinates after geocoding
  console.log('\n📝 Step 2: Removing properties without valid coordinates');
  
  const propertiesWithoutCoords = await db
    .select()
    .from(properties)
    .where(or(
      isNull(properties.latitude),
      isNull(properties.longitude)
    ));
  
  console.log(`🗑️  Found ${propertiesWithoutCoords.length} properties to delete`);
  
  if (propertiesWithoutCoords.length > 0) {
    for (const property of propertiesWithoutCoords) {
      await db.delete(properties).where(eq(properties.id, property.id));
      console.log(`   ❌ Deleted: ${property.title} (${property.id})`);
    }
    console.log(`\n✅ Deleted ${propertiesWithoutCoords.length} properties with invalid/missing coordinates`);
  } else {
    console.log('✅ No properties to delete - all have valid coordinates!');
  }
  
  // Final stats
  const remainingProperties = await db.select().from(properties);
  console.log('\n🎉 Cleanup Complete!');
  console.log(`📊 Final Database Stats:`);
  console.log(`   - Total properties remaining: ${remainingProperties.length}`);
  console.log(`   - Properties geocoded: ${result.successful}`);
  console.log(`   - Properties deleted: ${result.failed}`);
  
  process.exit(0);
}

batchGeocodeAndCleanup().catch((error) => {
  console.error('❌ Batch geocoding and cleanup failed:', error);
  process.exit(1);
});
