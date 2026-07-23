import { createSupabaseDataClient } from "@/lib/supabase-data";
import {
  getFamilyMemberRecipients,
  getProfileFirstName,
  logNotificationSent,
  sendMorningMedicationSummaryAlert,
  wasNotificationSentToday,
} from "@/lib/notifications";

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
    const { start, end } = getTodayRange();
    const { data: confirmations, error } = await supabase
      .from("medication_confirmations")
      .select(
        "user_id, medication_name, confirmed_at, dose_time",
      )
      .eq("dose_time", "morning")
      .not("confirmed_at", "is", null)
      .gte("scheduled_at", start.toISOString())
      .lt("scheduled_at", end.toISOString());

    if (error) throw error;

    const grouped = new Map<
      string,
      Array<{ medicationName: string; confirmedAt: string }>
    >();

    for (const row of confirmations ?? []) {
      if (!row.confirmed_at) continue;
      const existing = grouped.get(row.user_id) ?? [];
      existing.push({
        medicationName: row.medication_name,
        confirmedAt: row.confirmed_at,
      });
      grouped.set(row.user_id, existing);
    }

    let emailsSent = 0;

    for (const [patientId, patientConfirmations] of grouped) {
      const patientName = await getProfileFirstName(supabase, patientId);
      const recipients = await getFamilyMemberRecipients(
        supabase,
        patientId,
        "medications",
      );

      for (const recipient of recipients) {
        const dedupeKey = "morning-summary";
        const alreadySent = await wasNotificationSentToday(supabase, {
          patientId,
          recipientEmail: recipient.email,
          notificationType: "medication_confirmed_summary",
          dedupeKey,
        });

        if (alreadySent) continue;

        const result = await sendMorningMedicationSummaryAlert({
          familyMemberName: recipient.firstName,
          familyEmail: recipient.email,
          patientName,
          confirmations: patientConfirmations,
          language: recipient.language,
        });

        if (!result.sent) continue;

        await logNotificationSent(supabase, {
          patientId,
          recipientEmail: recipient.email,
          notificationType: "medication_confirmed_summary",
          dedupeKey,
        });

        emailsSent += 1;
      }
    }

    return Response.json({
      patientsWithMorningConfirmations: grouped.size,
      emailsSent,
    });
  } catch (error) {
    console.error("Morning medication summary cron failed", error);

    return Response.json(
      { error: "Morning medication summary failed." },
      { status: 500 },
    );
  }
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
