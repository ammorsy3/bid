import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, CheckCircle, XCircle, Loader2, Building2, Mail, Phone, MessageSquare, UserCheck, FileText, UserPlus, Eye, ShieldCheck, Clock } from "lucide-react";
import VendorProfileDrawer from "@/components/VendorProfileDrawer";

interface VendorProfile {
  id: string;
  username: string;
  email: string;
  name: string;
  company: string;
  category: string;
  bio: string;
  rating: string | null;
  verificationStatus: string;
  joinedAt: string;
  joinMethod: string;
}

interface JoinRequest {
  id: string;
  requesterId: string;
  vendorId: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  decidedAt: string | null;
  vendor?: {
    id: string;
    name: string;
    email: string;
    company: string;
    expertise: string | null;
    verificationStatus: string;
  };
}

export default function VendorsBase() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [profileJoinRequestId, setProfileJoinRequestId] = useState<string | null>(null);

  // Fetch vendors in base
  const { data: vendors = [], isLoading: loadingVendors } = useQuery<VendorProfile[]>({
    queryKey: ['/api/vendors-base', searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/vendors-base${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch vendors");
      return response.json();
    }
  });

  // Fetch pending join requests
  const { data: pendingRequests = [] } = useQuery<JoinRequest[]>({
    queryKey: ['/api/join-requests', 'pending'],
    queryFn: async () => {
      const response = await fetch('/api/join-requests?status=pending', {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch join requests");
      return response.json();
    }
  });

  // Fetch all join requests for history
  const { data: allRequests = [] } = useQuery<JoinRequest[]>({
    queryKey: ['/api/join-requests'],
    queryFn: async () => {
      const response = await fetch('/api/join-requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch join requests");
      return response.json();
    }
  });

  // Approve join request mutation
  const approveRequest = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/join-requests/${id}/approve`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendors-base'] });
      toast({
        title: "Request approved",
        description: data.message || "Vendor has been added to your base",
      });
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Reject join request mutation
  const rejectRequest = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/join-requests/${id}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/join-requests'] });
      toast({
        title: "Request rejected",
        description: "Vendor application has been declined",
      });
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">Vendors Base</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Manage your approved vendors and review new applications
        </p>
      </div>

      <Tabs defaultValue="vendors" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2" data-tour="vendors-tabs">
          <TabsTrigger value="vendors" className="gap-2" data-testid="tab-vendors">
            <Users className="h-4 w-4" />
            Vendors ({vendors.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2" data-testid="tab-requests" data-tour="vendors-requests-tab">
            <UserPlus className="h-4 w-4" />
            Join Requests
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2" data-testid="badge-pending-count">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-6">
          {/* Search */}
          <Card data-tour="vendors-search">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors by name, company, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </CardContent>
          </Card>

          {/* Vendors List */}
          {loadingVendors ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : vendors.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-title">
                  {searchQuery ? "No vendors found" : "No vendors yet"}
                </h3>
                <p className="text-muted-foreground text-center max-w-md" data-testid="text-empty-description">
                  {searchQuery 
                    ? "Try adjusting your search terms" 
                    : "Your approved vendors will appear here. Invite vendors or review join requests to build your base."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {vendors.map((vendor) => (
                <Card key={vendor.id} className="hover:shadow-lg transition-shadow" data-testid={`card-vendor-${vendor.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-xl" data-testid={`text-vendor-name-${vendor.id}`}>
                              {vendor.company}
                            </CardTitle>
                            {vendor.verificationStatus === 'verified' && (
                              <Badge variant="secondary" className="gap-1" data-testid={`badge-verified-${vendor.id}`}>
                                <CheckCircle className="h-3 w-3" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <CardDescription data-testid={`text-vendor-category-${vendor.id}`}>
                            {vendor.category}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge 
                        variant={vendor.joinMethod === 'invitation' ? 'default' : 'outline'}
                        data-testid={`badge-join-method-${vendor.id}`}
                      >
                        {vendor.joinMethod === 'invitation' ? 'Invited' : 'Applied'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {vendor.bio && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-vendor-bio-${vendor.id}`}>
                        {vendor.bio}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span data-testid={`text-vendor-email-${vendor.id}`}>{vendor.email}</span>
                      </div>
                      {vendor.rating && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Rating:</span>
                          <Badge variant="secondary" data-testid={`text-vendor-rating-${vendor.id}`}>
                            {vendor.rating}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" data-testid={`button-view-profile-${vendor.id}`}>
                        <FileText className="h-4 w-4 mr-2" />
                        View Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Join Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          {pendingRequests.length > 0 && (
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="text-pending-title">
                  <UserPlus className="h-5 w-5" />
                  Pending Requests ({pendingRequests.length})
                </CardTitle>
                <CardDescription>
                  Review and approve vendor applications to add them to your base
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingRequests.map((request) => (
                  <Card key={request.id} className="border-primary/20" data-testid={`card-request-${request.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <CardTitle className="text-lg" data-testid={`text-request-company-${request.id}`}>
                              {request.vendor?.company || 'Unknown Vendor'}
                            </CardTitle>
                            <Badge 
                              variant={
                                request.vendor?.verificationStatus === 'verified' ? 'default' :
                                request.vendor?.verificationStatus === 'under_review' ? 'secondary' :
                                'outline'
                              }
                              className={
                                request.vendor?.verificationStatus === 'verified' 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : request.vendor?.verificationStatus === 'under_review'
                                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                  : 'bg-gray-100 text-gray-800 border-gray-200'
                              }
                              data-testid={`badge-request-status-${request.id}`}
                            >
                              {request.vendor?.verificationStatus === 'verified' && <ShieldCheck className="h-3 w-3 mr-1" />}
                              {request.vendor?.verificationStatus === 'under_review' && <Clock className="h-3 w-3 mr-1" />}
                              {request.vendor?.verificationStatus === 'verified' ? 'Verified' : 
                               request.vendor?.verificationStatus === 'under_review' ? 'Under Review' : 
                               'Not Verified'}
                            </Badge>
                          </div>
                          <CardDescription data-testid={`text-request-category-${request.id}`}>
                            {request.vendor?.expertise || 'No category'}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setProfileJoinRequestId(request.id);
                              setProfileDrawerOpen(true);
                            }}
                            data-testid={`button-view-profile-${request.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setSelectedRequest(request)}
                                data-testid={`button-review-${request.id}`}
                              >
                                Review
                              </Button>
                            </DialogTrigger>
                          <DialogContent data-testid="dialog-review">
                            <DialogHeader>
                              <DialogTitle data-testid="text-dialog-title">
                                Review Application: {selectedRequest?.vendor?.company || 'Unknown Vendor'}
                              </DialogTitle>
                              <DialogDescription>
                                Decide whether to approve or reject this vendor application
                              </DialogDescription>
                            </DialogHeader>
                            {selectedRequest && (
                              <div className="space-y-4">
                                <div className="grid gap-3">
                                  <div>
                                    <label className="text-sm font-medium">Company Name</label>
                                    <p className="text-sm text-muted-foreground" data-testid="text-dialog-company">
                                      {selectedRequest.vendor?.company || 'Unknown'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Contact Person</label>
                                    <p className="text-sm text-muted-foreground" data-testid="text-dialog-contact">
                                      {selectedRequest.vendor?.name || 'Unknown'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Email</label>
                                    <p className="text-sm text-muted-foreground" data-testid="text-dialog-email">
                                      {selectedRequest.vendor?.email || 'Unknown'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Expertise</label>
                                    <p className="text-sm text-muted-foreground" data-testid="text-dialog-expertise">
                                      {selectedRequest.vendor?.expertise || 'Not specified'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Verification Status</label>
                                    <Badge variant={selectedRequest.vendor?.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                                      {selectedRequest.vendor?.verificationStatus || 'unknown'}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                  <Button
                                    onClick={() => approveRequest.mutate(selectedRequest.id)}
                                    disabled={approveRequest.isPending || rejectRequest.isPending}
                                    className="flex-1"
                                    data-testid="button-approve"
                                  >
                                    {approveRequest.isPending ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => rejectRequest.mutate(selectedRequest.id)}
                                    disabled={approveRequest.isPending || rejectRequest.isPending}
                                    variant="destructive"
                                    className="flex-1"
                                    data-testid="button-reject"
                                  >
                                    {rejectRequest.isPending ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <XCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span data-testid={`text-request-email-${request.id}`}>{request.vendor?.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          <span data-testid={`text-request-name-${request.id}`}>{request.vendor?.name || 'N/A'}</span>
                        </div>
                      </div>
                      {request.vendor?.expertise && (
                        <div className="flex items-start gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <p className="text-muted-foreground" data-testid={`text-request-expertise-${request.id}`}>
                            {request.vendor.expertise}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-history-title">Request History</CardTitle>
              <CardDescription>
                View all past vendor applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allRequests.length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground" data-testid="text-no-history">
                    No join requests yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allRequests.map((request) => (
                    <div 
                      key={request.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`row-history-${request.id}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium" data-testid={`text-history-company-${request.id}`}>
                          {request.vendor?.company || 'Unknown Vendor'}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-history-email-${request.id}`}>
                          {request.vendor?.email || 'No email'}
                        </p>
                      </div>
                      <Badge 
                        variant={
                          request.status === 'approved' ? 'default' : 
                          request.status === 'rejected' ? 'destructive' : 
                          'secondary'
                        }
                        data-testid={`badge-history-status-${request.id}`}
                      >
                        {request.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Vendor Profile Drawer */}
      {profileJoinRequestId && (
        <VendorProfileDrawer
          open={profileDrawerOpen}
          onClose={() => {
            setProfileDrawerOpen(false);
            setProfileJoinRequestId(null);
          }}
          joinRequestId={profileJoinRequestId}
        />
      )}
    </div>
  );
}
