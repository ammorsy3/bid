import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
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
  isAdmin: boolean("is_admin").default(false).notNull(), // Platform admins (global, not tied to companies)
  
  // Profile fields
  profilePictureUrl: text("profile_picture_url"),
  jobTitle: text("job_title"),
  timezone: text("timezone"),
  linkedinUrl: text("linkedin_url"),
  phoneNumber: text("phone_number"),
  tenderInquiryEmail: text("tender_inquiry_email"), // Custom email for tender inquiries (if different from account email)

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
  
  // Media
  logoUrl: text("logo_url"),
  headerUrl: text("header_url"),
  brochureUrl: text("brochure_url"), // Company profile PDF
  
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
  tractionSlug: text("traction_slug").unique(), // For traction link: /r/{slug}
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  companyId: varchar("company_id").notNull().references(() => companies.id), // Company issuing tender
  createdBy: varchar("created_by").notNull().references(() => users.id), // User who created it
  
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
  projectTimeline: text("project_timeline"), // Timeline description (required for new tenders)
  status: text("status").notNull().default("draft"), // 'draft', 'published', 'closed', 'cancelled'

  // Submission Process
  submissionType: text("submission_type"), // 'quote_only', 'tech_fin_proposal', 'video_only', 'tech_fin_with_video'
  videoRequired: boolean("video_required"), // For 'tech_fin_with_video' type, whether video is mandatory

  // Inquiry Mechanism / Q&A
  inquiryType: text("inquiry_type"), // 'inside_bid', 'email_whatsapp'
  whatsappContact: text("whatsapp_contact"), // WhatsApp number/link if inquiryType is 'email_whatsapp'
  emailContact: text("email_contact"), // Email address if inquiryType is 'email_whatsapp'

  // Evaluation Criteria (Optional)
  evaluationCriteria: text("evaluation_criteria").array(), // Array of criteria IDs that matter most to requester

  // Advanced Options
  voiceNoteUrl: text("voice_note_url"), // Recorded voice note about the project
  videoUrl: text("video_url"), // Video link about the project
  
  // Invitation & Access
  invitationToken: varchar("invitation_token").notNull().unique(),
  
  // Policy Gates
  allowConditionalSubmission: boolean("allow_conditional_submission").default(false).notNull(), // Allow unverified companies to submit
  
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
  notes: text("notes"),
  
  // Status Gates
  conditionalSubmission: boolean("conditional_submission").default(false).notNull(), // Was company unverified at submission?
  
  // Proposal Status
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'rejected'
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
  requesterCompanyId: varchar("requester_company_id").notNull().references(() => companies.id),
  vendorCompanyId: varchar("vendor_company_id").notNull().references(() => companies.id),
  joinMethod: text("join_method").notNull(), // 'invitation' | 'traction' | 'tender_invite'
  
  addedBy: varchar("added_by").references(() => users.id), // User who approved/added
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// Join Requests - Vendor applications to join requester's vendor base
export const joinRequests = pgTable("join_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterCompanyId: varchar("requester_company_id").notNull().references(() => companies.id),
  vendorCompanyId: varchar("vendor_company_id").notNull().references(() => companies.id),
  createdBy: varchar("created_by").notNull().references(() => users.id), // Vendor user who submitted
  
  // Status
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  rejectionReason: text("rejection_reason"),
  
  decidedBy: varchar("decided_by").references(() => users.id), // User who approved/rejected
  decidedAt: timestamp("decided_at"),
  
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

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  userCompanies: many(userCompanies),
  createdTenders: many(tenders),
  createdOffers: many(offers),
  productEvents: many(productEvents),
  auditActions: many(auditLog),
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
