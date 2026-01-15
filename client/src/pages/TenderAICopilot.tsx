import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Check, Lightbulb, ArrowLeft, ArrowRight, Sparkles, Building2, FileText, Settings, ClipboardList, Eye } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  tenderData?: Record<string, any>;
}

interface Step {
  id: number;
  name: string;
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  completed: boolean;
}

const STEPS: Step[] = [
  { id: 1, name: "Company", key: "company", icon: Building2, completed: false },
  { id: 2, name: "Service", key: "service", icon: FileText, completed: false },
  { id: 3, name: "Details", key: "details", icon: ClipboardList, completed: false },
  { id: 4, name: "Prefs", key: "preferences", icon: Settings, completed: false },
  { id: 5, name: "Review", key: "review", icon: Eye, completed: false },
];

export default function TenderAICopilot() {
  const [, navigate] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState<Step[]>(STEPS);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tenderDraft, setTenderDraft] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: companyProfile } = useQuery({
    queryKey: ["/api/companies", activeCompany?.id, "profile"],
    enabled: !!activeCompany?.id,
  });

  const profile = companyProfile as any;
  const company = activeCompany as any;
  const companyData = {
    name: company?.name || "",
    bio: profile?.bio || "",
    category: company?.category || "",
    city: company?.city || "",
    tags: profile?.tags || [],
    logoUrl: profile?.logoUrl || "",
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0 || (currentStep > 1 && steps[currentStep - 2]?.completed)) {
      sendInitialMessage(currentStep);
    }
  }, [currentStep]);

  const sendInitialMessage = async (step: number) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: null,
          step,
          companyData,
          chatHistory: [],
          tenderDraft,
        }),
      });

      await processStreamResponse(response);
    } catch (error) {
      console.error("Error sending initial message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const processStreamResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    const messageId = Date.now().toString();

    setMessages((prev) => [...prev, { id: messageId, role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        try {
          const event = JSON.parse(line.slice(6));

          if (event.content) {
            fullContent += event.content;
          }

          if (event.done && event.parsed) {
            const parsed = event.parsed;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      content: parsed.message || fullContent,
                      suggestions: parsed.suggestions,
                      tenderData: parsed.tenderData,
                    }
                  : m
              )
            );

            if (parsed.tenderData) {
              setTenderDraft((prev) => ({ ...prev, ...parsed.tenderData }));
            }

            if (parsed.readyForNextStep && currentStep < 5) {
              setSteps((prev) =>
                prev.map((s) => (s.id === currentStep ? { ...s, completed: true } : s))
              );
            }
          } else if (event.done && event.raw) {
            try {
              const parsed = JSON.parse(event.raw);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === messageId
                    ? { ...m, content: parsed.message || event.raw }
                    : m
                )
              );
            } catch {
              setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, content: fullContent } : m))
              );
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content.trim(),
          step: currentStep,
          companyData,
          chatHistory: [...chatHistory, { role: "user", content: content.trim() }],
          tenderDraft,
        }),
      });

      await processStreamResponse(response);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleNextStep = () => {
    if (currentStep < 5) {
      const nextStep = currentStep + 1;
      setSteps((prev) =>
        prev.map((s) => (s.id === currentStep ? { ...s, completed: true } : s))
      );
      setCurrentStep(nextStep);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleLaunchTender = async () => {
    try {
      const response = await fetch("/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tenderDraft),
      });

      if (response.ok) {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error creating tender:", error);
    }
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Left Sidebar - Progress Tracker */}
      <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#E25E45]" />
            <span className="font-semibold text-gray-900 dark:text-white">Bid Copilot</span>
          </div>
        </div>

        <div className="flex-1 p-4">
          <div className="space-y-2">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.completed;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-all",
                    isActive
                      ? "bg-[#E25E45]/10 border border-[#E25E45]"
                      : isCompleted
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isActive
                        ? "bg-[#E25E45] text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isActive
                        ? "text-[#E25E45]"
                        : isCompleted
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-600 dark:text-gray-400"
                    )}
                  >
                    {step.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tip Helper */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  Pro Tip
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                  {currentStep === 1 && "Verify your company details are correct before proceeding."}
                  {currentStep === 2 && "Describe your needs in natural language - AI will structure it."}
                  {currentStep === 3 && "Accept or modify AI suggestions for budget and timeline."}
                  {currentStep === 4 && "Don't forget to set a submission deadline!"}
                  {currentStep === 5 && "Review all details carefully before launching."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoPath}
              alt="Bid"
              className="h-8 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/dashboard")}
            />
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Step {currentStep} of 5
            </span>
          </div>
          <button
            onClick={() => navigate("/tenders/new")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </header>

        {/* Chat + Preview Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-2xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3",
                        message.role === "user"
                          ? "bg-[#E25E45] text-white"
                          : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                      )}
                    >
                      <p
                        className={cn(
                          "text-sm whitespace-pre-wrap",
                          message.role === "assistant" && "text-gray-900 dark:text-white"
                        )}
                      >
                        {message.content}
                      </p>

                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-700 dark:text-gray-300 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#E25E45] rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-[#E25E45] rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-[#E25E45] rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex items-center gap-2 max-w-2xl mx-auto"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-[#E25E45] hover:bg-[#d54d35]"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>

          {/* Live Preview */}
          <div className="w-96 bg-white dark:bg-gray-900 p-4 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Tender Preview
            </h3>

            <div className="space-y-4">
              {tenderDraft.title && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">
                    Title
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">
                    {tenderDraft.title}
                  </p>
                </div>
              )}

              {tenderDraft.serviceDescription && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">
                    Service/Product
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {tenderDraft.serviceDescription}
                  </p>
                </div>
              )}

              {tenderDraft.projectType && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">
                    Project Type
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {tenderDraft.projectType}
                  </p>
                </div>
              )}

              {tenderDraft.budget && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">
                    Budget
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {typeof tenderDraft.budget === "object"
                      ? `SAR ${tenderDraft.budget.min?.toLocaleString()} - ${tenderDraft.budget.max?.toLocaleString()}`
                      : `SAR ${tenderDraft.budget.toLocaleString()}`}
                  </p>
                </div>
              )}

              {tenderDraft.timeline && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">
                    Timeline
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {tenderDraft.timeline}
                  </p>
                </div>
              )}

              {tenderDraft.deliverables && tenderDraft.deliverables.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">
                    Deliverables
                  </label>
                  <ul className="text-sm text-gray-900 dark:text-white list-disc list-inside">
                    {tenderDraft.deliverables.map((d: string, i: number) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {tenderDraft.submissionDeadline && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">
                    Submission Deadline
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white font-medium text-[#E25E45]">
                    {tenderDraft.submissionDeadline}
                  </p>
                </div>
              )}

              {Object.keys(tenderDraft).length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Your tender will appear here as you provide details...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePreviousStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < 5 ? (
            <Button onClick={handleNextStep} className="bg-[#E25E45] hover:bg-[#d54d35]">
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleLaunchTender} className="bg-[#E25E45] hover:bg-[#d54d35]">
              Launch Tender
              <Sparkles className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
