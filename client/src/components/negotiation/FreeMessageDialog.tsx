import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface FreeMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorNames: string[];
  onSubmit: (data: { message: string; comment: string }) => void;
  isPending: boolean;
}

export default function FreeMessageDialog({
  open, onOpenChange, vendorNames, onSubmit, isPending
}: FreeMessageDialogProps) {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    onSubmit({ message, comment });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#FE3C01]" />
            {t('tenderFlow.sendMessageTitle')}
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
              placeholder={t('tenderFlow.freeMessagePlaceholder')}
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
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
              {t('tenderFlow.sendMessageBtn')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
