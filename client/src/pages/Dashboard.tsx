import { useAuthStore } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider, 
  SidebarInset,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { Building2, FileText, Users, Inbox, LogOut, Search, CheckCircle, XCircle, Loader2, Mail, UserPlus, Eye, ShieldCheck, Clock, UserCheck, Plus, Copy, Check, Calendar, Send, MoreHorizontal, Trash2, Edit, ExternalLink, DollarSign, X, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CreateTenderModal from "@/components/create-tender-modal";
import { viewAuthenticatedFile } from "@/lib/downloadFile";

interface VendorProfile {
  id: string;
  companyId: string;
  company: string;
  legalName: string | null;
  category: string;
  city: string | null;
  crNumber: string | null;
  vatNumber: string | null;
  bio: string;
  logoUrl: string | null;
  email: string;
  verificationStatus: string;
  joinMethod: string;
  joinedAt: string;
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

interface TenderWithCounts {
  id: string;
  title: string;
  description: string;
  category: string | null;
  deadline: string;
  budget: string | null;
  budgetRange: string | null;
  status: string;
  invitationToken: string;
  createdAt: string;
  offersCount: number;
  invitedCount: number;
}

interface MyOffer {
  id: string;
  tenderId: string;
  companyId: string;
  technicalFileUrl: string | null;
  financialFileUrl: string | null;
  notes: string | null;
  submittedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  tender: {
    id: string;
    title: string;
    description: string | null;
    deadline: string;
    budget: string | null;
    status: string;
  };
}

interface IncomingOffer {
  id: string;
  tenderId: string;
  companyId: string;
  technicalFileUrl: string | null;
  financialFileUrl: string | null;
  notes: string | null;
  submittedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  tender: {
    id: string;
    title: string;
    description: string | null;
    deadline: string;
    budget: string | null;
    status: string;
  };
  company: {
    id: string;
    name: string;
    category: string | null;
    verificationStatus: string;
  };
  profile?: {
    displayName: string | null;
    logoUrl: string | null;
  };
}

// Component for sidebar header with logo/toggle swap on hover when collapsed
function SidebarLogoToggle() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative flex-shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isCollapsed && isHovered ? (
        <SidebarTrigger className="h-6 w-6" />
      ) : (
        <Building2 className="h-6 w-6 text-primary" />
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user, activeCompany, companies, logout } = useAuthStore();
  const [, setLocation] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<IncomingOffer | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [tenderSearchQuery, setTenderSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [tenderFilter, setTenderFilter] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
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

  // Fetch tenders
  const { data: tenders = [], isLoading: loadingTenders } = useQuery<TenderWithCounts[]>({
    queryKey: ['/api/tenders'],
    queryFn: async () => {
      const response = await fetch('/api/tenders', {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch tenders");
      return response.json();
    },
    enabled: canManage
  });

  // Fetch my submitted offers/proposals
  const { data: myOffers = [], isLoading: loadingMyOffers } = useQuery<MyOffer[]>({
    queryKey: ['/api/my-offers'],
    queryFn: async () => {
      const response = await fetch('/api/my-offers', {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch offers");
      return response.json();
    }
  });

  // Fetch incoming offers on our tenders
  const { data: incomingOffers = [], isLoading: loadingIncomingOffers } = useQuery<IncomingOffer[]>({
    queryKey: ['/api/my-tenders/offers'],
    queryFn: async () => {
      const response = await fetch('/api/my-tenders/offers', {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch incoming offers");
      return response.json();
    }
  });

  // Filter tenders based on search and status
  const filteredTenders = tenders.filter(tender => {
    const matchesSearch = !tenderSearchQuery || 
      tender.title.toLowerCase().includes(tenderSearchQuery.toLowerCase()) ||
      (tender.description && tender.description.toLowerCase().includes(tenderSearchQuery.toLowerCase()));
    const matchesFilter = tenderFilter === 'all' || tender.status === tenderFilter;
    return matchesSearch && matchesFilter;
  });

  // Delete tender mutation
  const deleteTender = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/tenders/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      toast({
        title: "Tender deleted",
        description: "The tender has been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Copy invitation link
  const copyInvitationLink = async (tender: TenderWithCounts) => {
    const invitationLink = `${window.location.origin}/invite/${tender.id}`;
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopiedLinkId(tender.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
      toast({
        title: "Copied!",
        description: "Invitation link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return { className: 'bg-green-100 text-green-800', label: 'Published' };
      case 'draft':
        return { className: 'bg-gray-100 text-gray-800', label: 'Draft' };
      case 'closed':
        return { className: 'bg-red-100 text-red-800', label: 'Closed' };
      case 'cancelled':
        return { className: 'bg-orange-100 text-orange-800', label: 'Cancelled' };
      default:
        return { className: 'bg-gray-100 text-gray-800', label: status };
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

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

  // Update offer status mutation (accept/reject proposals)
  const updateOfferStatus = useMutation({
    mutationFn: async ({ offerId, status }: { offerId: string; status: string }) => {
      return await apiRequest('PATCH', `/api/offers/${offerId}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-tenders/offers'] });
      // When accepting, vendor is automatically added to base - refresh that list too
      if (variables.status === 'accepted') {
        queryClient.invalidateQueries({ queryKey: ['/api/vendors-base'] });
      }
      toast({
        title: variables.status === 'accepted' ? "Proposal Accepted" : "Proposal Ignored",
        description: variables.status === 'accepted' 
          ? "Vendor has been added to your Vendors Base."
          : "This proposal has been marked as ignored.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update proposal",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const sidebarItems = [
    { value: "overview", label: "Overview", icon: LayoutDashboard, show: true },
    { value: "tenders", label: "Tenders", icon: FileText, show: canManage },
    { value: "proposals", label: "Proposals", icon: Inbox, show: true },
    { value: "vendors", label: "Vendors Base", icon: Users, show: canManage },
  ];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="border-b px-4 py-4">
          <div className="flex items-center gap-3">
            <SidebarLogoToggle />
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              <h2 className="font-semibold text-sm truncate">
                {activeCompany.profile?.displayName || activeCompany.name}
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                {activeCompany.role} • {activeCompany.verificationStatus}
              </p>
            </div>
            {/* Show toggle button only when expanded */}
            <SidebarTrigger className="ml-auto flex-shrink-0 group-data-[collapsible=icon]:hidden" />
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarItems.filter(item => item.show).map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton 
                      isActive={activeTab === item.value}
                      onClick={() => setActiveTab(item.value)}
                      tooltip={item.label}
                      data-testid={`sidebar-${item.value}`}
                      className={activeTab === item.value ? "bg-[#E25E45]/10 text-[#E25E45] hover:bg-[#E25E45]/20 hover:text-[#E25E45]" : ""}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleLogout}
                tooltip="Logout"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="flex h-14 items-center gap-4 border-b bg-white dark:bg-gray-800 px-6">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">
              {sidebarItems.find(item => item.value === activeTab)?.label || 'Dashboard'}
            </h1>
          </div>
          {companies.length > 1 && (
            <div className="text-sm text-muted-foreground">
              {companies.length} companies
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
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

          {/* Dashboard Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

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
            <TabsContent value="tenders" className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold" data-testid="text-tenders-title">Tenders</h2>
                  <p className="text-muted-foreground" data-testid="text-tenders-description">
                    Create and manage procurement tenders
                  </p>
                </div>
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-create-tender-header"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tender
                </Button>
              </div>

              {/* Filters */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tenders by title or description..."
                        value={tenderSearchQuery}
                        onChange={(e) => setTenderSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="input-tender-search"
                      />
                    </div>
                    <Tabs value={tenderFilter} onValueChange={(v) => setTenderFilter(v as any)} className="w-full sm:w-auto">
                      <TabsList className="grid grid-cols-4 w-full sm:w-auto">
                        <TabsTrigger value="all" data-testid="filter-all">All</TabsTrigger>
                        <TabsTrigger value="published" data-testid="filter-published">Published</TabsTrigger>
                        <TabsTrigger value="draft" data-testid="filter-draft">Draft</TabsTrigger>
                        <TabsTrigger value="closed" data-testid="filter-closed">Closed</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>

              {/* Tenders List */}
              {loadingTenders ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredTenders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2" data-testid="text-no-tenders-title">
                      {tenderSearchQuery || tenderFilter !== 'all' ? 'No tenders found' : 'No tenders yet'}
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6" data-testid="text-no-tenders-description">
                      {tenderSearchQuery || tenderFilter !== 'all'
                        ? 'Try adjusting your search or filters'
                        : 'Create your first tender to start receiving proposals from qualified vendors.'}
                    </p>
                    {!tenderSearchQuery && tenderFilter === 'all' && (
                      <Button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid="button-create-first-tender"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Tender
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredTenders.map((tender) => {
                    const statusBadge = getStatusBadge(tender.status);
                    const isDeadlineSoon = new Date(tender.deadline).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000;
                    
                    return (
                      <Card 
                        key={tender.id} 
                        className="hover:shadow-lg transition-shadow"
                        data-testid={`card-tender-${tender.id}`}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 
                                  className="text-lg font-semibold cursor-pointer hover:text-blue-600"
                                  onClick={() => setLocation(`/tenders/${tender.id}`)}
                                  data-testid={`text-tender-title-${tender.id}`}
                                >
                                  {tender.title}
                                </h3>
                                <Badge className={statusBadge.className} data-testid={`badge-status-${tender.id}`}>
                                  {statusBadge.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-tender-description-${tender.id}`}>
                                {tender.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span className={isDeadlineSoon ? 'text-red-600 font-medium' : ''}>
                                {formatDate(tender.deadline)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Send className="h-4 w-4" />
                              <span data-testid={`text-proposals-count-${tender.id}`}>
                                {tender.offersCount} proposal{tender.offersCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span>{tender.invitedCount} invited</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              <span>{tender.budgetRange || tender.budget || 'Not specified'}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setLocation(`/tenders/${tender.id}`)}
                              data-testid={`button-view-${tender.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => copyInvitationLink(tender)}
                              data-testid={`button-copy-link-${tender.id}`}
                            >
                              {copiedLinkId === tender.id ? (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Link
                                </>
                              )}
                            </Button>
                            {['draft', 'published'].includes(tender.status) && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setLocation(`/tenders/${tender.id}/edit`)}
                                data-testid={`button-edit-${tender.id}`}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this tender?')) {
                                  deleteTender.mutate(tender.id);
                                }
                              }}
                              disabled={deleteTender.isPending}
                              data-testid={`button-delete-${tender.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}

          {/* Proposals Tab */}
          <TabsContent value="proposals" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold" data-testid="text-proposals-title">Proposals</h2>
              <p className="text-muted-foreground" data-testid="text-proposals-description">
                Manage submitted and received proposals
              </p>
            </div>

            <Tabs defaultValue="submitted" className="space-y-4">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="submitted" className="gap-2" data-testid="tab-submitted-proposals">
                  <Send className="h-4 w-4" />
                  Submitted ({myOffers.length})
                </TabsTrigger>
                <TabsTrigger value="received" className="gap-2" data-testid="tab-received-proposals">
                  <Inbox className="h-4 w-4" />
                  Received ({incomingOffers.length})
                </TabsTrigger>
              </TabsList>

              {/* Submitted Proposals Sub-Tab */}
              <TabsContent value="submitted" className="space-y-4">
                {loadingMyOffers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : myOffers.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Send className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">You haven't submitted any proposals yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Browse published tenders to submit your proposals
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {myOffers.map((offer) => {
                      const isExpired = new Date(offer.tender.deadline) < new Date();
                      const daysRemaining = Math.ceil((new Date(offer.tender.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <Card 
                          key={offer.id} 
                          className={`border ${
                            offer.status === 'accepted' 
                              ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
                              : offer.status === 'rejected' 
                                ? 'border-gray-300 bg-gray-50 dark:bg-gray-800/50 opacity-60' 
                                : ''
                          }`} 
                          data-testid={`card-my-offer-${offer.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 
                                    className="font-medium cursor-pointer hover:text-primary"
                                    onClick={() => setLocation(`/tenders/${offer.tender.id}`)}
                                  >
                                    {offer.tender.title}
                                  </h4>
                                  <Badge 
                                    className={
                                      offer.tender.status === 'published' 
                                        ? 'bg-green-100 text-green-800' 
                                        : offer.tender.status === 'closed'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }
                                  >
                                    {offer.tender.status.charAt(0).toUpperCase() + offer.tender.status.slice(1)}
                                  </Badge>
                                  {offer.status === 'accepted' && (
                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Accepted
                                    </Badge>
                                  )}
                                  {offer.status === 'rejected' && (
                                    <Badge className="bg-gray-100 text-gray-600 text-xs">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Not Selected
                                    </Badge>
                                  )}
                                  {offer.status === 'pending' && (
                                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pending Review
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {offer.tender.description || 'No description'}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Submitted {new Date(offer.submittedAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <span className={`flex items-center gap-1 ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : ''}`}>
                                    <Clock className="h-3 w-3" />
                                    {isExpired ? 'Deadline passed' : `${daysRemaining} days left`}
                                  </span>
                                </div>
                                {offer.notes && (
                                  <p className="text-sm mt-2 text-muted-foreground italic">"{offer.notes}"</p>
                                )}
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setLocation(`/tenders/${offer.tender.id}`)}
                                  data-testid={`button-view-tender-${offer.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                {offer.technicalFileUrl && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => viewAuthenticatedFile(offer.technicalFileUrl!)}
                                    title="Technical Proposal"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Received Proposals Sub-Tab */}
              <TabsContent value="received" className="space-y-4">
                {loadingIncomingOffers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : incomingOffers.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Inbox className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No proposals received yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Proposals submitted to your tenders will appear here
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {incomingOffers.map((offer) => {
                      const isExpired = new Date(offer.tender.deadline) < new Date();
                      const daysRemaining = Math.ceil((new Date(offer.tender.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <Card 
                          key={offer.id} 
                          className={`border ${
                            offer.status === 'accepted' 
                              ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
                              : offer.status === 'rejected' 
                                ? 'border-gray-300 bg-gray-50 dark:bg-gray-800/50 opacity-60' 
                                : ''
                          }`} 
                          data-testid={`card-incoming-offer-${offer.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="font-medium">
                                    {offer.profile?.displayName || offer.company.name}
                                  </h4>
                                  {offer.company.verificationStatus === 'verified' && (
                                    <Badge variant="secondary" className="text-xs">Verified</Badge>
                                  )}
                                  {offer.status === 'accepted' && (
                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Accepted
                                    </Badge>
                                  )}
                                  {offer.status === 'rejected' && (
                                    <Badge className="bg-gray-100 text-gray-600 text-xs">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Ignored
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  For: <span 
                                    className="cursor-pointer hover:text-primary font-medium"
                                    onClick={() => setLocation(`/tenders/${offer.tender.id}`)}
                                  >
                                    {offer.tender.title}
                                  </span>
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Received {new Date(offer.submittedAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <span className={`flex items-center gap-1 ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : ''}`}>
                                    <Clock className="h-3 w-3" />
                                    {isExpired ? 'Deadline passed' : `${daysRemaining} days left`}
                                  </span>
                                  {offer.company.category && (
                                    <span className="text-muted-foreground">
                                      {offer.company.category}
                                    </span>
                                  )}
                                </div>
                                {offer.notes && (
                                  <p className="text-sm mt-2 text-muted-foreground italic">"{offer.notes}"</p>
                                )}
                              </div>
                              <div className="flex flex-col gap-2 ml-4">
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedProposal(offer)}
                                    data-testid={`button-view-offer-${offer.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                  {offer.technicalFileUrl && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => viewAuthenticatedFile(offer.technicalFileUrl!)}
                                      title="Technical Proposal"
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {offer.financialFileUrl && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => viewAuthenticatedFile(offer.financialFileUrl!)}
                                      title="Financial Proposal"
                                    >
                                      <DollarSign className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                                {offer.status === 'pending' && (
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => updateOfferStatus.mutate({ offerId: offer.id, status: 'accepted' })}
                                      disabled={updateOfferStatus.isPending}
                                      data-testid={`button-accept-offer-${offer.id}`}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Accept
                                    </Button>
                                    <Button 
                                      variant="outline"
                                      size="sm"
                                      className="text-gray-600 hover:bg-gray-100"
                                      onClick={() => updateOfferStatus.mutate({ offerId: offer.id, status: 'rejected' })}
                                      disabled={updateOfferStatus.isPending}
                                      data-testid={`button-ignore-offer-${offer.id}`}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Ignore
                                    </Button>
                                  </div>
                                )}
                                {offer.status !== 'pending' && (
                                  <Button 
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-muted-foreground"
                                    onClick={() => updateOfferStatus.mutate({ offerId: offer.id, status: 'pending' })}
                                    disabled={updateOfferStatus.isPending}
                                    data-testid={`button-undo-offer-${offer.id}`}
                                  >
                                    Undo Decision
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
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
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={vendor.joinMethod === 'invitation' ? 'default' : 'outline'}
                                  data-testid={`badge-join-method-${vendor.id}`}
                                >
                                  {vendor.joinMethod === 'invitation' ? 'Invited' : vendor.joinMethod === 'proposal_accepted' ? 'Proposal' : 'Applied'}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedVendor(vendor)}
                                  data-testid={`button-view-vendor-${vendor.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {vendor.bio && (
                              <p className="text-sm text-muted-foreground" data-testid={`text-vendor-bio-${vendor.id}`}>
                                {vendor.bio}
                              </p>
                            )}
                            {vendor.city && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                <span>{vendor.city}</span>
                              </div>
                            )}
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

      {/* Proposal Details Modal */}
      <Dialog open={!!selectedProposal} onOpenChange={() => setSelectedProposal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedProposal?.profile?.displayName || selectedProposal?.company.name}
            </DialogTitle>
            <DialogDescription>
              {selectedProposal?.company.category || 'No category'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProposal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Company Name</h4>
                  <p className="text-sm">{selectedProposal.company.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Category</h4>
                  <p className="text-sm">{selectedProposal.company.category || 'Not specified'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Verification Status</h4>
                  <Badge variant={selectedProposal.company.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                    {selectedProposal.company.verificationStatus === 'verified' ? 'Verified' : 'Under Review'}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">For Tender</h4>
                  <p className="text-sm font-medium">{selectedProposal.tender.title}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Proposal Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Submitted</span>
                    <span>{new Date(selectedProposal.submittedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                  {selectedProposal.notes && (
                    <div>
                      <span className="text-sm text-muted-foreground">Notes:</span>
                      <p className="text-sm mt-1">{selectedProposal.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {selectedProposal.technicalFileUrl && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => viewAuthenticatedFile(selectedProposal.technicalFileUrl!)}
                    data-testid="button-modal-tech-file"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Technical Proposal
                  </Button>
                )}
                {selectedProposal.financialFileUrl && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => viewAuthenticatedFile(selectedProposal.financialFileUrl!)}
                    data-testid="button-modal-fin-file"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Financial Proposal
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Vendor Details Modal */}
      <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedVendor?.logoUrl ? (
                <img 
                  src={selectedVendor.logoUrl} 
                  alt={selectedVendor.company} 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <Building2 className="h-6 w-6 text-primary" />
              )}
              {selectedVendor?.company}
            </DialogTitle>
            <DialogDescription>
              {selectedVendor?.category}
            </DialogDescription>
          </DialogHeader>
          
          {selectedVendor && (
            <div className="space-y-4">
              {/* Verification Status */}
              <div className="flex items-center gap-2">
                {selectedVendor.verificationStatus === 'verified' ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified Company
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Under Review
                  </Badge>
                )}
                <Badge variant="outline">
                  {selectedVendor.joinMethod === 'invitation' ? 'Invited' : selectedVendor.joinMethod === 'proposal_accepted' ? 'Via Proposal' : 'Applied via Traction'}
                </Badge>
              </div>

              {/* Bio */}
              {selectedVendor.bio && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">About</h4>
                  <p className="text-sm">{selectedVendor.bio}</p>
                </div>
              )}

              {/* Company Details */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                {selectedVendor.legalName && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Legal Name</h4>
                    <p className="text-sm">{selectedVendor.legalName}</p>
                  </div>
                )}
                {selectedVendor.city && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">City</h4>
                    <p className="text-sm">{selectedVendor.city}</p>
                  </div>
                )}
                {selectedVendor.crNumber && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">CR Number</h4>
                    <p className="text-sm font-mono">{selectedVendor.crNumber}</p>
                  </div>
                )}
                {selectedVendor.vatNumber && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">VAT Number</h4>
                    <p className="text-sm font-mono">{selectedVendor.vatNumber}</p>
                  </div>
                )}
              </div>

              {/* Joined Date */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Added to Vendors Base</span>
                  <span>{new Date(selectedVendor.joinedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
