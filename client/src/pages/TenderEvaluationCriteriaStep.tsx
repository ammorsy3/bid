import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check, Scale, ChevronDown, ChevronUp, Briefcase, Clock, Plus, X } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";

interface CriterionRequirement {
  id: string;
  label: string;
  description: string;
  options?: { value: string; label: string }[];
  type: "select" | "checkbox";
}

interface CriteriaCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  defaultWeight: number;
  requirements: CriterionRequirement[];
}

const ENTERPRISE_CRITERIA_CATEGORIES: CriteriaCategory[] = [
  {
    id: "experience",
    name: "Relevant Experience",
    icon: <Briefcase className="h-5 w-5" />,
    description: "Assess track record in similar projects",
    defaultWeight: 30,
    requirements: [
      {
        id: "years_in_market",
        label: "Minimum years in market",
        description: "How long must the company have been operating?",
        type: "select",
        options: [
          { value: "1", label: "1+ years" },
          { value: "3", label: "3+ years" },
          { value: "5", label: "5+ years" },
          { value: "10", label: "10+ years" },
        ],
      },
      {
        id: "similar_projects_count",
        label: "Minimum similar projects completed",
        description: "Number of comparable projects delivered",
        type: "select",
        options: [
          { value: "1", label: "At least 1 project" },
          { value: "3", label: "At least 3 projects" },
          { value: "5", label: "At least 5 projects" },
          { value: "10", label: "At least 10 projects" },
        ],
      },
      {
        id: "min_project_value",
        label: "Minimum previous project value",
        description: "Largest comparable contract delivered (SAR)",
        type: "select",
        options: [
          { value: "50000", label: "50,000+ SAR" },
          { value: "100000", label: "100,000+ SAR" },
          { value: "250000", label: "250,000+ SAR" },
          { value: "500000", label: "500,000+ SAR" },
          { value: "1000000", label: "1,000,000+ SAR" },
        ],
      },
      {
        id: "client_references",
        label: "Client references required",
        description: "Require verifiable client references",
        type: "checkbox",
      },
    ],
  },
  {
    id: "financial",
    name: "Financial Evaluation",
    icon: <Scale className="h-5 w-5" />,
    description: "Price competitiveness and value for money",
    defaultWeight: 30,
    requirements: [
      {
        id: "financial_statements",
        label: "Financial statements required",
        description: "Require audited financial statements",
        type: "checkbox",
      },
      {
        id: "bank_guarantee",
        label: "Bank guarantee capability",
        description: "Must be able to provide bank guarantee if required",
        type: "checkbox",
      },
    ],
  },
  {
    id: "technical",
    name: "Technical Capability",
    icon: <Clock className="h-5 w-5" />,
    description: "Technical approach and delivery capability",
    defaultWeight: 25,
    requirements: [
      {
        id: "methodology",
        label: "Detailed methodology required",
        description: "Must submit detailed project methodology",
        type: "checkbox",
      },
      {
        id: "timeline",
        label: "Project timeline",
        description: "Must provide detailed project timeline",
        type: "checkbox",
      },
      {
        id: "team_cvs",
        label: "Team CVs required",
        description: "Must submit CVs of key team members",
        type: "checkbox",
      },
      {
        id: "industry_certifications",
        label: "Industry-specific certifications",
        description: "Relevant professional certifications for the field",
        type: "checkbox",
      },
    ],
  },
];

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

export default function TenderEvaluationCriteriaStep() {
  const [, navigate] = useLocation();

  // Evaluation criteria state
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["experience"]);
  const [selectedRequirements, setSelectedRequirements] = useState<SelectedRequirement[]>([]);
  const [categoryWeights, setCategoryWeights] = useState<CategoryWeight[]>(
    ENTERPRISE_CRITERIA_CATEGORIES.map(cat => ({ categoryId: cat.id, weight: cat.defaultWeight }))
  );

  // Custom criteria
  const [customCriteria, setCustomCriteria] = useState<CustomCriterion[]>([]);
  const [newCriterionText, setNewCriterionText] = useState("");
  const [newCriterionWeight, setNewCriterionWeight] = useState(5);

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
  }, [draft.evaluationCriteria]);

  // Category handlers
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  };

  const handleRequirementChange = (categoryId: string, requirementId: string, value: string | boolean) => {
    setSelectedRequirements(prev => {
      const existing = prev.findIndex(r => r.categoryId === categoryId && r.requirementId === requirementId);
      if (existing >= 0) {
        if (value === false || value === "") {
          return prev.filter((_, i) => i !== existing);
        }
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
    setCategoryWeights(prev =>
      prev.map(cw => cw.categoryId === categoryId ? { ...cw, weight } : cw)
    );
  };

  // Custom criteria handlers
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

  const removeCustomCriterion = (id: string) => {
    setCustomCriteria(prev => prev.filter(c => c.id !== id));
  };

  const updateCustomCriterionWeight = (id: string, weight: number) => {
    setCustomCriteria(prev => prev.map(c => c.id === id ? { ...c, weight } : c));
  };

  const customCriteriaWeight = customCriteria.reduce((sum, c) => sum + c.weight, 0);
  const totalWeight = categoryWeights.reduce((sum, cw) => sum + cw.weight, 0) + customCriteriaWeight;
  const isWeightValid = totalWeight === 100;

  const handleContinue = (skip: boolean = false) => {
    const currentDraft = JSON.parse(localStorage.getItem("tenderDraft") || "{}");

    const evaluationCriteria = skip ? undefined : {
      requirements: selectedRequirements,
      weights: categoryWeights,
      customCriteria,
    };

    const updatedDraft = {
      ...currentDraft,
      evaluationCriteria,
    };
    localStorage.setItem("tenderDraft", JSON.stringify(updatedDraft));
    navigate("/tenders/new/brief");
  };

  const handleBack = () => {
    navigate("/tenders/new/submission-process");
  };

  const hasSelections = selectedRequirements.length > 0;

  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto">
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
              Back
            </span>
            <i className="absolute inset-0 z-10 grid w-1/4 place-items-center bg-primary-foreground/15 transition-all duration-500 group-hover:w-full">
              <ArrowLeft className="opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
            </i>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Left Section */}
          <div>
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                5 / 5 (Optional)
              </div>
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                Evaluation Criteria
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Define structured evaluation criteria for fair and auditable supplier selection.
              </p>
            </div>
          </div>

          {/* Right Section */}
          <div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

              <div className="p-6 space-y-6">
                {/* Animated Weight Progress Ring */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        strokeLinecap="round"
                        className={`transition-all duration-500 ease-out ${
                          totalWeight === 100
                            ? "text-green-500"
                            : totalWeight > 100
                            ? "text-red-500"
                            : "text-amber-500"
                        }`}
                        style={{
                          strokeDasharray: `${Math.min(totalWeight, 100) * 1.76} 176`,
                        }}
                      />
                    </svg>
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                      totalWeight === 100 ? "scale-110" : "scale-100"
                    }`}>
                      <span className={`text-lg font-bold transition-colors duration-300 ${
                        totalWeight === 100
                          ? "text-green-600"
                          : totalWeight > 100
                          ? "text-red-600"
                          : "text-amber-600"
                      }`}>
                        {totalWeight}%
                      </span>
                    </div>
                    {totalWeight === 100 && (
                      <div className="absolute inset-0 rounded-full animate-ping bg-green-400/20" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {totalWeight === 100 ? "Perfect Balance!" : "Weight Distribution"}
                      </span>
                      {totalWeight === 100 && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className={`text-sm mt-0.5 transition-colors duration-300 ${
                      totalWeight === 100
                        ? "text-green-600"
                        : totalWeight > 100
                        ? "text-red-500"
                        : "text-amber-600"
                    }`}>
                      {totalWeight === 100
                        ? "Weights add up correctly"
                        : totalWeight > 100
                        ? `Remove ${totalWeight - 100}% to balance`
                        : `Add ${100 - totalWeight}% more weight`}
                    </p>
                  </div>
                </div>

                {ENTERPRISE_CRITERIA_CATEGORIES.map((category) => {
                  const isExpanded = expandedCategories.includes(category.id);
                  const currentWeight = categoryWeights.find(cw => cw.categoryId === category.id)?.weight || 0;
                  const categoryReqs = selectedRequirements.filter(r => r.categoryId === category.id);
                  const hasCategorySelections = categoryReqs.length > 0;

                  return (
                    <div
                      key={category.id}
                      className={`border rounded-lg overflow-hidden transition-all ${
                        hasCategorySelections
                          ? "border-[#E25E45]/50 bg-[#E25E45]/5"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCategory(category.id)}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${
                            hasCategorySelections ? "bg-[#E25E45]/10 text-[#E25E45]" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                          }`}>
                            {category.icon}
                          </div>
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {category.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{currentWeight}%</span>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-3 bg-white dark:bg-gray-900">
                          <div className="space-y-1">
                            <label className="text-xs text-gray-500">Weight: {currentWeight}%</label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={currentWeight}
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
                                    className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                      currentValue ? "border-[#E25E45] bg-[#E25E45]" : "border-gray-300"
                                    }`}
                                  >
                                    {currentValue && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                                  </button>
                                )}
                                <div className="flex-1">
                                  <label className="text-sm text-gray-900 dark:text-white">{req.label}</label>
                                  {req.type === "select" && req.options && (
                                    <Select
                                      value={(currentValue as string) || "none"}
                                      onValueChange={(value) => handleRequirementChange(category.id, req.id, value === "none" ? "" : value)}
                                    >
                                      <SelectTrigger className="mt-1 w-full text-sm">
                                        <SelectValue placeholder="Not required" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Not required</SelectItem>
                                        {req.options.map(opt => (
                                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Custom Criteria */}
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white">
                      Custom criteria <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    {customCriteria.length > 0 && (
                      <span className="text-xs text-gray-500">
                        Total: {customCriteriaWeight}%
                      </span>
                    )}
                  </div>

                  {/* Existing custom criteria */}
                  {customCriteria.length > 0 && (
                    <div className="space-y-2">
                      {customCriteria.map((criterion) => (
                        <div
                          key={criterion.id}
                          className="px-3 py-2 bg-[#E25E45]/5 border border-[#E25E45]/20 rounded-lg space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-sm text-gray-900 dark:text-white">
                              {criterion.text}
                            </span>
                            <span className="text-xs font-medium text-[#E25E45]">
                              {criterion.weight}%
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCustomCriterion(criterion.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="50"
                            step="5"
                            value={criterion.weight}
                            onChange={(e) => updateCustomCriterionWeight(criterion.id, parseInt(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E25E45]"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new custom criterion */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCriterionText}
                        onChange={(e) => setNewCriterionText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCustomCriterion()}
                        placeholder="e.g., Team communication skills..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
                      />
                      <Button
                        type="button"
                        onClick={addCustomCriterion}
                        disabled={!newCriterionText.trim()}
                        size="sm"
                        className="bg-[#E25E45] hover:bg-[#d54d35]"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {newCriterionText.trim() && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Weight:</span>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          step="5"
                          value={newCriterionWeight}
                          onChange={(e) => setNewCriterionWeight(parseInt(e.target.value))}
                          className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E25E45]"
                        />
                        <span className="text-xs font-medium text-[#E25E45] w-8">{newCriterionWeight}%</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Add your own evaluation criteria with custom weights
                  </p>
                </div>

                {/* Navigation Buttons */}
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => handleContinue(false)}
                    disabled={!hasSelections || !isWeightValid}
                    className="w-full bg-[#E25E45] hover:bg-[#d54d35]"
                    data-testid="button-continue"
                  >
                    Continue
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleContinue(true)}
                    className="w-full"
                    data-testid="button-skip"
                  >
                    Skip
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
