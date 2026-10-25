// P8 — once a request has offers, the fields vendors priced against are fixed.
// Changing them afterwards would silently reinterpret offers already received
// (S3). Fields that do not change what was priced (title, deadline, contacts,
// budget, attachments, evaluation) stay editable. A locked field is refused only
// when its value actually changes, so a full-form save that re-sends the stored
// value still succeeds.

export const SPEC_LOCKED_FIELDS = [
  "description",
  "objective",
  "scope",
  "skills",
  "deliverables",
  "vendorRequirements",
  "formCards",
  "currency",
  "pricingModel",
  "milestones",
  "startDate",
  "endDate",
  "duration",
  "projectTimeline",
  "submissionType",
  "videoRequired",
] as const;

export type SpecLockedField = (typeof SPEC_LOCKED_FIELDS)[number];

const LOCKED = new Set<string>(SPEC_LOCKED_FIELDS);

export function isSpecLockedField(field: string): field is SpecLockedField {
  return LOCKED.has(field);
}

// Missing, null and "" all mean "no value"; numbers compare by value so a
// deliverable quantity of 2 equals "2" after a form round-trip.
function canonical(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      const v = canonical((value as Record<string, unknown>)[key]);
      if (v !== null) out[key] = v;
    }
    return out;
  }
  return value;
}

export function sameSpecValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

// Deliverables are compared on what a vendor prices (the input schema drops any
// other keys, so older stored rows with extra keys still compare equal).
const DELIVERABLE_KEYS = ["id", "name", "description", "unit", "quantity"] as const;
function specView(field: SpecLockedField, value: unknown): unknown {
  if (field !== "deliverables" || !Array.isArray(value)) return value;
  return value.map((d) => (d && typeof d === "object" ? Object.fromEntries(DELIVERABLE_KEYS.map((k) => [k, (d as Record<string, unknown>)[k]])) : d));
}

/** The locked fields this update would change on a request that has offers. */
export function lockedSpecChanges(current: Record<string, unknown>, updates: Record<string, unknown>): SpecLockedField[] {
  return SPEC_LOCKED_FIELDS.filter(
    (f) => Object.prototype.hasOwnProperty.call(updates, f) && !sameSpecValue(specView(f, current[f]), specView(f, updates[f])),
  );
}
