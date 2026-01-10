#!/usr/bin/env tsx

import { extractAndStoreGeoJSONData } from './server/extractGeoJSON';

async function main() {
  console.log('🚀 Starting GeoJSON data extraction process...');
  
  try {
    const result = await extractAndStoreGeoJSONData();
    
    console.log('\n🎉 Extraction process completed successfully!');
    console.log(`✅ Locations inserted: ${result.inserted}`);
    console.log(`⏭️  Duplicates skipped: ${result.duplicates}`);
    console.log(`❌ Invalid entries skipped: ${result.invalid}`);
    console.log(`📊 Total processed: ${result.total}`);
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}