export const relationships = [
  "Sohn",
  "Tochter",
  "Ehemann",
  "Ehefrau",
  "Bruder",
  "Schwester",
  "Andere",
] as const;

export type Relationship = (typeof relationships)[number];

export type FamilyInvitation = {
  code: string;
  patientId: string;
  familyMemberName: string;
  relationship: Relationship;
  createdAt: string;
  expiresAt: string;
  status: "pending" | "accepted" | "expired";
};

export const demoPatientId = "hans-leka-demo";
