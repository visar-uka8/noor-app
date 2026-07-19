export type ProfileGender = "male" | "female" | "none";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very_active";

export type SportType =
  | "running"
  | "cycling"
  | "swimming"
  | "strength"
  | "yoga"
  | "football"
  | "tennis"
  | "other";

export type ProfileHealthData = {
  dateOfBirth: string;
  gender: ProfileGender | "";
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel | "";
  sportTypes: SportType[];
};

export const emptyProfileHealthData: ProfileHealthData = {
  dateOfBirth: "",
  gender: "",
  heightCm: "",
  weightKg: "",
  activityLevel: "",
  sportTypes: [],
};

export const genderOptions: Array<{ value: ProfileGender; label: string }> = [
  { value: "male", label: "Männlich" },
  { value: "female", label: "Weiblich" },
  { value: "none", label: "Keine Angabe" },
];

export const activityOptions: Array<{
  value: ActivityLevel;
  emoji: string;
  title: string;
  subtitle: string;
}> = [
  {
    value: "sedentary",
    emoji: "🛋️",
    title: "Wenig aktiv",
    subtitle: "Wenig oder kein Sport",
  },
  {
    value: "light",
    emoji: "🚶",
    title: "Leicht aktiv",
    subtitle: "1-2 Mal pro Woche",
  },
  {
    value: "moderate",
    emoji: "🏃",
    title: "Aktiv",
    subtitle: "3-4 Mal pro Woche",
  },
  {
    value: "very_active",
    emoji: "💪",
    title: "Sehr aktiv",
    subtitle: "5+ Mal pro Woche oder intensiver Sport",
  },
];

export const sportTypeOptions: Array<{ value: SportType; label: string }> = [
  { value: "running", label: "Laufen" },
  { value: "cycling", label: "Radfahren" },
  { value: "swimming", label: "Schwimmen" },
  { value: "strength", label: "Krafttraining" },
  { value: "yoga", label: "Yoga" },
  { value: "football", label: "Fußball" },
  { value: "tennis", label: "Tennis" },
  { value: "other", label: "Andere" },
];

export function isValidHeightCm(value: string) {
  if (!value.trim()) return true;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 140 && parsed <= 220;
}

export function isValidWeightKg(value: string) {
  if (!value.trim()) return true;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 40 && parsed <= 200;
}

export function profileHealthFromRow(row: {
  date_of_birth?: string | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | string | null;
  activity_level?: string | null;
  sport_types?: string[] | null;
} | null | undefined): ProfileHealthData {
  if (!row) return emptyProfileHealthData;

  const gender =
    row.gender === "male" || row.gender === "female" || row.gender === "none"
      ? row.gender
      : "";
  const activityLevel =
    row.activity_level === "sedentary" ||
    row.activity_level === "light" ||
    row.activity_level === "moderate" ||
    row.activity_level === "very_active"
      ? row.activity_level
      : "";

  return {
    dateOfBirth: row.date_of_birth ?? "",
    gender,
    heightCm:
      row.height_cm != null && row.height_cm > 0 ? String(row.height_cm) : "",
    weightKg:
      row.weight_kg != null && Number(row.weight_kg) > 0
        ? String(row.weight_kg)
        : "",
    activityLevel,
    sportTypes: (row.sport_types ?? []).filter((entry): entry is SportType =>
      sportTypeOptions.some((option) => option.value === entry),
    ),
  };
}
