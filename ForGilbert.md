# Airea Property Platform - Developer Setup Guide

## Overview

Airea is an AI-driven Malaysian property platform featuring:
- AI-powered natural language property search (GPT-4o-mini)
- Multi-language support (English, Malay, Mandarin, Tamil)
- Interactive map with OpenStreetMap/Leaflet
- Agent property management dashboard
- PWA mobile-optimized version

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, shadcn/ui, Wouter (routing)
- **Backend:** Express.js, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **AI:** OpenAI GPT-4o-mini
- **Maps:** Leaflet.js with OpenStreetMap, Google Maps Geocoding API

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd airea-property-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Database (PostgreSQL)
   DATABASE_URL=postgresql://username:password@host:5432/database_name
   PGHOST=your_pg_host
   PGPORT=5432
   PGUSER=your_pg_user
   PGPASSWORD=your_pg_password
   PGDATABASE=your_database_name

   # OpenAI API (for AI search)
   OPENAI_API_KEY=sk-your-openai-api-key

   # Google Maps API (for geocoding)
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

   # Firebase (optional - for authentication)
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_APP_ID=your-firebase-app-id
   VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Seed initial data (optional)**
   ```bash
   npx tsx server/seedMalaysianBuildings.ts
   npx tsx server/seedMalaysianLocations.ts
   ```

## Running the Application

**Development mode:**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

**Production build:**
```bash
npm run build
npm start
```

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (Landing, Search, etc.)
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and helpers
├── server/                 # Backend Express server
│   ├── services/          # Business logic services
│   │   ├── propertySearch.ts      # Main search logic
│   │   ├── nlpSearchService.ts    # AI query parsing
│   │   ├── gptAbbreviationService.ts  # Location abbreviation expansion
│   │   └── enhancedGeocoding.ts   # Multi-tier geocoding
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database operations
│   └── db.ts              # Database connection
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Drizzle ORM schema definitions
└── attached_assets/        # Static assets (images, etc.)
```

## Key Features to Understand

### AI Search Pipeline
1. User enters natural language query
2. `nlpSearchService.ts` parses query using GPT-4o-mini
3. Extracts: location, property type, price range, bedrooms, etc.
4. `propertySearch.ts` builds database query with filters
5. Results sorted by distance from search location

### Location Detection
- Multi-tier strategy: Database → Pattern matching → Fuzzy search → GPT expansion → Geocoding
- Supports Malaysian abbreviations (BU, TTDI, PJ, KL, etc.)
- Caches results in database for cost optimization

### Cost Optimization
- AI query results cached in database
- Geocoding results cached persistently
- Request-level memoization prevents duplicate API calls

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/properties` | List properties with filters |
| GET | `/api/properties/:id` | Get property details |
| POST | `/api/search` | AI-powered natural language search |
| GET | `/api/agents/:id/properties` | Get agent's listings |

## Environment-Specific Notes

### Replit Environment
When running on Replit, environment variables are managed through the Secrets panel. The `DATABASE_URL` is automatically provided for the built-in PostgreSQL database.

### Local Development
For local development, you'll need to:
1. Set up a local PostgreSQL instance or use a cloud provider (Neon, Supabase, etc.)
2. Obtain API keys for OpenAI and Google Maps
3. Configure all environment variables in `.env`

## Support

For questions about the codebase, refer to `replit.md` for architectural decisions and recent changes.
