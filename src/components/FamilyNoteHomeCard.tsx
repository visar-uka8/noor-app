"use client";

import { useState } from "react";
import { FamilyNoteReplySheet } from "@/components/FamilyNoteReplySheet";
import type { PatientFamilyNote } from "@/types/family-notes";

type FamilyNoteHomeCardProps = {
  note: PatientFamilyNote;
  onDismiss: (noteId: string) => void;
  className?: string;
};

const quickReplies = [
  { label: "👍 Alles gut!", value: "👍 Alles gut!" },
  { label: "💊 Gleich!", value: "💊 Nehme sie gleich!" },
] as const;

export function FamilyNoteHomeCard({
  note,
  onDismiss,
  className = "",
}: FamilyNoteHomeCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showCustomReply, setShowCustomReply] = useState(false);

  async function patchNote(body: Record<string, unknown>) {
    await fetch("/api/family-notes", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function sendReply(replyText: string) {
    if (isSaving) return;

    setIsSaving(true);

    try {
      await patchNote({
        noteId: note.id,
        replyMessage: replyText,
      });
      onDismiss(note.id);
    } catch {
      setIsSaving(false);
    }
  }

  async function handleDismiss() {
    if (isSaving) return;

    setIsSaving(true);

    try {
      if (note.isUnread) {
        await patchNote({ noteId: note.id });
      }

      onDismiss(note.id);
    } catch {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div
        className={className}
      style={{
        backgroundColor: "#E1F5EE",
        borderRadius: "16px",
        padding: "14px 16px",
      }}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div style={{ fontSize: "24px" }} aria-hidden="true">
            💚
          </div>
          <div className="min-w-0 flex-1">
            <div
              style={{
                fontSize: "13px",
                color: "#1D9E75",
                fontWeight: 600,
                marginBottom: "4px",
              }}
            >
              Nachricht von {note.senderName}
            </div>
            <div
              style={{
                fontSize: "15px",
                color: "#085041",
                lineHeight: 1.5,
              }}
            >
              {note.message}
            </div>
          </div>
        </div>

        {note.isUnread ? (
          <>
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "12px",
              }}
            >
              {quickReplies.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => void sendReply(entry.value)}
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "12px",
                    border: "0.5px solid #E4E2DB",
                    backgroundColor: "#F7F6F2",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#085041",
                    cursor: "pointer",
                    opacity: isSaving ? 0.6 : 1,
                  }}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowCustomReply(true)}
              disabled={isSaving}
              className="btn-touch mt-2 w-full text-sm font-semibold text-primary"
            >
              Antwort schreiben
            </button>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => void handleDismiss()}
          disabled={isSaving}
          style={{
            width: "100%",
            marginTop: note.isUnread ? "8px" : "12px",
            padding: "12px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "#1D9E75",
            fontSize: "14px",
            fontWeight: 600,
            color: "#FFFFFF",
            cursor: "pointer",
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          {isSaving ? "Wird gespeichert…" : "Verstanden ✓"}
        </button>
      </div>

      <FamilyNoteReplySheet
        open={showCustomReply}
        noteId={note.id}
        senderName={note.senderFirstName}
        onClose={() => setShowCustomReply(false)}
        onSent={() => onDismiss(note.id)}
      />
    </>
  );
}
