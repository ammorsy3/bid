// Public /contact-sales: "Get a personalized Bid Tour". The Enterprise plan's
// call to action lands here. Form on the start side, animated panel on the
// other (mirrored from login / sign-up); in Arabic the sides flip with the
// text direction. Leads go to POST /api/contact-sales → Admin → Contact sales.

import { useId, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Check, Loader2, AlertCircle } from "lucide-react";
import { BidLogo } from "@/components/brand/BidLogo";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ContactSalesPanelAnimation } from "@/components/ContactSalesPanelAnimation";
import { useForceLightMode } from "@/hooks/useForceLightMode";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TEAM_SIZES = ["1-10", "11-50", "51-200", "200+"] as const;
type TeamSize = typeof TEAM_SIZES[number];

const COPY = {
  en: {
    back: "Back to home",
    title: "Get a personalized Bid Tour",
    subtitle: "Meet a procurement expert and see how Bid can run your sourcing, from the first tender to the final award.",
    firstName: "First name",
    lastName: "Last name",
    email: "Work email",
    teamSize: "How big is your team?",
    message: "Anything else we should know?",
    placeholder: "Feel free to add any additional information that could help us understand how we can support you.",
    optional: "Optional",
    submit: "Book my Bid Tour",
    sending: "Sending…",
    required: "This field is required",
    badEmail: "Enter a valid email address",
    failed: "We couldn't send your request. Please try again.",
    tooMany: "Too many attempts. Please try again in a few minutes.",
    thanksTitle: (n: string) => `Thanks, ${n}!`,
    thanksBody: "Your request is in. One of our procurement experts will email you shortly to set up your tour.",
    thanksHome: "Back to home",
  },
  ar: {
    back: "العودة للرئيسية",
    title: "احصل على جولة تعريفية مخصّصة في Bid",
    subtitle: "تعرّف على خبير مشتريات وشاهد كيف يدير Bid مشترياتك، من أول مناقصة حتى الترسية.",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    email: "البريد الإلكتروني للعمل",
    teamSize: "كم عدد أفراد فريقك؟",
    message: "هل هناك شيء آخر نحتاج معرفته؟",
    placeholder: "لا تتردد في إضافة أي معلومات تساعدنا على فهم كيف يمكننا دعمك.",
    optional: "اختياري",
    submit: "احجز جولتي",
    sending: "جارٍ الإرسال…",
    required: "هذا الحقل مطلوب",
    badEmail: "أدخل بريدًا إلكترونيًا صحيحًا",
    failed: "تعذّر إرسال طلبك. حاول مرة أخرى.",
    tooMany: "محاولات كثيرة. حاول مرة أخرى بعد دقائق.",
    thanksTitle: (n: string) => `شكرًا ${n}!`,
    thanksBody: "وصلنا طلبك. سيتواصل معك أحد خبراء المشتريات لدينا قريبًا بالبريد لتحديد موعد جولتك.",
    thanksHome: "العودة للرئيسية",
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  testId: string;
  dir?: "ltr";
}

// Floating-label input: the label sits in the field and lifts when it is focused or filled.
function Field({ label, value, onChange, onBlur, error, type = "text", autoComplete, testId, dir }: FieldProps) {
  const id = useId();
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          dir={dir}
          autoComplete={autoComplete}
          placeholder=" "
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          data-testid={testId}
          className={cn(
            "peer block h-14 w-full rounded-xl border bg-white px-4 pt-5 pb-1 text-[15px] text-[#0B0907] outline-none transition",
            "focus:border-[#FE3C01] focus:shadow-[0_0_0_4px_rgba(254,60,1,.12)]",
            error ? "border-red-500" : "border-black/10 hover:border-black/20",
          )}
        />
        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute start-4 top-1/2 origin-[0] -translate-y-1/2 text-[15px] text-[#6B625A] transition-all",
            "peer-focus:top-3.5 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-[#FE3C01]",
            "peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold",
          )}
        >
          {label}
        </label>
      </div>
      {error && (
        <p id={`${id}-err`} className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />{error}
        </p>
      )}
    </div>
  );
}

export default function ContactSales() {
  useForceLightMode();
  const { language, isRtl } = useI18n();
  const c = language === "ar" ? COPY.ar : COPY.en;
  const Arrow = isRtl ? ArrowRight : ArrowLeft;

  const [v, setV] = useState({ firstName: "", lastName: "", email: "", message: "", website: "" });
  const [teamSize, setTeamSize] = useState<TeamSize | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentName, setSentName] = useState<string | null>(null);

  const errors: Record<string, string | undefined> = {
    firstName: v.firstName.trim() ? undefined : c.required,
    lastName: v.lastName.trim() ? undefined : c.required,
    email: !v.email.trim() ? c.required : EMAIL_RE.test(v.email.trim()) ? undefined : c.badEmail,
  };
  const shown = (k: string) => (touched[k] ? errors[k] : undefined);
  const set = (k: keyof typeof v) => (val: string) => { setV((p) => ({ ...p, [k]: val })); if (formError) setFormError(null); };
  const blur = (k: string) => () => setTouched((p) => ({ ...p, [k]: true }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, email: true });
    if (errors.firstName || errors.lastName || errors.email) return;
    setSending(true);
    setFormError(null);
    try {
      const res = await fetch("/api/contact-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: v.firstName.trim(),
          lastName: v.lastName.trim(),
          email: v.email.trim(),
          teamSize: teamSize ?? undefined,
          message: v.message.trim() || undefined,
          language,
          website: v.website,
        }),
      });
      if (res.status === 429) setFormError(c.tooMany);
      else if (!res.ok) setFormError(c.failed);
      else setSentName(v.firstName.trim());
    } catch {
      setFormError(c.failed);
    } finally {
      setSending(false);
    }
  };

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="surface-cream min-h-dvh flex lg:h-screen lg:overflow-hidden bg-[#F4EDE1]" data-testid="page-contact-sales">
      {/* Form side */}
      <div className="flex-1 min-w-0 flex flex-col lg:overflow-y-auto">
        <header className="flex items-center justify-between px-5 sm:px-8 pt-4">
          <Link href="/" className="inline-flex" aria-label="Bid">
            <BidLogo variant="orange" size={40} />
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/" className="hidden sm:inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-medium text-[#6B625A] hover:text-[#0B0907]">
              <Arrow className="h-4 w-4" aria-hidden="true" />{c.back}
            </Link>
            <LanguageSwitch />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8">
          <div className="w-full max-w-[520px]">
            {sentName ? (
              <div className="rounded-3xl bg-white/80 border border-black/5 shadow-[0_30px_70px_-40px_rgba(11,9,7,.35)] p-8 sm:p-10 text-center" data-testid="contact-sales-success">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#FE3C01] text-white shadow-[0_14px_30px_-10px_rgba(254,60,1,.6)] animate-in zoom-in-50 duration-500">
                  <Check className="h-8 w-8" strokeWidth={3} aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#0B0907]" dir="auto">{c.thanksTitle(sentName)}</h1>
                <p className="mt-2 text-[15px] leading-relaxed text-[#6B625A]">{c.thanksBody}</p>
                <Link href="/" className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-[#0B0907] px-6 text-sm font-semibold text-white hover:bg-[#FE3C01] transition-colors">
                  {c.thanksHome}
                </Link>
              </div>
            ) : (
              <>
                <h1 className="text-[28px] sm:text-[34px] font-extrabold leading-[1.1] tracking-tight text-[#0B0907]">{c.title}</h1>
                <p className="mt-3 mb-7 text-[15px] leading-relaxed text-[#6B625A]">{c.subtitle}</p>

                <form onSubmit={submit} noValidate className="space-y-4 rounded-3xl border border-black/10 bg-white/70 p-5 sm:p-7 shadow-[0_24px_60px_-34px_rgba(11,9,7,.35)]" data-testid="contact-sales-form">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={c.firstName} value={v.firstName} onChange={set("firstName")} onBlur={blur("firstName")} error={shown("firstName")} autoComplete="given-name" testId="input-first-name" />
                    <Field label={c.lastName} value={v.lastName} onChange={set("lastName")} onBlur={blur("lastName")} error={shown("lastName")} autoComplete="family-name" testId="input-last-name" />
                  </div>
                  <Field label={c.email} type="email" dir="ltr" value={v.email} onChange={set("email")} onBlur={blur("email")} error={shown("email")} autoComplete="email" testId="input-email" />

                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold text-[#0B0907]">
                      {c.teamSize} <span className="font-normal text-[#6B625A]">· {c.optional}</span>
                    </legend>
                    <div className="flex flex-wrap gap-2" role="radiogroup">
                      {TEAM_SIZES.map((s) => {
                        const on = teamSize === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setTeamSize(on ? null : s)}
                            data-testid={`chip-team-${s}`}
                            className={cn(
                              "min-h-11 rounded-full border px-5 text-sm font-semibold transition active:scale-95",
                              on ? "border-[#FE3C01] bg-[#FE3C01] text-white shadow-[0_8px_20px_-8px_rgba(254,60,1,.7)]" : "border-black/10 bg-white text-[#0B0907] hover:border-black/25",
                            )}
                          >
                            <span dir="ltr">{s}</span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="cs-message" className="mb-2 block text-sm font-semibold text-[#0B0907]">
                      {c.message} <span className="font-normal text-[#6B625A]">· {c.optional}</span>
                    </label>
                    <textarea
                      id="cs-message"
                      rows={4}
                      maxLength={2000}
                      value={v.message}
                      onChange={(e) => set("message")(e.target.value)}
                      placeholder={c.placeholder}
                      data-testid="input-message"
                      className="block w-full resize-y rounded-xl border border-black/10 bg-white px-4 py-3 text-[15px] text-[#0B0907] outline-none transition placeholder:text-[#6B625A]/70 hover:border-black/20 focus:border-[#FE3C01] focus:shadow-[0_0_0_4px_rgba(254,60,1,.12)]"
                    />
                  </div>

                  {/* Honeypot: invisible to people, tempting to bots. */}
                  <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                    <label>Website<input tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set("website")(e.target.value)} data-testid="input-website" /></label>
                  </div>

                  {formError && (
                    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700" data-testid="contact-sales-error">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    data-testid="button-submit"
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#FE3C01] text-base font-bold text-white shadow-[0_16px_32px_-14px_rgba(254,60,1,.8)] transition hover:bg-[#e23600] active:scale-[.99] disabled:opacity-70"
                  >
                    {sending ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />{c.sending}</> : c.submit}
                  </button>
                </form>
              </>
            )}
            {/* The animated panel is desktop-only; phones get the badge here. */}
            <div className="mt-8 flex items-center justify-center gap-3 lg:hidden">
              <img src="/saudi-tech-logo.png" alt="Saudi Tech" className="h-7 w-auto" />
            </div>
          </div>
        </main>
      </div>

      {/* Graphic side */}
      <div className="hidden lg:block relative lg:w-[46%] xl:w-[48%] flex-shrink-0 overflow-hidden border-s border-black/15 shadow-[inset_16px_0_24px_-20px_rgba(11,9,7,.25)] rtl:shadow-[inset_-16px_0_24px_-20px_rgba(11,9,7,.25)]">
        <ContactSalesPanelAnimation />
      </div>
    </div>
  );
}
