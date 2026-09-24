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
import { apiRequest, ApiError } from "@/lib/queryClient";
import { CheckCircle, XCircle } from "lucide-react";
import { BidLogo } from "@/components/brand/BidLogo";
import { useForceLightMode } from "@/hooks/useForceLightMode";
import { LanguageSwitch } from "@/components/LanguageSwitch";

type ResetForm = { password: string; confirmPassword: string };

export default function ResetPassword() {
  useForceLightMode();
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
        password: z.string().min(8, t('validation.passwordMin')),
        confirmPassword: z.string().min(8, t('validation.passwordMin')),
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
      // The server answers in English; show the user's language instead.
      const status = err instanceof ApiError ? err.statusCode : undefined;
      const msg: string = err?.message ?? "";
      if (msg.includes("expired") || msg.includes("Invalid")) {
        setInvalid(true);
      } else {
        const description =
          status === 429 ? t("auth.tooManyAttempts")
          : msg.includes("at least 8") ? t("validation.passwordMin")
          : t("auth.passwordResetError");
        toast({ title: t("common.error"), description, variant: "destructive" });
      }
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-muted p-6">
      <div className="w-full max-w-md">
        <div className="relative flex items-center justify-center mb-8">
          <BidLogo variant="orange" size={40} />
          <LanguageSwitch className="absolute end-0 top-1/2 -translate-y-1/2 -me-1 lg:hidden" />
        </div>

        {done ? (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <CheckCircle className="h-7 w-7 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground text-balance md:text-wrap">{t("auth.passwordResetSuccess")}</h2>
            <NeonButton className="w-full mt-2 min-h-11 md:min-h-0" onClick={() => setLocation("/login")}>
              {t("auth.signIn")}
            </NeonButton>
          </div>
        ) : invalid ? (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <XCircle className="h-7 w-7 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground text-balance md:text-wrap">{t("auth.resetLinkInvalid")}</h2>
            <NeonButton className="w-full mt-2 min-h-11 md:min-h-0" onClick={() => setLocation("/login")}>
              {t("auth.requestNewLink")}
            </NeonButton>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="font-display font-black text-2xl text-foreground mb-1 tracking-[-0.03em]">{t("auth.forgotPasswordTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("auth.passwordReqMin8")}</p>
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
                        <Input type="password" autoComplete="new-password" dir="ltr" placeholder={t("auth.newPasswordPlaceholder")} {...field} />
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
                        <Input type="password" autoComplete="new-password" dir="ltr" placeholder={t("auth.confirmNewPasswordPlaceholder")} {...field} />
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
              {/* 44px tap area that moves nothing: the padding comes back out of the margins. */}
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="-my-3 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
