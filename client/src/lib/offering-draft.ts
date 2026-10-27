// Editing state for an organization's offerings (BID-OFFERING-CLASSIFICATION).
//
// Selection semantics (all local, no network per click):
//   • Opening a sector or specialization only reveals options.
//   • Adding a group for the first time selects its CURRENT listed items; the
//     vendor unticks what it does not offer. A group without listed items is
//     added as an explicit group-level declaration.
//   • Removing a group keeps its configuration in the draft; adding it again in
//     the same draft restores it exactly — even with nothing ticked and no
//     declaration (OFC-2). The default selection applies to a first addition
//     only. Only added groups are ever saved.
//   • A group with nothing ticked and no declaration is not an offering.
//   • Items added to the catalogue later are never ticked for a saved group:
//     a saved group shows exactly what is stored.
//
// The draft is kept in localStorage under the user AND the organization, so it
// survives refresh and back-navigation and never leaks across accounts or
// workspaces. Logging out removes every offerings draft on the device.

import {
  normalizeSelection,
  selectionKey,
  type CatalogueIndex,
  type GroupSelection,
  type OfferingSelection,
} from "@shared/offering-catalogue/selection";

export interface DraftGroup {
  added: boolean;
  itemIds: string[];
  declared: boolean;
}

export interface OfferingDraft {
  v: 1;
  /** Server revision this draft was started from. */
  baseRevision: number;
  groups: Record<string, DraftGroup>;
}

export function draftFromServer(groups: GroupSelection[], revision: number): OfferingDraft {
  const out: Record<string, DraftGroup> = {};
  for (const g of groups) out[g.groupId] = { added: true, itemIds: [...g.itemIds], declared: g.declared };
  return { v: 1, baseRevision: revision, groups: out };
}

const isEffective = (g: DraftGroup | undefined) => !!g && g.added && (g.itemIds.length > 0 || g.declared);

export function groupState(draft: OfferingDraft, groupId: string): DraftGroup | null {
  const g = draft.groups[groupId];
  return g && g.added ? g : null;
}

function put(draft: OfferingDraft, groupId: string, g: DraftGroup): OfferingDraft {
  return { ...draft, groups: { ...draft.groups, [groupId]: g } };
}

export function addGroup(draft: OfferingDraft, groupId: string, idx: CatalogueIndex): OfferingDraft {
  const prev = draft.groups[groupId];
  if (prev?.added) return draft;
  // Re-adding within the same draft restores what the vendor had configured.
  if (prev) return put(draft, groupId, { ...prev, added: true });
  const listed = idx.activeItems(groupId).map((i) => i.id);
  return put(draft, groupId, { added: true, itemIds: listed, declared: listed.length === 0 });
}

export function removeGroups(draft: OfferingDraft, groupIds: string[]): OfferingDraft {
  const groups = { ...draft.groups };
  for (const id of groupIds) if (groups[id]) groups[id] = { ...groups[id], added: false };
  return { ...draft, groups };
}

/** Restores an exact earlier state of some groups (undo). */
export function restoreGroups(draft: OfferingDraft, snapshot: Record<string, DraftGroup | undefined>): OfferingDraft {
  const groups = { ...draft.groups };
  for (const [id, g] of Object.entries(snapshot)) {
    if (g) groups[id] = g; else delete groups[id];
  }
  return { ...draft, groups };
}

export function toggleItem(draft: OfferingDraft, groupId: string, itemId: string, on: boolean): OfferingDraft {
  const g = groupState(draft, groupId);
  if (!g) return draft;
  const has = g.itemIds.includes(itemId);
  if (on === has) return draft;
  return put(draft, groupId, { ...g, itemIds: on ? [...g.itemIds, itemId] : g.itemIds.filter((i) => i !== itemId) });
}

/** Select all = every CURRENT listed item (an explicit act). Clear all = nothing ticked. */
export function setAllItems(draft: OfferingDraft, groupId: string, idx: CatalogueIndex, on: boolean): OfferingDraft {
  const g = groupState(draft, groupId);
  if (!g) return draft;
  if (!on) return put(draft, groupId, { ...g, itemIds: [] });
  const listed = idx.activeItems(groupId).map((i) => i.id);
  const keep = g.itemIds.filter((i) => !listed.includes(i)); // held deprecated items stay as they are
  return put(draft, groupId, { ...g, itemIds: [...keep, ...listed] });
}

export function setDeclared(draft: OfferingDraft, groupId: string, declared: boolean): OfferingDraft {
  const g = groupState(draft, groupId);
  if (!g || g.declared === declared) return draft;
  return put(draft, groupId, { ...g, declared });
}

/** What would be saved: added groups with at least one ticked item or a declaration. */
export function draftSelection(draft: OfferingDraft): OfferingSelection {
  return normalizeSelection({
    groups: Object.entries(draft.groups)
      .filter(([, g]) => isEffective(g))
      .map(([groupId, g]) => ({ groupId, itemIds: g.itemIds, declared: g.declared })),
  });
}

/** Added groups that would NOT be saved because nothing is ticked or declared. */
export function emptyAddedGroups(draft: OfferingDraft): string[] {
  return Object.entries(draft.groups).filter(([, g]) => g.added && !isEffective(g)).map(([id]) => id);
}

export function sameAsServer(draft: OfferingDraft, server: GroupSelection[]): boolean {
  return selectionKey(draftSelection(draft)) === selectionKey({ groups: server });
}

/**
 * OFC-1: the server confirmed a save of `sent`. If the vendor kept editing while
 * the request was in flight, those newer edits stay as an unsaved draft (rebased
 * on the new revision, since the server now holds exactly `sent`). Only an
 * unchanged draft is replaced by the confirmed server state.
 */
export function afterSaveConfirmed(
  current: OfferingDraft,
  sent: OfferingSelection,
  server: { groups: GroupSelection[]; revision: number },
): { draft: OfferingDraft; newerEdits: boolean } {
  if (selectionKey(draftSelection(current)) === selectionKey(sent)) {
    return { draft: draftFromServer(server.groups, server.revision), newerEdits: false };
  }
  return { draft: { ...current, baseRevision: server.revision }, newerEdits: true };
}

export type DraftStart =
  | { kind: "server"; draft: OfferingDraft; discardStored: boolean }
  | { kind: "restored"; draft: OfferingDraft }
  | { kind: "stale"; server: OfferingDraft; local: OfferingDraft };

/**
 * How the editor starts. A stored draft started from the current revision is
 * restored. One started from an OLDER revision is neither applied over the
 * newer server data nor deleted (OFC-3): the vendor chooses explicitly. A stored
 * draft identical to the server holds no unsaved work and is dropped.
 */
export function startDraft(stored: OfferingDraft | null, server: { groups: GroupSelection[]; revision: number }): DraftStart {
  const fromServer = draftFromServer(server.groups, server.revision);
  if (!stored || sameAsServer(stored, server.groups)) return { kind: "server", draft: fromServer, discardStored: !!stored };
  if (stored.baseRevision === server.revision) return { kind: "restored", draft: stored };
  return { kind: "stale", server: fromServer, local: stored };
}

/** The vendor chose to continue with an older local draft: it is edited on top of the latest revision and saved explicitly. */
export function keepLocalOverLatest(local: OfferingDraft, serverRevision: number): OfferingDraft {
  return { ...local, baseRevision: serverRevision };
}

// ── Local persistence ────────────────────────────────────────────────────────

const PREFIX = "bid:offerings-draft:v1:";
const keyFor = (userId: string, companyId: string) => `${PREFIX}${userId}:${companyId}`;

export function loadDraft(userId: string, companyId: string): OfferingDraft | null {
  try {
    const raw = localStorage.getItem(keyFor(userId, companyId));
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d?.v !== 1 || typeof d.baseRevision !== "number" || typeof d.groups !== "object" || !d.groups) return null;
    return d as OfferingDraft;
  } catch {
    return null;
  }
}

export function storeDraft(userId: string, companyId: string, draft: OfferingDraft | null) {
  try {
    if (draft) localStorage.setItem(keyFor(userId, companyId), JSON.stringify(draft));
    else localStorage.removeItem(keyFor(userId, companyId));
  } catch {
    // Storage full or blocked: editing still works, it just won't survive a reload.
  }
}

/** Called on logout: no offerings draft outlives the session on this device. */
export function clearAllOfferingDrafts() {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) doomed.push(k);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
