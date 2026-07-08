"use client";

import { FlaskConical, House, Pill, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Startseite", icon: House },
  { href: "/medication", label: "Medikamente", icon: Pill },
  { href: "/lab-results", label: "Labor", icon: FlaskConical },
  { href: "/settings", label: "Profil", icon: UserRound },
];

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="safe-bottom fixed bottom-0 left-1/2 z-30 w-full max-w-app -translate-x-1/2 border-t border-border bg-surface/95 px-3 pt-2 backdrop-blur-sm"
      aria-label="Hauptnavigation"
    >
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
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
