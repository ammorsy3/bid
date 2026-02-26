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
