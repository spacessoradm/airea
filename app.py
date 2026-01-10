from flask import Flask, request, jsonify, send_from_directory
import psycopg2
import os
from fuzzywuzzy import fuzz
from collections import defaultdict
import json

app = Flask(__name__)

def get_db_connection():
    """Create database connection using environment variables"""
    return psycopg2.connect(
        host=os.getenv('PGHOST'),
        port=os.getenv('PGPORT', 5432),
        database=os.getenv('PGDATABASE'),
        user=os.getenv('PGUSER'),
        password=os.getenv('PGPASSWORD')
    )

@app.route('/')
def serve_index():
    """Serve static/index.html as root route"""
    return send_from_directory('static', 'index.html')

@app.route('/autocomplete')
def autocomplete():
    """Fuzzy search autocomplete endpoint with typo tolerance"""
    query = request.args.get('q', '').strip()
    
    if not query or len(query) < 2:
        return jsonify([])
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all properties for fuzzy matching
        cursor.execute("SELECT DISTINCT title, property_type FROM properties")
        all_properties = cursor.fetchall()
        
        # First try ILIKE search for exact partial matches
        search_pattern = f"%{query}%"
        cursor.execute("""
            SELECT DISTINCT title, property_type 
            FROM properties 
            WHERE title ILIKE %s 
            LIMIT 50
        """, (search_pattern,))
        
        ilike_results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Priority mapping for property types
        priority_order = {
            'apartment': 1,
            'house': 2, 
            'condominium': 3
        }
        
        # Combine ILIKE and fuzzy results
        combined_results = {}
        
        # Add ILIKE results with higher scores
        for title, prop_type in ilike_results:
            fuzzy_score = fuzz.partial_ratio(query.lower(), title.lower())
            priority = priority_order.get(prop_type, 4)
            
            combined_results[title] = {
                'title': title,
                'type': prop_type,
                'score': max(fuzzy_score, 70),  # Boost exact matches
                'priority': priority
            }
        
        # Add fuzzy matching for typo tolerance
        for title, prop_type in all_properties:
            if title in combined_results:
                continue  # Skip if already found by ILIKE
                
            # Use multiple fuzzy matching strategies
            ratio_score = fuzz.ratio(query.lower(), title.lower())
            partial_score = fuzz.partial_ratio(query.lower(), title.lower())
            token_score = fuzz.token_sort_ratio(query.lower(), title.lower())
            
            # Use the highest score from different strategies
            max_score = max(ratio_score, partial_score, token_score)
            
            # Lower threshold for better fuzzy matching (especially for typos like 'apartmnt')
            if max_score >= 40:
                priority = priority_order.get(prop_type, 4)
                combined_results[title] = {
                    'title': title,
                    'type': prop_type,
                    'score': max_score,
                    'priority': priority
                }
        
        # Convert to list and sort by priority first, then by score
        scored_results = list(combined_results.values())
        scored_results.sort(key=lambda x: (x['priority'], -x['score']))
        
        # Return top 5 unique suggestions
        suggestions = []
        for result in scored_results[:5]:
            suggestions.append({
                'title': result['title'],
                'type': result['type'],
                'score': result['score']
            })
        
        return jsonify(suggestions)
        
    except Exception as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/search')
def search():
    """AI search endpoint for complex queries like 'condo near mrt surian'"""
    import time
    start_time = time.time()
    
    query = request.args.get('q', '').strip().lower()
    
    # Handle edge case: empty or too short query
    if not query or len(query) < 3:
        print(f"[SEARCH] Empty or too short query: '{query}'")
        return jsonify([])
    
    print(f"[SEARCH] Processing query: '{query}'")
    
    # Robust database connection with try-except
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        print(f"[SEARCH] Database connection established")
        
    except psycopg2.Error as db_error:
        print(f"[SEARCH] Database connection error: {db_error}")
        return jsonify([])
    except Exception as conn_error:
        print(f"[SEARCH] Connection error: {conn_error}")
        return jsonify([])
    
    try:
        # Static property type mapping
        type_map = {
            'condo': ['apartment', 'condominium'],
            'apartment': ['apartment'],
            'house': ['house']
        }
        
        # Static location mapping
        location_map = {
            'mrt surian': (101.594, 3.150),
            'mrt sungai buloh': (101.578, 3.206)
        }
        
        # Parse property types from query
        property_types = []
        for key, types in type_map.items():
            if key in query:
                property_types.extend(types)
        
        # Default to priority types if none specified
        if not property_types:
            property_types = ['apartment', 'house', 'condominium']
        
        print(f"[SEARCH] Detected property types: {property_types}")
        
        # Parse location from query
        coords = None
        location_found = None
        for location_key, location_coord in location_map.items():
            if location_key in query:
                coords = location_coord
                location_found = location_key
                break
        
        # Handle edge case: no matching location found
        if 'near' in query and coords is None:
            print(f"[SEARCH] No matching location found in location_map for query: '{query}'")
            cursor.close()
            conn.close()
            return jsonify([])
        
        if coords:
            print(f"[SEARCH] Detected location: {location_found} at coordinates {coords}")
        else:
            print(f"[SEARCH] No location detected, using text search")
        
        # Optimized SQL query with error handling
        query_start_time = time.time()
        
        if coords:
            # Spatial search with optimized PostGIS query
            lon, lat = coords
            sql_query = """
                SELECT title, property_type::text, 
                       ST_Distance(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography) as distance_meters
                FROM properties 
                WHERE property_type::text = ANY(%s)
                  AND geom IS NOT NULL
                  AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, 5000)
                ORDER BY distance_meters
                LIMIT 50
            """
            cursor.execute(sql_query, (lon, lat, property_types, lon, lat))
        else:
            # Text search with property type filtering
            search_pattern = f"%{query}%"
            sql_query = """
                SELECT title, property_type::text, NULL as distance_meters
                FROM properties 
                WHERE property_type::text = ANY(%s) 
                  AND title ILIKE %s
                ORDER BY title
                LIMIT 50
            """
            cursor.execute(sql_query, (property_types, search_pattern))
        
        raw_results = cursor.fetchall()
        query_execution_time = time.time() - query_start_time
        print(f"[SEARCH] SQL query executed in {query_execution_time:.3f}s, found {len(raw_results)} results")
        
        cursor.close()
        conn.close()
        
        # Apply fuzzywuzzy only to top 50 results for performance
        fuzzy_start_time = time.time()
        priority_order = {
            'apartment': 1,
            'house': 2, 
            'condominium': 3
        }
        
        scored_results = []
        for title, prop_type, distance in raw_results:
            # Calculate fuzzy score for title relevance
            ratio_score = fuzz.ratio(query, title.lower())
            partial_score = fuzz.partial_ratio(query, title.lower())
            max_score = max(ratio_score, partial_score)
            
            priority = priority_order.get(prop_type, 4)
            
            scored_results.append({
                'title': title,
                'type': prop_type,
                'distance_meters': round(distance, 2) if distance else None,
                'score': max_score,
                'priority': priority
            })
        
        # Sort by priority first, then by score, then by distance
        scored_results.sort(key=lambda x: (
            x['priority'], 
            -x['score'], 
            x['distance_meters'] if x['distance_meters'] is not None else float('inf')
        ))
        
        fuzzy_execution_time = time.time() - fuzzy_start_time
        print(f"[SEARCH] Fuzzy scoring completed in {fuzzy_execution_time:.3f}s")
        
        # Return top 5 unique suggestions
        suggestions = []
        seen_titles = set()
        for result in scored_results:
            if result['title'] not in seen_titles and len(suggestions) < 5:
                suggestions.append({
                    'title': result['title'],
                    'type': result['type'],
                    'distance_meters': result['distance_meters']
                })
                seen_titles.add(result['title'])
        
        total_execution_time = time.time() - start_time
        print(f"[SEARCH] Total execution time: {total_execution_time:.3f}s, returning {len(suggestions)} suggestions")
        
        return jsonify(suggestions)
        
    except psycopg2.Error as db_error:
        print(f"[SEARCH] Database query error: {db_error}")
        try:
            cursor.close()
            conn.close()
        except:
            pass
        return jsonify([])
    except Exception as e:
        print(f"[SEARCH] Unexpected error: {e}")
        try:
            cursor.close()
            conn.close()
        except:
            pass
        return jsonify([])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)