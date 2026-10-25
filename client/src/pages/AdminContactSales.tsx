// Admin → Growth → Contact sales: everyone who asked for a personalized Bid Tour
// on /contact-sales, newest first. Work them from "new" to "contacted" to "closed".

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { Handshake, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { withViewTransition } from "@/lib/view-transition";
import AdminLayout from "@/components/AdminLayout";
import { AdminPage, AdminHeader, AdminCard, AdminEmpty, SkeletonList } from "@/components/admin/AdminUI";

type LeadStatus = "new" | "contacted" | "closed";

interface LeadRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  teamSize: string | null;
  message: string | null;
  language: string;
  status: LeadStatus;
  createdAt: string;
}

const STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  contacted: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const FILTERS = ["all", "new", "contacted", "closed"] as const;
type Filter = typeof FILTERS[number];

export default function AdminContactSales() {
  const { t, language } = useI18n();
  const locale = language === "ar" ? arSA : enUS;
  const [filter, setFilter] = useState<Filter>("new");

  const { data, isLoading } = useQuery<LeadRow[]>({ queryKey: ["/api/admin/contact-sales"] });
  const rows = data ?? [];
  const shown = rows.filter((r) => filter === "all" || r.status === filter);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) =>
      apiRequest("PATCH", `/api/admin/contact-sales/${encodeURIComponent(id)}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/contact-sales"] }),
  });

  const actionBtn = "inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted max-md:flex-1 max-md:min-h-11";

  return (
    <AdminLayout>
      <AdminPage>
        <AdminHeader
          eyebrow={t("admin.adminPanel")}
          eyebrowIcon={Handshake}
          title={t("admin.contactSalesTitle")}
          subtitle={t("admin.contactSalesSubtitle")}
        />

        <div className="flex flex-wrap gap-2 mb-4" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => withViewTransition(() => setFilter(f))}
              className={`px-4 md:px-3 py-1.5 max-md:min-h-11 rounded-full text-sm ${filter === f ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted active:bg-muted"} active:opacity-70`}
              data-testid={`filter-contact-sales-${f}`}
            >
              {t(`admin.contactSalesFilter_${f}`)}
              {f !== "all" && <span className="ms-1.5 opacity-70">{rows.filter((r) => r.status === f).length}</span>}
            </button>
          ))}
        </div>

        {isLoading ? (
          <SkeletonList rows={4} />
        ) : shown.length === 0 ? (
          <AdminEmpty icon={Handshake} title={t("admin.noContactSales")} subtitle={t("admin.noContactSalesDesc")} />
        ) : (
          <div className="space-y-3">
            {shown.map((r) => (
              <AdminCard key={r.id} className="p-4" data-testid={`row-contact-sales-${r.id}`}>
                <div className="flex flex-col md:flex-row md:items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold break-words min-w-0 max-w-full" dir="auto">{r.firstName} {r.lastName}</span>
                      <Badge className={`text-[11px] font-medium border-0 ${STATUS_TONE[r.status]}`}>
                        {t(`admin.contactSalesStatus_${r.status}`)}
                      </Badge>
                      {r.teamSize && (
                        <span className="text-xs text-muted-foreground">{t("admin.contactSalesTeam", { size: r.teamSize })}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 break-words" dir="ltr">{r.email}</p>
                    {r.message && (
                      <p className="text-sm mt-2 whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-3" dir="auto">{r.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0 max-md:w-full">
                    <a href={`mailto:${r.email}`} className={actionBtn}>
                      <Mail className="h-4 w-4" />{t("admin.contactSalesReply")}
                    </a>
                    {r.status === "new" && (
                      <button className={actionBtn} disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: r.id, status: "contacted" })} data-testid={`btn-contacted-${r.id}`}>
                        {t("admin.contactSalesMarkContacted")}
                      </button>
                    )}
                    {r.status === "contacted" && (
                      <button className={actionBtn} disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: r.id, status: "closed" })}>
                        {t("admin.contactSalesMarkClosed")}
                      </button>
                    )}
                    {r.status === "closed" && (
                      <button className={actionBtn} disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: r.id, status: "new" })}>
                        {t("admin.contactSalesReopen")}
                      </button>
                    )}
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>
        )}
      </AdminPage>
    </AdminLayout>
  );
}
