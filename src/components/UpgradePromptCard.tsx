"use client";

import { useRouter } from "next/navigation";

type UpgradePromptCardProps = {
  className?: string;
};

export function UpgradePromptCard({ className = "" }: UpgradePromptCardProps) {
  const router = useRouter();

  return (
    <div
      className={className}
      style={{
        backgroundColor: "#E1F5EE",
        borderRadius: "16px",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "24px", marginBottom: "8px" }}>🌿</div>
      <div
        style={{
          fontSize: "17px",
          fontWeight: 600,
          color: "#085041",
          marginBottom: "8px",
        }}
      >
        Noor Familie
      </div>
      <div
        style={{
          fontSize: "15px",
          color: "#88856F",
          marginBottom: "16px",
          lineHeight: 1.5,
        }}
      >
        Für unbegrenzte Analysen und alle Familien-Features — €9,99 pro Monat.
      </div>
      <button
        type="button"
        onClick={() => router.push("/preise")}
        style={{
          backgroundColor: "#1D9E75",
          color: "#FFFFFF",
          border: "none",
          borderRadius: "50px",
          padding: "12px 32px",
          fontSize: "15px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Jetzt upgraden →
      </button>
      <div
        style={{
          fontSize: "12px",
          color: "#88856F",
          marginTop: "8px",
        }}
      >
        Jederzeit kündbar
      </div>
    </div>
  );
}
