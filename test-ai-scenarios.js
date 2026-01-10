#!/usr/bin/env node

// Comprehensive test runner for AI search scenarios
const testScenarios = [
  // Residential Tests
  {
    id: 'R1',
    category: 'Residential',
    query: 'Condo for rent in Damansara under RM2,000',
    expectedBehavior: 'Filter residential properties by location & price',
    expectedMatches: ['Casa Tropicana (RM1,800)', 'Damansara Foresta (RM1,900)'],
    actualTest: 'Damansara Condo rental under 2000'
  },
  {
    id: 'R2', 
    category: 'Residential',
    query: 'Landed house for sale near Mont Kiara within 5km',
    expectedBehavior: 'Geocode location, calculate radius, return landed houses',
    expectedMatches: ['Desa ParkCity Bungalow (RM3.2M)'],
    actualTest: 'Mont Kiara landed house sale'
  },
  {
    id: 'R3',
    category: 'Residential', 
    query: 'Pet-friendly apartment in Kepong',
    expectedBehavior: 'Search property tags/features',
    expectedMatches: ['The Henge Kepong (RM1,700)'],
    actualTest: 'Kepong pet-friendly apartment'
  },

  // Commercial Tests
  {
    id: 'C1',
    category: 'Commercial',
    query: 'Office space for rent in Damansara 1000 sqft',
    expectedBehavior: 'Match property type & floor area',
    expectedMatches: ['Empire Damansara Office (RM2,800)'],
    actualTest: 'Damansara office rental'
  },
  {
    id: 'C2',
    category: 'Commercial',
    query: 'Retail shop near Mont Kiara',
    expectedBehavior: 'Use proximity search',
    expectedMatches: ['Solaris Mont Kiara Retail Lot (RM12,000)'],
    actualTest: 'Mont Kiara retail space'
  },
  {
    id: 'C3',
    category: 'Commercial',
    query: 'Co-working space in Kepong',
    expectedBehavior: 'Match keywords + category',
    expectedMatches: ['Regus Kepong (RM600 per seat)'],
    actualTest: 'Kepong co-working space'
  },

  // Industrial Tests
  {
    id: 'I1',
    category: 'Industrial',
    query: 'Warehouse for rent near Kepong',
    expectedBehavior: 'Industrial property filtering',
    expectedMatches: ['Kepong Industrial Park Warehouse (RM15,000)'],
    actualTest: 'Kepong warehouse rental'
  },
  {
    id: 'I2',
    category: 'Industrial',
    query: 'Factory for sale in Damansara',
    expectedBehavior: 'Filter industrial + sale listings',
    expectedMatches: ['Damansara Utama Factory Lot (RM4.5M)'],
    actualTest: 'Damansara factory sale'
  },
  {
    id: 'I3',
    category: 'Industrial',
    query: 'Cold storage warehouse in Mont Kiara',
    expectedBehavior: 'Match specific industrial type',
    expectedMatches: ['Mont Kiara Cold Storage (RM20,000)'],
    actualTest: 'Mont Kiara cold storage'
  }
];

console.log('=== AI SEARCH SCENARIO TESTING ===\n');

async function runTest(scenario) {
  console.log(`Testing ${scenario.id}: ${scenario.query}`);
  console.log(`Expected: ${scenario.expectedBehavior}`);
  console.log(`Sample Matches: ${scenario.expectedMatches.join(', ')}`);
  
  try {
    const response = await fetch('http://localhost:5000/api/search/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: scenario.query })
    });
    
    const result = await response.json();
    
    console.log(`✅ Result: ${result.count} properties found`);
    if (result.properties && result.properties.length > 0) {
      console.log(`   Top matches:`);
      result.properties.slice(0, 3).forEach((prop, idx) => {
        console.log(`     ${idx + 1}. ${prop.title || prop.name || 'Unknown'} - RM${prop.price} (${prop.propertyType})`);
      });
    }
    console.log(`   Filters applied: ${JSON.stringify(result.filters, null, 2)}`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('---\n');
}

async function runAllTests() {
  for (const scenario of testScenarios) {
    await runTest(scenario);
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('=== ALL TESTS COMPLETED ===');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:5000/api/properties');
    if (response.ok) {
      console.log('✅ Server is running, starting tests...\n');
      return true;
    }
  } catch (error) {
    console.log('❌ Server not running. Please start the application first.');
    return false;
  }
}

// Run the tests
checkServer().then(isRunning => {
  if (isRunning) {
    runAllTests();
  }
});