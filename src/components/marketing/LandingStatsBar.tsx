"use client";

import { useEffect, useState } from "react";
import { Clock3, Languages, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useMarketingIntersection } from "@/hooks/useScrollAnimation";

function useCountUp(target: number, active: boolean, duration = 1500) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [target, active, duration]);

  return value;
}

type StatItem = {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  hint: string;
  delay: string;
};

export function LandingStatsBar() {
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sectionRef = useMarketingIntersection<HTMLElement>(
    () => setActive(true),
    { threshold: 0.25 },
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const percentCount = useCountUp(100, active && mounted);
  const minuteCount = useCountUp(2, active && mounted);

  const stats: StatItem[] = [
    {
      icon: Languages,
      value: (
        <span suppressHydrationWarning>
          {mounted && active ? `${percentCount}%` : "100%"}
        </span>
      ),
      label: "Auf Deutsch",
      hint: "Kein Fachchinesisch — alles verständlich erklärt",
      delay: "delay-1",
    },
    {
      icon: Sparkles,
      value: "0€",
      label: "Kostenlos starten",
      hint: "Keine Kreditkarte, kein Abo-Zwang",
      delay: "delay-2",
    },
    {
      icon: Clock3,
      value: (
        <span className="landing-stat-value-time" suppressHydrationWarning>
          <span className="landing-stat-value-prefix">&lt;</span>
          <span className="landing-stat-value-number">
            {mounted && active ? minuteCount : 2}
          </span>
          <span className="landing-stat-value-unit">Min</span>
        </span>
      ),
      label: "Bis zur ersten Analyse",
      hint: "Befund fotografieren — Noor erklärt sofort",
      delay: "delay-3",
    },
  ];

  return (
    <section ref={sectionRef} className="landing-stats-bar">
      <div className="landing-stats-inner">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.label}
              className={`landing-stat-card scroll-animate ${stat.delay}`}
            >
              <span className="landing-stat-icon" aria-hidden="true">
                <Icon size={22} strokeWidth={2.2} />
              </span>
              <p className="landing-stat-value">{stat.value}</p>
              <p className="landing-stat-label">{stat.label}</p>
              <p className="landing-stat-hint">{stat.hint}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
