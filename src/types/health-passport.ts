export const bloodTypes = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "0+",
  "0-",
  "Unbekannt",
] as const;

export type BloodType = (typeof bloodTypes)[number];

export type MedicationFrequency = "morning" | "midday" | "evening";

export type PassportMedication = {
  id: string;
  name: string;
  dose: string;
  frequency: MedicationFrequency[];
};

export type PassportAllergy = {
  id: string;
  allergen: string;
  reaction: string;
};

export type PassportSurgery = {
  id: string;
  name: string;
  year: string;
  hospital: string;
};

export type PassportVaccination = {
  id: string;
  name: string;
  date: string;
  next_due: string;
};

export type PassportCondition = {
  id: string;
  name: string;
  since: string;
  treatment: string;
};

export type EmergencyContact = {
  name: string;
  relationship: string;
  phone: string;
};

export type HealthPassportPersonal = {
  fullName: string;
  dateOfBirth: string;
  bloodType: BloodType;
  insuranceName: string;
  insuranceNumber: string;
  familyDoctorName: string;
  familyDoctorPhone: string;
};

export type HealthPassportData = {
  userId: string;
  personal: HealthPassportPersonal;
  medications: PassportMedication[];
  allergies: PassportAllergy[];
  conditions: PassportCondition[];
  vaccinations: PassportVaccination[];
  surgeries: PassportSurgery[];
  emergencyContact: EmergencyContact;
};

export const frequencyLabels: Record<MedicationFrequency, string> = {
  morning: "Morgens",
  midday: "Mittags",
  evening: "Abends",
};

export function createEmptyMedication(): PassportMedication {
  return {
    id: crypto.randomUUID(),
    name: "",
    dose: "",
    frequency: [],
  };
}

export function createEmptyAllergy(): PassportAllergy {
  return {
    id: crypto.randomUUID(),
    allergen: "",
    reaction: "",
  };
}

export function createEmptySurgery(): PassportSurgery {
  return {
    id: crypto.randomUUID(),
    name: "",
    year: "",
    hospital: "",
  };
}

export function createEmptyVaccination(): PassportVaccination {
  return {
    id: crypto.randomUUID(),
    name: "",
    date: "",
    next_due: "",
  };
}

export function createEmptyCondition(): PassportCondition {
  return {
    id: crypto.randomUUID(),
    name: "",
    since: "",
    treatment: "",
  };
}

export function createEmptyPassport(userId = ""): HealthPassportData {
  return {
    userId,
    personal: {
      fullName: "",
      dateOfBirth: "",
      bloodType: "Unbekannt",
      insuranceName: "",
      insuranceNumber: "",
      familyDoctorName: "",
      familyDoctorPhone: "",
    },
    medications: [],
    allergies: [],
    conditions: [],
    vaccinations: [],
    surgeries: [],
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
    },
  };
}
