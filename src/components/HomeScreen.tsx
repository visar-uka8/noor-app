"use client";

import { FlaskConical, Pill, ShieldPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CardListSkeleton,
  ConnectionErrorState,
  NoorStatusBanner,
} from "@/components/AppStates";
import { FamilyNoteHomeCard } from "@/components/FamilyNoteHomeCard";
import { FamilyNoteReplyHomeCard } from "@/components/FamilyNoteReplyHomeCard";
import { FamilyDashboardPanel } from "@/components/FamilyDashboardPanel";
import { HomeTodayActivityCard } from "@/components/HomeTodayActivityCard";
import { HomeAppointmentsCard } from "@/components/HomeAppointmentsCard";
import { EmailConfirmationPromptCard } from "@/components/EmailConfirmationPromptCard";
import { ProfileHealthPromptCard } from "@/components/ProfileHealthPromptCard";
import { MedicationStreakCard } from "@/components/MedicationStreakCard";
import { usePatientFamilyNote } from "@/hooks/usePatientFamilyNote";
import { useWatcherFamilyNoteReply } from "@/hooks/useWatcherFamilyNoteReply";
import { Avatar } from "@/components/ui/Avatar";
import { useLanguage } from "@/components/LanguageProvider";
import { SlowConnectionNotice } from "@/components/SlowConnectionNotice";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useFamilyConnection } from "@/hooks/useFamilyConnection";
import { useFamilyRoles } from "@/hooks/useFamilyRoles";
import { useUserRole } from "@/hooks/useUserRole";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSlowConnection } from "@/hooks/useSlowConnection";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  needsFamilyConnect,
  showFamilyDashboardHome,
} from "@/lib/family-member-flow";
import { formatWatcherFollowSubtitle } from "@/lib/family-roles";
import { formatAppDate } from "@/lib/i18n/languages";
import type { AppLanguage } from "@/lib/i18n/languages";
import { resolveHomeDisplayFields } from "@/lib/profile-display";
import {
  demoHomeScreenData,
  buildPreviewHomeScreenData,
  type HomeScreenData,
  type HomeScreenPreviewMockData,
} from "@/lib/home-screen";
import type { HomeScreenResponse } from "@/lib/home-data";

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
    href: "/family/connect",
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

export type HomeScreenProps = {
  previewMode?: boolean;
  mockData?: HomeScreenPreviewMockData;
};

export function HomeScreen({
  previewMode = false,
  mockData,
}: HomeScreenProps = {}) {
  if (previewMode && mockData) {
    return <HomeScreenPreview mockData={mockData} />;
  }

  return <HomeScreenConnected />;
}

function HomeScreenPreview({ mockData }: { mockData: HomeScreenPreviewMockData }) {
  const { t, language } = useLanguage();
  const data = buildPreviewHomeScreenData(mockData);
  const previewNow = new Date(2026, 5, 20, 10, 0, 0, 0);

  return (
    <div className="mx-auto w-full max-w-app bg-background pointer-events-none select-none">
      <header className="sticky top-0 z-20 shrink-0 rounded-b-[2rem] bg-primary px-5 pb-6 pt-6 text-white shadow-[var(--warm-shadow)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[1.75rem] font-bold leading-tight">
              {t("greeting_morning")}, {mockData.firstName} 👋
            </h1>
            <p className="text-body mt-2 text-white/90">
              {getGreetingSubtitle(data, previewNow, t, language)}
            </p>
          </div>

          <Avatar
            url={null}
            name={mockData.firstName}
            initials={data.initials}
            size={44}
            bordered
          />
        </div>
      </header>

      <div className="px-5 pb-5 pt-3">
        <div className="flex flex-col gap-3">
          <MedicationStreakCard streak={mockData.streak} />

          <section>
            <div className="grid grid-cols-2 gap-3">
            {featureCards.map((card) => {
              const isFamilyCard = card.subtitleKey === "family";
              const isPassportCard = card.subtitleKey === "passport";
              const subtitle = getPreviewCardSubtitle(card.subtitleKey, mockData, t);
              const familyCard = isFamilyCard ? data.family.card : null;
              const passport = data.healthPassport;

              return (
                <div
                  key={card.href}
                  className="noor-card relative flex min-h-[120px] flex-col p-4"
                >
                  {isPassportCard ? (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: passport.dotColor ?? "#A32D2D",
                      }}
                    />
                  ) : null}
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
                    className={`card-subtitle home-card-subtitle mt-1 ${
                      isFamilyCard && !familyCard?.subtitleColor ? "text-muted" : ""
                    } ${card.subtitleKey === "lab" ? "whitespace-nowrap" : ""}`}
                    style={{
                      color: isFamilyCard ? familyCard?.subtitleColor : undefined,
                    }}
                  >
                    {subtitle}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

          <HomeTodayActivityCard
            activity={data.todayActivity}
            week={data.activityWeek}
            waterToday={data.waterToday}
          />
        </div>
      </div>
    </div>
  );
}

function HomeScreenConnected() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { user, isLoading: isAuthLoading } = useAuthUser();
  const { connection, isLoading: isConnectionLoading } = useFamilyConnection();
  const { roles, isLoading: isRolesLoading } = useFamilyRoles();
  const profileRole = useUserRole();
  const isOnline = useOnlineStatus();
  const [now, setNow] = useState<Date | null>(null);
  const [homeData, setHomeData] = useState<HomeScreenData | null>(null);
  const { note: patientFamilyNote, dismiss: dismissPatientFamilyNote } =
    usePatientFamilyNote();
  const { reply: watcherFamilyNoteReply, dismiss: dismissWatcherFamilyNoteReply } =
    useWatcherFamilyNoteReply();
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const isSlow = useSlowConnection(isLoading);
  const useDemoFallback = !process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isFamilyMemberHome = showFamilyDashboardHome(profileRole, roles);
  const awaitingFamilyConnect = needsFamilyConnect(profileRole, roles);
  // Always show Familie on patient home — subtitle reflects invite vs connected.
  const visibleFeatureCards = featureCards;
  const watchedPatientName =
    connection.patientName ||
    roles.watching[0]?.patientName ||
    "Ihrem Angehörigen";

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isAuthLoading || isRolesLoading || profileRole === null) return;
    if (!awaitingFamilyConnect) return;
    router.replace("/family/connect");
  }, [
    awaitingFamilyConnect,
    isAuthLoading,
    isRolesLoading,
    profileRole,
    router,
  ]);

  useEffect(() => {
    void fetch("/api/check-in", { method: "POST" });
  }, []);

  async function loadHomeData() {
    setIsLoading(true);
    setHasLoadError(false);

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

      setHomeData(payload as HomeScreenResponse);
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
    if (!useDemoFallback && !user?.id) {
      console.log("No user ID yet:", user);
      return;
    }
    void loadHomeData();
  }, [isAuthLoading, user?.id, useDemoFallback]);

  const displayProfile = useMemo(() => {
    const metadata = user?.user_metadata as {
      first_name?: string;
      last_name?: string;
    } | undefined;
    const authFallback = resolveHomeDisplayFields({
      profile: null,
      metadata,
      email: user?.email,
    });

    if (!homeData) {
      return { ...authFallback, avatarUrl: null };
    }

    return {
      firstName: homeData.firstName || authFallback.firstName,
      lastName: homeData.lastName || authFallback.lastName,
      initials: homeData.initials || authFallback.initials,
      avatarUrl: homeData.avatarUrl,
    };
  }, [homeData, user]);

  const greeting = useMemo(() => {
    const referenceDate = now ?? new Date(2026, 0, 1, 12, 0, 0, 0);
    const hour = referenceDate.getHours();

    if (hour >= 5 && hour < 11) return t("greeting_morning");
    if (hour >= 11 && hour < 14) return t("greeting_day");
    if (hour >= 14 && hour < 23) return t("greeting_evening");
    return t("greeting_night");
  }, [now, t]);

  const patientFamilyNoteCard = patientFamilyNote ? (
    <FamilyNoteHomeCard
      note={patientFamilyNote}
      onDismiss={dismissPatientFamilyNote}
    />
  ) : null;

  const watcherFamilyNoteReplyCard = watcherFamilyNoteReply ? (
    <FamilyNoteReplyHomeCard
      reply={watcherFamilyNoteReply}
      onDismiss={dismissWatcherFamilyNoteReply}
    />
  ) : null;

  const shell = (header: React.ReactNode, scrollContent: React.ReactNode) => (
    <div className="mx-auto w-full max-w-app bg-background">
      <header className="sticky top-0 z-20 shrink-0 rounded-b-[2rem] bg-primary px-5 pb-6 pt-6 text-white shadow-[var(--warm-shadow)]">
        {header}
      </header>
      <div className="px-5 pb-5 pt-3">
        <div className="flex flex-col gap-3">{scrollContent}</div>
      </div>
    </div>
  );

  if (!isAuthLoading && !user && !useDemoFallback) {
    return shell(
      <h1 className="text-[1.75rem] font-bold leading-tight">{greeting} 👋</h1>,
      <ConnectionErrorState
        isOffline={!isOnline}
        onRetry={() => window.location.assign("/login")}
      />,
    );
  }

  if (
    isAuthLoading ||
    isRolesLoading ||
    profileRole === null ||
    awaitingFamilyConnect ||
    (isFamilyMemberHome && isConnectionLoading) ||
    (!isFamilyMemberHome && isLoading)
  ) {
    return shell(
      <>
        <h1 className="text-[1.75rem] font-bold leading-tight">{greeting} 👋</h1>
        <p className="text-body mt-2 text-white/90">{t("common.oneMoment")}</p>
      </>,
      <>
        <CardListSkeleton />
        {isSlow ? (
          <SlowConnectionNotice message={t("common.slowConnection")} />
        ) : null}
      </>,
    );
  }

  if (!isFamilyMemberHome && (hasLoadError || !homeData)) {
    return shell(
      <h1 className="text-[1.75rem] font-bold leading-tight">{greeting} 👋</h1>,
      <ConnectionErrorState
        isOffline={!isOnline}
        onRetry={loadHomeData}
      />,
    );
  }

  return shell(
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight">
          {isFamilyMemberHome
            ? watchedPatientName
            : `${greeting}, ${displayProfile.firstName} 👋`}
        </h1>
        <p className="text-body mt-2 text-white/90">
          {isFamilyMemberHome
            ? t("home_for_patient", { name: watchedPatientName })
            : getGreetingSubtitle(
                homeData!,
                now ?? new Date(2026, 0, 1, 12, 0, 0, 0),
                t,
                language,
              )}
        </p>
      </div>

      <Link
        href="/settings"
        className="btn-touch shrink-0 rounded-full"
        aria-label={t("home.openProfile")}
      >
        <Avatar
          url={displayProfile.avatarUrl}
          name={`${displayProfile.firstName} ${displayProfile.lastName}`.trim()}
          initials={displayProfile.initials}
          size={44}
          bordered
        />
      </Link>
    </div>,
    <>
      {watcherFamilyNoteReplyCard}
      {patientFamilyNoteCard}

      {isFamilyMemberHome ? (
        <FamilyDashboardPanel showConnectLink={false} />
      ) : (
        <>
          <StatusBanner data={homeData!} t={t} />

          {!user?.email_confirmed_at ? <EmailConfirmationPromptCard /> : null}

          {homeData!.profileHealthIncomplete && user?.id ? (
            <ProfileHealthPromptCard
              userId={user.id}
              missingLabels={homeData!.profileHealthProgress?.missingLabels ?? []}
            />
          ) : null}

          <MedicationStreakCard streak={homeData!.medicationStreak ?? 0} />

          <HomeAppointmentsCard nextAppointment={homeData!.nextAppointment} />

          <section>
            <div className="grid grid-cols-2 gap-3">
              {visibleFeatureCards.map((card) => {
                const isFamilyCard = card.subtitleKey === "family";
                const isPassportCard = card.subtitleKey === "passport";
                const familyConnected =
                  roles.watching.length > 0 ||
                  homeData!.family.watchers.length > 0 ||
                  roles.watchers.length > 0;
                const familyCard = isFamilyCard
                  ? familyConnected
                    ? {
                        ...homeData!.family.card,
                        mode: "patient" as const,
                        iconBackground: "#E1F5EE",
                        iconColor: "#1D9E75",
                      }
                    : homeData!.family.card
                  : null;
                const familySubtitle = isFamilyCard
                  ? getFamilyCardSubtitle(
                      homeData!,
                      t,
                      roles.watchers,
                      roles.watching,
                    )
                  : null;
                const passport = homeData!.healthPassport;
                const showPassportBadge =
                  isFamilyCard &&
                  roles.isWatcher &&
                  homeData!.family.watchedPatientHealthPassportAvailable;
                const showFamilyNoteBadge =
                  isFamilyCard && Boolean(patientFamilyNote);

                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="noor-card relative flex min-h-[120px] flex-col p-4 transition-colors hover:border-primary/30 active:scale-[0.98]"
                  >
                    {isPassportCard ? (
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: passport.dotColor ?? "#A32D2D",
                        }}
                      />
                    ) : null}
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
                    className={`card-subtitle home-card-subtitle mt-1 ${
                      isFamilyCard && !familyCard?.subtitleColor ? "text-muted" : ""
                    } ${card.subtitleKey === "lab" ? "whitespace-nowrap" : ""}`}
                      style={{
                        color: isFamilyCard ? familyCard?.subtitleColor : undefined,
                      }}
                    >
                      {isFamilyCard
                        ? familySubtitle
                        : getCardSubtitle(card.subtitleKey, homeData!, t)}
                    </p>
                    {showPassportBadge ? (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#1D9E75",
                          marginTop: 6,
                          fontWeight: 600,
                        }}
                      >
                        {t("home_passport_available")}
                      </p>
                    ) : null}
                    {showFamilyNoteBadge ? (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#1D9E75",
                          marginTop: 6,
                          fontWeight: 600,
                        }}
                      >
                        {t("home_message_from", {
                          name: patientFamilyNote!.senderFirstName,
                        })}
                      </p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </section>

          <HomeTodayActivityCard
            activity={homeData!.todayActivity}
            week={homeData!.activityWeek}
            waterToday={homeData!.waterToday}
          />
        </>
      )}
    </>,
  );
}

function getPreviewCardSubtitle(
  key: (typeof featureCards)[number]["subtitleKey"],
  mockData: HomeScreenPreviewMockData,
  t: ReturnType<typeof useLanguage>["t"],
) {
  if (key === "medication") {
    return mockData.medicationsConfirmed
      ? t("home.allConfirmed")
      : t("home.confirmedCount", { confirmed: 0, total: 2 });
  }

  if (key === "lab") {
    return t("home.lastLab", { date: mockData.lastLabDate });
  }

  if (key === "family") {
    return mockData.familyStatus;
  }

  return t("complete");
}

function getGreetingSubtitle(
  data: HomeScreenData,
  now: Date,
  t: ReturnType<typeof useLanguage>["t"],
  language: AppLanguage,
) {
  const { medication } = data;
  const allConfirmed =
    medication.total > 0 && medication.confirmed === medication.total;

  if (now.getHours() < 9 && !allConfirmed) {
    return t("home_morning_meds_reminder");
  }

  if (allConfirmed) {
    return t("all_done_today");
  }

  if (medication.pending === 1) {
    return t("one_dose_pending");
  }

  if (medication.pending > 1) {
    return t("doses_pending", { count: medication.pending });
  }

  return formatAppDate(language, now);
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
}: {
  data: HomeScreenData;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const { medication } = data;

  if (medication.total === 0) {
    return (
      <NoorStatusBanner level="success">
        {t("home_no_medications_yet")}
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
  t: ReturnType<typeof useLanguage>["t"],
  roleWatchers: Array<{ watcherFirstName: string }> = [],
  roleWatching: Array<{ patientFirstName: string }> = [],
) {
  if (roleWatching.length > 1) {
    return t("home_watching_many", { count: roleWatching.length });
  }

  if (roleWatching.length === 1) {
    return t("home_watching_one", {
      name: roleWatching[0]?.patientFirstName ?? t("home_watching_fallback"),
    });
  }

  const homeNames = data.family.watchers.map(
    (watcher) => watcher.watcherFirstName,
  );
  if (homeNames.length > 0) {
    return formatWatcherFollowSubtitle(homeNames, t);
  }

  const roleNames = roleWatchers.map((watcher) => watcher.watcherFirstName);
  if (roleNames.length > 0) {
    return formatWatcherFollowSubtitle(roleNames, t);
  }

  return data.family.card.subtitle || t("invite_family");
}

function getCardSubtitle(
  key: (typeof featureCards)[number]["subtitleKey"],
  data: HomeScreenData,
  t: ReturnType<typeof useLanguage>["t"],
) {
  if (key === "medication") {
    if (data.medication.total === 0) {
      return t("home_no_medications_yet");
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
    if (data.labResult.hasResult && data.labResult.lastDate) {
      return t("home.lastLab", { date: data.labResult.lastDate });
    }

    return t("home.noLabYet");
  }

  if (key === "family") {
    return getFamilyCardSubtitle(data, t);
  }

  return getPassportCardSubtitle(data, t);
}

function getPassportCardSubtitle(
  data: HomeScreenData,
  t: ReturnType<typeof useLanguage>["t"],
) {
  if (data.healthPassport.hasOverdueVaccination) {
    return t("passport_vaccination_due");
  }

  switch (data.healthPassport.completionStatus) {
    case "empty":
      return t("passport_subtitle_empty");
    case "low":
      return t("not_complete_yet");
    case "high":
      return t("passport_subtitle_almost");
    case "complete":
      return t("complete");
    default:
      return data.healthPassport.complete
        ? t("home.passportComplete")
        : t("home.passportIncomplete");
  }
}
