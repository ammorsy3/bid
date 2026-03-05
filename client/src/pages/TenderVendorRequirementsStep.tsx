import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Shield, Sparkles, Plus, X, CheckCircle2 } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";

interface VendorRequirement {
  id: string;
  text: string;
  type: 'mandatory' | 'preferred';
}

interface PresetRequirement {
  id: string;
  text: string;
  aiSuggested: boolean;
}

const PRESET_REQUIREMENTS: PresetRequirement[] = [
  { id: 'legal_registration', text: 'Be legally registered in Saudi Arabia', aiSuggested: true },
  { id: 'cr_certificate', text: 'Valid Commercial Registration (CR) certificate', aiSuggested: true },
  { id: 'business_license', text: 'Valid business license', aiSuggested: true },
  { id: 'zakat_certificate', text: 'Valid Zakat, Tax, and Customs Authority certificate', aiSuggested: true },
  { id: 'gosi_certificate', text: 'Valid GOSI (Social Insurance) certificate', aiSuggested: true },
  { id: 'no_legal_disputes', text: 'No ongoing legal disputes affecting project execution', aiSuggested: true },
  { id: 'regulatory_compliance', text: 'Must comply with all local regulatory requirements', aiSuggested: false },
  { id: 'nda', text: 'Signed Non-Disclosure Agreement (NDA) required', aiSuggested: false },
  { id: 'data_protection', text: 'Compliance with Saudi data protection and cybersecurity regulations', aiSuggested: true },
  { id: 'local_content', text: 'Commitment to local content regulations (if applicable)', aiSuggested: true },
];

export default function TenderVendorRequirementsStep() {
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<VendorRequirement[]>([]);
  const [customText, setCustomText] = useState('');

  const draft = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tenderDraft") || "{}");
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    if (draft.vendorRequirements && Array.isArray(draft.vendorRequirements)) {
      setSelected(draft.vendorRequirements);
    }
  }, []);

  const isSelected = (id: string) => selected.some(r => r.id === id);
  const getType = (id: string): 'mandatory' | 'preferred' => {
    return selected.find(r => r.id === id)?.type || 'mandatory';
  };

  const toggle = (preset: PresetRequirement) => {
    if (isSelected(preset.id)) {
      setSelected(prev => prev.filter(r => r.id !== preset.id));
    } else {
      setSelected(prev => [...prev, { id: preset.id, text: preset.text, type: 'mandatory' }]);
    }
  };

  const setType = (id: string, type: 'mandatory' | 'preferred') => {
    setSelected(prev => prev.map(r => r.id === id ? { ...r, type } : r));
  };

  const addCustom = () => {
    const text = customText.trim();
    if (!text) return;
    const id = `custom_${Date.now()}`;
    setSelected(prev => [...prev, { id, text, type: 'mandatory' }]);
    setCustomText('');
  };

  const removeCustom = (id: string) => {
    setSelected(prev => prev.filter(r => r.id !== id));
  };

  const customRequirements = selected.filter(r => r.id.startsWith('custom_'));

  const handleNext = () => {
    const updated = { ...draft, vendorRequirements: selected.length > 0 ? selected : undefined };
    localStorage.setItem("tenderDraft", JSON.stringify(updated));
    navigate("/tenders/new/brief");
  };

  const handleBack = () => {
    navigate("/tenders/new/evaluation-criteria");
  };

  const handleSkip = () => {
    const updated = { ...draft, vendorRequirements: undefined };
    localStorage.setItem("tenderDraft", JSON.stringify(updated));
    navigate("/tenders/new/brief");
  };

  const mandatoryCount = selected.filter(r => r.type === 'mandatory').length;
  const preferredCount = selected.filter(r => r.type === 'preferred').length;

  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <img
            src={logoPath}
            alt="Bid"
            className="h-16 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/dashboard")}
          />
          <Button variant="outline" onClick={handleBack} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-8">

          {/* Left: Title + explanation */}
          <div>
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-500">6 / 7</div>
              <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                Submission Requirements
              </h1>
              <p className="text-gray-600 text-lg">
                Define which vendors are eligible to respond. These requirements will be shown to vendors on the published RFP page.
              </p>

              {selected.length > 0 && (
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  {mandatoryCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-sm font-medium text-red-700">{mandatoryCount} mandatory</span>
                    </div>
                  )}
                  {preferredCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-sm font-medium text-amber-700">{preferredCount} preferred</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Card */}
          <div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

              <div className="p-6 space-y-5">

                {/* AI Suggestions banner */}
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                  <Sparkles className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700 font-medium">
                    AI-suggested requirements based on Saudi procurement standards
                  </p>
                </div>

                {/* Preset list */}
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {PRESET_REQUIREMENTS.map((preset) => {
                    const checked = isSelected(preset.id);
                    const type = getType(preset.id);
                    return (
                      <div key={preset.id} className={`rounded-lg border transition-all ${checked ? 'border-[#E25E45]/30 bg-[#E25E45]/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <div className="flex items-start gap-3 p-3">
                          <button
                            type="button"
                            onClick={() => toggle(preset)}
                            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${checked ? 'border-[#E25E45] bg-[#E25E45]' : 'border-gray-300 bg-white'}`}
                            data-testid={`checkbox-${preset.id}`}
                          >
                            {checked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm leading-snug ${checked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                                {preset.text}
                              </p>
                              {preset.aiSuggested && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-200 flex-shrink-0">AI</Badge>
                              )}
                            </div>

                            {/* Mandatory / Preferred toggle — only when checked */}
                            {checked && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <button
                                  type="button"
                                  onClick={() => setType(preset.id, 'mandatory')}
                                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${type === 'mandatory' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                  Mandatory
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setType(preset.id, 'preferred')}
                                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${type === 'preferred' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                  Preferred
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
                <div className="border-t border-gray-200" />

                {/* Custom requirements */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add custom requirement</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                      placeholder="e.g. Must have ISO 9001 certification"
                      className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
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
                        <div key={req.id} className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 font-medium">{req.text}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <button
                                type="button"
                                onClick={() => setType(req.id, 'mandatory')}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${req.type === 'mandatory' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                              >
                                Mandatory
                              </button>
                              <button
                                type="button"
                                onClick={() => setType(req.id, 'preferred')}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${req.type === 'preferred' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                              >
                                Preferred
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustom(req.id)}
                            className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSkip}
                    className="text-gray-400 hover:text-gray-600"
                    data-testid="button-skip"
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-[#E25E45] hover:bg-[#d54d35]"
                    data-testid="button-next"
                  >
                    {selected.length > 0 ? `Continue with ${selected.length} requirement${selected.length !== 1 ? 's' : ''}` : 'Continue'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>

              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
