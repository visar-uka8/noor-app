import { createClient } from "@supabase/supabase-js";
import type { AppointmentPayload } from "@/types/appointments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const appointment = (await request.json()) as AppointmentPayload;

    if (
      !appointment.patient_id ||
      !appointment.doctor_name ||
      !appointment.doctor_specialization ||
      !appointment.scheduled_at
    ) {
      return Response.json(
        { error: "Termindaten sind unvollständig." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    if (!supabase) {
      return Response.json({
        stored: false,
        reason: "Supabase ist lokal noch nicht konfiguriert.",
        appointment,
      });
    }

    const { error } = await supabase.from("appointments").insert(appointment);

    if (error) throw error;

    return Response.json({ stored: true, appointment });
  } catch (error) {
    console.error("Appointment creation failed", error);

    return Response.json(
      { error: "Termin konnte gerade nicht gespeichert werden." },
      { status: 500 },
    );
  }
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}
