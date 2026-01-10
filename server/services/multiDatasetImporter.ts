import fs from 'fs';
import { parse } from 'csv-parse';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface MudahPropertyRecord {
  ads_id: string;
  prop_name: string;
  completion_year: string;
  monthly_rent: string;
  location: string;
  property_type: string;
  rooms: string;
  parking: string;
  bathroom: string;
  size: string;
  furnished: string;
  facilities: string;
  additional_facilities: string;
  region: string;
}

interface KagglePropertyRecord {
  Location: string;
  Price: string;
  Rooms: string;
  Bathrooms: string;
  'Car Parks': string;
  'Property Type': string;
  Size: string;
  Furnishing: string;
}

export class MultiDatasetImporter {
  /**
   * Import the Mudah KL/Selangor rental dataset (19,992 properties)
   */
  async importMudahRentals(filePath: string): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    console.log(`🏠 Starting Mudah rental import from: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    };

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    return new Promise((resolve, reject) => {
      parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf8'
      }, async (err, data: MudahPropertyRecord[]) => {
        if (err) {
          console.error('❌ CSV parsing error:', err);
          reject(err);
          return;
        }

        console.log(`📄 Parsed ${data.length} records from Mudah dataset`);

        // Process each record
        for (let i = 0; i < data.length; i++) {
          const record = data[i];
          
          try {
            const processed = this.processMudahRecord(record, i + 1);
            
            if (processed) {
              await this.insertProperty(processed);
              results.imported++;
              
              if (results.imported % 100 === 0) {
                console.log(`✅ Imported ${results.imported} Mudah properties...`);
              }
            } else {
              results.skipped++;
            }
          } catch (error) {
            const errorMsg = `Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            results.errors.push(errorMsg);
            if (results.errors.length < 10) { // Only log first 10 errors
              console.error(`❌ ${errorMsg}`);
            }
          }
        }

        console.log(`🎉 Mudah Import Complete!`);
        console.log(`✅ Imported: ${results.imported} properties`);
        console.log(`⏭️ Skipped: ${results.skipped} properties`);
        console.log(`❌ Errors: ${results.errors.length} records`);

        resolve(results);
      });
    });
  }

  /**
   * Import the Kaggle property dataset (53,884 properties)
   */
  async importKaggleData(filePath: string): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    console.log(`🏢 Starting Kaggle property import from: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    };

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    return new Promise((resolve, reject) => {
      parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        encoding: 'utf8'
      }, async (err, data: KagglePropertyRecord[]) => {
        if (err) {
          console.error('❌ CSV parsing error:', err);
          reject(err);
          return;
        }

        console.log(`📄 Parsed ${data.length} records from Kaggle dataset`);

        // Process each record
        for (let i = 0; i < data.length; i++) {
          const record = data[i];
          
          try {
            const processed = this.processKaggleRecord(record, i + 1);
            
            if (processed) {
              // Only import KL properties as requested
              if (this.isKLProperty(processed)) {
                await this.insertProperty(processed);
                results.imported++;
                
                if (results.imported % 200 === 0) {
                  console.log(`✅ Imported ${results.imported} Kaggle KL properties...`);
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
            if (results.errors.length < 10) { // Only log first 10 errors
              console.error(`❌ ${errorMsg}`);
            }
          }
        }

        console.log(`🎉 Kaggle Import Complete!`);
        console.log(`✅ Imported: ${results.imported} KL properties`);
        console.log(`⏭️ Skipped: ${results.skipped} properties`);
        console.log(`❌ Errors: ${results.errors.length} records`);

        resolve(results);
      });
    });
  }

  /**
   * Process Mudah rental record into database format
   */
  private processMudahRecord(record: MudahPropertyRecord, rowNumber: number): any | null {
    // Skip if no property name or rent
    if (!record.prop_name || !record.monthly_rent) {
      return null;
    }

    // Parse rental price
    const price = this.parsePrice(record.monthly_rent);
    if (!price || price <= 0) {
      return null;
    }

    // Extract location details
    const location = this.parseLocation(record.location);
    
    // Parse property details
    const rooms = this.parseNumber(record.rooms) || 1;
    const bathrooms = this.parseNumber(record.bathroom) || 1;
    const parking = this.parseNumber(record.parking) || 0;
    const squareFeet = this.parseSquareFeet(record.size);
    
    // Create comprehensive description
    const description = `${record.property_type} for rent in ${location.area}. ${record.furnished}. Facilities: ${record.facilities || 'Basic facilities'}. ${record.additional_facilities || ''}`.substring(0, 1000);

    // Generate coordinates based on location
    const coordinates = this.getLocationCoordinates(location.area);

    return {
      id: nanoid(),
      title: record.prop_name.substring(0, 255),
      description,
      propertyType: this.normalizePropertyType(record.property_type),
      price,
      bedrooms: rooms,
      bathrooms,
      squareFeet,
      address: `${record.prop_name}, ${record.location}`.substring(0, 500),
      city: location.area,
      state: location.state || 'Kuala Lumpur',
      postalCode: null,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      listingType: 'rent',
      status: 'available',
      featured: false,
      agentId: 'mudah-data-agent',
      parking,
      tenure: 'leasehold',
      titleType: 'strata',
      landTitleType: 'residential',
      verificationStatus: 'verified',
      verificationNotes: `Imported from Mudah rental listings. ${record.completion_year ? `Built in ${record.completion_year}` : 'Year not specified'}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Process Kaggle property record into database format
   */
  private processKaggleRecord(record: KagglePropertyRecord, rowNumber: number): any | null {
    // Skip if no location or price
    if (!record.Location || !record.Price) {
      return null;
    }

    // Parse price
    const price = this.parsePrice(record.Price);
    if (!price || price <= 0) {
      return null;
    }

    // Extract location details
    const location = this.parseLocation(record.Location);
    
    // Parse property details
    const rooms = this.parseRoomsComplex(record.Rooms);
    const bathrooms = this.parseNumber(record.Bathrooms) || 1;
    const parking = this.parseNumber(record['Car Parks']) || 0;
    const squareFeet = this.parseSquareFeet(record.Size);
    
    // Create title and description
    const title = `${this.normalizePropertyType(record['Property Type'])} in ${location.area}`;
    const description = `${record['Property Type']} for sale in ${location.area}. ${record.Furnishing || 'Furnishing not specified'}. Size: ${record.Size || 'Size not specified'}`.substring(0, 1000);

    // Generate coordinates based on location
    const coordinates = this.getLocationCoordinates(location.area);

    return {
      id: nanoid(),
      title: title.substring(0, 255),
      description,
      propertyType: this.normalizePropertyType(record['Property Type']),
      price,
      bedrooms: rooms,
      bathrooms,
      squareFeet,
      address: `${location.area}, ${location.state}`.substring(0, 500),
      city: location.area,
      state: location.state || 'Kuala Lumpur',
      postalCode: null,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      listingType: 'sale',
      status: 'available',
      featured: false,
      agentId: 'kaggle-data-agent',
      parking,
      tenure: 'freehold',
      titleType: 'strata',
      landTitleType: 'residential',
      verificationStatus: 'verified',
      verificationNotes: 'Imported from Kaggle property listings dataset',
      createdAt: new Date(),
      updatedAt: new Date()
    };
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

  // Helper methods
  private parsePrice(priceStr: string): number | null {
    if (!priceStr) return null;
    
    // Remove RM, commas, spaces, and "per month"
    const cleaned = priceStr.replace(/RM|,| per month|\s/g, '');
    const num = parseFloat(cleaned);
    
    return isNaN(num) ? null : num;
  }

  private parseLocation(locationStr: string): { area: string; state: string } {
    if (!locationStr) return { area: 'Kuala Lumpur', state: 'Kuala Lumpur' };
    
    // Handle formats like "Kuala Lumpur - Sentul" or "KLCC, Kuala Lumpur"
    const parts = locationStr.split(/[-,]/);
    
    if (parts.length >= 2) {
      const area = parts[parts.length - 1].trim();
      const state = parts[0].trim();
      return { area, state };
    }
    
    return { area: locationStr.trim(), state: 'Kuala Lumpur' };
  }

  private normalizePropertyType(type: string): string {
    if (!type) return 'apartment';
    
    const normalized = type.toLowerCase().trim();
    
    if (normalized.includes('apartment')) return 'apartment';
    if (normalized.includes('condominium') || normalized.includes('condo')) return 'condominium';
    if (normalized.includes('service residence') || normalized.includes('serviced residence')) return 'service-residence';
    if (normalized.includes('bungalow')) return 'bungalow';
    if (normalized.includes('terrace') || normalized.includes('link')) return 'house';
    if (normalized.includes('semi-detached') || normalized.includes('semi detached')) return 'house';
    if (normalized.includes('studio')) return 'studio';
    
    return 'apartment'; // Default
  }

  private parseRoomsComplex(roomsStr: string): number {
    if (!roomsStr) return 1;
    
    // Handle formats like "2+1", "3", "4+2"
    const cleaned = roomsStr.replace(/\+.*/, ''); // Remove +1, +2 etc
    const num = parseInt(cleaned);
    
    return isNaN(num) ? 1 : num;
  }

  private parseSquareFeet(sizeStr: string): number | null {
    if (!sizeStr) return null;
    
    // Extract numbers from size strings like "1,335 sq. ft." or "Built-up : 1,875 sq. ft."
    const matches = sizeStr.match(/[\d,]+/);
    if (matches) {
      const num = parseInt(matches[0].replace(/,/g, ''));
      return isNaN(num) ? null : num;
    }
    
    return null;
  }

  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    
    const str = value.toString().replace(/[,\s]/g, '');
    const num = parseFloat(str);
    
    return isNaN(num) ? null : num;
  }

  private isKLProperty(property: any): boolean {
    const city = property.city.toLowerCase();
    const state = property.state.toLowerCase();
    
    return state.includes('kuala lumpur') || 
           state.includes('selangor') || 
           city.includes('kuala lumpur') ||
           city.includes('kl ');
  }

  private getLocationCoordinates(area: string): { lat: number; lng: number } {
    const areaLower = area.toLowerCase();
    
    // Map specific KL areas to coordinates
    if (areaLower.includes('klcc')) return { lat: 3.1578, lng: 101.7123 };
    if (areaLower.includes('mont kiara')) return { lat: 3.1728, lng: 101.6508 };
    if (areaLower.includes('damansara')) return { lat: 3.1319, lng: 101.6841 };
    if (areaLower.includes('bangsar')) return { lat: 3.1319, lng: 101.6740 };
    if (areaLower.includes('bukit jalil')) return { lat: 3.0653, lng: 101.7072 };
    if (areaLower.includes('cheras')) return { lat: 3.1050, lng: 101.7380 };
    if (areaLower.includes('sentul')) return { lat: 3.1833, lng: 101.6917 };
    if (areaLower.includes('ampang')) return { lat: 3.1478, lng: 101.7620 };
    if (areaLower.includes('kepong')) return { lat: 3.2189, lng: 101.6386 };
    if (areaLower.includes('setapak')) return { lat: 3.2015, lng: 101.7223 };
    if (areaLower.includes('wangsa maju')) return { lat: 3.1981, lng: 101.7342 };
    if (areaLower.includes('dutamas')) return { lat: 3.1667, lng: 101.6833 };
    if (areaLower.includes('taman desa')) return { lat: 3.1167, lng: 101.6833 };
    if (areaLower.includes('kl city')) return { lat: 3.1478, lng: 101.6953 };
    if (areaLower.includes('kl sentral')) return { lat: 3.1341, lng: 101.6864 };
    
    // Default KL coordinates
    return { lat: 3.1390, lng: 101.6869 };
  }
}

export const multiDatasetImporter = new MultiDatasetImporter();