/**
 * The emailed code has to be enforced by the server, not by the login screen.
 *
 * Login hands out a working token before the code is entered, and the code
 * screen runs in the visitor's own browser — so if the server accepts that
 * token everywhere, anyone holding a stolen password can skip the screen
 * entirely by calling the API directly. These tests pin that shut.
 *
 * Integration test: it creates real users, so it needs the database.
 */
import express, { type Express } from "express";
import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";

import { registerRoutes } from "../server/routes";
import { db } from "../server/db";
import { makeUser, makeCompany, tokenFor, teardown } from "./helpers/fixtures";

let app: Express;
let unverified: { id: string };
let verified: { id: string };
let unverifiedCo: { id: string };

beforeAll(async () => {
  app = express();
  app.use(express.json());
  await registerRoutes(app);

  unverified = await makeUser({ otpVerified: false });
  verified = await makeUser();
  unverifiedCo = await makeCompany(unverified.id);
}, 60_000);

afterAll(async () => {
  await teardown();
});

const asUnverified = () => tokenFor({ id: unverified.id, activeCompanyId: unverifiedCo.id });

describe("a token from login, before the code is entered", () => {
  it("cannot list the company's tenders", async () => {
    const res = await request(app).get("/api/tenders").set("Authorization", `Bearer ${asUnverified()}`);
    expect(res.status).toBe(403);
    expect(res.body.requiresOtp).toBe(true);
  });

  it("cannot read a private file", async () => {
    const res = await request(app)
      .get("/objects/uploads/whatever")
      .set("Authorization", `Bearer ${asUnverified()}`);
    expect(res.status).toBe(403);
  });

  it("cannot create a tender", async () => {
    const res = await request(app)
      .post("/api/tenders")
      .set("Authorization", `Bearer ${asUnverified()}`)
      .send({ title: "should never exist" });
    expect(res.status).toBe(403);
    expect(res.body.requiresOtp).toBe(true);
  });

  it("still reaches the screens needed to finish verifying", async () => {
    // /api/auth/me must keep working: the client logs the user out when it
    // fails, which would strand them at the login page instead of the code screen.
    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${asUnverified()}`);
    expect(me.status).toBe(200);

    // A wrong code is still rejected on its own merits, not by the gate.
    const verify = await request(app)
      .post("/api/auth/verify-otp")
      .set("Authorization", `Bearer ${asUnverified()}`)
      .send({ code: "000000" });
    expect(verify.status).not.toBe(403);
  });
});

describe("once the code is confirmed", () => {
  it("the same kind of request goes through", async () => {
    const co = await makeCompany(verified.id);
    const res = await request(app)
      .get("/api/tenders")
      .set("Authorization", `Bearer ${tokenFor({ id: verified.id, activeCompanyId: co.id })}`);
    expect(res.status).toBe(200);
  });

  it("verifying flips the gate for a user who was previously blocked", async () => {
    const late = await makeUser({ otpVerified: false });
    const lateCo = await makeCompany(late.id);
    const token = tokenFor({ id: late.id, activeCompanyId: lateCo.id });

    const before = await request(app).get("/api/tenders").set("Authorization", `Bearer ${token}`);
    expect(before.status).toBe(403);

    // What /api/auth/verify-otp does on success, without needing the email.
    await db.execute(sql`update users set otp_verified = true where id = ${late.id}`);

    // Same token as before — no new login needed.
    const after = await request(app).get("/api/tenders").set("Authorization", `Bearer ${token}`);
    expect(after.status).toBe(200);
  });
});
