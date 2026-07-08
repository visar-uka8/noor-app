"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, X } from "lucide-react";

type ErrorBannerProps = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
};

type ErrorStateProps = {
  onRetry: () => void;
  message?: string;
};

type EmptyStateProps = {
  emoji?: string;
  icon?: LucideIcon;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
};

export type StatusLevel = "success" | "warning" | "danger";

const statusStyles: Record<
  StatusLevel,
  { container: string; text: string }
> = {
  success: {
    container: "border-primary/20 bg-primary-light",
    text: "text-heading",
  },
  warning: {
    container: "border-warning/25 bg-warning-light",
    text: "text-warning",
  },
  danger: {
    container: "border-danger/25 bg-danger-light",
    text: "text-danger",
  },
};

export function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`skeleton-block rounded-2xl ${className}`}
      aria-hidden="true"
    />
  );
}

export function PageSkeleton() {
  return (
    <main
      className="content-bottom-nav mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6"
      aria-busy="true"
      aria-label="Inhalt wird geladen"
    >
      <SkeletonBlock className="h-24 w-full" />
      <div className="mt-5 flex flex-col gap-4">
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
      </div>
    </main>
  );
}

export function CardListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Wird geladen">
      <SkeletonBlock className="h-28 w-full" />
      <SkeletonBlock className="h-28 w-full" />
      <SkeletonBlock className="h-28 w-full" />
    </div>
  );
}

export function ErrorBanner({
  message,
  actionLabel,
  onAction,
  onDismiss,
}: ErrorBannerProps) {
  return (
    <div
      className="sticky top-0 z-40 border-b border-danger/30 bg-danger px-5 py-4 text-white shadow-md"
      role="alert"
      aria-live="assertive"
    >
      <div className="mx-auto flex w-full max-w-app items-start gap-3">
        <AlertTriangle
          size={24}
          className="mt-0.5 shrink-0"
          strokeWidth={2.4}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold leading-snug">{message}</p>
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="mt-3 min-h-12 rounded-xl bg-white px-4 py-2 text-base font-bold text-danger transition-colors hover:bg-danger-light"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl text-white/90 transition-colors hover:bg-white/15"
            aria-label="Fehlermeldung schließen"
          >
            <X size={22} strokeWidth={2.4} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ErrorState({
  onRetry,
  message = "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
}: ErrorStateProps) {
  return (
    <section className="noor-card p-6 text-center" role="alert">
      <div
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-danger-light text-danger"
        aria-hidden="true"
      >
        <span className="text-4xl">😔</span>
      </div>
      <h2 className="heading-lg mt-4">{message}</h2>
      <p className="text-body mt-2 text-muted">
        Keine Sorge — Ihre Daten sind sicher. Versuchen Sie es einfach noch einmal.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="btn-primary mt-5 w-full"
      >
        Erneut versuchen
      </button>
    </section>
  );
}

export function FeatureEmptyState({
  emoji,
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  href,
}: EmptyStateProps) {
  const buttonClasses = "btn-primary mt-6 w-full";

  return (
    <section className="noor-card p-6 text-center">
      <div
        className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-primary-light"
        aria-hidden="true"
      >
        {emoji ? (
          <span className="text-5xl">{emoji}</span>
        ) : Icon ? (
          <Icon size={48} strokeWidth={2.1} className="text-primary" />
        ) : null}
      </div>
      <h2 className="heading-lg mt-5">{title}</h2>
      <p className="text-body mt-2 text-muted">{subtitle}</p>
      {actionLabel && href ? (
        <a href={href} className={buttonClasses}>
          {actionLabel}
        </a>
      ) : actionLabel && onAction ? (
        <button type="button" onClick={onAction} className={buttonClasses}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}

export function NoorStatusBanner({
  level,
  children,
  action,
}: {
  level: StatusLevel;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const styles = statusStyles[level];

  return (
    <section
      className={`status-banner noor-card p-4 ${styles.container}`}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`text-body font-bold ${styles.text}`}>{children}</p>
        {action}
      </div>
    </section>
  );
}
