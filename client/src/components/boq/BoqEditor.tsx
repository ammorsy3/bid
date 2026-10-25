// The bill-of-quantities editor (RFQ brief §4, AC2–AC4). Manual entry and the
// Excel import both end here. Rows keep a stable key independent of display
// order; numbering follows the order. Item name, unit and quantity are
// required; the reference unit price, image, description and custom columns are
// optional. Reference prices are hidden from vendors unless switched on.
// A table on desktop, cards on phones — one set of inputs, chosen by width.

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Columns3, Eye, FileSpreadsheet, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuantityInput } from "@/components/ui/quantity-input";
import { SmartUnitDropdown } from "@/components/ui/smart-unit-dropdown";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { uploadObject } from "@/lib/upload-object";
import { blankItem, newKey, type BoqDraft, type DraftItem } from "@/lib/boq-draft";
import { validateItems, vendorItemView, normalizeItem, normalizeColumnLabel, ITEM_LIMITS, type ItemColumn, type ItemFieldError, type ColumnType } from "@shared/boq-items";
import { moneyErrorMessage, MAX_ITEMS } from "@shared/boq-money";
import { BoqImage } from "./BoqImage";
import { BoqItemsView } from "./BoqItemsView";
import { BoqImportDialog } from "./BoqImportDialog";

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

// Table from 768px up, cards below. Read through matchMedia (CSS pixels of the
// device), starting with cards: rendering the wide table first on a phone would
// widen the layout viewport and make the page think it is on a desktop.
const DESKTOP_QUERY = "(min-width: 768px)";
function useDesktopTable(): boolean {
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const on = () => setDesktop(mql.matches);
    on();
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  return desktop;
}

export function boqErrorText(t: (k: string, v?: Record<string, string | number>) => string, e: ItemFieldError): string {
  if ("error" in e) {
    const m = moneyErrorMessage(e.field === "quantity" ? "quantity" : "price", e.error);
    return t(m.key, m.vars);
  }
  return t(e.key);
}

interface Props {
  value: BoqDraft;
  onChange: (next: BoqDraft) => void;
  /** Show every error (after Next was pressed), not only touched fields. */
  showAllErrors?: boolean;
}

export function BoqEditor({ value, onChange, showAllErrors = false }: Props) {
  const { t } = useI18n();
  const { toast } = useToast();
  const isMobile = !useDesktopTable();
  const [touched, setTouched] = useState<Record<string, true>>({});
  const [columnDialog, setColumnDialog] = useState(false);
  const [preview, setPreview] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [confirmColumn, setConfirmColumn] = useState<ItemColumn | null>(null);
  const focusKey = useRef<string | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const { items, columns } = value;

  const validation = useMemo(() => validateItems(items, columns), [items, columns]);
  const errorsFor = (index: number, field: string) =>
    (validation.rows[index] ?? []).filter((e) => e.field === field && (showAllErrors || touched[`${items[index].key}:${field}`]));
  const touch = (key: string, field: string) => setTouched((p) => (p[`${key}:${field}`] ? p : { ...p, [`${key}:${field}`]: true }));

  useEffect(() => {
    if (!focusKey.current) return;
    const el = document.querySelector<HTMLInputElement>(`[data-boq-name="${focusKey.current}"]`);
    focusKey.current = null;
    el?.focus();
  });

  const setItems = (next: DraftItem[]) => onChange({ ...value, items: next });
  const update = (key: string, patch: Partial<DraftItem>) => setItems(items.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const updateCustom = (key: string, colId: string, v: string) =>
    setItems(items.map((i) => (i.key === key ? { ...i, customValues: { ...(i.customValues ?? {}), [colId]: v } } : i)));
  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[index], next[j]] = [next[j], next[index]];
    setItems(next);
  };
  const add = () => {
    if (items.length >= MAX_ITEMS) return;
    const item = blankItem();
    focusKey.current = item.key;
    setItems([...items, item]);
  };
  const remove = (key: string) => {
    setItems(items.filter((i) => i.key !== key));
    requestAnimationFrame(() => addRef.current?.focus());
  };

  const uploadImage = async (key: string, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > IMAGE_MAX_BYTES) {
      toast({ title: t("boq.imageInvalid"), variant: "destructive" });
      return;
    }
    setUploading((u) => ({ ...u, [key]: true }));
    try {
      const path = await uploadObject(file);
      update(key, { imageUrl: path });
    } catch {
      // The row keeps its previous image (or none): nothing is lost.
      toast({ title: t("boq.imageFailed"), variant: "destructive" });
    } finally {
      setUploading((u) => ({ ...u, [key]: false }));
    }
  };

  const moveColumn = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= columns.length) return;
    const next = [...columns];
    [next[index], next[j]] = [next[j], next[index]];
    onChange({ ...value, columns: next.map((c, position) => ({ ...c, position })) });
  };
  const deleteColumn = (col: ItemColumn) => {
    onChange({
      ...value,
      columns: columns.filter((c) => c.id !== col.id).map((c, position) => ({ ...c, position })),
      items: items.map((i) => {
        const { [col.id]: _drop, ...rest } = i.customValues ?? {};
        return { ...i, customValues: rest };
      }),
    });
    setConfirmColumn(null);
  };
  const columnHasValues = (col: ItemColumn) => items.some((i) => (i.customValues?.[col.id] ?? "").trim() !== "");

  // The preview is built exactly as the server builds the vendor view.
  const previewModel = useMemo(() => {
    if (!preview) return null;
    const stored = items.map((it, position) => ({ id: it.key, position, ...normalizeItem(it, columns) }));
    return vendorItemView(stored, columns, value.showReferencePrices);
  }, [preview, items, columns, value.showReferencePrices]);

  const fieldError = (index: number, field: string) => {
    const errs = errorsFor(index, field);
    if (!errs.length) return null;
    return (
      <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert" id={`boq-err-${items[index].key}-${field}`}>
        {boqErrorText(t, errs[0])}
      </p>
    );
  };
  const describedBy = (index: number, field: string) => (errorsFor(index, field).length ? `boq-err-${items[index].key}-${field}` : undefined);
  const inputCls = (bad: boolean) => `w-full min-h-11 md:min-h-10 rounded-md border bg-background px-3 text-sm ${bad ? "border-red-500" : "border-input"}`;

  const customInput = (item: DraftItem, index: number, col: ItemColumn) => {
    const bad = errorsFor(index, `custom:${col.id}`).length > 0;
    const common = {
      value: item.customValues?.[col.id] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateCustom(item.key, col.id, e.target.value),
      onBlur: () => touch(item.key, `custom:${col.id}`),
      "aria-label": `${col.label} — ${t("boq.number")} ${index + 1}`,
      "aria-invalid": bad || undefined,
      className: inputCls(bad),
      "data-testid": `boq-custom-${col.id}-${index + 1}`,
    };
    if (col.type === "date") return <input type="date" dir="ltr" {...common} />;
    if (col.type === "number") return <input type="text" inputMode="decimal" dir="ltr" {...common} />;
    return <input type="text" dir="auto" maxLength={ITEM_LIMITS.customText} {...common} />;
  };

  const imageCell = (item: DraftItem, index: number) => (
    <div className="flex items-center gap-2">
      {item.imageUrl ? (
        <>
          <BoqImage path={item.imageUrl} alt={item.name || t("boq.image")} className="h-11 w-11" />
          <Button type="button" variant="ghost" size="icon" className="h-11 w-11" onClick={() => update(item.key, { imageUrl: null })} aria-label={t("boq.removeImage", { number: index + 1 })}>
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <label className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border px-3 text-xs text-muted-foreground hover:border-[#FE3C01] focus-within:ring-2 focus-within:ring-[#FE3C01] ${uploading[item.key] ? "pointer-events-none opacity-60" : ""}`}>
          {uploading[item.key] ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
          <span>{uploading[item.key] ? t("boq.imageUploading") : t("boq.image")}</span>
          <input type="file" accept="image/*" className="sr-only" aria-label={t("boq.uploadImage", { number: index + 1 })}
            onChange={(e) => { uploadImage(item.key, e.target.files?.[0]); e.target.value = ""; }} data-testid={`boq-image-${index + 1}`} />
        </label>
      )}
    </div>
  );

  const rowActions = (item: DraftItem, index: number) => (
    <div className="flex items-center gap-0.5">
      <Button type="button" variant="ghost" size="icon" className="h-11 w-11 md:h-9 md:w-9" disabled={index === 0} onClick={() => move(index, -1)} aria-label={t("boq.moveUp", { number: index + 1 })}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-11 w-11 md:h-9 md:w-9" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label={t("boq.moveDown", { number: index + 1 })}>
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-11 w-11 md:h-9 md:w-9 text-red-600" onClick={() => remove(item.key)} aria-label={t("boq.removeItem", { number: index + 1 })} data-testid={`boq-remove-${index + 1}`}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const nameInput = (item: DraftItem, index: number) => (
    <>
      <input
        type="text" dir="auto" value={item.name} maxLength={ITEM_LIMITS.name}
        onChange={(e) => update(item.key, { name: e.target.value })} onBlur={() => touch(item.key, "name")}
        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
        aria-label={`${t("boq.itemName")} — ${t("boq.number")} ${index + 1}`} aria-required="true"
        aria-invalid={errorsFor(index, "name").length > 0 || undefined} aria-describedby={describedBy(index, "name")}
        className={inputCls(errorsFor(index, "name").length > 0)} data-boq-name={item.key} data-testid={`boq-name-${index + 1}`}
      />
      {fieldError(index, "name")}
    </>
  );
  const unitInput = (item: DraftItem, index: number) => (
    <div onBlur={() => touch(item.key, "unit")}>
      <SmartUnitDropdown value={item.unit} onChange={(u: string) => { update(item.key, { unit: u }); touch(item.key, "unit"); }}
        deliverableName={item.name} deliverableDescription={item.description ?? ""} projectTitle=""
        error={errorsFor(index, "unit").length ? boqErrorText(t, errorsFor(index, "unit")[0]) : undefined} data-testid={`boq-unit-${index + 1}`} />
      {fieldError(index, "unit")}
    </div>
  );
  const qtyInput = (item: DraftItem, index: number) => (
    <>
      <QuantityInput value={item.quantity} onValueChange={(raw) => update(item.key, { quantity: raw })} onBlur={() => touch(item.key, "quantity")}
        aria-label={`${t("boq.quantity")} — ${t("boq.number")} ${index + 1}`} aria-required="true"
        invalid={errorsFor(index, "quantity").length > 0} aria-describedby={describedBy(index, "quantity")}
        className={`${inputCls(errorsFor(index, "quantity").length > 0)} text-end tabular-nums`} data-testid={`boq-qty-${index + 1}`} />
      {fieldError(index, "quantity")}
    </>
  );
  const refInput = (item: DraftItem, index: number) => (
    <>
      <input type="text" inputMode="decimal" dir="ltr" value={item.referenceUnitPrice ?? ""}
        onChange={(e) => update(item.key, { referenceUnitPrice: e.target.value })} onBlur={() => touch(item.key, "referenceUnitPrice")}
        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
        aria-label={`${t("boq.referencePrice")} — ${t("boq.number")} ${index + 1}`}
        aria-invalid={errorsFor(index, "referenceUnitPrice").length > 0 || undefined} aria-describedby={describedBy(index, "referenceUnitPrice")}
        className={`${inputCls(errorsFor(index, "referenceUnitPrice").length > 0)} text-end tabular-nums`} data-testid={`boq-ref-${index + 1}`} />
      {fieldError(index, "referenceUnitPrice")}
    </>
  );
  const descInput = (item: DraftItem, index: number) => (
    <>
      <textarea dir="auto" rows={isMobile ? 2 : 1} value={item.description ?? ""} maxLength={ITEM_LIMITS.description}
        onChange={(e) => update(item.key, { description: e.target.value })} onBlur={() => touch(item.key, "description")}
        aria-label={`${t("boq.description")} — ${t("boq.number")} ${index + 1}`}
        className={`${inputCls(errorsFor(index, "description").length > 0)} py-2 resize-y`} data-testid={`boq-desc-${index + 1}`} />
      {fieldError(index, "description")}
    </>
  );

  return (
    <section aria-labelledby="boq-title" className="space-y-4 min-w-0 max-w-full" data-testid="boq-editor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="boq-title" className="text-lg font-bold text-foreground">
          {t("boq.title")} <span className="ms-1 text-sm font-medium text-muted-foreground tabular-nums">({items.length})</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setImportOpen(true)} data-testid="boq-import">
            <FileSpreadsheet className="h-4 w-4 me-2" aria-hidden="true" />{t("import.title")}
          </Button>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setColumnDialog(true)} disabled={columns.length >= ITEM_LIMITS.columns} data-testid="boq-add-column">
            <Columns3 className="h-4 w-4 me-2" aria-hidden="true" />{t("boq.addColumn")}
          </Button>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setPreview(true)} disabled={items.length === 0} data-testid="boq-preview">
            <Eye className="h-4 w-4 me-2" aria-hidden="true" />{t("boq.preview")}
          </Button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3">
        <div className="min-w-0">
          <Label htmlFor="boq-show-ref" className="font-medium">{t("boq.showReferencePrices")}</Label>
          <p className="text-xs text-muted-foreground mt-0.5">{t("boq.referencePriceHint")}</p>
        </div>
        <Switch id="boq-show-ref" checked={value.showReferencePrices} onCheckedChange={(v) => onChange({ ...value, showReferencePrices: v })} data-testid="boq-show-ref" />
      </div>
      {columns.length > 0 && <p className="text-xs text-muted-foreground">{t("boq.emptyColumnHint")}</p>}

      {validation.list.includes("ITEMS_REQUIRED") && showAllErrors && (
        <p className="text-sm text-red-600" role="alert" data-testid="boq-items-required">{t("boq.itemsRequired")}</p>
      )}

      {isMobile ? (
        <ol className="space-y-3">
          {items.map((item, index) => (
            <li key={item.key} className="rounded-xl border border-border bg-card p-3 space-y-3" data-testid={`boq-item-${index + 1}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FE3C01] text-xs font-bold text-white tabular-nums">{index + 1}</span>
                {rowActions(item, index)}
              </div>
              <div><Label className="text-xs">{t("boq.itemName")} *</Label>{nameInput(item, index)}</div>
              <div><Label className="text-xs">{t("boq.description")}</Label>{descInput(item, index)}</div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">{t("boq.quantity")} *</Label>{qtyInput(item, index)}</div>
                <div><Label className="text-xs">{t("boq.unit")} *</Label>{unitInput(item, index)}</div>
              </div>
              <div><Label className="text-xs">{t("boq.referencePrice")}</Label>{refInput(item, index)}</div>
              {columns.map((c) => (
                <div key={c.id}><Label className="text-xs break-words">{c.label}</Label>{customInput(item, index, c)}{fieldError(index, `custom:${c.id}`)}</div>
              ))}
              {imageCell(item, index)}
            </li>
          ))}
        </ol>
      ) : (
        <div className="relative max-w-full overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-2 py-2 text-start w-10">{t("boq.number")}</th>
                <th scope="col" className="px-2 py-2 text-start min-w-[12rem]">{t("boq.itemName")} *</th>
                <th scope="col" className="px-2 py-2 text-start min-w-[12rem]">{t("boq.description")}</th>
                <th scope="col" className="px-2 py-2 text-start min-w-[9rem]">{t("boq.unit")} *</th>
                <th scope="col" className="px-2 py-2 text-end min-w-[7rem]">{t("boq.quantity")} *</th>
                <th scope="col" className="px-2 py-2 text-end min-w-[8rem]">{t("boq.referencePrice")}</th>
                {columns.map((c, ci) => (
                  <th key={c.id} scope="col" className="px-2 py-2 text-start min-w-[9rem]">
                    <div className="flex items-center gap-0.5">
                      <span className="break-words me-auto">{c.label}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={ci === 0} onClick={() => moveColumn(ci, -1)} aria-label={t("boq.moveColumnStart", { name: c.label })}>
                        <ArrowUp className="h-3.5 w-3.5 -rotate-90 rtl:rotate-90" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={ci === columns.length - 1} onClick={() => moveColumn(ci, 1)} aria-label={t("boq.moveColumnEnd", { name: c.label })}>
                        <ArrowUp className="h-3.5 w-3.5 rotate-90 rtl:-rotate-90" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => (columnHasValues(c) ? setConfirmColumn(c) : deleteColumn(c))} aria-label={t("boq.removeColumn", { name: c.label })} data-testid={`boq-remove-column-${c.id}`}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </th>
                ))}
                <th scope="col" className="px-2 py-2 text-start min-w-[8rem]">{t("boq.image")}</th>
                <th scope="col" className="px-2 py-2"><span className="sr-only">{t("boq.actions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.key} className="border-t border-border align-top" data-testid={`boq-item-${index + 1}`}>
                  <td className="px-2 py-2 pt-4 text-muted-foreground tabular-nums">{index + 1}</td>
                  <td className="px-2 py-2">{nameInput(item, index)}</td>
                  <td className="px-2 py-2">{descInput(item, index)}</td>
                  <td className="px-2 py-2">{unitInput(item, index)}</td>
                  <td className="px-2 py-2">{qtyInput(item, index)}</td>
                  <td className="px-2 py-2">{refInput(item, index)}</td>
                  {columns.map((c) => <td key={c.id} className="px-2 py-2">{customInput(item, index, c)}{fieldError(index, `custom:${c.id}`)}</td>)}
                  <td className="px-2 py-2">{imageCell(item, index)}</td>
                  <td className="px-2 py-2">{rowActions(item, index)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isMobile && columns.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t("boq.columnName")}>
          {columns.map((c) => (
            <li key={c.id} className="inline-flex items-center gap-1 rounded-full border border-border ps-3 text-xs">
              <span className="break-words">{c.label}</span>
              <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-red-600" onClick={() => (columnHasValues(c) ? setConfirmColumn(c) : deleteColumn(c))} aria-label={t("boq.removeColumn", { name: c.label })}>
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button ref={addRef} type="button" variant="outline" className="w-full min-h-11 border-dashed" onClick={add} disabled={items.length >= MAX_ITEMS} data-testid="boq-add-item">
        <Plus className="h-4 w-4 me-2" aria-hidden="true" />{t("boq.addItem")}
      </Button>

      <BoqImportDialog open={importOpen} onClose={() => setImportOpen(false)} existingColumns={columns} hasItems={items.length > 0}
        onImport={(mode, imported, newColumns) => {
          const nextItems = mode === "replace" ? imported : [...items, ...imported];
          if (nextItems.length > MAX_ITEMS) throw new Error("too many items");
          onChange({ ...value, items: nextItems, columns: [...columns, ...newColumns] });
          toast({ title: t("import.done", { count: String(imported.length) }) });
        }} />

      <AddColumnDialog open={columnDialog} existing={columns} onClose={() => setColumnDialog(false)}
        onAdd={(label, type) => { onChange({ ...value, columns: [...columns, { id: `c-${newKey().slice(0, 8)}`, label, type, position: columns.length }] }); setColumnDialog(false); }} />

      <Dialog open={!!confirmColumn} onOpenChange={(o) => { if (!o) setConfirmColumn(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("boq.removeColumn", { name: confirmColumn?.label ?? "" })}</DialogTitle>
            <DialogDescription>{t("boq.removeColumnWarning")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 flex-col-reverse sm:flex-row">
            <Button variant="outline" className="min-h-11" onClick={() => setConfirmColumn(null)}>{t("gallery.keepEditing")}</Button>
            <Button className="min-h-11 bg-red-600 hover:bg-red-700 text-white" onClick={() => confirmColumn && deleteColumn(confirmColumn)} data-testid="boq-confirm-remove-column">
              {t("boq.removeColumn", { name: confirmColumn?.label ?? "" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-5xl max-h-[90dvh] overflow-y-auto" data-testid="boq-preview-dialog">
          <DialogHeader>
            <DialogTitle>{t("boq.preview")}</DialogTitle>
            <DialogDescription>{value.showReferencePrices ? t("boq.previewWithPrices") : t("boq.referencePriceHint")}</DialogDescription>
          </DialogHeader>
          {previewModel && <BoqItemsView view={previewModel} caption={t("boq.title")} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function AddColumnDialog({ open, existing, onClose, onAdd }: { open: boolean; existing: ItemColumn[]; onClose: () => void; onAdd: (label: string, type: ColumnType) => void }) {
  const { t } = useI18n();
  const [label, setLabel] = useState("");
  const [type, setType] = useState<ColumnType>("text");
  const [tried, setTried] = useState(false);
  useEffect(() => { if (open) { setLabel(""); setType("text"); setTried(false); } }, [open]);
  const trimmed = label.trim();
  const duplicate = !!trimmed && existing.some((c) => normalizeColumnLabel(c.label) === normalizeColumnLabel(trimmed));
  const error = !trimmed ? t("boq.columnNameRequired") : duplicate ? t("import.duplicateHeader", { name: trimmed }) : null;
  const submit = () => { setTried(true); if (!error) onAdd(trimmed, type); };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md" data-testid="boq-column-dialog">
        <DialogHeader>
          <DialogTitle>{t("boq.addColumn")}</DialogTitle>
          <DialogDescription>{t("boq.emptyColumnHint")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="boq-col-name">{t("boq.columnName")}</Label>
            <Input id="boq-col-name" dir="auto" value={label} maxLength={ITEM_LIMITS.columnLabel} onChange={(e) => setLabel(e.target.value)}
              aria-invalid={(tried && !!error) || undefined} aria-describedby={tried && error ? "boq-col-err" : undefined} className="min-h-11" data-testid="boq-column-name" />
            {tried && error && <p id="boq-col-err" className="text-xs text-red-600" role="alert">{error}</p>}
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">{t("boq.fieldType")}</legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("boq.fieldType")}>
              {(["text", "number", "date"] as const).map((ty) => (
                <Button key={ty} type="button" role="radio" aria-checked={type === ty} variant={type === ty ? "default" : "outline"} className="min-h-11" onClick={() => setType(ty)} data-testid={`boq-column-type-${ty}`}>
                  {t(`boq.type${ty[0].toUpperCase()}${ty.slice(1)}`)}
                </Button>
              ))}
            </div>
          </fieldset>
          <DialogFooter className="gap-2 sm:gap-2 flex-col-reverse sm:flex-row">
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>{t("gallery.keepEditing")}</Button>
            <Button type="submit" className="min-h-11 bg-[#FE3C01] hover:bg-[#D44D3A] text-white" data-testid="boq-column-add">{t("boq.addColumn")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
