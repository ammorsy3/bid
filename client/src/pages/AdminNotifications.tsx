import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell, Store, Building2, UserCheck, AlertTriangle, CheckCheck, ArrowRight,
} from "lucide-react";
import { formatDistanceToNow, isValid } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import AdminLayout from "@/components/AdminLayout";

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  severity: "info" | "warning" | "critical" | string;
  link: string | null;
  relatedId: string | null;
  isRead: boolean;
  createdAt: string;
}

const typeVisual = (type: string) => {
  switch (type) {
    case "marketplace_submission":
      return { Icon: Store, bg: "bg-orange-50 dark:bg-orange-950/40", fg: "text-orange-600 dark:text-orange-400" };
    case "company_verification":
      return { Icon: Building2, bg: "bg-blue-50 dark:bg-blue-950/40", fg: "text-blue-600 dark:text-blue-400" };
    case "freelancer_verification":
      return { Icon: UserCheck, bg: "bg-indigo-50 dark:bg-indigo-950/40", fg: "text-indigo-600 dark:text-indigo-400" };
    case "blocked_award":
      return { Icon: AlertTriangle, bg: "bg-red-50 dark:bg-red-950/40", fg: "text-red-600 dark:text-red-400" };
    default:
      return { Icon: Bell, bg: "bg-gray-100 dark:bg-card", fg: "text-gray-600 dark:text-gray-400" };
  }
};

export default function AdminNotifications() {
  const { t, language } = useI18n();
  const { toast } = useToast();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data: notifications, isLoading } = useQuery<AdminNotification[]>({
    queryKey: ["/api/admin/notifications"],
    refetchInterval: 30000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
  };

  const markRead = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/admin/notifications/${id}/read`),
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/admin/notifications/read-all`),
    onSuccess: () => {
      invalidate();
      toast({ title: t("adminNotifications.allRead") });
    },
  });

  const list = (notifications ?? []).filter((n) => (unreadOnly ? !n.isRead : true));
  const unreadCount = (notifications ?? []).filter((n) => !n.isRead).length;

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-3xl text-gray-900 dark:text-foreground tracking-[-0.04em]">
              {t("adminNotifications.title")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t("adminNotifications.subtitle")}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs flex-shrink-0"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              {t("adminNotifications.markAllRead")}
            </Button>
          )}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mb-5">
          {[
            { key: false, label: t("adminNotifications.filterAll"), count: notifications?.length ?? 0 },
            { key: true, label: t("adminNotifications.filterUnread"), count: unreadCount },
          ].map((tab) => (
            <button
              key={String(tab.key)}
              onClick={() => setUnreadOnly(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                unreadOnly === tab.key
                  ? "bg-[var(--bid-orange)] text-white"
                  : "bg-gray-100 dark:bg-card text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
              }`}
            >
              {tab.label}
              <span className={`tabular-nums ${unreadOnly === tab.key ? "text-white/80" : "text-gray-400 dark:text-gray-500"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <Card className="border-border dark:border-border bg-white dark:bg-background">
            <CardContent className="py-16 text-center">
              <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-4">
                <CheckCheck className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("adminNotifications.empty")}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t("adminNotifications.emptyDesc")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {list.map((n) => {
              const { Icon, bg, fg } = typeVisual(n.type);
              const d = new Date(n.createdAt ?? "");
              const timeAgo = isValid(d)
                ? formatDistanceToNow(d, { addSuffix: true, locale: language === "ar" ? ar : enUS })
                : "";
              return (
                <Card
                  key={n.id}
                  className={`border transition-colors ${
                    n.isRead
                      ? "border-border dark:border-border bg-white dark:bg-background"
                      : "border-[var(--bid-orange)]/30 bg-[var(--bid-orange)]/[0.03] dark:bg-[var(--bid-orange)]/[0.06]"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-5 w-5 ${fg}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {!n.isRead && (
                            <span className="h-2 w-2 rounded-full bg-[var(--bid-orange)] flex-shrink-0" />
                          )}
                          <p className="text-sm font-semibold text-gray-900 dark:text-foreground truncate">
                            {n.title}
                          </p>
                        </div>
                        {n.body && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                            {n.body}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">{timeAgo}</span>
                          {n.link && (
                            <Link
                              href={n.link}
                              onClick={() => { if (!n.isRead) markRead.mutate(n.id); }}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--bid-orange)] hover:underline"
                            >
                              {t("adminNotifications.review")}
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                          {!n.isRead && (
                            <button
                              onClick={() => markRead.mutate(n.id)}
                              disabled={markRead.isPending}
                              className="text-[11px] font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              {t("adminNotifications.markRead")}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
