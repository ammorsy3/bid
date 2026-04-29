import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  Paperclip,
  Pencil,
  ChevronDown,
  ChevronUp,
  Shield,
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
import { TenderBriefCards } from "@/components/TenderBriefCards";
import { draftToTenderPayload } from "@shared/tender-mapping";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  tenderData?: Record<string, any>;
  isStreaming?: boolean;
}

// Merge an incoming LLM-produced patch into the tender draft. Treats explicit
// `null` as a delete so the user can correct a hallucinated field instead of
// being stuck with it. Undefined keys are left untouched.
function mergeDraft(
  prev: Record<string, any>,
  patch: Record<string, any>,
): Record<string, any> {
  const next = { ...prev };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) {
      delete next[k];
    } else if (v !== undefined) {
      next[k] = v;
    }
  }
  return next;
}

// Writes the AI draft into the same localStorage shape the manual wizard
// produces, so clicking "Edit in full builder" lands on /tenders/new/brief
// with everything pre-filled. BriefStep reads some legacy key names (e.g.
// `projectObjective` instead of `objective`, `keyDeliverables` instead of
// `deliverables`), so we write BOTH the schema name and the legacy name.
function draftToLocalStorageDraft(
  draft: Record<string, any>,
  mapped: Record<string, any>,
): Record<string, any> {
  const ls: Record<string, any> = { ...mapped };
  if (mapped.description) ls.projectDescription = mapped.description;
  if (mapped.objective) ls.projectObjective = mapped.objective;
  if (mapped.deliverables) ls.keyDeliverables = mapped.deliverables;
  // BriefStep flows back through earlier steps if user clicks back; keep the
  // raw LLM fields alongside so those steps find their expected keys.
  if (typeof draft.budgetType === "string") ls.budgetType = draft.budgetType;
  if (typeof draft.projectObjective === "string") ls.projectObjective = draft.projectObjective;
  return ls;
}

// ============================================================================
// Attachments panel — audio, video URL, file uploads. Writes into tenderDraft
// via `onChange`. The AI prompt is explicit that the model does NOT invent
// these URLs; this panel is the only path that populates them.
// ============================================================================

const AttachmentsPanel: React.FC<{
  draft: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
}> = ({ draft, onChange }) => {
  const { toast } = useToast();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [videoInput, setVideoInput] = useState<string>(draft.videoUrl ?? "");
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const attachments: any[] = Array.isArray(draft.attachments) ? draft.attachments : [];

  const commitVideo = () => {
    const v = videoInput.trim();
    onChange({ videoUrl: v ? v : null });
  };

  // Upload via presigned URL (Replit Object Storage). Mirrors ObjectUploader's
  // contract: POST /api/objects/upload returns { uploadURL }, then PUT the file
  // bytes to that URL. After the PUT, call PUT /api/objects/metadata to
  // register ACL ownership and obtain the canonical "/objects/<entity-id>"
  // path — that's the only URL form the public RFP page can actually fetch
  // back later (the presigned URL is PUT-only and time-limited).
  const uploadOne = async (file: File): Promise<{ url: string } | null> => {
    const res = await apiRequest("POST", "/api/objects/upload", { fileSize: file.size, fileType: file.type });
    const { uploadURL } = await res.json();
    if (!uploadURL) throw new Error("No upload URL returned");
    const put = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
    const metaRes = await apiRequest("PUT", "/api/objects/metadata", { fileURL: uploadURL });
    const { objectPath } = await metaRes.json();
    return { url: objectPath };
  };

  const MAX_BYTES = 10 * 1024 * 1024;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setUploadingCount((n) => n + list.length);
    try {
      const uploaded: any[] = [];
      for (const file of list) {
        if (file.size > MAX_BYTES) {
          toast({
            title: t('copilot.fileTooLarge'),
            description: t('copilot.fileTooLargeDesc', { name: file.name }),
            variant: "destructive",
          });
          continue;
        }
        try {
          const { url } = (await uploadOne(file)) ?? { url: "" };
          if (!url) continue;
          uploaded.push({
            id: `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            url,
            size: file.size,
            type: file.type || "application/octet-stream",
          });
        } catch (err) {
          console.error("Attachment upload failed:", err);
          toast({
            title: t('copilot.uploadFailed'),
            description: t('copilot.uploadFailedDesc', { name: file.name }),
            variant: "destructive",
          });
        }
      }
      if (uploaded.length > 0) {
        onChange({ attachments: [...attachments, ...uploaded] });
      }
    } finally {
      setUploadingCount((n) => Math.max(0, n - list.length));
    }
  };

  const removeAttachment = (id: string) => {
    const next = attachments.filter((a) => a.id !== id);
    onChange({ attachments: next.length > 0 ? next : null });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('copilot.attachFiles')}</span>
          {(attachments.length > 0 || draft.voiceNoteUrl || draft.videoUrl) && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {attachments.length + (draft.voiceNoteUrl ? 1 : 0) + (draft.videoUrl ? 1 : 0)}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('copilot.videoExplainerUrl')}</label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://..."
                value={videoInput}
                onChange={(e) => setVideoInput(e.target.value)}
                onBlur={commitVideo}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('copilot.supportingDocs')}</label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { handleFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ""; }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingCount > 0}
              className="h-9"
            >
              <Paperclip className="h-3.5 w-3.5 mr-1.5" />
              {uploadingCount > 0
                ? t('copilot.uploading', { n: uploadingCount })
                : t('copilot.addFiles')}
            </Button>
            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1">
                {attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <Paperclip className="h-3 w-3 text-gray-400 shrink-0" />
                    <span className="truncate flex-1">{a.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      className="text-gray-400 hover:text-rose-500"
                      aria-label={t('copilot.remove')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-[11px] text-gray-400 leading-snug">
            {t('copilot.attachmentsHelp')}
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Missing-fields alert — expanded to match the server-side readiness gate.
// ============================================================================

const REQUIRED_CHIPS: Array<{ key: string; tKey: string; check: (m: Record<string, any>) => boolean }> = [
  { key: "title", tKey: "reqTitle", check: (m) => !!m.title },
  { key: "description", tKey: "reqDescription", check: (m) => typeof m.description === "string" && m.description.trim().split(/\s+/).length >= 50 },
  { key: "deadline", tKey: "reqDeadline", check: (m) => !!m.deadline },
  { key: "budget", tKey: "reqBudget", check: (m) => m.budget != null || Number.isFinite(m.budgetMin) || Number.isFinite(m.budgetMax) },
  { key: "deliverables", tKey: "reqDeliverables", check: (m) => Array.isArray(m.deliverables) && m.deliverables.length >= 2 },
  { key: "submissionType", tKey: "reqSubmissionType", check: (m) => !!m.submissionType },
  { key: "inquiryType", tKey: "reqInquiryType", check: (m) => !!m.inquiryType },
];

const MissingFieldsAlert: React.FC<{ mapped: Record<string, any> }> = ({ mapped }) => {
  const { t } = useI18n();
  const missing = REQUIRED_CHIPS.filter((c) => !c.check(mapped));
  if (missing.length === 0) return null;
  return (
    <motion.div
      className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <p className="text-xs font-medium text-amber-800 dark:text-amber-400 mb-2">
        {t('copilot.stillMissing')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {missing.map((c) => (
          <span
            key={c.key}
            className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full"
          >
            {t(`copilot.${c.tKey}`)}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

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
  const { t } = useI18n();
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
          aria-expanded={isExpanded}
          aria-label={isExpanded ? t('copilot.a11yCollapseActivity') : t('copilot.a11yExpandActivity')}
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
                  {t('copilot.activityProcessing')}
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
              className="mt-2 ml-4 pl-4 border-l-2 border-gray-200/50 dark:border-gray-700/50 space-y-2 max-h-72 overflow-y-auto"
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

// Quick action templates — labels/prompts pulled via t() inside the component.
const quickActionDefs: Array<{ key: string; icon: any; color: string }> = [
  { key: "qaMarketing", icon: Building2, color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20" },
  { key: "qaIt", icon: Package, color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20" },
  { key: "qaHr", icon: Users, color: "bg-green-500/10 text-green-600 hover:bg-green-500/20" },
  { key: "qaCreative", icon: Lightbulb, color: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20" },
];

// Task steps for progress visualization — labels via t().
const taskStepDefs: Array<{ id: string; tKey: string; icon: any }> = [
  { id: "understand", tKey: "stepUnderstand", icon: Target },
  { id: "analyze", tKey: "stepAnalyze", icon: Zap },
  { id: "generate", tKey: "stepGenerate", icon: FileText },
  { id: "review", tKey: "stepReview", icon: CheckCircle2 },
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
  const [statusText, setStatusText] = useState<string>(() => t('copilot.statusReady'));
  const [currentStep, setCurrentStep] = useState(0);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [marketplaceOptions, setMarketplaceOptions] = useState<MarketplaceOptions>({
    enabled: false,
    tenderType: 'open_tender',
    documentFee: '',
    inquiryDeadline: '',
    poFiles: [],
    confirmed: false,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAddedStreamingActivity = useRef(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionPromise = useRef<Promise<string | null> | null>(null);
  const loadedSessionRef = useRef<string | null>(null);
  const [persistFailed, setPersistFailed] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const firstName = user?.name?.split(" ")[0] || user?.username || t('copilot.greetFallbackName');

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
          loadedSessionRef.current = null;
          toast({
            title: t('copilot.sessionLoadFailed'),
            description: t('copilot.sessionLoadFailedDesc'),
            variant: "destructive",
            action: (
              <ToastAction altText={t('copilot.retry')} onClick={() => { loadedSessionRef.current = null; setSessionId(null); navigate(`/tenders/new/ai?session=${sessionParam}`); }}>
                {t('copilot.retry')}
              </ToastAction>
            ),
          });
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
      setStatusText(t('copilot.statusReady'));
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
          : t('copilot.activityNewRfp');
        const res = await apiRequest("POST", "/api/ai-chat-sessions", { title });
        const session = await res.json();
        setSessionId(session.id);
        queryClient.invalidateQueries({ queryKey: ["/api/ai-chat-sessions"] });
        return session.id as string;
      } catch (e: any) {
        console.error("Failed to create session:", e);
        const status = typeof e?.statusCode === "number" ? e.statusCode : undefined;
        toast({
          title: status === 409
            ? t('copilot.sessionLimit')
            : t('copilot.sessionCreateFailed'),
          description: status === 409
            ? (e?.message || t('copilot.sessionLimitDesc'))
            : t('copilot.sessionCreateFailedDesc'),
          variant: "destructive",
          action: status === 409 ? (
            <ToastAction altText={t('copilot.manageChats') || 'Manage chats'} onClick={() => navigate('/dashboard')}>
              {t('copilot.manageChats') || 'Manage chats'}
            </ToastAction>
          ) : undefined,
        });
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
      setPersistFailed(true);
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

  // Re-translate the idle status text when the user toggles language so the
  // orb caption doesn't get stuck in the previous language.
  useEffect(() => {
    if (orbState === "idle" && messages.length === 0) {
      setStatusText(t('copilot.statusReady'));
    }
  }, [i18nLang, orbState, messages.length, t]);

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
    setActivityLog((prev) => [newActivity, ...prev]);
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
    setStatusText(t('copilot.statusAnalyzing'));
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
              setStatusText(t('copilot.statusGenerating'));
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
                latestTenderData = mergeDraft(prev, parsed.tenderData);
                return latestTenderData;
              });
              const updatedFields = Object.keys(parsed.tenderData);
              const sarLabel = i18nLang === 'ar' ? 'ر.س' : 'SAR';
              if (updatedFields.includes('title')) {
                addActivity("generating", t('copilot.activityGenTitle'), parsed.tenderData.title);
              }
              if (updatedFields.includes('serviceDescription')) {
                addActivity("generating", t('copilot.activityCreatedDesc'), parsed.tenderData.serviceDescription?.slice(0, 80) + "...");
              }
              if (updatedFields.includes('budget')) {
                const budget = parsed.tenderData.budget;
                const budgetStr = typeof budget === 'object'
                  ? `${budget.min?.toLocaleString()} - ${budget.max?.toLocaleString()} ${sarLabel}`
                  : `${budget?.toLocaleString()} ${sarLabel}`;
                addActivity("extracting", t('copilot.activityIdBudget'), budgetStr);
              }
              if (updatedFields.includes('timeline')) {
                addActivity("extracting", t('copilot.activitySetTimeline'), parsed.tenderData.timeline);
              }
              if (updatedFields.includes('deliverables')) {
                addActivity("generating", t('copilot.activityDefDeliverables'), t('copilot.activityDeliverablesCount', { count: parsed.tenderData.deliverables?.length ?? 0 }));
              }
              if (updatedFields.includes('submissionDeadline')) {
                addActivity("updating", t('copilot.activitySetDeadline'), parsed.tenderData.submissionDeadline);
              }
            }

            if (parsed.readyToLaunch) {
              setIsReady(true);
              setOrbState("success");
              setStatusText(t('copilot.statusReadyToLaunch'));
              setCurrentStep(4); // All steps complete
              addActivity("complete", t('copilot.activityReady'), t('copilot.activityReadyDetail'));
            } else {
              setOrbState("idle");
              setStatusText(t('copilot.statusHowElse'));
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
            setStatusText(t('copilot.statusReadyShort'));
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
    setStatusText(t('copilot.statusGettingReady'));

    try {
      const sid = await ensureSession();

      const token = localStorage.getItem("token");
      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: null,
          companyData,
          chatHistory: [],
          tenderDraft,
          language: i18nLang,
        }),
      });

      await processStreamResponse(response, sid);
    } catch (error) {
      console.error("Error sending initial message:", error);
      setOrbState("error");
      setStatusText(t('copilot.statusError'));
      toast({
        title: t('copilot.startFailed'),
        description: t('copilot.startFailedDesc'),
        variant: "destructive",
        action: (
          <ToastAction altText={t('copilot.retry')} onClick={() => sendInitialMessage()}>
            {t('copilot.retry')}
          </ToastAction>
        ),
      });
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
    setStatusText(t('copilot.statusProcessing'));
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

      const token = localStorage.getItem("token");
      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: content.trim(),
          companyData,
          chatHistory: [...chatHistory, { role: "user", content: content.trim() }],
          tenderDraft,
          language: i18nLang,
        }),
      });

      await processStreamResponse(response, sid);
    } catch (error) {
      console.error("Error sending message:", error);
      setOrbState("error");
      setStatusText(t('copilot.statusFailedSend'));
      toast({
        title: t('copilot.sendFailed'),
        description: t('copilot.sendFailedDesc'),
        variant: "destructive",
        action: (
          <ToastAction altText={t('copilot.retry')} onClick={() => sendMessage(content)}>
            {t('copilot.retry')}
          </ToastAction>
        ),
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleQuickAction = (prompt: string) => {
    // Send the prompt directly — the AI handles "first message of a new conversation"
    // naturally without needing an empty greeting turn first. Removes a setTimeout race.
    sendMessage(prompt);
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
    setStatusText(t('copilot.statusLaunching'));
    addActivity("generating", t('copilot.activityCreating'), tenderDraft.title || t('copilot.activityNewRfp'), "in_progress");

    try {
      const token = localStorage.getItem("token");
      const bodyData: Record<string, any> = draftToTenderPayload(tenderDraft, {
        language: i18nLang,
        emailFallback: user?.email || undefined,
      });
      if (marketplaceOptions.enabled) {
        bodyData.publishToMarketplace = true;
        bodyData.marketplaceTenderType = marketplaceOptions.tenderType;
        if (marketplaceOptions.documentFee !== '') {
          bodyData.marketplaceDocumentFee = parseInt(marketplaceOptions.documentFee, 10);
        }
        if (marketplaceOptions.inquiryDeadline) {
          bodyData.marketplaceInquiryDeadline = new Date(marketplaceOptions.inquiryDeadline).toISOString();
        }
        if (marketplaceOptions.poFiles.length > 0) {
          bodyData.marketplacePoFiles = marketplaceOptions.poFiles;
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
        setStatusText(t('copilot.statusLaunchSuccess'));
        addActivity("complete", t('copilot.activityPublished'), t('copilot.activityPublishedDetail'));
        const inviteLink = `${window.location.origin}/invite/${createdTender.invitationToken}`;
        toast({
          title: t('copilot.publishedTitle'),
          description: t('copilot.publishedDesc'),
          action: (
            <ToastAction altText={t('copilot.copyInvitationLink')} onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: t('copilot.linkCopied') }); }}>
              <Copy className="h-3 w-3 mr-1" /> {t('copilot.copyLink')}
            </ToastAction>
          ),
          duration: 10000,
        });
        setTimeout(() => navigate("/dashboard"), 3000);
      } else {
        let serverMessage = "";
        try { serverMessage = (await response.json())?.message || ""; } catch {}
        setOrbState("error");
        setStatusText(t('copilot.statusLaunchFailed'));
        toast({
          title: t('copilot.launchFailed'),
          description: serverMessage || t('copilot.launchFailedDesc'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating tender:", error);
      setOrbState("error");
      setStatusText(t('copilot.statusLaunchFailed'));
      toast({
        title: t('copilot.launchFailed'),
        description: t('copilot.launchFailedNetwork'),
        variant: "destructive",
      });
    }
  };

  const handleEditInBuilder = () => {
    const mapped = draftToTenderPayload(tenderDraft, {
      language: i18nLang,
      emailFallback: user?.email || undefined,
    });
    const lsDraft = draftToLocalStorageDraft(tenderDraft, mapped);
    try {
      localStorage.setItem("tenderDraft", JSON.stringify(lsDraft));
    } catch (e) {
      console.error("Failed to persist draft:", e);
    }
    navigate("/tenders/new/brief");
  };

  const performReset = () => {
    setMessages([]);
    setTenderDraft({});
    setIsReady(false);
    setOrbState("idle");
    setStatusText(t('copilot.statusReady'));
    setCurrentStep(0);
    setActivityLog([]);
    setSessionId(null);
    sessionPromise.current = null;
    loadedSessionRef.current = null;
    setPersistFailed(false);
    // Drop the ?session= URL param so a refresh doesn't reload the abandoned session
    if (sessionParam) navigate('/tenders/new/ai');
  };

  const handleReset = () => {
    // If there's nothing to lose (empty conversation), reset immediately
    if (messages.length === 0) {
      performReset();
      return;
    }
    setConfirmReset(true);
  };

  const handleOrbClick = () => {
    if (messages.length === 0) {
      sendInitialMessage();
    }
  };

  const hasPreviewContent = Object.keys(tenderDraft).length > 0;
  const progressPercentage = isReady ? 100 : hasPreviewContent ? 60 : messages.length > 0 ? 30 : 0;

  const mappedPreview = useMemo(
    () => draftToTenderPayload(tenderDraft, { language: i18nLang, emailFallback: user?.email || undefined }),
    [tenderDraft, i18nLang, user?.email],
  );

  return (
    <>
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Off-screen live region announces orb/status changes for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {statusText}
      </div>
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
              {t('copilot.aiAgent')}
            </span>
            <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 border border-violet-200">
              {t('copilot.beta')}
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
              {t('copilot.startOver')}
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
                      {t('copilot.welcomeTitle', { name: firstName })}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md">
                      {t('copilot.welcomeSubtitle')}
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
                    {quickActionDefs.map((action, idx) => (
                      <motion.button
                        key={action.key}
                        onClick={() => handleQuickAction(t(`copilot.${action.key}Prompt`))}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-xl border border-gray-200/80 dark:border-gray-700/80 transition-all hover:scale-[1.02] hover:shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm",
                          action.color
                        )}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <action.icon className="h-5 w-5" />
                        <span className="font-medium text-sm">{t(`copilot.${action.key}Label`)}</span>
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
                    {t('copilot.orTypeBelow')}
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
                    {taskStepDefs.map((step, idx) => {
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
                          {t(`copilot.${step.tKey}`)}
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
                          aria-live={message.isStreaming ? "polite" : undefined}
                          aria-busy={message.isStreaming || undefined}
                        >
                          {message.content}
                          {message.isStreaming && (
                            <motion.span
                              aria-hidden="true"
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
              {persistFailed && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-2">
                  <span>{t('copilot.persistFailedNotice') || "Some messages may not have been saved — refresh to verify your chat history is up to date."}</span>
                  <button
                    type="button"
                    onClick={() => setPersistFailed(false)}
                    className="text-amber-700 hover:text-amber-900 shrink-0"
                    aria-label={t('common.dismiss') || 'Dismiss'}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // Same simplification as handleQuickAction — let sendMessage be the
                  // entry point for the first turn instead of timing-out behind a greeting.
                  sendMessage(input);
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
                        ? t('copilot.placeholderInitial')
                        : t('copilot.placeholderActive')
                    }
                    disabled={isLoading}
                    className="pr-24 h-12 text-[15px] border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus-visible:ring-[#E25E45] shadow-sm"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
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
                        deadline={tenderDraft.submissionDeadline}
                        language={i18nLang}
                        isRtl={i18nIsRtl}
                        t={t}
                      />
                    </div>
                    {Array.isArray(tenderDraft.vendorRequirements) && tenderDraft.vendorRequirements.length > 0 && (
                      <div
                        className="text-xs text-gray-500 flex items-center gap-1.5"
                        data-testid="copilot-vendor-reqs-detected"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        <span>
                          {tenderDraft.vendorRequirements.filter((r: any) => r.type === 'mandatory').length} mandatory
                          {' · '}
                          {tenderDraft.vendorRequirements.filter((r: any) => r.type === 'preferred').length} preferred vendor requirements detected
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={handleLaunchTender}
                        disabled={marketplaceOptions.enabled && !marketplaceOptions.confirmed}
                        className="h-12 px-6 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 rounded-xl gap-2 shadow-lg shadow-green-500/25"
                      >
                        <Rocket className="h-4 w-4" />
                        {t('copilot.launchRfp')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleEditInBuilder}
                        className="h-12 px-4 rounded-xl gap-2 border-gray-300"
                      >
                        <Pencil className="h-4 w-4" />
                        {t('copilot.editFullBuilder')}
                      </Button>
                    </div>
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
                  {([
                    'chipMoreDetails',
                    'chipChangeBudget',
                    'chipSetDeadline',
                    'chipAddRequirements',
                  ] as const).map((chipKey) => {
                    const label = t(`copilot.${chipKey}`);
                    return (
                      <button
                        key={chipKey}
                        onClick={() => sendMessage(label)}
                        className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400 transition-colors"
                      >
                        {label}
                      </button>
                    );
                  })}
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
                    <TenderBriefCards
                      tender={mappedPreview}
                      companyName={companyData.name}
                      companyCity={companyData.city}
                    />
                    <AttachmentsPanel
                      draft={tenderDraft}
                      onChange={(patch) => setTenderDraft((prev) => mergeDraft(prev, patch))}
                    />
                    <MissingFieldsAlert mapped={mappedPreview} />
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
                      {t('copilot.noPreviewYet')}
                    </h4>
                    <p className="text-xs text-gray-500 max-w-[200px]">
                      {t('copilot.noPreviewDesc')}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('copilot.confirmResetTitle') || 'Discard this chat?'}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('copilot.confirmResetDesc') || 'This conversation, draft, and all activity will be cleared. This cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => { setConfirmReset(false); performReset(); }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('copilot.startOver') || 'Start over'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    {tourOverlay}
    </>
  );
}
