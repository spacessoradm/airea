import {
  users,
  properties,
  agents,
  messages,
  searchQueries,
  favorites,
  userPreferences,
  inquiries,
  calendarEvents,
  savedSearches,
  notifications,
  mortgageEligibilityChecks,
  locations,
  geocodingCache,
  apiUsageLog,
  aiQueryCache,
  travelTimeCache,
  creditTransactions,
  type User,
  type UpsertUser,
  type Property,
  type Agent,
  type InsertProperty,
  type Message,
  type InsertMessage,
  type SearchQuery,
  type InsertSearchQuery,
  type Favorite,
  type InsertFavorite,
  type UserPreferences,
  type InsertUserPreferences,
  type Inquiry,
  type InsertInquiry,
  type CalendarEvent,
  type InsertCalendarEvent,
  type SavedSearch,
  type InsertSavedSearch,
  type Notification,
  type InsertNotification,
  type MortgageEligibilityCheck,
  type InsertMortgageEligibilityCheck,
  type Location,
  type InsertLocation,
  type GeocodingCache,
  type InsertGeocodingCache,
  type ApiUsageLog,
  type InsertApiUsageLog,
  type AiQueryCache,
  type InsertAiQueryCache,
  type TravelTimeCache,
  type InsertTravelTimeCache,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, gte, lte, desc, asc, sql, inArray, getTableColumns, ilike } from "drizzle-orm";
import { malaysianBuildings, type MalaysianBuilding } from "@shared/schema";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserCredits(userId: string): Promise<number>;
  deductCredits(userId: string, amount: number): Promise<User>;
  logCreditTransaction(params: {
    userId: string;
    type: 'post' | 'repost' | 'boost' | 'refresh' | 'purchase' | 'refund' | 'admin_adjustment';
    amount: number;
    propertyId?: string;
    description?: string;
    metadata?: any;
  }): Promise<void>;
  deductCreditsWithLogging(params: {
    userId: string;
    amount: number;
    type: 'post' | 'repost' | 'boost' | 'refresh';
    propertyId?: string;
    description?: string;
  }): Promise<User>;
  
  // Agent operations
  getAgent(id: string): Promise<Agent | undefined>;
  updateAgent(id: string, updates: Partial<Agent>): Promise<Agent>;
  
  // Property operations
  getProperties(filters?: PropertyFilters): Promise<(Property & { agent: Agent })[]>;
  getAllProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property>;
  updatePropertyStatus(propertyId: string, status: 'online' | 'offline' | 'expired' | 'draft' | 'sold' | 'rented', commissionAmount?: number, agentId?: string): Promise<Property>;
  deleteProperty(id: string): Promise<void>;
  getPropertiesByAgent(agentId: string, limit?: number, offset?: number): Promise<Property[]>;
  getPropertiesByStatus(agentId: string, status: string, limit?: number, offset?: number): Promise<Property[]>;
  getPropertiesCountByAgent(agentId: string): Promise<number>;
  getPropertiesCountByStatus(agentId: string, status: string): Promise<number>;
  publishDraft(propertyId: string, agentId: string): Promise<Property>;
  saveDraft(property: Partial<InsertProperty>, agentId: string): Promise<Property>;
  searchProperties(query: string, filters?: PropertyFilters): Promise<(Property & { agent: Agent })[]>;
  getSearchSuggestions(query: string): Promise<Array<{ text: string; type: 'building' | 'area' | 'city' }>>;
  
  // Message operations
  getMessages(userId1: string, userId2: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(messageId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;
  
  // Search query operations
  createSearchQuery(query: InsertSearchQuery): Promise<SearchQuery>;
  getUserSearchHistory(userId: string): Promise<SearchQuery[]>;
  
  // Favorites operations
  getUserFavorites(userId: string): Promise<Property[]>;
  addToFavorites(favorite: InsertFavorite): Promise<Favorite>;
  removeFromFavorites(userId: string, propertyId: string): Promise<void>;
  isFavorite(userId: string, propertyId: string): Promise<boolean>;

  // User preferences operations
  getUserPreferences(userId: string): Promise<UserPreferences | null>;
  updateUserPreferences(userId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences>;

  // Featured properties
  getFeaturedProperties(limit?: number): Promise<Property[]>;

  // Inquiry management
  getInquiries(agentId: string, filters?: InquiryFilters): Promise<Inquiry[]>;
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  updateInquiry(id: string, updates: Partial<InsertInquiry>, agentId: string): Promise<Inquiry | null>;
  
  // Agent metrics/analytics
  getAgentMetrics(agentId: string): Promise<{
    totalProperties: number;
    totalViews: number;
    totalInquiries: number;
    aiCredits: number;
  }>;

  // Calendar management
  getCalendarEvents(agentId: string, filters?: CalendarFilters): Promise<CalendarEvent[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, updates: Partial<InsertCalendarEvent>, agentId: string): Promise<CalendarEvent | null>;

  // Saved searches
  getSavedSearches(agentId: string): Promise<SavedSearch[]>;
  createSavedSearch(search: InsertSavedSearch): Promise<SavedSearch>;
  deleteSavedSearch(id: string, agentId: string): Promise<boolean>;

  // Notifications
  getNotifications(agentId: string, filters?: NotificationFilters): Promise<Notification[]>;
  markNotificationAsRead(id: string, agentId: string): Promise<boolean>;
  markAllNotificationsAsRead(agentId: string): Promise<void>;
  
  // Mortgage eligibility operations
  createMortgageEligibilityCheck(check: InsertMortgageEligibilityCheck): Promise<MortgageEligibilityCheck>;
  getMortgageEligibilityChecksByUser(userId: string): Promise<MortgageEligibilityCheck[]>;

  // Location search operations
  searchLocations(query: string, limit?: number): Promise<Location[]>;
  getLocationById(id: string): Promise<Location | undefined>;
  getNearbyLocations(latitude: number, longitude: number, radius?: number, limit?: number): Promise<Location[]>;
  getMortgageEligibilityCheck(id: string): Promise<MortgageEligibilityCheck | undefined>;

  // Enhanced suggestions for autocomplete
  getEnhancedSuggestions(query: string, searchType: string, userLocation?: { lat: number; lng: number }, includeDefaults?: boolean): Promise<Array<{
    text: string;
    type: 'building' | 'area' | 'city' | 'recent' | 'trending' | 'location';
    count?: number;
    distance?: string;
  }>>;

  // Property suggestions for autocomplete
  getPropertySuggestions(query: string, searchType: string, limit?: number): Promise<Array<{
    id: string;
    title: string;
    propertyType: string;
    price: number;
    location: string;
  }>>;

  // Geocoding cache operations
  getCachedGeocoding(normalizedQuery: string): Promise<any | null>;
  saveCachedGeocoding(data: any): Promise<void>;
  
  // API usage logging
  logApiUsage(data: any): Promise<void>;
  getApiUsageStats(service?: string, startDate?: Date, endDate?: Date): Promise<{
    totalCalls: number;
    cacheHitRate: number;
    estimatedCost: number;
    byService: Array<{
      service: string;
      calls: number;
      cost: number;
      cacheHitRate: number;
    }>;
  }>;

  // AI query cache operations
  getCachedAiQuery(normalizedQuery: string, searchType?: string): Promise<any | null>;
  saveCachedAiQuery(data: any): Promise<void>;

  // Travel time cache operations
  getCachedTravelTime(originLat: number, originLng: number, destLat: number, destLng: number, mode?: string): Promise<any | null>;
  saveCachedTravelTime(data: any): Promise<void>;
}

export interface InquiryFilters {
  status?: string;
  priority?: string;
  limit?: number;
}

export interface CalendarFilters {
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
}

export interface NotificationFilters {
  isRead?: boolean;
  priority?: string;
  limit?: number;
}

export interface PropertyFilters {
  propertyType?: string[];
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
  minROI?: number;
  maxROI?: number;
  bedrooms?: number;
  bathrooms?: number;
  minSquareFeet?: number;
  maxSquareFeet?: number;
  city?: string;
  amenities?: string[];
  status?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'oldest';
  searchText?: string;
  featured?: boolean;
  limit?: number;
  // New property legal filters
  tenure?: string[]; // 'freehold' | 'leasehold'
  titleType?: string[]; // 'individual' | 'strata' | 'master'
  landTitleType?: string[]; // 'residential' | 'commercial' | 'industrial' | 'agriculture'
  // Transport proximity filters
  nearTransport?: {
    types: string[]; // ['MRT', 'LRT', 'Monorail', 'KTM', 'BRT']
    maxDistanceMeters: number;
    stationNames?: string[]; // Specific stations if provided
  };
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserCredits(userId: string): Promise<number> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.aiCredits ?? 500; // Default to 500 if not found
  }

  async deductCredits(userId: string, amount: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        aiCredits: sql`${users.aiCredits} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Credit transaction logging
  async logCreditTransaction(params: {
    userId: string;
    type: 'post' | 'repost' | 'boost' | 'refresh' | 'purchase' | 'refund' | 'admin_adjustment';
    amount: number;
    propertyId?: string;
    description?: string;
    metadata?: any;
  }): Promise<void> {
    const currentBalance = await this.getUserCredits(params.userId);
    const balanceAfter = currentBalance + params.amount;

    await db.insert(creditTransactions).values({
      userId: params.userId,
      type: params.type,
      amount: params.amount,
      balanceBefore: currentBalance,
      balanceAfter: balanceAfter,
      propertyId: params.propertyId,
      description: params.description,
      metadata: params.metadata ? params.metadata : undefined,
    });
  }

  // Deduct credits with transaction logging
  async deductCreditsWithLogging(params: {
    userId: string;
    amount: number;
    type: 'post' | 'repost' | 'boost' | 'refresh';
    propertyId?: string;
    description?: string;
  }): Promise<User> {
    const currentBalance = await this.getUserCredits(params.userId);
    if (currentBalance < params.amount) {
      throw new Error(`Insufficient credits. Required: ${params.amount}, Available: ${currentBalance}`);
    }

    const updatedUser = await this.deductCredits(params.userId, params.amount);

    await this.logCreditTransaction({
      userId: params.userId,
      type: params.type,
      amount: -params.amount,
      propertyId: params.propertyId,
      description: params.description || `${params.type} - ${params.amount} credits`,
    });

    return updatedUser;
  }

  // Agent operations
  async getAgent(id: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent;
  }

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent> {
    const [agent] = await db
      .update(agents)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))
      .returning();
    return agent;
  }

  // Property operations with optimized queries
  async getProperties(filters?: PropertyFilters): Promise<(Property & { agent: Agent })[]> {
    // Start performance timer
    const start = Date.now();
    
    let query = db
      .select({
        ...getTableColumns(properties),
        agent: agents,
      })
      .from(properties)
      .leftJoin(agents, eq(properties.agentId, agents.id));
    
    const conditions = [];
    
    // Always exclude draft listings from public property listings
    conditions.push(sql`${properties.status} != 'draft'`);
    
    if (filters) {
      if (filters.propertyType?.length) {
        // Map factory and warehouse searches to include industrial properties
        const mappedTypes = filters.propertyType.flatMap(type => {
          if (type === 'factory' || type === 'warehouse') {
            return [type, 'industrial']; // Include both the original type and industrial
          }
          return [type];
        });
        
        conditions.push(inArray(properties.propertyType, Array.from(new Set(mappedTypes)) as any));
      }
      
      if (filters.listingType) {
        conditions.push(eq(properties.listingType, filters.listingType as any));
      }
      
      if (filters.minPrice !== undefined) {
        conditions.push(gte(properties.price, filters.minPrice.toString()));
      }
      
      if (filters.maxPrice !== undefined) {
        conditions.push(lte(properties.price, filters.maxPrice.toString()));
      }
      
      if (filters.minROI !== undefined) {
        conditions.push(gte(properties.roi, filters.minROI.toString()));
      }
      
      if (filters.maxROI !== undefined) {
        conditions.push(lte(properties.roi, filters.maxROI.toString()));
      }
      
      if (filters.bedrooms !== undefined) {
        conditions.push(eq(properties.bedrooms, filters.bedrooms));
      }
      
      if (filters.bathrooms !== undefined) {
        conditions.push(eq(properties.bathrooms, filters.bathrooms));
      }
      
      if (filters.minSquareFeet !== undefined) {
        conditions.push(gte(properties.squareFeet, filters.minSquareFeet));
      }
      
      if (filters.maxSquareFeet !== undefined) {
        conditions.push(lte(properties.squareFeet, filters.maxSquareFeet));
      }
      
      if (filters.city) {
        conditions.push(like(properties.city, `%${filters.city}%`));
      }
      
      if (filters.searchText) {
        // Search in title, description, address, and city
        conditions.push(
          or(
            like(properties.title, `%${filters.searchText}%`),
            like(properties.description, `%${filters.searchText}%`),
            like(properties.address, `%${filters.searchText}%`),
            like(properties.city, `%${filters.searchText}%`)
          )
        );
      }
      
      if (filters.status) {
        conditions.push(eq(properties.status, filters.status as any));
      } else {
        // By default, only show online properties to users (hide draft/offline/expired/sold/rented)
        conditions.push(eq(properties.status, 'online' as any));
      }
      
      if (filters.featured !== undefined) {
        conditions.push(eq(properties.featured, filters.featured));
      }
      
      // New legal property filters for getProperties
      if (filters.tenure?.length) {
        conditions.push(inArray(properties.tenure, filters.tenure as any));
      }
      
      if (filters.titleType?.length) {
        conditions.push(inArray(properties.titleType, filters.titleType as any));
      }
      
      if (filters.landTitleType?.length) {
        conditions.push(inArray(properties.landTitleType, filters.landTitleType as any));
      }
      
      // Add amenities filtering - property must have ALL specified amenities
      if (filters.amenities?.length) {
        const amenityConditions = filters.amenities.map(amenity => 
          sql`${properties.amenities} @> ARRAY[${amenity}]::text[]`
        );
        conditions.push(and(...amenityConditions));
      }
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    // Apply two-tier sorting: featured listings first, then by sort preference
    // Featured check: featured=true AND featuredUntil > NOW()
    const isFeaturedNow = sql`(${properties.featured} = true AND ${properties.featuredUntil} > NOW())`;
    const mostRecentActivity = sql`GREATEST(COALESCE(${properties.lastRefreshedAt}, ${properties.postedAt}), ${properties.postedAt})`;
    
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'price_asc':
          query = query.orderBy(desc(isFeaturedNow), asc(properties.price)) as any;
          break;
        case 'price_desc':
          query = query.orderBy(desc(isFeaturedNow), desc(properties.price)) as any;
          break;
        case 'newest':
          query = query.orderBy(desc(isFeaturedNow), desc(properties.createdAt)) as any;
          break;
        case 'oldest':
          query = query.orderBy(desc(isFeaturedNow), asc(properties.createdAt)) as any;
          break;
        default:
          // Default: featured first (sorted earliest to latest), then non-featured
          query = query.orderBy(desc(isFeaturedNow), asc(properties.postedAt)) as any;
          break;
      }
    } else {
      // Default sorting: featured first (sorted earliest to latest), then non-featured
      query = query.orderBy(desc(isFeaturedNow), asc(properties.postedAt)) as any;
    }
    
    // Apply limit if specified
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    
    
    try {
      const results = await query;
      
      // Filter out properties without agents and transform the result
      const filteredResults = results
        .filter(row => row.agent !== null)
        .map(row => ({
          ...row,
          agent: row.agent!,
        }));
        
      return filteredResults;
    } catch (error) {
      console.error('❌ DRIZZLE QUERY ERROR:', error);
      throw error;
    }
  }

  async getAllProperties(): Promise<Property[]> {
    return await db.select().from(properties).orderBy(desc(properties.createdAt));
  }

  async getProperty(id: string): Promise<(Property & { agent: Agent }) | undefined> {
    const results = await db
      .select()
      .from(properties)
      .leftJoin(agents, eq(properties.agentId, agents.id))
      .where(eq(properties.id, id));
    
    const [row] = results;
    if (!row) {
      return undefined;
    }
    
    // If no agent exists, return property without agent
    if (!row.agents) {
      return row.properties as any;
    }
    
    return {
      ...row.properties,
      agent: row.agents,
    };
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [newProperty] = await db
      .insert(properties)
      .values(property)
      .returning();
    return newProperty;
  }

  async updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property> {
    const [updatedProperty] = await db
      .update(properties)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return updatedProperty;
  }

  async deleteProperty(id: string): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  async getPropertiesByAgent(agentId: string, limit?: number, offset?: number): Promise<Property[]> {
    // Auto-expire listings before fetching
    await this.expireOldListings();
    
    let query = db
      .select()
      .from(properties)
      .where(eq(properties.agentId, agentId))
      .orderBy(desc(properties.createdAt)); // Most recent listings first
    
    if (limit !== undefined) {
      query = query.limit(limit) as any;
    }
    if (offset !== undefined) {
      query = query.offset(offset) as any;
    }
    
    return await query;
  }

  async getPropertiesByStatus(agentId: string, status: string, limit?: number, offset?: number): Promise<Property[]> {
    // Auto-expire listings before fetching
    await this.expireOldListings();
    
    let query = db
      .select()
      .from(properties)
      .where(and(
        eq(properties.agentId, agentId),
        eq(properties.status, status as any)
      ))
      .orderBy(desc(properties.createdAt)); // Most recent listings first
    
    if (limit !== undefined) {
      query = query.limit(limit) as any;
    }
    if (offset !== undefined) {
      query = query.offset(offset) as any;
    }
    
    return await query;
  }

  async getPropertiesCountByAgent(agentId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(eq(properties.agentId, agentId));
    return Number(result[0]?.count || 0);
  }

  async getPropertiesCountByStatus(agentId: string, status: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(and(
        eq(properties.agentId, agentId),
        eq(properties.status, status as any)
      ));
    return Number(result[0]?.count || 0);
  }

  async publishDraft(propertyId: string, agentId: string): Promise<Property> {
    const property = await this.getProperty(propertyId);
    if (!property || property.agentId !== agentId) {
      throw new Error("Property not found or unauthorized");
    }
    if (property.status !== 'draft') {
      throw new Error("Only draft properties can be published");
    }

    const [updatedProperty] = await db
      .update(properties)
      .set({ 
        status: 'online' as any,
        postedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(properties.id, propertyId))
      .returning();
    
    return updatedProperty;
  }

  async saveDraft(propertyData: Partial<InsertProperty>, agentId: string): Promise<Property> {
    // If property has ID, update existing draft
    if ((propertyData as any).id) {
      const id = (propertyData as any).id;
      delete (propertyData as any).id;
      return await this.updateProperty(id, propertyData);
    }
    
    // Create new draft
    const draftData = {
      ...propertyData,
      agentId,
      status: 'draft' as any,
    } as InsertProperty;
    
    return await this.createProperty(draftData);
  }

  // Update property status
  async updatePropertyStatus(
    propertyId: string, 
    status: 'online' | 'offline' | 'expired' | 'draft' | 'sold' | 'rented',
    commissionAmount?: number,
    agentId?: string
  ): Promise<Property> {
    // Check if agent owns this property
    if (agentId) {
      const property = await this.getProperty(propertyId);
      if (!property || property.agentId !== agentId) {
        throw new Error("Property not found or unauthorized");
      }
    }

    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };

    // Set postedAt when status changes to online
    if (status === 'online') {
      const property = await this.getProperty(propertyId);
      if (!property?.postedAt) {
        updateData.postedAt = new Date();
      }
    }

    const [updatedProperty] = await db
      .update(properties)
      .set(updateData)
      .where(eq(properties.id, propertyId))
      .returning();
    
    return updatedProperty;
  }

  async searchProperties(query: string, filters?: PropertyFilters): Promise<(Property & { agent: Agent })[]> {
    let dbQuery = db
      .select({
        ...getTableColumns(properties),
        agent: agents,
      })
      .from(properties)
      .leftJoin(agents, eq(properties.agentId, agents.id));
    
    const conditions = [];
    
    // Always exclude draft listings from public search results
    conditions.push(sql`${properties.status} != 'draft'`);
    
    // Text search conditions (case-insensitive)
    if (query) {
      const searchQuery = query.toLowerCase();
      
      // Check if it's a compound search (multiple words like "desa park city")
      const searchWords = searchQuery.split(' ').filter(word => word.length > 1);
      
      if (searchWords.length > 1) {
        // For compound location searches like "desa park city", only show exact phrase matches
        // This prevents "Desa Sri Hartamas" from appearing when searching "Desa Park City"
        conditions.push(
          or(
            sql`LOWER(${properties.title}) LIKE ${`%${searchQuery}%`}`,
            sql`LOWER(${properties.address}) LIKE ${`%${searchQuery}%`}`,
            sql`LOWER(${properties.street}) LIKE ${`%${searchQuery}%`}`
          )
        );
      } else {
        // For single word searches, use the original logic
        conditions.push(
          or(
            sql`LOWER(${properties.title}) LIKE ${`%${searchQuery}%`}`,
            sql`LOWER(${properties.description}) LIKE ${`%${searchQuery}%`}`,
            sql`LOWER(${properties.address}) LIKE ${`%${searchQuery}%`}`,
            sql`LOWER(${properties.street}) LIKE ${`%${searchQuery}%`}`,
            sql`LOWER(${properties.city}) LIKE ${`%${searchQuery}%`}`
          )
        );
      }
    }
    
    // Apply filters
    if (filters) {
      if (filters.propertyType?.length) {
        // Map factory and warehouse searches to include industrial properties
        const mappedTypes = filters.propertyType.flatMap(type => {
          if (type === 'factory' || type === 'warehouse') {
            return [type, 'industrial']; // Include both the original type and industrial
          }
          return [type];
        });
        
        conditions.push(inArray(properties.propertyType, Array.from(new Set(mappedTypes)) as any));
      }
      
      if (filters.listingType) {
        conditions.push(eq(properties.listingType, filters.listingType as any));
      }
      
      if (filters.minPrice !== undefined) {
        conditions.push(sql`CAST(${properties.price} AS NUMERIC) >= ${filters.minPrice}`);
      }
      
      if (filters.maxPrice !== undefined) {
        conditions.push(sql`CAST(${properties.price} AS NUMERIC) <= ${filters.maxPrice}`);
      }
      
      if (filters.bedrooms !== undefined) {
        conditions.push(eq(properties.bedrooms, filters.bedrooms));
      }
      
      if (filters.bathrooms !== undefined) {
        conditions.push(eq(properties.bathrooms, filters.bathrooms));
      }
      
      if (filters.minSquareFeet !== undefined) {
        conditions.push(gte(properties.squareFeet, filters.minSquareFeet));
      }
      
      if (filters.maxSquareFeet !== undefined) {
        conditions.push(lte(properties.squareFeet, filters.maxSquareFeet));
      }
      
      if (filters.city) {
        conditions.push(like(properties.city, `%${filters.city}%`));
      }
      
      // New legal property filters for searchProperties
      if (filters.tenure?.length) {
        conditions.push(inArray(properties.tenure, filters.tenure as any));
      }
      
      if (filters.titleType?.length) {
        conditions.push(inArray(properties.titleType, filters.titleType as any));
      }
      
      if (filters.landTitleType?.length) {
        conditions.push(inArray(properties.landTitleType, filters.landTitleType as any));
      }

      // ROI filtering for commercial/investment properties
      if (filters.minROI !== undefined) {
        conditions.push(sql`CAST(${properties.roi} AS NUMERIC) >= ${filters.minROI}`);
      }

      if (filters.maxROI !== undefined) {
        conditions.push(sql`CAST(${properties.roi} AS NUMERIC) <= ${filters.maxROI}`);
      }
    }
    
    if (conditions.length > 0) {
      dbQuery = dbQuery.where(and(...conditions)) as any;
    }
    

    
    // Featured check: featured=true AND featuredUntil > NOW()
    const isFeaturedNow = sql`(${properties.featured} = true AND ${properties.featuredUntil} > NOW())`;

    // Enhanced ordering: prioritize exact matches when there's a search query
    let orderByClause;
    if (query) {
      const searchQuery = query.toLowerCase();
      const searchWords = searchQuery.split(' ').filter(word => word.length > 1);
      
      if (searchWords.length > 1) {
        // For compound searches, prioritize exact and close matches first
        orderByClause = [
          // 0. Featured listings first (sorted earliest to latest)
          desc(isFeaturedNow),
          asc(properties.postedAt),
          // 1. Exact match (highest priority)
          sql`CASE WHEN LOWER(${properties.title}) = ${searchQuery} THEN 0 ELSE 1 END`,
          // 2. Title starts with search query
          sql`CASE WHEN LOWER(${properties.title}) LIKE ${`${searchQuery}%`} THEN 0 ELSE 1 END`,
          // 3. Title contains full search query
          sql`CASE WHEN LOWER(${properties.title}) LIKE ${`%${searchQuery}%`} THEN 0 ELSE 1 END`,
          // 4. Address contains search query
          sql`CASE WHEN LOWER(${properties.address}) LIKE ${`%${searchQuery}%`} THEN 0 ELSE 1 END`,
          // 5. Count how many search words appear in title (more matches = higher priority)
          sql`(
            ${searchWords.map(word => 
              sql`CASE WHEN LOWER(${properties.title}) LIKE ${`%${word}%`} THEN 0 ELSE 1 END`
            ).reduce((a, b) => sql`${a} + ${b}`)}
          )`
        ];
      } else {
        // For single word searches, use enhanced ordering
        orderByClause = [
          // 0. Featured listings first (sorted earliest to latest)
          desc(isFeaturedNow),
          asc(properties.postedAt),
          // 1. Exact match
          sql`CASE WHEN LOWER(${properties.title}) = ${searchQuery} THEN 0 ELSE 1 END`,
          // 2. Title starts with search query
          sql`CASE WHEN LOWER(${properties.title}) LIKE ${`${searchQuery}%`} THEN 0 ELSE 1 END`,
          // 3. Title contains search query
          sql`CASE WHEN LOWER(${properties.title}) LIKE ${`%${searchQuery}%`} THEN 0 ELSE 1 END`,
          // 4. Address contains search query
          sql`CASE WHEN LOWER(${properties.address}) LIKE ${`%${searchQuery}%`} THEN 0 ELSE 1 END`
        ];
      }
    } else {
      // No search query: featured first (sorted earliest to latest), then non-featured
      orderByClause = [desc(isFeaturedNow), asc(properties.postedAt)];
    }
    
    const results = await dbQuery.orderBy(...orderByClause);
    
    // Filter out properties without agents and transform the result
    return results
      .filter(row => row.agent !== null)
      .map(row => ({
        ...row,
        agent: row.agent!,
      }));
  }

  async getSearchSuggestions(query: string): Promise<Array<{ text: string; type: 'building' | 'area' | 'city' }>> {
    const suggestions: Array<{ text: string; type: 'building' | 'area' | 'city' }> = [];
    const buildingNames = new Set<string>(); // Track building names to avoid duplicates
    
    // Query for building names from property titles
    const buildingResults = await db
      .select({ title: properties.title })
      .from(properties)
      .where(sql`LOWER(${properties.title}) LIKE ${`%${query}%`}`)
      .groupBy(properties.title)
      .limit(10);
    
    buildingResults.forEach(row => {
      const title = row.title;
      // Extract building name from title (usually before the dash)
      const buildingName = title.split(' - ')[0].trim();
      if (buildingName.toLowerCase().includes(query.toLowerCase()) && 
          !suggestions.find(s => s.text.toLowerCase() === buildingName.toLowerCase())) {
        suggestions.push({ text: buildingName, type: 'building' });
        buildingNames.add(buildingName.toLowerCase());
      }
      
      // Also check for location names after the dash (but not if they're already buildings)
      const locationPart = title.split(' - ')[1];
      if (locationPart) {
        const trimmedLocation = locationPart.trim();
        if (trimmedLocation.toLowerCase().includes(query.toLowerCase()) && 
            !suggestions.find(s => s.text.toLowerCase() === trimmedLocation.toLowerCase()) &&
            !buildingNames.has(trimmedLocation.toLowerCase())) {
          suggestions.push({ text: trimmedLocation, type: 'area' });
        }
      }
    });
    
    // Query for areas/locations from property addresses (only if not already found as buildings)
    const areaResults = await db
      .select({ address: properties.address, city: properties.city })
      .from(properties)
      .where(
        or(
          sql`LOWER(${properties.address}) LIKE ${`%${query}%`}`,
          sql`LOWER(${properties.city}) LIKE ${`%${query}%`}`
        )
      )
      .groupBy(properties.address, properties.city)
      .limit(5);
    
    areaResults.forEach(row => {
      // Extract area names from address (skip if already identified as building)
      const addressParts = row.address.split(',');
      addressParts.forEach(part => {
        const trimmedPart = part.trim();
        if (trimmedPart.toLowerCase().includes(query.toLowerCase()) && 
            trimmedPart.length > 2 && 
            !suggestions.find(s => s.text.toLowerCase() === trimmedPart.toLowerCase()) &&
            !buildingNames.has(trimmedPart.toLowerCase())) {
          suggestions.push({ text: trimmedPart, type: 'area' });
        }
      });
      
      // Add city if it matches (and not already a building)
      if (row.city.toLowerCase().includes(query.toLowerCase()) && 
          !suggestions.find(s => s.text.toLowerCase() === row.city.toLowerCase()) &&
          !buildingNames.has(row.city.toLowerCase())) {
        suggestions.push({ text: row.city, type: 'city' });
      }
    });
    
    // Sort by relevance and type priority: buildings first, then areas, then cities
    return suggestions
      .sort((a, b) => {
        const queryLower = query.toLowerCase();
        const aExact = a.text.toLowerCase() === queryLower;
        const bExact = b.text.toLowerCase() === queryLower;
        
        // Exact matches first
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then prioritize by type: building > area > city
        const typeOrder = { building: 0, area: 1, city: 2 };
        if (typeOrder[a.type] !== typeOrder[b.type]) {
          return typeOrder[a.type] - typeOrder[b.type];
        }
        
        // Finally, shorter matches first
        return a.text.length - b.text.length;
      })
      .slice(0, 8); // Limit to 8 suggestions
  }

  // Message operations
  async getMessages(userId1: string, userId2: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
        )
      )
      .orderBy(asc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await db
      .update(messages)
      .set({ read: true })
      .where(eq(messages.id, messageId));
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(eq(messages.receiverId, userId), eq(messages.read, false)));
    
    return result.count;
  }

  // Search query operations
  async createSearchQuery(query: InsertSearchQuery): Promise<SearchQuery> {
    const [newQuery] = await db
      .insert(searchQueries)
      .values(query)
      .returning();
    return newQuery;
  }

  async getUserSearchHistory(userId: string): Promise<SearchQuery[]> {
    return await db
      .select()
      .from(searchQueries)
      .where(eq(searchQueries.userId, userId))
      .orderBy(desc(searchQueries.createdAt))
      .limit(10);
  }

  // Favorites operations
  async getUserFavorites(userId: string): Promise<Property[]> {
    return await db
      .select({
        ...getTableColumns(properties),
      })
      .from(favorites)
      .innerJoin(properties, eq(favorites.propertyId, properties.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
  }

  async addToFavorites(favorite: InsertFavorite): Promise<Favorite> {
    const [newFavorite] = await db
      .insert(favorites)
      .values(favorite)
      .returning();
    return newFavorite;
  }

  async removeFromFavorites(userId: string, propertyId: string): Promise<void> {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)));
  }

  async isFavorite(userId: string, propertyId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)));
    
    return !!result;
  }

  // User preferences operations
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    
    return preferences || null;
  }

  async updateUserPreferences(userId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    const [updated] = await db
      .insert(userPreferences)
      .values({ userId, ...preferences })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          ...preferences,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    return updated;
  }

  // Featured properties
  async getFeaturedProperties(limit: number = 10): Promise<Property[]> {
    return await db
      .select()
      .from(properties)
      .where(eq(properties.featured, true))
      .orderBy(desc(properties.createdAt))
      .limit(limit);
  }

  // Inquiry management
  async getInquiries(agentId: string, filters?: InquiryFilters): Promise<Inquiry[]> {
    const conditions = [eq(inquiries.agentId, agentId)];

    if (filters?.status) {
      conditions.push(eq(inquiries.status, filters.status));
    }
    if (filters?.priority) {
      conditions.push(eq(inquiries.priority, filters.priority));
    }

    return await db
      .select()
      .from(inquiries)
      .where(and(...conditions))
      .orderBy(desc(inquiries.createdAt))
      .limit(filters?.limit || 50);
  }

  async createInquiry(inquiry: InsertInquiry): Promise<Inquiry> {
    const [newInquiry] = await db
      .insert(inquiries)
      .values(inquiry)
      .returning();
    return newInquiry;
  }

  async updateInquiry(id: string, updates: Partial<InsertInquiry>, agentId: string): Promise<Inquiry | null> {
    const [updated] = await db
      .update(inquiries)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(inquiries.id, id), eq(inquiries.agentId, agentId)))
      .returning();
    
    return updated || null;
  }

  async getAgentMetrics(agentId: string): Promise<{
    totalProperties: number;
    totalViews: number;
    totalInquiries: number;
    aiCredits: number;
  }> {
    // Count only 'online' properties as active listings
    const [propertiesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(properties)
      .where(and(
        eq(properties.agentId, agentId),
        eq(properties.status, 'online')
      ));

    const [inquiriesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inquiries)
      .where(eq(inquiries.agentId, agentId));

    // For UAT testing with test-agent-123, get credits from that user
    const credits = await this.getUserCredits(agentId);

    return {
      totalProperties: propertiesCount?.count || 0,
      totalViews: 0, // Can be enhanced later with propertyAnalytics join
      totalInquiries: inquiriesCount?.count || 0,
      aiCredits: credits,
    };
  }

  // Calendar management
  async getCalendarEvents(agentId: string, filters?: CalendarFilters): Promise<CalendarEvent[]> {
    const conditions = [eq(calendarEvents.agentId, agentId)];

    if (filters?.startDate) {
      conditions.push(gte(calendarEvents.startTime, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(calendarEvents.endTime, filters.endDate));
    }
    if (filters?.eventType) {
      conditions.push(eq(calendarEvents.eventType, filters.eventType));
    }

    return await db
      .select()
      .from(calendarEvents)
      .where(and(...conditions))
      .orderBy(asc(calendarEvents.startTime));
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [newEvent] = await db
      .insert(calendarEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async updateCalendarEvent(id: string, updates: Partial<InsertCalendarEvent>, agentId: string): Promise<CalendarEvent | null> {
    const [updated] = await db
      .update(calendarEvents)
      .set(updates)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.agentId, agentId)))
      .returning();
    
    return updated || null;
  }

  // Saved searches
  async getSavedSearches(agentId: string): Promise<SavedSearch[]> {
    return await db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.agentId, agentId))
      .orderBy(desc(savedSearches.lastUsed));
  }

  async createSavedSearch(search: InsertSavedSearch): Promise<SavedSearch> {
    const [newSearch] = await db
      .insert(savedSearches)
      .values(search)
      .returning();
    return newSearch;
  }

  async deleteSavedSearch(id: string, agentId: string): Promise<boolean> {
    const result = await db
      .delete(savedSearches)
      .where(and(eq(savedSearches.id, id), eq(savedSearches.agentId, agentId)));
    
    return (result.rowCount ?? 0) > 0;
  }

  // Notifications
  async getNotifications(agentId: string, filters?: NotificationFilters): Promise<Notification[]> {
    const conditions = [eq(notifications.agentId, agentId)];

    if (filters?.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, filters.isRead));
    }
    if (filters?.priority) {
      conditions.push(eq(notifications.priority, filters.priority));
    }

    return await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(filters?.limit || 50);
  }

  async markNotificationAsRead(id: string, agentId: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.agentId, agentId)));
    
    return (result.rowCount ?? 0) > 0;
  }

  async markAllNotificationsAsRead(agentId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.agentId, agentId), eq(notifications.isRead, false)));
  }

  // Mortgage eligibility operations
  async createMortgageEligibilityCheck(check: InsertMortgageEligibilityCheck): Promise<MortgageEligibilityCheck> {
    const [result] = await db
      .insert(mortgageEligibilityChecks)
      .values(check)
      .returning();
    return result;
  }

  async getMortgageEligibilityChecksByUser(userId: string): Promise<MortgageEligibilityCheck[]> {
    return await db
      .select()
      .from(mortgageEligibilityChecks)
      .where(eq(mortgageEligibilityChecks.userId, userId))
      .orderBy(desc(mortgageEligibilityChecks.createdAt));
  }

  async getMortgageEligibilityCheck(id: string): Promise<MortgageEligibilityCheck | undefined> {
    const [result] = await db
      .select()
      .from(mortgageEligibilityChecks)
      .where(eq(mortgageEligibilityChecks.id, id));
    return result;
  }

  // Location search methods
  async searchLocations(query: string, limit: number = 10): Promise<Location[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = `%${query.trim()}%`;
    
    return await db
      .select()
      .from(locations)
      .where(
        or(
          ilike(locations.name, searchTerm),
          ilike(locations.city, searchTerm),
          ilike(locations.state, searchTerm)
        )
      )
      .orderBy(desc(locations.createdAt))
      .limit(limit);
  }

  async getLocationById(id: string): Promise<Location | undefined> {
    const [result] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id))
      .limit(1);
    return result;
  }

  async getNearbyLocations(latitude: number, longitude: number, radius: number = 5000, limit: number = 10): Promise<Location[]> {
    // Use PostGIS to find nearby locations within radius (in meters)
    return await db
      .select()
      .from(locations)
      .where(
        sql`ST_DWithin(
          geometry, 
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          ${radius}
        )`
      )
      .orderBy(
        sql`ST_Distance(
          geometry,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        )`
      )
      .limit(limit);
  }

  async getEnhancedSuggestions(query: string, searchType: string, userLocation?: { lat: number; lng: number }, includeDefaults?: boolean): Promise<Array<{
    text: string;
    type: 'building' | 'area' | 'city' | 'recent' | 'trending' | 'location';
    count?: number;
    distance?: string;
  }>> {
    const suggestions: Array<{
      text: string;
      type: 'building' | 'area' | 'city' | 'recent' | 'trending' | 'location';
      count?: number;
      distance?: string;
    }> = [];

    if (!query || query.length < 2) {
      return suggestions;
    }

    // Normalize query for consistent matching across misspellings
    let normalizedQuery = query.toLowerCase().trim();
    const originalQuery = normalizedQuery;
    
    // Apply same normalization as in propertySearch.ts to ensure consistency
    if (normalizedQuery.includes('damansra') || normalizedQuery === 'damansar') {
      normalizedQuery = 'damansara';
      console.log(`🔄 SUGGESTIONS: Normalized "${originalQuery}" → "damansara" for consistent suggestions`);
    } else if (normalizedQuery.includes('mtkiara') || normalizedQuery.includes('mt kiara')) {
      normalizedQuery = 'mont kiara';
    } else if (normalizedQuery.includes('kpong')) {
      normalizedQuery = 'kepong';
    }

    const lowercaseQuery = normalizedQuery;

    // First, search Malaysian buildings database for comprehensive building suggestions
    try {
      const buildingSuggestions = await db
        .select()
        .from(malaysianBuildings)
        .where(
          or(
            ilike(malaysianBuildings.name, `%${normalizedQuery}%`),
            ilike(malaysianBuildings.area, `%${normalizedQuery}%`),
            sql`${malaysianBuildings.searchKeywords} && ARRAY[${normalizedQuery}]`
          )
        )
        .limit(3);
      
      buildingSuggestions.forEach(building => {
        suggestions.push({
          text: building.name,
          type: 'building',
          count: undefined, // We'll show building type instead
          distance: `${building.type.replace(/_/g, ' ')} in ${building.area}`
        });
      });
    } catch (error) {
      console.error('Error searching Malaysian buildings:', error);
    }

    // Get location suggestions from properties  
    const locationResults = await db
      .select({ 
        address: properties.address, 
        city: properties.city, 
        count: sql<number>`count(*)::int` 
      })
      .from(properties)
      .where(
        or(
          ilike(properties.address, `%${normalizedQuery}%`),
          ilike(properties.city, `%${normalizedQuery}%`),
          ilike(properties.title, `%${normalizedQuery}%`)
        )
      )
      .groupBy(properties.address, properties.city)
      .orderBy(sql`count(*) desc`)
      .limit(8);

    // Process location results with smart categorization
    locationResults.forEach(row => {
      // Extract area names from address
      const addressParts = row.address.split(',');
      addressParts.forEach(part => {
        const trimmedPart = part.trim();
        if (trimmedPart.toLowerCase().includes(lowercaseQuery) && 
            trimmedPart.length > 2 && 
            !suggestions.find(s => s.text === trimmedPart)) {
          
          // Smart categorization: Detect if this is a building name vs area name
          const isSpecificBuilding = this.isBuildingName(trimmedPart);
          
          suggestions.push({ 
            text: trimmedPart, 
            type: isSpecificBuilding ? 'building' : 'area', 
            count: row.count 
          });
        }
      });
      
      // Add city if it matches
      if (row.city.toLowerCase().includes(lowercaseQuery) && 
          !suggestions.find(s => s.text === row.city)) {
        suggestions.push({ 
          text: row.city, 
          type: 'city', 
          count: row.count 
        });
      }
    });

    return suggestions.slice(0, 8);
  }

  /**
   * Helper method to detect if a name is a specific building vs general area
   */
  private isBuildingName(name: string): boolean {
    const nameLower = name.toLowerCase();
    
    // Building indicators
    const buildingKeywords = [
      'suite', 'apartment', 'residences', 'residence', 'tower', 'plaza', 'mall',
      'condo', 'condominium', 'point', 'court', 'park', 'garden', 'villas',
      'heights', 'place', 'square', 'centre', 'center', 'building', 'complex',
      'terrace', 'manor', 'lodge', 'estate', 'palms', 'vista', 'hillside',
      'embassy', 'regency', 'crown', 'pinnacle', 'meridien', 'maxim', 'aria',
      'arte', 'nova', 'legasi', 'sky', 'skyline', 'tropicana', 'pavilion'
    ];
    
    // Check if name contains building-specific keywords
    const hasBuildingKeyword = buildingKeywords.some(keyword => nameLower.includes(keyword));
    
    // Check if it has building name patterns (The [Name], [Name] Suite, etc.)
    const hasBuildingPattern = /^(the\s+)?[a-z\s]+(suite|apartment|residences?|tower|plaza|point|court|park|garden|villas|heights|place|square|centre|center|building|complex)/i.test(name);
    
    return hasBuildingKeyword || hasBuildingPattern;
  }

  // Auto-expire listings that are older than 3 months
  async expireOldListings(): Promise<void> {
    try {
      // Calculate the date 3 months ago from today
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      // Expire online listings posted more than 3 months ago
      const result = await db
        .update(properties)
        .set({ 
          status: 'expired' as any,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(properties.status, 'online' as any),
            sql`${properties.postedAt} IS NOT NULL AND ${properties.postedAt} < ${threeMonthsAgo}`
          )
        )
        .returning();
      
      if (result.length > 0) {
        console.log(`🕐 AUTO-EXPIRED: ${result.length} listings older than 3 months`);
      }
    } catch (error) {
      console.error('Error expiring old listings:', error);
    }
  }

  async getPropertySuggestions(query: string, searchType: string, limit: number = 5): Promise<Array<{
    id: string;
    title: string;
    propertyType: string;
    price: number;
    location: string;
  }>> {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const results = await db
        .select({
          id: properties.id,
          title: properties.title,
          propertyType: properties.propertyType,
          price: properties.price,
          address: properties.address,
          city: properties.city
        })
        .from(properties)
        .where(
          and(
            eq(properties.status, 'online' as any),
            or(
              ilike(properties.title, `%${query}%`),
              ilike(properties.address, `%${query}%`),
              sql`LOWER(${properties.propertyType}::text) LIKE LOWER(${`%${query}%`})`
            )
          )
        )
        .orderBy(sql`
          CASE 
            WHEN LOWER(${properties.title}) LIKE ${`%${query.toLowerCase()}%`} THEN 1
            WHEN LOWER(${properties.address}) LIKE ${`%${query.toLowerCase()}%`} THEN 2
            ELSE 3
          END
        `)
        .limit(limit);

      return results.map(prop => ({
        id: prop.id,
        title: prop.title,
        propertyType: prop.propertyType,
        price: parseFloat(prop.price.toString()) || 0,
        location: `${prop.address}, ${prop.city}`
      }));
    } catch (error) {
      console.error('Property suggestions error:', error);
      return [];
    }
  }

  // Geocoding cache operations
  async getCachedGeocoding(normalizedQuery: string): Promise<GeocodingCache | null> {
    try {
      const cached = await db
        .select()
        .from(geocodingCache)
        .where(eq(geocodingCache.normalizedQuery, normalizedQuery))
        .limit(1);

      if (cached.length > 0) {
        // Update hit count and last used
        await db
          .update(geocodingCache)
          .set({
            hitCount: sql`${geocodingCache.hitCount} + 1`,
            lastUsed: new Date()
          })
          .where(eq(geocodingCache.id, cached[0].id));

        return cached[0];
      }

      return null;
    } catch (error) {
      console.error('Error getting cached geocoding:', error);
      return null;
    }
  }

  async saveCachedGeocoding(data: InsertGeocodingCache): Promise<void> {
    try {
      await db.insert(geocodingCache).values(data).onConflictDoNothing();
    } catch (error) {
      console.error('Error saving geocoding cache:', error);
    }
  }

  // API usage logging
  async logApiUsage(data: InsertApiUsageLog): Promise<void> {
    try {
      await db.insert(apiUsageLog).values(data);
    } catch (error) {
      console.error('Error logging API usage:', error);
    }
  }

  async getApiUsageStats(service?: string, startDate?: Date, endDate?: Date): Promise<{
    totalCalls: number;
    cacheHitRate: number;
    estimatedCost: number;
    byService: Array<{
      service: string;
      calls: number;
      cost: number;
      cacheHitRate: number;
    }>;
  }> {
    try {
      const conditions = [];
      
      if (service) {
        conditions.push(eq(apiUsageLog.service, service));
      }
      if (startDate) {
        conditions.push(gte(apiUsageLog.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(apiUsageLog.createdAt, endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get overall stats
      const stats = await db
        .select({
          totalCalls: sql<number>`count(*)::int`,
          cacheHits: sql<number>`sum(case when ${apiUsageLog.cacheHit} then 1 else 0 end)::int`,
          totalCost: sql<number>`sum(${apiUsageLog.estimatedCost})::float`
        })
        .from(apiUsageLog)
        .where(whereClause);

      // Get stats by service
      const byServiceStats = await db
        .select({
          service: apiUsageLog.service,
          calls: sql<number>`count(*)::int`,
          cost: sql<number>`sum(${apiUsageLog.estimatedCost})::float`,
          cacheHits: sql<number>`sum(case when ${apiUsageLog.cacheHit} then 1 else 0 end)::int`
        })
        .from(apiUsageLog)
        .where(whereClause)
        .groupBy(apiUsageLog.service);

      const totalCalls = stats[0]?.totalCalls || 0;
      const cacheHits = stats[0]?.cacheHits || 0;

      return {
        totalCalls,
        cacheHitRate: totalCalls > 0 ? (cacheHits / totalCalls) * 100 : 0,
        estimatedCost: stats[0]?.totalCost || 0,
        byService: byServiceStats.map(s => ({
          service: s.service,
          calls: s.calls,
          cost: s.cost || 0,
          cacheHitRate: s.calls > 0 ? ((s.cacheHits || 0) / s.calls) * 100 : 0
        }))
      };
    } catch (error) {
      console.error('Error getting API usage stats:', error);
      return {
        totalCalls: 0,
        cacheHitRate: 0,
        estimatedCost: 0,
        byService: []
      };
    }
  }

  // AI query cache operations
  async getCachedAiQuery(normalizedQuery: string, searchType?: string): Promise<AiQueryCache | null> {
    try {
      const conditions = [eq(aiQueryCache.normalizedQuery, normalizedQuery)];
      if (searchType) {
        conditions.push(eq(aiQueryCache.searchType, searchType));
      }

      const cached = await db
        .select()
        .from(aiQueryCache)
        .where(and(...conditions))
        .limit(1);

      if (cached.length > 0) {
        // Update hit count and last used
        await db
          .update(aiQueryCache)
          .set({
            hitCount: sql`${aiQueryCache.hitCount} + 1`,
            lastUsed: new Date()
          })
          .where(eq(aiQueryCache.id, cached[0].id));

        return cached[0];
      }

      return null;
    } catch (error) {
      console.error('Error getting cached AI query:', error);
      return null;
    }
  }

  async saveCachedAiQuery(data: InsertAiQueryCache): Promise<void> {
    try {
      await db.insert(aiQueryCache).values(data).onConflictDoNothing();
    } catch (error) {
      console.error('Error saving AI query cache:', error);
    }
  }

  // Travel time cache operations
  async getCachedTravelTime(originLat: number, originLng: number, destLat: number, destLng: number, mode: string = 'driving'): Promise<TravelTimeCache | null> {
    try {
      // Use a tolerance for coordinate matching (0.001 ≈ 100m)
      const tolerance = 0.001;
      
      const cached = await db
        .select()
        .from(travelTimeCache)
        .where(
          and(
            sql`ABS(${travelTimeCache.originLat} - ${originLat}) < ${tolerance}`,
            sql`ABS(${travelTimeCache.originLng} - ${originLng}) < ${tolerance}`,
            sql`ABS(${travelTimeCache.destLat} - ${destLat}) < ${tolerance}`,
            sql`ABS(${travelTimeCache.destLng} - ${destLng}) < ${tolerance}`,
            eq(travelTimeCache.mode, mode)
          )
        )
        .limit(1);

      if (cached.length > 0) {
        // Update hit count and last used
        await db
          .update(travelTimeCache)
          .set({
            hitCount: sql`${travelTimeCache.hitCount} + 1`,
            lastUsed: new Date()
          })
          .where(eq(travelTimeCache.id, cached[0].id));

        return cached[0];
      }

      return null;
    } catch (error) {
      console.error('Error getting cached travel time:', error);
      return null;
    }
  }

  async saveCachedTravelTime(data: InsertTravelTimeCache): Promise<void> {
    try {
      await db.insert(travelTimeCache).values(data);
    } catch (error) {
      console.error('Error saving travel time cache:', error);
    }
  }
}

export const storage = new DatabaseStorage();
