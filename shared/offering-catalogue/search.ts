// Deterministic Arabic/English search over the catalogue (sectors,
// specializations, groups, listed items). No external service.
//
// Ranking: exact label (100) > label starts with the query (80) > every query
// word starts a word of the label (60) > every query word found in the group's
// original examples text (40). Ties: shallower level first, then catalogue order.
// Deprecated records are not searchable — they cannot be newly selected.

import { normalizeText, tokenVariants } from "./normalize";
import type { CatalogueIndex } from "./selection";

export type SearchKind = "sector" | "specialization" | "group" | "item";

export interface SearchHit {
  kind: SearchKind;
  id: string;
  /** The group a hit belongs to (for items and groups); undefined for sectors/specializations. */
  groupId?: string;
  score: number;
}

interface Entry {
  kind: SearchKind;
  id: string;
  groupId?: string;
  order: number;
  labels: string[];        // normalized en + ar
  words: string[][];       // word variants per label word
  extra: string[][];       // examples text words (groups only)
}

const KIND_RANK: Record<SearchKind, number> = { sector: 0, specialization: 1, group: 2, item: 3 };

const wordsOf = (s: string) => (s ? s.split(" ").map(tokenVariants) : []);

export interface CatalogueSearch {
  search(query: string, limit?: number): SearchHit[];
}

export function createCatalogueSearch(idx: CatalogueIndex): CatalogueSearch {
  const entries: Entry[] = [];
  let order = 0;
  const add = (kind: SearchKind, id: string, en: string, ar: string, groupId?: string, examples?: string) => {
    const labels = [normalizeText(en), normalizeText(ar)].filter(Boolean);
    entries.push({
      kind, id, groupId, order: order++, labels,
      words: labels.flatMap(wordsOf),
      extra: examples ? wordsOf(normalizeText(examples)) : [],
    });
  };
  const c = idx.catalogue;
  for (const s of c.sectors) if (s.status === "active") add("sector", s.id, s.en, s.ar);
  for (const s of c.specializations) if (s.status === "active") add("specialization", s.id, s.en, s.ar);
  for (const g of c.groups) if (g.status === "active") add("group", g.id, g.en, g.ar, g.id, g.examples);
  for (const i of c.items) if (i.status === "active" && idx.groups.get(i.groupId)?.status === "active") add("item", i.id, i.en, i.ar, i.groupId);

  const wordMatches = (qVariants: string[], words: string[][]) =>
    words.some((variants) => variants.some((w) => qVariants.some((q) => w.startsWith(q))));

  return {
    search(query, limit = 60) {
      const q = normalizeText(query);
      if (!q) return [];
      const qWords = q.split(" ").map(tokenVariants);
      const hits: (SearchHit & { order: number })[] = [];
      for (const e of entries) {
        let score = 0;
        if (e.labels.includes(q)) score = 100;
        else if (e.labels.some((l) => l.startsWith(q))) score = 80;
        else if (qWords.every((qv) => wordMatches(qv, e.words))) score = 60;
        else if (e.extra.length && qWords.every((qv) => wordMatches(qv, e.extra))) score = 40;
        if (score) hits.push({ kind: e.kind, id: e.id, groupId: e.groupId, score, order: e.order });
      }
      hits.sort((a, b) => b.score - a.score || KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.order - b.order);
      return hits.slice(0, limit).map(({ order: _o, ...h }) => h);
    },
  };
}
