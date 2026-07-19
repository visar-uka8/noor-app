"use client";

import { Loader2, Share2, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import {
  buildShareUrl,
  formatShareExpiryDate,
  shareExpiryNotice,
  type HealthPassportShare,
} from "@/lib/health-passport-share";
import { getSupabase } from "@/lib/supabase";

type HealthPassportShareDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function HealthPassportShareDialog({
  open,
  onClose,
}: HealthPassportShareDialogProps) {
  const [share, setShare] = useState<HealthPassportShare | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    async function createShareLink() {
      setIsLoading(true);
      setErrorMessage(null);
      setStatusMessage(null);
      setShare(null);
      setQrCodeUrl(null);

      try {
        const supabase = getSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch("/api/health-passport/share", {
          method: "POST",
          credentials: "include",
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {},
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "Share creation failed.");
        }

        const data = (await response.json()) as { share: HealthPassportShare };
        const nextShare = {
          ...data.share,
          shareUrl: buildShareUrl(data.share.token),
        };

        setShare(nextShare);

        const qr = await QRCode.toDataURL(nextShare.shareUrl, {
          margin: 1,
          width: 280,
          color: {
            dark: "#111111",
            light: "#ffffff",
          },
        });

        setQrCodeUrl(qr);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Der Notfall-Link konnte gerade nicht erstellt werden.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void createShareLink();
  }, [open]);

  async function shareLink() {
    if (!share) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Notfall-Gesundheitspass",
          text: "Gesundheitsinformationen für den Notfall",
          url: share.shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(share.shareUrl);
      setStatusMessage("Link kopiert!");
    } catch {
      setStatusMessage("Teilen ist gerade nicht möglich.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <section className="max-h-[90vh] w-full max-w-app overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Notfall-Link teilen</h2>
            <p className="mt-2 text-base leading-relaxed text-muted">
              {shareExpiryNotice}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-muted transition-colors hover:bg-primary-light hover:text-primary"
            aria-label="Schließen"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {isLoading ? (
          <div className="mt-8 flex items-center justify-center gap-3 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            Link wird erstellt...
          </div>
        ) : null}

        {errorMessage ? (
          <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-base text-red-700" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {share ? (
          <div className="mt-6 flex flex-col items-center gap-5">
            <button
              type="button"
              onClick={() => void shareLink()}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
            >
              <Share2 size={22} aria-hidden="true" />
              Link teilen
            </button>

            {qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodeUrl}
                alt="QR-Code für den Notfall-Link"
                className="rounded-2xl border border-border bg-white p-3"
              />
            ) : null}

            <p className="w-full break-all rounded-2xl bg-background px-4 py-3 text-center text-base font-semibold text-primary">
              {share.shareUrl}
            </p>

            <p className="text-sm text-muted">
              Dieser Link läuft ab am {formatShareExpiryDate(share.expiresAt)}
            </p>

            {statusMessage ? (
              <p className="text-sm text-muted" role="status">
                {statusMessage}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
