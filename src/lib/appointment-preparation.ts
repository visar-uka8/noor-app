import { formatRelevantLabValues } from "@/lib/activity-insight";
import { listLabResultsForUser } from "@/lib/lab-results-db";
import {
  formatAppointmentDateTime,
  type AppointmentRecord,
} from "@/types/appointments";

export type AppointmentPreparationResult = {
  text: string;
  generated: boolean;
};

function buildFallbackPreparation(appointment: AppointmentRecord) {
  const when = formatAppointmentDateTime(appointment.scheduled_at);

  return [
    `Morgen haben Sie einen Termin bei ${appointment.doctor_name} (${when}).`,
    "",
    "Allgemeine Vorbereitung:",
    "- Notieren Sie aktuelle Beschwerden und Fragen",
    "- Nehmen Sie Ihre Medikamentenliste oder Noor-Gesundheitspass mit",
    "- Bringen Sie relevante Befunde oder Laborwerte mit",
    appointment.reason?.trim()
      ? `- Geplant: ${appointment.reason.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildAppointmentPreparationPrompt(options: {
  doctorName: string;
  appointmentWhen: string;
  reason: string | null;
  labContext: string;
  medications: string[];
}) {
  const medicationLines =
    options.medications.length > 0
      ? options.medications.map((name) => `- ${name}`).join("\n")
      : "- Keine aktiven Medikamente erfasst";

  return `Erstelle eine kurze Arzttermin-Vorbereitung auf Deutsch für einen Patienten.

Termin: ${options.appointmentWhen}
Arzt/Ärztin: ${options.doctorName}
Grund: ${options.reason?.trim() || "Allgemeiner Termin"}

Laborwerte:
${options.labContext}

Medikamente:
${medicationLines}

Format:
1. Ein Satz: "Morgen haben Sie einen Termin bei [Name]..."
2. Leerzeile
3. "Basierend auf Ihren letzten Laborwerten empfehlen wir folgende Fragen:"
4. 3–5 konkrete Fragen als Bullet-Points mit echten Werten aus den Laborwerten (z. B. Cholesterin mg/dL)
5. Optional ein Satz zu Medikamenten, wenn relevant

Ton: klar, unterstützend, nicht alarmistisch. Kein Markdown, keine Überschriften außer dem Einleitungssatz.`;
}

async function generateWithAnthropic(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
    max_tokens: 700,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content.find((entry) => entry.type === "text");
  return block?.type === "text" ? block.text.trim() : null;
}

export async function generateAppointmentPreparation(options: {
  appointment: AppointmentRecord;
  supabase: Parameters<typeof listLabResultsForUser>[0];
  medications: string[];
}) {
  if (options.appointment.preparation_text?.trim()) {
    return {
      text: options.appointment.preparation_text.trim(),
      generated: false,
    } satisfies AppointmentPreparationResult;
  }

  const labResults = await listLabResultsForUser(
    options.supabase,
    options.appointment.user_id,
    1,
  );
  const latestLab = labResults.data?.[0];
  const labContext = latestLab?.ai_analysis
    ? formatRelevantLabValues(latestLab.ai_analysis, latestLab.created_at)
    : "Keine Laborwerte vorhanden.";

  const prompt = buildAppointmentPreparationPrompt({
    doctorName: options.appointment.doctor_name,
    appointmentWhen: formatAppointmentDateTime(options.appointment.scheduled_at),
    reason: options.appointment.reason,
    labContext,
    medications: options.medications,
  });

  try {
    const generated = await generateWithAnthropic(prompt);
    if (generated) {
      return { text: generated, generated: true } satisfies AppointmentPreparationResult;
    }
  } catch (error) {
    console.error("Appointment preparation generation failed", error);
  }

  return {
    text: buildFallbackPreparation(options.appointment),
    generated: true,
  } satisfies AppointmentPreparationResult;
}
