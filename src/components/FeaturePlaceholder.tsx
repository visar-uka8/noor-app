import { AppHeader } from "@/components/AppHeader";

type FeaturePlaceholderProps = {
  title: string;
  description: string;
};

export function FeaturePlaceholder({
  title,
  description,
}: FeaturePlaceholderProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader showBack title={title} />

      <main className="mx-auto flex w-full max-w-app flex-1 flex-col items-center justify-center px-5 py-12 text-center">
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-[var(--warm-shadow)]">
          <p className="text-lg leading-relaxed text-muted">{description}</p>
          <p className="mt-4 text-base text-muted/80">Demnächst verfügbar</p>
        </div>
      </main>
    </div>
  );
}
