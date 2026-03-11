import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  Check,
  Minus,
  Eye,
  Download,
  X,
  RotateCcw,
  CheckCircle,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { viewAuthenticatedFile } from "@/lib/downloadFile";

interface OfferAnalysis {
  id: string;
  offerId: string;
  status: string;
  executiveSummary: string | null;
  tableOfContents: { section: string; pageRange: string }[] | null;
  criteriaMapping: Record<string, string> | null;
  deliverables: string[] | null;
  financial: {
    total?: number;
    breakdown?: { item: string; amount: number }[];
    paymentTerms?: string;
    vat?: number;
  } | null;
  errorMessage: string | null;
  analyzedAt: string | null;
}

interface Offer {
  id: string;
  companyId: string;
  technicalFileUrl: string | null;
  financialFileUrl: string | null;
  combinedFileUrl?: string | null;
  quotePrice: number | null;
  videoUrl: string | null;
  submittedAt: string;
  status: string;
  company: {
    id: string;
    name: string;
    category: string | null;
    verificationStatus: string;
  };
  profile?: {
    displayName: string | null;
    bio: string | null;
    logoUrl: string | null;
  };
}

interface ProposalComparisonProps {
  tenderId: string;
  offers: Offer[];
  analyses?: OfferAnalysis[];
}

export default function ProposalComparison({ tenderId, offers, analyses = [] }: ProposalComparisonProps) {
  const { toast } = useToast();
  const [hiddenOffers, setHiddenOffers] = useState<Set<string>>(new Set());
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/ai/analyze-proposals/${tenderId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/proposal-analysis", tenderId] });
      toast({ title: "Analysis complete", description: "All proposals have been analyzed." });
    },
    onError: (error: Error) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    },
  });

  const savingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/tenders/${tenderId}/savings`, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Vendor selected",
        description: `Savings recorded: SAR ${data.savingsAmount?.toLocaleString() || 0} (${data.savingsPercentage || 0}% savings)`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record savings", description: error.message, variant: "destructive" });
    },
  });

  // Get completed analyses matched to offers
  const completedAnalyses = analyses.filter(a => a.status === "completed");
  const hasAnalyses = completedAnalyses.length > 0;

  // Filter visible offers
  const visibleOffers = offers.filter(o => !hiddenOffers.has(o.id));
  const removedOffers = offers.filter(o => hiddenOffers.has(o.id));

  // Build deliverables union
  const allDeliverables = new Set<string>();
  completedAnalyses.forEach(a => {
    if (a.deliverables) a.deliverables.forEach(d => allDeliverables.add(d));
  });

  // Financial data per offer
  const getFinancial = (offerId: string) => {
    const analysis = completedAnalyses.find(a => a.offerId === offerId);
    return analysis?.financial || null;
  };

  const getTotal = (offerId: string): number | null => {
    const fin = getFinancial(offerId);
    if (fin?.total) return fin.total;
    const offer = offers.find(o => o.id === offerId);
    return offer?.quotePrice || null;
  };

  // Find cheapest and most expensive
  const totals = visibleOffers.map(o => ({ id: o.id, total: getTotal(o.id) })).filter(t => t.total != null) as { id: string; total: number }[];
  const cheapestId = totals.length > 0 ? totals.reduce((min, t) => t.total < min.total ? t : min, totals[0]).id : null;
  const mostExpensiveId = totals.length > 0 ? totals.reduce((max, t) => t.total > max.total ? t : max, totals[0]).id : null;
  const highestPrice = totals.length > 0 ? Math.max(...totals.map(t => t.total)) : 0;
  const lowestPrice = totals.length > 0 ? Math.min(...totals.map(t => t.total)) : 0;

  const getVendorName = (offer: Offer) => offer.profile?.displayName || offer.company.name;

  const handleSelectVendor = (offer: Offer) => {
    const selectedPrice = getTotal(offer.id);
    if (selectedPrice == null) return;

    setSelectedVendor(offer.id);
    savingsMutation.mutate({
      selectedOfferId: offer.id,
      selectedCompanyId: offer.companyId,
      selectedPrice,
      highestPrice,
      lowestPrice,
    });
  };

  // No analyses yet — show trigger
  if (!hasAnalyses) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Proposal Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 text-sm">
            Analyze all proposals to generate a side-by-side comparison of deliverables and financials.
          </p>
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending || offers.length < 2}
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Analyzing {offers.length} proposals...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze & Compare All
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          Proposal Comparison
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending}
        >
          {analyzeMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RotateCcw className="h-4 w-4 mr-1" />
          )}
          Re-analyze All
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Section A: Deliverables Comparison */}
        {allDeliverables.size > 0 && (
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-3">Deliverables Comparison</h4>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium text-muted-foreground min-w-[200px]">Deliverable</th>
                    {visibleOffers.map(o => (
                      <th key={o.id} className={`text-center p-3 font-medium min-w-[140px] ${selectedVendor === o.id ? 'bg-blue-50' : ''}`}>
                        {getVendorName(o)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(allDeliverables).map(deliverable => {
                    return (
                      <tr key={deliverable} className="border-b">
                        <td className="p-3 text-xs text-gray-700">{deliverable}</td>
                        {visibleOffers.map(o => {
                          const analysis = completedAnalyses.find(a => a.offerId === o.id);
                          const hasIt = analysis?.deliverables?.some(d =>
                            d.toLowerCase().includes(deliverable.toLowerCase()) ||
                            deliverable.toLowerCase().includes(d.toLowerCase())
                          );
                          return (
                            <td key={o.id} className={`p-3 text-center ${selectedVendor === o.id ? 'bg-blue-50/50' : ''}`}>
                              {hasIt ? (
                                <Check className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <Minus className="h-4 w-4 text-gray-300 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section B: Financial Comparison */}
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-3">Financial Comparison</h4>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium text-muted-foreground min-w-[160px]">Item</th>
                  {visibleOffers.map(o => (
                    <th key={o.id} className={`text-right p-3 font-medium min-w-[160px] ${selectedVendor === o.id ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="flex items-center gap-1">
                          {getVendorName(o)}
                          {cheapestId === o.id && totals.length > 1 && <TrendingUp className="h-3.5 w-3.5 text-green-500" />}
                          {mostExpensiveId === o.id && totals.length > 1 && cheapestId !== mostExpensiveId && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                          {selectedVendor === o.id && <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">Selected</Badge>}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 font-normal text-gray-400 hover:text-gray-700">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => {
                                const fileUrl = o.combinedFileUrl || o.technicalFileUrl;
                                if (fileUrl) viewAuthenticatedFile(fileUrl);
                              }}
                              disabled={!o.combinedFileUrl && !o.technicalFileUrl}
                            >
                              <Download className="h-4 w-4 mr-2" /> View PDF
                            </DropdownMenuItem>
                            {selectedVendor !== o.id && (
                              <DropdownMenuItem
                                onClick={() => handleSelectVendor(o)}
                                disabled={savingsMutation.isPending || getTotal(o.id) == null}
                                className="text-blue-600 focus:text-blue-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" /> Select Vendor
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setHiddenOffers(prev => new Set([...Array.from(prev), o.id]))}
                              className="text-red-500 focus:text-red-500"
                            >
                              <X className="h-4 w-4 mr-2" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Total Price */}
                <tr className="border-b font-medium bg-gray-50/50">
                  <td className="p-3">Total Price</td>
                  {visibleOffers.map(o => {
                    const total = getTotal(o.id);
                    return (
                      <td key={o.id} className={`p-3 text-right ${selectedVendor === o.id ? 'bg-blue-50/50' : ''}`}>
                        {total != null ? (
                          <span className={`font-semibold ${cheapestId === o.id && totals.length > 1 ? 'text-green-600' : mostExpensiveId === o.id && totals.length > 1 && cheapestId !== mostExpensiveId ? 'text-red-600' : 'text-gray-900'}`}>
                            SAR {total.toLocaleString()}
                          </span>
                        ) : "—"}
                      </td>
                    );
                  })}
                </tr>

                {/* VAT */}
                <tr className="border-b">
                  <td className="p-3 text-muted-foreground">VAT</td>
                  {visibleOffers.map(o => {
                    const fin = getFinancial(o.id);
                    return (
                      <td key={o.id} className={`p-3 text-right ${selectedVendor === o.id ? 'bg-blue-50/50' : ''}`}>
                        {fin?.vat != null ? `${fin.vat}%` : "—"}
                      </td>
                    );
                  })}
                </tr>

                {/* Payment Terms */}
                <tr className="border-b">
                  <td className="p-3 text-muted-foreground">Payment Terms</td>
                  {visibleOffers.map(o => {
                    const fin = getFinancial(o.id);
                    return (
                      <td key={o.id} className={`p-3 text-right text-xs ${selectedVendor === o.id ? 'bg-blue-50/50' : ''}`}>
                        {fin?.paymentTerms || "—"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cost Savings Banner */}
          {totals.length > 1 && highestPrice > lowestPrice && (
            <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
              <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-800">
                <span className="font-semibold">Potential savings:</span> SAR {(highestPrice - lowestPrice).toLocaleString()} between cheapest and most expensive offer
              </span>
            </div>
          )}
        </div>


        {/* Removed vendors */}
        {removedOffers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">Removed from comparison</p>
            <div className="flex flex-wrap gap-2">
              {removedOffers.map(o => (
                <Button key={o.id} variant="outline" size="sm" className="text-xs"
                  onClick={() => setHiddenOffers(prev => {
                    const next = new Set(prev);
                    next.delete(o.id);
                    return next;
                  })}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> {getVendorName(o)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Analysis metadata */}
        {completedAnalyses[0]?.analyzedAt && (
          <p className="text-xs text-muted-foreground">
            Last analyzed: {new Date(completedAnalyses[0].analyzedAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
