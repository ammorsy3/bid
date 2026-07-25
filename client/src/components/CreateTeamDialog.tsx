import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { VENDOR_CATEGORIES } from "@shared/schema";
import { UsersRound, Loader2 } from "lucide-react";

const createTeamSchema = z.object({
  teamName: z.string().min(2, "Team name is required"),
  category: z.string().min(1, "Please select a category"),
});

type CreateTeamForm = z.infer<typeof createTeamSchema>;

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * In-dashboard team creation. A team is a separate workspace (accountType
 * 'team') with its own name — distinct from a company. Creating one adds it to
 * the user's memberships and switches into it, while their individual workspace
 * stays available in the workspace switcher.
 */
export default function CreateTeamDialog({ open, onOpenChange }: CreateTeamDialogProps) {
  const [, setLocation] = useLocation();
  const { checkAuth } = useAuthStore();
  const { t } = useI18n();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateTeamForm>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { teamName: "", category: "" },
  });

  const onSubmit = async (data: CreateTeamForm) => {
    setSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/companies", {
        name: data.teamName,
        category: data.category,
        accountType: "team",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create team");
      }
      const result = await response.json();
      // Switch the active workspace to the new team.
      if (result.token) localStorage.setItem("token", result.token);
      await checkAuth();
      toast({
        title: t('createTeamDialog.createdTitle'),
        description: t('createTeamDialog.createdDesc'),
      });
      form.reset();
      onOpenChange(false);
      // Land on the dashboard of the freshly-created team.
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: t('createTeamDialog.couldntCreate'),
        description: error.message || t('createTeamDialog.tryAgain'),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <UsersRound className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <DialogTitle>{t('createTeamDialog.title')}</DialogTitle>
              <DialogDescription>
                {t('createTeamDialog.subtitle')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField
              control={form.control}
              name="teamName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('createTeamDialog.teamName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('createTeamDialog.teamNamePlaceholder')}
                      {...field}
                      data-testid="input-team-name"
                    />
                  </FormControl>
                  <FormDescription>
                    {t('createTeamDialog.teamNameHelp')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('createTeamDialog.teamCategory')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-team-category">
                        <SelectValue placeholder={t('createTeamDialog.selectCategory')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VENDOR_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg bg-sky-50 border border-sky-200 p-3 text-xs text-sky-700">
              {t('createTeamDialog.note')}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                {t('createTeamDialog.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-sky-600 hover:bg-sky-700"
                data-testid="button-create-team-submit"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('createTeamDialog.creating')}
                  </>
                ) : (
                  t('createTeamDialog.create')
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
