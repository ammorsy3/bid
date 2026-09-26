import { Link } from "wouter";
import { BidLogo } from "@/components/brand/BidLogo";
import { useI18n } from "@/lib/i18n";

export default function Terms() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-card">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2 sm:py-4 flex items-center justify-between">
          <Link href="/" className="max-sm:inline-flex max-sm:items-center max-sm:min-h-11 max-sm:min-w-11" data-testid="link-home">
            <BidLogo variant="orange" size={28} />
          </Link>
          <Link href="/login" className="max-sm:inline-flex max-sm:items-center text-sm text-muted-foreground hover:text-foreground max-sm:min-h-11 max-sm:px-2 max-sm:-me-2 active:opacity-60" data-testid="link-login">
            {t('terms.signIn')}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 prose prose-sm dark:prose-invert">
        <h1 className="text-3xl font-bold mb-2">{t('terms.pageTitle')}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t('terms.lastUpdated')}</p>

        <section className="space-y-6 text-[15px] sm:text-[0.875rem] leading-relaxed text-foreground">
          <div>
            <h2 className="text-lg font-semibold mb-2">{t('terms.s1Title')}</h2>
            <p>{t('terms.s1Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('terms.s2Title')}</h2>
            <p>{t('terms.s2Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('terms.s3Title')}</h2>
            <p>{t('terms.s3Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('terms.s4Title')}</h2>
            <p>{t('terms.s4Intro')}</p>
            <ul className="list-disc ps-6 mt-2 space-y-1">
              <li>{t('terms.s4Li1')}</li>
              <li>{t('terms.s4Li2')}</li>
              <li>{t('terms.s4Li3')}</li>
              <li>{t('terms.s4Li4')}</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('terms.s5Title')}</h2>
            <p>{t('terms.s5Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('terms.s6Title')}</h2>
            <p>{t('terms.s6Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('terms.s7Title')}</h2>
            <p>{t('terms.s7Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('terms.s8Title')}</h2>
            <p>{t('terms.s8Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('terms.s9Title')}</h2>
            <p>{t('terms.s9Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('terms.s10Title')}</h2>
            <p>{t('terms.s10Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('terms.s11Title')}</h2>
            <p>
              {t('terms.s11Pre')}{" "}
              <a href="mailto:info@bidapp.sa" className="text-primary hover:underline">info@bidapp.sa</a>.
            </p>
          </div>
        </section>

        <div className="mt-12 pt-6 max-sm:pt-2 border-t border-border text-xs text-muted-foreground flex flex-wrap gap-x-4">
          <Link href="/privacy" className="hover:text-foreground max-sm:inline-flex max-sm:min-h-11 max-sm:items-center" data-testid="link-privacy">
            {t('terms.privacyLink')}
          </Link>
          <Link href="/cookies" className="hover:text-foreground max-sm:inline-flex max-sm:min-h-11 max-sm:items-center" data-testid="link-cookies">
            {t('terms.cookiePolicyLink')}
          </Link>
        </div>
      </main>
    </div>
  );
}
