import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Building2 } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminVendors() {
  const { toast } = useToast();
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "view" | null>(null);
  const [notes, setNotes] = useState("");

  const { data: companies, isLoading } = useQuery({
    queryKey: ["/api/admin/companies/pending"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ companyId, notes }: { companyId: string; notes?: string }) => {
      return await apiRequest("POST", `/api/admin/companies/${companyId}/verify`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      toast({
        title: "Company Verified",
        description: "The company has been successfully verified.",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to verify company.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ companyId, reason }: { companyId: string; reason: string }) => {
      return await apiRequest("POST", `/api/admin/companies/${companyId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      toast({
        title: "Company Rejected",
        description: "The company application has been rejected.",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject company.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setSelectedCompany(null);
    setActionType(null);
    setNotes("");
  };

  const handleApprove = () => {
    if (selectedCompany) {
      approveMutation.mutate({ companyId: selectedCompany.id, notes });
    }
  };

  const handleReject = () => {
    if (selectedCompany && notes.trim()) {
      rejectMutation.mutate({ companyId: selectedCompany.id, reason: notes });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded animate-pulse"></div>
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
            Company Verification Queue
          </h1>
          <p className="text-gray-600 mt-2">
            Review and approve pending company registrations
          </p>
        </div>

        {!companies || companies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600" data-testid="text-empty-state">
                No pending company verifications
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {companies.map((company: any) => (
              <Card key={company.id} data-testid={`card-company-${company.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {company.name}
                        <Badge variant="outline" className="ml-2">
                          {company.verificationStatus}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2 space-y-1">
                        <div><strong>Legal Name:</strong> {company.legalName}</div>
                        <div><strong>CR Number:</strong> {company.crNumber}</div>
                        {company.vatNumber && <div><strong>VAT Number:</strong> {company.vatNumber}</div>}
                        <div><strong>City:</strong> {company.city || 'N/A'}</div>
                        {company.category && <div><strong>Category:</strong> {company.category}</div>}
                        <div><strong>Submitted:</strong> {format(new Date(company.createdAt), 'PPp')}</div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCompany(company);
                        setActionType("view");
                      }}
                      data-testid={`button-view-${company.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedCompany(company);
                        setActionType("approve");
                      }}
                      data-testid={`button-approve-${company.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedCompany(company);
                        setActionType("reject");
                      }}
                      data-testid={`button-reject-${company.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Details Dialog */}
      <Dialog open={actionType === "view"} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Company Details</DialogTitle>
            <DialogDescription>Full information about this company</DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Company Name:</strong> {selectedCompany.name}</div>
                  <div><strong>Legal Name:</strong> {selectedCompany.legalName}</div>
                  <div><strong>CR Number:</strong> {selectedCompany.crNumber}</div>
                  <div><strong>VAT Number:</strong> {selectedCompany.vatNumber || 'N/A'}</div>
                  <div><strong>City:</strong> {selectedCompany.city || 'N/A'}</div>
                  <div><strong>Category:</strong> {selectedCompany.category || 'N/A'}</div>
                </div>
              </div>
              
              {selectedCompany.profile && (
                <div>
                  <h3 className="font-semibold mb-2">Profile</h3>
                  <div className="text-sm space-y-1">
                    <div><strong>Display Name:</strong> {selectedCompany.profile.displayName}</div>
                    {selectedCompany.profile.bio && <div><strong>Bio:</strong> {selectedCompany.profile.bio}</div>}
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="font-semibold mb-2">Status</h3>
                <div className="text-sm space-y-1">
                  <div><strong>Verification:</strong> {selectedCompany.verificationStatus}</div>
                  <div><strong>Onboarding:</strong> {selectedCompany.onboardingState}</div>
                  <div><strong>Created:</strong> {format(new Date(selectedCompany.createdAt), 'PPp')}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} data-testid="button-close-view">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={actionType === "approve"} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Company</DialogTitle>
            <DialogDescription>
              Verify this company registration. You can add optional notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any verification notes..."
                className="mt-2"
                data-testid="textarea-approve-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} data-testid="button-cancel-approve">
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "Verifying..." : "Verify Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionType === "reject"} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Company</DialogTitle>
            <DialogDescription>
              Reject this company registration. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rejection Reason *</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain why this company is being rejected..."
                className="mt-2"
                required
                data-testid="textarea-reject-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} data-testid="button-cancel-reject">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!notes.trim() || rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
