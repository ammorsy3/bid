import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { emailInputProps } from "@/lib/form-validation";
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
import { BidLogo } from "@/components/brand/BidLogo";
import { useForceLightMode } from "@/hooks/useForceLightMode";

export default function VerifyEmail() {
  useForceLightMode();
  const [, setLocation] = useLocation();
  const { user, token, checkAuth } = useAuthStore();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // The boxes are disabled while a code is checked, so focus can only go back
  // to the first box once loading has finished.
  const refocusFirstBox = useRef(false);

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

  useEffect(() => {
    if (!loading && refocusFirstBox.current) {
      refocusFirstBox.current = false;
      inputRefs.current[0]?.focus();
    }
  }, [loading]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendOTP = async () => {
    try {
      await apiRequest('POST', '/api/auth/send-otp', { language });
      setResendCooldown(60);
      toast({
        title: t('onboardingPanel.codeSentTitle'),
        description: t('onboardingPanel.codeSentDesc', { email: user?.email ?? '' }),
      });
    } catch (error: any) {
      // The server answers in English; show the user's language instead.
      const status = error instanceof ApiError ? error.statusCode : undefined;
      const message: string = error?.message ?? '';
      if (status === 429 || message.includes("Too many")) {
        toast({
          title: t('onboardingPanel.rateLimitedTitle'),
          description: t('onboardingPanel.rateLimitedDesc'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('onboardingPanel.sendCodeErrorTitle'),
          // "inactive": the mail provider refuses this address (hard bounce or spam report).
          description: message.includes("inactive")
            ? t('onboardingPanel.emailUndeliverableDesc')
            : t('onboardingPanel.sendCodeErrorDesc'),
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
      await apiRequest('POST', '/api/auth/change-email', { email: trimmed, language });
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
      // Known server answers (English) mapped to the user's language.
      const status = error instanceof ApiError ? error.statusCode : undefined;
      const message: string = error?.message ?? '';
      const description =
        status === 429 ? t('auth.tooManyAttempts')
        : message.includes("already exists") ? t('onboardingPanel.emailTakenDesc')
        : message.includes("already your current email") ? t('onboardingPanel.sameEmailDesc')
        : /invalid email|email is required/i.test(message) ? t('validation.invalidEmail')
        : t('onboardingPanel.changeEmailErrorDesc');
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
      // Known server answers (English) mapped to the user's language; the
      // attempts left are only in the message text ("… 3 attempt(s) remaining").
      const status = error instanceof ApiError ? error.statusCode : undefined;
      const message: string = error?.message ?? '';
      const attemptsLeft = message.match(/(\d+) attempt/)?.[1];
      const description =
        status === 429 ? (message.includes("failed attempts") ? t('onboardingPanel.codeLockedDesc') : t('auth.tooManyAttempts'))
        : /expired|no verification code/i.test(message) ? t('onboardingPanel.codeExpiredDesc')
        : message.includes("Invalid verification code")
          ? (attemptsLeft ? t('onboardingPanel.wrongCodeLeftDesc', { count: attemptsLeft }) : t('onboardingPanel.wrongCodeDesc'))
        : t('onboardingPanel.verifyFailedDesc');
      toast({
        title: status === 429 ? t('onboardingPanel.rateLimitedTitle') : t('onboardingPanel.verifyFailedTitle'),
        description,
        variant: "destructive",
      });
      setCode(["", "", "", "", "", ""]);
      refocusFirstBox.current = true;
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-dvh flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <BidLogo variant="orange" size={40} />
        </div>
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-6">
            <Mail className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground mb-2 tracking-[-0.04em]">{t('onboardingPanel.checkYourEmail')}</h1>
          <p className="text-muted-foreground">
            {t('onboardingPanel.sentCodeTo')}{" "}
            <span className="latin-token break-words font-medium text-muted-foreground">{user.email}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setNewEmail(user.email);
              setChangeEmailOpen(true);
            }}
            className="-mt-1 -mb-3 py-3 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            data-testid="button-change-email"
          >
            <Pencil className="w-3.5 h-3.5" />
            {t('onboardingPanel.wrongEmailChange')}
          </button>
        </div>

        <Card>
          {/* Phones: 16px card padding so six 44px boxes fit from 360px wide
              (36px below that, down to 320; 48px from 400). Desktop sizes come back at sm:. */}
          <CardContent className="pt-6 px-4 sm:px-6">
            <div className="flex gap-1.5 min-[400px]:gap-2 justify-center mb-6" dir="ltr">
              {code.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  dir="ltr"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleInput(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-9 min-[360px]:w-11 min-[400px]:w-12 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border-2 focus:border-primary-500 focus:ring-primary-500"
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
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t('onboardingPanel.verifying')}
                </>
              ) : (
                <>
                  {t('onboardingPanel.verifyEmailBtn')}
                  <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t('onboardingPanel.didntReceiveCode')}{" "}
                {resendCooldown > 0 ? (
                  <span className="text-muted-foreground md:text-neutral-400">{t('onboardingPanel.resendIn', { seconds: resendCooldown })}</span>
                ) : (
                  <button
                    onClick={handleResend}
                    className="inline-block py-3 -my-3 text-primary-600 hover:text-primary-700 font-medium"
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
              {...emailInputProps}
              autoComplete="email"
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
          <DialogFooter className="gap-2 sm:space-x-0">
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
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
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
