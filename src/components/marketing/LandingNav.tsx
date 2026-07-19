"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_BASE_URL } from "@/lib/site-gate";

const loginUrl = `${APP_BASE_URL}/login`;
const registerUrl = `${APP_BASE_URL}/register`;

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`landing-nav${scrolled ? " landing-nav-scrolled" : ""}`}
    >
      <div className="landing-nav-inner">
        <span className="landing-nav-logo">noor</span>
        <div className="landing-nav-actions">
          <Link href={loginUrl} className="landing-nav-login">
            Anmelden
          </Link>
          <Link href={registerUrl} className="landing-nav-cta">
            Starten
          </Link>
        </div>
      </div>
    </nav>
  );
}
