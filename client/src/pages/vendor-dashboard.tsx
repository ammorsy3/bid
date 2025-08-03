import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import Navbar from "@/components/navbar";
import VendorInvitationCard from "@/components/vendor-invitation-card";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Send, Trophy } from "lucide-react";

export default function VendorDashboard() {
  const { user } = useAuthStore();

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['/api/tenders'],
    enabled: !!user,
  });

  const { data: myOffers } = useQuery({
    queryKey: ['/api/my-offers'],
    enabled: !!user,
  });

  const newInvitations = invitations?.filter((inv: any) => inv.status === 'pending') || [];
  const offersSubmitted = myOffers?.length || 0;
  const awardsWon = 0; // This would need additional logic to track awards

  if (!user) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Tender Invitations</h1>
          <p className="text-neutral-600 mt-1">Respond to private tender invitations from qualified requesters</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center">
                    <Mail className="text-secondary-orange h-5 w-5" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-600">New Invitations</p>
                  <p className="text-2xl font-bold text-neutral-900">{newInvitations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Send className="text-primary-600 h-5 w-5" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-600">Offers Submitted</p>
                  <p className="text-2xl font-bold text-neutral-900">{offersSubmitted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                    <Trophy className="text-success-600 h-5 w-5" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-600">Awards Won</p>
                  <p className="text-2xl font-bold text-neutral-900">{awardsWon}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invitations Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">Loading invitations...</p>
          </div>
        ) : invitations?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">No tender invitations yet</p>
            <p className="text-sm text-neutral-500 mt-2">You'll receive invitations from requesters who find your profile suitable for their tenders.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {invitations?.map((invitation: any) => (
              <VendorInvitationCard key={invitation.id} invitation={invitation} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
