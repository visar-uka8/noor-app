"use client";

import { useSearchParams } from "next/navigation";

export function PaymentSuccessBanner() {
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get("success");

  if (!paymentSuccess) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: "#E1F5EE",
        borderRadius: "16px",
        padding: "16px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div style={{ fontSize: "24px" }}>🎉</div>
      <div>
        <div
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "#085041",
          }}
        >
          Willkommen bei Noor Familie!
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "#1D5B40",
            marginTop: "2px",
          }}
        >
          Ihr Abonnement ist jetzt aktiv. Alle Features sind freigeschaltet.
        </div>
      </div>
    </div>
  );
}
