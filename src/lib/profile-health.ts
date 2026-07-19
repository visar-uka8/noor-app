import type {
  ActivityLevel,
  ProfileGender,
  SportType,
} from "@/types/profile-health";

export type ProfileHealthPayload = {
  date_of_birth?: unknown;
  gender?: unknown;
  height_cm?: unknown;
  weight_kg?: unknown;
  activity_level?: unknown;
  sport_types?: unknown;
};

export function normalizeProfileHealthFields(payload: ProfileHealthPayload) {
  const updates: {
    date_of_birth?: string | null;
    gender?: ProfileGender | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    activity_level?: ActivityLevel | null;
    sport_types?: SportType[] | null;
  } = {};

  if ("date_of_birth" in payload) {
    if (typeof payload.date_of_birth === "string" && payload.date_of_birth.trim()) {
      updates.date_of_birth = payload.date_of_birth.trim();
    } else {
      updates.date_of_birth = null;
    }
  }

  if ("gender" in payload) {
    if (
      payload.gender === "male" ||
      payload.gender === "female" ||
      payload.gender === "none"
    ) {
      updates.gender = payload.gender;
    } else if (payload.gender === null || payload.gender === "") {
      updates.gender = null;
    }
  }

  if ("height_cm" in payload) {
    if (payload.height_cm === null || payload.height_cm === "") {
      updates.height_cm = null;
    } else {
      const parsed = Number(payload.height_cm);
      if (!Number.isFinite(parsed) || parsed < 140 || parsed > 220) {
        throw new Error("Körpergröße muss zwischen 140 und 220 cm liegen.");
      }
      updates.height_cm = Math.round(parsed);
    }
  }

  if ("weight_kg" in payload) {
    if (payload.weight_kg === null || payload.weight_kg === "") {
      updates.weight_kg = null;
    } else {
      const parsed = Number(payload.weight_kg);
      if (!Number.isFinite(parsed) || parsed < 40 || parsed > 200) {
        throw new Error("Körpergewicht muss zwischen 40 und 200 kg liegen.");
      }
      updates.weight_kg = Math.round(parsed * 10) / 10;
    }
  }

  if ("activity_level" in payload) {
    if (
      payload.activity_level === "sedentary" ||
      payload.activity_level === "light" ||
      payload.activity_level === "moderate" ||
      payload.activity_level === "very_active"
    ) {
      updates.activity_level = payload.activity_level;
    } else if (payload.activity_level === null || payload.activity_level === "") {
      updates.activity_level = null;
    }
  }

  if ("sport_types" in payload) {
    if (!Array.isArray(payload.sport_types)) {
      updates.sport_types = null;
    } else {
      const allowed: SportType[] = [
        "running",
        "cycling",
        "swimming",
        "strength",
        "yoga",
        "football",
        "tennis",
        "other",
      ];
      updates.sport_types = payload.sport_types.filter(
        (entry): entry is SportType =>
          typeof entry === "string" && allowed.includes(entry as SportType),
      );
    }
  }

  if (
    updates.activity_level === "sedentary" ||
    updates.activity_level === null
  ) {
    updates.sport_types = [];
  }

  return updates;
}
