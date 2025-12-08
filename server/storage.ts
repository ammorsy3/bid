import { 
  users,
  companies,
  companyProfiles,
  userCompanies,
  tenders,
  offers,
  invitations,
  vendorsBase,
  joinRequests,
  invitationLinks,
  awards,
  productEvents,
  auditLog,
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
  type InsertAuditLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ilike, or, isNull, sql, gte, count } from "drizzle-orm";

export interface IStorage {
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
  // TENDER OPERATIONS
  // ============================================================================
  createTender(tender: InsertTender): Promise<Tender>;
  getTender(id: string): Promise<Tender | undefined>;
  getTenderByVoiceNoteUrl(voiceNoteUrl: string): Promise<Tender | null>;
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
  getOffersByTender(tenderId: string): Promise<(Offer & { company: Company; profile?: CompanyProfile })[]>;
  getOffersByCompany(companyId: string): Promise<(Offer & { tender: Tender })[]>;
  getOfferByTenderAndCompany(tenderId: string, companyId: string): Promise<Offer | null>;
  getOfferByFileUrl(fileUrl: string): Promise<Offer | null>;
  getIncomingOffersByCompany(companyId: string): Promise<(Offer & { tender: Tender; company: Company; profile?: CompanyProfile })[]>;
  updateOfferStatus(offerId: string, status: string, decidedBy: string): Promise<Offer>;

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
  }>;
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
          eq(offers.financialFileUrl, fileUrl)
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

    return {
      pendingVerifications: pendingVerifications.length,
      pendingJoinRequests: pendingJoinRequests.length,
      proposalsLast24h: proposalsCount,
      blockedAwards: blockedAwards.length
    };
  }
}

export const storage = new DatabaseStorage();
