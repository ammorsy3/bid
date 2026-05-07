import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, FileText, Globe, Linkedin, ExternalLink, Loader2,
  ShieldCheck, Clock, XCircle, Briefcase, CheckCircle,
} from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";

interface VendorProfileData {
  vendor: {
    id: string;
    name: string;
    email: string | null;
    company: string;
    verificationStatus: string;
  };
  profile: {
    displayName: string;
    logoUrl: string | null;
    headerUrl: string | null;
    bio: string;
    category: string | null;
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
  showActions?: boolean;
  onApprove?: (id: string) => void;
  onDecline?: (id: string) => void;
  isApproving?: boolean;
  isDeclining?: boolean;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'verified':
      return {
        icon: <ShieldCheck className="h-3.5 w-3.5" />,
        label: 'Verified',
        classes: 'bg-[var(--state-won)]/5 text-[var(--state-won)] border-emerald-200',
      };
    case 'under_review':
      return {
        icon: <Clock className="h-3.5 w-3.5" />,
        label: 'Under Review',
        classes: 'bg-amber-50 text-amber-700 dark:text-amber-300 border-amber-200',
      };
    default:
      return {
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: 'Not Verified',
        classes: 'bg-muted text-muted-foreground border-border',
      };
  }
};

export default function VendorProfileDrawer({
  open, onClose, joinRequestId,
  showActions, onApprove, onDecline, isApproving, isDeclining
}: VendorProfileDrawerProps) {
  const { data, isLoading } = useQuery<VendorProfileData>({
    queryKey: [`/api/join-requests/${joinRequestId}/profile`],
    enabled: open && !!joinRequestId,
  });

  const statusConfig = data ? getStatusConfig(data.vendor.verificationStatus) : null;
  const displayName = data?.profile?.displayName || data?.vendor.company || 'Unknown';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hasSocialLinks = data?.profile?.websiteUrl || data?.profile?.linkedinUrl || data?.profile?.xUrl;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg p-0 overflow-y-auto border-l">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
          </div>
        ) : data ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="relative">
              {data.profile?.headerUrl ? (
                <div className="h-32 w-full overflow-hidden">
                  <img
                    src={data.profile.headerUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30" />
                </div>
              ) : (
                <div className="h-28 w-full bg-gradient-to-br from-gray-100 to-gray-50" />
              )}

              {/* Logo / Avatar */}
              <div className="absolute -bottom-8 left-6">
                {data.profile?.logoUrl ? (
                  <img
                    src={data.profile.logoUrl}
                    alt={displayName}
                    className="w-16 h-16 rounded-xl object-cover border-4 border-white shadow-sm bg-card"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl border-4 border-white shadow-sm bg-card flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-400">{initials}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Company Info */}
            <div className="pt-12 px-6 pb-5">
              <div className="flex items-start justify-between mb-1">
                <h2 className="text-xl font-bold text-foreground" data-testid="text-profile-name">
                  {displayName}
                </h2>
                {statusConfig && (
                  <Badge
                    variant="outline"
                    className={`${statusConfig.classes} text-xs flex items-center gap-1 px-2`}
                    data-testid="badge-profile-status"
                  >
                    {statusConfig.icon}
                    {statusConfig.label}
                  </Badge>
                )}
              </div>
              {data.profile?.category && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5" data-testid="text-profile-category">
                  <Briefcase className="h-3.5 w-3.5" />
                  {data.profile.category}
                </p>
              )}
            </div>

            <div className="border-t border-border" />

            {/* Content */}
            <div className="px-6 py-5 space-y-6 flex-1">
              {/* About */}
              {data.profile?.bio && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">About</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-profile-bio">
                    {data.profile.bio}
                  </p>
                </div>
              )}

              {/* Company Brochure */}
              {data.profile?.profileFileUrl && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Documents</h3>
                  <button
                    onClick={() => window.open(data.profile!.profileFileUrl!, '_blank')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-border hover:bg-muted transition-colors text-left"
                    data-testid="button-download-brochure"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[var(--bid-orange)]/5 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Company Brochure</p>
                      <p className="text-xs text-gray-400">View document</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-300" />
                  </button>
                </div>
              )}

              {/* Links */}
              {hasSocialLinks && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Links</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.profile?.websiteUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2 text-muted-foreground"
                        onClick={() => window.open(data.profile!.websiteUrl!, '_blank')}
                        data-testid="link-website"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        Website
                      </Button>
                    )}
                    {data.profile?.linkedinUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2 text-muted-foreground"
                        onClick={() => window.open(data.profile!.linkedinUrl!, '_blank')}
                        data-testid="link-linkedin"
                      >
                        <Linkedin className="h-3.5 w-3.5" />
                        LinkedIn
                      </Button>
                    )}
                    {data.profile?.xUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2 text-muted-foreground"
                        onClick={() => window.open(data.profile!.xUrl!, '_blank')}
                        data-testid="link-x"
                      >
                        <FaXTwitter className="h-3.5 w-3.5" />
                        X
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* No profile notice */}
              {!data.profile && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-100">
                  <Clock className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    This vendor hasn't completed their full profile yet.
                  </p>
                </div>
              )}
            </div>

            {/* Approve / Decline Actions */}
            {showActions && (
              <div className="border-t border-border px-6 py-4 flex items-center gap-3 bg-muted/50">
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300"
                  onClick={() => onDecline?.(joinRequestId)}
                  disabled={isDeclining || isApproving}
                  data-testid="button-drawer-decline"
                >
                  {isDeclining ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Decline
                </Button>
                <Button
                  className="flex-1 bg-[var(--state-won)] hover:bg-[var(--state-won)]/90 text-white"
                  onClick={() => onApprove?.(joinRequestId)}
                  disabled={isApproving || isDeclining}
                  data-testid="button-drawer-approve"
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Building2 className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-muted-foreground">Profile not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
