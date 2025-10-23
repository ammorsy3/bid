import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Clock, Eye, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useState } from "react";
import SubmitOfferModal from "./submit-offer-modal";

interface VendorInvitationCardProps {
  invitation: {
    id: string;
    status: string;
    tender: {
      id: string;
      title: string;
      description: string;
      deadline: string;
      budget?: string;
      duration?: string;
    };
    requester: {
      name: string;
      company?: string;
    };
  };
}

export default function VendorInvitationCard({ invitation }: VendorInvitationCardProps) {
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-secondary-100 text-secondary-orange';
      case 'submitted': return 'bg-success-100 text-success-600';
      default: return 'bg-neutral-100 text-neutral-800';
    }
  };

  const getUrgencyColor = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 3) return 'text-error-600';
    return 'text-neutral-900';
  };

  const isSubmitted = invitation.status === 'submitted';

  return (
    <>
      <Card className="bg-white rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <h3 className="text-lg font-semibold text-neutral-900 mr-3">{invitation.tender.title}</h3>
                <Badge className={`${getStatusColor(invitation.status)} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                  {invitation.status === 'pending' ? 'New' : invitation.status}
                </Badge>
              </div>
              <p className="text-sm text-neutral-600 mb-3">
                {invitation.requester.company || invitation.requester.name}
              </p>
              <p className="text-sm text-neutral-600 line-clamp-2">{invitation.tender.description}</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center text-sm text-neutral-600">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Deadline: <span className={`font-medium ${getUrgencyColor(invitation.tender.deadline)}`}>
                {format(new Date(invitation.tender.deadline), 'MMM d, yyyy', { locale: enUS })}
              </span></span>
            </div>
            {invitation.tender.budget && (
              <div className="flex items-center text-sm text-neutral-600">
                <DollarSign className="w-4 h-4 mr-2" />
                <span>Budget: <span className="font-medium">{invitation.tender.budget}</span></span>
              </div>
            )}
            {invitation.tender.duration && (
              <div className="flex items-center text-sm text-neutral-600">
                <Clock className="w-4 h-4 mr-2" />
                <span>Duration: <span className="font-medium">{invitation.tender.duration}</span></span>
              </div>
            )}
            {isSubmitted && (
              <div className="flex items-center text-sm text-success-600">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span>Offer submitted</span>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            {!isSubmitted ? (
              <Button 
                onClick={() => setIsOfferModalOpen(true)}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
              >
                Submit Offer
              </Button>
            ) : (
              <Button variant="secondary" className="flex-1 cursor-not-allowed" disabled>
                Offer Submitted
              </Button>
            )}
            <Button variant="ghost" size="sm" className="px-4 py-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <SubmitOfferModal 
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        tender={invitation.tender}
        requester={invitation.requester}
      />
    </>
  );
}
