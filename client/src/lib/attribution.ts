// First-touch campaign attribution, browser side.
//
// The rule this file implements: whoever sent you here FIRST gets the credit,
// for 90 days. A visitor can arrive from an influencer, wander off, come back
// through Google a week later and sign up — that signup still belongs to the
// influencer. So the stored record is written once and never overwritten while
// it is alive, which is the opposite of the usual "last write wins" instinct
// and is the entire reason this is not a one-liner.
//
// Nothing here identifies a person. `visitorId` is a random string this browser
// made up about itself; it is meaningless anywhere else and is only ever joined
// to a user at the moment that user chooses to create an account.

const STORAGE_KEY = "bid_attrib";
const VISITOR_KEY = "bid_visitor";
const TTL_DAYS = 90;

export interface StoredAttribution {
  visitorId: string;
  code?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPath?: string;
  referrer?: string;
  firstTouchAt: string;
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private mode, or storage disabled. Tracking degrades; the app does not.
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function newId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function getVisitorId(): string {
  const existing = safeGet(VISITOR_KEY);
  if (existing && existing.length >= 8) return existing;
  const id = newId();
  safeSet(VISITOR_KEY, id);
  return id;
}

/** The stored first touch, or null if there is none or it has aged out. */
export function getAttribution(): StoredAttribution | null {
  const raw = safeGet(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAttribution;
    if (!parsed?.firstTouchAt || !parsed?.visitorId) return null;
    const ageMs = Date.now() - new Date(parsed.firstTouchAt).getTime();
    if (!Number.isFinite(ageMs) || ageMs > TTL_DAYS * 86_400_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readParams(search: string) {
  const q = new URLSearchParams(search);
  const pick = (k: string) => {
    const v = q.get(k);
    return v ? v.trim().slice(0, 200) : undefined;
  };
  return {
    // utm_id carries the campaign code through the /r/<code> redirect, so a
    // click on a short link is matched to the campaign row directly rather
    // than by re-parsing the UTM strings it expanded into.
    code: pick("utm_id") || pick("ref") || undefined,
    utmSource: pick("utm_source"),
    utmMedium: pick("utm_medium"),
    utmCampaign: pick("utm_campaign"),
    utmContent: pick("utm_content"),
    utmTerm: pick("utm_term"),
  };
}

/**
 * Call once per page load. Records the first touch if this visit carries
 * campaign parameters, and tells the server about the click.
 *
 * Deliberately silent about failures — a beacon that throws would take the
 * landing page down with it, which would cost far more traffic than it measures.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    const params = readParams(window.location.search);
    const hasCampaign = Boolean(params.code || params.utmCampaign || params.utmSource);
    if (!hasCampaign) return;

    const visitorId = getVisitorId();
    const existing = getAttribution();

    // First touch wins. A visitor who clicks a second influencer's link keeps
    // the first one's credit; the click is still reported below, so the second
    // influencer's traffic is counted even though the signup will not be theirs.
    if (!existing) {
      const record: StoredAttribution = {
        visitorId,
        ...params,
        landingPath: window.location.pathname,
        referrer: document.referrer ? document.referrer.slice(0, 500) : undefined,
        firstTouchAt: new Date().toISOString(),
      };
      safeSet(STORAGE_KEY, JSON.stringify(record));
    }

    const body = JSON.stringify({
      visitorId,
      ...params,
      landingPath: window.location.pathname,
      referrer: document.referrer ? document.referrer.slice(0, 500) : undefined,
      firstTouchAt: new Date().toISOString(),
    });

    // keepalive so the beacon survives the visitor immediately navigating away,
    // which on a landing page is the common case rather than the edge one.
    void fetch("/api/track/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never let tracking break a page load */
  }
}

/** The payload the signup endpoints accept. Undefined when there is nothing to credit. */
export function attributionForSignup(): StoredAttribution | undefined {
  return getAttribution() ?? undefined;
}
