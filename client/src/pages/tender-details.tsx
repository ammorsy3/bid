import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useState } from "react";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building, Clock, DollarSign } from "lucide-react";
import { format } from "date-fns";
import SubmitOfferModal from "@/components/submit-offer-modal";

export default function TenderDetails() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  const { data: tender, isLoading } = useQuery({
    queryKey: ['/api/tenders', id],
    enabled: !!user && !!id,
  });

  const { data: offers } = useQuery({
    queryKey: ['/api/tenders', id, 'offers'],
    enabled: !!user && !!id && user.role === 'requester',
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-neutral-600">Loading tender details...</p>
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-warning-100 text-warning-800';
      case 'draft': return 'bg-neutral-100 text-neutral-800';
      case 'closed': return 'bg-success-100 text-success-800';
      default: return 'bg-neutral-100 text-neutral-800';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tender Details */}
          <div className="lg:col-span-2">
            <Card className="bg-white rounded-xl shadow-sm border border-neutral-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-neutral-900 mb-2">
                      {tender.title}
                    </CardTitle>
                    <Badge className={`${getStatusColor(tender.status)} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                      {tender.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-3">Description</h3>
                    <p className="text-neutral-600 leading-relaxed">{tender.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-neutral-400" />
                      <div>
                        <p className="text-sm text-neutral-600">Deadline</p>
                        <p className="font-medium text-neutral-900">
                          {format(new Date(tender.deadline), 'PPP')}
                        </p>
                      </div>
                    </div>

                    {tender.budget && (
                      <div className="flex items-center space-x-3">
                        <DollarSign className="h-5 w-5 text-neutral-400" />
                        <div>
                          <p className="text-sm text-neutral-600">Budget</p>
                          <p className="font-medium text-neutral-900">{tender.budget}</p>
                        </div>
                      </div>
                    )}

                    {tender.duration && (
                      <div className="flex items-center space-x-3">
                        <Clock className="h-5 w-5 text-neutral-400" />
                        <div>
                          <p className="text-sm text-neutral-600">Duration</p>
                          <p className="font-medium text-neutral-900">{tender.duration}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-3">
                      <Building className="h-5 w-5 text-neutral-400" />
                      <div>
                        <p className="text-sm text-neutral-600">Created</p>
                        <p className="font-medium text-neutral-900">
                          {format(new Date(tender.createdAt), 'PPP')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card className="bg-white rounded-xl shadow-sm border border-neutral-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user?.role === 'vendor' && (
                  <Button 
                    className="w-full bg-primary-600 hover:bg-primary-700"
                    onClick={() => setIsOfferModalOpen(true)}
                    data-testid="button-submit-offer"
                  >
                    Submit Offer
                  </Button>
                )}
                {user?.role === 'requester' && (
                  <>
                    <Button className="w-full bg-primary-600 hover:bg-primary-700">
                      View All Offers ({offers?.length || 0})
                    </Button>
                    <Button variant="outline" className="w-full">
                      Edit Tender
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            {user?.role === 'requester' && (
              <Card className="bg-white rounded-xl shadow-sm border border-neutral-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-600">Offers Received</span>
                    <span className="font-semibold text-neutral-900">{offers?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-600">Days Remaining</span>
                    <span className="font-semibold text-neutral-900">
                      {Math.ceil((new Date(tender.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      
      {/* Submit Offer Modal */}
      {tender && user && (
        <SubmitOfferModal 
          isOpen={isOfferModalOpen}
          onClose={() => setIsOfferModalOpen(false)}
          tender={tender}
          requester={{ id: tender.requesterId, name: "Requester", company: "Company" }}
        />
      )}
    </div>
  );
}
