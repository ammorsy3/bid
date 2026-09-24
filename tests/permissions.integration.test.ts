/**
 * Two authorization rules that were missing, written as the attack each one
 * allows. Integration test: real users, companies, tenders and offers.
 *
 *  V2 — negotiation actions trusted the offer id in the request body, so the
 *       owner of any closed tender could act on another company's bids.
 *  V3 — company access was read from a 7-day token, so a removed team member
 *       kept working access to their old company.
 */
import express, { type Express } from "express";
import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";

import { registerRoutes } from "../server/routes";
import { db } from "../server/db";
import {
  makeUser, makeCompany, makeTender, makeOffer, addMember, tokenFor, teardown,
} from "./helpers/fixtures";

let app: Express;

// Two unrelated buyers, each with their own closed tender and a bid on it.
let attacker: { id: string }, attackerCo: { id: string }, attackerTender: { id: string };
let victim: { id: string }, victimCo: { id: string }, victimTender: { id: string };
let vendor: { id: string }, vendorCo: { id: string };
let victimOffer: { id: string }, attackerOffer: { id: string };

beforeAll(async () => {
  app = express();
  app.use(express.json());
  await registerRoutes(app);

  attacker = await makeUser();
  attackerCo = await makeCompany(attacker.id);
  victim = await makeUser();
  victimCo = await makeCompany(victim.id);
  vendor = await makeUser();
  vendorCo = await makeCompany(vendor.id);

  attackerTender = await makeTender(attackerCo.id, attacker.id, "closed");
  victimTender = await makeTender(victimCo.id, victim.id, "closed");

  attackerOffer = await makeOffer({
    tenderId: attackerTender.id, companyId: vendorCo.id,
    createdBy: vendor.id, technicalFileUrl: `/objects/uploads/perm-a-${attackerTender.id}`,
  });
  victimOffer = await makeOffer({
    tenderId: victimTender.id, companyId: vendorCo.id,
    createdBy: vendor.id, technicalFileUrl: `/objects/uploads/perm-v-${victimTender.id}`,
  });
}, 60_000);

afterAll(async () => {
  await teardown();
});

const asAttacker = () => tokenFor({ id: attacker.id, activeCompanyId: attackerCo.id });

describe("V2 — negotiation actions are bound to the tender in the URL", () => {
  it("refuses an offer that belongs to another company's tender", async () => {
    const res = await request(app)
      .post(`/api/tenders/${attackerTender.id}/negotiation-actions`)
      .set("Authorization", `Bearer ${asAttacker()}`)
      .send({ actions: [{
        offerId: victimOffer.id,          // ← not on this tender
        companyId: vendorCo.id,
        actionType: "award",
        message: "you win",
      }] });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("OFFER_NOT_ON_TENDER");
  });

  it("leaves the other company's bid untouched after the attempt", async () => {
    const rows: any = await db.execute(
      sql`select status, resubmission_allowed from offers where id = ${victimOffer.id}`,
    );
    const row = rows.rows?.[0] ?? rows[0];
    expect(row.status).toBe("pending");
    expect(row.resubmission_allowed).toBeFalsy();
  });

  it("refuses an offer on this tender if the company id does not match it", async () => {
    const res = await request(app)
      .post(`/api/tenders/${attackerTender.id}/negotiation-actions`)
      .set("Authorization", `Bearer ${asAttacker()}`)
      .send({ actions: [{
        offerId: attackerOffer.id,
        companyId: victimCo.id,           // ← would send the email elsewhere
        actionType: "free_message",
        message: "hello",
      }] });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("OFFER_COMPANY_MISMATCH");
  });

  it("still allows the genuine case — own tender, own offer", async () => {
    const res = await request(app)
      .post(`/api/tenders/${attackerTender.id}/negotiation-actions`)
      .set("Authorization", `Bearer ${asAttacker()}`)
      .send({ actions: [{
        offerId: attackerOffer.id,
        companyId: vendorCo.id,
        actionType: "free_message",
        message: "could you revise the timeline?",
      }] });

    expect(res.status).toBe(200);
  });

  it("is closed to viewers — awarding is not a viewer's job", async () => {
    const viewer = await makeUser();
    await addMember(attackerCo.id, viewer.id, "viewer");
    const res = await request(app)
      .post(`/api/tenders/${attackerTender.id}/negotiation-actions`)
      .set("Authorization", `Bearer ${tokenFor({ id: viewer.id, activeCompanyId: attackerCo.id })}`)
      .send({ actions: [{
        offerId: attackerOffer.id, companyId: vendorCo.id,
        actionType: "award", message: "mine now",
      }] });

    expect(res.status).toBe(403);
  });
});

describe("V3 — access follows the membership, not the week-old token", () => {
  it("a removed member's existing token stops working", async () => {
    const employee = await makeUser();
    await addMember(victimCo.id, employee.id, "member");
    const token = tokenFor({ id: employee.id, activeCompanyId: victimCo.id });

    const before = await request(app).get("/api/tenders").set("Authorization", `Bearer ${token}`);
    expect(before.status).toBe(200);

    // Exactly what DELETE /api/companies/:id/members/:userId does.
    await db.execute(
      sql`update user_companies set deleted_at = now()
           where user_id = ${employee.id} and company_id = ${victimCo.id}`,
    );

    const after = await request(app).get("/api/tenders").set("Authorization", `Bearer ${token}`);
    expect(after.status).toBe(403);
    expect(after.body.requiresCompany).toBe(true);
  });

  it("a demoted admin's token no longer carries admin powers", async () => {
    const wasAdmin = await makeUser();
    await addMember(victimCo.id, wasAdmin.id, "admin");
    // The token still claims admin, as a real one issued before the demotion would.
    const token = tokenFor({ id: wasAdmin.id, activeCompanyId: victimCo.id, roleInCompany: "admin" });

    await db.execute(
      sql`update user_companies set role_in_company = 'viewer'
           where user_id = ${wasAdmin.id} and company_id = ${victimCo.id}`,
    );

    const res = await request(app)
      .post(`/api/tenders/${victimTender.id}/negotiation-actions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ actions: [{ offerId: victimOffer.id, companyId: vendorCo.id, actionType: "free_message", message: "hi" }] });

    expect(res.status).toBe(403);
  });
});
