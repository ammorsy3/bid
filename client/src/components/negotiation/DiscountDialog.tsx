import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Percent, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface DiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorNames: string[];
  tenderTitle: string;
  tenderCompanyName: string;
  tenderId: string;
  onSubmit: (data: { message: string; comment: string; metadata: any }) => void;
  isPending: boolean;
}

export default function DiscountDialog({
  open, onOpenChange, vendorNames, tenderTitle, tenderCompanyName, tenderId, onSubmit, isPending
}: DiscountDialogProps) {
  const { t } = useI18n();
  const defaultMessage = t('tenderFlow.discountDefaultMsg')
    .replace('{orgName}', tenderCompanyName)
    .replace('{tenderTitle}', tenderTitle);

  const [message, setMessage] = useState(defaultMessage);
  const [comment, setComment] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState<string>("");

  const handleSubmit = () => {
    onSubmit({
      message,
      comment,
      metadata: {
        discountPercentage: discountPercentage ? Number(discountPercentage) : undefined,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-[#FE3C01]" />
            {t('tenderFlow.requestDiscountTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="text-xs text-muted-foreground">
            {t('tenderFlow.sendingTo')}: <span className="font-medium text-muted-foreground">{vendorNames.join(", ")}</span>
          </div>

          <div>
            <Label className="text-sm font-medium">{t('tenderFlow.messageLabel')}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">{t('tenderFlow.discountPercentLabel')}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(e.target.value)}
              placeholder={t('tenderFlow.discountPercentPlaceholder')}
              className="mt-1 w-32"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">{t('tenderFlow.commentLabel')}</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="mt-1"
              placeholder={t('tenderFlow.commentPlaceholder')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t('tenderFlow.cancelBtn')}
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !message.trim()} className="bg-[#FE3C01] hover:bg-[#d54d35] text-white">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Percent className="h-4 w-4 mr-1" />}
              {t('tenderFlow.sendRequestBtn')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
