import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'requester' or 'vendor'
  company: text("company"),
  expertise: text("expertise"), // for vendors
  rating: text("rating").default("0"), // for vendors
  verificationStatus: text("verification_status").default("not_verified"), // 'not_verified', 'under_review', 'verified'
  onboardingState: text("onboarding_state").default("completed"), // 'draft' | 'completed'
  createdAt: timestamp("created_at").defaultNow(),
});

export const tenders = pgTable("tenders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  deadline: text("deadline").notNull(),
  budget: text("budget"),
  duration: text("duration"),
  status: text("status").notNull().default("active"), // 'draft', 'active', 'closed'
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  invitationToken: varchar("invitation_token").notNull().unique(), // single invitation token for the tender
  createdAt: timestamp("created_at").defaultNow(),
});

export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenderId: varchar("tender_id").notNull().references(() => tenders.id),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  technicalFileUrl: text("technical_file_url"),
  financialFileUrl: text("financial_file_url"),
  notes: text("notes"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenderId: varchar("tender_id").notNull().references(() => tenders.id),
  vendorId: varchar("vendor_id").references(() => users.id), // nullable for email invitations
  vendorEmail: text("vendor_email"), // for inviting unregistered vendors
  vendorName: text("vendor_name"), // for inviting unregistered vendors
  invitationToken: varchar("invitation_token").unique(), // unique token for tender access
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'declined'
  invitedAt: timestamp("invited_at").defaultNow(),
});

export const vendorQualifications = pgTable("vendor_qualifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => users.id).unique(),
  
  // Legal & Compliance (Private)
  legalCompanyName: text("legal_company_name").notNull(),
  crNumber: text("cr_number").notNull(), // Validated as numeric in form
  vatCertificateUrl: text("vat_certificate_url"),
  vatNumber: text("vat_number"),
  gosiCertificateUrl: text("gosi_certificate_url").notNull(), // Required
  nationalAddressCertificateUrl: text("national_address_certificate_url").notNull(), // Now a file upload
  
  // Public Profile
  displayName: text("display_name").notNull(),
  logoUrl: text("logo_url").notNull(), // Required
  headerUrl: text("header_url"),
  bio: text("bio").notNull(),
  category: text("category").notNull(), // Single selection from fixed list
  profileFileUrl: text("profile_file_url").notNull(), // Required (Company Profile)
  linkedinUrl: text("linkedin_url"),
  xUrl: text("x_url"),
  websiteUrl: text("website_url"),
  
  // Admin fields
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const requesterProfiles = pgTable("requester_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id).unique(),
  
  // Company Info
  companyName: text("company_name").notNull(),
  industry: text("industry").notNull(),
  companySize: text("company_size"), // e.g., "1-10", "11-50", "51-200", etc.
  
  // Profile
  logoUrl: text("logo_url"),
  bio: text("bio").notNull(),
  websiteUrl: text("website_url"),
  linkedinUrl: text("linkedin_url"),
  
  // Contact
  contactPerson: text("contact_person").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  
  // Vendors Base
  tractionSlug: text("traction_slug").unique(), // Auto-generated from company name
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vendors Base - Private catalog of vendors per requester
export const vendorsBase = pgTable("vendors_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  joinMethod: text("join_method").notNull(), // 'invitation' | 'traction' | 'tender_invite'
  addedAt: timestamp("added_at").defaultNow(),
});

// Join Requests - Traction Link applications (references vendor data, no duplication)
export const joinRequests = pgTable("join_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  vendorId: varchar("vendor_id").notNull().references(() => users.id), // Always required - vendor account must exist
  
  // Status
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  rejectionReason: text("rejection_reason"), // Optional reason for rejection
  
  createdAt: timestamp("created_at").defaultNow(),
  decidedAt: timestamp("decided_at"),
});

// Invitation Links - Direct vendor invites tied to tender deadlines
export const invitationLinks = pgTable("invitation_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  tenderId: varchar("tender_id").references(() => tenders.id), // Link to tender for deadline validation
  vendorEmail: text("vendor_email").notNull(),
  token: varchar("token").notNull().unique(),
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'expired'
  
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

// Analytics Events - Append-only event log
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // e.g., 'traction_link_opened', 'join_request_submitted', etc.
  requesterId: varchar("requester_id").references(() => users.id),
  vendorId: varchar("vendor_id").references(() => users.id),
  metadata: text("metadata"), // JSON string for additional event data
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  tenders: many(tenders),
  offers: many(offers),
  invitations: many(invitations),
  qualification: one(vendorQualifications, {
    fields: [users.id],
    references: [vendorQualifications.vendorId],
  }),
  requesterProfile: one(requesterProfiles, {
    fields: [users.id],
    references: [requesterProfiles.requesterId],
  }),
  vendorsInBase: many(vendorsBase, { relationName: 'requesterVendors' }),
  requestersBase: many(vendorsBase, { relationName: 'vendorRequesters' }),
  joinRequestsReceived: many(joinRequests, { relationName: 'requesterJoinRequests' }),
  joinRequestsSubmitted: many(joinRequests, { relationName: 'vendorJoinRequests' }),
}));

export const tendersRelations = relations(tenders, ({ one, many }) => ({
  requester: one(users, {
    fields: [tenders.requesterId],
    references: [users.id],
  }),
  offers: many(offers),
  invitations: many(invitations),
}));

export const offersRelations = relations(offers, ({ one }) => ({
  tender: one(tenders, {
    fields: [offers.tenderId],
    references: [tenders.id],
  }),
  vendor: one(users, {
    fields: [offers.vendorId],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  tender: one(tenders, {
    fields: [invitations.tenderId],
    references: [tenders.id],
  }),
  vendor: one(users, {
    fields: [invitations.vendorId],
    references: [users.id],
  }),
}));

export const vendorQualificationsRelations = relations(vendorQualifications, ({ one }) => ({
  vendor: one(users, {
    fields: [vendorQualifications.vendorId],
    references: [users.id],
  }),
}));

export const requesterProfilesRelations = relations(requesterProfiles, ({ one }) => ({
  requester: one(users, {
    fields: [requesterProfiles.requesterId],
    references: [users.id],
  }),
}));

export const vendorsBaseRelations = relations(vendorsBase, ({ one }) => ({
  requester: one(users, {
    fields: [vendorsBase.requesterId],
    references: [users.id],
    relationName: 'requesterVendors',
  }),
  vendor: one(users, {
    fields: [vendorsBase.vendorId],
    references: [users.id],
    relationName: 'vendorRequesters',
  }),
}));

export const joinRequestsRelations = relations(joinRequests, ({ one }) => ({
  requester: one(users, {
    fields: [joinRequests.requesterId],
    references: [users.id],
    relationName: 'requesterJoinRequests',
  }),
  vendor: one(users, {
    fields: [joinRequests.vendorId],
    references: [users.id],
    relationName: 'vendorJoinRequests',
  }),
}));

export const invitationLinksRelations = relations(invitationLinks, ({ one }) => ({
  requester: one(users, {
    fields: [invitationLinks.requesterId],
    references: [users.id],
  }),
  tender: one(tenders, {
    fields: [invitationLinks.tenderId],
    references: [tenders.id],
  }),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  requester: one(users, {
    fields: [analyticsEvents.requesterId],
    references: [users.id],
  }),
  vendor: one(users, {
    fields: [analyticsEvents.vendorId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTenderSchema = createInsertSchema(tenders).omit({
  id: true,
  createdAt: true,
});

export const createTenderSchema = insertTenderSchema.omit({
  requesterId: true,
  status: true,
  invitationToken: true,
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  submittedAt: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  invitedAt: true,
});

export const insertVendorQualificationSchema = createInsertSchema(vendorQualifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRequesterProfileSchema = createInsertSchema(requesterProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const submitRequesterProfileSchema = insertRequesterProfileSchema.omit({
  requesterId: true,
}).extend({
  bio: z.string().min(5, "Bio must be at least 5 characters").max(100, "Bio must not exceed 100 characters"),
  websiteUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

// Fixed category options for vendor selection
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

export const submitPreQualificationSchema = insertVendorQualificationSchema.omit({
  vendorId: true,
  rejectionReason: true,
}).extend({
  crNumber: z.string().regex(/^\d+$/, "CR number must contain only numbers"),
  bio: z.string().min(5, "Bio must be at least 5 characters").max(100, "Bio must not exceed 100 characters"),
  category: z.enum(VENDOR_CATEGORIES, { 
    errorMap: () => ({ message: "Please select a valid category" }) 
  }),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  xUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
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

// Join request is now a simple reference - no form validation needed
export const submitJoinRequestSchema = insertJoinRequestSchema.omit({
  requesterId: true,
  status: true,
  rejectionReason: true,
});

export const insertInvitationLinkSchema = createInsertSchema(invitationLinks).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});

export const createInvitationLinkSchema = insertInvitationLinkSchema.omit({
  requesterId: true,
  token: true,
  status: true,
}).extend({
  vendorEmail: z.string().email("Invalid email address"),
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTender = z.infer<typeof insertTenderSchema>;
export type Tender = typeof tenders.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offers.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;
export type InsertVendorQualification = z.infer<typeof insertVendorQualificationSchema>;
export type VendorQualification = typeof vendorQualifications.$inferSelect;
export type SubmitPreQualification = z.infer<typeof submitPreQualificationSchema>;
export type InsertRequesterProfile = z.infer<typeof insertRequesterProfileSchema>;
export type RequesterProfile = typeof requesterProfiles.$inferSelect;
export type SubmitRequesterProfile = z.infer<typeof submitRequesterProfileSchema>;
export type InsertVendorBase = z.infer<typeof insertVendorBaseSchema>;
export type VendorBase = typeof vendorsBase.$inferSelect;
export type InsertJoinRequest = z.infer<typeof insertJoinRequestSchema>;
export type JoinRequest = typeof joinRequests.$inferSelect;
export type SubmitJoinRequest = z.infer<typeof submitJoinRequestSchema>;
export type InsertInvitationLink = z.infer<typeof insertInvitationLinkSchema>;
export type InvitationLink = typeof invitationLinks.$inferSelect;
export type CreateInvitationLink = z.infer<typeof createInvitationLinkSchema>;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
