export type HealthPassportShare = {
  id: string;
  token: string;
  expiresAt: string;
  shareUrl: string;
};

export function getShareBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  if (envUrl && !isVercelPreviewHost(envUrl)) {
    return envUrl;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    if (host === "noorhealth.de" || host === "www.noorhealth.de") {
      return "https://noorhealth.de";
    }

    if (host === "noorhealth.app" || host === "www.noorhealth.app") {
      return "https://noorhealth.app";
    }
  }

  // Never use *.vercel.app for shareable emergency links.
  return "https://noorhealth.de";
}

function isVercelPreviewHost(url: string) {
  try {
    const host = new URL(url).hostname;
    return host.endsWith(".vercel.app");
  } catch {
    return url.includes("vercel.app");
  }
}

export function buildShareUrl(token: string) {
  return `${getShareBaseUrl()}/notfall/${token}`;
}

export const shareExpiryNotice =
  "Dieser Link ist 24 Stunden gültig und kann von jedem geöffnet werden.";

export function formatShareExpiryDate(expiresAt: string) {
  const date = new Date(expiresAt);

  if (Number.isNaN(date.getTime())) {
    return expiresAt;
  }

  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPassportDate(dateString: string) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMedicationLine(
  name: string,
  dose: string,
  frequency: string[],
) {
  const parts = [name];

  if (dose.trim()) parts.push(dose.trim());
  if (frequency.length > 0) parts.push(frequency.join(", "));

  return parts.join(" — ");
}
