import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from '../db.js';
import { properties } from '@shared/schema.js';

interface PropertyRecord {
  title: string;
  propertyType: string;
  listingType: 'rent' | 'sale';
  price: number;
  bedrooms: number;
  bathrooms: number;
  parking?: number;
  squareFeet?: number;
  furnishedCondition?: string;
  address: string;
  city: string;
  state: string;
  agentId: string;
  status: string;
  amenities?: string[];
  facilities?: string;
  additionalFacilities?: string;
  source: string;
}

export class ComprehensiveDataImporter {
  private malaysianLocations = new Set([
    // States
    'kuala lumpur', 'selangor', 'johor', 'penang', 'kedah', 'perak', 'negeri sembilan', 
    'melaka', 'malacca', 'pahang', 'terengganu', 'kelantan', 'perlis', 'sabah', 'sarawak',
    // Major cities/areas
    'kl', 'pj', 'petaling jaya', 'shah alam', 'subang jaya', 'klang', 'ampang', 'cheras',
    'mont kiara', 'bangsar', 'damansara', 'ttdi', 'sri hartamas', 'bukit jalil', 'sunway',
    'cyberjaya', 'putrajaya', 'genting', 'ipoh', 'johor bahru', 'jb', 'georgetown', 'penang island'
  ]);

  /**
   * Malaysia geographic filtering - Option B implementation
   */
  private isMalaysianLocation(location: string, city?: string, state?: string): boolean {
    const locations = [location, city, state].filter(Boolean).map(l => l?.toLowerCase() || '');
    return locations.some(loc => 
      this.malaysianLocations.has(loc) || 
      loc.includes('malaysia') ||
      loc.includes('kuala lumpur') ||
      loc.includes('selangor') ||
      // Pattern matching for Malaysian areas
      /\bkl\b|\bpj\b|\bjb\b/.test(loc) ||
      /damansara|mont kiara|bangsar|cheras|ampang|subang|klang|shah alam/.test(loc)
    );
  }

  /**
   * Normalize property type to match enum values
   */
  private normalizePropertyType(type: string): string {
    const normalized = type.toLowerCase().trim();
    
    if (normalized.includes('condo') || normalized.includes('condominium')) return 'condominium';
    if (normalized.includes('apartment') || normalized.includes('flat')) return 'apartment';
    if (normalized.includes('service') && normalized.includes('residence')) return 'service-residence';
    if (normalized.includes('house') || normalized.includes('bungalow') || normalized.includes('terrace')) return 'house';
    if (normalized.includes('townhouse') || normalized.includes('town house')) return 'townhouse';
    if (normalized.includes('studio')) return 'studio';
    if (normalized.includes('commercial') || normalized.includes('office') || normalized.includes('shop')) return 'commercial';
    if (normalized.includes('industrial') || normalized.includes('warehouse') || normalized.includes('factory')) return 'industrial';
    if (normalized.includes('land') || normalized.includes('lot')) return 'land';
    
    // Default fallback
    return 'condominium';
  }

  /**
   * Normalize furnished condition
   */
  private normalizeFurnished(furnished: string): string {
    const normalized = furnished?.toLowerCase() || '';
    
    if (normalized.includes('fully')) return 'fully_furnished';
    if (normalized.includes('partial') || normalized.includes('semi')) return 'partially_furnished';
    if (normalized.includes('unfurnished') || normalized.includes('not furnished')) return 'unfurnished';
    
    return 'unfurnished';
  }

  /**
   * Extract numeric value from price string
   */
  private extractPrice(priceStr: string): number {
    if (!priceStr) return 0;
    
    // Remove all non-numeric characters except decimal points
    const numericStr = priceStr.replace(/[^\d.]/g, '');
    const price = parseFloat(numericStr) || 0;
    
    // Handle different price formats (millions, thousands)
    if (priceStr.toLowerCase().includes('mil') || price > 100000) {
      return price; // Likely sale price
    }
    
    return price; // Likely rental price
  }

  /**
   * Extract bedroom count from various formats
   */
  private extractBedrooms(rooms: string | number): number {
    if (typeof rooms === 'number') return rooms;
    if (!rooms) return 1;
    
    const roomStr = rooms.toString().toLowerCase();
    
    // Handle formats like "3+1", "2+1", "studio"
    if (roomStr.includes('studio')) return 0;
    if (roomStr.includes('+')) {
      const parts = roomStr.split('+');
      return parseInt(parts[0]) || 1;
    }
    
    // Extract first number
    const match = roomStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  /**
   * Extract square footage from size string
   */
  private extractSquareFeet(sizeStr: string): number | undefined {
    if (!sizeStr) return undefined;
    
    const normalized = sizeStr.toLowerCase();
    const sqftMatch = normalized.match(/(\d{1,4})\s*sq\.?\s*ft/i);
    
    return sqftMatch ? parseInt(sqftMatch[1]) : undefined;
  }

  /**
   * Process Kaggle dataset
   */
  private processKaggleData(csvPath: string): PropertyRecord[] {
    const content = readFileSync(csvPath, 'utf-8');
    const records = parse(content, { 
      headers: true, 
      skip_empty_lines: true,
      columns: true // This ensures we get objects with column names as keys
    });
    
    // Debug: Log first record and headers
    console.log('🔍 Kaggle CSV - First record keys:', records[0] ? Object.keys(records[0]) : 'No records');
    console.log('🔍 Kaggle CSV - First record sample:', records[0]);
    
    return records
      .map((record: any, index: number) => {
        const location = record.Location || record.location || '';
        const propertyType = record['Property Type'] || record.property_type || record.type || 'condominium';
        const city = this.extractCityFromLocation(location);
        
        if (!location || !this.isMalaysianLocation(location, city)) {
          return null; // Filter out non-Malaysian properties
        }

        // Generate a more unique title for properties without specific building names
        const baseTitle = location.split(',')[0]?.trim() || 'Property';
        const uniqueTitle = baseTitle === 'Property' ? `${propertyType} in ${city}` : baseTitle;
        
        return {
          title: `${uniqueTitle} (${propertyType})`,
          propertyType: this.normalizePropertyType(propertyType),
          listingType: this.extractPrice(record.Price || record.price) > 50000 ? 'sale' as const : 'rent' as const,
          price: this.extractPrice(record.Price || record.price),
          bedrooms: this.extractBedrooms(record.Rooms || record.rooms),
          bathrooms: parseInt(record.Bathrooms || record.bathrooms) || 1,
          parking: parseInt(record['Car Parks'] || record.parking) || undefined,
          squareFeet: this.extractSquareFeet(record.Size || record.size),
          furnishedCondition: this.normalizeFurnished(record.Furnishing || record.furnishing),
          address: location,
          city: city,
          state: this.extractStateFromLocation(location),
          agentId: 'system-import',
          status: 'available',
          source: 'kaggle'
        } as PropertyRecord;
      })
      .filter(Boolean) as PropertyRecord[];
  }

  /**
   * Process Mudah dataset
   */
  private processMudahData(csvPath: string): PropertyRecord[] {
    const content = readFileSync(csvPath, 'utf-8');
    const records = parse(content, { 
      headers: true, 
      skip_empty_lines: true,
      columns: true // This ensures we get objects with column names as keys
    });
    
    return records
      .map((record: any) => {
        const location = record.location || '';
        const propName = record.prop_name || '';
        const region = record.region || '';
        
        if (!this.isMalaysianLocation(location, region)) {
          return null; // Filter out non-Malaysian properties
        }

        return {
          title: propName || location.split('-')[1]?.trim() || 'Property',
          propertyType: this.normalizePropertyType(record.property_type || 'condominium'),
          listingType: 'rent' as const, // Mudah data is rental
          price: this.extractPrice(record.monthly_rent),
          bedrooms: this.extractBedrooms(record.rooms),
          bathrooms: parseInt(record.bathroom) || 1,
          parking: parseInt(record.parking) || undefined,
          squareFeet: this.extractSquareFeet(record.size),
          furnishedCondition: this.normalizeFurnished(record.furnished),
          address: location,
          city: region,
          state: this.extractStateFromLocation(location) || region,
          agentId: 'system-import',
          status: 'available',
          amenities: this.parseAmenities(record.facilities),
          facilities: record.facilities,
          additionalFacilities: record.additional_facilities,
          source: 'mudah'
        } as PropertyRecord;
      })
      .filter(Boolean) as PropertyRecord[];
  }

  /**
   * Process GitHub KL property data
   */
  private processGitHubData(csvPath: string): PropertyRecord[] {
    const content = readFileSync(csvPath, 'utf-8');
    const records = parse(content, { 
      headers: true, 
      skip_empty_lines: true,
      columns: true // This ensures we get objects with column names as keys
    });
    
    return records
      .map((record: any) => {
        const location = record.Location || '';
        const city = this.extractCityFromLocation(location);
        
        if (!this.isMalaysianLocation(location, city)) {
          return null;
        }

        return {
          title: location.split(',')[0]?.trim() || 'Property',
          propertyType: this.normalizePropertyType(record['Property Type'] || 'condominium'),
          listingType: this.extractPrice(record.Price) > 50000 ? 'sale' as const : 'rent' as const,
          price: this.extractPrice(record.Price),
          bedrooms: this.extractBedrooms(record.Rooms),
          bathrooms: parseInt(record.Bathrooms) || 1,
          parking: parseInt(record['Car Parks']) || undefined,
          squareFeet: this.extractSquareFeet(record['Built_Size']) || this.extractSquareFeet(record.Size),
          furnishedCondition: this.normalizeFurnished(record.Furnishing),
          address: location,
          city: city,
          state: this.extractStateFromLocation(location),
          agentId: 'system-import',
          status: 'available',
          source: 'github'
        } as PropertyRecord;
      })
      .filter(Boolean) as PropertyRecord[];
  }

  /**
   * Process Malaysia house price data
   */
  private processMalaysiaHousePriceData(csvPath: string): PropertyRecord[] {
    const content = readFileSync(csvPath, 'utf-8');
    const records = parse(content, { 
      headers: true, 
      skip_empty_lines: true,
      columns: true // This ensures we get objects with column names as keys
    });
    
    return records
      .map((record: any) => {
        const township = record.Township || '';
        const area = record.Area || '';
        const state = record.State || '';
        
        if (!this.isMalaysianLocation(township, area, state)) {
          return null;
        }

        return {
          title: township || area || 'Property',
          propertyType: this.normalizePropertyType(record.Type || 'house'),
          listingType: 'sale' as const, // Price data is for sales
          price: this.extractPrice(record.Median_Price),
          bedrooms: 3, // Default assumption for house price data
          bathrooms: 2, // Default assumption
          address: `${township}, ${area}`,
          city: area,
          state: state,
          agentId: 'system-import',
          status: 'available',
          source: 'malaysia-house-prices'
        } as PropertyRecord;
      })
      .filter(Boolean) as PropertyRecord[];
  }

  private extractCityFromLocation(location: string): string {
    const parts = location.split(/[-,]/);
    return parts[parts.length - 1]?.trim() || 'Kuala Lumpur';
  }

  private extractStateFromLocation(location: string): string {
    const stateMappings: Record<string, string> = {
      'kuala lumpur': 'Kuala Lumpur',
      'kl': 'Kuala Lumpur', 
      'selangor': 'Selangor',
      'johor': 'Johor',
      'penang': 'Penang',
      'perak': 'Perak'
    };

    for (const [key, value] of Object.entries(stateMappings)) {
      if (location.toLowerCase().includes(key)) {
        return value;
      }
    }
    
    return 'Kuala Lumpur'; // Default
  }

  private parseAmenities(facilitiesStr: string): string[] {
    if (!facilitiesStr) return [];
    return facilitiesStr.split(',').map(f => f.trim()).filter(Boolean);
  }

  /**
   * Remove duplicates by property title (Option A)
   */
  private deduplicateByTitle(records: PropertyRecord[]): PropertyRecord[] {
    const uniqueRecords = new Map<string, PropertyRecord>();
    
    console.log('🔍 Deduplication analysis - first 10 titles:');
    records.slice(0, 10).forEach((record, i) => {
      console.log(`${i + 1}: "${record.title}"`);
    });
    
    for (const record of records) {
      // Create a more specific key that includes location to avoid over-deduplication
      const key = `${record.title.toLowerCase().trim()}_${record.city.toLowerCase().trim()}`.replace(/\s+/g, '_');
      
      // Keep the record with more complete data or first occurrence
      if (!uniqueRecords.has(key) || 
          (record.amenities && record.amenities.length > 0) ||
          record.squareFeet ||
          record.price > (uniqueRecords.get(key)?.price || 0)) {
        uniqueRecords.set(key, record);
      }
    }
    
    console.log(`🔧 Unique keys after deduplication: ${uniqueRecords.size}`);
    return Array.from(uniqueRecords.values());
  }

  /**
   * Main import function
   */
  async importAllData(): Promise<{
    imported: number;
    duplicatesRemoved: number;
    malaysiaFiltered: number;
    sources: Record<string, number>;
  }> {
    console.log('🚀 Starting comprehensive data import...');
    
    // Process all CSV files (adjust paths for root directory)
    const allRecords: PropertyRecord[] = [
      ...this.processKaggleData('../data_kaggle.csv'),
      ...this.processMudahData('../mudah-apartment-kl-selangor.csv'),
      ...this.processGitHubData('../kl_property_github.csv'),
      ...this.processMalaysiaHousePriceData('../malaysia_house_price_data_2025.csv')
    ];

    console.log(`📊 Total records before deduplication: ${allRecords.length}`);
    
    // Count by source
    const sourceStats = allRecords.reduce((acc, record) => {
      acc[record.source] = (acc[record.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Deduplicate by title (Option A)
    const uniqueRecords = this.deduplicateByTitle(allRecords);
    const duplicatesRemoved = allRecords.length - uniqueRecords.length;
    
    console.log(`🔧 Unique records after deduplication: ${uniqueRecords.length}`);
    console.log(`🗑️  Duplicates removed: ${duplicatesRemoved}`);

    // Clear existing properties first (since we're expanding the dataset)
    console.log('🧹 Clearing existing properties...');
    await db.delete(properties);

    // Import in batches for better performance
    const batchSize = 1000;
    let imported = 0;

    for (let i = 0; i < uniqueRecords.length; i += batchSize) {
      const batch = uniqueRecords.slice(i, i + batchSize);
      
      try {
        await db.insert(properties).values(batch);
        imported += batch.length;
        console.log(`✅ Imported batch ${Math.floor(i/batchSize) + 1}: ${imported}/${uniqueRecords.length} records`);
      } catch (error) {
        console.error(`❌ Error importing batch ${Math.floor(i/batchSize) + 1}:`, error);
      }
    }

    console.log('🎉 Import completed successfully!');
    
    return {
      imported,
      duplicatesRemoved,
      malaysiaFiltered: allRecords.length, // All records passed Malaysia filter
      sources: sourceStats
    };
  }
}