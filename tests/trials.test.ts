// Free-trial date rules (server/lib/trials.ts): when a trial counts, and how
// many days the banner and email say are left.

import { describe, it, expect, vi } from "vitest";

vi.mock("../server/db", () => ({ db: {} }));
vi.mock("../server/storage", () => ({ storage: {} }));

import { isTrialActive, trialDaysLeft } from "../server/lib/trials";

const now = new Date("2026-10-27T09:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);

describe("isTrialActive", () => {
  it("counts from the start up to, not including, the end", () => {
    expect(isTrialActive({ startsAt: at(-DAY), endsAt: at(DAY) }, now)).toBe(true);
    expect(isTrialActive({ startsAt: at(-30 * DAY), endsAt: now }, now)).toBe(false);
    expect(isTrialActive({ startsAt: at(DAY), endsAt: at(31 * DAY) }, now)).toBe(false);
    expect(isTrialActive(null, now)).toBe(false);
  });
});

describe("trialDaysLeft", () => {
  it("rounds up, so the last day reads 1 and a fresh trial reads 30", () => {
    expect(trialDaysLeft({ endsAt: at(30 * DAY) }, now)).toBe(30);
    expect(trialDaysLeft({ endsAt: at(4.2 * DAY) }, now)).toBe(5);
    expect(trialDaysLeft({ endsAt: at(60_000) }, now)).toBe(1);
    expect(trialDaysLeft({ endsAt: at(-DAY) }, now)).toBe(0);
  });
});
