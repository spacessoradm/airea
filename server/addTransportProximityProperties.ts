import { db } from './db';
import { properties } from '@shared/schema';

/**
 * Add realistic properties near major transport stations
 * Covers residential, commercial, and industrial properties
 */
async function addTransportProximityProperties() {
  console.log("Adding properties near transport stations...");

  const newProperties = [
    // RESIDENTIAL PROPERTIES NEAR MRT/LRT
    {
      id: "prop-mrt-klcc-1",
      title: "Luxury 2BR Condo - Walking Distance to KLCC MRT",
      address: "Jalan Ampang, KLCC",
      city: "Kuala Lumpur",
      state: "Kuala Lumpur",
      latitude: "3.1570", // 400m from KLCC MRT
      longitude: "101.7116",
      price: 850000,
      bedrooms: 2,
      bathrooms: 2,
      propertyType: "condominium" as const,
      listingType: "sale" as const,
      squareFeet: 1200,
      amenities: ["swimming_pool", "gym", "security", "parking"],
      agentId: "agent-001",
      images: ["klcc-condo-1.jpg"],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "prop-lrt-ampang-1", 
      title: "Modern 3BR Apartment Near Ampang Park LRT",
      address: "Jalan Ampang, Ampang Park",
      city: "Kuala Lumpur",
      state: "Kuala Lumpur", 
      latitude: "3.1628", // 300m from Ampang Park LRT
      longitude: "101.7108",
      price: 2800,
      bedrooms: 3,
      bathrooms: 2,
      propertyType: "apartment" as const,
      listingType: "rent" as const,
      squareFeet: 1400,
      amenities: ["security", "parking", "near_lrt"],
      agentId: "agent-002",
      images: ["ampang-apt-1.jpg"],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "prop-mrt-bukit-binjai-1",
      title: "Affordable 4BR Terrace House Near MRT Bukit Binjai",
      address: "Jalan Binjai, KLCC",
      city: "Kuala Lumpur", 
      state: "Kuala Lumpur",
      latitude: "3.1546", // 600m from MRT Bukit Binjai
      longitude: "101.7088",
      price: 1250000,
      bedrooms: 4,
      bathrooms: 3,
      propertyType: "house" as const,
      listingType: "sale" as const,
      squareFeet: 2200,
      amenities: ["parking", "garden", "near_mrt"],
      agentId: "agent-003", 
      images: ["binjai-house-1.jpg"],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "prop-lrt-kelana-jaya-1",
      title: "Studio Unit - 5 Min Walk to Kelana Jaya LRT",
      address: "Jalan SS7, Kelana Jaya", 
      city: "Petaling Jaya",
      state: "Selangor",
      latitude: "3.1078", // 400m from Kelana Jaya LRT
      longitude: "101.5891",
      price: 1800,
      bedrooms: 1,
      bathrooms: 1,
      propertyType: "studio" as const,
      listingType: "rent" as const,
      squareFeet: 500,
      amenities: ["furnished", "security", "near_lrt"],
      agentId: "agent-004",
      images: ["kelana-studio-1.jpg"],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "prop-mrt-semantan-1",
      title: "Luxury 3BR Condo Near MRT Semantan",
      address: "Jalan Semantan, Damansara Heights",
      city: "Kuala Lumpur",
      state: "Kuala Lumpur",
      latitude: "3.1497", // 500m from MRT Semantan
      longitude: "101.6711", 
      price: 1680000,
      bedrooms: 3,
      bathrooms: 3,
      propertyType: "condominium" as const,
      listingType: "sale" as const,
      squareFeet: 1800,
      amenities: ["swimming_pool", "gym", "security", "parking", "near_mrt"],
      agentId: "agent-005",
      images: ["semantan-condo-1.jpg"],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    
    // COMMERCIAL PROPERTIES NEAR TRANSPORT
    {
      id: "prop-comm-klcc-1",
      title: "Prime Office Space - KLCC MRT Connected",
      address: "Suria KLCC, Jalan Ampang",
      city: "Kuala Lumpur", 
      state: "Kuala Lumpur",
      latitude: "3.1583", // 200m from KLCC MRT
      longitude: "101.7123",
      price: 12000,
      bedrooms: 0,
      bathrooms: 2,
      propertyType: "commercial" as const,
      listingType: "rent" as const,
      squareFeet: 3000,
      amenities: ["air_conditioning", "elevator", "security", "parking", "mrt_connected"],
      agentId: "agent-006",
      images: ["klcc-office-1.jpg"],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "prop-comm-lrt-masjid-jamek-1",
      title: "Retail Shop Near Masjid Jamek LRT Interchange",
      address: "Jalan Tun Perak, Masjid Jamek",
      city: "Kuala Lumpur",
      state: "Kuala Lumpur", 
      latitude: "3.1488", // 250m from Masjid Jamek LRT
      longitude: "101.6936",
      price: 6500,
      bedrooms: 0,
      bathrooms: 1,
      propertyType: "commercial" as const,
      listingType: "rent" as const,
      squareFeet: 1500,
      amenities: ["street_facing", "high_foot_traffic", "near_lrt"],
      agentId: "agent-007",
      images: ["jamek-retail-1.jpg"],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "prop-comm-kl-sentral-1",
      title: "Modern Office Tower - KL Sentral Transport Hub",
      address: "Brickfields, KL Sentral",
      city: "Kuala Lumpur",
      state: "Kuala Lumpur",
      latitude: "3.1341", // 300m from KL Sentral
      longitude: "101.6868",
      price: 18000,
      bedrooms: 0,
      bathrooms: 3,
      propertyType: "commercial" as const,
      listingType: "rent" as const,
      squareFeet: 4500,
      amenities: ["air_conditioning", "elevator", "security", "parking", "transport_hub"],
      agentId: "agent-008",
      images: ["sentral-office-1.jpg"],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    
    // INDUSTRIAL PROPERTIES NEAR TRANSPORT
    {
      id: "prop-ind-shah-alam-1",
      title: "Logistics Warehouse Near KTM Shah Alam",
      address: "Seksyen 15, Shah Alam",
      city: "Shah Alam",
      state: "Selangor",
      latitude: "3.0738", // 800m from KTM Shah Alam
      longitude: "101.5183",
      price: 25000,
      bedrooms: 0,
      bathrooms: 2,
      propertyType: "industrial" as const,
      listingType: "rent" as const,
      squareFeet: 15000,
      amenities: ["loading_dock", "high_ceiling", "security", "near_ktm"],
      agentId: "agent-009",
      images: ["shah-alam-warehouse-1.jpg"],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "prop-ind-subang-1",
      title: "Manufacturing Facility - Access to KTM Subang Jaya",
      address: "Subang Jaya Industrial Area",
      city: "Subang Jaya",
      state: "Selangor",
      latitude: "3.0487", // 1200m from KTM Subang Jaya  
      longitude: "101.5824",
      price: 2800000,
      bedrooms: 0,
      bathrooms: 4,
      propertyType: "industrial" as const,
      listingType: "sale" as const,
      squareFeet: 35000,
      amenities: ["heavy_machinery", "loading_dock", "security", "power_supply"],
      agentId: "agent-010",
      images: ["subang-factory-1.jpg"],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "prop-ind-port-klang-1",
      title: "Port-Adjacent Warehouse - KTM Port Klang Line",
      address: "Port Klang Industrial Area",
      city: "Port Klang",
      state: "Selangor",
      latitude: "3.0048", // 900m from KTM Port Klang
      longitude: "101.3890",
      price: 35000,
      bedrooms: 0,
      bathrooms: 3,
      propertyType: "industrial" as const,
      listingType: "rent" as const,
      squareFeet: 25000,
      amenities: ["port_access", "loading_dock", "security", "ktm_access"],
      agentId: "agent-011", 
      images: ["port-klang-warehouse-1.jpg"],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    
    // ADDITIONAL STRATEGIC PROPERTIES
    {
      id: "prop-lrt-pandan-indah-1",
      title: "Family-Friendly 3BR Condo Near Pandan Indah LRT",
      address: "Jalan Pandan Indah, Ampang",
      city: "Ampang", 
      state: "Selangor",
      latitude: "3.1368", // 450m from Pandan Indah LRT
      longitude: "101.7426",
      price: 3200,
      bedrooms: 3,
      bathrooms: 2,
      propertyType: "condominium" as const,
      listingType: "rent" as const,
      squareFeet: 1300,
      amenities: ["swimming_pool", "playground", "security", "near_lrt"],
      agentId: "agent-012",
      images: ["pandan-condo-1.jpg"],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "prop-monorail-bukit-nanas-1",
      title: "City Center Studio - Bukit Nanas Monorail",
      address: "Jalan Sultan Ismail, Bukit Nanas",
      city: "Kuala Lumpur",
      state: "Kuala Lumpur",
      latitude: "3.1516", // 300m from Bukit Nanas Monorail
      longitude: "101.7007",
      price: 2200,
      bedrooms: 1,
      bathrooms: 1,
      propertyType: "studio" as const,
      listingType: "rent" as const,
      squareFeet: 450,
      amenities: ["furnished", "city_view", "security", "near_monorail"],
      agentId: "agent-013",
      images: ["bukit-nanas-studio-1.jpg"],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  try {
    // Insert all properties
    await db.insert(properties).values(newProperties);
    
    console.log(`✅ Successfully added ${newProperties.length} properties near transport stations:`);
    console.log(`📍 Residential: 8 properties (condos, apartments, houses, studios)`);
    console.log(`🏢 Commercial: 3 properties (offices, retail)`);
    console.log(`🏭 Industrial: 3 properties (warehouses, manufacturing)`);
    console.log(`🚆 Transport coverage: MRT, LRT, KTM, Monorail stations`);
    console.log(`📏 Distance range: 200m - 1200m from stations`);
    
    return newProperties;
  } catch (error) {
    console.error("Error adding transport proximity properties:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addTransportProximityProperties()
    .then(() => {
      console.log("Properties added successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to add properties:", error);
      process.exit(1);
    });
}

export { addTransportProximityProperties };