import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import Navbar from "@/components/navbar";
import TenderCard from "@/components/tender-card";
import CreateTenderModal from "@/components/create-tender-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Send, Users, Clock } from "lucide-react";
import { useState } from "react";

export default function RequesterDashboard() {
  const { user } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: tenders, isLoading } = useQuery({
    queryKey: ['/api/tenders'],
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
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Create Tender
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <FileText className="text-primary-600 h-5 w-5" />
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
                  <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center">
                    <Send className="text-secondary-orange h-5 w-5" />
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
                  <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                    <Users className="text-success-600 h-5 w-5" />
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
                  <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
                    <Clock className="text-warning-600 h-5 w-5" />
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
              className="bg-primary-600 hover:bg-primary-700"
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
