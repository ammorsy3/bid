import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, User } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminVendors() {
  const { toast } = useToast();
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "view" | null>(null);
  const [notes, setNotes] = useState("");

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["/api/admin/vendors/pending"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ vendorId, notes }: { vendorId: string; notes?: string }) => {
      return await apiRequest("POST", `/api/admin/vendors/${vendorId}/approve`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      toast({
        title: "Vendor Approved",
        description: "The vendor has been successfully verified.",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve vendor.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ vendorId, reason }: { vendorId: string; reason: string }) => {
      return await apiRequest("POST", `/api/admin/vendors/${vendorId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      toast({
        title: "Vendor Rejected",
        description: "The vendor application has been rejected.",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject vendor.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setSelectedVendor(null);
    setActionType(null);
    setNotes("");
  };

  const handleApprove = () => {
    if (selectedVendor) {
      approveMutation.mutate({ vendorId: selectedVendor.id, notes });
    }
  };

  const handleReject = () => {
    if (selectedVendor && notes.trim()) {
      rejectMutation.mutate({ vendorId: selectedVendor.id, reason: notes });
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
            Vendor Verification Queue
          </h1>
          <p className="text-gray-600 mt-2">
            Review and approve pending vendor applications
          </p>
        </div>

        {!vendors || vendors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600" data-testid="text-empty-state">
                No pending vendor verifications
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {vendors.map((vendor: any) => (
              <Card key={vendor.id} data-testid={`card-vendor-${vendor.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {vendor.qualification?.displayName || vendor.name}
                        <Badge variant="secondary" data-testid={`badge-status-${vendor.id}`}>
                          Under Review
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <div className="space-y-1">
                          <div>Email: {vendor.email}</div>
                          <div>Legal Name: {vendor.qualification?.legalCompanyName || "N/A"}</div>
                          <div>CR Number: {vendor.qualification?.crNumber || "N/A"}</div>
                          <div>Category: {vendor.qualification?.category || "N/A"}</div>
                          <div>
                            Submitted: {vendor.createdAt ? format(new Date(vendor.createdAt), "PPP") : "N/A"}
                          </div>
                        </div>
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
                        setSelectedVendor(vendor);
                        setActionType("approve");
                      }}
                      data-testid={`button-approve-${vendor.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVendor(vendor);
                        setActionType("reject");
                      }}
                      data-testid={`button-reject-${vendor.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setSelectedVendor(vendor);
                        setActionType("view");
                      }}
                      data-testid={`button-view-profile-${vendor.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Profile View Dialog */}
      <Dialog open={actionType === "view"} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-profile">
          <DialogHeader>
            <DialogTitle data-testid="text-profile-title">Vendor Profile</DialogTitle>
            <DialogDescription>Complete vendor pre-qualification details</DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Display Name</p>
                    <p className="font-medium">{selectedVendor.qualification?.displayName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Legal Company Name</p>
                    <p className="font-medium">{selectedVendor.qualification?.legalCompanyName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedVendor.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">CR Number</p>
                    <p className="font-medium">{selectedVendor.qualification?.crNumber || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Category & Location */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Business Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-medium">{selectedVendor.qualification?.category || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="font-medium">{selectedVendor.qualification?.city || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Certifications */}
              {selectedVendor.qualification?.certifications && selectedVendor.qualification.certifications.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Certifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.qualification.certifications.map((cert: string, index: number) => (
                      <Badge key={index} variant="secondary">{cert}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {selectedVendor.qualification?.documents && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Uploaded Documents</h3>
                  <div className="space-y-2">
                    {Object.entries(selectedVendor.qualification.documents).map(([key, url]: [string, any]) => (
                      url && (
                        <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(url, '_blank')}
                          >
                            View Document
                          </Button>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Submission Date */}
              <div>
                <p className="text-sm text-gray-600">Submitted On</p>
                <p className="font-medium">
                  {selectedVendor.createdAt ? format(new Date(selectedVendor.createdAt), "PPPp") : "N/A"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} data-testid="button-close-profile">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog (Approve/Reject) */}
      <Dialog open={actionType === "approve" || actionType === "reject"} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent data-testid="dialog-action">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {actionType === "approve" ? "Approve Vendor" : "Reject Vendor"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "This vendor will be verified and can receive tender invitations."
                : "Provide a reason for rejection. The vendor will be notified."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Vendor: {selectedVendor?.name}</p>
              <p className="text-sm text-gray-600">Email: {selectedVendor?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="notes-input">
                {actionType === "approve" ? "Notes (Optional)" : "Rejection Reason *"}
              </label>
              <Textarea
                id="notes-input"
                placeholder={
                  actionType === "approve"
                    ? "Add any notes about this approval..."
                    : "Explain why this vendor is being rejected..."
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2"
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={actionType === "approve" ? handleApprove : handleReject}
              disabled={
                (actionType === "reject" && !notes.trim()) ||
                approveMutation.isPending ||
                rejectMutation.isPending
              }
              data-testid="button-confirm"
            >
              {approveMutation.isPending || rejectMutation.isPending
                ? "Processing..."
                : actionType === "approve"
                ? "Approve"
                : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
