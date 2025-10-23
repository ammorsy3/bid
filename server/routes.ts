import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { 
  insertUserSchema, 
  insertTenderSchema, 
  insertOfferSchema, 
  submitPreQualificationSchema, 
  submitRequesterProfileSchema,
  submitJoinRequestSchema,
  createInvitationLinkSchema
} from "@shared/schema";
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

      // Check if requester has completed their profile
      const profile = await storage.getRequesterProfileByRequesterId(req.userId!);
      if (!profile) {
        return res.status(403).json({ 
          message: "Please complete your profile before creating tenders",
          requiresProfile: true
        });
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

      // Allow both verified and under_review vendors to submit offers
      if (vendor.verificationStatus !== 'verified' && vendor.verificationStatus !== 'under_review') {
        return res.status(403).json({ 
          message: "Please complete pre-qualification to submit offers",
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
        bio: qualification?.bio,
        category: qualification?.category,
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

  // Helper function to generate traction slug from company name
  const generateTractionSlug = (companyName: string): string => {
    return companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  // Requester profile routes
  app.post("/api/requester/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole !== 'requester') {
        return res.status(403).json({ message: "Only requesters can create profiles" });
      }

      const profileData = submitRequesterProfileSchema.parse(req.body);
      
      // Check if requester already has a profile
      const existing = await storage.getRequesterProfileByRequesterId(req.userId!);
      
      if (existing) {
        // Update existing profile (keep existing slug)
        const updated = await storage.updateRequesterProfile(req.userId!, profileData);
        return res.json({ ...updated, message: "Profile updated successfully" });
      } else {
        // Generate unique traction slug from company name
        let tractionSlug = generateTractionSlug(profileData.companyName);
        let slugSuffix = 1;
        
        // Ensure slug is unique
        while (await storage.getRequesterProfileByTractionSlug(tractionSlug)) {
          tractionSlug = `${generateTractionSlug(profileData.companyName)}-${slugSuffix}`;
          slugSuffix++;
        }

        // Create new profile with traction slug
        const profile = await storage.createRequesterProfile({
          ...profileData,
          requesterId: req.userId!,
          tractionSlug,
        });
        
        res.json({ ...profile, message: "Profile created successfully" });
      }
    } catch (error) {
      console.error('Requester profile error:', error);
      res.status(400).json({ message: "Invalid profile data" });
    }
  });

  app.get("/api/requester/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole !== 'requester') {
        return res.status(403).json({ message: "Only requesters can access this" });
      }

      const profile = await storage.getRequesterProfileByRequesterId(req.userId!);
      
      // Return null instead of 404 when no profile exists (for new requesters)
      res.json(profile || null);
    } catch (error) {
      console.error('Get requester profile error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Public endpoint for viewing requester profile (accessible by vendors)
  app.get("/api/requester/profile/:requesterId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { requesterId } = req.params;
      const profile = await storage.getRequesterProfileByRequesterId(requesterId);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      res.json(profile);
    } catch (error) {
      console.error('Get public requester profile error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Vendors Base routes
  app.get("/api/vendors-base", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole !== 'requester') {
        return res.status(403).json({ message: "Only requesters can access vendors base" });
      }

      const searchQuery = req.query.search as string | undefined;
      const vendors = await storage.getVendorsInBase(req.userId!, searchQuery);
      
      // Log analytics event
      await storage.logAnalyticsEvent({
        eventType: 'vendors_base_viewed',
        requesterId: req.userId!,
        metadata: JSON.stringify({ searchQuery: searchQuery || null })
      });

      res.json(vendors);
    } catch (error) {
      console.error('Get vendors base error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Join Requests routes
  app.get("/api/join-requests", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole !== 'requester') {
        return res.status(403).json({ message: "Only requesters can view join requests" });
      }

      const status = req.query.status as string | undefined;
      const requests = await storage.getJoinRequestsByRequesterId(req.userId!, status);
      
      res.json(requests);
    } catch (error) {
      console.error('Get join requests error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/join-requests/pending-count", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole !== 'requester') {
        return res.status(403).json({ message: "Only requesters can view join requests" });
      }

      const count = await storage.getPendingJoinRequestsCount(req.userId!);
      res.json({ count });
    } catch (error) {
      console.error('Get pending count error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/join-requests/:id/approve", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole !== 'requester') {
        return res.status(403).json({ message: "Only requesters can approve join requests" });
      }

      const { id } = req.params;
      const joinRequest = await storage.getJoinRequestById(id);
      
      if (!joinRequest) {
        return res.status(404).json({ message: "Join request not found" });
      }

      if (joinRequest.requesterId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if vendor already in base
      if (joinRequest.vendorId) {
        const alreadyInBase = await storage.isVendorInBase(req.userId!, joinRequest.vendorId);
        if (alreadyInBase) {
          return res.status(400).json({ message: "Vendor already in your base" });
        }
      }

      // Update join request status
      const updated = await storage.updateJoinRequestStatus(id, 'approved');

      // Add vendor to base if they have an account
      if (joinRequest.vendorId) {
        await storage.addVendorToBase({
          requesterId: req.userId!,
          vendorId: joinRequest.vendorId,
          joinMethod: 'traction'
        });
      }

      // Log analytics event
      await storage.logAnalyticsEvent({
        eventType: 'join_request_decided',
        requesterId: req.userId!,
        vendorId: joinRequest.vendorId || undefined,
        metadata: JSON.stringify({ status: 'APPROVED', joinRequestId: id })
      });

      res.json({ ...updated, message: "Join request approved" });
    } catch (error) {
      console.error('Approve join request error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/join-requests/:id/reject", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole !== 'requester') {
        return res.status(403).json({ message: "Only requesters can reject join requests" });
      }

      const { id } = req.params;
      const joinRequest = await storage.getJoinRequestById(id);
      
      if (!joinRequest) {
        return res.status(404).json({ message: "Join request not found" });
      }

      if (joinRequest.requesterId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update join request status
      const updated = await storage.updateJoinRequestStatus(id, 'rejected');

      // Log analytics event
      await storage.logAnalyticsEvent({
        eventType: 'join_request_decided',
        requesterId: req.userId!,
        vendorId: joinRequest.vendorId || undefined,
        metadata: JSON.stringify({ status: 'REJECTED', joinRequestId: id })
      });

      res.json({ ...updated, message: "Join request rejected" });
    } catch (error) {
      console.error('Reject join request error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Traction Link routes (public)
  app.get("/api/r/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const profile = await storage.getRequesterProfileByTractionSlug(slug);
      
      if (!profile) {
        return res.status(404).json({ message: "Requester not found" });
      }

      // Get requester user info
      const requester = await storage.getUser(profile.requesterId);
      if (!requester) {
        return res.status(404).json({ message: "Requester not found" });
      }

      // Log analytics event
      await storage.logAnalyticsEvent({
        eventType: 'traction_link_opened',
        requesterId: profile.requesterId,
        metadata: JSON.stringify({ slug })
      });

      res.json({
        requester: {
          id: requester.id,
          name: requester.name,
          company: requester.company
        },
        profile: {
          companyName: profile.companyName,
          industry: profile.industry,
          bio: profile.bio,
          logoUrl: profile.logoUrl,
          websiteUrl: profile.websiteUrl,
          linkedinUrl: profile.linkedinUrl
        }
      });
    } catch (error) {
      console.error('Get traction link error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/r/:slug/apply", async (req, res) => {
    try {
      const { slug } = req.params;
      const profile = await storage.getRequesterProfileByTractionSlug(slug);
      
      if (!profile) {
        return res.status(404).json({ message: "Requester not found" });
      }

      const applicationData = submitJoinRequestSchema.parse(req.body);
      
      // Check if vendor with this email exists
      const vendor = await storage.getUserByEmail(applicationData.contactEmail);

      // Create join request
      const joinRequest = await storage.createJoinRequest({
        ...applicationData,
        requesterId: profile.requesterId,
        vendorId: vendor?.id || null,
      });

      // Log analytics event
      await storage.logAnalyticsEvent({
        eventType: 'join_request_submitted',
        requesterId: profile.requesterId,
        vendorId: vendor?.id || undefined,
        metadata: JSON.stringify({ 
          slug, 
          contactEmail: applicationData.contactEmail,
          companyName: applicationData.companyName
        })
      });

      res.json({ 
        ...joinRequest, 
        message: "Your request was sent. We'll notify you if approved." 
      });
    } catch (error) {
      console.error('Submit join request error:', error);
      res.status(400).json({ message: "Invalid application data" });
    }
  });

  // Invitation Link routes
  app.post("/api/invitation-links", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole !== 'requester') {
        return res.status(403).json({ message: "Only requesters can create invitation links" });
      }

      const linkData = createInvitationLinkSchema.parse(req.body);
      
      // Generate unique token
      const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

      // Create invitation link
      const invitationLink = await storage.createInvitationLink({
        ...linkData,
        requesterId: req.userId!,
        token,
      });

      // Log analytics event
      await storage.logAnalyticsEvent({
        eventType: 'invitation_link_created',
        requesterId: req.userId!,
        metadata: JSON.stringify({ 
          vendorEmail: linkData.vendorEmail,
          tenderId: linkData.tenderId || null
        })
      });

      res.json({ 
        ...invitationLink, 
        invitationUrl: `${req.protocol}://${req.get('host')}/vendor-invitation/${token}`
      });
    } catch (error) {
      console.error('Create invitation link error:', error);
      res.status(400).json({ message: "Invalid invitation data" });
    }
  });

  app.get("/api/invitation-links/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const invitationLink = await storage.getInvitationLinkByToken(token);
      
      if (!invitationLink) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitationLink.status !== 'pending') {
        return res.status(400).json({ 
          message: invitationLink.status === 'accepted' ? "Invitation already accepted" : "Invitation expired" 
        });
      }

      // Check tender deadline if linked to tender
      if (invitationLink.tender) {
        const deadline = new Date(invitationLink.tender.deadline);
        if (deadline < new Date()) {
          // Mark as expired
          await storage.updateInvitationLinkStatus(invitationLink.id, 'expired');
          return res.status(400).json({ message: "Invitation expired (tender deadline passed)" });
        }
      }

      // Log analytics event
      await storage.logAnalyticsEvent({
        eventType: 'invitation_link_opened',
        requesterId: invitationLink.requesterId,
        metadata: JSON.stringify({ token })
      });

      res.json({
        requester: {
          id: invitationLink.requester.id,
          name: invitationLink.requester.name,
          company: invitationLink.requester.company
        },
        vendorEmail: invitationLink.vendorEmail,
        tender: invitationLink.tender ? {
          id: invitationLink.tender.id,
          title: invitationLink.tender.title,
          deadline: invitationLink.tender.deadline
        } : null
      });
    } catch (error) {
      console.error('Get invitation link error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/invitation-links/:token/accept", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.userRole !== 'vendor') {
        return res.status(403).json({ message: "Only vendors can accept invitations" });
      }

      const { token } = req.params;
      const invitationLink = await storage.getInvitationLinkByToken(token);
      
      if (!invitationLink) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitationLink.status !== 'pending') {
        return res.status(400).json({ 
          message: invitationLink.status === 'accepted' ? "Invitation already accepted" : "Invitation expired" 
        });
      }

      // Check tender deadline if linked to tender
      if (invitationLink.tender) {
        const deadline = new Date(invitationLink.tender.deadline);
        if (deadline < new Date()) {
          // Mark as expired
          await storage.updateInvitationLinkStatus(invitationLink.id, 'expired');
          return res.status(400).json({ message: "Invitation expired (tender deadline passed)" });
        }
      }

      // Get vendor email
      const vendor = await storage.getUser(req.userId!);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Verify email matches
      if (vendor.email !== invitationLink.vendorEmail) {
        return res.status(403).json({ message: "This invitation was sent to a different email address" });
      }

      // Check if vendor already in base
      const alreadyInBase = await storage.isVendorInBase(invitationLink.requesterId, req.userId!);
      if (!alreadyInBase) {
        // Add vendor to base
        await storage.addVendorToBase({
          requesterId: invitationLink.requesterId,
          vendorId: req.userId!,
          joinMethod: 'invitation'
        });

        // Log analytics event
        await storage.logAnalyticsEvent({
          eventType: 'vendor_added_to_base',
          requesterId: invitationLink.requesterId,
          vendorId: req.userId!,
          metadata: JSON.stringify({ method: 'INVITATION', token })
        });
      }

      // Update invitation link status
      await storage.updateInvitationLinkStatus(invitationLink.id, 'accepted');

      res.json({ 
        message: "You're now in the requester's Vendors Base. Welcome!",
        requester: {
          id: invitationLink.requester.id,
          name: invitationLink.requester.name,
          company: invitationLink.requester.company
        }
      });
    } catch (error) {
      console.error('Accept invitation link error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
