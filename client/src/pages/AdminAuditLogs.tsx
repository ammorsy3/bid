import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, User } from "lucide-react";
import { format } from "date-fns";

export default function AdminAuditLogs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["/api/admin/audit-logs"],
  });

  const getActionColor = (action: string) => {
    if (action.includes("approved") || action.includes("verified") || action.includes("unblocked")) {
      return "bg-green-100 text-green-800";
    }
    if (action.includes("rejected")) {
      return "bg-red-100 text-red-800";
    }
    return "bg-blue-100 text-blue-800";
  };

  const formatAction = (action: string) => {
    return action.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
            Audit Logs
          </h1>
          <p className="text-gray-600 mt-2">
            Track all administrative actions and changes
          </p>
        </div>

        {!logs || logs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600" data-testid="text-empty-state">
                No audit logs found
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {logs.map((log: any) => (
              <Card key={log.id} data-testid={`card-log-${log.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Badge className={getActionColor(log.action)} data-testid={`badge-action-${log.id}`}>
                          {formatAction(log.action)}
                        </Badge>
                        <span className="text-sm text-gray-600 font-normal">
                          {format(new Date(log.createdAt), "PPpp")}
                        </span>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Admin: {log.admin?.name || log.adminId}</span>
                          </div>
                          <div>Target: {log.targetType} (ID: {log.targetId.substring(0, 8)}...)</div>
                          {log.notes && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                              <strong>Notes:</strong> {log.notes}
                            </div>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {(log.beforeState || log.afterState) && (
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {log.beforeState && (
                        <div>
                          <p className="font-medium text-gray-700 mb-2">Before:</p>
                          <pre className="bg-gray-50 p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(JSON.parse(log.beforeState), null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.afterState && (
                        <div>
                          <p className="font-medium text-gray-700 mb-2">After:</p>
                          <pre className="bg-gray-50 p-2 rounded overflow-auto max-h-32">
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
    </div>
  );
}
