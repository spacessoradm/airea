import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface CSVPropertyRecord {
  // Common property fields from Malaysian government datasets
  title?: string;
  description?: string;
  property_type?: string;
  price?: string | number;
  bedrooms?: string | number;
  bathrooms?: string | number;
  square_feet?: string | number;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  latitude?: string | number;
  longitude?: string | number;
  listing_type?: string; // rent or sale
  tenure?: string;
  title_type?: string;
  land_title_type?: string;
  parking?: string | number;
  
  // Alternative column names that might appear in Malaysian datasets
  property_name?: string;
  location?: string;
  area?: string;
  district?: string;
  price_rm?: string | number;
  monthly_rent?: string | number;
  selling_price?: string | number;
  land_area?: string | number;
  built_up_area?: string | number;
  built_up_size?: string | number;
  floor_area?: string | number;
  lat?: string | number;
  lng?: string | number;
  lon?: string | number;
  room_count?: string | number;
  bedroom_count?: string | number;
  bathroom_count?: string | number;
  toilet_count?: string | number;
  car_park?: string | number;
  parking_space?: string | number;
  zip_code?: string | number;
  postcode?: string | number;
}

export class CSVPropertyImporter {
  private readonly VALID_PROPERTY_TYPES = [
    'apartment', 'condominium', 'house', 'studio', 'townhouse', 
    'bungalow', 'landed house', 'service-residence', 'office', 
    'shop', 'shop lot', 'retail', 'warehouse', 'factory'
  ];

  private readonly VALID_LISTING_TYPES = ['rent', 'sale'];
  private readonly KL_SELANGOR_AREAS = [
    'kuala lumpur', 'kl', 'petaling jaya', 'pj', 'shah alam', 
    'klang', 'subang jaya', 'ampang', 'cheras', 'damansara', 
    'mont kiara', 'bangsar', 'ttdi', 'usj', 'cyberjaya', 'putrajaya'
  ];

  /**
   * Import CSV file from data.gov.my or other Malaysian government sources
   */
  async importCSVFile(filePath: string, source: string = 'data.gov.my'): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    console.log(`🏢 Starting CSV import from: ${filePath}`);
    console.log(`📊 Source: ${source}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    };

    const records: CSVPropertyRecord[] = [];

    // Parse CSV file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    return new Promise((resolve, reject) => {
      parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf8'
      }, async (err, data: CSVPropertyRecord[]) => {
        if (err) {
          console.error('❌ CSV parsing error:', err);
          reject(err);
          return;
        }

        console.log(`📄 Parsed ${data.length} records from CSV`);

        // Process each record
        for (let i = 0; i < data.length; i++) {
          const record = data[i];
          
          try {
            const processed = this.processRecord(record, i + 1);
            
            if (processed) {
              // Check if it's KL/Selangor property
              if (this.isKLSelangorProperty(processed)) {
                await this.insertProperty(processed);
                results.imported++;
                
                if (results.imported % 100 === 0) {
                  console.log(`✅ Imported ${results.imported} properties...`);
                }
              } else {
                results.skipped++;
              }
            } else {
              results.skipped++;
            }
          } catch (error) {
            const errorMsg = `Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            results.errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
          }
        }

        console.log(`🎉 CSV Import Complete!`);
        console.log(`✅ Imported: ${results.imported} properties`);
        console.log(`⏭️ Skipped: ${results.skipped} properties`);
        console.log(`❌ Errors: ${results.errors.length} records`);

        resolve(results);
      });
    });
  }

  /**
   * Process and normalize a CSV record
   */
  private processRecord(record: CSVPropertyRecord, rowNumber: number): any | null {
    // Extract title
    const title = record.title || record.property_name || `Property ${rowNumber}`;
    
    // Extract property type
    let propertyType = this.normalizePropertyType(
      record.property_type || 'condominium'
    );

    // Extract price
    const price = this.extractPrice(record);
    if (!price || price <= 0) {
      return null; // Skip properties without valid price
    }

    // Extract listing type
    const listingType = this.normalizeListingType(record);

    // Extract location data
    const address = record.address || record.location || '';
    const city = this.normalizeCity(record.city || record.area || record.district || '');
    const state = this.normalizeState(record.state || 'Selangor');
    
    // Extract coordinates
    const latitude = this.parseNumber(record.latitude || record.lat);
    const longitude = this.parseNumber(record.longitude || record.lng || record.lon);

    // Extract property details
    const bedrooms = this.parseNumber(record.bedrooms || record.bedroom_count || record.room_count) || 1;
    const bathrooms = this.parseNumber(record.bathrooms || record.bathroom_count || record.toilet_count) || 1;
    const squareFeet = this.parseNumber(
      record.square_feet || record.built_up_area || record.built_up_size || 
      record.floor_area || record.land_area
    ) || 800;
    const parking = this.parseNumber(record.parking || record.car_park || record.parking_space) || 0;

    // Validate minimum requirements
    if (!title || !address || !city) {
      return null;
    }

    return {
      id: nanoid(),
      title: title.substring(0, 255),
      description: record.description || `${propertyType} for ${listingType} in ${city}`,
      propertyType,
      price,
      bedrooms,
      bathrooms,
      squareFeet,
      address: address.substring(0, 500),
      city,
      state,
      postalCode: this.normalizePostalCode(record.postal_code || record.zip_code || record.postcode),
      latitude,
      longitude,
      listingType,
      status: 'available',
      featured: false,
      agentId: 'govt-data-agent', // Special agent for government data
      parking,
      tenure: record.tenure || 'freehold',
      titleType: record.title_type || 'individual',
      landTitleType: record.land_title_type || 'master-title',
      verificationStatus: 'verified',
      verificationNotes: `Imported from government dataset`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Check if property is in KL/Selangor area
   */
  private isKLSelangorProperty(property: any): boolean {
    const city = property.city.toLowerCase();
    const address = property.address.toLowerCase();
    const state = property.state.toLowerCase();
    
    // Check state
    if (state.includes('selangor') || state.includes('kuala lumpur') || state.includes('kl')) {
      return true;
    }
    
    // Check city and address against known areas
    return this.KL_SELANGOR_AREAS.some(area => 
      city.includes(area) || address.includes(area)
    );
  }

  /**
   * Insert property into database
   */
  private async insertProperty(property: any): Promise<void> {
    await db.execute(
      sql`INSERT INTO properties (
        id, title, description, property_type, price, bedrooms, bathrooms, 
        square_feet, address, city, state, postal_code, latitude, longitude, 
        listing_type, status, featured, agent_id, parking, tenure, title_type, 
        land_title_type, verification_status, verification_notes, created_at, updated_at
      ) VALUES (
        ${property.id}, ${property.title}, ${property.description}, ${property.propertyType}, 
        ${property.price}, ${property.bedrooms}, ${property.bathrooms}, ${property.squareFeet}, 
        ${property.address}, ${property.city}, ${property.state}, ${property.postalCode}, 
        ${property.latitude}, ${property.longitude}, ${property.listingType}, ${property.status}, 
        ${property.featured}, ${property.agentId}, ${property.parking}, ${property.tenure}, 
        ${property.titleType}, ${property.landTitleType}, ${property.verificationStatus}, 
        ${property.verificationNotes}, ${property.createdAt}, ${property.updatedAt}
      ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        updated_at = EXCLUDED.updated_at`
    );
  }

  // Helper methods for data normalization
  private extractPrice(record: CSVPropertyRecord): number {
    const priceFields = [
      record.price, record.price_rm, record.monthly_rent, record.selling_price
    ];
    
    for (const field of priceFields) {
      if (field) {
        const price = this.parseNumber(field);
        if (price && price > 0) return price;
      }
    }
    return 0;
  }

  private normalizePropertyType(type: string): string {
    const normalized = type.toLowerCase().trim();
    
    // Map common variations
    if (normalized.includes('condo') || normalized.includes('condominium')) return 'condominium';
    if (normalized.includes('apartment') || normalized.includes('flat')) return 'apartment';
    if (normalized.includes('house') || normalized.includes('terrace')) return 'house';
    if (normalized.includes('studio')) return 'studio';
    if (normalized.includes('townhouse')) return 'townhouse';
    if (normalized.includes('bungalow')) return 'bungalow';
    if (normalized.includes('office')) return 'office';
    if (normalized.includes('shop')) return 'shop';
    if (normalized.includes('warehouse')) return 'warehouse';
    if (normalized.includes('factory')) return 'factory';
    
    return 'condominium'; // Default
  }

  private normalizeListingType(record: CSVPropertyRecord): string {
    const fields = [record.listing_type, record.monthly_rent ? 'rent' : null, record.selling_price ? 'sale' : null];
    
    for (const field of fields) {
      if (field) {
        const normalized = field.toString().toLowerCase();
        if (normalized.includes('rent') || normalized.includes('rental')) return 'rent';
        if (normalized.includes('sale') || normalized.includes('sell')) return 'sale';
      }
    }
    return 'rent'; // Default
  }

  private normalizeCity(city: string): string {
    if (!city) return 'Kuala Lumpur';
    
    const normalized = city.toLowerCase().trim();
    
    // Normalize common Malaysian city names
    if (normalized.includes('kl') || normalized === 'kuala lumpur') return 'Kuala Lumpur';
    if (normalized.includes('pj') || normalized === 'petaling jaya') return 'Petaling Jaya';
    if (normalized === 'shah alam') return 'Shah Alam';
    if (normalized === 'subang jaya') return 'Subang Jaya';
    if (normalized === 'mont kiara') return 'Mont Kiara';
    
    // Capitalize first letter of each word
    return city.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private normalizeState(state: string): string {
    if (!state) return 'Selangor';
    
    const normalized = state.toLowerCase().trim();
    if (normalized.includes('selangor')) return 'Selangor';
    if (normalized.includes('kuala lumpur') || normalized.includes('kl')) return 'Kuala Lumpur';
    if (normalized.includes('putrajaya')) return 'Putrajaya';
    
    return state;
  }

  private normalizePostalCode(postalCode: any): string | null {
    if (!postalCode) return null;
    const code = postalCode.toString().trim();
    return code.length >= 5 ? code : null;
  }

  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    
    const str = value.toString().replace(/[,\s]/g, ''); // Remove commas and spaces
    const num = parseFloat(str);
    
    return isNaN(num) ? null : num;
  }
}

export const csvPropertyImporter = new CSVPropertyImporter();