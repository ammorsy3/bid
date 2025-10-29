import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, Edit, FileCheck, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useAuthStore } from "@/lib/auth";

interface VendorQualification {
  id: string;
  vendorId: string;
  updatedAt?: string;
  reviewerNote?: string;
}

export default function VendorStatus() {
  const { user } = useAuthStore();
  
  const { data: qualification, isLoading } = useQuery<VendorQualification>({
    queryKey: ['/api/vendor/qualification'],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neutral-200 rounded w-1/3" />
            <div className="h-64 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const getStatusInfo = () => {
    switch (user?.verificationStatus) {
      case 'verified':
        return {
          icon: <CheckCircle2 className="h-12 w-12 text-success-600" />,
          badge: (
            <Badge className="bg-success-600 text-white px-4 py-2 text-base">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Verified
            </Badge>
          ),
          title: "Your Account is Verified",
          description: "Your vendor profile has been reviewed and approved. You can now receive tender invitations and submit proposals.",
          bgColor: "bg-success-50",
          borderColor: "border-success-200"
        };
      case 'under_review':
        return {
          icon: <Clock className="h-12 w-12 text-primary-600" />,
          badge: (
            <Badge className="bg-primary-600 text-white px-4 py-2 text-base">
              <Clock className="h-4 w-4 mr-2" />
              Under Review
            </Badge>
          ),
          title: "Your Profile is Under Review",
          description: "Our team is currently reviewing your compliance documents and company profile. This typically takes 1-3 business days. You'll be notified once the review is complete.",
          bgColor: "bg-primary-50",
          borderColor: "border-primary-200"
        };
      default:
        return {
          icon: <AlertCircle className="h-12 w-12 text-neutral-500" />,
          badge: (
            <Badge variant="outline" className="border-neutral-400 text-neutral-700 px-4 py-2 text-base">
              <AlertCircle className="h-4 w-4 mr-2" />
              Not Verified
            </Badge>
          ),
          title: "Complete Your Profile to Get Verified",
          description: "You need to submit your vendor pre-qualification form with all required compliance documents to start receiving tender invitations.",
          bgColor: "bg-neutral-50",
          borderColor: "border-neutral-200"
        };
    }
  };

  const statusInfo = getStatusInfo();
  const lastUpdated = qualification?.updatedAt 
    ? format(new Date(qualification.updatedAt), "PPpp") 
    : "Not available";

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Account Status</h1>
          <p className="text-neutral-600">Track your verification status and manage your vendor profile</p>
        </div>

        {/* Status Card */}
        <Card className={`mb-6 border-2 ${statusInfo.borderColor} ${statusInfo.bgColor}`}>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Icon */}
              <div className="flex-shrink-0">
                {statusInfo.icon}
              </div>
              
              {/* Status Info */}
              <div className="flex-1">
                <div className="mb-3">
                  {statusInfo.badge}
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                  {statusInfo.title}
                </h2>
                <p className="text-neutral-700 leading-relaxed">
                  {statusInfo.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Last Updated */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last Updated</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600" data-testid="text-last-updated">
                {lastUpdated}
              </p>
            </CardContent>
          </Card>

          {/* Reviewer Note (if exists) */}
          {qualification?.reviewerNote && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reviewer Note</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-700" data-testid="text-reviewer-note">
                  {qualification.reviewerNote}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your vendor profile and compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/vendor-prequalification">
                <a className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full sm:w-auto transition-colors cursor-pointer" data-testid="button-edit-profile">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Link>
              
              <Link href="/vendor-prequalification">
                <a className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full sm:w-auto transition-colors cursor-pointer" data-testid="button-update-compliance">
                  <FileCheck className="h-4 w-4 mr-2" />
                  Update Compliance
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        {user?.verificationStatus !== 'verified' && (
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">What's Next?</h3>
                  <p className="text-sm text-blue-800">
                    {user?.verificationStatus === 'under_review' 
                      ? "Your documents are being reviewed. You'll receive an email notification once the review is complete."
                      : "Complete your vendor pre-qualification form with all required documents to get verified and start receiving tender invitations."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
