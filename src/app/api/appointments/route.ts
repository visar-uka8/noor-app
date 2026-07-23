import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import {
  createAppointmentForUser,
  formatAppointmentsSetupError,
  listAppointmentsForUser,
} from "@/lib/appointments-data";
import type { AppointmentCreateInput } from "@/types/appointments";

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
    const appointments = await listAppointmentsForUser(supabase, user.id);
    return Response.json({ appointments });
  } catch (error) {
    console.error("Appointments load failed", error);
    return Response.json(
      { error: formatAppointmentsSetupError(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const payload = (await request.json()) as AppointmentCreateInput;

    if (!payload.doctor_name?.trim() || !payload.scheduled_at?.trim()) {
      return Response.json(
        { error: "Bitte Arztname, Datum und Uhrzeit angeben." },
        { status: 400 },
      );
    }

    const scheduledAt = new Date(payload.scheduled_at);
    if (Number.isNaN(scheduledAt.getTime())) {
      return Response.json({ error: "Ungültiges Datum." }, { status: 400 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const appointment = await createAppointmentForUser(supabase, user.id, {
      doctor_name: payload.doctor_name,
      scheduled_at: scheduledAt.toISOString(),
      reason: payload.reason ?? null,
    });

    return Response.json({ appointment });
  } catch (error) {
    console.error("Appointment creation failed", error);
    return Response.json(
      { error: formatAppointmentsSetupError(error) },
      { status: 500 },
    );
  }
}
