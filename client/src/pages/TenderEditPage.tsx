import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import {
  ArrowLeft, Loader2, Save, Send, RotateCcw, Plus, X,
  FileText, Calendar, DollarSign, ClipboardList, MessageSquare,
  ListChecks, Tag, Eye, EyeOff
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type { Tender } from "@shared/schema";

// ─── Constants ───────────────────────────────────────────────────────────────

const SUBMISSION_TYPE_OPTIONS = [
  { value: "quote_only", label: "Price Quote Only" },
  { value: "tech_fin_proposal", label: "Full Proposal (Technical + Financial)" },
  { value: "video_only", label: "Video Pitch Only" },
  { value: "tech_fin_with_video", label: "Full Proposal + Video Pitch" },
  { value: "document_only", label: "Document Only" },
];

const INQUIRY_TYPE_OPTIONS = [
  { value: "inside_bid", label: "Anonymous Q&A (through Bid platform)" },
  { value: "email_whatsapp", label: "Direct Contact (Email & WhatsApp)" },
];

// ─── Schema ──────────────────────────────────────────────────────────────────

const editTenderSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  deadline: z.string().min(1, "Deadline is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.string().optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  showPriceToVendors: z.boolean().optional(),
  submissionType: z.string().optional(),
  videoRequired: z.boolean().optional(),
  videoUrl: z.string().optional(),
  inquiryType: z.string().optional(),
  whatsappContact: z.string().optional(),
  emailContact: z.string().optional(),
});

type EditTenderForm = z.infer<typeof editTenderSchema>;

interface Deliverable {
  id: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  description,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className={`h-1 ${color}`} />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TenderEditPage() {
  const [, params] = useRoute("/tenders/:id/edit");
  const [, navigate] = useLocation();
  const { activeCompany } = useAuthStore();
  const { toast } = useToast();
  const tenderId = params?.id;

  const [budgetType, setBudgetType] = useState<"exact" | "range">("exact");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);

  const { data: tender, isLoading } = useQuery<Tender>({
    queryKey: ["/api/tenders", tenderId],
    enabled: !!tenderId,
  } as any);

  const form = useForm<EditTenderForm>({
    resolver: zodResolver(editTenderSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      deadline: "",
      startDate: "",
      endDate: "",
      budget: "",
      budgetMin: undefined,
      budgetMax: undefined,
      showPriceToVendors: true,
      submissionType: "",
      videoRequired: false,
      videoUrl: "",
      inquiryType: "",
      whatsappContact: "",
      emailContact: "",
    },
  });

  const submissionType = form.watch("submissionType");
  const inquiryType = form.watch("inquiryType");

  useEffect(() => {
    if (!tender) return;

    setBudgetType((tender as any).budgetMin != null || (tender as any).budgetMax != null ? "range" : "exact");

    if ((tender as any).skills && Array.isArray((tender as any).skills)) {
      setSkills((tender as any).skills as string[]);
    }
    if ((tender as any).deliverables && Array.isArray((tender as any).deliverables)) {
      setDeliverables((tender as any).deliverables as Deliverable[]);
    }

    const formattedDeadline = new Date((tender as any).deadline).toISOString().slice(0, 16);

    form.reset({
      title: (tender as any).title || "",
      description: (tender as any).description || "",
      deadline: formattedDeadline,
      startDate: (tender as any).startDate || "",
      endDate: (tender as any).endDate || "",
      budget: (tender as any).budget || "",
      budgetMin: (tender as any).budgetMin ?? undefined,
      budgetMax: (tender as any).budgetMax ?? undefined,
      showPriceToVendors: (tender as any).showPriceToVendors !== false,
      submissionType: (tender as any).submissionType || "",
      videoRequired: (tender as any).videoRequired || false,
      videoUrl: (tender as any).videoUrl || "",
      inquiryType: (tender as any).inquiryType || "",
      whatsappContact: (tender as any).whatsappContact || "",
      emailContact: (tender as any).emailContact || "",
    });
  }, [tender]);

  const updateTenderMutation = useMutation({
    mutationFn: async (data: EditTenderForm) => {
      const payload: Record<string, any> = { ...data, skills, deliverables };

      if (budgetType === "exact") {
        delete payload.budgetMin;
        delete payload.budgetMax;
      } else {
        delete payload.budget;
      }

      for (const key of Object.keys(payload)) {
        if (payload[key] === "") payload[key] = null;
      }

      const response = await apiRequest("PATCH", `/api/tenders/${tenderId}`, payload);
      return response.json();
    },
    onSuccess: (updatedTender) => {
      queryClient.setQueryData(["/api/tenders", tenderId], updatedTender);
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      toast({ title: "Saved", description: "Tender updated successfully" });
      navigate(`/tenders/${tenderId}`);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to update tender", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/tenders/${tenderId}/status`, { status: "published" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenders", tenderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      toast({ title: "Published!", description: "Tender is now live and accepting proposals" });
      navigate(`/tenders/${tenderId}`);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to publish", variant: "destructive" });
    },
  });

  const revertMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/tenders/${tenderId}/status`, { status: "draft" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenders", tenderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      toast({ title: "Reverted to Draft" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to revert", variant: "destructive" });
    },
  });

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  };

  const addDeliverable = () => {
    setDeliverables([...deliverables, { id: Date.now().toString(), name: "", description: "", unit: "unit", quantity: 1 }]);
  };
  const updateDeliverable = (did: string, field: keyof Deliverable, value: any) => {
    setDeliverables(deliverables.map((d) => (d.id === did ? { ...d, [field]: value } : d)));
  };
  const removeDeliverable = (did: string) => setDeliverables(deliverables.filter((d) => d.id !== did));

  const isOwner = (tender as any)?.companyId === activeCompany?.id;
  const isDraft = (tender as any)?.status === "draft";
  const isPublished = (tender as any)?.status === "published";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Tender not found</p>
            <Button onClick={() => navigate("/dashboard")} className="mt-4">Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => navigate(`/tenders/${tenderId}`)} className="mb-6 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tender
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Tender</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isPublished ? "This tender is live. Changes apply immediately." : "Draft — not yet visible to vendors."}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateTenderMutation.mutate(data))} className="space-y-6">

            {/* 1. Basics */}
            <SectionCard
              icon={<FileText className="h-4 w-4 text-[#E25E45]" />}
              title="Project Basics"
              description="Core information about the project"
              color="bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]"
            >
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl><Input placeholder="e.g., Brand Identity Design for Fintech Startup" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl><Textarea rows={5} placeholder="Full project context, background, and requirements..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

            </SectionCard>

            {/* 2. Timeline */}
            <SectionCard
              icon={<Calendar className="h-4 w-4 text-blue-600" />}
              title="Timeline & Dates"
              description="Submission deadline and project schedule"
              color="bg-gradient-to-r from-blue-500 to-blue-400"
            >
              <FormField control={form.control} name="deadline" render={({ field }) => (
                <FormItem>
                  <FormLabel>Submission Deadline *</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </SectionCard>

            {/* 3. Budget */}
            <SectionCard
              icon={<DollarSign className="h-4 w-4 text-green-600" />}
              title="Budget"
              description="Project budget in SAR and visibility settings"
              color="bg-gradient-to-r from-green-500 to-emerald-400"
            >
              <div className="flex gap-2">
                {["exact", "range"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBudgetType(type as "exact" | "range")}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      budgetType === type
                        ? "bg-[#E25E45] text-white border-[#E25E45]"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {type === "exact" ? "Exact Amount" : "Range"}
                  </button>
                ))}
              </div>

              {budgetType === "exact" ? (
                <FormField control={form.control} name="budget" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Amount (SAR)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">SAR</span>
                        <Input className="pl-12" placeholder="e.g., 50000" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="budgetMin" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min (SAR)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 30000" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="budgetMax" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max (SAR)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 80000" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              <FormField control={form.control} name="showPriceToVendors" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      {field.value ? <Eye className="h-4 w-4 text-gray-500" /> : <EyeOff className="h-4 w-4 text-gray-500" />}
                      <div>
                        <p className="text-sm font-medium">Show budget to vendors</p>
                        <p className="text-xs text-muted-foreground">{field.value ? "Vendors can see the budget" : "Budget is hidden"}</p>
                      </div>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </div>
                </FormItem>
              )} />
            </SectionCard>

            {/* 4. Submission */}
            <SectionCard
              icon={<ClipboardList className="h-4 w-4 text-purple-600" />}
              title="Submission Requirements"
              description="How vendors should respond to this RFP"
              color="bg-gradient-to-r from-purple-500 to-purple-400"
            >
              <FormField control={form.control} name="submissionType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Submission Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select how vendors should respond" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUBMISSION_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {submissionType === "tech_fin_with_video" && (
                <FormField control={form.control} name="videoRequired" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div>
                        <p className="text-sm font-medium text-orange-900 dark:text-orange-200">Require video submission</p>
                        <p className="text-xs text-orange-700 dark:text-orange-400">Make the video pitch mandatory</p>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </div>
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="videoUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Video URL (optional)</FormLabel>
                  <FormControl><Input placeholder="https://youtube.com/watch?v=..." {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">A video you've recorded to explain the project to vendors</p>
                  <FormMessage />
                </FormItem>
              )} />
            </SectionCard>

            {/* 5. Contact & Q&A */}
            <SectionCard
              icon={<MessageSquare className="h-4 w-4 text-green-600" />}
              title="Contact & Q&A"
              description="How vendors can reach you with questions"
              color="bg-gradient-to-r from-green-500 to-teal-400"
            >
              <FormField control={form.control} name="inquiryType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Q&A Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select how vendors ask questions" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INQUIRY_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {inquiryType === "email_whatsapp" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="emailContact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl><Input type="email" placeholder="inquiries@company.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="whatsappContact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl><Input placeholder="+966 5X XXX XXXX" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}
            </SectionCard>

            {/* 6. Skills */}
            <SectionCard
              icon={<Tag className="h-4 w-4 text-amber-600" />}
              title="Required Skills & Expertise"
              description="Tags for the skills vendors should have"
              color="bg-gradient-to-r from-amber-500 to-orange-400"
            >
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., React, UI/UX, Figma — press Enter to add"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                />
                <Button type="button" variant="outline" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1 pr-1">
                      {skill}
                      <button type="button" onClick={() => setSkills(skills.filter((s) => s !== skill))} className="ml-1 hover:text-red-500 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* 7. Deliverables */}
            <SectionCard
              icon={<ListChecks className="h-4 w-4 text-indigo-600" />}
              title="Scope of Work & Deliverables"
              description="Itemized list of what vendors must deliver"
              color="bg-gradient-to-r from-indigo-500 to-indigo-400"
            >
              {deliverables.length > 0 && (
                <div className="space-y-3">
                  {deliverables.map((d, index) => (
                    <div key={d.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white bg-indigo-500 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{index + 1}</span>
                        <Input placeholder="Deliverable name" value={d.name} onChange={(e) => updateDeliverable(d.id, "name", e.target.value)} className="flex-1" />
                        <button type="button" onClick={() => removeDeliverable(d.id)} className="text-gray-400 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                      </div>
                      <Input placeholder="Description (optional)" value={d.description} onChange={(e) => updateDeliverable(d.id, "description", e.target.value)} />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Quantity</Label>
                          <Input type="number" min={1} value={d.quantity} onChange={(e) => updateDeliverable(d.id, "quantity", Number(e.target.value))} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Unit</Label>
                          <Input placeholder="e.g., page, hour, item" value={d.unit} onChange={(e) => updateDeliverable(d.id, "unit", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button type="button" variant="outline" className="w-full" onClick={addDeliverable}>
                <Plus className="h-4 w-4 mr-2" />Add Deliverable
              </Button>
            </SectionCard>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate(`/tenders/${tenderId}`)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-[#E25E45] hover:bg-[#d54d35] text-white" disabled={updateTenderMutation.isPending}>
                  {updateTenderMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Changes</>}
                </Button>
              </div>

              {isDraft && (
                <>
                  <Button type="button" onClick={() => publishMutation.mutate()} className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={publishMutation.isPending}>
                    {publishMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Publishing...</> : <><Send className="h-4 w-4 mr-2" />Publish Tender</>}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">Publishing will make this tender visible and open for proposals</p>
                </>
              )}

              {isPublished && (
                <>
                  <Button type="button" onClick={() => revertMutation.mutate()} variant="outline" className="w-full border-amber-500 text-amber-600 hover:bg-amber-50" disabled={revertMutation.isPending}>
                    {revertMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reverting...</> : <><RotateCcw className="h-4 w-4 mr-2" />Revert to Draft</>}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">Reverting will unpublish this tender and stop accepting new proposals</p>
                </>
              )}
            </div>

          </form>
        </Form>
      </div>
    </div>
  );
}
