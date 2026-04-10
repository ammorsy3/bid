import {
  users,
  companies,
  companyProfiles,
  userCompanies,
  tenders,
  offers,
  offerViews,
  invitations,
  vendorsBase,
  joinRequests,
  invitationLinks,
  awards,
  productEvents,
  auditLog,
  tenderTemplates,
  type User,
  type InsertUser,
  type Company,
  type InsertCompany,
  type CompanyProfile,
  type InsertCompanyProfile,
  type UserCompany,
  type InsertUserCompany,
  type Tender,
  type InsertTender,
  type Offer,
  type InsertOffer,
  type OfferView,
  type InsertOfferView,
  type Invitation,
  type InsertInvitation,
  type VendorBase,
  type InsertVendorBase,
  type JoinRequest,
  type InsertJoinRequest,
  type InvitationLink,
  type Award,
  type InsertAward,
  type ProductEvent,
  type InsertProductEvent,
  type AuditLog,
  type InsertAuditLog,
  type TenderTemplate,
  type InsertTenderTemplate,
  tenderQuestions,
  type TenderQuestion,
  type InsertTenderQuestion,
  errorLogs,
  type ErrorLog,
  type InsertErrorLog,
  proposalAnalyses,
  type ProposalAnalysis,
  type InsertProposalAnalysis,
  tenderSavings,
  type TenderSavings,
  type InsertTenderSavings,
  aiChatSessions,
  aiChatMessages,
  type AiChatSession,
  type InsertAiChatSession,
  type AiChatMessage,
  type InsertAiChatMessage,
  negotiationActions,
  type NegotiationAction,
  type InsertNegotiationAction,
  companyDocuments,
  type CompanyDocument,
  type InsertCompanyDocument,
  teamInvitations,
  type TeamInvitation,
  type InsertTeamInvitation,
  trustedBrowsers,
  type TrustedBrowser,
  type InsertTrustedBrowser,
  tourProgress,
  purchaseOrders,
  type PurchaseOrder,
  type InsertPurchaseOrder,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc, ilike, or, isNull, sql, gte, count, ne } from "drizzle-orm";

export interface IStorage {
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getCompanyByEmailDomain(domain: string): Promise<(Company) | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;

  // ============================================================================
  // COMPANY OPERATIONS
  // ============================================================================
  createCompany(company: InsertCompany): Promise<Company>;
  getCompany(id: string): Promise<Company | undefined>;
  getCompanyBySlug(slug: string): Promise<Company | undefined>;
  getCompanyByCrNumber(crNumber: string): Promise<Company | undefined>;
  updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company>;
  getCompaniesWithPendingVerification(): Promise<(Company & { profile?: CompanyProfile })[]>;
  verifyCompany(companyId: string, adminId: string, notes?: string): Promise<void>;
  rejectCompany(companyId: string, reason: string, adminId: string): Promise<void>;

  // ============================================================================
  // COMPANY PROFILE OPERATIONS
  // ============================================================================
  createCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile>;
  getCompanyProfile(companyId: string): Promise<CompanyProfile | undefined>;
  getCompanyProfileByTractionSlug(slug: string): Promise<(CompanyProfile & { company: Company }) | undefined>;
  updateCompanyProfile(companyId: string, updates: Partial<InsertCompanyProfile>): Promise<CompanyProfile>;

  // ============================================================================
  // USER-COMPANY OPERATIONS (Team Management)
  // ============================================================================
  addUserToCompany(userCompany: InsertUserCompany): Promise<UserCompany>;
  getUserCompanies(userId: string): Promise<(UserCompany & { company: Company; profile?: CompanyProfile })[]>;
  getCompanyMembers(companyId: string): Promise<(UserCompany & { user: User })[]>;
  updateUserRole(userId: string, companyId: string, role: string): Promise<UserCompany>;
  removeUserFromCompany(userId: string, companyId: string): Promise<void>;
  getUserRoleInCompany(userId: string, companyId: string): Promise<string | null>;

  // ============================================================================
  // TRUSTED BROWSER OPERATIONS
  // ============================================================================
  createTrustedBrowser(data: InsertTrustedBrowser): Promise<TrustedBrowser>;
  getTrustedBrowser(token: string, userId: string): Promise<TrustedBrowser | undefined>;
  deleteTrustedBrowsersForUser(userId: string): Promise<void>;

  // ============================================================================
  // TEAM INVITATION OPERATIONS
  // ============================================================================
  createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  getTeamInvitationByToken(token: string): Promise<(TeamInvitation & { company: Company; inviter: User }) | undefined>;
  updateTeamInvitation(id: string, updates: Partial<InsertTeamInvitation>): Promise<TeamInvitation>;
  getPendingTeamInvitationForEmail(email: string, companyId: string): Promise<TeamInvitation | undefined>;

  // ============================================================================
  // TENDER OPERATIONS
  // ============================================================================
  createTender(tender: InsertTender): Promise<Tender>;
  getTender(id: string): Promise<Tender | undefined>;
  getTenderByVoiceNoteUrl(voiceNoteUrl: string): Promise<Tender | null>;
  getTenderByAttachmentUrl(attachmentUrl: string): Promise<Tender | null>;
  getTenderWithProposalCount(id: string): Promise<(Tender & { proposalCount: number }) | undefined>;
  getTendersByCompany(companyId: string): Promise<Tender[]>;
  getTendersWithProposalCounts(companyId: string): Promise<(Tender & { proposalCount: number })[]>;
  getTenderByInvitationToken(token: string): Promise<(Tender & { company: Company; profile?: CompanyProfile }) | undefined>;
  updateTender(id: string, updates: Partial<InsertTender>): Promise<Tender>;
  updateTenderStatus(id: string, status: string): Promise<void>;
  deleteTender(id: string): Promise<void>;

  // ============================================================================
  // OFFER OPERATIONS
  // ============================================================================
  createOffer(offer: InsertOffer): Promise<Offer>;
  getOffer(id: string): Promise<Offer | undefined>;
  getOffersByTender(tenderId: string): Promise<(Offer & { company: Company; profile?: CompanyProfile })[]>;
  getOffersByCompany(companyId: string): Promise<(Offer & { tender: Tender })[]>;
  getOfferByTenderAndCompany(tenderId: string, companyId: string): Promise<Offer | null>;
  getOfferByFileUrl(fileUrl: string): Promise<Offer | null>;
  getIncomingOffersByCompany(companyId: string): Promise<(Offer & { tender: Tender; company: Company; profile?: CompanyProfile })[]>;
  getIncomingOffersByCompanyWithViews(companyId: string, viewerId: string): Promise<(Offer & { tender: Tender; company: Company; profile?: CompanyProfile; isViewed: boolean })[]>;
  updateOfferStatus(offerId: string, status: string, decidedBy: string): Promise<Offer>;
  markOfferViewed(offerId: string, viewerId: string): Promise<void>;
  getViewedOfferIds(viewerId: string): Promise<string[]>;

  // ============================================================================
  // INVITATION OPERATIONS
  // ============================================================================
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  getInvitationsByTender(tenderId: string): Promise<Invitation[]>;

  // ============================================================================
  // VENDORS BASE OPERATIONS
  // ============================================================================
  addVendorToBase(vendorBase: InsertVendorBase): Promise<VendorBase>;
  getVendorsInBase(requesterCompanyId: string, searchQuery?: string): Promise<(VendorBase & { vendorCompany: Company; profile?: CompanyProfile })[]>;
  isVendorInBase(requesterCompanyId: string, vendorCompanyId: string): Promise<boolean>;
  removeVendorFromBase(requesterCompanyId: string, vendorCompanyId: string): Promise<void>;

  // ============================================================================
  // JOIN REQUEST OPERATIONS
  // ============================================================================
  createJoinRequest(joinRequest: InsertJoinRequest): Promise<JoinRequest>;
  getJoinRequestsByRequester(requesterCompanyId: string, status?: string): Promise<(JoinRequest & { vendorCompany: Company; profile?: CompanyProfile })[]>;
  getJoinRequestById(id: string): Promise<JoinRequest | undefined>;
  getJoinRequestByCompanies(vendorCompanyId: string, requesterCompanyId: string): Promise<JoinRequest | undefined>;
  updateJoinRequestStatus(id: string, status: string, decidedBy: string): Promise<JoinRequest>;
  getPendingJoinRequestsCount(requesterCompanyId: string): Promise<number>;

  // ============================================================================
  // AWARD OPERATIONS
  // ============================================================================
  createAward(award: InsertAward): Promise<Award>;
  getBlockedAwards(): Promise<(Award & { tender: Tender; company: Company })[]>;
  unblockAward(awardId: string, adminId: string): Promise<void>;

  // ============================================================================
  // PRODUCT EVENT OPERATIONS
  // ============================================================================
  logProductEvent(event: InsertProductEvent): Promise<ProductEvent>;
  getEventCountLast24h(eventType: string): Promise<number>;
  hasUserVisitedSettings(userId: string): Promise<boolean>;

  // ============================================================================
  // ONBOARDING OPERATIONS
  // ============================================================================
  getOnboardingTasksStatus(userId: string, companyId: string): Promise<{
    hasTender: boolean;
    hasCompletedProfile: boolean;
    hasProfilePicture: boolean;
    hasVendors: boolean;
    hasReviewedProposal: boolean;
    hasVisitedSettings: boolean;
    completedCount: number;
  }>;

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================
  makeUserAdmin(userId: string): Promise<User>;
  getAllJoinRequests(status?: string): Promise<(JoinRequest & { vendorCompany?: Company; requesterCompany?: Company })[]>;
  approveJoinRequestByAdmin(joinRequestId: string, adminId: string): Promise<void>;
  rejectJoinRequestByAdmin(joinRequestId: string, reason: string, adminId: string): Promise<void>;
  getAuditLogs(limit?: number): Promise<(AuditLog & { admin: User })[]>;
  logAuditAction(auditEntry: InsertAuditLog): Promise<AuditLog>;
  getAdminMetrics(): Promise<{
    pendingVerifications: number;
    pendingJoinRequests: number;
    proposalsLast24h: number;
    blockedAwards: number;
    pendingMarketplace: number;
  }>;

  // ============================================================================
  // TENDER TEMPLATE OPERATIONS
  // ============================================================================
  createTenderTemplate(template: InsertTenderTemplate): Promise<TenderTemplate>;
  getTenderTemplate(id: string): Promise<TenderTemplate | undefined>;
  getTenderTemplates(companyId: string): Promise<TenderTemplate[]>;
  updateTenderTemplate(id: string, updates: Partial<InsertTenderTemplate>): Promise<TenderTemplate>;
  deleteTenderTemplate(id: string): Promise<void>;

  // ============================================================================
  // TENDER Q&A OPERATIONS
  // ============================================================================
  createTenderQuestion(question: InsertTenderQuestion): Promise<TenderQuestion>;
  getTenderQuestions(tenderId: string): Promise<TenderQuestion[]>;
  answerTenderQuestion(questionId: string, answer: string): Promise<TenderQuestion>;

  // ============================================================================
  // ERROR LOG OPERATIONS
  // ============================================================================
  createErrorLog(log: InsertErrorLog): Promise<ErrorLog>;
  getErrorLogs(limit?: number): Promise<ErrorLog[]>;

  // ============================================================================
  // PROPOSAL ANALYSIS OPERATIONS
  // ============================================================================
  createProposalAnalysis(data: InsertProposalAnalysis): Promise<ProposalAnalysis>;
  getProposalAnalysesByTender(tenderId: string): Promise<ProposalAnalysis[]>;
  getProposalAnalysisByOffer(offerId: string): Promise<ProposalAnalysis | undefined>;
  updateProposalAnalysis(id: string, updates: Partial<InsertProposalAnalysis>): Promise<ProposalAnalysis>;
  deleteProposalAnalysesByTender(tenderId: string): Promise<void>;

  // ============================================================================
  // TENDER SAVINGS OPERATIONS
  // ============================================================================
  createTenderSavings(data: InsertTenderSavings): Promise<TenderSavings>;
  getTenderSavings(tenderId: string): Promise<TenderSavings | undefined>;

  // ============================================================================
  // AI CHAT HISTORY OPERATIONS
  // ============================================================================
  getAiChatSessions(userId: string, companyId?: string): Promise<AiChatSession[]>;
  getAiChatSession(id: string): Promise<AiChatSession | undefined>;
  createAiChatSession(session: InsertAiChatSession): Promise<AiChatSession>;
  updateAiChatSession(id: string, updates: Partial<InsertAiChatSession>): Promise<AiChatSession>;
  deleteAiChatSession(id: string): Promise<void>;
  getAiChatMessages(sessionId: string): Promise<AiChatMessage[]>;
  createAiChatMessage(message: InsertAiChatMessage): Promise<AiChatMessage>;

  // ============================================================================
  // NEGOTIATION ACTION OPERATIONS
  // ============================================================================
  createNegotiationAction(action: InsertNegotiationAction): Promise<NegotiationAction>;
  getNegotiationActionsByTender(tenderId: string): Promise<(NegotiationAction & { company: Company })[]>;
  getNegotiationActionsByOffer(offerId: string): Promise<NegotiationAction[]>;
  getLatestNegotiationAction(tenderId: string, offerId: string, actionType: string): Promise<NegotiationAction | undefined>;
  allowOfferResubmission(offerId: string): Promise<void>;

  // ============================================================================
  // MARKETPLACE OPERATIONS
  // ============================================================================
  getMarketplaceTenders(options: {
    search?: string;
    category?: string;
    city?: string;
    tenderType?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tenders: (Tender & { company: Company; profile?: CompanyProfile })[]; total: number }>;
  getMarketplaceStats(): Promise<{ activeTenders: number; awardedTenders: number; totalOffers: number }>;
  getPendingMarketplaceRequests(): Promise<(Tender & { company: Company; profile?: CompanyProfile })[]>;
  getApprovedMarketplaceTenders(): Promise<(Tender & { company: Company; profile?: CompanyProfile })[]>;
  approveMarketplaceTender(tenderId: string, adminId: string): Promise<void>;
  rejectMarketplaceTender(tenderId: string, reason: string, adminId: string): Promise<void>;

  // ============================================================================
  // PURCHASE ORDER OPERATIONS
  // ============================================================================
  createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder>;
  getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined>;
  getPurchaseOrdersByTender(tenderId: string): Promise<PurchaseOrder[]>;
  updatePurchaseOrder(id: string, updates: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder>;
  deletePurchaseOrder(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getCompanyByEmailDomain(domain: string): Promise<Company | undefined> {
    const [result] = await db
      .select({ company: companies })
      .from(users)
      .innerJoin(userCompanies, and(
        eq(userCompanies.userId, users.id),
        isNull(userCompanies.deletedAt)
      ))
      .innerJoin(companies, and(
        eq(companies.id, userCompanies.companyId),
        isNull(companies.deletedAt)
      ))
      .where(ilike(users.email, `%@${domain}`))
      .orderBy(desc(userCompanies.joinedAt))
      .limit(1);
    return result?.company;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  // ============================================================================
  // COMPANY OPERATIONS
  // ============================================================================

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(insertCompany).returning();
    return company;
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), isNull(companies.deletedAt)));
    return company || undefined;
  }

  async getCompanyBySlug(slug: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.slug, slug), isNull(companies.deletedAt)));
    return company || undefined;
  }

  async getCompanyByCrNumber(crNumber: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.crNumber, crNumber), isNull(companies.deletedAt)));
    return company || undefined;
  }

  async updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company> {
    const [company] = await db
      .update(companies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return company;
  }

  async getCompaniesWithPendingVerification(): Promise<(Company & { profile?: CompanyProfile })[]> {
    const results = await db
      .select({
        company: companies,
        profile: companyProfiles,
      })
      .from(companies)
      .leftJoin(companyProfiles, eq(companies.id, companyProfiles.companyId))
      .where(and(
        eq(companies.verificationStatus, 'under_review'),
        isNull(companies.deletedAt)
      ))
      .orderBy(desc(companies.createdAt));

    return results.map(r => ({
      ...r.company,
      profile: r.profile || undefined
    }));
  }

  async verifyCompany(companyId: string, adminId: string, notes?: string): Promise<void> {
    const [before] = await db.select().from(companies).where(eq(companies.id, companyId));
    
    await db
      .update(companies)
      .set({ 
        verificationStatus: 'verified',
        rejectionReason: null,
        updatedAt: new Date()
      })
      .where(eq(companies.id, companyId));

    const [after] = await db.select().from(companies).where(eq(companies.id, companyId));

    // Log audit entry
    await this.logAuditAction({
      adminId,
      action: 'company_verified',
      targetType: 'company',
      targetId: companyId,
      beforeState: JSON.stringify(before),
      afterState: JSON.stringify(after),
      notes: notes || null
    });

    // Log product event
    await this.logProductEvent({
      eventType: 'company_verified',
      companyId,
      metadata: { verifiedBy: adminId }
    });
  }

  async rejectCompany(companyId: string, reason: string, adminId: string): Promise<void> {
    const [before] = await db.select().from(companies).where(eq(companies.id, companyId));
    
    await db
      .update(companies)
      .set({ 
        verificationStatus: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date()
      })
      .where(eq(companies.id, companyId));

    const [after] = await db.select().from(companies).where(eq(companies.id, companyId));

    // Log audit entry
    await this.logAuditAction({
      adminId,
      action: 'company_rejected',
      targetType: 'company',
      targetId: companyId,
      beforeState: JSON.stringify(before),
      afterState: JSON.stringify(after),
      notes: reason
    });
  }

  // ============================================================================
  // COMPANY PROFILE OPERATIONS
  // ============================================================================

  async createCompanyProfile(insertProfile: InsertCompanyProfile): Promise<CompanyProfile> {
    const [profile] = await db.insert(companyProfiles).values(insertProfile).returning();
    return profile;
  }

  async getCompanyProfile(companyId: string): Promise<CompanyProfile | undefined> {
    const [profile] = await db
      .select()
      .from(companyProfiles)
      .where(eq(companyProfiles.companyId, companyId));
    return profile || undefined;
  }

  async getCompanyProfileByTractionSlug(slug: string): Promise<(CompanyProfile & { company: Company }) | undefined> {
    const [result] = await db
      .select({
        profile: companyProfiles,
        company: companies
      })
      .from(companyProfiles)
      .innerJoin(companies, eq(companyProfiles.companyId, companies.id))
      .where(and(
        eq(companyProfiles.tractionSlug, slug),
        isNull(companies.deletedAt)
      ));

    if (!result) return undefined;

    return {
      ...result.profile,
      company: result.company
    };
  }

  async updateCompanyProfile(companyId: string, updates: Partial<InsertCompanyProfile>): Promise<CompanyProfile> {
    const [profile] = await db
      .update(companyProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companyProfiles.companyId, companyId))
      .returning();
    return profile;
  }

  // ============================================================================
  // USER-COMPANY OPERATIONS
  // ============================================================================

  async addUserToCompany(insertUserCompany: InsertUserCompany): Promise<UserCompany> {
    const [userCompany] = await db.insert(userCompanies).values(insertUserCompany).returning();
    return userCompany;
  }

  async getUserCompanies(userId: string): Promise<(UserCompany & { company: Company; profile?: CompanyProfile })[]> {
    const results = await db
      .select({
        userCompany: userCompanies,
        company: companies,
        profile: companyProfiles
      })
      .from(userCompanies)
      .innerJoin(companies, eq(userCompanies.companyId, companies.id))
      .leftJoin(companyProfiles, eq(companies.id, companyProfiles.companyId))
      .where(and(
        eq(userCompanies.userId, userId),
        isNull(userCompanies.deletedAt),
        isNull(companies.deletedAt)
      ))
      .orderBy(desc(userCompanies.joinedAt));

    return results.map(r => ({
      ...r.userCompany,
      company: r.company,
      profile: r.profile || undefined
    }));
  }

  async getCompanyMembers(companyId: string): Promise<(UserCompany & { user: User })[]> {
    const results = await db
      .select({
        userCompany: userCompanies,
        user: users
      })
      .from(userCompanies)
      .innerJoin(users, eq(userCompanies.userId, users.id))
      .where(and(
        eq(userCompanies.companyId, companyId),
        isNull(userCompanies.deletedAt)
      ))
      .orderBy(desc(userCompanies.joinedAt));

    return results.map(r => ({
      ...r.userCompany,
      user: r.user
    }));
  }

  async updateUserRole(userId: string, companyId: string, role: string): Promise<UserCompany> {
    const [userCompany] = await db
      .update(userCompanies)
      .set({ roleInCompany: role })
      .where(and(
        eq(userCompanies.userId, userId),
        eq(userCompanies.companyId, companyId),
        isNull(userCompanies.deletedAt)
      ))
      .returning();
    return userCompany;
  }

  async removeUserFromCompany(userId: string, companyId: string): Promise<void> {
    await db
      .update(userCompanies)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(userCompanies.userId, userId),
        eq(userCompanies.companyId, companyId)
      ));
  }

  async getUserRoleInCompany(userId: string, companyId: string): Promise<string | null> {
    const [result] = await db
      .select({ role: userCompanies.roleInCompany })
      .from(userCompanies)
      .where(and(
        eq(userCompanies.userId, userId),
        eq(userCompanies.companyId, companyId),
        isNull(userCompanies.deletedAt)
      ));
    return result?.role || null;
  }

  // ============================================================================
  // TRUSTED BROWSER OPERATIONS
  // ============================================================================

  async createTrustedBrowser(data: InsertTrustedBrowser): Promise<TrustedBrowser> {
    const [result] = await db.insert(trustedBrowsers).values(data).returning();
    return result;
  }

  async getTrustedBrowser(token: string, userId: string): Promise<TrustedBrowser | undefined> {
    const [result] = await db
      .select()
      .from(trustedBrowsers)
      .where(and(
        eq(trustedBrowsers.token, token),
        eq(trustedBrowsers.userId, userId),
        gte(trustedBrowsers.expiresAt, new Date())
      ));
    return result || undefined;
  }

  async deleteTrustedBrowsersForUser(userId: string): Promise<void> {
    await db.delete(trustedBrowsers).where(eq(trustedBrowsers.userId, userId));
  }

  // ============================================================================
  // TEAM INVITATION OPERATIONS
  // ============================================================================

  async createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> {
    const [result] = await db.insert(teamInvitations).values(invitation).returning();
    return result;
  }

  async getTeamInvitationByToken(token: string): Promise<(TeamInvitation & { company: Company; inviter: User }) | undefined> {
    const [result] = await db
      .select({
        invitation: teamInvitations,
        company: companies,
        inviter: users,
      })
      .from(teamInvitations)
      .innerJoin(companies, eq(teamInvitations.companyId, companies.id))
      .innerJoin(users, eq(teamInvitations.invitedBy, users.id))
      .where(eq(teamInvitations.token, token));

    if (!result) return undefined;
    return {
      ...result.invitation,
      company: result.company,
      inviter: result.inviter,
    };
  }

  async updateTeamInvitation(id: string, updates: Partial<InsertTeamInvitation>): Promise<TeamInvitation> {
    const [result] = await db.update(teamInvitations).set(updates).where(eq(teamInvitations.id, id)).returning();
    return result;
  }

  async getPendingTeamInvitationForEmail(email: string, companyId: string): Promise<TeamInvitation | undefined> {
    const [result] = await db
      .select()
      .from(teamInvitations)
      .where(and(
        eq(teamInvitations.email, email),
        eq(teamInvitations.companyId, companyId),
        eq(teamInvitations.status, 'pending')
      ));
    return result || undefined;
  }

  // ============================================================================
  // COMPANY DOCUMENT OPERATIONS
  // ============================================================================

  async createCompanyDocument(doc: InsertCompanyDocument): Promise<CompanyDocument> {
    const [result] = await db.insert(companyDocuments).values(doc).returning();
    return result;
  }

  async getCompanyDocuments(companyId: string): Promise<CompanyDocument[]> {
    return db.select().from(companyDocuments).where(eq(companyDocuments.companyId, companyId));
  }

  // ============================================================================
  // TENDER OPERATIONS
  // ============================================================================

  async createTender(insertTender: InsertTender): Promise<Tender> {
    const [tender] = await db.insert(tenders).values(insertTender).returning();
    return tender;
  }

  async getTender(id: string): Promise<Tender | undefined> {
    const [tender] = await db.select().from(tenders).where(eq(tenders.id, id));
    return tender || undefined;
  }

  async getTenderByVoiceNoteUrl(voiceNoteUrl: string): Promise<Tender | null> {
    const [tender] = await db
      .select()
      .from(tenders)
      .where(eq(tenders.voiceNoteUrl, voiceNoteUrl))
      .limit(1);
    return tender || null;
  }

  async getTenderByAttachmentUrl(attachmentUrl: string): Promise<Tender | null> {
    const allTenders = await db
      .select()
      .from(tenders)
      .where(sql`attachments IS NOT NULL`);
    for (const tender of allTenders) {
      const attachments = tender.attachments as any[];
      if (attachments?.some((a: any) => a.url === attachmentUrl)) {
        return tender;
      }
    }
    return null;
  }

  async getTendersByCompany(companyId: string): Promise<Tender[]> {
    return await db
      .select()
      .from(tenders)
      .where(eq(tenders.companyId, companyId))
      .orderBy(desc(tenders.createdAt));
  }

  async getTenderByInvitationToken(token: string): Promise<(Tender & { company: Company; profile?: CompanyProfile }) | undefined> {
    const [result] = await db
      .select({
        tender: tenders,
        company: companies,
        profile: companyProfiles
      })
      .from(tenders)
      .innerJoin(companies, eq(tenders.companyId, companies.id))
      .leftJoin(companyProfiles, eq(companies.id, companyProfiles.companyId))
      .where(eq(tenders.invitationToken, token));

    if (!result) return undefined;

    return {
      ...result.tender,
      company: result.company,
      profile: result.profile || undefined
    };
  }

  async updateTenderStatus(id: string, status: string): Promise<void> {
    await db.update(tenders).set({ status, updatedAt: new Date() }).where(eq(tenders.id, id));
  }

  async getTenderWithProposalCount(id: string): Promise<(Tender & { proposalCount: number }) | undefined> {
    const [tender] = await db.select().from(tenders).where(eq(tenders.id, id));
    if (!tender) return undefined;
    
    const [countResult] = await db
      .select({ count: count() })
      .from(offers)
      .where(eq(offers.tenderId, id));
    
    return {
      ...tender,
      proposalCount: Number(countResult?.count || 0)
    };
  }

  async getTendersWithProposalCounts(companyId: string): Promise<(Tender & { proposalCount: number })[]> {
    const companyTenders = await db
      .select()
      .from(tenders)
      .where(eq(tenders.companyId, companyId))
      .orderBy(desc(tenders.createdAt));
    
    const result = await Promise.all(
      companyTenders.map(async (tender) => {
        const [countResult] = await db
          .select({ count: count() })
          .from(offers)
          .where(eq(offers.tenderId, tender.id));
        
        return {
          ...tender,
          proposalCount: Number(countResult?.count || 0)
        };
      })
    );
    
    return result;
  }

  async updateTender(id: string, updates: Partial<InsertTender>): Promise<Tender> {
    const [tender] = await db
      .update(tenders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenders.id, id))
      .returning();
    return tender;
  }

  async deleteTender(id: string): Promise<void> {
    // Delete related offers first
    await db.delete(offers).where(eq(offers.tenderId, id));
    // Delete related invitations
    await db.delete(invitations).where(eq(invitations.tenderId, id));
    // Then delete the tender
    await db.delete(tenders).where(eq(tenders.id, id));
  }

  // ============================================================================
  // OFFER OPERATIONS
  // ============================================================================

  async createOffer(insertOffer: InsertOffer): Promise<Offer> {
    const [offer] = await db.insert(offers).values(insertOffer).returning();
    return offer;
  }

  async getOffer(id: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    return offer;
  }

  async getOffersByTender(tenderId: string): Promise<(Offer & { company: Company; profile?: CompanyProfile })[]> {
    const results = await db
      .select({
        offer: offers,
        company: companies,
        profile: companyProfiles
      })
      .from(offers)
      .innerJoin(companies, eq(offers.companyId, companies.id))
      .leftJoin(companyProfiles, eq(companies.id, companyProfiles.companyId))
      .where(eq(offers.tenderId, tenderId))
      .orderBy(desc(offers.submittedAt));

    return results.map(r => ({
      ...r.offer,
      company: r.company,
      profile: r.profile || undefined
    }));
  }

  async getOffersByCompany(companyId: string): Promise<(Offer & { tender: Tender })[]> {
    const results = await db
      .select({
        offer: offers,
        tender: tenders
      })
      .from(offers)
      .innerJoin(tenders, eq(offers.tenderId, tenders.id))
      .where(eq(offers.companyId, companyId))
      .orderBy(desc(offers.submittedAt));

    return results.map(r => ({
      ...r.offer,
      tender: r.tender
    }));
  }

  async getOfferByTenderAndCompany(tenderId: string, companyId: string): Promise<Offer | null> {
    const [offer] = await db
      .select()
      .from(offers)
      .where(and(eq(offers.tenderId, tenderId), eq(offers.companyId, companyId)))
      .limit(1);

    return offer || null;
  }

  async getOfferByFileUrl(fileUrl: string): Promise<Offer | null> {
    const [offer] = await db
      .select()
      .from(offers)
      .where(
        or(
          eq(offers.technicalFileUrl, fileUrl),
          eq(offers.financialFileUrl, fileUrl),
          eq(offers.combinedFileUrl, fileUrl)
        )
      )
      .limit(1);

    return offer || null;
  }

  async getIncomingOffersByCompany(companyId: string): Promise<(Offer & { tender: Tender; company: Company; profile?: CompanyProfile })[]> {
    const results = await db
      .select({
        offer: offers,
        tender: tenders,
        company: companies,
        profile: companyProfiles
      })
      .from(offers)
      .innerJoin(tenders, eq(offers.tenderId, tenders.id))
      .innerJoin(companies, eq(offers.companyId, companies.id))
      .leftJoin(companyProfiles, eq(offers.companyId, companyProfiles.companyId))
      .where(eq(tenders.companyId, companyId))
      .orderBy(desc(offers.submittedAt));

    return results.map(r => ({
      ...r.offer,
      tender: r.tender,
      company: r.company,
      profile: r.profile || undefined
    }));
  }

  async updateOfferStatus(offerId: string, status: string, decidedBy: string): Promise<Offer> {
    const [updated] = await db
      .update(offers)
      .set({ 
        status, 
        decidedBy,
        decidedAt: new Date()
      })
      .where(eq(offers.id, offerId))
      .returning();
    return updated;
  }

  async getIncomingOffersByCompanyWithViews(companyId: string, viewerId: string): Promise<(Offer & { tender: Tender; company: Company; profile?: CompanyProfile; isViewed: boolean })[]> {
    const results = await db
      .select({
        offer: offers,
        tender: tenders,
        company: companies,
        profile: companyProfiles,
        view: offerViews
      })
      .from(offers)
      .innerJoin(tenders, eq(offers.tenderId, tenders.id))
      .innerJoin(companies, eq(offers.companyId, companies.id))
      .leftJoin(companyProfiles, eq(offers.companyId, companyProfiles.companyId))
      .leftJoin(offerViews, and(
        eq(offerViews.offerId, offers.id),
        eq(offerViews.viewerId, viewerId)
      ))
      .where(eq(tenders.companyId, companyId))
      .orderBy(desc(offers.submittedAt));

    return results.map(r => ({
      ...r.offer,
      tender: r.tender,
      company: r.company,
      profile: r.profile || undefined,
      isViewed: r.view !== null
    }));
  }

  async markOfferViewed(offerId: string, viewerId: string): Promise<void> {
    const existingView = await db
      .select()
      .from(offerViews)
      .where(and(
        eq(offerViews.offerId, offerId),
        eq(offerViews.viewerId, viewerId)
      ))
      .limit(1);
    
    if (existingView.length === 0) {
      await db.insert(offerViews).values({
        offerId,
        viewerId
      });
    }
  }

  async getViewedOfferIds(viewerId: string): Promise<string[]> {
    const views = await db
      .select({ offerId: offerViews.offerId })
      .from(offerViews)
      .where(eq(offerViews.viewerId, viewerId));
    
    return views.map(v => v.offerId);
  }

  // ============================================================================
  // INVITATION OPERATIONS
  // ============================================================================

  async createInvitation(insertInvitation: InsertInvitation): Promise<Invitation> {
    const [invitation] = await db.insert(invitations).values(insertInvitation).returning();
    return invitation;
  }

  async getInvitationsByTender(tenderId: string): Promise<Invitation[]> {
    return await db
      .select()
      .from(invitations)
      .where(eq(invitations.tenderId, tenderId))
      .orderBy(desc(invitations.invitedAt));
  }

  // ============================================================================
  // VENDORS BASE OPERATIONS
  // ============================================================================

  async addVendorToBase(insertVendorBase: InsertVendorBase): Promise<VendorBase> {
    const [vendorBase] = await db.insert(vendorsBase).values(insertVendorBase).returning();
    return vendorBase;
  }

  async getVendorsInBase(requesterCompanyId: string, searchQuery?: string): Promise<(VendorBase & { vendorCompany: Company; profile?: CompanyProfile })[]> {
    let query = db
      .select({
        vendorBase: vendorsBase,
        vendorCompany: companies,
        profile: companyProfiles
      })
      .from(vendorsBase)
      .innerJoin(companies, eq(vendorsBase.vendorCompanyId, companies.id))
      .leftJoin(companyProfiles, eq(companies.id, companyProfiles.companyId))
      .where(and(
        eq(vendorsBase.requesterCompanyId, requesterCompanyId),
        isNull(companies.deletedAt)
      ))
      .$dynamic();

    if (searchQuery) {
      query = query.where(
        or(
          ilike(companies.name, `%${searchQuery}%`),
          ilike(companyProfiles.displayName, `%${searchQuery}%`)
        )
      );
    }

    const results = await query.orderBy(desc(vendorsBase.addedAt));

    return results.map(r => ({
      ...r.vendorBase,
      vendorCompany: r.vendorCompany,
      profile: r.profile || undefined
    }));
  }

  async isVendorInBase(requesterCompanyId: string, vendorCompanyId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(vendorsBase)
      .where(and(
        eq(vendorsBase.requesterCompanyId, requesterCompanyId),
        eq(vendorsBase.vendorCompanyId, vendorCompanyId)
      ));
    return !!result;
  }

  async removeVendorFromBase(requesterCompanyId: string, vendorCompanyId: string): Promise<void> {
    await db.delete(vendorsBase).where(
      and(
        eq(vendorsBase.requesterCompanyId, requesterCompanyId),
        eq(vendorsBase.vendorCompanyId, vendorCompanyId)
      )
    );
  }

  // ============================================================================
  // JOIN REQUEST OPERATIONS
  // ============================================================================

  async createJoinRequest(insertJoinRequest: InsertJoinRequest): Promise<JoinRequest> {
    const [joinRequest] = await db.insert(joinRequests).values(insertJoinRequest).returning();
    return joinRequest;
  }

  async getJoinRequestsByRequester(requesterCompanyId: string, status?: string): Promise<(JoinRequest & { vendorCompany: Company; profile?: CompanyProfile })[]> {
    let query = db
      .select({
        joinRequest: joinRequests,
        vendorCompany: companies,
        profile: companyProfiles
      })
      .from(joinRequests)
      .innerJoin(companies, eq(joinRequests.vendorCompanyId, companies.id))
      .leftJoin(companyProfiles, eq(companies.id, companyProfiles.companyId))
      .where(eq(joinRequests.requesterCompanyId, requesterCompanyId))
      .$dynamic();

    if (status) {
      query = query.where(eq(joinRequests.status, status));
    }

    const results = await query.orderBy(desc(joinRequests.createdAt));

    return results.map(r => ({
      ...r.joinRequest,
      vendorCompany: r.vendorCompany,
      profile: r.profile || undefined
    }));
  }

  async getJoinRequestById(id: string): Promise<JoinRequest | undefined> {
    const [joinRequest] = await db.select().from(joinRequests).where(eq(joinRequests.id, id));
    return joinRequest || undefined;
  }

  async getJoinRequestByCompanies(vendorCompanyId: string, requesterCompanyId: string): Promise<JoinRequest | undefined> {
    const [joinRequest] = await db
      .select()
      .from(joinRequests)
      .where(and(
        eq(joinRequests.vendorCompanyId, vendorCompanyId),
        eq(joinRequests.requesterCompanyId, requesterCompanyId)
      ))
      .orderBy(desc(joinRequests.createdAt))
      .limit(1);
    return joinRequest || undefined;
  }

  async updateJoinRequestStatus(id: string, status: string, decidedBy: string): Promise<JoinRequest> {
    const [joinRequest] = await db
      .update(joinRequests)
      .set({ 
        status, 
        decidedAt: new Date(),
        decidedBy
      })
      .where(eq(joinRequests.id, id))
      .returning();
    return joinRequest;
  }

  async getPendingJoinRequestsCount(requesterCompanyId: string): Promise<number> {
    const results = await db
      .select()
      .from(joinRequests)
      .where(and(
        eq(joinRequests.requesterCompanyId, requesterCompanyId),
        eq(joinRequests.status, 'pending')
      ));
    return results.length;
  }

  // ============================================================================
  // AWARD OPERATIONS
  // ============================================================================

  async createAward(insertAward: InsertAward): Promise<Award> {
    const [award] = await db.insert(awards).values(insertAward).returning();
    return award;
  }

  async getBlockedAwards(): Promise<(Award & { tender: Tender; company: Company })[]> {
    const results = await db
      .select({
        award: awards,
        tender: tenders,
        company: companies
      })
      .from(awards)
      .innerJoin(tenders, eq(awards.tenderId, tenders.id))
      .innerJoin(companies, eq(awards.companyId, companies.id))
      .where(eq(awards.status, 'blocked'))
      .orderBy(desc(awards.createdAt));

    return results.map(r => ({
      ...r.award,
      tender: r.tender,
      company: r.company
    }));
  }

  async unblockAward(awardId: string, adminId: string): Promise<void> {
    const [before] = await db.select().from(awards).where(eq(awards.id, awardId));
    
    await db
      .update(awards)
      .set({ 
        status: 'awarded',
        blockReason: null,
        awardedAt: new Date()
      })
      .where(eq(awards.id, awardId));

    const [after] = await db.select().from(awards).where(eq(awards.id, awardId));

    // Log audit entry
    await this.logAuditAction({
      adminId,
      action: 'award_unblocked',
      targetType: 'award',
      targetId: awardId,
      beforeState: JSON.stringify(before),
      afterState: JSON.stringify(after),
      notes: null
    });
  }

  // ============================================================================
  // PRODUCT EVENT OPERATIONS
  // ============================================================================

  async logProductEvent(insertEvent: InsertProductEvent): Promise<ProductEvent> {
    const [event] = await db.insert(productEvents).values(insertEvent).returning();
    return event;
  }

  async getEventCountLast24h(eventType: string): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const results = await db
      .select()
      .from(productEvents)
      .where(and(
        eq(productEvents.eventType, eventType),
        gte(productEvents.createdAt, oneDayAgo)
      ));
    return results.length;
  }

  async hasUserVisitedSettings(userId: string): Promise<boolean> {
    const results = await db
      .select()
      .from(productEvents)
      .where(and(
        eq(productEvents.eventType, 'settings_visited'),
        eq(productEvents.userId, userId)
      ))
      .limit(1);
    return results.length > 0;
  }

  // ============================================================================
  // ONBOARDING OPERATIONS
  // ============================================================================

  async getOnboardingTasksStatus(userId: string, companyId: string): Promise<{
    hasTender: boolean;
    hasCompletedProfile: boolean;
    hasProfilePicture: boolean;
    hasVendors: boolean;
    hasReviewedProposal: boolean;
    hasVisitedSettings: boolean;
    completedCount: number;
  }> {
    // Task 1: Check if company has any tenders
    const companyTenders = await db.select().from(tenders).where(eq(tenders.companyId, companyId)).limit(1);
    const hasTender = companyTenders.length > 0;

    // Task 2: Check if company profile is completed
    const company = await this.getCompany(companyId);
    const hasCompletedProfile = company?.onboardingState === 'completed';

    // Task 3: Check if user has a profile picture
    const user = await this.getUser(userId);
    const hasProfilePicture = !!user?.profilePictureUrl;

    // Task 4: Check if company has vendors in their base
    const vendorsList = await db.select().from(vendorsBase).where(eq(vendorsBase.requesterCompanyId, companyId)).limit(1);
    const hasVendors = vendorsList.length > 0;

    // Task 5: Check if company has reviewed any proposals (accepted or rejected an offer)
    const reviewedOffers = await db
      .select()
      .from(offers)
      .innerJoin(tenders, eq(offers.tenderId, tenders.id))
      .where(and(
        eq(tenders.companyId, companyId),
        or(eq(offers.status, 'accepted'), eq(offers.status, 'rejected'))
      ))
      .limit(1);
    const hasReviewedProposal = reviewedOffers.length > 0;

    // Task 6: Check if user has visited settings
    const hasVisitedSettings = await this.hasUserVisitedSettings(userId);

    const completedCount = [
      hasTender,
      hasCompletedProfile,
      hasProfilePicture,
      hasVendors,
      hasReviewedProposal,
    ].filter(Boolean).length;

    return {
      hasTender,
      hasCompletedProfile,
      hasProfilePicture,
      hasVendors,
      hasReviewedProposal,
      hasVisitedSettings,
      completedCount
    };
  }

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================

  async makeUserAdmin(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllJoinRequests(status?: string): Promise<(JoinRequest & { vendorCompany?: Company; requesterCompany?: Company })[]> {
    let query = db
      .select({
        joinRequest: joinRequests,
        vendorCompany: companies,
        requesterCompany: sql<Company>`requester_companies`
      })
      .from(joinRequests)
      .leftJoin(companies, eq(joinRequests.vendorCompanyId, companies.id))
      .leftJoin(sql`${companies} AS requester_companies`, eq(joinRequests.requesterCompanyId, sql`requester_companies.id`))
      .$dynamic();

    if (status) {
      query = query.where(eq(joinRequests.status, status));
    }

    const results = await query.orderBy(desc(joinRequests.createdAt));

    return results.map(r => ({
      ...r.joinRequest,
      vendorCompany: r.vendorCompany || undefined,
      requesterCompany: r.requesterCompany || undefined
    }));
  }

  async approveJoinRequestByAdmin(joinRequestId: string, adminId: string): Promise<void> {
    const joinRequest = await this.getJoinRequestById(joinRequestId);
    if (!joinRequest) throw new Error('Join request not found');

    // Update join request
    await this.updateJoinRequestStatus(joinRequestId, 'approved', adminId);

    // Add to vendors base
    await this.addVendorToBase({
      requesterCompanyId: joinRequest.requesterCompanyId,
      vendorCompanyId: joinRequest.vendorCompanyId,
      joinMethod: 'traction',
      addedBy: adminId
    });

    // Log audit
    await this.logAuditAction({
      adminId,
      action: 'join_request_approved_by_admin',
      targetType: 'join_request',
      targetId: joinRequestId,
      beforeState: JSON.stringify({ status: 'pending' }),
      afterState: JSON.stringify({ status: 'approved' }),
      notes: null
    });
  }

  async rejectJoinRequestByAdmin(joinRequestId: string, reason: string, adminId: string): Promise<void> {
    await db
      .update(joinRequests)
      .set({ 
        status: 'rejected',
        rejectionReason: reason,
        decidedAt: new Date(),
        decidedBy: adminId
      })
      .where(eq(joinRequests.id, joinRequestId));

    // Log audit
    await this.logAuditAction({
      adminId,
      action: 'join_request_rejected_by_admin',
      targetType: 'join_request',
      targetId: joinRequestId,
      beforeState: JSON.stringify({ status: 'pending' }),
      afterState: JSON.stringify({ status: 'rejected', reason }),
      notes: reason
    });
  }

  async getAuditLogs(limit: number = 100): Promise<(AuditLog & { admin: User })[]> {
    const results = await db
      .select({
        auditLog: auditLog,
        admin: users
      })
      .from(auditLog)
      .innerJoin(users, eq(auditLog.adminId, users.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);

    return results.map(r => ({
      ...r.auditLog,
      admin: r.admin
    }));
  }

  async logAuditAction(insertAudit: InsertAuditLog): Promise<AuditLog> {
    const [audit] = await db.insert(auditLog).values(insertAudit).returning();
    return audit;
  }

  async getAdminMetrics(): Promise<{
    pendingVerifications: number;
    pendingJoinRequests: number;
    proposalsLast24h: number;
    blockedAwards: number;
    pendingMarketplace: number;
  }> {
    // Pending verifications
    const pendingVerifications = await db
      .select()
      .from(companies)
      .where(and(
        eq(companies.verificationStatus, 'under_review'),
        isNull(companies.deletedAt)
      ));

    // Pending join requests (across all companies)
    const pendingJoinRequests = await db
      .select()
      .from(joinRequests)
      .where(eq(joinRequests.status, 'pending'));

    // Proposals last 24h
    const proposalsCount = await this.getEventCountLast24h('proposal_submitted');

    // Blocked awards
    const blockedAwards = await db
      .select()
      .from(awards)
      .where(eq(awards.status, 'blocked'));

    // Pending marketplace requests
    const pendingMarketplace = await db
      .select()
      .from(tenders)
      .where(and(
        eq(tenders.isMarketplace, true),
        eq(tenders.marketplaceStatus, 'pending'),
      ));

    return {
      pendingVerifications: pendingVerifications.length,
      pendingJoinRequests: pendingJoinRequests.length,
      proposalsLast24h: proposalsCount,
      blockedAwards: blockedAwards.length,
      pendingMarketplace: pendingMarketplace.length,
    };
  }

  // ============================================================================
  // TENDER TEMPLATE OPERATIONS
  // ============================================================================

  async createTenderTemplate(template: InsertTenderTemplate): Promise<TenderTemplate> {
    const [created] = await db.insert(tenderTemplates).values(template).returning();
    return created;
  }

  async getTenderTemplate(id: string): Promise<TenderTemplate | undefined> {
    const [template] = await db
      .select()
      .from(tenderTemplates)
      .where(eq(tenderTemplates.id, id));
    return template;
  }

  async getTenderTemplates(companyId: string): Promise<TenderTemplate[]> {
    return db
      .select()
      .from(tenderTemplates)
      .where(eq(tenderTemplates.companyId, companyId))
      .orderBy(desc(tenderTemplates.createdAt));
  }

  async updateTenderTemplate(id: string, updates: Partial<InsertTenderTemplate>): Promise<TenderTemplate> {
    const [updated] = await db
      .update(tenderTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenderTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteTenderTemplate(id: string): Promise<void> {
    await db.delete(tenderTemplates).where(eq(tenderTemplates.id, id));
  }

  // ============================================================================
  // TENDER Q&A OPERATIONS
  // ============================================================================

  async createTenderQuestion(question: InsertTenderQuestion): Promise<TenderQuestion> {
    const [created] = await db.insert(tenderQuestions).values(question).returning();
    return created;
  }

  async getTenderQuestions(tenderId: string): Promise<TenderQuestion[]> {
    return await db
      .select()
      .from(tenderQuestions)
      .where(eq(tenderQuestions.tenderId, tenderId))
      .orderBy(desc(tenderQuestions.createdAt));
  }

  async answerTenderQuestion(questionId: string, answer: string): Promise<TenderQuestion> {
    const [updated] = await db
      .update(tenderQuestions)
      .set({ answer, answeredAt: new Date() })
      .where(eq(tenderQuestions.id, questionId))
      .returning();
    return updated;
  }

  // ============================================================================
  // ERROR LOG OPERATIONS
  // ============================================================================

  async createErrorLog(log: InsertErrorLog): Promise<ErrorLog> {
    const [created] = await db.insert(errorLogs).values(log).returning();
    return created;
  }

  async getErrorLogs(limit = 100): Promise<ErrorLog[]> {
    return await db
      .select()
      .from(errorLogs)
      .orderBy(desc(errorLogs.createdAt))
      .limit(limit);
  }

  // ============================================================================
  // PROPOSAL ANALYSIS OPERATIONS
  // ============================================================================

  async createProposalAnalysis(data: InsertProposalAnalysis): Promise<ProposalAnalysis> {
    const [analysis] = await db.insert(proposalAnalyses).values(data).returning();
    return analysis;
  }

  async getProposalAnalysesByTender(tenderId: string): Promise<ProposalAnalysis[]> {
    return await db
      .select()
      .from(proposalAnalyses)
      .where(eq(proposalAnalyses.tenderId, tenderId))
      .orderBy(desc(proposalAnalyses.analyzedAt));
  }

  async getProposalAnalysisByOffer(offerId: string): Promise<ProposalAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(proposalAnalyses)
      .where(eq(proposalAnalyses.offerId, offerId));
    return analysis;
  }

  async updateProposalAnalysis(id: string, updates: Partial<InsertProposalAnalysis>): Promise<ProposalAnalysis> {
    const [updated] = await db
      .update(proposalAnalyses)
      .set(updates)
      .where(eq(proposalAnalyses.id, id))
      .returning();
    return updated;
  }

  async deleteProposalAnalysesByTender(tenderId: string): Promise<void> {
    await db.delete(proposalAnalyses).where(eq(proposalAnalyses.tenderId, tenderId));
  }

  // ============================================================================
  // TENDER SAVINGS OPERATIONS
  // ============================================================================

  async createTenderSavings(data: InsertTenderSavings): Promise<TenderSavings> {
    const [savings] = await db.insert(tenderSavings).values(data).returning();
    return savings;
  }

  async getTenderSavings(tenderId: string): Promise<TenderSavings | undefined> {
    const [savings] = await db
      .select()
      .from(tenderSavings)
      .where(eq(tenderSavings.tenderId, tenderId))
      .orderBy(desc(tenderSavings.createdAt))
      .limit(1);
    return savings;
  }
  // ============================================================================
  // AI CHAT HISTORY OPERATIONS
  // ============================================================================

  async getAiChatSessions(userId: string, companyId?: string): Promise<AiChatSession[]> {
    const conditions = [eq(aiChatSessions.userId, userId)];
    if (companyId) {
      conditions.push(eq(aiChatSessions.companyId, companyId));
    }
    return db
      .select()
      .from(aiChatSessions)
      .where(and(...conditions))
      .orderBy(desc(aiChatSessions.updatedAt));
  }

  async getAiChatSession(id: string): Promise<AiChatSession | undefined> {
    const [session] = await db
      .select()
      .from(aiChatSessions)
      .where(eq(aiChatSessions.id, id));
    return session;
  }

  async createAiChatSession(session: InsertAiChatSession): Promise<AiChatSession> {
    const [created] = await db.insert(aiChatSessions).values(session).returning();
    return created;
  }

  async updateAiChatSession(id: string, updates: Partial<InsertAiChatSession>): Promise<AiChatSession> {
    const [updated] = await db
      .update(aiChatSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiChatSessions.id, id))
      .returning();
    return updated;
  }

  async deleteAiChatSession(id: string): Promise<void> {
    await db.delete(aiChatMessages).where(eq(aiChatMessages.sessionId, id));
    await db.delete(aiChatSessions).where(eq(aiChatSessions.id, id));
  }

  async getAiChatMessages(sessionId: string): Promise<AiChatMessage[]> {
    return db
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, sessionId))
      .orderBy(aiChatMessages.createdAt);
  }

  async createAiChatMessage(message: InsertAiChatMessage): Promise<AiChatMessage> {
    const [created] = await db.insert(aiChatMessages).values(message).returning();
    return created;
  }

  // ============================================================================
  // NEGOTIATION ACTION OPERATIONS
  // ============================================================================

  async createNegotiationAction(action: InsertNegotiationAction): Promise<NegotiationAction> {
    const [created] = await db.insert(negotiationActions).values(action).returning();
    return created;
  }

  async getNegotiationActionsByTender(tenderId: string): Promise<(NegotiationAction & { company: Company })[]> {
    const results = await db
      .select({
        action: negotiationActions,
        company: companies,
      })
      .from(negotiationActions)
      .innerJoin(companies, eq(negotiationActions.companyId, companies.id))
      .where(eq(negotiationActions.tenderId, tenderId))
      .orderBy(desc(negotiationActions.createdAt));

    return results.map(r => ({
      ...r.action,
      company: r.company,
    }));
  }

  async getNegotiationActionsByOffer(offerId: string): Promise<NegotiationAction[]> {
    return await db
      .select()
      .from(negotiationActions)
      .where(eq(negotiationActions.offerId, offerId))
      .orderBy(desc(negotiationActions.createdAt));
  }

  async getLatestNegotiationAction(tenderId: string, offerId: string, actionType: string): Promise<NegotiationAction | undefined> {
    const [action] = await db
      .select()
      .from(negotiationActions)
      .where(and(
        eq(negotiationActions.tenderId, tenderId),
        eq(negotiationActions.offerId, offerId),
        eq(negotiationActions.actionType, actionType),
      ))
      .orderBy(desc(negotiationActions.createdAt))
      .limit(1);
    return action;
  }

  async allowOfferResubmission(offerId: string): Promise<void> {
    await db
      .update(offers)
      .set({ resubmissionAllowed: true })
      .where(eq(offers.id, offerId));
  }

  // ── Tour Progress ────────────────────────────────────────────────────────────

  async getDismissedTours(userId: string): Promise<string[]> {
    const rows = await db
      .select({ tourId: tourProgress.tourId })
      .from(tourProgress)
      .where(eq(tourProgress.userId, userId));
    return rows.map(r => r.tourId);
  }

  async dismissTour(userId: string, tourId: string): Promise<void> {
    await db
      .insert(tourProgress)
      .values({ userId, tourId })
      .onConflictDoNothing();
  }

  async resetTourProgress(userId: string, tourId: string): Promise<void> {
    await db
      .delete(tourProgress)
      .where(and(eq(tourProgress.userId, userId), eq(tourProgress.tourId, tourId)));
  }

  // ============================================================================
  // MARKETPLACE OPERATIONS
  // ============================================================================

  async getMarketplaceTenders(options: {
    search?: string;
    category?: string;
    city?: string;
    tenderType?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tenders: (Tender & { company: Company; profile?: CompanyProfile })[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 6;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(tenders.isMarketplace, true),
      eq(tenders.marketplaceStatus, 'approved'),
      eq(tenders.status, 'published'),
      isNull(companies.deletedAt),
      gte(tenders.deadline, new Date().toISOString().split('T')[0]),
    ];

    if (options.search) {
      conditions.push(
        or(
          ilike(tenders.title, `%${options.search}%`),
          ilike(tenders.description, `%${options.search}%`),
          ilike(tenders.category, `%${options.search}%`),
          ilike(companies.name, `%${options.search}%`),
        )!
      );
    }
    if (options.category) {
      conditions.push(eq(tenders.category, options.category));
    }
    if (options.city) {
      conditions.push(eq(companies.city, options.city));
    }
    if (options.tenderType) {
      conditions.push(eq(tenders.tenderType, options.tenderType));
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: count() })
      .from(tenders)
      .innerJoin(companies, eq(tenders.companyId, companies.id))
      .where(whereClause);

    const orderByClause =
      options.sort === 'deadline_asc' ? asc(tenders.deadline) :
      options.sort === 'budget_desc' ? desc(tenders.budget) :
      desc(tenders.createdAt);

    const results = await db
      .select({
        tender: tenders,
        company: companies,
        profile: companyProfiles,
      })
      .from(tenders)
      .innerJoin(companies, eq(tenders.companyId, companies.id))
      .leftJoin(companyProfiles, eq(companies.id, companyProfiles.companyId))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return {
      tenders: results.map(r => ({
        ...r.tender,
        company: r.company,
        profile: r.profile || undefined,
      })),
      total: countResult?.count || 0,
    };
  }

  async getMarketplaceStats(): Promise<{ activeTenders: number; awardedTenders: number; totalOffers: number }> {
    const [activeResult] = await db
      .select({ count: count() })
      .from(tenders)
      .where(and(
        eq(tenders.isMarketplace, true),
        eq(tenders.marketplaceStatus, 'approved'),
        eq(tenders.status, 'published'),
        gte(tenders.deadline, new Date().toISOString().split('T')[0]),
      ));

    const [awardedResult] = await db
      .select({ count: count() })
      .from(tenders)
      .innerJoin(awards, eq(tenders.id, awards.tenderId))
      .where(and(
        eq(tenders.isMarketplace, true),
        eq(awards.status, 'awarded'),
      ));

    const [offersResult] = await db
      .select({ count: count() })
      .from(offers)
      .innerJoin(tenders, eq(offers.tenderId, tenders.id))
      .where(and(
        eq(tenders.isMarketplace, true),
        eq(tenders.marketplaceStatus, 'approved'),
      ));

    return {
      activeTenders: activeResult?.count || 0,
      awardedTenders: awardedResult?.count || 0,
      totalOffers: offersResult?.count || 0,
    };
  }

  async getPendingMarketplaceRequests(): Promise<(Tender & { company: Company; profile?: CompanyProfile })[]> {
    const results = await db
      .select({
        tender: tenders,
        company: companies,
        profile: companyProfiles,
      })
      .from(tenders)
      .innerJoin(companies, eq(tenders.companyId, companies.id))
      .leftJoin(companyProfiles, eq(companies.id, companyProfiles.companyId))
      .where(and(
        eq(tenders.isMarketplace, true),
        eq(tenders.marketplaceStatus, 'pending'),
      ))
      .orderBy(desc(tenders.createdAt));

    return results.map(r => ({
      ...r.tender,
      company: r.company,
      profile: r.profile || undefined,
    }));
  }

  async getApprovedMarketplaceTenders(): Promise<(Tender & { company: Company; profile?: CompanyProfile })[]> {
    const results = await db
      .select({
        tender: tenders,
        company: companies,
        profile: companyProfiles,
      })
      .from(tenders)
      .innerJoin(companies, eq(tenders.companyId, companies.id))
      .leftJoin(companyProfiles, eq(companies.id, companyProfiles.companyId))
      .where(and(
        eq(tenders.isMarketplace, true),
        eq(tenders.marketplaceStatus, 'approved'),
      ))
      .orderBy(desc(tenders.createdAt));

    return results.map(r => ({
      ...r.tender,
      company: r.company,
      profile: r.profile || undefined,
    }));
  }

  async approveMarketplaceTender(tenderId: string, adminId: string): Promise<void> {
    const [before] = await db.select().from(tenders).where(eq(tenders.id, tenderId));

    await db
      .update(tenders)
      .set({
        marketplaceStatus: 'approved',
        marketplaceApprovedBy: adminId,
        marketplaceApprovedAt: new Date(),
        status: 'published',
        updatedAt: new Date(),
      })
      .where(eq(tenders.id, tenderId));

    const [after] = await db.select().from(tenders).where(eq(tenders.id, tenderId));

    await this.logAuditAction({
      adminId,
      action: 'marketplace_tender_approved',
      targetType: 'tender',
      targetId: tenderId,
      beforeState: JSON.stringify(before),
      afterState: JSON.stringify(after),
    });

    await this.logProductEvent({
      eventType: 'marketplace_tender_approved',
      companyId: before?.companyId || undefined,
      metadata: { tenderId, approvedBy: adminId },
    });
  }

  async rejectMarketplaceTender(tenderId: string, reason: string, adminId: string): Promise<void> {
    const [before] = await db.select().from(tenders).where(eq(tenders.id, tenderId));

    await db
      .update(tenders)
      .set({
        marketplaceStatus: 'rejected',
        marketplaceRejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(tenders.id, tenderId));

    const [after] = await db.select().from(tenders).where(eq(tenders.id, tenderId));

    await this.logAuditAction({
      adminId,
      action: 'marketplace_tender_rejected',
      targetType: 'tender',
      targetId: tenderId,
      beforeState: JSON.stringify(before),
      afterState: JSON.stringify(after),
      notes: reason,
    });
  }

  // ============================================================================
  // PURCHASE ORDER OPERATIONS
  // ============================================================================

  async createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [created] = await db.insert(purchaseOrders).values(po).returning();
    return created;
  }

  async getPurchaseOrdersByTender(tenderId: string): Promise<PurchaseOrder[]> {
    return await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.tenderId, tenderId))
      .orderBy(desc(purchaseOrders.createdAt));
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));
    return po;
  }

  async updatePurchaseOrder(id: string, updates: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder> {
    const [updated] = await db
      .update(purchaseOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning();
    return updated;
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  }
}

export const storage = new DatabaseStorage();
