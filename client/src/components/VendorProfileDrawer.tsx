import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Building2, FileText, Globe, Linkedin, ExternalLink, Loader2, ShieldCheck, Clock, XCircle } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";

interface VendorProfileData {
  vendor: {
    id: string;
    name: string;
    company: string;
    verificationStatus: string;
  };
  profile: {
    displayName: string;
    logoUrl: string | null;
    headerUrl: string | null;
    bio: string;
    category: string;
    profileFileUrl: string | null;
    linkedinUrl: string | null;
    xUrl: string | null;
    websiteUrl: string | null;
  } | null;
}

interface VendorProfileDrawerProps {
  open: boolean;
  onClose: () => void;
  joinRequestId: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'verified':
      return <ShieldCheck className="h-4 w-4" />;
    case 'under_review':
      return <Clock className="h-4 w-4" />;
    default:
      return <XCircle className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'verified':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'under_review':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'under_review':
      return 'Under Review';
    default:
      return 'Not Verified';
  }
};

export default function VendorProfileDrawer({ open, onClose, joinRequestId }: VendorProfileDrawerProps) {
  const { data, isLoading } = useQuery<VendorProfileData>({
    queryKey: [`/api/join-requests/${joinRequestId}/profile`],
    enabled: open && !!joinRequestId,
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data ? (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-start gap-4">
                {data.profile?.logoUrl && (
                  <img
                    src={data.profile.logoUrl}
                    alt={data.profile.displayName}
                    className="w-16 h-16 rounded-lg object-cover border shadow-sm"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-2xl mb-2" data-testid="text-profile-name">
                    {data.profile?.displayName || data.vendor.company}
                  </SheetTitle>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      className={`${getStatusColor(data.vendor.verificationStatus)} border flex items-center gap-1.5`}
                      data-testid="badge-profile-status"
                    >
                      {getStatusIcon(data.vendor.verificationStatus)}
                      {getStatusLabel(data.vendor.verificationStatus)}
                    </Badge>
                  </div>
                  <SheetDescription data-testid="text-profile-category">
                    {data.profile?.category || 'No category specified'}
                  </SheetDescription>
                </div>
              </div>
              
              {data.profile?.headerUrl && (
                <img
                  src={data.profile.headerUrl}
                  alt="Company header"
                  className="w-full h-32 object-cover rounded-lg border"
                />
              )}
            </SheetHeader>

            <Separator className="my-6" />

            <div className="space-y-6">
              {/* Bio */}
              {data.profile?.bio && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-sm mb-2">About</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-profile-bio">
                      {data.profile.bio}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Company Profile Document */}
              {data.profile?.profileFileUrl && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-sm mb-3">Company Profile</h3>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => window.open(data.profile!.profileFileUrl!, '_blank')}
                      data-testid="button-download-brochure"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Company Brochure
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Social Links */}
              {(data.profile?.websiteUrl || data.profile?.linkedinUrl || data.profile?.xUrl) && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-sm mb-3">Links</h3>
                    <div className="space-y-2">
                      {data.profile.websiteUrl && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => window.open(data.profile!.websiteUrl!, '_blank')}
                          data-testid="link-website"
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          Website
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </Button>
                      )}
                      {data.profile.linkedinUrl && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => window.open(data.profile!.linkedinUrl!, '_blank')}
                          data-testid="link-linkedin"
                        >
                          <Linkedin className="h-4 w-4 mr-2" />
                          LinkedIn
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </Button>
                      )}
                      {data.profile.xUrl && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => window.open(data.profile!.xUrl!, '_blank')}
                          data-testid="link-x"
                        >
                          <FaXTwitter className="h-4 w-4 mr-2" />
                          X (Twitter)
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact Info */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-sm mb-3">Contact Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground" data-testid="text-contact-company">
                        {data.vendor.company}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!data.profile && (
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="pt-6">
                    <p className="text-sm text-yellow-900">
                      This vendor hasn't completed their full profile yet.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Profile not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
