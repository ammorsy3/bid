import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check, Scale, ChevronDown, Briefcase, Clock, Plus, X, Shield } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { ENTERPRISE_CRITERIA_CATEGORIES, CRITERIA_TRANSLATIONS_AR } from "@/lib/evaluation-criteria-data";
import { useI18n } from "@/lib/i18n";

// ── Evaluation criteria types ────────────────────────────────────────────────

interface SelectedRequirement {
  categoryId: string;
  requirementId: string;
  value: string | boolean;
}

interface CategoryWeight {
  categoryId: string;
  weight: number;
}

interface CustomCriterion {
  id: string;
  text: string;
  weight: number;
}

// ── Submission requirements types ────────────────────────────────────────────

interface VendorRequirement {
  id: string;
  text: string;
  type: 'mandatory' | 'preferred';
}

interface PresetRequirement {
  id: string;
  text: string;
}

const PRESET_REQUIREMENT_IDS = [
  'legal_registration',
  'cr_certificate',
  'business_license',
  'zakat_certificate',
  'gosi_certificate',
  'no_legal_disputes',
  'reg_compliance',
  'nda',
  'data_protection',
  'local_content',
] as const;

const PRESET_KEY_MAP: Record<string, string> = {
  legal_registration: 'presetReqLegalRegistration',
  cr_certificate: 'presetReqCrCertificate',
  business_license: 'presetReqBusinessLicense',
  zakat_certificate: 'presetReqZakatCertificate',
  gosi_certificate: 'presetReqGosiCertificate',
  no_legal_disputes: 'presetReqNoLegalDisputes',
  reg_compliance: 'presetReqRegCompliance',
  nda: 'presetReqNda',
  data_protection: 'presetReqDataProtection',
  local_content: 'presetReqLocalContent',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function TenderEvaluationCriteriaStep() {
  const [, navigate] = useLocation();
  const { t, language } = useI18n();
  const isAr = language === 'ar';
  const tr = (id: string, field: 'name' | 'label' | 'description') =>
    isAr ? (CRITERIA_TRANSLATIONS_AR[id]?.[field] ?? undefined) : undefined;
  const trOpt = (reqId: string, value: string, fallback: string) =>
    isAr ? (CRITERIA_TRANSLATIONS_AR[reqId]?.options?.[value] ?? fallback) : fallback;

  const PRESET_REQUIREMENTS: PresetRequirement[] = PRESET_REQUIREMENT_IDS.map(id => ({
    id,
    text: t(`tenderFlow.${PRESET_KEY_MAP[id]}` as any),
  }));

  // Evaluation criteria state
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["experience"]);
  const [selectedRequirements, setSelectedRequirements] = useState<SelectedRequirement[]>([]);
  const [categoryWeights, setCategoryWeights] = useState<CategoryWeight[]>(
    ENTERPRISE_CRITERIA_CATEGORIES.map(cat => ({ categoryId: cat.id, weight: cat.defaultWeight }))
  );
  const [customCriteria, setCustomCriteria] = useState<CustomCriterion[]>([]);
  const [newCriterionText, setNewCriterionText] = useState("");
  const [newCriterionWeight, setNewCriterionWeight] = useState(5);

  // Submission requirements state
  const [vendorRequirements, setVendorRequirements] = useState<VendorRequirement[]>([]);
  const [customReqText, setCustomReqText] = useState('');

  const draft = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tenderDraft") || "{}");
    } catch {
      return {};
    }
  }, []);

  // Pre-fill from draft
  useEffect(() => {
    if (draft.evaluationCriteria) {
      const criteria = draft.evaluationCriteria;
      if (criteria.requirements) setSelectedRequirements(criteria.requirements);
      if (criteria.weights) setCategoryWeights(criteria.weights);
      if (criteria.customCriteria) setCustomCriteria(criteria.customCriteria);
    }
    if (draft.vendorRequirements && Array.isArray(draft.vendorRequirements)) {
      setVendorRequirements(draft.vendorRequirements);
    }
  }, []);

  // ── Evaluation criteria handlers ───────────────────────────────────────────

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  };

  const handleRequirementChange = (categoryId: string, requirementId: string, value: string | boolean) => {
    setSelectedRequirements(prev => {
      const existing = prev.findIndex(r => r.categoryId === categoryId && r.requirementId === requirementId);
      if (existing >= 0) {
        if (value === false || value === "") return prev.filter((_, i) => i !== existing);
        const updated = [...prev];
        updated[existing] = { categoryId, requirementId, value };
        return updated;
      } else if (value !== false && value !== "") {
        return [...prev, { categoryId, requirementId, value }];
      }
      return prev;
    });
  };

  const getRequirementValue = (categoryId: string, requirementId: string): string | boolean => {
    const req = selectedRequirements.find(r => r.categoryId === categoryId && r.requirementId === requirementId);
    return req?.value ?? false;
  };

  const handleWeightChange = (categoryId: string, weight: number) => {
    setCategoryWeights(prev => prev.map(cw => cw.categoryId === categoryId ? { ...cw, weight } : cw));
  };

  const addCustomCriterion = () => {
    if (newCriterionText.trim()) {
      setCustomCriteria(prev => [
        ...prev,
        { id: `custom-${Date.now()}`, text: newCriterionText.trim(), weight: newCriterionWeight }
      ]);
      setNewCriterionText("");
      setNewCriterionWeight(5);
    }
  };

  const removeCustomCriterion = (id: string) => setCustomCriteria(prev => prev.filter(c => c.id !== id));

  const updateCustomCriterionWeight = (id: string, weight: number) => {
    setCustomCriteria(prev => prev.map(c => c.id === id ? { ...c, weight } : c));
  };

  const customCriteriaWeight = customCriteria.reduce((sum, c) => sum + c.weight, 0);
  const totalWeight = categoryWeights.reduce((sum, cw) => sum + cw.weight, 0) + customCriteriaWeight;
  const isWeightValid = totalWeight === 100;
  const hasEvalSelections = selectedRequirements.length > 0;

  // ── Submission requirements handlers ──────────────────────────────────────

  const isReqSelected = (id: string) => vendorRequirements.some(r => r.id === id);
  const getReqType = (id: string): 'mandatory' | 'preferred' =>
    vendorRequirements.find(r => r.id === id)?.type || 'mandatory';

  const toggleReq = (preset: PresetRequirement) => {
    if (isReqSelected(preset.id)) {
      setVendorRequirements(prev => prev.filter(r => r.id !== preset.id));
    } else {
      setVendorRequirements(prev => [...prev, { id: preset.id, text: preset.text, type: 'mandatory' }]);
    }
  };

  const setReqType = (id: string, type: 'mandatory' | 'preferred') => {
    setVendorRequirements(prev => prev.map(r => r.id === id ? { ...r, type } : r));
  };

  const addCustomReq = () => {
    const text = customReqText.trim();
    if (!text) return;
    setVendorRequirements(prev => [...prev, { id: `custom_${Date.now()}`, text, type: 'mandatory' }]);
    setCustomReqText('');
  };

  const removeCustomReq = (id: string) => setVendorRequirements(prev => prev.filter(r => r.id !== id));

  const customReqs = vendorRequirements.filter(r => r.id.startsWith('custom_'));
  const mandatoryCount = vendorRequirements.filter(r => r.type === 'mandatory').length;
  const preferredCount = vendorRequirements.filter(r => r.type === 'preferred').length;

  // ── Navigation ─────────────────────────────────────────────────────────────

  const handleContinue = (skip: boolean = false) => {
    const currentDraft = JSON.parse(localStorage.getItem("tenderDraft") || "{}");
    const updatedDraft = {
      ...currentDraft,
      evaluationCriteria: skip ? undefined : {
        requirements: selectedRequirements,
        weights: categoryWeights,
        customCriteria,
      },
      vendorRequirements: vendorRequirements.length > 0 ? vendorRequirements : undefined,
    };
    localStorage.setItem("tenderDraft", JSON.stringify(updatedDraft));
    navigate("/tenders/new/brief");
  };

  const handleBack = () => navigate("/tenders/new/submission-process");

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
          <Button
            onClick={handleBack}
            className="group relative overflow-hidden"
            data-testid="button-back"
          >
            <span className="w-20 translate-x-2 transition-opacity duration-500 group-hover:opacity-0">
              {t('tenderFlow.back')}
            </span>
            <i className="absolute inset-0 z-10 grid w-1/4 place-items-center bg-primary-foreground/15 transition-all duration-500 group-hover:w-full">
              <ArrowLeft className="opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
            </i>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-8">

          {/* Left: Titles + descriptions */}
          <div className="space-y-10">

            {/* Evaluation section label */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-500">{t('tenderFlow.step5Label')}</div>
              <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                {t('tenderFlow.evaluationCriteria')}
              </h1>
              <p className="text-gray-600 text-lg">
                {t('tenderFlow.step5Desc')}
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Submission requirements label */}
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-gray-900 leading-tight">
                {t('tenderFlow.submissionRequirements')}
              </h2>
              <p className="text-gray-600">
                {t('tenderFlow.submissionReqDesc')}
              </p>
              {vendorRequirements.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {mandatoryCount > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-sm font-medium text-red-700">{mandatoryCount} {t('tenderFlow.mandatoryLabel').toLowerCase()}</span>
                    </div>
                  )}
                  {preferredCount > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="text-sm font-medium text-amber-700">{preferredCount} {t('tenderFlow.preferredLabel').toLowerCase()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Two stacked cards */}
          <div className="space-y-6">

            {/* ── Card 1: Evaluation Criteria ─────────────────────────────── */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

              <div className="p-6 space-y-6">

                {/* Weight ring */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-200" />
                      <circle
                        cx="32" cy="32" r="28"
                        stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round"
                        className={`transition-all duration-500 ease-out ${totalWeight === 100 ? "text-green-500" : totalWeight > 100 ? "text-red-500" : "text-amber-500"}`}
                        style={{ strokeDasharray: `${Math.min(totalWeight, 100) * 1.76} 176` }}
                      />
                    </svg>
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${totalWeight === 100 ? "scale-105" : "scale-100"}`}>
                      <span className={`text-sm font-bold transition-colors duration-300 ${totalWeight === 100 ? "text-green-600" : totalWeight > 100 ? "text-red-600" : "text-amber-600"}`}>
                        {totalWeight}%
                      </span>
                    </div>
                    {totalWeight === 100 && <div className="absolute inset-0 rounded-full animate-ping bg-green-400/20" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{totalWeight === 100 ? t('tenderFlow.perfectBalance') : t('tenderFlow.weightDistribution')}</span>
                      {totalWeight === 100 && <Check className="h-4 w-4 text-green-500" />}
                    </div>
                    <p className={`text-sm mt-0.5 transition-colors duration-300 ${totalWeight === 100 ? "text-green-600" : totalWeight > 100 ? "text-red-500" : "text-amber-600"}`}>
                      {totalWeight === 100 ? t('tenderFlow.weightsCorrect') : totalWeight > 100 ? `${t('tenderFlow.removeWeight')} ${totalWeight - 100}% ${t('tenderFlow.toBalance')}` : `${t('tenderFlow.addWeight')} ${100 - totalWeight}% ${t('tenderFlow.moreWeight')}`}
                    </p>
                  </div>
                </div>

                {/* Category accordions */}
                {ENTERPRISE_CRITERIA_CATEGORIES.map((category) => {
                  const isExpanded = expandedCategories.includes(category.id);
                  const currentWeight = categoryWeights.find(cw => cw.categoryId === category.id)?.weight || 0;
                  const categoryReqs = selectedRequirements.filter(r => r.categoryId === category.id);
                  const hasCategorySelections = categoryReqs.length > 0;

                  return (
                    <div key={category.id} className={`border rounded-lg overflow-hidden transition-all ${hasCategorySelections ? "border-[#E25E45]/50 bg-[#E25E45]/5" : "border-gray-200"}`}>
                      <button
                        type="button"
                        onClick={() => toggleCategory(category.id)}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${hasCategorySelections ? "bg-[#E25E45]/10 text-[#E25E45]" : "bg-gray-100 text-gray-500"}`}>
                            {category.id === "experience" && <Briefcase className="h-5 w-5" />}
                            {category.id === "financial" && <Scale className="h-5 w-5" />}
                            {category.id === "technical" && <Clock className="h-5 w-5" />}
                          </div>
                          <span className="font-medium text-sm text-gray-900">{tr(category.id, 'name') ?? category.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{currentWeight}%</span>
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      <div className={`grid transition-all duration-200 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                          <div className="border-t border-gray-200 p-3 space-y-3 bg-white">
                            <div className="space-y-1">
                              <label className="text-xs text-gray-500">{t('tenderFlow.weight')} {currentWeight}%</label>
                              <input
                                type="range" min="0" max="100" step="5" value={currentWeight}
                                onChange={(e) => handleWeightChange(category.id, parseInt(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E25E45]"
                              />
                            </div>
                            {category.requirements.map((req) => {
                              const currentValue = getRequirementValue(category.id, req.id);
                              return (
                                <div key={req.id} className="flex items-start gap-2">
                                  {req.type === "checkbox" && (
                                    <button
                                      type="button"
                                      onClick={() => handleRequirementChange(category.id, req.id, !currentValue)}
                                      className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${currentValue ? "border-[#E25E45] bg-[#E25E45]" : "border-gray-300"}`}
                                    >
                                      {currentValue && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                                    </button>
                                  )}
                                  <div className="flex-1">
                                    <label className="text-sm text-gray-900">{tr(req.id, 'label') ?? req.label}</label>
                                    {req.type === "select" && req.options && (
                                      <Select
                                        value={(currentValue as string) || "none"}
                                        onValueChange={(value) => handleRequirementChange(category.id, req.id, value === "none" ? "" : value)}
                                      >
                                        <SelectTrigger className="mt-1 w-full text-sm">
                                          <SelectValue placeholder={t('tenderFlow.notRequired')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">{t('tenderFlow.notRequired')}</SelectItem>
                                          {req.options.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{trOpt(req.id, opt.value, opt.label)}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Custom criteria */}
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-900">
                      {t('tenderFlow.customCriteria')} <span className="text-gray-400 font-normal">{t('tenderFlow.optional')}</span>
                    </label>
                    {customCriteria.length > 0 && (
                      <span className="text-xs text-gray-500">{t('tenderFlow.total')} {customCriteriaWeight}%</span>
                    )}
                  </div>
                  {customCriteria.length > 0 && (
                    <div className="space-y-2">
                      {customCriteria.map((criterion) => (
                        <div key={criterion.id} className="px-3 py-2 bg-[#E25E45]/5 border border-[#E25E45]/20 rounded-lg space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-sm text-gray-900">{criterion.text}</span>
                            <span className="text-xs font-medium text-[#E25E45]">{criterion.weight}%</span>
                            <button type="button" onClick={() => removeCustomCriterion(criterion.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <input
                            type="range" min="0" max="50" step="5" value={criterion.weight}
                            onChange={(e) => updateCustomCriterionWeight(criterion.id, parseInt(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E25E45]"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text" value={newCriterionText}
                        onChange={(e) => setNewCriterionText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCustomCriterion()}
                        placeholder={t('tenderFlow.customCriteriaPlaceholder')}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
                      />
                      <Button type="button" onClick={addCustomCriterion} disabled={!newCriterionText.trim()} size="sm" className="bg-[#E25E45] hover:bg-[#d54d35]">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {newCriterionText.trim() && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{t('tenderFlow.weight')}</span>
                        <input
                          type="range" min="0" max="50" step="5" value={newCriterionWeight}
                          onChange={(e) => setNewCriterionWeight(parseInt(e.target.value))}
                          className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E25E45]"
                        />
                        <span className="text-xs font-medium text-[#E25E45] w-8">{newCriterionWeight}%</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </Card>

            {/* ── Card 2: Submission Requirements — revealed when weight = 100% ── */}
            <div className={`transition-all duration-300 ease-out ${
              isWeightValid
                ? "opacity-100 max-h-[2000px] translate-y-0"
                : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pointer-events-none !mt-0"
            }`}>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />

              <div className="p-6 space-y-4">

                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{t('tenderFlow.submissionRequirements')}</p>
                    <p className="text-xs text-gray-500">{t('tenderFlow.displayedToVendors')}</p>
                  </div>
                </div>

                {/* Preset list */}
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {PRESET_REQUIREMENTS.map((preset) => {
                    const checked = isReqSelected(preset.id);
                    const type = getReqType(preset.id);
                    return (
                      <div
                        key={preset.id}
                        className={`rounded-lg border transition-all ${checked ? 'border-blue-300 bg-blue-50/60' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      >
                        <div className="flex items-start gap-3 p-3">
                          <button
                            type="button"
                            onClick={() => toggleReq(preset)}
                            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${checked ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'}`}
                            data-testid={`checkbox-${preset.id}`}
                          >
                            {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug ${checked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                              {preset.text}
                            </p>

                            {/* Mandatory / Preferred toggle — only when checked */}
                            {checked && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <button
                                  type="button"
                                  onClick={() => setReqType(preset.id, 'mandatory')}
                                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${type === 'mandatory' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                  {t('tenderFlow.mandatoryLabel')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReqType(preset.id, 'preferred')}
                                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${type === 'preferred' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                  {t('tenderFlow.preferredLabel')}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom requirements */}
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('tenderFlow.addCustomRequirement')}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customReqText}
                      onChange={(e) => setCustomReqText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCustomReq()}
                      placeholder={t('tenderFlow.customReqPlaceholder')}
                      className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      data-testid="input-custom-requirement"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomReq}
                      disabled={!customReqText.trim()}
                      className="flex-shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Custom items */}
                  {customReqs.length > 0 && (
                    <div className="space-y-1.5">
                      {customReqs.map((req) => (
                        <div key={req.id} className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 font-medium">{req.text}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <button
                                type="button"
                                onClick={() => setReqType(req.id, 'mandatory')}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${req.type === 'mandatory' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                              >
                                {t('tenderFlow.mandatoryLabel')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setReqType(req.id, 'preferred')}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${req.type === 'preferred' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                              >
                                {t('tenderFlow.preferredLabel')}
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustomReq(req.id)}
                            className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </Card>
            </div>{/* end animation wrapper */}

            {/* ── Navigation buttons ─────────────────────────────────────── */}
            <div className="space-y-3">
              <Button
                onClick={() => handleContinue(false)}
                disabled={!isWeightValid}
                className="w-full bg-[#E25E45] hover:bg-[#d54d35] py-6"
                data-testid="button-continue"
              >
                {vendorRequirements.length > 0
                  ? `${t('tenderFlow.continueWith')} ${vendorRequirements.length} ${vendorRequirements.length !== 1 ? t('tenderFlow.requirements') : t('tenderFlow.requirement')}`
                  : t('tenderFlow.continue')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleContinue(true)}
                className="w-full"
                data-testid="button-skip"
              >
                {t('tenderFlow.skipBothSections')}
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
