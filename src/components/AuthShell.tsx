import Link from "next/link";

type AuthShellProps = {
  children: React.ReactNode;
  subtitle?: string;
};

export function AuthShell({ children, subtitle }: AuthShellProps) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-app flex-1 flex-col overflow-x-hidden px-5 py-8">
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="btn-touch mx-auto h-20 w-20 rounded-3xl bg-primary text-4xl font-bold text-white shadow-[var(--warm-shadow)]"
          aria-label="Zur Startseite"
        >
          N
        </Link>
        <h1 className="heading-lg mt-5 text-[2rem] leading-tight">
          Willkommen bei Noor
        </h1>
        <p className="text-body mt-2 text-muted">
          {subtitle ?? "Ihre Gesundheit, endlich verständlich."}
        </p>
      </div>

      {children}
    </main>
  );
}
