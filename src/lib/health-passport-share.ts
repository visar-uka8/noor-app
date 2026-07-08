export type HealthPassportShare = {
  id: string;
  token: string;
  expiresAt: string;
  shareUrl: string;
};

export function getShareBaseUrl() {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "https://noor.health";
}

export function buildShareUrl(token: string) {
  return `${getShareBaseUrl()}/notfall/${token}`;
}

export const shareExpiryNotice =
  "Dieser Link ist 24 Stunden gültig und kann von jedem geöffnet werden.";

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
