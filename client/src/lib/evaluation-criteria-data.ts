export interface CriterionRequirement {
  id: string;
  label: string;
  description: string;
  options?: { value: string; label: string }[];
  type: "select" | "checkbox";
}

export interface CriteriaCategory {
  id: string;
  name: string;
  description: string;
  defaultWeight: number;
  requirements: CriterionRequirement[];
}

export const CRITERIA_TRANSLATIONS_AR: Record<string, {
  name?: string;
  description?: string;
  label?: string;
  options?: Record<string, string>;
}> = {
  experience: {
    name: "الخبرة ذات الصلة",
    description: "تقييم الخبرة والأعمال السابقة في مشاريع مشابهة",
  },
  financial: {
    name: "التقييم المالي",
    description: "تنافسية السعر والقيمة مقابل التكلفة",
  },
  technical: {
    name: "القدرة التقنية",
    description: "المنهجية التقنية والقدرة على التنفيذ والتسليم",
  },
  years_in_market: {
    label: "الحد الأدنى لسنوات العمل في السوق",
    description: "حدّد أقل عدد لسنوات عمل الشركة.",
    options: {
      "1": "+1 سنة",
      "3": "+3 سنوات",
      "5": "+5 سنوات",
      "10": "+10 سنوات",
    },
  },
  similar_projects_count: {
    label: "الحد الأدنى للمشاريع المماثلة المنجزة",
    description: "حدّد أقل عدد من المشاريع المشابهة المنجزة.",
    options: {
      "1": "مشروع واحد على الأقل",
      "3": "3 مشاريع على الأقل",
      "5": "5 مشاريع على الأقل",
      "10": "10 مشاريع على الأقل",
    },
  },
  min_project_value: {
    label: "الحد الأدنى لقيمة المشاريع السابقة",
    description: "حدّد أقل قيمة لمشروع مشابه سبق تنفيذه بالريال السعودي.",
    options: {
      "50000": "+50,000 ريال",
      "100000": "+100,000 ريال",
      "250000": "+250,000 ريال",
      "500000": "+500,000 ريال",
      "1000000": "+1,000,000 ريال",
    },
  },
  client_references: {
    label: "مراجع العملاء المطلوبة",
    description: "اطلب مراجع موثّقة من عملاء سابقين.",
  },
  financial_statements: {
    label: "البيانات المالية المطلوبة",
    description: "اطلب قوائم مالية مدققة.",
  },
  bank_guarantee: {
    label: "القدرة على تقديم ضمان بنكي",
    description: "يشترط القدرة على تقديم ضمان بنكي عند الطلب.",
  },
  methodology: {
    label: "المنهجية التفصيلية المطلوبة",
    description: "يشترط تقديم منهجية تفصيلية للمشروع.",
  },
  timeline: {
    label: "الجدول الزمني للمشروع",
    description: "يشترط تقديم جدول زمني تفصيلي للمشروع.",
  },
  team_cvs: {
    label: "السيرة الذاتية للفريق مطلوبة",
    description: "يشترط تقديم السير الذاتية لأعضاء الفريق الرئيسيين.",
  },
  industry_certifications: {
    label: "الشهادات المهنية المتخصصة",
    description: "الشهادات المهنية ذات الصلة بالمجال",
  },
};

export const ENTERPRISE_CRITERIA_CATEGORIES: CriteriaCategory[] = [
  {
    id: "experience",
    name: "Relevant Experience",
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
