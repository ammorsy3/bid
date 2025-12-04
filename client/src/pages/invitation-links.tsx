import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useAuthStore } from "@/lib/auth";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Mail } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Tender } from "@shared/schema";

export default function InvitationLinks() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());
  const [copiedMessage, setCopiedMessage] = useState(false);

  const { data: tender, isLoading: tenderLoading } = useQuery<Tender>({
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

  const copyInvitationMessage = async () => {
    if (!tender) return;
    
    const invitationLink = `${window.location.origin}/invite/${tender.id}`;
    const message = `You're invited to submit an offer for "${tender.title}"\n\nTender Details:\n- Budget: ${tender.budget || 'Not specified'}\n- Deadline: ${tender.deadline}\n- Duration: ${tender.duration || 'Not specified'}\n\nClick here to view details and submit your offer:\n${invitationLink}`;
    
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
      toast({
        title: "Copied!",
        description: "Invitation message copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy message",
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

        {tender.id ? (
          <div className="space-y-4">
            <Card className="bg-white rounded-xl shadow-sm border border-neutral-200">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-neutral-400" />
                    <span className="font-medium text-neutral-900">
                      Tender Invitation Link
                    </span>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-3 font-mono text-sm text-neutral-700 break-all">
                    {`${window.location.origin}/invite/${tender.id}`}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`${window.location.origin}/invite/${tender.id}`, tender.id)}
                      className="flex items-center space-x-2 flex-1"
                      data-testid="button-copy-link"
                    >
                      {copiedLinks.has(tender.id) ? (
                        <>
                          <Check className="h-4 w-4 text-success-600" />
                          <span>Link Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyInvitationMessage}
                      className="flex items-center space-x-2 flex-1"
                      data-testid="button-copy-message"
                    >
                      {copiedMessage ? (
                        <>
                          <Check className="h-4 w-4 text-success-600" />
                          <span>Message Copied</span>
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          <span>Copy Message</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Invitation Message Preview</h4>
                    <div className="text-sm text-blue-800 whitespace-pre-line">
                      You're invited to submit an offer for "{tender.title}"<br/><br/>
                      Tender Details:<br/>
                      - Budget: {tender.budget || 'Not specified'}<br/>
                      - Deadline: {tender.deadline}<br/>
                      - Duration: {tender.duration || 'Not specified'}<br/><br/>
                      Click here to view details and submit your offer:<br/>
                      {`${window.location.origin}/invite/${tender.id}`}
                    </div>
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