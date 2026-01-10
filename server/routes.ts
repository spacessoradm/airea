import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql, eq, and, count } from "drizzle-orm";
import { 
  MortgageEligibilityService, 
  type MortgageEligibilityInput 
} from "./services/mortgageEligibility";
import { 
  insertMortgageEligibilityCheckSchema, 
  type InsertMortgageEligibilityCheckInput 
} from "@shared/schema";
import { setupAuth, isAuthenticated, isAgent, isAdmin } from "./replitAuth";
import bcrypt from "bcryptjs";
import { 
  insertPropertySchema, 
  insertMessageSchema, 
  insertSearchQuerySchema, 
  insertFavoriteSchema,
  insertInquirySchema,
  insertCalendarEventSchema,
  insertSavedSearchSchema,
  agents,
  properties,
  type Inquiry,
  type CalendarEvent,
  type SavedSearch,
  type Notification
} from "@shared/schema";
import { processAISearch } from "./services/propertySearch";
import { generateRecommendations, getSimilarProperties } from "./services/recommendations";
import { PropertyRecommendationEngine } from "./services/recommendationEngine";
import { seedSaleProperties } from "./seedData";
import { seedDeveloperReviews } from "./seedDeveloperReviews";
import { gamificationService } from "./services/gamificationService";
import { reviewService } from "./services/reviewService";
import { rentalYieldService } from "./services/rentalYieldService";
import { amenityAnalysisService } from "./services/amenityAnalysisService";
import { developerReviewService } from "./services/developerReviews";
import { generateAIResponse } from "./services/aiChat";
import recommendationsRouter from "./routes/recommendations";
import { batchGeocodingService } from "./services/batchGeocodingService";
import transportStationsRouter from "./routes/transportStations";
import geospatialSearchRouter from "./routes/geospatialSearch";
import { locationService } from "./services/locationService";
import { enhancedGeocodingService } from "./services/enhancedGeocoding";
import { AnalyticsService } from "./services/analyticsService";
import { SimplifiedSearchService } from "./services/simplifiedSearchService";
import multer from "multer";
import path from "path";
import fs from "fs";
// Note: Using global fetch available in Node.js 18+ instead of node-fetch

// Setup multer for image uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Add in-memory cache for properties with faster lookup
  const fastCache = new Map<string, { data: any, timestamp: number }>();
  const CACHE_DURATION = 30 * 1000; // 30 seconds for immediate response

  // Auth middleware
  await setupAuth(app);

  // Serve patent document for download
  app.get('/patent_document.html', (req, res) => {
    const filePath = path.join(process.cwd(), 'attached_assets', 'patent_document.html');
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Document not found');
    }
  });

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Support both Replit Auth and custom email auth
      if (req.user?.claims?.sub) {
        // Replit Auth
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        res.json(user);
      } else if (req.session?.userId) {
        // Custom email auth
        const user = await storage.getUser(req.session.userId);
        res.json(user);
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Email/Password Registration
  app.post('/api/auth/register', async (req: any, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
      });

      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await storage.upsertUser({
        id: undefined, // Let database generate ID
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'user',
      });

      // Set session and save it explicitly
      req.session.userId = newUser.id;
      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to save session" });
        }
        res.json(newUser);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  // Email/Password Sign In
  app.post('/api/auth/signin', async (req: any, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find user
      const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
      });

      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session and save it explicitly
      req.session.userId = user.id;
      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to save session" });
        }
        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Sign in error:", error);
      res.status(500).json({ message: "Failed to sign in" });
    }
  });

  // Firebase Google Sign-In
  app.post('/api/auth/firebase', async (req: any, res) => {
    try {
      const { uid, email, displayName, photoURL } = req.body;
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Missing or invalid authorization token" });
      }

      if (!uid || !email) {
        return res.status(400).json({ message: "Missing required user information" });
      }

      // Parse display name into first and last name
      const nameParts = (displayName || email.split('@')[0]).split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Check if user exists
      let user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
      });

      if (user) {
        // Update existing user
        user = await storage.upsertUser({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: photoURL || user.profileImageUrl,
          firebaseUid: uid,
          role: user.role,
        });
      } else {
        // Create new user
        user = await storage.upsertUser({
          id: undefined, // Let database generate ID
          email,
          firstName,
          lastName,
          profileImageUrl: photoURL,
          firebaseUid: uid,
          role: 'user',
        });
      }

      // Set session and save it explicitly
      req.session.userId = user.id;
      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to save session" });
        }
        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Firebase auth error:", error);
      res.status(500).json({ message: "Failed to authenticate with Firebase" });
    }
  });

  // User Profile Update
  app.patch('/api/users/profile', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const session = req.session as any;
      
      let userId: string;
      if (user?.claims?.sub) {
        userId = user.claims.sub;
      } else if (session?.userId) {
        userId = session.userId;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { firstName, lastName, nickname } = req.body;

      if (!firstName || !lastName) {
        return res.status(400).json({ message: "First name and last name are required" });
      }

      // Get current user
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user
      const updatedUser = await storage.upsertUser({
        id: currentUser.id,
        email: currentUser.email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname?.trim() || null,
        role: currentUser.role,
        profileImageUrl: currentUser.profileImageUrl,
        firebaseUid: currentUser.firebaseUid,
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Agent Application Routes
  
  // Apply to become an agent (authenticated users only)
  app.post('/api/agent-application/apply', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const session = req.session as any;
      
      let userId: string;
      if (user?.claims?.sub) {
        userId = user.claims.sub;
      } else if (session?.userId) {
        userId = session.userId;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user exists
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if already an agent
      if (dbUser.role === 'agent') {
        return res.status(400).json({ message: "You are already an agent" });
      }

      // Check if already has a pending application
      if (dbUser.agentApplicationStatus === 'pending') {
        return res.status(400).json({ message: "You already have a pending application" });
      }

      // Update user with pending application
      await storage.upsertUser({
        ...dbUser,
        agentApplicationStatus: 'pending',
        agentApplicationDate: new Date(),
      });

      res.json({ message: "Application submitted successfully", status: "pending" });
    } catch (error) {
      console.error("Agent application error:", error);
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // Get all pending agent applications (admin only)
  app.get('/api/admin/agent-applications', isAdmin, async (req, res) => {
    try {
      const pendingApplications = await db.query.users.findMany({
        where: (users, { eq }) => eq(users.agentApplicationStatus, 'pending'),
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          agentApplicationDate: true,
          createdAt: true,
        }
      });

      res.json(pendingApplications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Approve agent application (admin only)
  app.post('/api/admin/agent-applications/:id/approve', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.agentApplicationStatus !== 'pending') {
        return res.status(400).json({ message: "No pending application for this user" });
      }

      // Approve: change role to agent and update status
      await storage.upsertUser({
        ...user,
        role: 'agent',
        agentApplicationStatus: 'approved',
        agentApprovalDate: new Date(),
        aiCredits: user.aiCredits || 500, // Grant initial AI credits if not set
      });

      res.json({ message: "Agent application approved", userId: id });
    } catch (error) {
      console.error("Error approving application:", error);
      res.status(500).json({ message: "Failed to approve application" });
    }
  });

  // Reject agent application (admin only)
  app.post('/api/admin/agent-applications/:id/reject', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.agentApplicationStatus !== 'pending') {
        return res.status(400).json({ message: "No pending application for this user" });
      }

      // Reject: update status only, keep role as user
      await storage.upsertUser({
        ...user,
        agentApplicationStatus: 'rejected',
      });

      res.json({ message: "Agent application rejected", userId: id });
    } catch (error) {
      console.error("Error rejecting application:", error);
      res.status(500).json({ message: "Failed to reject application" });
    }
  });

  // Get agent/user details by ID (public endpoint for getting WhatsApp number)
  app.get('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Return only public information
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        whatsappNumber: user.whatsappNumber,
        role: user.role,
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  });

  // Get agent details by ID (public endpoint)
  app.get('/api/agents/:id', async (req, res) => {
    try {
      const { id } = req.params;
      let agent = await storage.getAgent(id);
      
      // If agent doesn't exist, check if user exists and has agent role
      if (!agent) {
        const user = await storage.getUser(id);
        
        if (!user || user.role !== 'agent') {
          return res.status(404).json({ error: "Agent not found" });
        }
        
        // Auto-create agent entry from user data (with conflict handling for race conditions)
        await db.insert(agents).values({
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Agent',
          nickname: user.nickname || null,
          email: user.email || '',
          phone: user.phone || null,
          profileImage: user.profileImageUrl || null,
        }).onConflictDoNothing();
        
        // Fetch the newly created agent
        agent = await storage.getAgent(id);
      }
      
      res.json(agent);
    } catch (error) {
      console.error("Error fetching agent details:", error);
      res.status(500).json({ error: "Failed to fetch agent details" });
    }
  });

  // Get properties by agent ID (public endpoint) with pagination
  app.get('/api/agents/:id/properties', async (req, res) => {
    try {
      const { id } = req.params;
      const { page = '1', limit = '20', listingType } = req.query;
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;
      
      // First check if agent exists
      const agent = await storage.getAgent(id);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      // Build where conditions
      const conditions: any[] = [
        eq(properties.agentId, id),
        eq(properties.status, 'online')
      ];
      
      if (listingType && listingType !== 'all') {
        conditions.push(eq(properties.listingType, listingType as string));
      }

      // Get paginated properties
      const propertiesResult = await db.query.properties.findMany({
        where: (properties, { eq, and }) => and(...conditions),
        with: {
          agent: true,
        },
        limit: limitNum,
        offset: offset,
      });

      // Get counts for all listing types
      const [totalResult, saleResult, rentResult] = await Promise.all([
        db.select({ count: count() }).from(properties)
          .where(and(
            eq(properties.agentId, id),
            eq(properties.status, 'online')
          )),
        db.select({ count: count() }).from(properties)
          .where(and(
            eq(properties.agentId, id),
            eq(properties.status, 'online'),
            eq(properties.listingType, 'sale')
          )),
        db.select({ count: count() }).from(properties)
          .where(and(
            eq(properties.agentId, id),
            eq(properties.status, 'online'),
            eq(properties.listingType, 'rent')
          )),
      ]);

      const totalCount = totalResult[0]?.count || 0;
      const saleCount = saleResult[0]?.count || 0;
      const rentCount = rentResult[0]?.count || 0;

      // Determine which count to use for pagination based on filter
      let filteredCount = totalCount;
      if (listingType === 'sale') {
        filteredCount = saleCount;
      } else if (listingType === 'rent') {
        filteredCount = rentCount;
      }

      res.json({
        properties: propertiesResult,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredCount,
          totalPages: Math.ceil(filteredCount / Math.max(1, limitNum)),
        },
        counts: {
          total: totalCount,
          sale: saleCount,
          rent: rentCount,
        }
      });
    } catch (error) {
      console.error("Error fetching agent properties:", error);
      res.status(500).json({ error: "Failed to fetch agent properties" });
    }
  });

  // Update agent profile (authenticated agent only)
  app.patch('/api/agents/:id', isAgent, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Check if user is updating their own profile
      const agent = await storage.getAgent(id);
      if (!agent || agent.id !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this profile" });
      }

      // Only allow updating specific fields
      const { bio, areaExpertise, specialties, experience } = req.body;
      const updateData: any = {};
      
      if (bio !== undefined) updateData.bio = bio;
      if (areaExpertise !== undefined) updateData.areaExpertise = areaExpertise;
      if (specialties !== undefined) updateData.specialties = specialties;
      if (experience !== undefined) updateData.experience = experience;

      const updatedAgent = await storage.updateAgent(id, updateData);
      res.json(updatedAgent);
    } catch (error) {
      console.error("Error updating agent profile:", error);
      res.status(500).json({ error: "Failed to update agent profile" });
    }
  });

  // Update agent profile photo (authenticated agent only)
  app.post('/api/agents/:id/profile-photo', isAgent, upload.single('photo'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Check if user is updating their own profile
      const agent = await storage.getAgent(id);
      if (!agent || agent.id !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this profile" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No photo file provided" });
      }

      const photoUrl = `/uploads/${req.file.filename}`;
      const updatedAgent = await storage.updateAgent(id, { profileImage: photoUrl });
      
      res.json(updatedAgent);
    } catch (error) {
      console.error("Error updating agent profile photo:", error);
      res.status(500).json({ error: "Failed to update profile photo" });
    }
  });

  // Map configuration endpoint with caching
  app.get("/api/map-config", (req, res) => {
    // Set long cache for map config
    res.set({
      'Cache-Control': 'public, max-age=3600', // 1 hour cache
      'ETag': `"map-config-${process.env.OPENROUTE_API_KEY ? 'present' : 'missing'}"`,
    });
    
    const config = {
      provider: "openroute",
      hasApiKey: !!process.env.OPENROUTE_API_KEY
    };
    res.json(config);
  });

  // Ultra-fast property routes with aggressive caching
  app.get('/api/properties', async (req, res) => {
    const start = Date.now();
    try {
      // Ultra-aggressive caching headers
      res.set({
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        'ETag': `"props-${Math.floor(Date.now() / 30000)}"`,
        'X-Cache': 'MISS'
      });

      // Create cache key from query
      const cacheKey = JSON.stringify(req.query);
      const cached = fastCache.get(cacheKey);
      
      // Return cached data immediately if available
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        res.set('X-Cache', 'HIT');
        console.log(`Cache HIT: ${Date.now() - start}ms`);
        return res.json(cached.data);
      }

      const filters = {
        propertyType: req.query.propertyType ? (req.query.propertyType as string).split(',') : undefined,
        listingType: req.query.listingType as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        bedrooms: req.query.bedrooms ? parseInt(req.query.bedrooms as string) : undefined,
        bathrooms: req.query.bathrooms ? parseInt(req.query.bathrooms as string) : undefined,
        city: req.query.city as string,
        amenities: req.query.amenities ? (req.query.amenities as string).split(',') : undefined,
        status: req.query.status as string,
        featured: req.query.featured === 'true' ? true : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 12, // Reduce default limit
        sortBy: (req.query.sortBy as string) === "default" ? undefined : (req.query.sortBy as any),
      };

      const properties = await storage.getProperties(filters);
      
      // Cache the result
      fastCache.set(cacheKey, { data: properties, timestamp: Date.now() });
      
      // Clean old cache entries periodically
      if (fastCache.size > 100) {
        const cutoff = Date.now() - CACHE_DURATION;
        const entriesToDelete: string[] = [];
        fastCache.forEach((value, key) => {
          if (value.timestamp < cutoff) {
            entriesToDelete.push(key);
          }
        });
        entriesToDelete.forEach(key => fastCache.delete(key));
      }

      console.log(`API Response: ${Date.now() - start}ms`);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get('/api/properties/:id', async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  // Agent property management endpoints


  // Update property status with commission tracking (legacy endpoint)
  app.put('/api/properties/:id/status', isAgent, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, commissionAmount } = req.body;
      
      // Support both old and new status values for backward compatibility
      const validStatuses = ['online', 'offline', 'expired', 'draft', 'sold', 'rented'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status. Valid values: " + validStatuses.join(', ') });
      }

      // Validate minimum 3 photos requirement when changing status to 'online'
      if (status === 'online') {
        const property = await storage.getProperty(req.params.id);
        if (!property) {
          return res.status(404).json({ error: "Property not found" });
        }
        const images = property.images || [];
        if (images.length < 3) {
          return res.status(400).json({ 
            error: "Cannot set status to online: Minimum 3 photos required to post a listing" 
          });
        }
      }

      const updatedProperty = await storage.updatePropertyStatus(
        req.params.id,
        status,
        commissionAmount,
        userId
      );

      res.json(updatedProperty);
    } catch (error) {
      console.error("Error updating property status:", error);
      if (error instanceof Error && error.message.includes("unauthorized")) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      res.status(500).json({ error: "Failed to update property status" });
    }
  });

  app.post('/api/agent/properties', isAgent, async (req: any, res) => {
    try {
      // Validate minimum 3 photos requirement for online listings (but allow drafts with fewer photos)
      if (req.body.status === 'online') {
        const images = req.body.images || [];
        if (images.length < 3) {
          return res.status(400).json({ 
            error: "Minimum 3 photos required to post a listing online" 
          });
        }
      }
      
      // Convert null values to undefined for optional fields
      const cleanedBody = Object.fromEntries(
        Object.entries(req.body).map(([key, value]) => [key, value === null ? undefined : value])
      );
      
      // Calculate posting date and expiry date (exactly 3 months later)
      const postDate = cleanedBody.status === 'online' ? new Date() : null;
      const expiryDate = postDate ? new Date(postDate.getTime()) : null;
      if (expiryDate) {
        expiryDate.setMonth(expiryDate.getMonth() + 3);
      }
      
      // Get agent ID from authenticated user
      const agentId = req.user.claims.sub;
      
      // For draft listings, use partial schema validation (allow incomplete data)
      const isDraft = cleanedBody.status === 'draft';
      const propertyData = isDraft 
        ? insertPropertySchema.partial().parse({
            // Apply defaults for ALL required fields to ensure draft ALWAYS saves
            title: cleanedBody.title || 'Draft Listing',
            propertyType: cleanedBody.propertyType || 'apartment',
            listingType: cleanedBody.listingType || 'sale',
            price: cleanedBody.price || '1',
            bedrooms: cleanedBody.bedrooms !== undefined && cleanedBody.bedrooms !== null ? cleanedBody.bedrooms : 0,
            bathrooms: cleanedBody.bathrooms !== undefined && cleanedBody.bathrooms !== null ? cleanedBody.bathrooms : 0,
            builtUpSize: (cleanedBody.builtUpSize && cleanedBody.builtUpSize > 0) ? cleanedBody.builtUpSize : 1,
            lotType: cleanedBody.lotType || 'intermediate',
            address: cleanedBody.address || 'TBD',
            city: cleanedBody.city || 'Kuala Lumpur',
            state: cleanedBody.state || 'Kuala Lumpur',
            // Apply user-provided values for all other fields
            ...cleanedBody,
            // System-managed fields
            agentId,
            agentLicense: cleanedBody.agentLicense || 'REN12345',
            status: 'draft',
            postedAt: null,
            expiryDate: null,
          })
        : insertPropertySchema.parse({
            ...cleanedBody,
            agentId,
            agentLicense: cleanedBody.agentLicense || 'REN12345',
            status: cleanedBody.status || 'draft',
            postedAt: postDate,
            expiryDate,
          });

      // AUTOMATIC COORDINATE CAPTURE from address if not provided
      let finalPropertyData = { ...propertyData };
      
      if (!propertyData.latitude || !propertyData.longitude) {
        console.log(`🌍 GEOCODING: Property "${propertyData.title}" missing coordinates, attempting to geocode from address...`);
        
        // Build address string for geocoding
        const addressParts = [
          propertyData.address,
          propertyData.city,
          propertyData.state,
          'Malaysia'
        ].filter(part => part && part.trim() !== '');
        
        const fullAddress = addressParts.join(', ');
        console.log(`🔍 Geocoding address: "${fullAddress}"`);
        
        try {
          const { batchGeocodingService } = await import("./services/batchGeocodingService");
          const coordinates = await batchGeocodingService.geocodeProperty({
            id: 'new-property',
            title: propertyData.title,
            address: propertyData.address || '',
            city: propertyData.city || '',
            state: propertyData.state || ''
          });
          
          if (coordinates) {
            finalPropertyData.latitude = coordinates.lat.toString();
            finalPropertyData.longitude = coordinates.lng.toString();
            console.log(`✅ AUTO-GEOCODED: "${propertyData.title}" -> ${coordinates.lat}, ${coordinates.lng}`);
          } else {
            console.log(`❌ GEOCODING FAILED: Could not find coordinates for "${propertyData.title}"`);
          }
        } catch (error) {
          console.error(`❌ GEOCODING ERROR:`, error);
        }
      } else {
        console.log(`✅ COORDINATES PROVIDED: "${propertyData.title}" already has coordinates`);
      }

      // Automatic ALL transport proximity analysis for new listings
      const { transportProximityService } = await import("./services/mrtProximityService");
      
      const latitude = parseFloat(finalPropertyData.latitude || '0');
      const longitude = parseFloat(finalPropertyData.longitude || '0');
      
      console.log(`🚉 Analyzing ALL transport proximity for new listing: ${propertyData.title}`);
      
      // Analyze proximity to all transport types automatically (only if coordinates exist)
      const transportProximity = (latitude && longitude) ? 
        await transportProximityService.analyzePropertyTransportProximity(latitude, longitude) :
        { isNearTransport: false, nearestStation: null, stationsByType: {} };
      
      // Generate automatic distance descriptions for all transport types
      const transportDistances = transportProximityService.generateTransportDistances(transportProximity);
      const autoNearbyLandmarks = transportProximityService.generateNearbyLandmarks(transportProximity);
      
      // Enhanced property data with automatic ALL transport proximity detection
      const enhancedPropertyData = {
        ...finalPropertyData,
        // Auto-fill all transport distances if detected and not manually provided
        distanceToMRT: propertyData.distanceToMRT || transportDistances.distanceToMRT,
        distanceToLRT: propertyData.distanceToLRT || transportDistances.distanceToLRT,
        distanceToKTM: propertyData.distanceToKTM || transportDistances.distanceToKTM,
        distanceToMonorail: propertyData.distanceToMonorail || transportDistances.distanceToMonorail,
        // Add all transport landmarks to nearby landmarks for search optimization
        nearbyLandmarks: [
          ...(propertyData.nearbyLandmarks || []),
          ...autoNearbyLandmarks
        ].filter(Boolean)
      };

      const property = await storage.createProperty(enhancedPropertyData);
      
      // Deduct 5 credits if posting online
      let remainingCredits = 500;
      if (property.status === 'online') {
        try {
          const updatedUser = await storage.deductCredits(agentId, 5);
          remainingCredits = updatedUser.aiCredits ?? 495;
          console.log(`💳 Deducted 5 AI credits from ${agentId}. Remaining: ${remainingCredits}`);
        } catch (error) {
          // If user doesn't exist, create with 495 credits (500 - 5)
          await storage.upsertUser({ id: agentId, aiCredits: 495, role: 'agent' });
          remainingCredits = 495;
          console.log(`💳 Created user ${agentId} with 495 credits (500 - 5 for posting)`);
        }
      }
      
      // Clear cache to ensure new property appears immediately
      fastCache.clear();
      
      // Check for real-time matching with popular searches
      const { RealTimeMatchingService } = await import("./services/realTimeMatchingService");
      const realTimeService = new RealTimeMatchingService(storage);
      
      // Get full property with agent for matching
      const fullProperty = await storage.getProperty(property.id);
      if (fullProperty) {
        const matchingQueries = await realTimeService.checkPropertyMatchesPopularSearches(fullProperty as any);
        if (matchingQueries.length > 0) {
          console.log(`🎯 [REAL-TIME MATCH] New property "${property.title}" matches ${matchingQueries.length} popular searches:`);
          matchingQueries.forEach(query => console.log(`   - "${query}"`));
        }
      }
      
      console.log(`✅ [NEW LISTING] Property created with transport analysis: ${property.id} - ${property.title}`);
      if (transportProximity.isNearTransport && transportProximity.nearestStation) {
        console.log(`🚉 Nearest transport: ${transportProximity.nearestStation.walkingTime} mins walk to ${transportProximity.nearestStation.type} ${transportProximity.nearestStation.name}`);
        console.log(`🚉 All transport: ${Object.entries(transportDistances).map(([type, desc]) => `${type.replace('distanceTo', '')}: ${desc}`).join(', ')}`);
      } else {
        console.log(`🚉 Transport proximity: Not within 20-minute walking distance`);
      }
      
      res.status(201).json({
        ...property,
        creditDeducted: property.status === 'online' ? 5 : 0,
        remainingCredits: property.status === 'online' ? remainingCredits : await storage.getUserCredits(agentId),
        transportProximityAnalysis: {
          isNearTransport: transportProximity.isNearTransport,
          nearestStation: transportProximity.nearestStation,
          stationsByType: transportProximity.stationsByType,
          autoTransportDistances: transportDistances,
          autoNearbyLandmarks
        }
      });
    } catch (error) {
      console.error("Error creating property:", error);
      res.status(400).json({ message: "Failed to create property", error: (error as Error).message });
    }
  });

  app.put('/api/properties/:id', isAgent, async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Validate updates (excluding postedAt which we'll handle separately)
      const { postedAt, ...bodyWithoutPostedAt } = req.body;
      
      // For drafts OR when posting a draft (original status is draft), apply defaults for missing required fields
      const isSavingAsDraft = bodyWithoutPostedAt.status === 'draft' || (!bodyWithoutPostedAt.status && property.status === 'draft');
      const isPostingDraftWithEmptyDescription = property.status === 'draft' && 
        bodyWithoutPostedAt.status === 'online' && 
        (!bodyWithoutPostedAt.description || bodyWithoutPostedAt.description.trim().length === 0);
      
      let updates;
      if (isSavingAsDraft) {
        // Remove description from body if empty to bypass validation
        const { description, ...restBody } = bodyWithoutPostedAt;
        
        // Build draft payload with defaults
        const draftPayload: any = {
          // Apply defaults for required fields if missing
          title: bodyWithoutPostedAt.title || property.title || 'Draft Listing',
          propertyType: bodyWithoutPostedAt.propertyType || property.propertyType || 'apartment',
          listingType: bodyWithoutPostedAt.listingType || property.listingType || 'sale',
          price: bodyWithoutPostedAt.price || property.price || '1',
          bedrooms: bodyWithoutPostedAt.bedrooms !== undefined && bodyWithoutPostedAt.bedrooms !== null ? bodyWithoutPostedAt.bedrooms : property.bedrooms ?? 0,
          bathrooms: bodyWithoutPostedAt.bathrooms !== undefined && bodyWithoutPostedAt.bathrooms !== null ? bodyWithoutPostedAt.bathrooms : property.bathrooms ?? 0,
          builtUpSize: bodyWithoutPostedAt.builtUpSize || property.builtUpSize || 1,
          lotType: bodyWithoutPostedAt.lotType || property.lotType || 'intermediate',
          address: bodyWithoutPostedAt.address || property.address || 'TBD',
          city: bodyWithoutPostedAt.city || property.city || 'Kuala Lumpur',
          state: bodyWithoutPostedAt.state || property.state || 'Kuala Lumpur',
          agentLicense: bodyWithoutPostedAt.agentLicense || property.agentLicense || 'REN12345',
          ...restBody, // Spread other fields (without description)
          status: 'draft',
        };
        
        // Only include description if it's not empty (bypass min length validation for drafts)
        if (description && description.trim().length > 0) {
          draftPayload.description = description;
        }
        
        updates = insertPropertySchema.partial().parse(draftPayload);
      } else if (isPostingDraftWithEmptyDescription) {
        // Posting a draft with empty description - use placeholder
        const { description, ...restBody } = bodyWithoutPostedAt;
        const postingPayload = {
          ...restBody,
          description: property.description || 'No description provided', // Use existing or placeholder
        };
        updates = insertPropertySchema.partial().parse(postingPayload);
      } else {
        updates = insertPropertySchema.partial().parse(bodyWithoutPostedAt);
      }
      
      // Track if this is a draft being posted (for credit deduction)
      const isPostingDraft = updates.status === 'online' && !property.postedAt;
      
      // If status is changing to 'online' and postedAt is not set, set it now
      if (isPostingDraft) {
        const postDate = new Date();
        const expiry = new Date(postDate);
        expiry.setMonth(expiry.getMonth() + 3);
        (updates as any).postedAt = postDate;
        (updates as any).expiryDate = expiry;
      }
      
      const updatedProperty = await storage.updateProperty(req.params.id, updates);
      
      // Deduct credits if posting a draft
      let remainingCredits = await storage.getUserCredits(agentId);
      if (isPostingDraft) {
        const updatedUser = await storage.deductCredits(agentId, 5);
        remainingCredits = updatedUser.aiCredits ?? remainingCredits - 5;
        console.log(`💳 Draft posted! Deducted 5 AI credits from ${agentId}. Remaining: ${remainingCredits}`);
      }
      
      res.json({
        ...updatedProperty,
        creditDeducted: isPostingDraft ? 5 : 0,
        remainingCredits
      });
    } catch (error) {
      console.error("Error updating property:", error);
      res.status(400).json({ message: "Failed to update property", error: (error as Error).message });
    }
  });

  app.delete('/api/properties/:id', isAgent, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.agentId !== userId) {
        return res.status(403).json({ message: "You can only delete your own properties" });
      }

      await storage.deleteProperty(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // Clone property endpoint (creates draft copy)
  app.post('/api/properties/:id/clone', async (req: any, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Create a new property object without id, createdAt, postedAt, expiryDate
      const { id, createdAt, postedAt, expiryDate, ...propertyData } = property;
      
      // Clean up null values to undefined for optional fields
      const cleanedPropertyData = Object.fromEntries(
        Object.entries(propertyData).map(([key, value]) => [key, value === null ? undefined : value])
      );
      
      // Set as draft status
      const clonedProperty = await storage.createProperty({
        ...cleanedPropertyData,
        status: 'draft',
        postedAt: null,
        expiryDate: null
      } as any);

      res.json(clonedProperty);
    } catch (error) {
      console.error("Error cloning property:", error);
      res.status(400).json({ message: "Failed to clone property", error: (error as Error).message });
    }
  });

  // Readvertise property endpoint (updates posting date and deducts credits)
  app.post('/api/properties/:id/readvertise', isAgent, async (req: any, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const agentId = req.user.claims.sub;
      
      // Deduct 3 credits for reposting expired listing (REPOST cost)
      const updatedUser = await storage.deductCreditsWithLogging({
        userId: agentId,
        amount: 3,
        type: 'repost',
        propertyId: req.params.id,
        description: 'Repost expired listing',
      });
      const remainingCredits = updatedUser.aiCredits ?? 0;
      console.log(`💳 Reposted! Deducted 3 AI credits from ${agentId}. Remaining: ${remainingCredits}`);
      
      // Update posting date to today and set new expiry date (3 months from now)
      const postDate = new Date();
      const expiry = new Date(postDate);
      expiry.setMonth(expiry.getMonth() + 3);
      
      const updatedProperty = await storage.updateProperty(req.params.id, {
        postedAt: postDate,
        expiryDate: expiry,
        status: 'online' // Ensure it's online when readvertised
      });

      res.json({
        ...updatedProperty,
        creditDeducted: 3,
        remainingCredits
      });
    } catch (error) {
      console.error("Error readvertising property:", error);
      res.status(400).json({ message: "Failed to readvertise property", error: (error as Error).message });
    }
  });

  // Feature Boost endpoint (5 credits, 7 days)
  app.post('/api/properties/:id/boost', isAgent, async (req: any, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Only allow boosting online listings
      if (property.status !== 'online') {
        return res.status(400).json({ message: "Only online listings can be boosted" });
      }

      // Check if already boosted and not expired
      if (property.featured && property.featuredUntil && new Date(property.featuredUntil) > new Date()) {
        return res.status(400).json({ message: "Listing is already featured", featuredUntil: property.featuredUntil });
      }

      const agentId = req.user.claims.sub;
      
      // Deduct 5 credits for feature boost
      const updatedUser = await storage.deductCreditsWithLogging({
        userId: agentId,
        amount: 5,
        type: 'boost',
        propertyId: req.params.id,
        description: 'Feature boost for 7 days',
      });
      const remainingCredits = updatedUser.aiCredits ?? 0;
      console.log(`✨ Boosted! Deducted 5 AI credits from ${agentId}. Remaining: ${remainingCredits}`);
      
      // Set feature boost for 7 days
      const now = new Date();
      const featuredUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      const updatedProperty = await storage.updateProperty(req.params.id, {
        featured: true,
        featuredUntil: featuredUntil,
      });

      res.json({
        ...updatedProperty,
        creditDeducted: 5,
        remainingCredits,
        message: 'Listing featured for 7 days'
      });
    } catch (error) {
      console.error("Error boosting property:", error);
      res.status(400).json({ message: "Failed to boost property", error: (error as Error).message });
    }
  });

  // Refresh endpoint (1 credit, 24-hour cooldown)
  app.post('/api/properties/:id/refresh', isAgent, async (req: any, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Only allow refreshing online listings
      if (property.status !== 'online') {
        return res.status(400).json({ message: "Only online listings can be refreshed" });
      }

      // Check 24-hour cooldown
      if (property.lastRefreshedAt) {
        const hoursSinceRefresh = (new Date().getTime() - new Date(property.lastRefreshedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceRefresh < 24) {
          const hoursRemaining = Math.ceil(24 - hoursSinceRefresh);
          return res.status(400).json({ 
            message: `Please wait ${hoursRemaining} hours before refreshing again`,
            nextRefreshAvailable: new Date(new Date(property.lastRefreshedAt).getTime() + 24 * 60 * 60 * 1000)
          });
        }
      }

      const agentId = req.user.claims.sub;
      
      // Deduct 1 credit for refresh
      const updatedUser = await storage.deductCreditsWithLogging({
        userId: agentId,
        amount: 1,
        type: 'refresh',
        propertyId: req.params.id,
        description: 'Refresh listing',
      });
      const remainingCredits = updatedUser.aiCredits ?? 0;
      console.log(`🔄 Refreshed! Deducted 1 AI credit from ${agentId}. Remaining: ${remainingCredits}`);
      
      // Update lastRefreshedAt (don't touch updatedAt per architect's guidance)
      const updatedProperty = await storage.updateProperty(req.params.id, {
        lastRefreshedAt: new Date(),
      });

      res.json({
        ...updatedProperty,
        creditDeducted: 1,
        remainingCredits,
        message: 'Listing refreshed successfully'
      });
    } catch (error) {
      console.error("Error refreshing property:", error);
      res.status(400).json({ message: "Failed to refresh property", error: (error as Error).message });
    }
  });

  // Get agent credits endpoint
  app.get('/api/agent/credits', isAgent, async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;
      const credits = await storage.getUserCredits(agentId);
      res.json({ credits });
    } catch (error) {
      console.error("Error fetching credits:", error);
      res.status(500).json({ message: "Failed to fetch credits" });
    }
  });

  // Agent properties count endpoint (lightweight alternative to limit=0 requests)
  app.get('/api/agent/properties/counts', isAgent, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const [onlineCount, offlineCount, expiredCount, draftCount] = await Promise.all([
        storage.getPropertiesCountByStatus(userId, 'online'),
        storage.getPropertiesCountByStatus(userId, 'offline'),
        storage.getPropertiesCountByStatus(userId, 'expired'),
        storage.getPropertiesCountByStatus(userId, 'draft'),
      ]);
      
      res.json({
        online: onlineCount,
        offline: offlineCount,
        expired: expiredCount,
        draft: draftCount,
      });
    } catch (error) {
      console.error("Error fetching properties counts:", error);
      res.status(500).json({ message: "Failed to fetch counts" });
    }
  });

  // Agent properties endpoint with status filtering and pagination
  app.get('/api/agent/properties', isAgent, async (req: any, res) => {
    try {
      const { status, page, limit } = req.query;
      const userId = req.user.claims.sub;
      
      // Parse pagination parameters
      const pageNum = page ? parseInt(page as string, 10) : 1;
      const limitNum = limit ? parseInt(limit as string, 10) : 20;
      const offset = (pageNum - 1) * limitNum;
      
      // Get properties by status with pagination if filter is provided
      if (status) {
        const properties = await storage.getPropertiesByStatus(userId, status as string, limitNum, offset);
        const totalCount = await storage.getPropertiesCountByStatus(userId, status as string);
        
        return res.json({
          properties,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limitNum),
          }
        });
      }
      
      // Get all agent properties INCLUDING drafts with pagination
      const properties = await storage.getPropertiesByAgent(userId, limitNum, offset);
      const totalCount = await storage.getPropertiesCountByAgent(userId);
      
      res.json({
        properties,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / Math.max(1, limitNum)),
        }
      });
    } catch (error) {
      console.error("Error fetching agent properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // Agent metrics endpoint
  app.get('/api/agent/metrics', isAgent, async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;
      
      const metrics = await storage.getAgentMetrics(agentId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching agent metrics:", error);
      res.status(500).json({ message: "Failed to fetch agent metrics" });
    }
  });

  // Update property status
  app.patch('/api/agent/properties/:id/status', isAgent, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const agentId = req.user.claims.sub;

      if (!['online', 'offline', 'expired', 'draft', 'sold', 'rented'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      // Validate minimum 3 photos requirement when changing status to 'online'
      if (status === 'online') {
        const property = await storage.getProperty(id);
        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }
        const images = property.images || [];
        if (images.length < 3) {
          return res.status(400).json({ 
            message: "Cannot set status to online: Minimum 3 photos required to post a listing" 
          });
        }
      }

      const updatedProperty = await storage.updatePropertyStatus(id, status, undefined, agentId);
      res.json(updatedProperty);
    } catch (error) {
      console.error("Error updating property status:", error);
      res.status(500).json({ message: "Failed to update property status" });
    }
  });

  // Save draft property
  app.post('/api/agent/properties/draft', isAgent, async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;
      const propertyData = req.body;

      const draft = await storage.saveDraft(propertyData, agentId);
      res.status(201).json(draft);
    } catch (error) {
      console.error("Error saving draft:", error);
      res.status(500).json({ message: "Failed to save draft" });
    }
  });

  // Publish draft property
  app.patch('/api/agent/properties/:id/publish', isAgent, async (req: any, res) => {
    try {
      const { id } = req.params;
      const agentId = req.user.claims.sub;

      // Validate minimum 3 photos requirement before publishing
      const property = await storage.getProperty(id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      const images = property.images || [];
      if (images.length < 3) {
        return res.status(400).json({ 
          message: "Cannot publish listing: Minimum 3 photos required to post a listing" 
        });
      }

      const publishedProperty = await storage.publishDraft(id, agentId);
      res.json(publishedProperty);
    } catch (error) {
      console.error("Error publishing draft:", error);
      res.status(500).json({ message: "Failed to publish draft" });
    }
  });

  // AI Search route
  // AI optimization status endpoint
  app.get("/api/ai/optimization-status", async (req, res) => {
    try {
      const { getCacheStats } = await import('./services/aiCache');
      const stats = getCacheStats();
      
      res.json({
        optimization: {
          caching: {
            enabled: true,
            cacheSize: stats.aiCache.size,
            totalEntries: stats.aiCache.entries.length
          },
          keywordExtraction: {
            enabled: true,
            description: "Handles simple queries without AI"
          },
          costOptimization: {
            model: "gpt-4o-mini",
            maxTokens: 500,
            description: "Using cost-efficient model for complex queries only"
          }
        },
        recentCache: stats.aiCache.entries.slice(0, 5).map((entry: any) => ({
          query: entry.query,
          ageMinutes: Math.round(entry.age / 60000)
        }))
      });
    } catch (error) {
      console.error('Error getting optimization status:', error);
      res.status(500).json({ error: 'Failed to get optimization status' });
    }
  });

  app.post('/api/search/ai', async (req, res) => {
    try {
      const { query, searchType, sortBy } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      // Apply typo correction before processing
      const { applyTypoCorrections } = await import("./services/fuzzyMatch");
      const { correctedQuery, allCorrections, hasCorrectedTypos } = applyTypoCorrections(query);
      
      if (hasCorrectedTypos) {
        console.log(`🔧 [TYPO CORRECTION] Original: "${query}" → Corrected: "${correctedQuery}"`);
        allCorrections.forEach(c => console.log(`   - "${c.original}" → "${c.corrected}" (${(c.score * 100).toFixed(0)}% match)`));
      }

      // Normalize searchType to canonical 'rent' | 'buy' (accepts synonyms: sale, sell, purchase)
      const { normalizeSearchType } = await import("./services/propertySearch");
      const normalizedSearchType = normalizeSearchType(searchType || 'rent');
      
      const result = await processAISearch(correctedQuery, normalizedSearchType, sortBy);
      
      // Add typo correction info to response
      if (hasCorrectedTypos) {
        result.typoCorrections = allCorrections;
        result.originalQuery = query;
        result.correctedQuery = correctedQuery;
      }
      
      // Enrich properties with nearest MRT/LRT station
      if (result.properties && result.properties.length > 0) {
        const { enrichPropertiesWithStations } = await import('./services/propertyEnrichment');
        result.properties = await enrichPropertiesWithStations(result.properties);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error processing AI search:", error);
      res.status(500).json({ message: "Failed to process search query" });
    }
  });

  // Progressive loading endpoint with Server-Sent Events
  app.post('/api/search/ai/stream', async (req, res) => {
    try {
      const { query, searchType, sortBy } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Import the progressive search function and normalization helper
      const { processAISearchProgressive, normalizeSearchType } = await import("./services/propertySearch");
      const normalizedSearchType = normalizeSearchType(searchType || 'rent');
      
      // Set up the callback for streaming results
      const onProgress = (batch: any) => {
        res.write(`data: ${JSON.stringify(batch)}\n\n`);
      };

      const onComplete = (summary: any) => {
        res.write(`data: ${JSON.stringify({ type: 'complete', ...summary })}\n\n`);
        res.end();
      };

      const onError = (error: any) => {
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
      };

      // Start progressive search
      await processAISearchProgressive(
        query, 
        normalizedSearchType, 
        sortBy,
        { onProgress, onComplete, onError }
      );

    } catch (error) {
      console.error("Error processing progressive AI search:", error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: "Failed to process search query" })}\n\n`);
      res.end();
    }
  });

  // Object Storage Routes
  const { ObjectStorageService } = await import("./objectStorage");

  // Get upload URL for property images
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve uploaded images
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof Error && error.name === 'ObjectNotFoundError') {
        res.status(404).json({ error: "Image not found" });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Upload property image with watermark
  app.post("/api/objects/upload-with-watermark", isAgent, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Get agent ID from authenticated user (normalized by isAgent middleware)
      // Support both Replit Auth and email/password auth
      const agentId = req.user?.claims?.sub || req.session?.userId;
      
      if (!agentId) {
        return res.status(401).json({ error: "Agent ID not found" });
      }
      
      // Get user information for watermark (nickname or full name)
      const user = await storage.getUser(agentId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Use nickname if set, otherwise use full name for watermark
      const watermarkName = user.nickname || `${user.firstName} ${user.lastName}`;

      // Read the uploaded file
      const imageBuffer = fs.readFileSync(req.file.path);
      
      // Add watermark with agent name
      const { watermarkService } = await import("./services/watermarkService");
      const watermarkedImage = await watermarkService.addWatermark(imageBuffer, {
        agentName: watermarkName,
        position: 'center',
        opacity: 0.9,
        fontSize: 36
      });

      // Get upload URL from object storage
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Upload watermarked image to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: watermarkedImage,
        headers: { 
          'Content-Type': req.file.mimetype,
          'Content-Length': watermarkedImage.length.toString()
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload watermarked image to object storage');
      }

      // Extract filename from upload URL and construct object path
      const urlParts = uploadURL.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0];
      const objectPath = `/objects/uploads/${fileName}`;

      // Clean up temporary file
      fs.unlinkSync(req.file.path);

      res.json({ objectPath });
    } catch (error) {
      console.error("Error uploading watermarked image:", error);
      // Clean up temporary file if it exists
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "Failed to upload image with watermark" });
    }
  });

  // Geocoding endpoint for location search
  // Helper function to get common postal codes for Malaysian areas
  function getPostalCodeForArea(city: string, state: string): string {
    const postalCodes: Record<string, string> = {
      "Petaling Jaya": "47800",
      "Kuala Lumpur": "50000",
      "Shah Alam": "40000",
      "Subang Jaya": "47500",
      "Cyberjaya": "63000",
      "Putrajaya": "62000",
      "Kajang": "43000",
      "Cheras": "43200",
      "Ampang": "68000"
    };
    return postalCodes[city] || "50000"; // Default to KL postal code
  }

  app.post("/api/geocode", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          error: "Query is required and must be a string",
          success: false 
        });
      }

      console.log(`🌍 Geocoding request for: "${query}"`);
      
      // Local knowledge base for common Malaysian properties
      const knownProperties: Record<string, { lat: number; lng: number; address: string; city: string; state: string }> = {
        "casa indah 1": { lat: 3.1727, lng: 101.6500, address: "Casa Indah 1, Kota Damansara", city: "Petaling Jaya", state: "Selangor" },
        "casa indah": { lat: 3.1727, lng: 101.6500, address: "Casa Indah, Kota Damansara", city: "Petaling Jaya", state: "Selangor" },
        "casa tropicana": { lat: 3.1320, lng: 101.5950, address: "Casa Tropicana, Tropicana", city: "Petaling Jaya", state: "Selangor" },
        "mont kiara": { lat: 3.1727, lng: 101.6500, address: "Mont Kiara", city: "Kuala Lumpur", state: "Kuala Lumpur" },
        "klcc": { lat: 3.1578, lng: 101.7123, address: "KLCC", city: "Kuala Lumpur", state: "Kuala Lumpur" },
        "bukit bintang": { lat: 3.1478, lng: 101.7103, address: "Bukit Bintang", city: "Kuala Lumpur", state: "Kuala Lumpur" },
        "damansara": { lat: 3.1319, lng: 101.5742, address: "Damansara", city: "Petaling Jaya", state: "Selangor" },
        "kota damansara": { lat: 3.1727, lng: 101.6500, address: "Kota Damansara", city: "Petaling Jaya", state: "Selangor" },
        "ilham residence": { lat: 3.1644, lng: 101.7112, address: "Ilham Residence, KLCC", city: "Kuala Lumpur", state: "Kuala Lumpur" },
      };

      // Check if we have local knowledge for this property
      const queryLower = query.toLowerCase().trim();
      const knownProperty = knownProperties[queryLower];
      
      if (knownProperty) {
        console.log(`✅ Using local knowledge for: ${query}`);
        return res.json({
          success: true,
          result: {
            coordinates: [knownProperty.lng, knownProperty.lat],
            properties: {
              name: query,
              parsedAddress: knownProperty.address,
              parsedCity: knownProperty.city,
              parsedState: knownProperty.state,
              parsedPostalCode: getPostalCodeForArea(knownProperty.city, knownProperty.state)
            }
          }
        });
      }
      
      // Use Google Maps Geocoding API for accurate geocoding
      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
      
      let googleMapsWorked = false;
      let data: any = null;

      if (googleApiKey) {
        try {
          // Geocode using Google Maps API with Malaysia region bias
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=MY&key=${googleApiKey}`;
          
          const response = await fetch(geocodeUrl);
          data = await response.json() as any;
          googleMapsWorked = true;
        } catch (gmError) {
          console.log(`⚠️ Google Maps API call failed:`, gmError);
          googleMapsWorked = false;
        }
      } else {
        console.log(`⚠️ Google Maps API key not configured, using fallback`);
      }
      
      if (googleMapsWorked && data && data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        const addressComponents = result.address_components;
        
        // Malaysia geographic bounds validation
        const malaysiaBounds = {
          minLat: 0.8,
          maxLat: 7.4,
          minLng: 99.6,
          maxLng: 119.3
        };
        
        const isInMalaysia = location.lat >= malaysiaBounds.minLat && 
                            location.lat <= malaysiaBounds.maxLat && 
                            location.lng >= malaysiaBounds.minLng && 
                            location.lng <= malaysiaBounds.maxLng;
        
        if (!isInMalaysia) {
          console.log(`❌ Location outside Malaysia bounds: "${query}" -> ${location.lat}, ${location.lng}`);
          return res.status(404).json({ 
            success: false, 
            error: "Location is outside Malaysia. Please search for a location within Malaysia only." 
          });
        }
        
        // Extract components from Google's response
        let parsedCity = "";
        let parsedState = "";
        let parsedPostalCode = "";
        let parsedAddress = result.formatted_address;
        
        addressComponents.forEach((component: any) => {
          if (component.types.includes("locality")) {
            parsedCity = component.long_name;
          } else if (component.types.includes("administrative_area_level_1")) {
            parsedState = component.long_name;
          } else if (component.types.includes("postal_code")) {
            parsedPostalCode = component.long_name;
          }
        });

        // Fallback postal code if not found in response
        if (!parsedPostalCode && parsedCity) {
          parsedPostalCode = getPostalCodeForArea(parsedCity, parsedState);
        }
        
        console.log(`✅ Google Maps geocoded (Malaysia): "${query}" -> ${location.lat}, ${location.lng} (${parsedCity}, ${parsedState})`);
        
        res.json({
          success: true,
          result: {
            coordinates: [location.lng, location.lat], // [lng, lat] format for consistency
            properties: {
              name: result.formatted_address,
              parsedAddress,
              parsedCity,
              parsedState,
              parsedPostalCode,
              locality: parsedCity,
              region: parsedState,
              postcode: parsedPostalCode
            }
          }
        });
      } else {
        // Google Maps failed or unavailable - use fallback
        const errorMsg = data ? `${data.status}` : 'API unavailable';
        console.log(`❌ Google Maps geocoding failed for "${query}": ${errorMsg}`);
        
        // Fallback to locationService
        console.log(`🔄 Trying locationService fallback for: "${query}"`);
        try {
          const fallbackResult = await locationService.geocodeAddress(query);
          
          if (fallbackResult && fallbackResult.latitude && fallbackResult.longitude) {
            const lat = parseFloat(fallbackResult.latitude);
            const lng = parseFloat(fallbackResult.longitude);
            
            console.log(`✅ LocationService found: "${query}" -> ${lat}, ${lng}`);
            return res.json({
              success: true,
              result: {
                coordinates: [lng, lat],
                properties: {
                  name: query,
                  parsedAddress: query,
                  parsedCity: "",
                  parsedState: "",
                  parsedPostalCode: ""
                }
              }
            });
          }
        } catch (fallbackError) {
          console.error(`Fallback also failed:`, fallbackError);
        }
        
        res.json({
          success: false,
          error: data && data.status === 'ZERO_RESULTS' ? "Location not found" : `Geocoding failed: ${errorMsg}`
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      res.status(500).json({ 
        error: "Failed to geocode location",
        success: false 
      });
    }
  });

  // Batch geocoding endpoints
  // Get properties that need geocoding
  app.get('/api/geocoding/status', async (req, res) => {
    try {
      const propertiesWithoutCoordinates = await batchGeocodingService.getPropertiesWithoutCoordinates();
      
      res.json({
        success: true,
        total_properties: propertiesWithoutCoordinates.length,
        properties_needing_geocoding: Math.min(10, propertiesWithoutCoordinates.length), // Show first 10
        sample_properties: propertiesWithoutCoordinates.slice(0, 10).map(p => ({
          id: p.id,
          title: p.title,
          address: p.address,
          city: p.city,
          state: p.state
        }))
      });
    } catch (error) {
      console.error('Error getting geocoding status:', error);
      res.status(500).json({ error: 'Failed to get geocoding status', success: false });
    }
  });

  // Start batch geocoding process for all properties
  app.post('/api/geocoding/start-batch', async (req, res) => {
    try {
      console.log('🚀 Starting batch geocoding process via API...');
      
      // Don't await this - let it run in background
      batchGeocodingService.geocodeAllProperties().then(result => {
        console.log('📊 Batch geocoding completed:', result);
      }).catch(error => {
        console.error('❌ Batch geocoding failed:', error);
      });
      
      res.json({
        success: true,
        message: 'Batch geocoding process started in background',
        note: 'Check server logs for progress updates'
      });
    } catch (error) {
      console.error('Error starting batch geocoding:', error);
      res.status(500).json({ error: 'Failed to start batch geocoding', success: false });
    }
  });

  // Geocode specific properties by IDs (for testing)
  app.post('/api/geocoding/specific', async (req, res) => {
    try {
      const { property_ids } = req.body;
      
      if (!property_ids || !Array.isArray(property_ids) || property_ids.length === 0) {
        return res.status(400).json({ 
          error: 'property_ids array is required and must not be empty',
          success: false 
        });
      }
      
      if (property_ids.length > 20) {
        return res.status(400).json({ 
          error: 'Cannot geocode more than 20 properties at once',
          success: false 
        });
      }
      
      console.log(`🎯 Starting geocoding for specific properties: ${property_ids.join(', ')}`);
      
      const result = await batchGeocodingService.geocodeSpecificProperties(property_ids);
      
      res.json({
        success: true,
        result: result,
        message: `Geocoded ${result.successful}/${result.total} properties successfully`
      });
    } catch (error) {
      console.error('Error geocoding specific properties:', error);
      res.status(500).json({ error: 'Failed to geocode specific properties', success: false });
    }
  });

  // Enhanced fuzzy search endpoint with Klang Valley database integration
  app.get('/api/search/fuzzy', async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.json([]);
      }
      
      const query = q.toLowerCase().trim();
      console.log(`🔍 Fuzzy search for: "${query}"`);
      console.log(`🔍 STARTING TRANSPORT CHECK FOR: "${query}"`);
      
      // Check if this is a complex transport query - use SimplifiedSearchService
      const transportPatterns = [
        /near (mrt|lrt|ktm|monorail)/i,
        /close to (mrt|lrt|ktm|monorail)/i,
        /(condo|condominium|apartment|house|unit) near/i,
        /within.*walking distance.*transport/i,
        /properties near (mrt|lrt|ktm|monorail)/i
      ];
      
      // Debug pattern matching
      console.log(`🔍 Testing patterns for query: "${query}"`);
      transportPatterns.forEach((pattern, i) => {
        const matches = pattern.test(query);
        console.log(`  Pattern ${i + 1}: ${pattern} -> ${matches}`);
      });
      
      const isTransportQuery = transportPatterns.some(pattern => pattern.test(query));
      
      if (isTransportQuery) {
        console.log(`🚉 Transport query detected: "${query}" - using SimplifiedSearchService`);
        const simplifiedSearch = new SimplifiedSearchService();
        
        // Extract property type from query for proper filtering
        let propertyType = undefined;
        if (query.includes('condo')) propertyType = 'condominium';
        else if (query.includes('apartment')) propertyType = 'apartment';
        else if (query.includes('house')) propertyType = 'house';
        
        const searchFilters = {
          listingType: 'rent', // Default to rent, user can change later
          propertyType
        };
        
        const searchResult = await simplifiedSearch.searchProperties(query, searchFilters, 20);
        
        console.log(`🔍 DEBUG: searchResult structure:`, {
          resultsCount: searchResult.results?.length || 0,
          hasResults: !!searchResult.results,
          firstResult: searchResult.results?.[0] ? Object.keys(searchResult.results[0]) : 'no results'
        });
        
        if (searchResult.results?.[0]) {
          console.log(`🔍 FULL FIRST RESULT:`, JSON.stringify(searchResult.results[0], null, 2));
        }
        
        // Convert search results to fuzzy search format
        const transportResults = (searchResult.results || []).map((item: any) => {
          // Handle nested property structure
          const property = item.property || item;
          return {
            text: property.title || property.name || `Property ${property.id?.slice(0,8)}` || 'Property',
            type: 'property', 
            count: 1,
            propertyType: property.propertyType || property.property_type,
            price: property.price,
            address: property.address,
            id: property.id
          };
        });
        
        console.log(`🚉 Transport search found ${transportResults.length} properties`);
        if (transportResults.length > 0) {
          console.log(`🔍 First property:`, transportResults[0]);
        }
        return res.json(transportResults);
      }
      
      const suggestions = new Map<string, {text: string, type: string, count: number}>();
      
      // 🎯 PRIORITY 1: Search Klang Valley database (malaysian_locations)
      try {
        const locationResults = await db.execute(
          sql`SELECT name, normalized_name, type, latitude, longitude, confidence_score 
              FROM malaysian_locations 
              WHERE normalized_name ILIKE ${'%' + query + '%'} 
                 OR name ILIKE ${'%' + query + '%'}
              ORDER BY confidence_score DESC, 
                       CASE WHEN normalized_name ILIKE ${query + '%'} THEN 1 ELSE 2 END,
                       LENGTH(name) ASC
              LIMIT 15`
        );
        
        for (const row of locationResults.rows) {
          const location = row as any;
          const key = location.name.toLowerCase();
          
          suggestions.set(key, {
            text: location.name,
            type: location.type === 'transport' ? 'area' : location.type, // Show transport as areas
            count: 0 // Will be filled with property count
          });
        }
        
        console.log(`💾 Found ${locationResults.rows.length} locations in Klang Valley database`);
      } catch (dbError) {
        console.error('Malaysian locations database error:', dbError);
      }
      
      // 🎯 PRIORITY 2: Add property-based suggestions
      const properties = await storage.getProperties({ 
        limit: 300, // Reasonable limit for property search
        sortBy: 'newest'
      });
      
      // Track building names to prevent re-categorizing them as areas
      const buildingNames = new Set<string>();
      
      // Search for matching locations, areas, and property names
      properties.forEach(property => {
        const searchText = query.toLowerCase();
        
        // Check property title matches (for developments like "Empire Damansara")
        if (property.title && property.title.toLowerCase().includes(searchText)) {
          const key = property.title.toLowerCase();
          // Extract building name (before the dash if present)
          const buildingName = property.title.split(' - ')[0].trim();
          const buildingKey = buildingName.toLowerCase();
          
          buildingNames.add(buildingKey); // Track this as a building name
          
          if (!suggestions.has(buildingKey)) {
            suggestions.set(buildingKey, {
              text: buildingName,
              type: 'building',
              count: 1
            });
          } else {
            const existing = suggestions.get(buildingKey)!;
            // Preserve building type if already exists
            if (existing.type !== 'building') {
              existing.type = 'building';
            }
            existing.count++;
          }
        }
        
        // Check city matches
        if (property.city && property.city.toLowerCase().includes(searchText)) {
          const key = property.city.toLowerCase();
          // Don't add cities that are actually building names
          if (!buildingNames.has(key)) {
            if (!suggestions.has(key)) {
              suggestions.set(key, {
                text: property.city,
                type: 'city',
                count: 1
              });
            } else {
              const existing = suggestions.get(key)!;
              existing.count++;
            }
          }
        }
        
        // Check address matches (for areas like "Damansara Perdana", "Kota Damansara")
        if (property.address && property.address.toLowerCase().includes(searchText)) {
          const addressParts = property.address.split(',');
          addressParts.forEach(part => {
            const cleanPart = part.trim();
            const cleanKey = cleanPart.toLowerCase();
            
            // Don't add areas that are actually building names
            if (cleanPart.toLowerCase().includes(searchText) && 
                cleanPart.length > searchText.length && 
                cleanPart.length < 50 &&
                !buildingNames.has(cleanKey)) {
              
              if (!suggestions.has(cleanKey)) {
                suggestions.set(cleanKey, {
                  text: cleanPart,
                  type: 'area',
                  count: 1
                });
              } else {
                const existing = suggestions.get(cleanKey)!;
                // Don't override building type with area
                if (existing.type !== 'building') {
                  existing.count++;
                }
              }
            }
          });
        }
      });
      
      const results = Array.from(suggestions.values());
      
      // Sort by relevance: exact matches first, then type priority (building > area > city), then by count
      results.sort((a, b) => {
        const queryLower = query.toLowerCase();
        const aExact = a.text.toLowerCase() === queryLower;
        const bExact = b.text.toLowerCase() === queryLower;
        const aStarts = a.text.toLowerCase().startsWith(queryLower);
        const bStarts = b.text.toLowerCase().startsWith(queryLower);
        
        // 1. Exact matches first
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // 2. Starts with query
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // 3. Prioritize type: building > area > city
        const typeOrder: {[key: string]: number} = { building: 0, area: 1, city: 2 };
        const aTypeOrder = typeOrder[a.type] ?? 3;
        const bTypeOrder = typeOrder[b.type] ?? 3;
        if (aTypeOrder !== bTypeOrder) {
          return aTypeOrder - bTypeOrder;
        }
        
        // 4. Finally sort by count
        return b.count - a.count;
      });
      
      res.json(results.slice(0, 10)); // Return top 10 suggestions
      
    } catch (error) {
      console.error('Fuzzy search error:', error);
      res.json([]);
    }
  });

  // Enhanced search suggestions with auto-complete, trending, and location-aware features
  app.post('/api/search/suggestions-enhanced', async (req, res) => {
    try {
      const { query, searchType = 'rent', userLocation, includeDefaults = false, includeProperties = false } = req.body;
      
      if (!query || query.length < 1 || includeDefaults) {
        const suggestions: any[] = [];
        // Only show "Near your location" if user location is available
        if (userLocation) {
          const locationSuggestion = { text: "Near your location", type: "location", count: 174, distance: "< 10km" };
          suggestions.push(locationSuggestion);
        }
        return res.json({ suggestions });
      }

      // Check if this is a complex query that needs AI parsing
      const complexPhrases = ['near', 'around', 'close to', 'within', 'walking distance', 'for rent', 'for sale', 'under', 'above', 'below', 'bedroom', 'bathroom'];
      const isComplexQuery = complexPhrases.some(phrase => query.toLowerCase().includes(phrase));

      if (isComplexQuery) {
        // For complex queries, use AI search to find relevant properties and convert to suggestions
        try {
          console.log(`🤖 SUGGESTIONS: Using AI search for complex query: "${query}"`);
          
          // Add timeout to prevent slow suggestions (max 2 seconds)
          const aiSearchPromise = processAISearch(query, searchType);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Suggestions timeout')), 2000)
          );
          
          const aiSearchResult = await Promise.race([aiSearchPromise, timeoutPromise]) as any;
          console.log(`🤖 SUGGESTIONS: AI search found ${aiSearchResult.count} properties`);
          
          if (aiSearchResult.properties && aiSearchResult.properties.length > 0) {
            // Also add relevant location suggestions
            const locationSuggestions = [
              { text: "Near MRT Surian", type: "location", count: aiSearchResult.count, distance: "1.8km radius" },
              { text: "Kota Damansara", type: "area", count: 12, distance: "Near MRT Surian" },
              { text: "Condominiums near MRT", type: "search", count: aiSearchResult.count }
            ];

            let combinedSuggestions = [...locationSuggestions.slice(0, 3)];

            // Only include property suggestions if requested
            if (includeProperties) {
              const propertySuggestions = aiSearchResult.properties.slice(0, 5).map((prop: any) => ({
                text: prop.title,
                type: 'property' as const,
                id: prop.property_id || prop.id,
                propertyType: prop.property_type || prop.propertyType,
                price: prop.price,
                count: 1,
                source: 'ai-search'
              }));
              combinedSuggestions = [...combinedSuggestions, ...propertySuggestions];
            }

            console.log(`🤖 SUGGESTIONS: Returning ${combinedSuggestions.length} suggestions (includeProperties: ${includeProperties})`);
            return res.json({ suggestions: combinedSuggestions.slice(0, 8) });
          } else {
            console.log(`🤖 SUGGESTIONS: No properties found in AI search result`);
          }
        } catch (aiError) {
          console.error('AI search for suggestions failed:', aiError);
          // Fall back to simple suggestions
        }
      }

      // For simple queries, use the original suggestion logic
      const locationSuggestions = await storage.getEnhancedSuggestions(query, searchType, userLocation, includeDefaults);
      
      // Normalize searchType to database enum (buy → sale)
      const normalizedListingType = searchType === 'buy' ? 'sale' : 'rent';
      
      // Also get building/area suggestions using property title search
      const buildingSuggestions = await storage.searchProperties(
        query,
        { listingType: normalizedListingType }
      );
      
      // Extract unique building names from search results
      const buildingNames = new Set<string>();
      const buildingSuggestionsFormatted = buildingSuggestions
        .filter((prop: any) => {
          const title = prop.title.toLowerCase();
          if (!buildingNames.has(title) && title.includes(query.toLowerCase())) {
            buildingNames.add(title);
            return true;
          }
          return false;
        })
        .slice(0, 3)
        .map((prop: any) => ({
          text: prop.title,
          type: 'building',
          count: 1,
          source: 'property-search'
        }));
      
      let combinedSuggestions: any[] = [...locationSuggestions, ...buildingSuggestionsFormatted];

      // Only include property suggestions if requested
      if (includeProperties) {
        const propertySuggestions = await storage.getPropertySuggestions(query, searchType, 3);
        
        // Group property suggestions by building name to avoid duplicates
        const propertyGroups = new Map<string, {
          text: string;
          type: 'property';
          id: string;
          propertyType: string;
          price: number;
          count: number;
          properties: Array<{id: string; price: number; propertyType: string}>;
        }>();

        propertySuggestions.forEach(prop => {
          const buildingName = prop.title;
          if (propertyGroups.has(buildingName)) {
            const existing = propertyGroups.get(buildingName)!;
            existing.count++;
            existing.properties.push({
              id: prop.id,
              price: prop.price,
              propertyType: prop.propertyType
            });
            // Update to show lowest price
            if (prop.price < existing.price) {
              existing.price = prop.price;
              existing.id = prop.id;
              existing.propertyType = prop.propertyType;
            }
          } else {
            propertyGroups.set(buildingName, {
              text: buildingName,
              type: 'property' as const,
              id: prop.id,
              propertyType: prop.propertyType,
              price: prop.price,
              count: 1,
              properties: [{id: prop.id, price: prop.price, propertyType: prop.propertyType}]
            });
          }
        });

        // Convert grouped properties back to array
        const groupedPropertySuggestions = Array.from(propertyGroups.values()).map(group => ({
          text: group.text,
          type: group.type,
          id: group.id,
          propertyType: group.propertyType,
          price: group.price,
          count: group.count
        }));

        // Add property suggestions to combined results
        combinedSuggestions = [...combinedSuggestions, ...groupedPropertySuggestions];
      }

      return res.json({ suggestions: combinedSuggestions.slice(0, 8) });
    } catch (error) {
      console.error('Error getting enhanced search suggestions:', error);
      res.json({ suggestions: [] });
    }
  });

  // Location search suggestions with hybrid Google Places integration
  app.get('/api/search/suggestions', async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.json({ suggestions: [] });
      }

      const suggestions = [];

      // First try to get location coordinates using hybrid system
      const locationCoords = await enhancedGeocodingService.getLocationCoordinates(q);
      if (locationCoords) {
        suggestions.push({
          text: q,
          type: 'building',
          coordinates: locationCoords,
          source: 'hybrid'
        });
      }

      // Add common Malaysian location suggestions based on query
      const commonSuggestions = [
        { pattern: /klcc|petronas|twin towers/i, suggestion: { text: "KLCC", type: "area" }},
        { pattern: /mont kiara/i, suggestion: { text: "Mont Kiara", type: "area" }},
        { pattern: /bangsar/i, suggestion: { text: "Bangsar", type: "area" }},
        { pattern: /damansara/i, suggestion: { text: "Damansara", type: "area" }},
        { pattern: /pj|petaling jaya/i, suggestion: { text: "Petaling Jaya", type: "city" }},
        { pattern: /ampang/i, suggestion: { text: "Ampang", type: "area" }},
        { pattern: /sri hartamas/i, suggestion: { text: "Sri Hartamas", type: "area" }},
        { pattern: /cheras/i, suggestion: { text: "Cheras", type: "area" }},
        { pattern: /bukit jalil/i, suggestion: { text: "Bukit Jalil", type: "area" }},
        { pattern: /setapak/i, suggestion: { text: "Setapak", type: "area" }},
        { pattern: /ikea/i, suggestion: { text: "IKEA Damansara", type: "building" }},
        { pattern: /sunway/i, suggestion: { text: "Sunway Pyramid", type: "building" }},
        { pattern: /mid valley/i, suggestion: { text: "Mid Valley Megamall", type: "building" }}
      ];

      for (const { pattern, suggestion } of commonSuggestions) {
        if (pattern.test(q) && !suggestions.some(s => s.text.toLowerCase() === suggestion.text.toLowerCase())) {
          suggestions.push(suggestion);
        }
      }

      // Fallback to original search suggestions from storage if no location suggestions found
      if (suggestions.length === 0) {
        const fallbackSuggestions = await storage.getSearchSuggestions(q.toLowerCase());
        suggestions.push(...fallbackSuggestions);
      }

      res.json({ suggestions: suggestions.slice(0, 8) });
    } catch (error) {
      console.error('Search suggestions error:', error);
      res.json({ suggestions: [] });
    }
  });

  // Validate and geocode location for property listings (Agent Portal integration)
  app.post('/api/locations/validate', async (req, res) => {
    try {
      const { locationName, address } = req.body;
      
      if (!locationName || typeof locationName !== 'string') {
        return res.status(400).json({ error: "Location name is required" });
      }

      // Use hybrid geocoding service to get coordinates
      const coordinates = await enhancedGeocodingService.getLocationCoordinates(locationName);
      
      if (coordinates) {
        res.json({
          valid: true,
          coordinates,
          locationName,
          source: 'hybrid', // indicates it could be from local DB or Google Places
          address: address || locationName
        });
      } else {
        res.json({
          valid: false,
          message: "Location not found. Please try a different name or address.",
          suggestions: [
            "Try adding more specific details (e.g., 'IKEA Damansara' instead of 'IKEA')",
            "Include the area or city name (e.g., 'Mont Kiara, KL')",
            "Check the spelling of the location name",
            "Try using landmarks or well-known buildings nearby"
          ]
        });
      }
    } catch (error) {
      console.error("Error validating location:", error);
      res.status(500).json({ error: "Failed to validate location" });
    }
  });

  // Batch location lookup for multiple locations (useful for property listings)
  app.post('/api/locations/batch', async (req, res) => {
    try {
      const { locations } = req.body;
      
      if (!Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({ error: "Locations array is required" });
      }

      if (locations.length > 20) {
        return res.status(400).json({ error: "Maximum 20 locations allowed per batch" });
      }

      // Process locations one by one since we removed batchGeocode
      const results: Record<string, { lat: number; lng: number } | null> = {};
      for (const location of locations) {
        try {
          const coords = await enhancedGeocodingService.getLocationCoordinates(location);
          results[location] = coords;
        } catch (error) {
          results[location] = null;
        }
      }
      
      res.json({
        results,
        count: Object.keys(results).length,
        successful: Object.values(results).filter(coord => coord !== null).length
      });
    } catch (error) {
      console.error("Error in batch location lookup:", error);
      res.status(500).json({ error: "Failed to process batch location lookup" });
    }
  });

  // AI Chat endpoint
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      // Generate AI response based on property-related queries
      const response = await generateAIResponse(message);
      
      res.json({ reply: response });
    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Regular search route with AI integration
  app.post('/api/search', async (req, res) => {
    try {
      const { query, searchType, filters } = req.body;
      
      // If query provided, use AI search for intelligent parsing
      if (query && query.trim()) {
        const result = await processAISearch(query, searchType || 'rent');
        res.json(result);
      } else {
        // Fallback to direct storage search for filter-only queries
        const properties = await storage.searchProperties('', filters);
        res.json({ properties, count: properties.length });
      }
    } catch (error) {
      console.error("Error searching properties:", error);
      res.status(500).json({ message: "Failed to search properties" });
    }
  });

  // Save search query (for logged in users)
  app.post('/api/search/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const searchData = insertSearchQuerySchema.parse({
        ...req.body,
        userId,
      });

      const searchQuery = await storage.createSearchQuery(searchData);
      res.status(201).json(searchQuery);
    } catch (error) {
      console.error("Error saving search query:", error);
      res.status(400).json({ message: "Failed to save search query" });
    }
  });

  app.get('/api/search/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const history = await storage.getUserSearchHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching search history:", error);
      res.status(500).json({ message: "Failed to fetch search history" });
    }
  });

  // Messages routes
  app.get('/api/messages/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const otherUserId = req.params.userId;
      
      const messages = await storage.getMessages(currentUserId, otherUserId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const senderId = req.user.claims.sub;
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId,
      });

      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(400).json({ message: "Failed to send message" });
    }
  });

  app.put('/api/messages/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      await storage.markMessageAsRead(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.get('/api/messages/unread/count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread message count:", error);
      res.status(500).json({ message: "Failed to fetch unread message count" });
    }
  });

  // Favorites routes
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favoriteData = insertFavoriteSchema.parse({
        ...req.body,
        userId,
      });

      const favorite = await storage.addToFavorites(favoriteData);
      res.status(201).json(favorite);
    } catch (error) {
      console.error("Error adding to favorites:", error);
      res.status(400).json({ message: "Failed to add to favorites" });
    }
  });

  app.delete('/api/favorites/:propertyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.removeFromFavorites(userId, req.params.propertyId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing from favorites:", error);
      res.status(500).json({ message: "Failed to remove from favorites" });
    }
  });

  app.get('/api/favorites/:propertyId/check', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isFavorite = await storage.isFavorite(userId, req.params.propertyId);
      res.json({ isFavorite });
    } catch (error) {
      console.error("Error checking favorite status:", error);
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  // Image upload route
  app.post('/api/upload/images', isAuthenticated, upload.array('images', 10), async (req: any, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No images uploaded" });
      }

      const imageUrls = req.files.map((file: any) => `/uploads/${file.filename}`);
      res.json({ images: imageUrls });
    } catch (error) {
      console.error("Error uploading images:", error);
      res.status(500).json({ message: "Failed to upload images" });
    }
  });

  // Recommendations routes
  app.get('/api/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      const recommendations = await generateRecommendations(userId, limit);
      res.json(recommendations);
    } catch (error) {
      console.error("Error getting recommendations:", error as Error);
      res.status(500).json({ message: "Failed to get recommendations" });
    }
  });

  app.get('/api/recommendations/personalized', async (req, res) => {
    try {
      // Get sample properties for demonstration until engine is fixed
      const allProperties = await storage.getProperties({ limit: 50 });
      
      // Create mock recommendations structure
      const recommendations = {
        similar: allProperties.slice(0, 5).map(property => ({
          property,
          score: Math.floor(Math.random() * 30) + 70,
          reason: "Similar to your preferred properties",
          type: 'similar' as const
        })),
        betterValue: allProperties.slice(5, 10).map(property => {
          const price = parseFloat(property.price.replace(/[^\d.-]/g, ''));
          const marketMedian = price * 1.15; // Mock market price 15% higher
          const savings = marketMedian - price;
          const savingsPercent = (savings / marketMedian) * 100;
          
          return {
            property: {
              ...property,
              marketMedian,
              actualSavings: savings,
              savingsPercentage: savingsPercent
            },
            score: Math.floor(Math.random() * 20) + 80,
            reason: `${Math.round(savingsPercent)}% below market median`,
            type: 'better_value' as const,
            marketComparison: {
              marketMedian,
              actualPrice: price,
              savingsAmount: savings,
              savingsPercent
            }
          };
        }),
        upgrades: allProperties.slice(10, 15).map(property => ({
          property,
          score: Math.floor(Math.random() * 25) + 65,
          reason: "Premium upgrade within your extended budget",
          type: 'upgrade' as const
        })),
        alternativeAreas: allProperties.slice(15, 20).map(property => ({
          property,
          score: Math.floor(Math.random() * 20) + 70,
          reason: "Great value in emerging neighborhoods",
          type: 'alternative_area' as const
        })),
        insights: {
          totalRecommendations: 20,
          marketTrends: "Property prices in KL have increased 3.2% this quarter",
          bestValueCount: 5,
          averageSavings: 12.5
        }
      };
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error getting personalized recommendations:", error);
      res.status(500).json({ message: "Failed to get personalized recommendations" });
    }
  });

  app.get('/api/recommendations/trending', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      // Get most viewed properties as trending
      const properties = await storage.getProperties({ 
        limit, 
        sortBy: "popular" as any 
      });
      
      const trendingProperties = {
        trendingProperties: properties.map(property => ({
          ...property,
          trendScore: Math.floor(Math.random() * 40) + 60 // Demo trending score
        }))
      };
      
      res.json(trendingProperties);
    } catch (error) {
      console.error("Error getting trending properties:", error);
      res.status(500).json({ message: "Failed to get trending properties" });
    }
  });

  // Smart tooltip endpoint
  app.get("/api/recommendations/tooltip/:propertyId", async (req, res) => {
    try {
      const { propertyId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      
      // Import the service here to avoid dependency issues
      const { smartTooltipService } = await import("./services/smartTooltipService");
      
      const tooltipData = await smartTooltipService.generateTooltipData(propertyId, userId);
      
      res.json(tooltipData);
    } catch (error) {
      console.error("Error generating smart tooltip:", error);
      res.status(500).json({ 
        error: "Failed to generate tooltip data",
        message: "Unable to load property insights at this time"
      });
    }
  });

  app.post('/api/recommendations/custom', async (req, res) => {
    try {
      const preferences = req.body;
      // Use existing property search with user preferences
      const filters = {
        listingType: "rent" as const,
        minPrice: preferences.priceRange?.min,
        maxPrice: preferences.priceRange?.max,
        bedrooms: preferences.bedrooms,
        bathrooms: preferences.bathrooms,
        limit: 10
      };
      
      const properties = await storage.getProperties(filters);
      
      const customRecs = {
        matches: properties.map(property => ({
          property,
          score: Math.floor(Math.random() * 30) + 70, // Demo score
          matchReasons: ["Matches your criteria", "Great location", "Good value"]
        }))
      };
      
      res.json(customRecs);
    } catch (error) {
      console.error("Error getting custom recommendations:", error);
      res.status(500).json({ message: "Failed to get custom recommendations" });
    }
  });

  app.get('/api/properties/:id/similar', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const similarProperties = await getSimilarProperties(req.params.id, limit);
      res.json(similarProperties);
    } catch (error) {
      console.error("Error getting similar properties:", error as Error);
      res.status(500).json({ message: "Failed to get similar properties" });
    }
  });

  // Serve uploaded images
  app.use('/uploads', express.static(uploadDir));

  // Mortgage eligibility checker routes
  app.post("/api/mortgage/check", async (req, res) => {
    try {
      const input = req.body as MortgageEligibilityInput;
      
      // Validate required fields
      if (!input.propertyPrice || !input.monthlyIncome || !input.downPayment || !input.employmentStatus || input.employmentYears === undefined) {
        return res.status(400).json({ 
          message: "Missing required fields: propertyPrice, monthlyIncome, downPayment, employmentStatus, employmentYears" 
        });
      }

      // Calculate eligibility
      const result = MortgageEligibilityService.calculateEligibility(input);
      
      // Save to database if user is authenticated
      const userId = (req.user as any)?.claims?.sub;
      if (userId && input.propertyPrice) {
        const eligibilityCheck = {
          userId,
          propertyId: (req.body as any).propertyId || null,
          monthlyIncome: String(input.monthlyIncome),
          monthlyDebt: String(input.monthlyDebt || 0),
          downPayment: String(input.downPayment),
          employmentStatus: input.employmentStatus,
          employmentYears: input.employmentYears,
          creditScore: input.creditScore,
          // Calculated results from the service
          eligibilityStatus: result.eligibilityStatus,
          maxLoanAmount: String(result.maxLoanAmount),
          monthlyPayment: String(result.monthlyPayment),
          debtToIncomeRatio: String(result.debtToIncomeRatio),
          loanToValueRatio: String(result.loanToValueRatio),
          interestRate: String(result.interestRate),
          loanTerm: result.loanTerm,
          recommendations: result.recommendations,
          bankSuggestions: result.bankSuggestions,
        };

        await storage.createMortgageEligibilityCheck(eligibilityCheck);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error checking mortgage eligibility:", error);
      res.status(500).json({ message: "Failed to check mortgage eligibility" });
    }
  });

  // Get user's mortgage eligibility history
  app.get("/api/mortgage/history", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const history = await storage.getMortgageEligibilityChecksByUser(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching mortgage history:", error);
      res.status(500).json({ message: "Failed to fetch mortgage history" });
    }
  });

  // Get specific mortgage eligibility check
  app.get("/api/mortgage/:id", isAuthenticated, async (req, res) => {
    try {
      const check = await storage.getMortgageEligibilityCheck(req.params.id);
      if (!check) {
        return res.status(404).json({ message: "Mortgage check not found" });
      }
      
      // Ensure user owns this check
      const userId = (req.user as any)?.claims?.sub;
      if (check.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(check);
    } catch (error) {
      console.error("Error fetching mortgage check:", error);
      res.status(500).json({ message: "Failed to fetch mortgage check" });
    }
  });

  // Gamification routes
  app.get('/api/gamification/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let stats = await gamificationService.getUserStats(userId);
      
      // Initialize stats if they don't exist
      if (!stats) {
        stats = await gamificationService.initializeUserStats(userId);
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching gamification stats:", error);
      res.status(500).json({ message: "Failed to fetch gamification stats" });
    }
  });

  app.get('/api/gamification/challenges', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const challenges = await gamificationService.getUserChallenges(userId);
      res.json(challenges);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges" });
    }
  });

  app.get('/api/gamification/rewards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rewards = await gamificationService.getUserRewards(userId);
      res.json(rewards);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      res.status(500).json({ message: "Failed to fetch rewards" });
    }
  });

  app.post('/api/gamification/record-view', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId, area, propertyType } = req.body;
      
      if (!propertyId || !area || !propertyType) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      await gamificationService.recordPropertyView(userId, propertyId, area, propertyType);
      
      // Return updated challenges to show progress
      const completedChallenges = await gamificationService.updateChallenges(userId);
      
      res.json({ 
        success: true, 
        completedChallenges: completedChallenges.length > 0 ? completedChallenges : undefined
      });
    } catch (error) {
      console.error("Error recording property view:", error);
      res.status(500).json({ message: "Failed to record property view" });
    }
  });

  // Development seed route for sale properties
  app.post('/api/seed/sale-properties', async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: "Seeding not allowed in production" });
      }
      
      const result = await seedSaleProperties();
      res.json(result);
    } catch (error) {
      console.error("Error seeding sale properties:", error);
      res.status(500).json({ message: "Failed to seed sale properties" });
    }
  });

  // Development seed route for developer reviews
  app.post('/api/seed/developer-reviews', async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: "Seeding not allowed in production" });
      }
      
      const result = await seedDeveloperReviews();
      res.json(result);
    } catch (error) {
      console.error("Error seeding developer reviews:", error);
      res.status(500).json({ message: "Failed to seed developer reviews" });
    }
  });

  // ============================================
  // NEW FEATURE ROUTES
  // ============================================

  // Developer Reviews Routes
  app.get("/api/developer-reviews", async (req, res) => {
    try {
      const { developer, search, page = "1", limit = "10" } = req.query;
      
      let result;
      if (search) {
        const reviews = await developerReviewService.searchReviews(
          search as string, 
          parseInt(page as string), 
          parseInt(limit as string)
        );
        result = { reviews, total: reviews.length, page: parseInt(page as string), limit: parseInt(limit as string) };
      } else if (developer) {
        result = await developerReviewService.getReviewsByDeveloper(
          developer as string,
          parseInt(page as string),
          parseInt(limit as string)
        );
      } else {
        result = { reviews: [], total: 0, page: 1, limit: 10 };
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching developer reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/developer-reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const reviewData = {
        ...req.body,
        userId: req.body.isAnonymous ? null : userId
      };
      
      const review = await developerReviewService.createReview(reviewData);
      res.json(review);
    } catch (error) {
      console.error("Error creating developer review:", error);
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  app.get("/api/developer-reviews/stats/:developer", async (req, res) => {
    try {
      const { developer } = req.params;
      const stats = await developerReviewService.getDeveloperStats(decodeURIComponent(developer));
      res.json(stats);
    } catch (error) {
      console.error("Error fetching developer stats:", error);
      res.status(500).json({ error: "Failed to fetch developer stats" });
    }
  });

  app.get("/api/developer-reviews/popular-developers", async (req, res) => {
    try {
      const { limit = "20" } = req.query;
      const developers = await developerReviewService.getPopularDevelopers(parseInt(limit as string));
      res.json(developers);
    } catch (error) {
      console.error("Error fetching popular developers:", error);
      res.status(500).json({ error: "Failed to fetch popular developers" });
    }
  });

  app.post("/api/developer-reviews/:reviewId/vote", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { reviewId } = req.params;
      const { voteType } = req.body;
      
      const result = await developerReviewService.voteOnReview(userId, reviewId, voteType);
      res.json(result);
    } catch (error) {
      console.error("Error voting on developer review:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to vote on review" });
    }
  });

  // Rental Yield Routes
  app.get("/api/rental-yield/heatmap", async (req, res) => {
    try {
      const { state, minYield, maxYield, limit = "100" } = req.query;
      
      const yieldData = await rentalYieldService.getYieldHeatMapData(
        state as string,
        minYield ? parseFloat(minYield as string) : undefined,
        maxYield ? parseFloat(maxYield as string) : undefined,
        parseInt(limit as string)
      );
      
      res.json(yieldData);
    } catch (error) {
      console.error("Error fetching yield heatmap data:", error);
      res.status(500).json({ error: "Failed to fetch yield data" });
    }
  });

  app.get("/api/rental-yield/top-areas", async (req, res) => {
    try {
      const { state, limit = "10" } = req.query;
      const topAreas = await rentalYieldService.getTopYieldAreas(
        state as string,
        parseInt(limit as string)
      );
      res.json(topAreas);
    } catch (error) {
      console.error("Error fetching top yield areas:", error);
      res.status(500).json({ error: "Failed to fetch top yield areas" });
    }
  });

  app.post("/api/rental-yield/calculate", async (req, res) => {
    try {
      const { area, city, state } = req.body;
      const result = await rentalYieldService.calculateRentalYield(area, city, state);
      res.json(result);
    } catch (error) {
      console.error("Error calculating rental yield:", error);
      res.status(500).json({ error: "Failed to calculate rental yield" });
    }
  });

  app.get("/api/rental-yield/comparison/:area/:city/:state", async (req, res) => {
    try {
      const { area, city, state } = req.params;
      const comparison = await rentalYieldService.getAreaComparison(
        decodeURIComponent(area),
        decodeURIComponent(city),
        decodeURIComponent(state)
      );
      res.json(comparison);
    } catch (error) {
      console.error("Error fetching area comparison:", error);
      res.status(500).json({ error: "Failed to fetch area comparison" });
    }
  });

  // Amenity Analysis Routes
  app.get("/api/amenity-analysis/:propertyId", async (req, res) => {
    try {
      const { propertyId } = req.params;
      
      // Check if analysis exists
      let scores = await amenityAnalysisService.getPropertyAmenityScores(propertyId);
      
      // If not exists or older than 30 days, re-analyze
      if (!scores || !scores.lastAnalyzed || (new Date().getTime() - new Date(scores.lastAnalyzed).getTime()) > 30 * 24 * 60 * 60 * 1000) {
        const analysis = await amenityAnalysisService.analyzePropertyAmenities(propertyId);
        res.json(analysis);
      } else {
        res.json(scores);
      }
    } catch (error) {
      console.error("Error fetching amenity analysis:", error);
      res.status(500).json({ error: "Failed to fetch amenity analysis" });
    }
  });

  app.get("/api/amenity-analysis/top-properties", async (req, res) => {
    try {
      const { limit = "20", minScore = "0" } = req.query;
      const properties = await amenityAnalysisService.getPropertiesByAmenityScore(
        parseInt(limit as string),
        parseInt(minScore as string)
      );
      res.json(properties);
    } catch (error) {
      console.error("Error fetching top properties by amenity score:", error);
      res.status(500).json({ error: "Failed to fetch top properties" });
    }
  });

  app.post("/api/amenity-analysis/batch-analyze", async (req, res) => {
    try {
      const { propertyIds } = req.body;
      const results = await amenityAnalysisService.batchAnalyzeProperties(propertyIds);
      res.json(results);
    } catch (error) {
      console.error("Error batch analyzing properties:", error);
      res.status(500).json({ error: "Failed to batch analyze properties" });
    }
  });

  // ==================== LOCATION MANAGEMENT API ====================
  
  // Search locations with autocomplete
  app.get('/api/locations/search', async (req, res) => {
    try {
      const { q: query, limit = "20" } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const results = await locationService.searchLocations(query, parseInt(limit as string));
      res.json(results);
    } catch (error) {
      console.error("Error searching locations:", error);
      res.status(500).json({ error: "Failed to search locations" });
    }
  });

  // Get all states
  app.get('/api/locations/states', async (req, res) => {
    try {
      const states = await locationService.getStates();
      res.json(states);
    } catch (error) {
      console.error("Error fetching states:", error);
      res.status(500).json({ error: "Failed to fetch states" });
    }
  });

  // Get cities by state
  app.get('/api/locations/states/:stateId/cities', async (req, res) => {
    try {
      const { stateId } = req.params;
      const cities = await locationService.getCitiesByState(stateId);
      res.json(cities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      res.status(500).json({ error: "Failed to fetch cities" });
    }
  });

  // Get areas by city
  app.get('/api/locations/cities/:cityId/areas', async (req, res) => {
    try {
      const { cityId } = req.params;
      const areas = await locationService.getAreasByCity(cityId);
      res.json(areas);
    } catch (error) {
      console.error("Error fetching areas:", error);
      res.status(500).json({ error: "Failed to fetch areas" });
    }
  });

  // Get buildings by area
  app.get('/api/locations/areas/:areaId/buildings', async (req, res) => {
    try {
      const { areaId } = req.params;
      const buildings = await locationService.getBuildingsByArea(areaId);
      res.json(buildings);
    } catch (error) {
      console.error("Error fetching buildings:", error);
      res.status(500).json({ error: "Failed to fetch buildings" });
    }
  });

  // Get building with full location hierarchy
  app.get('/api/locations/buildings/:buildingId', async (req, res) => {
    try {
      const { buildingId } = req.params;
      const building = await locationService.getBuildingWithLocation(buildingId);
      
      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }
      
      res.json(building);
    } catch (error) {
      console.error("Error fetching building:", error);
      res.status(500).json({ error: "Failed to fetch building" });
    }
  });

  // Filter locations with multiple criteria
  app.post('/api/locations/filter', async (req, res) => {
    try {
      const filterOptions = req.body;
      const results = await locationService.filterLocations(filterOptions);
      res.json(results);
    } catch (error) {
      console.error("Error filtering locations:", error);
      res.status(500).json({ error: "Failed to filter locations" });
    }
  });

  // Get popular locations
  app.get('/api/locations/popular', async (req, res) => {
    try {
      const { limit = "10" } = req.query;
      const locations = await locationService.getPopularLocations(parseInt(limit as string));
      res.json(locations);
    } catch (error) {
      console.error("Error fetching popular locations:", error);
      res.status(500).json({ error: "Failed to fetch popular locations" });
    }
  });

  // Get location suggestions for autocomplete (by type)
  app.get('/api/locations/suggestions', async (req, res) => {
    try {
      const { q: query, type } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const validTypes = ['city', 'area', 'building'];
      const locationType = type && validTypes.includes(type as string) 
        ? type as 'city' | 'area' | 'building' 
        : undefined;

      const suggestions = await locationService.getLocationSuggestions(query, locationType);
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
      res.status(500).json({ error: "Failed to fetch location suggestions" });
    }
  });

  // Geocode address using location database
  app.get('/api/locations/geocode', async (req, res) => {
    try {
      const { address } = req.query;
      
      if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: "Address parameter is required" });
      }

      const coordinates = await locationService.geocodeAddress(address);
      
      if (!coordinates) {
        return res.status(404).json({ error: "Location not found" });
      }
      
      res.json(coordinates);
    } catch (error) {
      console.error("Error geocoding address:", error);
      res.status(500).json({ error: "Failed to geocode address" });
    }
  });

  // Add new building (for agents and verified users)
  app.post('/api/locations/buildings', async (req, res) => {
    try {
      const buildingData = req.body;
      const building = await locationService.addBuilding(buildingData);
      res.status(201).json(building);
    } catch (error) {
      console.error("Error adding building:", error);
      res.status(500).json({ error: "Failed to add building" });
    }
  });

  // Add recommendations routes
  app.use('/api/recommendations', recommendationsRouter);
  
  // Add transport stations routes
  app.use('/api/transport-stations', transportStationsRouter);

  // Add geospatial search routes
  app.use('/api/search', geospatialSearchRouter);

  // ==================== ANALYTICS & PERFORMANCE ROUTES ====================
  
  const analyticsService = new AnalyticsService();

  // Cache management routes
  app.post('/api/cache/clear-location', async (req, res) => {
    try {
      const { locationName } = req.body;
      const { clearCachedLocation, clearNegativeCachedLocations } = await import('./services/aiCache');
      
      if (locationName === "all-negative") {
        clearNegativeCachedLocations();
        res.json({ 
          success: true, 
          message: "All negatively cached locations cleared" 
        });
      } else if (locationName) {
        const existed = clearCachedLocation(locationName);
        res.json({ 
          success: true, 
          message: existed 
            ? `Cleared cached location: ${locationName}`
            : `Location ${locationName} was not in cache`
        });
      } else {
        res.status(400).json({ error: "locationName is required" });
      }
    } catch (error) {
      console.error("Error clearing location cache:", error);
      res.status(500).json({ error: "Failed to clear location cache" });
    }
  });

  // Property Performance Metrics
  app.get('/api/analytics/property/:propertyId/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId } = req.params;
      const { startDate, endDate } = req.query;
      
      const metrics = await analyticsService.getPropertyMetrics(
        propertyId, 
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching property metrics:", error);
      res.status(500).json({ error: "Failed to fetch property metrics" });
    }
  });


  // Market Analytics
  app.get('/api/analytics/market', async (req, res) => {
    try {
      const { area, propertyType, year, month } = req.query;
      
      const analytics = await analyticsService.getMarketAnalytics(
        area as string,
        propertyType as string,
        year ? parseInt(year as string) : undefined,
        month ? parseInt(month as string) : undefined
      );
      
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching market analytics:", error);
      res.status(500).json({ error: "Failed to fetch market analytics" });
    }
  });

  // Lead Generation Reports
  app.get('/api/analytics/leads', isAuthenticated, async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      
      const reports = await analyticsService.getLeadGenerationReports(
        agentId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );
      
      res.json(reports);
    } catch (error) {
      console.error("Error fetching lead reports:", error);
      res.status(500).json({ error: "Failed to fetch lead reports" });
    }
  });


  // Track Property Views
  app.post('/api/analytics/track/view', async (req, res) => {
    try {
      const { propertyId } = req.body;
      await analyticsService.trackPropertyView(propertyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking property view:", error);
      res.status(500).json({ error: "Failed to track view" });
    }
  });

  // Track Inquiries
  app.post('/api/analytics/track/inquiry', async (req, res) => {
    try {
      const { propertyId } = req.body;
      await analyticsService.trackPropertyInquiry(propertyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking inquiry:", error);
      res.status(500).json({ error: "Failed to track inquiry" });
    }
  });

  // ==================== INQUIRY MANAGEMENT ROUTES ====================

  // Get all inquiries for agent
  app.get('/api/inquiries', isAuthenticated, async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;
      const { status, priority, limit = "50" } = req.query;
      
      const inquiries = await storage.getInquiries(agentId, {
        status: status as string,
        priority: priority as string,
        limit: parseInt(limit as string)
      });
      
      res.json(inquiries);
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      res.status(500).json({ error: "Failed to fetch inquiries" });
    }
  });

  // Create new inquiry (requires authentication)
  app.post('/api/inquiries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId, message } = req.body;
      
      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get property to find the agent
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      // Create inquiry with user details
      const inquiryData = {
        propertyId,
        agentId: property.agentId,
        clientName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        clientEmail: user.email,
        clientPhone: null, // users table doesn't have phone field
        message: message || `Interested in ${property.title}`,
        status: 'new',
        source: 'website',
        priority: 'medium'
      };
      
      const inquiry = await storage.createInquiry(inquiryData);
      res.status(201).json(inquiry);
    } catch (error) {
      console.error("Error creating inquiry:", error);
      res.status(500).json({ error: "Failed to create inquiry" });
    }
  });

  // Update inquiry
  app.put('/api/inquiries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const agentId = req.user.claims.sub;
      
      const updatedInquiry = await storage.updateInquiry(id, req.body, agentId);
      
      if (!updatedInquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      res.json(updatedInquiry);
    } catch (error) {
      console.error("Error updating inquiry:", error);
      res.status(500).json({ error: "Failed to update inquiry" });
    }
  });


  // ==================== CALENDAR & APPOINTMENTS ROUTES ====================

  app.get('/api/calendar/events', isAuthenticated, async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;
      const { startDate, endDate, eventType } = req.query;
      
      const events = await storage.getCalendarEvents(agentId, {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        eventType: eventType as string
      });
      
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  app.post('/api/calendar/events', isAuthenticated, async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;
      const validatedData = insertCalendarEventSchema.parse({
        ...req.body,
        agentId
      });
      
      const event = await storage.createCalendarEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  });

  app.put('/api/calendar/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const agentId = req.user.claims.sub;
      
      const updatedEvent = await storage.updateCalendarEvent(id, req.body, agentId);
      
      if (!updatedEvent) {
        return res.status(404).json({ error: "Calendar event not found" });
      }
      
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating calendar event:", error);
      res.status(500).json({ error: "Failed to update calendar event" });
    }
  });

  // ==================== SAVED SEARCHES ROUTES ====================

  app.get('/api/saved-searches', isAuthenticated, async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;
      const savedSearches = await storage.getSavedSearches(agentId);
      res.json(savedSearches);
    } catch (error) {
      console.error("Error fetching saved searches:", error);
      res.status(500).json({ error: "Failed to fetch saved searches" });
    }
  });

  app.post('/api/saved-searches', isAuthenticated, async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;
      const validatedData = insertSavedSearchSchema.parse({
        ...req.body,
        agentId
      });
      
      const savedSearch = await storage.createSavedSearch(validatedData);
      res.status(201).json(savedSearch);
    } catch (error) {
      console.error("Error creating saved search:", error);
      res.status(500).json({ error: "Failed to create saved search" });
    }
  });

  app.delete('/api/saved-searches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const agentId = req.user.claims.sub;
      
      const deleted = await storage.deleteSavedSearch(id, agentId);
      if (!deleted) {
        return res.status(404).json({ error: "Saved search not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting saved search:", error);
      res.status(500).json({ error: "Failed to delete saved search" });
    }
  });

  // ==================== NOTIFICATIONS ROUTES ====================

  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;
      const { isRead, priority, limit = "50" } = req.query;
      
      const notifications = await storage.getNotifications(agentId, {
        isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
        priority: priority as string,
        limit: parseInt(limit as string)
      });
      
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const agentId = req.user.claims.sub;
      
      const updated = await storage.markNotificationAsRead(id, agentId);
      if (!updated) {
        return res.status(404).json({ error: "Notification not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  app.put('/api/notifications/mark-all-read', isAuthenticated, async (req: any, res) => {
    try {
      const agentId = req.user.claims.sub;
      await storage.markAllNotificationsAsRead(agentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to update notifications" });
    }
  });

  // Simple geocoding endpoint for PropertyMapPicker (Malaysia-only)
  app.get('/api/geocode', async (req, res) => {
    try {
      const { address } = req.query;
      
      if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: "Address parameter is required" });
      }

      // Use our Malaysian locations database only
      const coords = await enhancedGeocodingService.getLocationCoordinates(address);
      
      if (coords) {
        res.json({
          lat: coords.lat,
          lng: coords.lng,
          address: address,
          displayAddress: address
        });
      } else {
        res.status(404).json({ error: "Location not found in Malaysia database" });
      }
    } catch (error) {
      console.error("Error geocoding:", error);
      res.status(500).json({ error: "Failed to geocode location" });
    }
  });

  // Simple reverse geocoding endpoint for PropertyMapPicker
  app.get('/api/reverse-geocode', async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: "lat and lng parameters are required" });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }

      // Try OpenRouteService reverse geocoding via openrouteService
      try {
        const { openRouteService } = await import('./services/openrouteService');
        const address = await openRouteService.reverseGeocode(latitude, longitude);
        if (address) {
          res.json({ address });
        } else {
          // Fallback to coordinate display
          res.json({ address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` });
        }
      } catch (error) {
        // Fallback to coordinate display
        res.json({ address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` });
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      res.status(500).json({ error: "Failed to reverse geocode location" });
    }
  });

  // Comprehensive Data Import Route
  app.post('/api/admin/import-comprehensive-data', async (req, res) => {
    try {
      console.log('🚀 Starting comprehensive data import...');
      
      // Import the service dynamically to avoid circular imports
      const { ComprehensiveDataImporter } = await import('./services/comprehensiveDataImporter.js');
      const importer = new ComprehensiveDataImporter();
      
      const result = await importer.importAllData();
      
      console.log('✅ Import completed:', result);
      res.json({
        success: true,
        message: `Successfully imported ${result.imported} properties from all CSV sources`,
        details: result
      });
    } catch (error) {
      console.error('❌ Comprehensive import failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to import comprehensive data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // API Usage Statistics Endpoint
  app.get('/api/admin/api-usage-stats', isAuthenticated, async (req: any, res) => {
    try {
      const { service, days } = req.query;
      const startDate = days ? new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000) : undefined;
      
      const stats = await storage.getApiUsageStats(
        service as string | undefined,
        startDate,
        new Date()
      );
      
      res.json(stats);
    } catch (error) {
      console.error('Error getting API usage stats:', error);
      res.status(500).json({ error: 'Failed to get API usage statistics' });
    }
  });

  // CSV Import Routes for data.gov.my integration
  const csvImportRoutes = await import('./routes/csvImportRoutes');
  app.use('/api/csv-import', csvImportRoutes.default);

  const httpServer = createServer(app);
  return httpServer;
}
