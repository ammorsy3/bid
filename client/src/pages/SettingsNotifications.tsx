// Per-(user, active company) notification preferences. Each toggle controls
// only the current user's own incoming emails — never teammates' or
// counterparties'. Missing rows default to enabled, so a user who's never
// touched their prefs receives everything (matching pre-feature behavior).

import { useMemo } from "react";
import { Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Channel = "email" | "in_app" | "sms";
type Category =
  | "new_proposal"
  | "proposal_decision"
  | "award_outcome"
  | "negotiation_activity"
  | "tender_lifecycle"
  | "qa_activity"
  | "company_admin";

interface PreferenceRow {
  category: string;
  channel: string;
  enabled: boolean;
}

const CATEGORIES: { id: Category; tKey: string }[] = [
  { id: "new_proposal", tKey: "NewProposal" },
  { id: "proposal_decision", tKey: "ProposalDecision" },
  { id: "award_outcome", tKey: "AwardOutcome" },
  { id: "negotiation_activity", tKey: "NegotiationActivity" },
  { id: "tender_lifecycle", tKey: "TenderLifecycle" },
  { id: "qa_activity", tKey: "QaActivity" },
  { id: "company_admin", tKey: "CompanyAdmin" },
];

// Email-only for now. The API still accepts in_app / sms in case we
// re-introduce them later, but they're hidden from the UI.
const CHANNELS: { id: Channel; tKey: string; available: boolean }[] = [
  { id: "email", tKey: "chEmail", available: true },
];

export function SettingsNotifications() {
  const { activeCompany } = useAuthStore();
  const { t, isRtl } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ["/api/notification-preferences", activeCompany?.id ?? "none"];

  const { data, isLoading } = useQuery<PreferenceRow[]>({
    queryKey,
    enabled: !!activeCompany?.id,
  });

  // Build a quick lookup so the render loop is O(1) per cell.
  // Missing rows default to enabled=true.
  const lookup = useMemo(() => {
    const m = new Map<string, boolean>();
    if (Array.isArray(data)) {
      for (const r of data) m.set(`${r.category}|${r.channel}`, r.enabled);
    }
    return m;
  }, [data]);

  const isEnabled = (category: string, channel: string): boolean => {
    const v = lookup.get(`${category}|${channel}`);
    return v === undefined ? true : v;
  };

  const mutation = useMutation({
    mutationFn: async (vars: { category: string; channel: string; enabled: boolean }) => {
      const res = await apiRequest("PATCH", "/api/notification-preferences", vars);
      return (await res.json()) as PreferenceRow;
    },
    // Optimistic update so the toggle feels instant.
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PreferenceRow[]>(queryKey);
      const next: PreferenceRow[] = (() => {
        const list = Array.isArray(previous) ? [...previous] : [];
        const idx = list.findIndex((r) => r.category === vars.category && r.channel === vars.channel);
        if (idx >= 0) list[idx] = { ...list[idx], enabled: vars.enabled };
        else list.push({ category: vars.category, channel: vars.channel, enabled: vars.enabled });
        return list;
      })();
      queryClient.setQueryData(queryKey, next);
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous !== undefined) queryClient.setQueryData(queryKey, ctx.previous);
      const serverMsg = err instanceof ApiError ? err.message : null;
      toast({
        title: t("notifications.saveError"),
        description: serverMsg || t("notifications.saveErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const handleToggle = (category: string, channel: string, next: boolean) => {
    mutation.mutate({ category, channel, enabled: next });
  };

  if (!activeCompany?.id) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            {t("notifications.pageTitle")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{t("notifications.noActiveCompany")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          {t("notifications.pageTitle")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("notifications.pageDescription")}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t("notifications.companyContext", { company: activeCompany.name })}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("notifications.loading")}</p>
      ) : (
        <div className="space-y-3">
          {CATEGORIES.map((cat) => (
            <Card key={cat.id} data-testid={`notif-card-${cat.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold">{t(`notifications.cat${cat.tKey}`)}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t(`notifications.cat${cat.tKey}Desc`)}</p>
                  </div>
                  {CHANNELS.map((ch) => {
                    const enabled = isEnabled(cat.id, ch.id);
                    return (
                      <div key={ch.id} className="flex items-center gap-2 shrink-0 mt-1">
                        <span className="text-sm font-medium text-muted-foreground">{t(`notifications.${ch.tKey}`)}</span>
                        <Switch
                          checked={enabled}
                          disabled={!ch.available || mutation.isPending}
                          onCheckedChange={(v) => handleToggle(cat.id, ch.id, v)}
                          data-testid={`notif-toggle-${cat.id}-${ch.id}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default SettingsNotifications;
