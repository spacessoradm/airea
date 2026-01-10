/**
 * UAT Test Suite: Multi-Language Property Search
 * Tests natural language queries from different Malaysian communities
 */

import { parseNaturalLanguageQuery } from '../services/openai';
import { extractKeywords } from '../services/keywordExtractor';

interface TestCase {
  query: string;
  language: string;
  community: string;
  description: string;
  expectedFilters: {
    propertyType?: string[];
    listingType?: string;
    maxPrice?: number;
    minPrice?: number;
    bedrooms?: number;
    hasLocation?: boolean;
    hasProximity?: boolean;
  };
}

const testCases: TestCase[] = [
  // MALAY COMMUNITY - Bahasa Malaysia
  {
    query: "rumah landed yang murah dekat Sunway",
    language: "Bahasa Malaysia",
    community: "Malay",
    description: "Looking for affordable landed house near Sunway",
    expectedFilters: { propertyType: ["house"], hasLocation: true, hasProximity: true }
  },
  {
    query: "apartmen untuk sewa murah KL",
    language: "Bahasa Malaysia", 
    community: "Malay",
    description: "Cheap apartment for rent in KL",
    expectedFilters: { propertyType: ["apartment"], listingType: "rent", hasLocation: true }
  },
  {
    query: "rumah teres 3 bilik dekat sekolah",
    language: "Bahasa Malaysia",
    community: "Malay",
    description: "3 bedroom terrace near school",
    expectedFilters: { propertyType: ["terraced-house"], bedrooms: 3 }
  },
  {
    query: "bilik sewa murah untuk student",
    language: "Bahasa Malaysia",
    community: "Malay",
    description: "Cheap room for rent for student",
    expectedFilters: { listingType: "rent" }
  },
  {
    query: "banglo mewah di Damansara",
    language: "Bahasa Malaysia",
    community: "Malay",
    description: "Luxury bungalow in Damansara",
    expectedFilters: { propertyType: ["bungalow"], hasLocation: true }
  },

  // CHINESE COMMUNITY - Mandarin/Cantonese
  {
    query: "找便宜的公寓在KLCC附近",
    language: "Mandarin",
    community: "Chinese",
    description: "Looking for cheap apartment near KLCC",
    expectedFilters: { propertyType: ["apartment", "condominium"], hasLocation: true, hasProximity: true }
  },
  {
    query: "三房公寓出租",
    language: "Mandarin",
    community: "Chinese", 
    description: "3 bedroom apartment for rent",
    expectedFilters: { propertyType: ["apartment", "condominium"], bedrooms: 3, listingType: "rent" }
  },
  {
    query: "我想找一个便宜的 landed near Kuchai Lama",
    language: "Mixed Mandarin-English",
    community: "Chinese",
    description: "Looking for cheap landed property near Kuchai Lama",
    expectedFilters: { propertyType: ["house"], hasLocation: true }
  },
  {
    query: "找便宜 condo near KLCC 有 swimming pool 的",
    language: "Mixed Mandarin-English",
    community: "Chinese",
    description: "Looking for cheap condo near KLCC with pool",
    expectedFilters: { propertyType: ["condominium"], hasLocation: true }
  },
  {
    query: "出租房子在Mont Kiara",
    language: "Mandarin",
    community: "Chinese",
    description: "House for rent in Mont Kiara",
    expectedFilters: { propertyType: ["house"], listingType: "rent", hasLocation: true }
  },

  // INDIAN COMMUNITY - Tamil
  {
    query: "KLCC அருகில் வீடு வேண்டும்",
    language: "Tamil",
    community: "Indian",
    description: "Need house near KLCC",
    expectedFilters: { propertyType: ["house"], hasLocation: true }
  },
  {
    query: "மலிவான காண்டோ KL",
    language: "Tamil",
    community: "Indian",
    description: "Cheap condo in KL",
    expectedFilters: { propertyType: ["condominium"], hasLocation: true }
  },
  {
    query: "வாடகைக்கு அபார்ட்மெண்ட்",
    language: "Tamil",
    community: "Indian",
    description: "Apartment for rent",
    expectedFilters: { propertyType: ["apartment"], listingType: "rent" }
  },

  // MANGLISH - Mixed Malaysian English
  {
    query: "Cari rumah landed yang murah la, near Sunway… at least 3 bilik",
    language: "Manglish",
    community: "Mixed",
    description: "Looking for cheap landed with 3 bedrooms near Sunway",
    expectedFilters: { propertyType: ["house"], bedrooms: 3, hasLocation: true }
  },
  {
    query: "Gimme cheap house dekat Penang 3 bilik rm300k below",
    language: "Manglish",
    community: "Mixed",
    description: "Cheap 3 bedroom house in Penang under RM300k",
    expectedFilters: { propertyType: ["house"], bedrooms: 3, maxPrice: 300000, hasLocation: true }
  },
  {
    query: "Need condo with 2 car parks la bro",
    language: "Manglish",
    community: "Mixed",
    description: "Condo with parking",
    expectedFilters: { propertyType: ["condominium"] }
  },
  {
    query: "Looking for studio near MRT la, budget below 2k monthly",
    language: "Manglish",
    community: "Mixed",
    description: "Studio near MRT under RM2000",
    expectedFilters: { propertyType: ["studio"], maxPrice: 2000 }
  },
  {
    query: "Bro any nice place for elderly parents ah? Ground floor preferred",
    language: "Manglish",
    community: "Mixed",
    description: "Property for elderly parents",
    expectedFilters: {}
  },
  {
    query: "Nak sewa rumah yang pet friendly kat PJ",
    language: "Mixed Malay-English",
    community: "Mixed",
    description: "Pet friendly rental in PJ",
    expectedFilters: { listingType: "rent", hasLocation: true }
  },

  // FORMAL ENGLISH
  {
    query: "3 bedroom condominium for rent in Mont Kiara under RM5000",
    language: "English",
    community: "All",
    description: "Standard English property search",
    expectedFilters: { propertyType: ["condominium"], bedrooms: 3, listingType: "rent", maxPrice: 5000, hasLocation: true }
  },
  {
    query: "Semi-detached house for sale in Damansara below RM1.5 million",
    language: "English",
    community: "All",
    description: "Semi-D search with price",
    expectedFilters: { propertyType: ["semi-detached-house"], listingType: "sale", hasLocation: true }
  },
  {
    query: "Commercial shop lot with at least 5% ROI",
    language: "English",
    community: "All",
    description: "Commercial ROI search",
    expectedFilters: { propertyType: ["shop"] }
  },

  // EDGE CASES
  {
    query: "rumah murah je",
    language: "Bahasa Malaysia",
    community: "Malay",
    description: "Just cheap house (minimal query)",
    expectedFilters: { propertyType: ["house"] }
  },
  {
    query: "便宜房子",
    language: "Mandarin",
    community: "Chinese",
    description: "Cheap house (minimal Mandarin)",
    expectedFilters: { propertyType: ["house"] }
  },

  // ADDITIONAL BAHASA MALAYSIA TESTS
  {
    query: "rumah semi-d dekat JB",
    language: "Bahasa Malaysia",
    community: "Malay",
    description: "Semi-D near JB",
    expectedFilters: { propertyType: ["semi-detached-house"], hasLocation: true }
  },
  {
    query: "sewa bilik murah dekat Seremban",
    language: "Bahasa Malaysia",
    community: "Malay",
    description: "Cheap room for rent near Seremban",
    expectedFilters: { listingType: "rent", hasLocation: true }
  },
  {
    query: "kedai untuk sewa kat Ipoh",
    language: "Bahasa Malaysia",
    community: "Malay",
    description: "Shop for rent in Ipoh",
    expectedFilters: { propertyType: ["shop"], listingType: "rent", hasLocation: true }
  },

  // ADDITIONAL MANDARIN TESTS
  {
    query: "槟城便宜房子出售",
    language: "Mandarin",
    community: "Chinese",
    description: "Cheap house for sale in Penang",
    expectedFilters: { propertyType: ["house"], listingType: "sale", hasLocation: true }
  },
  {
    query: "新山公寓出租两房",
    language: "Mandarin",
    community: "Chinese",
    description: "2 bedroom apartment for rent in JB",
    expectedFilters: { propertyType: ["apartment", "condominium"], listingType: "rent", bedrooms: 2, hasLocation: true }
  },

  // ADDITIONAL TAMIL TESTS
  {
    query: "பெனாங்கில் வீடு விற்பனை",
    language: "Tamil",
    community: "Indian",
    description: "House for sale in Penang",
    expectedFilters: { propertyType: ["house"], listingType: "sale", hasLocation: true }
  },
  {
    query: "ஜோஹர் பாரு அபார்ட்மெண்ட்",
    language: "Tamil",
    community: "Indian",
    description: "Apartment in Johor Bahru",
    expectedFilters: { propertyType: ["apartment"], hasLocation: true }
  },

  // ADDITIONAL MANGLISH TESTS
  {
    query: "Bro got any condo around Bangsar under 3k?",
    language: "Manglish",
    community: "Mixed",
    description: "Condo in Bangsar under RM3000",
    expectedFilters: { propertyType: ["condominium"], maxPrice: 3000, hasLocation: true }
  },
  {
    query: "Looking for apartment Cheras area la, max 2 rooms",
    language: "Manglish",
    community: "Mixed",
    description: "2 room apartment in Cheras",
    expectedFilters: { propertyType: ["apartment"], bedrooms: 2, hasLocation: true }
  },
  {
    query: "Any nice house dekat Melaka for family?",
    language: "Manglish",
    community: "Mixed",
    description: "Family house in Melaka",
    expectedFilters: { propertyType: ["house"], hasLocation: true }
  },

  // ABBREVIATION TESTS
  {
    query: "condo PJ below RM500k",
    language: "English",
    community: "All",
    description: "Condo in PJ under 500k",
    expectedFilters: { propertyType: ["condominium"], maxPrice: 500000, hasLocation: true }
  },
  {
    query: "house JB 4 bedroom",
    language: "English",
    community: "All",
    description: "4 bedroom house in JB",
    expectedFilters: { propertyType: ["house"], bedrooms: 4, hasLocation: true }
  },
  {
    query: "apartment KK for rent",
    language: "English",
    community: "All",
    description: "Apartment for rent in Kota Kinabalu",
    expectedFilters: { propertyType: ["apartment"], listingType: "rent", hasLocation: true }
  },

  // SPECIAL SLANG TESTS
  {
    query: "nak beli rumah yang tak mahal sangat",
    language: "Bahasa Malaysia",
    community: "Malay",
    description: "Want to buy house not too expensive",
    expectedFilters: { propertyType: ["house"], listingType: "sale" }
  },
  {
    query: "ada tak flat murah area Kepong?",
    language: "Bahasa Malaysia",
    community: "Malay",
    description: "Cheap flat in Kepong area",
    expectedFilters: { propertyType: ["apartment", "flat"], hasLocation: true }
  }
];

async function runTests() {
  console.log("=".repeat(80));
  console.log("🧪 UAT TEST SUITE: Multi-Language Property Search");
  console.log("=".repeat(80));
  console.log(`\nTotal test cases: ${testCases.length}\n`);

  let passed = 0;
  let failed = 0;
  const results: any[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`\n--- Test ${i + 1}/${testCases.length} ---`);
    console.log(`📝 Query: "${tc.query}"`);
    console.log(`🌐 Language: ${tc.language} | Community: ${tc.community}`);
    console.log(`📋 Description: ${tc.description}`);

    try {
      // First try keyword extraction (local)
      const keywordResult = await extractKeywords(tc.query);
      console.log(`\n🔤 Keyword Extraction Result:`);
      console.log(`   Property Types: ${keywordResult.propertyTypes.join(', ') || 'none'}`);
      console.log(`   Listing Type: ${keywordResult.listingType || 'none'}`);
      console.log(`   Bedrooms: ${keywordResult.bedrooms || 'none'}`);
      console.log(`   Max Price: ${keywordResult.maxPrice || 'none'}`);
      console.log(`   Locations: ${keywordResult.locations.join(', ') || 'none'}`);
      console.log(`   Confidence: ${(keywordResult.confidence * 100).toFixed(0)}%`);
      if (keywordResult.slangPriceHint) {
        console.log(`   Slang Price Hint: RM${keywordResult.slangPriceHint}`);
      }

      // Then try AI parsing
      const aiResult = await parseNaturalLanguageQuery(tc.query);
      const aiPropertyTypes = Array.isArray(aiResult.propertyType) ? aiResult.propertyType : (aiResult.propertyType ? [aiResult.propertyType] : []);
      
      console.log(`\n🤖 AI Parsing Result:`);
      console.log(`   Search Type: ${aiResult.searchType || 'general'}`);
      console.log(`   Property Types: ${aiPropertyTypes.join(', ') || 'none'}`);
      console.log(`   Listing Type: ${aiResult.listingType || 'none'}`);
      console.log(`   Bedrooms: ${aiResult.bedrooms || 'none'}`);
      console.log(`   Max Price: ${aiResult.maxPrice || 'none'}`);
      console.log(`   Location Area: ${aiResult.location?.area || 'none'}`);
      console.log(`   Has Proximity: ${aiResult.location?.maxDistance ? 'yes' : 'no'}`);

      // Validate results
      let testPassed = true;
      const issues: string[] = [];

      if (tc.expectedFilters.propertyType && aiPropertyTypes.length > 0) {
        const hasExpectedType = tc.expectedFilters.propertyType.some(t => 
          aiPropertyTypes.includes(t) || 
          aiPropertyTypes.some((at: string) => at.includes(t) || t.includes(at))
        );
        if (!hasExpectedType) {
          issues.push(`Expected property type ${tc.expectedFilters.propertyType.join('/')} but got ${aiPropertyTypes.join(', ')}`);
          testPassed = false;
        }
      }

      if (tc.expectedFilters.listingType && aiResult.listingType !== tc.expectedFilters.listingType) {
        issues.push(`Expected listing type ${tc.expectedFilters.listingType} but got ${aiResult.listingType}`);
        testPassed = false;
      }

      if (tc.expectedFilters.hasLocation && !aiResult.location?.area) {
        issues.push(`Expected location but none found`);
        testPassed = false;
      }

      if (testPassed) {
        console.log(`\n✅ TEST PASSED`);
        passed++;
      } else {
        console.log(`\n❌ TEST FAILED`);
        issues.forEach(issue => console.log(`   ⚠️ ${issue}`));
        failed++;
      }

      results.push({
        query: tc.query,
        language: tc.language,
        community: tc.community,
        passed: testPassed,
        keywordResult,
        aiResult,
        issues
      });

    } catch (error) {
      console.log(`\n❌ TEST ERROR: ${(error as Error).message}`);
      failed++;
      results.push({
        query: tc.query,
        language: tc.language,
        community: tc.community,
        passed: false,
        error: (error as Error).message
      });
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(80));
  console.log(`✅ Passed: ${passed}/${testCases.length}`);
  console.log(`❌ Failed: ${failed}/${testCases.length}`);
  console.log(`📈 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

  // Group by community
  console.log("\n📊 Results by Community:");
  const communities = Array.from(new Set(testCases.map(tc => tc.community)));
  for (let c = 0; c < communities.length; c++) {
    const community = communities[c];
    const communityTests = results.filter(r => testCases.find(tc => tc.query === r.query)?.community === community);
    const communityPassed = communityTests.filter(r => r.passed).length;
    console.log(`   ${community}: ${communityPassed}/${communityTests.length} passed`);
  }

  // Group by language
  console.log("\n📊 Results by Language:");
  const languages = Array.from(new Set(testCases.map(tc => tc.language)));
  for (let l = 0; l < languages.length; l++) {
    const language = languages[l];
    const languageTests = results.filter(r => testCases.find(tc => tc.query === r.query)?.language === language);
    const languagePassed = languageTests.filter(r => r.passed).length;
    console.log(`   ${language}: ${languagePassed}/${languageTests.length} passed`);
  }

  return { passed, failed, total: testCases.length, results };
}

// Export for use
export { runTests, testCases };

// Run the tests immediately
runTests().then(result => {
  console.log("\n🏁 Test run complete!");
  process.exit(result.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error("Test suite error:", error);
  process.exit(1);
});
