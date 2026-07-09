import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const MISSED_GRACE_MINUTES = 90;

type MedicationRow = {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  times: Array<{ slot: string; time: string }> | string[];
  is_active: boolean;
};

type ConfirmationRow = {
  id: string;
  medication_id: string | null;
  dose_time: string;
  medication_name: string;
  scheduled_at: string;
  confirmed_at: string | null;
  missed: boolean;
};

type NotificationPreferences = {
  emailNotifications?: boolean;
  medications?: boolean;
  labResults?: boolean;
  family?: boolean;
};

serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Supabase secrets are not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: medications, error: medicationsError } = await supabase
      .from("medications")
      .select("id, user_id, name, dosage, times, is_active")
      .eq("is_active", true);

    if (medicationsError) throw medicationsError;

    const patientIds = [
      ...new Set((medications ?? []).map((medication: MedicationRow) => medication.user_id)),
    ];

    let alertsSent = 0;

    for (const patientId of patientIds) {
      const patientMedications = (medications ?? []).filter(
        (medication: MedicationRow) => medication.user_id === patientId,
      );
      const confirmations = await loadTodayConfirmations(supabase, patientId);
      const missedDoses = findMissedDoses(patientMedications, confirmations);

      if (missedDoses.length === 0) continue;

      const patientProfile = await loadPatientProfile(supabase, patientId);
      const familyEmails = await loadFamilyNotificationEmails(supabase, patientId);

      if (familyEmails.length === 0) continue;

      for (const dose of missedDoses) {
        await ensureMissedConfirmation(supabase, patientId, dose, confirmations);

        const response = await fetch(
          `${supabaseUrl}/functions/v1/send-missed-dose-alert`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              patient_id: patientId,
              patient_name: patientProfile.name,
              medication_name: dose.medication_name,
              dose_time: dose.dose_time,
              scheduled_time: dose.scheduled_time,
              family_emails: familyEmails,
            }),
          },
        );

        if (response.ok) {
          const result = await response.json();
          if (result.sentCount > 0) alertsSent += result.sentCount;
        }
      }
    }

    return json({ checkedPatients: patientIds.length, alertsSent });
  } catch (error) {
    console.error("check-missed-doses failed", error);
    return json({ error: "Missed dose check failed" }, 500);
  }
});

function findMissedDoses(
  medications: MedicationRow[],
  confirmations: ConfirmationRow[],
) {
  const missed: Array<{
    medication_id: string;
    medication_name: string;
    dose_time: "morning" | "midday" | "evening";
    scheduled_at: string;
    scheduled_time: string;
  }> = [];

  for (const medication of medications) {
    const times = normalizeMedicationTimes(medication.times);

    for (const entry of times) {
      const scheduledAt = getScheduledAtForTime(entry.time);
      if (!isDoseMissed(scheduledAt)) continue;

      const medicationName = `${medication.name.trim()} ${medication.dosage.trim()}`.trim();
      const confirmation = confirmations.find(
        (item) =>
          item.medication_id === medication.id &&
          item.dose_time === entry.slot &&
          new Date(item.scheduled_at).getTime() === scheduledAt.getTime(),
      );

      if (confirmation?.confirmed_at) continue;

      missed.push({
        medication_id: medication.id,
        medication_name: medicationName,
        dose_time: entry.slot,
        scheduled_at: scheduledAt.toISOString(),
        scheduled_time: formatTime(scheduledAt),
      });
    }
  }

  return missed;
}

async function ensureMissedConfirmation(
  supabase: ReturnType<typeof createClient>,
  patientId: string,
  dose: {
    medication_id: string;
    medication_name: string;
    dose_time: "morning" | "midday" | "evening";
    scheduled_at: string;
  },
  confirmations: ConfirmationRow[],
) {
  const existing = confirmations.find(
    (item) =>
      item.medication_id === dose.medication_id &&
      item.dose_time === dose.dose_time &&
      item.scheduled_at === dose.scheduled_at,
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
    medication_id: dose.medication_id,
    medication_name: dose.medication_name,
    dose_time: dose.dose_time,
    scheduled_at: dose.scheduled_at,
    confirmed_at: null,
    missed: true,
  });
}

async function loadTodayConfirmations(
  supabase: ReturnType<typeof createClient>,
  patientId: string,
) {
  const { start, end } = getTodayRange();
  const { data, error } = await supabase
    .from("medication_confirmations")
    .select(
      "id, medication_id, dose_time, medication_name, scheduled_at, confirmed_at, missed",
    )
    .eq("user_id", patientId)
    .gte("scheduled_at", start.toISOString())
    .lt("scheduled_at", end.toISOString());

  if (error) throw error;
  return (data ?? []) as ConfirmationRow[];
}

async function loadPatientProfile(
  supabase: ReturnType<typeof createClient>,
  patientId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", patientId)
    .maybeSingle();

  if (error) throw error;

  const firstName = data?.first_name?.trim() || "Patient";
  const lastName = data?.last_name?.trim() || "";
  return { name: `${firstName} ${lastName}`.trim() };
}

async function loadFamilyNotificationEmails(
  supabase: ReturnType<typeof createClient>,
  patientId: string,
) {
  const { data: familyLinks, error: linksError } = await supabase
    .from("family_links")
    .select("family_member_id")
    .eq("patient_id", patientId)
    .eq("active", true);

  if (linksError) throw linksError;

  const emails: string[] = [];

  for (const link of familyLinks ?? []) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", link.family_member_id)
      .maybeSingle<{ notification_preferences: NotificationPreferences | null }>();

    if (profileError) throw profileError;

    if (!isEmailNotificationsEnabled(profile?.notification_preferences)) {
      continue;
    }

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      link.family_member_id,
    );

    if (userError) {
      console.error("Family member email lookup failed", userError);
      continue;
    }

    const email = userData.user?.email?.trim();
    if (email) emails.push(email);
  }

  return [...new Set(emails)];
}

function isEmailNotificationsEnabled(preferences: NotificationPreferences | null | undefined) {
  if (!preferences) return true;
  if (typeof preferences.emailNotifications === "boolean") {
    return preferences.emailNotifications;
  }

  return true;
}

function normalizeMedicationTimes(value: MedicationRow["times"]) {
  if (!Array.isArray(value)) return [] as Array<{ slot: "morning" | "midday" | "evening"; time: string }>;

  const entries: Array<{ slot: "morning" | "midday" | "evening"; time: string }> = [];

  for (const item of value) {
    if (typeof item === "string") {
      const slot = inferSlotFromTime(item);
      if (slot) entries.push({ slot, time: item });
      continue;
    }

    if (
      item &&
      typeof item === "object" &&
      "slot" in item &&
      "time" in item &&
      typeof item.time === "string"
    ) {
      const slot = item.slot;
      if (slot === "morning" || slot === "midday" || slot === "evening") {
        entries.push({ slot, time: item.time });
      }
    }
  }

  return entries;
}

function inferSlotFromTime(timeValue: string) {
  const [hours] = timeValue.split(":").map(Number);
  if (hours < 11) return "morning" as const;
  if (hours < 17) return "midday" as const;
  return "evening" as const;
}

function getScheduledAtForTime(timeValue: string, baseDate = new Date()) {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const scheduledAt = new Date(baseDate);
  scheduledAt.setHours(hours, minutes, 0, 0);
  return scheduledAt;
}

function isDoseMissed(scheduledAt: Date) {
  const missedAfter = new Date(scheduledAt);
  missedAfter.setMinutes(missedAfter.getMinutes() + MISSED_GRACE_MINUTES);
  return Date.now() > missedAfter.getTime();
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
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
