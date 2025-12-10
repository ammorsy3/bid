import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { 
  registerUserSchema,
  createCompanySchema,
  updateCompanyProfileSchema,
  createTenderSchema,
  createOfferSchema,
  createJoinRequestSchema
} from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface JWTPayload {
  userId: string;
  activeCompanyId: string | null;  // null for admins without active company
  roleInCompany: string | null;    // null for admins
  isAdmin: boolean;
}

interface AuthContext {
  userId: string;
  activeCompanyId: string | null;
  roleInCompany: string | null;
  isAdmin: boolean;
}

interface AuthRequest extends Request {
  auth?: AuthContext;
}

// ============================================================================
// MIDDLEWARE - AUTHENTICATION & AUTHORIZATION
// ============================================================================

// Middleware: Authenticate JWT and attach auth context
const authenticateToken = async (req: AuthRequest, res: Response, next: Function) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Verify user exists
    const user = await storage.getUser(payload.userId);
    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }

    // Attach auth context
    req.auth = {
      userId: payload.userId,
      activeCompanyId: payload.activeCompanyId,
      roleInCompany: payload.roleInCompany,
      isAdmin: user.isAdmin
    };

    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Middleware: Require active company context
const requireCompanyContext = (req: AuthRequest, res: Response, next: Function) => {
  if (!req.auth?.activeCompanyId) {
    return res.status(400).json({ 
      message: 'No active company. Please select a company first.',
      requiresCompany: true
    });
  }
  next();
};

// Middleware: Require admin access (platform-level)
const requireAdmin = (req: AuthRequest, res: Response, next: Function) => {
  if (!req.auth?.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Middleware: Require minimum company role
const requireCompanyRole = (minRole: 'owner' | 'admin' | 'member' | 'viewer') => {
  const roleHierarchy: Record<string, number> = {
    'owner': 4,
    'admin': 3,
    'member': 2,
    'viewer': 1
  };

  return async (req: AuthRequest, res: Response, next: Function) => {
    if (!req.auth?.activeCompanyId || !req.auth.roleInCompany) {
      return res.status(403).json({ message: 'Company access required' });
    }

    // Revalidate membership (protect against stale JWT)
    const currentRole = await storage.getUserRoleInCompany(
      req.auth.userId,
      req.auth.activeCompanyId
    );

    if (!currentRole) {
      return res.status(403).json({ 
        message: 'You no longer have access to this company',
        requiresCompany: true
      });
    }

    // Check role hierarchy
    const userRoleLevel = roleHierarchy[currentRole] || 0;
    const requiredRoleLevel = roleHierarchy[minRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({ 
        message: `This action requires ${minRole} role or higher` 
      });
    }

    next();
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Generate slug from company name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// Generate JWT token
const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ==========================================================================
  // AUTH ROUTES
  // ==========================================================================

  // Register user (creates user account only, no company)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerUserSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        isAdmin: false
      });

      // For now, return token with no active company (user needs to create/join one)
      const token = generateToken({
        userId: user.id,
        activeCompanyId: null,
        roleInCompany: null,
        isAdmin: false
      });

      res.json({ 
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin
        },
        companies: [] // Empty - user needs to create or join
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  // Login
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

      // Get user's companies
      const userCompanies = await storage.getUserCompanies(user.id);

      // Default to first company (owner > admin > member > viewer)
      const sortedCompanies = userCompanies.sort((a, b) => {
        const roleOrder: Record<string, number> = { owner: 4, admin: 3, member: 2, viewer: 1 };
        return (roleOrder[b.roleInCompany] || 0) - (roleOrder[a.roleInCompany] || 0);
      });

      const defaultCompany = sortedCompanies[0];

      // Generate token
      const token = generateToken({
        userId: user.id,
        activeCompanyId: defaultCompany?.companyId || null,
        roleInCompany: defaultCompany?.roleInCompany || null,
        isAdmin: user.isAdmin
      });

      res.json({ 
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin
        },
        activeCompany: defaultCompany ? {
          id: defaultCompany.company.id,
          name: defaultCompany.company.name,
          slug: defaultCompany.company.slug,
          legalName: defaultCompany.company.legalName,
          crNumber: defaultCompany.company.crNumber,
          vatNumber: defaultCompany.company.vatNumber,
          city: defaultCompany.company.city,
          category: defaultCompany.company.category,
          verificationStatus: defaultCompany.company.verificationStatus,
          onboardingState: defaultCompany.company.onboardingState,
          role: defaultCompany.roleInCompany,
          profile: defaultCompany.profile || null
        } : null,
        companies: userCompanies.map(uc => ({
          id: uc.company.id,
          name: uc.company.name,
          slug: uc.company.slug,
          legalName: uc.company.legalName,
          crNumber: uc.company.crNumber,
          vatNumber: uc.company.vatNumber,
          city: uc.company.city,
          category: uc.company.category,
          verificationStatus: uc.company.verificationStatus,
          onboardingState: uc.company.onboardingState,
          role: uc.roleInCompany,
          profile: uc.profile || null
        }))
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get current user + companies
  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userCompanies = await storage.getUserCompanies(user.id);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin
        },
        activeCompanyId: req.auth!.activeCompanyId,
        companies: userCompanies.map(uc => ({
          id: uc.company.id,
          name: uc.company.name,
          slug: uc.company.slug,
          legalName: uc.company.legalName,
          crNumber: uc.company.crNumber,
          vatNumber: uc.company.vatNumber,
          city: uc.company.city,
          category: uc.company.category,
          verificationStatus: uc.company.verificationStatus,
          onboardingState: uc.company.onboardingState,
          role: uc.roleInCompany,
          profile: uc.profile || null
        }))
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==========================================================================
  // USER PROFILE ROUTES
  // ==========================================================================

  // Update user profile (name)
  app.patch("/api/user/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { name } = req.body;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Name is required" });
      }

      const user = await storage.getUser(req.auth!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUser(req.auth!.userId, { name: name.trim() });

      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error('Update user profile error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Upload user profile picture
  app.post("/api/user/profile-picture", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Profile pictures are not currently stored - return success
      // Future: implement profile picture storage
      res.json({ message: "Profile picture upload functionality coming soon" });
    } catch (error) {
      console.error('Upload profile picture error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update company profile (active company from auth context)
  app.patch("/api/company/profile", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const companyId = req.auth!.activeCompanyId!;
      const { displayName, bio } = req.body;

      // Verify user has admin access
      const role = req.auth!.roleInCompany;
      if (role !== 'owner' && role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Update profile
      const profile = await storage.getCompanyProfile(companyId);
      if (!profile) {
        return res.status(404).json({ message: "Company profile not found" });
      }

      await storage.updateCompanyProfile(companyId, {
        displayName: displayName || profile.displayName,
        bio: bio !== undefined ? bio : profile.bio
      });

      res.json({ message: "Company profile updated successfully" });
    } catch (error) {
      console.error('Update company profile error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Upload company logo
  app.post("/api/company/logo", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      // Company logos are not currently stored - return success
      // Future: implement company logo storage
      res.json({ message: "Company logo upload functionality coming soon" });
    } catch (error) {
      console.error('Upload company logo error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==========================================================================
  // COMPANY ROUTES
  // ==========================================================================

  // Create company (and auto-add creator as owner)
  app.post("/api/companies", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const companyData = createCompanySchema.parse(req.body);
      
      // Check CR number uniqueness
      const existingCompany = await storage.getCompanyByCrNumber(companyData.crNumber);
      if (existingCompany) {
        return res.status(400).json({ message: "A company with this CR number already exists" });
      }

      // Generate unique slug
      let slug = generateSlug(companyData.name);
      let slugSuffix = 1;
      while (await storage.getCompanyBySlug(slug)) {
        slug = `${generateSlug(companyData.name)}-${slugSuffix}`;
        slugSuffix++;
      }

      // Create company
      const company = await storage.createCompany({
        ...companyData,
        slug,
        verificationStatus: 'under_review',
        onboardingState: 'draft'
      });

      // Create default profile
      const profile = await storage.createCompanyProfile({
        companyId: company.id,
        displayName: companyData.name,
        bio: null,
        tags: [],
        logoUrl: null,
        headerUrl: null,
        brochureUrl: null,
        socialLinks: {},
        isPublic: false,
        tractionSlug: null
      });

      // Add user as owner
      await storage.addUserToCompany({
        userId: req.auth!.userId,
        companyId: company.id,
        roleInCompany: 'owner',
        invitedBy: null
      });

      // Generate new token with active company
      const token = generateToken({
        userId: req.auth!.userId,
        activeCompanyId: company.id,
        roleInCompany: 'owner',
        isAdmin: req.auth!.isAdmin
      });

      // Log event
      await storage.logProductEvent({
        eventType: 'company_created',
        companyId: company.id,
        userId: req.auth!.userId,
        metadata: { verificationStatus: 'under_review' }
      });

      res.json({
        token, // New token with active company
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          verificationStatus: company.verificationStatus,
          onboardingState: company.onboardingState,
          role: 'owner',
          profile
        }
      });
    } catch (error) {
      console.error('Create company error:', error);
      res.status(400).json({ message: "Invalid company data" });
    }
  });

  // Switch active company
  app.post("/api/companies/switch/:companyId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { companyId } = req.params;

      // Verify user has access to this company
      const role = await storage.getUserRoleInCompany(req.auth!.userId, companyId);
      if (!role) {
        return res.status(403).json({ message: "You don't have access to this company" });
      }

      // Get company details
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const profile = await storage.getCompanyProfile(companyId);

      // Generate new token with new active company
      const token = generateToken({
        userId: req.auth!.userId,
        activeCompanyId: companyId,
        roleInCompany: role,
        isAdmin: req.auth!.isAdmin
      });

      res.json({
        token,
        activeCompany: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          verificationStatus: company.verificationStatus,
          onboardingState: company.onboardingState,
          role,
          profile: profile || null
        }
      });
    } catch (error) {
      console.error('Switch company error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get company profile
  app.get("/api/companies/:companyId/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { companyId } = req.params;

      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const profile = await storage.getCompanyProfile(companyId);

      res.json({
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          legalName: company.legalName,
          category: company.category,
          city: company.city,
          verificationStatus: company.verificationStatus
        },
        profile: profile || null
      });
    } catch (error) {
      console.error('Get company profile error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update company profile (and company details if provided)
  app.put("/api/companies/:companyId/profile", 
    authenticateToken, 
    requireCompanyRole('admin'),
    async (req: AuthRequest, res) => {
      try {
        const { companyId } = req.params;

        // Ensure user is updating their own company
        if (companyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Access denied" });
        }

        const { displayName, bio, legalName, crNumber, vatNumber, city, category } = req.body;

        // Get current company
        const company = await storage.getCompany(companyId);
        if (!company) {
          return res.status(404).json({ message: "Company not found" });
        }

        // Check if profile exists
        const existingProfile = await storage.getCompanyProfile(companyId);
        if (!existingProfile) {
          return res.status(404).json({ message: "Company profile not found" });
        }

        // Check CR number uniqueness if it's being changed
        if (crNumber && crNumber !== company.crNumber) {
          const existingCompany = await storage.getCompanyByCrNumber(crNumber);
          if (existingCompany) {
            return res.status(400).json({ message: "A company with this CR number already exists" });
          }
        }

        // Determine if legal identity fields are changing
        const legalFieldsChanged = 
          (legalName && legalName !== company.legalName) ||
          (crNumber && crNumber !== company.crNumber) ||
          (vatNumber && vatNumber !== company.vatNumber);

        // Update company fields if provided
        const companyUpdates: any = {};
        if (legalName) companyUpdates.legalName = legalName;
        if (crNumber) companyUpdates.crNumber = crNumber;
        if (vatNumber !== undefined) companyUpdates.vatNumber = vatNumber;
        if (city) companyUpdates.city = city;
        if (category) companyUpdates.category = category;

        // Mark onboarding as completed if it was draft
        if (company.onboardingState === 'draft') {
          companyUpdates.onboardingState = 'completed';
        }

        // Reset verification if legal identity changed
        if (legalFieldsChanged && company.verificationStatus === 'verified') {
          companyUpdates.verificationStatus = 'under_review';
          
          // Log event for verification reset
          await storage.logProductEvent({
            eventType: 'company_updated',
            companyId,
            userId: req.auth!.userId,
            metadata: { 
              verificationReset: true,
              reason: 'legal_identity_changed'
            }
          });
        }

        // Update company if there are changes
        if (Object.keys(companyUpdates).length > 0) {
          await storage.updateCompany(companyId, companyUpdates);
        }

        // Update profile
        const profileUpdates: any = {};
        if (displayName) profileUpdates.displayName = displayName;
        if (bio !== undefined) profileUpdates.bio = bio;

        const profile = await storage.updateCompanyProfile(companyId, profileUpdates);

        res.json(profile);
      } catch (error) {
        console.error('Update company profile error:', error);
        res.status(400).json({ message: "Invalid profile data" });
      }
    }
  );

  // ==========================================================================
  // TENDER ROUTES
  // ==========================================================================

  // Create tender
  app.post("/api/tenders",
    authenticateToken,
    requireCompanyContext,
    requireCompanyRole('admin'),
    async (req: AuthRequest, res) => {
      try {
        const tenderData = createTenderSchema.parse(req.body);

        // Generate invitation token
        const invitationToken = Math.random().toString(36).substring(2) + 
                                Math.random().toString(36).substring(2);

        const tender = await storage.createTender({
          ...tenderData,
          companyId: req.auth!.activeCompanyId!,
          createdBy: req.auth!.userId,
          invitationToken,
          allowConditionalSubmission: false,
          status: 'published'
        });

        res.json(tender);
      } catch (error) {
        console.error('Create tender error:', error);
        res.status(400).json({ message: "Invalid tender data" });
      }
    }
  );

  // Get company tenders
  app.get("/api/tenders",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const tenders = await storage.getTendersByCompany(req.auth!.activeCompanyId!);

        // Get offer counts for each tender
        const tendersWithCounts = await Promise.all(
          tenders.map(async (tender) => {
            const offers = await storage.getOffersByTender(tender.id);
            const invitations = await storage.getInvitationsByTender(tender.id);
            return {
              ...tender,
              offersCount: offers.length,
              invitedCount: invitations.length
            };
          })
        );

        res.json(tendersWithCounts);
      } catch (error) {
        console.error('Get tenders error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get tender by ID
  app.get("/api/tenders/:id",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const tender = await storage.getTender(req.params.id);
        if (!tender) {
          return res.status(404).json({ message: "Tender not found" });
        }

        // Check access - either company owner or invited vendor
        // For now, allow any authenticated user (TODO: implement proper access control)

        res.json(tender);
      } catch (error) {
        console.error('Get tender error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get tender by invitation token (public endpoint for vendors)
  app.get("/api/tenders/by-token/:token", async (req, res) => {
    try {
      const tender = await storage.getTenderByInvitationToken(req.params.token);
      if (!tender) {
        return res.status(404).json({ message: "Tender not found or invitation expired" });
      }

      res.json(tender);
    } catch (error) {
      console.error('Get tender by token error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get tender for invitation page (public endpoint)
  app.get("/api/tenders/:id/invite", async (req, res) => {
    try {
      const tender = await storage.getTender(req.params.id);
      if (!tender) {
        return res.status(404).json({ message: "Tender not found" });
      }

      // Only show published tenders
      if (tender.status !== 'published' && tender.status !== 'draft') {
        return res.status(404).json({ message: "Tender not available" });
      }

      // Get company info
      const company = await storage.getCompany(tender.companyId);
      const profile = company ? await storage.getCompanyProfile(company.id) : null;

      // Return only public information
      res.json({
        id: tender.id,
        title: tender.title,
        description: tender.description,
        budget: tender.budget,
        budgetRange: tender.budgetRange,
        deadline: tender.deadline,
        duration: tender.duration,
        status: tender.status,
        voiceNoteUrl: tender.voiceNoteUrl,
        videoUrl: tender.videoUrl,
        projectTimeline: tender.projectTimeline,
        company: company ? {
          id: company.id,
          name: company.name
        } : null,
        profile: profile ? {
          displayName: profile.displayName
        } : null
      });
    } catch (error) {
      console.error('Get tender invite error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update tender
  app.patch("/api/tenders/:id",
    authenticateToken,
    requireCompanyContext,
    requireCompanyRole('admin'),
    async (req: AuthRequest, res) => {
      try {
        const tender = await storage.getTender(req.params.id);
        if (!tender) {
          return res.status(404).json({ message: "Tender not found" });
        }

        // Verify ownership
        if (tender.companyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Only allow editing draft or published tenders (not closed/cancelled)
        if (!['draft', 'published'].includes(tender.status)) {
          return res.status(400).json({ message: "Cannot edit closed or cancelled tenders" });
        }

        const updates = createTenderSchema.partial().parse(req.body);
        const updatedTender = await storage.updateTender(req.params.id, updates);
        res.json(updatedTender);
      } catch (error) {
        console.error('Update tender error:', error);
        res.status(400).json({ message: "Invalid tender data" });
      }
    }
  );

  // Update tender status
  app.patch("/api/tenders/:id/status",
    authenticateToken,
    requireCompanyContext,
    requireCompanyRole('admin'),
    async (req: AuthRequest, res) => {
      try {
        const tender = await storage.getTender(req.params.id);
        if (!tender) {
          return res.status(404).json({ message: "Tender not found" });
        }

        // Verify ownership
        if (tender.companyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Access denied" });
        }

        const { status } = req.body;
        if (!['draft', 'published', 'closed', 'cancelled'].includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }

        // Validate status transitions
        const validTransitions: Record<string, string[]> = {
          'draft': ['published', 'cancelled'],
          'published': ['draft', 'closed', 'cancelled'],
          'closed': [],
          'cancelled': []
        };

        if (!validTransitions[tender.status]?.includes(status)) {
          return res.status(400).json({ 
            message: `Cannot transition from ${tender.status} to ${status}` 
          });
        }

        await storage.updateTenderStatus(req.params.id, status);
        res.json({ success: true });
      } catch (error) {
        console.error('Update tender status error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Delete tender
  app.delete("/api/tenders/:id",
    authenticateToken,
    requireCompanyContext,
    requireCompanyRole('admin'),
    async (req: AuthRequest, res) => {
      try {
        const tender = await storage.getTender(req.params.id);
        if (!tender) {
          return res.status(404).json({ message: "Tender not found" });
        }

        // Verify ownership
        if (tender.companyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Access denied" });
        }

        await storage.deleteTender(req.params.id);
        res.json({ success: true });
      } catch (error) {
        console.error('Delete tender error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // ==========================================================================
  // OFFER ROUTES
  // ==========================================================================

  // Submit offer
  app.post("/api/tenders/:id/offers",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const company = await storage.getCompany(req.auth!.activeCompanyId!);
        if (!company) {
          return res.status(404).json({ message: "Company not found" });
        }

        // Check verification status - allow verified and under_review
        if (company.verificationStatus !== 'verified' && company.verificationStatus !== 'under_review') {
          return res.status(403).json({ 
            message: "Company must complete profile and submit for verification to submit proposals",
            verificationStatus: company.verificationStatus
          });
        }

        const offerData = createOfferSchema.parse(req.body);

        const offer = await storage.createOffer({
          ...offerData,
          tenderId: req.params.id,
          companyId: req.auth!.activeCompanyId!,
          createdBy: req.auth!.userId,
          conditionalSubmission: false
        });

        // Log event
        await storage.logProductEvent({
          eventType: 'proposal_submitted',
          companyId: req.auth!.activeCompanyId!,
          userId: req.auth!.userId,
          metadata: { tenderId: req.params.id }
        });

        res.json(offer);
      } catch (error) {
        console.error('Submit offer error:', error);
        res.status(400).json({ message: "Invalid offer data" });
      }
    }
  );

  // Get tender offers (for tender owner)
  app.get("/api/tenders/:id/offers",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const tender = await storage.getTender(req.params.id);
        if (!tender) {
          return res.status(404).json({ message: "Tender not found" });
        }

        // Only tender owner can view offers
        if (tender.companyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Access denied" });
        }

        const offers = await storage.getOffersByTender(req.params.id);
        res.json(offers);
      } catch (error) {
        console.error('Get offers error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get company's offer for a specific tender
  app.get("/api/tenders/:id/my-offer",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const offer = await storage.getOfferByTenderAndCompany(
          req.params.id,
          req.auth!.activeCompanyId!
        );
        res.json(offer || null);
      } catch (error) {
        console.error('Get my offer error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get company's submitted offers
  app.get("/api/my-offers",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const offers = await storage.getOffersByCompany(req.auth!.activeCompanyId!);
        res.json(offers);
      } catch (error) {
        console.error('Get my offers error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get incoming offers on company's tenders
  app.get("/api/my-tenders/offers",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const offers = await storage.getIncomingOffersByCompany(req.auth!.activeCompanyId!);
        res.json(offers);
      } catch (error) {
        console.error('Get incoming offers error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Update offer status (accept/reject)
  app.patch("/api/offers/:offerId/status",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const { offerId } = req.params;
        const { status } = req.body;
        
        if (!['accepted', 'rejected', 'pending'].includes(status)) {
          return res.status(400).json({ message: "Invalid status. Must be 'accepted', 'rejected', or 'pending'" });
        }
        
        // Get the offer with tender info to verify ownership
        const offerResults = await storage.getIncomingOffersByCompany(req.auth!.activeCompanyId!);
        const offer = offerResults.find(o => o.id === offerId);
        
        if (!offer) {
          return res.status(404).json({ message: "Offer not found or you don't have access" });
        }
        
        const updatedOffer = await storage.updateOfferStatus(offerId, status, req.auth!.userId);
        
        // When accepting a proposal, automatically add the vendor to the Vendors Base
        if (status === 'accepted') {
          const isAlreadyInBase = await storage.isVendorInBase(req.auth!.activeCompanyId!, offer.companyId);
          
          if (!isAlreadyInBase) {
            await storage.addVendorToBase({
              requesterCompanyId: req.auth!.activeCompanyId!,
              vendorCompanyId: offer.companyId,
              joinMethod: 'proposal_accepted',
              addedBy: req.auth!.userId
            });
            
            // Log vendor added event
            await storage.logProductEvent({
              eventType: 'vendor_added_from_proposal',
              companyId: req.auth!.activeCompanyId!,
              userId: req.auth!.userId,
              metadata: { vendorCompanyId: offer.companyId, offerId, tenderId: offer.tenderId }
            });
          }
        }
        
        // Log event
        await storage.logProductEvent({
          eventType: status === 'accepted' ? 'proposal_accepted' : 'proposal_rejected',
          companyId: req.auth!.activeCompanyId!,
          userId: req.auth!.userId,
          metadata: { offerId, tenderId: offer.tenderId, status }
        });
        
        res.json(updatedOffer);
      } catch (error) {
        console.error('Update offer status error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // ==========================================================================
  // VENDORS BASE ROUTES
  // ==========================================================================

  // Get vendors in base
  app.get("/api/vendors-base",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const searchQuery = req.query.search as string | undefined;
        const vendors = await storage.getVendorsInBase(req.auth!.activeCompanyId!, searchQuery);

        // Log event
        await storage.logProductEvent({
          eventType: 'vendors_base_viewed',
          companyId: req.auth!.activeCompanyId!,
          userId: req.auth!.userId,
          metadata: { searchQuery: searchQuery || null }
        });

        // Transform to flat format expected by frontend
        const formattedVendors = vendors.map(v => ({
          id: v.id,
          companyId: v.vendorCompanyId,
          company: v.profile?.displayName || v.vendorCompany.name,
          legalName: v.vendorCompany.legalName,
          category: v.vendorCompany.category || 'No category',
          city: v.vendorCompany.city,
          crNumber: v.vendorCompany.crNumber,
          vatNumber: v.vendorCompany.vatNumber,
          bio: v.profile?.bio || '',
          logoUrl: v.profile?.logoUrl || null,
          email: '', // Contact email would come from user if needed
          verificationStatus: v.vendorCompany.verificationStatus,
          joinMethod: v.joinMethod,
          joinedAt: v.addedAt
        }));

        res.json(formattedVendors);
      } catch (error) {
        console.error('Get vendors base error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // ==========================================================================
  // JOIN REQUEST ROUTES
  // ==========================================================================

  // Get join requests (for requester company)
  app.get("/api/join-requests",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const status = req.query.status as string | undefined;
        const requests = await storage.getJoinRequestsByRequester(req.auth!.activeCompanyId!, status);
        res.json(requests);
      } catch (error) {
        console.error('Get join requests error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get pending join requests count
  app.get("/api/join-requests/pending-count",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const count = await storage.getPendingJoinRequestsCount(req.auth!.activeCompanyId!);
        res.json({ count });
      } catch (error) {
        console.error('Get pending count error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Approve join request
  app.post("/api/join-requests/:id/approve",
    authenticateToken,
    requireCompanyContext,
    requireCompanyRole('admin'),
    async (req: AuthRequest, res) => {
      try {
        const { id } = req.params;
        const joinRequest = await storage.getJoinRequestById(id);
        
        if (!joinRequest) {
          return res.status(404).json({ message: "Join request not found" });
        }

        if (joinRequest.requesterCompanyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Check if vendor already in base
        const alreadyInBase = await storage.isVendorInBase(
          req.auth!.activeCompanyId!,
          joinRequest.vendorCompanyId
        );
        if (alreadyInBase) {
          return res.status(400).json({ message: "Vendor already in your base" });
        }

        // Update join request
        const updated = await storage.updateJoinRequestStatus(id, 'approved', req.auth!.userId);

        // Add to vendors base
        await storage.addVendorToBase({
          requesterCompanyId: req.auth!.activeCompanyId!,
          vendorCompanyId: joinRequest.vendorCompanyId,
          joinMethod: 'traction',
          addedBy: req.auth!.userId
        });

        // Log event
        await storage.logProductEvent({
          eventType: 'join_request_decided',
          companyId: req.auth!.activeCompanyId!,
          userId: req.auth!.userId,
          metadata: { status: 'APPROVED', joinRequestId: id }
        });

        res.json({ ...updated, message: "Vendor approved and added to your base" });
      } catch (error) {
        console.error('Approve join request error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Reject join request
  app.post("/api/join-requests/:id/reject",
    authenticateToken,
    requireCompanyContext,
    requireCompanyRole('admin'),
    async (req: AuthRequest, res) => {
      try {
        const { id } = req.params;
        const joinRequest = await storage.getJoinRequestById(id);
        
        if (!joinRequest) {
          return res.status(404).json({ message: "Join request not found" });
        }

        if (joinRequest.requesterCompanyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Access denied" });
        }

        const updated = await storage.updateJoinRequestStatus(id, 'rejected', req.auth!.userId);

        // Log event
        await storage.logProductEvent({
          eventType: 'join_request_decided',
          companyId: req.auth!.activeCompanyId!,
          userId: req.auth!.userId,
          metadata: { status: 'REJECTED', joinRequestId: id }
        });

        res.json({ ...updated, message: "Join request rejected" });
      } catch (error) {
        console.error('Reject join request error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // ==========================================================================
  // TRACTION LINK ROUTES (PUBLIC)
  // ==========================================================================

  // Get traction link (public)
  app.get("/api/r/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const result = await storage.getCompanyProfileByTractionSlug(slug);
      
      if (!result) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Log event
      await storage.logProductEvent({
        eventType: 'traction_link_opened',
        companyId: result.company.id,
        userId: null,
        metadata: { slug }
      });

      res.json({
        company: {
          id: result.company.id,
          name: result.company.name,
          category: result.company.category
        },
        profile: {
          displayName: result.displayName,
          bio: result.bio,
          logoUrl: result.logoUrl,
          socialLinks: result.socialLinks
        }
      });
    } catch (error) {
      console.error('Get traction link error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Apply via traction link
  app.post("/api/r/:slug/apply",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const { slug } = req.params;
        const result = await storage.getCompanyProfileByTractionSlug(slug);
        
        if (!result) {
          return res.status(404).json({ message: "Company not found" });
        }

        // Check for duplicate join request
        const existingRequest = await storage.getJoinRequestByCompanies(
          req.auth!.activeCompanyId!,
          result.company.id
        );
        
        if (existingRequest && existingRequest.createdAt) {
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          if (new Date(existingRequest.createdAt) > dayAgo) {
            return res.status(400).json({ 
              message: "You already submitted a join request to this company within the last 24 hours" 
            });
          }
        }

        // Create join request
        const joinRequest = await storage.createJoinRequest({
          requesterCompanyId: result.company.id,
          vendorCompanyId: req.auth!.activeCompanyId!,
          createdBy: req.auth!.userId,
          status: 'pending',
          rejectionReason: null,
          decidedBy: null
        });

        // Log event
        await storage.logProductEvent({
          eventType: 'join_request_submitted',
          companyId: req.auth!.activeCompanyId!,
          userId: req.auth!.userId,
          metadata: { slug, requesterCompanyId: result.company.id }
        });

        res.json({ 
          ...joinRequest, 
          message: "Request sent to " + result.company.name 
        });
      } catch (error) {
        console.error('Submit join request error:', error);
        res.status(400).json({ message: "Failed to submit join request" });
      }
    }
  );

  // ==========================================================================
  // OBJECT STORAGE ROUTES
  // ==========================================================================

  // Get upload URL
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
    const userId = req.auth!.userId;
    const activeCompanyId = req.auth!.activeCompanyId;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      let canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      
      const filePath = req.path;
      
      // If standard ACL check fails, check if user's company owns a tender 
      // that has a proposal with this file
      if (!canAccess && activeCompanyId) {
        const offerWithFile = await storage.getOfferByFileUrl(filePath);
        if (offerWithFile) {
          const tender = await storage.getTender(offerWithFile.tenderId);
          if (tender && tender.companyId === activeCompanyId) {
            canAccess = true;
          }
        }
      }
      
      // Check if this is a voice note attached to a tender (any authenticated user can access)
      if (!canAccess) {
        const tenderWithVoice = await storage.getTenderByVoiceNoteUrl(filePath);
        if (tenderWithVoice) {
          // Allow access to published tender voice notes
          if (tenderWithVoice.status === 'published') {
            canAccess = true;
          }
          // Or if user's company owns the tender
          if (activeCompanyId && tenderWithVoice.companyId === activeCompanyId) {
            canAccess = true;
          }
        }
      }
      
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

    const userId = req.auth!.userId;

    try {
      const objectStorageService = new ObjectStorageService();
      
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(req.body.fileURL);
      
      if (!normalizedPath.startsWith("/objects/")) {
        return res.status(400).json({ error: "Invalid file URL" });
      }

      const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
      const { getObjectAclPolicy } = await import("./objectAcl");
      const existingAcl = await getObjectAclPolicy(objectFile);

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

  // ==========================================================================
  // ADMIN ROUTES
  // ==========================================================================

  // Get admin dashboard metrics
  app.get("/api/admin/metrics", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const metrics = await storage.getAdminMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Get admin metrics error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get pending companies for verification
  app.get("/api/admin/companies/pending", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const companies = await storage.getCompaniesWithPendingVerification();
      res.json(companies);
    } catch (error) {
      console.error('Get pending companies error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Verify company
  app.post("/api/admin/companies/:companyId/verify", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { companyId } = req.params;
      const { notes } = req.body;
      await storage.verifyCompany(companyId, req.auth!.userId, notes);
      res.json({ message: "Company verified successfully" });
    } catch (error) {
      console.error('Verify company error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Reject company
  app.post("/api/admin/companies/:companyId/reject", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { companyId } = req.params;
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      await storage.rejectCompany(companyId, reason, req.auth!.userId);
      res.json({ message: "Company rejected" });
    } catch (error) {
      console.error('Reject company error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get all join requests (admin view)
  app.get("/api/admin/join-requests", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { status } = req.query;
      const joinRequests = await storage.getAllJoinRequests(status as string | undefined);
      res.json(joinRequests);
    } catch (error) {
      console.error('Get join requests error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get blocked awards
  app.get("/api/admin/awards/blocked", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const awards = await storage.getBlockedAwards();
      res.json(awards);
    } catch (error) {
      console.error('Get blocked awards error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Unblock award
  app.post("/api/admin/awards/:awardId/unblock", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { awardId } = req.params;
      await storage.unblockAward(awardId, req.auth!.userId);
      res.json({ message: "Award unblocked successfully" });
    } catch (error: any) {
      console.error('Unblock award error:', error);
      res.status(error.message?.includes('not verified') ? 400 : 500)
        .json({ message: error.message || "Server error" });
    }
  });

  // Get audit logs
  app.get("/api/admin/audit-logs", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { limit } = req.query;
      const logs = await storage.getAuditLogs(limit ? parseInt(limit as string) : 50);
      res.json(logs);
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Promote user to admin
  app.post("/api/admin/users/:userId/promote", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      
      const userBefore = await storage.getUser(userId);
      if (!userBefore) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (userBefore.isAdmin) {
        return res.status(400).json({ message: "User is already an admin" });
      }
      
      const user = await storage.makeUserAdmin(userId);
      
      await storage.logAuditAction({
        adminId: req.auth!.userId,
        action: 'user_promoted_to_admin',
        targetType: 'user',
        targetId: userId,
        beforeState: JSON.stringify({ isAdmin: false }),
        afterState: JSON.stringify({ isAdmin: true }),
        notes: null
      });

      res.json({ message: "User promoted to admin", user });
    } catch (error) {
      console.error('Promote user error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
