import { describe, it, expect, beforeEach } from "vitest";
import { safeReturnTo, authUrlWithReturn, stashReturnTo, takeReturnTo } from "../client/src/lib/return-to";

describe("safeReturnTo", () => {
  it("accepts same-origin relative paths", () => {
    expect(safeReturnTo("/invite/abc")).toBe("/invite/abc");
    expect(safeReturnTo("/invite/abc?i=tok&x=1#top")).toBe("/invite/abc?i=tok&x=1#top");
  });
  it.each([
    "https://evil.example", "http://evil.example/x", "//evil.example", "///evil.example",
    "/\\evil.example", "\\\\evil.example", "javascript:alert(1)", "invite/abc", "",
    "/ok\nHeader: x", "/ok\tx", null, undefined, 42,
  ])("rejects %j", (v) => {
    expect(safeReturnTo(v as any)).toBeNull();
  });
});

describe("authUrlWithReturn", () => {
  it("encodes the path", () => {
    expect(authUrlWithReturn("/login", "/invite/a?i=b")).toBe("/login?redirect=%2Finvite%2Fa%3Fi%3Db");
  });
  it("drops an unsafe path", () => {
    expect(authUrlWithReturn("/signup", "//evil.example")).toBe("/signup");
  });
});

describe("stash / take", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    (globalThis as any).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  });
  it("round-trips once", () => {
    stashReturnTo("/invite/abc");
    expect(takeReturnTo()).toBe("/invite/abc");
    expect(takeReturnTo()).toBeNull();
  });
  it("stashing nothing clears an earlier path", () => {
    stashReturnTo("/invite/abc");
    stashReturnTo(null);
    expect(takeReturnTo()).toBeNull();
  });
  it("ignores unsafe and expired values", () => {
    store.set("bid:return-to", JSON.stringify({ path: "//evil.example", at: Date.now() }));
    expect(takeReturnTo()).toBeNull();
    store.set("bid:return-to", JSON.stringify({ path: "/invite/abc", at: Date.now() - 2 * 3600_000 }));
    expect(takeReturnTo()).toBeNull();
  });
});
