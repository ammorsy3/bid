import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, Send, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Link } from "wouter";

interface TenderCardProps {
  tender: {
    id: string;
    title: string;
    description: string;
    deadline: string;
    status: string;
    invitedCount: number;
    offersCount: number;
  };
}

export default function TenderCard({ tender }: TenderCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-warning-100 text-warning-800';
      case 'draft': return 'bg-neutral-100 text-neutral-800';
      case 'closed': return 'bg-success-100 text-success-800';
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

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">{tender.title}</h3>
            <p className="text-sm text-neutral-600 line-clamp-2">{tender.description}</p>
          </div>
          <Badge className={`${getStatusColor(tender.status)} text-xs font-medium px-2.5 py-0.5 rounded-full ml-3`}>
            {tender.status}
          </Badge>
        </div>
        
        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm text-neutral-600">
            <Calendar className="w-4 h-4 mr-2" />
            <span>Deadline: <span className={`font-medium ${getUrgencyColor(tender.deadline)}`}>
              {format(new Date(tender.deadline), 'MMM d, yyyy', { locale: enUS })}
            </span></span>
          </div>
          <div className="flex items-center text-sm text-neutral-600">
            <Mail className="w-4 h-4 mr-2" />
            <span><span className="font-medium">{tender.invitedCount}</span> vendors invited</span>
          </div>
          <div className="flex items-center text-sm text-neutral-600">
            <Send className="w-4 h-4 mr-2" />
            <span><span className="font-medium text-primary-600">{tender.offersCount}</span> offers received</span>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button asChild className="flex-1 bg-primary-600 hover:bg-primary-700 text-white">
            <Link href={`/tenders/${tender.id}`}>
              View Details
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="px-4 py-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
