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
  membershipRequests,
  invitationLinks,
  awards,
  productEvents,
  auditLog,
  tenderTemplates,
  memberActivityLog,
  type MemberActivityLog,
  type InsertMemberActivityLog,
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
  type InsertInvitationLink,
  type VendorBase,
  type InsertVendorBase,
  type JoinRequest,
  type InsertJoinRequest,
  type MembershipRequest,
  type InsertMembershipRequest,
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
  notificationPreferences,
  type NotificationPreference,
  type InsertNotificationPreference,
  adminNotifications,
  type AdminNotification,
  type InsertAdminNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc, ilike, or, isNull, sql, gte, gt, count, ne, lt, notInArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

// One funnel group (companies or freelancers). Numbers are workspace counts.
export interface VerificationFunnel {
  total: number;              // workspaces of this type
  uploadedDocs: number;       // have uploaded at least one verification document
  awaitingReview: number;     // uploaded / submitted but not yet verified (under_review)
  verified: number;           // verified by admin
  rejected: number;           // reviewed and rejected
  noDocs: number;             // no documents uploaded at all
}

export interface UserVerificationAnalytics {
  totalUsers: number;
  totalWorkspaces: number;
  companies: VerificationFunnel;
  freelancers: VerificationFunnel;
  // How many workspaces have each specific document type on file.
  documentTypes: {
    crCertificate: number;
    vatCertificate: number;
    gosiCertificate: number;
    nationalAddressCertificate: number;
    other: number;
  };
}

export interface TenderOverviewRow {
  id: string;
  title: string;
  status: string;
  isMarketplace: boolean;
  marketplaceStatus: string | null;
  createdAt: Date;
  companyId: string | null;
  companyName: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  offerCount: number;
}

export interface TendersOverview {
  summary: {
    total: number;
    published: number;
    draft: number;
    closed: number;
    cancelled: number;
    marketplace: number;
    totalOffers: number;
  };
  tenders: TenderOverviewRow[];
}

export interface IStorage {
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  getCompanyByEmailDomain(domain: string): Promise<(Company) | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;

  // ============================================================================
  // COMPANY OPERATIONS
  // ============================================================================
  createCompany(company: InsertCompany): Promise<Company>;
  getCompany(id: string): Promise<Company | undefined>;
  getCompanyBySlug(slug: string): Promise<Company | undefined>;
  getCompanyByJoinCode(code: string): Promise<Company | undefined>;
  getCompanyByCrNumber(crNumber: string): Promise<Company | undefined>;
  updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company>;
  getCompaniesWithPendingVerification(): Promise<(Company & { profile?: CompanyProfile; documents?: CompanyDocument[]; owner?: { id: string; name: string; email: string } })[]>;
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
  resetUserWorkspaceMemberships(userId: string): Promise<void>;
  getUserRoleInCompany(userId: string, companyId: string): Promise<string | null>;
  logMemberActivity(entry: InsertMemberActivityLog): Promise<void>;
  getMemberActivity(companyId: string, actorUserId: string, opts: { limit: number; before?: Date }): Promise<MemberActivityLog[]>;

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
  getPendingTeamInvitationsForEmail(email: string): Promise<(TeamInvitation & { company: Company; inviter: User })[]>;
  searchCompaniesByName(query: string, limit?: number): Promise<{ id: string; name: string; slug: string; memberCount: number }[]>;

  // ============================================================================
  // TENDER OPERATIONS
  // ============================================================================
  createTender(tender: InsertTender): Promise<Tender>;
  getTender(id: string): Promise<Tender | undefined>;
  getTenderByVoiceNoteUrl(voiceNoteUrl: string): Promise<Tender | null>;
  getTenderByAttachmentUrl(attachmentUrl: string): Promise<Tender | null>;
  getTenderByMediaUrl(mediaUrl: string): Promise<Tender | null>;
  isCompanyBrandAsset(fileUrl: string): Promise<boolean>;
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
  hasAppliedToRequester(applicantCompanyId: string, requesterCompanyId: string): Promise<boolean>;
  getOfferByTenderAndCompany(tenderId: string, companyId: string): Promise<Offer | null>;
  getOfferByFileUrl(fileUrl: string): Promise<Offer | null>;
  getCompanyDocumentByFileUrl(fileUrl: string): Promise<CompanyDocument | null>;
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
  getInvitationsByCompany(companyId: string): Promise<(Invitation & { tender: Tender; requester: Company })[]>;

  // Invitations sent to a bare email address — someone with no Bid account yet.
  // `invitations` can only reference a workspace that already exists, so it
  // cannot express "I invited someone@example.com". These links can, and they
  // stay valid for exactly as long as the tender is open (no separate expiry).
  createInvitationLink(link: InsertInvitationLink): Promise<InvitationLink>;
  getInvitationLinkByToken(token: string): Promise<InvitationLink | undefined>;
  getInvitationLinkByTenderAndEmail(tenderId: string, email: string): Promise<InvitationLink | undefined>;
  getInvitationLinksByTender(tenderId: string): Promise<InvitationLink[]>;
  markInvitationLinkAccepted(token: string): Promise<void>;
  deleteInvitationLink(id: string): Promise<void>;

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
  // MEMBERSHIP REQUEST OPERATIONS — user → workspace join requests
  // (distinct from JOIN REQUEST OPERATIONS above which is buyer ↔ vendor base)
  // ============================================================================
  createMembershipRequest(req: InsertMembershipRequest): Promise<MembershipRequest>;
  getMembershipRequestById(id: string): Promise<MembershipRequest | undefined>;
  getPendingMembershipRequest(companyId: string, requesterUserId: string): Promise<MembershipRequest | undefined>;
  countOutstandingMembershipRequestsByUser(requesterUserId: string): Promise<number>;
  listMembershipRequestsByCompany(companyId: string, status?: string): Promise<(MembershipRequest & { requester: { id: string; name: string; email: string } })[]>;
  listMembershipRequestsByUser(requesterUserId: string, status?: string): Promise<(MembershipRequest & { company: { id: string; name: string; slug: string } })[]>;
  decideMembershipRequest(id: string, decision: 'approved' | 'rejected', decidedBy: string, reason?: string): Promise<MembershipRequest>;
  // Find companies that have at least one member with the given email domain.
  findCompaniesByMemberDomain(domain: string, limit?: number): Promise<{ id: string; name: string; slug: string; memberCount: number }[]>;

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
    isVerified: boolean;
    hasCompletedProfile: boolean;
    hasVendors: boolean;
    hasTender: boolean;
    hasReviewedProposal: boolean;
    hasExploredMarketplace: boolean;
    completedCount: number;
  }>;
  hasUserExploredMarketplace(userId: string): Promise<boolean>;

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================
  makeUserAdmin(userId: string, adminId: string): Promise<User>;
  searchUsers(query: string): Promise<{ id: string; name: string; email: string; username: string; isAdmin: boolean; createdAt: Date }[]>;
  getAllCompaniesAdmin(status?: string): Promise<(Company & { profile?: CompanyProfile; owner?: { id: string; name: string; email: string }; documentCount: number })[]>;
  getAdminUsers(): Promise<User[]>;
  getAllJoinRequests(status?: string): Promise<(JoinRequest & { vendorCompany?: Company; requesterCompany?: Company })[]>;
  approveJoinRequestByAdmin(joinRequestId: string, adminId: string): Promise<void>;
  rejectJoinRequestByAdmin(joinRequestId: string, reason: string, adminId: string): Promise<void>;
  getAuditLogs(limit?: number): Promise<(AuditLog & { admin: User })[]>;
  logAuditAction(auditEntry: InsertAuditLog): Promise<AuditLog>;
  getFreelancersWithPendingVerification(): Promise<(Company & { owner?: { id: string; name: string; email: string } })[]>;
  getAdminMetrics(): Promise<{
    pendingVerifications: number;
    pendingFreelancers: number;
    pendingJoinRequests: number;
    proposalsLast24h: number;
    blockedAwards: number;
    pendingMarketplace: number;
    totalCompanies: number;
    verifiedCompanies: number;
    totalTenders: number;
    totalProposals: number;
    unreadNotifications: number;
  }>;
  getUserVerificationAnalytics(): Promise<UserVerificationAnalytics>;
  getTendersOverview(limit?: number): Promise<TendersOverview>;

  // ============================================================================
  // ADMIN NOTIFICATION OPERATIONS
  // ============================================================================
  createAdminNotification(n: InsertAdminNotification): Promise<AdminNotification>;
  getAdminNotifications(opts?: { limit?: number; unreadOnly?: boolean }): Promise<AdminNotification[]>;
  getUnreadAdminNotificationCount(): Promise<number>;
  markAdminNotificationRead(id: string, userId: string): Promise<void>;
  markAllAdminNotificationsRead(userId: string): Promise<void>;

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
  // NOTIFICATION PREFERENCES
  // ============================================================================
  getNotificationPreferences(userId: string, companyId: string): Promise<NotificationPreference[]>;
  setNotificationPreference(
    userId: string,
    companyId: string,
    category: string,
    channel: string,
    enabled: boolean,
  ): Promise<NotificationPreference>;
  filterRecipientsByPreference<R extends { userId: string }>(
    recipients: R[],
    companyId: string,
    category: string,
    channel: string,
  ): Promise<R[]>;

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
    callerAccountType?: string;
    audienceType?: string;
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

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
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

  async getCompanyByJoinCode(code: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.joinCode, code), isNull(companies.deletedAt)));
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

  async getCompaniesWithPendingVerification(): Promise<(Company & { profile?: CompanyProfile; documents?: CompanyDocument[]; owner?: { id: string; name: string; email: string } })[]> {
    const results = await db
      .select({
        company: companies,
        profile: companyProfiles,
      })
      .from(companies)
      .leftJoin(companyProfiles, eq(companies.id, companyProfiles.companyId))
      .where(and(
        eq(companies.verificationStatus, 'under_review'),
        eq(companies.accountType, 'company'),
        isNull(companies.deletedAt)
      ))
      .orderBy(desc(companies.createdAt));

    // Enrich each company with documents and owner info
    const enriched = await Promise.all(results.map(async (r) => {
      // Fetch documents
      const docs = await db.select().from(companyDocuments).where(eq(companyDocuments.companyId, r.company.id));

      // Fetch owner (first user with 'owner' role)
      const ownerResults = await db
        .select({ user: users })
        .from(userCompanies)
        .innerJoin(users, eq(userCompanies.userId, users.id))
        .where(and(
          eq(userCompanies.companyId, r.company.id),
          eq(userCompanies.roleInCompany, 'owner')
        ))
        .limit(1);

      const ownerUser = ownerResults[0]?.user;

      return {
        ...r.company,
        profile: r.profile || undefined,
        documents: docs,
        owner: ownerUser ? { id: ownerUser.id, name: ownerUser.name, email: ownerUser.email } : undefined,
      };
    }));

    // documents jsonb column on Company conflicts with the enriched CompanyDocument[] array;
    // cast here since both shapes are intentionally present on the return type.
    return enriched as (Company & { profile?: CompanyProfile; documents?: CompanyDocument[]; owner?: { id: string; name: string; email: string } })[];
  }

  async getFreelancersWithPendingVerification(): Promise<(Company & { owner?: { id: string; name: string; email: string } })[]> {
    const results = await db
      .select({ company: companies })
      .from(companies)
      .where(and(
        eq(companies.verificationStatus, 'under_review'),
        eq(companies.accountType, 'individual'),
        isNull(companies.deletedAt)
      ))
      .orderBy(desc(companies.createdAt));

    const enriched = await Promise.all(results.map(async (r) => {
      const ownerResults = await db
        .select({ user: users })
        .from(userCompanies)
        .innerJoin(users, eq(userCompanies.userId, users.id))
        .where(and(
          eq(userCompanies.companyId, r.company.id),
          eq(userCompanies.roleInCompany, 'owner')
        ))
        .limit(1);

      const ownerUser = ownerResults[0]?.user;
      return {
        ...r.company,
        owner: ownerUser ? { id: ownerUser.id, name: ownerUser.name, email: ownerUser.email } : undefined,
      };
    }));

    return enriched as (Company & { owner?: { id: string; name: string; email: string } })[];
  }

  async searchUsers(query: string): Promise<{ id: string; name: string; email: string; username: string; isAdmin: boolean; createdAt: Date }[]> {
    let results;
    if (query) {
      results = await db
        .select({ id: users.id, name: users.name, email: users.email, username: users.username, isAdmin: users.isAdmin, createdAt: users.createdAt })
        .from(users)
        .where(or(
          ilike(users.name, `%${query}%`),
          ilike(users.email, `%${query}%`),
          ilike(users.username, `%${query}%`)
        ))
        .orderBy(desc(users.createdAt))
        .limit(50);
    } else {
      results = await db
        .select({ id: users.id, name: users.name, email: users.email, username: users.username, isAdmin: users.isAdmin, createdAt: users.createdAt })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(50);
    }
    return results;
  }

  async getAllCompaniesAdmin(status?: string): Promise<(Company & { profile?: CompanyProfile; owner?: { id: string; name: string; email: string }; documentCount: number })[]> {
    let whereClause = isNull(companies.deletedAt);
    if (status && status !== 'all') {
      whereClause = and(whereClause, eq(companies.verificationStatus, status))!;
    }

    const results = await db
      .select({ company: companies, profile: companyProfiles })
      .from(companies)
      .leftJoin(companyProfiles, eq(companies.id, companyProfiles.companyId))
      .where(whereClause)
      .orderBy(desc(companies.createdAt))
      .limit(200);

    const enriched = await Promise.all(results.map(async (r) => {
      const docCount = await db.select({ cnt: count() }).from(companyDocuments).where(eq(companyDocuments.companyId, r.company.id));
      const ownerResults = await db
        .select({ user: users })
        .from(userCompanies)
        .innerJoin(users, eq(userCompanies.userId, users.id))
        .where(and(eq(userCompanies.companyId, r.company.id), eq(userCompanies.roleInCompany, 'owner')))
        .limit(1);
      const ownerUser = ownerResults[0]?.user;
      return {
        ...r.company,
        profile: r.profile || undefined,
        owner: ownerUser ? { id: ownerUser.id, name: ownerUser.name, email: ownerUser.email } : undefined,
        documentCount: docCount[0]?.cnt || 0,
      };
    }));
    return enriched;
  }

  async getAdminUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.isAdmin, true));
  }

  async verifyCompany(companyId: string, adminId: string, notes?: string): Promise<void> {
    const [before] = await db.select().from(companies).where(eq(companies.id, companyId));
    
    await db
      .update(companies)
      .set({
        verificationStatus: 'verified',
        verifiedAt: new Date(),
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

  async resetUserWorkspaceMemberships(userId: string): Promise<void> {
    await db
      .update(userCompanies)
      .set({ deletedAt: new Date() })
      .where(and(eq(userCompanies.userId, userId), isNull(userCompanies.deletedAt)));
  }

  async logMemberActivity(entry: InsertMemberActivityLog): Promise<void> {
    try {
      await db.insert(memberActivityLog).values(entry);
    } catch (err) {
      console.error("Failed to log member activity", err);
    }
  }

  async getMemberActivity(
    companyId: string,
    actorUserId: string,
    opts: { limit: number; before?: Date }
  ): Promise<MemberActivityLog[]> {
    const conditions = [
      eq(memberActivityLog.companyId, companyId),
      eq(memberActivityLog.actorUserId, actorUserId),
    ];
    if (opts.before) conditions.push(lt(memberActivityLog.createdAt, opts.before));
    return db
      .select()
      .from(memberActivityLog)
      .where(and(...conditions))
      .orderBy(desc(memberActivityLog.createdAt))
      .limit(opts.limit);
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

  // All pending, non-expired invitations sent to a given email — used on the
  // onboarding "Join a Company" step to surface invites a company sent before
  // the user had even signed up.
  async getPendingTeamInvitationsForEmail(email: string): Promise<(TeamInvitation & { company: Company; inviter: User })[]> {
    const results = await db
      .select({
        invitation: teamInvitations,
        company: companies,
        inviter: users,
      })
      .from(teamInvitations)
      .innerJoin(companies, eq(teamInvitations.companyId, companies.id))
      .innerJoin(users, eq(teamInvitations.invitedBy, users.id))
      .where(and(
        ilike(teamInvitations.email, email),
        eq(teamInvitations.status, 'pending'),
        gt(teamInvitations.expiresAt, new Date()),
        isNull(companies.deletedAt),
      ))
      .orderBy(desc(teamInvitations.createdAt));

    return results.map(r => ({
      ...r.invitation,
      company: r.company,
      inviter: r.inviter,
    }));
  }

  // Free-text company search for the "request to join any company" flow.
  // Restricted to real companies (not team/individual workspaces).
  async searchCompaniesByName(query: string, limit: number = 8): Promise<{ id: string; name: string; slug: string; memberCount: number }[]> {
    const safe = query.trim().replace(/[%_]/g, '');
    if (safe.length < 2) return [];
    const results = await db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        memberCount: count(userCompanies.id),
      })
      .from(companies)
      .leftJoin(userCompanies, and(
        eq(userCompanies.companyId, companies.id),
        isNull(userCompanies.deletedAt),
      ))
      .where(and(
        ilike(companies.name, `%${safe}%`),
        eq(companies.accountType, 'company'),
        isNull(companies.deletedAt),
      ))
      .groupBy(companies.id, companies.name, companies.slug)
      .orderBy(desc(count(userCompanies.id)))
      .limit(limit);

    return results.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      memberCount: Number(r.memberCount),
    }));
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
    if (!tender) return undefined;

    // Auto-close if published and deadline has passed
    const now = new Date().toISOString().split('T')[0];
    if (tender.status === 'published' && tender.deadline && tender.deadline < now) {
      await db.update(tenders).set({ status: 'closed', updatedAt: new Date() }).where(eq(tenders.id, id));
      tender.status = 'closed';
    }

    return tender;
  }

  async getTenderByVoiceNoteUrl(voiceNoteUrl: string): Promise<Tender | null> {
    const [tender] = await db
      .select()
      .from(tenders)
      .where(eq(tenders.voiceNoteUrl, voiceNoteUrl))
      .limit(1);
    return tender || null;
  }

  /** A tender's own media (voice note or video), whichever field it lives in. */
  async getTenderByMediaUrl(mediaUrl: string): Promise<Tender | null> {
    const [tender] = await db
      .select()
      .from(tenders)
      .where(or(eq(tenders.voiceNoteUrl, mediaUrl), eq(tenders.videoUrl, mediaUrl)))
      .limit(1);
    return tender || null;
  }

  /**
   * True when the file is a company's public-facing brand asset — logo, header
   * or brochure. These are shown on the company profile to anyone who can see
   * the profile, so they must not be restricted to whoever happened to upload
   * them. Most live in the public bucket, but some were uploaded through the
   * generic private-upload flow and sit under uploads/.
   */
  async isCompanyBrandAsset(fileUrl: string): Promise<boolean> {
    const [row] = await db
      .select({ id: companyProfiles.id })
      .from(companyProfiles)
      .where(
        or(
          eq(companyProfiles.logoUrl, fileUrl),
          eq(companyProfiles.logoOriginalUrl, fileUrl),
          eq(companyProfiles.headerUrl, fileUrl),
          eq(companyProfiles.headerOriginalUrl, fileUrl),
          eq(companyProfiles.brochureUrl, fileUrl),
          eq(companyProfiles.introVideoUrl, fileUrl),
        ),
      )
      .limit(1);
    return !!row;
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
    const results = await db
      .select()
      .from(tenders)
      .where(eq(tenders.companyId, companyId))
      .orderBy(desc(tenders.createdAt));

    // Auto-close published tenders whose deadline has passed
    const now = new Date().toISOString().split('T')[0];
    const expiredIds = results
      .filter(t => t.status === 'published' && t.deadline && t.deadline < now)
      .map(t => t.id);

    if (expiredIds.length > 0) {
      await Promise.all(
        expiredIds.map(id =>
          db.update(tenders).set({ status: 'closed', updatedAt: new Date() }).where(eq(tenders.id, id))
        )
      );
      // Update the results in-memory to reflect the change
      for (const r of results) {
        if (expiredIds.includes(r.id)) {
          r.status = 'closed';
        }
      }
    }

    return results;
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

  // Has `applicantCompanyId` submitted any offer to a tender owned by
  // `requesterCompanyId`? Used to gate WhatsApp visibility on individual
  // profiles (a requester can see the number of an individual who applied to
  // one of their tenders).
  async hasAppliedToRequester(applicantCompanyId: string, requesterCompanyId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: offers.id })
      .from(offers)
      .innerJoin(tenders, eq(offers.tenderId, tenders.id))
      .where(and(
        eq(offers.companyId, applicantCompanyId),
        eq(tenders.companyId, requesterCompanyId),
      ))
      .limit(1);
    return !!row;
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

  async getCompanyDocumentByFileUrl(fileUrl: string): Promise<CompanyDocument | null> {
    const [doc] = await db
      .select()
      .from(companyDocuments)
      .where(eq(companyDocuments.fileUrl, fileUrl))
      .limit(1);

    return doc || null;
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

  // Tenders a given workspace has been invited to (the "Invited" list). Joins in
  // the tender and the requesting company so the invitee can see who invited them.
  async getInvitationsByCompany(companyId: string): Promise<(Invitation & { tender: Tender; requester: Company })[]> {
    const results = await db
      .select({ invitation: invitations, tender: tenders, requester: companies })
      .from(invitations)
      .innerJoin(tenders, eq(invitations.tenderId, tenders.id))
      .innerJoin(companies, eq(tenders.companyId, companies.id))
      .where(and(
        eq(invitations.companyId, companyId),
        isNull(companies.deletedAt),
      ))
      .orderBy(desc(invitations.invitedAt));

    return results.map(r => ({ ...r.invitation, tender: r.tender, requester: r.requester }));
  }

  async createInvitationLink(link: InsertInvitationLink): Promise<InvitationLink> {
    const [created] = await db.insert(invitationLinks).values(link).returning();
    return created;
  }

  async getInvitationLinkByToken(token: string): Promise<InvitationLink | undefined> {
    const [link] = await db.select().from(invitationLinks).where(eq(invitationLinks.token, token));
    return link;
  }

  // Emails are stored lowercased on the way in, so this compares like for like.
  async getInvitationLinkByTenderAndEmail(tenderId: string, email: string): Promise<InvitationLink | undefined> {
    const [link] = await db
      .select()
      .from(invitationLinks)
      .where(and(
        eq(invitationLinks.tenderId, tenderId),
        eq(invitationLinks.vendorEmail, email.trim().toLowerCase()),
      ));
    return link;
  }

  async getInvitationLinksByTender(tenderId: string): Promise<InvitationLink[]> {
    return await db
      .select()
      .from(invitationLinks)
      .where(eq(invitationLinks.tenderId, tenderId))
      .orderBy(desc(invitationLinks.createdAt));
  }

  // First open wins; re-opening the link must not move acceptedAt forward.
  async markInvitationLinkAccepted(token: string): Promise<void> {
    await db
      .update(invitationLinks)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(and(
        eq(invitationLinks.token, token),
        eq(invitationLinks.status, 'pending'),
      ));
  }

  // Used when the invitation email could not be delivered. The row is only
  // meaningful as the record of an email that went out, and leaving it behind
  // would block the requester from ever retrying that address.
  async deleteInvitationLink(id: string): Promise<void> {
    await db.delete(invitationLinks).where(eq(invitationLinks.id, id));
  }

  // ============================================================================
  // VENDORS BASE OPERATIONS
  // ============================================================================

  async addVendorToBase(insertVendorBase: InsertVendorBase): Promise<VendorBase> {
    const [vendorBase] = await db.insert(vendorsBase).values(insertVendorBase).returning();
    return vendorBase;
  }

  async getVendorsInBase(requesterCompanyId: string, searchQuery?: string): Promise<(VendorBase & { vendorCompany: Company; profile?: CompanyProfile })[]> {
    const whereClause = searchQuery
      ? and(
          eq(vendorsBase.requesterCompanyId, requesterCompanyId),
          isNull(companies.deletedAt),
          or(
            ilike(companies.name, `%${searchQuery}%`),
            ilike(companyProfiles.displayName, `%${searchQuery}%`)
          )
        )
      : and(
          eq(vendorsBase.requesterCompanyId, requesterCompanyId),
          isNull(companies.deletedAt)
        );

    const results = await db
      .select({
        vendorBase: vendorsBase,
        vendorCompany: companies,
        profile: companyProfiles
      })
      .from(vendorsBase)
      .innerJoin(companies, eq(vendorsBase.vendorCompanyId, companies.id))
      .leftJoin(companyProfiles, eq(companies.id, companyProfiles.companyId))
      .where(whereClause)
      .orderBy(desc(vendorsBase.addedAt));

    return results.map(r => ({
      ...r.vendorBase,
      vendorCompany: r.vendorCompany,
      profile: r.profile || undefined
    }));
  }

  // Directory search over individual accounts (the company-facing "Find
  // Individuals" tab). Returns completed individual profiles matching the
  // optional filters; the route annotates each with whether it's already in
  // the caller's vendors base.
  // searchIndividuals / getSuggestedIndividualsForTender /
  // getIndividualsNearingInactivityCutoff lived here. All three existed only
  // to serve individual Discovery, which has been removed. See Q-022/Q-024.


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

  async removeVendorFromBase(requesterCompanyId: string, rowId: string): Promise<void> {
    console.log('[removeVendorFromBase] rowId:', rowId, 'requesterCompanyId:', requesterCompanyId);
    const result = await db.delete(vendorsBase).where(
      and(
        eq(vendorsBase.id, rowId),
        eq(vendorsBase.requesterCompanyId, requesterCompanyId)
      )
    ).returning();
    console.log('[removeVendorFromBase] rows deleted:', result.length, result);
  }

  // ============================================================================
  // JOIN REQUEST OPERATIONS
  // ============================================================================

  async createJoinRequest(insertJoinRequest: InsertJoinRequest): Promise<JoinRequest> {
    const [joinRequest] = await db.insert(joinRequests).values(insertJoinRequest).returning();
    return joinRequest;
  }

  async getJoinRequestsByRequester(requesterCompanyId: string, status?: string): Promise<(JoinRequest & { vendorCompany: Company; profile?: CompanyProfile })[]> {
    const whereClause = status
      ? and(
          eq(joinRequests.requesterCompanyId, requesterCompanyId),
          eq(joinRequests.status, status)
        )
      : eq(joinRequests.requesterCompanyId, requesterCompanyId);

    const results = await db
      .select({
        joinRequest: joinRequests,
        vendorCompany: companies,
        profile: companyProfiles
      })
      .from(joinRequests)
      .innerJoin(companies, eq(joinRequests.vendorCompanyId, companies.id))
      .leftJoin(companyProfiles, eq(companies.id, companyProfiles.companyId))
      .where(whereClause)
      .orderBy(desc(joinRequests.createdAt));

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
  // MEMBERSHIP REQUEST OPERATIONS
  // ============================================================================

  async createMembershipRequest(req: InsertMembershipRequest): Promise<MembershipRequest> {
    const [created] = await db.insert(membershipRequests).values(req).returning();
    return created;
  }

  async getMembershipRequestById(id: string): Promise<MembershipRequest | undefined> {
    const [row] = await db.select().from(membershipRequests).where(eq(membershipRequests.id, id));
    return row || undefined;
  }

  async getPendingMembershipRequest(companyId: string, requesterUserId: string): Promise<MembershipRequest | undefined> {
    const [row] = await db
      .select()
      .from(membershipRequests)
      .where(and(
        eq(membershipRequests.companyId, companyId),
        eq(membershipRequests.requesterUserId, requesterUserId),
        eq(membershipRequests.status, 'pending'),
      ))
      .limit(1);
    return row || undefined;
  }

  async countOutstandingMembershipRequestsByUser(requesterUserId: string): Promise<number> {
    const rows = await db
      .select()
      .from(membershipRequests)
      .where(and(
        eq(membershipRequests.requesterUserId, requesterUserId),
        eq(membershipRequests.status, 'pending'),
      ));
    return rows.length;
  }

  async listMembershipRequestsByCompany(companyId: string, status?: string): Promise<(MembershipRequest & { requester: { id: string; name: string; email: string } })[]> {
    const whereClause = status
      ? and(eq(membershipRequests.companyId, companyId), eq(membershipRequests.status, status))
      : eq(membershipRequests.companyId, companyId);

    const results = await db
      .select({
        request: membershipRequests,
        requester: { id: users.id, name: users.name, email: users.email },
      })
      .from(membershipRequests)
      .innerJoin(users, eq(membershipRequests.requesterUserId, users.id))
      .where(whereClause)
      .orderBy(desc(membershipRequests.createdAt));

    return results.map(r => ({ ...r.request, requester: r.requester }));
  }

  async listMembershipRequestsByUser(requesterUserId: string, status?: string): Promise<(MembershipRequest & { company: { id: string; name: string; slug: string } })[]> {
    const whereClause = status
      ? and(eq(membershipRequests.requesterUserId, requesterUserId), eq(membershipRequests.status, status))
      : eq(membershipRequests.requesterUserId, requesterUserId);

    const results = await db
      .select({
        request: membershipRequests,
        company: { id: companies.id, name: companies.name, slug: companies.slug },
      })
      .from(membershipRequests)
      .innerJoin(companies, eq(membershipRequests.companyId, companies.id))
      .where(whereClause)
      .orderBy(desc(membershipRequests.createdAt));

    return results.map(r => ({ ...r.request, company: r.company }));
  }

  async decideMembershipRequest(id: string, decision: 'approved' | 'rejected', decidedBy: string, reason?: string): Promise<MembershipRequest> {
    const [updated] = await db
      .update(membershipRequests)
      .set({
        status: decision,
        decidedBy,
        decidedAt: new Date(),
        decisionReason: reason ?? null,
      })
      .where(eq(membershipRequests.id, id))
      .returning();
    return updated;
  }

  async findCompaniesByMemberDomain(domain: string, limit: number = 5): Promise<{ id: string; name: string; slug: string; memberCount: number }[]> {
    const safe = domain.toLowerCase().replace(/[%_]/g, '');
    if (!safe) return [];
    const results = await db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        memberCount: count(userCompanies.id),
      })
      .from(companies)
      .innerJoin(userCompanies, eq(userCompanies.companyId, companies.id))
      .innerJoin(users, eq(userCompanies.userId, users.id))
      .where(and(
        ilike(users.email, `%@${safe}`),
        // An individual workspace is one freelancer — they *are* the vendor.
        // Join-by-code refuses them (routes.ts) and searchCompaniesByName
        // excludes them; this was the third door and the only one left open,
        // so a stranger could ask to join someone's personal workspace. (Q-058)
        ne(companies.accountType, 'individual'),
        isNull(companies.deletedAt),
        isNull(userCompanies.deletedAt),
      ))
      .groupBy(companies.id, companies.name, companies.slug)
      .orderBy(desc(count(userCompanies.id)))
      .limit(limit);

    return results.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      memberCount: Number(r.memberCount),
    }));
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
    isVerified: boolean;
    hasCompletedProfile: boolean;
    hasVendors: boolean;
    hasTender: boolean;
    hasReviewedProposal: boolean;
    hasExploredMarketplace: boolean;
    completedCount: number;
  }> {
    // Task 1: Check if company is verified
    const company = await this.getCompany(companyId);
    const isVerified = company?.verificationStatus === 'verified';

    // Task 2: Check if company profile is completed
    const hasCompletedProfile = company?.onboardingState === 'completed';

    // Task 3: Check if company has vendors in their base
    const vendorsList = await db.select().from(vendorsBase).where(eq(vendorsBase.requesterCompanyId, companyId)).limit(1);
    const hasVendors = vendorsList.length > 0;

    // Task 4: Check if company has any tenders/RFPs
    const companyTenders = await db.select().from(tenders).where(eq(tenders.companyId, companyId)).limit(1);
    const hasTender = companyTenders.length > 0;

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

    // Task 6: Check if user has explored the marketplace
    const hasExploredMarketplace = await this.hasUserExploredMarketplace(userId);

    const completedCount = [
      isVerified,
      hasCompletedProfile,
      hasVendors,
      hasTender,
      hasReviewedProposal,
      hasExploredMarketplace,
    ].filter(Boolean).length;

    return {
      isVerified,
      hasCompletedProfile,
      hasVendors,
      hasTender,
      hasReviewedProposal,
      hasExploredMarketplace,
      completedCount,
    };
  }

  async hasUserExploredMarketplace(userId: string): Promise<boolean> {
    const results = await db
      .select()
      .from(productEvents)
      .where(and(
        eq(productEvents.eventType, 'marketplace_explored'),
        eq(productEvents.userId, userId)
      ))
      .limit(1);
    return results.length > 0;
  }

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================

  async makeUserAdmin(userId: string, adminId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.id, userId))
      .returning();
    await this.logAuditAction({
      adminId,
      action: 'user_promoted_to_admin',
      targetType: 'user',
      targetId: userId,
      beforeState: JSON.stringify({ isAdmin: false }),
      afterState: JSON.stringify({ isAdmin: true }),
      notes: null,
    });
    return user;
  }

  async getAllJoinRequests(status?: string): Promise<(JoinRequest & { vendorCompany?: Company; requesterCompany?: Company })[]> {
    // Self-join on companies: one row is the vendor being added, the other is
    // the company doing the adding. This used to select the bare alias as
    // `sql<Company>`requester_companies``, which type-checks but returns
    // nothing usable — the admin screen showed "Requested by: N/A" for every
    // row. Nobody noticed because the page was never routed. drizzle's alias()
    // selects real columns.
    const requesterCompanies = alias(companies, "requester_companies");

    let query = db
      .select({
        joinRequest: joinRequests,
        vendorCompany: companies,
        requesterCompany: requesterCompanies,
      })
      .from(joinRequests)
      .leftJoin(companies, eq(joinRequests.vendorCompanyId, companies.id))
      .leftJoin(requesterCompanies, eq(joinRequests.requesterCompanyId, requesterCompanies.id))
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
    pendingFreelancers: number;
    pendingJoinRequests: number;
    proposalsLast24h: number;
    blockedAwards: number;
    pendingMarketplace: number;
    totalCompanies: number;
    verifiedCompanies: number;
    totalTenders: number;
    totalProposals: number;
    unreadNotifications: number;
  }> {
    // Pending company verifications (excludes individual accounts)
    const pendingVerifications = await db
      .select()
      .from(companies)
      .where(and(
        eq(companies.verificationStatus, 'under_review'),
        eq(companies.accountType, 'company'),
        isNull(companies.deletedAt)
      ));

    // Pending freelancer (individual) verifications
    const pendingFreelancersRows = await db
      .select()
      .from(companies)
      .where(and(
        eq(companies.verificationStatus, 'under_review'),
        eq(companies.accountType, 'individual'),
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

    // Total & verified companies
    const allCompanies = await db.select({ cnt: count() }).from(companies).where(isNull(companies.deletedAt));
    const verifiedCompanies = await db.select({ cnt: count() }).from(companies).where(and(eq(companies.verificationStatus, 'verified'), isNull(companies.deletedAt)));

    // Total tenders
    const allTenders = await db.select({ cnt: count() }).from(tenders);

    // Total proposals (offers)
    const allOffers = await db.select({ cnt: count() }).from(offers);

    // Unread admin notifications
    const unreadNotifs = await db
      .select({ cnt: count() })
      .from(adminNotifications)
      .where(eq(adminNotifications.isRead, false));

    return {
      pendingVerifications: pendingVerifications.length,
      pendingFreelancers: pendingFreelancersRows.length,
      pendingJoinRequests: pendingJoinRequests.length,
      proposalsLast24h: proposalsCount,
      blockedAwards: blockedAwards.length,
      pendingMarketplace: pendingMarketplace.length,
      totalCompanies: allCompanies[0]?.cnt || 0,
      verifiedCompanies: verifiedCompanies[0]?.cnt || 0,
      totalTenders: allTenders[0]?.cnt || 0,
      totalProposals: allOffers[0]?.cnt || 0,
      unreadNotifications: unreadNotifs[0]?.cnt || 0,
    };
  }

  async getUserVerificationAnalytics(): Promise<UserVerificationAnalytics> {
    // Count of platform user accounts (people, not workspaces).
    const usersCount = await db.select({ cnt: count() }).from(users);

    // Every active workspace with just the fields we need to bucket it.
    const workspaces = await db
      .select({
        id: companies.id,
        accountType: companies.accountType,
        verificationStatus: companies.verificationStatus,
      })
      .from(companies)
      .where(isNull(companies.deletedAt));

    // Which workspaces have uploaded documents, and of which types.
    const docs = await db
      .select({ companyId: companyDocuments.companyId, documentType: companyDocuments.documentType })
      .from(companyDocuments);

    const companiesWithDocs = new Set<string>();
    const docTypeCompanies: Record<string, Set<string>> = {};
    for (const d of docs) {
      companiesWithDocs.add(d.companyId);
      (docTypeCompanies[d.documentType] ??= new Set()).add(d.companyId);
    }

    const emptyFunnel = (): VerificationFunnel => ({
      total: 0, uploadedDocs: 0, awaitingReview: 0, verified: 0, rejected: 0, noDocs: 0,
    });
    const companiesFunnel = emptyFunnel();
    const freelancersFunnel = emptyFunnel();

    for (const w of workspaces) {
      // 'individual' accounts are freelancers; everything else counts as a company.
      const bucket = w.accountType === 'individual' ? freelancersFunnel : companiesFunnel;
      bucket.total += 1;
      const hasDocs = companiesWithDocs.has(w.id);
      if (hasDocs) bucket.uploadedDocs += 1; else bucket.noDocs += 1;
      switch (w.verificationStatus) {
        case 'verified': bucket.verified += 1; break;
        case 'under_review': bucket.awaitingReview += 1; break;
        case 'rejected': bucket.rejected += 1; break;
        default: break; // not_verified
      }
    }

    return {
      totalUsers: usersCount[0]?.cnt || 0,
      totalWorkspaces: workspaces.length,
      companies: companiesFunnel,
      freelancers: freelancersFunnel,
      documentTypes: {
        crCertificate: docTypeCompanies['cr_certificate']?.size || 0,
        vatCertificate: docTypeCompanies['vat_certificate']?.size || 0,
        gosiCertificate: docTypeCompanies['gosi_certificate']?.size || 0,
        nationalAddressCertificate: docTypeCompanies['national_address_certificate']?.size || 0,
        other: docTypeCompanies['other']?.size || 0,
      },
    };
  }

  async getTendersOverview(limitN = 100): Promise<TendersOverview> {
    // Per-tender offer counts.
    const offerCountRows = await db
      .select({ tenderId: offers.tenderId, cnt: count() })
      .from(offers)
      .groupBy(offers.tenderId);
    const offerCountMap = new Map<string, number>();
    for (const r of offerCountRows) offerCountMap.set(r.tenderId, r.cnt);

    // Recent tenders with owner (company + creator) details.
    const rows = await db
      .select({
        id: tenders.id,
        title: tenders.title,
        status: tenders.status,
        isMarketplace: tenders.isMarketplace,
        marketplaceStatus: tenders.marketplaceStatus,
        createdAt: tenders.createdAt,
        companyId: tenders.companyId,
        companyName: companies.name,
        ownerName: users.name,
        ownerEmail: users.email,
      })
      .from(tenders)
      .leftJoin(companies, eq(tenders.companyId, companies.id))
      .leftJoin(users, eq(tenders.createdBy, users.id))
      .orderBy(desc(tenders.createdAt))
      .limit(limitN);

    const tenderRows: TenderOverviewRow[] = rows.map((r) => ({
      ...r,
      offerCount: offerCountMap.get(r.id) || 0,
    }));

    // Summary across ALL tenders, not just the recent slice.
    const statusRows = await db
      .select({ status: tenders.status, isMarketplace: tenders.isMarketplace })
      .from(tenders);
    const summary = {
      total: statusRows.length,
      published: 0, draft: 0, closed: 0, cancelled: 0, marketplace: 0,
      totalOffers: 0,
    };
    for (const s of statusRows) {
      if (s.status === 'published') summary.published += 1;
      else if (s.status === 'draft') summary.draft += 1;
      else if (s.status === 'closed') summary.closed += 1;
      else if (s.status === 'cancelled') summary.cancelled += 1;
      if (s.isMarketplace) summary.marketplace += 1;
    }
    const totalOffersRow = await db.select({ cnt: count() }).from(offers);
    summary.totalOffers = totalOffersRow[0]?.cnt || 0;

    return { summary, tenders: tenderRows };
  }

  // ============================================================================
  // ADMIN NOTIFICATION OPERATIONS
  // ============================================================================

  async createAdminNotification(n: InsertAdminNotification): Promise<AdminNotification> {
    const [created] = await db.insert(adminNotifications).values(n).returning();
    return created;
  }

  async getAdminNotifications(opts?: { limit?: number; unreadOnly?: boolean }): Promise<AdminNotification[]> {
    const limitN = opts?.limit ?? 50;
    if (opts?.unreadOnly) {
      return db.select().from(adminNotifications)
        .where(eq(adminNotifications.isRead, false))
        .orderBy(desc(adminNotifications.createdAt))
        .limit(limitN);
    }
    return db.select().from(adminNotifications)
      .orderBy(desc(adminNotifications.createdAt))
      .limit(limitN);
  }

  async getUnreadAdminNotificationCount(): Promise<number> {
    const r = await db.select({ cnt: count() }).from(adminNotifications)
      .where(eq(adminNotifications.isRead, false));
    return r[0]?.cnt || 0;
  }

  async markAdminNotificationRead(id: string, userId: string): Promise<void> {
    await db.update(adminNotifications)
      .set({ isRead: true, readAt: new Date(), readBy: userId })
      .where(eq(adminNotifications.id, id));
  }

  async markAllAdminNotificationsRead(userId: string): Promise<void> {
    await db.update(adminNotifications)
      .set({ isRead: true, readAt: new Date(), readBy: userId })
      .where(eq(adminNotifications.isRead, false));
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
  // NOTIFICATION PREFERENCES
  // ============================================================================

  async getNotificationPreferences(
    userId: string,
    companyId: string,
  ): Promise<NotificationPreference[]> {
    return db
      .select()
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.companyId, companyId),
      ));
  }

  async setNotificationPreference(
    userId: string,
    companyId: string,
    category: string,
    channel: string,
    enabled: boolean,
  ): Promise<NotificationPreference> {
    const [row] = await db
      .insert(notificationPreferences)
      .values({ userId, companyId, category, channel, enabled })
      .onConflictDoUpdate({
        target: [
          notificationPreferences.userId,
          notificationPreferences.companyId,
          notificationPreferences.category,
          notificationPreferences.channel,
        ],
        set: { enabled, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  /**
   * Drop recipients whose preference for (companyId, category, channel) is
   * explicitly disabled. Missing rows mean "enabled" (default-on), so a user
   * who has never touched their prefs receives everything.
   * One-shot query: pulls all opt-outs for this company × category × channel
   * in a single round-trip, then filters in-memory.
   */
  async filterRecipientsByPreference<R extends { userId: string }>(
    recipients: R[],
    companyId: string,
    category: string,
    channel: string,
  ): Promise<R[]> {
    if (recipients.length === 0) return recipients;
    const optedOut = await db
      .select({ userId: notificationPreferences.userId })
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.companyId, companyId),
        eq(notificationPreferences.category, category),
        eq(notificationPreferences.channel, channel),
        eq(notificationPreferences.enabled, false),
      ));
    if (optedOut.length === 0) return recipients;
    const muted = new Set(optedOut.map((r) => r.userId));
    return recipients.filter((r) => !muted.has(r.userId));
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

  async resetAllTourProgress(userId: string): Promise<void> {
    await db
      .delete(tourProgress)
      .where(eq(tourProgress.userId, userId));
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
    callerAccountType?: string;
    audienceType?: string;
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
      conditions.push(ilike(companies.city, options.city));
    }
    if (options.tenderType) {
      conditions.push(eq(tenders.tenderType, options.tenderType));
    }
    // Audience filtering: only surface tenders whose target audience includes
    // the requested account type (e.g. individuals only see tenders open to
    // individual applicants).
    if (options.audienceType) {
      conditions.push(sql`${options.audienceType} = ANY(${tenders.targetAudienceTypes})`);
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: count() })
      .from(tenders)
      .innerJoin(companies, eq(tenders.companyId, companies.id))
      .where(whereClause);

    const orderByClause =
      options.sort === 'deadline_asc' ? asc(tenders.deadline) :
      options.sort === 'budget_desc' ? desc(tenders.budgetMax) :
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

  async getMarketplaceCategories(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ category: tenders.category })
      .from(tenders)
      .innerJoin(companies, eq(tenders.companyId, companies.id))
      .where(and(
        eq(tenders.isMarketplace, true),
        eq(tenders.marketplaceStatus, 'approved'),
        eq(tenders.status, 'published'),
        isNull(companies.deletedAt),
        gte(tenders.deadline, new Date().toISOString().split('T')[0]),
      ));
    return rows
      .map(r => r.category)
      .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      .sort();
  }

  async getMarketplaceStats(): Promise<{ activeTenders: number; awardedTenders: number; totalOffers: number }> {
    const [activeResult] = await db
      .select({ count: count() })
      .from(tenders)
      .innerJoin(companies, eq(tenders.companyId, companies.id))
      .where(and(
        eq(tenders.isMarketplace, true),
        eq(tenders.marketplaceStatus, 'approved'),
        eq(tenders.status, 'published'),
        isNull(companies.deletedAt),
        gte(tenders.deadline, new Date().toISOString().split('T')[0]),
      ));

    const [awardedResult] = await db
      .select({ count: count() })
      .from(tenders)
      .innerJoin(awards, eq(tenders.id, awards.tenderId))
      .innerJoin(companies, eq(tenders.companyId, companies.id))
      .where(and(
        eq(tenders.isMarketplace, true),
        eq(awards.status, 'awarded'),
        isNull(companies.deletedAt),
      ));

    const [offersResult] = await db
      .select({ count: count() })
      .from(offers)
      .innerJoin(tenders, eq(offers.tenderId, tenders.id))
      .innerJoin(companies, eq(tenders.companyId, companies.id))
      .where(and(
        eq(tenders.isMarketplace, true),
        eq(tenders.marketplaceStatus, 'approved'),
        isNull(companies.deletedAt),
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
