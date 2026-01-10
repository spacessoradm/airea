/**
 * Spatial Service for PostGIS-based property distance calculations
 * Using Haversine formula for distance calculations and PostGIS for spatial queries
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateHaversineDistance(
  point1: Coordinates, 
  point2: Coordinates
): number {
  const R = 6371; // Earth's radius in kilometers
  
  // Convert degrees to radians
  const lat1Rad = (point1.lat * Math.PI) / 180;
  const lat2Rad = (point2.lat * Math.PI) / 180;
  const deltaLatRad = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLngRad = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a = 
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in kilometers
}

/**
 * Convert kilometers to approximate travel time in minutes
 * Based on travel mode
 */
export function estimateTravelTimeFromDistance(
  distanceKm: number, 
  travelMode: 'driving' | 'walking' | 'cycling' | 'transit' = 'driving'
): number {
  const speedMap = {
    driving: 20,   // km/h average in Malaysian urban traffic (more realistic)
    walking: 5,    // km/h average walking speed
    cycling: 15,   // km/h average cycling speed  
    transit: 15    // km/h average public transport speed in Malaysia
  };
  
  const speed = speedMap[travelMode];
  return Math.round((distanceKm / speed) * 60); // Convert to minutes
}

/**
 * Filter properties by distance using Haversine formula
 */
export function filterPropertiesByDistance(
  properties: Array<{ 
    id: string; 
    title: string;
    latitude: string | number; 
    longitude: string | number;
    [key: string]: any;
  }>,
  targetLocation: Coordinates,
  maxDistanceKm?: number,
  maxTimeMinutes?: number,
  travelMode: 'driving' | 'walking' | 'cycling' | 'transit' = 'driving'
): Array<{ 
  id: string; 
  title: string;
  latitude: string | number; 
  longitude: string | number;
  distance?: number;
  estimatedTravelTime?: number;
  [key: string]: any;
}> {
  const propertiesWithDistance = properties.map(property => {
    const propLat = typeof property.latitude === 'string' 
      ? parseFloat(property.latitude) 
      : property.latitude;
    const propLng = typeof property.longitude === 'string' 
      ? parseFloat(property.longitude) 
      : property.longitude;
    
    if (!propLat || !propLng) {
      return { ...property, distance: undefined, estimatedTravelTime: undefined };
    }
    
    const distance = calculateHaversineDistance(
      targetLocation, 
      { lat: propLat, lng: propLng }
    );
    
    const estimatedTravelTime = estimateTravelTimeFromDistance(distance, travelMode);
    
    return {
      ...property,
      distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
      estimatedTravelTime
    };
  });
  
  // Filter based on distance or time constraints
  let filteredProperties = propertiesWithDistance.filter(property => {
    if (!property.distance) return false;
    
    if (maxDistanceKm && property.distance > maxDistanceKm) {
      return false;
    }
    
    if (maxTimeMinutes && property.estimatedTravelTime && property.estimatedTravelTime > maxTimeMinutes) {
      return false;
    }
    
    return true;
  });
  
  // Sort by distance (nearest first)
  filteredProperties.sort((a, b) => {
    if (!a.distance || !b.distance) return 0;
    return a.distance - b.distance;
  });
  
  console.log(`Spatial filtering: ${filteredProperties.length}/${properties.length} properties within ${maxDistanceKm ? maxDistanceKm + 'km' : ''} ${maxTimeMinutes ? maxTimeMinutes + ' minutes' : ''} by ${travelMode}`);
  
  return filteredProperties;
}

/**
 * Build PostGIS spatial query for finding properties within distance
 * Returns SQL query string for use with raw queries
 */
export function buildSpatialQuery(
  targetLocation: Coordinates,
  maxDistanceKm: number
): { sql: string, params: [number, number, number] } {
  // Using PostGIS ST_DWithin for efficient spatial search
  // ST_Distance_Sphere calculates actual distance on Earth's surface
  const query = `
    SELECT *, 
           ST_Distance_Sphere(
             ST_GeomFromText('POINT(' || longitude || ' ' || latitude || ')', 4326),
             ST_GeomFromText('POINT($1 $2)', 4326)
           ) / 1000.0 as distance_km
    FROM properties 
    WHERE ST_DWithin(
      ST_GeomFromText('POINT(' || longitude || ' ' || latitude || ')', 4326),
      ST_GeomFromText('POINT($1 $2)', 4326),
      $3
    )
    ORDER BY distance_km ASC
  `;
  
  // Convert km to meters for PostGIS
  const maxDistanceMeters = maxDistanceKm * 1000;
  
  return {
    sql: query,
    params: [targetLocation.lng, targetLocation.lat, maxDistanceMeters] as [number, number, number]
  };
}