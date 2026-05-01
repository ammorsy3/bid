import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Trash2, KeyRound, Plug, Plus, AlertCircle, CheckCircle2, BookOpen, ExternalLink, ArrowLeft } from "lucide-react";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdBy: string;
  createdAt: string;
  lastUsedAt: string | null;
};

type IntegrationRow = {
  id: string;
  channel: "webhook" | "mcp";
  name: string;
  config: Record<string, any>;
  externalIdentifier: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

export default function SettingsIntegrations() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, isRtl } = useI18n();
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);

  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [createIntegrationOpen, setCreateIntegrationOpen] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ name: string; rawKey: string } | null>(null);

  const baseUrl = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    [],
  );

  if (!user) {
    setLocation("/login");
    return null;
  }

  const keysQuery = useQuery<ApiKeyRow[]>({
    queryKey: ["/api/api-keys", activeCompany?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/api-keys");
      return res.json();
    },
    enabled: Boolean(activeCompany?.id),
  });

  const integrationsQuery = useQuery<IntegrationRow[]>({
    queryKey: ["/api/integrations", activeCompany?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/integrations");
      return res.json();
    },
    enabled: Boolean(activeCompany?.id),
  });

  const createKeyMutation = useMutation({
    mutationFn: async ({ name, scopes }: { name: string; scopes: string[] }) => {
      const res = await apiRequest("POST", "/api/api-keys", { name, scopes });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setNewlyCreatedKey({ name: data.name, rawKey: data.rawKey });
      setCreateKeyOpen(false);
    },
    onError: (err: any) => toast({ title: t('settings.intCreateKeyFailed'), description: err?.message ?? t('settings.intTryAgain'), variant: "destructive" }),
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: t('settings.intApiKeyRevoked') });
    },
  });

  const createIntegrationMutation = useMutation({
    mutationFn: async (payload: { channel: string; name: string; config: Record<string, any> }) => {
      const res = await apiRequest("POST", "/api/integrations", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      setCreateIntegrationOpen(false);
      toast({ title: t('settings.intCreatedToast') });
    },
    onError: (err: any) => toast({ title: t('settings.intCreateIntFailed'), description: err?.message ?? t('settings.intTryAgain'), variant: "destructive" }),
  });

  const toggleIntegrationMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiRequest("PATCH", `/api/integrations/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/integrations"] }),
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/integrations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({ title: t('settings.intDeletedToast') });
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button
            className="group relative overflow-hidden h-8 mb-3"
            onClick={() => setLocation("/settings")}
            data-testid="button-back-to-settings"
          >
            <span className="w-12 translate-x-2 transition-opacity duration-500 group-hover:opacity-0 text-sm">
              {t('common.back')}
            </span>
            <i className="absolute inset-0 z-10 grid w-1/4 place-items-center bg-primary-foreground/15 transition-all duration-500 group-hover:w-full">
              <ArrowLeft
                className={`opacity-60 ${isRtl ? 'rotate-180' : ''}`}
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
            </i>
          </Button>
          <h1 className="text-2xl font-semibold">{t('settings.intPageTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('settings.intPageDesc')}
          </p>
        </div>
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border hover:bg-muted transition-colors"
          data-testid="link-api-docs"
        >
          <BookOpen size={14} />
          {t('settings.intViewApiDocs')}
          <ExternalLink size={12} className="text-muted-foreground" />
        </a>
      </header>

      {/* ============= API KEYS ============= */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <KeyRound size={18} />
              {t('settings.intApiKeysTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('settings.intApiKeysDesc')}
            </p>
          </div>
          <Button onClick={() => setCreateKeyOpen(true)} data-testid="button-create-api-key">
            <Plus size={16} className="mr-1" />
            {t('settings.intCreateApiKey')}
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          {keysQuery.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">{t('settings.intLoading')}</div>
          ) : keysQuery.data && keysQuery.data.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">{t('settings.intColName')}</th>
                  <th className="px-4 py-2 font-medium">{t('settings.intColPrefix')}</th>
                  <th className="px-4 py-2 font-medium">{t('settings.intColScopes')}</th>
                  <th className="px-4 py-2 font-medium">{t('settings.intColCreated')}</th>
                  <th className="px-4 py-2 font-medium">{t('settings.intColLastUsed')}</th>
                  <th className="px-4 py-2 font-medium w-8"></th>
                </tr>
              </thead>
              <tbody>
                {keysQuery.data.map((k) => (
                  <tr key={k.id} className="border-t">
                    <td className="px-4 py-2">{k.name}</td>
                    <td className="px-4 py-2 font-mono text-xs">{k.prefix}…</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {k.scopes.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(t('settings.intRevokeConfirm', { name: k.name }))) {
                            revokeKeyMutation.mutate(k.id);
                          }
                        }}
                        data-testid={`button-revoke-key-${k.id}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-sm text-muted-foreground text-center">
              {t('settings.intNoApiKeys')}
            </div>
          )}
        </div>
      </section>

      {/* ============= INTEGRATIONS ============= */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Plug size={18} />
              {t('settings.intSectionTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('settings.intSectionDesc')}
            </p>
          </div>
          <Button onClick={() => setCreateIntegrationOpen(true)} data-testid="button-create-integration">
            <Plus size={16} className="mr-1" />
            {t('settings.intCreateIntegration')}
          </Button>
        </div>

        <div className="space-y-3">
          {integrationsQuery.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground border rounded-lg">{t('settings.intLoading')}</div>
          ) : integrationsQuery.data && integrationsQuery.data.length > 0 ? (
            integrationsQuery.data.map((i) => {
              const url =
                i.channel === "webhook"
                  ? `${baseUrl}/integrations/webhook/${i.id}`
                  : `${baseUrl}/mcp`;
              return (
                <div key={i.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{i.name}</span>
                        <Badge variant={i.channel === "webhook" ? "default" : "outline"}>
                          {i.channel}
                        </Badge>
                        {!i.enabled && <Badge variant="destructive">{t('settings.intDisabledBadge')}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t('settings.intCreatedOn', { date: new Date(i.createdAt).toLocaleDateString() })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          toggleIntegrationMutation.mutate({ id: i.id, enabled: !i.enabled })
                        }
                      >
                        {i.enabled ? t('settings.intDisableBtn') : t('settings.intEnableBtn')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(t('settings.intDeleteConfirm', { name: i.name }))) {
                            deleteIntegrationMutation.mutate(i.id);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-muted rounded px-3 py-2 text-xs font-mono flex items-center justify-between gap-2">
                    <span className="truncate">{url}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        copyToClipboard(url);
                        toast({ title: t('settings.intUrlCopied') });
                      }}
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('settings.intUsageHintPre')} <code className="bg-muted px-1">X-Api-Key: bidc_live_…</code> {t('settings.intUsageHintPost')}
                    {i.channel === "webhook" && (
                      <>
                        {" "}{t('settings.intWebhookBodyHintPre')} <code className="bg-muted px-1">{`{ conversationId, message }`}</code>.
                      </>
                    )}
                  </div>
                  <IntegrationActivityPanel integrationId={i.id} />
                </div>
              );
            })
          ) : (
            <div className="p-6 text-sm text-muted-foreground text-center border rounded-lg">
              {t('settings.intNoIntegrations')}
            </div>
          )}
        </div>
      </section>

      <CreateApiKeyDialog
        open={createKeyOpen}
        onOpenChange={setCreateKeyOpen}
        onCreate={(values) => createKeyMutation.mutate(values)}
        pending={createKeyMutation.isPending}
      />

      <CreateIntegrationDialog
        open={createIntegrationOpen}
        onOpenChange={setCreateIntegrationOpen}
        onCreate={(values) => createIntegrationMutation.mutate(values)}
        pending={createIntegrationMutation.isPending}
      />

      <NewKeyDisplayDialog
        value={newlyCreatedKey}
        onClose={() => setNewlyCreatedKey(null)}
      />
    </div>
  );
}

// ============================================================================
// ACTIVITY PANEL
// ============================================================================

type IntegrationLog = {
  id: string;
  action: "message" | "launch" | "error";
  status: "ok" | "4xx" | "5xx" | "rate_limited" | "idempotent_replay";
  errorCode: string | null;
  latencyMs: number | null;
  requestPreview: string | null;
  responsePreview: string | null;
  createdAt: string;
};

function IntegrationActivityPanel({ integrationId }: { integrationId: string }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();
  const logsQuery = useQuery<IntegrationLog[]>({
    queryKey: [`/api/integrations/${integrationId}/logs`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/integrations/${integrationId}/logs`);
      return res.json();
    },
    enabled: expanded,
  });

  return (
    <div className="border-t pt-3">
      <button
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? t('settings.intHideActivity') : t('settings.intShowActivity')} {t('settings.intRecentActivity')}
      </button>
      {expanded && (
        <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
          {logsQuery.isLoading ? (
            <div className="text-xs text-muted-foreground">{t('settings.intLoading')}</div>
          ) : logsQuery.data && logsQuery.data.length > 0 ? (
            logsQuery.data.map((log) => (
              <div key={log.id} className="text-xs flex items-center gap-2 py-1 border-b last:border-b-0">
                <Badge
                  variant={log.status === "ok" ? "default" : log.status.startsWith("5") ? "destructive" : "secondary"}
                  className="text-[10px]"
                >
                  {log.status}
                </Badge>
                <span className="font-mono">{log.action}</span>
                {log.latencyMs != null && (
                  <span className="text-muted-foreground">{log.latencyMs}ms</span>
                )}
                <span className="text-muted-foreground truncate flex-1">
                  {log.errorCode || log.requestPreview?.slice(0, 60) || ""}
                </span>
                <span className="text-muted-foreground">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground">{t('settings.intNoActivity')}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CREATE API KEY DIALOG
// ============================================================================

function CreateApiKeyDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (values: { name: string; scopes: string[] }) => void;
  pending: boolean;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["copilot:chat", "tender:create"]);

  const SCOPE_LABELS: Record<string, string> = {
    "copilot:chat": t('settings.intScopeCopilotChat'),
    "tender:create": t('settings.intScopeTenderCreate'),
  };

  const toggleScope = (s: string) => {
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('settings.intCreateKeyTitle')}</DialogTitle>
          <DialogDescription>
            {t('settings.intCreateKeyDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="api-key-name">{t('settings.intKeyNameLabel')}</Label>
            <Input
              id="api-key-name"
              placeholder={t('settings.intKeyNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>{t('settings.intScopesLabel')}</Label>
            <div className="space-y-2 mt-2">
              {Object.entries(SCOPE_LABELS).map(([scope, label]) => (
                <label key={scope} className="flex items-start gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={scopes.includes(scope)}
                    onCheckedChange={() => toggleScope(scope)}
                  />
                  <span>
                    <span className="font-mono text-xs">{scope}</span> — {label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>{t('settings.intCancelBtn')}</Button>
          <Button
            onClick={() => props.onCreate({ name: name.trim(), scopes })}
            disabled={!name.trim() || scopes.length === 0 || props.pending}
          >
            {props.pending ? t('settings.intCreatingBtn') : t('settings.intCreateKeyBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// CREATE INTEGRATION DIALOG
// ============================================================================

function CreateIntegrationDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (values: { channel: string; name: string; config: Record<string, any> }) => void;
  pending: boolean;
}) {
  const { t } = useI18n();
  const [channel, setChannel] = useState<"webhook" | "mcp">("webhook");
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [defaultLanguage, setDefaultLanguage] = useState<"en" | "ar">("en");

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('settings.intCreateIntTitle')}</DialogTitle>
          <DialogDescription>
            {t('settings.intCreateIntDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('settings.intChannelLabel')}</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as "webhook" | "mcp")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webhook">{t('settings.intWebhookOption')}</SelectItem>
                <SelectItem value="mcp">{t('settings.intMcpOption')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="integration-name">{t('settings.intIntNameLabel')}</Label>
            <Input
              id="integration-name"
              placeholder={t('settings.intIntNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="persona">{t('settings.intPersonaLabel')}</Label>
            <Input
              id="persona"
              placeholder={t('settings.intPersonaPlaceholder')}
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
            />
          </div>
          <div>
            <Label>{t('settings.intDefaultLangLabel')}</Label>
            <Select value={defaultLanguage} onValueChange={(v) => setDefaultLanguage(v as "en" | "ar")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('settings.intLangEnglish')}</SelectItem>
                <SelectItem value="ar">{t('settings.intLangArabic')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {channel === "webhook" && (
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={autoLaunch} onCheckedChange={() => setAutoLaunch((v) => !v)} />
              <span>
                <strong>{t('settings.intAutoLaunchStrong')}</strong> {t('settings.intAutoLaunchDesc')}
              </span>
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>{t('settings.intCancelBtn')}</Button>
          <Button
            disabled={!name.trim() || props.pending}
            onClick={() =>
              props.onCreate({
                channel,
                name: name.trim(),
                config: {
                  ...(persona.trim() ? { persona: persona.trim() } : {}),
                  defaultLanguage,
                  ...(channel === "webhook" ? { autoLaunch } : {}),
                },
              })
            }
          >
            {props.pending ? t('settings.intCreatingBtn') : t('settings.intCreateBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// NEW KEY "SHOW ONCE" DIALOG
// ============================================================================

function NewKeyDisplayDialog(props: {
  value: { name: string; rawKey: string } | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  if (!props.value) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="text-green-600" size={20} />
            {t('settings.intKeyCreatedTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('settings.intKeyCreatedDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t('settings.intColName')}</Label>
            <div className="text-sm mt-1">{props.value.name}</div>
          </div>
          <div>
            <Label>{t('settings.intRawKeyLabel')}</Label>
            <div className="flex items-center gap-2 mt-1 bg-muted rounded px-3 py-2 font-mono text-xs break-all">
              <span className="flex-1">{props.value.rawKey}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(props.value!.rawKey)}
              >
                <Copy size={12} />
              </Button>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{t('settings.intKeyWarning')}</span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={props.onClose}>{t('settings.intSavedItBtn')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
