"use client";

import type { WatcherFamilyNoteReply } from "@/types/family-notes";

type FamilyNoteReplyHomeCardProps = {
  reply: WatcherFamilyNoteReply;
  onDismiss: (noteId: string) => void;
  className?: string;
};

export function FamilyNoteReplyHomeCard({
  reply,
  onDismiss,
  className = "",
}: FamilyNoteReplyHomeCardProps) {
  async function handleDismiss() {
    try {
      await fetch("/api/family-notes", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: reply.id,
          markReplySeen: true,
        }),
      });
    } catch {
      // Still hide locally so the card does not stick around.
    }

    onDismiss(reply.id);
  }

  return (
    <button
      type="button"
      onClick={() => void handleDismiss()}
      className={`btn-touch w-full text-left ${className}`}
      style={{
        backgroundColor: "#E1F5EE",
        borderRadius: "16px",
        padding: "14px 16px",
        border: "none",
      }}
      aria-label={`Antwort von ${reply.patientFirstName}: ${reply.replyMessage}`}
    >
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
        }}
      >
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
            Antwort von {reply.patientFirstName}
          </div>
          <div
            style={{
              fontSize: "15px",
              color: "#085041",
              lineHeight: 1.5,
            }}
          >
            {reply.replyMessage}
          </div>
        </div>
      </div>
    </button>
  );
}
