"use client";

import { useEffect, useRef, useState } from "react";

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

export function LandingStatsBar() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const percentCount = useCountUp(100, active);
  const minuteCount = useCountUp(2, active);

  return (
    <section ref={sectionRef} className="landing-stats-bar">
      <div className="landing-stats-inner">
        <div className="landing-stat scroll-animate delay-1">
          <p className="landing-stat-value">{percentCount}%</p>
          <p className="landing-stat-label">Auf Deutsch</p>
        </div>
        <div className="landing-stat scroll-animate delay-2">
          <p className="landing-stat-value">0€</p>
          <p className="landing-stat-label">Kostenlos starten</p>
        </div>
        <div className="landing-stat scroll-animate delay-3">
          <p className="landing-stat-value">&lt; {minuteCount} Min</p>
          <p className="landing-stat-label">Bis zur ersten Analyse</p>
        </div>
      </div>
    </section>
  );
}
