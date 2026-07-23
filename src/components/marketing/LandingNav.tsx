"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SHOW_PRICING } from "@/lib/feature-flags";

const loginUrl = "/login";
const registerUrl = "/register";

export function LandingNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const pricingHref =
    pathname === "/landing" || pathname === "/" ? "#preise" : "/preise";

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
        <Link href="/landing" className="landing-nav-logo">
          noor
        </Link>
        <div className="landing-nav-actions">
          {SHOW_PRICING ? (
            <Link href={pricingHref} className="landing-nav-login">
              Preise
            </Link>
          ) : null}
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
