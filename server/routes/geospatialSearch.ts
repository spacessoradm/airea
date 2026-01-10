import { Router } from "express";
import { geospatialSearchService } from "../services/geospatialSearchService";
import { nlpSearchService } from "../services/nlpSearchService";

const router = Router();

/**
 * POST /api/search/geospatial
 * Advanced geospatial property search with transport proximity
 */
router.post("/geospatial", async (req, res) => {
  try {
    const filters = req.body;
    const results = await geospatialSearchService.searchPropertiesNearTransport(filters);
    
    res.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Geospatial search error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to perform geospatial search",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/search/natural-language  
 * Natural language property search with AI parsing
 */
router.post("/natural-language", async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: "Search query is required"
      });
    }

    // Parse natural language query
    const parsedQuery = await nlpSearchService.parseSearchQuery(query);
    
    // Execute geospatial search with parsed filters
    const searchResults = await geospatialSearchService.searchPropertiesNearTransport({
      bedrooms: parsedQuery.bedrooms,
      propertyType: parsedQuery.propertyType,
      listingType: parsedQuery.listingType,
      minPrice: parsedQuery.minPrice,
      maxPrice: parsedQuery.maxPrice,
      nearTransport: parsedQuery.nearTransport,
      city: parsedQuery.city,
      state: parsedQuery.state,
      autoFilterResidential: (parsedQuery as any).autoFilterResidential,
      limit: 20
    });

    res.json({
      success: true,
      originalQuery: query,
      parsedQuery: parsedQuery,
      ...searchResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Natural language search error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process natural language search",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/search/stations-near-property
 * Find transport stations near a specific property
 */
router.get("/stations-near-property", async (req, res) => {
  try {
    const { latitude, longitude, radius, types } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "Latitude and longitude are required"
      });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const radiusMeters = parseInt(radius as string) || 1000;
    const transportTypes = types ? (types as string).split(',') : undefined;

    const stations = await geospatialSearchService.getStationsNearProperty(
      lat, lng, radiusMeters, transportTypes
    );

    res.json({
      success: true,
      location: { latitude: lat, longitude: lng },
      radius: radiusMeters,
      transportTypes: transportTypes || ['all'],
      stations,
      count: stations.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Stations near property error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to find stations near property",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/search/suggestions
 * Get search suggestions for autocomplete
 */
router.get("/suggestions", async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    const suggestions = await nlpSearchService.generateSearchSuggestions(q);

    res.json({
      success: true,
      query: q,
      suggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Search suggestions error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate search suggestions",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/search/parse-query
 * Parse natural language query without executing search
 */
router.post("/parse-query", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: "Query is required"
      });
    }

    const parsedQuery = await nlpSearchService.parseSearchQuery(query);

    res.json({
      success: true,
      originalQuery: query,
      parsedQuery,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Query parsing error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to parse query",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;