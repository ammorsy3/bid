import type { BidState } from "./StatusDot";

/**
 * Maps domain enum values to the brand's six dot-states.
 * Source enums live in shared/schema.ts; these mappings are what the brand
 * book calls "Six colors. One shape. Every context."
 */

// Tender lifecycle — shared/schema.ts:257
//   draft | published | closed | cancelled
export function tenderStatusToState(status: string | null | undefined): BidState {
  switch (status) {
    case "published":
      return "live";
    case "closed":
      return "pending";
    case "cancelled":
      return "lost";
    case "draft":
    default:
      return "idle";
  }
}

// Award lifecycle — shared/schema.ts:547
//   pending | blocked | awarded
export function awardStatusToState(status: string | null | undefined): BidState {
  switch (status) {
    case "awarded":
      return "won";
    case "blocked":
      return "lost";
    case "pending":
    default:
      return "pending";
  }
}

// Proposal lifecycle — shared/schema.ts:360
//   pending | accepted | rejected | superseded
export function proposalStatusToState(status: string | null | undefined): BidState {
  switch (status) {
    case "accepted":
      return "won";
    case "rejected":
      return "lost";
    case "superseded":
      return "idle";
    case "pending":
    default:
      return "pending";
  }
}

// Company verification — shared/schema.ts:81
//   not_verified | under_review | verified | rejected
export function verificationStatusToState(status: string | null | undefined): BidState {
  switch (status) {
    case "verified":
      return "won";
    case "under_review":
      return "pending";
    case "rejected":
      return "lost";
    case "not_verified":
    default:
      return "idle";
  }
}

// Marketplace review — shared/schema.ts:323
//   pending | approved | rejected
export function reviewStatusToState(status: string | null | undefined): BidState {
  switch (status) {
    case "approved":
      return "won";
    case "rejected":
      return "lost";
    case "pending":
    default:
      return "pending";
  }
}
