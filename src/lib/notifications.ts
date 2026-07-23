import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  getAppointmentReminderEmail,
  getFamilyConnectionEmail,
  getLabResultEmail,
  getMedicationConfirmedEmail,
  getMedicationMissedFamilyEmail,
  getMedicationMissedPatientEmail,
} from "@/lib/i18n/email-templates";
import {
  normalizeAppLanguage,
  type AppLanguage,
} from "@/lib/i18n/languages";
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
  language: AppLanguage;
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
  language: AppLanguage = "de",
) {
  const copy = getFamilyConnectionEmail(language, {
    recipientName: patientName,
    familyMemberName,
  });
  const text = `${copy.greeting}

${copy.body}

${copy.warning}

— Noor`;

  const html = renderNoorEmailHtml(
    [
      paragraph(copy.greeting),
      paragraph(copy.body),
      paragraph(copy.warning),
      signature(),
    ].join(""),
    {
      label: copy.ctaLabel,
      href: `${getAppUrl()}/settings`,
    },
  );

  return sendEmail({ to: patientEmail, subject: copy.subject, html, text });
}

export async function sendMedicationConfirmedAlert(input: {
  familyMemberName: string;
  familyEmail: string;
  patientName: string;
  doseSlotLabel: string;
  medicationName: string;
  confirmedAt: string;
  language?: AppLanguage;
}) {
  const confirmedTime = formatLocalizedTime(
    input.confirmedAt,
    input.language ?? "de",
  );
  const copy = getMedicationConfirmedEmail(input.language ?? "de", {
    recipientName: input.familyMemberName,
    name: input.patientName,
    slot: input.doseSlotLabel,
    medication: input.medicationName,
    time: confirmedTime,
  });
  const text = `${copy.greeting}

${copy.intro}
${copy.doseLine}

${copy.footer}

— Noor`;

  const html = renderNoorEmailHtml(
    [
      paragraph(copy.greeting),
      paragraph(copy.intro),
      paragraph(copy.doseLine),
      paragraph(copy.footer),
      signature(),
    ].join(""),
  );

  return sendEmail({
    to: input.familyEmail,
    subject: copy.subject,
    html,
    text,
  });
}

export async function sendMorningMedicationSummaryAlert(input: {
  familyMemberName: string;
  familyEmail: string;
  patientName: string;
  confirmations: MorningConfirmationItem[];
  language?: AppLanguage;
}) {
  if (input.confirmations.length === 0) {
    return { sent: false as const, reason: "empty_summary" as const };
  }

  const language = input.language ?? "de";
  const lines = input.confirmations.map((item) => {
    const time = formatLocalizedTime(item.confirmedAt, language);
    return `💊 ${item.medicationName} — ${time} ✓`;
  });

  const copy = getMedicationConfirmedEmail(language, {
    recipientName: input.familyMemberName,
    name: input.patientName,
    slot: "Morgen",
    medication: lines.join(", "),
    time: "",
  });
  const subject = copy.subject;
  const text = `${copy.greeting}

${language === "de"
    ? `Gute Nachricht — ${input.patientName} hat heute folgende Morgendosen bestätigt:`
    : language === "en"
      ? `Good news — ${input.patientName} confirmed the following morning doses today:`
      : language === "tr"
        ? `İyi haber — ${input.patientName} bugün şu sabah dozlarını onayladı:`
        : `Lajm i mirë — ${input.patientName} konfirmoi sot këto doza të mëngjesit:`}

${lines.join("\n")}

${copy.footer}

— Noor`;

  const html = renderNoorEmailHtml(
    [
      paragraph(copy.greeting),
      paragraph(text.split("\n\n")[1] ?? ""),
      ...lines.map((line) => paragraph(line)),
      paragraph(copy.footer),
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
  language?: AppLanguage;
}) {
  const copy = getMedicationMissedPatientEmail(input.language ?? "de", {
    recipientName: input.patientName,
    slot: input.doseSlotLabel,
    medication: input.medicationName,
    time: input.scheduledTime,
  });
  const text = `${copy.greeting}

${copy.bodyLine}
${copy.doseLine}

${copy.footer}

— Noor`;

  const html = renderNoorEmailHtml(
    [
      paragraph(copy.greeting),
      paragraph(copy.bodyLine),
      paragraph(copy.doseLine),
      paragraph(copy.footer),
      signature(),
    ].join(""),
    copy.ctaLabel
      ? {
          label: copy.ctaLabel,
          href: `${getAppUrl()}/medication`,
        }
      : undefined,
  );

  return sendEmail({
    to: input.patientEmail,
    subject: copy.subject,
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
  language?: AppLanguage;
}) {
  const copy = getMedicationMissedFamilyEmail(input.language ?? "de", {
    recipientName: input.familyMemberName,
    name: input.patientName,
    slot: input.doseSlotLabel,
    medication: input.medicationName,
    time: input.scheduledTime,
  });
  const text = `${copy.greeting}

${copy.bodyLine}
${copy.doseLine}

${copy.footer}

— Noor`;

  const html = renderNoorEmailHtml(
    [
      paragraph(copy.greeting),
      paragraph(copy.bodyLine),
      paragraph(copy.doseLine),
      paragraph(copy.footer),
      signature(),
    ].join(""),
  );

  return sendEmail({
    to: input.familyEmail,
    subject: copy.subject,
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
  language: AppLanguage = "de",
) {
  const copy = getLabResultEmail(language, {
    recipientName: familyMemberName,
    name: patientName,
    normal: normalCount,
    watch: watchCount,
    high: highCount,
  });
  const text = `${copy.greeting}

${copy.intro}

${copy.summaryLabel}
${copy.summaryLine}

${copy.ctaLabel}: ${appUrl}/lab-results

— Noor`;

  const html = renderNoorEmailHtml(
    [
      paragraph(copy.greeting),
      paragraph(copy.intro),
      paragraph(copy.summaryLabel),
      paragraph(copy.summaryLine),
      signature(),
    ].join(""),
    {
      label: copy.ctaLabel,
      href: `${appUrl}/lab-results`,
    },
  );

  return sendEmail({
    to: familyEmail,
    subject: copy.subject,
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
      recipient.language,
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

export async function getProfileLanguage(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppLanguage> {
  const { data, error } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", userId)
    .maybeSingle<{ language: string | null }>();

  if (error) throw error;
  return normalizeAppLanguage(data?.language);
}

export async function getPatientMedicationRecipient(
  supabase: SupabaseClient,
  patientId: string,
) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, notification_preferences, language")
    .eq("id", patientId)
    .maybeSingle<{
      first_name: string | null;
      notification_preferences: Record<string, unknown> | null;
      language: string | null;
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
    language: normalizeAppLanguage(profile?.language),
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
      .select("first_name, notification_preferences, language")
      .eq("id", link.family_member_id)
      .maybeSingle<{
        first_name: string | null;
        notification_preferences: Record<string, unknown> | null;
        language: string | null;
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
      language: normalizeAppLanguage(profile?.language),
    });
  }

  return recipients;
}

export function getDoseSlotLabel(doseTime: MedicationTimeSlot) {
  return timeSlotLabels[doseTime];
}

export function formatGermanTime(value: string | Date) {
  return formatLocalizedTime(value, "de");
}

const TIME_LOCALE: Record<AppLanguage, string> = {
  de: "de-DE",
  en: "en-GB",
  tr: "tr-TR",
  sq: "sq-AL",
};

export function formatLocalizedTime(
  value: string | Date,
  language: AppLanguage = "de",
) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(TIME_LOCALE[language] ?? "de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function sendAppointmentReminderAlert(input: {
  email: string;
  firstName: string;
  doctorName: string;
  appointmentWhen: string;
  preparationText: string;
  appointmentId: string;
  language?: AppLanguage;
}) {
  const copy = getAppointmentReminderEmail(input.language ?? "de", {
    recipientName: input.firstName,
    doctorName: input.doctorName,
    appointmentWhen: input.appointmentWhen,
  });
  const text = `${copy.greeting}

${copy.intro}

${input.preparationText}

— Noor`;

  const html = renderNoorEmailHtml(
    [
      paragraph(copy.greeting),
      paragraph(copy.intro),
      paragraph(input.preparationText.replace(/\n/g, "<br />")),
      signature(),
    ].join(""),
    {
      label: copy.ctaLabel,
      href: `${getAppUrl()}/appointments`,
    },
  );

  return sendEmail({
    to: input.email,
    subject: copy.subject,
    html,
    text,
  });
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
