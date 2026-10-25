// The bill of quantities, read-only: a table on desktop, cards on phones. Shows
// exactly what it is given — the vendor view from the server (or from
// vendorItemView for the requester's preview) already left out hidden reference
// prices and empty optional columns.
import { useI18n } from "@/lib/i18n";
import type { ItemColumn } from "@shared/boq-items";
import { BoqImage } from "./BoqImage";
import { UNIT_LABELS_AR } from "@/components/ui/smart-unit-dropdown";

export interface ViewItem {
  id: string;
  position: number;
  name: string;
  description: string | null;
  unit: string;
  quantity: string;
  imageUrl: string | null;
  referenceUnitPrice?: string | null;
  customValues: Record<string, string | null>;
}

export interface ItemsViewModel {
  columns: ItemColumn[];
  optional: { description: boolean; image: boolean; referenceUnitPrice: boolean };
  items: ViewItem[];
}

export function BoqItemsView({ view, invitationToken, caption }: { view: ItemsViewModel; invitationToken?: string | null; caption?: string }) {
  const { t, isRtl } = useI18n();
  const { columns, optional, items } = view;
  const unitLabel = (u: string) => (isRtl ? UNIT_LABELS_AR[u] ?? u : u);
  const cell = (v: string | null | undefined) => (v === null || v === undefined || v === "" ? <span className="text-muted-foreground">—</span> : v);

  return (
    <div data-testid="boq-items-view">
      {/* Desktop table */}
      <div className="hidden md:block relative max-w-full overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 text-start font-semibold w-12">{t("boq.number")}</th>
              {optional.image && <th scope="col" className="px-3 py-2 text-start font-semibold w-20">{t("boq.image")}</th>}
              <th scope="col" className="px-3 py-2 text-start font-semibold">{t("boq.itemName")}</th>
              {optional.description && <th scope="col" className="px-3 py-2 text-start font-semibold">{t("boq.description")}</th>}
              <th scope="col" className="px-3 py-2 text-start font-semibold">{t("boq.unit")}</th>
              <th scope="col" className="px-3 py-2 text-end font-semibold">{t("boq.quantity")}</th>
              {optional.referenceUnitPrice && <th scope="col" className="px-3 py-2 text-end font-semibold">{t("boq.referencePrice")}</th>}
              {columns.map((c) => <th key={c.id} scope="col" className="px-3 py-2 text-start font-semibold">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id} className="border-t border-border align-top" data-testid={`boq-row-${i + 1}`}>
                <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
                {optional.image && <td className="px-3 py-2.5">{it.imageUrl ? <BoqImage path={it.imageUrl} alt={it.name} invitationToken={invitationToken} className="h-12 w-12" /> : cell(null)}</td>}
                <td className="px-3 py-2.5 font-medium text-foreground break-words max-w-xs">{it.name}</td>
                {optional.description && <td className="px-3 py-2.5 text-muted-foreground break-words max-w-sm whitespace-pre-line">{cell(it.description)}</td>}
                <td className="px-3 py-2.5">{unitLabel(it.unit)}</td>
                <td className="px-3 py-2.5 text-end tabular-nums"><bdi dir="ltr">{it.quantity}</bdi></td>
                {optional.referenceUnitPrice && <td className="px-3 py-2.5 text-end tabular-nums"><bdi dir="ltr">{cell(it.referenceUnitPrice)}</bdi></td>}
                {columns.map((c) => <td key={c.id} className="px-3 py-2.5 break-words">{c.type === "text" ? cell(it.customValues[c.id]) : <bdi dir="ltr">{cell(it.customValues[c.id])}</bdi>}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone cards */}
      <ol className="md:hidden space-y-3">
        {items.map((it, i) => (
          <li key={it.id} className="rounded-xl border border-border bg-card p-3" data-testid={`boq-card-${i + 1}`}>
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground break-words">{it.name}</p>
                {optional.description && it.description && <p className="mt-0.5 text-sm text-muted-foreground break-words whitespace-pre-line">{it.description}</p>}
              </div>
              {optional.image && it.imageUrl && <BoqImage path={it.imageUrl} alt={it.name} invitationToken={invitationToken} className="h-14 w-14" />}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">{t("boq.quantity")}</dt>
              <dd className="text-end tabular-nums"><bdi dir="ltr">{it.quantity}</bdi> {unitLabel(it.unit)}</dd>
              {optional.referenceUnitPrice && <><dt className="text-muted-foreground">{t("boq.referencePrice")}</dt><dd className="text-end tabular-nums"><bdi dir="ltr">{cell(it.referenceUnitPrice)}</bdi></dd></>}
              {columns.map((c) => (
                <div key={c.id} className="contents">
                  <dt className="text-muted-foreground break-words">{c.label}</dt>
                  <dd className="text-end break-words">{c.type === "text" ? cell(it.customValues[c.id]) : <bdi dir="ltr">{cell(it.customValues[c.id])}</bdi>}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ol>
    </div>
  );
}
