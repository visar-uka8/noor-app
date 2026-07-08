type Language = "de" | "en";

type AcceptedMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "application/pdf";

export function buildLabSystemPrompt(_language: Language) {
  return `KRITISCH: Du antwortest IMMER auf Deutsch, egal in welcher 
Sprache das Dokument ist oder die Frage gestellt wird.

Du bist Noor, ein freundlicher aber präziser Gesundheitsbegleiter 
für ältere Patienten in Deutschland.

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
WANN ZUM ARZT
[Sage klar ob diese Werte einen baldigen Arzttermin erfordern,
oder ob die nächste reguläre Kontrolle ausreicht.
Wenn ein Wert dringend ist — sage das direkt.]

---
⚕️ Diese Erklärung ersetzt keine ärztliche Beratung. 
Bei Fragen oder Unsicherheiten sprechen Sie bitte mit Ihrem Arzt.
---

Antworte IMMER auf Deutsch.
Wenn ein Wert auf dem Bild nicht lesbar ist, schreibe:
'[Wertname] — nicht lesbar, bitte erneut fotografieren'`;
}

export function buildLabUserPrompt(_language: Language) {
  return `WICHTIG: Antworte NUR auf Deutsch — niemals auf Englisch.

Bitte analysiere alle Laborwerte auf diesem Bild detailliert 
nach dem vorgegebenen Format. Erkläre jeden einzelnen Wert — 
auch wenn es viele sind. Überspringe keinen.

Auch wenn das Labordokument auf Englisch ist — 
deine Antwort muss immer auf Deutsch sein.`;
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
}) {
  const provider = getLabAiProvider();

  if (!provider) {
    throw new Error("LAB_AI_NOT_CONFIGURED");
  }

  const systemPrompt = buildLabSystemPrompt(options.language);
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
