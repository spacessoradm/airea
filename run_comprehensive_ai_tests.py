#!/usr/bin/env python3
"""
Master Test Runner - Executes all AI search test scenarios comprehensively
"""

import subprocess
import sys
import time
import requests
from datetime import datetime

def check_server_health():
    """Check if the server is running and healthy"""
    print("🔍 Checking server health...")
    
    try:
        # Check main API endpoint
        response = requests.get("http://localhost:5000/api/properties", timeout=10)
        if response.status_code == 200:
            properties = response.json()
            print(f"✅ Server healthy - {len(properties)} properties available")
            return True
        else:
            print(f"❌ Server unhealthy - HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        return False

def run_test_suite(script_name, description):
    """Run a specific test suite"""
    print(f"\n{'='*60}")
    print(f"🧪 RUNNING {description.upper()}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(
            [sys.executable, script_name],
            capture_output=False,  # Show output in real-time
            text=True,
            timeout=600  # 10 minute timeout per suite
        )
        
        if result.returncode == 0:
            print(f"✅ {description} completed successfully")
            return True
        else:
            print(f"❌ {description} failed with exit code {result.returncode}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"⏰ {description} timed out after 10 minutes")
        return False
    except Exception as e:
        print(f"❌ {description} failed with error: {e}")
        return False

def main():
    """Main test execution orchestrator"""
    print("🚀 COMPREHENSIVE AI SEARCH TESTING SUITE")
    print(f"{'='*80}")
    print(f"🕐 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🎯 Target: http://localhost:5000")
    print(f"📋 Testing all AI search functionality across multiple languages")
    print(f"{'='*80}")
    
    # Check server health first
    if not check_server_health():
        print("\n❌ Server is not available. Please:")
        print("1. Make sure the application is running: npm run dev")
        print("2. Check that port 5000 is accessible")
        print("3. Wait for the server to fully start up")
        sys.exit(1)
    
    # Test suites to run
    test_suites = [
        {
            "script": "test_ai_search_comprehensive.py",
            "description": "Core AI Search Intelligence Tests",
            "includes": [
                "Natural language query processing",
                "Price intelligence parsing", 
                "Location intelligence",
                "Property type recognition",
                "Multi-language support (EN/BM/CN)",
                "Performance benchmarks",
                "Error handling"
            ]
        },
        {
            "script": "test_ai_search_advanced.py", 
            "description": "Advanced AI Search Features Tests",
            "includes": [
                "Search suggestions intelligence",
                "Context understanding",
                "Search state management", 
                "Filter integration",
                "Edge cases and fallbacks",
                "Performance benchmarks"
            ]
        }
    ]
    
    results = []
    
    print(f"\n📋 TEST EXECUTION PLAN:")
    print(f"{'='*60}")
    for i, suite in enumerate(test_suites, 1):
        print(f"{i}. {suite['description']}")
        for feature in suite['includes']:
            print(f"   • {feature}")
    
    print(f"\n⏳ Starting test execution in 3 seconds...")
    time.sleep(3)
    
    # Run each test suite
    for suite in test_suites:
        success = run_test_suite(suite["script"], suite["description"])
        results.append({
            "suite": suite["description"],
            "success": success,
            "script": suite["script"]
        })
        
        # Brief pause between suites
        if suite != test_suites[-1]:  # Not the last suite
            print(f"\n⏸️  Pausing 5 seconds before next suite...")
            time.sleep(5)
    
    # Final summary
    print(f"\n{'='*80}")
    print(f"🏁 COMPREHENSIVE TESTING COMPLETED")
    print(f"{'='*80}")
    print(f"🕐 Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    successful_suites = sum(1 for r in results if r["success"])
    total_suites = len(results)
    
    print(f"\n📊 OVERALL RESULTS:")
    print(f"{'='*60}")
    print(f"Total Test Suites: {total_suites}")
    print(f"Successful: {successful_suites}")
    print(f"Failed: {total_suites - successful_suites}")
    print(f"Success Rate: {(successful_suites/total_suites)*100:.1f}%")
    
    print(f"\n📋 DETAILED SUITE RESULTS:")
    print(f"{'='*60}")
    for result in results:
        status = "✅ PASSED" if result["success"] else "❌ FAILED"
        print(f"{status} - {result['suite']}")
        if not result["success"]:
            print(f"         Script: {result['script']}")
    
    if successful_suites == total_suites:
        print(f"\n🎉 ALL TEST SUITES PASSED!")
        print(f"🚀 Your AI search functionality is working perfectly across:")
        print(f"   • All three languages (English, BM, Chinese)")
        print(f"   • Complex natural language processing")
        print(f"   • Price and location intelligence")
        print(f"   • Property type recognition")
        print(f"   • Advanced search features")
        print(f"   • Performance requirements")
        print(f"   • Error handling scenarios")
    else:
        print(f"\n⚠️  SOME TEST SUITES FAILED")
        print(f"🔧 Check the detailed test reports for specific issues")
        print(f"📄 Look for JSON report files with timestamps")
    
    print(f"\n📄 Check individual test report files for detailed results")
    print(f"💡 Re-run specific test scripts to debug individual issues")

if __name__ == "__main__":
    main()