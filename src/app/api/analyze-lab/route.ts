import { createClient } from "@/lib/supabase/server";
import { resolveLabFileType } from "@/lib/lab-file";
import { uploadLabResultFile } from "@/lib/lab-storage";
import { analyzeLabDocument, getLabAiProvider } from "@/lib/lab-analyze";
import { getLabAnalysisCounts } from "@/lib/parse-lab-analysis";
import type { LabAnalysisResult } from "@/types/lab-results";

export const runtime = "nodejs";

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

const UNREADABLE_MARKER = "UNREADABLE";

function errorMessage(language: "de" | "en", key: string) {
  const messages: Record<string, Record<"de" | "en", string>> = {
    upload: {
      de: "Bitte laden Sie eine Datei hoch.",
      en: "Please upload a file.",
    },
    invalid: {
      de: "Bitte laden Sie ein Foto (JPEG/PNG) oder eine PDF-Datei hoch.",
      en: "Please upload a photo (JPEG/PNG) or a PDF file.",
    },
    heic: {
      de: "Dieses Fotoformat wird nicht unterstützt. Bitte wählen Sie JPEG oder PDF.",
      en: "This photo format is not supported. Please choose JPEG or PDF.",
    },
    unreadable: {
      de: "Das Bild war leider nicht gut lesbar. Bitte versuchen Sie ein klareres Foto aufzunehmen.",
      en: "The image was hard to read. Please try a clearer photo.",
    },
    unavailable: {
      de: "Analyse momentan nicht verfügbar. Bitte versuchen Sie es später erneut.",
      en: "Analysis is temporarily unavailable. Please try again later.",
    },
    rateLimit: {
      de: "Zu viele Anfragen gerade. Bitte warten Sie eine Minute und versuchen Sie es erneut.",
      en: "Too many requests right now. Please wait a minute and try again.",
    },
    notConfigured: {
      de: "Die KI-Analyse ist noch nicht eingerichtet. Ein kostenloser Google Gemini API-Schlüssel wird benötigt.",
      en: "AI analysis is not set up yet. A free Google Gemini API key is required.",
    },
    auth: {
      de: "Bitte melden Sie sich an, um Laborwerte zu speichern.",
      en: "Please sign in to save lab results.",
    },
    saveFailed: {
      de: "Die Analyse war erfolgreich, konnte aber nicht gespeichert werden. Bitte versuchen Sie es erneut.",
      en: "Analysis succeeded but could not be saved. Please try again.",
    },
  };

  return messages[key]?.[language] ?? messages[key]?.de ?? "";
}

export async function POST(request: Request) {
  const authSupabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authSupabase.auth.getUser();

  const language = await getUserLanguage();

  try {
    if (authError || !user) {
      return Response.json(
        { error: errorMessage(language, "auth"), code: "unauthorized" },
        { status: 401 },
      );
    }

    if (!getLabAiProvider()) {
      return Response.json(
        {
          error: errorMessage(language, "notConfigured"),
          code: "not_configured",
        },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const fileUrlField = formData.get("file_url");
    const mediaTypeField = formData.get("media_type");

    if (!(file instanceof File)) {
      return Response.json(
        { error: errorMessage(language, "upload") },
        { status: 400 },
      );
    }

    const resolvedType =
      typeof mediaTypeField === "string" && mediaTypeField.length > 0
        ? mediaTypeField
        : resolveLabFileType(file) ?? file.type;

    if (resolvedType === "image/heic") {
      return Response.json(
        { error: errorMessage(language, "heic"), code: "unsupported" },
        { status: 400 },
      );
    }

    if (!ACCEPTED_MEDIA_TYPES.has(resolvedType)) {
      return Response.json(
        { error: errorMessage(language, "invalid") },
        { status: 400 },
      );
    }

    const mediaType = resolvedType as AcceptedMediaType;
    const base64File = Buffer.from(await file.arrayBuffer()).toString("base64");

    const analysis = await analyzeLabDocument({
      language,
      mediaType,
      base64File,
    });

    if (isUnreadableResponse(analysis)) {
      return Response.json(
        { error: errorMessage(language, "unreadable"), code: "unreadable" },
        { status: 422 },
      );
    }

    let fileUrl =
      typeof fileUrlField === "string" && fileUrlField.length > 0
        ? fileUrlField
        : null;

    if (!fileUrl) {
      fileUrl = await uploadLabResultFile(authSupabase, user.id, file);
    }

    const normalCount = (analysis.match(/🟢/g) || []).length;
    const watchCount = (analysis.match(/🟡/g) || []).length;
    const highCount = (analysis.match(/🔴/g) || []).length;
    const parsedCounts = getLabAnalysisCounts(analysis);
    const counts =
      parsedCounts.normal + parsedCounts.watch + parsedCounts.high > 0
        ? parsedCounts
        : { normal: normalCount, watch: watchCount, high: highCount };

    const now = new Date().toISOString();
    const { data, error: saveError } = await authSupabase
      .from("lab_results")
      .insert({
        user_id: user.id,
        file_url: fileUrl,
        ai_analysis: analysis,
        normal_count: counts.normal,
        watch_count: counts.watch,
        high_count: counts.high,
        created_at: now,
      })
      .select("id")
      .single();

    console.log("Save result:", data, saveError);

    if (saveError) {
      console.error("Lab result save failed", saveError);
      return Response.json(
        {
          error: errorMessage(language, "saveFailed"),
          code: "save_failed",
          details: saveError.message,
        },
        { status: 500 },
      );
    }

    return Response.json({
      analysis,
      labResultId: data.id,
    } satisfies LabAnalysisResult);
  } catch (error) {
    console.error("Lab analysis failed", error);

    if (error instanceof Error && error.message === "LAB_AI_NOT_CONFIGURED") {
      return Response.json(
        {
          error: errorMessage(language, "notConfigured"),
          code: "not_configured",
        },
        { status: 503 },
      );
    }

    if (error instanceof Error && error.message === "GEMINI_RATE_LIMIT") {
      return Response.json(
        {
          error: errorMessage(language, "rateLimit"),
          code: "rate_limit",
        },
        { status: 429 },
      );
    }

    return Response.json(
      {
        error: errorMessage(language, "unavailable"),
        code: "unavailable",
      },
      { status: 500 },
    );
  }
}

async function getUserLanguage() {
  return "de" as const;
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
    /hard to read/i,
    /cannot read/i,
    /no lab values/i,
    /unreadable/i,
  ];

  return (
    text.length < 80 &&
    unreadablePatterns.some((pattern) => pattern.test(text))
  );
}
