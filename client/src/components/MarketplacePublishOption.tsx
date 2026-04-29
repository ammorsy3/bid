import { useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { Store, Globe, DollarSign, Clock, AlertCircle, Calendar, FileCheck, FileText, Upload, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { ar as arLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface MarketplacePoFile {
  fileUrl: string;
  originalName: string;
}

export interface MarketplaceOptions {
  enabled: boolean;
  tenderType: string;
  documentFee: string;
  inquiryDeadline: string;
  poFiles: MarketplacePoFile[];
  confirmed: boolean;
}

interface MarketplacePublishOptionProps {
  value: MarketplaceOptions;
  onChange: (value: MarketplaceOptions) => void;
  deadline?: string;
  language?: string;
  isRtl?: boolean;
  t: (key: string) => string;
}

export function MarketplacePublishOption({
  value,
  onChange,
  deadline,
  language,
  isRtl,
  t,
}: MarketplacePublishOptionProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const update = (partial: Partial<MarketplaceOptions>) => {
    onChange({ ...value, ...partial });
  };

  const handleUploadPO = async (file: File) => {
    setIsUploading(true);
    try {
      const uploadUrlRes = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ fileSize: file.size, fileType: file.type }),
      });
      if (!uploadUrlRes.ok) throw new Error('Failed to get upload URL');
      const { uploadURL } = await uploadUrlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!uploadRes.ok) throw new Error('Upload failed');

      // Register ACL ownership and get the canonical "/objects/<entity-id>" path.
      // Skipping this step leaves the file without an ACL owner and stores a raw
      // bucket path that can break under future object-storage refactors.
      const metaRes = await fetch('/api/objects/metadata', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ fileURL: uploadURL }),
      });
      if (!metaRes.ok) throw new Error('Failed to register file metadata');
      const { objectPath } = await metaRes.json();

      onChange({
        ...value,
        poFiles: [...value.poFiles, { fileUrl: objectPath, originalName: file.name }],
      });
    } catch (err: any) {
      toast({
        title: t('marketplace.error') || 'Error',
        description: err?.message || 'Upload failed',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removePoFile = (idx: number) => {
    update({ poFiles: value.poFiles.filter((_, i) => i !== idx) });
  };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Toggle header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#E8614D]/10 flex items-center justify-center flex-shrink-0">
            <Store className="h-4 w-4 text-[#E8614D]" />
          </div>
          <div>
            <span className="text-sm font-medium text-gray-900">
              {t('marketplace.publishToMarketplace') || 'Publish to Marketplace'}
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('marketplace.createFlowDesc') || 'Also submit to the public marketplace for admin review'}
            </p>
          </div>
        </div>
        <Switch
          checked={value.enabled}
          onCheckedChange={(checked) => update({ enabled: checked, confirmed: false })}
        />
      </div>

      {/* Expanded fields when enabled */}
      {value.enabled && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Binding warning */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/60">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-900">
                  {t('marketplace.introBindingTitle') || 'This is a binding commitment'}
                </p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  {t('marketplace.introBindingDesc') || 'Marketplace tenders cannot be cancelled once published. You are required to evaluate proposals and award the tender to a participating vendor.'}
                </p>
              </div>
            </div>
          </div>

          {/* Tender Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-blue-600" />
              {t('marketplace.tenderType') || 'Tender Type'} <span className="text-red-500">*</span>
            </label>
            <Select value={value.tenderType} onValueChange={(v) => update({ tenderType: v })}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open_tender">{t('marketplace.openTender') || 'Open Tender'}</SelectItem>
                <SelectItem value="direct_purchase">{t('marketplace.directPurchase') || 'Direct Purchase'}</SelectItem>
                <SelectItem value="framework_agreement">{t('marketplace.frameworkAgreement') || 'Framework Agreement'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Document Fee */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-amber-600" />
              {t('marketplace.documentFee') || 'Document Fee'} <span className="text-xs font-normal text-gray-400">({t('marketplace.sar') || 'SAR'})</span>
            </label>
            <Input
              type="number"
              min="0"
              max="100000"
              className="h-9"
              placeholder={t('marketplace.docFeePlaceholder') || 'Leave empty for free'}
              value={value.documentFee}
              onChange={(e) => update({ documentFee: e.target.value })}
            />
          </div>

          {/* Inquiry Deadline */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#E8614D]" />
              {t('marketplace.inquiryDeadlineLabel') || 'Questions Cutoff'}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-9 justify-start text-left font-normal",
                    !value.inquiryDeadline && "text-muted-foreground"
                  )}
                >
                  <Calendar className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                  {value.inquiryDeadline
                    ? format(new Date(value.inquiryDeadline), "PPP", { locale: language === 'ar' ? arLocale : undefined })
                    : t('marketplace.selectInquiryDeadline') || 'Select a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarWidget
                  mode="single"
                  selected={value.inquiryDeadline ? new Date(value.inquiryDeadline) : undefined}
                  onSelect={(d) => update({ inquiryDeadline: d?.toISOString() || '' })}
                  disabled={(d) =>
                    d < new Date(new Date().setHours(0, 0, 0, 0)) ||
                    (deadline ? d >= new Date(deadline) : false)
                  }
                  locale={language === 'ar' ? arLocale : undefined}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* PO Upload files */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <FileCheck className="h-3.5 w-3.5 text-purple-600" />
              {t('marketplace.formPoTitle') || 'Purchase Order'}
            </label>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              {t('marketplace.formPoHelper') || 'A signed document from your company confirming payment to the awarded vendor. Only visible to you and the Bid team.'}
            </p>

            {value.poFiles.length > 0 && (
              <div className="space-y-1.5">
                {value.poFiles.map((po, idx) => (
                  <div key={`${po.fileUrl}-${idx}`} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-700 truncate">{po.originalName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePoFile(idx)}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                      aria-label={t('marketplace.remove') || 'Remove'}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? <Loader2 className={`h-4 w-4 animate-spin ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} /> : <Upload className={`h-4 w-4 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />}
              {isUploading
                ? (t('marketplace.uploading') || 'Uploading...')
                : value.poFiles.length > 0
                  ? (t('marketplace.uploadAnother') || 'Upload another')
                  : (t('marketplace.uploadPo') || 'Upload PO Document')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadPO(f);
                e.target.value = '';
              }}
              disabled={isUploading}
            />
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-[#E8614D]/30 transition-colors">
            <input
              type="checkbox"
              checked={value.confirmed}
              onChange={(e) => update({ confirmed: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#E8614D] focus:ring-[#E8614D]"
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              {t('marketplace.formConfirmation') || 'I understand this tender is binding. Once published, it cannot be cancelled and I must award it to a vendor.'}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
