import { HealthPassportEmergencyView } from "@/components/HealthPassportEmergencyView";
import { getSharedPassportByToken } from "@/lib/health-passport-share-server";
import { formatShareExpiryDate } from "@/lib/health-passport-share";

type PublicNotfallPageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicNotfallPage({
  params,
}: PublicNotfallPageProps) {
  const { token } = await params;
  const result = await getSharedPassportByToken(token);

  if ("error" in result) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFFFF",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            border: "2px solid #111111",
            borderRadius: 16,
            padding: "28px 20px",
            backgroundColor: "#FFFFFF",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: "#111111",
            }}
          >
            🚨 NOTFALL
          </p>
          <p
            style={{
              margin: "16px 0 0",
              fontSize: 18,
              lineHeight: 1.45,
              color: "#111111",
              fontWeight: 600,
            }}
          >
            {result.code === "expired" || result.code === "invalid"
              ? "Dieser Link ist nicht mehr gültig"
              : result.error}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#FFFFFF",
      }}
    >
      <div
        style={{
          borderBottom: "2px solid #111111",
          backgroundColor: "#FFFFFF",
          padding: "16px 20px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "#111111",
            textTransform: "uppercase",
          }}
        >
          Noor Notfall-Gesundheitspass
        </p>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 16,
            color: "#333333",
            fontWeight: 600,
          }}
        >
          Dieser Link läuft ab am {formatShareExpiryDate(result.share.expiresAt)}
        </p>
      </div>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <HealthPassportEmergencyView passport={result.passport} />
      </div>
    </main>
  );
}
