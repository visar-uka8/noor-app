import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  bloodTypes,
  createEmptyPassport,
  type BloodType,
  type HealthPassportData,
  type MedicationFrequency,
} from "@/types/health-passport";

export const runtime = "nodejs";

type StoredPassport = {
  user_id: string;
  personal: HealthPassportData["personal"];
  medications: HealthPassportData["medications"];
  allergies: HealthPassportData["allergies"];
  surgeries: HealthPassportData["surgeries"];
  emergency_contact: HealthPassportData["emergencyContact"];
};

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
    const { data, error } = await supabase
      .from("health_passports")
      .select("user_id, personal, medications, allergies, surgeries, emergency_contact")
      .eq("user_id", user.id)
      .maybeSingle<StoredPassport>();

    if (error) throw error;

    return Response.json({
      passport: data
        ? {
            userId: data.user_id,
            personal: data.personal,
            medications: data.medications,
            allergies: data.allergies,
            surgeries: data.surgeries,
            emergencyContact: data.emergency_contact,
          }
        : createEmptyPassport(user.id),
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

    const passport = normalizePassport(payload, user.id);
    const record = {
      user_id: user.id,
      personal: passport.personal,
      medications: passport.medications,
      allergies: passport.allergies,
      surgeries: passport.surgeries,
      emergency_contact: passport.emergencyContact,
      updated_at: new Date().toISOString(),
    };

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { error } = await supabase
      .from("health_passports")
      .upsert(record, { onConflict: "user_id" });

    if (error) throw error;

    return Response.json({ stored: true, passport });
  } catch (error) {
    console.error("Health passport save failed", error);

    return Response.json(
      { error: "Gesundheitspass konnte gerade nicht gespeichert werden." },
      { status: 500 },
    );
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
