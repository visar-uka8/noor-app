import { buildActivitySummary30Days } from "@/lib/activity-history";
import {
  getLabValueStatusKey,
  parseLabAnalysis,
} from "@/lib/parse-lab-analysis";
import { formatLabResultDate } from "@/types/lab-results";
import type { StoredActivityLog } from "@/types/activity-log";

export type ActivityInsightResult = {
  available: boolean;
  insight?: string;
};

export function formatRelevantLabValues(aiAnalysis: string, labDate: string) {
  const parsed = parseLabAnalysis(aiAnalysis);
  const labDateLabel = formatLabResultDate(labDate);

  if (parsed.values.length === 0) {
    const summary = parsed.summary.trim();
    if (!summary) {
      return `Labor vom ${labDateLabel}: Keine strukturierten Werte verfügbar.`;
    }

    return `Labor vom ${labDateLabel}:\n${summary.slice(0, 800)}`;
  }

  const prioritized = parsed.values.filter(
    (value) => getLabValueStatusKey(value) !== "normal",
  );
  const selected = (prioritized.length > 0 ? prioritized : parsed.values).slice(
    0,
    8,
  );

  const lines = selected.map((value) => {
    const parts = [value.name, value.patientValue].filter(Boolean);
    if (value.status) {
      parts.push(`(${value.status})`);
    }
    return `- ${parts.join(": ")}`;
  });

  return [`Labor vom ${labDateLabel}:`, ...lines].join("\n");
}

export function buildActivityInsightPrompt(options: {
  activitySummary: string;
  relevantLabValues: string;
}) {
  return `Analysiere diese Aktivitätsdaten und Laborwerte und gib einen kurzen, motivierenden Einblick auf Deutsch in 2-3 Sätzen.

Aktivität letzte 30 Tage:
${options.activitySummary}

Letzte Laborwerte (relevante):
${options.relevantLabValues}

Der Einblick soll:
- Spezifisch sein — echte Zahlen verwenden
- Motivierend aber ehrlich sein
- Eine konkrete Verbindung zwischen Aktivität und Laborwerten herstellen
- Nicht generisch klingen

Beispiel:
'Sie waren im Juli an 8 von 21 Tagen aktiv mit durchschnittlich 45 Minuten. Ihr Cholesterin lag zuletzt bei 235 mg/dL. Studien zeigen dass 150 Minuten moderate Bewegung pro Woche den Cholesterinwert um 5-10% senken kann — Sie sind auf einem guten Weg.'

Antworte nur mit dem Einblickstext — ohne Überschrift, Anführungszeichen oder Markdown.`;
}

async function generateInsightWithAnthropic(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_NOT_CONFIGURED");
  }

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
    max_tokens: 320,
    temperature: 0.4,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("EMPTY_INSIGHT");
  }

  return text.replace(/^['"]|['"]$/g, "").trim();
}

export async function generateActivityInsight(options: {
  logs: StoredActivityLog[];
  labAnalysis: string;
  labCreatedAt: string;
}): Promise<ActivityInsightResult> {
  const activitySummary = buildActivitySummary30Days(options.logs);
  const relevantLabValues = formatRelevantLabValues(
    options.labAnalysis,
    options.labCreatedAt,
  );

  if (!activitySummary.trim() || !relevantLabValues.trim()) {
    return { available: false };
  }

  try {
    const prompt = buildActivityInsightPrompt({
      activitySummary,
      relevantLabValues,
    });
    const insight = await generateInsightWithAnthropic(prompt);

    return {
      available: true,
      insight,
    };
  } catch (error) {
    console.error("Activity insight generation failed", error);
    return { available: false };
  }
}
