import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FloatingPathsBackground } from "@/components/ui/floating-paths-bg";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, ArrowRight, Clock, ShoppingBag, CalendarIcon } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { getSuggestions } from "@/lib/tender-suggestions";

type ProjectType = "time-bound" | "deliverable" | null;

const PROJECT_OPTIONS = [
  {
    id: "time-bound" as const,
    label: "Ongoing & time-bound",
    description: "A project with a start and end date",
    icon: Clock,
  },
  {
    id: "deliverable" as const,
    label: "Purchase of a service or product",
    description: "A project that ends when the work is delivered",
    icon: ShoppingBag,
  },
];

const EXAMPLE_TITLES = [
  "Build responsive WordPress site with booking/payment functionality",
  "Graphic designer needed to design ad creative for multiple campaigns",
  "Facebook ad specialist needed for product launch",
];

export default function TenderTitleStep() {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>(null);

  // Date states for time-bound projects
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Date state for deliverable projects
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);

  // Show project type question when title has meaningful content (10+ chars)
  const showProjectType = title.trim().length >= 10;

  // Show date picker based on project type selection
  const showDatePicker = projectType !== null;

  const handleNext = () => {
    if (title.trim() && isFormValid) {
      const draftData: Record<string, unknown> = {
        title: title.trim(),
        projectType,
      };

      if (projectType === "time-bound" && startDate && endDate) {
        draftData.startDate = startDate.toISOString();
        draftData.endDate = endDate.toISOString();
      } else if (projectType === "deliverable" && deliveryDate) {
        draftData.deliveryDate = deliveryDate.toISOString();
      }

      localStorage.setItem("tenderDraft", JSON.stringify(draftData));
      navigate("/tenders/new/project-scope");
    }
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  // Form validation based on project type
  const isFormValid =
    title.trim().length > 0 &&
    projectType !== null &&
    ((projectType === "time-bound" && startDate && endDate) ||
     (projectType === "deliverable" && deliveryDate));

  return (
    <FloatingPathsBackground>
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
                  1 / 5
                </div>
                <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                  Let's start with a strong title.
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  This helps your tender stand out. It's the first thing that
                  the candidates see, so make it count!
                </p>
              </div>
            </div>

            {/* Right Section - Form */}
            <div>
              <Card className="border-0 shadow-xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

                <div className="p-8 space-y-6">
                  {/* Title Input with Autocomplete */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white">
                      Write a project title for your tender.
                    </label>
                    <AutocompleteInput
                      value={title}
                      onChange={setTitle}
                      suggestions={getSuggestions("title")}
                      placeholder="e.g., Senior React Developer Needed"
                      data-testid="input-title"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Keep it clear and specific (5-10 words)
                    </p>
                  </div>

                  {/* Project Type - Progressive Disclosure */}
                  <div
                    className={`space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6 transition-all duration-300 ease-out ${
                      showProjectType
                        ? "opacity-100 max-h-[500px] translate-y-0"
                        : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pt-0 border-t-0"
                    }`}
                  >
                    <label className="block text-sm font-medium text-gray-900 dark:text-white">
                      What type of project is this?
                    </label>
                    <div className="grid gap-3">
                      {PROJECT_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const isSelected = projectType === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setProjectType(option.id);
                              // Reset dates when switching types
                              setStartDate(undefined);
                              setEndDate(undefined);
                              setDeliveryDate(undefined);
                            }}
                            className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                              isSelected
                                ? "border-[#E25E45] bg-[#E25E45]/5"
                                : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                            }`}
                            data-testid={`project-type-${option.id}`}
                          >
                            <div
                              className={`p-2 rounded-lg ${
                                isSelected
                                  ? "bg-[#E25E45] text-white"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className={`font-medium ${isSelected ? "text-[#E25E45]" : "text-gray-900 dark:text-white"}`}>
                                {option.label}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {option.description}
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected
                                  ? "border-[#E25E45] bg-[#E25E45]"
                                  : "border-gray-300 dark:border-gray-500"
                              }`}
                            >
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date Selection - Progressive Disclosure based on project type */}
                  <div
                    className={`space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6 transition-all duration-300 ease-out ${
                      showDatePicker
                        ? "opacity-100 max-h-[300px] translate-y-0"
                        : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pt-0 border-t-0"
                    }`}
                  >
                    {projectType === "time-bound" && (
                      <>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white">
                          How long is the project?
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Start Date */}
                          <div className="space-y-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Start date</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !startDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {startDate ? format(startDate, "PPP") : "Select date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={startDate}
                                  onSelect={setStartDate}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* End Date */}
                          <div className="space-y-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">End date</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !endDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {endDate ? format(endDate, "PPP") : "Select date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={endDate}
                                  onSelect={setEndDate}
                                  disabled={(date) =>
                                    date < new Date() || (startDate ? date < startDate : false)
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </>
                    )}

                    {projectType === "deliverable" && (
                      <>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white">
                          When should the deliverables be completed?
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !deliveryDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {deliveryDate ? format(deliveryDate, "PPP") : "Select delivery date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={deliveryDate}
                              onSelect={setDeliveryDate}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          The final date for delivering all project deliverables
                        </p>
                      </>
                    )}
                  </div>

                  {/* Example Titles */}
                  <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Example titles
                    </h3>
                    <ul className="space-y-2">
                      {EXAMPLE_TITLES.map((example, index) => (
                        <li
                          key={index}
                          className="text-sm text-gray-600 dark:text-gray-400 flex gap-3"
                        >
                          <span className="text-gray-400 dark:text-gray-600">
                            •
                          </span>
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="flex-1"
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={!isFormValid}
                      className="flex-1 bg-[#E25E45] hover:bg-[#d54d35]"
                      data-testid="button-next"
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </FloatingPathsBackground>
  );
}
