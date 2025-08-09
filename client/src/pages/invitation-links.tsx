import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useAuthStore } from "@/lib/auth";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Mail } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function InvitationLinks() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());

  const { data: tender, isLoading: tenderLoading } = useQuery({
    queryKey: ['/api/tenders', id],
    enabled: !!user && !!id,
  });

  // No longer need separate invitations query since we have the token in the tender

  const copyToClipboard = async (text: string, invitationId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLinks(prev => new Set(prev).add(invitationId));
      setTimeout(() => {
        setCopiedLinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(invitationId);
          return newSet;
        });
      }, 2000);
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

  if (tenderLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-neutral-600">Loading invitation links...</p>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-neutral-600">Tender not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Invitation Link</h1>
          <p className="text-neutral-600">Share this link with qualified vendors to invite them to submit offers</p>
          <p className="text-sm text-neutral-500 mt-1">Tender: {tender.title}</p>
        </div>

        {tender.invitationToken ? (
          <div className="space-y-4">
            <Card className="bg-white rounded-xl shadow-sm border border-neutral-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <Mail className="h-5 w-5 text-neutral-400" />
                      <span className="font-medium text-neutral-900">
                        Tender Invitation Link
                      </span>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-3 font-mono text-sm text-neutral-700 break-all">
                      {`${window.location.origin}/invite/${tender.invitationToken}`}
                    </div>
                  </div>
                  <div className="ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`${window.location.origin}/invite/${tender.invitationToken}`, tender.id)}
                      className="flex items-center space-x-2"
                    >
                      {copiedLinks.has(tender.id) ? (
                        <>
                          <Check className="h-4 w-4 text-success-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-neutral-600">No invitation link available</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-neutral-500 mb-4">
            Send these links directly to vendors via email, messaging, or any communication method you prefer.
          </p>
          <p className="text-xs text-neutral-400">
            Vendors can register using these links and submit their offers for your tender.
          </p>
        </div>
      </main>
    </div>
  );
}