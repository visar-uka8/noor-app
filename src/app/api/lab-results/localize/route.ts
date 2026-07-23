import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import {
  localizeLabAnalysisContent,
  localizeStoredLabResult,
} from "@/lib/lab-analysis-localize";
import { resolveWatcherPatientLink } from "@/lib/family-links-query";
import { normalizeAppLanguage } from "@/lib/i18n/languages";

export const runtime = "nodejs";

type LocalizeRequest = {
  labResultId?: string;
  analysis?: string;
  targetLanguage?: string;
};

export async function POST(request: Request) {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json()) as LocalizeRequest;
    const targetLanguage = normalizeAppLanguage(payload.targetLanguage);

    if (payload.labResultId?.trim()) {
      const supabase = createSupabaseDataClient() ?? authSupabase;
      const labResultId = payload.labResultId.trim();
      let localized = await localizeStoredLabResult(
        supabase,
        labResultId,
        user.id,
        targetLanguage,
      );

      if (!localized) {
        const familyLink = await resolveWatcherPatientLink(
          supabase,
          user.id,
          null,
        );

        if (familyLink?.patient_id) {
          localized = await localizeStoredLabResult(
            supabase,
            labResultId,
            familyLink.patient_id,
            targetLanguage,
          );
        }
      }

      if (!localized) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }

      return Response.json({
        parsed: localized.parsed,
        translated: localized.translated,
        sourceLanguage: localized.sourceLanguage,
        cached: localized.cached ?? false,
        unavailable: localized.unavailable ?? false,
      });
    }

    if (!payload.analysis?.trim()) {
      return Response.json({ error: "Missing analysis" }, { status: 400 });
    }

    const localized = await localizeLabAnalysisContent(
      payload.analysis.trim(),
      targetLanguage,
    );

    return Response.json({
      parsed: localized.parsed,
      translated: localized.translated,
      sourceLanguage: localized.sourceLanguage,
      unavailable: localized.unavailable ?? false,
    });
  } catch (error) {
    console.error("Lab analysis localization failed:", error);

    if (error instanceof Error && error.message === "DEEPL_NOT_CONFIGURED") {
      return Response.json(
        {
          error: "Translation unavailable",
          unavailable: true,
        },
        { status: 503 },
      );
    }

    return Response.json({ error: "Localization failed" }, { status: 500 });
  }
}
