"use client";

import { Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HealthPassportEmergencyView } from "@/components/HealthPassportEmergencyView";
import {
  cacheEmergencyPassport,
  resolveEmergencyPassport,
} from "@/lib/health-passport-emergency-cache";
import {
  cacheEmergencyShare,
  cachedShareToHealthPassportShare,
  isEmergencyShareValid,
  readEmergencyShareCache,
  shouldRefreshEmergencyShare,
} from "@/lib/health-passport-share-cache";
import {
  buildShareUrl,
  formatShareExpiryDate,
  type HealthPassportShare,
} from "@/lib/health-passport-share";
import { getSupabase } from "@/lib/supabase";
import type { HealthPassportData } from "@/types/health-passport";

type HealthPassportEmergencyModeProps = {
  passport: HealthPassportData;
  onClose: () => void;
  onBeforeShare?: () => Promise<boolean>;
};

async function buildQrDataUrl(shareUrl: string) {
  return QRCode.toDataURL(shareUrl, {
    margin: 1,
    width: 320,
    color: {
      dark: "#111111",
      light: "#ffffff",
    },
  });
}

export function HealthPassportEmergencyMode({
  passport,
  onClose,
  onBeforeShare,
}: HealthPassportEmergencyModeProps) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const shareRequestRef = useRef<Promise<HealthPassportShare | null> | null>(
    null,
  );
  const [displayPassport, setDisplayPassport] = useState<HealthPassportData>(
    () => resolveEmergencyPassport(passport),
  );
  const [share, setShare] = useState<HealthPassportShare | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    const cachedFirst = resolveEmergencyPassport(passport);
    setDisplayPassport(cachedFirst);

    if (passport?.personal) {
      cacheEmergencyPassport(passport);
      setDisplayPassport(passport);
    }
  }, [passport]);

  useEffect(() => {
    cacheEmergencyPassport(displayPassport);
  }, [displayPassport]);

  useEffect(() => {
    async function requestWakeLock() {
      if (!("wakeLock" in navigator)) return;

      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      } catch {
        // Some browsers block wake lock until the page is fully visible.
      }
    }

    void requestWakeLock();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const createShareToken = useCallback(
    async (options?: { force?: boolean; silent?: boolean }) => {
      if (shareRequestRef.current) {
        return shareRequestRef.current;
      }

      const run = async (): Promise<HealthPassportShare | null> => {
        if (!options?.silent) {
          setShareError(null);
          setShareStatus(null);
        }

        if (onBeforeShare) {
          const saved = await onBeforeShare();
          if (!saved) {
            if (!options?.silent) {
              setShareError(
                "Bitte speichern Sie zuerst Ihren Gesundheitspass (mindestens den Namen).",
              );
            }
            return null;
          }
        }

        if (!options?.silent) {
          setIsCreatingShare(true);
        }

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

          const data = (await response.json().catch(() => null)) as {
            share?: HealthPassportShare;
            error?: string;
          } | null;

          if (!response.ok || !data?.share?.token) {
            throw new Error(data?.error ?? "Share creation failed.");
          }

          const shareUrl = buildShareUrl(data.share.token);
          const nextShare: HealthPassportShare = {
            ...data.share,
            shareUrl,
          };
          const qr = await buildQrDataUrl(shareUrl);

          setShare(nextShare);
          setQrCodeUrl(qr);
          cacheEmergencyShare(nextShare, qr);

          return nextShare;
        } catch (error) {
          console.error("Emergency share token creation failed:", error);
          if (!options?.silent) {
            setShareError(
              error instanceof Error
                ? error.message
                : "Der Notfall-Link konnte gerade nicht erstellt werden.",
            );
          }
          return null;
        } finally {
          if (!options?.silent) {
            setIsCreatingShare(false);
          }
          shareRequestRef.current = null;
        }
      };

      shareRequestRef.current = run();
      return shareRequestRef.current;
    },
    [onBeforeShare],
  );

  useEffect(() => {
    const cached = readEmergencyShareCache();

    if (cached && isEmergencyShareValid(cached.expiresAt)) {
      setShare(cachedShareToHealthPassportShare(cached));
      setQrCodeUrl(cached.qrDataUrl);

      if (shouldRefreshEmergencyShare(cached.expiresAt)) {
        void createShareToken({ silent: true });
      }
      return;
    }

    void createShareToken();
  }, [createShareToken]);

  async function handleShare() {
    setIsSharing(true);
    setShareError(null);
    setShareStatus(null);

    try {
      const activeShare = share ?? (await createShareToken());
      if (!activeShare) return;

      if (navigator.share) {
        await navigator.share({
          title: "Notfall-Gesundheitspass",
          text: "Gesundheitsinformationen für den Notfall",
          url: activeShare.shareUrl,
        });
        setShareStatus("Link geteilt.");
      } else {
        await navigator.clipboard.writeText(activeShare.shareUrl);
        setShareStatus("Link kopiert!");
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "AbortError" || error.message.includes("Share canceled"))
      ) {
        return;
      }

      console.error("Emergency share failed:", error);
      setShareError("Teilen ist gerade nicht möglich.");
    } finally {
      setIsSharing(false);
    }
  }

  async function handleRegenerate() {
    setIsRegenerating(true);
    setShareError(null);
    setShareStatus(null);

    try {
      await createShareToken({ force: true });
      setShareStatus("Neuer QR-Code erstellt.");
    } finally {
      setIsRegenerating(false);
    }
  }

  const title = useMemo(() => {
    const name = displayPassport.personal.fullName.trim() || "Unbekannt";
    return `Notfall — ${name}`;
  }, [displayPassport.personal.fullName]);

  const expiryLabel = share
    ? formatShareExpiryDate(share.expiresAt)
    : null;

  const isShareBusy = isCreatingShare || isSharing || isRegenerating;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 560,
            margin: "0 auto",
            minHeight: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <HealthPassportEmergencyView passport={displayPassport} />

          <div
            style={{
              borderTop: "1px solid #E4E2DB",
              padding: "16px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "#88856F",
                marginBottom: "12px",
              }}
            >
              QR-Code für Arzt oder Rettungsdienst
            </div>

            {qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodeUrl}
                alt="QR-Code für den Notfall-Link"
                style={{
                  width: "160px",
                  height: "160px",
                  margin: "0 auto",
                  display: "block",
                  backgroundColor: "#FFFFFF",
                }}
              />
            ) : (
              <div
                style={{
                  width: "160px",
                  height: "160px",
                  margin: "0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  border: "1px solid #E4E2DB",
                  backgroundColor: "#FAFAF8",
                }}
                aria-live="polite"
              >
                {isCreatingShare ? (
                  <Loader2
                    size={28}
                    className="animate-spin"
                    aria-hidden="true"
                    style={{ color: "#1D9E75" }}
                  />
                ) : (
                  <span style={{ fontSize: 13, color: "#88856F" }}>
                    QR-Code wird erstellt…
                  </span>
                )}
              </div>
            )}

            {expiryLabel ? (
              <div
                style={{
                  fontSize: "12px",
                  color: "#AAAAAA",
                  marginTop: "8px",
                }}
              >
                Gültig bis: {expiryLabel}
              </div>
            ) : null}

            {shareError ? (
              <p
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  color: "#A32D2D",
                  fontWeight: 600,
                }}
                role="alert"
              >
                {shareError}
              </p>
            ) : null}

            {shareStatus ? (
              <p
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  color: "#085041",
                  fontWeight: 600,
                }}
                role="status"
              >
                {shareStatus}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleShare()}
              disabled={isShareBusy || !share}
              style={{
                marginTop: "12px",
                padding: "10px 24px",
                backgroundColor: "#1D9E75",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: isShareBusy || !share ? "not-allowed" : "pointer",
                opacity: isShareBusy || !share ? 0.65 : 1,
              }}
            >
              {isSharing ? "Wird geteilt…" : "Link teilen"}
            </button>

            <button
              type="button"
              onClick={() => void handleRegenerate()}
              disabled={isShareBusy}
              style={{
                display: "block",
                width: "100%",
                marginTop: 10,
                padding: "8px 12px",
                backgroundColor: "transparent",
                color: "#88856F",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isShareBusy ? "not-allowed" : "pointer",
                opacity: isShareBusy ? 0.65 : 1,
              }}
            >
              {isRegenerating ? "Wird neu erstellt…" : "Neu generieren"}
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderTop: "2px solid #111111",
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            minHeight: 64,
            borderRadius: 16,
            border: "2px solid #111111",
            backgroundColor: "#111111",
            color: "#FFFFFF",
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          SCHLIESSEN
        </button>
      </div>
    </div>
  );
}
