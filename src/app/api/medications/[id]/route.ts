import {
  determineFrequency,
  normalizeMedicationTimes,
  parseStoredMedication,
} from "@/lib/medication-schedule";
import {
  formatSupabaseError,
  getMedicationAuthContext,
  normalizeInsulinType,
} from "@/lib/medications-api";
import type { InsulinType } from "@/types/medication";

export const runtime = "nodejs";

type MedicationPayload = {
  name?: unknown;
  dosage?: unknown;
  times?: unknown;
  is_insulin?: unknown;
  insulin_type?: unknown;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { supabase, user, authError } = await getMedicationAuthContext();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("medications")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return Response.json(
        { error: formatSupabaseError(error), code: error.code },
        { status: 500 },
      );
    }

    if (!data) {
      return Response.json({ error: "Medikament nicht gefunden." }, { status: 404 });
    }

    return Response.json({ medication: parseStoredMedication(data) });
  } catch (error) {
    console.error("Medication load failed", error);

    return Response.json(
      { error: "Medikament konnte gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as MedicationPayload;
    const { supabase, user, authError } = await getMedicationAuthContext();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.name !== undefined) {
      if (typeof payload.name !== "string" || payload.name.trim().length === 0) {
        return Response.json(
          { error: "Bitte geben Sie den Namen des Medikaments ein." },
          { status: 400 },
        );
      }
      updates.name = payload.name.trim();
    }

    const isInsulin =
      payload.is_insulin === true
        ? true
        : payload.is_insulin === false
          ? false
          : undefined;
    const insulinType =
      payload.insulin_type !== undefined
        ? normalizeInsulinType(payload.insulin_type)
        : undefined;

    if (payload.dosage !== undefined) {
      updates.dosage = normalizeDosage(payload.dosage, {
        isInsulin: isInsulin ?? insulinType != null,
        insulinType: insulinType ?? null,
      });
    }

    if (payload.times !== undefined) {
      const times = normalizeMedicationTimes(payload.times);
      if (times.length === 0) {
        return Response.json(
          { error: "Bitte wählen Sie mindestens eine Einnahmezeit." },
          { status: 400 },
        );
      }
      updates.times = times;
      updates.frequency = determineFrequency(times.length);
    }

    if (isInsulin !== undefined) {
      updates.is_insulin = isInsulin;
      updates.insulin_type = isInsulin ? insulinType ?? null : null;
    } else if (insulinType !== undefined) {
      updates.insulin_type = insulinType;
    }

    if (isInsulin && insulinType === null) {
      return Response.json(
        { error: "Bitte wählen Sie die Insulinart." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("medications")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .select("*")
      .maybeSingle();

    if (error) {
      return Response.json(
        { error: formatSupabaseError(error), code: error.code },
        { status: 500 },
      );
    }

    if (!data) {
      return Response.json({ error: "Medikament nicht gefunden." }, { status: 404 });
    }

    return Response.json({ medication: parseStoredMedication(data) });
  } catch (error) {
    console.error("Medication update failed", error);

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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { supabase, user, authError } = await getMedicationAuthContext();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("medications")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .select("id")
      .maybeSingle();

    if (error) {
      return Response.json(
        { error: formatSupabaseError(error), code: error.code },
        { status: 500 },
      );
    }

    if (!data) {
      return Response.json({ error: "Medikament nicht gefunden." }, { status: 404 });
    }

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Medication delete failed", error);

    return Response.json(
      { error: "Medikament konnte gerade nicht entfernt werden." },
      { status: 500 },
    );
  }
}

function normalizeDosage(
  value: unknown,
  options: { isInsulin: boolean; insulinType: InsulinType | null },
) {
  if (
    options.isInsulin &&
    options.insulinType === "mahlzeit" &&
    (value === undefined || (typeof value === "string" && value.trim().length === 0))
  ) {
    return "variabel";
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Bitte geben Sie die Dosierung ein.");
  }

  return value.trim();
}
