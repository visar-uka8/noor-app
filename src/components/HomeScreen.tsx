"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppBottomNav } from "@/components/AppBottomNav";
import { CardListSkeleton, NoorStatusBanner } from "@/components/AppStates";
import {
  demoHomeScreenData,
  getTimeGreeting,
  type HomeScreenData,
} from "@/lib/home-screen";

const featureCards = [
  {
    href: "/medication",
    emoji: "💊",
    title: "Medikamente",
    subtitleKey: "medication" as const,
  },
  {
    href: "/lab-results",
    emoji: "🧪",
    title: "Laborwerte",
    subtitleKey: "lab" as const,
  },
  {
    href: "/dashboard",
    emoji: "👨‍👩‍👦",
    title: "Familie",
    subtitleKey: "family" as const,
  },
  {
    href: "/health-passport",
    emoji: "🏥",
    title: "Gesundheitspass",
    subtitleKey: "passport" as const,
  },
];

export function HomeScreen() {
  const [now, setNow] = useState(new Date());
  const [homeData, setHomeData] = useState<HomeScreenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void fetch("/api/check-in", { method: "POST" });
  }, []);

  useEffect(() => {
    async function loadHomeData() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/home");

        if (!response.ok) {
          throw new Error("Home request failed.");
        }

        setHomeData((await response.json()) as HomeScreenData);
      } catch {
        setHomeData(demoHomeScreenData);
      } finally {
        setIsLoading(false);
      }
    }

    void loadHomeData();
  }, []);

  const greeting = useMemo(() => getTimeGreeting(now), [now]);
  const data = homeData ?? demoHomeScreenData;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-app flex-1 flex-col overflow-x-hidden bg-background">
      <header className="rounded-b-[2rem] bg-primary px-5 pb-6 pt-6 text-white shadow-[var(--warm-shadow)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[1.75rem] font-bold leading-tight">
              {greeting}, {data.firstName} 👋
            </h1>
            <p className="text-body mt-2 text-white/90">
              Schön, dass Sie da sind.
            </p>
          </div>

          <Link
            href="/settings"
            className="btn-touch h-12 w-12 shrink-0 rounded-full bg-white text-base font-bold text-primary shadow-sm"
            aria-label="Profil öffnen"
          >
            {data.initials}
          </Link>
        </div>
      </header>

      <main className="content-bottom-nav flex-1 px-5 pt-5">
        {isLoading ? (
          <CardListSkeleton />
        ) : (
          <>
            <StatusBanner data={data} />

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
                    <h2 className="heading-lg mt-3 leading-tight">
                      {card.title}
                    </h2>
                    <p className="text-body mt-1 text-muted">
                      {getCardSubtitle(card.subtitleKey, data)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <AppBottomNav />
    </div>
  );
}

function StatusBanner({ data }: { data: HomeScreenData }) {
  const { medication } = data;

  if (medication.status === "red") {
    return (
      <NoorStatusBanner
        level="danger"
        action={
          <Link href="/medication" className="btn-primary shrink-0 px-4 py-3">
            Jetzt bestätigen
          </Link>
        }
      >
        Dosis vergessen
      </NoorStatusBanner>
    );
  }

  if (medication.status === "amber") {
    return (
      <NoorStatusBanner level="warning">
        Noch {medication.pending} Dosis ausstehend
      </NoorStatusBanner>
    );
  }

  return (
    <NoorStatusBanner level="success">
      Alle Medikamente heute genommen ✓
    </NoorStatusBanner>
  );
}

function getCardSubtitle(
  key: (typeof featureCards)[number]["subtitleKey"],
  data: HomeScreenData,
) {
  if (key === "medication") {
    if (data.medication.confirmed === data.medication.total) {
      return "Alle bestätigt ✓";
    }

    return `${data.medication.confirmed} von ${data.medication.total} bestätigt`;
  }

  if (key === "lab") {
    if (data.labResult.hasResult && data.labResult.lastDate) {
      return `Letzter Befund: ${data.labResult.lastDate}`;
    }

    return "Noch kein Befund";
  }

  if (key === "family") {
    if (data.family.connectedCount === 0) {
      return "Noch niemand verbunden";
    }

    if (data.family.connectedCount === 1) {
      return "1 Person verbunden";
    }

    return `${data.family.connectedCount} Personen verbunden`;
  }

  return data.healthPassport.complete
    ? "Vollständig"
    : "Unvollständig — bitte ausfüllen";
}
