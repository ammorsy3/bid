import { Link } from "wouter";
import { BidLogo } from "@/components/brand/BidLogo";
import { ArrowLeft, ArrowRight, Building2, FileText, Users, CheckCircle, Send, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function GettingStarted() {
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
            {t('gettingStarted.backToDashboard')}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">{t('gettingStarted.pageTitle')}</h1>
        <p className="text-muted-foreground mb-10">
          {t('gettingStarted.pageSubtitle')}
        </p>

        <section className="space-y-10 text-sm leading-relaxed text-foreground">

          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">{t('gettingStarted.step1Title')}</h2>
              <p className="text-muted-foreground mb-3">
                {t('gettingStarted.step1Desc')}
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>{t('gettingStarted.step1Li1Pre')}<strong className="text-foreground">{t('gettingStarted.step1Li1Strong')}</strong>{t('gettingStarted.step1Li1Post')}</li>
                <li>{t('gettingStarted.step1Li2Pre')}<strong className="text-foreground">{t('gettingStarted.step1Li2Strong')}</strong>{t('gettingStarted.step1Li2Post')}</li>
                <li>{t('gettingStarted.step1Li3')}</li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">{t('gettingStarted.step2Title')}</h2>
              <p className="text-muted-foreground mb-3">
                {t('gettingStarted.step2Desc')}
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>{t('gettingStarted.step2Li1Pre')}<strong className="text-foreground">{t('gettingStarted.step2Li1Strong')}</strong>{t('gettingStarted.step2Li1Post')}</li>
                <li>{t('gettingStarted.step2Li2')}</li>
                <li>{t('gettingStarted.step2Li3')}</li>
              </ul>
            </div>
          </div>

          {/* Step 3 — Requesters */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">{t('gettingStarted.step3Title')}</h2>
              <p className="text-muted-foreground mb-3">
                {t('gettingStarted.step3Desc')}
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>{t('gettingStarted.step3Li1Pre')}<strong className="text-foreground">{t('gettingStarted.step3Li1Strong')}</strong>{t('gettingStarted.step3Li1Post')}</li>
                <li>{t('gettingStarted.step3Li2')}</li>
                <li>{t('gettingStarted.step3Li3')}</li>
                <li>{t('gettingStarted.step3Li4')}</li>
                <li>{t('gettingStarted.step3Li5')}</li>
              </ul>
            </div>
          </div>

          {/* Step 4 — Vendors */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">{t('gettingStarted.step4Title')}</h2>
              <p className="text-muted-foreground mb-3">
                {t('gettingStarted.step4Desc')}
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>{t('gettingStarted.step4Li1Pre')}<strong className="text-foreground">{t('gettingStarted.step4Li1Strong')}</strong>{t('gettingStarted.step4Li1Post')}</li>
                <li>{t('gettingStarted.step4Li2')}</li>
                <li>{t('gettingStarted.step4Li3Pre')}<strong className="text-foreground">{t('gettingStarted.step4Li3Strong')}</strong>{t('gettingStarted.step4Li3Post')}</li>
                <li>{t('gettingStarted.step4Li4')}</li>
              </ul>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Send className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">{t('gettingStarted.step5Title')}</h2>
              <p className="text-muted-foreground mb-3">
                {t('gettingStarted.step5Desc')}
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>{t('gettingStarted.step5Li1')}</li>
                <li>{t('gettingStarted.step5Li2')}</li>
                <li>{t('gettingStarted.step5Li3')}</li>
              </ul>
            </div>
          </div>

          {/* Step 6 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">{t('gettingStarted.step6Title')}</h2>
              <p className="text-muted-foreground mb-3">
                {t('gettingStarted.step6Desc')}
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>{t('gettingStarted.step6Li1')}</li>
                <li>{t('gettingStarted.step6Li2')}</li>
                <li>{t('gettingStarted.step6Li3')}</li>
              </ul>
            </div>
          </div>

          {/* Support CTA */}
          <div className="border-t border-border pt-8">
            <p className="text-muted-foreground">
              {t('gettingStarted.supportText')}{" "}
              <a
                href="mailto:info@bid.sa"
                className="text-primary hover:underline font-medium"
              >
                {t('gettingStarted.contactSupportLink')}
              </a>{" "}
              {t('gettingStarted.supportSuffix')}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
