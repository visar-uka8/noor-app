"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type FamilyNoteReplySheetProps = {
  open: boolean;
  noteId: string;
  senderName: string;
  onClose: () => void;
  onSent: () => void;
};

export function FamilyNoteReplySheet({
  open,
  noteId,
  senderName,
  onClose,
  onSent,
}: FamilyNoteReplySheetProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMessage("");
      setErrorMessage(null);
      setIsSending(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  async function sendReply() {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/family-notes", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId,
          replyMessage: trimmed,
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Antwort konnte nicht gesendet werden.");
      }

      onSent();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Antwort konnte nicht gesendet werden.",
      );
    } finally {
      setIsSending(false);
    }
  }

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "20px 20px 0 0",
          padding: "24px",
          width: "100%",
          maxWidth: "560px",
          margin: "0 auto",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="family-note-reply-title"
      >
        <h3
          id="family-note-reply-title"
          style={{
            fontSize: "17px",
            fontWeight: 600,
            color: "#085041",
            marginBottom: "16px",
          }}
        >
          Antwort an {senderName}
        </h3>

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="z.B. Ja, habe ich genommen 💊"
          maxLength={160}
          style={{
            width: "100%",
            minHeight: "80px",
            padding: "12px",
            borderRadius: "12px",
            border: "0.5px solid #E4E2DB",
            fontSize: "16px",
            fontFamily: "inherit",
            resize: "none",
            outline: "none",
          }}
        />

        <p className="mt-2 text-right text-xs text-muted">
          {message.length}/160
        </p>

        {errorMessage ? (
          <p className="mt-2 text-sm font-semibold text-danger" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "12px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="btn-touch flex-1 rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-muted"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => void sendReply()}
            disabled={isSending || !message.trim()}
            className="btn-primary flex-1 px-4 py-3 text-base disabled:opacity-60"
          >
            {isSending ? "Wird gesendet…" : "Senden 💚"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
