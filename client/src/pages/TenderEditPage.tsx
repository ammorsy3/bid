import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useRoute, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Tender } from "@shared/schema";

export default function TenderEditPage() {
  const [, params] = useRoute("/tenders/:id/edit");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const tenderId = params?.id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const { data: tender, isLoading } = useQuery({
    queryKey: ["/api/tenders", tenderId],
    enabled: !!tenderId,
  } as any);

  useEffect(() => {
    if (tender) {
      setTitle(tender.title || "");
      setDescription(tender.description || "");
      setDeadline(tender.deadline || "");
      setBudget(tender.budget || tender.budgetRange || "");
      setVideoUrl(tender.videoUrl || "");
    }
  }, [tender]);

  const updateTender = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/tenders/${tenderId}`, {
        title: title.trim(),
        description: description.trim(),
        deadline,
        budget,
        videoUrl: videoUrl.trim() || undefined,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenders", tenderId] });
      toast({
        title: "Tender updated!",
        description: "Your changes have been saved successfully.",
      });
      navigate("/dashboard?tab=tenders");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update tender",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and description are required",
        variant: "destructive",
      });
      return;
    }
    updateTender.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-page" />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Tender Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <img
            src={logoPath}
            alt="Bid"
            className="h-16 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/dashboard")}
          />
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Edit Form */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-2xl">Edit Tender</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Tender Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Web Development Project"
                className="text-base"
                data-testid="input-title"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide detailed information about the project..."
                className="text-base min-h-32"
                data-testid="textarea-description"
              />
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Deadline
              </label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="text-base"
                data-testid="input-deadline"
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Budget / Budget Range
              </label>
              <Input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g., $5,000-$10,000"
                className="text-base"
                data-testid="input-budget"
              />
            </div>

            {/* Video URL */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Video URL (Optional)
              </label>
              <Input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="text-base"
                data-testid="input-video-url"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t">
              <Button
                onClick={handleSave}
                disabled={updateTender.isPending}
                className="flex-1 bg-[#E25E45] hover:bg-[#d54d35] text-white font-semibold py-6"
                data-testid="button-save"
              >
                {updateTender.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                onClick={() => navigate("/dashboard")}
                variant="outline"
                className="flex-1 py-6"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
