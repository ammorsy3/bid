// A short server/database failure while checking a login must never look like
// an invalid session (which makes the browser sign the user out).

import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { respondToAuthError, isTokenVerificationError } from "../server/middleware/auth-errors";

function fakeRes() {
  const res: any = { statusCode: 0, body: undefined };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: unknown) => { res.body = b; return res; };
  return res;
}

describe("respondToAuthError", () => {
  it("bad signature -> 403 Invalid token", () => {
    let err: unknown;
    try { jwt.verify(jwt.sign({ a: 1 }, "x".repeat(20)), "y".repeat(20)); } catch (e) { err = e; }
    const res = fakeRes();
    respondToAuthError(res, err);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ message: "Invalid token" });
  });

  it("expired token -> 403 Invalid token", () => {
    const secret = "s".repeat(20);
    const token = jwt.sign({ a: 1 }, secret, { expiresIn: -10 });
    let err: unknown;
    try { jwt.verify(token, secret); } catch (e) { err = e; }
    expect(isTokenVerificationError(err)).toBe(true);
    const res = fakeRes();
    respondToAuthError(res, err);
    expect(res.statusCode).toBe(403);
  });

  it("malformed token -> 403 Invalid token", () => {
    let err: unknown;
    try { jwt.verify("not-a-jwt", "s".repeat(20)); } catch (e) { err = e; }
    const res = fakeRes();
    respondToAuthError(res, err);
    expect(res.statusCode).toBe(403);
  });

  it("database failure -> 503, never 401/403", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = fakeRes();
    respondToAuthError(res, new Error("connection terminated unexpectedly"));
    expect(res.statusCode).toBe(503);
    expect((res.body as any).message).not.toMatch(/invalid token/i);
  });
});
