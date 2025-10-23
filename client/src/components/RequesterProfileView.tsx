import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Building2, Users, Globe } from "lucide-react";
import { SiLinkedin } from "react-icons/si";

interface RequesterProfile {
  id: string;
  companyName: string;
  logoUrl?: string;
  bio: string;
  industry: string;
  companySize?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone?: string;
}

interface RequesterProfileViewProps {
  profile: RequesterProfile;
  compact?: boolean;
}

export default function RequesterProfileView({ profile, compact = false }: RequesterProfileViewProps) {
  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-start gap-4">
          {profile.logoUrl ? (
            <img 
              src={profile.logoUrl} 
              alt={profile.companyName}
              className="w-16 h-16 rounded-lg object-cover border border-neutral-200"
              data-testid="img-requester-logo"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-neutral-100 flex items-center justify-center border border-neutral-200">
              <Building2 className="h-8 w-8 text-neutral-400" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-neutral-900 mb-1 truncate" data-testid="text-company-name">
              {profile.companyName}
            </h3>
            
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge 
                variant="outline" 
                className="text-xs"
                data-testid="tag-industry"
              >
                {profile.industry}
              </Badge>
              {profile.companySize && (
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  data-testid="tag-company-size"
                >
                  <Users className="h-3 w-3 mr-1" />
                  {profile.companySize}
                </Badge>
              )}
            </div>
            
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
      {/* Header with brand color */}
      <div className="h-32 bg-gradient-to-r from-primary-600 to-primary-700" data-testid="requester-header" />
      
      {/* Profile Content */}
      <div className="p-6">
        {/* Logo and Name */}
        <div className="flex items-start gap-4 mb-6 -mt-16">
          {profile.logoUrl ? (
            <img 
              src={profile.logoUrl} 
              alt={profile.companyName}
              className="w-24 h-24 rounded-xl object-cover border-4 border-white shadow-lg"
              data-testid="img-requester-logo"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-white border-4 border-white shadow-lg flex items-center justify-center">
              <Building2 className="h-12 w-12 text-neutral-400" />
            </div>
          )}
          
          <div className="flex-1 mt-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2" data-testid="text-company-name">
              {profile.companyName}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant="outline"
                data-testid="tag-industry"
              >
                {profile.industry}
              </Badge>
              {profile.companySize && (
                <Badge 
                  variant="outline"
                  data-testid="tag-company-size"
                >
                  <Users className="h-4 w-4 mr-1" />
                  {profile.companySize}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-neutral-700 mb-2">About</h3>
            <p className="text-neutral-600 whitespace-pre-wrap" data-testid="text-bio">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Contact Information */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-neutral-700 mb-3">Contact Information</h3>
          <div className="space-y-2 text-sm">
            <p className="text-neutral-600">
              <span className="font-medium text-neutral-900">Contact Person:</span> {profile.contactPerson}
            </p>
            <p className="text-neutral-600">
              <span className="font-medium text-neutral-900">Email:</span> {profile.contactEmail}
            </p>
            {profile.contactPhone && (
              <p className="text-neutral-600">
                <span className="font-medium text-neutral-900">Phone:</span> {profile.contactPhone}
              </p>
            )}
          </div>
        </div>

        {/* Social Links */}
        {(profile.linkedinUrl || profile.websiteUrl) && (
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
              
              {profile.websiteUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(profile.websiteUrl, '_blank')}
                  data-testid="link-website"
                >
                  <Globe className="h-4 w-4 mr-2" />
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
