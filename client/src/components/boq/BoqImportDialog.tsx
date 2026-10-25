// Reviewable Excel import (RFQ brief §5, AC2, AC3, AC14):
//   Upload → Choose Worksheet and Match Columns → Review and Correct → Import.
// Nothing is guessed silently (ambiguous headers stay unmapped), dropped,
// zero-filled, rounded or overwritten: rows with problems are shown with the
// sheet row number and must be fixed or removed; adding vs replacing is an
// explicit choice; a failure leaves the existing items as they were.

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { readWorkbook } from "@/lib/xlsx/reader";
import { buildXlsx } from "@/lib/xlsx/writer";
import { newKey, type DraftItem } from "@/lib/boq-draft";
import {
  IMPORT_LIMITS, ImportError, initialMapping, mappingProblems, rowsToItems, REQUEST_FIELDS,
  type ColumnMapping, type ImportWorkbook, type ReviewRow,
} from "@shared/boq-import";
import { validateItems, type ItemColumn, type ColumnType } from "@shared/boq-items";
import { boqErrorText } from "./BoqEditor";

type Step = "upload" | "mapping" | "review";

const FIELD_LABEL: Record<string, string> = {
  name: "boq.itemName", description: "boq.description", unit: "boq.unit", quantity: "boq.quantity", referenceUnitPrice: "boq.referencePrice",
};

export function BoqImportDialog({ open, onClose, existingColumns, hasItems, onImport }: {
  open: boolean;
  onClose: () => void;
  existingColumns: ItemColumn[];
  hasItems: boolean;
  onImport: (mode: "append" | "replace", items: DraftItem[], newColumns: ItemColumn[]) => void;
}) {
  const { t, isRtl } = useI18n();
  const [step, setStep] = useState<Step>("upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [book, setBook] = useState<ImportWorkbook | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [newColumns, setNewColumns] = useState<ItemColumn[]>([]);
  const [mode, setMode] = useState<"append" | "replace" | null>(hasItems ? null : "append");
  const [acknowledged, setAcknowledged] = useState(false);
  const [tried, setTried] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const userCancelled = useRef(false);

  const reset = () => {
    abort.current?.abort();
    setStep("upload"); setBusy(false); setError(null); setBook(null); setSheetIndex(0); setMapping([]); setRows([]); setNewColumns([]);
    setMode(hasItems ? null : "append"); setAcknowledged(false); setTried(false);
  };
  const close = () => { reset(); onClose(); };

  const sheet = book?.sheets[sheetIndex] ?? null;
  const headers = useMemo(() => (sheet?.rows[0]?.cells ?? []).map((c) => c.text), [sheet]);

  const chooseSheet = (i: number, wb = book) => {
    setSheetIndex(i);
    const hdr = (wb?.sheets[i]?.rows[0]?.cells ?? []).map((c) => c.text);
    setMapping(initialMapping(hdr));
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!/\.xlsx$/i.test(file.name)) { setError(t("import.unsupportedFormat")); return; }
    if (file.size > IMPORT_LIMITS.fileBytes) { setError(t("import.fileTooLarge", { maxSize: "5 MB" })); return; }
    const controller = new AbortController();
    abort.current = controller;
    userCancelled.current = false;
    const timer = window.setTimeout(() => controller.abort(), IMPORT_LIMITS.timeoutMs);
    setBusy(true);
    try {
      const wb = await readWorkbook(await file.arrayBuffer(), (text) => new DOMParser().parseFromString(text, "application/xml"), controller.signal);
      if (!wb.sheets.some((s) => s.rows.length > 1)) throw new ImportError("import.unsupportedFormat");
      setBook(wb);
      chooseSheet(Math.max(0, wb.sheets.findIndex((s) => s.rows.length > 1)), wb);
      setStep("mapping");
    } catch (e) {
      // Cancelled by the user: nothing to report. Timed out: the import failed, existing items untouched.
      if ((e as Error)?.name === "AbortError") setError(userCancelled.current ? null : t("import.failure"));
      else setError(e instanceof ImportError ? t(e.key, e.vars) : t("import.failure"));
    } finally {
      window.clearTimeout(timer);
      setBusy(false);
    }
  };

  const problems = mappingProblems(mapping, existingColumns);
  const toReview = () => {
    setTried(true);
    if (problems.length || !sheet) return;
    const cols: ItemColumn[] = mapping.filter((m): m is Extract<ColumnMapping, { kind: "custom" }> => m.kind === "custom")
      .map((m, i) => ({ id: `c-${newKey().slice(0, 8)}`, label: m.label.trim(), type: m.type, position: existingColumns.length + i }));
    setNewColumns(cols);
    setRows(rowsToItems(sheet, mapping, cols));
    setTried(false);
    setStep("review");
  };

  const allColumns = [...existingColumns, ...newColumns];
  const rowErrors = useMemo(() => validateItems(rows.map((r) => r.item), allColumns).rows, [rows, allColumns]);
  const blocking = rows.some((r, i) => r.errors.length || rowErrors[i]);
  const cached = rows.some((r) => r.cachedFields.length);
  const canImport = rows.length > 0 && !blocking && (!cached || acknowledged) && !!mode;

  const editRow = (i: number, field: string, value: string) =>
    setRows((rs) => rs.map((r, j) => {
      if (j !== i) return r;
      const errors = field === "quantity" ? r.errors.filter((e) => e.key !== "import.formulaWithoutValue") : r.errors;
      return { ...r, errors, item: { ...r.item, [field]: value } };
    }));
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i));

  const confirm = () => {
    setTried(true);
    if (!canImport || !mode) return;
    try {
      onImport(mode, rows.map((r) => ({ ...r.item, key: newKey() })), newColumns);
      close();
    } catch {
      setError(t("import.failure"));
    }
  };

  const downloadSample = () => {
    const header = isRtl ? ["اسم البند", "الوصف", "الوحدة", "الكمية", "سعر الوحدة التقديري"] : ["Item Name", "Description", "Unit", "Quantity", "Reference Unit Price"];
    const data = buildXlsx([header, isRtl ? ["أسمنت", "مقاوم للكبريتات", "كيس", 100, 18.5] : ["Cement", "Sulphate resistant", "Bag", 100, 18.5], isRtl ? ["حديد تسليح", "درجة 60", "طن", 2.5, ""] : ["Rebar", "Grade 60", "Ton", 2.5, ""]], isRtl ? "البنود" : "Items", isRtl);
    const url = URL.createObjectURL(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url; a.download = isRtl ? "نموذج-جدول-الكميات.xlsx" : "bill-of-quantities-sample.xlsx";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const fieldOptions = (m: ColumnMapping) => (m.kind === "field" ? `field:${m.field}` : m.kind);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-4xl max-h-[92dvh] overflow-y-auto" data-testid="import-dialog">
        <DialogHeader>
          <DialogTitle>{t("import.title")}</DialogTitle>
          <DialogDescription>{step === "upload" ? t("import.limitsHint", { maxSize: "5 MB", maxRows: String(IMPORT_LIMITS.itemRows), maxColumns: String(IMPORT_LIMITS.columns) }) : step === "mapping" ? t("import.mapping") : t("import.review")}</DialogDescription>
        </DialogHeader>

        <ol className="flex flex-wrap gap-2 text-xs" aria-label={t("import.title")}>
          {(["upload", "mapping", "review"] as const).map((s, i) => (
            <li key={s} aria-current={step === s ? "step" : undefined} className={`rounded-full px-2.5 py-1 font-medium ${step === s ? "bg-[#FE3C01] text-white" : "bg-muted text-muted-foreground"}`}>
              {i + 1}. {t(s === "upload" ? "import.stepUpload" : s === "mapping" ? "import.mapping" : "import.review")}
            </li>
          ))}
        </ol>

        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200" data-testid="import-error">{error}</p>}

        {step === "upload" && (
          <div className="space-y-4">
            <label className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-[#FE3C01] focus-within:ring-2 focus-within:ring-[#FE3C01] ${busy ? "pointer-events-none opacity-60" : ""}`}>
              {busy ? <Loader2 className="h-8 w-8 animate-spin text-[#FE3C01]" aria-hidden="true" /> : <Upload className="h-8 w-8 text-[#FE3C01]" aria-hidden="true" />}
              <span className="font-medium">{busy ? t("import.reading") : t("import.chooseFile")}</span>
              <span className="text-xs text-muted-foreground">.xlsx · ≤ 5 MB</span>
              <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only"
                onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ""; }} data-testid="import-file" />
            </label>
            {busy && <Button type="button" variant="outline" className="min-h-11" onClick={() => { userCancelled.current = true; abort.current?.abort(); }} data-testid="import-cancel-read">{t("import.cancelReading")}</Button>}
            <Button type="button" variant="ghost" className="min-h-11" onClick={downloadSample} data-testid="import-sample">
              <Download className="h-4 w-4 me-2" aria-hidden="true" />{t("import.sample")}
            </Button>
          </div>
        )}

        {step === "mapping" && book && sheet && (
          <div className="space-y-4">
            {book.sheets.length > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="import-sheet">{t("import.worksheet")}</Label>
                <select id="import-sheet" value={sheetIndex} onChange={(e) => chooseSheet(Number(e.target.value))} className="w-full min-h-11 rounded-md border border-input bg-background px-3 text-sm" data-testid="import-sheet">
                  {book.sheets.map((s, i) => <option key={i} value={i}>{s.name} ({Math.max(0, s.rows.length - 1)})</option>)}
                </select>
              </div>
            )}
            {book.embeddedImages && <p className="rounded-lg bg-muted p-3 text-sm" data-testid="import-images-notice">{t("import.embeddedImagesNotice")}</p>}
            <div className="space-y-2" role="table" aria-label={t("import.mapping")}>
              <div role="row" className="hidden sm:grid grid-cols-[1fr_1.4fr] gap-3 text-xs font-semibold text-muted-foreground">
                <span role="columnheader">{t("import.fileColumn")}</span><span role="columnheader">{t("import.requestField")}</span>
              </div>
              {headers.map((h, i) => {
                const m = mapping[i] ?? { kind: "ignore" };
                return (
                  <div role="row" key={i} className="grid gap-2 sm:grid-cols-[1fr_1.4fr] sm:items-center rounded-lg border border-border p-2" data-testid={`import-map-${i}`}>
                    <span role="cell" className="text-sm font-medium break-words" dir="auto">{h || <span className="text-muted-foreground">—</span>}</span>
                    <div role="cell" className="flex flex-wrap gap-2">
                      <select aria-label={`${t("import.requestField")}: ${h}`} value={fieldOptions(m)} className="min-h-11 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                        onChange={(e) => {
                          const v = e.target.value;
                          const next: ColumnMapping = v.startsWith("field:") ? { kind: "field", field: v.slice(6) as (typeof REQUEST_FIELDS)[number] } : v === "custom" ? { kind: "custom", label: (h || "").slice(0, 60), type: "text" } : { kind: "ignore" };
                          setMapping((ms) => ms.map((x, j) => (j === i ? next : x)));
                        }} data-testid={`import-map-select-${i}`}>
                        {REQUEST_FIELDS.map((f) => <option key={f} value={`field:${f}`}>{t(FIELD_LABEL[f])}</option>)}
                        <option value="custom">{t("import.customColumn")}</option>
                        <option value="ignore">{t("import.ignoreColumn")}</option>
                      </select>
                      {m.kind === "custom" && (
                        <>
                          <input aria-label={t("boq.columnName")} dir="auto" maxLength={60} value={m.label} className="min-h-11 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                            onChange={(e) => setMapping((ms) => ms.map((x, j) => (j === i ? { ...m, label: e.target.value } : x)))} data-testid={`import-custom-label-${i}`} />
                          <select aria-label={t("boq.fieldType")} value={m.type} className="min-h-11 rounded-md border border-input bg-background px-2 text-sm"
                            onChange={(e) => setMapping((ms) => ms.map((x, j) => (j === i ? { ...m, type: e.target.value as ColumnType } : x)))}>
                            <option value="text">{t("boq.typeText")}</option><option value="number">{t("boq.typeNumber")}</option><option value="date">{t("boq.typeDate")}</option>
                          </select>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {tried && problems.length > 0 && (
              <ul role="alert" className="space-y-1 text-sm text-red-700 dark:text-red-400" data-testid="import-mapping-problems">
                {problems.map((p, i) => <li key={i}>{t(p.key, "field" in p.vars ? { ...p.vars, field: t(FIELD_LABEL[p.vars.field as string] ?? p.vars.field) } : p.vars)}</li>)}
              </ul>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground" data-testid="import-review-count">{t("import.reviewCount", { count: String(rows.length) })}</p>
            {cached && (
              <label className="flex items-start gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 min-h-11" data-testid="import-cached-notice">
                <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#FE3C01]" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} data-testid="import-ack" />
                <span>{t("import.cachedFormulaNotice")}</span>
              </label>
            )}
            {blocking && <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400" data-testid="import-fix-errors">{t("import.fixErrors")}</p>}
            <ol className="space-y-2 max-h-[45dvh] overflow-y-auto pe-1">
              {rows.map((r, i) => {
                const errs = [...r.errors.map((e) => t(e.key, e.vars)), ...(rowErrors[i] ?? []).map((e) => boqErrorText(t, e))];
                return (
                  <li key={`${r.rowNumber}-${i}`} className={`rounded-lg border p-2 ${errs.length ? "border-red-400 bg-red-50/50 dark:bg-red-900/10" : "border-border"}`} data-testid={`import-row-${r.rowNumber}`}>
                    <div className="grid gap-2 sm:grid-cols-[auto_2fr_1fr_1fr_auto] sm:items-center">
                      <span className="text-xs tabular-nums text-muted-foreground">#{r.rowNumber}</span>
                      {(["name", "unit", "quantity"] as const).map((f) => (
                        <label key={f} className="block min-w-0">
                          <span className="block text-[11px] text-muted-foreground">{t(FIELD_LABEL[f])}</span>
                          <input dir={f === "quantity" ? "ltr" : "auto"} inputMode={f === "quantity" ? "decimal" : undefined}
                            value={(r.item as unknown as Record<string, string>)[f] ?? ""} onChange={(e) => editRow(i, f, e.target.value)}
                            className={`w-full min-h-11 rounded-md border bg-background px-2 text-sm ${r.cachedFields.includes(f) ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20" : "border-input"}`}
                            data-testid={`import-edit-${f}-${r.rowNumber}`} />
                        </label>
                      ))}
                      <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-red-600" onClick={() => removeRow(i)} aria-label={t("import.removeRow", { row: String(r.rowNumber) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {errs.map((e, k) => <p key={k} className="mt-1 text-xs text-red-700 dark:text-red-400">{t("import.rowError", { row: String(r.rowNumber), reason: e })}</p>)}
                  </li>
                );
              })}
            </ol>
            {hasItems && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t("import.appendOrReplace")}</legend>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
                  {(["append", "replace"] as const).map((md) => (
                    <button key={md} type="button" role="radio" aria-checked={mode === md} onClick={() => setMode(md)}
                      className={`min-h-11 rounded-lg border-2 px-3 py-2 text-sm font-medium text-start ${mode === md ? "border-[#FE3C01] bg-[#FE3C01]/5" : "border-border"}`} data-testid={`import-mode-${md}`}>
                      {t(md === "append" ? "import.append" : "import.replace")}
                    </button>
                  ))}
                </div>
                {tried && !mode && <p role="alert" className="text-xs text-red-700">{t("import.chooseMode")}</p>}
              </fieldset>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2 flex-col-reverse sm:flex-row">
          {step !== "upload" && <Button variant="outline" className="min-h-11" onClick={() => setStep(step === "review" ? "mapping" : "upload")}>{t("pricingPage.backToStep")}</Button>}
          {step === "mapping" && <Button className="min-h-11 bg-[#FE3C01] hover:bg-[#D44D3A] text-white" onClick={toReview} data-testid="import-to-review"><FileSpreadsheet className="h-4 w-4 me-2" aria-hidden="true" />{t("import.review")}</Button>}
          {step === "review" && (
            <Button className="min-h-11 bg-[#FE3C01] hover:bg-[#D44D3A] text-white" onClick={confirm} disabled={!rows.length} data-testid="import-confirm">
              {blocking ? <AlertTriangle className="h-4 w-4 me-2" aria-hidden="true" /> : null}{t("import.confirm")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
