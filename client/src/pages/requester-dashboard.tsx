import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import Navbar from "@/components/navbar";
import TenderCard from "@/components/tender-card";
import CreateTenderModal from "@/components/create-tender-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FileText, Send, Users, Clock, User, Copy, ExternalLink, UserPlus } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import type { Tender } from "@shared/schema";

interface RequesterProfile {
  id: string;
  requesterId: string;
  tractionSlug: string;
  companyName: string;
  bio: string;
  logoUrl: string | null;
  industry: string | null;
  companySize: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function RequesterDashboard() {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: tenders, isLoading } = useQuery<Tender[]>({
    queryKey: ['/api/tenders'],
    enabled: !!user,
  });

  // Fetch requester profile for traction slug
  const { data: requesterProfile } = useQuery<RequesterProfile>({
    queryKey: ['/api/requester/profile'],
    enabled: !!user,
  });

  // Fetch pending join requests count
  const { data: pendingData } = useQuery<{ count: number }>({
    queryKey: ['/api/join-requests/pending-count'],
    enabled: !!user,
  });

  const activeTenders = tenders?.filter((t: any) => t.status === 'active') || [];
  const totalOffers = tenders?.reduce((sum: number, t: any) => sum + (t.offersCount || 0), 0) || 0;
  const closingSoon = tenders?.filter((t: any) => {
    const deadline = new Date(t.deadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays > 0;
  }).length || 0;

  const pendingCount = pendingData?.count || 0;
  const tractionLink = requesterProfile?.tractionSlug 
    ? `${window.location.origin}/r/${requesterProfile.tractionSlug}` 
    : null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">My Tenders</h1>
            <p className="text-neutral-600 mt-1">Manage your private procurement processes</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => navigate('/requester-profile')}
              variant="outline"
              className="px-4 py-3 rounded-lg font-semibold"
              data-testid="button-manage-profile"
            >
              <User className="h-4 w-4 mr-2" />
              Manage Profile
            </Button>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#f33c20] hover:bg-[#d63519] text-white px-6 py-3 rounded-lg font-semibold"
              data-testid="button-create-tender"
            >
              Create Tender
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-[#f33c20]/10 rounded-lg flex items-center justify-center">
                    <FileText className="text-[#f33c20] h-5 w-5" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-600">Active Tenders</p>
                  <p className="text-2xl font-bold text-neutral-900">{activeTenders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-[#f33c20]/10 rounded-lg flex items-center justify-center">
                    <Send className="text-[#f33c20] h-5 w-5" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-600">Total Offers</p>
                  <p className="text-2xl font-bold text-neutral-900">{totalOffers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-[#f33c20]/10 rounded-lg flex items-center justify-center">
                    <Users className="text-[#f33c20] h-5 w-5" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-600">Avg Invitations</p>
                  <p className="text-2xl font-bold text-neutral-900">
                    {tenders?.length ? Math.round(tenders.reduce((sum: number, t: any) => sum + (t.invitedCount || 0), 0) / tenders.length) : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-[#f33c20]/10 rounded-lg flex items-center justify-center">
                    <Clock className="text-[#f33c20] h-5 w-5" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-600">Closing Soon</p>
                  <p className="text-2xl font-bold text-neutral-900">{closingSoon}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invite Your Vendors Section */}
        {tractionLink && (
          <Card className="mb-8 border-2 border-[#f33c20]/20 bg-gradient-to-br from-white to-[#f33c20]/5">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2" data-testid="text-invite-title">
                    <UserPlus className="h-6 w-6 text-[#f33c20]" />
                    Invite Your Vendors!
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Build your Vendors Base to streamline future tenders
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => navigate('/vendors-base')}
                  variant="outline"
                  data-testid="button-vendors-base"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Vendors Base
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-2" data-testid="badge-pending">
                      {pendingCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Share Your Traction Link
                </label>
                <div className="flex gap-2">
                  <Input
                    value={tractionLink}
                    readOnly
                    className="font-mono text-sm"
                    data-testid="input-traction-link"
                  />
                  <Button 
                    onClick={() => copyToClipboard(tractionLink)}
                    variant="outline"
                    size="icon"
                    data-testid="button-copy-link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={() => window.open(tractionLink, '_blank')}
                    variant="outline"
                    size="icon"
                    data-testid="button-open-link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Vendors can apply to join your base through this public link. You'll review and approve applications.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tenders Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">Loading tenders...</p>
          </div>
        ) : tenders?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-600 mb-4">No tenders created yet</p>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#f33c20] hover:bg-[#d63519]"
            >
              Create Your First Tender
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {tenders?.map((tender: any) => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>
        )}
      </main>

      <CreateTenderModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}
