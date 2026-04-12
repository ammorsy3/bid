import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  X,
  Send,
  Sparkles,
  Rocket,
  ChevronRight,
  Mic,
  MicOff,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  Zap,
  RotateCcw,
  PanelRightClose,
  PanelRightOpen,
  ArrowRight,
  Package,
  Users,
  Lightbulb,
  Building2,
  Copy,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { usePageTour } from "@/lib/tour";
import { AI_COPILOT_TOUR_STEPS, getSteps } from "@/lib/tour-steps";
import { ToastAction } from "@/components/ui/toast";
import { AIAgentOrb, OrbState } from "@/components/ui/ai-agent-orb";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { cn } from "@/lib/utils";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useI18n } from "@/lib/i18n";
import { MarketplacePublishOption, type MarketplaceOptions } from "@/components/MarketplacePublishOption";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  tenderData?: Record<string, any>;
  isStreaming?: boolean;
}

interface ActivityLogItem {
  id: string;
  type: "thinking" | "extracting" | "generating" | "updating" | "complete";
  title: string;
  detail?: string;
  status: "pending" | "in_progress" | "completed";
  timestamp: Date;
}

// Activity type icons and colors
const activityTypeConfig = {
  thinking: { icon: Target, color: "text-purple-500", bg: "bg-purple-500/10" },
  extracting: { icon: Zap, color: "text-blue-500", bg: "bg-blue-500/10" },
  generating: { icon: FileText, color: "text-orange-500", bg: "bg-orange-500/10" },
  updating: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  complete: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
};

// Inline Activity Component - shows AI actions in the chat
const InlineActivity: React.FC<{
  activities: ActivityLogItem[];
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ activities, isExpanded, onToggle }) => {
  if (activities.length === 0) return null;

  const latestActivity = activities[0];
  const isWorking = latestActivity?.status === "in_progress";
  const config = activityTypeConfig[latestActivity?.type || "thinking"];
  const IconComponent = config.icon;

  return (
    <motion.div
      className="flex justify-start mb-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="w-full max-w-[90%]">
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all",
            "bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50",
            "hover:bg-gray-50/80 dark:hover:bg-gray-700/80 shadow-sm"
          )}
        >
          <div className={cn("p-1.5 rounded-lg shrink-0", config.bg)}>
            {isWorking ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <IconComponent className={cn("w-4 h-4", config.color)} />
              </motion.div>
            ) : (
              <IconComponent className={cn("w-4 h-4", config.color)} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {latestActivity?.title}
              </span>
              {isWorking && (
                <motion.span
                  className="text-xs text-gray-400"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  processing...
                </motion.span>
              )}
            </div>
            {latestActivity?.detail && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                "{latestActivity.detail}"
              </p>
            )}
          </div>

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 mt-1"
          >
            <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
          </motion.div>
        </button>

        <AnimatePresence>
          {isExpanded && activities.length > 1 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 ml-4 pl-4 border-l-2 border-gray-200/50 dark:border-gray-700/50 space-y-2"
            >
              {activities.slice(1).map((activity) => {
                const actConfig = activityTypeConfig[activity.type];
                const ActIcon = actConfig.icon;
                return (
                  <motion.div
                    key={activity.id}
                    className="flex items-start gap-2 py-1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <ActIcon className={cn("w-3 h-3 mt-0.5 shrink-0", actConfig.color)} />
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {activity.title}
                      </span>
                      {activity.detail && (
                        <p className="text-xs text-gray-400 truncate">
                          "{activity.detail}"
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Quick action templates
const quickActions = [
  {
    icon: Building2,
    label: "Marketing Campaign",
    prompt: "I need a marketing campaign for our product launch",
    color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
  },
  {
    icon: Package,
    label: "IT Services",
    prompt: "We need IT infrastructure services for our office",
    color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20",
  },
  {
    icon: Users,
    label: "HR Consulting",
    prompt: "Looking for HR consulting services for recruitment",
    color: "bg-green-500/10 text-green-600 hover:bg-green-500/20",
  },
  {
    icon: Lightbulb,
    label: "Creative Design",
    prompt: "We need creative design services for branding",
    color: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20",
  },
];

// Task steps for progress visualization
const taskSteps = [
  { id: "understand", label: "Understanding", icon: Target },
  { id: "analyze", label: "Analyzing", icon: Zap },
  { id: "generate", label: "Generating", icon: FileText },
  { id: "review", label: "Review", icon: CheckCircle2 },
];

export default function TenderAICopilot() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const sessionParam = new URLSearchParams(searchString).get("session");
  const { activeCompany, user } = useAuthStore();
  const { toast } = useToast();
  const { t, language: i18nLang, isRtl: i18nIsRtl } = useI18n();

  const _lang = localStorage.getItem('language') ?? 'en';
  const _isRtl = _lang === 'ar';
  const { overlay: tourOverlay } = usePageTour({
    tourId: 'ai-copilot',
    userId: user?.id ?? '',
    steps: getSteps(AI_COPILOT_TOUR_STEPS, _lang),
    isRtl: _isRtl,
    autoStart: !!user,
    autoStartDelay: 1500,
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tenderDraft, setTenderDraft] = useState<Record<string, any>>({});
  const [showPreview, setShowPreview] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [statusText, setStatusText] = useState("Ready to help you create an RFP");
  const [currentStep, setCurrentStep] = useState(0);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [marketplaceOptions, setMarketplaceOptions] = useState<MarketplaceOptions>({
    enabled: false,
    tenderType: 'open_tender',
    documentFee: '',
    inquiryDeadline: '',
    confirmed: false,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAddedStreamingActivity = useRef(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionPromise = useRef<Promise<string | null> | null>(null);
  const loadedSessionRef = useRef<string | null>(null);

  const firstName = user?.name?.split(" ")[0] || user?.username || "there";

  useEffect(() => {
    if (sessionParam && sessionParam !== loadedSessionRef.current) {
      loadedSessionRef.current = sessionParam;
      const loadSession = async () => {
        try {
          const res = await apiRequest("GET", `/api/ai-chat-sessions/${sessionParam}`);
          const data = await res.json();
          setMessages(data.messages?.length ? data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            suggestions: m.suggestions || undefined,
            tenderData: m.tenderData || undefined,
          })) : []);
          if (data.tenderData) {
            setTenderDraft(data.tenderData as Record<string, any>);
          }
          setSessionId(sessionParam);
        } catch (e) {
          console.error("Failed to load session:", e);
        }
      };
      loadSession();
    } else if (!sessionParam && loadedSessionRef.current) {
      loadedSessionRef.current = null;
      setSessionId(null);
      setMessages([]);
      setTenderDraft({});
      setIsReady(false);
      setOrbState("idle");
      setStatusText("Ready to help you create an RFP");
      setCurrentStep(0);
      setActivityLog([]);
      sessionPromise.current = null;
    }
  }, [sessionParam]);

  const ensureSession = useCallback(async (firstMessage?: string): Promise<string | null> => {
    if (sessionId) return sessionId;
    if (sessionPromise.current) return sessionPromise.current;
    const promise = (async () => {
      try {
        const title = firstMessage
          ? firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "..." : "")
          : "New AI Chat";
        const res = await apiRequest("POST", "/api/ai-chat-sessions", { title });
        const session = await res.json();
        setSessionId(session.id);
        queryClient.invalidateQueries({ queryKey: ["/api/ai-chat-sessions"] });
        return session.id as string;
      } catch (e) {
        console.error("Failed to create session:", e);
        return null;
      } finally {
        sessionPromise.current = null;
      }
    })();
    sessionPromise.current = promise;
    return promise;
  }, [sessionId]);

  const persistMessage = useCallback(async (sid: string, role: string, content: string, suggestions?: string[], tData?: Record<string, any>) => {
    try {
      await apiRequest("POST", `/api/ai-chat-sessions/${sid}/messages`, {
        role,
        content,
        suggestions: suggestions || null,
        tenderData: tData || null,
      });
    } catch (e) {
      console.error("Failed to persist message:", e);
    }
  }, []);

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
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Add activity log entry with specific details
  const addActivity = useCallback((
    type: ActivityLogItem["type"],
    title: string,
    detail?: string,
    status: ActivityLogItem["status"] = "completed"
  ) => {
    const newActivity: ActivityLogItem = {
      id: Date.now().toString(),
      type,
      title,
      detail,
      status,
      timestamp: new Date(),
    };
    setActivityLog((prev) => [newActivity, ...prev].slice(0, 10));
  }, []);

  // Update activity status
  const updateActivity = useCallback((id: string, status: ActivityLogItem["status"]) => {
    setActivityLog((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }, []);

  const processStreamResponse = async (response: Response, sid?: string | null) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let latestTenderData: Record<string, any> | null = null;
    const messageId = Date.now().toString();

    // Reset the streaming activity flag
    hasAddedStreamingActivity.current = false;

    setMessages((prev) => [
      ...prev,
      { id: messageId, role: "assistant", content: "", isStreaming: true },
    ]);

    // Simulate thinking phases
    setOrbState("thinking");
    setStatusText("Analyzing your requirements...");
    setCurrentStep(1);

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

            // Update to speaking state when content starts flowing (only once)
            if (fullContent.length > 20 && !hasAddedStreamingActivity.current) {
              hasAddedStreamingActivity.current = true;
              setOrbState("speaking");
              setStatusText("Generating your RFP...");
              setCurrentStep(2);
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, content: fullContent } : m
              )
            );
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
                      isStreaming: false,
                    }
                  : m
              )
            );

            if (parsed.tenderData) {
              setTenderDraft((prev) => {
                latestTenderData = { ...prev, ...parsed.tenderData };
                return latestTenderData;
              });
              const updatedFields = Object.keys(parsed.tenderData);
              if (updatedFields.includes('title')) {
                addActivity("generating", "Generated RFP title", parsed.tenderData.title);
              }
              if (updatedFields.includes('serviceDescription')) {
                addActivity("generating", "Created service description", parsed.tenderData.serviceDescription?.slice(0, 80) + "...");
              }
              if (updatedFields.includes('budget')) {
                const budget = parsed.tenderData.budget;
                const budgetStr = typeof budget === 'object'
                  ? `${budget.min?.toLocaleString()} - ${budget.max?.toLocaleString()} SAR`
                  : `${budget?.toLocaleString()} SAR`;
                addActivity("extracting", "Identified budget range", budgetStr);
              }
              if (updatedFields.includes('timeline')) {
                addActivity("extracting", "Set project timeline", parsed.tenderData.timeline);
              }
              if (updatedFields.includes('deliverables')) {
                addActivity("generating", "Defined deliverables", `${parsed.tenderData.deliverables?.length} items identified`);
              }
              if (updatedFields.includes('submissionDeadline')) {
                addActivity("updating", "Set submission deadline", parsed.tenderData.submissionDeadline);
              }
            }

            if (parsed.readyToLaunch) {
              setIsReady(true);
              setOrbState("success");
              setStatusText("Your RFP is ready to launch!");
              setCurrentStep(4); // All steps complete
              addActivity("complete", "RFP ready to launch", "All required fields have been filled");
            } else {
              setOrbState("idle");
              setStatusText("How can I help you further?");
              setCurrentStep(4); // Mark all steps as complete for this response cycle
            }
          } else if (event.done && event.raw) {
            try {
              const parsed = JSON.parse(event.raw);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === messageId
                    ? { ...m, content: parsed.message || event.raw, isStreaming: false }
                    : m
                )
              );
            } catch {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === messageId ? { ...m, content: fullContent, isStreaming: false } : m
                )
              );
            }
            setOrbState("idle");
            setStatusText("Ready to help");
            setCurrentStep(4); // Mark all steps as complete
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    if (sid && fullContent) {
      persistMessage(sid, "assistant", fullContent);
      if (latestTenderData && Object.keys(latestTenderData).length > 0) {
        apiRequest("PATCH", `/api/ai-chat-sessions/${sid}`, { tenderData: latestTenderData }).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ["/api/ai-chat-sessions"] });
    }
  };

  const sendInitialMessage = async () => {
    setIsLoading(true);
    setOrbState("thinking");
    setStatusText("Getting ready to help you...");

    try {
      const sid = await ensureSession("RFP Creation Assistant");

      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: null,
          companyData,
          chatHistory: [],
          tenderDraft,
        }),
      });

      await processStreamResponse(response, sid);
    } catch (error) {
      console.error("Error sending initial message:", error);
      setOrbState("error");
      setStatusText("Something went wrong. Click to retry.");
    } finally {
      setIsLoading(false);
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
    setOrbState("listening");
    setStatusText("Processing your request...");
    setCurrentStep(0);

    try {
      const sid = await ensureSession(content.trim());
      if (sid) {
        persistMessage(sid, "user", content.trim());
      }

      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content.trim(),
          companyData,
          chatHistory: [...chatHistory, { role: "user", content: content.trim() }],
          tenderDraft,
        }),
      });

      await processStreamResponse(response, sid);
    } catch (error) {
      console.error("Error sending message:", error);
      setOrbState("error");
      setStatusText("Failed to send message");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleQuickAction = (prompt: string) => {
    if (messages.length === 0) {
      sendInitialMessage();
      setTimeout(() => sendMessage(prompt), 500);
    } else {
      sendMessage(prompt);
    }
  };

  const handleLaunchTender = async () => {
    if (marketplaceOptions.enabled && !marketplaceOptions.confirmed) {
      toast({
        title: t('marketplace.confirmRequired') || 'Confirmation required',
        description: t('marketplace.confirmRequiredDesc') || 'Please confirm the marketplace binding commitment before publishing.',
        variant: "destructive",
      });
      return;
    }

    setOrbState("thinking");
    setStatusText("Launching your RFP...");
    addActivity("generating", "Creating your RFP", tenderDraft.title || "New RFP", "in_progress");

    try {
      const token = localStorage.getItem("token");
      const bodyData: Record<string, any> = { ...tenderDraft };
      if (marketplaceOptions.enabled) {
        bodyData.publishToMarketplace = true;
        bodyData.marketplaceTenderType = marketplaceOptions.tenderType;
        if (marketplaceOptions.documentFee !== '') {
          bodyData.marketplaceDocumentFee = parseInt(marketplaceOptions.documentFee, 10);
        }
        if (marketplaceOptions.inquiryDeadline) {
          bodyData.marketplaceInquiryDeadline = new Date(marketplaceOptions.inquiryDeadline).toISOString();
        }
      }
      const response = await fetch("/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: JSON.stringify(bodyData),
      });

      if (response.ok) {
        const createdTender = await response.json();
        setOrbState("success");
        setStatusText("RFP launched successfully!");
        addActivity("complete", "RFP published!", "Your RFP is now live and accepting bids");
        const inviteLink = `${window.location.origin}/invite/${createdTender.invitationToken}`;
        toast({
          title: "RFP published!",
          description: "Your RFP is now live and accepting bids.",
          action: (
            <ToastAction altText="Copy invitation link" onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: "Link copied!" }); }}>
              <Copy className="h-3 w-3 mr-1" /> Copy Link
            </ToastAction>
          ),
          duration: 10000,
        });
        setTimeout(() => navigate("/dashboard"), 3000);
      }
    } catch (error) {
      console.error("Error creating tender:", error);
      setOrbState("error");
      setStatusText("Failed to launch RFP");
    }
  };

  const handleReset = () => {
    setMessages([]);
    setTenderDraft({});
    setIsReady(false);
    setOrbState("idle");
    setStatusText("Ready to help you create an RFP");
    setCurrentStep(0);
    setActivityLog([]);
    setSessionId(null);
    sessionPromise.current = null;
    loadedSessionRef.current = null;
  };

  const handleOrbClick = () => {
    if (messages.length === 0) {
      sendInitialMessage();
    }
  };

  const hasPreviewContent = Object.keys(tenderDraft).length > 0;
  const progressPercentage = isReady ? 100 : hasPreviewContent ? 60 : messages.length > 0 ? 30 : 0;

  return (
    <>
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Flickering Grid Background - matches /tenders/new */}
      <div className="absolute inset-0 z-0">
        <FlickeringGrid
          className="size-full"
          squareSize={4}
          gridGap={6}
          color="rgb(226, 94, 69)"
          maxOpacity={0.1}
          flickerChance={0.08}
        />
      </div>

      {/* Header */}
      <header className="h-14 border-b border-gray-200/50 dark:border-gray-800/50 px-4 flex items-center justify-between shrink-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl relative z-50">
        <div className="flex items-center gap-3">
          <img
            src={logoPath}
            alt="Bid"
            className="h-8 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/dashboard")}
          />
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              AI Agent
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Start Over
            </Button>
          )}
          {hasPreviewContent && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPreview(!showPreview)}
              className="text-gray-500"
              data-tour="preview-toggle"
            >
              {showPreview ? (
                <PanelRightClose className="h-5 w-5" />
              ) : (
                <PanelRightOpen className="h-5 w-5" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/tenders/new")}
            className="text-gray-500"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-100/80 dark:bg-gray-800/80 relative z-10">
        <motion.div
          className="h-full bg-gradient-to-r from-[#E25E45] to-[#fb923c]"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Left Panel - Chat & Orb */}
        <div className="flex-1 flex flex-col bg-transparent">
          <ScrollArea className="flex-1">
            <div className="max-w-3xl mx-auto px-4 py-6">
              {/* Initial State - Show Orb and Quick Actions */}
              {messages.length === 0 ? (
                <motion.div
                  className="flex flex-col items-center justify-center min-h-[60vh]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* AI Orb - same size as /tenders/new (100) */}
                  <div data-tour="chat-orb">
                  <AIAgentOrb
                    state={orbState}
                    size={100}
                    statusText={statusText}
                    onClick={handleOrbClick}
                  />
                  </div>

                  {/* Welcome Message */}
                  <motion.div
                    className="text-center mt-8 mb-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Hey {firstName}, let's create something great
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md">
                      Click on the orb or choose a quick action below to get started. I'll help you create a professional RFP in minutes.
                    </p>
                  </motion.div>

                  {/* Quick Actions Grid */}
                  <motion.div
                    className="grid grid-cols-2 gap-3 w-full max-w-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    data-tour="quick-actions"
                  >
                    {quickActions.map((action, idx) => (
                      <motion.button
                        key={idx}
                        onClick={() => handleQuickAction(action.prompt)}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-xl border border-gray-200/80 dark:border-gray-700/80 transition-all hover:scale-[1.02] hover:shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm",
                          action.color
                        )}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <action.icon className="h-5 w-5" />
                        <span className="font-medium text-sm">{action.label}</span>
                        <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                      </motion.button>
                    ))}
                  </motion.div>

                  {/* Or Type Custom */}
                  <motion.p
                    className="text-sm text-gray-400 mt-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Or type your own request below
                  </motion.p>
                </motion.div>
              ) : (
                /* Chat Messages */
                <div className="space-y-6">
                  {/* Compact Orb for active chat */}
                  <motion.div
                    className="flex justify-center mb-4"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <AIAgentOrb
                      state={orbState}
                      size={80}
                      statusText={isLoading ? statusText : undefined}
                    />
                  </motion.div>

                  {/* Task Progress Steps - stays visible after completion */}
                  <motion.div
                    className="flex justify-center gap-2 mb-6 flex-wrap"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {taskSteps.map((step, idx) => {
                      const isActive = isLoading && idx === currentStep;
                      const isCompleted = currentStep > idx || (currentStep === 4 && !isLoading);
                      const isPending = isLoading && idx > currentStep;

                      return (
                        <motion.div
                          key={step.id}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all backdrop-blur-sm",
                            isActive && "bg-[#E25E45]/15 text-[#E25E45] border border-[#E25E45]/30",
                            isCompleted && "bg-green-500/10 text-green-600 border border-green-500/20",
                            isPending && "bg-white/60 text-gray-400 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50",
                            !isLoading && !isCompleted && "bg-white/60 text-gray-400 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50"
                          )}
                          animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                          transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
                        >
                          {isCompleted ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", duration: 0.3 }}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </motion.div>
                          ) : isActive ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            >
                              <step.icon className="h-3 w-3" />
                            </motion.div>
                          ) : (
                            <step.icon className="h-3 w-3" />
                          )}
                          {step.label}
                        </motion.div>
                      );
                    })}
                  </motion.div>

                  {/* Messages */}
                  {messages.map((message, idx) => (
                    <motion.div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E25E45] to-[#ff8066] flex items-center justify-center shrink-0 shadow-lg">
                          <Sparkles className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] relative",
                          message.role === "user"
                            ? "bg-[#E25E45] text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-lg"
                            : "bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl rounded-tl-md px-4 py-3 shadow-md border border-gray-100 dark:border-gray-700"
                        )}
                      >
                        <p
                          className={cn(
                            "text-[15px] leading-relaxed whitespace-pre-wrap",
                            message.role === "assistant" && "text-gray-900 dark:text-white"
                          )}
                        >
                          {message.content}
                          {message.isStreaming && (
                            <motion.span
                              className="inline-block w-0.5 h-4 bg-[#E25E45] ml-0.5"
                              animate={{ opacity: [1, 0, 1] }}
                              transition={{ duration: 0.8, repeat: Infinity }}
                            />
                          )}
                        </p>

                        {/* Suggestions */}
                        {message.suggestions && message.suggestions.length > 0 && (
                          <motion.div
                            className="mt-4 flex flex-wrap gap-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                          >
                            {message.suggestions.map((suggestion, sidx) => (
                              <motion.button
                                key={sidx}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 transition-all hover:border-[#E25E45] hover:text-[#E25E45] flex items-center gap-2"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                {suggestion}
                                <ChevronRight className="h-3 w-3" />
                              </motion.button>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* Inline Activity - shows in chat when AI is working */}
                  {activityLog.length > 0 && (
                    <InlineActivity
                      activities={activityLog}
                      isExpanded={activityExpanded}
                      onToggle={() => setActivityExpanded(!activityExpanded)}
                    />
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-gray-200/50 dark:border-gray-800/50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl p-4">
            <div className="max-w-3xl mx-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (messages.length === 0 && input.trim()) {
                    sendInitialMessage();
                    setTimeout(() => sendMessage(input), 300);
                  } else {
                    sendMessage(input);
                  }
                }}
                className="flex items-center gap-3"
              >
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      messages.length === 0
                        ? "Describe what you need... (e.g., 'I need a website redesign')"
                        : "Type your message..."
                    }
                    disabled={isLoading}
                    className="pr-24 h-12 text-[15px] border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus-visible:ring-[#E25E45] shadow-sm"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsListening(!isListening)}
                      className={cn(
                        "h-8 w-8 p-0 rounded-lg",
                        isListening && "bg-red-100 text-red-600"
                      )}
                    >
                      {isListening ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isLoading || !input.trim()}
                      className="h-8 w-8 p-0 bg-[#E25E45] hover:bg-[#d54d35] rounded-lg"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {isReady && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3 w-full max-w-md"
                  >
                    <div className="w-full">
                      <MarketplacePublishOption
                        value={marketplaceOptions}
                        onChange={setMarketplaceOptions}
                        deadline={tenderDraft.submissionDeadline || tenderDraft.deadline}
                        language={i18nLang}
                        isRtl={i18nIsRtl}
                        t={t}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleLaunchTender}
                      disabled={marketplaceOptions.enabled && !marketplaceOptions.confirmed}
                      className="h-12 px-6 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 rounded-xl gap-2 shadow-lg shadow-green-500/25"
                    >
                      <Rocket className="h-4 w-4" />
                      Launch RFP
                    </Button>
                  </motion.div>
                )}
              </form>

              {/* Quick Reply Chips */}
              {messages.length > 0 && !isLoading && !isReady && (
                <motion.div
                  className="flex flex-wrap gap-2 mt-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {["Add more details", "Change budget", "Set deadline", "Add requirements"].map(
                    (chip) => (
                      <button
                        key={chip}
                        onClick={() => sendMessage(chip)}
                        className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400 transition-colors"
                      >
                        {chip}
                      </button>
                    )
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Full Vendor View Preview */}
        <AnimatePresence>
          {showPreview && (hasPreviewContent || messages.length > 0) && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 480, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-l border-gray-200/50 dark:border-gray-800/50 bg-gray-50 dark:bg-gray-900 overflow-hidden"
            >
              <div className="w-[480px] h-full overflow-y-auto">
                {hasPreviewContent ? (
                  <div className="p-4 space-y-4">
                    {/* Tender Header */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {tenderDraft.title || "Untitled RFP"}
                      </h1>
                      <p className="text-sm text-gray-500">
                        {companyData.name || "Your Company"} • {companyData.city || "Location"}
                      </p>
                    </motion.div>

                    {/* Description Card */}
                    <motion.div
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                    >
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Description</h3>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {tenderDraft.serviceDescription || "No description provided yet."}
                        </p>
                      </div>
                    </motion.div>

                    {/* Tender Details Card */}
                    <motion.div
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">RFP Details</h3>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-start gap-3">
                            <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-500">Submission Deadline</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {tenderDraft.submissionDeadline || "Not set"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-500">Budget Range</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {tenderDraft.budget
                                  ? typeof tenderDraft.budget === "object"
                                    ? `${tenderDraft.budget.min?.toLocaleString()} - ${tenderDraft.budget.max?.toLocaleString()} SAR`
                                    : `${tenderDraft.budget.toLocaleString()} SAR`
                                  : "Not specified"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-500">Project Timeline</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {tenderDraft.timeline || "Not specified"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-500">Category</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {companyData.category || "Not specified"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Deliverables Card */}
                    {tenderDraft.deliverables && tenderDraft.deliverables.length > 0 && (
                      <motion.div
                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                      >
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Key Deliverables
                          </h3>
                        </div>
                        <div className="p-4">
                          <ul className="space-y-2">
                            {tenderDraft.deliverables.map((d: string, i: number) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}

                    {/* Submit Offer CTA Card */}
                    <motion.div
                      className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="px-4 py-3 border-b border-blue-100 dark:border-blue-800">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Submit Your Proposal
                        </h3>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Submit your technical and financial Proposal for this RFP.
                        </p>
                      </div>
                      <div className="p-4">
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          disabled
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Submit Proposal
                        </Button>
                      </div>
                    </motion.div>

                    {/* Missing Fields */}
                    {!isReady && (
                      <motion.div
                        className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.25 }}
                      >
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-400 mb-2">
                          Missing required fields:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {!tenderDraft.title && (
                            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">Title</span>
                          )}
                          {!tenderDraft.serviceDescription && (
                            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">Description</span>
                          )}
                          {!tenderDraft.budget && (
                            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">Budget</span>
                          )}
                          {!tenderDraft.submissionDeadline && (
                            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">Deadline</span>
                          )}
                          {(!tenderDraft.deliverables || tenderDraft.deliverables.length === 0) && (
                            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">Deliverables</span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  /* Empty State */
                  <div className="flex flex-col items-center justify-center h-[calc(100%-56px)] text-center p-6">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4"
                    >
                      <FileText className="h-8 w-8 text-gray-400" />
                    </motion.div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      No preview yet
                    </h4>
                    <p className="text-xs text-gray-500 max-w-[200px]">
                      Start chatting with the AI to build your RFP. The preview will update in real-time.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    {tourOverlay}
    </>
  );
}
