import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Check, UserPlus, Loader2, Sparkles, ExternalLink } from "lucide-react";

interface Suggestion {
  companyId: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  category: string | null;
  city: string | null;
  availabilityStatus: string | null;
  verificationStatus: string;
}

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

// Owner-facing strip on a tender: field-matched individuals to invite in one
// click. Only renders when the tender is open to individuals and has matches.
export default function SuggestedIndividuals({ tenderId }: { tenderId: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [invited, setInvited] = useState<Record<string, true>>({});

  const { data } = useQuery<{ suggestions: Suggestion[]; openToIndividuals: boolean }>({
    queryKey: ["/api/tenders", tenderId, "suggested-individuals"],
    queryFn: () => apiRequest("GET", `/api/tenders/${tenderId}/suggested-individuals`).then((r) => r.json()),
  });

  const inviteMutation = useMutation({
    mutationFn: async (individualCompanyId: string) => {
      const res = await apiRequest("POST", `/api/tenders/${tenderId}/invite-individual`, { individualCompanyId });
      const body = await res.json().catch(() => ({}));
      if (!res.ok && body.code !== "ALREADY_INVITED") throw new Error(body.message || "Failed");
      return body;
    },
    onSuccess: (_b, individualCompanyId) => {
      setInvited((s) => ({ ...s, [individualCompanyId]: true }));
      toast({ title: t('suggested.sentTitle'), description: t('suggested.sentDesc') });
    },
    onError: (e: any) => {
      toast({ title: t('suggested.couldntInvite'), description: e.message || t('suggested.tryAgain'), variant: "destructive" });
    },
  });

  const suggestions = data?.suggestions || [];
  if (!data?.openToIndividuals || suggestions.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-[#FE3C01]" />
        <h3 className="text-sm font-semibold text-foreground">{t('suggested.title')}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {t('suggested.subtitle')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions.map((s) => {
          const isInvited = !!invited[s.companyId];
          return (
            <div key={s.companyId} className="rounded-xl border border-border p-3 flex items-center gap-3" data-testid={`suggestion-${s.slug}`}>
              <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                {s.logoUrl ? (
                  <img src={s.logoUrl} alt={s.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">{initialsOf(s.name)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <a href={`/people/${s.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:underline truncate">
                    {s.name}
                  </a>
                  {s.verificationStatus === "verified" && <BadgeCheck className="h-3.5 w-3.5 text-[#FE3C01] flex-shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {[s.category, s.city].filter(Boolean).join(" · ") || t('suggested.individual')}
                </p>
              </div>
              {isInvited ? (
                <Button variant="outline" size="sm" disabled>
                  <Check className="h-3.5 w-3.5 mr-1.5" />{t('suggested.invited')}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => inviteMutation.mutate(s.companyId)}
                  disabled={inviteMutation.isPending && inviteMutation.variables === s.companyId}
                  className="bg-[#FE3C01] hover:bg-[#1A1613] text-white"
                  data-testid={`button-invite-${s.slug}`}
                >
                  {inviteMutation.isPending && inviteMutation.variables === s.companyId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <><UserPlus className="h-3.5 w-3.5 mr-1.5" />{t('suggested.invite')}</>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
