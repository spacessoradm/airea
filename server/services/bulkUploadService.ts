import { parse } from 'csv-parse/sync';
import { db } from "../db";
import { properties, bulkUploadSessions } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { InsertProperty, InsertBulkUploadSession } from "@shared/schema";

export class BulkUploadService {
  async processCsvUpload(
    agentId: string, 
    fileName: string, 
    csvContent: string
  ): Promise<{ sessionId: string; errors: string[] }> {
    
    // Parse CSV content
    let records: any[];
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (error) {
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Create upload session
    const [session] = await db
      .insert(bulkUploadSessions)
      .values({
        agentId,
        fileName,
        totalRows: records.length,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        status: 'processing',
        errorLog: [],
      })
      .returning();

    const errors: string[] = [];
    let successfulRows = 0;
    let failedRows = 0;

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 2; // +2 because CSV starts at row 1 and we skip header

      try {
        // Validate and map CSV fields to property schema
        const propertyData = this.mapCsvToProperty(record, agentId, rowNumber);
        
        // Insert property
        await db.insert(properties).values(propertyData);
        successfulRows++;
        
      } catch (error) {
        const errorMessage = `Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        failedRows++;
      }

      // Update session progress
      await db
        .update(bulkUploadSessions)
        .set({
          processedRows: i + 1,
          successfulRows,
          failedRows,
        })
        .where(eq(bulkUploadSessions.id, session.id));
    }

    // Finalize session
    await db
      .update(bulkUploadSessions)
      .set({
        status: errors.length === records.length ? 'failed' : 'completed',
        errorLog: errors,
        completedAt: new Date(),
      })
      .where(eq(bulkUploadSessions.id, session.id));

    return {
      sessionId: session.id,
      errors,
    };
  }

  private mapCsvToProperty(record: any, agentId: string, rowNumber: number): InsertProperty {
    const requiredFields = [
      'title', 'description', 'propertyType', 'listingType', 
      'price', 'bedrooms', 'bathrooms', 'address', 'city', 
      'state', 'postalCode', 'latitude', 'longitude', 'agentLicense'
    ];

    // Check for required fields
    for (const field of requiredFields) {
      if (!record[field] || record[field].toString().trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate numeric fields
    const bedrooms = parseInt(record.bedrooms);
    const bathrooms = parseInt(record.bathrooms);
    
    if (isNaN(bedrooms) || bedrooms < 0) {
      throw new Error('Invalid bedrooms value');
    }
    if (isNaN(bathrooms) || bathrooms < 1) {
      throw new Error('Invalid bathrooms value');
    }

    // Validate coordinates
    const latitude = parseFloat(record.latitude);
    const longitude = parseFloat(record.longitude);
    
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      throw new Error('Invalid latitude coordinate');
    }
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      throw new Error('Invalid longitude coordinate');
    }

    // Validate property type and listing type
    const validPropertyTypes = [
      'apartment', 'condominium', 'house', 'studio', 'townhouse',
      'flat', 'service-residence', 'terraced-house', 'bungalow'
    ];
    const validListingTypes = ['rent', 'sale'];

    if (!validPropertyTypes.includes(record.propertyType.toLowerCase())) {
      throw new Error(`Invalid property type: ${record.propertyType}`);
    }
    if (!validListingTypes.includes(record.listingType.toLowerCase())) {
      throw new Error(`Invalid listing type: ${record.listingType}`);
    }

    // Optional fields with defaults
    const squareFeet = record.squareFeet ? parseInt(record.squareFeet) : null;
    const landSize = record.landSize ? parseInt(record.landSize) : null;
    const propertyCondition = record.propertyCondition || 'good';

    // Parse arrays (comma-separated)
    const amenities = record.amenities ? 
      record.amenities.split(',').map((item: string) => item.trim()).filter((item: string) => item) : 
      [];
    const nearbyLandmarks = record.nearbyLandmarks ? 
      record.nearbyLandmarks.split(',').map((item: string) => item.trim()).filter((item: string) => item) : 
      [];
    const images = record.images ? 
      record.images.split(',').map((item: string) => item.trim()).filter((item: string) => item) : 
      [];

    return {
      title: record.title.trim(),
      description: record.description.trim(),
      propertyType: record.propertyType.toLowerCase(),
      listingType: record.listingType.toLowerCase() as 'rent' | 'sale',
      price: record.price.toString(),
      bedrooms,
      bathrooms,
      squareFeet,
      landSize,
      address: record.address.trim(),
      city: record.city.trim(),
      state: record.state.trim(),
      postalCode: record.postalCode.trim(),
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      propertyCondition: propertyCondition as 'excellent' | 'good' | 'fair' | 'needs_renovation',
      agentLicense: record.agentLicense.trim(),
      amenities,
      nearbyLandmarks,
      images,
      distanceToLRT: record.distanceToLRT || null,
      distanceToMall: record.distanceToMall || null,
      distanceToSchool: record.distanceToSchool || null,
      agentId,
      verificationStatus: 'pending',
      minimumDescriptionMet: record.description.trim().length >= 50,
    };
  }

  async getUploadSession(sessionId: string) {
    const [session] = await db
      .select()
      .from(bulkUploadSessions)
      .where(eq(bulkUploadSessions.id, sessionId))
      .limit(1);

    return session;
  }

  async getAgentUploadSessions(agentId: string) {
    return await db
      .select()
      .from(bulkUploadSessions)
      .where(eq(bulkUploadSessions.agentId, agentId))
      .orderBy(eq(bulkUploadSessions.createdAt, 'desc'));
  }

  generateCsvTemplate(): string {
    const headers = [
      'title',
      'description',
      'propertyType',
      'listingType',
      'price',
      'bedrooms',
      'bathrooms',
      'squareFeet',
      'landSize',
      'address',
      'city',
      'state',
      'postalCode',
      'latitude',
      'longitude',
      'propertyCondition',
      'agentLicense',
      'amenities',
      'nearbyLandmarks',
      'images',
      'distanceToLRT',
      'distanceToMall',
      'distanceToSchool'
    ];

    const sampleData = [
      'Luxury 3BR Condo in Mont Kiara',
      'Beautiful modern condominium with stunning city views and premium amenities including swimming pool and gym',
      'condominium',
      'rent',
      '3500',
      '3',
      '2',
      '1200',
      '',
      'Jalan Kiara 3, Mont Kiara',
      'Kuala Lumpur',
      'Kuala Lumpur',
      '50480',
      '3.1698',
      '101.6502',
      'excellent',
      'REN12345',
      'Swimming Pool,Gym,Security,Parking',
      'IKEA Damansara,Publika Mall,Mont Kiara International School',
      'https://example.com/image1.jpg,https://example.com/image2.jpg',
      '2.5km',
      '1km',
      '800m'
    ];

    return [headers.join(','), sampleData.join(',')].join('\n');
  }
}