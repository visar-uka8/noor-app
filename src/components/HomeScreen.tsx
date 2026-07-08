"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppBottomNav } from "@/components/AppBottomNav";
import {
  CardListSkeleton,
  ConnectionErrorState,
  NoorStatusBanner,
} from "@/components/AppStates";
import { useLanguage } from "@/components/LanguageProvider";
import { SlowConnectionNotice } from "@/components/SlowConnectionNotice";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSlowConnection } from "@/hooks/useSlowConnection";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { getTimeGreeting } from "@/lib/i18n/messages";
import {
  demoHomeScreenData,
  type HomeScreenData,
} from "@/lib/home-screen";

const featureCards = [
  {
    href: "/medication",
    emoji: "💊",
    titleKey: "home.medications" as const,
    subtitleKey: "medication" as const,
  },
  {
    href: "/lab-results",
    emoji: "🧪",
    titleKey: "home.labResults" as const,
    subtitleKey: "lab" as const,
  },
  {
    href: "/dashboard",
    emoji: "👨‍👩‍👦",
    titleKey: "home.family" as const,
    subtitleKey: "family" as const,
  },
  {
    href: "/health-passport",
    emoji: "🏥",
    titleKey: "home.healthPassport" as const,
    subtitleKey: "passport" as const,
  },
];

export function HomeScreen() {
  const { language, t } = useLanguage();
  const isOnline = useOnlineStatus();
  const [now, setNow] = useState(new Date());
  const [homeData, setHomeData] = useState<HomeScreenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const isSlow = useSlowConnection(isLoading);
  const useDemoFallback = !process.env.NEXT_PUBLIC_SUPABASE_URL;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void fetch("/api/check-in", { method: "POST" });
  }, []);

  async function loadHomeData() {
    setIsLoading(true);
    setHasLoadError(false);

    try {
      const response = await fetchWithTimeout("/api/home");

      if (!response.ok) {
        throw new Error("Home request failed.");
      }

      setHomeData((await response.json()) as HomeScreenData);
    } catch {
      if (useDemoFallback) {
        setHomeData(demoHomeScreenData);
      } else {
        setHomeData(null);
        setHasLoadError(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadHomeData();
  }, []);

  const greeting = useMemo(
    () => getTimeGreeting(language, now),
    [language, now],
  );

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-app flex-1 flex-col overflow-x-hidden bg-background">
        <header className="rounded-b-[2rem] bg-primary px-5 pb-6 pt-6 text-white shadow-[var(--warm-shadow)]">
          <h1 className="text-[1.75rem] font-bold leading-tight">{greeting} 👋</h1>
          <p className="text-body mt-2 text-white/90">{t("common.oneMoment")}</p>
        </header>
        <main className="content-bottom-nav flex-1 px-5 pt-5">
          <CardListSkeleton />
          {isSlow ? (
            <SlowConnectionNotice message={t("common.slowConnection")} />
          ) : null}
        </main>
        <AppBottomNav />
      </div>
    );
  }

  if (hasLoadError || !homeData) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-app flex-1 flex-col overflow-x-hidden bg-background">
        <header className="rounded-b-[2rem] bg-primary px-5 pb-6 pt-6 text-white shadow-[var(--warm-shadow)]">
          <h1 className="text-[1.75rem] font-bold leading-tight">{greeting} 👋</h1>
        </header>
        <main className="content-bottom-nav flex-1 px-5 pt-5">
          <ConnectionErrorState
            isOffline={!isOnline}
            onRetry={loadHomeData}
          />
        </main>
        <AppBottomNav />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-app flex-1 flex-col overflow-x-hidden bg-background">
      <header className="rounded-b-[2rem] bg-primary px-5 pb-6 pt-6 text-white shadow-[var(--warm-shadow)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[1.75rem] font-bold leading-tight">
              {greeting}, {homeData.firstName} 👋
            </h1>
            <p className="text-body mt-2 text-white/90">
              {getGreetingSubtitle(homeData, now)}
            </p>
          </div>

          <Link
            href="/settings"
            className="btn-touch h-12 w-12 shrink-0 rounded-full bg-white text-base font-bold text-primary shadow-sm"
            aria-label={t("home.openProfile")}
          >
            {homeData.initials}
          </Link>
        </div>
      </header>

      <main className="content-bottom-nav flex-1 px-5 pt-5">
        <StatusBanner data={homeData} t={t} />

        <section className="mt-6">
          <div className="grid grid-cols-2 gap-3">
            {featureCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="noor-card flex min-h-[120px] flex-col p-4 transition-colors hover:border-primary/30 active:scale-[0.98]"
              >
                <span className="text-3xl" aria-hidden="true">
                  {card.emoji}
                </span>
                <h2 className="heading-lg mt-3 leading-tight">{t(card.titleKey)}</h2>
                <p className="text-body mt-1 text-muted">
                  {getCardSubtitle(card.subtitleKey, homeData, t)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <AppBottomNav />
    </div>
  );
}

function getGreetingSubtitle(data: HomeScreenData, now: Date) {
  const { medication } = data;
  const allConfirmed =
    medication.total > 0 && medication.confirmed === medication.total;

  if (now.getHours() < 9 && !allConfirmed) {
    return "Denken Sie an Ihre Morgenmedikamente 💊";
  }

  if (allConfirmed) {
    return "Alles erledigt für heute ✓";
  }

  if (medication.pending === 1) {
    return "Eine Dosis noch ausstehend";
  }

  if (medication.pending > 1) {
    return `${medication.pending} Dosen noch ausstehend`;
  }

  return now.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function StatusBanner({
  data,
  t,
}: {
  data: HomeScreenData;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const { medication } = data;

  if (medication.status === "red") {
    return (
      <NoorStatusBanner
        level="danger"
        action={
          <Link href="/medication" className="btn-primary shrink-0 px-4 py-3">
            {t("home.confirmNow")}
          </Link>
        }
      >
        {t("home.doseMissed")}
      </NoorStatusBanner>
    );
  }

  if (medication.status === "amber") {
    return (
      <NoorStatusBanner level="warning">
        {t("home.dosesPending", { count: medication.pending })}
      </NoorStatusBanner>
    );
  }

  return (
    <NoorStatusBanner level="success">
      {t("home.allMedsTaken")}
    </NoorStatusBanner>
  );
}

function getCardSubtitle(
  key: (typeof featureCards)[number]["subtitleKey"],
  data: HomeScreenData,
  t: ReturnType<typeof useLanguage>["t"],
) {
  if (key === "medication") {
    if (data.medication.confirmed === data.medication.total) {
      return t("home.allConfirmed");
    }

    return t("home.confirmedCount", {
      confirmed: data.medication.confirmed,
      total: data.medication.total,
    });
  }

  if (key === "lab") {
    if (data.labResult.hasResult && data.labResult.lastDate) {
      return t("home.lastLab", { date: data.labResult.lastDate });
    }

    return t("home.noLabYet");
  }

  if (key === "family") {
    if (data.family.connectedCount === 0) {
      return t("home.noFamily");
    }

    if (data.family.connectedCount === 1) {
      return t("home.oneFamily");
    }

    return t("home.familyCount", { count: data.family.connectedCount });
  }

  return data.healthPassport.complete
    ? t("home.passportComplete")
    : t("home.passportIncomplete");
}
