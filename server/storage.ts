import { 
  users, 
  tenders, 
  offers, 
  invitations,
  vendorQualifications,
  type User, 
  type InsertUser,
  type Tender,
  type InsertTender,
  type Offer,
  type InsertOffer,
  type Invitation,
  type InsertInvitation,
  type VendorQualification,
  type InsertVendorQualification
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
