#!/usr/bin/env tsx

import { db } from "./db";
import { properties } from "@shared/schema";

type InsertProperty = typeof properties.$inferInsert;

// Property images helper
function getRandomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getPropertyImages(type: string): string[] {
  const houseImages = [
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Modern house exterior
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // House living room
    "https://images.unsplash.com/photo-1556020685-ae41abfc9365?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // House kitchen
    "https://images.unsplash.com/photo-1560449752-3fd4bdbd6b3d?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Master bedroom
    "https://images.unsplash.com/photo-1571055107734-7de6b1988917?ixlib=rb-4.0.3&w=800&h=600&fit=crop"  // House garden
  ];
  
  const commercialImages = [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Office building exterior
    "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Modern office interior
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Office space
    "https://images.unsplash.com/photo-1574180045827-681f8a1a9622?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Retail space
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&w=800&h=600&fit=crop"  // Shopping center
  ];

  const industrialImages = [
    "https://images.unsplash.com/photo-1581090700227-1e37b190418e?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Industrial building
    "https://images.unsplash.com/photo-1586348943529-beaae6c28db9?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Warehouse exterior
    "https://images.unsplash.com/photo-1565610222536-ef125c59da2e?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Factory interior
    "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Industrial complex
    "https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&w=800&h=600&fit=crop"  // Manufacturing facility
  ];
  
  switch (type) {
    case 'house': return houseImages;
    case 'commercial': return commercialImages;
    case 'industrial': return industrialImages;
    default: return houseImages;
  }
}

async function main() {
  try {
    console.log("Adding specific Elmina and commercial/industrial properties...");
    
    // Specific realistic Elmina landed properties for testing
    const elminaProperties: InsertProperty[] = [
      // Elmina Terrace Houses - Sale
      {
        title: "Elmina Landed Terrace - Elmina Green",
        description: "Double storey intermediate terrace house in gated community. 4 bedrooms, 3 bathrooms with modern fittings. Built-up 1,600 sq ft. Move-in ready condition with good neighbourhood.",
        propertyType: "house",
        listingType: "sale",
        price: "680000",
        bedrooms: 4,
        bathrooms: 3,
        squareFeet: 1600,
        address: "Jalan Elmina Utama, Elmina Green",
        city: "Elmina",
        state: "Selangor", 
        postalCode: "47000",
        latitude: "3.1755",
        longitude: "101.5115",
        amenities: ["Security", "Playground", "Parking", "Garden", "24hr Security", "Clubhouse"],
        parking: 2,
        furnished: false,
        availableFrom: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        images: getRandomElements(getPropertyImages("house"), 4),
        contactName: "Agent Sarah Lim",
        contactPhone: "+601-88765432", 
        contactEmail: "sarah@propfinder.my",
        agentId: "agent-elmina-001"
      },
      {
        title: "Elmina Corner Terrace - Elmina Green Two", 
        description: "Double storey corner terrace with extended land. 4+1 bedrooms, 3 bathrooms. Built-up 1,800 sq ft, land area 22x75 ft. Perfect for growing families.",
        propertyType: "house",
        listingType: "sale",
        price: "720000",
        bedrooms: 5,
        bathrooms: 3,
        squareFeet: 1800,
        address: "Jalan Elmina Selatan, Elmina Green Two",
        city: "Elmina",
        state: "Selangor",
        postalCode: "47000", 
        latitude: "3.1780",
        longitude: "101.5130",
        amenities: ["Security", "Playground", "Parking", "Garden", "24hr Security", "BBQ Area", "Jogging Track"],
        parking: 3,
        furnished: false,
        availableFrom: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        images: getRandomElements(getPropertyImages("house"), 4),
        contactName: "Agent David Wong",
        contactPhone: "+603-78901234",
        contactEmail: "david@propfinder.my", 
        agentId: "agent-elmina-002"
      },
      // Elmina Semi-D Houses - Sale
      {
        title: "Elmina Semi-D - Elmina East",
        description: "Double storey semi-detached house with spacious layout. 5 bedrooms, 4 bathrooms. Built-up 2,200 sq ft, land area 40x80 ft. Premium location with garden space.",
        propertyType: "house",
        listingType: "sale", 
        price: "950000",
        bedrooms: 5,
        bathrooms: 4,
        squareFeet: 2200,
        address: "Jalan Elmina Timur 2, Elmina East",
        city: "Elmina",
        state: "Selangor",
        postalCode: "47000",
        latitude: "3.1800", 
        longitude: "101.5140",
        amenities: ["Security", "Playground", "Parking", "Garden", "24hr Security", "Clubhouse", "Swimming Pool", "Tennis Court"],
        parking: 4,
        furnished: true,
        availableFrom: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        images: getRandomElements(getPropertyImages("house"), 5),
        contactName: "Agent Michelle Tan",
        contactPhone: "+601-23456789",
        contactEmail: "michelle@propfinder.my",
        agentId: "agent-elmina-003"
      },
      {
        title: "Elmina Garden Villa - Elmina Central",
        description: "Premium semi-detached villa with garden landscaping. 5+1 bedrooms, 5 bathrooms. Built-up 2,500 sq ft with beautiful garden view. Near Elmina Lakeside Mall.",
        propertyType: "house", 
        listingType: "sale",
        price: "1200000",
        bedrooms: 6,
        bathrooms: 5,
        squareFeet: 2500,
        address: "Jalan Elmina Tengah, Elmina Central",
        city: "Elmina",
        state: "Selangor",
        postalCode: "47000",
        latitude: "3.1825",
        longitude: "101.5120", 
        amenities: ["Security", "Playground", "Parking", "Garden", "24hr Security", "Clubhouse", "Swimming Pool", "Tennis Court", "Gym", "Sauna"],
        parking: 4,
        furnished: true,
        availableFrom: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        images: getRandomElements(getPropertyImages("house"), 5),
        contactName: "Agent Robert Lee",
        contactPhone: "+603-87654321",
        contactEmail: "robert@propfinder.my",
        agentId: "agent-elmina-004"
      }
    ];

    // Add specific commercial and industrial properties
    const commercialIndustrialProperties: InsertProperty[] = [
      // Damansara Commercial 
      {
        title: "Damansara Commerce Centre - Damansara Utama",
        description: "Prime commercial office space in busy Damansara Utama. Ground floor retail unit with high visibility. Perfect for office, clinic, or retail business. Ready for immediate occupancy.",
        propertyType: "commercial",
        listingType: "rent",
        price: "4500",
        bedrooms: 0,
        bathrooms: 2,
        squareFeet: 1200,
        address: "Jalan SS21/37, Damansara Utama",
        city: "Damansara", 
        state: "Selangor",
        postalCode: "47400",
        latitude: "3.1473",
        longitude: "101.5882",
        amenities: ["Parking", "Air Conditioning", "Lift", "24hr Security", "CCTV"],
        parking: 3,
        furnished: false,
        availableFrom: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        images: getRandomElements(getPropertyImages("commercial"), 3),
        contactName: "Agent Helen Ng",  
        contactPhone: "+603-56789012",
        contactEmail: "helen@propfinder.my",
        agentId: "agent-commercial-001"
      },
      // Elmina Commercial
      {
        title: "Elmina Business Hub - Elmina Central",
        description: "Modern commercial unit in new Elmina township. 2-storey shop office with ample parking. Suitable for various business operations. Near residential areas with good foot traffic.",
        propertyType: "commercial",
        listingType: "sale",
        price: "880000", 
        bedrooms: 0,
        bathrooms: 3,
        squareFeet: 1800,
        address: "Jalan Elmina Boulevard, Elmina Central",
        city: "Elmina",
        state: "Selangor",
        postalCode: "47000",
        latitude: "3.1825",
        longitude: "101.5120",
        amenities: ["Parking", "Air Conditioning", "Lift", "24hr Security", "CCTV", "Loading Bay"],
        parking: 5,
        furnished: false,
        availableFrom: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        images: getRandomElements(getPropertyImages("commercial"), 4),
        contactName: "Agent Kevin Lim",
        contactPhone: "+601-34567890", 
        contactEmail: "kevin@propfinder.my",
        agentId: "agent-commercial-002"
      },
      // Damansara Industrial
      {
        title: "Damansara Industrial Complex - Damansara Perdana", 
        description: "Large industrial warehouse with high ceiling and loading dock. Suitable for logistics, storage, or light manufacturing. Good truck access and power supply. Strategic location.",
        propertyType: "industrial",
        listingType: "rent",
        price: "6500",
        bedrooms: 0,
        bathrooms: 2,
        squareFeet: 8000,
        address: "Jalan PJU 8/1, Damansara Perdana",
        city: "Damansara",
        state: "Selangor",
        postalCode: "47820",
        latitude: "3.1685",
        longitude: "101.5520",
        amenities: ["Loading Bay", "24hr Security", "CCTV", "High Ceiling", "Power Supply", "Truck Access"],
        parking: 10,
        furnished: false,
        availableFrom: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        images: getRandomElements(getPropertyImages("industrial"), 4),
        contactName: "Agent Michael Tan",
        contactPhone: "+603-56781234",
        contactEmail: "michael@propfinder.my", 
        agentId: "agent-industrial-001"
      },
      // Elmina Industrial
      {
        title: "Elmina Industrial Park - Elmina West",
        description: "Modern industrial facility in new Elmina development. Suitable for manufacturing, assembly, or distribution. Excellent infrastructure and transportation links. Ready to move in.", 
        propertyType: "industrial",
        listingType: "sale",
        price: "1500000",
        bedrooms: 0,
        bathrooms: 3,
        squareFeet: 12000,
        address: "Jalan Elmina Industri, Elmina West",
        city: "Elmina",
        state: "Selangor",
        postalCode: "47000",
        latitude: "3.1750",
        longitude: "101.5095",
        amenities: ["Loading Bay", "24hr Security", "CCTV", "High Ceiling", "Power Supply", "Truck Access", "Office Space"],
        parking: 15,
        furnished: false,
        availableFrom: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        images: getRandomElements(getPropertyImages("industrial"), 5),
        contactName: "Agent Steven Choo",
        contactPhone: "+601-67890123", 
        contactEmail: "steven@propfinder.my",
        agentId: "agent-industrial-002"
      }
    ];

    // Insert Elmina properties
    console.log(`Inserting ${elminaProperties.length} Elmina properties...`);
    await db.insert(properties).values(elminaProperties);
    
    // Insert commercial/industrial properties  
    console.log(`Inserting ${commercialIndustrialProperties.length} commercial/industrial properties...`);
    await db.insert(properties).values(commercialIndustrialProperties);
    
    console.log(`Successfully added ${elminaProperties.length + commercialIndustrialProperties.length} specific properties!`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to add properties:", error);
    process.exit(1);
  }
}

main();