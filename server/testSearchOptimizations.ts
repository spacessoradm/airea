// Test script to verify search optimizations are working
import { processAISearch } from './services/propertySearch';
import { requestMemo } from './services/requestMemoization';
import { getNLPSearchService, getEnhancedGeocodingService } from './services/serviceSingletons';

async function testSearchOptimizations() {
  console.log('🧪 Starting search optimization tests...\n');

  // Test 1: Request-level memoization
  console.log('🔬 Test 1: Request-level memoization');
  const testQuery = 'condo near KLCC under RM3000';
  
  console.time('First AI parsing call');
  const firstResult = await processAISearch(testQuery, 'rent');
  console.timeEnd('First AI parsing call');
  
  console.log('Request cache stats after first search:');
  console.log(JSON.stringify(requestMemo.getCacheStats(), null, 2));
  
  // Test 2: Service singletons (verify same instances)
  console.log('\n🔬 Test 2: Service singleton verification');
  const nlpService1 = getNLPSearchService();
  const nlpService2 = getNLPSearchService();
  const geocodingService1 = getEnhancedGeocodingService();
  const geocodingService2 = getEnhancedGeocodingService();
  
  console.log(`NLP Service singleton check: ${nlpService1 === nlpService2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Geocoding Service singleton check: ${geocodingService1 === geocodingService2 ? '✅ PASS' : '❌ FAIL'}`);

  // Test 3: Performance comparison
  console.log('\n🔬 Test 3: Performance comparison');
  const queries = [
    'apartment in Mont Kiara under RM2500',
    'house near MRT Surian',
    'office space in KLCC',
    'condo with parking in Bangsar'
  ];
  
  console.log('Testing query performance with optimizations:');
  
  for (const query of queries) {
    console.log(`\n🔍 Query: "${query}"`);
    
    // Clear request cache to simulate fresh search
    requestMemo.clearRequestCache();
    
    console.time(`Search time: ${query}`);
    const result = await processAISearch(query, 'rent');
    console.timeEnd(`Search time: ${query}`);
    
    console.log(`Results: ${result.count} properties found`);
    console.log(`Cache stats after search:`, requestMemo.getCacheStats());
  }

  // Test 4: Location geocoding optimization
  console.log('\n🔬 Test 4: Location geocoding optimization');
  const locationService = getEnhancedGeocodingService();
  const testLocation = 'Mont Kiara';
  
  console.log(`Testing geocoding for: "${testLocation}"`);
  console.time('First geocoding call');
  const coords1 = await locationService.getLocationCoordinates(testLocation);
  console.timeEnd('First geocoding call');
  
  console.time('Second geocoding call (should hit request cache)');
  const coords2 = await locationService.getLocationCoordinates(testLocation);
  console.timeEnd('Second geocoding call (should hit request cache)');
  
  console.log(`Geocoding consistency check: ${JSON.stringify(coords1) === JSON.stringify(coords2) ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n✅ Search optimization tests completed!');
}

// Run the tests
testSearchOptimizations().catch(console.error);