import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import {
  registerUserSchema,
  createCompanySchema,
  updateCompanyProfileSchema,
  createTenderSchema,
  createOfferSchema,
  createJoinRequestSchema,
  createTenderTemplateSchema,
  VENDOR_CATEGORIES
} from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { registerCopilotRoutes } from "./replit_integrations/copilot";
import {
  sendNewOfferNotification,
  sendOfferDecisionNotification,
  sendAwardNotification,
  sendNegotiationActionNotification,
  sendTenderStatusNotification,
  sendTenderCreatedNotification,
  sendTenderClosedToVendorsNotification,
  sendTenderQuestionNotification,
  sendTenderAnswerNotification,
  sendCompanyVerificationNotification,
  sendJoinRequestNotification,
  sendJoinRequestDecisionNotification,
  sendVerificationOTP,
  sendTeamInviteEmail,
  sendPasswordResetEmail,
} from "./email";

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

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
// AI HELPERS
// ============================================================================

async function suggestTenderCategory(tender: {
  title?: string;
  description?: string;
  objective?: string;
  skills?: string[];
  deliverables?: any[];
}): Promise<string | null> {
  const config = getOpenAIConfig();
  if (!config) return null;

  const categoryList = VENDOR_CATEGORIES.join(", ");
  const context = [
    tender.title && `Title: ${tender.title}`,
    tender.description && `Description: ${tender.description}`,
    tender.objective && `Objective: ${tender.objective}`,
    tender.skills?.length && `Skills: ${tender.skills.join(", ")}`,
    tender.deliverables?.length && `Deliverables: ${tender.deliverables.map((d: any) => typeof d === 'string' ? d : d.name).filter(Boolean).join(", ")}`,
  ].filter(Boolean).join("\n");

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a procurement specialist. Given an RFP brief, pick the single best-matching category from this list:\n${categoryList}\n\nRespond with ONLY the exact category name from the list, nothing else.`,
          },
          { role: "user", content: context },
        ],
        temperature: 0.2,
        max_tokens: 30,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const suggested = data.choices?.[0]?.message?.content?.trim();
    return (VENDOR_CATEGORIES as readonly string[]).includes(suggested) ? suggested : null;
  } catch {
    return null;
  }
}

// Resolve OpenAI API endpoint and key.
// Uses OPENAI_API_KEY directly.
function getOpenAIConfig(): { url: string; key: string } | null {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return { url: "https://api.openai.com/v1/chat/completions", key: openaiKey };
  }
  return null;
}

// Translate an array of texts to the target language using OpenAI gpt-4o.
// Returns the translated strings in the same order, or the originals on failure.
async function translateTexts(texts: string[], targetLanguage: 'en' | 'ar'): Promise<string[]> {
  const config = getOpenAIConfig();
  if (!config || texts.length === 0) return texts;

  const langName = targetLanguage === 'ar' ? 'Arabic' : 'English';
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join('\n');

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional procurement translator. You will receive a numbered list of texts. For each text, detect its language: if it is already in ${langName}, return it unchanged; otherwise translate it to ${langName}. Respond ONLY with the same numbered list preserving numbering and order. Do not add any commentary.`,
          },
          { role: "user", content: numbered },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      console.error('Translation API error:', response.status, await response.text().catch(() => ''));
      return texts;
    }
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';

    // Parse "N. text" lines back into array
    const results: string[] = [...texts]; // fallback to originals
    const lines = raw.split('\n');
    let currentIdx = -1;
    let currentLines: string[] = [];

    const flush = () => {
      if (currentIdx >= 0 && currentIdx < results.length) {
        results[currentIdx] = currentLines.join('\n').trim();
      }
    };

    for (const line of lines) {
      const match = line.match(/^(\d+)\.\s*(.*)/);
      if (match) {
        flush();
        currentIdx = parseInt(match[1], 10) - 1;
        currentLines = [match[2]];
      } else if (currentIdx >= 0) {
        currentLines.push(line);
      }
    }
    flush();

    return results;
  } catch {
    return texts;
  }
}

// Build translatedContent for a tender in BOTH directions (en + ar).
// Handles mixed-language content by letting the AI detect each field's language.
// Returns { en: { title, description, ... }, ar: { title, description, ... } }
async function buildTenderTranslation(tender: any): Promise<Record<string, Record<string, string>> | null> {
  const keys: string[] = [];
  const texts: string[] = [];

  if (tender.title) { keys.push('title'); texts.push(tender.title); }
  if (tender.description) { keys.push('description'); texts.push(tender.description); }
  if (tender.objective) { keys.push('objective'); texts.push(tender.objective); }
  if (tender.category) { keys.push('category'); texts.push(tender.category); }

  if (Array.isArray(tender.deliverables)) {
    tender.deliverables.forEach((d: any, i: number) => {
      const name = typeof d === 'string' ? d : d?.name;
      if (name) { keys.push(`deliverable_name_${i}`); texts.push(name); }
      if (typeof d !== 'string' && d?.description) {
        keys.push(`deliverable_desc_${i}`); texts.push(d.description);
      }
    });
  }

  if (Array.isArray(tender.milestones)) {
    tender.milestones.forEach((m: any, i: number) => {
      if (m?.name) { keys.push(`milestone_name_${i}`); texts.push(m.name); }
      if (m?.description) { keys.push(`milestone_desc_${i}`); texts.push(m.description); }
    });
  }

  if (Array.isArray(tender.vendorRequirements)) {
    tender.vendorRequirements.forEach((r: any, i: number) => {
      if (r?.text) { keys.push(`vendor_req_${i}`); texts.push(r.text); }
    });
  }

  if (Array.isArray(tender.skills)) {
    tender.skills.forEach((s: string, i: number) => {
      if (s) { keys.push(`skill_${i}`); texts.push(s); }
    });
  }

  if (Array.isArray(tender.formCards)) {
    tender.formCards.forEach((c: any, i: number) => {
      if (c?.label) { keys.push(`card_label_${i}`); texts.push(c.label); }
      if (typeof c?.value === 'string' && c.value) {
        keys.push(`card_value_${i}`); texts.push(c.value);
      }
    });
  }

  if (texts.length === 0) return null;

  // Translate to both languages in parallel
  const [enTranslated, arTranslated] = await Promise.all([
    translateTexts(texts, 'en'),
    translateTexts(texts, 'ar'),
  ]);

  const enMap: Record<string, string> = {};
  const arMap: Record<string, string> = {};
  keys.forEach((key, idx) => {
    enMap[key] = enTranslated[idx] || texts[idx];
    arMap[key] = arTranslated[idx] || texts[idx];
  });

  return { en: enMap, ar: arMap };
}

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
      const username = userData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Math.random().toString(36).slice(2, 7);
      const user = await storage.createUser({
        ...userData,
        username,
        password: hashedPassword,
        isAdmin: false
      });

      // Domain-based auto-join: check if another company already has members with the same domain
      const FREE_EMAIL_DOMAINS = new Set([
        'gmail.com','yahoo.com','hotmail.com','outlook.com','live.com',
        'icloud.com','me.com','aol.com','protonmail.com','mail.com',
        'yandex.com','zoho.com','gmx.com','msn.com','hotmail.co.uk',
        'yahoo.co.uk','yahoo.co.in','rediffmail.com'
      ]);
      const emailDomain = userData.email.split('@')[1].toLowerCase();
      let autoJoinedCompany = null;

      if (!FREE_EMAIL_DOMAINS.has(emailDomain)) {
        try {
          const matchedCompany = await storage.getCompanyByEmailDomain(emailDomain);
          if (matchedCompany) {
            await storage.addUserToCompany({
              userId: user.id,
              companyId: matchedCompany.id,
              roleInCompany: 'member',
              invitedBy: null,
            });
            autoJoinedCompany = matchedCompany;
            console.log(`Auto-join: user ${user.id} (${userData.email}) joined company ${matchedCompany.id} (${matchedCompany.name}) via domain ${emailDomain}`);
            await storage.logProductEvent({
              eventType: 'user_auto_joined',
              companyId: matchedCompany.id,
              userId: user.id,
              metadata: { emailDomain, companyName: matchedCompany.name }
            }).catch(() => {});
          } else {
            console.log(`Auto-join: no company found for domain ${emailDomain}`);
          }
        } catch (autoJoinError) {
          console.error(`Auto-join failed for domain ${emailDomain}:`, autoJoinError);
        }
      }

      const token = generateToken({
        userId: user.id,
        activeCompanyId: autoJoinedCompany?.id ?? null,
        roleInCompany: autoJoinedCompany ? 'member' : null,
        isAdmin: false
      });

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          profilePictureUrl: user.profilePictureUrl,
          jobTitle: user.jobTitle,
          timezone: user.timezone,
          linkedinUrl: user.linkedinUrl,
          phoneNumber: user.phoneNumber,
          emailVerified: user.emailVerified,
          otpVerified: user.otpVerified,
        },
        companies: autoJoinedCompany ? [{
          id: autoJoinedCompany.id,
          name: autoJoinedCompany.name,
          slug: autoJoinedCompany.slug,
          legalName: autoJoinedCompany.legalName,
          crNumber: autoJoinedCompany.crNumber,
          vatNumber: autoJoinedCompany.vatNumber,
          city: autoJoinedCompany.city,
          category: autoJoinedCompany.category,
          verificationStatus: autoJoinedCompany.verificationStatus,
          onboardingState: autoJoinedCompany.onboardingState,
          role: 'member',
          profile: null
        }] : [],
        autoJoinedCompany: autoJoinedCompany ? {
          id: autoJoinedCompany.id,
          name: autoJoinedCompany.name,
          slug: autoJoinedCompany.slug,
          legalName: autoJoinedCompany.legalName,
          crNumber: autoJoinedCompany.crNumber,
          vatNumber: autoJoinedCompany.vatNumber,
          city: autoJoinedCompany.city,
          category: autoJoinedCompany.category,
          verificationStatus: autoJoinedCompany.verificationStatus,
          onboardingState: autoJoinedCompany.onboardingState,
          role: 'member',
          profile: null
        } : null,
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  // Send OTP verification email
  app.post("/api/auth/send-otp", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.emailVerified && user.otpVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }

      // Rate limit: max 5 OTP requests per 15-minute window
      const now = new Date();
      const windowMs = 15 * 60 * 1000;
      const windowStart = user.otpSendWindowStart ? new Date(user.otpSendWindowStart) : null;
      let sendCount = user.otpSendCount || 0;

      if (!windowStart || now.getTime() - windowStart.getTime() > windowMs) {
        // Window expired — reset
        sendCount = 0;
      }

      if (sendCount >= 5) {
        return res.status(429).json({ message: "Too many requests. Please try again later." });
      }

      // Generate cryptographically secure 6-digit OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP and update rate limit counters
      await storage.updateUser(user.id, {
        emailVerificationCode: otp,
        emailVerificationExpiry: expiry,
        otpSendCount: sendCount + 1,
        otpSendWindowStart: sendCount === 0 ? now : (windowStart || now),
        otpFailedAttempts: 0,
        otpLockedUntil: null as any,
      });

      // Send via Postmark auth stream
      await sendVerificationOTP({
        email: user.email,
        otp,
        recipientName: user.name,
        language: (user.language as 'en' | 'ar') || 'en',
      });

      res.json({ message: "Verification code sent" });
    } catch (error: any) {
      console.error('Send OTP error:', error);
      const message = error?.message?.includes("inactive")
        ? error.message
        : "Failed to send verification code";
      res.status(500).json({ message });
    }
  });

  // Verify OTP
  app.post("/api/auth/verify-otp", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { code, rememberBrowser } = req.body;
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Verification code is required" });
      }

      const user = await storage.getUser(req.auth!.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.emailVerified && user.otpVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }

      // Check if account is locked due to too many failed attempts
      if (user.otpLockedUntil && new Date() < new Date(user.otpLockedUntil)) {
        const remainingMs = new Date(user.otpLockedUntil).getTime() - Date.now();
        const remainingMin = Math.ceil(remainingMs / 60000);
        return res.status(429).json({
          message: `Too many failed attempts. Please try again in ${remainingMin} minute(s).`,
          lockedUntil: user.otpLockedUntil,
        });
      }

      if (!user.emailVerificationCode || !user.emailVerificationExpiry) {
        return res.status(400).json({ message: "No verification code found. Please request a new one." });
      }

      if (new Date() > new Date(user.emailVerificationExpiry)) {
        return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
      }

      if (user.emailVerificationCode !== code) {
        const attempts = (user.otpFailedAttempts || 0) + 1;
        const maxAttempts = 5;

        if (attempts >= maxAttempts) {
          // Lock for 15 minutes after 5 failed attempts
          await storage.updateUser(user.id, {
            otpFailedAttempts: attempts,
            otpLockedUntil: new Date(Date.now() + 15 * 60 * 1000),
            emailVerificationCode: null as any,
            emailVerificationExpiry: null as any,
          });
          return res.status(429).json({
            message: "Too many failed attempts. Your account has been locked for 15 minutes. Please request a new code after.",
          });
        }

        await storage.updateUser(user.id, { otpFailedAttempts: attempts });
        return res.status(400).json({
          message: `Invalid verification code. ${maxAttempts - attempts} attempt(s) remaining.`,
          remainingAttempts: maxAttempts - attempts,
        });
      }

      // Mark email as verified and clear OTP fields
      await storage.updateUser(user.id, {
        emailVerified: true,
        otpVerified: true,
        emailVerificationCode: null as any,
        emailVerificationExpiry: null as any,
        otpFailedAttempts: 0,
        otpLockedUntil: null as any,
      });

      // Generate trusted browser token if requested
      let trustedBrowserToken: string | undefined;
      if (rememberBrowser) {
        trustedBrowserToken = crypto.randomBytes(32).toString('hex');
        await storage.createTrustedBrowser({
          userId: user.id,
          token: trustedBrowserToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });
      }

      res.json({
        message: "Email verified successfully",
        verified: true,
        trustedBrowserToken,
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ message: "Failed to verify code" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, trustedBrowserToken } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if this is a trusted browser — skip OTP if valid
      let skipOtp = false;
      if (trustedBrowserToken) {
        const trusted = await storage.getTrustedBrowser(trustedBrowserToken, user.id);
        if (trusted) {
          skipOtp = true;
        }
      }

      if (skipOtp) {
        // Trusted browser: mark OTP as verified, skip email
        await storage.updateUser(user.id, {
          otpVerified: true,
        });
      } else {
        // Generate cryptographically secure OTP for login verification
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Rate limit: max 5 OTP requests per 15-minute window for login too
        const now = new Date();
        const windowMs = 15 * 60 * 1000;
        const windowStart = user.otpSendWindowStart ? new Date(user.otpSendWindowStart) : null;
        let sendCount = user.otpSendCount || 0;

        if (!windowStart || now.getTime() - windowStart.getTime() > windowMs) {
          sendCount = 0;
        }

        if (sendCount >= 5) {
          return res.status(429).json({ message: "Too many login attempts. Please try again later." });
        }

        // Set otpVerified=false instead of resetting emailVerified — preserves email verification status
        await storage.updateUser(user.id, {
          otpVerified: false,
          emailVerificationCode: otp,
          emailVerificationExpiry: expiry,
          otpFailedAttempts: 0,
          otpLockedUntil: null as any,
          otpSendCount: sendCount + 1,
          otpSendWindowStart: sendCount === 0 ? now : (windowStart || now),
        });

        // Send OTP email — await to ensure delivery before responding
        try {
          await sendVerificationOTP({
            email: user.email,
            otp,
            recipientName: user.name,
            language: (user.language as 'en' | 'ar') || 'en',
          });
        } catch (emailErr) {
          console.error('[Email] Failed to send login OTP:', emailErr);
          return res.status(500).json({ message: "Failed to send verification code. Please try again." });
        }
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
        requiresOTP: !skipOtp,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          profilePictureUrl: user.profilePictureUrl,
          jobTitle: user.jobTitle,
          timezone: user.timezone,
          linkedinUrl: user.linkedinUrl,
          phoneNumber: user.phoneNumber,
          language: user.language || 'en',
          emailVerified: user.emailVerified,
          otpVerified: skipOtp, // true if trusted browser, false until OTP verified
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
          rejectionReason: defaultCompany.company.rejectionReason || null,
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
          rejectionReason: uc.company.rejectionReason || null,
          role: uc.roleInCompany,
          profile: uc.profile || null
        }))
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Forgot password — send reset email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email.toLowerCase().trim());

      // Always respond 200 to prevent email enumeration
      if (!user) {
        return res.json({ message: "If an account exists, a reset email has been sent." });
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.updateUser(user.id, {
        passwordResetToken: token,
        passwordResetExpiry: expiry,
      } as any);

      const domains = process.env.REPLIT_DOMAINS;
      const appBaseUrl = domains ? `https://${domains.split(',')[0]}` : 'https://bidapp.sa';

      try {
        await sendPasswordResetEmail({
          email: user.email,
          resetToken: token,
          recipientName: user.name,
          appBaseUrl,
          language: (user.language as 'en' | 'ar') || 'en',
        });
      } catch (emailErr) {
        console.error('[Email] Failed to send password reset email:', emailErr);
      }

      res.json({ message: "If an account exists, a reset email has been sent." });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Reset password — validate token and set new password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Find user by reset token
      const user = await storage.getUserByPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }
      if (!user.passwordResetExpiry || new Date() > new Date(user.passwordResetExpiry)) {
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      } as any);

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error('Reset password error:', error);
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
          isAdmin: user.isAdmin,
          profilePictureUrl: user.profilePictureUrl,
          jobTitle: user.jobTitle,
          timezone: user.timezone,
          linkedinUrl: user.linkedinUrl,
          phoneNumber: user.phoneNumber,
          language: user.language || 'en',
          emailVerified: user.emailVerified,
          otpVerified: user.otpVerified,
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
          rejectionReason: uc.company.rejectionReason || null,
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

  // Update user profile (name and additional fields)
  app.patch("/api/user/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { name, jobTitle, timezone, linkedinUrl, phoneNumber, language } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Name is required" });
      }

      const user = await storage.getUser(req.auth!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updates: any = { name: name.trim() };
      if (jobTitle !== undefined) updates.jobTitle = jobTitle || null;
      if (timezone !== undefined) updates.timezone = timezone || null;
      if (linkedinUrl !== undefined) updates.linkedinUrl = linkedinUrl || null;
      if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber || null;
      if (language === 'en' || language === 'ar') updates.language = language;

      await storage.updateUser(req.auth!.userId, updates);

      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error('Update user profile error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Save tender inquiry email preference
  app.patch("/api/user/tender-inquiry-email", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { tenderInquiryEmail } = req.body;

      // Validate email format if provided
      if (tenderInquiryEmail && typeof tenderInquiryEmail === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(tenderInquiryEmail)) {
          return res.status(400).json({ message: "Invalid email format" });
        }
      }

      const user = await storage.getUser(req.auth!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUser(req.auth!.userId, {
        tenderInquiryEmail: tenderInquiryEmail || null,
      });

      res.json({
        message: "Tender inquiry email saved successfully",
        tenderInquiryEmail: tenderInquiryEmail || null
      });
    } catch (error) {
      console.error('Save tender inquiry email error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Upload user profile picture
  app.post("/api/user/profile-picture", authenticateToken, upload.single('file'), async (req: AuthRequest, res) => {
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Only jpg, jpeg, png, gif, webp are allowed." });
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
      }

      const objectStorage = new ObjectStorageService();
      
      // Upload to public storage
      const result = await objectStorage.uploadPublicFile({
        buffer: file.buffer,
        folder: 'profile-pictures',
        filename: file.originalname,
        contentType: file.mimetype,
      });
      
      // Update user profile with picture URL
      await storage.updateUser(req.auth!.userId, { profilePictureUrl: result.url });
      
      res.json({ message: "Profile picture uploaded successfully", url: result.url });
    } catch (error) {
      console.error('Upload profile picture error:', error);
      res.status(500).json({ message: "Failed to upload profile picture" });
    }
  });

  // Update company profile (active company from auth context)
  app.patch("/api/company/profile", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const companyId = req.auth!.activeCompanyId!;
      const { displayName, bio, tractionTheme } = req.body;

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

      const updates: any = {
        displayName: displayName || profile.displayName,
        bio: bio !== undefined ? bio : profile.bio
      };
      if (tractionTheme !== undefined) {
        const validThemeIds = ['classic', 'modern', 'bold', 'minimal'];
        const validHeaderStyles = ['clean', 'gradient', 'solid', 'image'];
        const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
        if (tractionTheme && typeof tractionTheme === 'object') {
          if (!validThemeIds.includes(tractionTheme.themeId)) {
            return res.status(400).json({ message: "Invalid theme ID" });
          }
          if (!hexColorRegex.test(tractionTheme.primaryColor) || !hexColorRegex.test(tractionTheme.accentColor)) {
            return res.status(400).json({ message: "Invalid color format. Use #RRGGBB." });
          }
          if (tractionTheme.headerStyle && !validHeaderStyles.includes(tractionTheme.headerStyle)) {
            return res.status(400).json({ message: "Invalid header style" });
          }
          if (tractionTheme.ctaText && tractionTheme.ctaText.length > 50) {
            return res.status(400).json({ message: "CTA text too long (max 50 chars)" });
          }
          if (tractionTheme.welcomeHeading && tractionTheme.welcomeHeading.length > 100) {
            return res.status(400).json({ message: "Welcome heading too long (max 100 chars)" });
          }
          if (tractionTheme.welcomeSubtext && tractionTheme.welcomeSubtext.length > 300) {
            return res.status(400).json({ message: "Welcome subtext too long (max 300 chars)" });
          }
        }
        updates.tractionTheme = tractionTheme;
      }

      await storage.updateCompanyProfile(companyId, updates);

      res.json({ message: "Company profile updated successfully" });
    } catch (error) {
      console.error('Update company profile error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Set/update traction slug
  app.patch("/api/company/traction-slug", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const companyId = req.auth!.activeCompanyId!;
      const role = req.auth!.roleInCompany;
      if (role !== 'owner' && role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { slug } = req.body;
      if (!slug || typeof slug !== 'string') {
        return res.status(400).json({ message: "Slug is required" });
      }

      const sanitized = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (sanitized.length < 2 || sanitized.length > 50) {
        return res.status(400).json({ message: "Slug must be between 2 and 50 characters" });
      }

      const existing = await storage.getCompanyProfileByTractionSlug(sanitized);
      if (existing && existing.companyId !== companyId) {
        return res.status(409).json({ message: "This slug is already taken. Try a different one." });
      }

      await storage.updateCompanyProfile(companyId, { tractionSlug: sanitized });

      res.json({ slug: sanitized, message: "Traction link updated" });
    } catch (error) {
      console.error('Update traction slug error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Upload company header image
  app.post("/api/company/header", authenticateToken, requireCompanyContext, upload.single('file'), async (req: AuthRequest, res) => {
    try {
      const companyId = req.auth!.activeCompanyId!;
      const role = req.auth!.roleInCompany;
      
      if (role !== 'owner' && role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Only jpg, jpeg, png, gif, webp are allowed." });
      }

      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
      }
      
      const objectStorage = new ObjectStorageService();
      
      const result = await objectStorage.uploadPublicFile({
        buffer: file.buffer,
        folder: 'company-headers',
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const isOriginal = req.query.kind === 'original';
      await storage.updateCompanyProfile(
        companyId,
        isOriginal ? { headerOriginalUrl: result.url } : { headerUrl: result.url },
      );

      res.json({ message: "Company header uploaded successfully", url: result.url });
    } catch (error) {
      console.error('Upload company header error:', error);
      res.status(500).json({ message: "Failed to upload company header" });
    }
  });

  app.post("/api/company/logo", authenticateToken, requireCompanyContext, upload.single('file'), async (req: AuthRequest, res) => {
    try {
      const companyId = req.auth!.activeCompanyId!;
      const role = req.auth!.roleInCompany;
      
      if (role !== 'owner' && role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Only jpg, jpeg, png, gif, webp are allowed." });
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
      }
      
      const objectStorage = new ObjectStorageService();
      
      // Upload to public storage
      const result = await objectStorage.uploadPublicFile({
        buffer: file.buffer,
        folder: 'company-logos',
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const isOriginal = req.query.kind === 'original';
      await storage.updateCompanyProfile(
        companyId,
        isOriginal ? { logoOriginalUrl: result.url } : { logoUrl: result.url },
      );

      res.json({ message: "Company logo uploaded successfully", url: result.url });
    } catch (error) {
      console.error('Upload company logo error:', error);
      res.status(500).json({ message: "Failed to upload company logo" });
    }
  });

  // Upload company brochure (PDF)
  app.post("/api/company/brochure", authenticateToken, requireCompanyContext, upload.single('file'), async (req: AuthRequest, res) => {
    try {
      const companyId = req.auth!.activeCompanyId!;
      const role = req.auth!.roleInCompany;

      if (role !== 'owner' && role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Only PDF, JPG, and PNG are allowed." });
      }

      if (file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
      }

      const objectStorage = new ObjectStorageService();

      const result = await objectStorage.uploadPublicFile({
        buffer: file.buffer,
        folder: 'company-brochures',
        filename: file.originalname,
        contentType: file.mimetype,
      });

      await storage.updateCompanyProfile(companyId, { brochureUrl: result.url });

      res.json({ message: "Company brochure uploaded successfully", url: result.url });
    } catch (error) {
      console.error('Upload company brochure error:', error);
      res.status(500).json({ message: "Failed to upload company brochure" });
    }
  });

  // Upload portfolio image
  app.post("/api/company/portfolio-image", authenticateToken, requireCompanyContext, upload.single('file'), async (req: AuthRequest, res) => {
    try {
      const role = req.auth!.roleInCompany;

      if (role !== 'owner' && role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Only JPG, PNG, and WebP are allowed." });
      }

      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
      }

      const objectStorage = new ObjectStorageService();

      const result = await objectStorage.uploadPublicFile({
        buffer: file.buffer,
        folder: 'portfolio-images',
        filename: file.originalname,
        contentType: file.mimetype,
      });

      res.json({ message: "Portfolio image uploaded successfully", url: result.url });
    } catch (error) {
      console.error('Upload portfolio image error:', error);
      res.status(500).json({ message: "Failed to upload portfolio image" });
    }
  });

  // ==========================================================================
  // ONBOARDING ROUTES
  // ==========================================================================

  // Get onboarding tasks status
  app.get("/api/onboarding-tasks", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const tasks = await storage.getOnboardingTasksStatus(
        req.auth!.userId,
        req.auth!.activeCompanyId!
      );
      res.json(tasks);
    } catch (error) {
      console.error('Get onboarding tasks error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Log settings visit event
  app.post("/api/onboarding-tasks/settings-visited", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if already logged to avoid duplicates
      const alreadyVisited = await storage.hasUserVisitedSettings(req.auth!.userId);
      if (!alreadyVisited) {
        await storage.logProductEvent({
          eventType: 'settings_visited',
          userId: req.auth!.userId,
          companyId: req.auth!.activeCompanyId || undefined,
          metadata: { timestamp: new Date().toISOString() }
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Log settings visit error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==========================================================================
  // TOUR PROGRESS ROUTES
  // ==========================================================================

  // Get all dismissed tours for the current user
  app.get("/api/tour-progress", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const dismissed = await storage.getDismissedTours(req.auth!.userId);
      res.json(dismissed);
    } catch (error) {
      console.error('Get tour progress error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Reset a tour (for "Take the tour again")
  app.delete("/api/tour-progress/:tourId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { tourId } = req.params;
      await storage.resetTourProgress(req.auth!.userId, tourId);
      res.json({ message: "OK" });
    } catch (error) {
      console.error('Reset tour error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Mark a tour as dismissed
  app.post("/api/tour-progress/:tourId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { tourId } = req.params;
      if (!tourId || typeof tourId !== 'string') {
        return res.status(400).json({ message: "Invalid tourId" });
      }
      await storage.dismissTour(req.auth!.userId, tourId);
      res.json({ message: "OK" });
    } catch (error) {
      console.error('Dismiss tour error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==========================================================================
  // COMPANY ROUTES
  // ==========================================================================

  // Create company (and auto-add creator as owner)
  app.post("/api/companies", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { logoUrl, bio, websiteUrl, ...rest } = req.body;
      const companyData = createCompanySchema.parse(rest);
      
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
        verificationStatus: 'not_verified',
        onboardingState: 'draft'
      });

      // Build social links from profile data
      const socialLinks: Record<string, string> = {};
      if (websiteUrl) socialLinks.website = websiteUrl;

      // Create profile with any provided profile data (logo, bio, etc.)
      const profile = await storage.createCompanyProfile({
        companyId: company.id,
        displayName: companyData.name,
        bio: bio || null,
        tags: [],
        logoUrl: logoUrl || null,
        headerUrl: null,
        brochureUrl: null,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : {},
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
        metadata: { verificationStatus: 'not_verified' }
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
    } catch (error: any) {
      console.error('Create company error:', error);
      if (error?.name === 'ZodError') {
        const firstIssue = error.errors?.[0];
        const message = firstIssue
          ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
          : "Invalid company data";
        return res.status(400).json({ message, errors: error.errors });
      }
      if (error?.code === '23505') {
        const constraint = error?.constraint || '';
        if (constraint.includes('vat_number')) {
          return res.status(400).json({ message: "A company with this VAT number already exists" });
        }
        if (constraint.includes('cr_number')) {
          return res.status(400).json({ message: "A company with this CR number already exists" });
        }
        return res.status(400).json({ message: "A company with these details already exists" });
      }
      res.status(500).json({ message: error?.message || "Failed to create company" });
    }
  });

  // Invite team members to company
  app.post("/api/companies/:companyId/invite-team", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const { companyId } = req.params;
      const { invitations } = req.body; // Array of { email, role }

      if (!Array.isArray(invitations) || invitations.length === 0) {
        return res.status(400).json({ message: "At least one invitation is required" });
      }

      if (invitations.length > 20) {
        return res.status(400).json({ message: "Maximum 20 invitations at a time" });
      }

      // Verify the user is admin/owner of this company
      const userRole = await storage.getUserRoleInCompany(req.auth!.userId, companyId);
      if (!userRole || !['owner', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: "Only owners and admins can invite team members" });
      }

      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const inviter = await storage.getUser(req.auth!.userId);
      if (!inviter) {
        return res.status(404).json({ message: "User not found" });
      }

      const validRoles = ['admin', 'member', 'viewer'];
      const results: { email: string; status: string }[] = [];

      for (const inv of invitations) {
        const { email, role } = inv;
        if (!email || !role || !validRoles.includes(role)) {
          results.push({ email: email || 'unknown', status: 'invalid' });
          continue;
        }

        // Check if user already exists and is in this company
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          const existingMembership = await storage.getUserRoleInCompany(existingUser.id, companyId);
          if (existingMembership) {
            results.push({ email, status: 'already_member' });
            continue;
          }
        }

        // Generate cryptographically secure invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');

        // Persist invitation in database (expires in 7 days)
        await storage.createTeamInvitation({
          companyId,
          email,
          role,
          token: inviteToken,
          invitedBy: req.auth!.userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        // Send invitation email
        try {
          await sendTeamInviteEmail({
            email,
            inviterName: inviter.name,
            companyName: company.name,
            role,
            inviteToken,
            language: (inviter.language as 'en' | 'ar') || 'en',
          });
          results.push({ email, status: 'sent' });
        } catch (emailErr) {
          console.error(`[Email] Failed to send team invite to ${email}:`, emailErr);
          results.push({ email, status: 'email_failed' });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Team invite error:', error);
      res.status(500).json({ message: "Failed to send invitations" });
    }
  });

  // Get team invitation details by token (public — no auth required so the page can load)
  app.get("/api/team-invitations/:token", async (req, res) => {
    try {
      const invitation = await storage.getTeamInvitationByToken(req.params.token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: "This invitation has already been used" });
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ message: "This invitation has expired" });
      }

      res.json({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        companyName: invitation.company.name,
        companyId: invitation.company.id,
        inviterName: invitation.inviter.name,
        expiresAt: invitation.expiresAt,
      });
    } catch (error) {
      console.error('Get team invitation error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Accept team invitation
  app.post("/api/team-invitations/:token/accept", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const invitation = await storage.getTeamInvitationByToken(req.params.token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: "This invitation has already been used" });
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ message: "This invitation has expired" });
      }

      const user = await storage.getUser(req.auth!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify the invitation is for this user's email
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        return res.status(403).json({ message: "This invitation was sent to a different email address" });
      }

      // Check if already a member
      const existingRole = await storage.getUserRoleInCompany(user.id, invitation.companyId);
      if (existingRole) {
        // Mark invitation as accepted anyway
        await storage.updateTeamInvitation(invitation.id, { status: 'accepted', acceptedAt: new Date() } as any);
        return res.status(400).json({ message: "You are already a member of this company" });
      }

      // Add user to company with the invited role
      await storage.addUserToCompany({
        userId: user.id,
        companyId: invitation.companyId,
        roleInCompany: invitation.role,
        invitedBy: invitation.invitedBy,
      });

      // Mark invitation as accepted
      await storage.updateTeamInvitation(invitation.id, { status: 'accepted', acceptedAt: new Date() } as any);

      // Generate new token with the new company as active
      const token = generateToken({
        userId: user.id,
        activeCompanyId: invitation.companyId,
        roleInCompany: invitation.role,
        isAdmin: user.isAdmin,
      });

      const company = invitation.company;
      const profile = await storage.getCompanyProfile(company.id);

      res.json({
        message: "Invitation accepted successfully",
        token,
        activeCompany: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          verificationStatus: company.verificationStatus,
          onboardingState: company.onboardingState,
          role: invitation.role,
          profile: profile || null,
        },
      });
    } catch (error) {
      console.error('Accept team invitation error:', error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Get company members
  app.get("/api/companies/:companyId/members", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const { companyId } = req.params;
      const callerRole = await storage.getUserRoleInCompany(req.auth!.userId, companyId);
      if (!callerRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      const members = await storage.getCompanyMembers(companyId);
      res.json(members.map(m => ({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        profilePictureUrl: m.user.profilePictureUrl,
        role: m.roleInCompany,
        joinedAt: m.joinedAt,
      })));
    } catch (error) {
      console.error('Get company members error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update member role
  app.patch("/api/companies/:companyId/members/:userId/role", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const { companyId, userId } = req.params;
      const { role } = req.body;

      const callerRole = await storage.getUserRoleInCompany(req.auth!.userId, companyId);
      if (!callerRole || (callerRole !== 'owner' && callerRole !== 'admin')) {
        return res.status(403).json({ message: "Only owners and admins can change roles" });
      }

      if (!['admin', 'member', 'viewer'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      if (userId === req.auth!.userId) {
        return res.status(400).json({ message: "You cannot change your own role" });
      }

      const targetRole = await storage.getUserRoleInCompany(userId, companyId);
      if (!targetRole) {
        return res.status(404).json({ message: "Member not found" });
      }

      if (targetRole === 'owner') {
        return res.status(403).json({ message: "Cannot change the owner's role" });
      }

      if (callerRole === 'admin' && targetRole === 'admin') {
        return res.status(403).json({ message: "Admins cannot change other admins' roles" });
      }

      await storage.updateUserRole(userId, companyId, role);
      res.json({ message: "Role updated successfully" });
    } catch (error) {
      console.error('Update member role error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Remove member from company
  app.delete("/api/companies/:companyId/members/:userId", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const { companyId, userId } = req.params;

      const callerRole = await storage.getUserRoleInCompany(req.auth!.userId, companyId);
      if (!callerRole || (callerRole !== 'owner' && callerRole !== 'admin')) {
        return res.status(403).json({ message: "Only owners and admins can remove members" });
      }

      if (userId === req.auth!.userId) {
        return res.status(400).json({ message: "You cannot remove yourself" });
      }

      const targetRole = await storage.getUserRoleInCompany(userId, companyId);
      if (!targetRole) {
        return res.status(404).json({ message: "Member not found" });
      }

      if (targetRole === 'owner') {
        return res.status(403).json({ message: "Cannot remove the company owner" });
      }

      if (callerRole === 'admin' && targetRole === 'admin') {
        return res.status(403).json({ message: "Admins cannot remove other admins" });
      }

      await storage.removeUserFromCompany(userId, companyId);
      res.json({ message: "Member removed successfully" });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({ message: "Server error" });
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
          rejectionReason: company.rejectionReason || null,
          role,
          profile: profile || null
        }
      });
    } catch (error) {
      console.error('Switch company error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get company profile by slug (public read)
  app.get("/api/companies/by-slug/:slug/profile", async (req: AuthRequest, res) => {
    try {
      const { slug } = req.params;

      const company = await storage.getCompanyBySlug(slug);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const profile = await storage.getCompanyProfile(company.id);

      const documents = (company.documents || {}) as Record<string, string | undefined>;
      const verifiedDocuments = company.verificationStatus === 'verified'
        ? ([
            'Commercial Registration',
            documents.vatCertificate ? 'VAT Certificate' : null,
            documents.gosiCertificate ? 'GOSI Certificate' : null,
            documents.nationalAddressCertificate ? 'National Address' : null,
          ].filter(Boolean) as string[])
        : [];

      res.json({
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          legalName: company.legalName,
          category: company.category,
          city: company.city,
          verificationStatus: company.verificationStatus,
          certifications: company.certifications || [],
          crNumber: company.crNumber,
          vatNumber: company.vatNumber,
          createdAt: company.createdAt,
          verifiedAt: company.verifiedAt,
          verifiedDocuments,
        },
        profile: profile || null
      });
    } catch (error) {
      console.error('Get company profile by slug error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get company profile (public read)
  app.get("/api/companies/:companyId/profile", async (req: AuthRequest, res) => {
    try {
      const { companyId } = req.params;

      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const profile = await storage.getCompanyProfile(companyId);

      const documents = (company.documents || {}) as Record<string, string | undefined>;
      const verifiedDocuments = company.verificationStatus === 'verified'
        ? ([
            'Commercial Registration',
            documents.vatCertificate ? 'VAT Certificate' : null,
            documents.gosiCertificate ? 'GOSI Certificate' : null,
            documents.nationalAddressCertificate ? 'National Address' : null,
          ].filter(Boolean) as string[])
        : [];

      res.json({
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          legalName: company.legalName,
          category: company.category,
          city: company.city,
          verificationStatus: company.verificationStatus,
          certifications: company.certifications || [],
          crNumber: company.crNumber,
          vatNumber: company.vatNumber,
          createdAt: company.createdAt,
          verifiedAt: company.verifiedAt,
          verifiedDocuments,
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

        const { displayName, bio, logoUrl, socialLinks, legalName, crNumber, vatNumber, city, category, tractionTheme, tags, companySize, portfolio, yearFounded, serviceAreas, languages, industriesServed, availabilityStatus, availabilityNote } = req.body;

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
          companyUpdates.verifiedAt = null;
          
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
        if (logoUrl !== undefined) profileUpdates.logoUrl = logoUrl;
        if (socialLinks !== undefined) profileUpdates.socialLinks = socialLinks;
        if (tractionTheme !== undefined) profileUpdates.tractionTheme = tractionTheme;
        if (tags !== undefined) profileUpdates.tags = tags;
        if (companySize !== undefined) profileUpdates.companySize = companySize;
        if (portfolio !== undefined) profileUpdates.portfolio = portfolio;
        if (yearFounded !== undefined) {
          const yf = yearFounded === null || yearFounded === '' ? null : Number(yearFounded);
          if (yf !== null && (!Number.isInteger(yf) || yf < 1800 || yf > new Date().getFullYear())) {
            return res.status(400).json({ message: "Invalid yearFounded" });
          }
          profileUpdates.yearFounded = yf;
        }
        if (serviceAreas !== undefined) profileUpdates.serviceAreas = Array.isArray(serviceAreas) ? serviceAreas.slice(0, 20) : [];
        if (languages !== undefined) profileUpdates.languages = Array.isArray(languages) ? languages.slice(0, 10) : [];
        if (industriesServed !== undefined) profileUpdates.industriesServed = Array.isArray(industriesServed) ? industriesServed.slice(0, 15) : [];
        if (availabilityStatus !== undefined) {
          const allowed = ['accepting', 'limited', 'booked'];
          if (availabilityStatus !== null && !allowed.includes(availabilityStatus)) {
            return res.status(400).json({ message: "Invalid availabilityStatus" });
          }
          profileUpdates.availabilityStatus = availabilityStatus;
        }
        if (availabilityNote !== undefined) {
          profileUpdates.availabilityNote = typeof availabilityNote === 'string' ? availabilityNote.slice(0, 200) : null;
        }

        const profile = await storage.updateCompanyProfile(companyId, profileUpdates);

        res.json(profile);
      } catch (error) {
        console.error('Update company profile error:', error);
        res.status(400).json({ message: "Invalid profile data" });
      }
    }
  );

  // ==========================================================================
  // COMPANY DOCUMENT ROUTES
  // ==========================================================================

  // Upload a company verification document
  app.post("/api/companies/:companyId/documents",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const { companyId } = req.params;
        const userId = req.auth!.userId;

        // Verify user belongs to this company
        const role = await storage.getUserRoleInCompany(userId, companyId);
        if (!role) {
          return res.status(403).json({ message: "Access denied" });
        }

        const { documentType, fileUrl, originalName, label } = req.body;

        if (!documentType || !fileUrl) {
          return res.status(400).json({ message: "documentType and fileUrl are required" });
        }

        const validTypes = ['cr_certificate', 'vat_certificate', 'gosi_certificate', 'national_address_certificate', 'other'];
        if (!validTypes.includes(documentType)) {
          return res.status(400).json({ message: "Invalid document type" });
        }

        const doc = await storage.createCompanyDocument({
          companyId,
          documentType,
          fileUrl,
          originalName: originalName || null,
          label: label || null,
          uploadedBy: userId,
        });

        // Move to under_review when documents are first uploaded (or resubmitted after rejection)
        const company = await storage.getCompany(companyId);
        if (company && (company.verificationStatus === 'not_verified' || company.verificationStatus === 'rejected')) {
          await storage.updateCompany(companyId, { verificationStatus: 'under_review' });
        }

        res.status(201).json(doc);
      } catch (error) {
        console.error('Create company document error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get all documents for a company
  app.get("/api/companies/:companyId/documents",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const { companyId } = req.params;
        const userId = req.auth!.userId;

        // Allow company members or platform admins
        if (!req.auth!.isAdmin) {
          const role = await storage.getUserRoleInCompany(userId, companyId);
          if (!role) {
            return res.status(403).json({ message: "Access denied" });
          }
        }

        const docs = await storage.getCompanyDocuments(companyId);
        res.json(docs);
      } catch (error) {
        console.error('Get company documents error:', error);
        res.status(500).json({ message: "Server error" });
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

        // Extract optional marketplace fields (not part of tender schema)
        const {
          publishToMarketplace,
          marketplaceTenderType: reqMarketplaceTenderType,
          marketplaceDocumentFee: reqMarketplaceDocFee,
          marketplaceInquiryDeadline: reqMarketplaceInquiryDeadline,
        } = req.body as {
          publishToMarketplace?: boolean;
          marketplaceTenderType?: string;
          marketplaceDocumentFee?: number | null;
          marketplaceInquiryDeadline?: string | null;
        };

        // Require verified company before creating a tender
        const activeCompany = await storage.getCompany(req.auth!.activeCompanyId!);
        if (!activeCompany || activeCompany.verificationStatus !== 'verified') {
          return res.status(403).json({
            message: "Your company must be verified before creating tenders. Upload your documents in Settings to begin the verification process.",
            requiresVerification: true,
          });
        }

        // Validate marketplace fields if requested
        if (publishToMarketplace) {
          const VALID_TENDER_TYPES = ['open_tender', 'direct_purchase', 'framework_agreement'];
          if (reqMarketplaceTenderType && !VALID_TENDER_TYPES.includes(reqMarketplaceTenderType)) {
            return res.status(400).json({ message: "Invalid marketplace tender type" });
          }
          if (reqMarketplaceDocFee !== undefined && reqMarketplaceDocFee !== null) {
            const fee = Number(reqMarketplaceDocFee);
            if (!Number.isInteger(fee) || fee < 0 || fee > 100_000) {
              return res.status(400).json({ message: "Document fee must be a non-negative integer up to 100,000 SAR" });
            }
          }
          if (reqMarketplaceInquiryDeadline) {
            const d = new Date(reqMarketplaceInquiryDeadline);
            if (isNaN(d.getTime())) {
              return res.status(400).json({ message: "Invalid inquiry deadline date" });
            }
          }
        }

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

        // If marketplace publishing requested, apply marketplace fields immediately
        let marketplaceRefNumber: string | undefined;
        if (publishToMarketplace) {
          const refNum = `BID-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
          marketplaceRefNumber = refNum;
          await storage.updateTender(tender.id, {
            isMarketplace: true,
            marketplaceStatus: 'pending',
            referenceNumber: refNum,
            tenderType: reqMarketplaceTenderType || 'open_tender',
            documentFee: reqMarketplaceDocFee || null,
            inquiryDeadline: reqMarketplaceInquiryDeadline || null,
          });
          await storage.logProductEvent({
            eventType: 'marketplace_submission',
            companyId: req.auth!.activeCompanyId!,
            userId: req.auth!.userId,
            metadata: { tenderId: tender.id },
          });
        }

        // Helper to attach marketplace info to the response
        const addMarketplaceInfo = (tenderObj: any) => {
          if (marketplaceRefNumber) {
            return { ...tenderObj, isMarketplace: true, marketplaceStatus: 'pending', referenceNumber: marketplaceRefNumber };
          }
          return tenderObj;
        };

        // Auto-assign category via AI if not set or set to fallback value
        if (!tender.category || tender.category === 'Other') {
          const suggestedCategory = await suggestTenderCategory({
            title: tenderData.title,
            description: tenderData.description,
            objective: (tenderData as any).objective,
            skills: (tenderData as any).skills,
            deliverables: (tenderData as any).deliverables,
          });
          if (suggestedCategory) {
            const updated = await storage.updateTender(tender.id, { category: suggestedCategory });
            // Respond first, then translate asynchronously
            const finalTender = updated ?? tender;
            res.json(addMarketplaceInfo(finalTender));

            // Fire-and-forget: notify team that a new tender was published
            (async () => {
              try {
                const members = await storage.getCompanyMembers(req.auth!.activeCompanyId!);
                const recipients = members
                  .filter(m => (m.roleInCompany === 'owner' || m.roleInCompany === 'admin') && m.user.email)
                  .map(m => ({ email: m.user.email as string, name: m.user.name || undefined, language: (m.user.language || 'en') as 'en' | 'ar' }));
                console.log(`[Email] Tender created — sending to ${recipients.length} recipient(s):`, recipients.map(r => r.email));
                await sendTenderCreatedNotification({
                  tenderTitle: finalTender.title || 'Untitled Tender',
                  tenderId: finalTender.id,
                  recipients,
                });
              } catch (emailErr) {
                console.error('[Email] Tender created notification failed:', emailErr);
              }
            })();

            if (tenderData.allowTranslation) {
              buildTenderTranslation({ ...(updated ?? tender), category: suggestedCategory })
                .then(translatedContent => {
                  if (translatedContent) {
                    storage.updateTender(tender.id, { translatedContent }).catch(console.error);
                  }
                })
                .catch(console.error);
            }
            return;
          }
        }

        res.json(addMarketplaceInfo(tender));

        // Fire-and-forget: notify team that a new tender was published
        (async () => {
          try {
            const members = await storage.getCompanyMembers(req.auth!.activeCompanyId!);
            const recipients = members
              .filter(m => (m.roleInCompany === 'owner' || m.roleInCompany === 'admin') && m.user.email)
              .map(m => ({ email: m.user.email as string, name: m.user.name || undefined, language: (m.user.language || 'en') as 'en' | 'ar' }));
            console.log(`[Email] Tender created — sending to ${recipients.length} recipient(s):`, recipients.map(r => r.email));
            await sendTenderCreatedNotification({
              tenderTitle: tender.title || 'Untitled Tender',
              tenderId: tender.id,
              recipients,
            });
          } catch (emailErr) {
            console.error('[Email] Tender created notification failed:', emailErr);
          }
        })();

        // Translate asynchronously after responding so publish is not delayed
        if (tenderData.allowTranslation) {
          buildTenderTranslation(tender)
            .then(translatedContent => {
              if (translatedContent) {
                storage.updateTender(tender.id, { translatedContent }).catch(console.error);
              }
            })
            .catch(console.error);
        }
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
      const idOrToken = req.params.id;
      let tender: any = null;
      let company: any = null;
      let profile: any = null;

      const tokenResult = await storage.getTenderByInvitationToken(idOrToken);
      if (tokenResult) {
        tender = tokenResult;
        company = tokenResult.company;
        profile = tokenResult.profile;
      } else {
        tender = await storage.getTender(idOrToken);
        if (tender) {
          company = await storage.getCompany(tender.companyId);
          profile = company ? await storage.getCompanyProfile(company.id) : null;
        }
      }

      if (!tender) {
        return res.status(404).json({ message: "Tender not found" });
      }

      // Only show published tenders
      if (tender.status !== 'published' && tender.status !== 'draft') {
        return res.status(404).json({ message: "Tender not available" });
      }

      const showPrice = tender.showPriceToVendors !== false;

      // Return only public information
      res.json({
        id: tender.id,
        title: tender.title,
        description: tender.description,
        budget: showPrice ? tender.budget : null,
        budgetRange: showPrice ? tender.budgetRange : null,
        deadline: tender.deadline,
        duration: tender.duration,
        status: tender.status,
        skills: tender.skills,
        scope: tender.scope,
        pricingModel: tender.pricingModel,
        milestones: tender.milestones,
        voiceNoteUrl: tender.voiceNoteUrl,
        videoUrl: tender.videoUrl,
        projectTimeline: tender.projectTimeline,
        startDate: tender.startDate,
        endDate: tender.endDate,
        // Submission process fields
        submissionType: tender.submissionType,
        videoRequired: tender.videoRequired,
        // Inquiry/contact fields
        inquiryType: tender.inquiryType,
        whatsappContact: tender.whatsappContact,
        emailContact: tender.emailContact,
        // Evaluation and scope
        evaluationCriteria: tender.evaluationCriteria,
        objective: tender.objective,
        deliverables: tender.deliverables,
        vendorRequirements: tender.vendorRequirements,
        // Price display settings
        showPriceToVendors: tender.showPriceToVendors,
        projectSize: tender.projectSize,
        budgetMin: showPrice ? tender.budgetMin : null,
        budgetMax: showPrice ? tender.budgetMax : null,
        category: tender.category,
        attachments: tender.attachments,
        formCards: tender.formCards,
        language: tender.language || 'en',
        allowTranslation: tender.allowTranslation || false,
        translatedContent: tender.translatedContent ?? null,
        createdAt: tender.createdAt,
        company: company ? {
          id: company.id,
          name: company.name
        } : null,
        profile: profile ? {
          displayName: profile.displayName,
          logoUrl: profile.logoUrl
        } : null
      });
    } catch (error) {
      console.error('Get tender invite error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============================================================================
  // TRANSLATION ENDPOINT
  // ============================================================================

  // Translate text content for a tender (used by vendor-side language toggle as fallback)
  app.post("/api/translate", async (req, res) => {
    try {
      const { texts, targetLanguage } = req.body;

      if (!texts || !Array.isArray(texts) || !targetLanguage) {
        return res.status(400).json({ message: "texts (array) and targetLanguage are required" });
      }

      if (!['en', 'ar'].includes(targetLanguage)) {
        return res.status(400).json({ message: "targetLanguage must be 'en' or 'ar'" });
      }

      const translations = await translateTexts(texts, targetLanguage as 'en' | 'ar');
      res.json({ translations });
    } catch (error) {
      console.error('Translation error:', error);
      res.status(500).json({ message: "Translation failed" });
    }
  });

  // ============================================================================
  // TENDER Q&A ENDPOINTS
  // ============================================================================

  // Get questions for a tender (public - anonymous, no user info returned)
  app.get("/api/tenders/:id/questions", async (req, res) => {
    try {
      const tender = await storage.getTender(req.params.id);
      if (!tender) {
        return res.status(404).json({ message: "Tender not found" });
      }

      const questions = await storage.getTenderQuestions(req.params.id);

      let isOwner = false;
      const authHeader = req.headers.authorization;
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as any;
          if (decoded.activeCompanyId === tender.companyId) {
            const role = decoded.roleInCompany;
            if (role === 'owner' || role === 'admin') {
              isOwner = true;
            }
          }
        } catch {}
      }

      const result = await Promise.all(questions.map(async (q) => {
        const base: any = {
          id: q.id,
          question: q.question,
          answer: q.answer,
          answeredAt: q.answeredAt,
          createdAt: q.createdAt,
        };
        if (isOwner && q.askedByCompanyId) {
          const company = await storage.getCompany(q.askedByCompanyId);
          if (company) {
            base.askedByCompany = {
              id: company.id,
              name: company.name,
              legalName: company.legalName,
              crNumber: company.crNumber,
              vatNumber: company.vatNumber,
              city: company.city,
              category: company.category,
              verificationStatus: company.verificationStatus,
            };
            const profile = await storage.getCompanyProfile(company.id);
            if (profile) {
              base.askedByCompany.logoUrl = profile.logoUrl;
              base.askedByCompany.displayName = profile.displayName;
              base.askedByCompany.bio = profile.bio;
            }
          }
        }
        return base;
      }));

      res.json(result);
    } catch (error) {
      console.error('Get tender questions error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Post a question on a tender (requires login)
  app.post("/api/tenders/:id/questions",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const tender = await storage.getTender(req.params.id);
        if (!tender) {
          return res.status(404).json({ message: "Tender not found" });
        }

        if (tender.status !== 'published') {
          return res.status(400).json({ message: "Tender is not accepting questions" });
        }

        if (tender.inquiryType !== 'inside_bid') {
          return res.status(400).json({ message: "This tender does not support platform Q&A" });
        }

        const { question } = req.body;
        if (!question || typeof question !== 'string' || question.trim().length === 0) {
          return res.status(400).json({ message: "Question is required" });
        }

        if (question.trim().length > 1000) {
          return res.status(400).json({ message: "Question must be under 1000 characters" });
        }

        const created = await storage.createTenderQuestion({
          tenderId: req.params.id,
          askedByUserId: req.auth!.userId,
          askedByCompanyId: req.auth!.activeCompanyId || null,
          question: question.trim(),
        });

        // Return anonymous version
        res.status(201).json({
          id: created.id,
          question: created.question,
          answer: created.answer,
          answeredAt: created.answeredAt,
          createdAt: created.createdAt,
        });

        // Fire-and-forget: notify tender owner admins of new question
        (async () => {
          try {
            const members = await storage.getCompanyMembers(tender.companyId!);
            const recipients = members
              .filter(m => (m.roleInCompany === 'owner' || m.roleInCompany === 'admin') && m.user.email)
              .map(m => ({ email: m.user.email as string, name: m.user.name || undefined, language: (m.user.language || 'en') as 'en' | 'ar' }));
            await sendTenderQuestionNotification({
              tenderTitle: tender.title || 'Untitled Tender',
              tenderId: tender.id,
              questionText: created.question,
              recipients,
            });
          } catch (emailErr) {
            console.error('[Email] Tender question notification failed:', emailErr);
          }
        })();
      } catch (error) {
        console.error('Post tender question error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Answer a question (tender owner only)
  app.patch("/api/tenders/:id/questions/:questionId/answer",
    authenticateToken,
    requireCompanyContext,
    requireCompanyRole('admin'),
    async (req: AuthRequest, res) => {
      try {
        const tender = await storage.getTender(req.params.id);
        if (!tender) {
          return res.status(404).json({ message: "Tender not found" });
        }

        if (tender.companyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Only the tender owner can answer questions" });
        }

        const { answer } = req.body;
        if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
          return res.status(400).json({ message: "Answer is required" });
        }

        const updated = await storage.answerTenderQuestion(req.params.questionId, answer.trim());

        res.json({
          id: updated.id,
          question: updated.question,
          answer: updated.answer,
          answeredAt: updated.answeredAt,
          createdAt: updated.createdAt,
        });

        // Fire-and-forget: notify all vendors who submitted offers that Q&A was updated
        (async () => {
          try {
            const offers = await storage.getOffersByTender(req.params.id);
            const uniqueCompanyIds = Array.from(new Set(offers.map(o => o.companyId)));
            const vendorRecipients: { email: string; name?: string; language?: 'en' | 'ar' }[] = [];
            for (const companyId of uniqueCompanyIds) {
              const members = await storage.getCompanyMembers(companyId);
              for (const m of members) {
                if ((m.roleInCompany === 'owner' || m.roleInCompany === 'admin') && m.user.email) {
                  vendorRecipients.push({ email: m.user.email, name: m.user.name || undefined, language: (m.user.language || 'en') as 'en' | 'ar' });
                }
              }
            }
            await sendTenderAnswerNotification({
              tenderTitle: tender.title || 'Untitled Tender',
              tenderId: tender.id,
              questionText: updated.question,
              answerText: updated.answer || '',
              vendorRecipients,
            });
          } catch (emailErr) {
            console.error('[Email] Tender answer notification failed:', emailErr);
          }
        })();
      } catch (error) {
        console.error('Answer tender question error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

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

        if (tender.isMarketplace && tender.marketplaceStatus === 'approved' && ['cancelled', 'draft'].includes(status)) {
          return res.status(400).json({
            message: `Cannot ${status === 'draft' ? 'unpublish' : 'cancel'} a tender that is live on the marketplace. Contact admin to remove it first.`
          });
        }

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

        // Fire-and-forget: status change notifications
        (async () => {
          try {
            // Always notify requester team
            const members = await storage.getCompanyMembers(tender.companyId!);
            const requesterRecipients = members
              .filter(m => (m.roleInCompany === 'owner' || m.roleInCompany === 'admin') && m.user.email)
              .map(m => ({ email: m.user.email as string, name: m.user.name || undefined, language: (m.user.language || 'en') as 'en' | 'ar' }));

            if (['published', 'closed', 'cancelled'].includes(status)) {
              await sendTenderStatusNotification({
                newStatus: status as 'published' | 'closed' | 'cancelled',
                tenderTitle: tender.title || 'Untitled Tender',
                tenderId: tender.id,
                recipients: requesterRecipients,
              });
            }

            // When closing, also notify all vendors who submitted offers
            if (status === 'closed') {
              const requesterProfile = await storage.getCompanyProfile(tender.companyId!);
              const requesterCompany = await storage.getCompany(tender.companyId!);
              const requesterName = requesterProfile?.displayName || requesterCompany?.name || 'Unknown';

              const offers = await storage.getOffersByTender(tender.id);
              const uniqueCompanyIds = Array.from(new Set(offers.map(o => o.companyId)));
              const vendorRecipients: { email: string; name?: string; language?: 'en' | 'ar' }[] = [];
              for (const companyId of uniqueCompanyIds) {
                const vendorMembers = await storage.getCompanyMembers(companyId);
                for (const m of vendorMembers) {
                  if ((m.roleInCompany === 'owner' || m.roleInCompany === 'admin') && m.user.email) {
                    vendorRecipients.push({ email: m.user.email, name: m.user.name || undefined, language: (m.user.language || 'en') as 'en' | 'ar' });
                  }
                }
              }
              await sendTenderClosedToVendorsNotification({
                tenderTitle: tender.title || 'Untitled Tender',
                tenderId: tender.id,
                requesterCompanyName: requesterName,
                vendorRecipients,
              });
            }
          } catch (emailErr) {
            console.error('[Email] Tender status notification failed:', emailErr);
          }
        })();
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

        if (tender.companyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Access denied" });
        }

        if (tender.isMarketplace && tender.marketplaceStatus === 'approved') {
          return res.status(400).json({ message: "Cannot delete a tender published on the marketplace. Contact admin to remove it first." });
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
  // AI BUDGET ESTIMATION ROUTES
  // ==========================================================================

  // Estimate budget using AI
  app.post("/api/ai/estimate-budget",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const { title, projectType, projectObjective, keyDeliverables, projectDescription, voiceNoteUrl } = req.body;

        // Check if OpenAI API key is configured
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          return res.status(503).json({
            message: "AI budget estimation is not available. Please configure an OpenAI API key to use this feature."
          });
        }

        // Build context for AI
        const projectContext = `
Project Title: ${title || "Not specified"}
Project Type: ${projectType === "time-bound" ? "Time-bound project" : "Deliverable-based project"}
Project Objective: ${projectObjective || "Not specified"}
Key Deliverables: ${keyDeliverables?.length ? keyDeliverables.join(", ") : "Not specified"}
Project Description: ${projectDescription || "Not specified"}
${voiceNoteUrl ? "Note: Client has provided a voice note with additional details." : ""}
        `.trim();

        // Call OpenAI API
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a professional project cost estimator specializing in freelance and agency projects in Saudi Arabia.
Your task is to provide realistic budget estimates in Saudi Riyals (SAR).

Project Size Categories:
- Small Projects: Under 50,000 SAR
- Medium Projects: 50,000 - 250,000 SAR
- Large Projects: 250,000+ SAR

Guidelines for estimation by project type:
- Small advertising campaigns: 15,000 - 40,000 SAR
- Medium marketing campaigns: 50,000 - 150,000 SAR
- Large integrated campaigns: 200,000 - 500,000 SAR
- Web development (basic): 20,000 - 45,000 SAR
- Web development (e-commerce/complex): 60,000 - 180,000 SAR
- Enterprise web platforms: 250,000 - 600,000 SAR
- Mobile app development (simple): 40,000 - 80,000 SAR
- Mobile app development (complex): 100,000 - 300,000 SAR
- Logo and branding package: 10,000 - 40,000 SAR
- Full brand identity: 50,000 - 150,000 SAR
- Social media management (3 months): 30,000 - 80,000 SAR
- Video production (corporate): 25,000 - 100,000 SAR
- Video production (commercial): 80,000 - 250,000 SAR
- Content writing & strategy: 15,000 - 60,000 SAR

Always provide a realistic estimate based on Saudi Arabian market rates.
Response must be valid JSON with this exact structure:
{
  "estimatedBudget": <number>,
  "budgetRange": { "min": <number>, "max": <number> },
  "breakdown": [{ "item": "<string>", "amount": <number> }],
  "reasoning": "<brief explanation in 1-2 sentences>"
}`
              },
              {
                role: "user",
                content: `Please estimate the budget for this project:\n\n${projectContext}`
              }
            ],
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("OpenAI API error:", errorData);
          throw new Error("Failed to get AI estimate");
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error("Empty response from AI");
        }

        // Parse the JSON response
        let estimate;
        try {
          // Try to extract JSON from the response (in case there's extra text)
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            estimate = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No JSON found in response");
          }
        } catch (parseError) {
          console.error("Failed to parse AI response:", content);
          // Provide a fallback estimate
          estimate = {
            estimatedBudget: 7500,
            budgetRange: { min: 5000, max: 10000 },
            breakdown: [
              { item: "Project execution", amount: 5000 },
              { item: "Management & coordination", amount: 2500 }
            ],
            reasoning: "Based on typical project costs in the Saudi market."
          };
        }

        res.json(estimate);
      } catch (error) {
        console.error("AI budget estimation error:", error);
        res.status(500).json({ message: "Failed to estimate budget. Please try again." });
      }
    }
  );

  // Suggest category using AI
  app.post("/api/ai/suggest-category",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const { title, description, objective, skills, deliverables } = req.body;
        const category = await suggestTenderCategory({ title, description, objective, skills, deliverables });
        res.json({ category });
      } catch (error) {
        console.error("AI category suggestion error:", error);
        res.status(500).json({ message: "Failed to suggest category." });
      }
    }
  );

  // ==========================================================================
  // AI PROPOSAL ANALYSIS ROUTES
  // ==========================================================================

  // Get existing proposal analyses for a tender
  app.get("/api/ai/proposal-analysis/:tenderId",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const tender = await storage.getTender(req.params.tenderId);
        if (!tender) return res.status(404).json({ message: "Tender not found" });
        if (tender.companyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Only the tender owner can view analyses" });
        }

        const analyses = await storage.getProposalAnalysesByTender(req.params.tenderId);
        // Join with offer + company data
        const offersData = await storage.getOffersByTender(req.params.tenderId);
        const enriched = analyses.map(analysis => {
          const offerData = offersData.find(o => o.id === analysis.offerId);
          return {
            ...analysis,
            offer: offerData ? {
              id: offerData.id,
              quotePrice: offerData.quotePrice,
              notes: offerData.notes,
              technicalFileUrl: offerData.technicalFileUrl,
              financialFileUrl: offerData.financialFileUrl,
              combinedFileUrl: offerData.combinedFileUrl,
              videoUrl: offerData.videoUrl,
              status: offerData.status,
              submittedAt: offerData.submittedAt,
            } : null,
            company: offerData ? {
              id: offerData.company.id,
              name: offerData.company.name,
              category: offerData.company.category,
              verificationStatus: offerData.company.verificationStatus,
              displayName: (offerData as any).profile?.displayName,
              logoUrl: (offerData as any).profile?.logoUrl,
            } : null,
          };
        });

        res.json(enriched);
      } catch (error) {
        console.error("Proposal analysis fetch error:", error);
        res.status(500).json({ message: "Failed to fetch analyses" });
      }
    }
  );

  // Retry helper for AI API calls with exponential backoff
  async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 4): Promise<globalThis.Response> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(url, options);
      if (response.status === 429 && attempt < maxRetries) {
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(5000 * Math.pow(2, attempt), 60000);
        console.log(`Rate limited (429), retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }
      return response;
    }
    throw new Error("Max retries exceeded for AI API call");
  }

  // ─── Agent 1: RFP Analyst (gpt-4.1 for accurate document extraction) ───────
  // Runs ONCE per tender. Reads only RFP data and extracts a list of
  // specific, concrete, measurable requirements. Result is cached on the tender.
  async function extractRFPRequirements(
    config: { url: string; key: string },
    tender: any,
    language: 'en' | 'ar' = 'en',
  ): Promise<string[]> {
    const lines: string[] = [];

    if (tender.deliverables && Array.isArray(tender.deliverables)) {
      tender.deliverables.forEach((d: any) => {
        lines.push(`Deliverable: ${d.name}${d.description ? ' — ' + d.description : ''}${d.quantity ? ' (Qty: ' + d.quantity + ' ' + (d.unit || '') + ')' : ''}`);
      });
    }
    if (tender.vendorRequirements && Array.isArray(tender.vendorRequirements)) {
      tender.vendorRequirements.forEach((r: any) => {
        lines.push(`[${r.type?.toUpperCase() || 'REQUIREMENT'}] ${r.text}`);
      });
    }
    if (tender.evaluationCriteria && typeof tender.evaluationCriteria === 'object') {
      const ec = tender.evaluationCriteria as any;
      if (Array.isArray(ec.requirements)) {
        ec.requirements.forEach((r: any) => lines.push(`Criterion: ${r.categoryId}/${r.requirementId}: ${r.value}`));
      }
      if (Array.isArray(ec.customCriteria)) {
        ec.customCriteria.forEach((c: any) => lines.push(`Criterion: ${c.text || c.name}`));
      }
    }
    if (tender.milestones && Array.isArray(tender.milestones)) {
      tender.milestones.forEach((m: any) => {
        lines.push(`Milestone: ${m.name}${m.amount ? ' — SAR ' + m.amount : ''}${m.dueDate ? ' (due: ' + m.dueDate + ')' : ''}`);
      });
    }

    const rfpContext = [
      `Title: ${tender.title}`,
      `Description: ${tender.description}`,
      tender.budget ? `Budget: ${tender.budget} ${tender.currency || 'SAR'}` : null,
      lines.length > 0 ? lines.join("\n") : null,
    ].filter(Boolean).join("\n\n");

    const aiResponse = await fetchWithRetry(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.key}` },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: language === 'ar'
              ? `تعليمات حاسمة: اكتب بالكامل بالعربية وبأسلوب سعودي. تخيّل أنك محلل مشتريات سعودي يستخرج اشتراطات من كراسة شروط ومواصفات. استخدم المصطلحات السعودية المعتمدة في المناقصات مثل: "اشتراط"، "مواصفة"، "شهادة GOSI"، "سجل تجاري"، "خطاب ضمان ابتدائي". لا تستخدم الإنجليزية أبداً.

أنت محلل مشتريات. مهمتك الوحيدة هي قراءة المناقصة واستخراج قائمة باشتراطات محددة وقابلة للقياس يجب على أي مورد فائز تلبيتها.

القواعد:
- استخرج من 5 إلى 15 اشتراطاً. كن محدداً — لا "قدرة تقنية" بل "شهادة ISO 27001".
- شمّل: الشهادات، الكميات، الميزانيات، الجداول الزمنية، مواصفات التسليمات، المؤهلات الإلزامية.
- كل اشتراط يجب أن يكون عبارة قصيرة (3–10 كلمات)، وليس جملة.
- اكتب كل المتطلبات باللغة العربية فقط. مثال: ["شهادة جودة ISO 27001", "ميزانية 500,000 ريال", "5 تقارير شهرية", "شهادة GOSI"]
- أجب بمصفوفة JSON فقط.`
              : `You are a Saudi procurement analyst specializing in evaluating tenders and vendor proposals. Your only job is to read a tender/RFP and extract a list of specific, concrete, measurable requirements that any winning vendor must address. Think like a procurement officer reviewing a Scope of Work document — focus on what is contractually required, not general capabilities.

Domain context: This is a Saudi procurement context. Requirements may include Saudi-specific items such as GOSI certificate, commercial registration (CR), Zakat certificate, bid bond, performance bond, Nitaqat compliance, SASO certification, and VAT registration.

Rules:
- Extract 5–15 requirements. Be specific — not "technical capability" but "ISO 27001 certification".
- Include: certifications, quantities, budgets, timelines, deliverable specs, mandatory qualifications.
- Each requirement must be a short phrase (3–10 words), not a sentence.
- Respond with ONLY a JSON array of strings. Example: ["GOSI certificate", "SAR 500,000 budget cap", "5 monthly reports", "ISO 27001 certification", "commercial registration (CR)"]`,
          },
          {
            role: "user",
            content: `Extract the specific requirements from this RFP:\n\n${rfpContext}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 600,
      }),
    });

    if (!aiResponse.ok) throw new Error(`RFP Agent returned ${aiResponse.status}`);
    const data = await aiResponse.json();
    const content = data.choices?.[0]?.message?.content || "";
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed.filter((r: any) => typeof r === 'string') : [];
    } catch {
      return [];
    }
  }

  // ─── Translation helper: EN requirements → AR requirements ─────────────────
  // Translates the canonical English requirement list to Arabic for display,
  // keeping a 1:1 mapping so coverage results are consistent across languages.
  async function translateRequirements(
    config: { url: string; key: string },
    enRequirements: string[],
  ): Promise<string[]> {
    const aiResponse = await fetchWithRetry(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `أنت مترجم متخصص في مصطلحات المشتريات والمناقصات السعودية. ترجم كل عنصر من الإنجليزية إلى العربية بأسلوب سعودي رسمي. حافظ على نفس عدد العناصر وبنفس الترتيب. استخدم المصطلحات السعودية المعتمدة (مثل: "شهادة GOSI"، "سجل تجاري"، "شهادة زكاة"). أجب بمصفوفة JSON فقط.`,
          },
          {
            role: "user",
            content: `Translate these procurement requirements to Arabic:\n${JSON.stringify(enRequirements)}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 600,
      }),
    });

    if (!aiResponse.ok) throw new Error(`Translation returned ${aiResponse.status}`);
    const data = await aiResponse.json();
    const content = data.choices?.[0]?.message?.content || "";
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return enRequirements;
    try {
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed) || parsed.length !== enRequirements.length) return enRequirements;
      const allStrings = parsed.every((r: any) => typeof r === 'string' && r.trim().length > 0);
      if (!allStrings) return enRequirements;
      return parsed as string[];
    } catch {
      return enRequirements;
    }
  }

  // ─── Agent 2: Proposal Extractor ────────────────────────────────────────────
  // Runs once per offer. Reads ONLY the vendor's proposal document and extracts
  // raw facts: structure, deliverables, and financials. No RFP context needed.
  async function extractProposalFacts(
    config: { url: string; key: string },
    companyName: string,
    proposalText: string,
    quotePrice?: number | null,
    notes?: string | null,
    language: 'en' | 'ar' = 'en',
  ): Promise<{
    executiveSummary: string | null;
    tableOfContents: { section: string; pageRange: string }[] | null;
    deliverables: string[] | null;
    financial: { total?: number; breakdown?: { item: string; amount: number }[]; paymentTerms?: string; vat?: number } | null;
  }> {
    const offerContext = [
      `Vendor: ${companyName}`,
      quotePrice ? `Quoted Price: ${quotePrice} SAR` : null,
      notes ? `Vendor Notes: ${notes}` : null,
      proposalText || "Note: No proposal document provided",
    ].filter(Boolean).join("\n\n");

    const aiResponse = await fetchWithRetry(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.key}` },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: language === 'ar'
              ? `تعليمات حاسمة: يجب أن تكتب بالكامل باللغة العربية وبأسلوب سعودي أصيل. تخيّل أنك موظف مشتريات سعودي يكتب تقرير تقييم عرض مقدّم. استخدم المصطلحات السعودية المتعارف عليها في المناقصات والمشتريات الحكومية والخاصة مثل: "المورّد" أو "المقاول"، "الجهة المالكة"، "كراسة الشروط والمواصفات"، "ترسية"، "اشتراطات"، "بند"، "دفعة"، "خطاب ضمان"، "مستخلص". اكتب الملخص التنفيذي كأنه مكتوب من شخص سعودي يشتغل في إدارة المشتريات — مباشر وواضح وبدون تكلّف. الأرقام تبقى أرقام. لا تستخدم الإنجليزية أبداً في أي حقل نصي.

أنت مستخرج وثائق عروض. مهمتك الوحيدة هي قراءة عرض المورّد واستخراج محتواه الحقيقي.

استخرج الحقائق فقط. لا آراء، لا درجات، لا مقارنات مع كراسة الشروط.

قواعد حاسمة لاستخراج المالية:
- حقل "total" يجب أن يكون السعر الإجمالي كما ذكره المورّد بالضبط. إذا ذكر المورّد رسوم شهرية (مثل "1000 ريال/شهر")، استخدم هذا المبلغ كما هو — لا تضربه أو تحسبه سنوياً.
- لا تجمع المبالغ لحساب الإجمالي. أذكر الإجمالي فقط إذا ذكره المورّد صراحة.
- بنود التفصيل يجب أن تكون بنود مختلفة فعلاً. لا تكرر نفس التكلفة بأسماء مختلفة (مثل "شروط الدفع" و"رسوم شهرية" إذا كانوا نفس المبلغ).
- شروط الدفع تُنقل كما وردت في العرض (مثل "1000 ريال شهرياً" أو "50% مقدم و50% عند التسليم").

أجب بـ JSON صالح فقط بهذا الهيكل بالضبط:
{
  "executiveSummary": "<4 أسطر كحد أقصى. لخّص العرض بأسلوب سعودي مباشر — وش قدّم المورّد وكم السعر وايش أبرز النقاط؟>",
  "tableOfContents": [{ "section": "اسم القسم بالعربية", "pageRange": "..." }],
  "deliverables": ["<التسليمات كما وردت في العرض بالعربية>"],
  "financial": { "total": <number or null — فقط إذا ذكره المورّد صراحة>, "breakdown": [{ "item": "اسم البند بالعربية", "amount": <number> }], "paymentTerms": "<شروط الدفع كما وردت في العرض أو null>", "vat": <number or null> }
}`
              : `You are a Saudi procurement officer writing a proposal evaluation report. Your only job is to read a vendor's proposal and extract its factual content — as if you are documenting what the vendor actually offered for an internal procurement review.

Extract facts only. No opinions, no scores, no comparisons to any RFP. Be direct and precise, the way a procurement team would document a submitted bid.

Domain context: This is a Saudi procurement context. Financial figures are in SAR. Deliverables, payment terms, and milestones should be captured verbatim as the vendor described them.

CRITICAL financial extraction rules:
- The "total" field must be the total price as explicitly stated by the vendor in their proposal. If the vendor states a monthly/recurring fee (e.g. "1000 SAR/month"), use that single amount as the total — do NOT multiply or annualize it.
- Do NOT calculate or sum up amounts to produce a total. Only report the total if the vendor explicitly states one.
- Breakdown items must be distinct line items from the proposal. Do NOT list the same cost twice under different labels (e.g. "payment terms" and "monthly fee" referring to the same amount should only appear once).
- Payment terms should capture the payment structure verbatim (e.g. "1000 SAR per month", "50% upfront, 50% on delivery").

Respond with ONLY valid JSON in this exact structure:
{
  "executiveSummary": "<4 lines max. Factual and direct — what did the vendor propose, at what price, and what are the key highlights?>",
  "tableOfContents": [{ "section": "...", "pageRange": "..." }],
  "deliverables": ["<verbatim deliverable from proposal>"],
  "financial": { "total": <number or null — only if explicitly stated by vendor>, "breakdown": [{ "item": "...", "amount": <number> }], "paymentTerms": "<verbatim payment structure from proposal or null>", "vat": <number or null> }
}`,
          },
          {
            role: "user",
            content: `Extract facts from this proposal:\n\n${offerContext}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) throw new Error(`Proposal Extractor returned ${aiResponse.status}`);
    const data = await aiResponse.json();
    const content = data.choices?.[0]?.message?.content || "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return { executiveSummary: null, tableOfContents: null, deliverables: null, financial: null };
    try {
      const parsed = JSON.parse(match[0]);
      return {
        executiveSummary: parsed.executiveSummary || null,
        tableOfContents: parsed.tableOfContents || null,
        deliverables: parsed.deliverables || null,
        financial: parsed.financial || null,
      };
    } catch {
      return { executiveSummary: null, tableOfContents: null, deliverables: null, financial: null };
    }
  }

  // ─── Agent 3: Requirements Checker ──────────────────────────────────────────
  // Runs once per offer. Given the RFP requirements list (from Agent 1) and the
  // proposal text, determines which requirements are addressed and on which page.
  async function checkRequirementsCoverage(
    config: { url: string; key: string },
    requirements: string[],
    proposalText: string,
    language: 'en' | 'ar' = 'en',
  ): Promise<Record<string, string>> {
    if (requirements.length === 0 || !proposalText) return {};

    const aiResponse = await fetchWithRetry(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.key}` },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: language === 'ar'
              ? `تعليمات حاسمة: اكتب بالكامل بالعربية بأسلوب سعودي. استخدم مفاتيح الاشتراطات العربية كما هي في مفاتيح JSON. مراجع الصفحات تكون بالعربي: "صفحة X". إذا ما لقيت الاشتراط اكتب: "غير موجود". لا تستخدم الإنجليزية.

أنت مدقق امتثال في إدارة المشتريات. لديك قائمة باشتراطات المناقصة وعرض المورّد. لكل اشتراط، ابحث عن الصفحة المحددة في العرض التي تعالجه.

القواعد:
- إذا تمت معالجته، أجب بـ "صفحة X" (مثال: "صفحة 4") أو "صفحات X–Y".
- إذا لم يُذكر في أي مكان بالعرض، اكتب: "غير موجود".
- كن صارماً — لا تعتبره موجوداً إلا إذا تناوله العرض صراحةً.
- استخدم نصوص الاشتراطات كما هي مفاتيح JSON بالضبط.
أجب بـ JSON object فقط. مثال:
{ "شهادة GOSI": "صفحة 7", "شهادة ISO 27001": "غير موجود", "5 تقارير شهرية": "صفحة 12" }`
              : `You are a compliance officer on a Saudi procurement evaluation team. You are given a list of RFP requirements and a vendor's proposal. For each requirement, find the exact page in the proposal where it is addressed — as if you are filling out a compliance checklist for an official bid evaluation.

Important: The proposal document may be written in Arabic. Match requirements by meaning and concept, not just exact English wording. For example, "Strong analytical skills" should match "مهارات تحليلية قوية" in the proposal.

Rules:
- If addressed (in any language), respond with "page X" (e.g. "page 4") or "pages X–Y".
- If not addressed anywhere in the proposal, respond with "Not Found".
- Be strict — only mark as found if the proposal explicitly addresses it. Inferred or implied coverage does not count.
- Use the requirement strings exactly as given as JSON keys.
Respond with ONLY a JSON object. Example:
{ "GOSI certificate": "page 7", "ISO 27001 certification": "Not Found", "5 monthly reports": "page 12", "commercial registration (CR)": "page 2" }`,
          },
          {
            role: "user",
            content: `RFP Requirements:\n${requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\nProposal:\n${proposalText}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 800,
      }),
    });

    if (!aiResponse.ok) throw new Error(`Requirements Checker returned ${aiResponse.status}`);
    const data = await aiResponse.json();
    const content = data.choices?.[0]?.message?.content || "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      const parsed = JSON.parse(match[0]);
      return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  // ─── Orchestrator ────────────────────────────────────────────────────────────
  // Coordinates the 3 agents for a single offer. Agent 1 result is cached on
  // the tender so it only runs once even when analyzing multiple vendors.
  async function analyzeOfferWithAI(
    config: { url: string; key: string },
    tender: any,
    offerData: any,
    language: 'en' | 'ar' = 'en',
  ) {
    const companyName = (offerData as any).profile?.displayName || offerData.company.name;

    // Check if video-only with no other data
    const isVideoOnly = tender.submissionType === 'video_only' &&
      !offerData.quotePrice && !offerData.notes && !offerData.technicalFileUrl && !offerData.financialFileUrl;

    if (isVideoOnly) {
      return await storage.createProposalAnalysis({
        tenderId: tender.id,
        offerId: offerData.id,
        status: "skipped",
        errorMessage: "Video-only submission requires manual review",
        createdAt: new Date(),
      });
    }

    // ── Step 1: Get RFP requirements (Agent 1) — always extract in English first
    // to ensure consistency, then translate for Arabic display.
    let enRequirements: string[] = tender.rfpRequirements || [];
    if (enRequirements.length === 0) {
      try {
        enRequirements = await extractRFPRequirements(config, tender, 'en');
        await storage.updateTender(tender.id, { rfpRequirements: enRequirements } as any);
        tender.rfpRequirements = enRequirements;
      } catch (err) {
        console.error(`Agent 1 (RFP Analyst) failed for tender ${tender.id}:`, err);
      }
    }

    let requirements = enRequirements;
    if (language === 'ar' && enRequirements.length > 0) {
      let arRequirements: string[] = tender.rfpRequirementsAr || [];
      if (arRequirements.length === 0) {
        try {
          arRequirements = await translateRequirements(config, enRequirements);
          await storage.updateTender(tender.id, { rfpRequirementsAr: arRequirements } as any);
          tender.rfpRequirementsAr = arRequirements;
        } catch (err) {
          console.error(`Requirements translation failed for tender ${tender.id}:`, err);
          arRequirements = enRequirements;
        }
      }
      requirements = arRequirements;
    }

    // ── Step 2: Extract proposal text (shared input for Agents 2 & 3)
    let proposalText = "";
    try {
      const { fetchAndExtractFile } = await import("./textExtraction");
      if (offerData.combinedFileUrl) {
        const t = await fetchAndExtractFile(offerData.combinedFileUrl);
        if (t) proposalText += `\n--- PROPOSAL DOCUMENT ---\n${t}`;
      }
      if (offerData.technicalFileUrl) {
        const t = await fetchAndExtractFile(offerData.technicalFileUrl);
        if (t) proposalText += `\n--- TECHNICAL PROPOSAL ---\n${t}`;
      }
      if (offerData.financialFileUrl) {
        const t = await fetchAndExtractFile(offerData.financialFileUrl);
        if (t) proposalText += `\n--- FINANCIAL PROPOSAL ---\n${t}`;
      }
    } catch (err) {
      console.error(`File extraction failed for offer ${offerData.id}:`, err);
    }

    try {
      // ── Step 3: Run Agent 2 and Agent 3 in parallel
      // Agent 3 always checks against ENGLISH requirements for consistency,
      // then we remap keys to display language (Arabic) if needed.
      const [facts, enCriteriaMapping] = await Promise.all([
        extractProposalFacts(config, companyName, proposalText, offerData.quotePrice, offerData.notes, language),
        checkRequirementsCoverage(config, enRequirements, proposalText, 'en'),
      ]);

      let criteriaMapping = enCriteriaMapping;
      if (language === 'ar' && requirements.length === enRequirements.length) {
        const remapped: Record<string, string> = {};
        for (let i = 0; i < enRequirements.length; i++) {
          const enKey = enRequirements[i];
          const arKey = requirements[i];
          const value = enCriteriaMapping[enKey];
          if (value === undefined) {
            remapped[arKey] = 'غير موجود';
          } else {
            const normalized = value.trim().toLowerCase();
            const translatedValue = normalized === 'not found' ? 'غير موجود'
              : value.replace(/^pages?\s/i, (m: string) => m.toLowerCase().startsWith('pages') ? 'صفحات ' : 'صفحة ');
            remapped[arKey] = translatedValue;
          }
        }
        criteriaMapping = remapped;
      }

      const modelUsed = "gpt-4.1";

      const existing = await storage.getProposalAnalysisByOffer(offerData.id);
      if (existing) {
        await storage.updateProposalAnalysis(existing.id, {
          executiveSummary: facts.executiveSummary,
          tableOfContents: facts.tableOfContents,
          criteriaMapping: Object.keys(criteriaMapping).length > 0 ? criteriaMapping : null,
          deliverables: facts.deliverables,
          financial: facts.financial,
          modelUsed,
          status: "completed",
          analyzedAt: new Date(),
        });
        return { ...existing, ...facts, criteriaMapping, status: "completed" };
      }

      return await storage.createProposalAnalysis({
        tenderId: tender.id,
        offerId: offerData.id,
        executiveSummary: facts.executiveSummary,
        tableOfContents: facts.tableOfContents,
        criteriaMapping: Object.keys(criteriaMapping).length > 0 ? criteriaMapping : null,
        deliverables: facts.deliverables,
        financial: facts.financial,
        modelUsed,
        status: "completed",
        analyzedAt: new Date(),
        createdAt: new Date(),
      });
    } catch (err: any) {
      console.error(`AI analysis failed for offer ${offerData.id}:`, err);
      const existing = await storage.getProposalAnalysisByOffer(offerData.id);
      if (existing) {
        await storage.updateProposalAnalysis(existing.id, {
          status: "failed",
          errorMessage: err.message || "Analysis failed",
        });
        return { ...existing, status: "failed" };
      }
      return await storage.createProposalAnalysis({
        tenderId: tender.id,
        offerId: offerData.id,
        status: "failed",
        errorMessage: err.message || "Analysis failed",
        createdAt: new Date(),
      });
    }
  }

  // Analyze a single offer
  app.post("/api/ai/analyze-offer/:offerId",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const config = getOpenAIConfig();
        if (!config) {
          return res.status(503).json({ message: "AI is not configured. Please set up an OpenAI API key." });
        }

        const offer = await storage.getOffer(req.params.offerId);
        if (!offer) return res.status(404).json({ message: "Offer not found" });

        const tender = await storage.getTender(offer.tenderId);
        if (!tender) return res.status(404).json({ message: "Tender not found" });
        if (tender.companyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Only the tender owner can analyze proposals" });
        }

        // Get full offer data with company info
        const offersData = await storage.getOffersByTender(tender.id);
        const offerData = offersData.find(o => o.id === offer.id);
        if (!offerData) return res.status(404).json({ message: "Offer data not found" });

        const outputLanguage: 'en' | 'ar' = req.body?.language === 'ar' ? 'ar' : 'en';
        const analysis = await analyzeOfferWithAI(config, tender, offerData, outputLanguage);
        res.json(analysis);
      } catch (error) {
        console.error("Single offer analysis error:", error);
        res.status(500).json({ message: "Failed to analyze offer" });
      }
    }
  );

  // Analyze all proposals for a tender
  app.post("/api/ai/analyze-proposals/:tenderId",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const config = getOpenAIConfig();
        if (!config) {
          return res.status(503).json({ message: "AI is not configured. Please set up an OpenAI API key." });
        }

        const tender = await storage.getTender(req.params.tenderId);
        if (!tender) return res.status(404).json({ message: "Tender not found" });
        if (tender.companyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Only the tender owner can analyze proposals" });
        }

        const offersData = await storage.getOffersByTender(req.params.tenderId);
        if (offersData.length === 0) {
          return res.status(400).json({ message: "No proposals to analyze" });
        }

        // Delete existing analyses for fresh run
        await storage.deleteProposalAnalysesByTender(req.params.tenderId);

        const outputLanguage: 'en' | 'ar' = req.body?.language === 'ar' ? 'ar' : 'en';

        // Clear both EN and AR cached requirements so Agent 1 re-runs from scratch
        // and the Arabic translation is regenerated from the new English list
        await storage.updateTender(req.params.tenderId, { rfpRequirements: null, rfpRequirementsAr: null } as any);
        (tender as any).rfpRequirements = null;
        (tender as any).rfpRequirementsAr = null;

        // Analyze each offer using the shared helper
        for (const offerData of offersData) {
          await analyzeOfferWithAI(config, tender, offerData, outputLanguage);
        }

        // Return enriched analyses
        const allAnalyses = await storage.getProposalAnalysesByTender(req.params.tenderId);
        const enriched = allAnalyses.map(analysis => {
          const offerData = offersData.find(o => o.id === analysis.offerId);
          return {
            ...analysis,
            offer: offerData ? {
              id: offerData.id,
              quotePrice: offerData.quotePrice,
              notes: offerData.notes,
              technicalFileUrl: offerData.technicalFileUrl,
              financialFileUrl: offerData.financialFileUrl,
              combinedFileUrl: offerData.combinedFileUrl,
              videoUrl: offerData.videoUrl,
              status: offerData.status,
              submittedAt: offerData.submittedAt,
            } : null,
            company: offerData ? {
              id: offerData.company.id,
              name: offerData.company.name,
              category: offerData.company.category,
              verificationStatus: offerData.company.verificationStatus,
              displayName: (offerData as any).profile?.displayName,
              logoUrl: (offerData as any).profile?.logoUrl,
            } : null,
          };
        });

        res.json(enriched);
      } catch (error) {
        console.error("Proposal analysis error:", error);
        res.status(500).json({ message: "Failed to analyze proposals" });
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

        // Check if tender exists and get deadline
        const tender = await storage.getTender(req.params.id);
        if (!tender) {
          return res.status(404).json({ message: "Tender not found" });
        }

        // Check if tender is still accepting submissions (deadline not passed)
        if (tender.deadline) {
          const deadlineDate = new Date(tender.deadline);
          // Set deadline to end of day
          deadlineDate.setHours(23, 59, 59, 999);
          const now = new Date();

          if (now > deadlineDate) {
            return res.status(403).json({
              message: "Submission deadline has passed. This tender is no longer accepting proposals.",
              deadline: tender.deadline
            });
          }
        }

        // Check if tender is published (not closed or cancelled)
        if (tender.status !== 'published') {
          return res.status(403).json({
            message: `This tender is ${tender.status} and not accepting proposals.`,
            status: tender.status
          });
        }

        // Require verified company before submitting proposals
        if (company.verificationStatus !== 'verified') {
          return res.status(403).json({
            message: "Your company must be verified before submitting proposals. Upload your documents in Settings to begin the verification process.",
            requiresVerification: true,
            verificationStatus: company.verificationStatus
          });
        }

        // Check for existing offer from this company for this tender
        const existingOffer = await storage.getOfferByTenderAndCompany(
          req.params.id,
          req.auth!.activeCompanyId!
        );
        if (existingOffer) {
          // Allow resubmission if the resubmissionAllowed flag is set
          if (existingOffer.resubmissionAllowed) {
            await storage.updateOfferStatus(existingOffer.id, 'superseded', req.auth!.userId);
          } else {
            return res.status(409).json({
              message: "You have already submitted an offer for this tender",
              existingOfferId: existingOffer.id
            });
          }
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

        // Auto-add vendor to requester's vendors base on submission
        try {
          const isAlreadyInBase = await storage.isVendorInBase(tender.companyId, req.auth!.activeCompanyId!);
          if (!isAlreadyInBase) {
            await storage.addVendorToBase({
              requesterCompanyId: tender.companyId,
              vendorCompanyId: req.auth!.activeCompanyId!,
              joinMethod: 'proposal_submitted',
              addedBy: req.auth!.userId
            });
          }
        } catch (err) {
          console.error('Auto-add vendor to base failed:', err);
        }

        res.json(offer);

        // Fire-and-forget: email notification to tender owner at proposal milestones (1st, 5th, 10th, 15th, ...)
        (async () => {
          try {
            const allOffers = await storage.getOffersByTender(tender.id);
            const proposalCount = allOffers.length;

            // Only notify on the 1st proposal, then every 5th (5, 10, 15, 20, ...)
            if (proposalCount !== 1 && proposalCount % 5 !== 0) return;

            const members = await storage.getCompanyMembers(tender.companyId);
            const adminMembers = members.filter(
              m => m.roleInCompany === 'owner' || m.roleInCompany === 'admin'
            );
            const recipients = adminMembers
              .filter(m => m.user.email)
              .map(m => ({ email: m.user.email, name: m.user.name || undefined, language: (m.user.language || 'en') as 'en' | 'ar' }));

            const vendorProfile = await storage.getCompanyProfile(req.auth!.activeCompanyId!);
            const vendorDisplayName = vendorProfile?.displayName || company.name;

            await sendNewOfferNotification({
              tenderTitle: tender.title || 'Untitled Tender',
              tenderId: tender.id,
              vendorCompanyName: vendorDisplayName,
              submittedAt: offer.submittedAt ? new Date(offer.submittedAt) : new Date(),
              proposalCount,
              recipients,
            });
          } catch (emailErr) {
            console.error('[Email] New offer notification failed:', emailErr);
          }
        })();
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

  // Get incoming offers on company's tenders (with view status)
  app.get("/api/my-tenders/offers",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const offers = await storage.getIncomingOffersByCompanyWithViews(
          req.auth!.activeCompanyId!,
          req.auth!.userId
        );
        res.json(offers);
      } catch (error) {
        console.error('Get incoming offers error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Mark an offer as viewed
  app.post("/api/offers/:offerId/view",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const { offerId } = req.params;
        
        // Verify this offer belongs to a tender owned by the user's company
        const incomingOffers = await storage.getIncomingOffersByCompany(req.auth!.activeCompanyId!);
        const hasAccess = incomingOffers.some(o => o.id === offerId);
        
        if (!hasAccess) {
          return res.status(403).json({ message: "You don't have access to this offer" });
        }
        
        await storage.markOfferViewed(offerId, req.auth!.userId);
        res.json({ success: true });
      } catch (error) {
        console.error('Mark offer viewed error:', error);
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

        // Fire-and-forget: notify vendor of decision (accepted or rejected)
        if (status === 'accepted' || status === 'rejected') {
          (async () => {
            try {
              const tender = await storage.getTender(offer.tenderId);
              const requesterProfile = await storage.getCompanyProfile(req.auth!.activeCompanyId!);
              const requesterCompany = await storage.getCompany(req.auth!.activeCompanyId!);
              const requesterName = requesterProfile?.displayName || requesterCompany?.name || 'Unknown';

              const vendorMembers = await storage.getCompanyMembers(offer.companyId);
              const recipients = vendorMembers
                .filter(m => (m.roleInCompany === 'owner' || m.roleInCompany === 'admin') && m.user.email)
                .map(m => ({ email: m.user.email as string, name: m.user.name || undefined, language: (m.user.language || 'en') as 'en' | 'ar' }));

              await sendOfferDecisionNotification({
                outcome: status,
                tenderTitle: tender?.title || 'Untitled Tender',
                tenderId: offer.tenderId,
                requesterCompanyName: requesterName,
                recipients,
              });
            } catch (emailErr) {
              console.error('[Email] Offer decision notification failed:', emailErr);
            }
          })();
        }
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
  // TENDER SAVINGS ROUTES
  // ==========================================================================

  // Save vendor selection + savings data
  app.post("/api/tenders/:tenderId/savings",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const tender = await storage.getTender(req.params.tenderId);
        if (!tender) return res.status(404).json({ message: "Tender not found" });
        if (tender.companyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Only the tender owner can record savings" });
        }

        const { selectedOfferId, selectedCompanyId, selectedPrice, highestPrice, lowestPrice } = req.body;
        if (!selectedOfferId || !selectedCompanyId || selectedPrice == null || highestPrice == null || lowestPrice == null) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        const savingsAmount = highestPrice - selectedPrice;
        const savingsPercentage = highestPrice > 0 ? Math.round((savingsAmount / highestPrice) * 100) : 0;

        const savings = await storage.createTenderSavings({
          tenderId: req.params.tenderId,
          selectedOfferId,
          selectedCompanyId,
          selectedPrice,
          highestPrice,
          lowestPrice,
          savingsAmount,
          savingsPercentage,
          selectedBy: req.auth!.userId,
        });

        res.json(savings);
      } catch (error) {
        console.error('Create tender savings error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get savings for a tender
  app.get("/api/tenders/:tenderId/savings",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const tender = await storage.getTender(req.params.tenderId);
        if (!tender) return res.status(404).json({ message: "Tender not found" });
        if (tender.companyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Access denied" });
        }

        const savings = await storage.getTenderSavings(req.params.tenderId);
        res.json(savings || null);
      } catch (error) {
        console.error('Get tender savings error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // ==========================================================================
  // NEGOTIATION ACTION ROUTES
  // ==========================================================================

  // Create negotiation action(s) - batch support
  app.post("/api/tenders/:tenderId/negotiation-actions",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const tender = await storage.getTender(req.params.tenderId);
        if (!tender) return res.status(404).json({ message: "Tender not found" });
        if (tender.companyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Only the tender owner can perform negotiation actions" });
        }
        if (tender.status !== 'closed') {
          return res.status(400).json({ message: "Negotiation actions are only allowed on closed tenders" });
        }

        const { actions } = req.body as {
          actions: {
            offerId: string;
            companyId: string;
            actionType: string;
            message: string;
            comment?: string;
            metadata?: any;
          }[];
        };

        if (!actions || !Array.isArray(actions) || actions.length === 0) {
          return res.status(400).json({ message: "At least one action is required" });
        }

        const createdActions = [];
        const autoRejectedVendors: { companyId: string; message: string }[] = [];

        for (const action of actions) {
          // Validate actionType
          if (!['resubmission_request', 'discount_request', 'award', 'rejection', 'free_message'].includes(action.actionType)) {
            return res.status(400).json({ message: `Invalid action type: ${action.actionType}` });
          }

          // For award: check no existing award for this tender
          if (action.actionType === 'award') {
            const existingAward = await storage.getBlockedAwards();
            const tenderAwards = existingAward.filter(a => a.tenderId === req.params.tenderId);
            // Also check for non-blocked awards
            const offers = await storage.getOffersByTender(req.params.tenderId);
            const acceptedOffer = offers.find(o => o.status === 'accepted');
            if (tenderAwards.length > 0 || acceptedOffer) {
              return res.status(409).json({ message: "An award already exists for this tender" });
            }
          }

          const created = await storage.createNegotiationAction({
            tenderId: req.params.tenderId,
            offerId: action.offerId,
            companyId: action.companyId,
            actionType: action.actionType,
            message: action.message,
            comment: action.comment || null,
            metadata: action.metadata || null,
            status: 'sent',
            createdBy: req.auth!.userId,
          });

          createdActions.push(created);

          // Side effects based on action type
          if (action.actionType === 'resubmission_request') {
            await storage.allowOfferResubmission(action.offerId);
          }

          if (action.actionType === 'award') {
            // Accept the winning offer
            await storage.updateOfferStatus(action.offerId, 'accepted', req.auth!.userId);

            // Create award record — always awarded regardless of vendor verification status
            await storage.createAward({
              tenderId: req.params.tenderId,
              companyId: action.companyId,
              offerId: action.offerId,
              status: 'awarded',
              awardedBy: req.auth!.userId,
              awardedAt: new Date(),
            });

            // Auto-add vendor to vendors base
            const isInBase = await storage.isVendorInBase(req.auth!.activeCompanyId!, action.companyId);
            if (!isInBase) {
              await storage.addVendorToBase({
                requesterCompanyId: req.auth!.activeCompanyId!,
                vendorCompanyId: action.companyId,
                joinMethod: 'awarded',
                addedBy: req.auth!.userId,
              });
            }

            // Auto-reject all other pending offers
            const allOffers = await storage.getOffersByTender(req.params.tenderId);
            const rejectionMessage = action.metadata?.rejectionMessage || 'Another vendor has been selected for this tender.';
            for (const otherOffer of allOffers) {
              if (otherOffer.id !== action.offerId && otherOffer.status === 'pending') {
                await storage.updateOfferStatus(otherOffer.id, 'rejected', req.auth!.userId);
                // Create rejection negotiation action for each rejected vendor
                await storage.createNegotiationAction({
                  tenderId: req.params.tenderId,
                  offerId: otherOffer.id,
                  companyId: otherOffer.companyId,
                  actionType: 'rejection',
                  message: rejectionMessage,
                  comment: null,
                  metadata: { rejectionMessage },
                  status: 'sent',
                  createdBy: req.auth!.userId,
                });
                autoRejectedVendors.push({ companyId: otherOffer.companyId, message: rejectionMessage });
              }
            }
          }
        }

        res.json(createdActions);

        // Fire-and-forget: email notifications for each action
        (async () => {
          try {
            const requesterProfile = await storage.getCompanyProfile(req.auth!.activeCompanyId!);
            const requesterCompany = await storage.getCompany(req.auth!.activeCompanyId!);
            const requesterName = requesterProfile?.displayName || requesterCompany?.name || 'Unknown';

            for (const action of createdActions) {
              const vendorMembers = await storage.getCompanyMembers(action.companyId);
              const vendorRecipients = vendorMembers
                .filter(m => (m.roleInCompany === 'owner' || m.roleInCompany === 'admin') && m.user.email)
                .map(m => ({ email: m.user.email as string, name: m.user.name || undefined, language: (m.user.language || 'en') as 'en' | 'ar' }));

              if (action.actionType === 'award') {
                // Notify winning vendor unconditionally
                await sendAwardNotification({
                  tenderTitle: tender.title || 'Untitled Tender',
                  tenderId: tender.id,
                  requesterCompanyName: requesterName,
                  message: action.message || undefined,
                  recipients: vendorRecipients,
                });
              } else if (['resubmission_request', 'discount_request', 'free_message'].includes(action.actionType)) {
                await sendNegotiationActionNotification({
                  actionType: action.actionType as 'resubmission_request' | 'discount_request' | 'free_message' | 'rejection',
                  tenderTitle: tender.title || 'Untitled Tender',
                  tenderId: tender.id,
                  requesterCompanyName: requesterName,
                  message: action.message,
                  recipients: vendorRecipients,
                });
              }
            }

            // Auto-rejected vendors are NOT notified by email — no inbox spam for non-selected vendors
          } catch (emailErr) {
            console.error('[Email] Negotiation action notification failed:', emailErr);
          }
        })();
      } catch (error) {
        console.error('Create negotiation action error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get negotiation actions for a tender
  app.get("/api/tenders/:tenderId/negotiation-actions",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const tender = await storage.getTender(req.params.tenderId);
        if (!tender) return res.status(404).json({ message: "Tender not found" });
        if (tender.companyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Access denied" });
        }

        const actions = await storage.getNegotiationActionsByTender(req.params.tenderId);
        res.json(actions);
      } catch (error) {
        console.error('Get negotiation actions error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get vendor contact info for an offer
  app.get("/api/offers/:offerId/contact-info",
    authenticateToken,
    requireCompanyContext,
    async (req: AuthRequest, res) => {
      try {
        const offer = await storage.getOffer(req.params.offerId);
        if (!offer) return res.status(404).json({ message: "Offer not found" });

        // Verify requester owns the tender
        const tender = await storage.getTender(offer.tenderId);
        if (!tender || tender.companyId !== req.auth!.activeCompanyId) {
          return res.status(403).json({ message: "Access denied" });
        }

        const company = await storage.getCompany(offer.companyId);
        if (!company) return res.status(404).json({ message: "Company not found" });

        const profile = await storage.getCompanyProfile(offer.companyId);

        // Get the user who created the offer for contact info
        const offerCreator = await storage.getUser(offer.createdBy);

        res.json({
          companyName: company.name,
          displayName: profile?.displayName || company.name,
          logoUrl: profile?.logoUrl || null,
          city: company.city || null,
          email: offerCreator?.email || offerCreator?.tenderInquiryEmail || null,
          phoneNumber: offerCreator?.phoneNumber || null,
          socialLinks: profile?.socialLinks || null,
        });
      } catch (error) {
        console.error('Get contact info error:', error);
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

        // Map to the shape the frontend expects
        const mapped = await Promise.all(requests.map(async (r) => {
          const createdByUser = r.createdBy ? await storage.getUser(r.createdBy) : undefined;
          return {
            id: r.id,
            requesterId: r.requesterId,
            vendorId: r.vendorCompanyId,
            status: r.status,
            rejectionReason: r.rejectionReason,
            createdAt: r.createdAt,
            decidedAt: r.decidedAt,
            vendor: {
              id: r.vendorCompany.id,
              name: createdByUser?.name || r.profile?.displayName || r.vendorCompany.name,
              email: createdByUser?.email || null,
              company: r.profile?.displayName || r.vendorCompany.name,
              expertise: r.vendorCompany.category,
              verificationStatus: r.vendorCompany.verificationStatus || 'not_verified',
              logoUrl: r.profile?.logoUrl || null,
              bio: r.profile?.bio || null,
              websiteUrl: r.profile?.socialLinks?.website || null,
            },
          };
        }));

        res.json(mapped);
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

        // Check if vendor already in base — if so, just mark the request as approved
        const alreadyInBase = await storage.isVendorInBase(
          req.auth!.activeCompanyId!,
          joinRequest.vendorCompanyId
        );
        if (alreadyInBase) {
          const updated = await storage.updateJoinRequestStatus(id, 'approved', req.auth!.userId);
          return res.json({ ...updated, message: "Vendor is already in your base — request marked as approved" });
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

        // Fire-and-forget: notify vendor of approval
        (async () => {
          try {
            const vendorMembers = await storage.getCompanyMembers(joinRequest.vendorCompanyId!);
            const recipients = vendorMembers
              .filter(m => (m.roleInCompany === 'owner' || m.roleInCompany === 'admin') && m.user.email)
              .map(m => ({ email: m.user.email as string, name: m.user.name || undefined, language: (m.user.language || 'en') as 'en' | 'ar' }));
            const requesterProfile = await storage.getCompanyProfile(joinRequest.requesterCompanyId!);
            const requesterCompany = await storage.getCompany(joinRequest.requesterCompanyId!);
            const requesterName = requesterProfile?.displayName || requesterCompany?.name || 'Unknown';
            const vendorProfile = await storage.getCompanyProfile(joinRequest.vendorCompanyId!);
            const vendorCompany = await storage.getCompany(joinRequest.vendorCompanyId!);
            const vendorName = vendorProfile?.displayName || vendorCompany?.name || 'Unknown';
            await sendJoinRequestDecisionNotification({
              decision: 'approved',
              vendorCompanyName: vendorName,
              requesterCompanyName: requesterName,
              recipients,
            });
          } catch (emailErr) {
            console.error('[Email] Join request approval notification failed:', emailErr);
          }
        })();
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

        // Fire-and-forget: notify vendor of rejection
        (async () => {
          try {
            const vendorMembers = await storage.getCompanyMembers(joinRequest.vendorCompanyId!);
            const recipients = vendorMembers
              .filter(m => (m.roleInCompany === 'owner' || m.roleInCompany === 'admin') && m.user.email)
              .map(m => ({ email: m.user.email as string, name: m.user.name || undefined, language: (m.user.language || 'en') as 'en' | 'ar' }));
            const requesterProfile = await storage.getCompanyProfile(joinRequest.requesterCompanyId!);
            const requesterCompany = await storage.getCompany(joinRequest.requesterCompanyId!);
            const requesterName = requesterProfile?.displayName || requesterCompany?.name || 'Unknown';
            const vendorProfile = await storage.getCompanyProfile(joinRequest.vendorCompanyId!);
            const vendorCompany = await storage.getCompany(joinRequest.vendorCompanyId!);
            const vendorName = vendorProfile?.displayName || vendorCompany?.name || 'Unknown';
            await sendJoinRequestDecisionNotification({
              decision: 'rejected',
              vendorCompanyName: vendorName,
              requesterCompanyName: requesterName,
              recipients,
            });
          } catch (emailErr) {
            console.error('[Email] Join request rejection notification failed:', emailErr);
          }
        })();
      } catch (error) {
        console.error('Reject join request error:', error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get vendor profile for a join request
  app.get("/api/join-requests/:id/profile",
    authenticateToken,
    requireCompanyContext,
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

        const vendorCompany = await storage.getCompany(joinRequest.vendorCompanyId);
        const profile = await storage.getCompanyProfile(joinRequest.vendorCompanyId);
        const createdByUser = joinRequest.createdBy ? await storage.getUser(joinRequest.createdBy) : undefined;

        res.json({
          vendor: {
            id: vendorCompany?.id,
            name: createdByUser?.name || profile?.displayName || vendorCompany?.name || 'Unknown',
            email: createdByUser?.email || null,
            company: vendorCompany?.name || 'Unknown',
            verificationStatus: vendorCompany?.verificationStatus || 'not_verified',
          },
          profile: profile ? {
            displayName: profile.displayName,
            logoUrl: profile.logoUrl,
            headerUrl: profile.headerUrl,
            bio: profile.bio,
            category: vendorCompany?.category || null,
            profileFileUrl: profile.brochureUrl || null,
            linkedinUrl: profile.socialLinks?.linkedin || null,
            xUrl: profile.socialLinks?.twitter || null,
            websiteUrl: profile.socialLinks?.website || null,
          } : null,
        });
      } catch (error) {
        console.error('Get join request profile error:', error);
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
          category: result.company.category,
          city: result.company.city,
          verificationStatus: result.company.verificationStatus,
        },
        profile: {
          displayName: result.displayName,
          bio: result.bio,
          logoUrl: result.logoUrl,
          headerUrl: result.headerUrl,
          socialLinks: result.socialLinks,
          tags: result.tags || [],
          tractionTheme: result.tractionTheme || null
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

        // Check if vendor is already in the requester's base
        const alreadyInBase = await storage.isVendorInBase(
          result.company.id,
          req.auth!.activeCompanyId!
        );
        if (alreadyInBase) {
          return res.status(409).json({
            code: "ALREADY_IN_BASE",
            message: "You are already in this company's Vendors Base"
          });
        }

        // Check for existing pending join request
        const existingRequest = await storage.getJoinRequestByCompanies(
          req.auth!.activeCompanyId!,
          result.company.id
        );

        if (existingRequest && existingRequest.status === 'pending') {
          return res.status(409).json({
            code: "REQUEST_ALREADY_PENDING",
            message: "You already have a pending request to join this company's Vendors Base"
          });
        }

        if (existingRequest && existingRequest.createdAt) {
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          if (new Date(existingRequest.createdAt) > dayAgo) {
            return res.status(409).json({
              code: "REQUEST_ALREADY_PENDING",
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

        // Fire-and-forget: notify requester company admins of new join request
        (async () => {
          try {
            const requesterMembers = await storage.getCompanyMembers(result.company.id);
            const recipients = requesterMembers
              .filter(m => (m.roleInCompany === 'owner' || m.roleInCompany === 'admin') && m.user.email)
              .map(m => ({ email: m.user.email as string, name: m.user.name || undefined, language: (m.user.language || 'en') as 'en' | 'ar' }));
            const vendorProfile = await storage.getCompanyProfile(req.auth!.activeCompanyId!);
            const vendorCompany = await storage.getCompany(req.auth!.activeCompanyId!);
            const vendorName = vendorProfile?.displayName || vendorCompany?.name || 'Unknown Vendor';
            await sendJoinRequestNotification({
              vendorCompanyName: vendorName,
              requesterCompanyName: result.displayName || result.company.name,
              recipients,
            });
          } catch (emailErr) {
            console.error('[Email] Join request notification failed:', emailErr);
          }
        })();
      } catch (error) {
        console.error('Submit join request error:', error);
        res.status(400).json({ message: "Failed to submit join request" });
      }
    }
  );

  // ==========================================================================
  // OBJECT STORAGE ROUTES
  // ==========================================================================

  // Serve PUBLIC objects (profile pictures, company logos) - NO authentication required
  app.get("/objects/profile-pictures/:filename", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = `/objects/profile-pictures/${req.params.filename}`;
      const objectFile = await objectStorageService.getPublicFile(objectPath);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving public profile picture:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.get("/objects/company-logos/:filename", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = `/objects/company-logos/${req.params.filename}`;
      const objectFile = await objectStorageService.getPublicFile(objectPath);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving public company logo:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.get("/objects/company-headers/:filename", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = `/objects/company-headers/${req.params.filename}`;
      const objectFile = await objectStorageService.getPublicFile(objectPath);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving public company header:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.get("/objects/company-brochures/:filename", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = `/objects/company-brochures/${req.params.filename}`;
      const objectFile = await objectStorageService.getPublicFile(objectPath);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving public company brochure:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.get("/objects/portfolio-images/:filename", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = `/objects/portfolio-images/${req.params.filename}`;
      const objectFile = await objectStorageService.getPublicFile(objectPath);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving portfolio image:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.get("/objects/uploads/:filename", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = `/objects/uploads/${req.params.filename}`;
      try {
        const objectFile = await objectStorageService.getPublicFile(objectPath);
        return objectStorageService.downloadObject(objectFile, res);
      } catch {}
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving public upload:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ];

  // Get upload URL
  app.post("/api/objects/upload", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { fileSize, fileType } = req.body || {};

      if (fileSize && fileSize > MAX_UPLOAD_SIZE) {
        return res.status(400).json({ error: `File too large (${(fileSize / (1024 * 1024)).toFixed(1)}MB). Maximum size is ${MAX_UPLOAD_SIZE / (1024 * 1024)}MB.` });
      }

      if (fileType && !ALLOWED_MIME_TYPES.includes(fileType) && 
          !fileType.startsWith('audio/') && !fileType.startsWith('video/')) {
        return res.status(400).json({ error: `File type "${fileType}" is not allowed. Accepted types: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, audio, and video.` });
      }

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
      // that has a proposal with this file, or if user's company submitted the proposal
      if (!canAccess && activeCompanyId) {
        const offerWithFile = await storage.getOfferByFileUrl(filePath);
        if (offerWithFile) {
          if (offerWithFile.companyId === activeCompanyId) {
            canAccess = true;
          } else {
            const tender = await storage.getTender(offerWithFile.tenderId);
            if (tender && tender.companyId === activeCompanyId) {
              canAccess = true;
            }
          }
        }
      }
      
      // Check if this is a voice note attached to a tender (any authenticated user can access)
      if (!canAccess) {
        const tenderWithVoice = await storage.getTenderByVoiceNoteUrl(filePath);
        if (tenderWithVoice) {
          if (tenderWithVoice.status === 'published') {
            canAccess = true;
          }
          if (activeCompanyId && tenderWithVoice.companyId === activeCompanyId) {
            canAccess = true;
          }
        }
      }

      // Check if this is an attachment on a published tender
      if (!canAccess) {
        const tenderWithAttachment = await storage.getTenderByAttachmentUrl(filePath);
        if (tenderWithAttachment) {
          if (tenderWithAttachment.status === 'published') {
            canAccess = true;
          }
          if (activeCompanyId && tenderWithAttachment.companyId === activeCompanyId) {
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

      const fileSize = objectFile.metadata?.size ? parseInt(String(objectFile.metadata.size), 10) : 0;
      if (fileSize > MAX_UPLOAD_SIZE) {
        return res.status(400).json({ error: `File too large (${(fileSize / (1024 * 1024)).toFixed(1)}MB). Maximum size is ${MAX_UPLOAD_SIZE / (1024 * 1024)}MB.` });
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

      // Fire-and-forget: notify company owners/admins of verification
      (async () => {
        try {
          const members = await storage.getCompanyMembers(companyId);
          const recipients = members
            .filter(m => (m.roleInCompany === 'owner' || m.roleInCompany === 'admin') && m.user.email)
            .map(m => ({ email: m.user.email as string, name: m.user.name || undefined, language: (m.user.language || 'en') as 'en' | 'ar' }));
          const profile = await storage.getCompanyProfile(companyId);
          const company = await storage.getCompany(companyId);
          const companyName = profile?.displayName || company?.name || 'Your Company';
          await sendCompanyVerificationNotification({
            outcome: 'verified',
            companyName,
            recipients,
          });
        } catch (emailErr) {
          console.error('[Email] Company verification notification failed:', emailErr);
        }
      })();
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

      // Fire-and-forget: notify company owners/admins of rejection
      (async () => {
        try {
          const members = await storage.getCompanyMembers(companyId);
          const recipients = members
            .filter(m => (m.roleInCompany === 'owner' || m.roleInCompany === 'admin') && m.user.email)
            .map(m => ({ email: m.user.email as string, name: m.user.name || undefined, language: (m.user.language || 'en') as 'en' | 'ar' }));
          const profile = await storage.getCompanyProfile(companyId);
          const company = await storage.getCompany(companyId);
          const companyName = profile?.displayName || company?.name || 'Your Company';
          await sendCompanyVerificationNotification({
            outcome: 'rejected',
            companyName,
            rejectionReason: reason,
            recipients,
          });
        } catch (emailErr) {
          console.error('[Email] Company rejection notification failed:', emailErr);
        }
      })();
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

  // Approve join request (admin)
  app.post("/api/admin/join-requests/:id/approve", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await storage.approveJoinRequestByAdmin(id, req.auth!.userId);
      res.json({ message: "Join request approved" });
    } catch (error: any) {
      console.error('Admin approve join request error:', error);
      res.status(error.message === 'Join request not found' ? 404 : 500).json({ message: error.message || "Server error" });
    }
  });

  // Reject join request (admin)
  app.post("/api/admin/join-requests/:id/reject", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      await storage.rejectJoinRequestByAdmin(id, reason, req.auth!.userId);
      res.json({ message: "Join request rejected" });
    } catch (error: any) {
      console.error('Admin reject join request error:', error);
      res.status(500).json({ message: error.message || "Server error" });
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

  // Search/list users (admin)
  app.get("/api/admin/users", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { q } = req.query;
      const searchTerm = (q as string || '').trim();
      const allUsers = await storage.searchUsers(searchTerm);
      res.json(allUsers);
    } catch (error) {
      console.error('Admin search users error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // List all companies (admin)
  app.get("/api/admin/companies", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { status } = req.query;
      const allCompanies = await storage.getAllCompaniesAdmin(status as string | undefined);
      res.json(allCompanies);
    } catch (error) {
      console.error('Admin list companies error:', error);
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

  // ============================================================================
  // TENDER TEMPLATES API
  // ============================================================================

  // Create a new template
  app.post("/api/templates", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const validatedData = createTenderTemplateSchema.parse(req.body);

      const template = await storage.createTenderTemplate({
        ...validatedData,
        userId: req.auth!.userId,
        companyId: req.auth!.activeCompanyId!,
      });

      res.status(201).json(template);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid template data', errors: error.errors });
      }
      console.error('Create template error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get all templates for current company
  app.get("/api/templates", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const templates = await storage.getTenderTemplates(req.auth!.activeCompanyId!);
      res.json(templates);
    } catch (error) {
      console.error('Get templates error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get a specific template
  app.get("/api/templates/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const template = await storage.getTenderTemplate(req.params.id);

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check access - user must belong to the company or template is public
      if (!template.isPublic && template.companyId !== req.auth!.activeCompanyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(template);
    } catch (error) {
      console.error('Get template error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update a template
  app.patch("/api/templates/:id", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const template = await storage.getTenderTemplate(req.params.id);

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check ownership
      if (template.companyId !== req.auth!.activeCompanyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updated = await storage.updateTenderTemplate(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Update template error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Delete a template
  app.delete("/api/templates/:id", authenticateToken, requireCompanyContext, async (req: AuthRequest, res) => {
    try {
      const template = await storage.getTenderTemplate(req.params.id);

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check ownership
      if (template.companyId !== req.auth!.activeCompanyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteTenderTemplate(req.params.id);
      res.json({ message: "Template deleted" });
    } catch (error) {
      console.error('Delete template error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  registerCopilotRoutes(app);

  // ============================================================================
  // AI CHAT HISTORY
  // ============================================================================

  app.get("/api/ai-chat-sessions", authenticateToken, async (req, res) => {
    try {
      const sessions = await storage.getAiChatSessions(
        req.auth!.userId,
        req.auth!.activeCompanyId || undefined
      );
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching AI chat sessions:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/ai-chat-sessions/:id", authenticateToken, async (req, res) => {
    try {
      const session = await storage.getAiChatSession(req.params.id);
      if (!session || session.userId !== req.auth!.userId) {
        return res.status(404).json({ message: "Session not found" });
      }
      const messages = await storage.getAiChatMessages(req.params.id);
      res.json({ ...session, messages });
    } catch (error) {
      console.error("Error fetching AI chat session:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/ai-chat-sessions", authenticateToken, async (req, res) => {
    try {
      const session = await storage.createAiChatSession({
        userId: req.auth!.userId,
        companyId: req.auth!.activeCompanyId || null,
        title: req.body.title || "New Chat",
        tenderId: req.body.tenderId || null,
        tenderData: req.body.tenderData || null,
      });
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating AI chat session:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/ai-chat-sessions/:id", authenticateToken, async (req, res) => {
    try {
      const session = await storage.getAiChatSession(req.params.id);
      if (!session || session.userId !== req.auth!.userId) {
        return res.status(404).json({ message: "Session not found" });
      }
      const allowedFields: Record<string, any> = {};
      if (req.body.title) allowedFields.title = String(req.body.title).slice(0, 200);
      if (req.body.tenderData !== undefined) allowedFields.tenderData = req.body.tenderData;
      const updated = await storage.updateAiChatSession(req.params.id, allowedFields);
      res.json(updated);
    } catch (error) {
      console.error("Error updating AI chat session:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/ai-chat-sessions/:id", authenticateToken, async (req, res) => {
    try {
      const session = await storage.getAiChatSession(req.params.id);
      if (!session || session.userId !== req.auth!.userId) {
        return res.status(404).json({ message: "Session not found" });
      }
      await storage.deleteAiChatSession(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting AI chat session:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/ai-chat-sessions/:id/messages", authenticateToken, async (req, res) => {
    try {
      const session = await storage.getAiChatSession(req.params.id);
      if (!session || session.userId !== req.auth!.userId) {
        return res.status(404).json({ message: "Session not found" });
      }
      const role = req.body.role;
      const content = req.body.content;
      if (!role || !content || !["user", "assistant"].includes(role)) {
        return res.status(400).json({ message: "Invalid role or content" });
      }
      const message = await storage.createAiChatMessage({
        sessionId: req.params.id,
        role,
        content: String(content),
        suggestions: Array.isArray(req.body.suggestions) ? req.body.suggestions : null,
        tenderData: req.body.tenderData || null,
      });
      await storage.updateAiChatSession(req.params.id, {});
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating AI chat message:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============================================================================
  // ERROR LOGGING
  // ============================================================================

  app.post("/api/errors", async (req, res) => {
    try {
      let userId: string | undefined;
      let companyId: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const jwt = await import("jsonwebtoken");
          const decoded = jwt.default.verify(authHeader.slice(7), process.env.JWT_SECRET!) as any;
          userId = decoded.userId;
          companyId = decoded.activeCompanyId;
        } catch {}
      }

      const { message, stack, path, statusCode, method, metadata } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Error message is required" });
      }

      await storage.createErrorLog({
        userId: userId || null,
        companyId: companyId || null,
        source: 'client',
        method: method || null,
        path: path || null,
        statusCode: statusCode || null,
        errorMessage: String(message).substring(0, 5000),
        stack: stack ? String(stack).substring(0, 10000) : null,
        userAgent: req.headers['user-agent'] || null,
        metadata: metadata || null,
      });

      res.json({ ok: true });
    } catch (error) {
      console.error("Error saving error log:", error);
      res.status(500).json({ error: "Failed to log error" });
    }
  });

  app.get("/api/admin/errors", authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const logs = await storage.getErrorLogs(200);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching error logs:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==========================================================================
  // MARKETPLACE ROUTES (PUBLIC)
  // ==========================================================================

  app.get("/api/marketplace/tenders", async (req, res) => {
    try {
      const { search, category, city, tenderType, sort, page, limit } = req.query;
      const result = await storage.getMarketplaceTenders({
        search: search as string,
        category: category as string,
        city: city as string,
        tenderType: tenderType as string,
        sort: sort as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 6,
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching marketplace tenders:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/marketplace/stats", async (_req, res) => {
    try {
      const stats = await storage.getMarketplaceStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching marketplace stats:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==========================================================================
  // MARKETPLACE ROUTES (AUTHENTICATED)
  // ==========================================================================

  app.post("/api/tenders/:id/marketplace-submit", authenticateToken, requireCompanyContext, requireCompanyRole('admin'), async (req: AuthRequest, res) => {
    try {
      const tender = await storage.getTender(req.params.id);
      if (!tender) return res.status(404).json({ message: "Tender not found" });
      if (tender.companyId !== req.auth!.activeCompanyId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (tender.status !== 'published') {
        return res.status(400).json({ message: "Tender must be published before submitting to marketplace" });
      }
      if (tender.isMarketplace && tender.marketplaceStatus === 'pending') {
        return res.status(400).json({ message: "Already submitted to marketplace" });
      }
      if (tender.isMarketplace && tender.marketplaceStatus === 'approved') {
        return res.status(400).json({ message: "Already on marketplace" });
      }

      const VALID_TENDER_TYPES = ['open_tender', 'direct_purchase', 'framework_agreement'];
      const { tenderType: reqTenderType, documentFee: reqDocFee, inquiryDeadline: reqInquiryDeadline } = req.body;

      if (reqTenderType && !VALID_TENDER_TYPES.includes(reqTenderType)) {
        return res.status(400).json({ message: "Invalid tender type" });
      }
      if (reqDocFee !== undefined && reqDocFee !== null) {
        const fee = Number(reqDocFee);
        if (!Number.isInteger(fee) || fee < 0 || fee > 100_000) {
          return res.status(400).json({ message: "Document fee must be a non-negative integer up to 100,000 SAR" });
        }
      }
      if (reqInquiryDeadline) {
        const d = new Date(reqInquiryDeadline);
        if (isNaN(d.getTime()) || d >= new Date(tender.deadline)) {
          return res.status(400).json({ message: "Inquiry deadline must be a valid date before the tender deadline" });
        }
      }

      const refNum = `BID-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      await storage.updateTender(tender.id, {
        isMarketplace: true,
        marketplaceStatus: 'pending',
        referenceNumber: refNum,
        tenderType: reqTenderType || 'open_tender',
        documentFee: reqDocFee || null,
        inquiryDeadline: reqInquiryDeadline || null,
      });

      await storage.logProductEvent({
        eventType: 'marketplace_submission',
        companyId: req.auth!.activeCompanyId!,
        userId: req.auth!.userId,
        metadata: { tenderId: tender.id },
      });

      res.json({ message: "Submitted to marketplace for review", referenceNumber: refNum });
    } catch (error) {
      console.error("Error submitting to marketplace:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==========================================================================
  // MARKETPLACE ADMIN ROUTES
  // ==========================================================================

  app.get("/api/admin/marketplace/pending", authenticateToken, requireAdmin, async (_req: AuthRequest, res) => {
    try {
      const pending = await storage.getPendingMarketplaceRequests();
      res.json(pending);
    } catch (error) {
      console.error("Error fetching pending marketplace:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/admin/marketplace/approved", authenticateToken, requireAdmin, async (_req: AuthRequest, res) => {
    try {
      const approved = await storage.getApprovedMarketplaceTenders();
      res.json(approved);
    } catch (error) {
      console.error("Error fetching approved marketplace:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/admin/marketplace/:id/approve", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const tender = await storage.getTender(req.params.id);
      if (!tender) return res.status(404).json({ message: "Tender not found" });
      if (!tender.isMarketplace || tender.marketplaceStatus !== 'pending') {
        return res.status(400).json({ message: "Tender is not pending marketplace approval" });
      }

      const company = await storage.getCompany(tender.companyId!);
      if (!company || company.verificationStatus !== 'verified') {
        return res.status(400).json({
          message: "Company must be verified before its tender can be approved for the marketplace.",
          requiresVerification: true,
          verificationStatus: company?.verificationStatus ?? 'unknown',
        });
      }

      const purchaseOrders = await storage.getPurchaseOrdersByTender(tender.id);
      const verifiedPO = purchaseOrders.find(po => po.status === 'verified');
      if (!verifiedPO) {
        return res.status(400).json({ 
          message: "No verified Purchase Order found. A verified PO is required before approving marketplace publication.",
          requiresPO: true,
          existingPOs: purchaseOrders.length,
        });
      }

      await storage.approveMarketplaceTender(tender.id, req.auth!.userId);
      res.json({ message: "Marketplace tender approved" });
    } catch (error) {
      console.error("Error approving marketplace tender:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/admin/marketplace/:id/reject", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { reason } = req.body;
      if (!reason) return res.status(400).json({ message: "Rejection reason required" });
      
      const tender = await storage.getTender(req.params.id);
      if (!tender) return res.status(404).json({ message: "Tender not found" });
      if (!tender.isMarketplace || !['pending', 'approved'].includes(tender.marketplaceStatus || '')) {
        return res.status(400).json({ message: "Tender is not eligible for marketplace rejection/removal" });
      }

      await storage.rejectMarketplaceTender(tender.id, reason, req.auth!.userId);
      res.json({ message: tender.marketplaceStatus === 'approved' ? "Tender removed from marketplace" : "Marketplace tender rejected" });
    } catch (error) {
      console.error("Error rejecting marketplace tender:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ==========================================================================
  // PURCHASE ORDER ROUTES
  // ==========================================================================

  app.post("/api/tenders/:id/purchase-orders", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tender = await storage.getTender(req.params.id);
      if (!tender) return res.status(404).json({ message: "Tender not found" });

      const isAdmin = req.auth!.isAdmin;
      const isOwner = tender.companyId === req.auth!.activeCompanyId;
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const { fileUrl, originalName, notes } = req.body;
      if (!fileUrl) return res.status(400).json({ message: "File URL required" });

      const po = await storage.createPurchaseOrder({
        tenderId: tender.id,
        uploadedBy: req.auth!.userId,
        fileUrl,
        originalName: originalName || null,
        notes: notes || null,
        status: 'pending',
      });

      res.json(po);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/tenders/:id/purchase-orders", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tender = await storage.getTender(req.params.id);
      if (!tender) return res.status(404).json({ message: "Tender not found" });

      const isAdmin = req.auth!.isAdmin;
      const isOwner = tender.companyId === req.auth!.activeCompanyId;
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Not authorized — PO is private" });
      }

      const pos = await storage.getPurchaseOrdersByTender(tender.id);
      res.json(pos);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Serve PO file by PO ID (admin only)
  app.get("/api/purchase-orders/:id/file", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po) return res.status(404).json({ message: "Purchase order not found" });

      // Allow admin or tender owner
      const tender = await storage.getTender(po.tenderId);
      const isAdmin = req.auth!.isAdmin;
      const isOwner = tender?.companyId === req.auth!.activeCompanyId;
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const fileUrl = po.fileUrl;
      if (!fileUrl) return res.status(404).json({ message: "No file attached" });

      // If it's already an /objects/ path, use the standard object storage flow
      const objectStorageService = new ObjectStorageService();
      if (fileUrl.startsWith('/objects/')) {
        try {
          const objectFile = await objectStorageService.getPublicFile(fileUrl);
          return objectStorageService.downloadObject(objectFile, res);
        } catch {}
        const objectFile = await objectStorageService.getObjectEntityFile(fileUrl);
        return objectStorageService.downloadObject(objectFile, res);
      }

      // Raw object store path (e.g. /replit-objstore-.../.private/uploads/uuid)
      const { bucketName, objectName } = (() => {
        let path = fileUrl;
        if (!path.startsWith("/")) path = `/${path}`;
        const parts = path.split("/");
        return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
      })();

      const { objectStorageClient } = await import('./objectStorage');
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (!exists) return res.status(404).json({ message: "File not found in storage" });

      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size?.toString() || undefined,
        "Cache-Control": "private, max-age=3600",
      });
      file.createReadStream().pipe(res);
    } catch (error) {
      console.error("Error serving PO file:", error);
      if (!res.headersSent) res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/purchase-orders/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { status } = req.body;
      if (!status || !['pending', 'verified', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be pending, verified, or rejected." });
      }
      const po = await storage.updatePurchaseOrder(req.params.id, { status });
      res.json(po);
    } catch (error) {
      console.error("Error updating purchase order:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/purchase-orders/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po) return res.status(404).json({ message: "Purchase order not found" });

      const tender = await storage.getTender(po.tenderId);
      if (!tender) return res.status(404).json({ message: "Tender not found" });

      const isAdmin = req.auth!.isAdmin;
      const isOwner = tender.companyId === req.auth!.activeCompanyId;
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (po.status === 'verified') {
        return res.status(400).json({ message: "Cannot delete a verified purchase order" });
      }

      await storage.deletePurchaseOrder(req.params.id);
      res.json({ message: "Purchase order deleted" });
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Global server-side error logging middleware
  app.use(async (err: any, req: any, res: any, next: any) => {
    let userId: string | undefined;
    let companyId: string | undefined;
    try {
      const authHeader = req.headers?.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const jwt = await import("jsonwebtoken");
        const decoded = jwt.default.verify(authHeader.slice(7), process.env.JWT_SECRET!) as any;
        userId = decoded.userId;
        companyId = decoded.activeCompanyId;
      }
    } catch {}

    try {
      await storage.createErrorLog({
        userId: userId || null,
        companyId: companyId || null,
        source: 'server',
        method: req.method || null,
        path: req.originalUrl || req.path || null,
        statusCode: err.status || err.statusCode || 500,
        errorMessage: err.message || 'Unknown server error',
        stack: err.stack || null,
        userAgent: req.headers?.['user-agent'] || null,
        metadata: null,
      });
    } catch (logErr) {
      console.error("Failed to save error log:", logErr);
    }

    console.error("Unhandled error:", err);
    if (!res.headersSent) {
      res.status(err.status || 500).json({ message: err.message || "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
