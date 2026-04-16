import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Calendar, FileText, Send } from "lucide-react";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";

interface TenderCardProps {
  tender: {
    id: string;
    title: string;
    description: string;
    deadline: string;
    status: string;
    offersCount: number;
    submissionType?: string | null;
    budget?: string | null;
  };
}

export default function TenderCard({ tender }: TenderCardProps) {
  const { t, language } = useI18n();

  const getSubmissionTypeLabel = (type: string) => {
    switch (type) {
      case 'quote_only': return t('tenderCard.priceQuoteOnly');
      case 'tech_fin_proposal': return t('tenderCard.techFinProposal');
      case 'video_only': return t('tenderCard.videoOnly');
      case 'tech_fin_with_video': return t('tenderCard.techFinWithVideo');
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'closed': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return t('tenderCard.published');
      case 'draft': return t('tenderCard.draft');
      case 'closed': return t('tenderCard.closed');
      case 'cancelled': return t('tenderCard.cancelled');
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getSpotlightColor = (status: string): 'blue' | 'purple' | 'green' | 'red' | 'orange' => {
    switch (status) {
      case 'published': return 'green';
      case 'draft': return 'purple';
      case 'closed': return 'orange';
      case 'cancelled': return 'red';
      default: return 'blue';
    }
  };

  return (
    <SpotlightCard
      spotlightColor={getSpotlightColor(tender.status)}
      className="w-full"
    >
      <div className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-neutral-900">{tender.title}</h3>
          <Badge className={`${getStatusColor(tender.status)} text-xs font-medium px-2.5 py-0.5 rounded-full ml-3`}>
            {getStatusLabel(tender.status)}
          </Badge>
        </div>

        <p className="text-sm text-neutral-600 line-clamp-2 mb-4">{tender.description}</p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-600 mb-4">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-green-600" />
            <span>{format(new Date(tender.deadline), 'PP', { locale: language === 'ar' ? ar : enUS })}</span>
          </div>
          <div className="flex items-center">
            <Send className="w-4 h-4 mr-2" />
            <span>{tender.offersCount} {t('tenderCard.offers')}</span>
          </div>
          {tender.submissionType && (
            <div className="flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              <span>{getSubmissionTypeLabel(tender.submissionType)}</span>
            </div>
          )}
          {tender.budget && (
            <div className="flex items-center">
              <span className="text-neutral-500 mr-1">$</span>
              <span>{tender.budget}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="text-neutral-700">
            <Link href={`/tenders/${tender.id}`}>
              {t('tenderCard.view')}
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="text-neutral-700">
            {t('tenderCard.copyLink')}
          </Button>
          <Button variant="outline" size="sm" className="text-neutral-700">
            {t('tenderCard.edit')}
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
            {t('tenderCard.delete')}
          </Button>
        </div>
      </div>
    </SpotlightCard>
  );
}
