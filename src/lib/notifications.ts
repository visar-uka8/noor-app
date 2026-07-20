import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  isNotificationEnabled,
  type NotificationPreferenceType,
} from "@/lib/notification-preferences";
import {
  paragraph,
  renderNoorEmailHtml,
  signature,
} from "@/lib/notifications/email-layout";
import { timeSlotLabels } from "@/types/medication";
import type { MedicationTimeSlot } from "@/types/medication";

const DEFAULT_FROM = "Noor <benachrichtigungen@noorhealth.de>";

export type MorningConfirmationItem = {
  medicationName: string;
  confirmedAt: string;
};

export type FamilyRecipient = {
  familyMemberId: string;
  email: string;
  firstName: string;
};

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getFromAddress() {
  return process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;
}

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "https://noorhealth.app"
  ).replace(/\/$/, "");
}

async function sendEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}) {
  const resend = getResendClient();
  if (!resend) {
    console.warn("RESEND_API_KEY is not configured — email skipped.");
    return { sent: false as const, reason: "missing_api_key" as const };
  }

  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  const uniqueRecipients = [...new Set(recipients.filter(Boolean))];

  if (uniqueRecipients.length === 0) {
    return { sent: false as const, reason: "no_recipients" as const };
  }

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: uniqueRecipients,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { sent: true as const, count: uniqueRecipients.length };
}

export async function sendFamilyConnectionAlert(
  patientEmail: string,
  patientName: string,
  familyMemberName: string,
) {
  const subject = "Neue Familienverbindung bei Noor";
  const text = `Hallo ${patientName},

${familyMemberName} hat sich gerade mit Ihrem Noor-Konto verbunden. Er kann jetzt Ihre Medikamentenbestätigungen und Laborwerte sehen.

Wenn Sie diese Verbindung nicht autorisiert haben, können Sie sie in der App unter Profil → Familienverbindungen trennen.

— Noor`;

  const html = renderNoorEmailHtml(
    [
      paragraph(`Hallo ${patientName},`),
      paragraph(
        `${familyMemberName} hat sich gerade mit Ihrem Noor-Konto verbunden. Er kann jetzt Ihre Medikamentenbestätigungen und Laborwerte sehen.`,
      ),
      paragraph(
        "Wenn Sie diese Verbindung nicht autorisiert haben, können Sie sie in der App unter Profil → Familienverbindungen trennen.",
      ),
      signature(),
    ].join(""),
    {
      label: "Familienverbindungen öffnen",
      href: `${getAppUrl()}/settings`,
    },
  );

  return sendEmail({ to: patientEmail, subject, html, text });
}

export async function sendMedicationConfirmedAlert(input: {
  familyMemberName: string;
  familyEmail: string;
  patientName: string;
  doseSlotLabel: string;
  medicationName: string;
  confirmedAt: string;
}) {
  const confirmedTime = formatGermanTime(input.confirmedAt);
  const subject = `✓ ${input.patientName} hat seine Medikamente genommen`;
  const text = `Hallo ${input.familyMemberName},

Gute Nachricht — ${input.patientName} hat gerade seine ${input.doseSlotLabel}-Dosis bestätigt:
💊 ${input.medicationName} — ${confirmedTime} Uhr ✓

Alles gut heute.

— Noor`;

  const html = renderNoorEmailHtml(
    [
      paragraph(`Hallo ${input.familyMemberName},`),
      paragraph(
        `Gute Nachricht — ${input.patientName} hat gerade seine ${input.doseSlotLabel}-Dosis bestätigt:`,
      ),
      paragraph(`💊 ${input.medicationName} — ${confirmedTime} Uhr ✓`),
      paragraph("Alles gut heute."),
      signature(),
    ].join(""),
  );

  return sendEmail({
    to: input.familyEmail,
    subject,
    html,
    text,
  });
}

export async function sendMorningMedicationSummaryAlert(input: {
  familyMemberName: string;
  familyEmail: string;
  patientName: string;
  confirmations: MorningConfirmationItem[];
}) {
  if (input.confirmations.length === 0) {
    return { sent: false as const, reason: "empty_summary" as const };
  }

  const lines = input.confirmations.map((item) => {
    const time = formatGermanTime(item.confirmedAt);
    return `💊 ${item.medicationName} — ${time} Uhr ✓`;
  });

  const subject = `✓ ${input.patientName} hat seine Medikamente genommen`;
  const text = `Hallo ${input.familyMemberName},

Gute Nachricht — ${input.patientName} hat heute folgende Morgendosen bestätigt:

${lines.join("\n")}

Alles gut heute.

— Noor`;

  const html = renderNoorEmailHtml(
    [
      paragraph(`Hallo ${input.familyMemberName},`),
      paragraph(
        `Gute Nachricht — ${input.patientName} hat heute folgende Morgendosen bestätigt:`,
      ),
      ...lines.map((line) => paragraph(line)),
      paragraph("Alles gut heute."),
      signature(),
    ].join(""),
  );

  return sendEmail({
    to: input.familyEmail,
    subject,
    html,
    text,
  });
}

export async function sendMedicationMissedPatientReminder(input: {
  patientName: string;
  patientEmail: string;
  doseSlotLabel: string;
  medicationName: string;
  scheduledTime: string;
}) {
  const subject = `💊 Erinnerung: ${input.doseSlotLabel}-Dosis noch offen`;
  const text = `Hallo ${input.patientName},

Sie haben Ihre ${input.doseSlotLabel}-Dosis noch nicht bestätigt:
💊 ${input.medicationName} — fällig um ${input.scheduledTime} Uhr

Bitte öffnen Sie Noor und tippen Sie auf die Dosis, sobald Sie sie eingenommen haben.

— Noor`;

  const html = renderNoorEmailHtml(
    [
      paragraph(`Hallo ${input.patientName},`),
      paragraph(
        `Sie haben Ihre ${input.doseSlotLabel}-Dosis noch nicht bestätigt:`,
      ),
      paragraph(
        `💊 ${input.medicationName} — fällig um ${input.scheduledTime} Uhr`,
      ),
      paragraph(
        "Bitte öffnen Sie Noor und tippen Sie auf die Dosis, sobald Sie sie eingenommen haben.",
      ),
      signature(),
    ].join(""),
    {
      label: "Medikamente öffnen",
      href: `${getAppUrl()}/medication`,
    },
  );

  return sendEmail({
    to: input.patientEmail,
    subject,
    html,
    text,
  });
}

export async function sendMedicationMissedAlert(input: {
  familyMemberName: string;
  familyEmail: string;
  patientName: string;
  doseSlotLabel: string;
  medicationName: string;
  scheduledTime: string;
}) {
  const subject = `⚠️ ${input.patientName} hat eine Dosis noch nicht bestätigt`;
  const text = `Hallo ${input.familyMemberName},

${input.patientName} hat die ${input.doseSlotLabel}-Dosis noch nicht bestätigt:
💊 ${input.medicationName} — fällig um ${input.scheduledTime} Uhr

Es könnte sich lohnen kurz anzurufen.

— Noor`;

  const html = renderNoorEmailHtml(
    [
      paragraph(`Hallo ${input.familyMemberName},`),
      paragraph(
        `${input.patientName} hat die ${input.doseSlotLabel}-Dosis noch nicht bestätigt:`,
      ),
      paragraph(
        `💊 ${input.medicationName} — fällig um ${input.scheduledTime} Uhr`,
      ),
      paragraph("Es könnte sich lohnen kurz anzurufen."),
      signature(),
    ].join(""),
  );

  return sendEmail({
    to: input.familyEmail,
    subject,
    html,
    text,
  });
}

export async function sendLabResultAlert(
  familyMemberName: string,
  familyEmail: string,
  patientName: string,
  normalCount: number,
  watchCount: number,
  highCount: number,
  appUrl = getAppUrl(),
) {
  const subject = `Neue Laborwerte von ${patientName}`;
  const text = `Hallo ${familyMemberName},

${patientName} hat heute neue Laborwerte hochgeladen.

Zusammenfassung:
🟢 ${normalCount} Normal  🟡 ${watchCount} Beachten  🔴 ${highCount} Erhöht

Vollständige Analyse ansehen: ${appUrl}/lab-results

— Noor`;

  const html = renderNoorEmailHtml(
    [
      paragraph(`Hallo ${familyMemberName},`),
      paragraph(`${patientName} hat heute neue Laborwerte hochgeladen.`),
      paragraph("Zusammenfassung:"),
      paragraph(
        `🟢 ${normalCount} Normal  🟡 ${watchCount} Beachten  🔴 ${highCount} Erhöht`,
      ),
      signature(),
    ].join(""),
    {
      label: "Vollständige Analyse ansehen →",
      href: `${appUrl}/lab-results`,
    },
  );

  return sendEmail({
    to: familyEmail,
    subject,
    html,
    text,
  });
}

export async function notifyLabResultAlerts(
  supabase: SupabaseClient,
  patientId: string,
  labResultId: string,
  counts: { normal: number; watch: number; high: number },
) {
  const recipients = await getFamilyMemberRecipients(
    supabase,
    patientId,
    "labResults",
  );
  const patientName = await getProfileFirstName(supabase, patientId);
  const appUrl = getAppUrl();

  for (const recipient of recipients) {
    const alreadySent = await wasNotificationSentToday(supabase, {
      patientId,
      recipientEmail: recipient.email,
      notificationType: "lab_result",
      dedupeKey: labResultId,
    });

    if (alreadySent) continue;

    const result = await sendLabResultAlert(
      recipient.firstName,
      recipient.email,
      patientName,
      counts.normal,
      counts.watch,
      counts.high,
      appUrl,
    );

    if (!result.sent) continue;

    await logNotificationSent(supabase, {
      patientId,
      recipientEmail: recipient.email,
      notificationType: "lab_result",
      dedupeKey: labResultId,
    });
  }
}

export async function getUserEmail(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) throw error;
  return data.user?.email?.trim() ?? null;
}

export async function getProfileFirstName(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", userId)
    .maybeSingle<{ first_name: string | null }>();

  if (error) throw error;
  return data?.first_name?.trim() || "Familie";
}

export async function getPatientMedicationRecipient(
  supabase: SupabaseClient,
  patientId: string,
) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, notification_preferences")
    .eq("id", patientId)
    .maybeSingle<{
      first_name: string | null;
      notification_preferences: Record<string, unknown> | null;
    }>();

  if (profileError) throw profileError;

  if (!isNotificationEnabled(profile?.notification_preferences, "medications")) {
    return null;
  }

  const email = await getUserEmail(supabase, patientId);
  if (!email) return null;

  return {
    email,
    firstName: profile?.first_name?.trim() || "Sie",
  };
}

export async function getFamilyMemberRecipients(
  supabase: SupabaseClient,
  patientId: string,
  preferenceType: NotificationPreferenceType,
) {
  const { data: familyLinks, error: linksError } = await supabase
    .from("family_links")
    .select("family_member_id")
    .eq("patient_id", patientId)
    .eq("active", true);

  if (linksError) throw linksError;

  const recipients: FamilyRecipient[] = [];

  for (const link of familyLinks ?? []) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, notification_preferences")
      .eq("id", link.family_member_id)
      .maybeSingle<{
        first_name: string | null;
        notification_preferences: Record<string, unknown> | null;
      }>();

    if (profileError) throw profileError;

    if (!isNotificationEnabled(profile?.notification_preferences, preferenceType)) {
      continue;
    }

    const email = await getUserEmail(supabase, link.family_member_id);
    if (!email) continue;

    recipients.push({
      familyMemberId: link.family_member_id,
      email,
      firstName: profile?.first_name?.trim() || "Familie",
    });
  }

  return recipients;
}

export function getDoseSlotLabel(doseTime: MedicationTimeSlot) {
  return timeSlotLabels[doseTime];
}

export function formatGermanTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function wasNotificationSentToday(
  supabase: SupabaseClient,
  input: {
    patientId: string;
    recipientEmail: string;
    notificationType: string;
    dedupeKey: string;
  },
) {
  const { start, end } = getTodayRange();
  const { data, error } = await supabase
    .from("email_notifications_log")
    .select("id")
    .eq("patient_id", input.patientId)
    .eq("recipient_email", input.recipientEmail)
    .eq("notification_type", input.notificationType)
    .eq("dedupe_key", input.dedupeKey)
    .gte("sent_at", start.toISOString())
    .lt("sent_at", end.toISOString())
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function logNotificationSent(
  supabase: SupabaseClient,
  input: {
    patientId: string;
    recipientEmail: string;
    notificationType: string;
    dedupeKey: string;
  },
) {
  const { error } = await supabase.from("email_notifications_log").insert({
    patient_id: input.patientId,
    recipient_email: input.recipientEmail,
    notification_type: input.notificationType,
    dedupe_key: input.dedupeKey,
    sent_at: new Date().toISOString(),
  });

  if (error) throw error;
}

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
