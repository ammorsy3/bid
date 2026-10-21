// What CompanyVerificationFlow allows next (A-R5, A-R6). The rendered flow is
// exercised in a real browser by .mobile-audit/bugfix-20261020/interactions.mjs.

import { describe, it, expect } from "vitest";
import { identityChanged, readState, submitBlockers, type SlotPhase } from "../client/src/lib/verification-flow-state";

const ok = { isPending: false, isError: false, data: {} };
const failed = { isPending: false, isError: true, data: undefined };
const pending = { isPending: true, isError: false, data: undefined };
const details = { legalName: "Al Noor Trading", crNumber: "1010123456", city: "Riyadh" };

describe("readState (A-R5)", () => {
  it("is an error when either read fails, independently, even if old data is cached", () => {
    expect(readState(failed, ok)).toBe("error");
    expect(readState(ok, failed)).toBe("error");
    expect(readState({ ...failed, data: { verificationStatus: "verified" } }, ok)).toBe("error");
  });
  it("is loading until both reads have answered, and ready only when both succeeded", () => {
    expect(readState(pending, ok)).toBe("loading");
    expect(readState(ok, pending)).toBe("loading");
    expect(readState(ok, ok)).toBe("ready");
  });
  it("blocks submission while data is missing or failed, without inventing a missing-items list", () => {
    for (const read of ["loading", "error"] as const) {
      expect(submitBlockers({ read, details, savedDocumentTypes: ["cr_certificate"], slots: {}, busy: false }))
        .toEqual([{ kind: "data", state: read }]);
    }
  });
});

describe("submitBlockers (A-R6)", () => {
  const ready = (slots: Record<string, SlotPhase | undefined>, saved = ["cr_certificate"]) =>
    submitBlockers({ read: "ready", details, savedDocumentTypes: saved, slots, busy: false });

  it("a complete request with nothing in flight can be submitted", () => {
    expect(ready({})).toEqual([]);
  });

  it("a failed replacement blocks submission even though the old file is still saved", () => {
    expect(ready({ cr_certificate: { kind: "failed", name: "new.pdf", reason: "attach", uploadURL: "u" } }))
      .toEqual([{ kind: "slot", slot: "cr_certificate", phase: "failed" }]);
  });

  it("explicitly keeping the current file (clearing the failure) unblocks it again", () => {
    expect(ready({ cr_certificate: undefined })).toEqual([]);
  });

  it("an upload in progress and an attach in progress both block, on optional slots too", () => {
    expect(ready({ vat_certificate: { kind: "uploading" } })).toEqual([{ kind: "slot", slot: "vat_certificate", phase: "uploading" }]);
    expect(ready({ gosi_certificate: { kind: "attaching", name: "g.pdf" } })).toEqual([{ kind: "slot", slot: "gosi_certificate", phase: "attaching" }]);
  });

  it("a required document that is uploading for the first time is reported once, as that slot", () => {
    expect(ready({ cr_certificate: { kind: "uploading" } }, [])).toEqual([{ kind: "slot", slot: "cr_certificate", phase: "uploading" }]);
  });

  it("saving details blocks submission", () => {
    expect(submitBlockers({ read: "ready", details, savedDocumentTypes: ["cr_certificate"], slots: {}, busy: true })).toEqual([{ kind: "busy" }]);
  });
});

describe("identityChanged (A-R3 warning)", () => {
  const saved = { legalName: "Al Noor", crNumber: "1010123456", vatNumber: "" };
  it("is true for name, CR or VAT changes and false for whitespace-only edits", () => {
    expect(identityChanged(saved, { legalName: "Al Noor Group", crNumber: "1010123456", vatNumber: "" })).toBe(true);
    expect(identityChanged(saved, { legalName: "Al Noor", crNumber: "1010999999", vatNumber: "" })).toBe(true);
    expect(identityChanged(saved, { legalName: "Al Noor", crNumber: "1010123456", vatNumber: "300000000000003" })).toBe(true);
    expect(identityChanged(saved, { legalName: " Al Noor ", crNumber: "1010123456", vatNumber: "" })).toBe(false);
  });
});
