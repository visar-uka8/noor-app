import { HealthPassportEmergencyView } from "@/components/HealthPassportEmergencyView";
import { getSharedPassportByToken } from "@/lib/health-passport-share-server";
import { shareExpiryNotice } from "@/lib/health-passport-share";

type PublicNotfallPageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicNotfallPage({ params }: PublicNotfallPageProps) {
  const { token } = await params;
  const result = await getSharedPassportByToken(token);

  if ("error" in result) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-app flex-col items-center justify-center px-5 py-10 text-center">
        <p className="rounded-2xl border border-border bg-surface px-5 py-4 text-lg text-foreground shadow-[var(--warm-shadow)]">
          {result.error}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-app bg-background">
      <div className="border-b border-border bg-surface px-5 py-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Noor Notfall-Gesundheitspass
        </p>
        <p className="mt-1 text-sm text-muted">{shareExpiryNotice}</p>
      </div>
      <HealthPassportEmergencyView passport={result.passport} />
    </main>
  );
}
