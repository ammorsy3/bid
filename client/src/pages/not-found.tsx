import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { BidLogo } from "@/components/brand/BidLogo";
import { StatusDot } from "@/components/brand/StatusDot";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--bid-cream)] px-4">
      <div className="mb-8">
        <BidLogo size={40} />
      </div>
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center mb-4 gap-3">
            <StatusDot state="lost" size={12} />
            <h1 className="font-display font-black text-3xl text-foreground tracking-[-0.04em]">{t('common.notFound')}</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {t('common.notFoundDesc')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
