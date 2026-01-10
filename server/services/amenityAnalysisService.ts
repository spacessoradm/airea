import { db } from "../db";
import { propertyAmenityScores, properties } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import type { InsertPropertyAmenityScore, PropertyAmenityScore } from "@shared/schema";

export interface NearbyAmenity {
  name: string;
  type: string;
  distance: number; // in meters
  rating?: number;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface AmenityAnalysis {
  walkabilityScore: number;
  transitScore: number;
  schoolScore: number;
  shoppingScore: number;
  healthcareScore: number;
  entertainmentScore: number;
  overallScore: number;
  nearbySchools: NearbyAmenity[];
  nearbyTransit: NearbyAmenity[];
  nearbyShopping: NearbyAmenity[];
  nearbyHealthcare: NearbyAmenity[];
}

export class AmenityAnalysisService {
  // Mock data for nearby amenities (in real implementation, would use Google Places API)
  private getMockNearbyAmenities(lat: number, lng: number, type: string): NearbyAmenity[] {
    const baseAmenities = {
      school: [
        { name: "SMK Damansara Utama", type: "Secondary School", distance: 450, rating: 4.2 },
        { name: "SK Taman Tun Dr Ismail", type: "Primary School", distance: 680, rating: 4.0 },
        { name: "International School of Kuala Lumpur", type: "International School", distance: 1200, rating: 4.5 },
        { name: "Universiti Malaya", type: "University", distance: 3500, rating: 4.3 }
      ],
      transit: [
        { name: "Taman Tun Dr Ismail LRT Station", type: "LRT", distance: 850, rating: 4.1 },
        { name: "Bandar Utama MRT Station", type: "MRT", distance: 1200, rating: 4.3 },
        { name: "Bus Stop - Jalan Damansara", type: "Bus Stop", distance: 200, rating: 3.8 },
        { name: "KTM Segambut Station", type: "KTM", distance: 2100, rating: 3.9 }
      ],
      shopping: [
        { name: "1 Utama Shopping Centre", type: "Shopping Mall", distance: 1500, rating: 4.4 },
        { name: "The Curve", type: "Shopping Mall", distance: 1800, rating: 4.2 },
        { name: "IKEA Damansara", type: "Furniture Store", distance: 2200, rating: 4.3 },
        { name: "Damansara Uptown", type: "Shopping Area", distance: 900, rating: 4.0 }
      ],
      healthcare: [
        { name: "Damansara Specialist Hospital", type: "Private Hospital", distance: 1100, rating: 4.2 },
        { name: "Klinik Kesihatan Damansara", type: "Government Clinic", distance: 600, rating: 3.8 },
        { name: "Gleneagles Kuala Lumpur", type: "Private Hospital", distance: 3200, rating: 4.5 },
        { name: "Pantai Hospital Kuala Lumpur", type: "Private Hospital", distance: 4100, rating: 4.1 }
      ]
    };

    // Add some randomness based on coordinates
    const seed = Math.sin(lat * lng) * 10000;
    const index = Math.abs(Math.floor(seed)) % 4;
    
    return baseAmenities[type as keyof typeof baseAmenities]?.map((amenity, i) => ({
      ...amenity,
      distance: amenity.distance + (index * 50) + (i * 25), // Add variation
      coordinates: {
        lat: lat + (Math.random() - 0.5) * 0.01,
        lng: lng + (Math.random() - 0.5) * 0.01
      }
    })) || [];
  }

  // Calculate walkability score based on nearby amenities
  private calculateWalkabilityScore(amenities: { [key: string]: NearbyAmenity[] }): number {
    let score = 0;
    
    // Schools within 1km
    const nearbySchools = amenities.school?.filter(s => s.distance <= 1000) || [];
    score += Math.min(nearbySchools.length * 15, 30);
    
    // Shopping within 500m
    const nearShopping = amenities.shopping?.filter(s => s.distance <= 500) || [];
    score += Math.min(nearShopping.length * 20, 25);
    
    // Healthcare within 2km
    const nearHealthcare = amenities.healthcare?.filter(h => h.distance <= 2000) || [];
    score += Math.min(nearHealthcare.length * 10, 20);
    
    // Transit within 800m
    const nearTransit = amenities.transit?.filter(t => t.distance <= 800) || [];
    score += Math.min(nearTransit.length * 12, 25);
    
    return Math.min(score, 100);
  }

  // Calculate transit score based on public transport accessibility
  private calculateTransitScore(transitOptions: NearbyAmenity[]): number {
    let score = 0;
    
    // LRT/MRT stations
    const railStations = transitOptions.filter(t => 
      t.type.includes('LRT') || t.type.includes('MRT') || t.type.includes('KTM')
    );
    
    railStations.forEach(station => {
      if (station.distance <= 500) score += 40;
      else if (station.distance <= 1000) score += 25;
      else if (station.distance <= 1500) score += 15;
    });
    
    // Bus stops
    const busStops = transitOptions.filter(t => t.type.includes('Bus'));
    busStops.forEach(stop => {
      if (stop.distance <= 200) score += 20;
      else if (stop.distance <= 500) score += 10;
    });
    
    return Math.min(score, 100);
  }

  // Calculate school score based on educational institutions
  private calculateSchoolScore(schools: NearbyAmenity[]): number {
    let score = 0;
    
    schools.forEach(school => {
      let baseScore = 0;
      
      if (school.type.includes('International')) baseScore = 30;
      else if (school.type.includes('University')) baseScore = 25;
      else if (school.type.includes('Secondary')) baseScore = 20;
      else if (school.type.includes('Primary')) baseScore = 15;
      
      // Distance factor
      if (school.distance <= 500) score += baseScore;
      else if (school.distance <= 1000) score += baseScore * 0.8;
      else if (school.distance <= 2000) score += baseScore * 0.5;
      
      // Rating factor
      if (school.rating) {
        score += (school.rating - 3) * 5; // Bonus for high-rated schools
      }
    });
    
    return Math.min(score, 100);
  }

  // Calculate shopping score based on retail facilities
  private calculateShoppingScore(shopping: NearbyAmenity[]): number {
    let score = 0;
    
    shopping.forEach(shop => {
      let baseScore = 0;
      
      if (shop.type.includes('Shopping Mall')) baseScore = 30;
      else if (shop.type.includes('Shopping Area')) baseScore = 20;
      else baseScore = 15;
      
      if (shop.distance <= 1000) score += baseScore;
      else if (shop.distance <= 2000) score += baseScore * 0.7;
      else if (shop.distance <= 3000) score += baseScore * 0.4;
    });
    
    return Math.min(score, 100);
  }

  // Calculate healthcare score based on medical facilities
  private calculateHealthcareScore(healthcare: NearbyAmenity[]): number {
    let score = 0;
    
    healthcare.forEach(facility => {
      let baseScore = 0;
      
      if (facility.type.includes('Private Hospital')) baseScore = 35;
      else if (facility.type.includes('Government')) baseScore = 25;
      else baseScore = 15;
      
      if (facility.distance <= 1000) score += baseScore;
      else if (facility.distance <= 3000) score += baseScore * 0.7;
      else if (facility.distance <= 5000) score += baseScore * 0.4;
    });
    
    return Math.min(score, 100);
  }

  // Calculate entertainment score based on leisure facilities
  private calculateEntertainmentScore(lat: number, lng: number): number {
    // Mock entertainment score based on location
    // In real implementation, would analyze nearby parks, restaurants, cinemas, etc.
    const baseScore = 60;
    const locationFactor = Math.sin(lat * lng) * 20; // Add some variation
    return Math.max(20, Math.min(100, baseScore + locationFactor));
  }

  // Analyze amenities for a property
  async analyzePropertyAmenities(propertyId: string): Promise<AmenityAnalysis> {
    // Get property details
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (!property) {
      throw new Error('Property not found');
    }

    const lat = parseFloat(property.latitude);
    const lng = parseFloat(property.longitude);

    // Get nearby amenities (mock data for now)
    const nearbySchools = this.getMockNearbyAmenities(lat, lng, 'school');
    const nearbyTransit = this.getMockNearbyAmenities(lat, lng, 'transit');
    const nearbyShopping = this.getMockNearbyAmenities(lat, lng, 'shopping');
    const nearbyHealthcare = this.getMockNearbyAmenities(lat, lng, 'healthcare');

    const amenities = {
      school: nearbySchools,
      transit: nearbyTransit,
      shopping: nearbyShopping,
      healthcare: nearbyHealthcare
    };

    // Calculate individual scores
    const walkabilityScore = this.calculateWalkabilityScore(amenities);
    const transitScore = this.calculateTransitScore(nearbyTransit);
    const schoolScore = this.calculateSchoolScore(nearbySchools);
    const shoppingScore = this.calculateShoppingScore(nearbyShopping);
    const healthcareScore = this.calculateHealthcareScore(nearbyHealthcare);
    const entertainmentScore = this.calculateEntertainmentScore(lat, lng);

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      (walkabilityScore * 0.25) +
      (transitScore * 0.20) +
      (schoolScore * 0.20) +
      (shoppingScore * 0.15) +
      (healthcareScore * 0.15) +
      (entertainmentScore * 0.05)
    );

    const analysis: AmenityAnalysis = {
      walkabilityScore,
      transitScore,
      schoolScore,
      shoppingScore,
      healthcareScore,
      entertainmentScore,
      overallScore,
      nearbySchools,
      nearbyTransit,
      nearbyShopping,
      nearbyHealthcare
    };

    // Save to database
    await this.saveAmenityScores(propertyId, analysis);

    return analysis;
  }

  // Save amenity scores to database
  async saveAmenityScores(propertyId: string, analysis: AmenityAnalysis) {
    const amenityData: InsertPropertyAmenityScore = {
      propertyId,
      walkabilityScore: analysis.walkabilityScore,
      transitScore: analysis.transitScore,
      schoolScore: analysis.schoolScore,
      shoppingScore: analysis.shoppingScore,
      healthcareScore: analysis.healthcareScore,
      entertainmentScore: analysis.entertainmentScore,
      overallScore: analysis.overallScore,
      nearbySchools: analysis.nearbySchools,
      nearbyTransit: analysis.nearbyTransit,
      nearbyShopping: analysis.nearbyShopping,
      nearbyHealthcare: analysis.nearbyHealthcare,
      lastAnalyzed: new Date()
    };

    // Check if analysis exists
    const existing = await db
      .select()
      .from(propertyAmenityScores)
      .where(eq(propertyAmenityScores.propertyId, propertyId))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(propertyAmenityScores)
        .set(amenityData)
        .where(eq(propertyAmenityScores.propertyId, propertyId))
        .returning();
      return updated;
    } else {
      const [inserted] = await db
        .insert(propertyAmenityScores)
        .values(amenityData)
        .returning();
      return inserted;
    }
  }

  // Get amenity scores for a property
  async getPropertyAmenityScores(propertyId: string): Promise<PropertyAmenityScore | null> {
    const [scores] = await db
      .select()
      .from(propertyAmenityScores)
      .where(eq(propertyAmenityScores.propertyId, propertyId))
      .limit(1);

    return scores || null;
  }

  // Get properties ranked by overall amenity score
  async getPropertiesByAmenityScore(limit = 20, minScore = 0) {
    const results = await db
      .select({
        propertyId: propertyAmenityScores.propertyId,
        title: properties.title,
        address: properties.address,
        city: properties.city,
        price: properties.price,
        overallScore: propertyAmenityScores.overallScore,
        walkabilityScore: propertyAmenityScores.walkabilityScore,
        transitScore: propertyAmenityScores.transitScore,
        schoolScore: propertyAmenityScores.schoolScore,
        shoppingScore: propertyAmenityScores.shoppingScore,
        healthcareScore: propertyAmenityScores.healthcareScore,
        entertainmentScore: propertyAmenityScores.entertainmentScore
      })
      .from(propertyAmenityScores)
      .innerJoin(properties, eq(propertyAmenityScores.propertyId, properties.id))
      .where(sql`${propertyAmenityScores.overallScore} >= ${minScore}`)
      .orderBy(sql`${propertyAmenityScores.overallScore} DESC`)
      .limit(limit);

    return results;
  }

  // Batch analyze multiple properties
  async batchAnalyzeProperties(propertyIds: string[]) {
    const results = [];
    
    for (const propertyId of propertyIds) {
      try {
        const analysis = await this.analyzePropertyAmenities(propertyId);
        results.push({ propertyId, analysis, success: true });
      } catch (error) {
        results.push({ propertyId, error: error.message, success: false });
      }
    }
    
    return results;
  }
}

export const amenityAnalysisService = new AmenityAnalysisService();