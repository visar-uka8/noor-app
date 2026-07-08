import type { FamilyStatusRow as FamilyStatusRowType } from "@/types/family-dashboard";

type FamilyStatusRowProps = {
  row: FamilyStatusRowType;
};

const toneStyles = {
  green: {
    icon: "bg-primary-light text-primary",
    indicator: "bg-primary",
    badge: "text-primary-dark",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700",
    indicator: "bg-amber-500",
    badge: "text-amber-700",
  },
  red: {
    icon: "bg-red-50 text-red-600",
    indicator: "bg-red-500",
    badge: "text-red-600",
  },
  gray: {
    icon: "bg-zinc-100 text-zinc-500",
    indicator: "bg-zinc-300",
    badge: "text-zinc-500",
  },
};

export function FamilyStatusRow({ row }: FamilyStatusRowProps) {
  const Icon = row.icon;
  const styles = toneStyles[row.tone];

  return (
    <div className="flex min-h-20 items-center gap-4 border-b border-border px-4 py-4 last:border-b-0">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}
        aria-hidden="true"
      >
        <Icon size={24} strokeWidth={2.4} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-base font-bold leading-snug text-foreground">
          {row.label}
        </p>
        <p className="mt-1 text-base leading-snug text-muted">{row.subtext}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <span
          className={`h-3 w-3 rounded-full ${styles.indicator}`}
          aria-hidden="true"
        />
        <span className={`text-sm font-semibold ${styles.badge}`}>
          {row.statusText}
        </span>
      </div>
    </div>
  );
}
