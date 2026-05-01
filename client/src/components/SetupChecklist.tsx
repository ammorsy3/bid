import { useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuthStore } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, X, ListChecks } from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  destination: string;
}

const DISMISSED_KEY_PREFIX = "setup-checklist-dismissed:";

export function SetupChecklist() {
  const { activeCompany } = useAuthStore();
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  // Restore per-company dismissal from localStorage
  useEffect(() => {
    if (!activeCompany?.id) return;
    setDismissed(localStorage.getItem(DISMISSED_KEY_PREFIX + activeCompany.id) === "1");
  }, [activeCompany?.id]);

  const { data: members = [] } = useQuery<{ userId: string }[]>({
    queryKey: ["/api/companies", activeCompany?.id, "members"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/companies/${activeCompany!.id}/members`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeCompany?.id,
  });

  const items = useMemo<ChecklistItem[]>(() => {
    const profile = activeCompany?.profile;
    const verified = activeCompany?.verificationStatus === "verified";
    const hasLogo = !!profile?.logoUrl;
    const hasBioOrWebsite = !!(profile?.bio?.trim()) || !!(profile?.socialLinks?.website?.trim());
    const hasTeammates = members.length > 1;

    return [
      { id: "account", label: "Account created", hint: "You're in.", done: true, destination: "/settings" },
      { id: "workspace", label: "Workspace started", hint: "Name and category set.", done: !!activeCompany, destination: "/settings?tab=company" },
      { id: "verify", label: "Verify your company", hint: "Unlocks creating tenders and submitting offers.", done: verified, destination: "/settings?tab=company#verification-info" },
      { id: "logo", label: "Upload a company logo", hint: "Helps your profile stand out.", done: hasLogo, destination: "/settings?tab=company" },
      { id: "bioWebsite", label: "Add a bio and website", hint: "Tell others what you do.", done: hasBioOrWebsite, destination: "/company/edit" },
      { id: "team", label: "Invite teammates", hint: "Collaborate inside your workspace.", done: hasTeammates, destination: "/settings?tab=company" },
    ];
  }, [activeCompany, members]);

  const total = items.length;
  const doneCount = items.filter(i => i.done).length;
  const allDone = doneCount === total;

  if (!activeCompany || dismissed || allDone) return null;

  const handleDismiss = () => {
    if (!activeCompany?.id) return;
    localStorage.setItem(DISMISSED_KEY_PREFIX + activeCompany.id, "1");
    setDismissed(true);
  };

  return (
    <Card className="border-2 border-[#E25E45]/20 bg-gradient-to-br from-[#E25E45]/5 to-transparent" data-testid="card-setup-checklist">
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#E25E45]/10 rounded-xl flex items-center justify-center shrink-0">
              <ListChecks className="w-5 h-5 text-[#E25E45]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Set up your workspace</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {doneCount} of {total} complete — keep going to unlock the full platform.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            aria-label="Dismiss"
            data-testid="button-dismiss-setup-checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-[#E25E45] transition-all duration-300"
            style={{ width: `${(doneCount / total) * 100}%` }}
          />
        </div>

        <div className="space-y-2">
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => !item.done && setLocation(item.destination)}
              disabled={item.done}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                item.done
                  ? "cursor-default opacity-60"
                  : "hover:bg-white dark:hover:bg-neutral-800 cursor-pointer"
              }`}
              data-testid={`row-checklist-${item.id}`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  item.done
                    ? "bg-emerald-500 text-white"
                    : "border-2 border-neutral-300 dark:border-neutral-600"
                }`}
              >
                {item.done && <Check className="h-3 w-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    item.done ? "line-through text-neutral-400" : "text-neutral-900 dark:text-white"
                  }`}
                >
                  {item.label}
                </p>
                {!item.done && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{item.hint}</p>
                )}
              </div>
              {!item.done && (
                <ArrowRight className="h-4 w-4 text-neutral-400 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
