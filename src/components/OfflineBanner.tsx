"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="sticky top-0 z-50 border-b border-warning/30 bg-warning px-5 py-3 text-white shadow-md"
      role="alert"
      aria-live="assertive"
    >
      <div className="mx-auto flex w-full max-w-app items-center gap-3">
        <WifiOff size={22} strokeWidth={2.4} aria-hidden="true" />
        <p className="text-body font-semibold">
          Kein Internet — bitte prüfen Sie Ihre Verbindung.
        </p>
      </div>
    </div>
  );
}
