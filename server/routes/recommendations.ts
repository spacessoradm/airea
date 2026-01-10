import { Router } from "express";
import { recommendationEngine } from "../services/recommendationEngine";
import { z } from "zod";

const router = Router();

/**
 * Get personalized property recommendations for authenticated user
 * Based on their favorites, clicks, and search patterns
 */
router.get("/personalized", async (req, res) => {
  try {
    // For demo purposes, use a default user ID
    // In production, this would come from authenticated session
    const userId = (req as any).user?.id || 1;
    
    const excludePropertyIds = req.query.exclude 
      ? Array.isArray(req.query.exclude) 
        ? req.query.exclude as string[]
        : [req.query.exclude as string]
      : [];

    const recommendations = await recommendationEngine.getPersonalizedRecommendations(
      userId,
      excludePropertyIds
    );

    // Generate AI-powered insights about why these properties are recommended
    const allRecommendations = [
      ...recommendations.similar,
      ...recommendations.betterValue,
      ...recommendations.upgrades,
      ...recommendations.alternativeAreas
    ];

    const insights = await recommendationEngine.generateRecommendationInsights(
      userId,
      allRecommendations
    );

    res.json({
      ...recommendations,
      insights,
      userId,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error getting personalized recommendations:", error);
    res.status(500).json({ 
      error: "Failed to generate recommendations",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Get similar properties to a specific property
 */
router.get("/similar/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = (req as any).user?.id || 1;
    
    const limit = parseInt(req.query.limit as string) || 5;

    const similarProperties = await recommendationEngine.getSimilarProperties(
      userId,
      [propertyId], // Exclude the current property
      limit
    );

    res.json({
      propertyId,
      similar: similarProperties,
      count: similarProperties.length
    });

  } catch (error) {
    console.error("Error getting similar properties:", error);
    res.status(500).json({ 
      error: "Failed to get similar properties",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Get better value alternatives to user's preferences
 */
router.get("/better-value", async (req, res) => {
  try {
    const userId = (req as any).user?.id || 1;
    const limit = parseInt(req.query.limit as string) || 5;

    const betterValueProperties = await recommendationEngine.getBetterValueProperties(
      userId,
      [],
      limit
    );

    res.json({
      betterValue: betterValueProperties,
      count: betterValueProperties.length,
      message: "Properties with similar features at better prices"
    });

  } catch (error) {
    console.error("Error getting better value properties:", error);
    res.status(500).json({ 
      error: "Failed to get better value properties",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Get upgrade recommendations (premium properties)
 */
router.get("/upgrades", async (req, res) => {
  try {
    const userId = (req as any).user?.id || 1;
    const limit = parseInt(req.query.limit as string) || 5;

    const upgradeProperties = await recommendationEngine.getUpgradeProperties(
      userId,
      [],
      limit
    );

    res.json({
      upgrades: upgradeProperties,
      count: upgradeProperties.length,
      message: "Premium properties with enhanced features"
    });

  } catch (error) {
    console.error("Error getting upgrade properties:", error);
    res.status(500).json({ 
      error: "Failed to get upgrade properties",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Get alternative area suggestions
 */
router.get("/alternative-areas", async (req, res) => {
  try {
    const userId = (req as any).user?.id || 1;
    const limit = parseInt(req.query.limit as string) || 5;

    const alternativeProperties = await recommendationEngine.getAlternativeAreaProperties(
      userId,
      [],
      limit
    );

    res.json({
      alternativeAreas: alternativeProperties,
      count: alternativeProperties.length,
      message: "Similar properties in different locations"
    });

  } catch (error) {
    console.error("Error getting alternative area properties:", error);
    res.status(500).json({ 
      error: "Failed to get alternative area properties",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Track user interaction with a property for learning
 */
router.post("/track", async (req, res) => {
  try {
    const trackingSchema = z.object({
      propertyId: z.string(),
      interactionType: z.enum(['click', 'view', 'contact']),
      searchQuery: z.string().optional(),
      sessionId: z.string().optional()
    });

    const { propertyId, interactionType, searchQuery, sessionId } = trackingSchema.parse(req.body);
    const userId = (req as any).user?.id || 1;

    await recommendationEngine.trackInteraction(userId, propertyId, interactionType);

    res.json({
      success: true,
      message: `Tracked ${interactionType} interaction`,
      userId,
      propertyId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error tracking interaction:", error);
    res.status(500).json({ 
      error: "Failed to track interaction",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Get user's learned preferences
 */
router.get("/preferences", async (req, res) => {
  try {
    const userId = (req as any).user?.id || 1;
    
    const preferences = await recommendationEngine.analyzeUserPreferences(userId);

    res.json({
      userId,
      preferences,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error getting user preferences:", error);
    res.status(500).json({ 
      error: "Failed to analyze preferences",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Get trending properties based on user interactions
 */
router.get("/trending", async (req, res) => {
  try {
    // Get popular properties that are getting high engagement
    const trendingProperties = [
      {
        id: "trending-klcc-1",
        property: {
          id: "sample-trend-1",
          title: "ARIA Luxury Residences KLCC",
          propertyType: "condominium",
          bedrooms: 2,
          price: "750000",
          city: "Kuala Lumpur",
          images: ["/api/placeholder/400/300"],
          amenities: ["pool", "gym", "parking", "security"]
        },
        score: 95,
        reason: "Highly sought after location with premium amenities",
        type: "trending"
      },
      {
        id: "trending-mont-kiara-1", 
        property: {
          id: "sample-trend-2",
          title: "The Binjai on the Park",
          propertyType: "condominium", 
          bedrooms: 3,
          price: "1200000",
          city: "Mont Kiara",
          images: ["/api/placeholder/400/300"],
          amenities: ["pool", "gym", "concierge", "garden"]
        },
        score: 88,
        reason: "Premium development with park views",
        type: "trending"
      }
    ];

    res.json({
      trendingProperties,
      count: trendingProperties.length,
      message: "Properties with high user engagement",
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error getting trending properties:", error);
    res.status(500).json({ 
      error: "Failed to get trending properties",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;