import { db } from "./db";
import { states, cities, areas, buildings } from "@shared/schema";

export async function seedLocationData() {
  console.log("🗺️ Seeding comprehensive Malaysian location data...");

  try {
    // 1. Seed States
    const statesData = [
      { name: "Kuala Lumpur", code: "KUL" },
      { name: "Selangor", code: "SEL" },
      { name: "Johor", code: "JHR" },
      { name: "Penang", code: "PNG" },
      { name: "Perak", code: "PRK" },
      { name: "Kedah", code: "KDH" },
      { name: "Kelantan", code: "KTN" },
      { name: "Terengganu", code: "TRG" },
      { name: "Pahang", code: "PHG" },
      { name: "Negeri Sembilan", code: "NSN" },
      { name: "Malacca", code: "MLK" },
      { name: "Sabah", code: "SBH" },
      { name: "Sarawak", code: "SRW" },
      { name: "Putrajaya", code: "PJY" },
      { name: "Labuan", code: "LBN" }
    ];

    const insertedStates = await db.insert(states).values(statesData).returning();
    const stateMap = Object.fromEntries(insertedStates.map(s => [s.name, s.id]));

    // 2. Seed Cities/Townships
    const citiesData = [
      // Kuala Lumpur
      { name: "KLCC", stateId: stateMap["Kuala Lumpur"], latitude: "3.1578", longitude: "101.7123", postalCodePrefix: "50" },
      { name: "Bukit Bintang", stateId: stateMap["Kuala Lumpur"], latitude: "3.1478", longitude: "101.7103", postalCodePrefix: "55" },
      { name: "Bangsar", stateId: stateMap["Kuala Lumpur"], latitude: "3.1319", longitude: "101.6841", postalCodePrefix: "59" },
      { name: "Mont Kiara", stateId: stateMap["Kuala Lumpur"], latitude: "3.1681", longitude: "101.6505", postalCodePrefix: "50" },
      { name: "Sri Hartamas", stateId: stateMap["Kuala Lumpur"], latitude: "3.1640", longitude: "101.6420", postalCodePrefix: "50" },
      { name: "Damansara Heights", stateId: stateMap["Kuala Lumpur"], latitude: "3.1540", longitude: "101.6650", postalCodePrefix: "50" },
      { name: "Ampang", stateId: stateMap["Kuala Lumpur"], latitude: "3.1478", longitude: "101.7580", postalCodePrefix: "68" },
      { name: "Cheras", stateId: stateMap["Kuala Lumpur"], latitude: "3.1050", longitude: "101.7380", postalCodePrefix: "56" },
      { name: "Wangsa Maju", stateId: stateMap["Kuala Lumpur"], latitude: "3.2080", longitude: "101.7290", postalCodePrefix: "53" },
      { name: "Setapak", stateId: stateMap["Kuala Lumpur"], latitude: "3.2010", longitude: "101.6940", postalCodePrefix: "53" },
      { name: "Sentul", stateId: stateMap["Kuala Lumpur"], latitude: "3.1840", longitude: "101.6940", postalCodePrefix: "51" },
      { name: "Kepong", stateId: stateMap["Kuala Lumpur"], latitude: "3.2284", longitude: "101.6324", postalCodePrefix: "52" },
      { name: "Segambut", stateId: stateMap["Kuala Lumpur"], latitude: "3.1920", longitude: "101.6640", postalCodePrefix: "51" },
      { name: "Brickfields", stateId: stateMap["Kuala Lumpur"], latitude: "3.1330", longitude: "101.6890", postalCodePrefix: "50" },
      { name: "Bukit Jalil", stateId: stateMap["Kuala Lumpur"], latitude: "3.0630", longitude: "101.6690", postalCodePrefix: "57" },

      // Selangor
      { name: "Petaling Jaya", stateId: stateMap["Selangor"], latitude: "3.1073", longitude: "101.6041", postalCodePrefix: "46" },
      { name: "Shah Alam", stateId: stateMap["Selangor"], latitude: "3.0733", longitude: "101.5185", postalCodePrefix: "40" },
      { name: "Subang Jaya", stateId: stateMap["Selangor"], latitude: "3.1478", longitude: "101.5820", postalCodePrefix: "47" },
      { name: "Klang", stateId: stateMap["Selangor"], latitude: "3.0448", longitude: "101.4508", postalCodePrefix: "41" },
      { name: "Kajang", stateId: stateMap["Selangor"], latitude: "2.9922", longitude: "101.7901", postalCodePrefix: "43" },
      { name: "Bangi", stateId: stateMap["Selangor"], latitude: "2.9262", longitude: "101.7735", postalCodePrefix: "43" },
      { name: "Serdang", stateId: stateMap["Selangor"], latitude: "3.0319", longitude: "101.7165", postalCodePrefix: "43" },
      { name: "Puchong", stateId: stateMap["Selangor"], latitude: "3.0319", longitude: "101.6195", postalCodePrefix: "47" },
      { name: "Cyberjaya", stateId: stateMap["Selangor"], latitude: "2.9213", longitude: "101.6540", postalCodePrefix: "63" },
      { name: "Sepang", stateId: stateMap["Selangor"], latitude: "2.7297", longitude: "101.7381", postalCodePrefix: "64" },
      { name: "Kota Damansara", stateId: stateMap["Selangor"], latitude: "3.1725", longitude: "101.5938", postalCodePrefix: "47" },
      { name: "Bandar Utama", stateId: stateMap["Selangor"], latitude: "3.1534", longitude: "101.6044", postalCodePrefix: "47" },
      { name: "Mutiara Damansara", stateId: stateMap["Selangor"], latitude: "3.1534", longitude: "101.5947", postalCodePrefix: "47" },
      { name: "Damansara Perdana", stateId: stateMap["Selangor"], latitude: "3.1685", longitude: "101.5520", postalCodePrefix: "47" },
      { name: "Elmina", stateId: stateMap["Selangor"], latitude: "3.1755", longitude: "101.5115", postalCodePrefix: "40" },
      { name: "Setia Alam", stateId: stateMap["Selangor"], latitude: "3.1155", longitude: "101.4440", postalCodePrefix: "40" },
      { name: "Kota Kemuning", stateId: stateMap["Selangor"], latitude: "3.0258", longitude: "101.5332", postalCodePrefix: "40" },

      // Putrajaya
      { name: "Putrajaya", stateId: stateMap["Putrajaya"], latitude: "2.9264", longitude: "101.6964", postalCodePrefix: "62" },

      // Johor
      { name: "Johor Bahru", stateId: stateMap["Johor"], latitude: "1.4927", longitude: "103.7414", postalCodePrefix: "80" },
      { name: "Skudai", stateId: stateMap["Johor"], latitude: "1.5309", longitude: "103.6580", postalCodePrefix: "81" },
      { name: "Nusa Jaya", stateId: stateMap["Johor"], latitude: "1.4236", longitude: "103.6757", postalCodePrefix: "79" },
      
      // Penang
      { name: "Georgetown", stateId: stateMap["Penang"], latitude: "5.4141", longitude: "100.3288", postalCodePrefix: "10" },
      { name: "Gurney Drive", stateId: stateMap["Penang"], latitude: "5.4384", longitude: "100.3094", postalCodePrefix: "10" },
      { name: "Bayan Lepas", stateId: stateMap["Penang"], latitude: "5.2947", longitude: "100.2659", postalCodePrefix: "11" },
    ];

    const insertedCities = await db.insert(cities).values(citiesData).returning();
    const cityMap = Object.fromEntries(insertedCities.map(c => [c.name, c.id]));

    // 3. Seed Areas/Taman
    const areasData = [
      // Mont Kiara Areas
      { name: "Desa Sri Hartamas", cityId: cityMap["Mont Kiara"], areaType: "desa", latitude: "3.1620", longitude: "101.6400", postalCode: "50480" },
      { name: "Plaza Mont Kiara", cityId: cityMap["Mont Kiara"], areaType: "plaza", latitude: "3.1690", longitude: "101.6510", postalCode: "50480" },
      { name: "Solaris Mont Kiara", cityId: cityMap["Mont Kiara"], areaType: "commercial", latitude: "3.1700", longitude: "101.6530", postalCode: "50480" },
      
      // Kepong Areas
      { name: "Taman Fadason", cityId: cityMap["Kepong"], areaType: "taman", latitude: "3.2284", longitude: "101.6324", postalCode: "52100" },
      { name: "Kepong Baru", cityId: cityMap["Kepong"], areaType: "kampung", latitude: "3.2250", longitude: "101.6280", postalCode: "52100" },
      { name: "Bandar Menjalara", cityId: cityMap["Kepong"], areaType: "bandar", latitude: "3.2180", longitude: "101.6200", postalCode: "52200" },
      { name: "Taman Segar", cityId: cityMap["Kepong"], areaType: "taman", latitude: "3.2350", longitude: "101.6400", postalCode: "52100" },
      { name: "Desa Park City", cityId: cityMap["Kepong"], areaType: "desa", latitude: "3.2100", longitude: "101.6150", postalCode: "52200" },

      // Elmina Areas
      { name: "Elmina Green", cityId: cityMap["Elmina"], areaType: "township", latitude: "3.1755", longitude: "101.5115", postalCode: "40160" },
      { name: "Elmina Green Two", cityId: cityMap["Elmina"], areaType: "township", latitude: "3.1780", longitude: "101.5130", postalCode: "40160" },
      { name: "Elmina East", cityId: cityMap["Elmina"], areaType: "township", latitude: "3.1800", longitude: "101.5140", postalCode: "40160" },
      { name: "Elmina Central", cityId: cityMap["Elmina"], areaType: "township", latitude: "3.1825", longitude: "101.5120", postalCode: "40160" },
      { name: "Elmina West", cityId: cityMap["Elmina"], areaType: "township", latitude: "3.1750", longitude: "101.5095", postalCode: "40160" },

      // Damansara Areas
      { name: "Damansara Utama", cityId: cityMap["Kota Damansara"], areaType: "damansara", latitude: "3.1473", longitude: "101.5882", postalCode: "47400" },
      { name: "Bandar Sri Damansara", cityId: cityMap["Kota Damansara"], areaType: "bandar", latitude: "3.1821", longitude: "101.5869", postalCode: "52200" },
      { name: "Damansara Jaya", cityId: cityMap["Kota Damansara"], areaType: "damansara", latitude: "3.1445", longitude: "101.5915", postalCode: "47400" },

      // Petaling Jaya Areas
      { name: "Section 14", cityId: cityMap["Petaling Jaya"], areaType: "section", latitude: "3.1073", longitude: "101.6041", postalCode: "46100" },
      { name: "Section 17", cityId: cityMap["Petaling Jaya"], areaType: "section", latitude: "3.1165", longitude: "101.6125", postalCode: "46400" },
      { name: "Section 21", cityId: cityMap["Petaling Jaya"], areaType: "section", latitude: "3.1205", longitude: "101.6255", postalCode: "46200" },
      { name: "Kelana Jaya", cityId: cityMap["Petaling Jaya"], areaType: "kelana", latitude: "3.1285", longitude: "101.5975", postalCode: "47301" },
      { name: "SS2", cityId: cityMap["Petaling Jaya"], areaType: "ss", latitude: "3.1165", longitude: "101.6245", postalCode: "47300" },
      { name: "Ara Damansara", cityId: cityMap["Petaling Jaya"], areaType: "ara", latitude: "3.1145", longitude: "101.5685", postalCode: "47301" },

      // KLCC Areas
      { name: "Jalan P. Ramlee", cityId: cityMap["KLCC"], areaType: "jalan", latitude: "3.1578", longitude: "101.7123", postalCode: "50250" },
      { name: "Jalan Ampang", cityId: cityMap["KLCC"], areaType: "jalan", latitude: "3.1598", longitude: "101.7143", postalCode: "50450" },
      { name: "Jalan Sultan Ismail", cityId: cityMap["KLCC"], areaType: "jalan", latitude: "3.1558", longitude: "101.7103", postalCode: "50250" },

      // Bangsar Areas
      { name: "Bangsar Baru", cityId: cityMap["Bangsar"], areaType: "bangsar", latitude: "3.1340", longitude: "101.6750", postalCode: "59100" },
      { name: "Jalan Telawi", cityId: cityMap["Bangsar"], areaType: "jalan", latitude: "3.1319", longitude: "101.6841", postalCode: "59100" },
      { name: "Lucky Garden", cityId: cityMap["Bangsar"], areaType: "taman", latitude: "3.1280", longitude: "101.6780", postalCode: "59100" },

      // Cheras Areas
      { name: "Taman Cheras", cityId: cityMap["Cheras"], areaType: "taman", latitude: "3.1050", longitude: "101.7380", postalCode: "56000" },
      { name: "Bandar Tun Razak", cityId: cityMap["Cheras"], areaType: "bandar", latitude: "3.1080", longitude: "101.7420", postalCode: "56000" },
      { name: "Taman Connaught", cityId: cityMap["Cheras"], areaType: "taman", latitude: "3.0920", longitude: "101.7350", postalCode: "56000" }
    ];

    const insertedAreas = await db.insert(areas).values(areasData).returning();
    const areaMap = Object.fromEntries(insertedAreas.map(a => [a.name, a.id]));

    // 4. Seed Buildings/Developments
    const buildingsData = [
      // Mont Kiara Buildings
      { 
        name: "The Peak Residences", 
        areaId: areaMap["Plaza Mont Kiara"], 
        buildingType: "condominium",
        developerName: "UEM Sunrise",
        streetAddress: "Jalan P. Ramlee",
        latitude: "3.1578", 
        longitude: "101.7123",
        totalUnits: 450,
        yearCompleted: 2019,
        amenities: ["Swimming Pool", "Gym", "Security", "Concierge", "Sky Lounge"],
        isVerified: true
      },
      { 
        name: "11 Mont Kiara", 
        areaId: areaMap["Plaza Mont Kiara"], 
        buildingType: "condominium",
        developerName: "Sunrise Berhad",
        streetAddress: "Jalan 11/70A",
        latitude: "3.1695", 
        longitude: "101.6516",
        totalUnits: 380,
        yearCompleted: 2017,
        amenities: ["Swimming Pool", "Gym", "Security", "Tennis Court", "Clubhouse"],
        isVerified: true
      },
      { 
        name: "Arcoris Mont Kiara", 
        areaId: areaMap["Plaza Mont Kiara"], 
        buildingType: "condominium",
        developerName: "UEM Sunrise",
        streetAddress: "Jalan Kiara 1",
        latitude: "3.1685", 
        longitude: "101.6506",
        totalUnits: 320,
        yearCompleted: 2016,
        amenities: ["Swimming Pool", "Gym", "Security", "BBQ Area", "Function Hall"],
        isVerified: true
      },
      { 
        name: "Verve Suites Mont Kiara", 
        areaId: areaMap["Plaza Mont Kiara"], 
        buildingType: "service-apartment",
        developerName: "UEM Sunrise",
        streetAddress: "Jalan Kiara",
        latitude: "3.1695", 
        longitude: "101.6516",
        totalUnits: 280,
        yearCompleted: 2015,
        amenities: ["Swimming Pool", "Gym", "Security", "Sky Garden", "Retail Podium"],
        isVerified: true
      },

      // Kepong Buildings
      { 
        name: "Desa Green Serviced Apartment", 
        areaId: areaMap["Desa Park City"], 
        buildingType: "service-apartment",
        developerName: "Perdana ParkCity",
        streetAddress: "Jalan Intisari Perdana",
        latitude: "3.2100", 
        longitude: "101.6150",
        totalUnits: 350,
        yearCompleted: 2018,
        amenities: ["Swimming Pool", "Gym", "Security", "Playground", "Jogging Track"],
        isVerified: true
      },

      // Elmina Buildings
      { 
        name: "Elmina Green Serviced Residences", 
        areaId: areaMap["Elmina Green"], 
        buildingType: "service-apartment",
        developerName: "Sime Darby Property",
        streetAddress: "Jalan Elmina Green",
        latitude: "3.1755", 
        longitude: "101.5115",
        totalUnits: 400,
        yearCompleted: 2020,
        amenities: ["Swimming Pool", "Gym", "Security", "Retail Mall", "Central Park"],
        isVerified: true
      },

      // Damansara Buildings
      { 
        name: "Twins Damansara", 
        areaId: areaMap["Damansara Utama"], 
        buildingType: "condominium",
        developerName: "Mitraland Group",
        streetAddress: "Jalan Semantan",
        latitude: "3.1515", 
        longitude: "101.6621",
        totalUnits: 200,
        yearCompleted: 2014,
        amenities: ["Swimming Pool", "Gym", "Security", "Garden", "BBQ Area"],
        isVerified: true
      },

      // KLCC Buildings
      { 
        name: "Marc Service Residence", 
        areaId: areaMap["Jalan P. Ramlee"], 
        buildingType: "service-apartment",
        developerName: "Prestige Associates",
        streetAddress: "Jalan P. Ramlee",
        latitude: "3.1578", 
        longitude: "101.7123",
        totalUnits: 240,
        yearCompleted: 2013,
        amenities: ["Swimming Pool", "Gym", "Security", "Concierge", "Sky Bar"],
        isVerified: true
      },
      { 
        name: "Summer Suites Residences", 
        areaId: areaMap["Jalan P. Ramlee"], 
        buildingType: "service-apartment",
        developerName: "Mitraland Group",
        streetAddress: "Jalan Cendana",
        latitude: "3.1590", 
        longitude: "101.7140",
        totalUnits: 180,
        yearCompleted: 2012,
        amenities: ["Swimming Pool", "Gym", "Security", "Function Room", "Sauna"],
        isVerified: true
      },

      // Bangsar Buildings
      { 
        name: "Bangsar Village II", 
        areaId: areaMap["Jalan Telawi"], 
        buildingType: "mixed-development",
        developerName: "Bandar Raya Developments",
        streetAddress: "Jalan Telawi 2",
        latitude: "3.1319", 
        longitude: "101.6841",
        totalUnits: 150,
        yearCompleted: 2003,
        amenities: ["Shopping Mall", "Office Tower", "Parking", "Security", "Retail"],
        isVerified: true
      },
      { 
        name: "KL Gateway Premium Suites", 
        areaId: areaMap["Lucky Garden"], 
        buildingType: "service-apartment",
        developerName: "Sunrise Berhad",
        streetAddress: "Jalan Kerinchi",
        latitude: "3.1200", 
        longitude: "101.6769",
        totalUnits: 280,
        yearCompleted: 2016,
        amenities: ["Swimming Pool", "Gym", "Security", "Sky Garden", "Mall Access"],
        isVerified: true
      },

      // Petaling Jaya Buildings
      { 
        name: "Casa Indah 1", 
        areaId: areaMap["Kelana Jaya"], 
        buildingType: "apartment",
        developerName: "Casa Developments",
        streetAddress: "Jalan PJU 5/1",
        latitude: "3.1285", 
        longitude: "101.5975",
        totalUnits: 120,
        yearCompleted: 2010,
        amenities: ["Swimming Pool", "Security", "Parking", "Playground"],
        isVerified: true
      },
      { 
        name: "Casa Tropicana", 
        areaId: areaMap["SS2"], 
        buildingType: "apartment",
        developerName: "Tropicana Corporation",
        streetAddress: "Jalan SS 2/64",
        latitude: "3.1165", 
        longitude: "101.6245",
        totalUnits: 150,
        yearCompleted: 2009,
        amenities: ["Swimming Pool", "Security", "Parking", "Garden"],
        isVerified: true
      },

      // Commercial Buildings
      { 
        name: "Solaris Dutamas", 
        areaId: areaMap["Desa Sri Hartamas"], 
        buildingType: "mixed-development",
        developerName: "Sunrise Berhad",
        streetAddress: "Jalan Dutamas 1",
        latitude: "3.1700", 
        longitude: "101.6530",
        totalUnits: 300,
        yearCompleted: 2010,
        amenities: ["Shopping Mall", "Office Tower", "Parking", "Security", "Food Court"],
        isVerified: true
      },
      { 
        name: "Publika Solaris Dutamas", 
        areaId: areaMap["Desa Sri Hartamas"], 
        buildingType: "commercial",
        developerName: "Sunrise Berhad",
        streetAddress: "Jalan Dutamas 1",
        latitude: "3.1710", 
        longitude: "101.6540",
        totalUnits: 200,
        yearCompleted: 2012,
        amenities: ["Shopping Gallery", "Cinema", "Restaurants", "Art Gallery", "Events Space"],
        isVerified: true
      }
    ];

    await db.insert(buildings).values(buildingsData).returning();

    console.log("✅ Successfully seeded comprehensive location data:");
    console.log(`   - ${statesData.length} states`);
    console.log(`   - ${citiesData.length} cities/townships`);
    console.log(`   - ${areasData.length} areas/taman`);
    console.log(`   - ${buildingsData.length} buildings/developments`);

  } catch (error) {
    console.error("❌ Error seeding location data:", error);
    throw error;
  }
}