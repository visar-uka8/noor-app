import Link from "next/link";
import { contactEmail } from "@/lib/app-info";
import { PublicPageShell } from "@/components/PublicPageShell";

export default function ComingSoonPage() {
  return (
    <PublicPageShell>
      <main className="mx-auto flex min-h-full w-full max-w-app flex-col items-center justify-center px-5 py-12 text-center">
        <div
          className="btn-touch mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-primary text-4xl font-bold text-white shadow-[var(--warm-shadow)]"
          aria-hidden
        >
          N
        </div>
        <h1 className="heading-lg mt-6 text-[2rem] leading-tight">
          Noor kommt bald
        </h1>
        <p className="text-body mt-3 max-w-sm text-muted">
          Wir bereiten Noor vor — eine Gesundheitsapp für ältere Menschen und
          ihre Familien in Deutschland. Bald finden Sie hier alles für
          Medikamente, Befunde und den Notfallpass.
        </p>
        <p className="text-body mt-6 text-muted">
          Fragen?{" "}
          <a
            href={`mailto:${contactEmail}`}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {contactEmail}
          </a>
        </p>
        <footer className="mt-auto pt-12 text-sm text-muted">
          <Link
            href="/impressum"
            className="underline-offset-4 hover:text-primary hover:underline"
          >
            Impressum
          </Link>
          {" · "}
          <Link
            href="/datenschutz"
            className="underline-offset-4 hover:text-primary hover:underline"
          >
            Datenschutz
          </Link>
        </footer>
      </main>
    </PublicPageShell>
  );
}
