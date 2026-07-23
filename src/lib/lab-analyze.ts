import { getActivityTypeTitle } from "@/types/activity-log";
import type { ActivityType } from "@/types/activity-log";

import {
  buildAiLanguageInstruction,
  type AppLanguage,
} from "@/lib/i18n/languages";

type Language = AppLanguage;

type AcceptedMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "application/pdf";

export type LabAnalysisProfile = {
  date_of_birth?: string | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | string | null;
  activity_level?: string | null;
  sport_types?: string[] | null;
};

export type LabProfileMetrics = {
  age: number | null;
  weightKg: number | null;
  bmi: number | null;
  activityLevel: string;
  heightCm: number | null;
};

export function buildLabProfileMetrics(
  profile: LabAnalysisProfile | null | undefined,
): LabProfileMetrics {
  let age: number | null = null;

  if (profile?.date_of_birth) {
    const birthDate = new Date(profile.date_of_birth);
    if (!Number.isNaN(birthDate.getTime())) {
      age = new Date().getFullYear() - birthDate.getFullYear();
    }
  }

  const weightKg =
    profile?.weight_kg != null && Number(profile.weight_kg) > 0
      ? Number(profile.weight_kg)
      : null;
  const heightCm =
    profile?.height_cm != null && profile.height_cm > 0
      ? profile.height_cm
      : null;

  let bmi: number | null = null;
  if (weightKg != null && heightCm != null) {
    bmi = weightKg / Math.pow(heightCm / 100, 2);
  }

  const activityLevel = profile?.activity_level
    ? (activityLevelLabels[profile.activity_level] ?? profile.activity_level)
    : "keine Angabe";

  return {
    age,
    weightKg,
    bmi,
    activityLevel,
    heightCm,
  };
}

const activityLevelLabels: Record<string, string> = {
  sedentary: "Wenig aktiv",
  light: "Leicht aktiv",
  moderate: "Aktiv",
  very_active: "Sehr aktiv",
};

const sportTypeLabels: Record<string, string> = {
  running: "Laufen",
  cycling: "Radfahren",
  swimming: "Schwimmen",
  strength: "Krafttraining",
  yoga: "Yoga",
  football: "Fußball",
  tennis: "Tennis",
  other: "Andere",
};

export function buildLabUserContext(profile: LabAnalysisProfile | null | undefined) {
  if (!profile) {
    return "Kein Profil verfügbar.";
  }

  const lines: string[] = ["PATIENTENPROFIL:"];

  if (profile.date_of_birth) {
    const age =
      new Date().getFullYear() -
      new Date(profile.date_of_birth).getFullYear();
    lines.push(`- Alter: ${age} Jahre`);
  }

  if (profile.gender) {
    const genderLabel =
      profile.gender === "male"
        ? "männlich"
        : profile.gender === "female"
          ? "weiblich"
          : "keine Angabe";
    lines.push(`- Geschlecht: ${genderLabel}`);
  }

  if (profile.height_cm != null && profile.height_cm > 0) {
    lines.push(`- Größe: ${profile.height_cm} cm`);
  }

  if (profile.weight_kg != null && Number(profile.weight_kg) > 0) {
    lines.push(`- Gewicht: ${profile.weight_kg} kg`);
  }

  if (
    profile.height_cm != null &&
    profile.height_cm > 0 &&
    profile.weight_kg != null &&
    Number(profile.weight_kg) > 0
  ) {
    const bmi =
      Number(profile.weight_kg) / Math.pow(profile.height_cm / 100, 2);
    lines.push(`- BMI: ${bmi.toFixed(1)}`);
  }

  if (profile.activity_level) {
    lines.push(
      `- Aktivitätslevel: ${activityLevelLabels[profile.activity_level] ?? profile.activity_level}`,
    );
  }

  const sportLabels = (profile.sport_types ?? [])
    .map((entry) => sportTypeLabels[entry] ?? entry)
    .filter(Boolean);

  lines.push(
    `- Sportarten: ${sportLabels.length > 0 ? sportLabels.join(", ") : "keine Angabe"}`,
  );

  if (lines.length === 1) {
    return "Kein Profil verfügbar.";
  }

  return lines.join("\n");
}

export function buildLabActivityContext(
  recentActivity: Array<{
    date: string;
    activity_type: string;
    duration_minutes: number | null;
  }>,
) {
  if (!recentActivity.length) {
    return "Keine Aktivitätsdaten vorhanden.";
  }

  const averageMinutes = Math.round(
    recentActivity.reduce(
      (sum, entry) => sum + (entry.duration_minutes || 0),
      0,
    ) / recentActivity.length,
  );

  return `AKTIVITÄT LETZTE 7 TAGE:
${recentActivity
  .map((entry) => {
    const label =
      getActivityTypeTitle(entry.activity_type as ActivityType) ||
      entry.activity_type;
    const minutes = entry.duration_minutes ?? 0;
    return `${entry.date}: ${label}, ${minutes} Min.`;
  })
  .join("\n")}
Durchschnittliche Aktivität: ${averageMinutes} Min./Tag
Nutze diese Daten für das Feld "Aktuell:" bei den Tageszielen — schätze z. B. Schritte aus Spaziergängen und Sport (Spaziergang ~100 Schritte/Min., Laufen ~150 Schritte/Min.).`;
}

export type LabAnalysisCondition = {
  name: string;
  since?: string;
  treatment?: string;
};

export function buildLabConditionsContext(
  conditions: LabAnalysisCondition[] | null | undefined,
) {
  if (!conditions?.length) {
    return "Keine bekannten Erkrankungen.";
  }

  const filled = conditions.filter((condition) => condition.name.trim().length > 0);
  if (!filled.length) {
    return "Keine bekannten Erkrankungen.";
  }

  return `BEKANNTE ERKRANKUNGEN:
${filled
  .map(
    (condition) =>
      `- ${condition.name.trim()}${condition.since?.trim() ? ` (${condition.since.trim()})` : ""}
   ${condition.treatment?.trim() ? `Behandlung: ${condition.treatment.trim()}` : ""}`.trimEnd(),
  )
  .join("\n")}`;
}

export function buildLabSystemPrompt(
  language: Language,
  userContext = "Kein Profil verfügbar.",
  activityContext = "Keine Aktivitätsdaten vorhanden.",
  conditionsContext = "Keine bekannten Erkrankungen.",
  profile?: LabAnalysisProfile | null,
) {
  const metrics = buildLabProfileMetrics(profile);
  const ageLabel = metrics.age != null ? `${metrics.age}` : "unbekannt";
  const weightLabel =
    metrics.weightKg != null ? `${metrics.weightKg}` : "unbekannt";
  const bmiLabel = metrics.bmi != null ? metrics.bmi.toFixed(1) : "unbekannt";
  const languageInstruction = buildAiLanguageInstruction(language);

  return `${languageInstruction}

${userContext}

${conditionsContext}

${activityContext}

WICHTIG FÜR ERKRANKUNGEN:
Berücksichtige bei ALLEN Wert-Erklärungen und Empfehlungen die bekannten Erkrankungen des Patienten.
Interpretiere Laborwerte im Kontext dieser Diagnosen — z. B. Blutzucker und HbA1c bei Diabetes, Entzündungsmarker bei Neurodermitis, Lipidwerte bei Herz-Kreislauf-Erkrankungen.
Gib keine generischen Erklärungen wenn eine Erkrankung relevante, spezifischere Interpretation ermöglicht.

WICHTIG FÜR EMPFEHLUNGEN:
Berücksichtige bei ALLEN Lifestyle-Empfehlungen das Patientenprofil:

- Wenn der Patient sehr aktiv ist (3+ Mal Sport/Woche):
  NIEMALS empfehlen "30 Minuten spazieren gehen" oder "1.5-2 Liter Wasser trinken"
  als allgemeine Empfehlung — das ist für aktive Menschen irrelevant.

  Stattdessen:
  * Empfehlungen an Trainingsintensität anpassen
  * Für sehr aktive: mehr Wasser (2.5-3.5L je nach Trainingsumfang), Regeneration, Protein etc.
  * Sportspezifische Tipps geben
  * Auf Übertraining oder Mangelzustände hinweisen die bei Sportlern häufiger vorkommen

- Wenn der Patient wenig aktiv ist:
  Moderate Aktivität empfehlen, angepasst ans Alter

- Alter berücksichtigen:
  Empfehlungen für einen 35-jährigen Sportler sind völlig anders als für einen 70-jährigen.

- BMI berücksichtigen:
  Bei erhöhtem BMI entsprechende Hinweise geben.
  Bei normalem BMI nicht unnötig auf Gewicht eingehen.

Für den Persönlichen Lebensstil-Plan gilt:
Die Empfehlungen müssen SPEZIFISCH und REALISTISCH sein für diese konkrete Person — nicht generisch.

Ein 36-jähriger der 5x pro Woche Sport macht braucht KEINE Empfehlung mehr Sport zu machen.
Er braucht vielleicht Hinweise zu Regeneration, Elektrolyten, oder sportspezifischer Ernährung.

Ein Patient hat dir ein Foto seines Laborbefunds geschickt.

Deine Aufgabe ist eine DETAILLIERTE und STRUKTURIERTE Erklärung 
zu liefern — nicht allgemein und vage, sondern spezifisch für 
JEDEN einzelnen Wert im Befund.

WICHTIGE REGELN:
- Erkläre JEDEN sichtbaren Wert einzeln — überspringe nichts
- Nenne immer den genauen Wert des Patienten UND den Referenzbereich
- Erkläre in 1-2 Sätzen was dieser Wert im Körper bedeutet
- Sage klar ob es normal, leicht auffällig oder erhöht/erniedrigt ist
- Verwende KEINE medizinischen Fachbegriffe ohne sofortige Erklärung
- Schreibe wie ein verständnisvoller Arzt der Zeit hat zu erklären
- Sei warm aber präzise — keine leeren Beruhigungen
- Niemals: 'viele Werte sehen gut aus' — immer jeden Wert einzeln

AUSGABEFORMAT — halte dich GENAU an diese Struktur:

---
ZUSAMMENFASSUNG
[2-3 Sätze: Gesamtbild des Befunds. Konkret, nicht allgemein.]

---
IHRE LABORWERTE IM DETAIL

Für jeden Wert verwende genau dieses Format:

🟢 / 🟡 / 🔴  [NAME DES WERTS]
Ihr Wert: [Zahl + Einheit]
Normalbereich: [Referenzbereich]
Was bedeutet das: [1-2 Sätze in einfacher Sprache was dieser 
Wert im Körper misst und was er über die Gesundheit aussagt]
Status: [NORMAL / LEICHT ERHÖHT / ERHÖHT / LEICHT ERNIEDRIGT / 
ERNIEDRIGT]
[Wenn nicht normal — 1 konkreter praktischer Tipp]

[Wiederhole für jeden einzelnen Wert im Befund]

---
NÄCHSTE SCHRITTE
[3-5 konkrete, priorisierte Handlungsempfehlungen basierend auf 
den auffälligen Werten. Spezifisch, nicht allgemein.
Zum Beispiel nicht 'essen Sie gesünder' sondern 
'reduzieren Sie gesättigte Fette — also weniger rotes Fleisch 
und Vollfettmilchprodukte — da Ihr Cholesterin erhöht ist']

---
IHR PERSÖNLICHER LEBENSSTIL-PLAN

Basierend auf Ihren Laborwerten und Ihrem Patientenprofil empfehle ich folgendes:

ERNÄHRUNG 🥗
[2-3 specific foods to eat more of based on their results]
[2-3 specific foods to reduce based on their results]
Not generic advice. Specific to their actual values and activity level.

BEWEGUNG 🚶
[One specific, realistic exercise or recovery recommendation]
An das Patientenprofil angepasst — nicht generisch.
Für sehr aktive Patienten: Regeneration, sportspezifische Tipps.
Für wenig aktive Patienten: moderate, altersgerechte Aktivität.

TRINKEN 💧
[Specific hydration advice if relevant to their values and activity level]
Nicht generisch 1,5L empfehlen wenn der Patient sehr aktiv ist.

NÄCHSTE KONTROLLE 📅
[When they should get their next lab test]

---
IHRE PERSÖNLICHEN TAGESZIELE

Basierend auf Ihren Laborwerten, Ihrem Alter, Gewicht und Aktivitätslevel habe ich folgende tägliche Ziele für Sie berechnet:

Berechne SPEZIFISCHE Ziele für diese Person.
Nicht generische Empfehlungen.
Echte Zahlen basierend auf den tatsächlichen Werten.

Format for each goal:
🎯 [Goal name]
Ihr Ziel: [specific number + unit]
Warum: [one sentence connecting to their specific lab value]
Aktuell: [their current level based on activity data]

SCHRITTZIEL:
Berechne empfohlene Schritte basierend auf:
- Alter: ${ageLabel} Jahre
- Gewicht: ${weightLabel}kg
- BMI: ${bmiLabel}
- Aktivitätslevel: ${metrics.activityLevel}
- Relevante Laborwerte: Cholesterin, Blutzucker, Blutdruck falls erhöht

Formel als Orientierung:
- Normalgewicht, jung, aktiv: 8000-10000 Schritte
- Übergewicht oder erhöhtes Cholesterin: +1500 Schritte
- Diabetes oder Blutzucker erhöht: +2000 Schritte
- Älter als 70: reduziere um 1500 Schritte
- Sehr aktiv (5x Sport/Woche): reduziere da Sport bereits ausreichend

Beispiel Output:
🎯 Schritte pro Tag
Ihr Ziel: 9.500 Schritte
Warum: Ihr erhöhtes Cholesterin von 240 mg/dL spricht auf regelmäßige moderate Bewegung an.
Aktuell: ~6.000 Schritte (geschätzt aus Aktivitätslog)

WASSERZIEL:
Berechne täglichen Wasserbedarf basierend auf:
- Gewicht × 0.033 = Grundbedarf in Litern
- + 0.5L pro 30 Min. Sport
- Anpassung bei erhöhter Harnsäure (+0.5L)
- Anpassung bei Nierenwerten

Beispiel Output:
💧 Wasser pro Tag
Ihr Ziel: 2.8 Liter
Warum: Ihr Gewicht von 85kg ergibt einen Grundbedarf von 2.8L. Bei Ihrem Harnsäurewert ist ausreichend Wasser besonders wichtig.

PROTEINZIEL (nur wenn relevant):
Wenn der Nutzer sehr aktiv ist (sport 5x/Woche):
🥩 Protein pro Tag
Ihr Ziel: 140g
Warum: Bei Ihrem Aktivitätslevel und Gewicht von 85kg empfehlen sich 1.6-1.8g Protein/kg für optimale Regeneration.

SCHLAFZIEL:
Basierend auf Alter:
😴 Schlaf pro Nacht
Ihr Ziel: 7-8 Stunden
Warum: [age-appropriate reason]

Wichtig: Alle Ziele müssen SPEZIFISCH sein.
Niemals "ausreichend Wasser trinken".
Immer eine konkrete Zahl.
Die Zahl muss sich von Person zu Person unterscheiden basierend auf ihren Daten.

Gib mindestens Schritte, Wasser und Schlaf aus. Protein nur wenn sportlich sehr aktiv.

---
WANN ZUM ARZT
[Sage klar ob diese Werte einen baldigen Arzttermin erfordern,
oder ob die nächste reguläre Kontrolle ausreicht.
Wenn ein Wert dringend ist — sage das direkt.]

---
⚕️ Diese Erklärung ersetzt keine ärztliche Beratung. 
Bei Fragen oder Unsicherheiten sprechen Sie bitte mit Ihrem Arzt.
---`;
}

export function buildLabUserPrompt(language: Language) {
  const languageInstruction = buildAiLanguageInstruction(language);

  return `${languageInstruction}

Bitte analysiere alle Laborwerte auf diesem Bild detailliert 
nach dem vorgegebenen Format. Erkläre jeden einzelnen Wert — 
auch wenn es viele sind. Überspringe keinen.

Auch wenn das Labordokument in einer anderen Sprache ist —
deine Antwort muss in der oben genannten Sprache sein.

Wenn ein Wert auf dem Bild nicht lesbar ist, schreibe:
'[Wertname] — nicht lesbar, bitte erneut fotografieren'`;
}

export function getLabAiProvider() {
  if (process.env.GEMINI_API_KEY) return "gemini" as const;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic" as const;
  return null;
}

export async function analyzeLabDocument(options: {
  language: Language;
  mediaType: AcceptedMediaType;
  base64File: string;
  profile?: LabAnalysisProfile | null;
  conditions?: LabAnalysisCondition[] | null;
  recentActivity?: Array<{
    date: string;
    activity_type: string;
    duration_minutes: number | null;
  }>;
}) {
  const provider = getLabAiProvider();

  if (!provider) {
    throw new Error("LAB_AI_NOT_CONFIGURED");
  }

  const userContext = buildLabUserContext(options.profile);
  const conditionsContext = buildLabConditionsContext(options.conditions);
  const activityContext = buildLabActivityContext(options.recentActivity ?? []);
  const systemPrompt = buildLabSystemPrompt(
    options.language,
    userContext,
    activityContext,
    conditionsContext,
    options.profile,
  );
  const userPrompt = buildLabUserPrompt(options.language);

  if (provider === "gemini") {
    return analyzeWithGemini({
      apiKey: process.env.GEMINI_API_KEY!,
      systemPrompt,
      userPrompt,
      mediaType: options.mediaType,
      base64File: options.base64File,
    });
  }

  return analyzeWithAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    systemPrompt,
    userPrompt,
    mediaType: options.mediaType,
    base64File: options.base64File,
  });
}

async function analyzeWithGemini(options: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  mediaType: AcceptedMediaType;
  base64File: string;
}) {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${options.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: options.systemPrompt }],
        },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                inline_data: {
                  mime_type: options.mediaType,
                  data: options.base64File,
                },
              },
              { text: options.userPrompt },
            ],
          },
        ],
      }),
    },
  );

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    const message = payload.error?.message ?? "Gemini request failed";
    if (response.status === 429 || /quota|rate limit/i.test(message)) {
      throw new Error("GEMINI_RATE_LIMIT");
    }
    throw new Error(message);
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty analysis");
  }

  return text;
}

async function analyzeWithAnthropic(options: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  mediaType: AcceptedMediaType;
  base64File: string;
}) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic({ apiKey: options.apiKey });

  const contentBlock =
    options.mediaType === "application/pdf"
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: options.mediaType,
            data: options.base64File,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: options.mediaType,
            data: options.base64File,
          },
        };

  const message = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
    max_tokens: 8192,
    temperature: 0.2,
    system: options.systemPrompt,
    messages: [
      {
        role: "user",
        content: [contentBlock, { type: "text", text: options.userPrompt }],
      },
    ],
  });

  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
