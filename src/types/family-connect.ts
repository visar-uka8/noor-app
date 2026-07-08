export const familyRelationships = [
  "Sohn",
  "Tochter",
  "Ehepartner",
  "Andere",
] as const;

export type FamilyRelationship = (typeof familyRelationships)[number];

export type FamilyInvite = {
  id: string;
  code: string;
  patientId: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
};

export const familyInviteErrors = {
  expired: "Dieser Code ist abgelaufen. Bitte fordern Sie einen neuen an.",
  used: "Dieser Code wurde bereits verwendet. Bitte fordern Sie einen neuen an.",
  invalid: "Ungültiger Code. Bitte überprüfen Sie die Eingabe.",
} as const;

export function formatInviteCountdown(expiresAt: string) {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();

  if (remainingMs <= 0) {
    return null;
  }

  const totalMinutes = Math.floor(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);

  if (hours >= 1) {
    return hours === 1
      ? "Noch 1 Stunde gültig"
      : `Noch ${hours} Stunden gültig`;
  }

  const minutes = Math.max(totalMinutes, 1);
  return minutes === 1
    ? "Noch 1 Minute gültig"
    : `Noch ${minutes} Minuten gültig`;
}

export function buildInviteShareMessage(code: string) {
  return `Ich benutze Noor für meine Gesundheit. 
Verbinde dich mit mir — mein Code ist: ${code}
Lade die App herunter: noor.health`;
}
