import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { Mail, ArrowRight, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { user, token, checkAuth } = useAuthStore();
  const { toast } = useToast();
  const { t } = useI18n();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check if we arrived from login (OTP already sent server-side)
  const otpAlreadySent = sessionStorage.getItem('otp_sent_by_login') === 'true';

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      setLocation("/signup");
      return;
    }
    // If already verified, skip to onboarding
    if (user.otpVerified) {
      setLocation("/onboarding");
      return;
    }
  }, [user, setLocation]);

  // Send OTP on mount (skip if login already sent it)
  useEffect(() => {
    if (user && !user.otpVerified && !otpSent) {
      if (otpAlreadySent) {
        // Login endpoint already sent OTP — don't double-send
        sessionStorage.removeItem('otp_sent_by_login');
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
    } catch (error: any) {
      if (error.message?.includes("Too many")) {
        toast({
          title: "Rate limited",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.error('Failed to send OTP:', error);
      }
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    await sendOTP();
    toast({
      title: "Code sent",
      description: "A new verification code has been sent to your email.",
    });
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
      const response = await apiRequest('POST', '/api/auth/verify-otp', { code: verificationCode });
      const data = await response.json();

      if (data.verified) {
        await checkAuth();
        toast({
          title: "Email verified",
          description: "Your email has been verified successfully.",
        });

        // Route based on user state: existing user with company → dashboard, otherwise → onboarding
        const { activeCompany } = useAuthStore.getState();
        const redirect = localStorage.getItem('postOnboardingRedirect');
        if (redirect) {
          localStorage.removeItem('postOnboardingRedirect');
          setLocation(redirect);
        } else if (activeCompany && activeCompany.onboardingState === 'completed') {
          setLocation("/dashboard");
        } else {
          setLocation("/onboarding");
        }
      }
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid or expired code. Please try again.",
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
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Check your email</h1>
          <p className="text-neutral-500">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-neutral-700">{user.email}</span>
          </p>
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
                  Verifying...
                </>
              ) : (
                <>
                  Verify Email
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-neutral-500">
                Didn't receive the code?{" "}
                {resendCooldown > 0 ? (
                  <span className="text-neutral-400">Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    onClick={handleResend}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Resend code
                  </button>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
