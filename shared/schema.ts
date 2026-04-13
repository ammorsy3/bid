import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// CORE TABLES - Company-Centric Model
// ============================================================================

// Users - Lightweight authentication only
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  
  // Profile fields
  profilePictureUrl: text("profile_picture_url"),
  jobTitle: text("job_title"),
  timezone: text("timezone"),
  linkedinUrl: text("linkedin_url"),
  phoneNumber: text("phone_number"),
  tenderInquiryEmail: text("tender_inquiry_email"),
  language: text("language").default("en"),

  // Email verification
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationCode: text("email_verification_code"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),

  // OTP security: rate limiting & lockout
  otpVerified: boolean("otp_verified").default(false).notNull(),
  otpFailedAttempts: integer("otp_failed_attempts").default(0).notNull(),
  otpLockedUntil: timestamp("otp_locked_until"),
  otpSendCount: integer("otp_send_count").default(0).notNull(),
  otpSendWindowStart: timestamp("otp_send_window_start"),

  // Legacy columns (preserved from old role-based schema)
  role: text("role"),
  company: text("company"),
  expertise: text("expertise"),
  rating: integer("rating"),
  verificationStatus: text("verification_status"),
  onboardingState: text("onboarding_state"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Companies - Central entity for all business operations
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic Info
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // For URLs and lookups
  
  // Legal & Compliance (Private - for admin review)
  legalName: text("legal_name").notNull(),
  crNumber: text("cr_number").notNull().unique(),
  vatNumber: text("vat_number").unique(),
  city: text("city"),
  category: text("category"),
  certifications: jsonb("certifications").$type<string[]>().default([]),
  documents: jsonb("documents").$type<{
    vatCertificate?: string;
    gosiCertificate?: string;
    nationalAddressCertificate?: string;
    [key: string]: string | undefined;
  }>(),
  
  // Status & State
  verificationStatus: text("verification_status").notNull().default("not_verified"), // 'not_verified', 'under_review', 'verified', 'rejected'
  onboardingState: text("onboarding_state").notNull().default("draft"), // 'draft', 'completed'
  rejectionReason: text("rejection_reason"),
  
  // Soft Delete
  deletedAt: timestamp("deleted_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Company Profiles - Public-facing company information
export const companyProfiles = pgTable("company_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id).unique(),
  
  // Public Display
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  tags: jsonb("tags").$type<string[]>().default([]),
  
  // Company Details
  companySize: text("company_size"), // '1-10', '11-50', '51-200', '201-500', '500+'

  // Media
  logoUrl: text("logo_url"),
  logoOriginalUrl: text("logo_original_url"),
  headerUrl: text("header_url"),
  headerOriginalUrl: text("header_original_url"),
  brochureUrl: text("brochure_url"), // Company profile PDF

  // Portfolio
  portfolio: jsonb("portfolio").$type<{
    title: string;
    description?: string;
    imageUrl: string;
  }[]>().default([]),
  
  // Social Links
  socialLinks: jsonb("social_links").$type<{
    website?: string;
    linkedin?: string;
    twitter?: string;
    [key: string]: string | undefined;
  }>(),
  
  // Visibility
  isPublic: boolean("is_public").default(true).notNull(),
  
  // Vendors Base (for requesters)
  tractionSlug: text("traction_slug").unique(),
  tractionTheme: jsonb("traction_theme").$type<{
    themeId: 'classic' | 'modern' | 'bold' | 'minimal';
    primaryColor: string;
    accentColor: string;
    headerStyle: 'clean' | 'gradient' | 'solid' | 'image';
    ctaText?: string;
    welcomeHeading?: string;
    welcomeSubtext?: string;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Company Documents - Uploaded verification documents
export const companyDocuments = pgTable("company_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  documentType: text("document_type").notNull(), // 'cr_certificate' | 'vat_certificate' | 'gosi_certificate' | 'national_address_certificate' | 'other'
  fileUrl: text("file_url").notNull(),            // /objects/uploads/{uuid} path
  originalName: text("original_name"),            // display file name
  label: text("label"),                           // custom label for 'other' type
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertCompanyDocumentSchema = createInsertSchema(companyDocuments);
export type CompanyDocument = typeof companyDocuments.$inferSelect;
export type InsertCompanyDocument = typeof companyDocuments.$inferInsert;

// User-Company Junction - Many-to-many with roles
export const userCompanies = pgTable("user_companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  
  // Role within company
  roleInCompany: text("role_in_company").notNull(), // 'owner', 'admin', 'member', 'viewer'
  
  // Metadata
  invitedBy: varchar("invited_by").references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  
  // Soft Delete
  deletedAt: timestamp("deleted_at"),
});

// ============================================================================
// DOMAIN TABLES - Business Operations
// ============================================================================

// Tenders - RFX/procurement requests
export const tenders = pgTable("tenders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id),
  createdBy: varchar("created_by").references(() => users.id),
  
  // Legacy columns (preserved from old role-based schema)
  requesterId: varchar("requester_id"),
  
  // Tender Details
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category"), // IT Services, Logistics, Construction, Consulting, Manufacturing, Other
  deadline: text("deadline").notNull(),
  
  // Skills & Scope
  skills: text("skills").array(), // Required skills for the project
  scope: text("scope"), // 'large', 'medium', 'small'
  
  // Budget Fields
  budget: text("budget"), // Budget amount in SAR
  budgetRange: text("budget_range"), // Legacy field for backwards compatibility
  budgetMin: integer("budget_min"), // Optional minimum
  budgetMax: integer("budget_max"), // Optional maximum
  currency: text("currency").default("SAR"),
  projectSize: text("project_size"), // 'small' (<50K SAR), 'medium' (50-250K SAR), 'large' (250K+ SAR)
  showPriceToVendors: boolean("show_price_to_vendors").default(true), // Whether to show exact price to vendors
  pricingModel: text("pricing_model"), // 'fixed' or 'milestone' (legacy)
  milestones: jsonb("milestones"), // Array of {name, amount} for milestone-based pricing (legacy)
  
  duration: text("duration"),
  projectTimeline: text("project_timeline"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  status: text("status").notNull().default("draft"), // 'draft', 'published', 'closed', 'cancelled'

  // Submission Process
  submissionType: text("submission_type"), // 'quote_only', 'tech_fin_proposal', 'video_only', 'tech_fin_with_video'
  videoRequired: boolean("video_required"), // For 'tech_fin_with_video' type, whether video is mandatory

  // Inquiry Mechanism / Q&A
  inquiryType: text("inquiry_type"), // 'inside_bid', 'email_whatsapp'
  whatsappContact: text("whatsapp_contact"), // WhatsApp number/link if inquiryType is 'email_whatsapp'
  emailContact: text("email_contact"), // Email address if inquiryType is 'email_whatsapp'

  // Evaluation Criteria (Optional)
  evaluationCriteria: jsonb("evaluation_criteria"), // Evaluation criteria - array of IDs or structured object {requirements, weights, customCriteria}

  // Project Scope Details
  objective: text("objective"), // Project objective from wizard
  deliverables: jsonb("deliverables").$type<{
    id: string;
    name: string;
    description: string;
    unit: string;
    quantity: number;
  }[]>(), // Bill of Quantities - key deliverables with structured data

  // Vendor Requirements (qualification checklist set by requester)
  vendorRequirements: jsonb("vendor_requirements").$type<{
    id: string;
    text: string;
    type: 'mandatory' | 'preferred';
  }[]>(),

  // Advanced Options
  voiceNoteUrl: text("voice_note_url"), // Recorded voice note about the project
  videoUrl: text("video_url"), // Video link about the project
  
  // Tender Attachments (supporting documents uploaded by requester)
  attachments: jsonb("attachments").$type<{
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
  }[]>(),

  // Form Builder Cards (preserves custom fields for display)
  formCards: jsonb("form_cards"),

  // RFP Language — the language the RFP was created in ('en' or 'ar')
  language: text("language").default("en"),
  // Whether vendors can translate the published RFP to the other language
  allowTranslation: boolean("allow_translation").default(false),
  // Pre-translated content keyed by language: { en: { title, description, ... }, ar: { ... } }
  translatedContent: jsonb("translated_content").$type<Record<string, Record<string, string>>>(),

  // Cached RFP requirements extracted by AI — English and Arabic versions
  rfpRequirements: jsonb("rfp_requirements").$type<string[]>(),
  rfpRequirementsAr: jsonb("rfp_requirements_ar").$type<string[]>(),

  // Invitation & Access
  invitationToken: varchar("invitation_token").notNull().unique(),
  
  // Policy Gates
  allowConditionalSubmission: boolean("allow_conditional_submission").default(false).notNull(), // Allow unverified companies to submit

  // Marketplace Fields
  isMarketplace: boolean("is_marketplace").default(false).notNull(),
  marketplaceStatus: text("marketplace_status"), // 'pending', 'approved', 'rejected'
  marketplaceApprovedBy: varchar("marketplace_approved_by").references(() => users.id),
  marketplaceApprovedAt: timestamp("marketplace_approved_at"),
  marketplaceRejectionReason: text("marketplace_rejection_reason"),
  referenceNumber: text("reference_number"), // Unique reference for marketplace tenders
  documentFee: integer("document_fee"), // Fee in SAR, null means free
  tenderType: text("tender_type"), // 'open_tender', 'direct_purchase', 'framework_agreement'
  inquiryDeadline: text("inquiry_deadline"), // Last date for clarification questions

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Offers - Proposals submitted to tenders
export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenderId: varchar("tender_id").notNull().references(() => tenders.id),
  companyId: varchar("company_id").notNull().references(() => companies.id), // Company submitting offer
  createdBy: varchar("created_by").notNull().references(() => users.id), // User who submitted it
  
  // Proposal Files
  technicalFileUrl: text("technical_file_url"),
  financialFileUrl: text("financial_file_url"),
  combinedFileUrl: text("combined_file_url"),
  notes: text("notes"),

  // Submission Type-specific Fields
  quotePrice: integer("quote_price"), // For quote_only submissions - price in SAR
  videoUrl: text("video_url"), // For video_only and tech_fin_with_video submissions

  // Status Gates
  conditionalSubmission: boolean("conditional_submission").default(false).notNull(), // Was company unverified at submission?
  
  // Resubmission
  resubmissionAllowed: boolean("resubmission_allowed").default(false).notNull(),

  // Proposal Status
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'rejected', 'superseded'
  decidedBy: varchar("decided_by").references(() => users.id),
  decidedAt: timestamp("decided_at"),
  
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

// Offer Views - Track which users have viewed each notification/offer
export const offerViews = pgTable("offer_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").notNull().references(() => offers.id),
  viewerId: varchar("viewer_id").notNull().references(() => users.id), // User who viewed the notification
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
});

// Proposal Analyses - AI-powered scoring and comparison of vendor proposals
export const proposalAnalyses = pgTable("proposal_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenderId: varchar("tender_id").notNull().references(() => tenders.id),
  offerId: varchar("offer_id").notNull().references(() => offers.id),

  scores: jsonb("scores").$type<Record<string, { score: number; justification: string }>>(),
  overallScore: integer("overall_score"), // 0-100 weighted
  extractedData: jsonb("extracted_data").$type<{
    timeline?: string;
    pricing?: { amount?: number; breakdown?: string };
    keyStrengths?: string[];
    weaknesses?: string[];
    approach?: string;
  }>(),

  recommendation: text("recommendation"),
  modelUsed: text("model_used"),
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'failed', 'skipped'
  errorMessage: text("error_message"),

  // New factual extraction fields
  executiveSummary: text("executive_summary"),
  tableOfContents: jsonb("table_of_contents").$type<{ section: string; pageRange: string }[]>(),
  criteriaMapping: jsonb("criteria_mapping").$type<Record<string, string>>(),
  deliverables: jsonb("deliverables").$type<string[]>(),
  financial: jsonb("financial").$type<{ total?: number; breakdown?: { item: string; amount: number }[]; paymentTerms?: string; vat?: number }>(),

  analyzedAt: timestamp("analyzed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tender Savings - Track vendor selection and cost savings
export const tenderSavings = pgTable("tender_savings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenderId: varchar("tender_id").notNull().references(() => tenders.id),
  selectedOfferId: varchar("selected_offer_id").notNull().references(() => offers.id),
  selectedCompanyId: varchar("selected_company_id").notNull().references(() => companies.id),
  selectedPrice: integer("selected_price").notNull(),
  highestPrice: integer("highest_price").notNull(),
  lowestPrice: integer("lowest_price").notNull(),
  savingsAmount: integer("savings_amount").notNull(),
  savingsPercentage: integer("savings_percentage").notNull(),
  selectedBy: varchar("selected_by").notNull().references(() => users.id),
  selectedAt: timestamp("selected_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Purchase Orders - Official PO documents for marketplace tenders
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenderId: varchar("tender_id").notNull().references(() => tenders.id),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  fileUrl: text("file_url").notNull(),
  originalName: text("original_name"),
  status: text("status").notNull().default("pending"), // 'pending', 'verified', 'rejected'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Invitations - Tender invitations to specific vendors
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenderId: varchar("tender_id").notNull().references(() => tenders.id),
  companyId: varchar("company_id").references(() => companies.id), // Invited company (nullable for email invitations)
  vendorEmail: text("vendor_email"), // For inviting unregistered companies
  vendorName: text("vendor_name"),
  invitationToken: varchar("invitation_token").unique(),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'declined'
  
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
});

// Vendors Base - Private catalog of approved vendors per requester company
export const vendorsBase = pgTable("vendors_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterCompanyId: varchar("requester_company_id").references(() => companies.id),
  vendorCompanyId: varchar("vendor_company_id").references(() => companies.id),
  joinMethod: text("join_method").notNull(),
  
  addedBy: varchar("added_by").references(() => users.id),
  addedAt: timestamp("added_at").defaultNow().notNull(),

  // Legacy columns (preserved from old role-based schema)
  requesterId: varchar("requester_id"),
  vendorId: varchar("vendor_id"),
});

// Join Requests - Vendor applications to join requester's vendor base
export const joinRequests = pgTable("join_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterCompanyId: varchar("requester_company_id").references(() => companies.id),
  vendorCompanyId: varchar("vendor_company_id").references(() => companies.id),
  createdBy: varchar("created_by").references(() => users.id),
  
  // Status
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  
  decidedBy: varchar("decided_by").references(() => users.id),
  decidedAt: timestamp("decided_at"),
  
  // Legacy columns (preserved from old role-based schema)
  requesterId: varchar("requester_id"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Trusted Browsers - Remember device for OTP skip
export const trustedBrowsers = pgTable("trusted_browsers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Team Invitations - Inviting users to join a company
export const teamInvitations = pgTable("team_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  email: text("email").notNull(),
  role: text("role").notNull(), // 'admin', 'member', 'viewer'
  token: varchar("token").notNull().unique(),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'expired'
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Invitation Links - Direct vendor invites (instant add to base)
export const invitationLinks = pgTable("invitation_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterCompanyId: varchar("requester_company_id").notNull().references(() => companies.id),
  tenderId: varchar("tender_id").references(() => tenders.id),
  vendorEmail: text("vendor_email").notNull(),
  token: varchar("token").notNull().unique(),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'expired'
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

// Awards - Tender awards and status
export const awards = pgTable("awards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenderId: varchar("tender_id").notNull().references(() => tenders.id),
  companyId: varchar("company_id").notNull().references(() => companies.id), // Winning company
  offerId: varchar("offer_id").notNull().references(() => offers.id),
  
  status: text("status").notNull().default("pending"), // 'pending', 'blocked', 'awarded'
  blockReason: text("block_reason"), // e.g., 'company_not_verified'
  
  awardedBy: varchar("awarded_by").references(() => users.id),
  awardedAt: timestamp("awarded_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Negotiation Actions - Communication between requester and vendors during negotiation phase
export const negotiationActions = pgTable("negotiation_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenderId: varchar("tender_id").notNull().references(() => tenders.id),
  offerId: varchar("offer_id").notNull().references(() => offers.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  actionType: text("action_type").notNull(),
  // 'resubmission_request' | 'discount_request' | 'award' | 'rejection' | 'free_message'
  message: text("message").notNull(),
  comment: text("comment"),
  metadata: jsonb("metadata").$type<{
    discountPercentage?: number;
    resubmissionOptions?: { allowResubmission: boolean; requestQualificationFiles: boolean };
    rejectionMessage?: string;
  }>(),
  status: text("status").notNull().default("sent"), // 'sent' | 'acknowledged' | 'completed'
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// ANALYTICS & OBSERVABILITY
// ============================================================================

// Product Events - Append-only event log for analytics
export const productEvents = pgTable("product_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // e.g., 'company_created', 'company_verified', 'proposal_submitted'
  
  // Context
  companyId: varchar("company_id").references(() => companies.id),
  userId: varchar("user_id").references(() => users.id),
  
  // Event Data
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tour Progress - tracks which guided tours a user has completed/dismissed
export const tourProgress = pgTable("tour_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  tourId: text("tour_id").notNull(), // e.g. 'dashboard', 'tender-create', 'ai-copilot'
  dismissedAt: timestamp("dismissed_at").defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex("tour_progress_user_tour_uniq").on(t.userId, t.tourId),
}));

export type TourProgressRecord = typeof tourProgress.$inferSelect;

// Tender Templates - User-saved form structures
export const tenderTemplates = pgTable("tender_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),

  // Template Info
  name: text("name").notNull(),
  description: text("description"),

  // Form Structure - Array of card configurations (with optional pre-filled values)
  cards: jsonb("cards").$type<{
    id: string;
    type: string;
    label: string;
    isRequired: boolean;
    placeholder?: string;
    options?: string[];
    value?: any; // Pre-filled value from when template was saved
  }[]>().notNull(),

  // Visibility
  isPublic: boolean("is_public").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Audit Log - Admin actions tracking
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  
  // Action Details
  action: text("action").notNull(), // e.g., 'company_verified', 'join_request_approved'
  targetType: text("target_type").notNull(), // e.g., 'company', 'join_request'
  targetId: varchar("target_id").notNull(),
  
  // State Tracking
  beforeState: text("before_state"), // JSON snapshot
  afterState: text("after_state"), // JSON snapshot
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tender Q&A - Anonymous questions from vendors, answered by requester
export const tenderQuestions = pgTable("tender_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenderId: varchar("tender_id").notNull().references(() => tenders.id),
  askedByUserId: varchar("asked_by_user_id").notNull().references(() => users.id),
  askedByCompanyId: varchar("asked_by_company_id").references(() => companies.id),
  question: text("question").notNull(),
  answer: text("answer"),
  answeredAt: timestamp("answered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Error Logs
export const errorLogs = pgTable("error_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  companyId: varchar("company_id").references(() => companies.id),
  source: varchar("source", { length: 20 }).notNull(),
  method: varchar("method", { length: 10 }),
  path: text("path"),
  statusCode: integer("status_code"),
  errorMessage: text("error_message").notNull(),
  stack: text("stack"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;

// ============================================================================
// LEGACY TABLES - Preserved from old role-based schema (production data)
// ============================================================================

export const requesterProfiles = pgTable("requester_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  companyName: text("company_name"),
  industry: text("industry"),
  description: text("description"),
  logoUrl: text("logo_url"),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type"),
  userId: varchar("user_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendorQualifications = pgTable("vendor_qualifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id"),
  qualificationType: text("qualification_type"),
  status: text("status"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminSetupToken = pgTable("admin_setup_token", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token"),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// AI COPILOT CHAT HISTORY
// ============================================================================

export const aiChatSessions = pgTable("ai_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: varchar("company_id").references(() => companies.id),
  title: text("title").notNull(),
  tenderId: varchar("tender_id").references(() => tenders.id),
  tenderData: jsonb("tender_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiChatMessages = pgTable("ai_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => aiChatSessions.id, { onDelete: 'cascade' }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  suggestions: jsonb("suggestions").$type<string[]>(),
  tenderData: jsonb("tender_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AiChatSession = typeof aiChatSessions.$inferSelect;
export type InsertAiChatSession = typeof aiChatSessions.$inferInsert;
export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type InsertAiChatMessage = typeof aiChatMessages.$inferInsert;

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  userCompanies: many(userCompanies),
  createdTenders: many(tenders),
  createdOffers: many(offers),
  productEvents: many(productEvents),
  auditActions: many(auditLog),
  tenderTemplates: many(tenderTemplates),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  profile: one(companyProfiles, {
    fields: [companies.id],
    references: [companyProfiles.companyId],
  }),
  userCompanies: many(userCompanies),
  tenders: many(tenders),
  offers: many(offers),
  vendorsInBase: many(vendorsBase, { relationName: 'requesterVendors' }),
  requestersBase: many(vendorsBase, { relationName: 'vendorRequesters' }),
  joinRequestsReceived: many(joinRequests, { relationName: 'requesterJoinRequests' }),
  joinRequestsSubmitted: many(joinRequests, { relationName: 'vendorJoinRequests' }),
  awards: many(awards),
  productEvents: many(productEvents),
  tenderTemplates: many(tenderTemplates),
}));

export const companyProfilesRelations = relations(companyProfiles, ({ one }) => ({
  company: one(companies, {
    fields: [companyProfiles.companyId],
    references: [companies.id],
  }),
}));

export const userCompaniesRelations = relations(userCompanies, ({ one }) => ({
  user: one(users, {
    fields: [userCompanies.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [userCompanies.companyId],
    references: [companies.id],
  }),
}));

export const tendersRelations = relations(tenders, ({ one, many }) => ({
  company: one(companies, {
    fields: [tenders.companyId],
    references: [companies.id],
  }),
  createdByUser: one(users, {
    fields: [tenders.createdBy],
    references: [users.id],
  }),
  offers: many(offers),
  invitations: many(invitations),
  awards: many(awards),
  negotiationActions: many(negotiationActions),
  purchaseOrders: many(purchaseOrders),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one }) => ({
  tender: one(tenders, {
    fields: [purchaseOrders.tenderId],
    references: [tenders.id],
  }),
  uploadedByUser: one(users, {
    fields: [purchaseOrders.uploadedBy],
    references: [users.id],
  }),
}));

export const offersRelations = relations(offers, ({ one }) => ({
  tender: one(tenders, {
    fields: [offers.tenderId],
    references: [tenders.id],
  }),
  company: one(companies, {
    fields: [offers.companyId],
    references: [companies.id],
  }),
  createdByUser: one(users, {
    fields: [offers.createdBy],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  tender: one(tenders, {
    fields: [invitations.tenderId],
    references: [tenders.id],
  }),
  company: one(companies, {
    fields: [invitations.companyId],
    references: [companies.id],
  }),
}));

export const vendorsBaseRelations = relations(vendorsBase, ({ one }) => ({
  requesterCompany: one(companies, {
    fields: [vendorsBase.requesterCompanyId],
    references: [companies.id],
    relationName: 'requesterVendors',
  }),
  vendorCompany: one(companies, {
    fields: [vendorsBase.vendorCompanyId],
    references: [companies.id],
    relationName: 'vendorRequesters',
  }),
}));

export const joinRequestsRelations = relations(joinRequests, ({ one }) => ({
  requesterCompany: one(companies, {
    fields: [joinRequests.requesterCompanyId],
    references: [companies.id],
    relationName: 'requesterJoinRequests',
  }),
  vendorCompany: one(companies, {
    fields: [joinRequests.vendorCompanyId],
    references: [companies.id],
    relationName: 'vendorJoinRequests',
  }),
  createdByUser: one(users, {
    fields: [joinRequests.createdBy],
    references: [users.id],
  }),
}));

export const awardsRelations = relations(awards, ({ one }) => ({
  tender: one(tenders, {
    fields: [awards.tenderId],
    references: [tenders.id],
  }),
  company: one(companies, {
    fields: [awards.companyId],
    references: [companies.id],
  }),
  offer: one(offers, {
    fields: [awards.offerId],
    references: [offers.id],
  }),
}));

export const negotiationActionsRelations = relations(negotiationActions, ({ one }) => ({
  tender: one(tenders, {
    fields: [negotiationActions.tenderId],
    references: [tenders.id],
  }),
  offer: one(offers, {
    fields: [negotiationActions.offerId],
    references: [offers.id],
  }),
  company: one(companies, {
    fields: [negotiationActions.companyId],
    references: [companies.id],
  }),
  createdByUser: one(users, {
    fields: [negotiationActions.createdBy],
    references: [users.id],
  }),
}));

export const productEventsRelations = relations(productEvents, ({ one }) => ({
  company: one(companies, {
    fields: [productEvents.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [productEvents.userId],
    references: [users.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  admin: one(users, {
    fields: [auditLog.adminId],
    references: [users.id],
  }),
}));

export const tenderTemplatesRelations = relations(tenderTemplates, ({ one }) => ({
  user: one(users, {
    fields: [tenderTemplates.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [tenderTemplates.companyId],
    references: [companies.id],
  }),
}));

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Fixed category options
export const VENDOR_CATEGORIES = [
  "Construction & Infrastructure",
  "Information Technology",
  "Healthcare & Medical Supplies",
  "Transportation & Logistics",
  "Professional Services",
  "Manufacturing & Production",
  "Food & Beverage",
  "Energy & Utilities",
  "Education & Training",
  "Telecommunications",
  "Facility Management",
  "Security Services",
  "Marketing & Advertising",
  "Legal Services",
  "Financial Services",
] as const;

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const registerUserSchema = insertUserSchema.omit({
  isAdmin: true,
  username: true,
  emailVerified: true,
  emailVerificationCode: true,
  emailVerificationExpiry: true,
});

// Company schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const createCompanySchema = insertCompanySchema.omit({
  slug: true,
  verificationStatus: true,
  onboardingState: true,
  rejectionReason: true,
}).extend({
  crNumber: z.string().regex(/^\d+$/, "CR number must contain only numbers"),
  category: z.enum(VENDOR_CATEGORIES, { 
    errorMap: () => ({ message: "Please select a valid category" }) 
  }).optional(),
});

// Company Profile schemas
export const insertCompanyProfileSchema = createInsertSchema(companyProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCompanyProfileSchema = insertCompanyProfileSchema.omit({
  companyId: true,
}).extend({
  bio: z.string().min(5).max(500).optional(),
  displayName: z.string().min(2).max(100),
});

// User-Company schemas
export const insertUserCompanySchema = createInsertSchema(userCompanies).omit({
  id: true,
  joinedAt: true,
  deletedAt: true,
});

// Tender schemas
export const insertTenderSchema = createInsertSchema(tenders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createTenderSchema = insertTenderSchema.omit({
  companyId: true,
  createdBy: true,
  status: true,
  invitationToken: true,
  allowConditionalSubmission: true,
});

// Offer schemas
export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  submittedAt: true,
});

export const createOfferSchema = insertOfferSchema.omit({
  tenderId: true,
  companyId: true,
  createdBy: true,
  conditionalSubmission: true,
});

// Offer View schemas
export const insertOfferViewSchema = createInsertSchema(offerViews).omit({
  id: true,
  viewedAt: true,
});

// Other domain schemas
export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  invitedAt: true,
});

export const insertVendorBaseSchema = createInsertSchema(vendorsBase).omit({
  id: true,
  addedAt: true,
});

export const insertJoinRequestSchema = createInsertSchema(joinRequests).omit({
  id: true,
  createdAt: true,
  decidedAt: true,
});

export const createJoinRequestSchema = insertJoinRequestSchema.omit({
  requesterCompanyId: true,
  vendorCompanyId: true,
  createdBy: true,
  status: true,
  rejectionReason: true,
  decidedBy: true,
});

export const insertProductEventSchema = createInsertSchema(productEvents).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  createdAt: true,
});

export const insertAwardSchema = createInsertSchema(awards).omit({
  id: true,
  createdAt: true,
});

export const insertTenderTemplateSchema = createInsertSchema(tenderTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createTenderTemplateSchema = insertTenderTemplateSchema.omit({
  userId: true,
  companyId: true,
});

export const insertTenderQuestionSchema = createInsertSchema(tenderQuestions).omit({
  id: true,
  answeredAt: true,
  createdAt: true,
});

// Negotiation Action schemas
export const insertNegotiationActionSchema = createInsertSchema(negotiationActions).omit({
  id: true,
  createdAt: true,
});

// ============================================================================
// TYPES
// ============================================================================

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type CreateCompany = z.infer<typeof createCompanySchema>;

export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;
export type UpdateCompanyProfile = z.infer<typeof updateCompanyProfileSchema>;

export type UserCompany = typeof userCompanies.$inferSelect;
export type InsertUserCompany = z.infer<typeof insertUserCompanySchema>;

export type Tender = typeof tenders.$inferSelect;
export type InsertTender = z.infer<typeof insertTenderSchema>;
export type CreateTender = z.infer<typeof createTenderSchema>;

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type CreateOffer = z.infer<typeof createOfferSchema>;

export type OfferView = typeof offerViews.$inferSelect;
export type InsertOfferView = z.infer<typeof insertOfferViewSchema>;

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

export type VendorBase = typeof vendorsBase.$inferSelect;
export type InsertVendorBase = z.infer<typeof insertVendorBaseSchema>;

export type JoinRequest = typeof joinRequests.$inferSelect;
export type InsertJoinRequest = z.infer<typeof insertJoinRequestSchema>;
export type CreateJoinRequest = z.infer<typeof createJoinRequestSchema>;

export type InvitationLink = typeof invitationLinks.$inferSelect;

export type Award = typeof awards.$inferSelect;
export type InsertAward = z.infer<typeof insertAwardSchema>;

export type ProductEvent = typeof productEvents.$inferSelect;
export type InsertProductEvent = z.infer<typeof insertProductEventSchema>;

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type TenderTemplate = typeof tenderTemplates.$inferSelect;
export type InsertTenderTemplate = z.infer<typeof insertTenderTemplateSchema>;
export type CreateTenderTemplate = z.infer<typeof createTenderTemplateSchema>;

export type TenderQuestion = typeof tenderQuestions.$inferSelect;
export type InsertTenderQuestion = z.infer<typeof insertTenderQuestionSchema>;

export type NegotiationAction = typeof negotiationActions.$inferSelect;
export type InsertNegotiationAction = z.infer<typeof insertNegotiationActionSchema>;

export type ProposalAnalysis = typeof proposalAnalyses.$inferSelect;
export type InsertProposalAnalysis = typeof proposalAnalyses.$inferInsert;

export type TenderSavings = typeof tenderSavings.$inferSelect;
export type InsertTenderSavings = typeof tenderSavings.$inferInsert;

export type TrustedBrowser = typeof trustedBrowsers.$inferSelect;
export type InsertTrustedBrowser = typeof trustedBrowsers.$inferInsert;

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = typeof teamInvitations.$inferInsert;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Chat models for AI integrations
export * from "./models/chat";
