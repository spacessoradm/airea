import fs from 'fs';
import path from 'path';
import { db } from './db';
import { locations } from '@shared/schema';
import { sql } from 'drizzle-orm';

interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    '@id': string;
    name?: string;
    building?: string;
    'addr:city'?: string;
    'addr:state'?: string;
    'addr:postcode'?: string;
    [key: string]: any;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  id: string;
}

interface GeoJSONData {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

interface NominatimResponse {
  display_name: string;
  address: {
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    suburb?: string;
    town?: string;
  };
}

// Rate limiting for Nominatim API (max 1 request per second)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function reverseGeocode(lat: number, lng: number): Promise<{ city?: string; state?: string; postcode?: string } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`,
      {
        headers: {
          'User-Agent': 'Airea Property Search Platform (contact@airea.my)'
        }
      }
    );
    
    if (!response.ok) {
      console.warn(`Nominatim API error for ${lat},${lng}: ${response.status}`);
      return null;
    }
    
    const data: NominatimResponse = await response.json();
    
    return {
      city: data.address?.city || data.address?.town || data.address?.suburb,
      state: data.address?.state,
      postcode: data.address?.postcode
    };
  } catch (error) {
    console.warn(`Failed to reverse geocode ${lat},${lng}:`, error);
    return null;
  }
}

function isValidMalaysianCoordinates(lat: number, lng: number): boolean {
  // Malaysia bounding box: roughly 1°N to 7°N, 99°E to 119°E
  return lat >= 1 && lat <= 7 && lng >= 99 && lng <= 119;
}

function extractNameFromProperties(properties: any): string | null {
  // Extract meaningful names from various property fields
  if (properties.name) return properties.name;
  if (properties['addr:housenumber'] && properties['addr:street']) {
    return `${properties['addr:housenumber']} ${properties['addr:street']}`;
  }
  if (properties['addr:street']) return properties['addr:street'];
  if (properties.building && properties.building !== 'yes') return properties.building;
  return null;
}

export async function extractAndStoreGeoJSONData() {
  console.log('🗺️  Starting GeoJSON data extraction and storage...');
  
  // Enable PostGIS extension
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis;`);
    console.log('✅ PostGIS extension enabled');
  } catch (error) {
    console.warn('PostGIS extension might already be enabled:', error);
  }

  // Read GeoJSON file
  const geoJsonPath = path.join(process.cwd(), 'attached_assets', 'export_1755074557848.geojson');
  
  if (!fs.existsSync(geoJsonPath)) {
    throw new Error(`GeoJSON file not found at: ${geoJsonPath}`);
  }

  console.log('📖 Reading GeoJSON file...');
  const geoJsonData: GeoJSONData = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));
  
  console.log(`📊 Found ${geoJsonData.features.length} features in GeoJSON`);

  // Process features in batches
  const batchSize = 50;
  const processedData: any[] = [];
  let successfulInserts = 0;
  let skippedDuplicates = 0;
  let skippedInvalid = 0;

  for (let i = 0; i < geoJsonData.features.length; i += batchSize) {
    const batch = geoJsonData.features.slice(i, i + batchSize);
    console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(geoJsonData.features.length/batchSize)}...`);

    for (const feature of batch) {
      // Validate feature structure
      if (!feature.geometry || !feature.geometry.coordinates || !feature.properties) {
        skippedInvalid++;
        continue;
      }

      const [lng, lat] = feature.geometry.coordinates;
      
      // Validate coordinates are in Malaysia
      if (!isValidMalaysianCoordinates(lat, lng)) {
        skippedInvalid++;
        continue;
      }

      // Extract meaningful name
      const name = extractNameFromProperties(feature.properties);
      if (!name || name.length < 3) {
        skippedInvalid++;
        continue;
      }

      // Check for existing OSM ID to avoid duplicates
      const osmId = feature.properties['@id'] || feature.id;
      
      try {
        // Check if already exists
        const existing = await db.select().from(locations).where(sql`osm_id = ${osmId}`).limit(1);
        if (existing.length > 0) {
          skippedDuplicates++;
          continue;
        }

        // Reverse geocode to get city/state (with rate limiting)
        await delay(1000); // 1 second delay between requests
        const geocodedData = await reverseGeocode(lat, lng);

        const locationData = {
          name: name.trim(),
          latitude: lat,
          longitude: lng,
          city: feature.properties['addr:city'] || geocodedData?.city || null,
          state: feature.properties['addr:state'] || geocodedData?.state || null,
          postcode: feature.properties['addr:postcode'] || geocodedData?.postcode || null,
          country: 'Malaysia',
          buildingType: feature.properties.building || null,
          osmId: osmId,
        };

        // Insert into database with PostGIS geometry
        await db.insert(locations).values({
          ...locationData,
          geometry: sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`,
        });

        processedData.push(locationData);
        successfulInserts++;

        if (successfulInserts % 10 === 0) {
          console.log(`✅ Processed ${successfulInserts} locations...`);
        }

      } catch (error) {
        console.warn(`Failed to process feature ${osmId}:`, error);
        skippedInvalid++;
      }
    }
  }

  console.log('\n🎉 GeoJSON extraction completed!');
  console.log(`✅ Successfully inserted: ${successfulInserts} locations`);
  console.log(`⏭️  Skipped duplicates: ${skippedDuplicates}`);
  console.log(`❌ Skipped invalid: ${skippedInvalid}`);
  console.log(`📍 Total processed: ${successfulInserts + skippedDuplicates + skippedInvalid}`);

  return {
    inserted: successfulInserts,
    duplicates: skippedDuplicates,
    invalid: skippedInvalid,
    total: successfulInserts + skippedDuplicates + skippedInvalid
  };
}

// Run extraction if called directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  extractAndStoreGeoJSONData()
    .then((result) => {
      console.log('✅ Extraction completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Extraction failed:', error);
      process.exit(1);
    });
}