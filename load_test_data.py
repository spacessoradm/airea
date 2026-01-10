#!/usr/bin/env python3
"""
Script to load the expanded property dataset into the database
"""
import json
import asyncio
import sys
import os
from decimal import Decimal

# Add the project root to Python path
sys.path.append('.')

# Import database connection
from server.storage import DatabaseStorage

async def load_test_data():
    """Load the expanded property dataset into the database"""
    storage = DatabaseStorage()
    
    # Load the JSON dataset
    with open('attached_assets/expanded_property_dataset_1754909117281.json', 'r') as f:
        properties = json.load(f)
    
    print(f"Loading {len(properties)} properties into database...")
    
    for i, prop in enumerate(properties):
        try:
            # Map the JSON structure to our database schema
            property_data = {
                'title': prop['name'],
                'description': f"{prop['type']} property in {prop['area']}",
                'propertyType': map_property_type(prop['type']),
                'price': Decimal(str(prop['price'])),
                'bedrooms': prop.get('bedrooms', 0) if prop.get('bedrooms') is not None else 0,
                'bathrooms': prop.get('bathrooms', 0) if prop.get('bathrooms') is not None else 0,
                'squareFeet': prop['sqft'],
                'address': f"{prop['area']}, Kuala Lumpur",
                'city': 'Kuala Lumpur',
                'state': 'Selangor',
                'postalCode': '50000',
                'latitude': None,  # Will be populated later
                'longitude': None,
                'amenities': [],
                'images': [],
                'agentId': 'agent-seed-data',
                'status': 'available',
                'featured': False,
                'listingType': 'sale' if 'For Sale' in prop['status'] else 'rent',
                'tenure': 'freehold',
                'titleType': 'individual',
                'landTitleType': 'residential'
            }
            
            await storage.createProperty(property_data)
            
            if (i + 1) % 100 == 0:
                print(f"Loaded {i + 1} properties...")
                
        except Exception as e:
            print(f"Error loading property {i + 1}: {e}")
            continue
    
    print(f"Successfully loaded {len(properties)} properties!")

def map_property_type(prop_type):
    """Map the dataset property types to our database enum values"""
    type_mapping = {
        'Residential': 'house',
        'Commercial': 'commercial',
        'Industrial': 'industrial'
    }
    return type_mapping.get(prop_type, 'house')

if __name__ == "__main__":
    asyncio.run(load_test_data())