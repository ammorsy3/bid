import { 
  users, 
  tenders, 
  offers, 
  invitations,
  vendorQualifications,
  requesterProfiles,
  vendorsBase,
  joinRequests,
  invitationLinks,
  analyticsEvents,
  type User, 
  type InsertUser,
  type Tender,
  type InsertTender,
  type Offer,
  type InsertOffer,
  type Invitation,
  type InsertInvitation,
  type VendorQualification,
  type InsertVendorQualification,
  type RequesterProfile,
  type InsertRequesterProfile,
  type VendorBase,
  type InsertVendorBase,
  type JoinRequest,
  type InsertJoinRequest,
  type InvitationLink,
  type InsertInvitationLink,
  type AnalyticsEvent,
  type InsertAnalyticsEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ilike, or } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getVendors(): Promise<User[]>;

  // Tender operations
  createTender(tender: InsertTender): Promise<Tender>;
  getTendersByRequesterId(requesterId: string): Promise<Tender[]>;
  getTenderById(id: string): Promise<Tender | undefined>;
  updateTenderStatus(id: string, status: string): Promise<void>;

  // Offer operations
  createOffer(offer: InsertOffer): Promise<Offer>;
  getOffersByTenderId(tenderId: string): Promise<(Offer & { vendor: User })[]>;
  getOffersByVendorId(vendorId: string): Promise<(Offer & { tender: Tender; requester: User })[]>;

  // Tender by invitation token
  getTenderByInvitationToken(token: string): Promise<(Tender & { requester: User }) | undefined>;
  
  // Invitation operations  
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  getInvitationsByVendorId(vendorId: string): Promise<(Invitation & { tender: Tender; requester: User })[]>;
  getInvitationsByTenderId(tenderId: string): Promise<(Invitation & { vendor?: User })[]>;
  updateInvitationStatus(id: string, status: string): Promise<void>;
  
  // Vendor qualification operations
  createVendorQualification(qualification: InsertVendorQualification): Promise<VendorQualification>;
  getVendorQualificationByVendorId(vendorId: string): Promise<VendorQualification | undefined>;
  updateVendorQualification(vendorId: string, qualification: Partial<InsertVendorQualification>): Promise<VendorQualification>;
  updateUserVerificationStatus(userId: string, status: string): Promise<void>;
  
  // Requester profile operations
  createRequesterProfile(profile: InsertRequesterProfile): Promise<RequesterProfile>;
  getRequesterProfileByRequesterId(requesterId: string): Promise<RequesterProfile | undefined>;
  updateRequesterProfile(requesterId: string, profile: Partial<InsertRequesterProfile>): Promise<RequesterProfile>;
  getRequesterProfileByTractionSlug(slug: string): Promise<RequesterProfile | undefined>;
  
  // Vendors Base operations
  addVendorToBase(vendorBase: InsertVendorBase): Promise<VendorBase>;
  getVendorsInBase(requesterId: string, searchQuery?: string): Promise<(VendorBase & { vendor: User })[]>;
  isVendorInBase(requesterId: string, vendorId: string): Promise<boolean>;
  removeVendorFromBase(requesterId: string, vendorId: string): Promise<void>;
  
  // Join Requests operations
  createJoinRequest(joinRequest: InsertJoinRequest): Promise<JoinRequest>;
  getJoinRequestsByRequesterId(requesterId: string, status?: string): Promise<(JoinRequest & { vendor?: User })[]>;
  getJoinRequestById(id: string): Promise<JoinRequest | undefined>;
  getJoinRequestByVendorAndRequester(vendorId: string, requesterId: string): Promise<JoinRequest | undefined>;
  updateJoinRequestStatus(id: string, status: string): Promise<JoinRequest>;
  getPendingJoinRequestsCount(requesterId: string): Promise<number>;
  
  // Invitation Links operations
  createInvitationLink(invitationLink: InsertInvitationLink): Promise<InvitationLink>;
  getInvitationLinkByToken(token: string): Promise<(InvitationLink & { requester: User; tender?: Tender }) | undefined>;
  updateInvitationLinkStatus(id: string, status: string): Promise<InvitationLink>;
  
  // Analytics operations
  logAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
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

  async getVendors(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'vendor'));
  }

  async createTender(insertTender: InsertTender): Promise<Tender> {
    const [tender] = await db.insert(tenders).values(insertTender).returning();
    return tender;
  }

  async getTendersByRequesterId(requesterId: string): Promise<Tender[]> {
    return await db
      .select()
      .from(tenders)
      .where(eq(tenders.requesterId, requesterId))
      .orderBy(desc(tenders.createdAt));
  }

  async getTenderById(id: string): Promise<Tender | undefined> {
    const [tender] = await db.select().from(tenders).where(eq(tenders.id, id));
    return tender || undefined;
  }

  async updateTenderStatus(id: string, status: string): Promise<void> {
    await db.update(tenders).set({ status }).where(eq(tenders.id, id));
  }

  async createOffer(insertOffer: InsertOffer): Promise<Offer> {
    const [offer] = await db.insert(offers).values(insertOffer).returning();
    return offer;
  }

  async getOffersByTenderId(tenderId: string): Promise<(Offer & { vendor: User })[]> {
    return await db
      .select({
        id: offers.id,
        tenderId: offers.tenderId,
        vendorId: offers.vendorId,
        technicalFileUrl: offers.technicalFileUrl,
        financialFileUrl: offers.financialFileUrl,
        notes: offers.notes,
        submittedAt: offers.submittedAt,
        vendor: users,
      })
      .from(offers)
      .innerJoin(users, eq(offers.vendorId, users.id))
      .where(eq(offers.tenderId, tenderId))
      .orderBy(desc(offers.submittedAt));
  }

  async getOffersByVendorId(vendorId: string): Promise<(Offer & { tender: Tender; requester: User })[]> {
    return await db
      .select({
        id: offers.id,
        tenderId: offers.tenderId,
        vendorId: offers.vendorId,
        technicalFileUrl: offers.technicalFileUrl,
        financialFileUrl: offers.financialFileUrl,
        notes: offers.notes,
        submittedAt: offers.submittedAt,
        tender: tenders,
        requester: users,
      })
      .from(offers)
      .innerJoin(tenders, eq(offers.tenderId, tenders.id))
      .innerJoin(users, eq(tenders.requesterId, users.id))
      .where(eq(offers.vendorId, vendorId))
      .orderBy(desc(offers.submittedAt));
  }

  async createInvitation(insertInvitation: InsertInvitation): Promise<Invitation> {
    const [invitation] = await db.insert(invitations).values(insertInvitation).returning();
    return invitation;
  }

  async getInvitationsByVendorId(vendorId: string): Promise<(Invitation & { tender: Tender; requester: User })[]> {
    return await db
      .select({
        id: invitations.id,
        tenderId: invitations.tenderId,
        vendorId: invitations.vendorId,
        vendorEmail: invitations.vendorEmail,
        vendorName: invitations.vendorName,
        invitationToken: invitations.invitationToken,
        status: invitations.status,
        invitedAt: invitations.invitedAt,
        tender: tenders,
        requester: users,
      })
      .from(invitations)
      .innerJoin(tenders, eq(invitations.tenderId, tenders.id))
      .innerJoin(users, eq(tenders.requesterId, users.id))
      .where(eq(invitations.vendorId, vendorId))
      .orderBy(desc(invitations.invitedAt));
  }

  async getInvitationsByTenderId(tenderId: string): Promise<(Invitation & { vendor?: User })[]> {
    const results = await db
      .select({
        id: invitations.id,
        tenderId: invitations.tenderId,
        vendorId: invitations.vendorId,
        vendorEmail: invitations.vendorEmail,
        vendorName: invitations.vendorName,
        invitationToken: invitations.invitationToken,
        status: invitations.status,
        invitedAt: invitations.invitedAt,
        vendor: users,
      })
      .from(invitations)
      .leftJoin(users, eq(invitations.vendorId, users.id))
      .where(eq(invitations.tenderId, tenderId))
      .orderBy(desc(invitations.invitedAt));
    
    return results.map(result => ({
      ...result,
      vendor: result.vendor || undefined
    }));
  }

  async getTenderByInvitationToken(token: string): Promise<(Tender & { requester: User }) | undefined> {
    const [tender] = await db
      .select({
        id: tenders.id,
        title: tenders.title,
        description: tenders.description,
        deadline: tenders.deadline,
        budget: tenders.budget,
        duration: tenders.duration,
        status: tenders.status,
        requesterId: tenders.requesterId,
        invitationToken: tenders.invitationToken,
        createdAt: tenders.createdAt,
        requester: users,
      })
      .from(tenders)
      .innerJoin(users, eq(tenders.requesterId, users.id))
      .where(eq(tenders.invitationToken, token));
    
    return tender || undefined;
  }

  async updateInvitationStatus(id: string, status: string): Promise<void> {
    await db.update(invitations).set({ status }).where(eq(invitations.id, id));
  }

  async createVendorQualification(qualification: InsertVendorQualification): Promise<VendorQualification> {
    const [result] = await db.insert(vendorQualifications).values(qualification).returning();
    return result;
  }

  async getVendorQualificationByVendorId(vendorId: string): Promise<VendorQualification | undefined> {
    const [result] = await db.select().from(vendorQualifications).where(eq(vendorQualifications.vendorId, vendorId));
    return result || undefined;
  }

  async updateVendorQualification(vendorId: string, qualification: Partial<InsertVendorQualification>): Promise<VendorQualification> {
    const [result] = await db
      .update(vendorQualifications)
      .set({ ...qualification, updatedAt: new Date() })
      .where(eq(vendorQualifications.vendorId, vendorId))
      .returning();
    return result;
  }

  async updateUserVerificationStatus(userId: string, status: string): Promise<void> {
    await db.update(users).set({ verificationStatus: status }).where(eq(users.id, userId));
  }

  async createRequesterProfile(profile: InsertRequesterProfile): Promise<RequesterProfile> {
    const [result] = await db.insert(requesterProfiles).values(profile).returning();
    return result;
  }

  async getRequesterProfileByRequesterId(requesterId: string): Promise<RequesterProfile | undefined> {
    const [result] = await db.select().from(requesterProfiles).where(eq(requesterProfiles.requesterId, requesterId));
    return result || undefined;
  }

  async updateRequesterProfile(requesterId: string, profile: Partial<InsertRequesterProfile>): Promise<RequesterProfile> {
    const [result] = await db
      .update(requesterProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(requesterProfiles.requesterId, requesterId))
      .returning();
    return result;
  }

  async getRequesterProfileByTractionSlug(slug: string): Promise<RequesterProfile | undefined> {
    const [result] = await db.select().from(requesterProfiles).where(eq(requesterProfiles.tractionSlug, slug));
    return result || undefined;
  }

  // Vendors Base operations
  async addVendorToBase(vendorBase: InsertVendorBase): Promise<VendorBase> {
    const [result] = await db.insert(vendorsBase).values(vendorBase).returning();
    return result;
  }

  async getVendorsInBase(requesterId: string, searchQuery?: string): Promise<(VendorBase & { vendor: User })[]> {
    const conditions = searchQuery
      ? and(
          eq(vendorsBase.requesterId, requesterId),
          or(
            ilike(users.name, `%${searchQuery}%`),
            ilike(users.company, `%${searchQuery}%`)
          )
        )
      : eq(vendorsBase.requesterId, requesterId);

    return await db
      .select({
        id: vendorsBase.id,
        requesterId: vendorsBase.requesterId,
        vendorId: vendorsBase.vendorId,
        joinMethod: vendorsBase.joinMethod,
        addedAt: vendorsBase.addedAt,
        vendor: users,
      })
      .from(vendorsBase)
      .innerJoin(users, eq(vendorsBase.vendorId, users.id))
      .where(conditions)
      .orderBy(desc(vendorsBase.addedAt));
  }

  async isVendorInBase(requesterId: string, vendorId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(vendorsBase)
      .where(and(
        eq(vendorsBase.requesterId, requesterId),
        eq(vendorsBase.vendorId, vendorId)
      ));
    return !!result;
  }

  async removeVendorFromBase(requesterId: string, vendorId: string): Promise<void> {
    await db.delete(vendorsBase).where(
      and(
        eq(vendorsBase.requesterId, requesterId),
        eq(vendorsBase.vendorId, vendorId)
      )
    );
  }

  // Join Requests operations
  async createJoinRequest(joinRequest: InsertJoinRequest): Promise<JoinRequest> {
    const [result] = await db.insert(joinRequests).values(joinRequest).returning();
    return result;
  }

  async getJoinRequestsByRequesterId(requesterId: string, status?: string): Promise<(JoinRequest & { vendor?: User })[]> {
    const conditions = status 
      ? and(eq(joinRequests.requesterId, requesterId), eq(joinRequests.status, status))
      : eq(joinRequests.requesterId, requesterId);

    const results = await db
      .select({
        id: joinRequests.id,
        requesterId: joinRequests.requesterId,
        vendorId: joinRequests.vendorId,
        status: joinRequests.status,
        rejectionReason: joinRequests.rejectionReason,
        createdAt: joinRequests.createdAt,
        decidedAt: joinRequests.decidedAt,
        vendor: users,
      })
      .from(joinRequests)
      .leftJoin(users, eq(joinRequests.vendorId, users.id))
      .where(conditions)
      .orderBy(desc(joinRequests.createdAt));

    return results.map(result => ({
      ...result,
      vendor: result.vendor || undefined
    }));
  }

  async getJoinRequestById(id: string): Promise<JoinRequest | undefined> {
    const [result] = await db.select().from(joinRequests).where(eq(joinRequests.id, id));
    return result || undefined;
  }

  async getJoinRequestByVendorAndRequester(vendorId: string, requesterId: string): Promise<JoinRequest | undefined> {
    const [result] = await db
      .select()
      .from(joinRequests)
      .where(and(
        eq(joinRequests.vendorId, vendorId),
        eq(joinRequests.requesterId, requesterId)
      ))
      .orderBy(desc(joinRequests.createdAt))
      .limit(1);
    return result || undefined;
  }

  async updateJoinRequestStatus(id: string, status: string): Promise<JoinRequest> {
    const [result] = await db
      .update(joinRequests)
      .set({ status, decidedAt: new Date() })
      .where(eq(joinRequests.id, id))
      .returning();
    return result;
  }

  async getPendingJoinRequestsCount(requesterId: string): Promise<number> {
    const results = await db
      .select()
      .from(joinRequests)
      .where(and(
        eq(joinRequests.requesterId, requesterId),
        eq(joinRequests.status, 'pending')
      ));
    return results.length;
  }

  // Invitation Links operations
  async createInvitationLink(invitationLink: InsertInvitationLink): Promise<InvitationLink> {
    const [result] = await db.insert(invitationLinks).values(invitationLink).returning();
    return result;
  }

  async getInvitationLinkByToken(token: string): Promise<(InvitationLink & { requester: User; tender?: Tender }) | undefined> {
    const [result] = await db
      .select({
        id: invitationLinks.id,
        requesterId: invitationLinks.requesterId,
        tenderId: invitationLinks.tenderId,
        vendorEmail: invitationLinks.vendorEmail,
        token: invitationLinks.token,
        status: invitationLinks.status,
        createdAt: invitationLinks.createdAt,
        acceptedAt: invitationLinks.acceptedAt,
        requester: users,
        tender: tenders,
      })
      .from(invitationLinks)
      .innerJoin(users, eq(invitationLinks.requesterId, users.id))
      .leftJoin(tenders, eq(invitationLinks.tenderId, tenders.id))
      .where(eq(invitationLinks.token, token));

    if (!result) return undefined;

    return {
      ...result,
      tender: result.tender || undefined
    };
  }

  async updateInvitationLinkStatus(id: string, status: string): Promise<InvitationLink> {
    const [result] = await db
      .update(invitationLinks)
      .set({ status, acceptedAt: status === 'accepted' ? new Date() : undefined })
      .where(eq(invitationLinks.id, id))
      .returning();
    return result;
  }

  // Analytics operations
  async logAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const [result] = await db.insert(analyticsEvents).values(event).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
