import { db } from "./db";
import { malaysianBuildings } from "@shared/schema";
import { sql } from "drizzle-orm";

interface BuildingData {
  name: string;
  type: 'condominium' | 'apartment' | 'serviced_apartment' | 'townhouse' | 'mixed_development';
  area: string;
  city: string;
  state: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  developer?: string;
  yearBuilt?: number;
  totalUnits?: number;
  searchKeywords?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  facilities?: string[];
}

// Major Malaysian residential buildings dataset - Selangor & KL Focus
const selangorKLBuildings: BuildingData[] = [
  // SELANGOR - PETALING JAYA
  {
    name: "The Atera",
    type: "condominium",
    area: "Petaling Jaya",
    city: "Petaling Jaya",
    state: "Selangor",
    coordinates: { lat: 3.1319, lng: 101.6841 },
    developer: "Mah Sing Group",
    yearBuilt: 2023,
    totalUnits: 432,
    searchKeywords: ["atera", "petaling jaya", "pj", "mah sing"],
    priceRange: { min: 380000, max: 650000 },
    facilities: ["swimming pool", "gym", "security", "playground"]
  },
  {
    name: "Mosaic Residences",
    type: "condominium", 
    area: "USJ1",
    city: "Subang Jaya",
    state: "Selangor",
    coordinates: { lat: 3.0738, lng: 101.5951 },
    developer: "SP Setia",
    yearBuilt: 2022,
    totalUnits: 358,
    searchKeywords: ["mosaic", "usj", "subang jaya", "setia"],
    priceRange: { min: 420000, max: 720000 },
    facilities: ["swimming pool", "gym", "security", "clubhouse"]
  },
  {
    name: "Sunway Vivaldi",
    type: "condominium",
    area: "Petaling Jaya",
    city: "Petaling Jaya", 
    state: "Selangor",
    coordinates: { lat: 3.1370, lng: 101.6766 },
    developer: "Sunway Property",
    yearBuilt: 2023,
    totalUnits: 495,
    searchKeywords: ["vivaldi", "sunway", "petaling jaya", "pj"],
    priceRange: { min: 450000, max: 800000 },
    facilities: ["swimming pool", "gym", "security", "sky garden"]
  },

  // SELANGOR - SHAH ALAM
  {
    name: "Tuai Timur @ Setia Alam",
    type: "condominium",
    area: "Setia Alam", 
    city: "Shah Alam",
    state: "Selangor",
    coordinates: { lat: 3.1203, lng: 101.4439 },
    developer: "SP Setia",
    yearBuilt: 2024,
    totalUnits: 632,
    searchKeywords: ["tuai timur", "setia alam", "shah alam", "setia"],
    priceRange: { min: 350000, max: 580000 },
    facilities: ["swimming pool", "gym", "security", "jogging track"]
  },
  {
    name: "Sky Park @ Cyberjaya",
    type: "condominium",
    area: "Cyberjaya",
    city: "Cyberjaya",
    state: "Selangor", 
    coordinates: { lat: 2.9213, lng: 101.6559 },
    developer: "Gamuda Land",
    yearBuilt: 2023,
    totalUnits: 421,
    searchKeywords: ["sky park", "cyberjaya", "gamuda"],
    priceRange: { min: 480000, max: 850000 },
    facilities: ["swimming pool", "gym", "security", "sky bridge"]
  },

  // SELANGOR - KLANG
  {
    name: "Tropicana Danga Bay Residences",
    type: "condominium",
    area: "Klang",
    city: "Klang",
    state: "Selangor",
    coordinates: { lat: 3.0319, lng: 101.4419 },
    developer: "Tropicana Corporation",
    yearBuilt: 2022,
    totalUnits: 384,
    searchKeywords: ["tropicana", "danga bay", "klang"],
    priceRange: { min: 320000, max: 550000 },
    facilities: ["swimming pool", "gym", "security", "bbq area"]
  },

  // SELANGOR - PUCHONG
  {
    name: "Puchong Financial Corporate Centre",
    type: "mixed_development",
    area: "Puchong",
    city: "Puchong", 
    state: "Selangor",
    coordinates: { lat: 3.0319, lng: 101.6319 },
    developer: "IOI Properties",
    yearBuilt: 2023,
    totalUnits: 756,
    searchKeywords: ["puchong", "financial centre", "ioi"],
    priceRange: { min: 380000, max: 680000 },
    facilities: ["swimming pool", "gym", "security", "retail podium"]
  },

  // KUALA LUMPUR - BANGSAR
  {
    name: "River Park Bangsar South",
    type: "condominium",
    area: "Bangsar South",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1186, lng: 101.6741 },
    developer: "UEM Sunrise",
    yearBuilt: 2023,
    totalUnits: 432,
    searchKeywords: ["river park", "bangsar south", "bangsar", "uem"],
    priceRange: { min: 650000, max: 1200000 },
    facilities: ["swimming pool", "gym", "security", "riverside deck"]
  },
  {
    name: "Parkside Residences",
    type: "condominium",
    area: "Bangsar",
    city: "Kuala Lumpur", 
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1280, lng: 101.6704 },
    developer: "Mah Sing Group",
    yearBuilt: 2022,
    totalUnits: 318,
    searchKeywords: ["parkside", "bangsar", "mah sing"],
    priceRange: { min: 580000, max: 950000 },
    facilities: ["swimming pool", "gym", "security", "garden terrace"]
  },
  {
    name: "Khaya Residences",
    type: "condominium",
    area: "Bangsar",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur", 
    coordinates: { lat: 3.1265, lng: 101.6718 },
    developer: "Eastern & Oriental",
    yearBuilt: 2024,
    totalUnits: 286,
    searchKeywords: ["khaya", "bangsar", "eastern oriental", "e&o"],
    priceRange: { min: 720000, max: 1400000 },
    facilities: ["swimming pool", "gym", "security", "concierge"]
  },

  // KUALA LUMPUR - MONT KIARA (Additional)
  {
    name: "The Binjai on the Park", 
    type: "condominium",
    area: "Mont Kiara",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1698, lng: 101.6518 },
    developer: "Mah Sing Group",
    yearBuilt: 2019,
    totalUnits: 240,
    searchKeywords: ["binjai", "mont kiara", "mah sing", "park"],
    priceRange: { min: 850000, max: 1800000 },
    facilities: ["swimming pool", "gym", "security", "sky terrace"]
  },
  {
    name: "The Oval",
    type: "condominium",
    area: "Mont Kiara",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1685, lng: 101.6535 },
    developer: "Boustead Properties",
    yearBuilt: 2018,
    totalUnits: 346,
    searchKeywords: ["oval", "mont kiara", "boustead"],
    priceRange: { min: 750000, max: 1500000 },
    facilities: ["swimming pool", "gym", "security", "function hall"]
  },
  {
    name: "10 Mont Kiara",
    type: "condominium",
    area: "Mont Kiara", 
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1702, lng: 101.6528 },
    developer: "Sunrise Berhad",
    yearBuilt: 2021,
    totalUnits: 398,
    searchKeywords: ["10 mont kiara", "mont kiara", "sunrise"],
    priceRange: { min: 680000, max: 1300000 },
    facilities: ["swimming pool", "gym", "security", "sky lounge"]
  },
  {
    name: "Seni Mont Kiara",
    type: "condominium",
    area: "Mont Kiara",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur", 
    coordinates: { lat: 3.1712, lng: 101.6545 },
    developer: "Sunrise Berhad",
    yearBuilt: 2020,
    totalUnits: 426,
    searchKeywords: ["seni", "mont kiara", "sunrise"],
    priceRange: { min: 720000, max: 1400000 },
    facilities: ["swimming pool", "gym", "security", "art gallery"]
  },

  // KUALA LUMPUR - SETIAWANGSA
  {
    name: "The Vesta Residences @ SkySierra",
    type: "condominium",
    area: "Setiawangsa",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1947, lng: 101.7247 },
    developer: "Skyworld Development",
    yearBuilt: 2023,
    totalUnits: 512,
    searchKeywords: ["vesta", "setiawangsa", "skysierra", "skyworld"],
    priceRange: { min: 420000, max: 750000 },
    facilities: ["swimming pool", "gym", "security", "sky deck"]
  },

  // KUALA LUMPUR - WANGSA MAJU
  {
    name: "Infiniti3 Residences",
    type: "condominium",
    area: "Wangsa Maju",
    city: "Kuala Lumpur", 
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1986, lng: 101.7339 },
    developer: "Sunrise Berhad",
    yearBuilt: 2022,
    totalUnits: 445,
    searchKeywords: ["infiniti3", "wangsa maju", "sunrise"],
    priceRange: { min: 380000, max: 680000 },
    facilities: ["swimming pool", "gym", "security", "infinity pool"]
  },

  // KUALA LUMPUR - CHERAS
  {
    name: "Desa Tiara",
    type: "condominium",
    area: "Cheras",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1215, lng: 101.7448 },
    developer: "IOI Properties",
    yearBuilt: 2021,
    totalUnits: 624,
    searchKeywords: ["desa tiara", "cheras", "ioi"],
    priceRange: { min: 350000, max: 580000 },
    facilities: ["swimming pool", "gym", "security", "playground"]
  },
  {
    name: "Nexus Taman Pertama",
    type: "condominium",
    area: "Cheras",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1198, lng: 101.7462 },
    developer: "Gamuda Land",
    yearBuilt: 2023,
    totalUnits: 386,
    searchKeywords: ["nexus", "taman pertama", "cheras", "gamuda"],
    priceRange: { min: 380000, max: 620000 },
    facilities: ["swimming pool", "gym", "security", "community hall"]
  }
];

// Major buildings across other Malaysian states
const otherStatesBuildings: BuildingData[] = [
  // JOHOR - JOHOR BAHRU
  {
    name: "Pulai View",
    type: "condominium",
    area: "Johor Bahru",
    city: "Johor Bahru",
    state: "Johor",
    coordinates: { lat: 1.4655, lng: 103.7578 },
    developer: "Tropicana Corporation",
    yearBuilt: 2022,
    totalUnits: 468,
    searchKeywords: ["pulai view", "johor bahru", "jb", "tropicana"],
    priceRange: { min: 280000, max: 520000 },
    facilities: ["swimming pool", "gym", "security", "tennis court"]
  },
  {
    name: "Tropicana Danga Bay Residences JB",
    type: "condominium",
    area: "Danga Bay",
    city: "Johor Bahru",
    state: "Johor",
    coordinates: { lat: 1.4519, lng: 103.7347 },
    developer: "Tropicana Corporation", 
    yearBuilt: 2023,
    totalUnits: 642,
    searchKeywords: ["tropicana", "danga bay", "johor bahru", "jb"],
    priceRange: { min: 320000, max: 580000 },
    facilities: ["swimming pool", "gym", "security", "waterfront view"]
  },

  // JOHOR - ISKANDAR PUTERI
  {
    name: "UEM Sunrise Iskandar Residences",
    type: "condominium",
    area: "Iskandar Puteri",
    city: "Iskandar Puteri",
    state: "Johor",
    coordinates: { lat: 1.4239, lng: 103.6318 },
    developer: "UEM Sunrise",
    yearBuilt: 2022,
    totalUnits: 524,
    searchKeywords: ["uem sunrise", "iskandar puteri", "nusajaya"],
    priceRange: { min: 350000, max: 650000 },
    facilities: ["swimming pool", "gym", "security", "golf view"]
  },
  {
    name: "Sunway City Iskandar",
    type: "mixed_development",
    area: "Iskandar Puteri",
    city: "Iskandar Puteri", 
    state: "Johor",
    coordinates: { lat: 1.4186, lng: 103.6397 },
    developer: "Sunway Property",
    yearBuilt: 2023,
    totalUnits: 756,
    searchKeywords: ["sunway city", "iskandar", "sunway"],
    priceRange: { min: 380000, max: 720000 },
    facilities: ["swimming pool", "gym", "security", "shopping mall"]
  },

  // PENANG - BATU FERRINGHI
  {
    name: "Ferringhi Residence 2",
    type: "condominium",
    area: "Batu Ferringhi",
    city: "George Town",
    state: "Penang",
    coordinates: { lat: 5.4748, lng: 100.2467 },
    developer: "Ideal Property Group",
    yearBuilt: 2022,
    totalUnits: 328,
    searchKeywords: ["ferringhi residence", "batu ferringhi", "penang", "ideal"],
    priceRange: { min: 420000, max: 780000 },
    facilities: ["swimming pool", "gym", "security", "beachfront"]
  },

  // PENANG - BAYAN LEPAS
  {
    name: "Lucerne Residences",
    type: "condominium",
    area: "Bayan Lepas",
    city: "Bayan Lepas",
    state: "Penang",
    coordinates: { lat: 5.3019, lng: 100.2659 },
    developer: "Mah Sing Group",
    yearBuilt: 2023,
    totalUnits: 384,
    searchKeywords: ["lucerne", "bayan lepas", "penang", "mah sing", "dual key"],
    priceRange: { min: 380000, max: 680000 },
    facilities: ["swimming pool", "gym", "security", "airport proximity"]
  },

  // PENANG - BUKIT MERTAJAM
  {
    name: "Sunway Bukit Mertajam",
    type: "condominium",
    area: "Bukit Mertajam",
    city: "Bukit Mertajam",
    state: "Penang",
    coordinates: { lat: 5.3639, lng: 100.4719 },
    developer: "Sunway Property",
    yearBuilt: 2023,
    totalUnits: 456,
    searchKeywords: ["sunway", "bukit mertajam", "penang"],
    priceRange: { min: 320000, max: 580000 },
    facilities: ["swimming pool", "gym", "security", "commercial podium"]
  },

  // NEGERI SEMBILAN - SEREMBAN
  {
    name: "Kepayang Residence",
    type: "condominium",
    area: "Seremban",
    city: "Seremban",
    state: "Negeri Sembilan",
    coordinates: { lat: 2.7297, lng: 101.9381 },
    developer: "IJM Land",
    yearBuilt: 2022,
    totalUnits: 318,
    searchKeywords: ["kepayang", "seremban", "negeri sembilan", "ijm"],
    priceRange: { min: 280000, max: 480000 },
    facilities: ["swimming pool", "gym", "security", "garden landscape"]
  },
  {
    name: "Seremban 2 Central Park",
    type: "condominium",
    area: "Seremban 2",
    city: "Seremban",
    state: "Negeri Sembilan",
    coordinates: { lat: 2.7156, lng: 101.9298 },
    developer: "IJM Land",
    yearBuilt: 2023,
    totalUnits: 524,
    searchKeywords: ["seremban 2", "central park", "ijm", "flagship township"],
    priceRange: { min: 320000, max: 580000 },
    facilities: ["swimming pool", "gym", "security", "central park view"]
  },

  // NEGERI SEMBILAN - NILAI
  {
    name: "Cempaka Seri @ Kota Seriemas",
    type: "condominium", 
    area: "Nilai",
    city: "Nilai",
    state: "Negeri Sembilan",
    coordinates: { lat: 2.8219, lng: 101.7981 },
    developer: "SP Setia",
    yearBuilt: 2023,
    totalUnits: 396,
    searchKeywords: ["cempaka seri", "kota seriemas", "nilai", "setia"],
    priceRange: { min: 250000, max: 420000 },
    facilities: ["swimming pool", "gym", "security", "university proximity"]
  },

  // KEDAH - SUNGAI PETANI
  {
    name: "Sierra 3A Elegant @ Bukit Banyan",
    type: "condominium",
    area: "Sungai Petani",
    city: "Sungai Petani", 
    state: "Kedah",
    coordinates: { lat: 5.6469, lng: 100.4876 },
    developer: "IOI Properties",
    yearBuilt: 2022,
    totalUnits: 284,
    searchKeywords: ["sierra 3a", "bukit banyan", "sungai petani", "kedah", "ioi"],
    priceRange: { min: 220000, max: 380000 },
    facilities: ["swimming pool", "gym", "security", "hill view"]
  },

  // PERAK - IPOH
  {
    name: "Greentown Nova",
    type: "condominium",
    area: "Ipoh",
    city: "Ipoh",
    state: "Perak", 
    coordinates: { lat: 4.5975, lng: 101.0901 },
    developer: "Gamuda Land",
    yearBuilt: 2023,
    totalUnits: 342,
    searchKeywords: ["greentown nova", "ipoh", "perak", "gamuda"],
    priceRange: { min: 200000, max: 350000 },
    facilities: ["swimming pool", "gym", "security", "garden terrace"]
  },
  {
    name: "Tambun Royale City",
    type: "mixed_development",
    area: "Tambun",
    city: "Ipoh",
    state: "Perak",
    coordinates: { lat: 4.6298, lng: 101.1489 },
    developer: "MKH Berhad",
    yearBuilt: 2022,
    totalUnits: 468,
    searchKeywords: ["tambun royale", "tambun", "ipoh", "perak", "mkh"],
    priceRange: { min: 180000, max: 320000 },
    facilities: ["swimming pool", "gym", "security", "hot springs proximity"]
  }
];

async function seedComprehensiveMalaysianBuildings() {
  try {
    console.log("🏢 Starting comprehensive Malaysian buildings database seeding...");
    
    // Combine all building datasets
    const allBuildings = [...selangorKLBuildings, ...otherStatesBuildings];
    
    console.log(`📊 Total buildings to seed: ${allBuildings.length}`);
    console.log(`📍 Selangor & KL buildings: ${selangorKLBuildings.length}`);
    console.log(`📍 Other states buildings: ${otherStatesBuildings.length}`);

    // Clear existing data
    await db.delete(malaysianBuildings);
    console.log("🗑️ Cleared existing Malaysian buildings data");

    // Insert buildings with PostGIS geometry
    let insertedCount = 0;
    for (const building of allBuildings) {
      try {
        const keywordsArray = building.searchKeywords || [];
        const facilitiesArray = building.facilities || [];
        
        await db.execute(sql`
          INSERT INTO malaysian_buildings (
            name, type, area, city, state, latitude, longitude, geometry, 
            developer, year_built, total_units, search_keywords, verified
          ) VALUES (
            ${building.name}, 
            ${building.type}::malaysian_building_type,
            ${building.area}, 
            ${building.city}, 
            ${building.state}, 
            ${building.coordinates.lat}, 
            ${building.coordinates.lng},
            ST_GeomFromText('POINT(' || ${building.coordinates.lng} || ' ' || ${building.coordinates.lat} || ')', 4326),
            ${building.developer || null},
            ${building.yearBuilt || null},
            ${building.totalUnits || null},
            ARRAY[${keywordsArray.map(k => `'${k.replace(/'/g, "''")}'`).join(',')}]::text[],
            ${true}
          )
        `);
        insertedCount++;
        
        if (insertedCount % 10 === 0) {
          console.log(`📈 Progress: ${insertedCount}/${allBuildings.length} buildings inserted`);
        }
      } catch (error) {
        console.error(`❌ Error inserting building ${building.name}:`, error);
      }
    }

    console.log(`✅ Successfully seeded ${insertedCount} Malaysian buildings to PostgreSQL + PostGIS`);
    console.log("🎯 Buildings indexed for efficient search with full-text search and spatial queries");
    
    // Verify the data
    const totalCount = await db.execute(sql`SELECT COUNT(*) as count FROM malaysian_buildings`);
    console.log(`📊 Total buildings in database: ${totalCount.rows[0].count}`);
    
    // Show distribution by state
    const stateDistribution = await db.execute(sql`
      SELECT state, COUNT(*) as count 
      FROM malaysian_buildings 
      GROUP BY state 
      ORDER BY count DESC
    `);
    
    console.log("\n📊 Buildings distribution by state:");
    stateDistribution.rows.forEach((row: any) => {
      console.log(`   ${row.state}: ${row.count} buildings`);
    });
    
    console.log("\n🎉 Comprehensive Malaysian buildings seeding completed successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding comprehensive Malaysian buildings:", error);
    throw error;
  }
}

// Run the seeding function
seedComprehensiveMalaysianBuildings()
  .then(() => {
    console.log("✅ Seeding process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Seeding failed:", error);
    process.exit(1);
  });

export { seedComprehensiveMalaysianBuildings };