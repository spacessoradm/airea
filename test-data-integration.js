#!/usr/bin/env node

import fs from 'fs';

// Load the test dataset
const testData = JSON.parse(fs.readFileSync('./test_properties.json', 'utf8'));

console.log('=== TEST PROPERTY DATASET ANALYSIS ===');
console.log(`Total properties: ${testData.length}`);

// Analyze by location
const locationCounts = {};
testData.forEach(prop => {
  locationCounts[prop.location] = (locationCounts[prop.location] || 0) + 1;
});

console.log('\n=== LOCATION DISTRIBUTION ===');
Object.entries(locationCounts).sort(([,a], [,b]) => b - a).forEach(([location, count]) => {
  console.log(`${location}: ${count} properties`);
});

// Analyze by type and subtype
const typeCounts = {};
const subtypeCounts = {};
testData.forEach(prop => {
  typeCounts[prop.type] = (typeCounts[prop.type] || 0) + 1;
  subtypeCounts[prop.subtype] = (subtypeCounts[prop.subtype] || 0) + 1;
});

console.log('\n=== PROPERTY TYPE DISTRIBUTION ===');
Object.entries(typeCounts).forEach(([type, count]) => {
  console.log(`${type}: ${count} properties`);
});

console.log('\n=== PROPERTY SUBTYPE DISTRIBUTION ===');
Object.entries(subtypeCounts).sort(([,a], [,b]) => b - a).forEach(([subtype, count]) => {
  console.log(`${subtype}: ${count} properties`);
});

// Find specific properties for test scenarios
console.log('\n=== SPECIFIC TEST PROPERTIES ===');

// R1: Damansara condos under RM2000
const damansaraCondos = testData.filter(p => 
  p.location === 'Damansara' && 
  p.subtype === 'Condo' && 
  p.unit === 'RM/month' && 
  p.price < 2000
);
console.log(`R1 - Damansara condos under RM2000: ${damansaraCondos.length} found`);
damansaraCondos.forEach(p => console.log(`  - ${p.name}: RM${p.price}/month`));

// R2: Mont Kiara landed houses 
const montKiaraLanded = testData.filter(p => 
  p.location === 'Mont Kiara' && 
  (p.subtype === 'Bungalow' || p.subtype === 'Landed House')
);
console.log(`R2 - Mont Kiara landed houses: ${montKiaraLanded.length} found`);
montKiaraLanded.forEach(p => console.log(`  - ${p.name}: RM${p.price} (${p.unit})`));

// R3: Pet-friendly apartments in Kepong
const kepongPetFriendly = testData.filter(p => 
  p.location === 'Kepong' && 
  p.subtype === 'Apartment' && 
  p.features.includes('pet-friendly')
);
console.log(`R3 - Pet-friendly apartments in Kepong: ${kepongPetFriendly.length} found`);
kepongPetFriendly.forEach(p => console.log(`  - ${p.name}: RM${p.price} (${p.unit})`));

// C1: Office space in Damansara
const damansaraOffice = testData.filter(p => 
  p.location === 'Damansara' && 
  (p.subtype === 'Office' || p.subtype.includes('office') || p.subtype.includes('Office'))
);
console.log(`C1 - Office space in Damansara: ${damansaraOffice.length} found`);
damansaraOffice.forEach(p => console.log(`  - ${p.name}: RM${p.price} (${p.unit})`));

// C2: Retail near Mont Kiara
const montKiaraRetail = testData.filter(p => 
  p.location === 'Mont Kiara' && 
  (p.subtype === 'Retail' || p.subtype === 'Shop' || p.subtype === 'Shop Lot')
);
console.log(`C2 - Retail near Mont Kiara: ${montKiaraRetail.length} found`);
montKiaraRetail.forEach(p => console.log(`  - ${p.name}: RM${p.price} (${p.unit})`));

// C3: Co-working space in Kepong
const kepongCoworking = testData.filter(p => 
  p.location === 'Kepong' && 
  p.subtype === 'Co-working Space'
);
console.log(`C3 - Co-working space in Kepong: ${kepongCoworking.length} found`);
kepongCoworking.forEach(p => console.log(`  - ${p.name}: RM${p.price} (${p.unit})`));

// I1: Warehouse near Kepong
const kepongWarehouse = testData.filter(p => 
  p.location === 'Kepong' && 
  p.subtype === 'Warehouse'
);
console.log(`I1 - Warehouse near Kepong: ${kepongWarehouse.length} found`);
kepongWarehouse.forEach(p => console.log(`  - ${p.name}: RM${p.price} (${p.unit})`));

// I2: Factory in Damansara
const damansaraFactory = testData.filter(p => 
  p.location === 'Damansara' && 
  p.subtype === 'Factory'
);
console.log(`I2 - Factory in Damansara: ${damansaraFactory.length} found`);
damansaraFactory.forEach(p => console.log(`  - ${p.name}: RM${p.price} (${p.unit})`));

// I3: Cold storage near Mont Kiara
const montKiaraColdStorage = testData.filter(p => 
  p.location === 'Mont Kiara' && 
  p.subtype === 'Cold Storage'
);
console.log(`I3 - Cold storage near Mont Kiara: ${montKiaraColdStorage.length} found`);
montKiaraColdStorage.forEach(p => console.log(`  - ${p.name}: RM${p.price} (${p.unit})`));

console.log('\n=== ANALYSIS COMPLETE ===');