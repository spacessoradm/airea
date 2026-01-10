# Production Database Setup Guide

## Current Database Schema Overview

### Core Tables (CRITICAL - Must exist in production)

#### Authentication & Users
- **users** - User accounts with role-based access (user/agent/admin)
- **agents** - Agent profiles and business information
- **sessions** - Session storage for authentication

#### Property Management
- **properties** - Main property listings table
- **favorites** - User-saved properties
- **inquiries** - Property inquiries and lead tracking
- **messages** - Communication between users and agents

#### Location & Geocoding
- **locations** - General location data from OSM
- **malaysian_buildings** - Comprehensive Malaysian residential buildings database
- **malaysian_locations** - Malaysian-specific location data
- **geocoding_cache** - Persistent geocoding cache (cost optimization)
- **transport_stations** - MRT/LRT/KTM station data

#### Analytics & Tracking
- **property_analytics** - Property view counts and engagement metrics
- **market_analytics** - Market trend data
- **search_queries** - User search history
- **user_preferences** - User search preferences
- **user_interactions** - User behavior tracking

#### Cost Optimization (CRITICAL)
- **api_usage_log** - API call tracking and cost monitoring
- **ai_query_cache** - Cached AI search query results (40-60% AI cost reduction)
- **travel_time_cache** - Cached distance/time calculations (70% travel time API savings)
- **geocoding_cache** - Geocoded location cache (70-85% geocoding cost reduction)

### Supporting Tables
- areas, buildings, cities, states - Malaysian geography hierarchy
- developer_reviews - Property developer ratings
- property_amenity_scores - Transport proximity scores
- rental_yield_data - Investment analytics
- user_challenges, user_explorations, user_rewards, user_stats - Gamification features

### PostGIS Tables (Auto-generated, do not migrate)
- planet_osm_* tables - OpenStreetMap data
- spatial_ref_sys, geography_columns, geometry_columns - PostGIS system tables

## Production Migration Strategy

### Phase 1: Database Provisioning
1. **Create Neon PostgreSQL Production Instance**
   - Go to Neon Console (https://console.neon.tech)
   - Create new project: "Airea Production"
   - Region: Singapore (closest to Malaysia)
   - PostgreSQL version: 15 or 16 (latest stable)
   - Enable connection pooling for better performance

2. **Enable PostGIS Extension**
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS postgis_topology;
   ```

3. **Set Production Environment Variables**
   ```bash
   # In Replit Secrets
   DATABASE_URL_PROD=postgresql://[user]:[password]@[host]/[database]
   NODE_ENV=production
   ```

### Phase 2: Schema Migration
1. **Export Current Schema**
   ```bash
   # Generate current schema SQL
   npm run db:push
   ```

2. **Apply Schema to Production**
   ```bash
   # Point to production database
   DATABASE_URL=$DATABASE_URL_PROD npm run db:push --force
   ```

3. **Verify Critical Indexes**
   ```sql
   -- Check PostGIS indexes
   SELECT tablename, indexname FROM pg_indexes 
   WHERE indexname LIKE '%geometry%' OR indexname LIKE '%gist%';
   
   -- Check full-text search indexes
   SELECT tablename, indexname FROM pg_indexes 
   WHERE indexname LIKE '%search%' OR indexname LIKE '%gin%';
   ```

### Phase 3: Data Migration (If needed)
**⚠️ WARNING: Only if migrating from dev to prod**

1. **Export Essential Data**
   ```bash
   # Export agents and properties only (no test data)
   pg_dump $DATABASE_URL \
     --data-only \
     --table=users \
     --table=agents \
     --table=properties \
     --table=locations \
     --table=malaysian_buildings \
     > production_data.sql
   ```

2. **Import to Production**
   ```bash
   psql $DATABASE_URL_PROD < production_data.sql
   ```

3. **Verify Data Integrity**
   ```sql
   -- Check record counts
   SELECT 'users' as table, COUNT(*) FROM users
   UNION ALL
   SELECT 'agents', COUNT(*) FROM agents
   UNION ALL
   SELECT 'properties', COUNT(*) FROM properties;
   ```

### Phase 4: Application Configuration

1. **Update Database Connection**
   ```typescript
   // server/db.ts or equivalent
   const dbUrl = process.env.NODE_ENV === 'production' 
     ? process.env.DATABASE_URL_PROD 
     : process.env.DATABASE_URL;
   ```

2. **Connection Pooling Settings**
   ```typescript
   import { Pool } from '@neondatabase/serverless';
   
   export const pool = new Pool({ 
     connectionString: dbUrl,
     max: 20,  // Production pool size
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 10000,
   });
   ```

### Phase 5: Monitoring & Maintenance

1. **Set Up Database Monitoring**
   - Enable Neon's built-in monitoring
   - Set up alerts for connection pool exhaustion
   - Monitor query performance and slow queries
   - Track database size growth

2. **Backup Strategy**
   - Enable Neon automatic backups (daily)
   - Set retention period: 30 days minimum
   - Test backup restoration quarterly

3. **Performance Optimization**
   ```sql
   -- Analyze query performance
   ANALYZE properties;
   ANALYZE locations;
   ANALYZE geocoding_cache;
   
   -- Check index usage
   SELECT schemaname, tablename, indexname, idx_scan
   FROM pg_stat_user_indexes
   ORDER BY idx_scan ASC;
   ```

## Cache Table Importance

**CRITICAL: The cache tables save ~75-90% on API costs**

| Cache Table | Purpose | Savings |
|------------|---------|---------|
| geocoding_cache | Location coordinates | 70-85% |
| ai_query_cache | AI search results | 40-60% |
| travel_time_cache | Distance calculations | 70% |
| api_usage_log | Cost tracking | N/A (monitoring) |

**Estimated Monthly Savings: $120-170** (from ~$135-200 to ~$15-30)

These tables MUST be migrated to production or cost will increase dramatically.

## Rollback Plan

If issues occur in production:

1. **Immediate Rollback**
   ```bash
   # Point back to previous database
   DATABASE_URL=$DATABASE_URL_BACKUP npm start
   ```

2. **Database Restore**
   ```sql
   -- Restore from Neon backup
   -- Use Neon Console > Backups > Restore
   ```

3. **Schema Fixes**
   ```bash
   # Fix schema issues
   npm run db:push --force
   ```

## Security Checklist

- [ ] Production DATABASE_URL stored in Replit Secrets (never in code)
- [ ] Enable SSL/TLS connections (Neon enforces this)
- [ ] Set up read-only user for reporting/analytics
- [ ] Enable connection pooling
- [ ] Set up IP allowlist (if using dedicated Neon plan)
- [ ] Regular security updates for dependencies
- [ ] Enable query logging (for debugging, disable in production)

## Current Status

✅ **Development Database**: Active and stable
⏳ **Production Database**: Ready for provisioning
📋 **Migration Plan**: Documented and ready to execute

## Next Steps

1. Provision Neon production database
2. Configure production DATABASE_URL in Replit Secrets
3. Run schema migration with `npm run db:push --force`
4. Verify all tables and indexes are created
5. Test connection from application
6. Set up monitoring and backups
7. Update deployment configuration

## Contact & Support

- Neon Support: https://neon.tech/docs/introduction
- Drizzle ORM Docs: https://orm.drizzle.team/docs/overview
- PostGIS Documentation: https://postgis.net/documentation/
