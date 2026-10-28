// Offerings editor state (client/src/lib/offering-draft.ts): the selection
// semantics the vendor experiences, and draft isolation per user + organization.

import { describe, it, expect, beforeEach } from "vitest";
import catalogueJson from "../shared/offering-catalogue/catalogue.json";
import { indexCatalogue } from "../shared/offering-catalogue/selection";
import type { OfferingCatalogue } from "../shared/offering-catalogue/types";
import {
  addGroup, afterSaveConfirmed, clearAllOfferingDrafts, keepLocalOverLatest, startDraft, draftFromServer, draftSelection, emptyAddedGroups, groupState, loadDraft,
  removeGroups, restoreGroups, sameAsServer, setAllItems, setDeclared, storeDraft, toggleItem,
} from "../client/src/lib/offering-draft";

const idx = indexCatalogue(catalogueJson as unknown as OfferingCatalogue);
const G = "BID-D17-F01-G01"; // Air Conditioning & Ventilation Equipment: 4 listed items
const W = "BID-D01-F01-G03"; // Market entry advisory: no listed items
const empty = () => draftFromServer([], 0);

// A minimal Storage for the node test environment.
class MemoryStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
beforeEach(() => { (globalThis as any).localStorage = new MemoryStorage(); });

describe("selection semantics", () => {
  it("first addition selects the group's current listed items; a group without items is added as a declaration", () => {
    const d = addGroup(addGroup(empty(), G, idx), W, idx);
    expect(groupState(d, G)).toEqual({ added: true, itemIds: idx.activeItems(G).map((i) => i.id), declared: false });
    expect(groupState(d, W)).toEqual({ added: true, itemIds: [], declared: true });
    expect(idx.activeItems(G)).toHaveLength(4);
  });

  it("unticking gives a partial group; Clear all leaves no active offering unless declared", () => {
    let d = addGroup(empty(), G, idx);
    d = toggleItem(d, G, `${G}-I02`, false);
    expect(draftSelection(d).groups[0].itemIds).toHaveLength(3);
    d = setAllItems(d, G, idx, false);
    expect(draftSelection(d).groups).toEqual([]);
    expect(emptyAddedGroups(d)).toEqual([G]);
    d = setDeclared(d, G, true); // "falls within this group but is not listed"
    expect(draftSelection(d).groups).toEqual([{ groupId: G, itemIds: [], declared: true }]);
  });

  it("a group declaration never expands into its listed items", () => {
    let d = setAllItems(addGroup(empty(), G, idx), G, idx, false);
    d = setDeclared(d, G, true);
    expect(draftSelection(d).groups[0].itemIds).toEqual([]);
  });

  it("removing and re-adding within the same draft restores that configuration; removal removes its offerings", () => {
    let d = toggleItem(addGroup(empty(), G, idx), G, `${G}-I01`, false);
    const configured = groupState(d, G);
    d = removeGroups(d, [G]);
    expect(draftSelection(d).groups).toEqual([]);
    d = addGroup(d, G, idx);
    expect(groupState(d, G)).toEqual(configured);
  });

  it("undo restores exactly what an explicit removal took away", () => {
    const before = addGroup(addGroup(empty(), G, idx), W, idx);
    const snapshot = { [G]: before.groups[G], [W]: before.groups[W] };
    const removed = removeGroups(before, [G, W]);
    expect(draftSelection(removed).groups).toEqual([]);
    expect(draftSelection(restoreGroups(removed, snapshot))).toEqual(draftSelection(before));
  });

  it("items added to the catalogue later are never ticked for a saved group, even after editing and saving", () => {
    // Stored before the catalogue grew: only I01.
    const saved = draftFromServer([{ groupId: G, itemIds: [`${G}-I01`], declared: false }], 4);
    const grown = structuredClone(catalogueJson) as unknown as OfferingCatalogue;
    grown.items.push({ id: `${G}-I05`, groupId: G, src: "New thing", en: "New thing", ar: "شي جديد", status: "active", provenance: "source_example" });
    grown.groups.find((g) => g.id === G)!.items.push(`${G}-I05`);
    const gIdx = indexCatalogue(grown);
    const edited = toggleItem(addGroup(saved, G, gIdx), G, `${G}-I02`, true); // addGroup on an added group is a no-op
    expect(draftSelection(edited).groups[0].itemIds).toEqual([`${G}-I01`, `${G}-I02`]);
    expect(sameAsServer(saved, [{ groupId: G, itemIds: [`${G}-I01`], declared: false }])).toBe(true);
  });

  it("Select all keeps a held item that is no longer listed", () => {
    const d = draftFromServer([{ groupId: G, itemIds: ["BID-D17-F01-G01-I99"], declared: false }], 1);
    const all = setAllItems(d, G, idx, true);
    expect(groupState(all, G)!.itemIds).toContain("BID-D17-F01-G01-I99");
    expect(groupState(all, G)!.itemIds).toHaveLength(5);
  });
});

describe("draft persistence", () => {
  it("is isolated by user and organization", () => {
    const d = addGroup(empty(), W, idx);
    storeDraft("user-a", "org-1", d);
    expect(loadDraft("user-a", "org-1")).toEqual(d);
    expect(loadDraft("user-b", "org-1")).toBeNull();
    expect(loadDraft("user-a", "org-2")).toBeNull();
  });

  it("logout clears every offerings draft and nothing else", () => {
    storeDraft("user-a", "org-1", empty());
    storeDraft("user-b", "org-2", empty());
    localStorage.setItem("language", "ar");
    clearAllOfferingDrafts();
    expect(loadDraft("user-a", "org-1")).toBeNull();
    expect(loadDraft("user-b", "org-2")).toBeNull();
    expect(localStorage.getItem("language")).toBe("ar");
  });

  it("ignores a corrupted or foreign-shaped draft", () => {
    localStorage.setItem("bid:offerings-draft:v1:u:o", "{not json");
    expect(loadDraft("u", "o")).toBeNull();
    localStorage.setItem("bid:offerings-draft:v1:u:o", JSON.stringify({ v: 2, groups: {} }));
    expect(loadDraft("u", "o")).toBeNull();
  });
});

describe("OFC-2: re-adding restores the exact earlier configuration", () => {
  it("Add → Clear all → Remove → Add keeps zero items (no reselection)", () => {
    let d = addGroup(empty(), G, idx);
    d = setAllItems(d, G, idx, false);
    d = removeGroups(d, [G]);
    d = addGroup(d, G, idx);
    expect(groupState(d, G)).toEqual({ added: true, itemIds: [], declared: false });
    expect(draftSelection(d).groups).toEqual([]);
  });

  it("a group without listed items whose declaration was unticked comes back unticked", () => {
    let d = setDeclared(addGroup(empty(), W, idx), W, false);
    d = addGroup(removeGroups(d, [W]), W, idx);
    expect(groupState(d, W)).toEqual({ added: true, itemIds: [], declared: false });
  });

  it("the default selection still applies to a first addition", () => {
    expect(groupState(addGroup(empty(), G, idx), G)!.itemIds).toHaveLength(4);
  });
});

describe("OFC-1: a confirmed save never overwrites edits made while it was in flight", () => {
  const sentDraft = addGroup(empty(), G, idx);
  const sent = draftSelection(sentDraft);
  const server = { groups: sent.groups, revision: 1 };

  it("an unchanged draft is replaced by the confirmed server state", () => {
    expect(afterSaveConfirmed(sentDraft, sent, server)).toEqual({ draft: draftFromServer(sent.groups, 1), newerEdits: false });
  });

  it("newer edits stay, as an unsaved draft on the new revision", () => {
    const edited = toggleItem(sentDraft, G, `${G}-I02`, false);
    const r = afterSaveConfirmed(edited, sent, server);
    expect(r.newerEdits).toBe(true);
    expect(r.draft.baseRevision).toBe(1);
    expect(draftSelection(r.draft)).toEqual(draftSelection(edited));
    expect(sameAsServer(r.draft, server.groups)).toBe(false); // still shown as unsaved
  });

  it("an edit undone before the response counts as no newer edit", () => {
    const back = toggleItem(toggleItem(sentDraft, G, `${G}-I02`, false), G, `${G}-I02`, true);
    expect(afterSaveConfirmed(back, sent, server).newerEdits).toBe(false);
  });
});

describe("OFC-3: a stale local draft is kept for an explicit choice", () => {
  const serverGroups = [{ groupId: W, itemIds: [], declared: true }];
  const local = { ...addGroup(empty(), G, idx), baseRevision: 0 };

  it("an older-revision draft with different content is neither applied nor dropped", () => {
    const r = startDraft(local, { groups: serverGroups, revision: 3 });
    expect(r.kind).toBe("stale");
    if (r.kind !== "stale") return;
    expect(r.local).toEqual(local);
    expect(draftSelection(r.server).groups).toEqual(serverGroups);
  });

  it("keeping it rebases on the latest revision so the next save is an explicit overwrite", () => {
    const kept = keepLocalOverLatest(local, 3);
    expect([kept.baseRevision, draftSelection(kept)]).toEqual([3, draftSelection(local)]);
  });

  it("same-revision drafts are restored; drafts identical to the server hold no work and are dropped; no draft starts from the server", () => {
    expect(startDraft({ ...local, baseRevision: 3 }, { groups: serverGroups, revision: 3 }).kind).toBe("restored");
    const same = draftFromServer(serverGroups, 1);
    expect(startDraft(same, { groups: serverGroups, revision: 3 })).toMatchObject({ kind: "server", discardStored: true });
    expect(startDraft(null, { groups: serverGroups, revision: 3 })).toMatchObject({ kind: "server", discardStored: false });
  });
});
