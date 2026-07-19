"use client";

import { MessageCircle, Phone, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

type FamilyContactSheetProps = {
  open: boolean;
  patientFirstName: string;
  phone: string;
  onClose: () => void;
  onLeaveMessage: () => void;
};

export function FamilyContactSheet({
  open,
  patientFirstName,
  phone,
  onClose,
  onLeaveMessage,
}: FamilyContactSheetProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const telHref = toTelHref(phone);

  return createPortal(
    <div
      className="fixed inset-0 z-[85] bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-app rounded-t-[20px] bg-surface px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 shadow-[var(--warm-shadow)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="family-contact-title"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2
            id="family-contact-title"
            className="text-xl font-bold text-[#085041]"
          >
            {patientFirstName} kontaktieren
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-muted transition-colors hover:bg-primary-light hover:text-primary"
            aria-label="Schließen"
          >
            <X size={24} strokeWidth={2.4} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={telHref}
            className="btn-primary min-h-14 w-full gap-3 text-lg"
            onClick={onClose}
          >
            <Phone size={24} strokeWidth={2.4} aria-hidden="true" />
            Anrufen
          </a>

          <button
            type="button"
            onClick={() => {
              onClose();
              onLeaveMessage();
            }}
            className="btn-touch flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-primary bg-surface px-5 py-3 text-lg font-semibold text-primary transition-colors hover:bg-primary-light"
          >
            <MessageCircle size={24} strokeWidth={2.2} aria-hidden="true" />
            Nachricht hinterlassen
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function toTelHref(phone: string) {
  const trimmed = phone.trim();
  const normalized = trimmed.replace(/[^\d+]/g, "");
  return `tel:${normalized || trimmed}`;
}
