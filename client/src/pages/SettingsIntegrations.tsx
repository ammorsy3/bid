import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
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
import { Copy, Trash2, KeyRound, Plug, Plus, AlertCircle, CheckCircle2 } from "lucide-react";

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

const SCOPE_LABELS: Record<string, string> = {
  "copilot:chat": "Chat with the agent",
  "tender:create": "Create tenders",
};

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

export default function SettingsIntegrations() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);

  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [createIntegrationOpen, setCreateIntegrationOpen] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ name: string; rawKey: string } | null>(null);

  const baseUrl = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    [],
  );

  // Server-side admin gate lives on the API routes. Client just bounces
  // unauthenticated visitors to login; non-admins get empty lists + 403s on
  // mutations, which is acceptable for an internal settings page.
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
    onError: (err: any) => toast({ title: "Failed to create key", description: err?.message ?? "Try again", variant: "destructive" }),
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "API key revoked" });
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
      toast({ title: "Integration created" });
    },
    onError: (err: any) => toast({ title: "Failed to create integration", description: err?.message ?? "Try again", variant: "destructive" }),
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
      toast({ title: "Integration deleted" });
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <header>
        <h1 className="text-2xl font-semibold">Integrations & API keys</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Give external tools (n8n, Make.com, Claude Desktop, custom chatbots) access to the
          Bid Copilot on behalf of your company.
        </p>
      </header>

      {/* ============= API KEYS ============= */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <KeyRound size={18} />
              API keys
            </h2>
            <p className="text-sm text-muted-foreground">
              Each key grants programmatic access to your company's data. Keys are shown once on
              creation — store them somewhere safe.
            </p>
          </div>
          <Button onClick={() => setCreateKeyOpen(true)} data-testid="button-create-api-key">
            <Plus size={16} className="mr-1" />
            Create API key
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          {keysQuery.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : keysQuery.data && keysQuery.data.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Prefix</th>
                  <th className="px-4 py-2 font-medium">Scopes</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                  <th className="px-4 py-2 font-medium">Last used</th>
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
                          if (confirm(`Revoke key "${k.name}"? This cannot be undone.`)) {
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
              No API keys yet. Create one to start building an integration.
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
              Integrations
            </h2>
            <p className="text-sm text-muted-foreground">
              One row per channel. Share the endpoint URL with your n8n/Make/MCP client along
              with an API key.
            </p>
          </div>
          <Button onClick={() => setCreateIntegrationOpen(true)} data-testid="button-create-integration">
            <Plus size={16} className="mr-1" />
            Create integration
          </Button>
        </div>

        <div className="space-y-3">
          {integrationsQuery.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground border rounded-lg">Loading…</div>
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
                        {!i.enabled && <Badge variant="destructive">Disabled</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Created {new Date(i.createdAt).toLocaleDateString()}
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
                        {i.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete integration "${i.name}"?`)) {
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
                        toast({ title: "URL copied" });
                      }}
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Use header <code className="bg-muted px-1">X-Api-Key: bidc_live_…</code> on every request.
                    {i.channel === "webhook" && (
                      <>
                        {" "}Body: <code className="bg-muted px-1">{`{ conversationId, message }`}</code>.
                      </>
                    )}
                  </div>
                  <IntegrationActivityPanel integrationId={i.id} />
                </div>
              );
            })
          ) : (
            <div className="p-6 text-sm text-muted-foreground text-center border rounded-lg">
              No integrations yet.
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
        {expanded ? "Hide" : "Show"} recent activity
      </button>
      {expanded && (
        <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
          {logsQuery.isLoading ? (
            <div className="text-xs text-muted-foreground">Loading…</div>
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
            <div className="text-xs text-muted-foreground">No activity yet.</div>
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
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["copilot:chat", "tender:create"]);

  const toggleScope = (s: string) => {
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API key</DialogTitle>
          <DialogDescription>
            Name the key after the tool that will use it. You'll see the raw key only once.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="api-key-name">Name</Label>
            <Input
              id="api-key-name"
              placeholder="e.g. n8n procurement flow"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Scopes</Label>
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
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => props.onCreate({ name: name.trim(), scopes })}
            disabled={!name.trim() || scopes.length === 0 || props.pending}
          >
            {props.pending ? "Creating…" : "Create key"}
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
  const [channel, setChannel] = useState<"webhook" | "mcp">("webhook");
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [defaultLanguage, setDefaultLanguage] = useState<"en" | "ar">("en");

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create integration</DialogTitle>
          <DialogDescription>
            Each integration is one pipe from an external tool to your Copilot.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as "webhook" | "mcp")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webhook">Webhook (n8n / Make / custom chatbot)</SelectItem>
                <SelectItem value="mcp">MCP (Claude Desktop / Cursor / AI clients)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="integration-name">Name</Label>
            <Input
              id="integration-name"
              placeholder="e.g. ACME procurement bot"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="persona">Agent persona / tone override (optional)</Label>
            <Input
              id="persona"
              placeholder="e.g. Speak formally, always in Arabic"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
            />
          </div>
          <div>
            <Label>Default language</Label>
            <Select value={defaultLanguage} onValueChange={(v) => setDefaultLanguage(v as "en" | "ar")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {channel === "webhook" && (
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={autoLaunch} onCheckedChange={() => setAutoLaunch((v) => !v)} />
              <span>
                <strong>Auto-launch</strong> — automatically create the tender when the agent
                says it's ready, instead of waiting for an explicit launch call.
              </span>
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancel</Button>
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
            {props.pending ? "Creating…" : "Create"}
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
  if (!props.value) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="text-green-600" size={20} />
            API key created
          </DialogTitle>
          <DialogDescription>
            This is the only time you'll see the raw key. Copy it somewhere safe now.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <div className="text-sm mt-1">{props.value.name}</div>
          </div>
          <div>
            <Label>Raw key</Label>
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
            <span>
              We only store a hash of this key. If you lose it, you'll need to revoke it and create
              a new one.
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={props.onClose}>I've saved it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
