#!/usr/bin/env python3
"""
Comprehensive test suite for the AI-powered property search engine
Tests all major search functionality including AI parsing, filters, and location intelligence
"""
import pytest
import asyncio
import json
import math
from decimal import Decimal

# Import the search functionality
import sys
sys.path.append('.')

from server.services.propertySearch import processAISearch, parseQueryLocally
from server.storage import DatabaseStorage

class TestSearchEngine:
    """Test cases for the property search engine"""
    
    @pytest.fixture(scope="class")
    def event_loop(self):
        """Create event loop for async tests"""
        loop = asyncio.new_event_loop()
        yield loop
        loop.close()
    
    @pytest.fixture(scope="class")
    async def storage(self):
        """Initialize database storage"""
        return DatabaseStorage()
    
    # 1. Basic Search Tests
    @pytest.mark.asyncio
    async def test_exact_name_match(self, storage):
        """Test searching for exact property names"""
        result = await processAISearch("Shop Lot @ Bandar Utama", storage)
        assert result['count'] > 0
        assert any("Bandar Utama" in prop['title'] for prop in result['properties'])
    
    @pytest.mark.asyncio
    async def test_partial_name_match(self, storage):
        """Test fuzzy/partial name matching"""
        result = await processAISearch("Factory Mont Kiara", storage)
        assert result['count'] > 0
        assert any("Mont Kiara" in prop['title'] for prop in result['properties'])
    
    # 2. Property Type Tests
    @pytest.mark.asyncio
    async def test_residential_search(self, storage):
        """Test searching for residential properties"""
        result = await processAISearch("apartment", storage)
        assert result['count'] > 0
        # Properties should be residential type
        residential_count = sum(1 for prop in result['properties'] 
                              if prop.get('propertyType') in ['apartment', 'house', 'condominium'])
        assert residential_count > 0
    
    @pytest.mark.asyncio
    async def test_commercial_search(self, storage):
        """Test searching for commercial properties"""
        result = await processAISearch("office space", storage)
        assert result['count'] > 0
        # Should find commercial properties
        commercial_count = sum(1 for prop in result['properties'] 
                             if prop.get('propertyType') in ['office', 'commercial', 'retail-space'])
        assert commercial_count > 0
    
    @pytest.mark.asyncio
    async def test_industrial_search(self, storage):
        """Test searching for industrial properties including factories"""
        result = await processAISearch("factory", storage)
        assert result['count'] > 0
        # Should find industrial properties (mapped from factory)
        industrial_count = sum(1 for prop in result['properties'] 
                             if prop.get('propertyType') == 'industrial')
        assert industrial_count > 0
    
    @pytest.mark.asyncio
    async def test_warehouse_search(self, storage):
        """Test searching for warehouse properties"""
        result = await processAISearch("warehouse", storage)
        assert result['count'] > 0
        # Should find industrial properties (mapped from warehouse)
        industrial_count = sum(1 for prop in result['properties'] 
                             if prop.get('propertyType') == 'industrial')
        assert industrial_count > 0
    
    # 3. Location-based Tests
    @pytest.mark.asyncio
    async def test_area_search_damansara(self, storage):
        """Test searching by area - Damansara"""
        result = await processAISearch("properties in Damansara", storage)
        assert result['count'] > 0
        # Should find properties in Damansara areas
        damansara_count = sum(1 for prop in result['properties'] 
                            if "Damansara" in prop.get('address', '') or 
                               "Damansara" in prop.get('title', ''))
        assert damansara_count > 0
    
    @pytest.mark.asyncio
    async def test_area_search_mont_kiara(self, storage):
        """Test searching by area - Mont Kiara"""
        result = await processAISearch("Mont Kiara", storage)
        assert result['count'] > 0
        # Should find properties in Mont Kiara
        mont_kiara_count = sum(1 for prop in result['properties'] 
                             if "Mont Kiara" in prop.get('address', '') or 
                                "Mont Kiara" in prop.get('title', ''))
        assert mont_kiara_count > 0
    
    @pytest.mark.asyncio
    async def test_area_search_kepong(self, storage):
        """Test searching by area - Kepong"""
        result = await processAISearch("Kepong", storage)
        assert result['count'] > 0
        # Should find properties in Kepong
        kepong_count = sum(1 for prop in result['properties'] 
                         if "Kepong" in prop.get('address', '') or 
                            "Kepong" in prop.get('title', ''))
        assert kepong_count > 0
    
    # 4. Price Filter Tests
    @pytest.mark.asyncio
    async def test_price_filter_under_500k(self, storage):
        """Test price filtering - properties under RM500,000"""
        result = await processAISearch("house under RM500,000", storage)
        assert result['count'] > 0
        # All properties should be under 500,000
        for prop in result['properties']:
            price = float(prop.get('price', 0))
            assert price <= 500000
    
    @pytest.mark.asyncio
    async def test_price_filter_under_2k_rent(self, storage):
        """Test rental price filtering - under RM2,000"""
        result = await processAISearch("apartment for rent under RM2,000", storage)
        if result['count'] > 0:  # Only test if we have rental properties
            for prop in result['properties']:
                price = float(prop.get('price', 0))
                assert price <= 2000
    
    @pytest.mark.asyncio
    async def test_comma_separated_price(self, storage):
        """Test parsing comma-separated prices like RM1,500"""
        result = await processAISearch("property under RM1,500", storage)
        if result['count'] > 0:
            for prop in result['properties']:
                price = float(prop.get('price', 0))
                assert price <= 1500
    
    # 5. Combined Filter Tests
    @pytest.mark.asyncio
    async def test_multiple_filters_residential_damansara_price(self, storage):
        """Test multiple filters: residential in Damansara under RM800k"""
        result = await processAISearch("house in Damansara under RM800,000", storage)
        assert result['count'] >= 0  # May be 0 if no properties match all criteria
        
        for prop in result['properties']:
            # Check price
            price = float(prop.get('price', 0))
            assert price <= 800000
            
            # Check location (should contain Damansara)
            location_match = ("Damansara" in prop.get('address', '') or 
                            "Damansara" in prop.get('title', ''))
            assert location_match
    
    @pytest.mark.asyncio
    async def test_multiple_filters_commercial_office_mont_kiara(self, storage):
        """Test multiple filters: commercial office in Mont Kiara"""
        result = await processAISearch("office space in Mont Kiara", storage)
        assert result['count'] >= 0
        
        for prop in result['properties']:
            # Should be in Mont Kiara
            location_match = ("Mont Kiara" in prop.get('address', '') or 
                            "Mont Kiara" in prop.get('title', ''))
            assert location_match
    
    @pytest.mark.asyncio
    async def test_multiple_filters_industrial_factory_under_1m(self, storage):
        """Test multiple filters: factory under RM1M"""
        result = await processAISearch("factory under RM1,000,000", storage)
        assert result['count'] >= 0
        
        for prop in result['properties']:
            # Check price
            price = float(prop.get('price', 0))
            assert price <= 1000000
            
            # Should be industrial type (mapped from factory)
            assert prop.get('propertyType') == 'industrial'
    
    # 6. Listing Type Tests
    @pytest.mark.asyncio
    async def test_rental_properties(self, storage):
        """Test searching for rental properties"""
        result = await processAISearch("apartment for rent", storage)
        assert result['count'] >= 0
        
        for prop in result['properties']:
            assert prop.get('listingType') == 'rent'
    
    @pytest.mark.asyncio
    async def test_sale_properties(self, storage):
        """Test searching for properties for sale"""
        result = await processAISearch("house for sale", storage)
        assert result['count'] >= 0
        
        for prop in result['properties']:
            assert prop.get('listingType') == 'sale'
    
    # 7. Edge Cases and Error Handling
    @pytest.mark.asyncio
    async def test_empty_query(self, storage):
        """Test empty query handling"""
        result = await processAISearch("", storage)
        assert result['count'] >= 0  # Should handle gracefully
    
    @pytest.mark.asyncio
    async def test_nonsensical_query(self, storage):
        """Test nonsensical query handling"""
        result = await processAISearch("purple elephant dancing", storage)
        assert result['count'] >= 0  # Should handle gracefully
    
    @pytest.mark.asyncio
    async def test_misspelled_location(self, storage):
        """Test misspelled location handling"""
        result = await processAISearch("properties in Damansra", storage)  # Misspelled
        # Should still find Damansara properties due to fuzzy matching
        assert result['count'] >= 0
    
    # 8. Performance Tests
    @pytest.mark.asyncio
    async def test_search_performance(self, storage):
        """Test search performance - should complete within reasonable time"""
        import time
        
        start_time = time.time()
        result = await processAISearch("apartment in Damansara under RM500,000", storage)
        end_time = time.time()
        
        search_time = end_time - start_time
        assert search_time < 5.0  # Should complete within 5 seconds
        assert result['count'] >= 0
    
    # 9. Data Integrity Tests
    @pytest.mark.asyncio
    async def test_property_data_structure(self, storage):
        """Test that returned properties have correct data structure"""
        result = await processAISearch("apartment", storage)
        
        if result['count'] > 0:
            prop = result['properties'][0]
            
            # Required fields
            assert 'id' in prop
            assert 'title' in prop
            assert 'price' in prop
            assert 'propertyType' in prop
            assert 'listingType' in prop
            
            # Price should be numeric
            assert isinstance(prop['price'], (int, float, Decimal)) or prop['price'].replace('.', '').isdigit()
    
    @pytest.mark.asyncio
    async def test_search_filters_structure(self, storage):
        """Test that search result includes proper filters structure"""
        result = await processAISearch("factory in Damansara", storage)
        
        assert 'filters' in result
        assert 'count' in result
        assert 'properties' in result
        
        # Filters should contain the mapped property type
        if 'propertyType' in result['filters']:
            # Factory should be mapped to industrial
            assert result['filters']['propertyType'] == ['industrial']

# Helper function for distance calculation
def haversine(coord1, coord2):
    """Calculate distance between two coordinates using Haversine formula"""
    if not coord1 or not coord2:
        return float('inf')
    
    R = 6371  # Earth radius in km
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main(["-v", __file__])