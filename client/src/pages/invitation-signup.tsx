import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { Loader2, Mic, Video, ExternalLink, Play, Pause, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";

interface TenderInvite {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  budgetRange: string | null;
  deadline: string;
  duration: string | null;
  status: string;
  voiceNoteUrl: string | null;
  videoUrl: string | null;
  projectTimeline: string | null;
  company: {
    id: string;
    name: string;
  };
  profile?: {
    displayName: string | null;
  };
}

function PublicAudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAudio = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const response = await fetch(src, { headers });
        if (!response.ok) throw new Error("Failed to load audio");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      } catch (err) {
        setError("Voice note requires login to play");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAudio();
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm text-muted-foreground">{t('auth.loadingVoiceNote')}</span>
      </div>
    );
  }

  if (error || !audioUrl) {
    return (
      <div className="flex items-center gap-2 p-3 bg-[var(--bid-orange)]/5 dark:bg-blue-900/20 rounded-lg text-[var(--bid-orange)]">
        <Mic className="h-5 w-5" />
        <span className="text-sm">{t('auth.voiceNoteLogin')}</span>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-200 dark:bg-gray-700 rounded-lg" data-testid="audio-player">
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className="h-10 w-10 rounded-full bg-primary text-white hover:bg-primary/90"
        data-testid="button-audio-play"
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </Button>
      <div className="flex-1">
        <div 
          className="relative h-2 bg-gray-300 dark:bg-gray-600 rounded-full cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current || !duration || !isFinite(duration)) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const newTime = (clickX / rect.width) * duration;
            if (!isFinite(newTime) || isNaN(newTime)) return;
            audioRef.current.currentTime = Math.max(0, Math.min(newTime, duration));
            setCurrentTime(Math.max(0, Math.min(newTime, duration)));
          }}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-[var(--bid-orange)] rounded-full"
            style={{ 
              width: `${progress}%`,
              transition: isPlaying ? 'width 0.1s linear' : 'none'
            }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 h-4 w-4 bg-[var(--bid-orange)] rounded-full shadow-md border-2 border-white"
            style={{ 
              left: `calc(${progress}% - 8px)`,
              transition: isPlaying ? 'left 0.1s linear' : 'none'
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />
    </div>
  );
}

export default function InvitationSignup() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const { t } = useI18n();

  const { data: tender, isLoading, error } = useQuery<TenderInvite>({
    queryKey: ['/api/tenders', id, 'public'],
    queryFn: async () => {
      const response = await fetch(`/api/tenders/${id}/invite`);
      if (!response.ok) {
        throw new Error("Tender not found");
      }
      return response.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">{t('auth.invalidInvitation')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              {t('auth.invitationExpiredDesc')}
            </p>
            <Link href="/">
              <Button variant="outline">{t('auth.goToHomepage')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const companyName = tender.profile?.displayName || tender.company.name;
  const isPublished = tender.status === 'published';

  // If tender is not published, show a different view
  if (!isPublished) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-center" data-testid="text-not-published-title">
                {t('auth.tenderNotPublished')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center text-muted-foreground text-sm">
                {t('auth.tenderNotPublishedDesc')}
              </p>

              {/* Get Started Section */}
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold text-center mb-4" data-testid="text-get-started-title">
                  {t('auth.getStarted')}
                </h3>
                <div className="flex gap-4 justify-center">
                  <Link href={`/login?redirect=/tenders/${id}`}>
                    <Button variant="outline" className="min-w-24" data-testid="button-login">
                      {t('auth.login')}
                    </Button>
                  </Link>
                  <Link href={`/register?redirect=/tenders/${id}`}>
                    <Button className="min-w-40 bg-[var(--bid-orange)] hover:bg-[var(--bid-orange)]/90 text-white" data-testid="button-create-account">
                      {t('auth.createBidAccount')}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Tender Details Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl text-center" data-testid="text-invitation-title">
              {t('auth.youveBeenInvited')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tender Info Box */}
            <div className="bg-gray-100 dark:bg-card rounded-lg p-4 space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-1" data-testid="text-tender-title">{tender.title}</h3>
                <p className="text-muted-foreground text-sm" data-testid="text-tender-description">
                  {tender.description}
                </p>
              </div>

              {/* Voice Note & Video Link */}
              {(tender.voiceNoteUrl || tender.videoUrl) && (
                <div className="space-y-3 pt-2 border-t border-border dark:border-border">
                  <p className="text-sm font-medium text-muted-foreground">{t('auth.additionalInfo')}</p>
                  {tender.voiceNoteUrl && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mic className="h-3 w-3" />
                        <span>{t('auth.voiceNote')}</span>
                      </div>
                      <PublicAudioPlayer src={tender.voiceNoteUrl} />
                    </div>
                  )}
                  {tender.videoUrl && (
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={tender.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        data-testid="link-video"
                      >
                        {t('auth.watchVideo')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 text-sm pt-2 border-t border-border dark:border-border">
                <div>
                  <span className="text-muted-foreground">{t('auth.budgetLabel')}</span>
                  <p className="font-medium" data-testid="text-budget">
                    {tender.budgetRange || tender.budget || t('auth.notSpecified')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('auth.deadlineLabel')}</span>
                  <p className="font-medium" data-testid="text-deadline">{formatDate(tender.deadline)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('auth.durationLabel')}</span>
                  <p className="font-medium" data-testid="text-duration">
                    {tender.duration || t('auth.notSpecified')}
                  </p>
                </div>
              </div>
            </div>

            {/* From Company Box */}
            <div className="border rounded-lg p-4">
              <p className="text-sm" data-testid="text-company-name">
                <span className="text-muted-foreground">{t('auth.fromLabel')}</span>{' '}
                <span className="font-medium">{companyName}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('auth.privateTender')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Get Started Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg" data-testid="text-get-started-title">
              {user && activeCompany ? t('auth.accessTender') : t('auth.getStarted')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user && activeCompany ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground text-sm">
                  {t('auth.welcomeBackInvite')}
                </p>
                <Button
                  onClick={() => setLocation(`/tenders/${tender.id}`)}
                  className="bg-[var(--bid-orange)] hover:bg-[var(--bid-orange)]/90"
                  data-testid="button-access-tender"
                >
                  {t('auth.accessTender')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-center text-muted-foreground text-sm">
                  {t('auth.signInOrCreate')}
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href={`/login?redirect=/tenders/${id}`}>
                    <Button variant="outline" className="min-w-32" data-testid="button-login">
                      {t('auth.login')}
                    </Button>
                  </Link>
                  <Link href={`/register?redirect=/tenders/${id}`}>
                    <Button className="min-w-48 bg-[var(--bid-orange)] hover:bg-[var(--bid-orange)]/90 text-white" data-testid="button-create-account">
                      {t('auth.createBidAccount')}
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {t('auth.autoRedirect')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
