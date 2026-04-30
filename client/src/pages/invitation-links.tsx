import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useAuthStore } from "@/lib/auth";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Check, Mail } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import type { Tender } from "@shared/schema";

export default function InvitationLinks() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { t } = useI18n();
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());
  const [copiedMessage, setCopiedMessage] = useState(false);

  const { data: tender, isLoading: tenderLoading } = useQuery<Tender>({
    queryKey: ['/api/tenders', id],
    enabled: !!user && !!id,
  });

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
        title: t('invitationLinks.toastCopied'),
        description: t('invitationLinks.toastCopiedDesc'),
      });
    } catch (error) {
      toast({
        title: t('invitationLinks.toastError'),
        description: t('invitationLinks.toastErrorLink'),
        variant: "destructive",
      });
    }
  };

  const copyInvitationMessage = async () => {
    if (!tender) return;

    const invitationLink = `${window.location.origin}/invite/${tender.id}`;
    const message = [
      t('invitationLinks.inviteSubject', { title: tender.title }),
      '',
      t('invitationLinks.inviteTenderDetails'),
      t('invitationLinks.inviteBudget', { budget: tender.budget || t('invitationLinks.notSpecified') }),
      t('invitationLinks.inviteDeadline', { deadline: tender.deadline }),
      t('invitationLinks.inviteDuration', { duration: tender.duration || t('invitationLinks.notSpecified') }),
      '',
      t('invitationLinks.inviteClickHere'),
      invitationLink,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
      toast({
        title: t('invitationLinks.toastMessageCopied'),
        description: t('invitationLinks.toastMessageCopiedDesc'),
      });
    } catch (error) {
      toast({
        title: t('invitationLinks.toastError'),
        description: t('invitationLinks.toastErrorMessage'),
        variant: "destructive",
      });
    }
  };

  if (tenderLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-neutral-600">{t('invitationLinks.loading')}</p>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-neutral-600">{t('invitationLinks.notFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">{t('invitationLinks.pageTitle')}</h1>
          <p className="text-neutral-600">{t('invitationLinks.pageDesc')}</p>
          <p className="text-sm text-neutral-500 mt-1">{t('invitationLinks.tenderLabel', { title: tender.title })}</p>
        </div>

        {tender.id ? (
          <div className="space-y-4">
            <Card className="bg-white rounded-xl shadow-sm border border-neutral-200">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-neutral-400" />
                    <span className="font-medium text-neutral-900">
                      {t('invitationLinks.cardTitle')}
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
                          <span>{t('invitationLinks.linkCopied')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>{t('invitationLinks.copyLink')}</span>
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
                          <span>{t('invitationLinks.messageCopied')}</span>
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          <span>{t('invitationLinks.copyMessage')}</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">{t('invitationLinks.messagePreviewTitle')}</h4>
                    <div className="text-sm text-blue-800 whitespace-pre-line">
                      {t('invitationLinks.inviteSubject', { title: tender.title })}<br /><br />
                      {t('invitationLinks.inviteTenderDetails')}<br />
                      {t('invitationLinks.inviteBudget', { budget: tender.budget || t('invitationLinks.notSpecified') })}<br />
                      - Deadline: {tender.deadline}<br />
                      {t('invitationLinks.inviteDuration', { duration: tender.duration || t('invitationLinks.notSpecified') })}<br /><br />
                      {t('invitationLinks.inviteClickHere')}<br />
                      {`${window.location.origin}/invite/${tender.id}`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-neutral-600">{t('invitationLinks.noLinkAvailable')}</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-neutral-500 mb-4">
            {t('invitationLinks.footerNote1')}
          </p>
          <p className="text-xs text-neutral-400">
            {t('invitationLinks.footerNote2')}
          </p>
        </div>
      </main>
    </div>
  );
}
