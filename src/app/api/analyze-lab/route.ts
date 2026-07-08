import Anthropic from "@anthropic-ai/sdk";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { createClient } from "@/lib/supabase/server";
import {
  ANALYSIS_UNAVAILABLE_MESSAGE,
  UNREADABLE_IMAGE_MESSAGE,
  type LabAnalysisResult,
} from "@/types/lab-results";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Du bist Noor, ein freundlicher Gesundheitsbegleiter. 
Ein älterer Patient hat dir ein Foto seines Laborbefunds geschickt.

Deine Aufgabe:
1. Lies alle sichtbaren Laborwerte aus dem Bild
2. Erkläre jeden Wert in sehr einfacher Sprache — kein Fachjargon
3. Sage klar ob der Wert normal, leicht erhöht, oder erhöht ist
4. Gib einen einfachen praktischen Tipp für jeden auffälligen Wert
5. Bleibe warm, ruhig und beruhigend im Ton
6. Schreibe maximal 400 Wörter
7. Strukturiere die Antwort so:
   - Kurze Zusammenfassung (2 Sätze)
   - Einzelne Werte (Liste)
   - Empfehlungen (2-3 Punkte)
8. Ende immer mit diesem Satz:
   'Diese Erklärung ersetzt keine ärztliche Beratung. 
   Bei Fragen sprechen Sie bitte mit Ihrem Arzt.'

Antworte immer auf Deutsch.`;

const UNREADABLE_MARKER = "UNREADABLE";
const MODEL = "claude-sonnet-4-20250514";

type AcceptedMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "application/pdf";

const ACCEPTED_MEDIA_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: ANALYSIS_UNAVAILABLE_MESSAGE, code: "unavailable" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const fileUrl = formData.get("file_url");

    if (!(file instanceof File)) {
      return Response.json(
        { error: "Bitte laden Sie eine Datei hoch." },
        { status: 400 },
      );
    }

    if (!ACCEPTED_MEDIA_TYPES.has(file.type)) {
      return Response.json(
        { error: "Bitte laden Sie ein Foto oder eine PDF-Datei hoch." },
        { status: 400 },
      );
    }

    const mediaType = file.type as AcceptedMediaType;
    const base64File = Buffer.from(await file.arrayBuffer()).toString("base64");
    const anthropic = new Anthropic({ apiKey });
    const contentBlock: ContentBlockParam =
      mediaType === "application/pdf"
        ? {
            type: "document",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64File,
            },
          }
        : {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64File,
            },
          };

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1800,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text: "Bitte analysiere diesen Laborbefund. Falls das Bild oder PDF nicht lesbar ist oder keine Laborwerte erkennbar sind, antworte ausschließlich mit dem Wort UNREADABLE.",
            },
          ],
        },
      ],
    });

    const analysis = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (isUnreadableResponse(analysis)) {
      return Response.json(
        { error: UNREADABLE_IMAGE_MESSAGE, code: "unreadable" },
        { status: 422 },
      );
    }

    const authSupabase = await createClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    const storedFileUrl =
      typeof fileUrl === "string" && fileUrl.length > 0 ? fileUrl : null;

    if (user && storedFileUrl) {
      await saveLabResult(user.id, storedFileUrl, analysis);
    }

    return Response.json({ analysis } satisfies LabAnalysisResult);
  } catch (error) {
    console.error("Lab analysis failed", error);

    return Response.json(
      { error: ANALYSIS_UNAVAILABLE_MESSAGE, code: "unavailable" },
      { status: 500 },
    );
  }
}

function isUnreadableResponse(text: string) {
  const normalized = text.trim().toUpperCase();

  if (normalized === UNREADABLE_MARKER) {
    return true;
  }

  const unreadablePatterns = [
    /nicht\s+lesbar/i,
    /kann\s+.*nicht\s+lesen/i,
    /keine\s+laborwerte/i,
    /keine\s+werte\s+erkenn/i,
    /bild\s+ist\s+zu\s+unscharf/i,
    /nicht\s+erkennbar/i,
  ];

  return (
    text.length < 80 &&
    unreadablePatterns.some((pattern) => pattern.test(text))
  );
}

async function saveLabResult(
  userId: string,
  fileUrl: string,
  aiAnalysis: string,
) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return;

  const { error } = await supabase.from("lab_results").insert({
    user_id: userId,
    file_url: fileUrl,
    ai_analysis: aiAnalysis,
  });

  if (error) {
    console.error("Lab result save failed", error);
  }
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createAdminClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}
