# AI Search Scenario Test Results

## Test Dataset Overview
- **Total Properties**: 50 test properties
- **Locations**: Petaling Jaya (11), Cheras (9), Puchong (7), Mont Kiara (7), Kepong (6), Damansara (5), Shah Alam (3), Subang Jaya (2)
- **Types**: Commercial (13), Industrial (19), Residential (18)

## Test Scenarios & Results

### 🏠 RESIDENTIAL TESTS

#### R1: "Condo for rent in Damansara under RM2,000"
- **Expected**: Filter residential properties by location & price
- **AI Parsing**: ✅ Correctly identified: rent + max price RM2 + condominium + general search
- **Actual Result**: 0 properties found
- **Issue**: Price interpreted as RM2 instead of RM2,000 - AI needs price parsing improvement
- **Status**: ❌ PRICE PARSING BUG

#### R2: "Landed house for sale near Mont Kiara within 5km"
- **Expected**: Geocode location, calculate radius, return landed houses
- **AI Parsing**: ✅ Correctly identified: sale + house + general search
- **Actual Result**: 0 properties found
- **Issue**: Missing location parsing - "near Mont Kiara" not captured in filters
- **Status**: ❌ LOCATION PROXIMITY MISSING

#### R3: "Pet-friendly apartment in Kepong"
- **Expected**: Search property tags/features
- **AI Parsing**: ✅ Correctly identified: apartment + general search
- **Actual Result**: 47 properties found (but not filtered by Kepong or pet-friendly)
- **Issue**: Missing location filter and feature/amenity parsing
- **Status**: ❌ LOCATION & FEATURE FILTERING MISSING

### 🏢 COMMERCIAL TESTS

#### C1: "Office space for rent in Damansara 1000 sqft"
- **Expected**: Match property type & floor area
- **AI Parsing**: ✅ Correctly identified: rent + office + general search
- **Actual Result**: 0 properties found
- **Issue**: Missing location filter (Damansara) and area size parsing (1000 sqft)
- **Status**: ❌ LOCATION & SIZE FILTERING MISSING

#### C2: "Retail shop near Mont Kiara"
- **Expected**: Use proximity search
- **AI Parsing**: ✅ Correctly identified: shop + general search
- **Actual Result**: 4 properties found (shop type in general area)
- **Issue**: Missing location proximity filtering
- **Status**: ⚠️ PARTIAL SUCCESS - Type correct, location filtering weak

#### C3: "Co-working space in Kepong"
- **Expected**: Match keywords + category
- **AI Parsing**: ❌ Only identified: general search (no property type or location)
- **Actual Result**: 238 properties found (all Kepong properties, not co-working spaces)
- **Issue**: Failed to identify "co-working space" as a property type
- **Status**: ❌ PROPERTY TYPE PARSING FAILED

### 🏭 INDUSTRIAL TESTS

#### I1: "Warehouse for rent near Kepong"
- **Expected**: Industrial property filtering
- **AI Parsing**: ✅ Correctly identified: rent + general search  
- **Actual Result**: 0 properties found
- **Issue**: Missing warehouse property type and location (Kepong) parsing
- **Status**: ❌ TYPE & LOCATION PARSING MISSING

#### I2: "Factory for sale in Damansara"
- **Expected**: Filter industrial + sale listings
- **AI Parsing**: ❌ Identified: sale + warehouse (not factory) + Damansara location
- **Actual Result**: 0 properties found
- **Issue**: Factory misidentified as warehouse, location parsed but no matching data
- **Status**: ❌ PROPERTY TYPE MISIDENTIFICATION

#### I3: "Cold storage warehouse in Mont Kiara"
- **Expected**: Match specific industrial type
- **AI Parsing**: ⚠️ Identified: house + warehouse + Mont Kiara location
- **Actual Result**: 17 properties found (mixed house/warehouse types in Mont Kiara)
- **Issue**: "Cold storage" not recognized as specific subtype
- **Status**: ⚠️ PARTIAL SUCCESS - Location correct, type parsing incomplete

## Key Issues Identified

### 🚨 Critical AI Parsing Problems

1. **Price Parsing Bug**: "RM2,000" interpreted as "RM2" - comma handling needed
2. **Location Proximity Missing**: "near [location]" not properly parsed into location filters
3. **Feature/Amenity Parsing**: "pet-friendly" not captured in search filters
4. **Specific Property Subtypes**: "Co-working space", "Cold storage" not recognized
5. **Property Type Mapping**: "Factory" misidentified as "warehouse"

### ✅ What's Working Well

1. **Basic Property Types**: Apartment, condo, house, shop correctly identified
2. **Listing Type**: Rent/sale properly parsed in most cases
3. **Location Recognition**: Major areas like Mont Kiara, Damansara recognized
4. **Search Performance**: All queries complete within 1-2 seconds

### 🔧 Immediate Fixes Needed

1. **Enhance AI Prompt**: Add specific property subtypes and feature parsing
2. **Price Normalization**: Handle "RM2,000" format with commas
3. **Location Proximity**: Parse "near [location]" into location filters
4. **Feature Matching**: Map amenity terms to property features
5. **Property Type Expansion**: Add industrial/commercial subtypes to AI understanding

## Test Summary
- **Total Tests**: 9 scenarios
- **Fully Successful**: 0 ✅
- **Partially Successful**: 2 ⚠️
- **Failed**: 7 ❌
- **Success Rate**: 22% (partial success considered)

## Next Steps
1. Fix AI prompt to handle complex property types and features
2. Improve price parsing for comma-separated numbers
3. Enhance location proximity parsing
4. Add comprehensive amenity/feature mapping
5. Expand property type vocabulary for industrial/commercial properties