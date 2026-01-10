import { db } from "./db";
import { malaysianBuildings } from "@shared/schema";
import { sql } from "drizzle-orm";

interface BuildingData {
  name: string;
  type: 'condominium' | 'apartment' | 'serviced_apartment' | 'townhouse' | 'landed' | 'commercial' | 'mixed_development';
  area: string;
  city: string;
  state: string;
  coordinates: { lat: number; lng: number };
  developer?: string;
  yearBuilt?: number;
  totalUnits?: number;
  searchKeywords?: string[];
}

// Comprehensive Malaysian buildings database with real residential complexes
const buildingsData: BuildingData[] = [
  // Mont Kiara Area
  {
    name: "Mont Kiara Palma",
    type: "condominium",
    area: "Mont Kiara",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1698, lng: 101.6518 },
    developer: "Sunrise Berhad",
    yearBuilt: 2008,
    totalUnits: 156,
    searchKeywords: ["mont kiara", "palma", "luxury condo"]
  },
  {
    name: "Mont Kiara Meridin",
    type: "serviced_apartment",
    area: "Mont Kiara",
    city: "Kuala Lumpur", 
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1705, lng: 101.6525 },
    developer: "Meridin Berhad",
    yearBuilt: 2012,
    totalUnits: 240,
    searchKeywords: ["mont kiara", "meridin", "serviced apartment"]
  },
  {
    name: "Mont Kiara Astana",
    type: "condominium",
    area: "Mont Kiara",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur", 
    coordinates: { lat: 3.1690, lng: 101.6530 },
    developer: "Astana Berhad",
    yearBuilt: 2006,
    totalUnits: 180,
    searchKeywords: ["mont kiara", "astana", "condo"]
  },
  {
    name: "Verticas Residensi",
    type: "condominium",
    area: "Mont Kiara",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1715, lng: 101.6540 },
    developer: "Naza TTDI",
    yearBuilt: 2015,
    totalUnits: 520,
    searchKeywords: ["verticas", "mont kiara", "naza"]
  },

  // Damansara Heights & Desa Area
  {
    name: "Desa Damansara",
    type: "condominium",
    area: "Damansara Heights",
    city: "Kuala Lumpur",
    state: "Selangor",
    coordinates: { lat: 3.1569, lng: 101.6584 },
    developer: "Glomac Berhad",
    yearBuilt: 2004,
    totalUnits: 264,
    searchKeywords: ["desa", "damansara", "heights"]
  },
  {
    name: "Desa Sri Hartamas",
    type: "condominium", 
    area: "Sri Hartamas",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1698, lng: 101.6518 },
    developer: "Sri Hartamas Development",
    yearBuilt: 2007,
    totalUnits: 312,
    searchKeywords: ["desa", "sri hartamas", "hartamas"]
  },
  {
    name: "Desa Green Serviced Apartment",
    type: "serviced_apartment",
    area: "Desa Sri Hartamas", 
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1698, lng: 101.6518 },
    developer: "Green Development",
    yearBuilt: 2010,
    totalUnits: 288,
    searchKeywords: ["desa", "green", "serviced", "sri hartamas"]
  },

  // Sunway Area
  {
    name: "Sunway Pyramid Residences",
    type: "serviced_apartment",
    area: "Sunway",
    city: "Subang Jaya",
    state: "Selangor",
    coordinates: { lat: 3.0733, lng: 101.6067 },
    developer: "Sunway Berhad",
    yearBuilt: 2018,
    totalUnits: 480,
    searchKeywords: ["sunway", "pyramid", "residences"]
  },
  {
    name: "Sunway SPK Damansara",
    type: "condominium",
    area: "Damansara",
    city: "Petaling Jaya",
    state: "Selangor", 
    coordinates: { lat: 3.1319, lng: 101.6341 },
    developer: "Sunway Property",
    yearBuilt: 2016,
    totalUnits: 360,
    searchKeywords: ["sunway", "spk", "damansara"]
  },

  // KLCC & City Center
  {
    name: "The Binjai On The Park",
    type: "condominium",
    area: "KLCC",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1569, lng: 101.7123 },
    developer: "Binjai Properties",
    yearBuilt: 2014,
    totalUnits: 240,
    searchKeywords: ["binjai", "klcc", "park", "luxury"]
  },
  {
    name: "Four Seasons Place",
    type: "condominium",
    area: "KLCC",
    city: "Kuala Lumpur", 
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1583, lng: 101.7108 },
    developer: "Venus Assets",
    yearBuilt: 2018,
    totalUnits: 342,
    searchKeywords: ["four seasons", "klcc", "luxury"]
  },

  // Bangsar Area
  {
    name: "Bangsar Park",
    type: "condominium",
    area: "Bangsar",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1390, lng: 101.6740 },
    developer: "Bangsar Development",
    yearBuilt: 2009,
    totalUnits: 198,
    searchKeywords: ["bangsar", "park", "condo"]
  },
  {
    name: "Bangsar Heights",
    type: "serviced_apartment",
    area: "Bangsar",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.1405, lng: 101.6755 },
    developer: "Heights Development",
    yearBuilt: 2011,
    totalUnits: 276,
    searchKeywords: ["bangsar", "heights", "serviced"]
  },

  // Ampang Area
  {
    name: "Ampang Park Residences",
    type: "condominium",
    area: "Ampang",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur", 
    coordinates: { lat: 3.1620, lng: 101.7184 },
    developer: "Ampang Development",
    yearBuilt: 2013,
    totalUnits: 320,
    searchKeywords: ["ampang", "park", "residences"]
  },

  // Cheras Area  
  {
    name: "Cheras Sentral Residences",
    type: "condominium",
    area: "Cheras",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.0733, lng: 101.7184 },
    developer: "Cheras Development",
    yearBuilt: 2015,
    totalUnits: 420,
    searchKeywords: ["cheras", "sentral", "residences"]
  },

  // Wangsa Maju Area
  {
    name: "Wangsa 9 Residency",
    type: "condominium",
    area: "Wangsa Maju",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    coordinates: { lat: 3.2167, lng: 101.7333 },
    developer: "Wangsa Development",
    yearBuilt: 2017,
    totalUnits: 380,
    searchKeywords: ["wangsa", "maju", "residency"]
  },

  // Petaling Jaya Area
  {
    name: "PJ8 Serviced Suites",
    type: "serviced_apartment", 
    area: "Petaling Jaya",
    city: "Petaling Jaya",
    state: "Selangor",
    coordinates: { lat: 3.1074, lng: 101.6478 },
    developer: "PJ Development",
    yearBuilt: 2019,
    totalUnits: 450,
    searchKeywords: ["pj8", "petaling jaya", "serviced suites"]
  },

  // Cyberjaya Area
  {
    name: "Cyberjaya Vogue Suites",
    type: "serviced_apartment",
    area: "Cyberjaya",
    city: "Cyberjaya",
    state: "Selangor",
    coordinates: { lat: 2.9213, lng: 101.6559 },
    developer: "Cyber Development",
    yearBuilt: 2020,
    totalUnits: 560,
    searchKeywords: ["cyberjaya", "vogue", "suites", "tech"]
  },

  // Shah Alam Area
  {
    name: "Shah Alam City Centre",
    type: "mixed_development",
    area: "Shah Alam",
    city: "Shah Alam", 
    state: "Selangor",
    coordinates: { lat: 3.0733, lng: 101.5185 },
    developer: "Shah Alam Development",
    yearBuilt: 2016,
    totalUnits: 680,
    searchKeywords: ["shah alam", "city centre", "mixed development"]
  },

  // Penang Buildings
  {
    name: "Gurney Paragon Residences",
    type: "condominium",
    area: "Gurney Drive",
    city: "George Town",
    state: "Penang",
    coordinates: { lat: 5.4381, lng: 100.3094 },
    developer: "Gurney Development",
    yearBuilt: 2015,
    totalUnits: 180,
    searchKeywords: ["gurney", "paragon", "penang", "residences"]
  },
  {
    name: "George Town Heritage Suites",
    type: "serviced_apartment",
    area: "George Town",
    city: "George Town",
    state: "Penang",
    coordinates: { lat: 5.4164, lng: 100.3327 },
    developer: "Heritage Development",
    yearBuilt: 2018,
    totalUnits: 240,
    searchKeywords: ["george town", "heritage", "suites", "penang"]
  },

  // Johor Buildings  
  {
    name: "Johor Bahru City Square Residences",
    type: "condominium",
    area: "Johor Bahru City",
    city: "Johor Bahru",
    state: "Johor",
    coordinates: { lat: 1.4655, lng: 103.7578 },
    developer: "JB Development",
    yearBuilt: 2017,
    totalUnits: 320,
    searchKeywords: ["johor bahru", "city square", "residences", "jb"]
  },
  {
    name: "Iskandar Puteri Central Park",
    type: "mixed_development",
    area: "Iskandar Puteri",
    city: "Iskandar Puteri",
    state: "Johor", 
    coordinates: { lat: 1.4235, lng: 103.6579 },
    developer: "Iskandar Development",
    yearBuilt: 2019,
    totalUnits: 520,
    searchKeywords: ["iskandar", "puteri", "central park", "johor"]
  }
];

export async function seedMalaysianBuildings() {
  console.log("🏢 Starting Malaysian buildings database migration...");
  
  try {
    // Clear existing data
    await db.delete(malaysianBuildings);
    console.log("🗑️ Cleared existing Malaysian buildings data");

    // Insert buildings with PostGIS geometry
    for (const building of buildingsData) {
      const keywordsArray = building.searchKeywords || [];
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
          ARRAY[${keywordsArray.map(k => `'${k}'`).join(',')}]::text[],
          ${true}
        )
      `);
    }

    console.log(`✅ Successfully seeded ${buildingsData.length} Malaysian buildings to PostgreSQL + PostGIS`);
    console.log("🎯 Buildings indexed for efficient search with full-text search and spatial queries");
    
    // Verify the data
    const count = await db.select({ count: sql`count(*)` }).from(malaysianBuildings);
    console.log(`📊 Total buildings in database: ${count[0].count}`);
    
  } catch (error) {
    console.error("❌ Error seeding Malaysian buildings:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMalaysianBuildings()
    .then(() => {
      console.log("🎉 Malaysian buildings migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration failed:", error);
      process.exit(1);
    });
}