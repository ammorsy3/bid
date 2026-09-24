// Email addresses are compared ignoring case and surrounding spaces:
// "Ahmed@x.com " and "ahmed@x.com" are the same person. Phones capitalise the
// first letter and keyboards add a trailing space, so an exact comparison
// rejected people who typed their address correctly.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Which account an email refers to. An exact match always wins, so every
// account that can sign in today keeps working. Otherwise the single account
// that matches ignoring case is used. When several accounts differ only by
// case there is no way to tell which one is meant, so none is chosen.
export function pickAccountForEmail<T>(exact: T | undefined, looseMatches: T[]): T | undefined {
  if (exact) return exact;
  return looseMatches.length === 1 ? looseMatches[0] : undefined;
}
