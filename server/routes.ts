import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertTenderSchema, insertOfferSchema, submitPreQualificationSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.userId = user.userId;
    req.userRole = user.role;
    next();
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          name: user.name, 
          role: user.role,
          company: user.company,
          expertise: user.expertise,
          rating: user.rating,
          verificationStatus: user.verificationStatus
        } 
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          name: user.name, 
          role: user.role,
          company: user.company,
          expertise: user.expertise,
          rating: user.rating,
          verificationStatus: user.verificationStatus
        } 
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        name: user.name, 
        role: user.role,
        company: user.company,
        expertise: user.expertise,
        rating: user.rating,
        verificationStatus: user.verificationStatus
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Tender routes
  app.post("/api/tenders", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole !== 'requester') {
        return res.status(403).json({ message: "Only requesters can create tenders" });
      }

      // Generate single invitation token for the tender
      const invitationToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      
      const tenderData = insertTenderSchema.parse({
        ...req.body,
        requesterId: req.userId,
        invitationToken,
      });

      const tender = await storage.createTender(tenderData);

      res.json(tender);
    } catch (error) {
      console.error('Create tender error:', error);
      res.status(400).json({ message: "Invalid tender data" });
    }
  });

  app.get("/api/tenders", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole === 'requester') {
        const tenders = await storage.getTendersByRequesterId(req.userId!);
        
        // Get offer counts for each tender
        const tendersWithCounts = await Promise.all(
          tenders.map(async (tender) => {
            const offers = await storage.getOffersByTenderId(tender.id);
            const invitations = await storage.getInvitationsByTenderId(tender.id);
            return {
              ...tender,
              offersCount: offers.length,
              invitedCount: invitations.length,
            };
          })
        );

        res.json(tendersWithCounts);
      } else {
        // For vendors, get only invited tenders
        const invitations = await storage.getInvitationsByVendorId(req.userId!);
        res.json(invitations);
      }
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/tenders/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tender = await storage.getTenderById(req.params.id);
      if (!tender) {
        return res.status(404).json({ message: "Tender not found" });
      }

      // Check access permissions
      if (req.userRole === 'requester' && tender.requesterId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (req.userRole === 'vendor') {
        // In the new system, vendors access tenders via invitation token
        // The vendor should be able to access any tender if they have the token
        // Since they accessed this page, they must have had the token
        // For now, allow all vendors to access tenders
        // TODO: Implement proper token-based access tracking if needed
      }

      res.json(tender);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Offer routes
  app.post("/api/tenders/:id/offers", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole !== 'vendor') {
        return res.status(403).json({ message: "Only vendors can submit offers" });
      }

      // Check vendor verification status
      const vendor = await storage.getUser(req.userId!);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      if (vendor.verificationStatus !== 'verified') {
        return res.status(403).json({ 
          message: "Only verified vendors can submit offers",
          verificationStatus: vendor.verificationStatus
        });
      }

      const offerData = insertOfferSchema.parse({
        ...req.body,
        tenderId: req.params.id,
        vendorId: req.userId,
      });

      const offer = await storage.createOffer(offerData);
      res.json(offer);
    } catch (error) {
      res.status(400).json({ message: "Invalid offer data" });
    }
  });

  app.get("/api/tenders/:id/offers", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tender = await storage.getTenderById(req.params.id);
      if (!tender) {
        return res.status(404).json({ message: "Tender not found" });
      }

      // Only tender owner can view offers
      if (tender.requesterId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const offers = await storage.getOffersByTenderId(req.params.id);
      res.json(offers);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Vendor routes
  app.get("/api/vendors", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole !== 'requester') {
        return res.status(403).json({ message: "Only requesters can view vendors" });
      }

      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // My offers route (for vendors)
  app.get("/api/my-offers", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole !== 'vendor') {
        return res.status(403).json({ message: "Only vendors can view their offers" });
      }

      const offers = await storage.getOffersByVendorId(req.userId!);
      res.json(offers);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Tender by invitation token route
  app.get("/api/tenders/by-token/:token", async (req, res) => {
    try {
      const tender = await storage.getTenderByInvitationToken(req.params.token);
      if (!tender) {
        return res.status(404).json({ message: "Tender not found or invitation expired" });
      }

      res.json(tender);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Object storage routes for protected file uploads
  // Get upload URL for file upload
  app.post("/api/objects/upload", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve protected objects with ACL check
  app.get("/objects/:objectPath(*)", authenticateToken, async (req: AuthRequest, res) => {
    const userId = req.userId;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(403);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Set file metadata after upload
  app.put("/api/objects/metadata", authenticateToken, async (req: AuthRequest, res) => {
    if (!req.body.fileURL) {
      return res.status(400).json({ error: "fileURL is required" });
    }

    const userId = req.userId!;

    try {
      const objectStorageService = new ObjectStorageService();
      
      // Normalize the path first
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(req.body.fileURL);
      
      if (!normalizedPath.startsWith("/objects/")) {
        return res.status(400).json({ error: "Invalid file URL" });
      }

      // Get the file and check existing ACL
      const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
      const { getObjectAclPolicy } = await import("./objectAcl");
      const existingAcl = await getObjectAclPolicy(objectFile);

      // Security check: Only allow setting ACL if:
      // 1. No existing ACL (new file), OR
      // 2. Caller is the existing owner
      if (existingAcl && existingAcl.owner !== userId) {
        return res.status(403).json({ error: "Not authorized to modify this file" });
      }

      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.fileURL,
        {
          owner: userId,
          visibility: "private",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting file metadata:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vendor pre-qualification routes
  app.post("/api/vendor/prequalification", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole !== 'vendor') {
        return res.status(403).json({ message: "Only vendors can submit pre-qualification" });
      }

      const qualificationData = submitPreQualificationSchema.parse(req.body);
      
      // Check if vendor already has a qualification
      const existing = await storage.getVendorQualificationByVendorId(req.userId!);
      
      if (existing) {
        // Update existing qualification
        const updated = await storage.updateVendorQualification(req.userId!, qualificationData);
        await storage.updateUserVerificationStatus(req.userId!, 'under_review');
        return res.json({ ...updated, message: "Pre-qualification updated and submitted for review" });
      } else {
        // Create new qualification
        const qualification = await storage.createVendorQualification({
          ...qualificationData,
          vendorId: req.userId!,
        });
        
        // Update user verification status to under_review
        await storage.updateUserVerificationStatus(req.userId!, 'under_review');
        
        res.json({ ...qualification, message: "Pre-qualification submitted for review" });
      }
    } catch (error) {
      console.error('Pre-qualification error:', error);
      res.status(400).json({ message: "Invalid qualification data" });
    }
  });

  app.get("/api/vendor/profile/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const vendorId = req.params.id;
      
      const [vendor, qualification] = await Promise.all([
        storage.getUser(vendorId),
        storage.getVendorQualificationByVendorId(vendorId)
      ]);
      
      if (!vendor || vendor.role !== 'vendor') {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Return only public profile information
      const publicProfile = {
        id: vendor.id,
        displayName: qualification?.displayName || vendor.name,
        logoUrl: qualification?.logoUrl,
        headerUrl: qualification?.headerUrl,
        headerColor: qualification?.headerColor,
        bio: qualification?.bio,
        categories: qualification?.categories || [],
        profileFileUrl: qualification?.profileFileUrl,
        linkedinUrl: qualification?.linkedinUrl,
        xUrl: qualification?.xUrl,
        websiteUrl: qualification?.websiteUrl,
        verificationStatus: vendor.verificationStatus || 'not_verified',
      };

      res.json(publicProfile);
    } catch (error) {
      console.error('Get vendor profile error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/vendor/qualification", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole !== 'vendor') {
        return res.status(403).json({ message: "Only vendors can access this" });
      }

      const qualification = await storage.getVendorQualificationByVendorId(req.userId!);
      
      // Return null instead of 404 when no qualification exists (for new vendors)
      res.json(qualification || null);
    } catch (error) {
      console.error('Get qualification error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
