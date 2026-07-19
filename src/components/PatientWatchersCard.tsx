import { Avatar } from "@/components/ui/Avatar";

type PatientWatchersCardProps = {
  watchers: Array<{
    watcherName: string;
    watcherFirstName: string;
    watcherInitials: string;
    watcherAvatarUrl?: string | null;
  }>;
  followText: string;
};

export function PatientWatchersCard({
  watchers,
  followText,
}: PatientWatchersCardProps) {
  const primaryWatcher = watchers[0];

  if (!primaryWatcher) {
    return null;
  }

  return (
    <section
      className="mt-6 flex items-center gap-3 rounded-2xl bg-[#E1F5EE] p-4"
      aria-label="Meine Familie"
    >
      <Avatar
        url={primaryWatcher.watcherAvatarUrl}
        name={primaryWatcher.watcherName}
        firstName={primaryWatcher.watcherFirstName}
        size={44}
      />
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-[#085041]">{followText}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-[#1D5B40]">
          {primaryWatcher.watcherFirstName} wird benachrichtigt, wenn Sie eine
          Dosis vergessen.
        </p>
      </div>
    </section>
  );
}
