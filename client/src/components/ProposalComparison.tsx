import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Sparkles, RotateCcw, AlertTriangle, Loader2, Video } from "lucide-react";

interface ProposalAnalysis {
  id: string;
  tenderId: string;
  offerId: string;
  scores: Record<string, { score: number; justification: string }> | null;
  overallScore: number | null;
  extractedData: {
    timeline?: string;
    pricing?: { amount?: number; breakdown?: string };
    keyStrengths?: string[];
    weaknesses?: string[];
    approach?: string;
  } | null;
  recommendation: string | null;
  status: string;
  errorMessage: string | null;
  analyzedAt: string | null;
  offer: {
    id: string;
    quotePrice: number | null;
    notes: string | null;
    videoUrl: string | null;
    status: string;
    submittedAt: string;
  } | null;
  company: {
    id: string;
    name: string;
    category: string | null;
    verificationStatus: string;
    displayName: string | null;
    logoUrl: string | null;
  } | null;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 bg-green-50";
  if (score >= 60) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function ScoreCell({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm font-semibold px-2 py-0.5 rounded ${getScoreColor(score)}`}>
        {score}/100
      </span>
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${getScoreBarColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function ProposalComparison({ tenderId, offers }: { tenderId: string; offers: any[] }) {
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);

  const { data: analyses, isLoading } = useQuery<ProposalAnalysis[]>({
    queryKey: ["/api/ai/proposal-analysis", tenderId],
    queryFn: async () => {
      const response = await fetch(`/api/ai/proposal-analysis/${tenderId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch analyses");
      return response.json();
    },
    enabled: !!tenderId,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      setAnalyzing(true);
      const response = await apiRequest("POST", `/api/ai/analyze-proposals/${tenderId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/proposal-analysis", tenderId] });
      toast({ title: "Analysis complete", description: "AI has scored and compared all proposals." });
      setAnalyzing(false);
    },
    onError: (error: Error) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
      setAnalyzing(false);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-muted-foreground">Loading analyses...</span>
        </CardContent>
      </Card>
    );
  }

  const hasAnalyses = analyses && analyses.length > 0;
  const scoredAnalyses = analyses?.filter(a => a.status === "completed" && a.overallScore != null) || [];
  const skippedAnalyses = analyses?.filter(a => a.status === "skipped") || [];
  const failedAnalyses = analyses?.filter(a => a.status === "failed") || [];
  const recommendation = scoredAnalyses[0]?.recommendation;

  // Collect all unique criteria names across all analyses
  const allCriteria = new Set<string>();
  scoredAnalyses.forEach(a => {
    if (a.scores) Object.keys(a.scores).forEach(k => allCriteria.add(k));
  });

  // No analyses yet — show the trigger button
  if (!hasAnalyses) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            AI Proposal Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 text-sm">
            Let AI analyze and score each vendor proposal against your evaluation criteria,
            extract key data points, and provide a side-by-side comparison with a recommendation.
          </p>
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzing || offers.length === 0}
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Analyzing {offers.length} proposal{offers.length !== 1 ? "s" : ""}...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Compare & Score with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show results
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          AI Proposal Comparison
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzing}
        >
          {analyzing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RotateCcw className="h-4 w-4 mr-1" />
          )}
          Re-analyze
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recommendation */}
        {recommendation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Trophy className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">AI Recommendation</h4>
                <p className="text-blue-800 text-sm">{recommendation}</p>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        {scoredAnalyses.length > 0 && (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium text-muted-foreground min-w-[140px]">Criteria</th>
                  {scoredAnalyses.map(a => (
                    <th key={a.id} className="text-left p-3 font-medium min-w-[160px]">
                      {a.company?.displayName || a.company?.name || "Unknown"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Overall Score Row */}
                <tr className="border-b bg-gray-50/50 font-medium">
                  <td className="p-3">Overall Score</td>
                  {scoredAnalyses.map(a => (
                    <td key={a.id} className="p-3">
                      {a.overallScore != null ? <ScoreCell score={a.overallScore} /> : "—"}
                    </td>
                  ))}
                </tr>

                {/* Price Row */}
                <tr className="border-b">
                  <td className="p-3 text-muted-foreground">Price (SAR)</td>
                  {scoredAnalyses.map(a => (
                    <td key={a.id} className="p-3">
                      {a.extractedData?.pricing?.amount
                        ? a.extractedData.pricing.amount.toLocaleString()
                        : a.offer?.quotePrice
                        ? a.offer.quotePrice.toLocaleString()
                        : "—"}
                    </td>
                  ))}
                </tr>

                {/* Timeline Row */}
                <tr className="border-b">
                  <td className="p-3 text-muted-foreground">Timeline</td>
                  {scoredAnalyses.map(a => (
                    <td key={a.id} className="p-3">
                      {a.extractedData?.timeline || "—"}
                    </td>
                  ))}
                </tr>

                {/* Individual Criteria Scores */}
                {Array.from(allCriteria).map(criterion => (
                  <tr key={criterion} className="border-b">
                    <td className="p-3 text-muted-foreground">{criterion}</td>
                    {scoredAnalyses.map(a => (
                      <td key={a.id} className="p-3">
                        {a.scores?.[criterion] ? (
                          <div>
                            <ScoreCell score={a.scores[criterion].score} />
                            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                              {a.scores[criterion].justification}
                            </p>
                          </div>
                        ) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Key Strengths */}
                <tr className="border-b">
                  <td className="p-3 text-muted-foreground">Key Strengths</td>
                  {scoredAnalyses.map(a => (
                    <td key={a.id} className="p-3">
                      {a.extractedData?.keyStrengths?.length ? (
                        <ul className="list-disc list-inside text-xs space-y-0.5">
                          {a.extractedData.keyStrengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      ) : "—"}
                    </td>
                  ))}
                </tr>

                {/* Weaknesses */}
                <tr className="border-b">
                  <td className="p-3 text-muted-foreground">Weaknesses</td>
                  {scoredAnalyses.map(a => (
                    <td key={a.id} className="p-3">
                      {a.extractedData?.weaknesses?.length ? (
                        <ul className="list-disc list-inside text-xs space-y-0.5">
                          {a.extractedData.weaknesses.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      ) : "—"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Skipped (video-only) offers */}
        {skippedAnalyses.length > 0 && (
          <div className="space-y-2">
            {skippedAnalyses.map(a => (
              <div key={a.id} className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 rounded-lg p-3">
                <Video className="h-4 w-4" />
                <span className="font-medium">{a.company?.displayName || a.company?.name || "Unknown"}</span>
                <Badge variant="outline" className="text-xs">Manual review required</Badge>
                <span className="text-xs">— Video-only submission</span>
              </div>
            ))}
          </div>
        )}

        {/* Failed analyses */}
        {failedAnalyses.length > 0 && (
          <div className="space-y-2">
            {failedAnalyses.map(a => (
              <div key={a.id} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">{a.company?.displayName || a.company?.name || "Unknown"}</span>
                <span className="text-xs">— {a.errorMessage || "Analysis failed"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Analysis metadata */}
        {scoredAnalyses[0]?.analyzedAt && (
          <p className="text-xs text-muted-foreground">
            Last analyzed: {new Date(scoredAnalyses[0].analyzedAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
