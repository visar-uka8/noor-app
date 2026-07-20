"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

type AppHeaderProps = {
  showBack?: boolean;
  backHref?: string;
  title?: string;
  badge?: React.ReactNode;
};

export function AppHeader({
  showBack = false,
  backHref = "/",
  title,
  badge,
}: AppHeaderProps) {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-app items-center gap-4 px-5 py-4">
        {showBack ? (
          <Link
            href={backHref}
            className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary-light"
            aria-label={t("common.back")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
        ) : (
          <div
            className="flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-primary text-white"
            aria-hidden="true"
          >
            <span className="text-xl font-bold">N</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          {title ? (
            <>
              <h1 className="heading-lg truncate">{title}</h1>
              {badge ? <div className="mt-1">{badge}</div> : null}
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-muted">Noor</p>
              <h1 className="text-2xl font-bold text-foreground">Noor</h1>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
