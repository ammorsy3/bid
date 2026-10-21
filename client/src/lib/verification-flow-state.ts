// The decisions CompanyVerificationFlow makes about what may happen next, kept
// free of React so they can be tested directly (tests/verification-flow-state.test.ts).

import { missingVerificationItems, type VerificationRequirement } from "@shared/company-verification";

/** What is happening to one document slot on this screen, beyond what the server has saved. */
export type SlotPhase =
  | { kind: "uploading" }
  | { kind: "attaching"; name: string }
  /**
   * The new file was not saved. The server still holds the previous file (if
   * any). The user must retry, or explicitly keep the previous file / dismiss,
   * before the request can be submitted — so it is never ambiguous which file
   * gets reviewed.
   */
  | { kind: "failed"; name: string; uploadURL?: string; objectPath?: string; reason: "upload" | "attach" };

export type QueryState = "loading" | "error" | "ready";

/** One reason the Submit button is disabled, in the order the checklist shows them. */
export type SubmitBlocker =
  | { kind: "data"; state: "loading" | "error" }
  | { kind: "missing"; item: VerificationRequirement }
  | { kind: "slot"; slot: string; phase: SlotPhase["kind"] }
  | { kind: "busy" };

export interface QueryLike {
  isPending: boolean;
  isError: boolean;
  data?: unknown;
}

/**
 * Loading until both reads have answered once; "error" as soon as either read
 * fails — even if older data is cached — because the screen must not present a
 * status or a document list it could not confirm.
 */
export function readState(info: QueryLike, docs: QueryLike): QueryState {
  if (info.isError || docs.isError) return "error";
  if (info.isPending || docs.isPending || info.data === undefined || docs.data === undefined) return "loading";
  return "ready";
}

export function submitBlockers(input: {
  read: QueryState;
  details: { legalName?: string; crNumber?: string; city?: string };
  savedDocumentTypes: string[];
  slots: Record<string, SlotPhase | undefined>;
  busy: boolean;
}): SubmitBlocker[] {
  if (input.read !== "ready") return [{ kind: "data", state: input.read }];
  const blockers: SubmitBlocker[] = [];
  for (const [slot, phase] of Object.entries(input.slots)) {
    if (phase) blockers.push({ kind: "slot", slot, phase: phase.kind });
  }
  for (const item of missingVerificationItems(input.details, input.savedDocumentTypes)) {
    // A required document whose upload is in flight or failed is reported once, as that slot.
    if (input.slots[item]) continue;
    blockers.push({ kind: "missing", item });
  }
  if (input.busy) blockers.push({ kind: "busy" });
  return blockers;
}

/** Fields whose change removes an existing verification (server: LEGAL_IDENTITY_FIELDS). */
export function identityChanged(
  saved: { legalName?: string | null; crNumber?: string | null; vatNumber?: string | null },
  current: { legalName: string; crNumber: string; vatNumber: string },
): boolean {
  const n = (v?: string | null) => (v ?? "").trim();
  return n(saved.legalName) !== n(current.legalName) || n(saved.crNumber) !== n(current.crNumber) || n(saved.vatNumber) !== n(current.vatNumber);
}
