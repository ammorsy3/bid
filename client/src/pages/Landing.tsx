import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileText, Inbox, BarChart3, ArrowRight, Building2, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const Landing = () => {
  const { t, isRtl } = useI18n();
  const ArrowIcon = () => (
    <ArrowRight className={`h-4 w-4 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
  );

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-xl font-bold text-[#E25E45]">{t('landing.brand')}</span>
          <div className="flex items-center gap-3">
            <Link href="/marketplace">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">{t('landing.marketplace')}</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">{t('landing.logIn')}</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-[#E25E45] hover:bg-[#d04a32] text-white">{t('landing.signUp')}</Button>
            </Link>
          </div>
        </div>
      </nav>
      <main>
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight">{t('landing.heroTitle')}</h1>
            <p className="mt-5 text-lg text-gray-500 max-w-xl mx-auto">
              {t('landing.heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup">
                <Button size="lg" className="bg-[#E25E45] hover:bg-[#d04a32] text-white px-8 h-12 text-base">
                  {t('landing.tryBid')}
                  <ArrowIcon />
                </Button>
              </Link>

            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-sm font-semibold text-[#E25E45] uppercase tracking-widest text-center mb-10">{t('landing.howItWorks')}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  icon: FileText,
                  title: t('landing.step1Title'),
                  desc: t('landing.step1Desc'),
                },
                {
                  step: "02",
                  icon: Inbox,
                  title: t('landing.step2Title'),
                  desc: t('landing.step2Desc'),
                },
                {
                  step: "03",
                  icon: BarChart3,
                  title: t('landing.step3Title'),
                  desc: t('landing.step3Desc'),
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="bg-white rounded-2xl border border-gray-200 p-7 flex flex-col items-start"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-bold text-[#E25E45] bg-red-50 rounded-full w-8 h-8 flex items-center justify-center">
                      {item.step}
                    </span>
                    <item.icon className="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-sm font-semibold text-[#E25E45] uppercase tracking-widest text-center mb-4">{t('landing.platformLabel')}</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-3">{t('landing.platformHeading')}</h3>
            <p className="text-gray-500 text-center max-w-2xl mx-auto mb-14">
              {t('landing.platformDesc')}
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-[#E25E45]/10 flex items-center justify-center mb-6">
                  <Users className="h-8 w-8 text-[#E25E45]" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{t('landing.suppliersTitle')}</h4>
                <p className="text-sm text-gray-500 mb-6">{t('landing.suppliersDesc')}</p>
                <Link href="/signup">
                  <Button className="bg-[#E25E45] hover:bg-[#d04a32] text-white px-8">
                    {t('landing.startSelling')}
                    <ArrowIcon />
                  </Button>
                </Link>
              </div>

              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-[#E25E45]/10 flex items-center justify-center mb-6">
                  <Building2 className="h-8 w-8 text-[#E25E45]" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{t('landing.buyersTitle')}</h4>
                <p className="text-sm text-gray-500 mb-6">{t('landing.buyersDesc')}</p>
                <Link href="/signup">
                  <Button variant="outline" className="border-[#E25E45] text-[#E25E45] hover:bg-red-50 px-8">
                    {t('landing.startBuying')}
                    <ArrowIcon />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('landing.browseTitle')}</h3>
            <p className="text-gray-500 max-w-xl mx-auto mb-8">
              {t('landing.browseDesc')}
            </p>
            <Link href="/marketplace">
              <Button size="lg" variant="outline" className="border-[#E25E45] text-[#E25E45] hover:bg-red-50 px-8 h-12 text-base">
                {t('landing.browseMarketplace')}
                <ArrowIcon />
              </Button>
            </Link>
          </div>
        </section>

      </main>
      <footer className="border-t border-gray-100 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-bold text-[#E25E45]">{t('landing.brand')}</span>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#how-it-works" className="hover:text-gray-600 transition-colors">{t('landing.footerHowItWorks')}</a>
            <Link href="/marketplace" className="hover:text-gray-600 transition-colors">{t('landing.marketplace')}</Link>
            <a href="mailto:hello@bid.sa" className="hover:text-gray-600 transition-colors">{t('landing.footerContact')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
