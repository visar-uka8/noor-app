"use client";

import { FlaskConical, Pill, ShieldPlus, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CardListSkeleton,
  ConnectionErrorState,
  NoorStatusBanner,
} from "@/components/AppStates";
import { FamilyDashboardPanel } from "@/components/FamilyDashboardPanel";
import { HomeModeSwitcher } from "@/components/HomeModeSwitcher";
import { useHomeViewModeContext } from "@/components/HomeViewModeContext";
import { useLanguage } from "@/components/LanguageProvider";
import { SlowConnectionNotice } from "@/components/SlowConnectionNotice";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useFamilyConnection } from "@/hooks/useFamilyConnection";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSlowConnection } from "@/hooks/useSlowConnection";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { getTimeGreeting } from "@/lib/i18n/messages";
import {
  demoHomeScreenData,
  type HomeScreenData,
} from "@/lib/home-screen";
import type { HomeScreenResponse, HomeSectionKey } from "@/lib/home-data";

const featureCards = [
  {
    href: "/medication",
    icon: Pill,
    titleKey: "home.medications" as const,
    subtitleKey: "medication" as const,
  },
  {
    href: "/lab-results",
    icon: FlaskConical,
    titleKey: "home.labResults" as const,
    subtitleKey: "lab" as const,
  },
  {
    href: "/dashboard",
    icon: Users,
    titleKey: "home.family" as const,
    subtitleKey: "family" as const,
  },
  {
    href: "/health-passport",
    icon: ShieldPlus,
    titleKey: "home.healthPassport" as const,
    subtitleKey: "passport" as const,
  },
];

export function HomeScreen() {
  const { language, t } = useLanguage();
  const { user, isLoading: isAuthLoading } = useAuthUser();
  const { connection, isLoading: isConnectionLoading } = useFamilyConnection();
  const { mode, setViewMode } = useHomeViewModeContext();
  const isOnline = useOnlineStatus();
  const [now, setNow] = useState(new Date());
  const [homeData, setHomeData] = useState<HomeScreenData | null>(null);
  const [sectionErrors, setSectionErrors] = useState<
    Partial<Record<HomeSectionKey, string>>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const isSlow = useSlowConnection(isLoading);
  const useDemoFallback = !process.env.NEXT_PUBLIC_SUPABASE_URL;
  const showSwitcher = connection.connected;
  const isFamilyView = showSwitcher && mode === "family";

  useEffect(() => {
    if (isFamilyView) return;

    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, [isFamilyView]);

  useEffect(() => {
    void fetch("/api/check-in", { method: "POST" });
  }, []);

  async function loadHomeData() {
    setIsLoading(true);
    setHasLoadError(false);
    setSectionErrors({});

    try {
      const response = await fetchWithTimeout("/api/home");

      if (response.status === 401) {
        console.log("Home page request unauthorized");
        setHomeData(null);
        setHasLoadError(true);
        return;
      }

      const payload = (await response.json()) as HomeScreenResponse | { error?: string };

      console.log("Home page response status:", response.status);
      console.log("Home page response payload:", payload);

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Home request failed.",
        );
      }

      const { sectionErrors: nextSectionErrors, ...data } = payload as HomeScreenResponse;
      setHomeData(data);
      setSectionErrors(nextSectionErrors ?? {});
    } catch (error) {
      console.error("Home page client load failed:", error);

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
    if (isAuthLoading) return;
    void loadHomeData();
  }, [isAuthLoading]);

  const greeting = useMemo(
    () => getTimeGreeting(language, now),
    [language, now],
  );

  const shell = (header: React.ReactNode, main: React.ReactNode) => (
    <div className="mx-auto flex w-full max-w-app flex-col bg-background">
      {header}
      {main}
    </div>
  );

  if (!isAuthLoading && !user && !useDemoFallback) {
    return shell(
      <header className="rounded-b-[2rem] bg-primary px-5 pb-6 pt-6 text-white shadow-[var(--warm-shadow)]">
        <h1 className="text-[1.75rem] font-bold leading-tight">{greeting} 👋</h1>
      </header>,
      <main className="flex-1 px-5 pt-5">
        <ConnectionErrorState
          isOffline={!isOnline}
          onRetry={() => window.location.assign("/login")}
        />
      </main>,
    );
  }

  if (isAuthLoading || isLoading || (showSwitcher && isConnectionLoading)) {
    return shell(
      <header className="rounded-b-[2rem] bg-primary px-5 pb-6 pt-6 text-white shadow-[var(--warm-shadow)]">
        <h1 className="text-[1.75rem] font-bold leading-tight">{greeting} 👋</h1>
        <p className="text-body mt-2 text-white/90">{t("common.oneMoment")}</p>
      </header>,
      <main className="flex-1 px-5 pt-5">
        <CardListSkeleton />
        {isSlow ? (
          <SlowConnectionNotice message={t("common.slowConnection")} />
        ) : null}
      </main>,
    );
  }

  if (hasLoadError || !homeData) {
    return shell(
      <header className="rounded-b-[2rem] bg-primary px-5 pb-6 pt-6 text-white shadow-[var(--warm-shadow)]">
        <h1 className="text-[1.75rem] font-bold leading-tight">{greeting} 👋</h1>
      </header>,
      <main className="flex-1 px-5 pt-5">
        <ConnectionErrorState
          isOffline={!isOnline}
          onRetry={loadHomeData}
        />
      </main>,
    );
  }

  return shell(
    <header className="rounded-b-[2rem] bg-primary px-5 pb-6 pt-6 text-white shadow-[var(--warm-shadow)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight">
            {isFamilyView
              ? `Familie — ${connection.displayLabel}`
              : `${greeting}, ${homeData.firstName} 👋`}
          </h1>
          <p className="text-body mt-2 text-white/90">
            {isFamilyView
              ? `Für ${connection.patientName}`
              : getGreetingSubtitle(homeData, now)}
          </p>
          {showSwitcher ? (
            <HomeModeSwitcher
              mode={mode}
              familyLabel={connection.displayLabel}
              onChange={setViewMode}
            />
          ) : null}
        </div>

        <Link
          href="/settings"
          className="btn-touch h-12 w-12 shrink-0 rounded-full bg-white text-base font-bold text-primary shadow-sm"
          aria-label={t("home.openProfile")}
        >
          {homeData.initials}
        </Link>
      </div>
    </header>,
    <main className="flex-1 px-5 pt-5">
      {isFamilyView ? (
        <FamilyDashboardPanel className="mt-2" showConnectLink={false} />
      ) : (
        <>
          {sectionErrors.profile ? (
            <SectionErrorNotice message="Profil konnte gerade nicht geladen werden." />
          ) : null}

          <StatusBanner
            data={homeData}
            t={t}
            hasError={Boolean(sectionErrors.medication)}
          />

          {sectionErrors.medication ? (
            <SectionErrorNotice message="Medikamentenstatus ist gerade nicht verfügbar." />
          ) : null}

          <section className="mt-6">
            <div className="grid grid-cols-2 gap-3">
              {featureCards.map((card) => {
                const isFamilyCard = card.subtitleKey === "family";
                const familyCard = isFamilyCard ? homeData.family.card : null;

                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="noor-card flex min-h-[120px] flex-col p-4 transition-colors hover:border-primary/30 active:scale-[0.98]"
                  >
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: isFamilyCard
                          ? familyCard?.iconBackground
                          : "#E1F5EE",
                        color: isFamilyCard ? familyCard?.iconColor : "#1D9E75",
                      }}
                      aria-hidden="true"
                    >
                      <card.icon size={26} strokeWidth={2.2} />
                    </span>
                  <h2 className="home-card-title mt-3 min-w-0 truncate font-bold text-[#085041]">
                    {t(card.titleKey)}
                  </h2>
                  <p
                    className={`home-card-subtitle mt-1 ${
                      isFamilyCard && !familyCard?.subtitleColor ? "text-muted" : ""
                    } ${card.subtitleKey === "passport" || card.subtitleKey === "lab" ? "whitespace-nowrap" : ""}`}
                      style={{
                        color: isFamilyCard ? familyCard?.subtitleColor : undefined,
                      }}
                    >
                      {isFamilyCard
                        ? getFamilyCardSubtitle(homeData, sectionErrors)
                        : getCardSubtitle(card.subtitleKey, homeData, t, sectionErrors)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>,
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

function MedicationReminderBanner({
  outstandingCount,
  t,
}: {
  outstandingCount: number;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const title =
    outstandingCount === 1
      ? t("home.dosesPending")
      : t("home.dosesPendingPlural", { count: outstandingCount });

  return (
    <section
      className="flex items-center justify-between rounded-2xl border border-[#BA7517] bg-[#FAEEDA] px-4 py-3.5"
      style={{ borderWidth: "0.5px" }}
      aria-live="polite"
    >
      <div>
        <p className="text-sm font-semibold text-[#633806]">{title}</p>
        <p className="mt-0.5 text-xs text-[#BA7517]">{t("home.confirmPrompt")}</p>
      </div>
      <Link
        href="/medication"
        className="shrink-0 rounded-[10px] bg-[#BA7517] px-4 py-2 text-[13px] font-semibold text-white"
      >
        {t("home.confirm")}
      </Link>
    </section>
  );
}

function StatusBanner({
  data,
  t,
  hasError = false,
}: {
  data: HomeScreenData;
  t: ReturnType<typeof useLanguage>["t"];
  hasError?: boolean;
}) {
  const { medication } = data;

  if (hasError) {
    return null;
  }

  if (medication.total === 0) {
    return (
      <NoorStatusBanner level="success">
        Noch keine Medikamente hinterlegt
      </NoorStatusBanner>
    );
  }

  if (medication.status === "red" || medication.status === "amber") {
    const outstanding = medication.pending + medication.missed;

    return (
      <MedicationReminderBanner outstandingCount={outstanding} t={t} />
    );
  }

  return (
    <NoorStatusBanner level="success">
      {t("home.allMedsTaken")}
    </NoorStatusBanner>
  );
}

function getFamilyCardSubtitle(
  data: HomeScreenData,
  sectionErrors: Partial<Record<HomeSectionKey, string>> = {},
) {
  if (sectionErrors.family) {
    return "Familienstatus gerade nicht verfügbar";
  }

  return data.family.card.subtitle;
}

function getCardSubtitle(
  key: (typeof featureCards)[number]["subtitleKey"],
  data: HomeScreenData,
  t: ReturnType<typeof useLanguage>["t"],
  sectionErrors: Partial<Record<HomeSectionKey, string>> = {},
) {
  if (key === "medication") {
    if (sectionErrors.medication) {
      return "Status gerade nicht verfügbar";
    }

    if (data.medication.total === 0) {
      return "Noch keine Medikamente";
    }

    if (data.medication.confirmed === data.medication.total) {
      return t("home.allConfirmed");
    }

    return t("home.confirmedCount", {
      confirmed: data.medication.confirmed,
      total: data.medication.total,
    });
  }

  if (key === "lab") {
    if (sectionErrors.labResult) {
      return "Laborwerte gerade nicht verfügbar";
    }

    if (data.labResult.hasResult && data.labResult.lastDate) {
      return t("home.lastLab", { date: data.labResult.lastDate });
    }

    return t("home.noLabYet");
  }

  if (key === "family") {
    return getFamilyCardSubtitle(data, sectionErrors);
  }

  return data.healthPassport.complete
    ? t("home.passportComplete")
    : sectionErrors.healthPassport
      ? "Status gerade nicht verfügbar"
      : t("home.passportIncomplete");
}

function SectionErrorNotice({ message }: { message: string }) {
  return (
    <p
      className="mb-4 rounded-2xl border border-warning/30 bg-warning-light px-4 py-3 text-base text-warning"
      role="status"
    >
      {message}
    </p>
  );
}
