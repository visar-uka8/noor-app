import { createSupabaseDataClient } from "@/lib/supabase-data";
import {
  FAMILY_MISSED_ALERT_MINUTES,
  PATIENT_MISSED_REMINDER_MINUTES,
} from "@/lib/medication-notification-timing";
import {
  getDoseSlotLabel,
  getFamilyMemberRecipients,
  getPatientMedicationRecipient,
  getProfileFirstName,
  logNotificationSent,
  sendMedicationMissedAlert,
  sendMedicationMissedPatientReminder,
  wasNotificationSentToday,
} from "@/lib/notifications";
import {
  expandMedicationsToDailyDoses,
  findConfirmationForDose,
  formatMedicationConfirmationName,
  getScheduledAtForTime,
  isDoseOverdueBy,
  normalizeMedicationTimes,
  parseStoredMedication,
} from "@/lib/medication-schedule";

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

    let patientEmailsSent = 0;
    let familyEmailsSent = 0;

    for (const patientId of patientIds) {
      const patientMedications = (medications ?? [])
        .filter((medication) => medication.user_id === patientId)
        .map(parseStoredMedication);
      const confirmations = await loadTodayConfirmations(supabase, patientId);
      const patientName = await getProfileFirstName(supabase, patientId);
      const patientRecipient = await getPatientMedicationRecipient(
        supabase,
        patientId,
      );
      const familyRecipients = await getFamilyMemberRecipients(
        supabase,
        patientId,
        "medications",
      );

      for (const medication of patientMedications) {
        for (const entry of normalizeMedicationTimes(medication.times)) {
          const scheduledAt = getScheduledAtForTime(entry.time);

          const dose = expandMedicationsToDailyDoses([medication]).find(
            (item) => item.slot === entry.slot && item.time === entry.time,
          );

          if (!dose) continue;

          const confirmation = findConfirmationForDose(confirmations, dose);
          if (confirmation?.confirmed_at) continue;

          const dedupeKey = `${medication.id}:${entry.slot}:${scheduledAt.toISOString()}`;

          if (
            patientRecipient &&
            isDoseOverdueBy(entry.time, PATIENT_MISSED_REMINDER_MINUTES)
          ) {
            const alreadySent = await wasNotificationSentToday(supabase, {
              patientId,
              recipientEmail: patientRecipient.email,
              notificationType: "medication_missed_patient",
              dedupeKey,
            });

            if (!alreadySent) {
              const result = await sendMedicationMissedPatientReminder({
                patientName: patientRecipient.firstName,
                patientEmail: patientRecipient.email,
                doseSlotLabel: getDoseSlotLabel(entry.slot),
                medicationName: formatMedicationConfirmationName(
                  medication.name,
                  medication.dosage,
                ),
                scheduledTime: entry.time,
              });

              if (result.sent) {
                await logNotificationSent(supabase, {
                  patientId,
                  recipientEmail: patientRecipient.email,
                  notificationType: "medication_missed_patient",
                  dedupeKey,
                });
                patientEmailsSent += 1;
              }
            }
          }

          if (
            familyRecipients.length > 0 &&
            isDoseOverdueBy(entry.time, FAMILY_MISSED_ALERT_MINUTES)
          ) {
            await ensureMissedConfirmation(
              supabase,
              patientId,
              medication.id,
              entry.slot,
              formatMedicationConfirmationName(
                medication.name,
                medication.dosage,
              ),
              scheduledAt,
              confirmations,
            );

            for (const recipient of familyRecipients) {
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

              familyEmailsSent += 1;
            }
          }
        }
      }
    }

    return Response.json({
      checkedPatients: patientIds.length,
      patientEmailsSent,
      familyEmailsSent,
    });
  } catch (error) {
    console.error("Missed dose cron failed", error);

    return Response.json({ error: "Missed dose check failed." }, { status: 500 });
  }
}

async function ensureMissedConfirmation(
  supabase: NonNullable<ReturnType<typeof createSupabaseDataClient>>,
  patientId: string,
  medicationId: string,
  doseTime: string,
  medicationName: string,
  scheduledAt: Date,
  confirmations: Awaited<ReturnType<typeof loadTodayConfirmations>>,
) {
  const existing = confirmations.find(
    (item) =>
      item.medication_id === medicationId &&
      item.dose_time === doseTime &&
      new Date(item.scheduled_at).getTime() === scheduledAt.getTime(),
  );

  if (existing) {
    if (!existing.missed) {
      await supabase
        .from("medication_confirmations")
        .update({ missed: true })
        .eq("id", existing.id);
    }
    return;
  }

  await supabase.from("medication_confirmations").insert({
    user_id: patientId,
    medication_id: medicationId,
    medication_name: medicationName,
    dose_time: doseTime,
    scheduled_at: scheduledAt.toISOString(),
    confirmed_at: null,
    missed: true,
  });
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
