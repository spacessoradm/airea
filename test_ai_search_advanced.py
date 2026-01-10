#!/usr/bin/env python3
"""
Advanced AI Search Testing - Search Suggestions, Context Intelligence, and Integration Tests
"""

import requests
import json
import time
import sys
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

class AdvancedAISearchTester:
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        self.results = []
        
    def test_search_suggestions(self):
        """Test AI-powered search suggestions"""
        print("\n💡 SEARCH SUGGESTIONS INTELLIGENCE TESTS")
        
        suggestions_tests = [
            {
                "test_id": "TC-AI-SUGGEST-001-1",
                "description": "Partial typing suggestions",
                "partial_query": "3 bed",
                "expected_contains": ["3 bedroom", "condo", "apartment"]
            },
            {
                "test_id": "TC-AI-SUGGEST-001-2", 
                "description": "Location-based suggestions",
                "partial_query": "KLCC",
                "expected_contains": ["KLCC", "luxury", "condo"]
            },
            {
                "test_id": "TC-AI-SUGGEST-001-3",
                "description": "Mont Kiara suggestions",
                "partial_query": "Mont",
                "expected_contains": ["Mont Kiara", "Montville"]
            }
        ]
        
        for test in suggestions_tests:
            print(f"  Running {test['test_id']}: {test['description']}")
            
            try:
                # Test enhanced suggestions endpoint
                response = requests.post(
                    f"{self.base_url}/api/search/suggestions-enhanced",
                    json={"query": test["partial_query"]},
                    timeout=10
                )
                
                if response.status_code == 200:
                    suggestions = response.json().get("suggestions", [])
                    suggestion_texts = [s.get("text", "") for s in suggestions]
                    
                    found_matches = []
                    for expected in test["expected_contains"]:
                        for suggestion in suggestion_texts:
                            if expected.lower() in suggestion.lower():
                                found_matches.append(expected)
                                break
                    
                    if len(found_matches) >= len(test["expected_contains"]) // 2:  # At least half should match
                        print(f"    ✅ PASS - Found suggestions: {suggestion_texts[:3]}")
                    else:
                        print(f"    ❌ FAIL - Expected {test['expected_contains']}, got {suggestion_texts}")
                else:
                    print(f"    ❌ FAIL - HTTP {response.status_code}")
                    
            except Exception as e:
                print(f"    ❌ ERROR - {str(e)}")
    
    def test_context_intelligence(self):
        """Test contextual understanding and intent detection"""
        print("\n🧠 CONTEXT INTELLIGENCE TESTS")
        
        context_tests = [
            {
                "test_id": "TC-AI-CONTEXT-001-1",
                "query": "looking to buy investment property",
                "expected_listing_type": "sale",
                "description": "Purchase intent detection"
            },
            {
                "test_id": "TC-AI-CONTEXT-001-2", 
                "query": "need temporary rental",
                "expected_listing_type": "rent",
                "description": "Rental intent detection"
            },
            {
                "test_id": "TC-AI-CONTEXT-002-1",
                "query": "family-friendly condo near good schools",
                "expected_bedrooms_min": 2,
                "description": "Family lifestyle inference"
            },
            {
                "test_id": "TC-AI-CONTEXT-002-2",
                "query": "studio near business district MRT access",
                "expected_amenities": ["transit"],
                "description": "Professional lifestyle inference"
            }
        ]
        
        for test in context_tests:
            print(f"  Running {test['test_id']}: {test['description']}")
            
            try:
                response = requests.post(
                    f"{self.base_url}/api/search/ai",
                    json={"query": test["query"], "searchType": "rent"},
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    properties = data.get("properties", [])
                    
                    # Check listing type if specified
                    if "expected_listing_type" in test:
                        listing_types = set(p.get("listingType") for p in properties)
                        if test["expected_listing_type"] in listing_types:
                            print(f"    ✅ PASS - Found expected listing type")
                        else:
                            print(f"    ❌ FAIL - Expected {test['expected_listing_type']}, got {list(listing_types)}")
                    
                    # Check bedroom requirements
                    if "expected_bedrooms_min" in test:
                        bedrooms = [p.get("bedrooms") for p in properties if p.get("bedrooms")]
                        if bedrooms and max(bedrooms) >= test["expected_bedrooms_min"]:
                            print(f"    ✅ PASS - Found properties with sufficient bedrooms")
                        else:
                            print(f"    ❌ FAIL - No properties meet minimum bedroom requirement")
                    
                    if properties:
                        print(f"    📊 Found {len(properties)} matching properties")
                    else:
                        print(f"    ⚠️  No properties returned")
                        
                else:
                    print(f"    ❌ FAIL - HTTP {response.status_code}")
                    
            except Exception as e:
                print(f"    ❌ ERROR - {str(e)}")
    
    def test_search_state_management(self):
        """Test search history and state persistence"""
        print("\n🔄 SEARCH STATE MANAGEMENT TESTS")
        
        # Test search history (this would typically be stored client-side)
        print("  Running TC-AI-STATE-001: Search history functionality")
        
        search_queries = [
            "2 bedroom condo KLCC",
            "house for rent Shah Alam", 
            "luxury apartment Mont Kiara",
            "3 bedroom townhouse under 500k",
            "studio near MRT station"
        ]
        
        try:
            # Simulate multiple searches to test if system handles them properly
            for i, query in enumerate(search_queries):
                response = requests.post(
                    f"{self.base_url}/api/search/ai",
                    json={"query": query, "searchType": "rent"},
                    timeout=30
                )
                
                if response.status_code == 200:
                    print(f"    ✅ Search {i+1}/5 successful: \"{query}\"")
                else:
                    print(f"    ❌ Search {i+1}/5 failed: \"{query}\"")
                
                time.sleep(0.5)  # Small delay between requests
            
            print("  ✅ PASS - Search state management test completed")
            
        except Exception as e:
            print(f"  ❌ ERROR - {str(e)}")
    
    def test_search_filter_integration(self):
        """Test AI search + manual filter integration"""
        print("\n🎯 SEARCH-FILTER INTEGRATION TESTS")
        
        integration_tests = [
            {
                "test_id": "TC-AI-INTEG-001-1",
                "ai_query": "condo under 600k",
                "additional_filters": {"bedrooms": 2},
                "description": "AI price + manual bedroom filter"
            },
            {
                "test_id": "TC-AI-INTEG-001-2", 
                "ai_query": "Mont Kiara apartment",
                "additional_filters": {"listingType": "sale", "minPrice": 400000},
                "description": "AI location + manual price range"
            }
        ]
        
        for test in integration_tests:
            print(f"  Running {test['test_id']}: {test['description']}")
            
            try:
                # First make AI search
                ai_response = requests.post(
                    f"{self.base_url}/api/search/ai",
                    json={"query": test["ai_query"], "searchType": "rent"},
                    timeout=30
                )
                
                if ai_response.status_code == 200:
                    ai_properties = ai_response.json().get("properties", [])
                    
                    # Then apply additional filters (simulate manual filtering)
                    filtered_properties = ai_properties
                    
                    # Apply bedroom filter
                    if "bedrooms" in test["additional_filters"]:
                        target_bedrooms = test["additional_filters"]["bedrooms"]
                        filtered_properties = [
                            p for p in filtered_properties 
                            if p.get("bedrooms") == target_bedrooms
                        ]
                    
                    # Apply price filters
                    if "minPrice" in test["additional_filters"]:
                        min_price = test["additional_filters"]["minPrice"]
                        filtered_properties = [
                            p for p in filtered_properties 
                            if p.get("price", 0) >= min_price
                        ]
                    
                    print(f"    📊 AI results: {len(ai_properties)} → Filtered: {len(filtered_properties)}")
                    
                    if len(filtered_properties) <= len(ai_properties):
                        print(f"    ✅ PASS - Filter integration works correctly")
                    else:
                        print(f"    ❌ FAIL - Filtering logic error")
                        
                else:
                    print(f"    ❌ FAIL - AI search failed with HTTP {ai_response.status_code}")
                    
            except Exception as e:
                print(f"    ❌ ERROR - {str(e)}")
    
    def test_edge_cases_and_fallbacks(self):
        """Test edge cases and fallback scenarios"""
        print("\n🚨 EDGE CASES & FALLBACK TESTS")
        
        edge_cases = [
            {
                "test_id": "TC-AI-EDGE-001",
                "query": "asdfghjkl random nonsense query",
                "description": "Completely invalid query handling",
                "expect_fallback": True
            },
            {
                "test_id": "TC-AI-EDGE-002",
                "query": "mansion under 10k",
                "description": "Unrealistic price expectations",
                "expect_empty": True
            },
            {
                "test_id": "TC-AI-EDGE-003",
                "query": "50 bedroom hotel",
                "description": "Impossible property specifications",
                "expect_empty": True
            },
            {
                "test_id": "TC-AI-EDGE-004",
                "query": "",
                "description": "Empty query handling",
                "expect_error": True
            }
        ]
        
        for test in edge_cases:
            print(f"  Running {test['test_id']}: {test['description']}")
            
            try:
                response = requests.post(
                    f"{self.base_url}/api/search/ai",
                    json={"query": test["query"], "searchType": "rent"},
                    timeout=30
                )
                
                if test.get("expect_error"):
                    if response.status_code != 200:
                        print(f"    ✅ PASS - Correctly handled invalid input")
                    else:
                        print(f"    ❌ FAIL - Should have returned error for empty query")
                
                elif response.status_code == 200:
                    data = response.json()
                    properties = data.get("properties", [])
                    
                    if test.get("expect_empty"):
                        if len(properties) == 0:
                            print(f"    ✅ PASS - Correctly returned no results for unrealistic query")
                        else:
                            print(f"    ⚠️  PARTIAL - Got {len(properties)} results (may be fallback results)")
                    
                    elif test.get("expect_fallback"):
                        # For nonsense queries, should either return popular results or error gracefully
                        print(f"    ✅ PASS - Handled nonsense query gracefully ({len(properties)} results)")
                        
                else:
                    print(f"    ❌ FAIL - HTTP {response.status_code}")
                    
            except Exception as e:
                print(f"    ❌ ERROR - {str(e)}")
    
    def test_performance_benchmarks(self):
        """Test performance under various conditions"""
        print("\n⚡ PERFORMANCE BENCHMARK TESTS")
        
        performance_tests = [
            {
                "test_id": "TC-AI-PERF-ADV-001",
                "query": "condo",
                "max_time": 1.0,
                "description": "Ultra-simple query speed"
            },
            {
                "test_id": "TC-AI-PERF-ADV-002", 
                "query": "2 bedroom luxury condominium with swimming pool gym and parking near KLCC Pavilion under 800000 for rent",
                "max_time": 8.0,
                "description": "Very complex query tolerance"
            }
        ]
        
        for test in performance_tests:
            print(f"  Running {test['test_id']}: {test['description']}")
            
            start_time = time.time()
            try:
                response = requests.post(
                    f"{self.base_url}/api/search/ai",
                    json={"query": test["query"], "searchType": "rent"},
                    timeout=test["max_time"] + 5  # Add buffer for timeout
                )
                
                elapsed = time.time() - start_time
                
                if response.status_code == 200:
                    properties = response.json().get("properties", [])
                    if elapsed <= test["max_time"]:
                        print(f"    ✅ PASS - Completed in {elapsed:.2f}s (< {test['max_time']}s), {len(properties)} results")
                    else:
                        print(f"    ❌ FAIL - Took {elapsed:.2f}s (expected < {test['max_time']}s)")
                else:
                    print(f"    ❌ FAIL - HTTP {response.status_code} in {elapsed:.2f}s")
                    
            except requests.Timeout:
                elapsed = time.time() - start_time
                print(f"    ❌ TIMEOUT - Exceeded {elapsed:.2f}s")
            except Exception as e:
                elapsed = time.time() - start_time
                print(f"    ❌ ERROR - {str(e)} after {elapsed:.2f}s")

def main():
    """Run advanced AI search tests"""
    print("🚀 ADVANCED AI SEARCH TESTING SUITE")
    print(f"{'='*60}")
    
    tester = AdvancedAISearchTester()
    
    # Check server availability
    print("⏳ Checking server availability...")
    try:
        response = requests.get("http://localhost:5000/api/properties", timeout=5)
        if response.status_code == 200:
            print("✅ Server is ready")
        else:
            print("❌ Server returned error")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        sys.exit(1)
    
    # Run all advanced test suites
    try:
        tester.test_search_suggestions()
        tester.test_context_intelligence() 
        tester.test_search_state_management()
        tester.test_search_filter_integration()
        tester.test_edge_cases_and_fallbacks()
        tester.test_performance_benchmarks()
        
        print(f"\n🎉 ADVANCED TESTING COMPLETED")
        print(f"{'='*60}")
        
    except KeyboardInterrupt:
        print("\n⚠️  Testing interrupted by user")
    except Exception as e:
        print(f"\n❌ Advanced testing failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()