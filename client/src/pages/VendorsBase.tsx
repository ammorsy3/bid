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
import { Search, Users, CheckCircle, XCircle, Loader2, Building2, Mail, Phone, MessageSquare, UserCheck, FileText, UserPlus, Eye, ShieldCheck, Clock, CalendarDays, Briefcase } from "lucide-react";
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
            <div>
              <div className="mb-4" data-testid="text-pending-title">
                <h2 className="text-lg font-semibold text-gray-900">Pending Requests</h2>
                <p className="text-sm text-muted-foreground">
                  {pendingRequests.length} vendor{pendingRequests.length !== 1 ? 's' : ''} waiting for your review
                </p>
              </div>
              <div className="space-y-3">
                {pendingRequests.map((request) => {
                  const initials = (request.vendor?.company || 'U')
                    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const timeAgo = request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                  return (
                    <div
                      key={request.id}
                      className="group relative bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all"
                      data-testid={`card-request-${request.id}`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/10">
                          <span className="text-sm font-bold text-primary">{initials}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate" data-testid={`text-request-company-${request.id}`}>
                              {request.vendor?.company || 'Unknown Vendor'}
                            </h3>
                            <Badge
                              variant="outline"
                              className={
                                request.vendor?.verificationStatus === 'verified'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-2 py-0'
                                  : request.vendor?.verificationStatus === 'under_review'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 text-xs px-2 py-0'
                                  : 'bg-gray-50 text-gray-500 border-gray-200 text-xs px-2 py-0'
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

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            {request.vendor?.expertise && (
                              <span className="flex items-center gap-1.5" data-testid={`text-request-category-${request.id}`}>
                                <Briefcase className="h-3.5 w-3.5" />
                                {request.vendor.expertise}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5" data-testid={`text-request-email-${request.id}`}>
                              <Mail className="h-3.5 w-3.5" />
                              {request.vendor?.email || 'N/A'}
                            </span>
                            <span className="flex items-center gap-1.5" data-testid={`text-request-name-${request.id}`}>
                              <UserCheck className="h-3.5 w-3.5" />
                              {request.vendor?.name || 'N/A'}
                            </span>
                            {timeAgo && (
                              <span className="flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {timeAgo}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setProfileJoinRequestId(request.id);
                              setProfileDrawerOpen(true);
                            }}
                            data-testid={`button-view-profile-${request.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1.5" />
                            Profile
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => setSelectedRequest(request)}
                                data-testid={`button-reject-inline-${request.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1.5" />
                                Decline
                              </Button>
                            </DialogTrigger>
                            <DialogContent data-testid="dialog-reject">
                              <DialogHeader>
                                <DialogTitle>Decline Application</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to decline <span className="font-medium text-foreground">{request.vendor?.company || 'this vendor'}</span>? They can apply again in the future.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex gap-3 pt-2">
                                <Button
                                  onClick={() => rejectRequest.mutate(request.id)}
                                  disabled={rejectRequest.isPending}
                                  variant="outline"
                                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                                  data-testid="button-reject"
                                >
                                  {rejectRequest.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <XCircle className="mr-2 h-4 w-4" />
                                  )}
                                  Decline
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => approveRequest.mutate(request.id)}
                            disabled={approveRequest.isPending}
                            data-testid={`button-review-${request.id}`}
                          >
                            {approveRequest.isPending ? (
                              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1.5" />
                            )}
                            Approve
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
