import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { Mail, ArrowRight, Loader2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { user, token, checkAuth } = useAuthStore();
  const { toast } = useToast();
  const { t } = useI18n();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otpSendAttempted = useRef(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      setLocation("/signup");
      return;
    }
    if (user.otpVerified) {
      const { activeCompany } = useAuthStore.getState();
      if (activeCompany) {
        setLocation("/dashboard");
      } else {
        setLocation("/onboarding");
      }
      return;
    }
  }, [user, setLocation]);

  // Send OTP on mount (skip if login already sent it)
  useEffect(() => {
    if (user && !user.otpVerified && !otpSent && !otpSendAttempted.current) {
      otpSendAttempted.current = true;
      const loginAlreadySent = sessionStorage.getItem('otp_sent_by_login') === 'true';
      if (loginAlreadySent) {
        setResendCooldown(60);
      } else {
        sendOTP();
      }
      setOtpSent(true);
    }
  }, [user]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendOTP = async () => {
    try {
      await apiRequest('POST', '/api/auth/send-otp', {});
      setResendCooldown(60);
      toast({
        title: t('onboardingPanel.codeSentTitle'),
        description: t('onboardingPanel.codeSentDesc', { email: user?.email ?? '' }),
      });
    } catch (error: any) {
      if (error.message?.includes("Too many")) {
        toast({
          title: t('onboardingPanel.rateLimitedTitle'),
          description: t('onboardingPanel.rateLimitedDesc'),
          variant: "destructive",
        });
      } else {
        let description = t('onboardingPanel.sendCodeErrorDesc');
        try {
          const raw = error?.message ?? '';
          const jsonStr = raw.includes(': ') ? raw.slice(raw.indexOf(': ') + 2) : raw;
          const parsed = JSON.parse(jsonStr);
          if (parsed?.message) description = parsed.message;
        } catch {}
        toast({
          title: t('onboardingPanel.sendCodeErrorTitle'),
          description,
          variant: "destructive",
        });
      }
    }
  };

  const handleChangeEmail = async () => {
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === user?.email.toLowerCase()) {
      toast({
        title: t('onboardingPanel.sameEmailTitle'),
        description: t('onboardingPanel.sameEmailDesc'),
        variant: "destructive",
      });
      return;
    }
    setChangingEmail(true);
    try {
      await apiRequest('POST', '/api/auth/change-email', { email: trimmed });
      sessionStorage.removeItem('otp_sent_by_login');
      await checkAuth();
      setCode(["", "", "", "", "", ""]);
      setResendCooldown(60);
      setChangeEmailOpen(false);
      setNewEmail("");
      toast({
        title: t('onboardingPanel.emailUpdatedTitle'),
        description: t('onboardingPanel.emailUpdatedDesc', { email: trimmed }),
      });
    } catch (error: any) {
      let description = t('onboardingPanel.changeEmailErrorDesc') || "Couldn't update your email. Please try again.";
      try {
        const raw = error?.message ?? '';
        const jsonStr = raw.includes(': ') ? raw.slice(raw.indexOf(': ') + 2) : raw;
        const parsed = JSON.parse(jsonStr);
        if (parsed?.message) description = parsed.message;
      } catch {}
      toast({
        title: t('onboardingPanel.changeEmailErrorTitle'),
        description,
        variant: "destructive",
      });
    } finally {
      setChangingEmail(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    sessionStorage.removeItem('otp_sent_by_login');
    await sendOTP();
  };

  const handleInput = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (index + i < 6) newCode[index + i] = digit;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();

      // Auto-submit if all 6 digits filled
      if (newCode.every(d => d !== '')) {
        handleVerify(newCode.join(''));
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits filled
    if (newCode.every(d => d !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const verificationCode = fullCode || code.join('');
    if (verificationCode.length !== 6) return;

    setLoading(true);
    try {
      const rememberBrowser = sessionStorage.getItem('remember_browser') === 'true';
      const response = await apiRequest('POST', '/api/auth/verify-otp', { code: verificationCode, rememberBrowser });
      const data = await response.json();

      if (data.verified) {
        // Store trusted browser token if returned
        if (data.trustedBrowserToken) {
          localStorage.setItem('trustedBrowserToken', data.trustedBrowserToken);
        }
        sessionStorage.removeItem('remember_browser');
        sessionStorage.removeItem('otp_sent_by_login');
        await checkAuth();
        toast({
          title: t('onboardingPanel.emailVerifiedTitle'),
          description: t('onboardingPanel.emailVerifiedDesc'),
        });

        const { activeCompany } = useAuthStore.getState();
        const redirect = localStorage.getItem('postOnboardingRedirect');
        if (redirect) {
          localStorage.removeItem('postOnboardingRedirect');
          setLocation(redirect);
        } else if (activeCompany) {
          setLocation("/dashboard");
        } else {
          setLocation("/onboarding");
        }
      }
    } catch (error: any) {
      toast({
        title: t('onboardingPanel.verifyFailedTitle'),
        description: error.message || t('onboardingPanel.verifyFailedDesc'),
        variant: "destructive",
      });
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-6">
            <Mail className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">{t('onboardingPanel.checkYourEmail')}</h1>
          <p className="text-neutral-500">
            {t('onboardingPanel.sentCodeTo')}{" "}
            <span className="font-medium text-neutral-700">{user.email}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setNewEmail(user.email);
              setChangeEmailOpen(true);
            }}
            className="mt-2 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            data-testid="button-change-email"
          >
            <Pencil className="w-3.5 h-3.5" />
            {t('onboardingPanel.wrongEmailChange')}
          </button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2 justify-center mb-6">
              {code.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleInput(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 focus:border-primary-500 focus:ring-primary-500"
                  disabled={loading}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <Button
              onClick={() => handleVerify()}
              className="w-full mb-4"
              size="lg"
              disabled={loading || code.some(d => d === '')}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('onboardingPanel.verifying')}
                </>
              ) : (
                <>
                  {t('onboardingPanel.verifyEmailBtn')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-neutral-500">
                {t('onboardingPanel.didntReceiveCode')}{" "}
                {resendCooldown > 0 ? (
                  <span className="text-neutral-400">{t('onboardingPanel.resendIn', { seconds: resendCooldown })}</span>
                ) : (
                  <button
                    onClick={handleResend}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {t('onboardingPanel.resendCode')}
                  </button>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={changeEmailOpen} onOpenChange={setChangeEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('onboardingPanel.changeEmailAddress')}</DialogTitle>
            <DialogDescription>
              {t('onboardingPanel.enterCorrectEmailDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-email">{t('onboardingPanel.newEmail')}</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t('onboardingPanel.emailPlaceholder')}
              disabled={changingEmail}
              data-testid="input-new-email"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !changingEmail) handleChangeEmail();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangeEmailOpen(false)}
              disabled={changingEmail}
            >
              {t('onboardingPanel.cancelBtn')}
            </Button>
            <Button
              onClick={handleChangeEmail}
              disabled={changingEmail || !newEmail.trim()}
              data-testid="button-confirm-change-email"
            >
              {changingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('onboardingPanel.updating')}
                </>
              ) : (
                t('onboardingPanel.updateResendCode')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
