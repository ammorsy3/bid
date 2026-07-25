import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { VENDOR_CATEGORIES } from "@shared/schema";
import {
  Search, MapPin, BadgeCheck, Check, UserPlus, Loader2, ExternalLink, Users,
} from "lucide-react";

interface DirectoryIndividual {
  companyId: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  bio: string | null;
  category: string | null;
  city: string | null;
  availabilityStatus: string | null;
  verificationStatus: string;
  inBase: boolean;
}

const AVAILABILITY: Record<string, { labelKey: string; cls: string }> = {
  accepting: { labelKey: "directory.openToWork", cls: "text-[var(--state-won)]" },
  limited: { labelKey: "directory.limited", cls: "text-amber-600" },
  booked: { labelKey: "directory.booked", cls: "text-muted-foreground" },
};

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function IndividualsDirectory() {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [added, setAdded] = useState<Record<string, true>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isFetching } = useQuery<{ individuals: DirectoryIndividual[]; total: number }>({
    queryKey: ["/api/individuals/directory", debounced, city, category],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debounced) params.set("search", debounced);
      if (city) params.set("city", city);
      if (category) params.set("category", category);
      return apiRequest("GET", `/api/individuals/directory?${params.toString()}`).then((r) => r.json());
    },
  });

  const addMutation = useMutation({
    mutationFn: async (vendorCompanyId: string) => {
      const res = await apiRequest("POST", "/api/vendors-base", { vendorCompanyId });
      const body = await res.json().catch(() => ({}));
      if (!res.ok && body.code !== "ALREADY_IN_BASE") throw new Error(body.message || "Failed");
      return body;
    },
    onSuccess: (_b, vendorCompanyId) => {
      setAdded((s) => ({ ...s, [vendorCompanyId]: true }));
      queryClient.invalidateQueries({ queryKey: ["/api/vendors-base"] });
      toast({ title: t('directory.addedTitle'), description: t('directory.addedDesc') });
    },
    onError: (e: any) => {
      toast({ title: t('directory.couldntAdd'), description: e.message || t('directory.tryAgain'), variant: "destructive" });
    },
  });

  const individuals = data?.individuals || [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('directory.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rtl:pr-9 rtl:pl-3"
            data-testid="input-directory-search"
          />
        </div>
        <div className="w-full sm:w-44">
          <Input placeholder={t('directory.city')} value={city} onChange={(e) => setCity(e.target.value)} data-testid="input-directory-city" />
        </div>
        <div className="w-full sm:w-56">
          <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
            <SelectTrigger data-testid="select-directory-category"><SelectValue placeholder={t('directory.field')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('directory.allFields')}</SelectItem>
              {VENDOR_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {isFetching && individuals.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : individuals.length === 0 ? (
        <div className="text-center py-16 px-4 bg-muted rounded-2xl border border-border">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">{t('directory.noneTitle')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('directory.noneDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {individuals.map((ind) => {
            const isAdded = ind.inBase || added[ind.companyId];
            const avail = ind.availabilityStatus ? AVAILABILITY[ind.availabilityStatus] : null;
            return (
              <div key={ind.companyId} className="rounded-2xl border border-border bg-card p-4 flex flex-col" data-testid={`directory-card-${ind.slug}`}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                    {ind.logoUrl ? (
                      <img src={ind.logoUrl} alt={ind.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{initialsOf(ind.name)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <a href={`/company/${ind.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-foreground hover:underline truncate">
                        {ind.name}
                      </a>
                      {ind.verificationStatus === "verified" && <BadgeCheck className="h-3.5 w-3.5 text-[#FE3C01] flex-shrink-0" />}
                    </div>
                    {ind.category && <p className="text-xs text-muted-foreground truncate">{ind.category}</p>}
                    <div className="flex items-center gap-3 mt-0.5">
                      {ind.city && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3" />{ind.city}
                        </span>
                      )}
                      {avail && <span className={`text-[11px] font-medium ${avail.cls}`}>{t(avail.labelKey)}</span>}
                    </div>
                  </div>
                </div>

                {ind.bio && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{ind.bio}</p>}

                <div className="flex items-center gap-2 mt-4">
                  {isAdded ? (
                    <Button variant="outline" size="sm" disabled className="flex-1">
                      <Check className="h-3.5 w-3.5 mr-1.5" />{t('directory.inBase')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => addMutation.mutate(ind.companyId)}
                      disabled={addMutation.isPending && addMutation.variables === ind.companyId}
                      className="flex-1 bg-[#FE3C01] hover:bg-[#1A1613] text-white"
                      data-testid={`button-add-${ind.slug}`}
                    >
                      {addMutation.isPending && addMutation.variables === ind.companyId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <><UserPlus className="h-3.5 w-3.5 mr-1.5" />{t('directory.addToBase')}</>
                      )}
                    </Button>
                  )}
                  <a
                    href={`/company/${ind.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label={t('directory.viewProfile')}
                    data-testid={`button-view-${ind.slug}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
