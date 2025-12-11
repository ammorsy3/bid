import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, CheckCircle2, Share2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import type { Tender } from "@shared/schema";

export default function TenderInviteLink() {
  const [, params] = useRoute("/invite/:id");
  const [, navigate] = useLocation();
  const tenderId = params?.id;
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: tender, isLoading, error } = useQuery({
    queryKey: ['/api/tenders', tenderId, 'invite'],
    enabled: !!tenderId,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/tenders/${tenderId}/invite`);
      if (!res.ok) throw new Error('Failed to fetch tender');
      return res.json();
    },
  } as any);

  const inviteLink = tender && tenderId
    ? `${window.location.origin}/tenders/${tenderId}`
    : "";

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      });
    }
  };

  if (!tenderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">No tender ID provided.</p>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-page" />
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Tender Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              {error ? (error as any).message : "The tender could not be loaded."}
            </p>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header with logo */}
        <div className="flex justify-center mb-12">
          <img
            src={logoPath}
            alt="Bid"
            className="h-16 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/dashboard")}
          />
        </div>

        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" data-testid="icon-success" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tender Created!</h1>
          <p className="text-lg text-gray-600">
            Your tender "{tender.title}" has been published successfully.
          </p>
        </div>

        {/* Tender Details Card */}
        <Card className="mb-8 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-xl">{tender.title}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">Deadline</p>
                <p className="text-gray-900">{new Date(tender.deadline).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Status</p>
                <Badge className="mt-1">{tender.status}</Badge>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Budget Range</p>
                <p className="text-gray-900">{tender.budgetRange || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Duration</p>
                <p className="text-gray-900">{tender.duration || tender.projectTimeline}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-600 mb-2">Description</p>
              <p className="text-gray-700 line-clamp-3">{tender.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Invite Link Section */}
        <Card className="mb-8 border-2 border-blue-200 bg-blue-50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900">Share Your Tender</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              Share this link with vendors who should be invited to submit proposals:
            </p>
            
            <div className="flex gap-2">
              <div className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 flex items-center font-mono text-sm text-gray-700 break-all">
                {inviteLink}
              </div>
              <Button
                onClick={handleCopyLink}
                variant={copied ? "default" : "outline"}
                className="shrink-0"
                data-testid="button-copy-link"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2 pt-4">
              <Button
                onClick={() => window.open(inviteLink, "_blank")}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="button-view-link"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview Tender Link
              </Button>
              <Button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: tender.title,
                      text: `Check out this tender: ${tender.title}`,
                      url: inviteLink,
                    });
                  } else {
                    handleCopyLink();
                  }
                }}
                variant="outline"
                className="w-full"
                data-testid="button-share"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate("/dashboard")}
            className="w-full bg-[#E25E45] hover:bg-[#d54d35] text-white font-semibold py-6"
            data-testid="button-go-dashboard"
          >
            Go to Dashboard
          </Button>
          <Button
            onClick={() => navigate("/tenders/new")}
            variant="outline"
            className="w-full font-semibold py-6"
            data-testid="button-create-another"
          >
            Create Another Tender
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">
            💡 <strong>Tip:</strong> Vendors will use this link to view your tender details and submit proposals. You can share it via email, messaging apps, or directly with your network.
          </p>
        </div>
      </div>
    </div>
  );
}
