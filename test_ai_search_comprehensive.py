#!/usr/bin/env python3
"""
Comprehensive AI Search Testing Framework for Airea Platform
Tests all AI search scenarios across multiple languages and contexts
"""

import requests
import json
import time
import sys
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class TestResult:
    test_id: str
    description: str
    query: str
    language: str
    expected_filters: Dict[str, Any]
    actual_response: Dict[str, Any]
    passed: bool
    error_message: Optional[str] = None
    response_time: float = 0.0

class AISearchTester:
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        self.results: List[TestResult] = []
        
    def make_ai_search_request(self, query: str, search_type: str = "rent", language: str = "en") -> tuple[Dict[str, Any], float]:
        """Make AI search API request and return response with timing"""
        url = f"{self.base_url}/api/search/ai"
        payload = {
            "query": query,
            "searchType": search_type,
            "language": language
        }
        
        start_time = time.time()
        try:
            response = requests.post(url, json=payload, timeout=30)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                return response.json(), response_time
            else:
                return {"error": f"HTTP {response.status_code}", "message": response.text}, response_time
                
        except Exception as e:
            response_time = time.time() - start_time
            return {"error": "Request failed", "message": str(e)}, response_time
    
    def check_filters_match(self, expected: Dict[str, Any], actual_response: Dict[str, Any]) -> tuple[bool, str]:
        """Check if actual response matches expected filters"""
        if "error" in actual_response:
            return False, f"API Error: {actual_response.get('message', 'Unknown error')}"
        
        properties = actual_response.get("properties", [])
        if not properties:
            return False, "No properties returned"
        
        # Check property type filtering
        if "propertyType" in expected:
            expected_types = expected["propertyType"] if isinstance(expected["propertyType"], list) else [expected["propertyType"]]
            actual_types = set(prop.get("propertyType") for prop in properties)
            if not any(ptype in actual_types for ptype in expected_types):
                return False, f"Expected property types {expected_types}, found {list(actual_types)}"
        
        # Check listing type filtering
        if "listingType" in expected:
            actual_listing_types = set(prop.get("listingType") for prop in properties)
            if expected["listingType"] not in actual_listing_types:
                return False, f"Expected listing type {expected['listingType']}, found {list(actual_listing_types)}"
        
        # Check price filtering
        if "maxPrice" in expected:
            max_expected = expected["maxPrice"]
            actual_prices = [prop.get("price", 0) for prop in properties if prop.get("price")]
            if actual_prices and max(actual_prices) > max_expected * 1.1:  # Allow 10% tolerance
                return False, f"Found properties above max price {max_expected}: {max(actual_prices)}"
        
        # Check bedroom filtering
        if "bedrooms" in expected:
            expected_beds = expected["bedrooms"]
            actual_bedrooms = [prop.get("bedrooms") for prop in properties if prop.get("bedrooms") is not None]
            if actual_bedrooms and expected_beds not in actual_bedrooms:
                return False, f"Expected {expected_beds} bedrooms not found in results: {set(actual_bedrooms)}"
        
        # Check area/location filtering
        if "area" in expected:
            expected_area = expected["area"].lower()
            found_in_area = False
            for prop in properties:
                prop_area = prop.get("area", "").lower()
                prop_city = prop.get("city", "").lower()
                if expected_area in prop_area or expected_area in prop_city:
                    found_in_area = True
                    break
            if not found_in_area:
                return False, f"No properties found in expected area: {expected['area']}"
        
        return True, "All filters matched successfully"
    
    def run_test(self, test_id: str, description: str, query: str, expected_filters: Dict[str, Any], 
                 search_type: str = "rent", language: str = "en") -> TestResult:
        """Run a single AI search test"""
        print(f"  Running {test_id}: {description}")
        
        response, response_time = self.make_ai_search_request(query, search_type, language)
        passed, error_message = self.check_filters_match(expected_filters, response)
        
        result = TestResult(
            test_id=test_id,
            description=description,
            query=query,
            language=language,
            expected_filters=expected_filters,
            actual_response=response,
            passed=passed,
            error_message=error_message,
            response_time=response_time
        )
        
        self.results.append(result)
        status = "✅ PASS" if passed else "❌ FAIL"
        time_str = f"({response_time:.2f}s)"
        print(f"    {status} {time_str} - {error_message if error_message else 'Success'}")
        
        return result

def run_core_ai_intelligence_tests(tester: AISearchTester):
    """Test core AI search intelligence"""
    print("\n🤖 CORE AI SEARCH INTELLIGENCE TESTS")
    
    # Simple queries
    tester.run_test("TC-AI-001-1", "Simple bedroom query", 
                   "2 bedroom apartment", 
                   {"bedrooms": 2, "propertyType": "apartment"})
    
    tester.run_test("TC-AI-001-2", "Price extraction query", 
                   "condo under 500k", 
                   {"propertyType": "condominium", "maxPrice": 500000})
    
    tester.run_test("TC-AI-001-3", "Rental intent query", 
                   "house for rent", 
                   {"propertyType": "house", "listingType": "rent"}, 
                   search_type="rent")
    
    # Complex queries
    tester.run_test("TC-AI-001-4", "Complex multi-criteria query", 
                   "3 bedroom condo near KLCC under 800k", 
                   {"bedrooms": 3, "propertyType": "condominium", "area": "KLCC", "maxPrice": 800000})

def run_price_intelligence_tests(tester: AISearchTester):
    """Test price intelligence parsing"""
    print("\n💰 PRICE INTELLIGENCE TESTS")
    
    # Malaysian price formats
    tester.run_test("TC-AI-002-1", "RM format parsing", 
                   "RM 500,000 condo", 
                   {"maxPrice": 500000, "propertyType": "condominium"})
    
    tester.run_test("TC-AI-002-2", "K suffix parsing", 
                   "apartment 600k", 
                   {"maxPrice": 600000, "propertyType": "apartment"})
    
    tester.run_test("TC-AI-002-3", "Million format parsing", 
                   "house 1.2 million", 
                   {"maxPrice": 1200000, "propertyType": "house"})
    
    tester.run_test("TC-AI-002-4", "Below price parsing", 
                   "condo below 800k", 
                   {"maxPrice": 800000, "propertyType": "condominium"})
    
    tester.run_test("TC-AI-002-5", "Rental price parsing", 
                   "rent under 3000", 
                   {"maxPrice": 3000, "listingType": "rent"}, 
                   search_type="rent")

def run_location_intelligence_tests(tester: AISearchTester):
    """Test location intelligence"""
    print("\n🌍 LOCATION INTELLIGENCE TESTS")
    
    tester.run_test("TC-AI-003-1", "KLCC area recognition", 
                   "condo in KLCC", 
                   {"propertyType": "condominium", "area": "KLCC"})
    
    tester.run_test("TC-AI-003-2", "Mont Kiara recognition", 
                   "apartment Mont Kiara", 
                   {"propertyType": "apartment", "area": "Mont Kiara"})
    
    tester.run_test("TC-AI-003-3", "Proximity search", 
                   "house near Pavilion", 
                   {"propertyType": "house", "area": "Pavilion"})
    
    tester.run_test("TC-AI-003-4", "City-wide search", 
                   "condo Petaling Jaya", 
                   {"propertyType": "condominium", "area": "Petaling Jaya"})

def run_property_type_intelligence_tests(tester: AISearchTester):
    """Test property type intelligence"""
    print("\n🏠 PROPERTY TYPE INTELLIGENCE TESTS")
    
    # Synonym recognition
    tester.run_test("TC-AI-004-1", "Condo synonym", 
                   "2 bedroom condo KLCC", 
                   {"bedrooms": 2, "propertyType": "condominium", "area": "KLCC"})
    
    tester.run_test("TC-AI-004-2", "Flat synonym", 
                   "3 bedroom flat", 
                   {"bedrooms": 3, "propertyType": "apartment"})
    
    tester.run_test("TC-AI-004-3", "Terrace house", 
                   "terrace house Shah Alam", 
                   {"propertyType": "townhouse", "area": "Shah Alam"})

def run_multilanguage_tests(tester: AISearchTester):
    """Test multi-language AI processing"""
    print("\n🌐 MULTI-LANGUAGE AI TESTS")
    
    # Bahasa Malaysia tests
    tester.run_test("TC-AI-LANG-001-1", "BM basic query", 
                   "kondo 3 bilik dekat KLCC", 
                   {"bedrooms": 3, "propertyType": "condominium", "area": "KLCC"}, 
                   language="ms")
    
    tester.run_test("TC-AI-LANG-001-2", "BM rental query", 
                   "rumah untuk disewa Shah Alam", 
                   {"propertyType": "house", "listingType": "rent", "area": "Shah Alam"}, 
                   search_type="rent", language="ms")
    
    tester.run_test("TC-AI-LANG-001-3", "BM price query", 
                   "apartmen bawah 600k", 
                   {"propertyType": "apartment", "maxPrice": 600000}, 
                   language="ms")
    
    # Chinese tests
    tester.run_test("TC-AI-LANG-002-1", "Chinese basic query", 
                   "3室公寓 KLCC附近", 
                   {"bedrooms": 3, "propertyType": "apartment", "area": "KLCC"}, 
                   language="zh")
    
    tester.run_test("TC-AI-LANG-002-2", "Chinese rental query", 
                   "出租房屋", 
                   {"propertyType": "house", "listingType": "rent"}, 
                   search_type="rent", language="zh")

def run_performance_tests(tester: AISearchTester):
    """Test search performance and accuracy"""
    print("\n⚡ PERFORMANCE & ACCURACY TESTS")
    
    # Simple query speed test
    result = tester.run_test("TC-AI-PERF-001-1", "Simple query speed test", 
                            "2 bedroom condo", 
                            {"bedrooms": 2, "propertyType": "condominium"})
    
    if result.response_time > 2.0:
        print(f"    ⚠️  WARNING: Simple query took {result.response_time:.2f}s (expected < 2s)")
    
    # Complex query speed test
    result = tester.run_test("TC-AI-PERF-001-2", "Complex query speed test", 
                            "3 bedroom luxury condo near KLCC under 800k", 
                            {"bedrooms": 3, "propertyType": "condominium", "area": "KLCC", "maxPrice": 800000})
    
    if result.response_time > 5.0:
        print(f"    ⚠️  WARNING: Complex query took {result.response_time:.2f}s (expected < 5s)")

def run_error_handling_tests(tester: AISearchTester):
    """Test error handling and edge cases"""
    print("\n🚨 ERROR HANDLING TESTS")
    
    # Ambiguous queries
    tester.run_test("TC-AI-ERROR-001-1", "Ambiguous query handling", 
                   "nice property", 
                   {})  # Should still return some results
    
    # Impossible criteria
    tester.run_test("TC-AI-ERROR-001-2", "Impossible criteria handling", 
                   "10 bedroom condo under 100k", 
                   {"bedrooms": 10, "propertyType": "condominium", "maxPrice": 100000})

def generate_test_report(tester: AISearchTester):
    """Generate comprehensive test report"""
    total_tests = len(tester.results)
    passed_tests = sum(1 for result in tester.results if result.passed)
    failed_tests = total_tests - passed_tests
    
    print(f"\n📊 TEST EXECUTION SUMMARY")
    print(f"{'='*60}")
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests} (✅)")
    print(f"Failed: {failed_tests} ({'❌' if failed_tests > 0 else '✅'})")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    # Performance statistics
    response_times = [r.response_time for r in tester.results if r.response_time > 0]
    if response_times:
        avg_time = sum(response_times) / len(response_times)
        max_time = max(response_times)
        print(f"Average Response Time: {avg_time:.2f}s")
        print(f"Maximum Response Time: {max_time:.2f}s")
    else:
        avg_time = 0
        max_time = 0
    
    # Failed tests details
    if failed_tests > 0:
        print(f"\n❌ FAILED TESTS DETAILS:")
        print(f"{'='*60}")
        for result in tester.results:
            if not result.passed:
                print(f"• {result.test_id}: {result.description}")
                print(f"  Query: \"{result.query}\"")
                print(f"  Language: {result.language}")
                print(f"  Error: {result.error_message}")
                print(f"  Expected: {result.expected_filters}")
                if "properties" in result.actual_response:
                    props_count = len(result.actual_response["properties"])
                    print(f"  Got: {props_count} properties")
                print()
    
    # Language breakdown
    lang_stats = {}
    for result in tester.results:
        lang = result.language
        if lang not in lang_stats:
            lang_stats[lang] = {"total": 0, "passed": 0}
        lang_stats[lang]["total"] += 1
        if result.passed:
            lang_stats[lang]["passed"] += 1
    
    print(f"\n🌐 LANGUAGE TEST BREAKDOWN:")
    print(f"{'='*60}")
    for lang, stats in lang_stats.items():
        success_rate = (stats["passed"] / stats["total"]) * 100
        lang_name = {"en": "English", "ms": "Bahasa Malaysia", "zh": "Chinese"}.get(lang, lang)
        print(f"{lang_name}: {stats['passed']}/{stats['total']} ({success_rate:.1f}%)")
    
    # Save detailed results to JSON
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"ai_search_test_report_{timestamp}.json"
    
    report_data = {
        "summary": {
            "timestamp": datetime.now().isoformat(),
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": (passed_tests/total_tests)*100,
            "avg_response_time": avg_time if response_times else 0,
            "max_response_time": max_time if response_times else 0
        },
        "language_breakdown": lang_stats,
        "detailed_results": [
            {
                "test_id": r.test_id,
                "description": r.description,
                "query": r.query,
                "language": r.language,
                "expected_filters": r.expected_filters,
                "passed": r.passed,
                "error_message": r.error_message,
                "response_time": r.response_time,
                "properties_count": len(r.actual_response.get("properties", []))
            }
            for r in tester.results
        ]
    }
    
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 Detailed report saved to: {report_file}")

def main():
    """Main test execution function"""
    print("🚀 STARTING COMPREHENSIVE AI SEARCH TESTING")
    print(f"{'='*60}")
    print(f"Testing Airea Platform AI Search Functionality")
    print(f"Target: http://localhost:5000")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = AISearchTester()
    
    # Wait for server to be ready
    print("\n⏳ Checking server availability...")
    max_retries = 5
    for i in range(max_retries):
        try:
            response = requests.get("http://localhost:5000/api/properties", timeout=5)
            if response.status_code == 200:
                print("✅ Server is ready")
                break
        except:
            if i < max_retries - 1:
                print(f"   Waiting for server... ({i+1}/{max_retries})")
                time.sleep(3)
            else:
                print("❌ Server not available. Please start the application.")
                sys.exit(1)
    
    # Run all test categories
    try:
        run_core_ai_intelligence_tests(tester)
        run_price_intelligence_tests(tester)
        run_location_intelligence_tests(tester)
        run_property_type_intelligence_tests(tester)
        run_multilanguage_tests(tester)
        run_performance_tests(tester)
        run_error_handling_tests(tester)
        
    except KeyboardInterrupt:
        print("\n⚠️  Testing interrupted by user")
    except Exception as e:
        print(f"\n❌ Testing failed with error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        generate_test_report(tester)

if __name__ == "__main__":
    main()