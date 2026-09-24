/**
 * The bid exchange, as real users experience it.
 *
 * Everything else is tested as the person who uploaded the file. Real companies
 * have several people in them: the colleague who did not click "upload" still
 * has to open the document, and a buyer's procurement team is more than the one
 * person who happened to create the tender.
 *
 * The object ACL grants access to an object's *owner*. If nothing else granted
 * access, then locking the ACL down would mean a supplier could not read the bid
 * their own colleague submitted, and a buyer's team could not open the bids they
 * received — while everything still passed as the uploader. That is the failure
 * these tests exist to catch, so they are written from the seat of the person who
 * did NOT upload the file.
 *
 * Cast:
 *   supplierOwner   — owns the supplier company, submits the bid
 *   supplierMate    — a colleague at the supplier company, uploaded nothing
 *   buyerOwner      — owns the buyer company, created the tender
 *   buyerMate       — a colleague on the buyer's procurement team
 *   rival           — a competing supplier, must never see the bid
 */
import express, { type Express } from "express";
import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "vitest";

import { registerRoutes } from "../server/routes";
import {
  makeUser,
  makeCompany,
  addMember,
  makeTender,
  makeOffer,
  makeCompanyDocument,
  makePrivateFile,
  setAcl,
  tokenFor,
  teardown,
} from "./helpers/fixtures";

let app: Express;

let supplierOwner: { id: string };
let supplierMate: { id: string };
let buyerOwner: { id: string };
let buyerMate: { id: string };
let rival: { id: string };

let supplierCo: { id: string };
let buyerCo: { id: string };
let rivalCo: { id: string };

let bidDocument: string;      // the supplier's technical bid
let tenderAttachment: string; // a spec sheet on the published tender
let supplierCrDoc: string;    // the supplier company's CR certificate

beforeAll(async () => {
  app = express();
  app.use(express.json());
  await registerRoutes(app);

  supplierOwner = await makeUser();
  supplierMate = await makeUser();
  buyerOwner = await makeUser();
  buyerMate = await makeUser();
  rival = await makeUser();

  supplierCo = await makeCompany(supplierOwner.id);
  buyerCo = await makeCompany(buyerOwner.id);
  rivalCo = await makeCompany(rival.id);

  // The colleagues: in the company, but they uploaded nothing.
  await addMember(supplierCo.id, supplierMate.id);
  await addMember(buyerCo.id, buyerMate.id);

  // The buyer publishes a tender with a spec sheet attached.
  const tender = await makeTender(buyerCo.id, buyerOwner.id, "published");
  tenderAttachment = (await makePrivateFile("spec-sheet")).objectPath;
  await setAcl(tenderAttachment, {
    owner: buyerOwner.id,
    visibility: "private",
  });
  await attachToTender(tender.id, tenderAttachment);

  // The supplier submits a bid against it.
  bidDocument = (await makePrivateFile("technical-bid")).objectPath;
  await setAcl(bidDocument, {
    owner: supplierOwner.id,
    visibility: "private",
    tenderAccess: { tenderId: tender.id, allowedUserIds: [buyerOwner.id] },
  });
  await makeOffer({
    tenderId: tender.id,
    companyId: supplierCo.id,
    createdBy: supplierOwner.id,
    technicalFileUrl: bidDocument,
  });

  // The supplier company's verification document.
  supplierCrDoc = (await makePrivateFile("cr")).objectPath;
  await setAcl(supplierCrDoc, { owner: supplierOwner.id, visibility: "private" });
  await makeCompanyDocument({
    companyId: supplierCo.id,
    fileUrl: supplierCrDoc,
    uploadedBy: supplierOwner.id,
  });
}, 60_000);

afterAll(async () => {
  await teardown();
}, 60_000);

/** Puts a file in a tender's attachments array, the shape the app stores. */
async function attachToTender(tenderId: string, url: string) {
  const { db } = await import("../server/db");
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`
    update tenders
       set attachments = ${JSON.stringify([
         { id: "att-fixture", url, name: "spec.pdf", size: 10, type: "application/pdf" },
       ])}::jsonb
     where id = ${tenderId}
  `);
}

const as = (user: { id: string }, companyId?: string, isAdmin = false) =>
  tokenFor({ id: user.id, activeCompanyId: companyId ?? null, isAdmin });

const get = (path: string, token: string) =>
  request(app).get(path).set("Authorization", `Bearer ${token}`);

describe("the supplier's own bid", () => {
  it("the person who submitted it can read it", async () => {
    const res = await get(bidDocument, as(supplierOwner, supplierCo.id));
    expect(res.status).toBe(200);
  });

  it("a COLLEAGUE at the supplier company can read it (they did not upload it)", async () => {
    const res = await get(bidDocument, as(supplierMate, supplierCo.id));
    expect(res.status).toBe(200);
  });
});

describe("the buyer receiving the bid", () => {
  it("the buyer who created the tender can read it", async () => {
    const res = await get(bidDocument, as(buyerOwner, buyerCo.id));
    expect(res.status).toBe(200);
  });

  it("a COLLEAGUE on the buyer's team can read it (not the tender creator)", async () => {
    const res = await get(bidDocument, as(buyerMate, buyerCo.id));
    expect(res.status).toBe(200);
  });
});

describe("everyone else", () => {
  it("a rival supplier cannot read the bid", async () => {
    const res = await get(bidDocument, as(rival, rivalCo.id));
    expect(res.status).toBe(403);
  });

  it("a rival cannot read it even with no active company set", async () => {
    const res = await get(bidDocument, as(rival));
    expect(res.status).toBe(403);
  });

  it("a platform admin cannot read the bid", async () => {
    const res = await get(bidDocument, as(rival, undefined, true));
    expect(res.status).toBe(403);
  });
});

describe("the tender's own attachments", () => {
  it("a supplier browsing the published tender can read its spec sheet", async () => {
    const res = await get(tenderAttachment, as(rival, rivalCo.id));
    expect(res.status).toBe(200);
  });

  it("a colleague on the buyer's team can read it", async () => {
    const res = await get(tenderAttachment, as(buyerMate, buyerCo.id));
    expect(res.status).toBe(200);
  });
});

describe("company verification documents", () => {
  it("a colleague at the company can read their own company's CR document", async () => {
    const res = await get(supplierCrDoc, as(supplierMate, supplierCo.id));
    expect(res.status).toBe(200);
  });

  it("someone from an unrelated company cannot", async () => {
    const res = await get(supplierCrDoc, as(rival, rivalCo.id));
    expect(res.status).toBe(403);
  });
});
