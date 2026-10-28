// Vendor offerings editor (BID-OFFERING-CLASSIFICATION): main sector →
// specialized sector → offering group → tick the listed items.
//
// Everything is local until "Save": ticking never calls the network. "Saved"
// appears only after the server confirms. Semantics live in
// client/src/lib/offering-draft.ts; the server enforces the rules again.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, ChevronDown, ChevronRight, Loader2, Minus, Search, X, Plus, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/lib/auth";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { label, offeringsQueryKey, useOfferingCatalogue, type LoadedCatalogue } from "@/lib/offering-catalogue";
import {
  addGroup, afterSaveConfirmed, draftFromServer, draftSelection, emptyAddedGroups, groupState, keepLocalOverLatest, loadDraft,
  removeGroups, restoreGroups, sameAsServer, setAllItems, setDeclared, startDraft, storeDraft, toggleItem, type DraftGroup, type OfferingDraft,
} from "@/lib/offering-draft";
import { rollup, type GroupSelection } from "@shared/offering-catalogue/selection";
import type { CatalogueGroup } from "@shared/offering-catalogue/types";

export type VendorRegistrationStatus = "legacy_unclassified" | "requester_only" | "pending" | "registered";

export interface OfferingsResponse {
  status: VendorRegistrationStatus;
  revision: number;
  catalogueVersion: string | null;
  registeredAt: string | null;
  updatedAt: string | null;
  groups: GroupSelection[];
  canEdit: boolean;
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; completed: boolean }
  /** OFC-1: the request saved what was sent, but the vendor changed more while it was in flight. */
  | { kind: "savedWithNewer"; completed: boolean }
  | { kind: "invalid"; messageKey: string }
  | { kind: "error"; message?: string }
  | { kind: "conflict" };

interface Props {
  companyId: string;
  /** Onboarding shows a single primary "Save and continue". */
  mode: "onboarding" | "settings";
  onSaved?: (state: OfferingsResponse, completedRegistration: boolean) => void;
  /** Extra actions beside the save button (e.g. onboarding's requester-only link). */
  footerExtra?: ReactNode;
}

// ── Tri-state checkbox (mixed = some listed items ticked) ─────────────────────
function TriCheckbox({ checked, onChange, id, ariaLabel, disabled }: {
  checked: boolean | "indeterminate"; onChange: (v: boolean) => void; id?: string; ariaLabel?: string; disabled?: boolean;
}) {
  return (
    <CheckboxPrimitive.Root
      id={id}
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onCheckedChange={(v) => onChange(v === true)}
      className="peer h-5 w-5 shrink-0 rounded-[5px] border-2 border-foreground/40 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE3C01] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#FE3C01] data-[state=checked]:border-[#FE3C01] data-[state=indeterminate]:bg-[#FE3C01] data-[state=indeterminate]:border-[#FE3C01] text-white flex items-center justify-center"
    >
      <CheckboxPrimitive.Indicator>
        {checked === "indeterminate" ? <Minus className="h-3.5 w-3.5" strokeWidth={3} /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

function CheckRow({ id, checked, onChange, children, disabled, testId }: {
  id: string; checked: boolean | "indeterminate"; onChange: (v: boolean) => void; children: ReactNode; disabled?: boolean; testId?: string;
}) {
  return (
    <label htmlFor={id} className={cn("flex items-start gap-3 min-h-11 py-2.5 px-2 -mx-2 rounded-md cursor-pointer hover:bg-muted/60", disabled && "cursor-default hover:bg-transparent")} data-testid={testId}>
      <span className="pt-0.5"><TriCheckbox id={id} checked={checked} onChange={onChange} disabled={disabled} /></span>
      <span className="text-sm leading-snug min-w-0 break-words">{children}</span>
    </label>
  );
}

const TYPE_KEYS: Record<string, string> = {
  "Service": "offerings.typeService", "Physical Product": "offerings.typeProduct", "Digital Product": "offerings.typeDigital",
  "Works": "offerings.typeWorks", "Rental": "offerings.typeRental",
};

/** "Sector › Specialization", with the separator pointing in the reading direction (flipped in RTL). */
function Crumb({ parts }: { parts: string[] }) {
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <ChevronRight aria-hidden className="inline h-3 w-3 mx-1 align-[-2px] rtl:rotate-180" />}
          {p}
        </span>
      ))}
    </>
  );
}

// ── Group card ────────────────────────────────────────────────────────────────
function GroupCard({ group, cat, draft, editable, justAdded, breadcrumb, highlight, onChange, onRemove }: {
  group: CatalogueGroup; cat: LoadedCatalogue; draft: OfferingDraft; editable: boolean; justAdded: boolean;
  breadcrumb?: string[]; highlight?: Set<string>;
  onChange: (next: OfferingDraft, opts?: { added?: string }) => void; onRemove: (groupId: string) => void;
}) {
  const { t, language } = useI18n();
  const g = groupState(draft, group.id);
  const listed = cat.idx.activeItems(group.id);
  const heldDeprecated = g ? g.itemIds.map((i) => cat.idx.items.get(i)!).filter((i) => i && i.status !== "active") : [];
  const ticked = g ? listed.filter((i) => g.itemIds.includes(i.id)).length : 0;
  const allState: boolean | "indeterminate" = ticked === 0 ? false : ticked === listed.length ? true : "indeterminate";
  const effective = !!g && (g.itemIds.length > 0 || g.declared);
  const headingId = `og-${group.id}`;

  // Keyboard focus after Add/Remove. React keeps the same <button> node when
  // "Add" turns into "Remove", so a second Enter would undo the addition: after
  // adding, focus moves to the group's first checkbox. When focus was dropped to
  // the page (e.g. removal from the summary), it returns to this card's control.
  const sectionRef = useRef<HTMLElement>(null);
  const wasAdded = useRef(!!g);
  useEffect(() => {
    if (wasAdded.current === !!g) return;
    wasAdded.current = !!g;
    const active = document.activeElement;
    const lost = !active || active === document.body;
    const inCard = !!active && !!sectionRef.current?.contains(active);
    if (!lost && !(g && inCard)) return;
    const target = sectionRef.current?.querySelector<HTMLElement>(g ? "button[role=checkbox]" : "[data-testid=button-add-group]");
    target?.focus({ preventScroll: true });
  }, [g]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby={headingId}
      className={cn("rounded-xl border bg-card p-3 sm:p-4", g ? "border-[#FE3C01]/40" : "border-border")}
      data-testid={`group-${group.id}`}
      data-added={g ? "true" : "false"}
    >
      {breadcrumb && <p className="text-xs text-muted-foreground mb-1 break-words"><Crumb parts={breadcrumb} /></p>}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h4 id={headingId} className="font-semibold text-sm leading-snug break-words">{label(group, language)}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(TYPE_KEYS[group.type] ?? "offerings.typeService")}
            {g && listed.length > 0 && <> · <span data-testid="group-count">{t("offerings.countOf", { n: ticked, total: listed.length })}</span></>}
            {g && g.declared && <> · {listed.length > 0 ? t("offerings.unlistedIncluded") : t("offerings.declaredBadge")}</>}
          </p>
        </div>
        {editable && (g ? (
          <Button type="button" variant="ghost" size="sm" className="min-h-11 shrink-0 text-muted-foreground"
            onClick={() => onRemove(group.id)} aria-label={t("offerings.removeGroupAria", { name: label(group, language) })} data-testid="button-remove-group">
            <X className="h-4 w-4 me-1" />{t("offerings.remove")}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" className="min-h-11 shrink-0 border-[#FE3C01]/50 text-[#FE3C01] hover:bg-[#FE3C01]/5"
            onClick={() => onChange(addGroup(draft, group.id, cat.idx), { added: group.id })}
            aria-label={t(listed.length ? "offerings.addGroupAria" : "offerings.declareGroupAria", { name: label(group, language) })}
            data-testid="button-add-group">
            <Plus className="h-4 w-4 me-1" />{listed.length ? t("offerings.add") : t("offerings.weOfferThis")}
          </Button>
        ))}
      </div>

      {!g && listed.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2 break-words">
          {t("offerings.includesExamples")}: {listed.map((i) => label(i, language)).join(language === "ar" ? "، " : ", ")}
        </p>
      )}

      {g && (
        <div className="mt-2">
          {justAdded && listed.length > 0 && (
            <p role="status" className="text-xs rounded-md bg-[#FE3C01]/[0.07] text-foreground px-3 py-2 mb-2" data-testid="added-hint">
              {t("offerings.addedHint")}
            </p>
          )}
          {listed.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border pb-1 mb-1">
                <CheckRow id={`${group.id}-all`} checked={allState} disabled={!editable}
                  onChange={(v) => onChange(setAllItems(draft, group.id, cat.idx, v))} testId="checkbox-select-all">
                  <span className="font-medium">{t("offerings.selectAll")}</span>
                </CheckRow>
                {editable && ticked > 0 && (
                  <Button type="button" variant="link" size="sm" className="min-h-11 px-1 text-muted-foreground"
                    onClick={() => onChange(setAllItems(draft, group.id, cat.idx, false))} data-testid="button-clear-all">
                    {t("offerings.clearAll")}
                  </Button>
                )}
              </div>
              <ul className="grid gap-0" aria-label={t("offerings.listedItemsAria", { name: label(group, language) })}>
                {listed.map((item) => (
                  <li key={item.id} className={cn(highlight?.has(item.id) && "bg-yellow-50 dark:bg-yellow-900/20 rounded-md")}>
                    <CheckRow id={item.id} checked={g.itemIds.includes(item.id)} disabled={!editable}
                      onChange={(v) => onChange(toggleItem(draft, group.id, item.id, v))} testId={`item-${item.id}`}>
                      {label(item, language)}
                    </CheckRow>
                  </li>
                ))}
              </ul>
            </>
          )}
          {heldDeprecated.map((item) => (
            <CheckRow key={item.id} id={item.id} checked disabled={!editable}
              onChange={(v) => onChange(toggleItem(draft, group.id, item.id, v))} testId={`item-${item.id}`}>
              {label(item, language)} <span className="text-xs text-muted-foreground">({t("offerings.noLongerListed")})</span>
            </CheckRow>
          ))}
          <div className={cn(listed.length > 0 && "mt-1 pt-1 border-t border-border")}>
            <CheckRow id={`${group.id}-declared`} checked={g.declared} disabled={!editable}
              onChange={(v) => onChange(setDeclared(draft, group.id, v))} testId="checkbox-declared">
              {listed.length > 0 ? t("offerings.notListedDeclaration") : t("offerings.wholeGroupDeclaration")}
            </CheckRow>
          </div>
          {!effective && (
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mt-1" data-testid="group-empty-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{t("offerings.groupEmptyWarning")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ── Editor ────────────────────────────────────────────────────────────────────
export function OfferingsEditor({ companyId, mode, onSaved, footerExtra }: Props) {
  const { t, language } = useI18n();
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const queryClient = useQueryClient();
  const catalogue = useOfferingCatalogue();
  const server = useQuery<OfferingsResponse>({
    queryKey: offeringsQueryKey(companyId),
    queryFn: async () => (await apiRequest("GET", `/api/companies/${companyId}/offerings`)).json(),
    staleTime: 0,
  });

  const [draft, setDraft] = useState<OfferingDraft | null>(null);
  const [restoredNotice, setRestoredNotice] = useState(false);
  const [query, setQuery] = useState("");
  const [openSectors, setOpenSectors] = useState<Set<string>>(new Set());
  const [openSpecs, setOpenSpecs] = useState<Set<string>>(new Set());
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [undo, setUndo] = useState<{ snapshot: Record<string, DraftGroup | undefined>; count: number } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ ids: string[]; name: string } | null>(null);
  const [activateConfirmed, setActivateConfirmed] = useState(false);
  /** OFC-3: an unsaved local draft from an older revision, waiting for the vendor's explicit choice. */
  const [stale, setStale] = useState<OfferingDraft | null>(null);
  const draftKeyOwner = useRef<string>("");
  // The latest draft, read when a save response arrives (edits may have happened while it was in flight).
  const draftRef = useRef<OfferingDraft | null>(null);
  draftRef.current = draft;

  // Start the draft once both the catalogue and the server state are here (see startDraft).
  useEffect(() => {
    if (!server.data || !userId) return;
    const owner = `${userId}:${companyId}`;
    if (draftKeyOwner.current === owner && draft) return;
    draftKeyOwner.current = owner;
    const start = startDraft(loadDraft(userId, companyId), server.data);
    if (start.kind === "server") {
      if (start.discardStored) storeDraft(userId, companyId, null);
      setDraft(start.draft);
    } else if (start.kind === "restored") {
      setDraft(start.draft);
      setRestoredNotice(true);
    } else {
      setDraft(start.server); // shown read-only; the stored draft is left untouched until the vendor decides
      setStale(start.local);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server.data, userId, companyId]);

  const canEdit = !!server.data?.canEdit;
  const editable = canEdit && !stale;
  const dirty = !!(draft && server.data && !sameAsServer(draft, server.data.groups));

  const change = useCallback((next: OfferingDraft, opts?: { added?: string }) => {
    draftRef.current = next;
    setDraft(next);
    if (opts?.added) setJustAdded((s) => new Set(s).add(opts.added!));
    if (save.kind !== "saving") setSave({ kind: "idle" });
    storeDraft(userId, companyId, next);
  }, [userId, companyId, save.kind]);

  const removeWithUndo = useCallback((ids: string[]) => {
    if (!draft) return;
    const snapshot: Record<string, DraftGroup | undefined> = {};
    for (const id of ids) snapshot[id] = draft.groups[id];
    change(removeGroups(draft, ids));
    setUndo({ snapshot, count: ids.length });
  }, [draft, change]);

  const cat = catalogue.data;
  const selection = useMemo(() => (draft ? draftSelection(draft) : { groups: [] }), [draft]);
  const totals = useMemo(() => (cat ? rollup(selection, cat.idx) : null), [selection, cat]);
  const emptyAdded = useMemo(() => (draft ? emptyAddedGroups(draft) : []), [draft]);

  const hits = useMemo(() => (cat && query.trim() ? cat.search.search(query, 80) : []), [cat, query]);

  const doSave = async (overwriteRevision?: number) => {
    if (!draft || !server.data) return;
    if (selection.groups.length === 0) {
      setSave({ kind: "invalid", messageKey: server.data.status === "registered" ? "offerings.lastOfferingRequired" : "offerings.atLeastOne" });
      return;
    }
    const needsActivation = server.data.status === "requester_only";
    if (needsActivation && !activateConfirmed) {
      setSave({ kind: "invalid", messageKey: "offerings.confirmActivation" });
      return;
    }
    setSave({ kind: "saving" });
    const sent = selection;
    try {
      const res = await apiRequest("PUT", `/api/companies/${companyId}/offerings`, {
        expectedRevision: overwriteRevision ?? draft.baseRevision,
        groups: sent.groups,
        ...(needsActivation ? { activateVendor: true } : {}),
      });
      const body = (await res.json()) as OfferingsResponse & { completedRegistration: boolean };
      queryClient.setQueryData(offeringsQueryKey(companyId), body);
      // OFC-1: edits made while the request was in flight are kept, never overwritten or reported as saved.
      const { draft: next, newerEdits } = afterSaveConfirmed(draftRef.current ?? draft, sent, body);
      draftRef.current = next;
      setDraft(next);
      storeDraft(userId, companyId, newerEdits ? next : null);
      if (newerEdits) {
        setSave({ kind: "savedWithNewer", completed: body.completedRegistration });
        return; // no navigation while newer edits remain unsaved
      }
      setJustAdded(new Set());
      setUndo(null);
      setRestoredNotice(false);
      setSave({ kind: "saved", completed: body.completedRegistration });
      onSaved?.(body, body.completedRegistration);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined;
      if (code === "OFFERINGS_CONFLICT") setSave({ kind: "conflict" });
      else if (code === "LAST_OFFERING_REQUIRED") setSave({ kind: "invalid", messageKey: "offerings.lastOfferingRequired" });
      else if (code === "OFFERINGS_REQUIRED") setSave({ kind: "invalid", messageKey: "offerings.atLeastOne" });
      else if (code === "INVALID_SELECTION") setSave({ kind: "invalid", messageKey: "offerings.invalidSelection" });
      else if (code === "ROLE_REQUIRED") setSave({ kind: "invalid", messageKey: "offerings.roleRequired" });
      else setSave({ kind: "error" });
    }
  };

  const loadLatest = async () => {
    const latest = await server.refetch();
    if (latest.data) {
      const fresh = draftFromServer(latest.data.groups, latest.data.revision);
      setDraft(fresh);
      storeDraft(userId, companyId, null);
      setSave({ kind: "idle" });
    }
  };

  const keepMineAndSave = async () => {
    const latest = await server.refetch();
    if (latest.data) await doSave(latest.data.revision);
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (catalogue.isError || server.isError) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <p className="font-medium">{t(catalogue.isError ? "offerings.catalogueLoadError" : "offerings.loadError")}</p>
        <Button type="button" variant="outline" className="mt-3 min-h-11"
          onClick={() => { if (catalogue.isError) catalogue.refetch(); if (server.isError) server.refetch(); }} data-testid="button-retry-load">
          <RotateCcw className="h-4 w-4 me-2" />{t("offerings.retry")}
        </Button>
      </div>
    );
  }
  if (!cat || !server.data || !draft) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center" role="status" data-testid="offerings-loading">
        <Loader2 className="h-4 w-4 animate-spin" />{t("offerings.loading")}
      </div>
    );
  }

  const status = server.data.status;
  const sectorCount = (id: string) => totals?.bySector.get(id) ?? 0;
  const specCount = (id: string) => totals?.bySpecialization.get(id) ?? 0;
  const toggle = (set: Set<string>, id: string) => { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); return n; };

  const sectors = cat.idx.catalogue.sectors.filter((s) => s.status === "active");
  const specsOf = (sid: string) => cat.idx.catalogue.specializations.filter((f) => f.sectorId === sid && f.status === "active");
  const groupsOf = (fid: string) => cat.idx.catalogue.groups.filter((g) => g.specializationId === fid && g.status === "active");
  const pathOf = (g: CatalogueGroup) => {
    const s = cat.idx.sectors.get(g.sectorId)!;
    const f = cat.idx.specializations.get(g.specializationId)!;
    return [label(s, language), label(f, language)];
  };
  const cardProps = { cat, draft, editable, onChange: change, onRemove: (id: string) => removeWithUndo([id]) };

  // Search results: one card per group (item hits highlight the item); sectors/specializations open the tree.
  const resultGroups: { group: CatalogueGroup; highlight: Set<string> }[] = [];
  const navHits: { kind: "sector" | "specialization"; id: string }[] = [];
  if (query.trim()) {
    const byGroup = new Map<string, Set<string>>();
    for (const h of hits) {
      if (h.kind === "sector" || h.kind === "specialization") { if (navHits.length < 8) navHits.push({ kind: h.kind, id: h.id }); continue; }
      const set = byGroup.get(h.groupId!) ?? new Set<string>();
      if (h.kind === "item") set.add(h.id);
      byGroup.set(h.groupId!, set);
    }
    for (const [gid, hl] of [...byGroup].slice(0, 30)) resultGroups.push({ group: cat.idx.groups.get(gid)!, highlight: hl });
  }
  const openInTree = (kind: "sector" | "specialization", id: string) => {
    const sid = kind === "sector" ? id : cat.idx.specializations.get(id)!.sectorId;
    setOpenSectors((s) => new Set(s).add(sid));
    if (kind === "specialization") setOpenSpecs((s) => new Set(s).add(id));
    setQuery("");
  };

  const summaryBySpec = new Map<string, GroupSelection[]>();
  for (const g of selection.groups) {
    const fid = cat.idx.groups.get(g.groupId)?.specializationId;
    if (!fid) continue;
    summaryBySpec.set(fid, [...(summaryBySpec.get(fid) ?? []), g]);
  }

  const statusLine =
    status === "registered" ? t("offerings.statusRegistered")
    : status === "pending" ? t("offerings.statusPending")
    : status === "requester_only" ? t("offerings.statusRequesterOnly")
    : t("offerings.statusLegacy");

  return (
    <div className="space-y-4 pb-28" data-testid="offerings-editor">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground leading-relaxed">{t("offerings.intro")}</p>
        <p className="text-xs font-medium rounded-md bg-muted px-3 py-2" data-testid="offerings-status" data-status={status}>{statusLine}</p>
        {!canEdit && <p className="text-xs text-muted-foreground" role="note">{t("offerings.readOnlyNote")}</p>}
        {stale && canEdit && (
          <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-3 py-3 text-sm space-y-2" data-testid="stale-draft">
            <p className="font-medium">{t("offerings.staleDraftTitle")}</p>
            <p className="text-xs">{t("offerings.staleDraftBody", { groups: draftSelection(stale).groups.length })}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="min-h-11 bg-[#FE3C01] hover:bg-[#E83501]" data-testid="button-keep-local"
                onClick={() => { const next = keepLocalOverLatest(stale, server.data!.revision); setStale(null); change(next); }}>
                {t("offerings.keepLocal")}
              </Button>
              <Button type="button" variant="outline" className="min-h-11" data-testid="button-discard-local"
                onClick={() => { storeDraft(userId, companyId, null); setStale(null); }}>
                {t("offerings.discardLocal")}
              </Button>
            </div>
          </div>
        )}
        {restoredNotice && (
          <p role="status" className="text-xs rounded-md bg-blue-50 dark:bg-blue-900/20 px-3 py-2" data-testid="restored-notice">{t("offerings.restoredDraft")}</p>
        )}
      </div>

      {editable && (
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={t("offerings.searchPlaceholder")} aria-label={t("offerings.searchPlaceholder")}
            className="ps-9 min-h-11 text-base sm:text-sm" data-testid="input-offerings-search"
          />
        </div>
      )}

      {/* Browse or search */}
      {editable && query.trim() ? (
        <div aria-live="polite" className="space-y-3" data-testid="search-results">
          <p className="text-xs text-muted-foreground">
            {hits.length === 0 ? t("offerings.noResults") : t("offerings.resultsCount", { n: resultGroups.length + navHits.length })}
            {selection.groups.length > 0 && <> · {t("offerings.hiddenKept")}</>}
          </p>
          {navHits.map((h) => {
            const rec = h.kind === "sector" ? cat.idx.sectors.get(h.id)! : cat.idx.specializations.get(h.id)!;
            const parent = h.kind === "specialization" ? cat.idx.sectors.get((rec as any).sectorId) : null;
            return (
              <button key={h.id} type="button" onClick={() => openInTree(h.kind, h.id)}
                className="w-full text-start rounded-lg border border-border px-3 py-2.5 min-h-11 hover:bg-muted text-sm" data-testid={`nav-hit-${h.id}`}>
                {parent && <span className="text-xs text-muted-foreground block">{label(parent, language)}</span>}
                <span className="font-medium">{label(rec, language)}</span>
                <span className="text-xs text-muted-foreground ms-2">{t("offerings.browse")}</span>
              </button>
            );
          })}
          {resultGroups.map(({ group, highlight }) => (
            <GroupCard key={group.id} group={group} breadcrumb={pathOf(group)} highlight={highlight} justAdded={justAdded.has(group.id)} {...cardProps} />
          ))}
        </div>
      ) : (
        <ul className="space-y-2" aria-label={t("offerings.sectorsAria")} data-testid="sector-tree">
          {sectors.map((s) => {
            const open = openSectors.has(s.id);
            const n = sectorCount(s.id);
            return (
              <li key={s.id} className="rounded-xl border border-border bg-card">
                <button type="button" aria-expanded={open} aria-controls={`sec-${s.id}`}
                  onClick={() => setOpenSectors((x) => toggle(x, s.id))}
                  className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 min-h-12 text-start" data-testid={`sector-${s.id}`}>
                  <span className="flex-1 min-w-0 font-medium text-sm break-words">{label(s, language)}</span>
                  {n > 0 && <span className="text-xs rounded-full bg-[#FE3C01]/10 text-[#FE3C01] px-2 py-0.5 shrink-0" aria-label={t("offerings.groupsSelectedAria", { n })}>{n}</span>}
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground motion-safe:transition-transform", open && "rotate-180")} aria-hidden />
                </button>
                {open && (
                  <ul id={`sec-${s.id}`} className="border-t border-border px-2 sm:px-3 py-2 space-y-1">
                    {specsOf(s.id).map((f) => {
                      const fo = openSpecs.has(f.id);
                      const fn = specCount(f.id);
                      return (
                        <li key={f.id}>
                          <button type="button" aria-expanded={fo} aria-controls={`spec-${f.id}`}
                            onClick={() => setOpenSpecs((x) => toggle(x, f.id))}
                            className="w-full flex items-center gap-3 px-2 py-2.5 min-h-11 rounded-md hover:bg-muted text-start" data-testid={`spec-${f.id}`}>
                            <span className="flex-1 min-w-0 text-sm break-words">{label(f, language)}</span>
                            {fn > 0 && <span className="text-xs rounded-full bg-[#FE3C01]/10 text-[#FE3C01] px-2 py-0.5 shrink-0" aria-label={t("offerings.groupsSelectedAria", { n: fn })}>{fn}</span>}
                            <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground motion-safe:transition-transform", fo && "rotate-180")} aria-hidden />
                          </button>
                          {fo && (
                            <div id={`spec-${f.id}`} className="grid gap-2 py-2 ps-1 sm:ps-2">
                              {groupsOf(f.id).map((g) => (
                                <GroupCard key={g.id} group={g} justAdded={justAdded.has(g.id)} {...cardProps} />
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Summary */}
      <section aria-labelledby="offerings-summary-h" className="rounded-xl border border-border bg-card p-3 sm:p-4" data-testid="offerings-summary">
        <h3 id="offerings-summary-h" className="font-semibold text-sm">{t("offerings.summaryTitle")}</h3>
        {selection.groups.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-1">{t("offerings.summaryEmpty")}</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {[...summaryBySpec].map(([fid, gs]) => {
              const f = cat.idx.specializations.get(fid)!;
              return (
                <li key={fid}>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground flex-1 min-w-0 break-words"><Crumb parts={[label(cat.idx.sectors.get(f.sectorId)!, language), label(f, language)]} /></p>
                    {editable && gs.length > 1 && (
                      <Button type="button" variant="link" size="sm" className="min-h-11 px-1 text-muted-foreground shrink-0"
                        onClick={() => setConfirmRemove({ ids: gs.map((g) => g.groupId), name: label(f, language) })} data-testid={`button-remove-spec-${fid}`}>
                        {t("offerings.removeAllInSpec", { n: gs.length })}
                      </Button>
                    )}
                  </div>
                  <ul className="mt-1 space-y-1">
                    {gs.map((g) => {
                      const grp = cat.idx.groups.get(g.groupId)!;
                      const listedN = cat.idx.activeItems(g.groupId).length;
                      return (
                        <li key={g.groupId} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 min-w-0 break-words">
                            {label(grp, language)}{" "}
                            <span className="text-xs text-muted-foreground">
                              ({listedN > 0 ? t("offerings.countOf", { n: g.itemIds.length, total: listedN }) : t("offerings.declaredBadge")}{listedN > 0 && g.declared ? ` + ${t("offerings.unlistedShort")}` : ""})
                            </span>
                          </span>
                          {editable && (
                            <>
                              <Button type="button" variant="ghost" size="sm" className="min-h-11 px-2 shrink-0"
                                onClick={() => { setQuery(""); setOpenSectors((s) => new Set(s).add(grp.sectorId)); setOpenSpecs((s) => new Set(s).add(grp.specializationId)); requestAnimationFrame(() => document.getElementById(`og-${grp.id}`)?.scrollIntoView({ block: "nearest" })); }}
                                aria-label={t("offerings.editGroupAria", { name: label(grp, language) })}>
                                {t("offerings.edit")}
                              </Button>
                              <Button type="button" variant="ghost" size="sm" className="min-h-11 px-2 shrink-0 text-muted-foreground"
                                onClick={() => removeWithUndo([g.groupId])} aria-label={t("offerings.removeGroupAria", { name: label(grp, language) })} data-testid={`summary-remove-${g.groupId}`}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {status === "requester_only" && editable && (
        <CheckRow id="activate-vendor" checked={activateConfirmed} onChange={setActivateConfirmed} testId="checkbox-activate-vendor">
          {t("offerings.activateVendor")}
        </CheckRow>
      )}

      {/* Undo after a removal */}
      {undo && (
        <div role="status" className="flex items-center gap-3 rounded-lg bg-foreground text-background px-3 py-2 text-sm" data-testid="undo-bar">
          <span className="flex-1">{t("offerings.removedN", { n: undo.count })}</span>
          <Button type="button" variant="secondary" size="sm" className="min-h-11"
            onClick={() => { if (draft) change(restoreGroups(draft, undo.snapshot)); setUndo(null); }} data-testid="button-undo">
            {t("offerings.undo")}
          </Button>
        </div>
      )}

      {/* Save bar */}
      {editable && (
        <div className="sticky bottom-0 z-10 -mx-1 px-1 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] bg-gradient-to-t from-background via-background to-background/80" data-testid="save-bar">
          <div className="rounded-xl border border-border bg-card shadow-sm p-3 flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[10rem] text-sm" aria-live="polite">
              <p className="font-medium" data-testid="selected-count">
                {t("offerings.selectedSummary", { groups: totals?.groups ?? 0, items: totals?.items ?? 0 })}
              </p>
              {save.kind === "saving" && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />{t("offerings.saving")}</p>}
              {save.kind === "saved" && !dirty && (
                <p className="text-xs text-[var(--state-won,#15803d)] flex items-center gap-1" data-testid="saved-indicator"><CheckCircle2 className="h-3.5 w-3.5" />{t(save.completed ? "offerings.savedCompleted" : "offerings.saved")}</p>
              )}
              {save.kind === "savedWithNewer" && <p className="text-xs text-amber-700 dark:text-amber-400" data-testid="saved-with-newer">{t("offerings.savedWithNewer")}</p>}
              {save.kind === "idle" && dirty && <p className="text-xs text-muted-foreground" data-testid="unsaved-indicator">{t("offerings.unsaved")}</p>}
              {save.kind === "idle" && emptyAdded.length > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">{t("offerings.emptyGroupsNote", { n: emptyAdded.length })}</p>}
              {save.kind === "invalid" && <p role="alert" className="text-xs text-destructive" data-testid="save-invalid">{t(save.messageKey)}</p>}
              {save.kind === "error" && <p role="alert" className="text-xs text-destructive" data-testid="save-error">{t("offerings.saveFailed")}</p>}
            </div>
            {save.kind === "conflict" ? (
              <div role="alert" className="flex flex-col gap-2 sm:items-end" data-testid="save-conflict">
                <p className="text-xs text-destructive">{t("offerings.conflict")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="min-h-11" onClick={loadLatest} data-testid="button-load-latest">{t("offerings.loadLatest")}</Button>
                  <Button type="button" className="min-h-11 bg-[#FE3C01] hover:bg-[#E83501]" onClick={keepMineAndSave} data-testid="button-keep-mine">{t("offerings.keepMine")}</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {footerExtra}
                <Button type="button" onClick={() => doSave()} disabled={save.kind === "saving" || (mode === "settings" && !dirty && save.kind !== "error")}
                  className="min-h-11 bg-[#FE3C01] hover:bg-[#E83501]" data-testid="button-save-offerings">
                  {save.kind === "saving" && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  {save.kind === "error" ? t("offerings.retrySave") : mode === "onboarding" ? t("offerings.saveAndContinue") : t("offerings.save")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("offerings.confirmRemoveTitle", { name: confirmRemove?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("offerings.confirmRemoveBody", { n: confirmRemove?.ids.length ?? 0 })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">{t("offerings.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="min-h-11 bg-destructive hover:bg-destructive/90" data-testid="button-confirm-remove"
              onClick={() => { if (confirmRemove) removeWithUndo(confirmRemove.ids); setConfirmRemove(null); }}>
              {t("offerings.removeConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
