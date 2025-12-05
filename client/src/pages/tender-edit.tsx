import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartInput, SmartTextarea } from "@/components/ui/smart-input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useEffect } from "react";
import type { Tender } from "@shared/schema";
import { getConstraints } from "@/lib/form-validation";

const editTenderSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  deadline: z.string().min(1, "Deadline is required"),
  budget: z.string().optional(),
  duration: z.string().optional(),
});

type EditTenderForm = z.infer<typeof editTenderSchema>;

export default function TenderEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const { toast } = useToast();

  const { data: tender, isLoading } = useQuery<Tender>({
    queryKey: ['/api/tenders', id],
    queryFn: async () => {
      const response = await fetch(`/api/tenders/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch tender");
      return response.json();
    },
    enabled: !!user && !!id,
  });

  const form = useForm<EditTenderForm>({
    resolver: zodResolver(editTenderSchema),
    mode: 'onChange',
    defaultValues: {
      title: "",
      description: "",
      deadline: "",
      budget: "",
      duration: "",
    },
  });

  useEffect(() => {
    if (tender) {
      const deadlineDate = new Date(tender.deadline);
      const formattedDeadline = deadlineDate.toISOString().slice(0, 16);
      
      form.reset({
        title: tender.title,
        description: tender.description || "",
        deadline: formattedDeadline,
        budget: tender.budget || "",
        duration: tender.duration || "",
      });
    }
  }, [tender, form]);

  const updateTenderMutation = useMutation({
    mutationFn: async (data: EditTenderForm) => {
      const response = await apiRequest('PATCH', `/api/tenders/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      toast({
        title: "Success!",
        description: "Tender updated successfully",
      });
      setLocation(`/tenders/${id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update tender",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditTenderForm) => {
    updateTenderMutation.mutate(data);
  };

  const isOwner = tender?.companyId === activeCompany?.id;
  const canEdit = isOwner && tender?.status === 'draft';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Tender not found</p>
              <Button
                variant="outline"
                onClick={() => setLocation('/dashboard')}
                className="mt-4"
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                {!isOwner 
                  ? "You don't have permission to edit this tender" 
                  : "Only draft tenders can be edited"}
              </p>
              <Button
                variant="outline"
                onClick={() => setLocation(`/tenders/${id}`)}
                className="mt-4"
              >
                Back to Tender
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button 
          variant="ghost" 
          onClick={() => setLocation(`/tenders/${id}`)}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tender
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Edit Tender</CardTitle>
            <CardDescription>
              Update the details of your tender. Only draft tenders can be edited.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tender Title *</FormLabel>
                      <FormControl>
                        <SmartInput 
                          placeholder="e.g., Website Development for E-commerce Platform" 
                          error={form.formState.errors.title}
                          isDirty={form.formState.dirtyFields.title}
                          constraints={getConstraints('title', field.value)}
                          data-testid="input-title"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <SmartTextarea 
                          rows={4}
                          maxLength={1000}
                          placeholder="Provide detailed requirements, specifications, and expectations..." 
                          error={form.formState.errors.description}
                          isDirty={form.formState.dirtyFields.description}
                          data-testid="input-description"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Submission Deadline *</FormLabel>
                        <FormControl>
                          <SmartInput 
                            type="datetime-local"
                            error={form.formState.errors.deadline}
                            isDirty={form.formState.dirtyFields.deadline}
                            constraints={getConstraints('deadline', field.value)}
                            data-testid="input-deadline"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Budget</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-budget">
                              <SelectValue placeholder="Select budget range" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="$10,000 - $25,000">$10,000 - $25,000</SelectItem>
                            <SelectItem value="$25,000 - $50,000">$25,000 - $50,000</SelectItem>
                            <SelectItem value="$50,000 - $100,000">$50,000 - $100,000</SelectItem>
                            <SelectItem value="$100,000+">$100,000+</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setLocation(`/tenders/${id}`)}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1 bg-primary-600 hover:bg-primary-700"
                    disabled={updateTenderMutation.isPending}
                    data-testid="button-save"
                  >
                    {updateTenderMutation.isPending ? (
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
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
