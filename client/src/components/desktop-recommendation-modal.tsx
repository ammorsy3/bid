import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Monitor } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

const JUST_SIGNED_IN_KEY = "just_signed_in";

export function markJustSignedIn() {
  sessionStorage.setItem(JUST_SIGNED_IN_KEY, "1");
}

export function DesktopRecommendationModal() {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const { toast } = useToast();
  const [justSignedIn, setJustSignedIn] = useState(false);
  const [open, setOpen] = useState(false);

  // Consume the flag once on mount, independent of isMobile — useIsMobile's
  // value flips from its false initial state to the real one in a later
  // effect pass, so gating the sessionStorage read on it would race and
  // clear the flag before we know whether to actually open.
  useEffect(() => {
    if (sessionStorage.getItem(JUST_SIGNED_IN_KEY) === "1") {
      sessionStorage.removeItem(JUST_SIGNED_IN_KEY);
      setJustSignedIn(true);
    }
  }, []);

  useEffect(() => {
    if (justSignedIn && isMobile) {
      setOpen(true);
    }
  }, [justSignedIn, isMobile]);

  if (!isMobile) return null;

  const handleOpenOnDesktop = () => {
    navigator.clipboard?.writeText(window.location.origin).catch(() => {});
    toast({ description: t("desktopRecommendation.linkCopied") });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FE3C01]/10">
          <Monitor className="h-6 w-6 text-[#FE3C01]" strokeWidth={1.75} />
        </div>
        <DialogTitle className="text-center">{t("desktopRecommendation.title")}</DialogTitle>
        <DialogDescription className="text-center">{t("desktopRecommendation.body")}</DialogDescription>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={() => setOpen(false)} className="w-full">
            {t("desktopRecommendation.continueOnMobile")}
          </Button>
          <Button onClick={handleOpenOnDesktop} variant="ghost" className="w-full">
            {t("desktopRecommendation.openOnDesktop")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
