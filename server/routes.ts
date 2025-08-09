import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertTenderSchema, insertOfferSchema } from "@shared/schema";

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
          rating: user.rating
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
          rating: user.rating
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
        rating: user.rating
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
        const invitations = await storage.getInvitationsByTenderId(tender.id);
        const hasInvitation = invitations.some(inv => inv.vendorId === req.userId);
        if (!hasInvitation) {
          return res.status(403).json({ message: "Access denied" });
        }
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

      // Verify vendor has invitation
      const invitations = await storage.getInvitationsByTenderId(req.params.id);
      const hasInvitation = invitations.some(inv => inv.vendorId === req.userId);
      if (!hasInvitation) {
        return res.status(403).json({ message: "No invitation found" });
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

  const httpServer = createServer(app);
  return httpServer;
}
