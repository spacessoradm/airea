# Overview

Airea is an AI-driven Malaysian property platform designed to revolutionize property search and management. Its primary purpose is to offer AI-powered property search using natural language queries for rental and sale properties, complemented by comprehensive property management tools for agents. The platform aims to be the leading AI-first real estate solution in Malaysia, providing a superior user experience and empowering agents with efficient tools, utilizing open-source mapping for independence.

# Recent Changes

**December 7, 2025 - GPT-Based Dynamic Abbreviation Learning**
- Implemented hybrid GPT abbreviation expansion with persistent database caching:
  - Local lookup first (instant, free) for known abbreviations like BU, TTDI, KD
  - GPT fallback for unknown abbreviations (learns dynamically)
  - Results cached in database forever - each abbreviation only looked up once
  - Cost: ~RM0.01 per new abbreviation expansion
- Added GPT abbreviation service with Malaysian context:
  - Understands local slang: "Mont K" → Mont Kiara, "BB" → Bukit Bintang
  - Validates coordinates are within Malaysian bounds
  - Returns canonical name, state, and confidence score
- Integrated into location detection pipeline (Strategy 4)
- Distance-based sorting: Properties sorted by proximity to search area center

**December 3, 2025 - Complex Filter Extraction & Multi-Language Price Sorting**
- Fixed complex filter extraction for AI search responses (UAT 5.1 & 2.3 fixes):
  - `sortBy: "price_asc"` now correctly returned for cheap/murah/便宜/budget/affordable queries
  - `lotType: "corner" | "end" | "intermediate"` extraction for lot position queries
  - `minBedrooms` extraction for "at least X rooms" / "minimum X bilik" queries
  - `condition: "renovated" | "new" | "original"` extraction for property condition queries
  - `amenities` array properly preserved in response filters
- Enhanced AI prompt with consistent sortBy examples across all languages (Malay, Mandarin, Tamil, Manglish)
- Fixed filter preservation issue: proximity and location search paths now preserve all complex filters
- Updated `shouldUseAI` function to force AI parsing for complex keywords:
  - Lot types: corner, end lot, intermediate
  - Conditions: new house, renovated, brand new
  - Price sorting: cheap, murah, budget, affordable, 便宜, 不要太贵
  - Minimum specs: at least, minimum, min

**December 2, 2025 - Search History & Typo Tolerance Features**
- Implemented search history: Stores and displays recent searches on landing page
  - Saves query, search type, timestamp, and result count to localStorage
  - Shows up to 6 recent searches with relative timestamps (e.g., "2h ago", "Yesterday")
  - Individual search removal and "Clear all" functionality
  - Click to re-run past searches
- Implemented typo tolerance with fuzzy matching (Levenshtein distance algorithm):
  - Auto-corrects location typos: "Bangsr" → "Bangsar", "Peteling" → "Petaling"
  - Auto-corrects property type typos: "condominuim" → "condo"
  - Shows correction notification in search results: "Showing results for 'Bangsar'"
  - 70%+ similarity threshold ensures accurate corrections
  - Covers 100+ Malaysian locations and property types

**December 2, 2025 - Multi-Language AI Search UAT Testing - 100% PASS RATE**
- Achieved 100% pass rate across all 4 Malaysian communities (Malay, Chinese, Tamil, Mixed/Manglish)
- Enhanced multi-language support with comprehensive keyword detection:
  - Mandarin property types: 公寓, 房子, 房屋, 住宅, 排屋, 店铺, 商店, 办公室, etc.
  - Mandarin listing types: 出租, 租, 出售, 卖, 买, 售
  - Mandarin locations: 吉隆坡, 新山, 槟城, 怡保, 马六甲, etc.
  - Tamil property/location keywords integrated
- Fixed city abbreviation detection (KL, JB, PJ, KK) with improved word boundary matching
- Added fallback coordinates for 35+ major Malaysian cities
- Implemented location fallback when AI parsing misses keyword-extracted locations
- Fixed "house" keyword detection without false-matching "warehouse"

**November 25, 2025 - Multi-Language AI Search Enhancement**
- Upgraded GPT-4o system prompt to understand natural language queries in multiple languages:
  - English: "3 bedroom condo under RM500k"
  - Bahasa Malaysia: "rumah landed yang murah dekat Sunway"
  - Mandarin: "找便宜的公寓在KLCC附近"
  - Tamil: "KLCC அருகில் வீடு வேண்டும்"
  - Manglish/Mixed: "Cari rumah landed yang murah la, near Sunway… at least 3 bilik"
- Added slang and colloquial normalization (rumah=house, bilik=bedroom, murah=affordable, dekat=near)
- Enhanced keyword extractor with multi-language patterns for property types, listing types, bedrooms, and amenities
- Added lifestyle intent detection for smarter defaults (family, young professional, elderly parents)
- PWA property detail page now features horizontal scrollable photo carousel with swipe navigation
- FEATURED badges now consistent in size with ROI and property type badges

**November 24, 2025 - AI Search Optimization & UI Enhancements**
- Enhanced relative time display across all listing pages (SimpleLanding, SimpleSearchResults) showing actual time like "2d ago", "1w ago", "1M ago" instead of generic "Listed recently"
- Optimized all AI-powered search suggestions to use simpler, broader queries that ensure results are returned from existing database properties
- Updated search recommendations on SimpleLanding and SimpleSearch pages to focus on property attributes (price, bedrooms, type) rather than specific locations, improving search success rates
- Simplified 36 AI search suggestions across residential, commercial, and industrial categories to match actual property inventory
- Example optimized searches: "Condo under RM4000", "3 bedroom apartment", "Service residence", "2-storey terrace", "Commercial with at least 4% ROI", "Factory or warehouse"

# User Preferences

- Clean Minimalist Design: User strongly prefers clean, plain design with minimal colors and visual distractions.
- Two-Page Structure: Clear separation between landing page and search results.
- AI-First Search Experience: Emphasizes natural language and personalized queries over traditional address entry.
- Search results refresh on the same page after search, no cross-page navigation during searches.
- Property listing will be handled through separate agent interface.
- Map toggle buttons replaced with custom implementation for better visibility.
- Marketing content replaced with real Malaysian property market articles and insights.
- Interactive OpenStreetMap with real property coordinates and enhanced visualization.
- Property markers with detailed popups showing property information.
- Complete open-source mapping solution using Leaflet.js integration.
- Malaysia-only location filtering with comprehensive location database.

# System Architecture

## UI/UX Decisions

The design emphasizes a clean, minimalist aesthetic with limited colors, structured around a two-page layout: a landing page and a search results page. The search functionality is AI-first, driven by natural language queries, with dynamic, in-page refreshing of results. The mapping system employs Leaflet.js for interactive OpenStreetMap, featuring custom map toggle buttons, property markers with detailed popups, and exclusive Malaysia-only location filtering.

## Technical Implementations

The frontend is built with React, TypeScript, Wouter for routing, React Query for server state management, shadcn/ui (Radix UI primitives), and Tailwind CSS for styling. It uses a component-based structure, React hooks for local state, CSS variables for theming, and React Hook Form with Zod for form handling. The backend is a REST API using Express.js and TypeScript, organized into storage, service, and middleware layers with modular routes.

## Feature Specifications

Key features include AI-powered natural language search, advanced distance-based search, property listing and map views, property favoriting, direct agent communication, and legal property filters (Tenure, Title Type, Land Title Type). The agent portal supports a multi-step listing creation flow with validation, status management (Online, Draft, Offline, Expired), and a minimum 3-photo requirement. Smart property type filtering automatically categorizes properties (residential, commercial, industrial) based on query keywords. Location intelligence combines a local database, Google Maps Geocoding API, and text search for comprehensive Malaysian coverage, differentiating between location-based and proximity-based searches. Property details include a mandatory lot type (Intermediate, End Lot, Corner Lot) and an ROI percentage for commercial properties. The system also features popular AI search suggestions and shareable search links that preserve the full search state via URL parameters.

## System Design Choices

PostgreSQL with Drizzle ORM manages type-safe database operations, covering session management, user/agent roles, property data, messaging, and favorites. Authentication integrates Replit's OIDC via Passport.js, providing secure session storage, role-based access control, and robust security middleware. AI integration utilizes OpenAI's GPT-4o for natural language search, optimized for the Malaysian market, to parse queries into structured filters.

A cost-optimized, multi-tier geocoding strategy is implemented, prioritizing a persistent database cache, then exact database matches, followed by Google Maps Geocoding API for accuracy. OpenRouteService and OpenAI GPT-4 serve as fallbacks. Cost optimization features include persistent geocoding and AI query parsing caches, travel time caching, request deduplication, debounced search, and comprehensive API usage tracking with estimated costs. ROI search performance is optimized by bypassing GPT-4 for specific queries, using local keyword extraction, and intelligently skipping external geocoding for pure attribute-based searches, significantly reducing response times. Proximity search dynamically estimates distances based on travel mode (driving, cycling, walking), uses OpenRouteService for actual travel time calculations, is capped at a 10km maximum radius, and sorts results with featured properties first (by distance), then normal properties (by distance).

# External Dependencies

## Database Services
- Neon PostgreSQL
- Drizzle ORM

## AI and Machine Learning
- OpenAI API (GPT-4o-mini)

## Maps and Geolocation
- Google Maps Geocoding API
- OpenRouteService API (for distance calculations)
- OpenStreetMap (via Leaflet.js)
- Malaysian location database

## Authentication
- Replit Authentication (OIDC)
- Passport.js

## Frontend Libraries
- React Query (TanStack)
- Radix UI
- React Hook Form
- Zod
- Wouter

## File Upload and Storage
- Multer