import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import AdminLayout from "@/components/AdminLayout";

interface ErrorLog {
  id: string;
  errorType: string;
  message: string;
  stack: string | null;
  context: string | null;
  userId: string | null;
  createdAt: string;
}

export default function AdminErrors() {
  const { data: errors, isLoading } = useQuery<ErrorLog[]>({
    queryKey: ["/api/admin/errors"],
  });

  const getSeverityColor = (errorType: string) => {
    if (errorType.includes('critical') || errorType.includes('fatal')) {
      return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300";
    }
    if (errorType.includes('warning')) {
      return "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300";
    }
    return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300";
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Error Logs
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Recent application errors and exceptions
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !errors || errors.length === 0 ? (
          <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardContent className="py-16 text-center">
              <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-4">
                <Bug className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">No errors logged</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">The system is running smoothly</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {errors.map((error) => (
              <Card key={error.id} className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <Badge className={`text-xs ${getSeverityColor(error.errorType)}`}>
                        {error.errorType}
                      </Badge>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {format(new Date(error.createdAt), "PPpp")}
                      </span>
                    </div>
                  </div>
                  <CardDescription className="mt-1.5 text-sm text-gray-900 dark:text-gray-100 font-medium">
                    {error.message}
                  </CardDescription>
                </CardHeader>
                {(error.stack || error.context) && (
                  <CardContent className="pt-0">
                    {error.context && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Context: {error.context}
                      </p>
                    )}
                    {error.stack && (
                      <pre className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg overflow-auto max-h-32 text-[11px] text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                        {error.stack}
                      </pre>
                    )}
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
