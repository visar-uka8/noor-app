import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { loadActiveMedications } from "@/lib/medication-data";
import { generateAppointmentPreparation } from "@/lib/appointment-preparation";
import {
  deleteAppointmentForUser,
  formatAppointmentsSetupError,
  getAppointmentForUser,
  saveAppointmentPreparation,
  updateAppointmentForUser,
} from "@/lib/appointments-data";
import type { AppointmentUpdateInput } from "@/types/appointments";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const payload = (await request.json()) as AppointmentUpdateInput;
    const appointment = await updateAppointmentForUser(
      supabase,
      user.id,
      id,
      {
        ...payload,
        status:
          payload.notes !== undefined && payload.notes?.trim()
            ? "completed"
            : payload.status,
      },
    );

    return Response.json({ appointment });
  } catch (error) {
    console.error("Appointment update failed", error);
    return Response.json(
      { error: formatAppointmentsSetupError(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    await deleteAppointmentForUser(supabase, user.id, id);
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Appointment delete failed", error);
    return Response.json(
      { error: formatAppointmentsSetupError(error) },
      { status: 500 },
    );
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const appointment = await getAppointmentForUser(supabase, user.id, id);
    if (!appointment) {
      return Response.json({ error: "Termin nicht gefunden." }, { status: 404 });
    }

    const medications = await loadActiveMedications(
      appointment.user_id,
      supabase,
    );
    const preparation = await generateAppointmentPreparation({
      appointment,
      supabase,
      medications: medications.map((med) => `${med.name} ${med.dosage}`.trim()),
    });

    if (preparation.generated) {
      await saveAppointmentPreparation(
        supabase,
        appointment.id,
        preparation.text,
      );
    }

    return Response.json({
      appointment: {
        ...appointment,
        preparation_text: preparation.text,
      },
      preparation: preparation.text,
    });
  } catch (error) {
    console.error("Appointment preparation failed", error);
    return Response.json(
      { error: formatAppointmentsSetupError(error) },
      { status: 500 },
    );
  }
}
