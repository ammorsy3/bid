import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle, ExternalLink, FileText, Building2, Globe } from "lucide-react";
import { SiLinkedin } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";

interface VendorProfile {
  id: string;
  displayName: string;
  logoUrl?: string;
  headerUrl?: string;
  bio?: string;
  category?: string;
  profileFileUrl?: string;
  linkedinUrl?: string;
  xUrl?: string;
  websiteUrl?: string;
  verificationStatus: string;
}

interface VendorProfileViewProps {
  profile: VendorProfile;
  compact?: boolean;
}

export default function VendorProfileView({ profile, compact = false }: VendorProfileViewProps) {
  const getStatusBadge = () => {
    switch (profile.verificationStatus) {
      case 'verified':
        return (
          <Badge className="bg-success-600 text-white px-3 py-1" data-testid="status-verified">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Verified
          </Badge>
        );
      case 'under_review':
        return (
          <Badge className="bg-primary-600 text-white px-3 py-1" data-testid="status-under-review">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Under Review
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-neutral-400 text-neutral-700 px-3 py-1" data-testid="status-not-verified">
            <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
            Not Verified
          </Badge>
        );
    }
  };

  if (compact) {
    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          {profile.logoUrl ? (
            <img 
              src={profile.logoUrl} 
              alt={profile.displayName}
              className="w-16 h-16 rounded-lg object-contain bg-white border border-neutral-200 p-1.5 flex-shrink-0"
              data-testid="img-vendor-logo"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-neutral-50 flex items-center justify-center border border-neutral-200 flex-shrink-0">
              <Building2 className="h-8 w-8 text-neutral-400" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-lg font-semibold text-neutral-900 truncate" data-testid="text-vendor-name">
                {profile.displayName}
              </h3>
              {getStatusBadge()}
            </div>
            
            {profile.category && (
              <div className="mb-2">
                <Badge 
                  variant="outline" 
                  className="text-xs bg-primary-50 border-primary-200 text-primary-700"
                  data-testid="tag-category"
                >
                  {profile.category}
                </Badge>
              </div>
            )}
            
            {profile.bio && (
              <p className="text-sm text-neutral-600 line-clamp-2" data-testid="text-bio">
                {profile.bio}
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-lg">
      {/* Premium Hero Header */}
      <div className="relative">
        {profile.headerUrl ? (
          <div 
            className="h-48 md:h-64 bg-cover bg-center"
            style={{ backgroundImage: `url(${profile.headerUrl})` }}
            data-testid="vendor-header"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
          </div>
        ) : (
          <div 
            className="h-48 md:h-64 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700"
            data-testid="vendor-header"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 right-10 w-32 h-32 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
            </div>
          </div>
        )}
      </div>
      
      {/* Profile Content */}
      <div className="px-6 pb-8">
        {/* Logo and Name Section */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-8 -mt-12 md:-mt-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            {profile.logoUrl ? (
              <img 
                src={profile.logoUrl} 
                alt={profile.displayName}
                className="w-28 h-28 md:w-32 md:h-32 rounded-2xl object-contain bg-white border-4 border-white shadow-2xl p-3"
                data-testid="img-vendor-logo"
              />
            ) : (
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-white border-4 border-white shadow-2xl flex items-center justify-center">
                <Building2 className="h-14 w-14 md:h-16 md:w-16 text-neutral-400" />
              </div>
            )}
          </div>
          
          {/* Name and Status */}
          <div className="flex-1 md:mb-4">
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-3" data-testid="text-vendor-name">
              {profile.displayName}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge()}
              {profile.category && (
                <Badge 
                  variant="outline"
                  className="bg-primary-50 border-primary-200 text-primary-700 px-3 py-1"
                  data-testid="tag-category"
                >
                  {profile.category}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* About Section */}
        {profile.bio && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3 uppercase tracking-wide">About</h3>
            <p className="text-neutral-700 leading-relaxed" data-testid="text-bio">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Profile PDF Button */}
        {profile.profileFileUrl && (
          <div className="mb-8">
            <Button 
              variant="outline" 
              className="w-full md:w-auto border-2 hover:border-primary-600 hover:text-primary-600 transition-all"
              onClick={() => window.open(profile.profileFileUrl, '_blank')}
              data-testid="button-view-brochure"
            >
              <FileText className="h-4 w-4 mr-2" />
              View Company Profile
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Social Links - Icon based */}
        {(profile.linkedinUrl || profile.xUrl || profile.websiteUrl) && (
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-3 uppercase tracking-wide">Connect</h3>
            <div className="flex gap-2 flex-wrap">
              {profile.linkedinUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-primary-50 hover:border-primary-600 hover:text-primary-600 transition-all"
                  onClick={() => window.open(profile.linkedinUrl, '_blank')}
                  data-testid="link-linkedin"
                  title="LinkedIn"
                >
                  <SiLinkedin className="h-5 w-5" />
                </Button>
              )}
              
              {profile.xUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-primary-50 hover:border-primary-600 hover:text-primary-600 transition-all"
                  onClick={() => window.open(profile.xUrl, '_blank')}
                  data-testid="link-x"
                  title="X (Twitter)"
                >
                  <FaXTwitter className="h-5 w-5" />
                </Button>
              )}
              
              {profile.websiteUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-primary-50 hover:border-primary-600 hover:text-primary-600 transition-all"
                  onClick={() => window.open(profile.websiteUrl, '_blank')}
                  data-testid="link-website"
                  title="Website"
                >
                  <Globe className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
