import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Building2, Users, Globe, Mail, Phone, User } from "lucide-react";
import { SiLinkedin } from "react-icons/si";

interface RequesterProfile {
  id: string;
  companyName: string;
  logoUrl?: string | null;
  bio: string;
  industry: string;
  companySize?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  contactPerson: string;
  contactEmail: string;
  contactPhone?: string | null;
}

interface RequesterProfileViewProps {
  profile: RequesterProfile;
  compact?: boolean;
}

export default function RequesterProfileView({ profile, compact = false }: RequesterProfileViewProps) {
  if (compact) {
    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          {profile.logoUrl ? (
            <img 
              src={profile.logoUrl} 
              alt={profile.companyName}
              className="w-16 h-16 rounded-lg object-contain bg-white border border-neutral-200 p-1.5 flex-shrink-0"
              data-testid="img-requester-logo"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-neutral-50 flex items-center justify-center border border-neutral-200 flex-shrink-0">
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
                className="text-xs bg-primary-50 border-primary-200 text-primary-700"
                data-testid="tag-industry"
              >
                {profile.industry}
              </Badge>
              {profile.companySize && (
                <Badge 
                  variant="outline" 
                  className="text-xs bg-neutral-50 border-neutral-200 text-neutral-700"
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
    <Card className="overflow-hidden shadow-lg">
      {/* Premium Hero Header */}
      <div className="relative">
        <div 
          className="h-48 md:h-64 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700"
          data-testid="requester-header"
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 w-32 h-32 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
          </div>
        </div>
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
                alt={profile.companyName}
                className="w-28 h-28 md:w-32 md:h-32 rounded-2xl object-contain bg-white border-4 border-white shadow-2xl p-3"
                data-testid="img-requester-logo"
              />
            ) : (
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-white border-4 border-white shadow-2xl flex items-center justify-center">
                <Building2 className="h-14 w-14 md:h-16 md:w-16 text-neutral-400" />
              </div>
            )}
          </div>
          
          {/* Name and Tags */}
          <div className="flex-1 md:mb-4">
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-3" data-testid="text-company-name">
              {profile.companyName}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant="outline"
                className="bg-primary-50 border-primary-200 text-primary-700 px-3 py-1"
                data-testid="tag-industry"
              >
                {profile.industry}
              </Badge>
              {profile.companySize && (
                <Badge 
                  variant="outline"
                  className="bg-neutral-50 border-neutral-200 text-neutral-700 px-3 py-1"
                  data-testid="tag-company-size"
                >
                  <Users className="h-4 w-4 mr-1.5" />
                  {profile.companySize}
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

        {/* Contact Information */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4 uppercase tracking-wide">Contact Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 font-medium">Contact Person</p>
                <p className="text-neutral-900 font-medium">{profile.contactPerson}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Mail className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 font-medium">Email</p>
                <p className="text-neutral-900 font-medium">{profile.contactEmail}</p>
              </div>
            </div>
            
            {profile.contactPhone && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500 font-medium">Phone</p>
                  <p className="text-neutral-900 font-medium">{profile.contactPhone}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Social Links - Icon based */}
        {(profile.linkedinUrl || profile.websiteUrl) && (
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-3 uppercase tracking-wide">Connect</h3>
            <div className="flex gap-2 flex-wrap">
              {profile.linkedinUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-primary-50 hover:border-primary-600 hover:text-primary-600 transition-all"
                  onClick={() => window.open(profile.linkedinUrl!, '_blank')}
                  data-testid="link-linkedin"
                  title="LinkedIn"
                >
                  <SiLinkedin className="h-5 w-5" />
                </Button>
              )}
              
              {profile.websiteUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-primary-50 hover:border-primary-600 hover:text-primary-600 transition-all"
                  onClick={() => window.open(profile.websiteUrl!, '_blank')}
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
