import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, User, Mail, Search, ShieldCheck, UserCheck } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import AdminLayout from "@/components/AdminLayout";
import { AdminPage, AdminHeader, AdminCard, AdminEmpty, SkeletonList } from "@/components/admin/AdminUI";

interface FreelancerEntry {
  id: string;
  name: string;
  nationalIdNumber: string | null;
  verificationStatus: string;
  createdAt: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function AdminFreelancers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<FreelancerEntry | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");

  const { data: freelancers = [], isLoading } = useQuery<FreelancerEntry[]>({
    queryKey: ["/api/admin/freelancers/pending"],
    queryFn: async () => {
      const res = await fetch("/api/admin/freelancers/pending", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const filteredFreelancers = useMemo(() => {
    if (!searchQuery.trim()) return freelancers;
    const q = searchQuery.toLowerCase();
    return freelancers.filter(f =>
      (f.name || '').toLowerCase().includes(q) ||
      (f.nationalIdNumber || '').includes(q) ||
      (f.owner?.name || '').toLowerCase().includes(q) ||
      (f.owner?.email || '').toLowerCase().includes(q)
    );
  }, [freelancers, searchQuery]);

  const approveMutation = useMutation({
    mutationFn: async (companyId: string) =>
      apiRequest("POST", `/api/admin/companies/${companyId}/verify`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/freelancers/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      toast({ title: "Individual verified", description: "National ID has been approved." });
      handleClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Could not verify individual.", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (companyId: string) =>
      apiRequest("POST", `/api/admin/companies/${companyId}/reject`, { reason: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/freelancers/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      toast({ title: "Individual rejected", description: "Verification has been declined." });
      handleClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Could not reject individual.", variant: "destructive" });
    },
  });

  const handleClose = () => {
    setSelected(null);
    setActionType(null);
    setNotes("");
  };

  return (
    <AdminLayout>
      <AdminPage width="narrow">
        <AdminHeader
          eyebrow="Verification"
          eyebrowIcon={UserCheck}
          title="Individual Verification Queue"
          subtitle="Review pending individual identity (National ID) submissions."
        />

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, National ID, or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
        </div>

        {isLoading ? (
          <SkeletonList rows={3} />
        ) : filteredFreelancers.length === 0 ? (
          <AdminEmpty
            icon={ShieldCheck}
            title={searchQuery ? `No individuals match "${searchQuery}"` : "No pending individual verifications."}
            tone="positive"
          />
        ) : (
          <div className="space-y-3">
            {filteredFreelancers.map((f) => (
              <AdminCard key={f.id} hover>
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-foreground">
                          {f.owner?.name || f.name || "—"}
                        </span>
                        <Badge variant="outline" className="text-[11px]">
                          {f.verificationStatus}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        {f.owner?.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {f.owner.email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          National ID:{" "}
                          <span className="font-mono font-semibold text-gray-700 dark:text-gray-300 tracking-wider">
                            {f.nationalIdNumber || <em className="text-red-400 not-italic">Not provided</em>}
                          </span>
                        </span>
                        <span>Submitted {format(new Date(f.createdAt), "PP")}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300"
                        onClick={() => { setSelected(f); setActionType("reject"); }}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => { setSelected(f); setActionType("approve"); }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1.5" />
                        Verify
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </AdminCard>
            ))}
          </div>
        )}
      </AdminPage>

      {/* Approve dialog */}
      <Dialog open={actionType === "approve"} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Individual</DialogTitle>
            <DialogDescription>
              Approve National ID{" "}
              <span className="font-mono font-semibold">
                {selected?.nationalIdNumber}
              </span>{" "}
              for {selected?.owner?.name || selected?.name}.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any verification notes…"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={approveMutation.isPending}
              onClick={() => selected && approveMutation.mutate(selected.id)}
            >
              {approveMutation.isPending ? "Verifying…" : "Verify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={actionType === "reject"} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Individual</DialogTitle>
            <DialogDescription>
              Decline verification for {selected?.owner?.name || selected?.name}. A reason is required.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium">Rejection reason *</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain why the verification is being rejected…"
              className="mt-2"
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!notes.trim() || rejectMutation.isPending}
              onClick={() => selected && rejectMutation.mutate(selected.id)}
            >
              {rejectMutation.isPending ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
