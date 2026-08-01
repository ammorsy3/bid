import { Link } from "wouter";
import { BidLogo } from "@/components/brand/BidLogo";
import { useI18n } from "@/lib/i18n";

export default function Privacy() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-card">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" data-testid="link-home">
            <BidLogo variant="orange" size={28} />
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-login">
            {t('privacy.signIn')}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 prose prose-sm dark:prose-invert">
        <h1 className="text-3xl font-bold mb-2">{t('privacy.pageTitle')}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t('privacy.lastUpdated')}</p>

        <section className="space-y-6 text-sm leading-relaxed text-foreground">
          <div>
            <h2 className="text-lg font-semibold mb-2">{t('privacy.s1Title')}</h2>
            <p>{t('privacy.s1Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('privacy.s2Title')}</h2>
            <ul className="list-disc ps-6 mt-2 space-y-1">
              <li><strong>{t('privacy.s2Li1Strong')}</strong> {t('privacy.s2Li1')}</li>
              <li><strong>{t('privacy.s2Li2Strong')}</strong> {t('privacy.s2Li2')}</li>
              <li><strong>{t('privacy.s2Li3Strong')}</strong> {t('privacy.s2Li3')}</li>
              <li><strong>{t('privacy.s2Li4Strong')}</strong> {t('privacy.s2Li4')}</li>
              <li><strong>{t('privacy.s2Li5Strong')}</strong> {t('privacy.s2Li5')}</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('privacy.s3Title')}</h2>
            <ul className="list-disc ps-6 mt-2 space-y-1">
              <li>{t('privacy.s3Li1')}</li>
              <li>{t('privacy.s3Li2')}</li>
              <li>{t('privacy.s3Li3')}</li>
              <li>{t('privacy.s3Li4')}</li>
              <li>{t('privacy.s3Li5')}</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('privacy.s4Title')}</h2>
            <p>{t('privacy.s4Intro')}</p>
            <ul className="list-disc ps-6 mt-2 space-y-1">
              <li><strong>{t('privacy.s4Li1Strong')}</strong> {t('privacy.s4Li1')}</li>
              <li><strong>{t('privacy.s4Li2Strong')}</strong> {t('privacy.s4Li2')}</li>
              <li><strong>{t('privacy.s4Li3Strong')}</strong> {t('privacy.s4Li3')}</li>
              <li><strong>{t('privacy.s4Li4Strong')}</strong> {t('privacy.s4Li4')}</li>
            </ul>
            <p className="mt-2">{t('privacy.s4NoSell')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('privacy.s5Title')}</h2>
            <p>{t('privacy.s5Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('privacy.s6Title')}</h2>
            <p>{t('privacy.s6Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('privacy.s7Title')}</h2>
            <p>{t('privacy.s7Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('privacy.s8Title')}</h2>
            <p>{t('privacy.s8Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('privacy.s9Title')}</h2>
            <p>{t('privacy.s9Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('privacy.s10Title')}</h2>
            <p>{t('privacy.s10Body')}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">{t('privacy.s11Title')}</h2>
            <p>
              {t('privacy.s11Pre')}{" "}
              <a href="mailto:info@bidapp.sa" className="text-primary hover:underline">info@bidapp.sa</a>.
            </p>
          </div>
        </section>

        <div className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground" data-testid="link-terms">
            {t('privacy.termsLink')}
          </Link>
        </div>
      </main>
    </div>
  );
}
