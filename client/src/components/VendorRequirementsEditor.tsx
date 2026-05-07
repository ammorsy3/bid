import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, X, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export interface VendorRequirement {
  id: string;
  text: string;
  type: "mandatory" | "preferred";
}

interface PresetRequirement {
  id: string;
  text: string;
  aiSuggested: boolean;
}

interface VendorRequirementsEditorProps {
  value: VendorRequirement[];
  onChange: (next: VendorRequirement[]) => void;
  isRtl?: boolean;
  /** Hides the AI-suggested badges + banner for inline contexts. */
  compact?: boolean;
}

/**
 * Controlled editor for `tenders.vendor_requirements`. Renders the canonical
 * 10-preset checklist plus custom-text input. Used by the wizard step, the
 * Brief screen, and the post-publish edit page so vendor requirements stay
 * consistent across every tender entry point — no localStorage / form
 * persistence side effects (parent owns those).
 */
export default function VendorRequirementsEditor({
  value,
  onChange,
  isRtl: _isRtl,
  compact = false,
}: VendorRequirementsEditorProps) {
  const { t } = useI18n();
  const [customText, setCustomText] = useState("");

  const PRESET_REQUIREMENTS: PresetRequirement[] = [
    { id: "legal_registration", text: t("tenderSteps.reqLegalRegistration"), aiSuggested: true },
    { id: "cr_certificate", text: t("tenderSteps.reqCrCertificate"), aiSuggested: true },
    { id: "business_license", text: t("tenderSteps.reqBusinessLicense"), aiSuggested: true },
    { id: "zakat_certificate", text: t("tenderSteps.reqZakatCertificate"), aiSuggested: true },
    { id: "gosi_certificate", text: t("tenderSteps.reqGosiCertificate"), aiSuggested: true },
    { id: "no_legal_disputes", text: t("tenderSteps.reqNoLegalDisputes"), aiSuggested: true },
    { id: "regulatory_compliance", text: t("tenderSteps.reqRegulatoryCompliance"), aiSuggested: false },
    { id: "nda", text: t("tenderSteps.reqNda"), aiSuggested: false },
    { id: "data_protection", text: t("tenderSteps.reqDataProtection"), aiSuggested: true },
    { id: "local_content", text: t("tenderSteps.reqLocalContent"), aiSuggested: true },
  ];

  const isSelected = (id: string) => value.some((r) => r.id === id);
  const getType = (id: string): "mandatory" | "preferred" =>
    value.find((r) => r.id === id)?.type || "mandatory";

  const toggle = (preset: PresetRequirement) => {
    if (isSelected(preset.id)) {
      onChange(value.filter((r) => r.id !== preset.id));
    } else {
      onChange([...value, { id: preset.id, text: preset.text, type: "mandatory" }]);
    }
  };

  const setType = (id: string, type: "mandatory" | "preferred") => {
    onChange(value.map((r) => (r.id === id ? { ...r, type } : r)));
  };

  const addCustom = () => {
    const text = customText.trim();
    if (!text) return;
    const id = `custom_${Date.now()}`;
    onChange([...value, { id, text, type: "mandatory" }]);
    setCustomText("");
  };

  const removeCustom = (id: string) => {
    onChange(value.filter((r) => r.id !== id));
  };

  const customRequirements = value.filter((r) => r.id.startsWith("custom_"));

  return (
    <div className="space-y-5">
      {/* AI Suggestions banner (hidden in compact mode) */}
      {!compact && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bid-orange)]/5 border border-blue-100 rounded-lg">
          <Sparkles className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <p className="text-xs text-[var(--bid-orange)] font-medium">
            {t("tenderSteps.aiSuggestedBanner")}
          </p>
        </div>
      )}

      {/* Preset list */}
      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {PRESET_REQUIREMENTS.map((preset) => {
          const checked = isSelected(preset.id);
          const type = getType(preset.id);
          return (
            <div
              key={preset.id}
              className={`rounded-lg border transition-all ${
                checked
                  ? "border-[#FE3C01]/30 bg-[#FE3C01]/5"
                  : "border-border bg-card hover:border-border"
              }`}
            >
              <div className="flex items-start gap-3 p-3">
                <button
                  type="button"
                  onClick={() => toggle(preset)}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${
                    checked
                      ? "border-[#FE3C01] bg-[#FE3C01]"
                      : "border-border bg-card"
                  }`}
                  data-testid={`checkbox-${preset.id}`}
                >
                  {checked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm leading-snug ${
                        checked ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {preset.text}
                    </p>
                    {!compact && preset.aiSuggested && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-[var(--bid-orange)]/5 text-[var(--bid-orange)] border-[var(--bid-orange)]/20 flex-shrink-0">
                        AI
                      </Badge>
                    )}
                  </div>

                  {/* Mandatory / Preferred toggle — only when checked */}
                  {checked && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setType(preset.id, "mandatory")}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                          type === "mandatory"
                            ? "bg-red-500 text-white"
                            : "bg-muted text-muted-foreground hover:bg-gray-200"
                        }`}
                      >
                        {t("tenderSteps.mandatory")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setType(preset.id, "preferred")}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                          type === "preferred"
                            ? "bg-amber-500 text-white"
                            : "bg-muted text-muted-foreground hover:bg-gray-200"
                        }`}
                      >
                        {t("tenderSteps.preferred")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Custom requirements */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("tenderSteps.addCustomRequirement")}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder={t("tenderSteps.customReqPlaceholder")}
            className="flex-1 text-sm px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FE3C01] focus:border-transparent"
            data-testid="input-custom-requirement"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCustom}
            disabled={!customText.trim()}
            className="flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Custom items list */}
        {customRequirements.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {customRequirements.map((req) => (
              <div
                key={req.id}
                className="flex items-start gap-2 p-2.5 bg-muted rounded-lg border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium">{req.text}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setType(req.id, "mandatory")}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                        req.type === "mandatory"
                          ? "bg-red-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-gray-200"
                      }`}
                    >
                      {t("tenderSteps.mandatory")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setType(req.id, "preferred")}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                        req.type === "preferred"
                          ? "bg-amber-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-gray-200"
                      }`}
                    >
                      {t("tenderSteps.preferred")}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeCustom(req.id)}
                  className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-muted-foreground transition-colors mt-0.5"
                  aria-label="Remove requirement"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
