"use client";

import { FlaskConical, House, Pill, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHomeViewModeContext } from "@/components/HomeViewModeContext";
import { useLanguage } from "@/components/LanguageProvider";
import { useUserRole } from "@/hooks/useUserRole";

export function AppBottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const role = useUserRole();
  const { mode, hasFamilyConnection } = useHomeViewModeContext();

  const isFamilyNav =
    (pathname === "/" && hasFamilyConnection && mode === "family") ||
    (role === "family_member" && pathname.startsWith("/dashboard"));

  const items = isFamilyNav
    ? [
        { href: "/", label: "Familie", icon: UsersRound },
        { href: "/lab-results", label: "Laborwerte", icon: FlaskConical },
        { href: "/settings", label: t("nav.profile"), icon: UserRound },
      ]
    : [
        { href: "/", label: t("nav.home"), icon: House },
        { href: "/medication", label: t("nav.medication"), icon: Pill },
        { href: "/lab-results", label: t("nav.lab"), icon: FlaskConical },
        { href: "/settings", label: t("nav.profile"), icon: UserRound },
      ];

  return (
    <nav
      className="safe-bottom fixed bottom-0 left-1/2 z-30 w-full max-w-app -translate-x-1/2 border-t border-border bg-surface/95 px-3 pt-2 backdrop-blur-sm"
      aria-label={t("nav.main")}
    >
      <div
        className={`grid gap-1 ${
          items.length === 3 ? "grid-cols-3" : "grid-cols-4"
        }`}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/dashboard")
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 py-2 text-sm font-semibold leading-tight ${
                isActive ? "text-primary" : "text-muted"
              }`}
            >
              <Icon
                size={24}
                strokeWidth={2.4}
                className={isActive ? "text-primary" : "text-muted"}
                aria-hidden="true"
              />
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
