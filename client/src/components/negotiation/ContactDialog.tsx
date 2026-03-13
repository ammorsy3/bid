import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Globe, Linkedin, Twitter, MapPin, Loader2, Building } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  vendorName: string;
}

export default function ContactDialog({
  open, onOpenChange, offerId, vendorName
}: ContactDialogProps) {
  const { t } = useI18n();

  const { data: contact, isLoading } = useQuery<{
    companyName: string;
    displayName: string;
    logoUrl: string | null;
    city: string | null;
    email: string | null;
    phoneNumber: string | null;
    socialLinks: { website?: string; linkedin?: string; twitter?: string } | null;
  }>({
    queryKey: ['/api/offers', offerId, 'contact-info'],
    queryFn: async () => {
      const res = await fetch(`/api/offers/${offerId}/contact-info`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) throw new Error('Failed to fetch contact info');
      return res.json();
    },
    enabled: open && !!offerId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-[#E25E45]" />
            {t('tenderFlow.contactInfoTitle')}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : contact ? (
          <div className="space-y-4 mt-2">
            {/* Vendor header */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              {contact.logoUrl ? (
                <img src={contact.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-gray-200" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#E25E45] to-[#FF8A6B] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{(contact.displayName || vendorName).slice(0, 2).toUpperCase()}</span>
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-gray-900">{contact.displayName}</p>
                <p className="text-xs text-gray-500">{contact.companyName}</p>
              </div>
            </div>

            {/* Contact details */}
            <div className="space-y-3">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-[#E25E45] transition-colors">
                  <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>{contact.email}</span>
                </a>
              )}

              {contact.phoneNumber && (
                <a href={`tel:${contact.phoneNumber}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-[#E25E45] transition-colors">
                  <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>{contact.phoneNumber}</span>
                </a>
              )}

              {contact.city && (
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>{contact.city}</span>
                </div>
              )}

              {contact.socialLinks?.website && (
                <a href={contact.socialLinks.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-gray-700 hover:text-[#E25E45] transition-colors">
                  <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>{contact.socialLinks.website}</span>
                </a>
              )}

              {contact.socialLinks?.linkedin && (
                <a href={contact.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-gray-700 hover:text-[#E25E45] transition-colors">
                  <Linkedin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>LinkedIn</span>
                </a>
              )}

              {contact.socialLinks?.twitter && (
                <a href={contact.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-gray-700 hover:text-[#E25E45] transition-colors">
                  <Twitter className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>Twitter</span>
                </a>
              )}

              {!contact.email && !contact.phoneNumber && !contact.city && !contact.socialLinks && (
                <p className="text-sm text-gray-400 text-center py-4">{t('tenderFlow.noContactInfo')}</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('tenderFlow.closeDialogBtn')}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">{t('tenderFlow.noContactInfo')}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
