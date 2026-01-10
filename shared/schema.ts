import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
  customType,
  real,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Custom PostGIS geometry type
const geometry = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geometry(Point, 4326)';
  },
  toDriver(value: string): string {
    return value;
  },
});

// Locations table for geocoded places from OpenStreetMap
export const locations = pgTable(
  "locations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    city: varchar("city"),
    state: varchar("state"),
    postcode: varchar("postcode"),
    country: varchar("country").default("Malaysia"),
    buildingType: varchar("building_type"), // apartments, residential, commercial etc
    geometry: geometry("geometry"), // PostGIS point for efficient geo queries
    osmId: varchar("osm_id").unique(), // Original OpenStreetMap ID
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("locations_name_idx").on(table.name),
    index("locations_city_idx").on(table.city),
    index("locations_state_idx").on(table.state),
    index("locations_geometry_idx").using("gist", table.geometry),
    uniqueIndex("locations_osm_id_idx").on(table.osmId),
  ],
);

// Malaysian Buildings enum for property types
export const malaysianBuildingTypeEnum = pgEnum("malaysian_building_type", [
  "condominium",
  "apartment", 
  "serviced_apartment",
  "townhouse",
  "landed",
  "commercial",
  "mixed_development"
]);

// Malaysian Buildings table for comprehensive residential buildings database
export const malaysianBuildings = pgTable(
  "malaysian_buildings",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    type: malaysianBuildingTypeEnum("type").notNull(),
    area: varchar("area").notNull(), // e.g., "Mont Kiara", "Damansara Heights"
    city: varchar("city").notNull(),
    state: varchar("state").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    geometry: geometry("geometry"), // PostGIS point for efficient geo queries
    developer: varchar("developer"),
    yearBuilt: integer("year_built"),
    totalUnits: integer("total_units"),
    // Additional metadata for comprehensive search
    searchKeywords: text("search_keywords").array(), // For enhanced search matching
    verified: boolean("verified").default(true), // For quality control
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("malaysian_buildings_name_idx").on(table.name),
    index("malaysian_buildings_area_idx").on(table.area),
    index("malaysian_buildings_city_idx").on(table.city),
    index("malaysian_buildings_state_idx").on(table.state),
    index("malaysian_buildings_type_idx").on(table.type),
    index("malaysian_buildings_geometry_idx").using("gist", table.geometry),
    // Full-text search index for name and area
    index("malaysian_buildings_search_idx").using("gin", sql`(
      setweight(to_tsvector('english', ${table.name}), 'A') ||
      setweight(to_tsvector('english', ${table.area}), 'B') ||
      setweight(to_tsvector('english', ${table.city}), 'C')
    )`),
  ],
);

// Geocoding cache table for persistent location caching
export const geocodingCache = pgTable(
  "geocoding_cache",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    normalizedQuery: varchar("normalized_query").notNull().unique(), // Canonical form of location query
    originalQuery: varchar("original_query").notNull(), // Original search query
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    formattedAddress: text("formatted_address"),
    city: varchar("city"),
    state: varchar("state"),
    country: varchar("country").default("Malaysia"),
    placeType: varchar("place_type"), // building, locality, route, etc
    source: varchar("source").notNull(), // "google", "openroute", "local_db", "openai"
    confidence: real("confidence"), // Confidence score 0-1
    boundingBox: jsonb("bounding_box"), // Geographic bounding box
    metadata: jsonb("metadata"), // Additional data from API response
    hitCount: integer("hit_count").default(1), // Track cache usage
    lastUsed: timestamp("last_used").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("geocoding_cache_normalized_idx").on(table.normalizedQuery),
    index("geocoding_cache_query_idx").on(table.originalQuery),
    index("geocoding_cache_source_idx").on(table.source),
    index("geocoding_cache_last_used_idx").on(table.lastUsed),
  ],
);

// API usage tracking table for cost monitoring
export const apiUsageLog = pgTable(
  "api_usage_log",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    service: varchar("service").notNull(), // "google_geocoding", "openroute_distance", etc
    endpoint: varchar("endpoint"), // Specific API endpoint called
    requestType: varchar("request_type"), // "geocode", "distance_matrix", "directions"
    query: text("query"), // The query that triggered the API call
    cacheHit: boolean("cache_hit").default(false),
    estimatedCost: real("estimated_cost"), // Cost in USD
    responseTime: integer("response_time"), // Response time in ms
    success: boolean("success").default(true),
    errorMessage: text("error_message"),
    userId: varchar("user_id"), // Optional user who triggered the call
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("api_usage_service_idx").on(table.service),
    index("api_usage_date_idx").on(table.createdAt),
    index("api_usage_user_idx").on(table.userId),
    index("api_usage_cache_hit_idx").on(table.cacheHit),
  ],
);

// AI query parsing cache for search queries
export const aiQueryCache = pgTable(
  "ai_query_cache",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    normalizedQuery: varchar("normalized_query").notNull().unique(),
    originalQuery: text("original_query").notNull(),
    parsedFilters: jsonb("parsed_filters").notNull(), // Structured search filters
    searchType: varchar("search_type"), // 'rent' or 'sale'
    confidence: real("confidence"),
    modelUsed: varchar("model_used"), // 'gpt-4o', 'gpt-4o-mini', 'heuristic'
    tokensUsed: integer("tokens_used"),
    hitCount: integer("hit_count").default(1),
    lastUsed: timestamp("last_used").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("ai_query_cache_normalized_idx").on(table.normalizedQuery),
    index("ai_query_cache_search_type_idx").on(table.searchType),
    index("ai_query_cache_last_used_idx").on(table.lastUsed),
  ],
);

// Travel time/distance cache for proximity searches
export const travelTimeCache = pgTable(
  "travel_time_cache",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    originLat: real("origin_lat").notNull(),
    originLng: real("origin_lng").notNull(),
    destLat: real("dest_lat").notNull(),
    destLng: real("dest_lng").notNull(),
    durationSeconds: real("duration_seconds").notNull(), // Travel time in seconds (consistent with API)
    distanceMeters: real("distance_meters").notNull(), // Distance in meters (consistent with API)
    mode: varchar("mode").default("driving"), // 'driving', 'walking', 'cycling'
    route: jsonb("route"), // Polyline or route details
    hitCount: integer("hit_count").default(1),
    lastUsed: timestamp("last_used").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("travel_time_origin_idx").on(table.originLat, table.originLng),
    index("travel_time_dest_idx").on(table.destLat, table.destLng),
    index("travel_time_mode_idx").on(table.mode),
    index("travel_time_last_used_idx").on(table.lastUsed),
  ],
);

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password"), // Hashed password for email/password auth
  firebaseUid: varchar("firebase_uid").unique(), // Firebase UID for Google Sign-In
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  nickname: varchar("nickname"), // Agent display name (permanent, contact support to change)
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"), // Phone number for contact (WhatsApp)
  whatsappNumber: varchar("whatsapp_number"), // WhatsApp number (can be different from phone)
  role: varchar("role").default("user"), // "user" or "agent"
  agentApplicationStatus: varchar("agent_application_status"), // null, "pending", "approved", "rejected"
  agentApplicationDate: timestamp("agent_application_date"),
  agentApprovalDate: timestamp("agent_approval_date"),
  aiCredits: integer("ai_credits").default(500), // AI credits for posting listings (5 credits per listing)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Agents table for property agents
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  nickname: varchar("nickname"), // Agent display name (permanent, contact support to change)
  email: varchar("email").unique(),
  phone: varchar("phone"),
  profileImage: varchar("profile_image"),
  company: varchar("company"),
  license: varchar("license"),
  specialties: text("specialties").array(),
  bio: text("bio"),
  areaExpertise: text("area_expertise"),
  experience: text("experience"),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  totalReviews: integer("total_reviews").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Property types enum
export const propertyTypeEnum = pgEnum("property_type", [
  // Original types
  "apartment",
  "condominium", 
  "house",
  "studio",
  "townhouse",
  "commercial",
  "industrial", 
  "land",
  "warehouse",
  "factory",
  // New residential types
  "flat",
  "service-residence",
  "cluster-house", 
  "semi-detached-house",
  "1-storey-terrace",
  "1.5-storey-terrace",
  "2-storey-terrace",
  "2.5-storey-terrace", 
  "3-storey-terrace",
  "3.5-storey-terrace",
  "4-storey-terrace",
  "4.5-storey-terrace",
  "terraced-house",
  "bungalow",
  "zero-lot-bungalow",
  "link-bungalow",
  "bungalow-land",
  "twin-villa",
  "residential-land-plot",
  // New commercial types
  "office",
  "shop", 
  "shop-office",
  "retail-office",
  "retail-space",
  "sofo",
  "soho",
  "sovo",
  "commercial-bungalow",
  "commercial-semi-d",
  "hotel-resort", 
  "commercial-land",
  // New industrial types
  "industrial-land",
  "cluster-factory",
  "semi-d-factory",
  "detached-factory", 
  "terrace-factory",
  "agricultural-land",
]);

// Listing type enum
export const listingTypeEnum = pgEnum("listing_type", [
  "rent",
  "sale"
]);

// Property status enum - Updated for listing management
export const propertyStatusEnum = pgEnum("property_status", [
  "online",    // Posted and active listings
  "offline",   // Manually deactivated by agent
  "expired",   // Listings older than 3 months
  "draft",     // Incomplete/unpublished listings
  "sold",      // Keep for sold properties
  "rented",    // Keep for rented properties
]);

// Property tenure enum 
export const tenureEnum = pgEnum("tenure", [
  "freehold",
  "leasehold"
]);

// Title type enum
export const titleTypeEnum = pgEnum("title_type", [
  "individual", 
  "strata",
  "master"
]);

// Land title type enum
export const landTitleTypeEnum = pgEnum("land_title_type", [
  "residential",
  "commercial", 
  "industrial",
  "agriculture"
]);

// Properties table
// Furnished condition enum
export const furnishedConditionEnum = pgEnum("furnished_condition", [
  "unfurnished",
  "partially_furnished", 
  "fully_furnished"
]);

// Lot type enum
export const lotTypeEnum = pgEnum("lot_type", [
  "intermediate",
  "end_lot",
  "corner_lot"
]);

// Electricity phase enum (for industrial properties)
export const electricityPhaseEnum = pgEnum("electricity_phase", [
  "1_phase",
  "3_phase",
  "prefer_not_to_say"
]);

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  propertyType: propertyTypeEnum("property_type").notNull(),
  listingType: listingTypeEnum("listing_type").notNull().default("rent"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  roi: decimal("roi", { precision: 5, scale: 2 }), // Return on Investment percentage (optional)
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  parking: integer("parking"), // Number of parking spaces (optional)
  builtUpSize: integer("built_up_size").notNull(), // Built-up area in sq ft (mandatory)
  landSize: integer("land_size"), // Land area in sq ft (optional)
  furnishedCondition: furnishedConditionEnum("furnished_condition"), // New furnished condition field
  lotType: lotTypeEnum("lot_type").notNull(), // Lot type (intermediate, end lot, corner lot)
  address: text("address").notNull(),
  street: text("street"), // Optional street name for better search
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  postalCode: varchar("postal_code"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  images: text("images").array(),
  agentId: varchar("agent_id").notNull(),
  status: propertyStatusEnum("status").default("draft"),
  postedAt: timestamp("posted_at"), // When listing went online (null for drafts)
  expiryDate: timestamp("expiry_date"), // 3 months after postedAt (null for drafts)
  featured: boolean("featured").default(false),
  featuredUntil: timestamp("featured_until"), // When feature boost expires (7 days from boost)
  lastRefreshedAt: timestamp("last_refreshed_at"), // When listing was last refreshed
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }), // Commission earned when sold/rented
  // Enhanced fields for agent accountability and property verification
  lastRenovated: integer("last_renovated"),
  propertyCondition: varchar("property_condition"), // "excellent", "good", "fair", "needs_renovation"
  nearbyLandmarks: text("nearby_landmarks").array(),
  distanceToLRT: varchar("distance_to_lrt"),
  distanceToMRT: varchar("distance_to_mrt"),
  distanceToKTM: varchar("distance_to_ktm"),
  distanceToMonorail: varchar("distance_to_monorail"),
  distanceToMall: varchar("distance_to_mall"),
  distanceToSchool: varchar("distance_to_school"),
  floorPlan: varchar("floor_plan_url"),
  propertyDocuments: text("property_documents").array(),
  amenities: text("amenities").array(), // Property amenities like gym, pool, parking, etc.
  verificationStatus: varchar("verification_status").default("pending"), // "pending", "verified", "rejected"
  verificationNotes: text("verification_notes"),
  agentLicense: varchar("agent_license"),
  minimumDescriptionMet: boolean("minimum_description_met").default(false),
  // New legal property fields
  tenure: tenureEnum("tenure"),
  titleType: titleTypeEnum("title_type"),  
  landTitleType: landTitleTypeEnum("land_title_type"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Performance indexes for fast property searches
  index("properties_listing_type_city_price_idx").on(table.listingType, table.city, table.price),
  index("properties_listing_type_roi_idx").on(table.listingType, table.roi),
  index("properties_status_idx").on(table.status),
  index("properties_city_idx").on(table.city),
  index("properties_state_idx").on(table.state),
  index("properties_property_type_idx").on(table.propertyType),
  index("properties_price_idx").on(table.price),
  index("properties_bedrooms_idx").on(table.bedrooms),
  index("properties_bathrooms_idx").on(table.bathrooms),
  index("properties_agent_id_idx").on(table.agentId),
  index("properties_created_at_idx").on(table.createdAt),
  // Full-text search index for title, description, and address
  index("properties_search_idx").using("gin", sql`(
    setweight(to_tsvector('english', ${table.title}), 'A') ||
    setweight(to_tsvector('english', coalesce(${table.description}, '')), 'B') ||
    setweight(to_tsvector('english', ${table.address}), 'C')
  )`),
]);

// Credit transaction types enum
export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "post",       // Posting new listing (5 credits)
  "repost",     // Reposting expired listing (3 credits)
  "boost",      // Feature boost for 7 days (5 credits)
  "refresh",    // Refresh listing (1 credit)
  "purchase",   // Buying credits
  "refund",     // Credit refund
  "admin_adjustment" // Manual admin adjustment
]);

// Credit transactions table for audit logging and analytics
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: creditTransactionTypeEnum("type").notNull(),
  amount: integer("amount").notNull(), // Negative for debits, positive for credits
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  propertyId: varchar("property_id"), // Related property if applicable
  description: text("description"),
  metadata: jsonb("metadata"), // Additional data (e.g., feature boost duration)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("credit_transactions_user_idx").on(table.userId),
  index("credit_transactions_type_idx").on(table.type),
  index("credit_transactions_property_idx").on(table.propertyId),
  index("credit_transactions_created_at_idx").on(table.createdAt),
]);

// Messages table for user-agent communication
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  propertyId: varchar("property_id"),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Search queries table for AI search tracking
export const searchQueries = pgTable("search_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  query: text("query").notNull(),
  parsedFilters: jsonb("parsed_filters"),
  resultsCount: integer("results_count"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User preferences derived from search history
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  preferredPropertyTypes: text("preferred_property_types").array(),
  priceRangeMin: decimal("price_range_min", { precision: 10, scale: 2 }),
  priceRangeMax: decimal("price_range_max", { precision: 10, scale: 2 }),
  preferredCities: text("preferred_cities").array(),
  preferredAmenities: text("preferred_amenities").array(),
  preferredBedrooms: integer("preferred_bedrooms"),
  preferredBathrooms: integer("preferred_bathrooms"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Favorites table for user property favorites
export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  propertyId: varchar("property_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Interactions table for tracking clicks, views, and behavior
export const userInteractions = pgTable("user_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: integer("user_id").notNull(),
  propertyId: varchar("property_id").notNull(),
  interactionType: varchar("interaction_type").notNull(), // 'click', 'view', 'contact', 'share'
  sessionId: varchar("session_id"), // To track session-based interactions
  searchQuery: text("search_query"), // What they searched when they clicked this property
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_interactions_user_id_idx").on(table.userId),
  index("user_interactions_property_id_idx").on(table.propertyId),
  index("user_interactions_type_idx").on(table.interactionType),
  index("user_interactions_created_at_idx").on(table.createdAt),
]);

// MRT/LRT/KTM Transport Stations table for transportation-based property search
export const transportStations = pgTable(
  "transport_stations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    stationName: varchar("station_name").notNull(),
    stationCode: varchar("station_code").notNull().unique(), // e.g., "KG01", "PY01", "KJ1"
    lineName: varchar("line_name").notNull(), // e.g., "MRT Kajang Line", "LRT Kelana Jaya Line"
    transportType: varchar("transport_type").notNull(), // "MRT", "LRT", "Monorail", "KTM", "BRT"
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    geometry: geometry("geometry"), // PostGIS point for efficient geo queries
    operationalStatus: varchar("operational_status").default("operational"), // "operational", "under_construction", "planned"
    openingYear: integer("opening_year"),
    zone: varchar("zone"), // Pricing zone if applicable
    address: varchar("address"),
    city: varchar("city"),
    state: varchar("state").default("Kuala Lumpur"), // Most stations are in KL/Selangor
    interchangeStations: text("interchange_stations").array(), // Connected stations for transfers
    facilities: text("facilities").array(), // e.g., ["parking", "wheelchair_access", "escalator"]
    nearbyLandmarks: text("nearby_landmarks").array(), // Major landmarks near the station
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("transport_stations_name_idx").on(table.stationName),
    index("transport_stations_code_idx").on(table.stationCode),
    index("transport_stations_line_idx").on(table.lineName),
    index("transport_stations_type_idx").on(table.transportType),
    index("transport_stations_city_idx").on(table.city),
    index("transport_stations_geometry_idx").using("gist", table.geometry),
    // Full-text search for station names and landmarks
    index("transport_stations_search_idx").using("gin", sql`(
      setweight(to_tsvector('english', ${table.stationName}), 'A') ||
      setweight(to_tsvector('english', ${table.lineName}), 'B') ||
      setweight(to_tsvector('english', array_to_string(${table.nearbyLandmarks}, ' ')), 'C')
    )`),
  ],
);

// Mortgage eligibility checks table
export const mortgageEligibilityChecks = pgTable("mortgage_eligibility_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  propertyId: varchar("property_id"),
  monthlyIncome: decimal("monthly_income", { precision: 10, scale: 2 }).notNull(),
  monthlyDebt: decimal("monthly_debt", { precision: 10, scale: 2 }).default('0'),
  downPayment: decimal("down_payment", { precision: 10, scale: 2 }).notNull(),
  employmentStatus: varchar("employment_status").notNull(), // "employed", "self-employed", "unemployed"
  employmentYears: integer("employment_years").notNull(),
  creditScore: integer("credit_score"), // Optional, estimated if not provided
  
  // Calculated results
  eligibilityStatus: varchar("eligibility_status").notNull(), // "eligible", "conditional", "not-eligible"
  maxLoanAmount: decimal("max_loan_amount", { precision: 10, scale: 2 }),
  monthlyPayment: decimal("monthly_payment", { precision: 10, scale: 2 }),
  debtToIncomeRatio: decimal("debt_to_income_ratio", { precision: 5, scale: 2 }),
  loanToValueRatio: decimal("loan_to_value_ratio", { precision: 5, scale: 2 }),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  loanTerm: integer("loan_term").default(30), // years
  
  // Additional info
  recommendations: text("recommendations").array(),
  bankSuggestions: text("bank_suggestions").array(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  properties: many(properties),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  favorites: many(favorites),
  searchQueries: many(searchQueries),
  preferences: one(userPreferences),
}));

export const agentsRelations = relations(agents, ({ many }) => ({
  properties: many(properties),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  agent: one(agents, {
    fields: [properties.agentId],
    references: [agents.id],
  }),
  messages: many(messages),
  favorites: many(favorites),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
  property: one(properties, {
    fields: [messages.propertyId],
    references: [properties.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [favorites.propertyId],
    references: [properties.id],
  }),
}));

export const mortgageEligibilityChecksRelations = relations(mortgageEligibilityChecks, ({ one }) => ({
  user: one(users, {
    fields: [mortgageEligibilityChecks.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [mortgageEligibilityChecks.propertyId],
    references: [properties.id],
  }),
}));

export const searchQueriesRelations = relations(searchQueries, ({ one }) => ({
  user: one(users, {
    fields: [searchQueries.userId],
    references: [users.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

// Schema types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Property Analytics & Performance Tracking
export const propertyAnalytics = pgTable("property_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  date: timestamp("date").defaultNow(),
  views: integer("views").default(0),
  inquiries: integer("inquiries").default(0),
  applications: integer("applications").default(0),
  conversions: integer("conversions").default(0), // successful rentals/sales
  createdAt: timestamp("created_at").defaultNow(),
});

// Market Analytics
export const marketAnalytics = pgTable("market_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  area: varchar("area").notNull(),
  propertyType: varchar("property_type").notNull(),
  averagePrice: decimal("average_price", { precision: 10, scale: 2 }),
  demandScore: integer("demand_score").default(0), // 1-100 scale
  totalListings: integer("total_listings").default(0),
  averageDaysOnMarket: integer("average_days_on_market"),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lead Generation & Inquiries
export const inquiries = pgTable("inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  agentId: varchar("agent_id").references(() => users.id).notNull(),
  clientName: varchar("client_name").notNull(),
  clientEmail: varchar("client_email").notNull(),
  clientPhone: varchar("client_phone"),
  message: text("message"),
  status: varchar("status").default("new"), // new, contacted, viewing_scheduled, closed
  source: varchar("source").default("website"), // website, phone, referral
  priority: varchar("priority").default("medium"), // low, medium, high
  followUpDate: timestamp("follow_up_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Property Status Management
export const propertyStatuses = pgTable("property_statuses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  status: varchar("status").notNull(), // available, rented, under_maintenance, withdrawn
  statusDate: timestamp("status_date").defaultNow(),
  notes: text("notes"),
  rentedTo: varchar("rented_to"), // tenant name if rented
  rentStartDate: timestamp("rent_start_date"),
  rentEndDate: timestamp("rent_end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});


// Saved Searches
export const savedSearches = pgTable("saved_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").references(() => users.id).notNull(),
  name: varchar("name").notNull(),
  searchCriteria: jsonb("search_criteria").notNull(), // stored search filters
  alertEnabled: boolean("alert_enabled").default(false),
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Calendar Events & Appointments
export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").references(() => users.id).notNull(),
  propertyId: varchar("property_id").references(() => properties.id),
  inquiryId: varchar("inquiry_id").references(() => inquiries.id),
  title: varchar("title").notNull(),
  description: text("description"),
  eventType: varchar("event_type").notNull(), // viewing, follow_up, maintenance, meeting
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: varchar("status").default("scheduled"), // scheduled, completed, cancelled
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications & Alerts
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // inquiry, viewing, payment, commission
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  priority: varchar("priority").default("medium"), // low, medium, high, urgent
  relatedId: varchar("related_id"), // ID of related entity
  relatedType: varchar("related_type"), // property, inquiry, commission, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Bulk Upload Sessions
export const bulkUploadSessions = pgTable("bulk_upload_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").references(() => users.id).notNull(),
  fileName: varchar("file_name").notNull(),
  totalRows: integer("total_rows").notNull(),
  processedRows: integer("processed_rows").default(0),
  successfulRows: integer("successful_rows").default(0),
  failedRows: integer("failed_rows").default(0),
  status: varchar("status").default("processing"), // processing, completed, failed
  errorLog: jsonb("error_log"), // array of errors
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Define relations
export const propertyAnalyticsRelations = relations(propertyAnalytics, ({ one }) => ({
  property: one(properties, {
    fields: [propertyAnalytics.propertyId],
    references: [properties.id],
  }),
}));

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  property: one(properties, {
    fields: [inquiries.propertyId],
    references: [properties.id],
  }),
  agent: one(users, {
    fields: [inquiries.agentId],
    references: [users.id],
  }),
}));


export const savedSearchesRelations = relations(savedSearches, ({ one }) => ({
  agent: one(users, {
    fields: [savedSearches.agentId],
    references: [users.id],
  }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  agent: one(users, {
    fields: [calendarEvents.agentId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [calendarEvents.propertyId],
    references: [properties.id],
  }),
  inquiry: one(inquiries, {
    fields: [calendarEvents.inquiryId],
    references: [inquiries.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  agent: one(users, {
    fields: [notifications.agentId],
    references: [users.id],
  }),
}));

// Type exports for new tables
export type PropertyAnalytics = typeof propertyAnalytics.$inferSelect;
export type InsertPropertyAnalytics = typeof propertyAnalytics.$inferInsert;

export type MarketAnalytics = typeof marketAnalytics.$inferSelect;
export type InsertMarketAnalytics = typeof marketAnalytics.$inferInsert;

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = typeof inquiries.$inferInsert;

export type PropertyStatus = typeof propertyStatuses.$inferSelect;
export type InsertPropertyStatus = typeof propertyStatuses.$inferInsert;


export type SavedSearch = typeof savedSearches.$inferSelect;
export type InsertSavedSearch = typeof savedSearches.$inferInsert;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export type BulkUploadSession = typeof bulkUploadSessions.$inferSelect;
export type InsertBulkUploadSession = typeof bulkUploadSessions.$inferInsert;

export type MortgageEligibilityCheck = typeof mortgageEligibilityChecks.$inferSelect;
export type InsertMortgageEligibilityCheck = typeof mortgageEligibilityChecks.$inferInsert;

// Insert schemas using drizzle-zod
export const insertInquirySchema = createInsertSchema(inquiries);
export const insertCalendarEventSchema = createInsertSchema(calendarEvents);
export const insertSavedSearchSchema = createInsertSchema(savedSearches);
export const insertNotificationSchema = createInsertSchema(notifications);

// Mortgage eligibility Zod schemas
export const insertMortgageEligibilityCheckSchema = createInsertSchema(mortgageEligibilityChecks).omit({
  id: true,
  eligibilityStatus: true,
  maxLoanAmount: true,
  monthlyPayment: true,
  debtToIncomeRatio: true,
  loanToValueRatio: true,
  interestRate: true,
  recommendations: true,
  bankSuggestions: true,
  createdAt: true,
});

export type InsertMortgageEligibilityCheckInput = z.infer<typeof insertMortgageEligibilityCheckSchema>;

// Location schemas
export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  geometry: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLocationInput = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;

// Gamification Tables

// User challenges and achievements
export const userChallenges = pgTable("user_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  challengeType: varchar("challenge_type").notNull(), // 'property_explorer', 'area_discoverer', 'type_collector'
  progress: integer("progress").default(0).notNull(),
  target: integer("target").notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  rewardClaimed: boolean("reward_claimed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User rewards and points
export const userRewards = pgTable("user_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  rewardType: varchar("reward_type").notNull(), // 'points', 'badge', 'discount', 'premium_feature'
  rewardValue: varchar("reward_value").notNull(), // JSON string with reward details
  earnedFrom: varchar("earned_from").notNull(), // challenge_id or action type
  claimedAt: timestamp("claimed_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// User exploration history for tracking unique properties/areas visited
export const userExplorations = pgTable("user_explorations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  propertyId: varchar("property_id").references(() => properties.id),
  area: varchar("area"), // City/area name
  propertyType: varchar("property_type"),
  action: varchar("action").notNull(), // 'viewed', 'favorited', 'contacted'
  timestamp: timestamp("timestamp").defaultNow(),
});

// User stats and level
export const userStats = pgTable("user_stats", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  totalPoints: integer("total_points").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  propertiesViewed: integer("properties_viewed").default(0).notNull(),
  areasExplored: integer("areas_explored").default(0).notNull(),
  typesDiscovered: integer("types_discovered").default(0).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastActiveDate: timestamp("last_active_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UserChallenge = typeof userChallenges.$inferSelect;
export type InsertUserChallenge = typeof userChallenges.$inferInsert;
export type UserReward = typeof userRewards.$inferSelect;
export type InsertUserReward = typeof userRewards.$inferInsert;
export type UserExploration = typeof userExplorations.$inferSelect;
export type InsertUserExploration = typeof userExplorations.$inferInsert;
export type UserStats = typeof userStats.$inferSelect;
export type InsertUserStats = typeof userStats.$inferInsert;

// New Feature Tables
// 1. Crowd-sourced reviews for developers and projects
export const developerReviews = pgTable("developer_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Allow anonymous
  developerName: varchar("developer_name").notNull(),
  projectName: varchar("project_name"),
  rating: integer("rating").notNull(), // 1-5 stars
  title: varchar("title").notNull(),
  review: text("review").notNull(),
  experience: varchar("experience"), // 'owner', 'tenant', 'buyer', 'agent'
  isAnonymous: boolean("is_anonymous").default(false),
  isVerified: boolean("is_verified").default(false),
  helpfulVotes: integer("helpful_votes").default(0),
  reportCount: integer("report_count").default(0),
  status: varchar("status").default("active"), // 'active', 'hidden', 'removed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviewVotes = pgTable("review_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reviewId: varchar("review_id").notNull().references(() => developerReviews.id, { onDelete: "cascade" }),
  voteType: varchar("vote_type").notNull(), // 'helpful', 'report'
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. Rental yield data for heat map
export const rentalYieldData = pgTable("rental_yield_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  area: varchar("area").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  averageRentPrice: decimal("average_rent_price", { precision: 10, scale: 2 }),
  averagePropertyPrice: decimal("average_property_price", { precision: 12, scale: 2 }),
  rentalYield: decimal("rental_yield", { precision: 5, scale: 2 }), // Percentage
  propertyCount: integer("property_count").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 3. Nearby amenities analysis
export const propertyAmenityScores = pgTable("property_amenity_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  walkabilityScore: integer("walkability_score"), // 0-100
  transitScore: integer("transit_score"), // 0-100
  schoolScore: integer("school_score"), // 0-100
  shoppingScore: integer("shopping_score"), // 0-100
  healthcareScore: integer("healthcare_score"), // 0-100
  entertainmentScore: integer("entertainment_score"), // 0-100
  overallScore: integer("overall_score"), // 0-100
  nearbySchools: jsonb("nearby_schools"), // Array of school objects
  nearbyTransit: jsonb("nearby_transit"), // Array of transit options
  nearbyShopping: jsonb("nearby_shopping"), // Array of shopping centers
  nearbyHealthcare: jsonb("nearby_healthcare"), // Array of hospitals/clinics
  lastAnalyzed: timestamp("last_analyzed").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Types for new features
export type DeveloperReview = typeof developerReviews.$inferSelect;
export type InsertDeveloperReview = typeof developerReviews.$inferInsert;
export type ReviewVote = typeof reviewVotes.$inferSelect;
export type InsertReviewVote = typeof reviewVotes.$inferInsert;
export type RentalYieldData = typeof rentalYieldData.$inferSelect;
export type InsertRentalYieldData = typeof rentalYieldData.$inferInsert;
export type PropertyAmenityScore = typeof propertyAmenityScores.$inferSelect;
export type InsertPropertyAmenityScore = typeof propertyAmenityScores.$inferInsert;

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verificationStatus: true,
  verificationNotes: true,
  minimumDescriptionMet: true,
}).extend({
  // Enhanced validation rules for agent accountability
  description: z.string().min(1, "Description is required"),
  propertyCondition: z.enum(["excellent", "good", "fair", "needs_renovation"]).nullable().optional(),
  furnishedCondition: z.enum(["unfurnished", "partially_furnished", "fully_furnished"]).nullable().optional(),
  agentLicense: z.string().min(5, "Valid agent license is required for property listings"),
  // Coordinates are optional - backend will geocode from address if not provided
  latitude: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= -90 && num <= 90;
  }, "Valid latitude coordinate is required for property location").optional(),
  longitude: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= -180 && num <= 180;
  }, "Valid longitude coordinate is required for property location").optional(),
  landSize: z.number().min(1, "Land size must be greater than 0").optional(),
  // Price field: accept both number and string, then convert to string
  price: z.union([z.string(), z.number()]).transform(val => val.toString()),
  // ROI field: accept both number and string, then convert to string (same as price)
  roi: z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

// Extended property type with computed fields (nearest station, etc.)
export type PropertyWithEnrichments = Property & {
  nearestStation?: {
    name: string;
    distance: number; // in kilometers
  } | null;
};

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const insertSearchQuerySchema = createInsertSchema(searchQueries).omit({
  id: true,
  createdAt: true,
});
export type InsertSearchQuery = z.infer<typeof insertSearchQuerySchema>;
export type SearchQuery = typeof searchQueries.$inferSelect;

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  updatedAt: true,
});
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

// ==================== LOCATION MANAGEMENT SYSTEM ====================

// States table
export const states = pgTable("states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  code: varchar("code", { length: 3 }).notNull().unique(), // e.g., "KUL", "SEL"
  createdAt: timestamp("created_at").defaultNow(),
});

// Cities/Townships table
export const cities = pgTable("cities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  stateId: varchar("state_id").notNull().references(() => states.id),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  postalCodePrefix: varchar("postal_code_prefix", { length: 2 }), // e.g., "50", "47"
  createdAt: timestamp("created_at").defaultNow(),
});

// Areas/Taman table (neighborhoods within cities)
export const areas = pgTable("areas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  cityId: varchar("city_id").notNull().references(() => cities.id),
  areaType: varchar("area_type"), // "taman", "bandar", "desa", "sri", "section", "jalan", etc.
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  postalCode: varchar("postal_code", { length: 5 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Buildings/Developments table (specific properties/condos/apartments)
export const buildings = pgTable("buildings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  areaId: varchar("area_id").notNull().references(() => areas.id),
  buildingType: varchar("building_type"), // "condominium", "apartment", "mall", "office", "landed", etc.
  developerName: varchar("developer_name"),
  streetAddress: text("street_address"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  totalUnits: integer("total_units"),
  yearCompleted: integer("year_completed"),
  amenities: text("amenities").array(),
  googlePlaceId: varchar("google_place_id"), // For Google Maps integration
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Location Relations
export const statesRelations = relations(states, ({ many }) => ({
  cities: many(cities),
}));

export const citiesRelations = relations(cities, ({ one, many }) => ({
  state: one(states, {
    fields: [cities.stateId],
    references: [states.id],
  }),
  areas: many(areas),
}));

export const areasRelations = relations(areas, ({ one, many }) => ({
  city: one(cities, {
    fields: [areas.cityId],
    references: [cities.id],
  }),
  buildings: many(buildings),
}));

export const buildingsRelations = relations(buildings, ({ one }) => ({
  area: one(areas, {
    fields: [buildings.areaId],
    references: [areas.id],
  }),
}));

// Location Types
export type State = typeof states.$inferSelect;
export type InsertState = typeof states.$inferInsert;
export type City = typeof cities.$inferSelect;
export type InsertCity = typeof cities.$inferInsert;
export type Area = typeof areas.$inferSelect;
export type InsertArea = typeof areas.$inferInsert;
export type Building = typeof buildings.$inferSelect;
export type InsertBuilding = typeof buildings.$inferInsert;

// Location schemas
export const insertStateSchema = createInsertSchema(states).omit({
  id: true,
  createdAt: true,
});
export type InsertStateType = z.infer<typeof insertStateSchema>;

export const insertCitySchema = createInsertSchema(cities).omit({
  id: true,
  createdAt: true,
});
export type InsertCityType = z.infer<typeof insertCitySchema>;

export const insertAreaSchema = createInsertSchema(areas).omit({
  id: true,
  createdAt: true,
});
export type InsertAreaType = z.infer<typeof insertAreaSchema>;

export const insertBuildingSchema = createInsertSchema(buildings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBuildingType = z.infer<typeof insertBuildingSchema>;

export const insertMalaysianBuildingSchema = createInsertSchema(malaysianBuildings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMalaysianBuilding = z.infer<typeof insertMalaysianBuildingSchema>;
export type MalaysianBuilding = typeof malaysianBuildings.$inferSelect;

// Geocoding cache schemas
export const insertGeocodingCacheSchema = createInsertSchema(geocodingCache).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
  hitCount: true,
});
export type InsertGeocodingCache = z.infer<typeof insertGeocodingCacheSchema>;
export type GeocodingCache = typeof geocodingCache.$inferSelect;

// API usage log schemas
export const insertApiUsageLogSchema = createInsertSchema(apiUsageLog).omit({
  id: true,
  createdAt: true,
});
export type InsertApiUsageLog = z.infer<typeof insertApiUsageLogSchema>;
export type ApiUsageLog = typeof apiUsageLog.$inferSelect;

// AI query cache schemas
export const insertAiQueryCacheSchema = createInsertSchema(aiQueryCache).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
  hitCount: true,
});
export type InsertAiQueryCache = z.infer<typeof insertAiQueryCacheSchema>;
export type AiQueryCache = typeof aiQueryCache.$inferSelect;

// Travel time cache schemas
export const insertTravelTimeCacheSchema = createInsertSchema(travelTimeCache).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
  hitCount: true,
});
export type InsertTravelTimeCache = z.infer<typeof insertTravelTimeCacheSchema>;
export type TravelTimeCache = typeof travelTimeCache.$inferSelect;

// ===========================
// SEARCH ANALYTICS
// ===========================

// Search analytics table for tracking and improving search algorithm
export const searchAnalytics = pgTable(
  "search_analytics",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    query: text("query").notNull(), // Original search query
    searchType: varchar("search_type").notNull(), // "rent" or "buy"
    userId: varchar("user_id"), // User ID if logged in
    sessionId: varchar("session_id"), // Anonymous session tracking
    
    // Parsed filters from AI/keyword extraction
    parsedFilters: jsonb("parsed_filters"), // JSON of detected filters
    parsingMethod: varchar("parsing_method"), // "gpt", "keyword", "cache"
    parsingTimeMs: integer("parsing_time_ms"), // Time to parse query
    
    // Search results
    resultsCount: integer("results_count").notNull(), // Number of results returned
    propertiesViewed: integer("properties_viewed").default(0), // How many properties user clicked
    searchSuccessful: boolean("search_successful"), // Did user find what they wanted?
    
    // Performance metrics
    databaseQueryTimeMs: integer("database_query_time_ms"),
    totalTimeMs: integer("total_time_ms").notNull(),
    cacheHit: boolean("cache_hit").default(false),
    
    // Location detection
    locationDetected: varchar("location_detected"), // Detected location name
    geocodingSource: varchar("geocoding_source"), // "local_db", "google", "openroute"
    proximitySearch: boolean("proximity_search").default(false),
    
    // Failure analysis
    failureReason: varchar("failure_reason"), // Why search returned 0 results
    errorMessage: text("error_message"), // Any error that occurred
    
    // User behavior
    refinedSearch: boolean("refined_search").default(false), // Did user search again?
    clickedResultId: varchar("clicked_result_id"), // Property ID user clicked
    
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("search_analytics_query_idx").on(table.query),
    index("search_analytics_search_type_idx").on(table.searchType),
    index("search_analytics_created_at_idx").on(table.createdAt),
    index("search_analytics_results_count_idx").on(table.resultsCount),
    index("search_analytics_parsing_method_idx").on(table.parsingMethod),
  ],
);

// Search analytics schemas
export const insertSearchAnalyticsSchema = createInsertSchema(searchAnalytics).omit({
  id: true,
  createdAt: true,
});
export type InsertSearchAnalytics = z.infer<typeof insertSearchAnalyticsSchema>;
export type SearchAnalytics = typeof searchAnalytics.$inferSelect;

// ===========================
// SHARED SEARCH CRITERIA TYPES
// ===========================

// Standardized search criteria used across all services
export interface SearchCriteria {
  // Basic property filters
  propertyType?: string | string[];
  listingType?: 'rent' | 'sale';
  minPrice?: number;
  maxPrice?: number;
  minROI?: number;
  maxROI?: number;
  bedrooms?: number;
  minBedrooms?: number; // For "at least X rooms" queries
  bathrooms?: number;
  city?: string;
  state?: string;
  amenities?: string[];
  
  // Property characteristics
  lotType?: 'corner' | 'intermediate' | 'end'; // Lot position type
  condition?: 'new' | 'renovated' | 'original'; // Property condition
  
  // Location-based search
  location?: {
    area: string;
    maxDistance?: number;
    transportation?: 'driving' | 'walking' | 'cycling';
  };
  
  // Transport proximity search
  nearTransport?: {
    types: string[];
    maxDistanceMeters: number;
    stationNames?: string[];
  };
  
  // Search behavior options
  searchType?: 'building' | 'general' | 'geospatial';
  sortBy?: string;
  limit?: number;
  maxDistanceMeters?: number;
  
  // Legal information filters
  tenure?: string[];
  titleType?: string[];
  landTitleType?: string[];
}

// For parsed query results from AI/NLP services
export interface ParsedSearchQuery extends SearchCriteria {
  originalQuery: string;
  confidence: number;
  autoFilterResidential?: boolean;
}

// For geospatial search results
export interface SearchResult<T = Property> {
  properties?: T[];
  results?: Array<{
    property: T;
    distance?: number;
    transportStations?: any[];
  }>;
  count: number;
  filters: SearchCriteria;
  query: string;
  searchSummary?: {
    searchType: string;
    transportQuery?: {
      types: string[];
      radius: number;
      stations: string[];
    };
  };
}
