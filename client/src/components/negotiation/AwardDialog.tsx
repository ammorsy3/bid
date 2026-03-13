import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Award, Loader2, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface AwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorName: string;
  otherVendorNames: string[];
  tenderTitle: string;
  tenderCompanyName: string;
  tenderId: string;
  onSubmit: (data: { message: string; comment: string; metadata: any }) => void;
  isPending: boolean;
}

export default function AwardDialog({
  open, onOpenChange, vendorName, otherVendorNames, tenderTitle, tenderCompanyName, tenderId, onSubmit, isPending
}: AwardDialogProps) {
  const { t } = useI18n();
  const defaultAwardMessage = t('tenderFlow.awardDefaultMsg')
    .replace('{orgName}', tenderCompanyName)
    .replace('{tenderTitle}', tenderTitle)
    .replace('{vendorName}', vendorName);
  const defaultRejectionMessage = t('tenderFlow.rejectionDefaultMsg')
    .replace('{orgName}', tenderCompanyName)
    .replace('{tenderTitle}', tenderTitle);

  const [awardMessage, setAwardMessage] = useState(defaultAwardMessage);
  const [rejectionMessage, setRejectionMessage] = useState(defaultRejectionMessage);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    onSubmit({
      message: awardMessage,
      comment,
      metadata: {
        rejectionMessage,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-600" />
            {t('tenderFlow.awardDialogTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="text-xs text-gray-500">
            {t('tenderFlow.awardingTo')}: <span className="font-semibold text-emerald-700">{vendorName}</span>
          </div>

          <div>
            <Label className="text-sm font-medium">{t('tenderFlow.awardMessageLabel')}</Label>
            <Textarea
              value={awardMessage}
              onChange={(e) => setAwardMessage(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          {otherVendorNames.length > 0 && (
            <>
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-800">
                  {t('tenderFlow.rejectionWarning')}
                </AlertDescription>
              </Alert>

              <div className="text-xs text-gray-500">
                {t('tenderFlow.vendorsToReject')}: <span className="font-medium text-gray-700">{otherVendorNames.join(", ")}</span>
              </div>

              <div>
                <Label className="text-sm font-medium">{t('tenderFlow.rejectionMessageLabel')}</Label>
                <Textarea
                  value={rejectionMessage}
                  onChange={(e) => setRejectionMessage(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </>
          )}

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
            <Button onClick={handleSubmit} disabled={isPending || !awardMessage.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Award className="h-4 w-4 mr-1" />}
              {t('tenderFlow.confirmAwardBtn')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
