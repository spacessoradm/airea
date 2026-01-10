import { Router } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

const router = Router();

// Search locations by query string
router.get('/search', async (req, res) => {
  try {
    const query = req.query.query as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const locations = await storage.searchLocations(query.trim(), Math.min(limit, 50));
    
    // Transform the response for frontend
    const transformedLocations = locations.map(location => ({
      id: location.id,
      name: location.name,
      city: location.city,
      state: location.state,
      latitude: location.latitude,
      longitude: location.longitude,
      buildingType: location.buildingType,
      displayName: `${location.name}${location.city ? `, ${location.city}` : ''}${location.state ? `, ${location.state}` : ''}`,
    }));

    res.json(transformedLocations);
  } catch (error) {
    console.error('Location search error:', error);
    res.status(500).json({ error: 'Failed to search locations' });
  }
});

// Get specific location by ID
router.get('/:id', async (req, res) => {
  try {
    const location = await storage.getLocationById(req.params.id);
    
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ error: 'Failed to get location' });
  }
});

// Get nearby locations
router.get('/nearby/:lat/:lng', async (req, res) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lng = parseFloat(req.params.lng);
    const radius = parseInt(req.query.radius as string) || 5000; // 5km default
    const limit = parseInt(req.query.limit as string) || 10;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Validate coordinates are in Malaysia
    if (lat < 1 || lat > 7 || lng < 99 || lng > 119) {
      return res.status(400).json({ error: 'Coordinates must be within Malaysia' });
    }

    const locations = await storage.getNearbyLocations(
      lat, 
      lng, 
      Math.min(radius, 50000), // Max 50km
      Math.min(limit, 50)
    );

    res.json(locations);
  } catch (error) {
    console.error('Nearby locations error:', error);
    res.status(500).json({ error: 'Failed to get nearby locations' });
  }
});

export default router;