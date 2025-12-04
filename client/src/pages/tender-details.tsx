import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building, Clock, DollarSign, Mail, Copy, Check, ArrowLeft, ExternalLink, Edit, Trash2, Send, Users, Loader2, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Tender } from "@shared/schema";
import SubmitOfferModal from "@/components/submit-offer-modal";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TenderWithCounts extends Tender {
  offersCount: number;
  invitedCount: number;
}

interface Offer {
  id: string;
  tenderId: string;
  companyId: string;
  technicalFileUrl: string | null;
  financialFileUrl: string | null;
  notes: string | null;
  submittedAt: string;
  company: {
    id: string;
    name: string;
    category: string | null;
    verificationStatus: string;
  };
  profile?: {
    displayName: string | null;
    bio: string | null;
    logoUrl: string | null;
  };
}

export default function TenderDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitOfferModalOpen, setIsSubmitOfferModalOpen] = useState(false);

  const canManage = activeCompany && ['owner', 'admin'].includes(activeCompany.role);

  const { data: tender, isLoading } = useQuery<TenderWithCounts>({
    queryKey: ['/api/tenders', id],
    queryFn: async () => {
      const response = await fetch(`/api/tenders/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch tender");
      return response.json();
    },
    enabled: !!user && !!id,
  });

  const { data: offers = [], isLoading: loadingOffers } = useQuery<Offer[]>({
    queryKey: ['/api/tenders', id, 'offers'],
    queryFn: async () => {
      const response = await fetch(`/api/tenders/${id}/offers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch offers");
      return response.json();
    },
    enabled: !!user && !!id && canManage,
  });

  // Check if current company has already submitted an offer
  const { data: myOffer } = useQuery<Offer | null>({
    queryKey: ['/api/tenders', id, 'my-offer'],
    queryFn: async () => {
      const response = await fetch(`/api/tenders/${id}/my-offer`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user && !!id && !!activeCompany,
  });

  // Check ownership and eligibility for submission
  const isOwner = tender?.companyId === activeCompany?.id;
  const isTenderOpen = tender?.status === 'published';
  const deadline = tender ? new Date(tender.deadline) : null;
  const isExpired = deadline ? deadline.getTime() < Date.now() : true;
  const hasSubmittedOffer = !!myOffer;
  const companyVerified = activeCompany?.verificationStatus === 'verified';
  const canSubmitOffer = !isOwner && isTenderOpen && !isExpired && !hasSubmittedOffer && companyVerified;

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest('PATCH', `/api/tenders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      toast({
        title: "Status updated",
        description: "Tender status has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteTender = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/tenders/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      toast({
        title: "Tender deleted",
        description: "The tender has been removed",
      });
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const copyInvitationLink = async () => {
    if (!tender) return;
    const invitationLink = `${window.location.origin}/invite/${tender.id}`;
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return { className: 'bg-blue-100 text-blue-800', label: 'Published' };
      case 'draft':
        return { className: 'bg-gray-100 text-gray-800', label: 'Draft' };
      case 'closed':
        return { className: 'bg-green-100 text-green-800', label: 'Closed' };
      case 'cancelled':
        return { className: 'bg-red-100 text-red-800', label: 'Cancelled' };
      default:
        return { className: 'bg-gray-100 text-gray-800', label: status };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <h3 className="text-xl font-semibold mb-2">Tender not found</h3>
              <p className="text-muted-foreground mb-4">
                The tender you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button onClick={() => setLocation('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(tender.status);
  const daysRemaining = Math.ceil((new Date(tender.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const invitationLink = `${window.location.origin}/invite/${tender.id}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/dashboard')}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold" data-testid="text-tender-title">{tender.title}</h1>
                <Badge className={statusBadge.className} data-testid="badge-status">
                  {statusBadge.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Created on {formatDate(tender.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap" data-testid="text-description">
                  {tender.description}
                </p>
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Tender Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Submission Deadline</p>
                      <p className={`font-medium ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : ''}`}>
                        {formatDate(tender.deadline)}
                        {!isExpired && (
                          <span className="text-sm ml-2">
                            ({daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left)
                          </span>
                        )}
                        {isExpired && (
                          <span className="text-sm ml-2">(Expired)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Budget Range</p>
                      <p className="font-medium">
                        {tender.budgetRange || tender.budget || 'Not specified'}
                      </p>
                    </div>
                  </div>

                  {tender.category && (
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Category</p>
                        <p className="font-medium">{tender.category}</p>
                      </div>
                    </div>
                  )}

                  {tender.duration && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">{tender.duration}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Submit Offer Section (for non-owner companies) */}
            {!isOwner && activeCompany && (
              <Card className={hasSubmittedOffer ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {hasSubmittedOffer ? 'Offer Submitted' : 'Submit Your Offer'}
                  </CardTitle>
                  <CardDescription>
                    {hasSubmittedOffer 
                      ? 'You have already submitted an offer for this tender.' 
                      : 'Submit your technical and financial proposal for this tender.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {hasSubmittedOffer ? (
                    <div className="text-center py-4">
                      <Check className="h-12 w-12 mx-auto text-green-600 mb-3" />
                      <p className="text-green-800 dark:text-green-200 font-medium">
                        Your offer was submitted on {myOffer?.submittedAt ? formatDate(myOffer.submittedAt) : 'N/A'}
                      </p>
                    </div>
                  ) : !companyVerified ? (
                    <div className="space-y-3">
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          Your company must be verified to submit offers. 
                          {activeCompany?.verificationStatus === 'under_review' 
                            ? ' Your verification is currently under review.' 
                            : ' Please complete your company profile to request verification.'}
                        </AlertDescription>
                      </Alert>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setLocation('/company-onboarding')}
                        data-testid="button-complete-profile"
                      >
                        Complete Company Profile
                      </Button>
                    </div>
                  ) : isExpired ? (
                    <div className="text-center py-4">
                      <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-3" />
                      <p className="text-red-600 font-medium">This tender has expired</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The deadline for submissions has passed.
                      </p>
                    </div>
                  ) : !isTenderOpen ? (
                    <div className="text-center py-4">
                      <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-muted-foreground font-medium">This tender is not accepting submissions</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The tender status is: {tender.status}
                      </p>
                    </div>
                  ) : (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => setIsSubmitOfferModalOpen(true)}
                      data-testid="button-submit-offer"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submit Offer
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Invitation Link (for owner only) */}
            {isOwner && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Invitation Link
                </CardTitle>
                <CardDescription>
                  Share this link with qualified vendors to invite them to submit proposals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-4">
                  <code className="text-sm break-all" data-testid="text-invitation-link">
                    {invitationLink}
                  </code>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={copyInvitationLink}
                    className="flex-1"
                    data-testid="button-copy-link"
                  >
                    {copiedLink ? (
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
                  <Button 
                    variant="outline"
                    onClick={() => window.open(invitationLink, '_blank')}
                    data-testid="button-open-link"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Proposals Section */}
            {canManage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Proposals ({offers.length})
                  </CardTitle>
                  <CardDescription>
                    View and manage proposals submitted by vendors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingOffers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : offers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No proposals received yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Share the invitation link with vendors to start receiving proposals
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {offers.map((offer, index) => (
                        <Card key={offer.id} className="border" data-testid={`card-offer-${offer.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">
                                    {offer.profile?.displayName || offer.company.name}
                                  </h4>
                                  {offer.company.verificationStatus === 'verified' && (
                                    <Badge variant="secondary" className="text-xs">Verified</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {offer.company.category || 'No category'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Submitted {formatDate(offer.submittedAt)}
                                </p>
                                {offer.notes && (
                                  <p className="text-sm mt-2">{offer.notes}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {offer.technicalFileUrl && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={offer.technicalFileUrl} target="_blank" rel="noopener noreferrer">
                                      Technical
                                    </a>
                                  </Button>
                                )}
                                {offer.financialFileUrl && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={offer.financialFileUrl} target="_blank" rel="noopener noreferrer">
                                      Financial
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Proposals</span>
                  <span className="font-semibold">{offers.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Time Remaining</span>
                  <span className={`font-semibold ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : ''}`}>
                    {isExpired ? 'Expired' : `${daysRemaining} days`}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {canManage && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tender.status === 'draft' && (
                    <>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => updateStatus.mutate('published')}
                        disabled={updateStatus.isPending}
                        data-testid="button-publish"
                      >
                        Publish Tender
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setLocation(`/tenders/${tender.id}/edit`)}
                        data-testid="button-edit"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Tender
                      </Button>
                    </>
                  )}
                  
                  {tender.status === 'published' && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => updateStatus.mutate('closed')}
                      disabled={updateStatus.isPending}
                      data-testid="button-close"
                    >
                      Close Tender
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this tender? This action cannot be undone.')) {
                        deleteTender.mutate();
                      }
                    }}
                    disabled={deleteTender.isPending}
                    data-testid="button-delete"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Tender
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Submit Offer Modal */}
      {tender && !isOwner && (
        <SubmitOfferModal
          isOpen={isSubmitOfferModalOpen}
          onClose={() => {
            setIsSubmitOfferModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['/api/tenders', id, 'my-offer'] });
          }}
          tender={{
            id: tender.id,
            title: tender.title,
            description: tender.description || '',
            deadline: tender.deadline,
            budget: tender.budget,
            duration: tender.duration
          }}
          requester={{
            name: 'Company',
            company: activeCompany?.name
          }}
        />
      )}
    </div>
  );
}
