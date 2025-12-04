import { useAuthStore } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FileText, Users, Inbox, LogOut, Search, CheckCircle, XCircle, Loader2, Mail, UserPlus, Eye, ShieldCheck, Clock, UserCheck } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CreateTenderModal from "@/components/create-tender-modal";

interface VendorProfile {
  id: string;
  company: string;
  category: string;
  bio: string;
  email: string;
  verificationStatus: string;
  joinMethod: string;
}

interface JoinRequest {
  id: string;
  status: string;
  createdAt: string;
  vendor?: {
    id: string;
    name: string;
    email: string;
    company: string;
    expertise: string | null;
    verificationStatus: string;
  };
}

export default function Dashboard() {
  const { user, activeCompany, companies, logout } = useAuthStore();
  const [, setLocation] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const { toast } = useToast();

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (!activeCompany) {
    setLocation("/company-onboarding");
    return null;
  }

  // Check if user is owner or admin (can create tenders, manage vendors)
  const canManage = ['owner', 'admin'].includes(activeCompany.role);
  const isOwner = activeCompany.role === 'owner';

  // Fetch vendors in base
  const { data: vendors = [], isLoading: loadingVendors } = useQuery<VendorProfile[]>({
    queryKey: ['/api/vendors-base', searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/vendors-base${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch vendors");
      return response.json();
    },
    enabled: canManage
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
    },
    enabled: canManage
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

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeCompany.profile?.displayName || activeCompany.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {activeCompany.role} • {activeCompany.verificationStatus}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {companies.length > 1 && (
                <div className="text-sm text-gray-500">
                  {companies.length} companies
                </div>
              )}
              <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Verification Status Banner */}
        {activeCompany.verificationStatus !== 'verified' && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
            <CardHeader>
              <CardTitle className="text-yellow-900 dark:text-yellow-100">
                Company Verification Pending
              </CardTitle>
              <CardDescription className="text-yellow-800 dark:text-yellow-200">
                Your company is under review. You can browse but some features are restricted until verified.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Building2 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            {canManage && (
              <TabsTrigger value="tenders" data-testid="tab-tenders">
                <FileText className="h-4 w-4 mr-2" />
                Tenders
              </TabsTrigger>
            )}
            <TabsTrigger value="proposals" data-testid="tab-proposals">
              <Inbox className="h-4 w-4 mr-2" />
              Proposals
            </TabsTrigger>
            {canManage && (
              <TabsTrigger value="vendors" data-testid="tab-vendors">
                <Users className="h-4 w-4 mr-2" />
                Vendors Base
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to Your Dashboard</CardTitle>
                <CardDescription>
                  Manage tenders, proposals, and your vendor network all in one place.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Company Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {activeCompany.verificationStatus}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {activeCompany.onboardingState === 'completed' ? 'Profile complete' : 'Setup in progress'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Your Role</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold capitalize">
                        {activeCompany.role}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        in this company
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {canManage && (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          size="sm" 
                          data-testid="button-create-tender"
                          onClick={() => setIsCreateModalOpen(true)}
                        >
                          Create Tender
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        size="sm" 
                        data-testid="button-view-profile"
                        onClick={() => setLocation('/company-onboarding')}
                      >
                        View Profile
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tenders Tab */}
          {canManage && (
            <TabsContent value="tenders">
              <Card>
                <CardHeader>
                  <CardTitle>Tenders</CardTitle>
                  <CardDescription>
                    Create and manage procurement tenders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Tender management coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Proposals Tab */}
          <TabsContent value="proposals">
            <Card>
              <CardHeader>
                <CardTitle>Proposals</CardTitle>
                <CardDescription>
                  View and submit proposals to tenders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Proposal management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendors Base Tab */}
          {canManage && (
            <TabsContent value="vendors" className="space-y-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold" data-testid="text-vendors-title">Vendors Base</h2>
                <p className="text-muted-foreground" data-testid="text-vendors-description">
                  Manage your approved vendors and review new applications
                </p>
              </div>

              <Tabs defaultValue="vendors-list" className="space-y-4">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="vendors-list" className="gap-2" data-testid="tab-vendors-list">
                    <Users className="h-4 w-4" />
                    Vendors ({vendors.length})
                  </TabsTrigger>
                  <TabsTrigger value="join-requests" className="gap-2" data-testid="tab-join-requests">
                    <UserPlus className="h-4 w-4" />
                    Join Requests
                    {pendingRequests.length > 0 && (
                      <Badge variant="destructive" className="ml-2" data-testid="badge-pending-count">
                        {pendingRequests.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Vendors List Sub-Tab */}
                <TabsContent value="vendors-list" className="space-y-4">
                  {/* Search */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search vendors by name, company, or category..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                          data-testid="input-vendor-search"
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
                        <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-vendors-title">
                          {searchQuery ? "No vendors found" : "No vendors yet"}
                        </h3>
                        <p className="text-muted-foreground text-center max-w-md" data-testid="text-empty-vendors-description">
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
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Join Requests Sub-Tab */}
                <TabsContent value="join-requests" className="space-y-4">
                  {pendingRequests.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <UserPlus className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground" data-testid="text-no-requests">
                          No pending requests
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
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
                            </CardContent>
                          </Card>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Create Tender Modal */}
      <CreateTenderModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}
