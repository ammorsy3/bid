import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { Store, Globe, DollarSign, Clock, AlertCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ar as arLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface MarketplaceOptions {
  enabled: boolean;
  tenderType: string;
  documentFee: string;
  inquiryDeadline: string;
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
  const update = (partial: Partial<MarketplaceOptions>) => {
    onChange({ ...value, ...partial });
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
