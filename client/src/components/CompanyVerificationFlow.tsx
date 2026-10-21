import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, FileText, Loader2, RotateCcw, Send, ShieldCheck, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@/components/ObjectUploader";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { viewAuthenticatedFile } from "@/lib/downloadFile";
import { COMPANY_DOCUMENT_SLOTS } from "@/lib/company-documents";
import { identityChanged, readState, submitBlockers, type SlotPhase, type SubmitBlocker } from "@/lib/verification-flow-state";
import {
  CR_NUMBER_PATTERN,
  VERIFICATION_FILE_EXTENSIONS,
  VERIFICATION_MAX_FILE_MB,
  isVerificationLocked,
} from "@shared/company-verification";

/**
 * The whole company verification request in one place: legal details,
 * documents, then an explicit "Submit verification request". Saving and
 * uploading are drafts; only the submit button sends anything to review.
 * Server rules: server/routes/company-verification.ts and
 * server/lib/company-verification-store.ts. Submit-readiness rules:
 * client/src/lib/verification-flow-state.ts.
 */

interface VerifyInfo {
  legalName: string;
  crNumber: string;
  vatNumber: string;
  city: string;
  verificationStatus: string;
  rejectionReason?: string | null;
}

interface CompanyDoc {
  id: string;
  documentType: string;
  fileUrl: string;
  originalName: string | null;
}

const toAsciiDigits = (v: string) => v.replace(/[٠-٩۰-۹]/g, (d) => String((d.charCodeAt(0) & 0xf) % 10));

/** Server refusal codes → the localized sentence shown instead of the server's English. */
const ERROR_KEYS: Record<string, string> = {
  VERIFICATION_LOCKED: "verification.lockedError",
  CR_TAKEN: "verification.errCrTaken",
  VAT_TAKEN: "verification.errVatTaken",
  VERIFICATION_INCOMPLETE: "verification.errIncomplete",
  ALREADY_VERIFIED: "verification.errAlreadyVerified",
  ROLE_REQUIRED: "verification.readOnlyNote",
  INVALID_FILE: "verification.errInvalidFile",
};

export function CompanyVerificationFlow({ companyId, canManage }: { companyId: string; canManage: boolean }) {
  const { t, isRtl } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const errorText = (err: unknown, fallbackKey: string) => {
    const code = err instanceof ApiError ? err.code : undefined;
    return t(code && ERROR_KEYS[code] ? ERROR_KEYS[code] : fallbackKey);
  };

  const infoKey = ["/api/companies", companyId, "verify-info"];
  const docsKey = ["/api/companies", companyId, "documents"];

  const infoQuery = useQuery<VerifyInfo>({
    queryKey: infoKey,
    queryFn: async () => (await apiRequest("GET", `/api/companies/${companyId}/verify-info`)).json(),
  });
  const docsQuery = useQuery<CompanyDoc[]>({
    queryKey: docsKey,
    queryFn: async () => (await apiRequest("GET", `/api/companies/${companyId}/documents`)).json(),
  });
  // Nothing about status or documents is shown — and nothing can be changed —
  // until both reads have succeeded. A failed read is an error, never "empty".
  const read = readState(infoQuery, docsQuery);
  const info = infoQuery.data;
  const docs = docsQuery.data ?? [];

  const status = info?.verificationStatus;
  const locked = isVerificationLocked(status);
  const editable = read === "ready" && canManage && !locked;

  // ── Details ────────────────────────────────────────────────────────────────
  const [legalName, setLegalName] = useState("");
  const [crNumber, setCrNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [city, setCity] = useState("");
  const [savedNote, setSavedNote] = useState<null | "saved" | "invalidated">(null);
  const [crTouched, setCrTouched] = useState(false);

  useEffect(() => {
    if (!info) return;
    setLegalName(info.legalName || "");
    setCrNumber(info.crNumber || "");
    setVatNumber(info.vatNumber || "");
    setCity(info.city || "");
  }, [info]);

  const dirty = !!info && (
    legalName !== (info.legalName || "") ||
    crNumber !== (info.crNumber || "") ||
    vatNumber !== (info.vatNumber || "") ||
    city !== (info.city || "")
  );
  const crInvalid = crTouched && crNumber.length > 0 && !CR_NUMBER_PATTERN.test(crNumber);
  // Saving a new legal identity on a verified company removes the badge (it no
  // longer describes this company) — say so before the user presses Save.
  const willInvalidate = status === "verified" && !!info && identityChanged(info, { legalName, crNumber, vatNumber });

  const refreshAfterConflict = (err: unknown) => {
    if (err instanceof ApiError && err.code === "VERIFICATION_LOCKED") {
      void queryClient.invalidateQueries({ queryKey: infoKey });
      void checkAuth();
    }
  };

  const saveDetails = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/companies/${companyId}/verify-info`, {
        legalName: legalName.trim(),
        crNumber: crNumber.trim(),
        vatNumber: vatNumber.trim() || undefined,
        city: city.trim(),
      });
      return res.json() as Promise<{ invalidated: boolean }>;
    },
    onMutate: () => setSavedNote(null),
    onSuccess: async (data) => {
      setSavedNote(data.invalidated ? "invalidated" : "saved");
      await queryClient.invalidateQueries({ queryKey: infoKey });
      // The badge and the tender gate read the auth store.
      if (data.invalidated) await checkAuth();
    },
    onError: refreshAfterConflict, // shown inline below
  });

  // ── Documents ─────────────────────────────────────────────────────────────
  const [slots, setSlots] = useState<Record<string, SlotPhase | undefined>>({});
  const setSlot = (type: string, phase: SlotPhase | undefined) => setSlots((s) => ({ ...s, [type]: phase }));
  const [slotError, setSlotError] = useState<Record<string, string | undefined>>({});
  const currentDoc = (type: string) => docs.find((d) => d.documentType === type);

  // The latest operation (upload, attach, retry or "keep current") per slot.
  // Every async callback checks it before writing, so a late completion or
  // failure from an older operation can never overwrite a newer state — e.g.
  // re-enable Submit while a newer upload in the same slot is still running.
  const slotOp = useRef<Record<string, number>>({});
  const beginOp = (type: string) => (slotOp.current[type] = (slotOp.current[type] ?? 0) + 1);
  const isCurrent = (type: string, op: number) => slotOp.current[type] === op;

  const attach = async (docType: string, uploadURL: string, name: string, knownPath: string | undefined, op: number) => {
    if (!isCurrent(docType, op)) return;
    setSlot(docType, { kind: "attaching", name });
    setSlotError((e) => ({ ...e, [docType]: undefined }));
    let objectPath = knownPath;
    try {
      if (!objectPath) {
        const meta = await apiRequest("PUT", "/api/objects/metadata", { fileURL: uploadURL });
        objectPath = (await meta.json()).objectPath as string;
      }
      await apiRequest("POST", `/api/companies/${companyId}/documents`, { documentType: docType, fileUrl: objectPath, originalName: name });
      await queryClient.invalidateQueries({ queryKey: docsKey });
      if (!isCurrent(docType, op)) return;
      setSlot(docType, undefined);
      toast({ title: t("verification.docSavedToast", { name }), description: t("verification.docSavedToastDesc") });
    } catch (err) {
      refreshAfterConflict(err);
      if (!isCurrent(docType, op)) return;
      setSlot(docType, { kind: "failed", name, uploadURL, objectPath, reason: "attach" });
      setSlotError((e) => ({ ...e, [docType]: errorText(err, "verification.docFailedHint") }));
    }
  };

  // The uploader runs one upload at a time, so its "done"/"failed" and
  // onComplete belong to the operation its last "uploading" started.
  const uploadOp = useRef<Record<string, number>>({});
  const onUploadState = (docType: string) => (state: "uploading" | "done" | "failed", fileName?: string) => {
    if (state === "uploading") {
      uploadOp.current[docType] = beginOp(docType);
      setSlot(docType, { kind: "uploading" });
    }
    if (state === "failed" && isCurrent(docType, uploadOp.current[docType])) {
      setSlot(docType, { kind: "failed", name: fileName ?? "", reason: "upload" });
    }
    // "done" is followed straight away by onComplete → attach.
  };

  const onUploaded = (docType: string) => (result: UploadResult) => {
    const ok = result.successful?.[0];
    if (!ok) return;
    void attach(docType, ok.uploadURL, ok.name || docType, undefined, uploadOp.current[docType]);
  };

  const getUploadURL = async () => {
    const res = await apiRequest("POST", "/api/objects/upload", {});
    return { method: "PUT" as const, url: (await res.json()).uploadURL as string };
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  // Completeness uses what is on screen, so the checklist reacts while typing;
  // unsaved details are saved as part of submitting. Uploads in flight, saves
  // in flight and failed replacements all block until they are resolved.
  const blockers = submitBlockers({
    read,
    details: { legalName, crNumber, city },
    savedDocumentTypes: docs.map((d) => d.documentType),
    slots,
    busy: saveDetails.isPending,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const submitting = useRef(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (dirty) await saveDetails.mutateAsync();
      const res = await apiRequest("POST", `/api/companies/${companyId}/verification/submit`);
      return res.json() as Promise<{ verificationStatus: string; alreadySubmitted: boolean }>;
    },
    onMutate: () => setSubmitError(null),
    onSuccess: async (data) => {
      if (data.verificationStatus === "under_review") setJustSubmitted(true);
      await queryClient.invalidateQueries({ queryKey: infoKey });
      await checkAuth();
    },
    onError: (err: unknown) => {
      refreshAfterConflict(err);
      setSubmitError(errorText(err, "verification.submitFailedRetry"));
    },
    onSettled: () => { submitting.current = false; },
  });

  const handleSubmit = () => {
    // Guard against a double click landing before React re-renders the disabled button.
    if (submitting.current || blockers.length > 0) return;
    submitting.current = true;
    submit.mutate();
  };

  const fieldRefs = {
    legalName: useRef<HTMLInputElement>(null),
    crNumber: useRef<HTMLInputElement>(null),
    city: useRef<HTMLInputElement>(null),
  };
  const docRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const focusBlocker = (b: SubmitBlocker) => {
    const target = b.kind === "missing" ? b.item : b.kind === "slot" ? b.slot : null;
    if (!target) return;
    if (target in fieldRefs) {
      fieldRefs[target as keyof typeof fieldRefs].current?.focus();
      return;
    }
    const el = docRefs.current[target];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus({ preventScroll: true });
  };
  const slotLabel = (type: string) => {
    const slot = COMPANY_DOCUMENT_SLOTS.find((s) => s.type === type);
    return slot ? t(`onboardingPanel.${slot.labelKey}`) : type;
  };
  const blockerText = (b: SubmitBlocker) => {
    if (b.kind === "missing") return t(`verification.missing_${b.item}`);
    if (b.kind === "slot") {
      const key = b.phase === "failed" ? "verification.blockerSlotFailed" : b.phase === "uploading" ? "verification.blockerSlotUploading" : "verification.blockerSlotSaving";
      return t(key, { doc: slotLabel(b.slot) });
    }
    return null;
  };

  const header = (
    <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-border">
      <div className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h2 id="verification-title" className="font-display font-black text-xl tracking-[-0.03em] text-foreground">
            {t("verification.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("verification.subtitle")}</p>
        </div>
        {read === "ready" && status && <StatusPill status={status} />}
      </div>
    </div>
  );

  if (read !== "ready") {
    const retrying = infoQuery.isFetching || docsQuery.isFetching;
    return (
      <section className="bg-card border border-border rounded-2xl overflow-hidden" aria-labelledby="verification-title" aria-busy={read === "loading"}>
        {header}
        {read === "loading" ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            {t("verification.loading")}
          </div>
        ) : (
          <div className="m-5 sm:m-6 rounded-xl border border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30 p-4" role="alert" data-testid="verification-load-error">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" aria-hidden />
              <div className="text-sm min-w-0">
                <p className="font-semibold text-foreground">{t("verification.loadErrorTitle")}</p>
                <p className="text-muted-foreground mt-1">
                  {infoQuery.isError && docsQuery.isError ? t("verification.loadErrorBoth")
                    : infoQuery.isError ? t("verification.loadErrorDetails") : t("verification.loadErrorDocuments")}
                </p>
                <Button type="button" variant="outline" className="mt-3 h-11 md:h-10" disabled={retrying}
                  onClick={() => {
                    if (infoQuery.isError) void infoQuery.refetch();
                    if (docsQuery.isError) void docsQuery.refetch();
                  }} data-testid="button-verification-reload">
                  {retrying ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <RotateCcw className="me-2 h-4 w-4" />}
                  {t("verification.loadErrorRetry")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  const inputClass = "h-11 md:h-10";
  const detailsDone = !blockers.some((b) => b.kind === "missing" && (b.item === "legalName" || b.item === "crNumber" || b.item === "city"));
  const docsDone = !blockers.some((b) => (b.kind === "missing" && b.item === "cr_certificate") || b.kind === "slot");
  const listed = blockers.filter((b) => b.kind === "missing" || b.kind === "slot");

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden" aria-labelledby="verification-title">
      {header}

      {/* State panel: what happened and what happens next */}
      {status === "under_review" && (
        <div className="mx-5 sm:mx-6 mt-5 rounded-xl border border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/30 p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1" role="status" data-testid="verification-submitted">
          <div className="flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold text-foreground">{justSubmitted ? t("verification.submittedTitle") : t("verification.underReviewTitle")}</p>
              <p className="text-muted-foreground mt-1">{justSubmitted ? t("verification.submittedDesc") : t("verification.underReviewDesc")}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("verification.nextStep")}</p>
              <p className="text-muted-foreground">{t("verification.nextStepUnderReview")}</p>
            </div>
          </div>
        </div>
      )}
      {status === "verified" && (
        <div className="mx-5 sm:mx-6 mt-5 rounded-xl border border-green-200 bg-green-50/60 dark:border-green-900 dark:bg-green-950/30 p-4" role="status">
          <div className="flex gap-3">
            <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold text-foreground">{t("verification.verifiedTitle")}</p>
              <p className="text-muted-foreground mt-1">{t("verification.verifiedDesc")}</p>
              {canManage && <p className="text-muted-foreground mt-2 text-xs">{t("verification.verifiedEditNote")}</p>}
            </div>
          </div>
        </div>
      )}
      {status === "rejected" && (
        <div className="mx-5 sm:mx-6 mt-5 rounded-xl border border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30 p-4" role="alert">
          <div className="flex gap-3">
            <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" aria-hidden />
            <div className="text-sm min-w-0">
              <p className="font-semibold text-foreground">{t("verification.rejectedTitle")}</p>
              {info?.rejectionReason && (
                <p className="mt-1 break-words"><span className="text-muted-foreground">{t("verification.rejectedReason")}: </span>{info.rejectionReason}</p>
              )}
              <p className="text-muted-foreground mt-1">{t("verification.rejectedDesc")}</p>
            </div>
          </div>
        </div>
      )}
      {savedNote === "invalidated" && status === "not_verified" && (
        <div className="mx-5 sm:mx-6 mt-5 rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30 p-4" role="status" data-testid="verification-invalidated">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold text-foreground">{t("verification.invalidatedTitle")}</p>
              <p className="text-muted-foreground mt-1">{t("verification.invalidatedDesc")}</p>
            </div>
          </div>
        </div>
      )}
      {!canManage && (
        <p className="mx-5 sm:mx-6 mt-5 text-sm text-muted-foreground">{t("verification.readOnlyNote")}</p>
      )}

      <ol className="px-5 sm:px-6 py-5 space-y-8">
        {/* Step 1 — details */}
        <li>
          <StepHeading n={1} title={t("verification.step1")} hint={t("verification.step1Hint")} done={detailsDone} />
          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="verify-legal-name">{t("verification.legalName")}</Label>
              <Input id="verify-legal-name" ref={fieldRefs.legalName} className={inputClass} value={legalName}
                onChange={(e) => setLegalName(e.target.value)} placeholder={t("verification.legalNamePlaceholder")}
                disabled={!editable} autoComplete="organization" data-testid="input-legal-name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="verify-cr">{t("verification.crNumber")}</Label>
              <Input id="verify-cr" ref={fieldRefs.crNumber} className={cn(inputClass, "tabular-nums")} dir="ltr" inputMode="numeric"
                maxLength={10} value={crNumber}
                onChange={(e) => setCrNumber(toAsciiDigits(e.target.value).replace(/\D/g, "").slice(0, 10))}
                onBlur={() => setCrTouched(true)} placeholder={t("verification.crNumberPlaceholder")}
                aria-invalid={crInvalid} aria-describedby="verify-cr-hint" disabled={!editable} data-testid="input-cr" />
              <p id="verify-cr-hint" className={cn("text-xs", crInvalid ? "text-destructive" : "text-muted-foreground")}>{t("verification.crNumberHint")}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="verify-city">{t("verification.city")}</Label>
              <Input id="verify-city" ref={fieldRefs.city} className={inputClass} value={city}
                onChange={(e) => setCity(e.target.value)} placeholder={t("verification.cityPlaceholder")}
                disabled={!editable} autoComplete="address-level2" data-testid="input-city" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="verify-vat" className="flex items-center gap-2">
                {t("verification.vatNumber")}
                <span className="text-xs font-normal text-muted-foreground">{t("verification.optional")}</span>
              </Label>
              <Input id="verify-vat" className={cn(inputClass, "tabular-nums")} dir="ltr" inputMode="numeric" value={vatNumber}
                onChange={(e) => setVatNumber(toAsciiDigits(e.target.value).replace(/[^\d]/g, "").slice(0, 15))}
                disabled={!editable} data-testid="input-vat" />
            </div>
          </div>
          {editable && willInvalidate && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30 p-3 text-sm text-foreground" role="note" data-testid="verification-invalidate-warning">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
              {t("verification.invalidateWarning")}
            </p>
          )}
          {editable && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" className="h-11 md:h-10"
                disabled={!dirty || saveDetails.isPending || submit.isPending}
                onClick={() => saveDetails.mutate()} data-testid="button-save-verify-info">
                {saveDetails.isPending
                  ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />{t("verification.savingDetails")}</>
                  : willInvalidate ? t("verification.saveAndUnverify") : t("verification.saveDetails")}
              </Button>
              <p className="text-xs text-muted-foreground" aria-live="polite" data-testid="verification-save-status">
                {saveDetails.isError
                  ? <span className="text-destructive">{t("verification.detailsSaveFailed")}. {errorText(saveDetails.error, "verification.detailsSaveFailedHint")}</span>
                  : dirty ? t("verification.detailsUnsaved") : savedNote ? t("verification.detailsSaved") : null}
              </p>
            </div>
          )}
        </li>

        {/* Step 2 — documents */}
        <li>
          <StepHeading n={2} title={t("verification.step2")} hint={t("verification.step2Hint", { mb: VERIFICATION_MAX_FILE_MB })} done={docsDone} />
          <ul className="mt-4 space-y-3">
            {COMPANY_DOCUMENT_SLOTS.map((slot) => {
              const doc = currentDoc(slot.type);
              const phase = slots[slot.type];
              const busy = phase?.kind === "uploading" || phase?.kind === "attaching";
              const failed = phase?.kind === "failed" ? phase : null;
              return (
                <li key={slot.type}>
                  <div ref={(el) => { docRefs.current[slot.type] = el; }}
                    className={cn(
                      "rounded-xl border p-4 transition-colors",
                      failed ? "border-red-300 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20"
                        : doc ? "border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/20"
                        : "border-border",
                    )} data-testid={`doc-slot-${slot.type}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{t(`onboardingPanel.${slot.labelKey}`)}</span>
                          <span className={cn("text-[11px] font-semibold px-1.5 py-0.5 rounded",
                            slot.required ? "text-[var(--bid-orange)] bg-[#FE3C01]/10" : "text-muted-foreground bg-muted")}>
                            {slot.required ? t("verification.required") : t("verification.optional")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{t(`onboardingPanel.${slot.descKey}`)}</p>
                        <div className="text-xs mt-2 space-y-1" aria-live="polite" data-testid={`doc-status-${slot.type}`}>
                          {/* The file the request will use — always stated, so a failed replacement is never ambiguous. */}
                          <p className="flex items-center gap-1.5 min-w-0">
                            {doc ? (
                              <><CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" aria-hidden />
                                {failed && <span className="text-muted-foreground shrink-0">{t("verification.docCurrent")}:</span>}
                                <button type="button" onClick={() => viewAuthenticatedFile(doc.fileUrl).catch(() => undefined)}
                                  className="text-green-700 dark:text-green-400 underline-offset-2 hover:underline truncate text-start rounded min-h-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  title={t("verification.docView")}>
                                  {doc.originalName || t("verification.docAttached")}
                                </button></>
                            ) : (
                              <><FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden /><span className="text-muted-foreground">{t("verification.docNotUploaded")}</span></>
                            )}
                          </p>
                          {phase?.kind === "uploading" && (
                            <p className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />{t("verification.docUploading")}</p>
                          )}
                          {phase?.kind === "attaching" && (
                            <p className="flex items-center gap-1.5 text-muted-foreground min-w-0"><Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden /><span className="truncate">{t("verification.docAttaching")} {phase.name}</span></p>
                          )}
                          {failed && (
                            <div className="flex items-start gap-1.5 text-red-700 dark:text-red-400" role="alert">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
                              <span className="min-w-0">
                                <span className="font-medium">{failed.name ? t("verification.docFailedNamed", { name: failed.name }) : t("verification.docFailed")}</span>{" "}
                                {slotError[slot.type] ?? t(failed.reason === "upload" ? "verification.docUploadFailedHint" : "verification.docFailedHint")}{" "}
                                {doc ? t("verification.docStillUsing") : t("verification.docNoneAttached")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {editable && (
                        <div className="flex flex-wrap gap-2 shrink-0">
                          {failed?.reason === "attach" && failed.uploadURL && (
                            <Button type="button" variant="outline" className="h-11 md:h-9"
                              onClick={() => attach(slot.type, failed.uploadURL!, failed.name, failed.objectPath, beginOp(slot.type))} data-testid={`button-retry-${slot.type}`}>
                              <RotateCcw className="h-3.5 w-3.5 me-1.5" aria-hidden />{t("verification.docRetry")}
                            </Button>
                          )}
                          {failed && (
                            <Button type="button" variant="ghost" className="h-11 md:h-9"
                              onClick={() => { beginOp(slot.type); setSlot(slot.type, undefined); setSlotError((e) => ({ ...e, [slot.type]: undefined })); }}
                              data-testid={`button-keep-${slot.type}`}>
                              {doc ? t("verification.docKeepCurrent") : t("verification.docDismiss")}
                            </Button>
                          )}
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={VERIFICATION_MAX_FILE_MB * 1024 * 1024}
                            allowedFileTypes={[...VERIFICATION_FILE_EXTENSIONS]}
                            onGetUploadParameters={getUploadURL}
                            onUploadStateChange={onUploadState(slot.type)}
                            onComplete={onUploaded(slot.type)}
                            buttonVariant="outline"
                            disabled={busy}
                            buttonClassName="h-11 md:h-9"
                          >
                            <span className="flex items-center gap-1.5 text-sm">
                              <Upload className="h-3.5 w-3.5" aria-hidden />
                              {doc || failed ? t("verification.docReplace") : t("verification.docUpload")}
                            </span>
                          </ObjectUploader>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </li>

        {/* Step 3 — review and submit (only while there is something to submit) */}
        {editable && status !== "verified" && (
          <li>
            <StepHeading n={3} title={t("verification.step3")} done={false} />
            <div className="mt-4 rounded-xl bg-muted/60 p-4">
              {listed.length > 0 ? (
                <>
                  <p className="text-sm font-medium text-foreground">{t("verification.missingTitle")}</p>
                  <ul className="mt-2 space-y-1" data-testid="verification-missing">
                    {listed.map((b) => (
                      <li key={b.kind === "missing" ? b.item : `slot-${b.kind === "slot" ? b.slot : ""}`}>
                        <button type="button" onClick={() => focusBlocker(b)}
                          className={cn("text-sm text-start hover:text-foreground underline-offset-2 hover:underline inline-flex items-center gap-2 min-h-[32px] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            b.kind === "slot" && b.phase === "failed" ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", b.kind === "slot" && b.phase === "failed" ? "bg-red-600" : "bg-[var(--bid-orange)]")} aria-hidden />
                          {blockerText(b)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">{t("verification.readyTitle")}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{t("verification.readyDesc")}</p>
                </>
              )}
              <p className="text-xs text-muted-foreground mt-3">{t("verification.draftNote")}</p>
            </div>
            {submitError && (
              <p className="mt-3 text-sm text-destructive flex items-start gap-2" role="alert" data-testid="verification-submit-error">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                <span><strong>{t("verification.submitFailed")}.</strong> {submitError}</span>
              </p>
            )}
            <Button type="button" onClick={handleSubmit}
              disabled={blockers.length > 0 || submit.isPending}
              className="mt-4 w-full sm:w-auto h-12 px-6 bg-[var(--bid-orange)] hover:bg-[#d54d35] text-white disabled:opacity-100 disabled:bg-[#E9E4DC] disabled:text-[var(--bid-stone)]"
              data-testid="button-submit-verification">
              {submit.isPending
                ? <><Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />{t("verification.submitting")}</>
                : <><Send className={cn("me-2 h-4 w-4", isRtl && "-scale-x-100")} aria-hidden />{status === "rejected" ? t("verification.resubmit") : t("verification.submit")}</>}
            </Button>
          </li>
        )}
      </ol>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const { t } = useI18n();
  const meta: Record<string, { label: string; className: string; Icon: typeof Clock }> = {
    not_verified: { label: t("verification.statusNotVerified"), className: "bg-muted text-muted-foreground", Icon: AlertCircle },
    under_review: { label: t("verification.statusUnderReview"), className: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300", Icon: Clock },
    verified: { label: t("verification.statusVerified"), className: "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300", Icon: ShieldCheck },
    rejected: { label: t("verification.statusRejected"), className: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300", Icon: XCircle },
  };
  const m = meta[status] ?? meta.not_verified;
  return (
    <span className={cn("shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", m.className)} data-testid="verification-status">
      <m.Icon className="h-3.5 w-3.5" aria-hidden />
      {m.label}
    </span>
  );
}

function StepHeading({ n, title, hint, done }: { n: number; title: string; hint?: string; done: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className={cn(
        "h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
        done ? "bg-green-600 text-white" : "bg-[#FE3C01]/10 text-[var(--bid-orange)]",
      )} aria-hidden>
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </span>
      <div>
        <h3 className="text-base font-semibold text-foreground leading-7">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
