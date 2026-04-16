import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, X, Search } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";

// Comprehensive skills database
const SKILLS_DATABASE = [
  // Web Development
  "React",
  "Vue.js",
  "Angular",
  "TypeScript",
  "JavaScript",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Next.js",
  "Node.js",
  "Express",
  "REST API",
  "GraphQL",
  "MongoDB",
  "PostgreSQL",
  "Firebase",
  "AWS",
  "Docker",
  "Git",
  "Web Design",
  "Responsive Design",
  "UI/UX Design",
  
  // Video Editing & Production
  "Adobe After Effects",
  "Adobe Premiere Pro",
  "Adobe Photoshop",
  "Adobe Illustrator",
  "Video Editing",
  "Motion Graphics",
  "Animation",
  "Video Production",
  "Video Post-Editing",
  "Audio Editing",
  "DaVinci Resolve",
  "Final Cut Pro",
  "Color Grading",
  "Video Compositing",
  "2D Animation",
  "3D Animation",
  "Content Writing",
  "Video Commercial",
  "Explainer Video",
  "Video Intro & Outro",
  "Video Thumbnails",

  // Design
  "Graphic Design",
  "Web Design",
  "UI Design",
  "UX Design",
  "Logo Design",
  "Branding",
  "Print Design",
  "Packaging Design",
  "Social Media Design",
  "Figma",
  "Sketch",
  "Adobe XD",
  "InDesign",
  "Canva",
  "Wireframing",
  "Prototyping",

  // Marketing & Social Media
  "Social Media Marketing",
  "Facebook Ads",
  "Google Ads",
  "Instagram Marketing",
  "Content Marketing",
  "SEO",
  "SEM",
  "Email Marketing",
  "Copywriting",
  "Brand Strategy",
  "Market Research",
  "Analytics",
  "Google Analytics",
  "Conversion Rate Optimization",

  // Writing & Content
  "Content Writing",
  "Copywriting",
  "Blog Writing",
  "Technical Writing",
  "Creative Writing",
  "Editing",
  "Proofreading",
  "SEO Writing",
  "Journalism",
  "Report Writing",
  "Translation",
  "Localization",

  // Data & Analytics
  "Data Analysis",
  "Excel",
  "Power BI",
  "Tableau",
  "Python",
  "R",
  "SQL",
  "Machine Learning",
  "Data Science",
  "Business Intelligence",
  "Google Analytics",
  "Spreadsheets",

  // Business & Consulting
  "Business Strategy",
  "Project Management",
  "Scrum",
  "Agile",
  "Lean",
  "Business Analysis",
  "Process Improvement",
  "Quality Assurance",
  "Risk Management",
  "Compliance",
  "Financial Modeling",
  "Budgeting",

  // Mobile Development
  "Mobile App Development",
  "iOS",
  "Android",
  "Swift",
  "Kotlin",
  "React Native",
  "Flutter",
  "App Design",
  "Cross-platform Development",

  // E-commerce
  "E-commerce",
  "Shopify",
  "WooCommerce",
  "WordPress",
  "Magento",
  "Product Photography",
  "Catalog Management",
  "Inventory Management",
  "Shopping Cart Optimization",

  // Cloud & DevOps
  "AWS",
  "Google Cloud",
  "Microsoft Azure",
  "Docker",
  "Kubernetes",
  "CI/CD",
  "Linux",
  "Cloud Architecture",
  "Database Administration",
  "System Administration",

  // Other Technical
  "Java",
  "C++",
  "C#",
  ".NET",
  "PHP",
  "Ruby",
  "Python",
  "Go",
  "Rust",
  "Shell Scripting",
  "API Integration",
  "Payment Integration",
  "Authentication",
  "Testing",
  "Automation",

  // Management & Leadership
  "Team Leadership",
  "Management",
  "Staff Management",
  "Recruitment",
  "Training",
  "Mentoring",
  "Performance Management",
  "Conflict Resolution",
  "Communication",
  "Presentation Skills",

  // Other
  "Customer Support",
  "Accounting",
  "Bookkeeping",
  "Tax Preparation",
  "Real Estate",
  "Construction",
  "Manufacturing",
  "Supply Chain",
  "Logistics",
  "Human Resources",
];

const SKILL_CATEGORIES: { [key: string]: string[] } = {
  "Web Development": [
    "React",
    "Vue.js",
    "Angular",
    "TypeScript",
    "JavaScript",
    "Node.js",
    "Next.js",
  ],
  "Video Editing": [
    "Adobe After Effects",
    "Adobe Premiere Pro",
    "Video Editing",
    "Motion Graphics",
    "Animation",
    "Video Production",
    "DaVinci Resolve",
  ],
  Design: [
    "Graphic Design",
    "Web Design",
    "UI Design",
    "UX Design",
    "Figma",
    "Adobe Photoshop",
  ],
  Marketing: [
    "Social Media Marketing",
    "Facebook Ads",
    "SEO",
    "Content Marketing",
    "Email Marketing",
  ],
};

export default function TenderSkillsStep() {
  const [, navigate] = useLocation();
  const { t, isRtl } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Get draft to find out the job title for category suggestions
  const draft = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tenderDraft") || "{}");
    } catch {
      return {};
    }
  }, []);

  const jobTitle = draft?.title || "";

  // Filter skills based on search
  const filteredSkills = useMemo(() => {
    if (!searchTerm.trim()) return SKILLS_DATABASE;
    return SKILLS_DATABASE.filter((skill) =>
      skill.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Get suggested skills based on job title
  const suggestedSkills = useMemo(() => {
    const lowerTitle = jobTitle.toLowerCase();
    for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
      if (lowerTitle.includes(category.toLowerCase())) {
        return skills.filter((s) => !selectedSkills.includes(s));
      }
    }
    return [];
  }, [jobTitle, selectedSkills]);

  const handleAddSkill = (skill: string) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill]);
      setSearchTerm("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skill));
  };

  const handleAddCustomSkill = () => {
    const skillToAdd = customSkill.trim();
    if (skillToAdd && !selectedSkills.includes(skillToAdd)) {
      setSelectedSkills([...selectedSkills, skillToAdd]);
      setCustomSkill("");
      setShowCustomInput(false);
    }
  };

  const handleNext = () => {
    if (selectedSkills.length > 0) {
      const updated = {
        ...draft,
        skills: selectedSkills,
      };
      localStorage.setItem("tenderDraft", JSON.stringify(updated));
      navigate("/tenders/new/scope");
    }
  };

  const handleBack = () => {
    navigate("/tenders/new/ai-budget");
  };

  const isFormValid = selectedSkills.length >= 1;

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
                {t('tenderSteps.back')}
              </span>
              <i className="absolute inset-0 z-10 grid w-1/4 place-items-center bg-primary-foreground/15 transition-all duration-500 group-hover:w-full">
                <ArrowLeft
                  className="opacity-60"
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </i>
            </Button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Left Section - Headline and Explanation */}
          <div>
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  4 / 6
                </div>
                <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                  {t('tenderSteps.skillsStepTitle')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  {t('tenderSteps.skillsStepDesc')}
                </p>
              </div>
          </div>

          {/* Right Section - Skills Selector */}
          <div>
              <Card className="border-0 shadow-xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

                <div className="p-8 space-y-6">
                  {/* Selected Skills */}
                  {selectedSkills.length > 0 && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-900 dark:text-white">
                        {t('tenderSteps.selectedSkills', { count: selectedSkills.length })}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedSkills.map((skill) => (
                          <div
                            key={skill}
                            className="flex items-center gap-2 px-3 py-1 bg-[#E25E45]/10 border border-[#E25E45] rounded-full text-sm text-gray-900 dark:text-white"
                          >
                            <span>{skill}</span>
                            <button
                              onClick={() => handleRemoveSkill(skill)}
                              className="hover:text-[#E25E45]"
                              data-testid={`button-remove-${skill}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search Bar */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        {t('tenderSteps.searchSkillsLabel')}
                      </label>
                      <button
                        onClick={() => setShowCustomInput(!showCustomInput)}
                        className="text-xs font-medium text-[#E25E45] hover:underline"
                        data-testid="button-toggle-custom-input"
                      >
                        {showCustomInput ? t('tenderSteps.cancelBtn') : t('tenderSteps.addCustomSkillToggle')}
                      </button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder={t('tenderSteps.searchSkillsPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
                        data-testid="input-skill-search"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('tenderSteps.bestResultsHint')}
                    </p>
                  </div>

                  {/* Suggested Skills or Search Results */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {searchTerm
                        ? t('tenderSteps.searchResults')
                        : (jobTitle ? t('tenderSteps.popularSkillsFor', { title: jobTitle }) : t('tenderSteps.popularSkillsForDefault'))}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(searchTerm ? filteredSkills : suggestedSkills).length >
                      0 ? (
                        (searchTerm ? filteredSkills : suggestedSkills)
                          .slice(0, 20)
                          .map((skill) => (
                            <button
                              key={skill}
                              onClick={() => handleAddSkill(skill)}
                              disabled={selectedSkills.includes(skill)}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-[#E25E45] hover:text-[#E25E45] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              data-testid={`button-add-${skill}`}
                            >
                              {skill} <span className="ml-1">+</span>
                            </button>
                          ))
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('tenderSteps.noSkillsFound')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Custom Skill Input */}
                  {showCustomInput && (
                    <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        {t('tenderSteps.enterCustomSkill')}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={t('tenderSteps.typeSkillName')}
                          value={customSkill}
                          onChange={(e) => setCustomSkill(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddCustomSkill();
                            }
                          }}
                          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
                          data-testid="input-custom-skill"
                          autoFocus
                        />
                        <Button
                          onClick={handleAddCustomSkill}
                          className="bg-[#E25E45] hover:bg-[#d54d35]"
                          data-testid="button-add-custom"
                        >
                          {t('tenderSteps.addBtn')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="flex-1"
                      data-testid="button-cancel"
                    >
                      {t('tenderSteps.back')}
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={!isFormValid}
                      className="flex-1 bg-[#E25E45] hover:bg-[#d54d35]"
                      data-testid="button-next"
                    >
                      {t('tenderSteps.next')}
                      <ArrowRight className={`h-4 w-4 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
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
