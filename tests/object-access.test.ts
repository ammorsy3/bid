/**
 * Object access control — integration tests over the real /objects/* routes.
 *
 * These encode the access rules for files in Supabase Storage. Two of them are
 * regression tests for bugs found while migrating off Replit:
 *
 *   • "denies an unrelated user" — GET /objects/uploads/:filename used to
 *     authenticate the caller but never check the object ACL, so ANY logged-in
 *     user could download ANY other company's private uploads, including the
 *     sealed bid documents on a tender.
 *
 *   • "allows a platform admin to read a company verification document" —
 *     enforcing the ACL initially locked admins out of the company approval
 *     queue, which exists precisely so they can read those documents.
 *
 * The pairing matters: admins can read verification documents but must NOT be
 * able to read sealed bids. Both directions are asserted.
 *
 * Runs against the live database using tracked, uniquely-namespaced fixtures
 * that are torn down by exact primary key. See tests/helpers/fixtures.ts.
 */
import express, { type Express } from "express";
import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "vitest";

import { registerRoutes } from "../server/routes";
import {
  makeUser,
  makeCompany,
  makeTender,
  makeOffer,
  makeCompanyDocument,
  makePrivateFile,
  setAcl,
  tokenFor,
  teardown,
} from "./helpers/fixtures";

let app: Express;

// Actors
let owner: { id: string };            // uploaded the file / owns the company
let stranger: { id: string };         // unrelated user at another company
let admin: { id: string };            // platform admin
let buyer: { id: string };            // published the tender, receives offers

let ownerCo: { id: string };
let strangerCo: { id: string };
let buyerCo: { id: string };

// Objects under test
let ownedFile: string;      // private file owned by `owner`
let sealedBid: string;      // supplier's offer document on buyer's tender
let verificationDoc: string; // owner's company CR certificate
let orphanFile: string;     // real object with no ACL row at all

beforeAll(async () => {
  app = express();
  app.use(express.json());
  await registerRoutes(app);

  owner = await makeUser();
  stranger = await makeUser();
  admin = await makeUser({ isAdmin: true });
  buyer = await makeUser();

  ownerCo = await makeCompany(owner.id);
  strangerCo = await makeCompany(stranger.id);
  buyerCo = await makeCompany(buyer.id);

  // A plain private file belonging to `owner`.
  ownedFile = (await makePrivateFile()).objectPath;
  await setAcl(ownedFile, { owner: owner.id, visibility: "private" });

  // A sealed bid: owner's company submits an offer on buyer's tender.
  const tender = await makeTender(buyerCo.id, buyer.id, "published");
  sealedBid = (await makePrivateFile("sealed-bid")).objectPath;
  await setAcl(sealedBid, {
    owner: owner.id,
    visibility: "private",
    tenderAccess: { tenderId: tender.id, allowedUserIds: [buyer.id] },
  });
  await makeOffer({
    tenderId: tender.id,
    companyId: ownerCo.id,
    createdBy: owner.id,
    technicalFileUrl: sealedBid,
  });

  // A company verification document (CR certificate) for owner's company.
  verificationDoc = (await makePrivateFile("cr-certificate")).objectPath;
  await setAcl(verificationDoc, { owner: owner.id, visibility: "private" });
  await makeCompanyDocument({
    companyId: ownerCo.id,
    fileUrl: verificationDoc,
    uploadedBy: owner.id,
  });

  // A real object in the bucket that nothing references and no ACL covers —
  // like the files whose ACLs were lost in the Replit → Supabase migration.
  orphanFile = (await makePrivateFile("orphan")).objectPath;
}, 60_000);

afterAll(async () => {
  await teardown();
}, 60_000);

const get = (path: string, token?: string) => {
  const r = request(app).get(path);
  return token ? r.set("Authorization", `Bearer ${token}`) : r;
};

describe("private file — owner", () => {
  it("allows the owner to read their own file", async () => {
    const res = await get(ownedFile, tokenFor({ id: owner.id, activeCompanyId: ownerCo.id }));
    expect(res.status).toBe(200);
  });
});

describe("private file — everyone else", () => {
  it("denies an unrelated user (regression: any logged-in user could read any file)", async () => {
    const res = await get(
      ownedFile,
      tokenFor({ id: stranger.id, activeCompanyId: strangerCo.id }),
    );
    expect(res.status).toBe(403);
  });

  it("denies an unauthenticated request", async () => {
    const res = await get(ownedFile);
    expect(res.status).toBe(401);
  });

  it("denies a file that has no ACL row at all (deny by default)", async () => {
    const res = await get(orphanFile, tokenFor({ id: owner.id, activeCompanyId: ownerCo.id }));
    expect(res.status).toBe(403);
  });
});

describe("sealed bids", () => {
  it("allows the supplier who submitted it", async () => {
    const res = await get(sealedBid, tokenFor({ id: owner.id, activeCompanyId: ownerCo.id }));
    expect(res.status).toBe(200);
  });

  it("allows the buyer who owns the tender", async () => {
    const res = await get(sealedBid, tokenFor({ id: buyer.id, activeCompanyId: buyerCo.id }));
    expect(res.status).toBe(200);
  });

  it("denies a competing supplier", async () => {
    const res = await get(
      sealedBid,
      tokenFor({ id: stranger.id, activeCompanyId: strangerCo.id }),
    );
    expect(res.status).toBe(403);
  });

  it("denies a platform admin — admins must not read sealed bids", async () => {
    const res = await get(sealedBid, tokenFor({ id: admin.id, isAdmin: true }));
    expect(res.status).toBe(403);
  });
});

describe("company verification documents", () => {
  it("allows a platform admin (regression: admin approval queue was locked out)", async () => {
    const res = await get(verificationDoc, tokenFor({ id: admin.id, isAdmin: true }));
    expect(res.status).toBe(200);
  });

  it("allows a member of the owning company", async () => {
    const res = await get(
      verificationDoc,
      tokenFor({ id: owner.id, activeCompanyId: ownerCo.id }),
    );
    expect(res.status).toBe(200);
  });

  it("denies a user from another company", async () => {
    const res = await get(
      verificationDoc,
      tokenFor({ id: stranger.id, activeCompanyId: strangerCo.id }),
    );
    expect(res.status).toBe(403);
  });
});
