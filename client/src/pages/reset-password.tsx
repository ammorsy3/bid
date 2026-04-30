import { useState } from "react";
import { useSearch, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NeonButton } from "@/components/ui/neon-button";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle } from "lucide-react";

type ResetForm = { password: string; confirmPassword: string };

export default function ResetPassword() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const { toast } = useToast();
  const token = new URLSearchParams(search).get("token");
  const [done, setDone] = useState(false);
  const [invalid, setInvalid] = useState(!token);

  const form = useForm<ResetForm>({
    resolver: zodResolver(
      z.object({
        password: z.string().min(6, t('validation.passwordMin')),
        confirmPassword: z.string().min(6, t('validation.passwordMin')),
      }).refine((d) => d.password === d.confirmPassword, {
        message: t('validation.passwordsNoMatch'),
        path: ["confirmPassword"],
      })
    ),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetForm) => {
    try {
      await apiRequest("POST", "/api/auth/reset-password", { token, password: data.password });
      setDone(true);
    } catch (err: any) {
      const msg = err?.message || t("auth.passwordResetError");
      if (msg.includes("expired") || msg.includes("Invalid")) {
        setInvalid(true);
      } else {
        toast({ title: t("common.error"), description: msg, variant: "destructive" });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <span className="text-xl font-bold text-neutral-900">Bid</span>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <CheckCircle className="h-7 w-7 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{t("auth.passwordResetSuccess")}</h2>
            <NeonButton className="w-full mt-2" onClick={() => setLocation("/login")}>
              {t("auth.signIn")}
            </NeonButton>
          </div>
        ) : invalid ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <XCircle className="h-7 w-7 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{t("auth.resetLinkInvalid")}</h2>
            <NeonButton className="w-full mt-2" onClick={() => setLocation("/login")}>
              {t("auth.requestNewLink")}
            </NeonButton>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-neutral-900 mb-1">{t("auth.forgotPasswordTitle")}</h2>
              <p className="text-sm text-neutral-500">{t("auth.newPassword")}</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.newPassword")}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={t("auth.newPasswordPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.confirmNewPassword")}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={t("auth.confirmNewPasswordPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <NeonButton
                  type="submit"
                  size="lg"
                  className="w-full mt-2"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? t("auth.resettingPassword") : t("auth.resetPassword")}
                </NeonButton>
              </form>
            </Form>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
              >
                {t("auth.backToLogin")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
