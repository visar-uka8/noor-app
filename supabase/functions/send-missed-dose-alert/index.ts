import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

type MissedDoseAlertPayload = {
  patient_id?: string;
  patient_name?: string;
  medication_name?: string;
  dose_time?: "morning" | "midday" | "evening";
  scheduled_time?: string;
  family_emails?: string[];
  family_email?: string;
  family_member_name?: string;
};

const doseLabels = {
  morning: "Morgens",
  midday: "Mittags",
  evening: "Abends",
};

serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = (await request.json()) as MissedDoseAlertPayload;
    const {
      patient_id,
      patient_name,
      medication_name,
      dose_time,
      scheduled_time,
      family_emails,
      family_email,
      family_member_name,
    } = payload;

    if (!patient_id || !patient_name || !medication_name || !dose_time || !scheduled_time) {
      return json({ error: "Missing required fields" }, 400);
    }

    const recipients = [
      ...(family_emails ?? []),
      ...(family_email ? [family_email] : []),
    ].filter(Boolean);

    if (recipients.length === 0) {
      return json({ sent: false, reason: "No family emails configured" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Supabase secrets are not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const uniqueRecipients = [...new Set(recipients)];
    let sentCount = 0;

    for (const recipient of uniqueRecipients) {
      const sent = await sendMissedDoseEmail({
        patient_id,
        patient_name,
        medication_name,
        dose_time,
        scheduled_time,
        family_email: recipient,
        family_member_name: family_member_name ?? "Familie",
        supabase,
      });

      if (sent) sentCount += 1;
    }

    return json({ sent: sentCount > 0, sentCount });
  } catch (error) {
    console.error("send-missed-dose-alert failed", error);

    return json({ error: "Missed dose alert could not be sent" }, 500);
  }
});

async function sendMissedDoseEmail(input: {
  patient_id: string;
  patient_name: string;
  medication_name: string;
  dose_time: "morning" | "midday" | "evening";
  scheduled_time: string;
  family_email: string;
  family_member_name: string;
  supabase: ReturnType<typeof createClient>;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail =
    Deno.env.get("RESEND_FROM_EMAIL") ?? "Noor <benachrichtigungen@noorhealth.de>";

  if (!resendApiKey) {
    console.warn("RESEND_API_KEY is not configured.");
    return false;
  }

  const dedupeKey = `${input.medication_name}:${input.dose_time}:${input.scheduled_time}`;
  const { start, end } = getTodayRange();
  const { data: alreadySent, error: dedupeError } = await input.supabase
    .from("email_notifications_log")
    .select("id")
    .eq("patient_id", input.patient_id)
    .eq("recipient_email", input.family_email)
    .eq("notification_type", "medication_missed")
    .eq("dedupe_key", dedupeKey)
    .gte("sent_at", start.toISOString())
    .lt("sent_at", end.toISOString())
    .maybeSingle();

  if (dedupeError) {
    const legacy = await input.supabase
      .from("notifications_sent")
      .select("id")
      .eq("patient_id", input.patient_id)
      .eq("family_email", input.family_email)
      .eq("medication_name", input.medication_name)
      .eq("dose_time", input.dose_time)
      .gte("sent_at", start.toISOString())
      .lt("sent_at", end.toISOString())
      .maybeSingle();

    if (legacy.data) return false;
  } else if (alreadySent) {
    return false;
  }

  const doseSlotLabel = doseLabels[input.dose_time];
  const subject = `⚠️ ${input.patient_name} hat eine Dosis noch nicht bestätigt`;
  const text = `Hallo ${input.family_member_name},

${input.patient_name} hat die ${doseSlotLabel}-Dosis noch nicht bestätigt:
💊 ${input.medication_name} — fällig um ${input.scheduled_time} Uhr

Es könnte sich lohnen kurz anzurufen.

— Noor`;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: input.family_email,
      subject,
      text,
    }),
  });

  if (!resendResponse.ok) {
    const details = await resendResponse.text();
    throw new Error(`Resend failed: ${details}`);
  }

  const { error } = await input.supabase.from("email_notifications_log").insert({
    patient_id: input.patient_id,
    recipient_email: input.family_email,
    notification_type: "medication_missed",
    dedupe_key: dedupeKey,
    sent_at: new Date().toISOString(),
  });

  if (error) {
    await input.supabase.from("notifications_sent").insert({
      patient_id: input.patient_id,
      family_email: input.family_email,
      medication_name: input.medication_name,
      dose_time: input.dose_time,
      sent_at: new Date().toISOString(),
    });
  }

  return true;
}

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
