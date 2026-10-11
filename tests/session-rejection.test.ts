import { describe, it, expect } from "vitest";
import { isSessionRejection } from "../client/src/lib/queryClient";

describe("isSessionRejection", () => {
  it("signs out on a genuine bad token", () => {
    expect(isSessionRejection(403, JSON.stringify({ message: "Invalid token" }))).toBe(true);
    expect(isSessionRejection(401, JSON.stringify({ message: "Access token required" }))).toBe(true);
  });
  it("never signs out on 5xx", () => {
    expect(isSessionRejection(500, "Invalid token")).toBe(false);
    expect(isSessionRejection(503, JSON.stringify({ message: "Service temporarily unavailable" }))).toBe(false);
  });
  it("does not sign out on permission-denied 403 or wrong-password 401", () => {
    expect(isSessionRejection(403, JSON.stringify({ message: "Access denied" }))).toBe(false);
    expect(isSessionRejection(403, JSON.stringify({ message: "You no longer have access to this company" }))).toBe(false);
    expect(isSessionRejection(401, JSON.stringify({ message: "Invalid credentials" }))).toBe(false);
  });
});
