import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Megaphone, Plus, Copy, Check, ExternalLink, TrendingUp, Users2,
  Building2, FileText, MousePointerClick, AlertTriangle, Trash2, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import AdminLayout from "@/components/AdminLayout";
import {
  AdminPage, AdminHeader, AdminCard, AdminEmpty, SkeletonList, SkeletonKpis,
} from "@/components/admin/AdminUI";

// The platforms an influencer link can come from. Kept in sync with
// INFLUENCER_PLATFORMS in shared/schema.ts and with the DB check constraint —
// the value doubles as utm_source, so it is lowercase and never translated.
const PLATFORMS = [
  "instagram", "tiktok", "x", "snapchat", "youtube", "linkedin",
  "whatsapp", "telegram", "podcast", "newsletter", "other",
] as const;

const LANDING_PATHS = ["/", "/signup", "/marketplace", "/getting-started"] as const;

interface CampaignStats {
  clicks: number;
  visitors: number;
  signups: number;
  companiesCreated: number;
  companiesVerified: number;
  firstTenders: number;
}

interface Campaign {
  id: string;
  code: string;
  name: string;
  influencerName: string | null;
  influencerHandle: string | null;
  platform: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string | null;
  landingPath: string;
  feeAmount: number | null;
  currency: string | null;
  notes: string | null;
  status: "active" | "paused" | "ended";
  createdAt: string;
  shortUrl: string;
  destinationUrl: string;
  stats: CampaignStats;
}

interface UnmatchedRow {
  utmSource: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  clicks: number;
  lastSeen: string;
}

/** Lowercase, hyphenated — the same rule the server applies, so the preview in
 *  the form matches the link that actually gets created. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
      aria-label={label}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#FE3C01] transition-colors flex-shrink-0"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Kpi({ icon: Icon, label, value, hint }: {
  icon: typeof Users2; label: string; value: string; hint?: string;
}) {
  return (
    <AdminCard className="p-5">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="font-display font-bold text-3xl text-[#1A1613] dark:text-foreground tabular-nums tracking-[-0.03em]">
        {value}
      </p>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </AdminCard>
  );
}

// Static lookups rather than a templated key, so the i18n usage checker can
// still see every string this file needs.
function statusLabel(status: Campaign["status"], t: (k: string) => string): string {
  if (status === "active") return t("admin.campaignStatusActive");
  if (status === "paused") return t("admin.campaignStatusPaused");
  return t("admin.campaignStatusEnded");
}

function statusTone(status: Campaign["status"]): string {
  if (status === "active") return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
  if (status === "paused") return "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

export default function AdminCampaigns() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ campaigns: Campaign[]; unmatched: UnmatchedRow[] }>({
    queryKey: ["/api/admin/campaigns"],
  });

  const campaigns = data?.campaigns ?? [];
  const unmatched = data?.unmatched ?? [];

  const totals = useMemo(() => {
    return campaigns.reduce(
      (acc, c) => ({
        clicks: acc.clicks + c.stats.clicks,
        signups: acc.signups + c.stats.signups,
        companies: acc.companies + c.stats.companiesCreated,
        tenders: acc.tenders + c.stats.firstTenders,
        spend: acc.spend + (c.status !== "ended" || c.stats.signups > 0 ? c.feeAmount ?? 0 : 0),
      }),
      { clicks: 0, signups: 0, companies: 0, tenders: 0, spend: 0 },
    );
  }, [campaigns]);

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Campaign["status"] }) =>
      apiRequest("PATCH", `/api/admin/campaigns/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
    },
    onError: (e: any) => {
      toast({ title: t("admin.error"), description: e?.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      toast({ title: t("admin.campaignDeleted") });
    },
    onError: (e: any) => {
      // The server refuses to delete a campaign that already has traffic; its
      // message explains why, so it is shown verbatim rather than replaced.
      toast({ title: t("admin.error"), description: e?.message, variant: "destructive" });
    },
  });

  return (
    <AdminLayout>
      <AdminPage>
        <AdminHeader
          eyebrow={t("admin.adminPanel")}
          eyebrowIcon={Megaphone}
          title={t("admin.campaignsTitle")}
          subtitle={t("admin.campaignsSubtitle")}
          action={
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-[#FE3C01] hover:bg-[#E03600] text-white"
              data-testid="button-new-campaign"
            >
              <Plus className="h-4 w-4 me-2" />
              {t("admin.newCampaign")}
            </Button>
          }
        />

        {isLoading ? (
          <>
            <SkeletonKpis count={5} />
            <div className="mt-6">
              <SkeletonList rows={4} />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <Kpi icon={MousePointerClick} label={t("admin.kpiClicks")} value={totals.clicks.toLocaleString()} />
              <Kpi
                icon={Users2}
                label={t("admin.kpiSignups")}
                value={totals.signups.toLocaleString()}
                hint={totals.clicks ? `${((totals.signups / totals.clicks) * 100).toFixed(1)}%` : undefined}
              />
              <Kpi icon={Building2} label={t("admin.kpiCompanies")} value={totals.companies.toLocaleString()} />
              <Kpi icon={FileText} label={t("admin.kpiTenders")} value={totals.tenders.toLocaleString()} />
              <Kpi
                icon={TrendingUp}
                label={t("admin.kpiCostPerSignup")}
                value={totals.signups ? `${Math.round(totals.spend / totals.signups).toLocaleString()}` : "—"}
                hint={totals.spend ? `${t("admin.kpiSpend")} ${totals.spend.toLocaleString()} SAR` : undefined}
              />
            </div>

            {campaigns.length === 0 ? (
              <AdminEmpty
                icon={Megaphone}
                title={t("admin.noCampaigns")}
                subtitle={t("admin.noCampaignsDesc")}
              />
            ) : (
              <div className="space-y-3">
                {campaigns.map((c) => (
                  <AdminCard key={c.id} className="p-5" data-testid={`card-campaign-${c.code}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <button
                            onClick={() => setDetailId(c.id)}
                            className="font-display font-bold text-lg text-[#1A1613] dark:text-foreground tracking-[-0.02em] hover:text-[#FE3C01] transition-colors text-start"
                            data-testid={`button-detail-${c.code}`}
                          >
                            {c.name}
                          </button>
                          <Badge className={`text-[11px] font-medium border-0 ${statusTone(c.status)}`}>
                            {statusLabel(c.status, t)}
                          </Badge>
                          <span className="text-[11px] uppercase tracking-wide text-gray-400">{c.platform}</span>
                          {c.influencerHandle && (
                            <span className="text-xs text-gray-500">@{c.influencerHandle}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 min-w-0">
                          <Link2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <code className="text-xs text-gray-600 dark:text-gray-300 truncate font-mono">
                            {c.shortUrl}
                          </code>
                          <CopyButton value={c.shortUrl} label={t("admin.copyShortLink")} />
                          <a
                            href={c.destinationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-400 hover:text-[#FE3C01] transition-colors"
                            aria-label={t("admin.openDestination")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* The funnel, left to right, always on the same denominator. */}
                      <div className="flex items-center gap-5 sm:gap-7 flex-shrink-0">
                        {([
                          [t("admin.colClicks"), c.stats.clicks],
                          [t("admin.colVisitors"), c.stats.visitors],
                          [t("admin.colSignups"), c.stats.signups],
                          [t("admin.colCompanies"), c.stats.companiesCreated],
                          [t("admin.colTenders"), c.stats.firstTenders],
                        ] as const).map(([label, value]) => (
                          <div key={label} className="text-center">
                            <p className="font-mono font-semibold text-lg text-[#1A1613] dark:text-foreground tabular-nums leading-none">
                              {value.toLocaleString()}
                            </p>
                            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">{label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Select
                          value={c.status}
                          onValueChange={(status) =>
                            statusMutation.mutate({ id: c.id, status: status as Campaign["status"] })
                          }
                        >
                          <SelectTrigger className="h-8 w-[110px] text-xs" data-testid={`select-status-${c.code}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">{t("admin.campaignStatusActive")}</SelectItem>
                            <SelectItem value="paused">{t("admin.campaignStatusPaused")}</SelectItem>
                            <SelectItem value="ended">{t("admin.campaignStatusEnded")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                          onClick={() => deleteMutation.mutate(c.id)}
                          disabled={deleteMutation.isPending}
                          aria-label={t("admin.deleteCampaign")}
                          data-testid={`button-delete-${c.code}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </AdminCard>
                ))}
              </div>
            )}

            {unmatched.length > 0 && (
              <AdminCard className="p-5 mt-8">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h2 className="font-display font-bold text-lg text-[#1A1613] dark:text-foreground">
                    {t("admin.unmatchedTitle")}
                  </h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">{t("admin.unmatchedDesc")}</p>
                <div className="space-y-2">
                  {unmatched.map((u, i) => (
                    <div key={i} className="flex items-center justify-between text-xs gap-4">
                      <code className="font-mono text-gray-600 dark:text-gray-300 truncate">
                        {[u.utmSource, u.utmCampaign, u.utmContent].filter(Boolean).join(" / ") || "—"}
                      </code>
                      <span className="font-mono tabular-nums text-gray-500 flex-shrink-0">
                        {u.clicks.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </AdminCard>
            )}
          </>
        )}
      </AdminPage>

      <CreateCampaignDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CampaignDetailDialog campaignId={detailId} onClose={() => setDetailId(null)} />
    </AdminLayout>
  );
}

// ---------------------------------------------------------------------------
// Create — the link builder
// ---------------------------------------------------------------------------

function CreateCampaignDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useI18n();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [influencerName, setInfluencerName] = useState("");
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<string>("instagram");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [landingPath, setLandingPath] = useState<string>("/");
  const [fee, setFee] = useState("");
  const [notes, setNotes] = useState("");

  // utm_content is what separates two influencers running the same campaign, so
  // it is derived from the handle rather than left to be filled in by hand — the
  // field everyone forgets is the one that makes the report readable.
  const utmContent = slugify(handle || influencerName);
  const code = slugify([handle || influencerName, utmCampaign].filter(Boolean).join("-")) || slugify(name);
  const previewShort = `${window.location.origin}/r/${code || "…"}`;
  const previewFull = useMemo(() => {
    const url = new URL(landingPath, window.location.origin);
    url.searchParams.set("utm_source", platform);
    url.searchParams.set("utm_medium", "influencer");
    url.searchParams.set("utm_campaign", slugify(utmCampaign) || "…");
    if (utmContent) url.searchParams.set("utm_content", utmContent);
    return url.toString();
  }, [landingPath, platform, utmCampaign, utmContent]);

  const reset = () => {
    setName(""); setInfluencerName(""); setHandle(""); setPlatform("instagram");
    setUtmCampaign(""); setLandingPath("/"); setFee(""); setNotes("");
  };

  const createMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/admin/campaigns", {
        name: name.trim(),
        code: code || undefined,
        influencerName: influencerName.trim() || undefined,
        influencerHandle: handle.trim().replace(/^@/, "") || undefined,
        platform,
        utmCampaign: slugify(utmCampaign),
        utmContent: utmContent || undefined,
        utmMedium: "influencer",
        utmSource: platform,
        landingPath,
        feeAmount: fee.trim() ? Number(fee) : null,
        currency: "SAR",
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      toast({ title: t("admin.campaignCreated"), description: t("admin.campaignCreatedDesc") });
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: t("admin.error"), description: e?.message, variant: "destructive" });
    },
  });

  const canSubmit = name.trim().length >= 2 && slugify(utmCampaign).length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-campaign">
        <DialogHeader>
          <DialogTitle>{t("admin.newCampaign")}</DialogTitle>
          <DialogDescription>{t("admin.newCampaignDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="c-name">{t("admin.fieldName")}</Label>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("admin.fieldNamePlaceholder")}
              data-testid="input-campaign-name"
            />
            <p className="text-[11px] text-gray-400 mt-1">{t("admin.fieldNameHelp")}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="c-influencer">{t("admin.fieldInfluencer")}</Label>
              <Input
                id="c-influencer"
                value={influencerName}
                onChange={(e) => setInfluencerName(e.target.value)}
                placeholder="Sara Alharbi"
                data-testid="input-influencer-name"
              />
            </div>
            <div>
              <Label htmlFor="c-handle">{t("admin.fieldHandle")}</Label>
              <Input
                id="c-handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@saraalharbi"
                data-testid="input-influencer-handle"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="c-platform">{t("admin.fieldPlatform")}</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="c-platform" data-testid="select-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-gray-400 mt-1">{t("admin.fieldPlatformHelp")}</p>
            </div>
            <div>
              <Label htmlFor="c-utm">{t("admin.fieldCampaignTag")}</Label>
              <Input
                id="c-utm"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                placeholder="launch-2026-09"
                data-testid="input-utm-campaign"
              />
              <p className="text-[11px] text-gray-400 mt-1">{t("admin.fieldCampaignTagHelp")}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="c-landing">{t("admin.fieldLanding")}</Label>
              <Select value={landingPath} onValueChange={setLandingPath}>
                <SelectTrigger id="c-landing" data-testid="select-landing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANDING_PATHS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="c-fee">{t("admin.fieldFee")}</Label>
              <Input
                id="c-fee"
                type="number"
                min={0}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="5000"
                data-testid="input-fee"
              />
              <p className="text-[11px] text-gray-400 mt-1">{t("admin.fieldFeeHelp")}</p>
            </div>
          </div>

          <div>
            <Label htmlFor="c-notes">{t("admin.fieldNotes")}</Label>
            <Textarea
              id="c-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t("admin.fieldNotesPlaceholder")}
              data-testid="input-notes"
            />
          </div>

          {/* Live preview: what the influencer gets, and where it lands. */}
          <div className="rounded-2xl bg-gray-50 dark:bg-card border border-border p-4 space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                {t("admin.previewShort")}
              </p>
              <code className="text-sm font-mono text-[#FE3C01] break-all">{previewShort}</code>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                {t("admin.previewFull")}
              </p>
              <code className="text-[11px] font-mono text-gray-500 break-all">{previewFull}</code>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("admin.cancel")}</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit || createMutation.isPending}
            className="bg-[#FE3C01] hover:bg-[#E03600] text-white"
            data-testid="button-submit-campaign"
          >
            {createMutation.isPending ? t("admin.processing") : t("admin.createCampaign")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Detail — who this campaign actually brought in
// ---------------------------------------------------------------------------

interface DetailResponse {
  campaign: Campaign;
  stats: CampaignStats;
  signups: {
    userId: string; name: string; email: string; signedUpAt: string;
    signupMethod: string | null; companyName: string | null;
    verificationStatus: string | null; tendersCreated: number;
  }[];
  recentVisits: {
    id: string; source: string; country: string | null;
    referrer: string | null; landingPath: string | null; createdAt: string;
  }[];
  daily: { day: string; clicks: number }[];
}

function CampaignDetailDialog({ campaignId, onClose }: { campaignId: string | null; onClose: () => void }) {
  const { t } = useI18n();
  const { data, isLoading } = useQuery<DetailResponse>({
    queryKey: [`/api/admin/campaigns/${campaignId}`],
    enabled: Boolean(campaignId),
  });

  const maxClicks = Math.max(1, ...(data?.daily ?? []).map((d) => d.clicks));

  return (
    <Dialog open={Boolean(campaignId)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-campaign-detail">
        <DialogHeader>
          <DialogTitle>{data?.campaign.name ?? t("admin.campaignsTitle")}</DialogTitle>
          <DialogDescription>
            {data?.campaign ? data.campaign.shortUrl : ""}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <SkeletonList rows={4} />
        ) : (
          <div className="space-y-6">
            {/* 30-day click bars. Deliberately unlabelled per bar — the shape is
                the point; exact numbers live in the funnel above it. */}
            {data.daily.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  {t("admin.clicksLast30")}
                </p>
                <div className="flex items-end gap-[3px] h-16">
                  {data.daily.map((d) => (
                    <div
                      key={d.day}
                      title={`${d.day}: ${d.clicks}`}
                      style={{ height: `${Math.max(6, (d.clicks / maxClicks) * 100)}%` }}
                      className="flex-1 bg-[#FE3C01]/70 rounded-t-sm min-w-[3px]"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {([
                [t("admin.colClicks"), data.stats.clicks],
                [t("admin.colVisitors"), data.stats.visitors],
                [t("admin.colSignups"), data.stats.signups],
                [t("admin.colCompanies"), data.stats.companiesCreated],
                [t("admin.colVerified"), data.stats.companiesVerified],
                [t("admin.colTenders"), data.stats.firstTenders],
              ] as const).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-gray-50 dark:bg-card p-3 text-center">
                  <p className="font-mono font-semibold text-xl tabular-nums leading-none text-[#1A1613] dark:text-foreground">
                    {value.toLocaleString()}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                {t("admin.attributedUsers")}
              </p>
              {data.signups.length === 0 ? (
                <p className="text-sm text-gray-500">{t("admin.noSignupsYet")}</p>
              ) : (
                <div className="space-y-2">
                  {data.signups.map((s) => (
                    <div
                      key={s.userId}
                      className="flex items-center justify-between gap-3 text-sm border-b border-border pb-2 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#1A1613] dark:text-foreground truncate">{s.name}</p>
                        <p className="text-xs text-gray-500 truncate">{s.email}</p>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[180px]">
                          {s.companyName || t("admin.noCompanyYet")}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {s.verificationStatus === "verified" && `${t("admin.colVerified")} · `}
                          {s.tendersCreated > 0
                            ? `${s.tendersCreated} ${t("admin.colTenders")}`
                            : new Date(s.signedUpAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
