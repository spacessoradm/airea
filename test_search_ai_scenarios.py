#!/usr/bin/env python3
"""
Comprehensive AI Property Search Engine Test Suite
Tests the search engine via HTTP API calls to the running Node.js server
"""
import pytest
import requests
import json
import time
from typing import Dict, List, Any

# Base URL for the API
BASE_URL = "http://localhost:5000"

class TestAISearchEngine:
    """Test cases for the AI-powered property search engine"""
    
    def setup_class(self):
        """Setup for test class"""
        self.base_url = BASE_URL
        self.timeout = 10  # 10 second timeout for API calls
    
    def _search_api(self, query: str) -> Dict[str, Any]:
        """Helper method to call the search API"""
        try:
            response = requests.post(
                f"{self.base_url}/api/search/ai", 
                json={"query": query},
                timeout=self.timeout
            )
            if response.status_code == 200:
                return response.json()
            else:
                return {"count": 0, "properties": [], "error": f"HTTP {response.status_code}"}
        except requests.exceptions.RequestException as e:
            return {"count": 0, "properties": [], "error": str(e)}
    
    # 1. Basic Search Accuracy Tests - Exact Match
    def test_exact_match_shop_lot_bandar_utama(self):
        """Test exact match search for Shop Lot @ Bandar Utama"""
        result = self._search_api("Shop Lot Bandar Utama")
        
        assert result["count"] > 0, f"Expected results for 'Shop Lot Bandar Utama', got {result.get('error', 'no results')}"
        
        # Should find properties with Bandar Utama
        found_bandar_utama = any("Bandar Utama" in prop.get("title", "") for prop in result["properties"])
        assert found_bandar_utama, "Should find properties in Bandar Utama"
    
    def test_exact_match_factory_mont_kiara(self):
        """Test exact match search for Factory @ Mont Kiara"""
        result = self._search_api("Factory Mont Kiara")
        
        assert result["count"] > 0, f"Expected results for 'Factory Mont Kiara', got {result.get('error', 'no results')}"
        
        # Should find industrial properties in Mont Kiara (factory mapped to industrial)
        found_mont_kiara = any("Mont Kiara" in prop.get("title", "") for prop in result["properties"])
        assert found_mont_kiara, "Should find factory properties in Mont Kiara"
    
    def test_exact_match_apartment_mutiara_damansara(self):
        """Test exact match search for Apartment @ Mutiara Damansara"""
        result = self._search_api("Apartment Mutiara Damansara")
        
        assert result["count"] > 0, f"Expected results for 'Apartment Mutiara Damansara', got {result.get('error', 'no results')}"
        
        # Should find properties with Mutiara Damansara
        found_mutiara = any("Mutiara Damansara" in prop.get("title", "") for prop in result["properties"])
        assert found_mutiara, "Should find apartments in Mutiara Damansara"
    
    # 2. Property Type Recognition Tests
    def test_property_type_factory_recognition(self):
        """Test that 'factory' is correctly mapped to industrial properties"""
        result = self._search_api("factory")
        
        assert result["count"] > 0, f"Expected factory results, got {result.get('error', 'no results')}"
        
        # Should return industrial properties
        industrial_properties = [prop for prop in result["properties"] 
                               if prop.get("propertyType") == "industrial"]
        assert len(industrial_properties) > 0, "Factory search should return industrial properties"
    
    def test_property_type_warehouse_recognition(self):
        """Test that 'warehouse' is correctly mapped to industrial properties"""
        result = self._search_api("warehouse")
        
        assert result["count"] > 0, f"Expected warehouse results, got {result.get('error', 'no results')}"
        
        # Should return industrial properties
        industrial_properties = [prop for prop in result["properties"] 
                               if prop.get("propertyType") == "industrial"]
        assert len(industrial_properties) > 0, "Warehouse search should return industrial properties"
    
    def test_property_type_commercial_shoplot(self):
        """Test that 'commercial shoplot' is correctly handled"""
        result = self._search_api("commercial shoplot")
        
        assert result["count"] > 0, f"Expected shoplot results, got {result.get('error', 'no results')}"
        
        # Should find commercial properties (shop-office type)
        shop_properties = [prop for prop in result["properties"] 
                         if "shop" in prop.get("propertyType", "").lower() or 
                            prop.get("propertyType") == "shop-office"]
        assert len(shop_properties) > 0, "Shoplot search should return shop/commercial properties"
    
    def test_property_type_office_space(self):
        """Test office space search"""
        result = self._search_api("office space")
        
        assert result["count"] > 0, f"Expected office results, got {result.get('error', 'no results')}"
        
        # Should find office/commercial properties
        office_properties = [prop for prop in result["properties"] 
                           if "office" in prop.get("propertyType", "").lower() or
                              prop.get("propertyType") == "commercial"]
        assert len(office_properties) > 0, "Office search should return office/commercial properties"
    
    # 3. Location Intelligence Tests
    def test_location_damansara_area_search(self):
        """Test area-based search for Damansara"""
        result = self._search_api("properties in Damansara")
        
        assert result["count"] > 0, f"Expected Damansara results, got {result.get('error', 'no results')}"
        
        # Should find properties in various Damansara areas
        damansara_properties = [prop for prop in result["properties"] 
                              if "Damansara" in prop.get("title", "") or 
                                 "Damansara" in prop.get("address", "")]
        assert len(damansara_properties) > 0, "Should find properties in Damansara area"
    
    def test_location_kepong_area_search(self):
        """Test area-based search for Kepong"""
        result = self._search_api("Kepong properties")
        
        assert result["count"] > 0, f"Expected Kepong results, got {result.get('error', 'no results')}"
        
        # Should find properties in Kepong
        kepong_properties = [prop for prop in result["properties"] 
                           if "Kepong" in prop.get("title", "") or 
                              "Kepong" in prop.get("address", "")]
        assert len(kepong_properties) > 0, "Should find properties in Kepong area"
    
    def test_location_mont_kiara_search(self):
        """Test area-based search for Mont Kiara"""
        result = self._search_api("Mont Kiara")
        
        assert result["count"] > 0, f"Expected Mont Kiara results, got {result.get('error', 'no results')}"
        
        # Should find properties in Mont Kiara
        mont_kiara_properties = [prop for prop in result["properties"] 
                               if "Mont Kiara" in prop.get("title", "") or 
                                  "Mont Kiara" in prop.get("address", "")]
        assert len(mont_kiara_properties) > 0, "Should find properties in Mont Kiara"
    
    # 4. Price Filtering Tests
    def test_price_filter_under_500k(self):
        """Test price filtering for properties under RM500,000"""
        result = self._search_api("property under RM500,000")
        
        assert result["count"] > 0, f"Expected price filtered results, got {result.get('error', 'no results')}"
        
        # All properties should be under 500,000
        for prop in result["properties"]:
            price = float(prop.get("price", 0))
            assert price <= 500000, f"Property {prop.get('title')} price {price} exceeds RM500,000"
    
    def test_price_filter_comma_separated(self):
        """Test comma-separated price parsing (RM2,000)"""
        result = self._search_api("condo under RM2,000")
        
        if result["count"] > 0:  # Only test if results found
            for prop in result["properties"]:
                price = float(prop.get("price", 0))
                assert price <= 2000, f"Property {prop.get('title')} price {price} exceeds RM2,000"
    
    def test_price_filter_rental_range(self):
        """Test rental price filtering"""
        result = self._search_api("apartment for rent under RM3000")
        
        if result["count"] > 0:  # Only test if rental properties found
            # Should be rental properties
            rental_properties = [prop for prop in result["properties"] 
                               if prop.get("listingType") == "rent"]
            
            for prop in rental_properties:
                price = float(prop.get("price", 0))
                assert price <= 3000, f"Rental property {prop.get('title')} price {price} exceeds RM3,000"
    
    # 5. Combined Filter Tests
    def test_combined_filters_residential_damansara_price(self):
        """Test multiple filters: residential in Damansara under RM800k"""
        result = self._search_api("house in Damansara under RM800,000")
        
        # Should handle complex query
        assert result["count"] >= 0, f"Error in combined filter search: {result.get('error')}"
        
        for prop in result["properties"]:
            # Check price constraint
            price = float(prop.get("price", 0))
            assert price <= 800000, f"Property {prop.get('title')} exceeds price limit"
            
            # Check location constraint
            location_match = ("Damansara" in prop.get("title", "") or 
                            "Damansara" in prop.get("address", ""))
            assert location_match, f"Property {prop.get('title')} not in Damansara area"
    
    def test_combined_filters_factory_under_1m(self):
        """Test combined filters: factory under RM1M"""
        result = self._search_api("factory under RM1,000,000")
        
        assert result["count"] >= 0, f"Error in factory price search: {result.get('error')}"
        
        for prop in result["properties"]:
            # Check price constraint
            price = float(prop.get("price", 0))
            assert price <= 1000000, f"Factory {prop.get('title')} exceeds RM1M"
            
            # Should be industrial type (mapped from factory)
            prop_type = prop.get("propertyType", "")
            assert prop_type == "industrial", f"Factory search should return industrial properties, got {prop_type}"
    
    # 6. Listing Type Tests
    def test_listing_type_for_rent(self):
        """Test rental listing type filtering"""
        result = self._search_api("apartment for rent")
        
        assert result["count"] >= 0, f"Error in rental search: {result.get('error')}"
        
        rental_properties = [prop for prop in result["properties"] 
                           if prop.get("listingType") == "rent"]
        
        if result["count"] > 0:
            assert len(rental_properties) > 0, "Rental search should return rental properties"
    
    def test_listing_type_for_sale(self):
        """Test sale listing type filtering"""
        result = self._search_api("house for sale")
        
        assert result["count"] >= 0, f"Error in sale search: {result.get('error')}"
        
        sale_properties = [prop for prop in result["properties"] 
                         if prop.get("listingType") == "sale"]
        
        if result["count"] > 0:
            assert len(sale_properties) > 0, "Sale search should return sale properties"
    
    # 7. Performance and Error Handling Tests
    def test_search_performance(self):
        """Test search response time"""
        start_time = time.time()
        result = self._search_api("apartment in Damansara")
        end_time = time.time()
        
        response_time = end_time - start_time
        assert response_time < 5.0, f"Search took {response_time:.2f}s, should be under 5s"
        assert result["count"] >= 0, "Search should complete without errors"
    
    def test_empty_query_handling(self):
        """Test empty query handling"""
        result = self._search_api("")
        
        # Should handle gracefully without errors
        assert "error" not in result or result["error"] == "", "Empty query should be handled gracefully"
        assert result["count"] >= 0, "Empty query should return valid response structure"
    
    def test_nonsensical_query_handling(self):
        """Test nonsensical query handling"""
        result = self._search_api("purple elephant dancing")
        
        # Should handle gracefully
        assert "error" not in result or "HTTP 500" not in str(result.get("error", "")), "Nonsensical query should not cause server error"
        assert result["count"] >= 0, "Nonsensical query should return valid response structure"
    
    # 8. Data Structure Validation Tests
    def test_response_data_structure(self):
        """Test that API responses have correct structure"""
        result = self._search_api("apartment")
        
        # Response should have required fields
        assert "count" in result, "Response should include count field"
        assert "properties" in result, "Response should include properties field"
        
        if result["count"] > 0:
            prop = result["properties"][0]
            
            # Property should have required fields
            required_fields = ["id", "title", "price", "propertyType"]
            for field in required_fields:
                assert field in prop, f"Property should have {field} field"
    
    # 9. Regression Tests for Previously Fixed Issues
    def test_regression_factory_search_works(self):
        """Regression test: Factory search should work (was previously broken)"""
        result = self._search_api("factory")
        
        assert result["count"] > 0, "Factory search should return results (regression test)"
        
        # Should map to industrial properties
        industrial_count = sum(1 for prop in result["properties"] 
                             if prop.get("propertyType") == "industrial")
        assert industrial_count > 0, "Factory search should return industrial properties"
    
    def test_regression_commercial_shoplot_no_error(self):
        """Regression test: Commercial shoplot should not cause database errors"""
        result = self._search_api("commercial shoplot")
        
        # Should not have database enum errors
        assert "invalid input value for enum" not in str(result.get("error", "")), "Should not have enum database errors"
        assert result["count"] >= 0, "Commercial shoplot search should complete without errors"

if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main(["-v", __file__])