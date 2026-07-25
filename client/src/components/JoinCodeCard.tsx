import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, Copy, RefreshCw, Loader2, Check } from "lucide-react";

// Company/team admins view, share, and regenerate their reusable join code +
// invite link. Anyone who enters the code (or opens the link) joins instantly.
export default function JoinCodeCard() {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const { data, isLoading } = useQuery<{ code: string; link: string }>({
    queryKey: ["/api/company/join-code"],
    queryFn: () => apiRequest("GET", "/api/company/join-code").then((r) => r.json()),
  });

  const regen = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/company/join-code/regenerate");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (d) => {
      queryClient.setQueryData(["/api/company/join-code"], d);
      toast({ title: t('joinCodeCard.regenTitle'), description: t('joinCodeCard.regenDesc') });
    },
    onError: () => toast({ title: t('joinCodeCard.regenFailed'), variant: "destructive" }),
  });

  const code = data?.code || "";
  const fullLink = data?.link ? `${window.location.origin}${data.link}` : "";

  const copy = (text: string, which: "code" | "link") => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display font-black text-xl tracking-[-0.02em] flex items-center gap-2">
        <KeyRound className="h-5 w-5" />
        {t('joinCodeCard.title')}
      </h2>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('joinCodeCard.desc')}
          </p>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-lg tracking-[0.3em] bg-muted rounded-lg px-4 py-3 border border-border" dir="ltr" data-testid="join-code-value">
                  {code}
                </div>
                <Button variant="outline" size="icon" onClick={() => copy(code, "code")} aria-label="Copy code" data-testid="button-copy-code">
                  {copied === "code" ? <Check className="h-4 w-4 text-[var(--state-won)]" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => regen.mutate()} disabled={regen.isPending} aria-label="Regenerate code" data-testid="button-regen-code">
                  {regen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-sm text-muted-foreground truncate bg-muted rounded-lg px-4 py-2.5 border border-border" dir="ltr" data-testid="join-link-value">
                  {fullLink}
                </div>
                <Button variant="outline" size="icon" onClick={() => copy(fullLink, "link")} aria-label="Copy link" data-testid="button-copy-link">
                  {copied === "link" ? <Check className="h-4 w-4 text-[var(--state-won)]" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
