import {
  createEmptyPassport,
  type HealthPassportData,
} from "@/types/health-passport";

export const EMERGENCY_PASSPORT_CACHE_KEY = "noor-emergency-data";

export function cacheEmergencyPassport(passport: HealthPassportData | null) {
  if (typeof window === "undefined" || !passport) return;

  try {
    window.localStorage.setItem(
      EMERGENCY_PASSPORT_CACHE_KEY,
      JSON.stringify(passport),
    );
  } catch (error) {
    console.error("Failed to cache emergency passport:", error);
  }
}

export function readEmergencyPassportCache(): HealthPassportData | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = window.localStorage.getItem(EMERGENCY_PASSPORT_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as HealthPassportData;
    if (!parsed || typeof parsed !== "object" || !parsed.personal) {
      return null;
    }

    return {
      ...createEmptyPassport(parsed.userId ?? ""),
      ...parsed,
      personal: {
        ...createEmptyPassport().personal,
        ...parsed.personal,
      },
      medications: Array.isArray(parsed.medications) ? parsed.medications : [],
      allergies: Array.isArray(parsed.allergies) ? parsed.allergies : [],
      conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
      vaccinations: Array.isArray(parsed.vaccinations) ? parsed.vaccinations : [],
      surgeries: Array.isArray(parsed.surgeries) ? parsed.surgeries : [],
      emergencyContact: {
        ...createEmptyPassport().emergencyContact,
        ...parsed.emergencyContact,
      },
    };
  } catch (error) {
    console.error("Failed to read emergency passport cache:", error);
    return null;
  }
}

export function resolveEmergencyPassport(
  livePassport: HealthPassportData | null | undefined,
): HealthPassportData {
  const cached = readEmergencyPassportCache();
  if (cached) return cached;
  if (livePassport) return livePassport;
  return createEmptyPassport();
}
