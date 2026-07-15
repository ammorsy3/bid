import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield, UserPlus, Search, Crown, BarChart3, Building2, UserCheck,
  Users2, FileCheck, Clock, CheckCircle2, XCircle, FileText,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { format } from "date-fns";
import AdminLayout from "@/components/AdminLayout";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
}

interface VerificationFunnel {
  total: number;
  uploadedDocs: number;
  awaitingReview: number;
  verified: number;
  rejected: number;
  noDocs: number;
}

interface VerificationAnalytics {
  totalUsers: number;
  totalWorkspaces: number;
  companies: VerificationFunnel;
  freelancers: VerificationFunnel;
  documentTypes: {
    crCertificate: number;
    vatCertificate: number;
    gosiCertificate: number;
    nationalAddressCertificate: number;
    nationalIdCard: number;
    other: number;
  };
}

type Tab = "users" | "analytics";

export default function AdminUsers() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("users");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users", searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<VerificationAnalytics>({
    queryKey: ["/api/admin/verification-analytics"],
    enabled: tab === "analytics",
  });

  const promoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/promote`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: t('admin.userPromoted'), description: t('admin.userPromotedDesc') });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.failedPromoteUser'),
        variant: "destructive",
      });
    },
  });

  return (
    <AdminLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display font-black text-3xl text-gray-900 dark:text-foreground tracking-[-0.04em]" data-testid="text-page-title">
            {t('admin.userManagement')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('admin.userManagementDesc')}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-border dark:border-border">
          {([
            { key: "users" as Tab, label: t("adminAnalytics.tabUsers"), Icon: Users2 },
            { key: "analytics" as Tab, label: t("adminAnalytics.tabAnalytics"), Icon: BarChart3 },
          ]).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key
                  ? "border-[var(--bid-orange)] text-[var(--bid-orange)]"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "users" ? (
          <UsersTab
            users={users}
            isLoading={isLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            promoteMutation={promoteMutation}
            t={t}
          />
        ) : (
          <AnalyticsTab analytics={analytics} isLoading={analyticsLoading} t={t} />
        )}
      </div>
    </AdminLayout>
  );
}

// ---------------------------------------------------------------------------
// USERS TAB (original list)
// ---------------------------------------------------------------------------
function UsersTab({ users, isLoading, searchQuery, setSearchQuery, promoteMutation, t }: {
  users: AdminUser[] | undefined;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  promoteMutation: any;
  t: (k: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <>
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('admin.searchUsersPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="border-border dark:border-border bg-white dark:bg-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            {t('admin.platformUsers')}
          </CardTitle>
          <CardDescription className="text-xs">
            {users ? (searchQuery ? t('admin.usersCountMatching', { count: users.length, query: searchQuery }) : t('admin.usersCountRecent', { count: users.length })) : t('admin.loadingEllipsis')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-14 bg-gray-100 dark:bg-card rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !users || users.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchQuery ? t('admin.noUsersMatching', { query: searchQuery }) : t('admin.noUsersFound')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-card flex items-center justify-center text-sm font-semibold text-muted-foreground dark:text-muted-foreground flex-shrink-0">
                      {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-foreground truncate">{user.name || user.username}</p>
                        {user.isAdmin && (
                          <Badge className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] px-1.5 py-0">
                            <Crown className="h-2.5 w-2.5 mr-0.5" />
                            {t('admin.adminBadge')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email} &middot; {t('admin.joinedOn', { date: format(new Date(user.createdAt), 'PP') })}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {user.isAdmin ? (
                      <span className="text-xs text-gray-400 dark:text-gray-500">{t('admin.platformAdmin')}</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => promoteMutation.mutate(user.id)}
                        disabled={promoteMutation.isPending}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        {t('admin.promoteBtn')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// ANALYTICS TAB (verification funnel)
// ---------------------------------------------------------------------------
function AnalyticsTab({ analytics, isLoading, t }: {
  analytics: VerificationAnalytics | undefined;
  isLoading: boolean;
  t: (k: string, vars?: Record<string, string | number>) => string;
}) {
  if (isLoading || !analytics) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-card rounded-xl animate-pulse" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-card rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const totalVerified = analytics.companies.verified + analytics.freelancers.verified;
  const totalAwaiting = analytics.companies.awaitingReview + analytics.freelancers.awaitingReview;

  const kpis = [
    { label: t("adminAnalytics.totalUsers"), value: analytics.totalUsers, Icon: Users2, fg: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
    { label: t("adminAnalytics.totalWorkspaces"), value: analytics.totalWorkspaces, Icon: Building2, fg: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40" },
    { label: t("adminAnalytics.awaitingReview"), value: totalAwaiting, Icon: Clock, fg: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
    { label: t("adminAnalytics.verified"), value: totalVerified, Icon: CheckCircle2, fg: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  ];

  const docTypes = [
    { label: t("adminAnalytics.crCertificate"), value: analytics.documentTypes.crCertificate },
    { label: t("adminAnalytics.vatCertificate"), value: analytics.documentTypes.vatCertificate },
    { label: t("adminAnalytics.gosiCertificate"), value: analytics.documentTypes.gosiCertificate },
    { label: t("adminAnalytics.nationalAddress"), value: analytics.documentTypes.nationalAddressCertificate },
    { label: t("adminAnalytics.nationalIdCard"), value: analytics.documentTypes.nationalIdCard },
    { label: t("adminAnalytics.other"), value: analytics.documentTypes.other },
  ];
  const docMax = Math.max(1, analytics.totalWorkspaces);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border dark:border-border bg-white dark:bg-background p-5">
            <div className={`${k.bg} rounded-lg p-2 w-fit mb-3`}>
              <k.Icon className={`h-4 w-4 ${k.fg}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-foreground mb-0.5">{k.value}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Funnels */}
      <div className="grid gap-4 lg:grid-cols-2">
        <FunnelCard title={t("adminAnalytics.companies")} Icon={Building2} funnel={analytics.companies} t={t} />
        <FunnelCard title={t("adminAnalytics.freelancers")} Icon={UserCheck} funnel={analytics.freelancers} t={t} />
      </div>

      {/* Document types */}
      <Card className="border-border dark:border-border bg-white dark:bg-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            {t("adminAnalytics.documentsOnFile")}
          </CardTitle>
          <CardDescription className="text-xs">{t("adminAnalytics.documentsOnFileDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {docTypes.map((d) => (
            <div key={d.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">{d.label}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-foreground tabular-nums">
                  {d.value} <span className="text-xs font-normal text-gray-400">{t("adminAnalytics.ofTotal", { total: docMax })}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-card overflow-hidden">
                <div className="h-full rounded-full bg-[var(--bid-orange)]" style={{ width: `${Math.round((d.value / docMax) * 100)}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function FunnelCard({ title, Icon, funnel, t }: {
  title: string;
  Icon: any;
  funnel: VerificationFunnel;
  t: (k: string, vars?: Record<string, string | number>) => string;
}) {
  const max = Math.max(1, funnel.total);
  const rows = [
    { label: t("adminAnalytics.total"), value: funnel.total, color: "bg-gray-400 dark:bg-gray-500", Icon: Users2 },
    { label: t("adminAnalytics.uploadedDocs"), value: funnel.uploadedDocs, color: "bg-blue-500", Icon: FileCheck },
    { label: t("adminAnalytics.awaitingReview"), value: funnel.awaitingReview, color: "bg-amber-500", Icon: Clock },
    { label: t("adminAnalytics.verified"), value: funnel.verified, color: "bg-emerald-500", Icon: CheckCircle2 },
    { label: t("adminAnalytics.rejected"), value: funnel.rejected, color: "bg-red-500", Icon: XCircle },
  ];

  return (
    <Card className="border-border dark:border-border bg-white dark:bg-background">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                <r.Icon className="h-3.5 w-3.5 text-gray-400" />
                {r.label}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-foreground tabular-nums">{r.value}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-card overflow-hidden">
              <div className={`h-full rounded-full ${r.color}`} style={{ width: `${Math.round((r.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
