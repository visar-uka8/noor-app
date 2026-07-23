import { normalizeAppLanguage } from "@/lib/i18n/languages";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { loadActiveMedications } from "@/lib/medication-data";
import { generateAppointmentPreparation } from "@/lib/appointment-preparation";
import {
  listAppointmentsNeedingReminder,
  markAppointmentReminderSent,
  saveAppointmentPreparation,
} from "@/lib/appointments-data";
import { isNotificationEnabled } from "@/lib/notification-preferences";
import {
  getProfileFirstName,
  getUserEmail,
  sendAppointmentReminderAlert,
} from "@/lib/notifications";
import { formatAppointmentDateTime } from "@/types/appointments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseDataClient();
  if (!supabase) {
    return Response.json(
      { error: "Supabase service role is not configured." },
      { status: 500 },
    );
  }

  try {
    const appointments = await listAppointmentsNeedingReminder(supabase);
    let emailsSent = 0;

    for (const appointment of appointments) {
      const email = await getUserEmail(supabase, appointment.user_id);
      if (!email) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, notification_preferences, language")
        .eq("id", appointment.user_id)
        .maybeSingle<{
          first_name: string | null;
          notification_preferences: Record<string, unknown> | null;
          language: string | null;
        }>();

      if (
        !isNotificationEnabled(
          profile?.notification_preferences,
          "appointments",
        )
      ) {
        continue;
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

      const firstName = profile?.first_name?.trim() || "Sie";
      const result = await sendAppointmentReminderAlert({
        email,
        firstName,
        doctorName: appointment.doctor_name,
        appointmentWhen: formatAppointmentDateTime(appointment.scheduled_at),
        preparationText: preparation.text,
        appointmentId: appointment.id,
        language: normalizeAppLanguage(profile?.language),
      });

      if (result.sent) {
        await markAppointmentReminderSent(supabase, appointment.id);
        emailsSent += 1;
      }
    }

    return Response.json({
      checked: appointments.length,
      emailsSent,
    });
  } catch (error) {
    console.error("Appointment reminder cron failed", error);
    return Response.json(
      { error: "Appointment reminder cron failed." },
      { status: 500 },
    );
  }
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
