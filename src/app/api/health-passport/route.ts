import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  isMissingConditionsColumnError,
  isMissingVaccinationsColumnError,
} from "@/lib/health-passport-db";
import {
  loadHealthPassportForUser,
  normalizeStoredConditions,
} from "@/lib/health-passport-load";
import { toPassportMedications, normalizePassportMedications } from "@/lib/health-passport-medications";
import { loadActiveMedications } from "@/lib/medication-data";
import {
  bloodTypes,
  createEmptyPassport,
  type BloodType,
  type HealthPassportData,
  type MedicationFrequency,
} from "@/types/health-passport";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const passport = await loadHealthPassportForUser(user.id, supabase);

    if (passport) {
      return Response.json({ passport });
    }

    const medicationsForPassport = await resolvePassportMedications(
      user.id,
      supabase,
      [],
    );

    return Response.json({
      passport: {
        ...createEmptyPassport(user.id),
        medications: medicationsForPassport,
      },
    });
  } catch (error) {
    console.error("Health passport load failed", error);

    return Response.json(
      { error: "Gesundheitspass konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as HealthPassportData;
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const passport = {
      ...normalizePassport(payload, user.id),
      medications: await resolvePassportMedications(user.id, supabase, []),
    };

    let record: Record<string, unknown> = {
      user_id: user.id,
      personal: passport.personal,
      medications: passport.medications,
      allergies: passport.allergies,
      conditions: passport.conditions.map(({ id: _id, ...condition }) => condition),
      vaccinations: passport.vaccinations,
      surgeries: passport.surgeries,
      emergency_contact: passport.emergencyContact,
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from("health_passports")
      .upsert(record, { onConflict: "user_id" });

    if (error && isMissingConditionsColumnError(error)) {
      console.warn(
        "health_passports.conditions column missing — saving without conditions. Run supabase/migration_health_passport_conditions.sql",
      );

      const { conditions: _conditions, ...recordWithoutConditions } = record;
      record = recordWithoutConditions;
      ({ error } = await supabase
        .from("health_passports")
        .upsert(record, { onConflict: "user_id" }));
    }

    if (error && isMissingVaccinationsColumnError(error)) {
      console.warn(
        "health_passports.vaccinations column missing — saving without vaccinations. Run supabase/migration_health_passport_vaccinations.sql",
      );

      const { vaccinations: _vaccinations, ...recordWithoutVaccinations } = record;
      record = recordWithoutVaccinations;
      ({ error } = await supabase
        .from("health_passports")
        .upsert(record, { onConflict: "user_id" }));
    }

    if (error) {
      console.error("Health passport save error:", error);
      throw error;
    }

    return Response.json({ stored: true, passport });
  } catch (error) {
    console.error("Health passport save failed", error);

    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Gesundheitspass konnte gerade nicht gespeichert werden.";

    return Response.json({ error: message }, { status: 500 });
  }
}

async function resolvePassportMedications(
  userId: string,
  supabase: SupabaseClient,
  fallback: HealthPassportData["medications"],
) {
  try {
    const medications = await loadActiveMedications(userId, supabase);
    return toPassportMedications(medications);
  } catch (error) {
    console.error("Passport medication sync failed:", error);
    return fallback;
  }
}

function normalizePassport(payload: HealthPassportData, userId: string) {
  if (!payload.personal?.fullName?.trim()) {
    throw new Error("Full name is required.");
  }

  return {
    userId,
    personal: {
      fullName: payload.personal.fullName.trim(),
      dateOfBirth: payload.personal.dateOfBirth ?? "",
      bloodType: normalizeBloodType(payload.personal.bloodType),
      insuranceName: payload.personal.insuranceName?.trim() ?? "",
      insuranceNumber: payload.personal.insuranceNumber?.trim() ?? "",
      familyDoctorName: payload.personal.familyDoctorName?.trim() ?? "",
      familyDoctorPhone: payload.personal.familyDoctorPhone?.trim() ?? "",
    },
    medications: (payload.medications ?? []).map((medication) => ({
      id: medication.id,
      name: medication.name?.trim() ?? "",
      dose: medication.dose?.trim() ?? "",
      frequency: normalizeFrequency(medication.frequency),
    })),
    allergies: (payload.allergies ?? []).map((allergy) => ({
      id: allergy.id,
      allergen: allergy.allergen?.trim() ?? "",
      reaction: allergy.reaction?.trim() ?? "",
    })),
    conditions: normalizeStoredConditions(payload.conditions),
    vaccinations: (payload.vaccinations ?? []).map((vaccination) => ({
      id: vaccination.id,
      name: vaccination.name?.trim() ?? "",
      date: vaccination.date ?? "",
      next_due: vaccination.next_due ?? "",
    })),
    surgeries: (payload.surgeries ?? []).map((surgery) => ({
      id: surgery.id,
      name: surgery.name?.trim() ?? "",
      year: surgery.year?.trim() ?? "",
      hospital: surgery.hospital?.trim() ?? "",
    })),
    emergencyContact: {
      name: payload.emergencyContact?.name?.trim() ?? "",
      relationship: payload.emergencyContact?.relationship?.trim() ?? "",
      phone: payload.emergencyContact?.phone?.trim() ?? "",
    },
  } satisfies HealthPassportData;
}

function normalizeBloodType(value: unknown): BloodType {
  if (
    typeof value === "string" &&
    bloodTypes.includes(value as BloodType)
  ) {
    return value as BloodType;
  }

  return "Unbekannt";
}

function normalizeFrequency(value: unknown): MedicationFrequency[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (entry): entry is MedicationFrequency =>
      entry === "morning" || entry === "midday" || entry === "evening",
  );
}

function createSupabaseDataClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createAdminClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}
