#!/bin/bash

# Production Database Migration Script
# This script migrates your database schema to the production database

echo "🚀 Production Database Migration Script"
echo "========================================"
echo ""

# Check if production DATABASE_URL is provided
if [ -z "$DATABASE_URL_PROD" ]; then
    echo "❌ Error: DATABASE_URL_PROD environment variable not set"
    echo ""
    echo "Please set your production database URL:"
    echo "export DATABASE_URL_PROD='your-production-database-url'"
    echo ""
    echo "You can find this URL in:"
    echo "1. Replit Database tool → Commands tab → Environment variables"
    echo "2. Look for the DATABASE_URL of your production database"
    exit 1
fi

echo "📊 Production Database URL found"
echo "Running schema migration to production..."
echo ""

# Temporarily set DATABASE_URL to production
export DATABASE_URL=$DATABASE_URL_PROD

# Run Drizzle migration
echo "🔄 Pushing schema to production database..."
npm run db:push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Production database schema migrated successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Your production database now has the correct schema"
    echo "2. Configure your deployment to use DATABASE_URL_PROD"
    echo "3. Redeploy your app"
    echo ""
else
    echo ""
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi
