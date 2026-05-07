// Compact preview of every card the vendor view can render, driven by the
// same tender-shape payload that `POST /api/tenders` accepts. Cards hide
// themselves when their source field is empty — matching the vendor-view
// visibility logic in `client/src/pages/TenderInviteLink.tsx`.

import { motion } from "framer-motion";
import {
  Calendar,
  DollarSign,
  Clock,
  Target,
  Building2,
  FileText,
  CheckCircle2,
  Flag,
  Shield,
  Star,
  MessageSquare,
  Mic,
  Video,
  Paperclip,
  ClipboardCheck,
  Hash,
  AlignLeft,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type AnyRecord = Record<string, any>;
type TFn = (key: string, vars?: Record<string, string | number>) => string;

interface Props {
  tender: AnyRecord;
  companyName?: string;
  companyCity?: string;
}

const CATEGORY_META: Record<string, { tKey: string; color: string }> = {
  technical: { tKey: "briefCatTechnical", color: "bg-[var(--bid-orange)]" },
  financial: { tKey: "briefCatFinancial", color: "bg-green-500" },
  experience: { tKey: "briefCatExperience", color: "bg-[var(--bid-orange)]" },
};

const FORM_CARD_ICON: Record<string, any> = {
  "custom-text": Hash,
  "custom-textarea": AlignLeft,
  "custom-date": Calendar,
  "custom-select": List,
};

function Card({
  title,
  icon: Icon,
  iconClass,
  children,
}: {
  title?: string;
  icon?: any;
  iconClass?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="bg-white dark:bg-card rounded-xl border border-border dark:border-border overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {title && (
        <div className="px-4 py-3 border-b border-border dark:border-border">
          <h3 className="font-semibold text-gray-900 dark:text-foreground flex items-center gap-2 text-sm">
            {Icon && <Icon className={cn("h-4 w-4", iconClass ?? "text-muted-foreground")} />}
            {title}
          </h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

function formatBudget(tender: AnyRecord, t: TFn): string | null {
  const { budget, budgetMin, budgetMax } = tender;
  if (Number.isFinite(budgetMin) && Number.isFinite(budgetMax)) {
    return t("copilot.briefBudgetRange", {
      min: Number(budgetMin).toLocaleString(),
      max: Number(budgetMax).toLocaleString(),
    });
  }
  if (Number.isFinite(budgetMin)) return t("copilot.briefBudgetFrom", { amount: Number(budgetMin).toLocaleString() });
  if (Number.isFinite(budgetMax)) return t("copilot.briefBudgetUpTo", { amount: Number(budgetMax).toLocaleString() });
  if (typeof budget === "string" && budget.trim()) return budget.trim();
  return null;
}

function formatSubmissionType(submissionType: string | undefined, t: TFn): string {
  switch (submissionType) {
    case "quote_only": return t("copilot.briefSubTypeQuoteOnly");
    case "tech_fin_proposal": return t("copilot.briefSubTypeTechFin");
    case "video_only": return t("copilot.briefSubTypeVideoOnly");
    case "tech_fin_with_video": return t("copilot.briefSubTypeTechFinVideo");
    default: return submissionType || "";
  }
}

export function TenderBriefCards({ tender, companyName, companyCity }: Props) {
  const { t } = useI18n();
  const budgetStr = formatBudget(tender, t);
  const hasDates = !!(tender.startDate || tender.endDate || tender.projectTimeline || tender.duration);
  const deliverables: any[] = Array.isArray(tender.deliverables) ? tender.deliverables : [];
  const milestones: any[] = Array.isArray(tender.milestones) ? tender.milestones : [];
  const skills: string[] = Array.isArray(tender.skills) ? tender.skills : [];
  const vendorRequirements: any[] = Array.isArray(tender.vendorRequirements) ? tender.vendorRequirements : [];
  const formCards: any[] = Array.isArray(tender.formCards) ? tender.formCards : [];
  const evalCriteria = tender.evaluationCriteria && typeof tender.evaluationCriteria === "object" && !Array.isArray(tender.evaluationCriteria)
    ? tender.evaluationCriteria
    : null;
  const evalWeights: any[] = Array.isArray(evalCriteria?.weights) ? evalCriteria.weights : [];
  const evalCustom: any[] = Array.isArray(evalCriteria?.customCriteria) ? evalCriteria.customCriteria : [];
  const hasEval = evalWeights.length > 0 || evalCustom.length > 0;
  const hasSubmissionSection = !!(tender.submissionType || vendorRequirements.length > 0);
  const hasMedia = !!(tender.voiceNoteUrl || tender.videoUrl);
  const hasAttachments = Array.isArray(tender.attachments) && tender.attachments.length > 0;

  const mandatory = vendorRequirements.filter((r) => r.type === "mandatory");
  const preferred = vendorRequirements.filter((r) => r.type === "preferred");

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-gray-900 dark:text-foreground mb-1">
          {tender.title || t("copilot.briefUntitled")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {companyName || t("copilot.briefYourCompany")}
          {companyCity ? ` • ${companyCity}` : ""}
          {tender.category ? ` • ${tender.category}` : ""}
        </p>
      </motion.div>

      {/* Description + objective */}
      {(tender.description || tender.objective) && (
        <Card title={t("copilot.briefProjectScope")} icon={FileText} iconClass="text-orange-500">
          {tender.objective && (
            <div className="mb-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{t("copilot.briefObjective")}</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">{tender.objective}</p>
            </div>
          )}
          {tender.description && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{t("copilot.briefDescription")}</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {tender.description}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Meta grid */}
      <Card title={t("copilot.briefRfpDetails")}>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">{t("copilot.briefSubmissionDeadline")}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-foreground">
                {tender.deadline || t("copilot.briefNotSet")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">{t("copilot.briefBudget")}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-foreground">
                {budgetStr || t("copilot.briefNotSpecified")}
              </p>
            </div>
          </div>
          {hasDates && (
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">{t("copilot.briefTimeline")}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-foreground">
                  {tender.startDate && tender.endDate
                    ? `${tender.startDate} → ${tender.endDate}`
                    : tender.projectTimeline || tender.duration || ""}
                </p>
              </div>
            </div>
          )}
          {tender.projectSize && (
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">{t("copilot.briefProjectSize")}</p>
                <p className="text-sm font-medium capitalize text-gray-900 dark:text-foreground">
                  {tender.projectSize}
                </p>
              </div>
            </div>
          )}
          {tender.category && (
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">{t("copilot.briefCategory")}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-foreground">{tender.category}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Skills */}
      {skills.length > 0 && (
        <Card title={t("copilot.briefRequiredSkills")} icon={Star} iconClass="text-indigo-500">
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <span
                key={`${s}-${i}`}
                className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 rounded-full"
              >
                {s}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <Card title={t("copilot.briefKeyDeliverables")} icon={Target} iconClass="text-green-500">
          <ul className="space-y-2">
            {deliverables.map((d: any, i: number) => (
              <li key={d.id || i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-foreground">{d.name}</span>
                    {d.quantity != null && d.unit && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {d.quantity} {d.unit}
                      </span>
                    )}
                  </div>
                  {d.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <Card title={t("copilot.briefMilestones")} icon={Flag} iconClass="text-purple-500">
          <ol className="space-y-3">
            {milestones.map((m: any, i: number) => (
              <li key={m.id || i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-[var(--bid-orange)]/10 text-[var(--bid-orange)] flex items-center justify-center text-xs font-semibold">
                    {i + 1}
                  </div>
                  {i < milestones.length - 1 && <div className="w-px flex-1 bg-purple-200 mt-1" />}
                </div>
                <div className="flex-1 pb-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-foreground">{m.name}</p>
                  {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {m.dueDate && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {t("copilot.briefDue", { date: m.dueDate })}
                      </span>
                    )}
                    {m.amount && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-700 dark:text-green-300">
                        {t("copilot.briefMilestoneAmount", { amount: m.amount })}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Vendor requirements */}
      {vendorRequirements.length > 0 && (
        <Card title={t("copilot.briefVendorEligibility")} icon={Shield} iconClass="text-rose-500">
          {mandatory.length > 0 && (
            <div className="mb-3">
              <p className="text-xs uppercase tracking-wide text-rose-600 mb-1.5">{t("copilot.briefMandatory")}</p>
              <ul className="space-y-1.5">
                {mandatory.map((r: any, i: number) => (
                  <li key={r.id || i} className="flex items-start gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{r.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preferred.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">{t("copilot.briefPreferred")}</p>
              <ul className="space-y-1.5">
                {preferred.map((r: any, i: number) => (
                  <li key={r.id || i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle2 className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    <span>{r.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Evaluation criteria */}
      {hasEval && (
        <Card title={t("copilot.briefEvaluation")} icon={Star} iconClass="text-amber-500">
          {evalWeights.length > 0 && (
            <>
              <div className="flex h-2 rounded-full overflow-hidden mb-2">
                {evalWeights.map((w: any, i: number) => (
                  <div
                    key={w.categoryId || i}
                    className={cn("h-full", CATEGORY_META[w.categoryId]?.color || "bg-gray-400")}
                    style={{ width: `${w.weight}%` }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                {evalWeights.map((w: any, i: number) => (
                  <div key={w.categoryId || i} className="flex items-center gap-1.5 text-xs text-muted-foreground dark:text-muted-foreground">
                    <span className={cn("w-2 h-2 rounded-full", CATEGORY_META[w.categoryId]?.color || "bg-gray-400")} />
                    <span>{CATEGORY_META[w.categoryId]?.tKey ? t(`copilot.${CATEGORY_META[w.categoryId].tKey}`) : w.categoryId}</span>
                    <span className="text-muted-foreground">{w.weight}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {evalCustom.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">{t("copilot.briefAdditionalCriteria")}</p>
              <ul className="space-y-1">
                {evalCustom.map((c: any, i: number) => (
                  <li key={c.id || i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground dark:text-muted-foreground">{c.text}</span>
                    {c.weight > 0 && (
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">{c.weight}%</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Submission requirements */}
      {hasSubmissionSection && tender.submissionType && (
        <Card title={t("copilot.briefSubmissionReq")} icon={ClipboardCheck} iconClass="text-cyan-500">
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">{formatSubmissionType(tender.submissionType, t)}</p>
          {tender.submissionType === "tech_fin_with_video" && tender.videoRequired && (
            <p className="text-xs text-orange-600 mt-1">{t("copilot.briefVideoMandatory")}</p>
          )}
          {tender.deadline && (
            <p className="text-xs text-muted-foreground mt-1">{t("copilot.briefDeadlineLabel", { date: tender.deadline })}</p>
          )}
        </Card>
      )}

      {/* Q&A */}
      {tender.inquiryType && (
        <Card title={t("copilot.briefQuestions")} icon={MessageSquare} iconClass="text-blue-500">
          {tender.inquiryType === "inside_bid" ? (
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              {t("copilot.briefInsideQA")}
            </p>
          ) : (
            <div className="space-y-1.5 text-sm text-muted-foreground dark:text-muted-foreground">
              <p>{t("copilot.briefDirectContact")}</p>
              {tender.emailContact && <p>• {t("copilot.briefEmail")}: {tender.emailContact}</p>}
              {tender.whatsappContact && <p>• {t("copilot.briefWhatsapp")}: {tender.whatsappContact}</p>}
            </div>
          )}
        </Card>
      )}

      {/* Additional context (media) */}
      {hasMedia && (
        <Card title={t("copilot.briefAdditional")} icon={Mic} iconClass="text-violet-500">
          {tender.voiceNoteUrl && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground mb-1.5">
              <Mic className="h-4 w-4 text-violet-500" />
              <audio controls src={tender.voiceNoteUrl} className="h-8" />
            </div>
          )}
          {tender.videoUrl && (
            <a
              href={tender.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[var(--bid-orange)] hover:underline"
            >
              <Video className="h-4 w-4" />
              {t("copilot.briefWatchVideo")}
            </a>
          )}
        </Card>
      )}

      {/* Attachments */}
      {hasAttachments && (
        <Card title={t("copilot.briefAttachments")} icon={Paperclip} iconClass="text-muted-foreground">
          <ul className="space-y-1">
            {tender.attachments.map((a: any, i: number) => (
              <li key={a.id || i} className="flex items-center gap-2 text-sm">
                <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                <a href={a.url} target="_blank" rel="noreferrer" className="text-[var(--bid-orange)] hover:underline truncate">
                  {a.name}
                </a>
                {a.size && (
                  <span className="text-xs text-gray-400">{(a.size / 1024).toFixed(1)} KB</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Custom form cards */}
      {formCards.length > 0 && (
        <Card title={t("copilot.briefAdditionalReq")} icon={ClipboardCheck} iconClass="text-teal-500">
          <ul className="space-y-3">
            {formCards.map((c: any, i: number) => {
              const Icon = FORM_CARD_ICON[c.type] || Hash;
              return (
                <li key={c.id || i} className="border border-border dark:border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-gray-900 dark:text-foreground">{c.label}</span>
                    {c.isRequired && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:text-rose-300 uppercase tracking-wide">
                        {t("copilot.briefRequiredPill")}
                      </span>
                    )}
                  </div>
                  {c.placeholder && (
                    <p className="text-xs text-gray-400">{c.placeholder}</p>
                  )}
                  {c.type === "custom-select" && Array.isArray(c.options) && c.options.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.options.map((o: string, j: number) => (
                        <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {o}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
