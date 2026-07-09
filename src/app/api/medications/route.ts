import {
  normalizeMedicationTimes,
  parseStoredMedication,
} from "@/lib/medication-schedule";
import {
  buildMedicationInsertRecord,
  formatSupabaseError,
  getMedicationAuthContext,
} from "@/lib/medications-api";
import type { MedicationTimeEntry } from "@/types/medication";

export const runtime = "nodejs";

type MedicationPayload = {
  name?: unknown;
  dosage?: unknown;
  times?: unknown;
};

export async function GET() {
  try {
    const { supabase, user, authError } = await getMedicationAuthContext();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("medications")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    console.log("Medication list data:", data);
    console.log("Medication list error:", error);

    if (error) {
      return Response.json(
        { error: formatSupabaseError(error), code: error.code },
        { status: 500 },
      );
    }

    return Response.json({
      medications: (data ?? []).map(parseStoredMedication),
    });
  } catch (error) {
    console.error("Medications load failed", error);

    return Response.json(
      { error: "Medikamente konnten gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as MedicationPayload;
    const name = normalizeName(payload.name);
    const dosage = normalizeDosage(payload.dosage);
    const times = normalizeMedicationTimes(payload.times);

    if (times.length === 0) {
      return Response.json(
        { error: "Bitte wählen Sie mindestens eine Einnahmezeit." },
        { status: 400 },
      );
    }

    const { supabase, user, authError } = await getMedicationAuthContext();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const insertRecord = buildMedicationInsertRecord(user.id, {
      name,
      dosage,
      times,
    });

    console.log("Medication save insert:", insertRecord);

    const { data, error } = await supabase
      .from("medications")
      .insert(insertRecord)
      .select("*")
      .single();

    console.log("Medication save error:", error);
    console.log("Medication save data:", data);

    if (error) {
      return Response.json(
        {
          error: formatSupabaseError(error),
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 },
      );
    }

    return Response.json({ medication: parseStoredMedication(data) });
  } catch (error) {
    console.error("Medication create failed", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Medikament konnte gerade nicht gespeichert werden.",
      },
      { status: 500 },
    );
  }
}

function normalizeName(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Bitte geben Sie den Namen des Medikaments ein.");
  }

  return value.trim();
}

function normalizeDosage(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Bitte geben Sie die Dosierung ein.");
  }

  return value.trim();
}

export function validateMedicationTimes(times: MedicationTimeEntry[]) {
  if (times.length === 0) {
    throw new Error("Bitte wählen Sie mindestens eine Einnahmezeit.");
  }
}
