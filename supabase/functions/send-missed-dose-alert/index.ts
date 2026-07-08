import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import webpush from "npm:web-push@3.6.7";

type MissedDoseAlertPayload = {
  patient_id?: string;
  patient_name?: string;
  patient_first_name?: string;
  caretaker_label?: string;
  medication_name?: string;
  dose_time?: "morning" | "midday" | "evening";
  scheduled_time?: string;
  family_email?: string;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const doseLabels = {
  morning: "morgendliche",
  midday: "mittägliche",
  evening: "abendliche",
};

const doseTimeLabels = {
  morning: "Morgen",
  midday: "Mittags",
  evening: "Abends",
};

const PUSH_DELAY_MS = 5 * 60 * 1000;

serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = (await request.json()) as MissedDoseAlertPayload;
    const {
      patient_id,
      patient_name,
      patient_first_name,
      caretaker_label,
      medication_name,
      dose_time,
      scheduled_time,
      family_email,
    } = payload;

    if (!patient_id || !medication_name || !dose_time || !scheduled_time) {
      return json({ error: "Missing required fields" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Supabase secrets are not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const displayFirstName = patient_first_name ?? patient_name ?? "Ihr Angehöriger";
    const displayCaretakerLabel = caretaker_label ?? "Mama";

    let emailSent = false;

    if (family_email && patient_name) {
      emailSent = await sendMissedDoseEmail({
        patient_id,
        patient_name,
        medication_name,
        dose_time,
        scheduled_time,
        family_email,
        supabase,
      });
    } else {
      console.info("No family email configured. Using push notifications only.");
    }

    const pushTask = sendDelayedPushNotifications({
      supabase,
      patient_id,
      patient_first_name: displayFirstName,
      caretaker_label: displayCaretakerLabel,
      medication_name,
      dose_time,
    });

    // @ts-expect-error EdgeRuntime is provided by Supabase Edge Functions.
    EdgeRuntime.waitUntil(pushTask);

    return json({
      sent: emailSent,
      pushScheduled: true,
      pushDelayMinutes: PUSH_DELAY_MS / 60_000,
    });
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
  supabase: ReturnType<typeof createClient>;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail =
    Deno.env.get("RESEND_FROM_EMAIL") ?? "Noor <notifications@noor.health>";

  if (!resendApiKey) {
    return false;
  }

  const subject = `Noor: ${input.patient_name} hat ihre Medikamente noch nicht genommen`;
  const body = `Hallo,

${input.patient_name} hat die ${doseLabels[input.dose_time]} Dosis (${input.medication_name}) noch nicht bestätigt.

Die Dosis war um ${input.scheduled_time} Uhr geplant.

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
      text: body,
    }),
  });

  if (!resendResponse.ok) {
    const details = await resendResponse.text();
    throw new Error(`Resend failed: ${details}`);
  }

  const { error } = await input.supabase.from("notifications_sent").insert({
    patient_id: input.patient_id,
    family_email: input.family_email,
    medication_name: input.medication_name,
    dose_time: input.dose_time,
    sent_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }

  return true;
}

async function sendDelayedPushNotifications(input: {
  supabase: ReturnType<typeof createClient>;
  patient_id: string;
  patient_first_name: string;
  caretaker_label: string;
  medication_name: string;
  dose_time: "morning" | "midday" | "evening";
}) {
  await delay(PUSH_DELAY_MS);

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@noor.health";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("VAPID keys are not configured. Skipping push notifications.");
    return;
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const { data: familyLinks, error: linksError } = await input.supabase
    .from("family_links")
    .select("family_member_id")
    .eq("patient_id", input.patient_id)
    .eq("active", true);

  if (linksError) throw linksError;

  const familyMemberIds = (familyLinks ?? []).map(
    (link: { family_member_id: string }) => link.family_member_id,
  );

  if (familyMemberIds.length === 0) {
    return;
  }

  const { data: subscriptions, error: subscriptionsError } = await input.supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", familyMemberIds)
    .eq("missed_dose_enabled", true);

  if (subscriptionsError) throw subscriptionsError;

  const title = `Noor — ${input.caretaker_label}`;
  const body = `${input.patient_first_name} hat die ${doseTimeLabels[input.dose_time]}-Dosis noch nicht genommen. Vielleicht kurz anrufen? 💚`;
  const payload = JSON.stringify({
    title,
    body,
    url: "/dashboard",
  });

  await Promise.all(
    ((subscriptions ?? []) as PushSubscriptionRow[]).map(async (subscription) => {
      const alreadySent = await hasPushAlreadyBeenSent({
        supabase: input.supabase,
        patient_id: input.patient_id,
        family_member_id: subscription.user_id,
        medication_name: input.medication_name,
        dose_time: input.dose_time,
      });

      if (alreadySent) return;

      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        );

        await input.supabase.from("push_notifications_sent").insert({
          patient_id: input.patient_id,
          family_member_id: subscription.user_id,
          medication_name: input.medication_name,
          dose_time: input.dose_time,
          sent_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Push notification failed", subscription.endpoint, error);

        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof error.statusCode === "number"
            ? error.statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await input.supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
        }
      }
    }),
  );
}

async function hasPushAlreadyBeenSent(input: {
  supabase: ReturnType<typeof createClient>;
  patient_id: string;
  family_member_id: string;
  medication_name: string;
  dose_time: string;
}) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data, error } = await input.supabase
    .from("push_notifications_sent")
    .select("id")
    .eq("patient_id", input.patient_id)
    .eq("family_member_id", input.family_member_id)
    .eq("medication_name", input.medication_name)
    .eq("dose_time", input.dose_time)
    .gte("sent_at", start.toISOString())
    .lt("sent_at", end.toISOString())
    .maybeSingle();

  if (error) {
    console.error("Push dedupe check failed", error);
    return false;
  }

  return Boolean(data);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
