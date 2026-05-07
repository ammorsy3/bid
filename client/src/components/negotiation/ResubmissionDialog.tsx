import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RotateCcw, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface ResubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorNames: string[];
  tenderTitle: string;
  tenderCompanyName: string;
  tenderId: string;
  onSubmit: (data: { message: string; comment: string; metadata: any }) => void;
  isPending: boolean;
}

export default function ResubmissionDialog({
  open, onOpenChange, vendorNames, tenderTitle, tenderCompanyName, tenderId, onSubmit, isPending
}: ResubmissionDialogProps) {
  const { t } = useI18n();
  const defaultMessage = t('tenderFlow.resubmissionDefaultMsg')
    .replace('{orgName}', tenderCompanyName)
    .replace('{tenderTitle}', tenderTitle);

  const [message, setMessage] = useState(defaultMessage);
  const [comment, setComment] = useState("");
  const [allowResubmission, setAllowResubmission] = useState(true);
  const [requestQualificationFiles, setRequestQualificationFiles] = useState(false);

  const handleSubmit = () => {
    onSubmit({
      message,
      comment,
      metadata: {
        resubmissionOptions: { allowResubmission, requestQualificationFiles },
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-[#FE3C01]" />
            {t('tenderFlow.requestResubmissionTitle')}
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
            <Label className="text-sm font-medium">{t('tenderFlow.commentLabel')}</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="mt-1"
              placeholder={t('tenderFlow.commentPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="allow-resubmission"
                checked={allowResubmission}
                onCheckedChange={(v) => setAllowResubmission(!!v)}
              />
              <Label htmlFor="allow-resubmission" className="text-sm">{t('tenderFlow.allowResubmissionLabel')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="request-qualification"
                checked={requestQualificationFiles}
                onCheckedChange={(v) => setRequestQualificationFiles(!!v)}
              />
              <Label htmlFor="request-qualification" className="text-sm">{t('tenderFlow.requestQualificationLabel')}</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t('tenderFlow.cancelBtn')}
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !message.trim()} className="bg-[#FE3C01] hover:bg-[#d54d35] text-white">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
              {t('tenderFlow.sendRequestBtn')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
