import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileText, User, Search } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import AdminLayout from "@/components/AdminLayout";
import { StatusBadge, type BidState } from "@/components/brand/StatusDot";

export default function AdminAuditLogs() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: logs, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/audit-logs"],
  });

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter((log: any) =>
      (log.action || '').toLowerCase().includes(q) ||
      (log.admin?.name || '').toLowerCase().includes(q) ||
      (log.targetType || '').toLowerCase().includes(q) ||
      (log.notes || '').toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  const getActionState = (action: string): BidState => {
    if (action.includes("approved") || action.includes("verified") || action.includes("unblocked")) {
      return "won";
    }
    if (action.includes("rejected") || action.includes("blocked") || action.includes("cancelled")) {
      return "lost";
    }
    if (action.includes("pending") || action.includes("review")) {
      return "pending";
    }
    return "decision";
  };

  const formatAction = (action: string) => {
    return action.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display font-black text-3xl text-gray-900 dark:text-foreground tracking-[-0.04em]" data-testid="text-page-title">
            {t('admin.auditLogs')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('admin.auditLogsDesc')}
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('admin.searchAuditLogsPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-100 dark:bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <Card className="border-border dark:border-border bg-white dark:bg-background">
            <CardContent className="py-16 text-center">
              <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-card flex items-center justify-center mx-auto mb-4">
                <FileText className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="text-empty-state">
                {t('admin.noAuditLogs')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('admin.adminActionsRecorded')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log: any) => (
              <Card key={log.id} className="border-border dark:border-border bg-white dark:bg-background" data-testid={`card-log-${log.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        state={getActionState(log.action)}
                        label={formatAction(log.action)}
                        data-testid={`badge-action-${log.id}`}
                      />
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                        {format(new Date(log.createdAt), "PPpp")}
                      </span>
                    </div>
                  </div>
                  <CardDescription className="mt-2 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        <span>{t('admin.adminLabel')} {log.admin?.name || log.adminId}</span>
                      </div>
                      <div>{t('admin.target')} {log.targetType} (ID: <span className="font-mono">{log.targetId.substring(0, 8)}</span>...)</div>
                      {log.notes && (
                        <div className="mt-2 p-2.5 bg-gray-50 dark:bg-card rounded-lg text-sm border border-border dark:border-border">
                          <strong>{t('admin.notesLabel')}</strong> {log.notes}
                        </div>
                      )}
                    </div>
                  </CardDescription>
                </CardHeader>
                {(log.beforeState || log.afterState) && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {log.beforeState && (
                        <div>
                          <p className="font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.before')}</p>
                          <pre className="bg-gray-50 dark:bg-card p-2.5 rounded-lg overflow-auto max-h-32 text-[11px] border border-border dark:border-border">
                            {JSON.stringify(JSON.parse(log.beforeState), null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.afterState && (
                        <div>
                          <p className="font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.after')}</p>
                          <pre className="bg-gray-50 dark:bg-card p-2.5 rounded-lg overflow-auto max-h-32 text-[11px] border border-border dark:border-border">
                            {JSON.stringify(JSON.parse(log.afterState), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
