import fs from 'fs';
import { parse } from 'csv-parse';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface KagglePropertyRecord {
  Township: string;
  Area: string;
  State: string;
  Tenure: string;
  Type: string;
  Median_Price: string | number;
  Median_PSF: string | number;
  Transactions: string | number;
}

export class KagglePropertyImporter {
  /**
   * Import Kaggle Malaysia property dataset
   */
  async importKaggleCSV(filePath: string): Promise<{
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
              // Only import KL/Selangor properties as requested
              if (this.isKLSelangorProperty(processed)) {
                await this.insertProperty(processed);
                results.imported++;
                
                if (results.imported % 50 === 0) {
                  console.log(`✅ Imported ${results.imported} KL/Selangor properties...`);
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

        console.log(`🎉 Kaggle Import Complete!`);
        console.log(`✅ Imported: ${results.imported} KL/Selangor properties`);
        console.log(`⏭️ Skipped: ${results.skipped} properties (outside KL/Selangor)`);
        console.log(`❌ Errors: ${results.errors.length} records`);

        resolve(results);
      });
    });
  }

  /**
   * Process and normalize a Kaggle CSV record
   */
  private processKaggleRecord(record: KagglePropertyRecord, rowNumber: number): any | null {
    // Create meaningful title
    const title = `${record.Township}${record.Area ? ` - ${record.Area}` : ''}`;
    
    // Parse property type
    const propertyType = this.normalizePropertyType(record.Type);
    
    // Parse price (from Median_Price)
    const price = this.parseNumber(record.Median_Price);
    if (!price || price <= 0) {
      return null; // Skip properties without valid price
    }

    // Create full address
    const address = `${record.Township}, ${record.Area}, ${record.State}`;
    
    // Extract city from Area or Township
    const city = this.normalizeCity(record.Area || record.Township);
    
    // Parse tenure
    const tenure = this.normalizeTenure(record.Tenure);
    
    // Extract coordinates (set reasonable defaults for KL/Selangor areas)
    const coordinates = this.getAreaCoordinates(record.Area, record.State);

    // Extract property details - make reasonable assumptions
    const bedrooms = this.estimateBedrooms(propertyType, price);
    const bathrooms = this.estimateBathrooms(bedrooms);
    const squareFeet = this.estimateSquareFeet(record.Median_PSF, price);

    return {
      id: nanoid(),
      title: title.substring(0, 255),
      description: `${propertyType} in ${record.Township}, ${record.Area}. ${record.Transactions} recent transactions. Median price per sqft: RM${this.parseNumber(record.Median_PSF) || 0}`,
      propertyType,
      price,
      bedrooms,
      bathrooms,
      squareFeet,
      address: address.substring(0, 500),
      city,
      state: record.State,
      postalCode: null, // Not available in this dataset
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      listingType: 'sale', // Assume sale since these are transaction prices
      status: 'available',
      featured: false,
      agentId: 'kaggle-data-agent', // Special agent for Kaggle data
      parking: this.estimateParking(propertyType),
      tenure,
      titleType: 'individual',
      landTitleType: 'residential',
      verificationStatus: 'verified',
      verificationNotes: `Imported from Kaggle Malaysia House Prices 2025 dataset. Based on ${record.Transactions} transactions.`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Check if property is in KL/Selangor area
   */
  private isKLSelangorProperty(property: any): boolean {
    const state = property.state.toLowerCase();
    return state.includes('selangor') || state.includes('kuala lumpur') || state.includes('kl');
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

  // Helper methods for data normalization and estimation
  private normalizePropertyType(type: string): string {
    const normalized = type.toLowerCase().trim();
    
    if (normalized.includes('terrace')) return 'house';
    if (normalized.includes('semi d') || normalized.includes('semi-d')) return 'house';
    if (normalized.includes('bungalow')) return 'bungalow';
    if (normalized.includes('cluster')) return 'townhouse';
    if (normalized.includes('condo') || normalized.includes('condominium')) return 'condominium';
    if (normalized.includes('service residence')) return 'service-residence';
    if (normalized.includes('apartment') || normalized.includes('flat')) return 'apartment';
    
    return 'house'; // Default for Malaysian properties
  }

  private normalizeCity(area: string): string {
    if (!area) return 'Kuala Lumpur';
    
    const normalized = area.toLowerCase().trim();
    
    // Normalize common Malaysian city/area names
    if (normalized.includes('klang')) return 'Klang';
    if (normalized.includes('subang')) return 'Subang Jaya';
    if (normalized.includes('shah alam')) return 'Shah Alam';
    if (normalized.includes('petaling')) return 'Petaling Jaya';
    if (normalized.includes('ampang')) return 'Ampang';
    if (normalized.includes('cheras')) return 'Cheras';
    if (normalized.includes('kajang')) return 'Kajang';
    if (normalized.includes('selayang')) return 'Selayang';
    if (normalized.includes('kepong')) return 'Kepong';
    if (normalized.includes('damansara')) return 'Petaling Jaya';
    
    // Capitalize first letter of each word
    return area.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private normalizeTenure(tenure: string): string {
    const normalized = tenure.toLowerCase().trim();
    if (normalized.includes('freehold')) return 'freehold';
    if (normalized.includes('leasehold')) return 'leasehold';
    return 'freehold'; // Default
  }

  private getAreaCoordinates(area: string, state: string): { lat: number; lng: number } {
    // Return reasonable coordinates for KL/Selangor areas
    const areaLower = area.toLowerCase();
    
    // Selangor areas
    if (areaLower.includes('klang')) return { lat: 3.0319, lng: 101.4436 };
    if (areaLower.includes('subang')) return { lat: 3.0733, lng: 101.5185 };
    if (areaLower.includes('shah alam')) return { lat: 3.0733, lng: 101.5185 };
    if (areaLower.includes('petaling')) return { lat: 3.1073, lng: 101.6421 };
    if (areaLower.includes('ampang')) return { lat: 3.1478, lng: 101.7620 };
    if (areaLower.includes('kajang')) return { lat: 2.9878, lng: 101.7890 };
    if (areaLower.includes('selayang')) return { lat: 3.2597, lng: 101.6500 };
    if (areaLower.includes('kepong')) return { lat: 3.2189, lng: 101.6386 };
    if (areaLower.includes('damansara')) return { lat: 3.1319, lng: 101.6841 };
    if (areaLower.includes('kapar')) return { lat: 3.1319, lng: 101.3889 };
    if (areaLower.includes('serendah')) return { lat: 3.3667, lng: 101.6000 };
    
    // Default KL coordinates
    return { lat: 3.1390, lng: 101.6869 };
  }

  private estimateBedrooms(propertyType: string, price: number): number {
    if (propertyType === 'studio') return 1;
    if (propertyType === 'service-residence') return 2;
    
    // Estimate based on price ranges for Malaysian properties
    if (price < 300000) return 2;
    if (price < 600000) return 3;
    if (price < 1000000) return 4;
    return 5;
  }

  private estimateBathrooms(bedrooms: number): number {
    if (bedrooms <= 2) return 1;
    if (bedrooms <= 4) return 2;
    return 3;
  }

  private estimateSquareFeet(medianPSF: any, price: number): number {
    const psf = this.parseNumber(medianPSF);
    if (psf && psf > 0) {
      return Math.round(price / psf);
    }
    
    // Fallback estimates for Malaysian properties
    if (price < 300000) return 800;
    if (price < 600000) return 1200;
    if (price < 1000000) return 1800;
    return 2500;
  }

  private estimateParking(propertyType: string): number {
    if (propertyType === 'studio' || propertyType === 'apartment') return 1;
    if (propertyType === 'bungalow') return 3;
    return 2; // Default for houses and condos
  }

  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    
    const str = value.toString().replace(/[,\s]/g, ''); // Remove commas and spaces
    const num = parseFloat(str);
    
    return isNaN(num) ? null : num;
  }
}

export const kagglePropertyImporter = new KagglePropertyImporter();