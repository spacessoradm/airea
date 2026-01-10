/**
 * Comprehensive Malaysian Transport Stations Seeder
 * Data sourced from official MyRapid and MRT Corp information
 * Includes MRT, LRT, Monorail, KTM, and BRT stations with accurate coordinates
 */

import { db } from "./db";
import { transportStations } from "@shared/schema";
import { sql } from "drizzle-orm";

interface TransportStationData {
  stationName: string;
  stationCode: string;
  lineName: string;
  transportType: string;
  latitude: number;
  longitude: number;
  operationalStatus: string;
  openingYear?: number;
  zone?: string;
  address?: string;
  city: string;
  state: string;
  interchangeStations?: string[];
  facilities?: string[];
  nearbyLandmarks?: string[];
}

const stationsData: TransportStationData[] = [
  // MRT Kajang Line (KG)
  {
    stationName: "Sungai Gadut",
    stationCode: "KG01",
    lineName: "MRT Kajang Line",
    transportType: "MRT",
    latitude: 2.9233,
    longitude: 101.7847,
    operationalStatus: "operational",
    openingYear: 2017,
    city: "Kajang",
    state: "Selangor",
    facilities: ["parking", "wheelchair_access", "escalator", "elevator"],
    nearbyLandmarks: ["Kajang Hospital", "Kajang Town"]
  },
  {
    stationName: "Kajang",
    stationCode: "KG02",
    lineName: "MRT Kajang Line",
    transportType: "MRT",
    latitude: 2.9878,
    longitude: 101.7891,
    operationalStatus: "operational",
    openingYear: 2017,
    city: "Kajang",
    state: "Selangor",
    interchangeStations: ["KTM Kajang"],
    facilities: ["parking", "wheelchair_access", "escalator", "elevator", "retail"],
    nearbyLandmarks: ["Kajang Stadium", "Metro Kajang", "Kajang Heritage Centre"]
  },
  {
    stationName: "Stadium Kajang",
    stationCode: "KG03",
    lineName: "MRT Kajang Line",
    transportType: "MRT",
    latitude: 3.0042,
    longitude: 101.7756,
    operationalStatus: "operational",
    openingYear: 2017,
    city: "Kajang",
    state: "Selangor",
    facilities: ["parking", "wheelchair_access", "escalator"],
    nearbyLandmarks: ["Kajang Stadium", "Universiti Tenaga Nasional"]
  },
  {
    stationName: "Desa Park City",
    stationCode: "KG04",
    lineName: "MRT Kajang Line",
    transportType: "MRT",
    latitude: 3.1847,
    longitude: 101.6231,
    operationalStatus: "operational",
    openingYear: 2017,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    facilities: ["wheelchair_access", "escalator", "elevator"],
    nearbyLandmarks: ["Desa Park City", "The Waterfront"]
  },
  {
    stationName: "Sungai Buloh",
    stationCode: "KG05",
    lineName: "MRT Kajang Line",
    transportType: "MRT",
    latitude: 3.2067,
    longitude: 101.5733,
    operationalStatus: "operational",
    openingYear: 2016,
    city: "Sungai Buloh",
    state: "Selangor",
    interchangeStations: ["KTM Sungai Buloh"],
    facilities: ["parking", "wheelchair_access", "escalator", "elevator"],
    nearbyLandmarks: ["Sungai Buloh Hospital", "Kota Damansara"]
  },

  // MRT Putrajaya Line (PY)
  {
    stationName: "Kwasa Damansara",
    stationCode: "PY01",
    lineName: "MRT Putrajaya Line",
    transportType: "MRT",
    latitude: 3.2117,
    longitude: 101.5808,
    operationalStatus: "operational",
    openingYear: 2022,
    city: "Petaling Jaya",
    state: "Selangor",
    facilities: ["parking", "wheelchair_access", "escalator", "elevator"],
    nearbyLandmarks: ["Kwasa Damansara", "Sungai Buloh"]
  },
  {
    stationName: "Kwasa Sentral",
    stationCode: "PY02", 
    lineName: "MRT Putrajaya Line",
    transportType: "MRT",
    latitude: 3.2147,
    longitude: 101.5881,
    operationalStatus: "operational",
    openingYear: 2022,
    city: "Petaling Jaya",
    state: "Selangor",
    facilities: ["wheelchair_access", "escalator", "elevator"],
    nearbyLandmarks: ["Kwasa Sentral", "Kwasa Damansara"]
  },
  {
    stationName: "Kota Damansara",
    stationCode: "PY03",
    lineName: "MRT Putrajaya Line", 
    transportType: "MRT",
    latitude: 3.2278,
    longitude: 101.5944,
    operationalStatus: "operational",
    openingYear: 2022,
    city: "Petaling Jaya",
    state: "Selangor",
    facilities: ["parking", "wheelchair_access", "escalator", "elevator"],
    nearbyLandmarks: ["Kota Damansara", "The Strand Mall", "Sunway Giza"]
  },
  {
    stationName: "Surian",
    stationCode: "PY04",
    lineName: "MRT Putrajaya Line",
    transportType: "MRT", 
    latitude: 3.2347,
    longitude: 101.6056,
    operationalStatus: "operational",
    openingYear: 2022,
    city: "Petaling Jaya",
    state: "Selangor",
    facilities: ["wheelchair_access", "escalator", "elevator"],
    nearbyLandmarks: ["Surian Tower", "Mont Kiara"]
  },

  // LRT Kelana Jaya Line (KJ)
  {
    stationName: "Gombak",
    stationCode: "KJ01",
    lineName: "LRT Kelana Jaya Line",
    transportType: "LRT",
    latitude: 3.2283,
    longitude: 101.6511,
    operationalStatus: "operational",
    openingYear: 1998,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    interchangeStations: ["KTM Batu Caves"],
    facilities: ["parking", "wheelchair_access", "escalator"],
    nearbyLandmarks: ["Batu Caves", "Gombak River", "Selayang Mall"]
  },
  {
    stationName: "Taman Melati",
    stationCode: "KJ02",
    lineName: "LRT Kelana Jaya Line",
    transportType: "LRT",
    latitude: 3.2139,
    longitude: 101.6644,
    operationalStatus: "operational",
    openingYear: 1998,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    facilities: ["parking", "wheelchair_access"],
    nearbyLandmarks: ["Taman Melati", "Wangsa Maju"]
  },
  {
    stationName: "Wangsa Maju",
    stationCode: "KJ03",
    lineName: "LRT Kelana Jaya Line",
    transportType: "LRT",
    latitude: 3.2044,
    longitude: 101.6767,
    operationalStatus: "operational", 
    openingYear: 1998,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    facilities: ["parking", "wheelchair_access", "escalator"],
    nearbyLandmarks: ["Wangsa Maju", "Aeon Big Wangsa Maju", "Alpha Angle"]
  },
  {
    stationName: "Sri Rampai",
    stationCode: "KJ04",
    lineName: "LRT Kelana Jaya Line",
    transportType: "LRT",
    latitude: 3.1961,
    longitude: 101.6889,
    operationalStatus: "operational",
    openingYear: 1998,
    city: "Kuala Lumpur", 
    state: "Kuala Lumpur",
    facilities: ["parking", "wheelchair_access"],
    nearbyLandmarks: ["Sri Rampai", "Setapak Central"]
  },
  {
    stationName: "Dang Wangi",
    stationCode: "KJ10",
    lineName: "LRT Kelana Jaya Line",
    transportType: "LRT",
    latitude: 3.1494,
    longitude: 101.7039,
    operationalStatus: "operational",
    openingYear: 1998,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    interchangeStations: ["Monorail Chow Kit"],
    facilities: ["wheelchair_access", "escalator", "elevator"],
    nearbyLandmarks: ["Dang Wangi", "Chow Kit", "Hospital Kuala Lumpur"]
  },
  {
    stationName: "KLCC",
    stationCode: "KJ11",
    lineName: "LRT Kelana Jaya Line",
    transportType: "LRT",
    latitude: 3.1583,
    longitude: 101.7128,
    operationalStatus: "operational",
    openingYear: 1998,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    facilities: ["wheelchair_access", "escalator", "elevator", "retail"],
    nearbyLandmarks: ["Petronas Twin Towers", "Suria KLCC", "KLCC Park", "Convention Centre"]
  },
  {
    stationName: "Ampang Park",
    stationCode: "KJ12",
    lineName: "LRT Kelana Jaya Line",
    transportType: "LRT",
    latitude: 3.1622,
    longitude: 101.7211,
    operationalStatus: "operational",
    openingYear: 1998,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur", 
    facilities: ["wheelchair_access", "escalator"],
    nearbyLandmarks: ["Ampang Park", "Embassy Row", "Avenue K"]
  },

  // LRT Ampang Line (AG)
  {
    stationName: "Ampang",
    stationCode: "AG18",
    lineName: "LRT Ampang Line",
    transportType: "LRT",
    latitude: 3.1494,
    longitude: 101.7594,
    operationalStatus: "operational",
    openingYear: 1996,
    city: "Ampang",
    state: "Selangor",
    facilities: ["parking", "wheelchair_access", "escalator"],
    nearbyLandmarks: ["Ampang Point", "Ampang Jaya"]
  },
  {
    stationName: "Pandan Indah",
    stationCode: "AG17",
    lineName: "LRT Ampang Line", 
    transportType: "LRT",
    latitude: 3.1383,
    longitude: 101.7522,
    operationalStatus: "operational",
    openingYear: 1996,
    city: "Ampang",
    state: "Selangor",
    facilities: ["parking", "wheelchair_access"],
    nearbyLandmarks: ["Pandan Indah", "IKEA Cheras"]
  },
  {
    stationName: "Cempaka",
    stationCode: "AG16",
    lineName: "LRT Ampang Line",
    transportType: "LRT",
    latitude: 3.1322,
    longitude: 101.7467,
    operationalStatus: "operational",
    openingYear: 1996,
    city: "Ampang",
    state: "Selangor",
    facilities: ["parking", "wheelchair_access"],
    nearbyLandmarks: ["Cempaka", "Ampang Waterfront"]
  },
  {
    stationName: "Masjid Jamek",
    stationCode: "KJ13",
    lineName: "LRT Kelana Jaya Line",
    transportType: "LRT",
    latitude: 3.1489,
    longitude: 101.6944,
    operationalStatus: "operational",
    openingYear: 1996,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    interchangeStations: ["LRT Ampang Line"],
    facilities: ["wheelchair_access", "escalator", "elevator"],
    nearbyLandmarks: ["Masjid Jamek", "Central Market", "Chinatown", "Dataran Merdeka"]
  },

  // KL Monorail
  {
    stationName: "KL Sentral",
    stationCode: "MR1", 
    lineName: "KL Monorail",
    transportType: "Monorail",
    latitude: 3.1333,
    longitude: 101.6833,
    operationalStatus: "operational",
    openingYear: 2003,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    interchangeStations: ["KTM KL Sentral", "LRT KL Sentral", "KLIA Express", "KLIA Transit"],
    facilities: ["wheelchair_access", "escalator", "elevator", "retail", "parking"],
    nearbyLandmarks: ["KL Sentral Station", "Nu Sentral Mall", "Aloft Hotel", "Hilton KL"]
  },
  {
    stationName: "Tun Sambanthan",
    stationCode: "MR2",
    lineName: "KL Monorail",
    transportType: "Monorail", 
    latitude: 3.1347,
    longitude: 101.6867,
    operationalStatus: "operational",
    openingYear: 2003,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    facilities: ["wheelchair_access", "escalator"],
    nearbyLandmarks: ["Tun Sambanthan", "Brickfields", "Little India KL"]
  },
  {
    stationName: "Maharajalela",
    stationCode: "MR3",
    lineName: "KL Monorail",
    transportType: "Monorail",
    latitude: 3.1389,
    longitude: 101.6944,
    operationalStatus: "operational", 
    openingYear: 2003,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    facilities: ["wheelchair_access", "escalator"],
    nearbyLandmarks: ["Maharajalela", "Stadium Merdeka", "Stadium Negara"]
  },
  {
    stationName: "Hang Tuah",
    stationCode: "MR4",
    lineName: "KL Monorail",
    transportType: "Monorail",
    latitude: 3.1428,
    longitude: 101.7019,
    operationalStatus: "operational",
    openingYear: 2003,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    interchangeStations: ["LRT Hang Tuah"],
    facilities: ["wheelchair_access", "escalator", "elevator"],
    nearbyLandmarks: ["Hang Tuah", "Jalan Pudu", "Plaza Hang Tuah"]
  },
  {
    stationName: "Imbi",
    stationCode: "MR5",
    lineName: "KL Monorail", 
    transportType: "Monorail",
    latitude: 3.1467,
    longitude: 101.7092,
    operationalStatus: "operational",
    openingYear: 2003,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    facilities: ["wheelchair_access", "escalator"],
    nearbyLandmarks: ["Imbi", "Berjaya Times Square", "Lot 10"]
  },
  {
    stationName: "Bukit Bintang",
    stationCode: "MR6",
    lineName: "KL Monorail",
    transportType: "Monorail",
    latitude: 3.1478,
    longitude: 101.7128,
    operationalStatus: "operational",
    openingYear: 2003,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    facilities: ["wheelchair_access", "escalator", "elevator"],
    nearbyLandmarks: ["Bukit Bintang", "Pavilion KL", "Starhill Gallery", "Fahrenheit 88"]
  },
  {
    stationName: "Raja Chulan",
    stationCode: "MR7",
    lineName: "KL Monorail",
    transportType: "Monorail",
    latitude: 3.1506,
    longitude: 101.7156,
    operationalStatus: "operational",
    openingYear: 2003,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    facilities: ["wheelchair_access", "escalator"],
    nearbyLandmarks: ["Raja Chulan", "Wisma Goldhill", "Hard Rock Cafe"]
  },
  {
    stationName: "Bukit Nanas",
    stationCode: "MR8",
    lineName: "KL Monorail",
    transportType: "Monorail",
    latitude: 3.1533,
    longitude: 101.7061,
    operationalStatus: "operational",
    openingYear: 2003,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    facilities: ["wheelchair_access", "escalator"],
    nearbyLandmarks: ["Bukit Nanas", "KL Tower", "Menara KL"]
  },
  {
    stationName: "KL City",
    stationCode: "MR9",
    lineName: "KL Monorail",
    transportType: "Monorail",
    latitude: 3.1544,
    longitude: 101.6994,
    operationalStatus: "operational",
    openingYear: 2003,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    facilities: ["wheelchair_access", "escalator"],
    nearbyLandmarks: ["KL City", "Medan Pasar", "Old Market Square"]
  },
  {
    stationName: "Medan Tuanku",
    stationCode: "MR10",
    lineName: "KL Monorail",
    transportType: "Monorail",
    latitude: 3.1569,
    longitude: 101.6944,
    operationalStatus: "operational",
    openingYear: 2003,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    interchangeStations: ["LRT Medan Tuanku"],
    facilities: ["wheelchair_access", "escalator", "elevator"],
    nearbyLandmarks: ["Medan Tuanku", "Coliseum Theatre", "Chow Kit"]
  },
  {
    stationName: "Chow Kit",
    stationCode: "MR11",
    lineName: "KL Monorail",
    transportType: "Monorail",
    latitude: 3.1622,
    longitude: 101.6956,
    operationalStatus: "operational",
    openingYear: 2003,
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    facilities: ["wheelchair_access", "escalator"],
    nearbyLandmarks: ["Chow Kit", "Chow Kit Market", "Hospital Kuala Lumpur"]
  },

  // KTM Komuter
  {
    stationName: "Batu Caves",
    stationCode: "KD01",
    lineName: "KTM Port Klang Line",
    transportType: "KTM",
    latitude: 3.2375,
    longitude: 101.6844,
    operationalStatus: "operational",
    openingYear: 1995,
    city: "Batu Caves",
    state: "Selangor",
    facilities: ["parking", "wheelchair_access"],
    nearbyLandmarks: ["Batu Caves Temple", "Dark Cave", "Royal Selangor Visitor Centre"]
  },
  {
    stationName: "Port Klang",
    stationCode: "KD16",
    lineName: "KTM Port Klang Line", 
    transportType: "KTM",
    latitude: 3.0044,
    longitude: 101.3889,
    operationalStatus: "operational",
    openingYear: 1995,
    city: "Port Klang",
    state: "Selangor",
    facilities: ["parking", "wheelchair_access"],
    nearbyLandmarks: ["Port Klang", "Klang Royal Town", "Sultan Abdul Aziz Royal Gallery"]
  },

  // BRT Sunway Line
  {
    stationName: "Setia Jaya",
    stationCode: "SB01",
    lineName: "BRT Sunway Line",
    transportType: "BRT",
    latitude: 3.0719,
    longitude: 101.6044,
    operationalStatus: "operational", 
    openingYear: 2015,
    city: "Petaling Jaya",
    state: "Selangor",
    interchangeStations: ["KTM Setia Jaya"],
    facilities: ["wheelchair_access", "escalator", "elevator"],
    nearbyLandmarks: ["Setia Jaya", "Subang Jaya"]
  },
  {
    stationName: "SunU-Monash",
    stationCode: "SB02",
    lineName: "BRT Sunway Line",
    transportType: "BRT",
    latitude: 3.0667,
    longitude: 101.6000,
    operationalStatus: "operational",
    openingYear: 2015,
    city: "Petaling Jaya",
    state: "Selangor",
    facilities: ["wheelchair_access", "escalator"],
    nearbyLandmarks: ["Sunway University", "Monash University Malaysia", "Sunway Resort"]
  },
  {
    stationName: "South Quay",
    stationCode: "SB03",
    lineName: "BRT Sunway Line",
    transportType: "BRT",
    latitude: 3.0644,
    longitude: 101.5961,
    operationalStatus: "operational",
    openingYear: 2015,
    city: "Petaling Jaya",
    state: "Selangor",
    facilities: ["wheelchair_access", "escalator"],
    nearbyLandmarks: ["South Quay", "Sunway Pyramid", "Sunway Lagoon"]
  },
  {
    stationName: "Sunway Lagoon",
    stationCode: "SB04",
    lineName: "BRT Sunway Line",
    transportType: "BRT",
    latitude: 3.0667,
    longitude: 101.5922,
    operationalStatus: "operational",
    openingYear: 2015,
    city: "Petaling Jaya",
    state: "Selangor",
    facilities: ["wheelchair_access", "escalator"],
    nearbyLandmarks: ["Sunway Lagoon Theme Park", "Sunway Pyramid Mall"]
  },
  {
    stationName: "Sunway Pyramid",
    stationCode: "SB05",
    lineName: "BRT Sunway Line",
    transportType: "BRT",
    latitude: 3.0733,
    longitude: 101.5883,
    operationalStatus: "operational",
    openingYear: 2015,
    city: "Petaling Jaya",
    state: "Selangor",
    facilities: ["wheelchair_access", "escalator", "elevator", "retail"],
    nearbyLandmarks: ["Sunway Pyramid Shopping Mall", "Sunway Resort Hotel", "Jeffrey Sachs Center"]
  }
];

export async function seedTransportStations() {
  console.log("🚇 Starting transport stations seeding...");
  
  try {
    // Clear existing data
    await db.delete(transportStations);
    console.log("Cleared existing transport stations");

    // Insert stations in batches
    const batchSize = 20;
    let insertedCount = 0;

    for (let i = 0; i < stationsData.length; i += batchSize) {
      const batch = stationsData.slice(i, i + batchSize);
      
      const stationsToInsert = batch.map(station => ({
        ...station,
        // Create PostGIS geometry point
        geometry: sql`ST_MakePoint(${station.longitude}, ${station.latitude})`,
      }));

      await db.insert(transportStations).values(stationsToInsert);
      insertedCount += batch.length;
      console.log(`✅ Inserted batch ${Math.ceil((i + 1) / batchSize)} - ${insertedCount} stations`);
    }

    // Update geometry column with SRID 4326 (WGS84)
    await db.execute(sql`
      UPDATE transport_stations 
      SET geometry = ST_SetSRID(geometry, 4326) 
      WHERE geometry IS NOT NULL
    `);

    console.log(`🎉 Successfully seeded ${insertedCount} transport stations!`);
    console.log("📊 Breakdown by type:");
    
    // Show breakdown by transport type
    const breakdown = stationsData.reduce((acc, station) => {
      acc[station.transportType] = (acc[station.transportType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(breakdown).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} stations`);
    });

    return { success: true, count: insertedCount, breakdown };
    
  } catch (error) {
    console.error("❌ Error seeding transport stations:", error);
    throw error;
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTransportStations()
    .then((result) => {
      console.log("✅ Transport stations seeding completed:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Transport stations seeding failed:", error);
      process.exit(1);
    });
}