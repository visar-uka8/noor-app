"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { HealthPassportEmergencyView } from "@/components/HealthPassportEmergencyView";
import type { HealthPassportData } from "@/types/health-passport";

type HealthPassportEmergencyModeProps = {
  passport: HealthPassportData;
  onClose: () => void;
  onShare: () => void;
};

export function HealthPassportEmergencyMode({
  passport,
  onClose,
  onShare,
}: HealthPassportEmergencyModeProps) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

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

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="mx-auto flex w-full max-w-app items-center justify-between px-5 py-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
          Notfallansicht
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-muted transition-colors hover:bg-primary-light hover:text-primary"
          aria-label="Notfallansicht schließen"
        >
          <X size={24} strokeWidth={2.4} />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-app flex-1 flex-col overflow-y-auto">
        <HealthPassportEmergencyView
          passport={passport}
          onShare={onShare}
          showShareButton
        />
      </div>
    </div>
  );
}
