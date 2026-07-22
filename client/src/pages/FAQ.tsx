import { Link } from "wouter";
import { BidLogo } from "@/components/brand/BidLogo";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

const FAQ_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

function FAQAccordion({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full flex items-center justify-between gap-4 py-4 text-left text-sm font-medium hover:text-primary transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{question}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">
          {answer}
        </p>
      )}
    </div>
  );
}

export default function FAQ() {
  const { t, isRtl } = useI18n();
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-card">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" data-testid="link-home">
            <BidLogo variant="orange" size={28} />
          </Link>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-dashboard">
            <BackArrow className="h-4 w-4" />
            {t('faq.backToDashboard')}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">{t('faq.pageTitle')}</h1>
        <p className="text-muted-foreground mb-10">
          {t('faq.pageSubtitle')}
        </p>

        <div className="divide-y divide-border border border-border rounded-lg px-4">
          {FAQ_IDS.map((id) => (
            <FAQAccordion key={id} question={t(`faq.q${id}`)} answer={t(`faq.a${id}`)} />
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-8">
          <p className="text-sm text-muted-foreground">
            {t('faq.notFoundText')}{" "}
            <a
              href="mailto:info@bid.sa"
              className="text-primary hover:underline font-medium"
            >
              {t('faq.emailSupportLink')}
            </a>{" "}
            {t('faq.notFoundSuffix')}
          </p>
        </div>
      </main>
    </div>
  );
}
