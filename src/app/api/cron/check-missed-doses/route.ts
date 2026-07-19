import { createSupabaseDataClient } from "@/lib/supabase-data";
import {
  getDoseSlotLabel,
  getFamilyMemberRecipients,
  getProfileFirstName,
  logNotificationSent,
  sendMedicationMissedAlert,
  wasNotificationSentToday,
} from "@/lib/notifications";
import {
  expandMedicationsToDailyDoses,
  findConfirmationForDose,
  formatMedicationConfirmationName,
  getScheduledAtForTime,
  isDoseMissed,
  normalizeMedicationTimes,
  parseStoredMedication,
} from "@/lib/medication-schedule";
import type { MedicationTimeSlot } from "@/types/medication";

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
    const { data: medications, error: medicationsError } = await supabase
      .from("medications")
      .select("*")
      .eq("is_active", true);

    if (medicationsError) throw medicationsError;

    const patientIds = [
      ...new Set((medications ?? []).map((medication) => medication.user_id)),
    ];

    let emailsSent = 0;

    for (const patientId of patientIds) {
      const patientMedications = (medications ?? [])
        .filter((medication) => medication.user_id === patientId)
        .map(parseStoredMedication);
      const confirmations = await loadTodayConfirmations(supabase, patientId);
      const patientName = await getProfileFirstName(supabase, patientId);
      const recipients = await getFamilyMemberRecipients(
        supabase,
        patientId,
        "medications",
      );

      if (recipients.length === 0) continue;

      for (const medication of patientMedications) {
        for (const entry of normalizeMedicationTimes(medication.times)) {
          const scheduledAt = getScheduledAtForTime(entry.time);
          if (!isDoseMissed(scheduledAt)) continue;

          const dose = expandMedicationsToDailyDoses([medication]).find(
            (item) => item.slot === entry.slot && item.time === entry.time,
          );

          if (!dose) continue;

          const confirmation = findConfirmationForDose(confirmations, dose);
          if (confirmation?.confirmed_at) continue;

          const dedupeKey = `${medication.id}:${entry.slot}:${scheduledAt.toISOString()}`;

          for (const recipient of recipients) {
            const alreadySent = await wasNotificationSentToday(supabase, {
              patientId,
              recipientEmail: recipient.email,
              notificationType: "medication_missed",
              dedupeKey,
            });

            if (alreadySent) continue;

            const result = await sendMedicationMissedAlert({
              familyMemberName: recipient.firstName,
              familyEmail: recipient.email,
              patientName,
              doseSlotLabel: getDoseSlotLabel(entry.slot),
              medicationName: formatMedicationConfirmationName(
                medication.name,
                medication.dosage,
              ),
              scheduledTime: entry.time,
            });

            if (!result.sent) continue;

            await logNotificationSent(supabase, {
              patientId,
              recipientEmail: recipient.email,
              notificationType: "medication_missed",
              dedupeKey,
            });

            emailsSent += 1;
          }
        }
      }
    }

    return Response.json({ checkedPatients: patientIds.length, emailsSent });
  } catch (error) {
    console.error("Missed dose cron failed", error);

    return Response.json({ error: "Missed dose check failed." }, { status: 500 });
  }
}

async function loadTodayConfirmations(
  supabase: NonNullable<ReturnType<typeof createSupabaseDataClient>>,
  patientId: string,
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data, error } = await supabase
    .from("medication_confirmations")
    .select(
      "id, medication_id, dose_time, medication_name, scheduled_at, confirmed_at, missed",
    )
    .eq("user_id", patientId)
    .gte("scheduled_at", start.toISOString())
    .lt("scheduled_at", end.toISOString());

  if (error) throw error;
  return data ?? [];
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
