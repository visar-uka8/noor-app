import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient, isUsingServiceRoleClient } from "@/lib/supabase-data";
import { resolveLabFileType } from "@/lib/lab-file";
import { insertLabResult } from "@/lib/lab-results-db";
import { loadRecentActivityLogs } from "@/lib/activity-log-data";
import { uploadLabResultFile } from "@/lib/lab-storage";
import { analyzeLabDocument, getLabAiProvider } from "@/lib/lab-analyze";
import { notifyLabResultAlerts } from "@/lib/notifications";
import { getLabAnalysisCounts, parseLabAnalysis } from "@/lib/parse-lab-analysis";
import { saveHealthGoalsFromAnalysis } from "@/lib/health-goals";
import { checkLabAnalysisQuota } from "@/lib/subscription";
import {
  isAppLanguage,
  normalizeAppLanguage,
  type AppLanguage,
} from "@/lib/i18n/languages";
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

function errorMessage(language: AppLanguage, key: string) {
  const messages: Record<string, Record<AppLanguage, string>> = {
    upload: {
      de: "Bitte laden Sie eine Datei hoch.",
      en: "Please upload a file.",
      tr: "Lütfen bir dosya yükleyin.",
      sq: "Ju lutem ngarkoni një skedar.",
    },
    invalid: {
      de: "Bitte laden Sie ein Foto (JPEG/PNG) oder eine PDF-Datei hoch.",
      en: "Please upload a photo (JPEG/PNG) or a PDF file.",
      tr: "Lütfen bir fotoğraf (JPEG/PNG) veya PDF yükleyin.",
      sq: "Ju lutem ngarkoni një foto (JPEG/PNG) ose PDF.",
    },
    heic: {
      de: "Dieses Fotoformat wird nicht unterstützt. Bitte wählen Sie JPEG oder PDF.",
      en: "This photo format is not supported. Please choose JPEG or PDF.",
      tr: "Bu fotoğraf formatı desteklenmiyor. Lütfen JPEG veya PDF seçin.",
      sq: "Ky format foto nuk mbështetet. Ju lutem zgjidhni JPEG ose PDF.",
    },
    unreadable: {
      de: "Das Bild war leider nicht gut lesbar. Bitte versuchen Sie ein klareres Foto aufzunehmen.",
      en: "The image was hard to read. Please try a clearer photo.",
      tr: "Görüntü okunamadı. Lütfen daha net bir fotoğraf deneyin.",
      sq: "Imazhi nuk ishte i lexueshëm. Ju lutem provoni një foto më të qartë.",
    },
    unavailable: {
      de: "Analyse momentan nicht verfügbar. Bitte versuchen Sie es später erneut.",
      en: "Analysis is temporarily unavailable. Please try again later.",
      tr: "Analiz şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
      sq: "Analiza nuk është e disponueshme tani. Ju lutem provoni më vonë.",
    },
    rateLimit: {
      de: "Zu viele Anfragen gerade. Bitte warten Sie eine Minute und versuchen Sie es erneut.",
      en: "Too many requests right now. Please wait a minute and try again.",
      tr: "Şu anda çok fazla istek var. Lütfen bir dakika bekleyip tekrar deneyin.",
      sq: "Shumë kërkesa tani. Ju lutem prisni një minutë dhe provoni përsëri.",
    },
    notConfigured: {
      de: "Die KI-Analyse ist noch nicht eingerichtet. Ein kostenloser Google Gemini API-Schlüssel wird benötigt.",
      en: "AI analysis is not set up yet. A free Google Gemini API key is required.",
      tr: "Yapay zeka analizi henüz kurulmadı. Ücretsiz bir Google Gemini API anahtarı gerekli.",
      sq: "Analiza me AI nuk është konfiguruar ende. Kërkohet një çelës falas Google Gemini API.",
    },
    auth: {
      de: "Bitte melden Sie sich an, um Laborwerte zu speichern.",
      en: "Please sign in to save lab results.",
      tr: "Laboratuvar sonuçlarını kaydetmek için lütfen giriş yapın.",
      sq: "Ju lutem hyni për të ruajtur rezultatet e laboratorit.",
    },
    saveFailed: {
      de: "Die Analyse war erfolgreich, konnte aber nicht gespeichert werden. Bitte versuchen Sie es erneut.",
      en: "Analysis succeeded but could not be saved. Please try again.",
      tr: "Analiz başarılı oldu ancak kaydedilemedi. Lütfen tekrar deneyin.",
      sq: "Analiza u krye me sukses por nuk u ruajt. Ju lutem provoni përsëri.",
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
    if (authError || !user?.id) {
      console.log("Lab analyze: No user ID available", authError?.message);
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

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const labQuota = await checkLabAnalysisQuota(supabase, user.id);

    if (!labQuota.allowed) {
      return Response.json(
        {
          error:
            language === "de"
              ? "Sie haben Ihr monatliches Limit von 3 KI-Analysen erreicht. Upgraden Sie auf Noor Familie für unbegrenzte Analysen."
              : "You have reached your monthly limit of 3 AI analyses. Upgrade to Noor Familie for unlimited analyses.",
          code: "upgrade_required",
          used: labQuota.used,
          limit: labQuota.limit,
        },
        { status: 403 },
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

    console.log("Step 1: File received", file.name);

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

    let fileUrl =
      typeof fileUrlField === "string" && fileUrlField.length > 0
        ? fileUrlField
        : null;

    if (!fileUrl) {
      console.log("Step 2: Uploading to storage...");
      fileUrl = await uploadLabResultFile(authSupabase, user.id, file);
      console.log("Step 2 complete: file_url", fileUrl);
    } else {
      console.log("Step 2: Using provided file_url", fileUrl);
    }

    const base64File = Buffer.from(await file.arrayBuffer()).toString("base64");

    const { data: profile } = await authSupabase
      .from("profiles")
      .select(
        "date_of_birth, gender, height_cm, weight_kg, activity_level, sport_types",
      )
      .eq("id", user.id)
      .maybeSingle();

    let conditions: Array<{ name: string; since?: string; treatment?: string }> =
      [];
    try {
      const { data: passportRow } = await authSupabase
        .from("health_passports")
        .select("conditions")
        .eq("user_id", user.id)
        .maybeSingle<{ conditions?: Array<{ name: string; since?: string; treatment?: string }> }>();

      conditions = passportRow?.conditions ?? [];
    } catch (conditionsError) {
      console.warn("Lab analyze: conditions unavailable", conditionsError);
    }

    const recentActivity = await loadRecentActivityLogs(user.id, authSupabase);
    console.log("Lab analyze recent activity:", recentActivity.length);

    console.log("Step 3: Calling AI API...");
    const analysis = await analyzeLabDocument({
      language,
      mediaType,
      base64File,
      profile,
      conditions,
      recentActivity,
    });
    console.log("Step 4: Analysis received", analysis.length, "chars");

    if (isUnreadableResponse(analysis)) {
      return Response.json(
        { error: errorMessage(language, "unreadable"), code: "unreadable" },
        { status: 422 },
      );
    }

    const normalCount = (analysis.match(/🟢/g) || []).length;
    const watchCount = (analysis.match(/🟡/g) || []).length;
    const highCount = (analysis.match(/🔴/g) || []).length;
    const parsedCounts = getLabAnalysisCounts(analysis);
    const counts =
      parsedCounts.normal + parsedCounts.watch + parsedCounts.high > 0
        ? parsedCounts
        : { normal: normalCount, watch: watchCount, high: highCount };

    console.log("Step 5: Saving to Supabase...", {
      userId: user.id,
      fileUrl,
      counts,
    });

    const dataClient = createSupabaseDataClient() ?? authSupabase;
    const insertClientType = isUsingServiceRoleClient()
      ? "service_role"
      : "user_session";

    console.log("Step 5b: Supabase client", insertClientType);

    const { data, error: saveError, debug: saveDebug } = await insertLabResult(
      dataClient,
      {
        user_id: user.id,
        file_url: fileUrl,
        ai_analysis: analysis,
        normal_count: counts.normal,
        watch_count: counts.watch,
        high_count: counts.high,
        analysis_language: language,
      },
      { client: insertClientType },
    );

    console.log("Step 6: Save result", data, saveError, saveDebug);

    if (saveError) {
      console.error("Lab result save failed", {
        message: saveError.message,
        code: saveError.code,
        details: saveError.details,
        hint: saveError.hint,
      });
      return Response.json({
        analysis,
        saveFailed: true,
        saveError: saveError.message,
        saveErrorCode: saveError.code,
        saveErrorDetails: saveError.details ?? undefined,
        saveErrorHint: saveError.hint ?? undefined,
        saveDebug,
      } satisfies LabAnalysisResult);
    }

    void notifyLabResultAlerts(dataClient, user.id, data.id, counts).catch(
      (notificationError) => {
        console.error("Lab result notification failed", notificationError);
      },
    );

    const parsedAnalysis = parseLabAnalysis(analysis);
    void saveHealthGoalsFromAnalysis(dataClient, {
      userId: user.id,
      labResultId: data.id,
      personalGoalsSection: parsedAnalysis.personalGoalsSection,
      goals: parsedAnalysis.personalGoals,
    }).catch((goalsError) => {
      console.error("Health goals save failed", goalsError);
    });

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
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

async function getUserLanguage(): Promise<AppLanguage> {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user?.id) {
      return "de";
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { data: profile } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .maybeSingle<{ language: string | null }>();

    return normalizeAppLanguage(profile?.language);
  } catch {
    return "de";
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
