// Property Type Display Mappings for Malaysian Real Estate
// Maps database property types to proper subsector display names

export interface PropertyTypeInfo {
  displayName: string;
  category: 'residential' | 'commercial' | 'industrial' | 'land';
  description?: string;
}

export const propertyTypeDisplayMap: Record<string, PropertyTypeInfo> = {
  // === RESIDENTIAL SUBSECTORS ===
  
  // Landed Houses
  'house': { displayName: 'Terrace House', category: 'residential' },
  'terraced-house': { displayName: 'Terrace House', category: 'residential' },
  '1-storey-terrace': { displayName: '1-Storey Terrace', category: 'residential' },
  '1.5-storey-terrace': { displayName: '1.5-Storey Terrace', category: 'residential' },
  '2-storey-terrace': { displayName: '2-Storey Terrace', category: 'residential' },
  '2.5-storey-terrace': { displayName: '2.5-Storey Terrace', category: 'residential' },
  '3-storey-terrace': { displayName: '3-Storey Terrace', category: 'residential' },
  'semi-detached-house': { displayName: 'Semi-Detached House', category: 'residential' },
  'bungalow': { displayName: 'Bungalow', category: 'residential' },
  'zero-lot-bungalow': { displayName: 'Zero Lot Bungalow', category: 'residential' },
  'link-bungalow': { displayName: 'Link Bungalow', category: 'residential' },
  'cluster-house': { displayName: 'Cluster House', category: 'residential' },
  'townhouse': { displayName: 'Townhouse', category: 'residential' },
  'twin-villa': { displayName: 'Twin Villa', category: 'residential' },
  
  // High-Rise Residential
  'apartment': { displayName: 'Apartment', category: 'residential' },
  'condominium': { displayName: 'Condominium', category: 'residential' },
  'service-residence': { displayName: 'Serviced Residence', category: 'residential' },
  'flat': { displayName: 'Flat', category: 'residential' },
  'studio': { displayName: 'Studio', category: 'residential' },
  
  // === COMMERCIAL SUBSECTORS ===
  
  // Office Properties
  'commercial': { displayName: 'Commercial Building', category: 'commercial' },
  'office': { displayName: 'Office', category: 'commercial' },
  'shop-office': { displayName: 'Shop Office', category: 'commercial' },
  'sofo': { displayName: 'SOFO (Small Office/Flexible Office)', category: 'commercial' },
  'soho': { displayName: 'SOHO (Small Office/Home Office)', category: 'commercial' },
  'sovo': { displayName: 'SOVO (Small Office/Versatile Office)', category: 'commercial' },
  
  // Retail Properties
  'shop': { displayName: 'Shoplot', category: 'commercial' },
  'retail-space': { displayName: 'Retail Space', category: 'commercial' },
  'retail-office': { displayName: 'Retail Office', category: 'commercial' },
  
  // Commercial Buildings
  'commercial-bungalow': { displayName: 'Commercial Bungalow', category: 'commercial' },
  'commercial-semi-d': { displayName: 'Commercial Semi-D', category: 'commercial' },
  
  // Hospitality
  'hotel-resort': { displayName: 'Hotel/Resort', category: 'commercial' },
  
  // === INDUSTRIAL SUBSECTORS ===
  'industrial': { displayName: 'Industrial Building', category: 'industrial' },
  'warehouse': { displayName: 'Warehouse', category: 'industrial' },
  'factory': { displayName: 'Factory', category: 'industrial' },
  'cluster-factory': { displayName: 'Cluster Factory', category: 'industrial' },
  'semi-d-factory': { displayName: 'Semi-D Factory', category: 'industrial' },
  'detached-factory': { displayName: 'Detached Factory', category: 'industrial' },
  'terrace-factory': { displayName: 'Terrace Factory', category: 'industrial' },
  
  // === LAND SUBSECTORS ===
  'land': { displayName: 'Vacant Land', category: 'land' },
  'residential-land-plot': { displayName: 'Residential Land', category: 'land' },
  'commercial-land': { displayName: 'Commercial Land', category: 'land' },
  'industrial-land': { displayName: 'Industrial Land', category: 'land' },
  'agricultural-land': { displayName: 'Agricultural Land', category: 'land' },
  'bungalow-land': { displayName: 'Bungalow Land', category: 'land' },
};

// Helper function to get display name for a property type
export function getPropertyTypeDisplayName(propertyType: string): string {
  const typeInfo = propertyTypeDisplayMap[propertyType];
  return typeInfo?.displayName || propertyType.charAt(0).toUpperCase() + propertyType.slice(1);
}

// Helper function to get property category
export function getPropertyCategory(propertyType: string): string {
  const typeInfo = propertyTypeDisplayMap[propertyType];
  return typeInfo?.category || 'residential';
}

// Get all property types by category
export function getPropertyTypesByCategory(category: 'residential' | 'commercial' | 'industrial' | 'land') {
  return Object.entries(propertyTypeDisplayMap)
    .filter(([_, info]) => info.category === category)
    .map(([type, info]) => ({ type, displayName: info.displayName }));
}

// Common Malaysian commercial subsectors for search
export const commercialSubsectors = [
  'office',
  'shop-office', 
  'shop',
  'retail-space',
  'sofo',
  'soho', 
  'sovo',
  'commercial-bungalow',
  'commercial-semi-d',
  'hotel-resort'
];

// Common Malaysian residential subsectors for search  
export const residentialSubsectors = [
  'terraced-house',
  'semi-detached-house',
  'bungalow',
  'condominium',
  'apartment',
  'service-residence',
  'townhouse',
  'cluster-house',
  'flat'
];