import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, AlertTriangle, Server, Monitor, ChevronDown, ChevronRight } from "lucide-react";
import { format, isValid } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import AdminLayout from "@/components/AdminLayout";
import { useI18n } from "@/lib/i18n";
import { AdminPage, AdminHeader, AdminEmpty, SkeletonList } from "@/components/admin/AdminUI";

// Matches the shape stored in the error_logs table (server/routes.ts POST /api/errors
// and the global error middleware).
interface ErrorLog {
  id: string;
  source: "client" | "server" | string;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  errorMessage: string | null;
  stack: string | null;
  userAgent: string | null;
  userId: string | null;
  companyId: string | null;
  metadata: unknown;
  createdAt: string;
}

type SourceFilter = "all" | "server" | "client";

export default function AdminErrors() {
  const { t, language } = useI18n();
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: errors, isLoading } = useQuery<ErrorLog[]>({
    queryKey: ["/api/admin/errors"],
  });

  // Severity is derived from the HTTP status code: 5xx (or none) is the most
  // serious, 4xx is a client/validation problem, everything else is informational.
  const severityOf = (status: number | null): "critical" | "warning" | "info" => {
    if (status == null) return "critical";
    if (status >= 500) return "critical";
    if (status >= 400) return "warning";
    return "info";
  };

  const severityBadge = (status: number | null) => {
    const sev = severityOf(status);
    if (sev === "critical") return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300";
    if (sev === "warning") return "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300";
    return "bg-gray-100 dark:bg-card text-gray-700 dark:text-muted-foreground";
  };

  const filtered = (errors ?? []).filter((e) =>
    filter === "all" ? true : e.source === filter,
  );

  const counts = {
    all: errors?.length ?? 0,
    server: errors?.filter((e) => e.source === "server").length ?? 0,
    client: errors?.filter((e) => e.source === "client").length ?? 0,
  };

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const filterTabs: { key: SourceFilter; label: string; count: number }[] = [
    { key: "all", label: t("adminErrors.filterAll"), count: counts.all },
    { key: "server", label: t("adminErrors.filterServer"), count: counts.server },
    { key: "client", label: t("adminErrors.filterClient"), count: counts.client },
  ];

  return (
    <AdminLayout>
      <AdminPage>
        <AdminHeader
          eyebrow={t('admin.adminPanel')}
          eyebrowIcon={Bug}
          title={t("adminErrors.title")}
          subtitle={t("adminErrors.subtitle")}
        />

        {/* Source filter */}
        {!isLoading && counts.all > 0 && (
          <div className="flex items-center gap-2 mb-5">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-[var(--bid-orange)] text-white"
                    : "bg-gray-100 dark:bg-card text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                {tab.label}
                <span className={`tabular-nums ${filter === tab.key ? "text-white/80" : "text-gray-400 dark:text-gray-500"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <SkeletonList rows={4} />
        ) : filtered.length === 0 ? (
          <AdminEmpty icon={Bug} title={t("adminErrors.noErrors")} subtitle={t("adminErrors.runningSmoothly")} tone="positive" />
        ) : (
          <div className="space-y-3">
            {filtered.map((error) => {
              const isServer = error.source === "server";
              const isOpen = !!expanded[error.id];
              const hasDetails = !!(error.stack || error.userAgent || error.userId);
              return (
                <div key={error.id} className="rounded-2xl border border-[#FE3C01]/10 dark:border-border bg-white dark:bg-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${severityOf(error.statusCode) === "critical" ? "text-red-500" : severityOf(error.statusCode) === "warning" ? "text-amber-500" : "text-gray-400"}`} />

                      {/* Source */}
                      <Badge className="text-xs gap-1 bg-gray-100 dark:bg-card text-gray-700 dark:text-muted-foreground">
                        {isServer ? <Server className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                        {isServer ? t("adminErrors.serverError") : t("adminErrors.clientError")}
                      </Badge>

                      {/* Status code */}
                      {error.statusCode != null && (
                        <Badge className={`text-xs font-mono ${severityBadge(error.statusCode)}`}>
                          {error.statusCode}
                        </Badge>
                      )}

                      {/* Method + path */}
                      {(error.method || error.path) && (
                        <span className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate max-w-[340px]">
                          {error.method && <span className="font-semibold text-gray-800 dark:text-gray-200">{error.method}</span>}
                          {error.method && error.path ? " " : ""}
                          {error.path}
                        </span>
                      )}

                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                        {(() => {
                          const d = new Date(error.createdAt ?? "");
                          return isValid(d) ? format(d, "PPpp", { locale: language === "ar" ? ar : enUS }) : "—";
                        })()}
                      </span>
                    </div>

                    <CardDescription className="mt-2 text-sm text-gray-900 dark:text-foreground font-medium break-words">
                      {error.errorMessage || t("adminErrors.noMessage")}
                    </CardDescription>
                  </CardHeader>

                  {hasDetails && (
                    <CardContent className="pt-0">
                      <button
                        onClick={() => toggle(error.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-2"
                      >
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        {isOpen ? t("adminErrors.hideDetails") : t("adminErrors.showDetails")}
                      </button>

                      {isOpen && (
                        <div className="space-y-2">
                          {error.userId && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-semibold">{t("adminErrors.user")}:</span>{" "}
                              <span className="font-mono">{error.userId}</span>
                            </p>
                          )}
                          {error.userAgent && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                              <span className="font-semibold">{t("adminErrors.userAgent")}:</span> {error.userAgent}
                            </p>
                          )}
                          {error.stack && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                {t("adminErrors.stackTrace")}
                              </p>
                              <pre className="bg-gray-50 dark:bg-card p-3 rounded-lg overflow-auto max-h-56 text-[11px] text-gray-600 dark:text-gray-400 border border-border dark:border-border">
                                {error.stack}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AdminPage>
    </AdminLayout>
  );
}
