import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, User } from "lucide-react";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";
import AdminLayout from "@/components/AdminLayout";

export default function AdminAuditLogs() {
  const { t } = useI18n();
  const { data: logs, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/audit-logs"],
  });

  const getActionColor = (action: string) => {
    if (action.includes("approved") || action.includes("verified") || action.includes("unblocked")) {
      return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300";
    }
    if (action.includes("rejected")) {
      return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300";
    }
    return "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300";
  };

  const formatAction = (action: string) => {
    return action.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-page-title">
            {t('admin.auditLogs')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('admin.auditLogsDesc')}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !logs || logs.length === 0 ? (
          <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardContent className="py-16 text-center">
              <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="text-empty-state">
                {t('admin.noAuditLogs')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Admin actions will be recorded here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log: any) => (
              <Card key={log.id} className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" data-testid={`card-log-${log.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${getActionColor(log.action)}`} data-testid={`badge-action-${log.id}`}>
                        {formatAction(log.action)}
                      </Badge>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
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
                      <div>{t('admin.target')} {log.targetType} (ID: {log.targetId.substring(0, 8)}...)</div>
                      {log.notes && (
                        <div className="mt-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm border border-gray-100 dark:border-gray-700">
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
                          <pre className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg overflow-auto max-h-32 text-[11px] border border-gray-100 dark:border-gray-700">
                            {JSON.stringify(JSON.parse(log.beforeState), null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.afterState && (
                        <div>
                          <p className="font-medium text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.after')}</p>
                          <pre className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg overflow-auto max-h-32 text-[11px] border border-gray-100 dark:border-gray-700">
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
