import Link from "next/link";
import type { Feature } from "@/types/features";

type FeatureCardProps = {
  feature: Feature;
};

export function FeatureCard({ feature }: FeatureCardProps) {
  const Icon = feature.icon;

  return (
    <Link
      href={feature.href}
      className="group flex min-h-[5.5rem] items-center gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow)] transition-all active:scale-[0.98] hover:border-primary/30 hover:shadow-md focus-visible:outline-offset-4"
    >
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary transition-colors group-hover:bg-primary group-hover:text-white"
        aria-hidden="true"
      >
        <Icon size={32} strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-semibold text-foreground">
          {feature.title}
        </h2>
        <p className="mt-1 text-base leading-snug text-muted">
          {feature.description}
        </p>
      </div>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-primary opacity-60 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Link>
  );
}
