import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Check, FileText } from "lucide-react";

interface CompanyTender {
  id: string;
  title: string;
  status: string;
  category?: string | null;
  targetAudienceTypes?: string[] | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  individualCompanyId: string;
  individualName: string;
}

export default function InviteToTenderModal({ open, onOpenChange, individualCompanyId, individualName }: Props) {
  const { t: tr } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmAudienceFor, setConfirmAudienceFor] = useState<string | null>(null);

  const { data: tenders = [], isLoading } = useQuery<CompanyTender[]>({
    queryKey: ["/api/tenders"],
    queryFn: () => apiRequest("GET", "/api/tenders").then((r) => r.json()),
    enabled: open,
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ tenderId, addAudience }: { tenderId: string; addAudience?: boolean }) => {
      const res = await apiRequest("POST", `/api/tenders/${tenderId}/invite-individual`, {
        individualCompanyId,
        addAudience,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(body.message || "Failed to invite");
        (err as any).code = body.code;
        throw err;
      }
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      toast({ title: tr('inviteTender.sentTitle'), description: tr('inviteTender.sentDesc', { name: individualName }) });
      setConfirmAudienceFor(null);
      onOpenChange(false);
    },
    onError: (e: any) => {
      if (e.code === "AUDIENCE_MISMATCH") {
        setConfirmAudienceFor(selectedId);
        return;
      }
      if (e.code === "ALREADY_INVITED") {
        toast({ title: tr('inviteTender.alreadyInvited'), description: e.message });
        return;
      }
      toast({ title: tr('inviteTender.couldntInvite'), description: e.message || tr('inviteTender.tryAgain'), variant: "destructive" });
    },
  });

  const invitable = tenders.filter((t) => t.status !== "closed" && t.status !== "awarded");

  const audienceIncludesIndividual = (t: CompanyTender) =>
    Array.isArray(t.targetAudienceTypes) && t.targetAudienceTypes.includes("individual");

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!inviteMutation.isPending) onOpenChange(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tr('inviteTender.title', { name: individualName })}</DialogTitle>
            <DialogDescription>{tr('inviteTender.subtitle')}</DialogDescription>
          </DialogHeader>

          <div className="mt-2 max-h-[50vh] overflow-y-auto -mx-1 px-1 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : invitable.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8 px-4 bg-muted rounded-xl border border-border">
                {tr('inviteTender.noTenders')}
              </div>
            ) : (
              invitable.map((tender) => {
                const selected = selectedId === tender.id;
                const openToIndividuals = audienceIncludesIndividual(tender);
                return (
                  <button
                    key={tender.id}
                    onClick={() => setSelectedId(tender.id)}
                    className={`w-full text-start rounded-xl border p-3 flex items-start gap-3 transition-colors ${selected ? "border-[#FE3C01] bg-[#FE3C01]/[0.04]" : "border-border hover:border-foreground/20"}`}
                    data-testid={`tender-option-${tender.id}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? "bg-[#FE3C01]/10" : "bg-muted"}`}>
                      {selected ? <Check className="h-4 w-4 text-[#FE3C01]" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tender.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {tender.category && <span className="text-xs text-muted-foreground">{tender.category}</span>}
                        {openToIndividuals ? (
                          <span className="text-[11px] font-medium text-[var(--state-won)]">{tr('inviteTender.openToIndividuals')}</span>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-600">{tr('inviteTender.companiesOnly')}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={inviteMutation.isPending}>
              {tr('inviteTender.cancel')}
            </Button>
            <Button
              onClick={() => selectedId && inviteMutation.mutate({ tenderId: selectedId })}
              disabled={!selectedId || inviteMutation.isPending}
              className="bg-[#FE3C01] hover:bg-[#1A1613] text-white"
              data-testid="button-send-invite"
            >
              {inviteMutation.isPending && !confirmAudienceFor ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{tr('inviteTender.sending')}</>
              ) : (
                <><Send className="h-4 w-4 mr-2" />{tr('inviteTender.sendInvite')}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audience-mismatch confirmation */}
      <AlertDialog open={!!confirmAudienceFor} onOpenChange={(v) => { if (!v) setConfirmAudienceFor(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr('inviteTender.mismatchTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tr('inviteTender.mismatchDesc', { name: individualName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={inviteMutation.isPending}>{tr('inviteTender.keepAsIs')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmAudienceFor) inviteMutation.mutate({ tenderId: confirmAudienceFor, addAudience: true });
              }}
              disabled={inviteMutation.isPending}
              className="bg-[#FE3C01] hover:bg-[#1A1613]"
            >
              {inviteMutation.isPending ? tr('inviteTender.adding') : tr('inviteTender.addAndInvite')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
