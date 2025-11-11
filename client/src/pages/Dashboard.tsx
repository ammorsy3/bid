import { useAuthStore } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FileText, Users, Inbox, LogOut } from "lucide-react";
import { useState } from "react";
import CreateTenderModal from "@/components/create-tender-modal";

export default function Dashboard() {
  const { user, activeCompany, companies, logout } = useAuthStore();
  const [, setLocation] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (!activeCompany) {
    setLocation("/company-onboarding");
    return null;
  }

  // Check if user is owner or admin (can create tenders, manage vendors)
  const canManage = ['owner', 'admin'].includes(activeCompany.role);
  const isOwner = activeCompany.role === 'owner';

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeCompany.profile?.displayName || activeCompany.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {activeCompany.role} • {activeCompany.verificationStatus}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {companies.length > 1 && (
                <div className="text-sm text-gray-500">
                  {companies.length} companies
                </div>
              )}
              <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Verification Status Banner */}
        {activeCompany.verificationStatus !== 'verified' && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
            <CardHeader>
              <CardTitle className="text-yellow-900 dark:text-yellow-100">
                Company Verification Pending
              </CardTitle>
              <CardDescription className="text-yellow-800 dark:text-yellow-200">
                Your company is under review. You can browse but some features are restricted until verified.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Building2 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            {canManage && (
              <TabsTrigger value="tenders" data-testid="tab-tenders">
                <FileText className="h-4 w-4 mr-2" />
                Tenders
              </TabsTrigger>
            )}
            <TabsTrigger value="proposals" data-testid="tab-proposals">
              <Inbox className="h-4 w-4 mr-2" />
              Proposals
            </TabsTrigger>
            {canManage && (
              <TabsTrigger value="vendors" data-testid="tab-vendors">
                <Users className="h-4 w-4 mr-2" />
                Vendors Base
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to Your Dashboard</CardTitle>
                <CardDescription>
                  Manage tenders, proposals, and your vendor network all in one place.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Company Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {activeCompany.verificationStatus}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {activeCompany.onboardingState === 'completed' ? 'Profile complete' : 'Setup in progress'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Your Role</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold capitalize">
                        {activeCompany.role}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        in this company
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {canManage && (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          size="sm" 
                          data-testid="button-create-tender"
                          onClick={() => setIsCreateModalOpen(true)}
                        >
                          Create Tender
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        size="sm" 
                        data-testid="button-view-profile"
                        onClick={() => setLocation('/company-onboarding')}
                      >
                        View Profile
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tenders Tab */}
          {canManage && (
            <TabsContent value="tenders">
              <Card>
                <CardHeader>
                  <CardTitle>Tenders</CardTitle>
                  <CardDescription>
                    Create and manage procurement tenders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Tender management coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Proposals Tab */}
          <TabsContent value="proposals">
            <Card>
              <CardHeader>
                <CardTitle>Proposals</CardTitle>
                <CardDescription>
                  View and submit proposals to tenders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Proposal management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendors Base Tab */}
          {canManage && (
            <TabsContent value="vendors">
              <Card>
                <CardHeader>
                  <CardTitle>Vendors Base</CardTitle>
                  <CardDescription>
                    Manage your approved vendor network
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Vendors base management coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Create Tender Modal */}
      <CreateTenderModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}
