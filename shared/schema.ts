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

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  tenders: many(tenders),
  offers: many(offers),
  invitations: many(invitations),
  qualification: one(vendorQualifications, {
    fields: [users.id],
    references: [vendorQualifications.vendorId],
  }),
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

// Helper function to count words in bio
const countWords = (text: string) => text.trim().split(/\s+/).filter(word => word.length > 0).length;

export const submitPreQualificationSchema = insertVendorQualificationSchema.omit({
  vendorId: true,
  rejectionReason: true,
}).extend({
  crNumber: z.string().regex(/^\d+$/, "CR number must contain only numbers"),
  bio: z.string().refine(
    (val) => {
      const words = countWords(val);
      return words >= 5 && words <= 100;
    },
    { message: "Bio must be between 5 and 100 words" }
  ),
  category: z.enum(VENDOR_CATEGORIES, { 
    errorMap: () => ({ message: "Please select a valid category" }) 
  }),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  xUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
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
