/**
 * Transport Stations API Routes
 * Handles MRT/LRT/KTM station searches and transportation-based property filtering
 */

import { Router } from "express";
import { transportStationService } from "../services/transportStationService";
import { z } from "zod";

const router = Router();

/**
 * Get stations near a specific location
 * GET /api/transport-stations/nearby?lat=3.1478&lng=101.7128&radius=1000&types=MRT,LRT
 */
router.get("/nearby", async (req, res) => {
  try {
    const querySchema = z.object({
      lat: z.string().transform(Number),
      lng: z.string().transform(Number), 
      radius: z.string().transform(Number).optional(),
      types: z.string().optional(),
    });

    const { lat, lng, radius = 1000, types } = querySchema.parse(req.query);
    const transportTypes = types ? types.split(',').map(t => t.trim()) : undefined;

    const nearbyStations = await transportStationService.findStationsNearLocation(
      lat, 
      lng, 
      radius, 
      transportTypes
    );

    res.json({
      location: { latitude: lat, longitude: lng },
      radius: radius,
      transportTypes: transportTypes || ["all"],
      stations: nearbyStations,
      count: nearbyStations.length
    });

  } catch (error) {
    console.error("Error finding nearby stations:", error);
    res.status(400).json({ 
      error: "Invalid query parameters",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Search stations by name, code, or landmarks
 * GET /api/transport-stations/search?q=KLCC&types=LRT,Monorail&limit=10
 */
router.get("/search", async (req, res) => {
  try {
    const querySchema = z.object({
      q: z.string().min(1, "Search query is required"),
      types: z.string().optional(),
      limit: z.string().transform(Number).optional(),
    });

    const { q, types, limit = 20 } = querySchema.parse(req.query);
    const transportTypes = types ? types.split(',').map(t => t.trim()) : undefined;

    const stations = await transportStationService.searchStations(
      q,
      transportTypes,
      limit
    );

    res.json({
      query: q,
      transportTypes: transportTypes || ["all"],
      stations,
      count: stations.length
    });

  } catch (error) {
    console.error("Error searching stations:", error);
    res.status(400).json({
      error: "Invalid search parameters", 
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Find properties near transport stations
 * POST /api/transport-stations/nearby-properties
 */
router.post("/nearby-properties", async (req, res) => {
  try {
    const requestSchema = z.object({
      stationTypes: z.array(z.string()).min(1, "At least one station type is required"),
      maxWalkingMinutes: z.number().min(1).max(30).default(10),
      propertyFilters: z.object({
        bedrooms: z.number().optional(),
        propertyType: z.array(z.string()).optional(),
        priceMin: z.number().optional(), 
        priceMax: z.number().optional(),
        listingType: z.string().optional(),
      }).optional(),
      limit: z.number().max(100).default(50),
    });

    const { stationTypes, maxWalkingMinutes, propertyFilters, limit } = requestSchema.parse(req.body);
    const maxDistanceMeters = maxWalkingMinutes * 83; // ~5km/h walking speed

    const properties = await transportStationService.findPropertiesNearStations(
      stationTypes,
      maxDistanceMeters,
      propertyFilters
    );

    const limitedResults = properties.slice(0, limit);

    res.json({
      searchCriteria: {
        stationTypes,
        maxWalkingMinutes,
        maxDistanceMeters,
        propertyFilters,
      },
      properties: limitedResults,
      count: limitedResults.length,
      totalFound: properties.length
    });

  } catch (error) {
    console.error("Error finding properties near stations:", error);
    res.status(400).json({
      error: "Invalid request parameters",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Get transport network information
 * GET /api/transport-stations/network-info
 */
router.get("/network-info", async (req, res) => {
  try {
    const networkInfo = await transportStationService.getTransportNetworkInfo();
    
    res.json({
      ...networkInfo,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error getting network info:", error);
    res.status(500).json({ error: "Failed to fetch network information" });
  }
});

/**
 * Get stations for a specific transport line
 * GET /api/transport-stations/line/:lineName
 */
router.get("/line/:lineName", async (req, res) => {
  try {
    const { lineName } = req.params;
    const decodedLineName = decodeURIComponent(lineName);
    
    const stations = await transportStationService.getStationsByLine(decodedLineName);
    
    if (stations.length === 0) {
      return res.status(404).json({ 
        error: "Line not found",
        lineName: decodedLineName
      });
    }

    res.json({
      lineName: decodedLineName,
      transportType: stations[0].transportType,
      stations,
      count: stations.length
    });

  } catch (error) {
    console.error("Error getting stations by line:", error);
    res.status(500).json({ error: "Failed to fetch line stations" });
  }
});

/**
 * Enhanced property search with transport integration
 * POST /api/transport-stations/enhanced-search
 */
router.post("/enhanced-search", async (req, res) => {
  try {
    const requestSchema = z.object({
      nearTransport: z.object({
        types: z.array(z.string()).min(1, "At least one transport type is required"),
        maxWalkingMinutes: z.number().min(1).max(30)
      }),
      bedrooms: z.number().optional(),
      propertyType: z.array(z.string()).optional(),
      priceRange: z.object({
        min: z.number(),
        max: z.number()
      }).optional(),
      listingType: z.string().optional(),
      limit: z.number().max(100).default(50),
    });

    const filters = requestSchema.parse(req.body);
    const results = await transportStationService.enhancedPropertySearchWithTransport(filters);

    res.json({
      searchFilters: filters,
      results,
      count: results.length,
      message: `Found ${results.length} properties within ${filters.nearTransport.maxWalkingMinutes} minutes walking distance of ${filters.nearTransport.types.join(', ')} stations`
    });

  } catch (error) {
    console.error("Error in enhanced transport search:", error);
    res.status(400).json({
      error: "Invalid search filters",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;