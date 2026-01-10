import { db } from "./db";
import { properties } from "@shared/schema";

type InsertProperty = typeof properties.$inferInsert;

const propertyTypes = ["apartment", "condominium", "house", "townhouse", "commercial", "industrial", "land"] as const;

const locations = [
  // Mont Kiara Area
  { city: "Mont Kiara", area: "Mont Kiara", lat: 3.1681, lng: 101.6505 },
  { city: "Mont Kiara", area: "Sri Hartamas", lat: 3.1640, lng: 101.6420 },
  { city: "Mont Kiara", area: "Desa Sri Hartamas", lat: 3.1620, lng: 101.6400 },
  { city: "Mont Kiara", area: "Solaris Mont Kiara", lat: 3.1700, lng: 101.6530 },
  { city: "Mont Kiara", area: "Plaza Mont Kiara", lat: 3.1690, lng: 101.6510 },
  
  // Kepong Area
  { city: "Kepong", area: "Taman Fadason", lat: 3.2284, lng: 101.6324 },
  { city: "Kepong", area: "Kepong Baru", lat: 3.2250, lng: 101.6280 },
  { city: "Kepong", area: "Bandar Menjalara", lat: 3.2180, lng: 101.6200 },
  { city: "Kepong", area: "Taman Segar", lat: 3.2350, lng: 101.6400 },
  { city: "Kepong", area: "Desa Park City", lat: 3.2100, lng: 101.6150 },
  
  // Elmina Area (New)
  { city: "Elmina", area: "Elmina Green", lat: 3.1755, lng: 101.5115 },
  { city: "Elmina", area: "Elmina Green Two", lat: 3.1780, lng: 101.5130 },
  { city: "Elmina", area: "Elmina East", lat: 3.1800, lng: 101.5140 },
  { city: "Elmina", area: "Elmina Central", lat: 3.1825, lng: 101.5120 },
  { city: "Elmina", area: "Elmina West", lat: 3.1750, lng: 101.5095 },
  
  // Damansara Area (Expanded)
  { city: "Damansara", area: "Damansara Utama", lat: 3.1473, lng: 101.5882 },
  { city: "Damansara", area: "Damansara Heights", lat: 3.1540, lng: 101.6650 },
  { city: "Damansara", area: "Bandar Sri Damansara", lat: 3.1821, lng: 101.5869 },
  { city: "Damansara", area: "Mutiara Damansara", lat: 3.1534, lng: 101.5947 },
  { city: "Damansara", area: "Damansara Perdana", lat: 3.1685, lng: 101.5520 },
  { city: "Damansara", area: "Damansara Jaya", lat: 3.1445, lng: 101.5915 },
  
  // Petaling Jaya Area (Expanded)
  { city: "Petaling Jaya", area: "PJ Section 14", lat: 3.1073, lng: 101.6041 },
  { city: "Petaling Jaya", area: "PJ Section 17", lat: 3.1165, lng: 101.6125 },
  { city: "Petaling Jaya", area: "PJ Section 21", lat: 3.1205, lng: 101.6255 },
  { city: "Petaling Jaya", area: "Kelana Jaya", lat: 3.1285, lng: 101.5975 },
  { city: "Petaling Jaya", area: "SS2 Petaling Jaya", lat: 3.1165, lng: 101.6245 },
  { city: "Petaling Jaya", area: "Ara Damansara", lat: 3.1145, lng: 101.5685 },
  
  // KL Central Areas
  { city: "Kuala Lumpur", area: "KLCC", lat: 3.1578, lng: 101.7123 },
  { city: "Kuala Lumpur", area: "Bangsar", lat: 3.1319, lng: 101.6841 },
  { city: "Kuala Lumpur", area: "Mid Valley", lat: 3.1190, lng: 101.6769 },
  { city: "Kuala Lumpur", area: "Cheras", lat: 3.1050, lng: 101.7380 },
  { city: "Kuala Lumpur", area: "Ampang", lat: 3.1478, lng: 101.7580 },
  { city: "Kuala Lumpur", area: "Wangsa Maju", lat: 3.2080, lng: 101.7290 },
  { city: "Kuala Lumpur", area: "Setapak", lat: 3.2010, lng: 101.6940 },
  { city: "Kuala Lumpur", area: "Sentul", lat: 3.1840, lng: 101.6940 },
  { city: "Kuala Lumpur", area: "Bukit Jalil", lat: 3.0630, lng: 101.6690 },
  { city: "Kuala Lumpur", area: "Pandan Perdana", lat: 3.1280, lng: 101.7320 }
];

const propertyNames = {
  apartment: [
    "Regalia Apartment", "Vista Apartment", "Park View Apartments", "City Heights", "Metro Suites",
    "Urban Living", "Central Apartments", "Garden Apartment", "Skyline Residence", "Modern Apartment"
  ],
  condominium: [
    "The Peak Residences", "Platinum Suites", "Verve Suites", "11 Mont Kiara", "Arcoris Mont Kiara",
    "Desa Green Serviced Apartment", "KL Gateway Premium Suites", "Marc Service Residence", 
    "Summer Suites Residences", "Twins Damansara", "Nadayu 28", "The Westside Three",
    "Menara Bangkok Bank", "Solaris Dutamas", "Publika Solaris Dutamas"
  ],
  house: [
    "Taman Desa House", "Semi-D Villa", "Corner Lot Terrace", "Double Storey Terrace",
    "Bungalow House", "Cluster House", "End Lot Terrace", "Intermediate Terrace",
    "Gated Community House", "Modern Townhouse", "Elmina Landed Terrace", "Elmina Semi-D",
    "Elmina Corner Terrace", "Elmina Garden Villa"
  ],
  townhouse: [
    "Garden Townhouse", "Executive Townhouse", "Premium Townhouse", "Linked Villa",
    "Cluster Townhouse", "Corner Townhouse", "Modern Townhouse", "Family Townhouse",
    "Spacious Townhouse", "Contemporary Townhouse"
  ],
  commercial: [
    "KLCC Office Tower", "Bangsar Shopping Centre", "Mont Kiara Business Center", "Solaris Dutamas Office",
    "Menara KLCC", "Plaza Mont Kiara Retail", "Sri Hartamas Office Building", "1 Mont Kiara Mall Shop",
    "Publika Shopping Gallery", "Desa ParkCity Commercial Centre", "Damansara Commerce Centre",
    "Elmina Business Hub", "PJ Trade Centre", "Mutiara Damansara Office", "Kelana Square Shop",
    "Ara Damansara Retail Unit", "Section 14 Commercial Centre", "Elmina Central Mall Shop"
  ],
  industrial: [
    "Subang Industrial Park", "Shah Alam Warehouse", "Port Klang Factory", "Sungai Buloh Industrial Unit",
    "Klang Valley Manufacturing Plant", "Selayang Warehouse Complex", "Puchong Industrial Centre",
    "Kajang Industrial Estate", "Rawang Factory Building", "Ampang Industrial Hub",
    "Damansara Industrial Complex", "Elmina Industrial Park", "PJ Manufacturing Hub",
    "Ara Damansara Warehouse", "Kelana Jaya Industrial Unit", "Damansara Logistics Centre"
  ],
  land: [
    "Residential Land Plot", "Commercial Development Land", "Industrial Land Parcel", "Mixed Development Land",
    "Freehold Land Lot", "Agricultural Land Plot", "Strategic Development Land", "Prime Location Land",
    "Corner Lot Development Land", "Future Township Land"
  ]
};

const amenities = [
  "Swimming Pool", "Gym", "Security", "Parking", "Playground", "BBQ Area",
  "Tennis Court", "Squash Court", "Sauna", "Jacuzzi", "Multi-purpose Hall",
  "Badminton Court", "Jogging Track", "Garden", "Clubhouse", "24hr Security",
  "CCTV", "Card Access", "Covered Parking", "Visitor Parking", "Lift",
  "Balcony", "Kitchen Cabinet", "Air Conditioning", "Water Heater"
];

function getRandomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Property images organized by type with realistic house/apartment photos
function getPropertyImages(type: string): string[] {
  const condoImages = [
    "https://images.unsplash.com/photo-1515263487990-61b07816b17c?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Modern condo exterior
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Condo living room
    "https://images.unsplash.com/photo-1560184897-ae75f418493e?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Condo bedroom
    "https://images.unsplash.com/photo-1556020685-ae41abfc9365?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Modern kitchen
    "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?ixlib=rb-4.0.3&w=800&h=600&fit=crop"  // Balcony view
  ];
  
  const apartmentImages = [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Apartment exterior
    "https://images.unsplash.com/photo-1560448204-444dcb171d21?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Apartment living space
    "https://images.unsplash.com/photo-1560449752-3fd4bdbd6b3d?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Apartment bedroom
    "https://images.unsplash.com/photo-1556020685-ae41abfc9365?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Apartment kitchen
    "https://images.unsplash.com/photo-1560448075-bb485b067938?ixlib=rb-4.0.3&w=800&h=600&fit=crop"  // Apartment bathroom
  ];
  
  const houseImages = [
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Modern house exterior
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // House living room
    "https://images.unsplash.com/photo-1556020685-ae41abfc9365?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // House kitchen
    "https://images.unsplash.com/photo-1560449752-3fd4bdbd6b3d?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Master bedroom
    "https://images.unsplash.com/photo-1571055107734-7de6b1988917?ixlib=rb-4.0.3&w=800&h=600&fit=crop"  // House garden
  ];
  
  const townhouseImages = [
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Townhouse exterior
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Townhouse interior
    "https://images.unsplash.com/photo-1560449752-3fd4bdbd6b3d?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Townhouse bedroom
    "https://images.unsplash.com/photo-1556020685-ae41abfc9365?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Townhouse kitchen
    "https://images.unsplash.com/photo-1571055107734-7de6b1988917?ixlib=rb-4.0.3&w=800&h=600&fit=crop"  // Townhouse patio
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

  const landImages = [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Empty land plot
    "https://images.unsplash.com/photo-1574180045827-681f8a1a9622?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Development site
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Agricultural land
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&w=800&h=600&fit=crop", // Land survey
    "https://images.unsplash.com/photo-1487611459768-bd414656ea10?ixlib=rb-4.0.3&w=800&h=600&fit=crop"  // Construction site
  ];
  
  switch (type) {
    case 'house': return houseImages;
    case 'apartment': return apartmentImages;
    case 'townhouse': return townhouseImages;
    case 'commercial': return commercialImages;
    case 'industrial': return industrialImages;
    case 'land': return landImages;
    case 'condominium':
    default: return condoImages;
  }
}

function generatePropertyTitle(type: string, location: { area: string }): string {
  const name = getRandomElement(propertyNames[type as keyof typeof propertyNames]);
  return `${name} - ${location.area}`;
}

function generateDescription(type: string, bedrooms: number, bathrooms: number): string {
  if (type === 'commercial') {
    const descriptions = [
      `Prime commercial space in strategic location. Perfect for retail, office or business use. Excellent foot traffic and visibility.`,
      `Modern commercial unit with professional fittings. Suitable for office, clinic, or retail operations. Ready for immediate occupancy.`,
      `Well-positioned commercial property with great potential. High visibility location with ample parking facilities.`,
      `Strategic commercial space in busy area. Ideal for various business operations. Competitive rental rate in prime location.`,
      `Professional commercial unit with modern amenities. Perfect for expanding businesses or new ventures in established area.`
    ];
    return getRandomElement(descriptions);
  }
  
  if (type === 'industrial') {
    const descriptions = [
      `Spacious industrial facility with high ceiling and loading dock. Suitable for warehouse, manufacturing or logistics operations.`,
      `Well-maintained industrial unit with excellent access. Perfect for storage, distribution or light manufacturing activities.`,
      `Strategic industrial space with good transportation links. Ideal for manufacturing, assembly or warehousing operations.`,
      `Modern industrial facility with adequate power supply. Suitable for various industrial and commercial activities.`,
      `Large industrial unit with flexible layout. Perfect for businesses requiring substantial space and logistics access.`
    ];
    return getRandomElement(descriptions);
  }
  
  if (type === 'land') {
    const descriptions = [
      `Prime development land with excellent potential. Suitable for residential, commercial or mixed development projects.`,
      `Strategic land parcel in growing area. Perfect for property investment or development opportunities.`,
      `Freehold land with good accessibility. Ideal for various development projects or long-term investment.`,
      `Well-located land plot with development potential. Suitable for residential or commercial development.`,
      `Development-ready land in established area. Great opportunity for property developers and investors.`
    ];
    return getRandomElement(descriptions);
  }

  // Original descriptions for residential properties
  const descriptions = [
    `Well-maintained ${type} with ${bedrooms} bedrooms and ${bathrooms} bathrooms. Perfect for families or professionals.`,
    `Spacious ${type} featuring modern fittings and excellent location. ${bedrooms}R${bathrooms}B layout with great amenities.`,
    `Beautiful ${type} in prime location. Fully furnished option available. ${bedrooms} bedrooms, ${bathrooms} bathrooms.`,
    `Cozy ${type} with excellent connectivity and nearby amenities. ${bedrooms}R${bathrooms}B with parking included.`,
    `Modern ${type} with contemporary design. ${bedrooms} bedrooms and ${bathrooms} bathrooms in sought-after area.`
  ];
  return getRandomElement(descriptions);
}

function generatePrice(type: string, bedrooms: number, area: string): string {
  let basePrice = 1500;
  
  // Adjust base price by property type
  if (type === "condominium") basePrice += 500;
  if (type === "house") basePrice += 800;
  if (type === "townhouse") basePrice += 600;
  if (type === "commercial") basePrice = 3000; // Commercial properties have higher base price
  if (type === "industrial") basePrice = 2000; // Industrial properties
  if (type === "land") basePrice = 5000; // Land properties (per acre/month or total price)
  
  // Adjust by bedrooms for residential properties only
  if (!["commercial", "industrial", "land"].includes(type)) {
    basePrice += (bedrooms - 1) * 400;
  }
  
  // Location premium/discount
  if (area.includes("KLCC") || area.includes("Mont Kiara")) basePrice += 1000;
  if (area.includes("Bangsar") || area.includes("Sri Hartamas")) basePrice += 700;
  if (area.includes("Mid Valley") || area.includes("Ampang")) basePrice += 500;
  if (area.includes("Elmina")) basePrice -= 600; // Stronger discount for newer developing area
  
  // Add random variation (-20% to +30%), but favor lower prices for Elmina
  let variation = 0.8 + Math.random() * 0.5;
  if (area.includes("Elmina")) {
    variation = 0.6 + Math.random() * 0.4; // Elmina: -40% to +0% variation for cheaper prices
  }
  const finalPrice = Math.round(basePrice * variation / 50) * 50; // Round to nearest 50
  
  return finalPrice.toString();
}

function generatePropertyData(): InsertProperty[] {
  const properties: InsertProperty[] = [];
  
  for (let i = 0; i < 100; i++) {
    const location = getRandomElement(locations);
    const type = getRandomElement(propertyTypes);
    
    // Set bedrooms and bathrooms based on property type
    let bedrooms: number, bathrooms: number;
    if (type === 'commercial' || type === 'industrial' || type === 'land') {
      bedrooms = 0; // Non-residential properties don't have bedrooms/bathrooms
      bathrooms = 0;
    } else {
      bedrooms = Math.floor(Math.random() * 4) + 1; // 1-4 bedrooms for residential
      bathrooms = Math.min(bedrooms, Math.floor(Math.random() * 3) + 1); // 1-3 bathrooms, max bedrooms
    }
    const parking = Math.floor(Math.random() * 3) + 1; // 1-3 parking spaces
    
    // Add slight random variation to coordinates (reduced spread for Elmina to maintain proximity)
    const coordinateSpread = location.city === "Elmina" ? 0.003 : 0.01; // Smaller spread for Elmina properties
    const lat = location.lat + (Math.random() - 0.5) * coordinateSpread;
    const lng = location.lng + (Math.random() - 0.5) * coordinateSpread;
    
    const listingType = Math.random() > 0.7 ? "sale" : "rent"; // 70% rent, 30% sale
    const basePrice = generatePrice(type, bedrooms, location.area);
    const finalPrice = listingType === "sale" ? (parseFloat(basePrice) * 150).toString() : basePrice; // Sale prices ~150x higher
    
    const property: InsertProperty = {
      title: generatePropertyTitle(type, location),
      description: generateDescription(type, bedrooms, bathrooms),
      propertyType: type,
      listingType,
      price: finalPrice,
      bedrooms,
      bathrooms,
      squareFeet: Math.floor(Math.random() * 1500) + 500, // 500-2000 sq ft
      address: `${Math.floor(Math.random() * 999) + 1}, ${location.area}`,
      city: location.city,
      state: "Kuala Lumpur",
      postalCode: `${50000 + Math.floor(Math.random() * 9999)}`,
      latitude: lat.toString(),
      longitude: lng.toString(),
      amenities: getRandomElements(amenities, Math.floor(Math.random() * 8) + 3), // 3-10 amenities
      parking,
      furnished: Math.random() > 0.5,
      availableFrom: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000), // Available within 90 days
      images: getRandomElements(getPropertyImages(type), 3),
      contactName: `Agent ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
      contactPhone: `+6${Math.floor(Math.random() * 2) === 0 ? '01' : '03'}-${Math.floor(Math.random() * 90000000) + 10000000}`,
      contactEmail: `agent${Math.floor(Math.random() * 999) + 1}@propfinder.my`,
      agentId: "agent-seed-data"
    };
    
    properties.push(property);
  }
  
  return properties;
}

function generateSalePrice(type: string, bedrooms: number, area: string): string {
  let basePrice = 300000; // Starting at RM300k for sale properties
  
  // Adjust base price by property type
  if (type === "condominium") basePrice += 150000;
  if (type === "house") basePrice += 250000;
  if (type === "townhouse") basePrice += 200000;
  if (type === "commercial") basePrice = 800000; // Commercial properties start higher
  if (type === "industrial") basePrice = 600000; // Industrial properties
  if (type === "land") basePrice = 1000000; // Land properties (per acre or total)
  
  // Adjust by bedrooms for residential properties only
  if (!["commercial", "industrial", "land"].includes(type)) {
    basePrice += (bedrooms - 1) * 100000;
  }
  
  // Location premium
  if (area.includes("Mont Kiara") || area.includes("Sri Hartamas")) basePrice += 300000;
  if (area.includes("Damansara")) basePrice += 200000;
  if (area.includes("Kepong")) basePrice += 50000; // More affordable area
  
  // Add random variation (-15% to +25%)
  const variation = 0.85 + Math.random() * 0.4;
  const finalPrice = Math.round(basePrice * variation / 10000) * 10000; // Round to nearest 10k
  
  return finalPrice.toString();
}

function generateSaleListings(): InsertProperty[] {
  const saleLocations = [
    // Kepong Area (35 properties)
    { city: "Kepong", area: "Taman Fadason", lat: 3.2284, lng: 101.6324, count: 12 },
    { city: "Kepong", area: "Kepong Baru", lat: 3.2250, lng: 101.6280, count: 12 },
    { city: "Kepong", area: "Bandar Menjalara", lat: 3.2180, lng: 101.6200, count: 11 },
    
    // Mont Kiara Area (35 properties)
    { city: "Mont Kiara", area: "Mont Kiara", lat: 3.1681, lng: 101.6505, count: 12 },
    { city: "Mont Kiara", area: "Sri Hartamas", lat: 3.1640, lng: 101.6420, count: 12 },
    { city: "Mont Kiara", area: "Desa Sri Hartamas", lat: 3.1620, lng: 101.6400, count: 11 },
    
    // Damansara Area (30 properties)
    { city: "Damansara", area: "Damansara Heights", lat: 3.1540, lng: 101.5947, count: 10 },
    { city: "Damansara", area: "Damansara Perdana", lat: 3.1700, lng: 101.5800, count: 10 },
    { city: "Damansara", area: "Damansara Utama", lat: 3.1450, lng: 101.5850, count: 10 }
  ];
  
  const properties: InsertProperty[] = [];
  
  for (const location of saleLocations) {
    for (let i = 0; i < location.count; i++) {
      const type = getRandomElement(propertyTypes);
      
      // Set bedrooms and bathrooms based on property type  
      let bedrooms: number, bathrooms: number;
      if (type === 'commercial' || type === 'industrial' || type === 'land') {
        bedrooms = 0; // Non-residential properties don't have bedrooms/bathrooms
        bathrooms = 0;
      } else {
        bedrooms = Math.floor(Math.random() * 4) + 2; // 2-5 bedrooms for sale properties
        bathrooms = Math.min(bedrooms, Math.floor(Math.random() * 3) + 2); // 2-4 bathrooms
      }
      const parking = Math.floor(Math.random() * 3) + 2; // 2-4 parking spaces
      
      // Add slight random variation to coordinates
      const lat = location.lat + (Math.random() - 0.5) * 0.008;
      const lng = location.lng + (Math.random() - 0.5) * 0.008;
      
      const property: InsertProperty = {
        title: generatePropertyTitle(type, location),
        description: generateDescription(type, bedrooms, bathrooms),
        propertyType: type,
        listingType: "sale",
        price: generateSalePrice(type, bedrooms, location.area),
        bedrooms,
        bathrooms,
        squareFeet: Math.floor(Math.random() * 2000) + 800, // 800-2800 sq ft for sale properties
        address: `${Math.floor(Math.random() * 999) + 1}, ${location.area}`,
        city: location.city,
        state: "Kuala Lumpur",
        postalCode: `${50000 + Math.floor(Math.random() * 9999)}`,
        latitude: lat.toString(),
        longitude: lng.toString(),
        amenities: getRandomElements(amenities, Math.floor(Math.random() * 10) + 5), // 5-14 amenities for sale properties
        parking,
        furnished: Math.random() > 0.3, // 70% furnished for sale properties
        availableFrom: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000), // Available within 60 days
        images: getRandomElements(getPropertyImages(type), Math.floor(Math.random() * 3) + 3), // 3-5 images
        contactName: `Agent ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
        contactPhone: `+6${Math.floor(Math.random() * 2) === 0 ? '01' : '03'}-${Math.floor(Math.random() * 90000000) + 10000000}`,
        contactEmail: `agent${Math.floor(Math.random() * 999) + 1}@propfinder.my`,
        agentId: "agent-sale-seed"
      };
      
      properties.push(property);
    }
  }
  
  // Add specific realistic Elmina landed properties for testing
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
    // PJ Commercial
    {
      title: "PJ Trade Centre - Section 14",
      description: "Established commercial building in mature PJ Section 14. Office space with professional environment. Excellent accessibility and public transport links. Suitable for corporate offices.",
      propertyType: "commercial",
      listingType: "rent",
      price: "3800",
      bedrooms: 0,
      bathrooms: 2,
      squareFeet: 950,
      address: "Jalan 14/20, Section 14, Petaling Jaya",
      city: "Petaling Jaya",
      state: "Selangor", 
      postalCode: "46100",
      latitude: "3.1073",
      longitude: "101.6041",
      amenities: ["Parking", "Air Conditioning", "Lift", "24hr Security", "CCTV", "Cafeteria"],
      parking: 2,
      furnished: true,
      availableFrom: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      images: getRandomElements(getPropertyImages("commercial"), 3),
      contactName: "Agent Jenny Chan",
      contactPhone: "+603-45678901",
      contactEmail: "jenny@propfinder.my",
      agentId: "agent-commercial-003"
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
    },
    // PJ Industrial
    {
      title: "PJ Manufacturing Hub - Kelana Jaya",
      description: "Established industrial unit in mature Kelana Jaya area. Suitable for light manufacturing, assembly, or warehousing. Good infrastructure with office component included.",
      propertyType: "industrial",
      listingType: "rent",
      price: "5200",
      bedrooms: 0,
      bathrooms: 2,
      squareFeet: 6500,
      address: "Jalan SS7/26, Kelana Jaya, Petaling Jaya", 
      city: "Petaling Jaya",
      state: "Selangor",
      postalCode: "47301",
      latitude: "3.1285",
      longitude: "101.5975",
      amenities: ["Loading Bay", "24hr Security", "CCTV", "Power Supply", "Office Space", "Cafeteria"],
      parking: 8,
      furnished: false,
      availableFrom: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      images: getRandomElements(getPropertyImages("industrial"), 4),
      contactName: "Agent Lisa Wong",
      contactPhone: "+603-78901234",
      contactEmail: "lisa@propfinder.my",
      agentId: "agent-industrial-003"
    }
  ];

  // Add the specific properties to the generated ones
  properties.push(...elminaProperties);
  properties.push(...commercialIndustrialProperties);

  console.log(`Generated ${properties.length} total properties including ${elminaProperties.length} Elmina properties and ${commercialIndustrialProperties.length} commercial/industrial properties`);

  return properties;
}

export async function seedSaleProperties() {
  try {
    console.log("Seeding 100 sale properties for Kepong, Mont Kiara, and Damansara...");
    
    const salePropertyData = generateSaleListings();
    
    // Insert properties in batches of 10 to avoid overwhelming the database
    for (let i = 0; i < salePropertyData.length; i += 10) {
      const batch = salePropertyData.slice(i, i + 10);
      await db.insert(properties).values(batch);
      console.log(`Inserted sale properties ${i + 1}-${Math.min(i + 10, salePropertyData.length)}`);
    }
    
    console.log(`Successfully seeded ${salePropertyData.length} sale properties!`);
    return { success: true, count: salePropertyData.length };
  } catch (error) {
    console.error("Error seeding sale properties:", error);
    throw error;
  }
}

export async function seedProperties() {
  try {
    console.log("Seeding properties including Elmina landed houses and commercial/industrial units...");
    
    const propertyData = generatePropertyData();
    
    // Insert properties in batches of 10 to avoid overwhelming the database
    for (let i = 0; i < propertyData.length; i += 10) {
      const batch = propertyData.slice(i, i + 10);
      await db.insert(properties).values(batch);
      console.log(`Inserted properties ${i + 1}-${Math.min(i + 10, propertyData.length)}`);
    }
    
    console.log(`Successfully seeded ${propertyData.length} properties!`);
    return { success: true, count: propertyData.length };
  } catch (error) {
    console.error("Error seeding properties:", error);
    throw error;
  }
}