import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle, ExternalLink, FileText, Building2 } from "lucide-react";
import { SiLinkedin } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";

interface VendorProfile {
  id: string;
  displayName: string;
  logoUrl?: string;
  headerUrl?: string;
  headerColor?: string;
  bio?: string;
  categories?: string[];
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
          <Badge className="bg-success-600 text-white" data-testid="status-verified">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case 'under_review':
        return (
          <Badge className="bg-primary-600 text-white" data-testid="status-under-review">
            <Clock className="h-3 w-3 mr-1" />
            Under Review
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-neutral-300 text-neutral-600" data-testid="status-not-verified">
            <AlertCircle className="h-3 w-3 mr-1" />
            Not Verified
          </Badge>
        );
    }
  };

  const headerStyle = profile.headerUrl
    ? { backgroundImage: `url(${profile.headerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : profile.headerColor
    ? { backgroundColor: profile.headerColor }
    : { backgroundColor: '#f3f4f6' };

  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-start gap-4">
          {profile.logoUrl ? (
            <img 
              src={profile.logoUrl} 
              alt={profile.displayName}
              className="w-16 h-16 rounded-lg object-cover border border-neutral-200"
              data-testid="img-vendor-logo"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-neutral-100 flex items-center justify-center border border-neutral-200">
              <Building2 className="h-8 w-8 text-neutral-400" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-neutral-900 truncate" data-testid="text-vendor-name">
                {profile.displayName}
              </h3>
              {getStatusBadge()}
            </div>
            
            {profile.categories && profile.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {profile.categories.slice(0, 3).map((category, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-xs"
                    data-testid={`tag-category-${index}`}
                  >
                    {category}
                  </Badge>
                ))}
                {profile.categories.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{profile.categories.length - 3} more
                  </Badge>
                )}
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
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="h-32" style={headerStyle} data-testid="vendor-header" />
      
      {/* Profile Content */}
      <div className="p-6">
        {/* Logo and Name */}
        <div className="flex items-start gap-4 mb-6 -mt-16">
          {profile.logoUrl ? (
            <img 
              src={profile.logoUrl} 
              alt={profile.displayName}
              className="w-24 h-24 rounded-xl object-cover border-4 border-white shadow-lg"
              data-testid="img-vendor-logo"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-white border-4 border-white shadow-lg flex items-center justify-center">
              <Building2 className="h-12 w-12 text-neutral-400" />
            </div>
          )}
          
          <div className="flex-1 mt-12">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-neutral-900" data-testid="text-vendor-name">
                {profile.displayName}
              </h2>
              {getStatusBadge()}
            </div>
          </div>
        </div>

        {/* Categories */}
        {profile.categories && profile.categories.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-neutral-700 mb-2">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {profile.categories.map((category, index) => (
                <Badge 
                  key={index} 
                  variant="outline"
                  data-testid={`tag-category-${index}`}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-neutral-700 mb-2">About</h3>
            <p className="text-neutral-600 whitespace-pre-wrap" data-testid="text-bio">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Profile PDF */}
        {profile.profileFileUrl && (
          <div className="mb-6">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open(profile.profileFileUrl, '_blank')}
              data-testid="button-view-brochure"
            >
              <FileText className="h-4 w-4 mr-2" />
              View Company Brochure
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Social Links */}
        {(profile.linkedinUrl || profile.xUrl || profile.websiteUrl) && (
          <div>
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Connect</h3>
            <div className="flex gap-3">
              {profile.linkedinUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(profile.linkedinUrl, '_blank')}
                  data-testid="link-linkedin"
                >
                  <SiLinkedin className="h-4 w-4 mr-2" />
                  LinkedIn
                </Button>
              )}
              
              {profile.xUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(profile.xUrl, '_blank')}
                  data-testid="link-x"
                >
                  <FaXTwitter className="h-4 w-4 mr-2" />
                  X
                </Button>
              )}
              
              {profile.websiteUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(profile.websiteUrl, '_blank')}
                  data-testid="link-website"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Website
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
