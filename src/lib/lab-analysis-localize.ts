import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isDeepLConfigured,
  translateHealthcareTexts,
} from "@/lib/deepl";
import {
  detectAnalysisLanguage,
  parseLabAnalysis,
  type AnalysisLanguage,
  type ParsedLabAnalysis,
} from "@/lib/parse-lab-analysis";
import type { AppLanguage } from "@/lib/i18n/languages";

const TRANSLATION_CACHE_VERSION = 2;

const TIP_PREFIX = /^(?:Tipp|Tip|İpucu|Këshillë)\s*:\s*/i;

type LabResultTranslationRow = {
  id: string;
  user_id: string;
  ai_analysis: string;
  analysis_language?: string | null;
  analysis_translations?: Record<string, CachedLabTranslation> | null;
};

type CachedLabTranslation =
  | string
  | {
      v: number;
      parsed: ParsedLabAnalysis;
    };

export type LocalizedLabAnalysis = {
  parsed: ParsedLabAnalysis;
  translated: boolean;
  sourceLanguage: AnalysisLanguage;
  cached?: boolean;
  unavailable?: boolean;
};

function isMissingTranslationColumnError(error: { message?: string; code?: string }) {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    message.includes("analysis_language") ||
    message.includes("analysis_translations")
  );
}

function normalizeTipForTranslation(tip: string) {
  return tip.replace(TIP_PREFIX, "").trim();
}

function readCachedTranslation(
  cached: CachedLabTranslation | undefined,
  sourceLanguage: AnalysisLanguage,
  targetLanguage: AppLanguage,
): ParsedLabAnalysis | null {
  if (!cached) return null;

  if (
    typeof cached === "object" &&
    cached.v === TRANSLATION_CACHE_VERSION &&
    cached.parsed
  ) {
    return cached.parsed;
  }

  if (typeof cached === "string") {
    if (
      targetLanguage !== sourceLanguage &&
      detectAnalysisLanguage(cached) === sourceLanguage
    ) {
      return null;
    }

    const parsed = parseLabAnalysis(cached);
    return parsed.structured ? parsed : null;
  }

  return null;
}

async function buildTranslationMap(
  strings: string[],
  targetLanguage: AppLanguage,
  sourceLanguage: AnalysisLanguage,
) {
  const unique = [...new Set(strings.map((entry) => entry.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return new Map<string, string>();
  }

  const translated = await translateHealthcareTexts(
    unique,
    targetLanguage,
    sourceLanguage,
  );

  return new Map(unique.map((source, index) => [source, translated[index] ?? source]));
}

function mapText(
  translationMap: Map<string, string>,
  text: string,
) {
  const trimmed = text.trim();
  if (!trimmed) return text;
  return translationMap.get(trimmed) ?? text;
}

export async function localizeLabAnalysisContent(
  analysis: string,
  targetLanguage: AppLanguage,
  sourceLanguage: AnalysisLanguage = detectAnalysisLanguage(analysis),
): Promise<LocalizedLabAnalysis> {
  const parsed = parseLabAnalysis(analysis);

  if (targetLanguage === sourceLanguage) {
    return {
      parsed,
      translated: false,
      sourceLanguage,
    };
  }

  if (!isDeepLConfigured()) {
    return {
      parsed,
      translated: false,
      sourceLanguage,
      unavailable: true,
    };
  }

  const strings: string[] = [];

  const add = (value?: string | null) => {
    if (value?.trim()) {
      strings.push(value.trim());
    }
  };

  add(parsed.summary);

  for (const value of parsed.values) {
    add(value.name);
    add(value.meaning);
    add(value.tip ? normalizeTipForTranslation(value.tip) : null);
    add(value.status);
  }

  for (const step of parsed.nextSteps) {
    add(step);
  }

  if (parsed.lifestylePlan) {
    add(parsed.lifestylePlan.nutrition);
    add(parsed.lifestylePlan.exercise);
    add(parsed.lifestylePlan.hydration);
    add(parsed.lifestylePlan.nextCheckup);
  }

  add(parsed.doctorVisit);
  add(parsed.disclaimer);

  for (const goal of parsed.personalGoals) {
    add(goal.name);
    add(goal.target);
    add(goal.why);
    add(goal.current);
  }

  const translationMap = await buildTranslationMap(
    strings,
    targetLanguage,
    sourceLanguage,
  );

  const localizedParsed: ParsedLabAnalysis = {
    ...parsed,
    summary: mapText(translationMap, parsed.summary),
    values: parsed.values.map((value) => ({
      ...value,
      name: mapText(translationMap, value.name),
      meaning: mapText(translationMap, value.meaning),
      tip: value.tip
        ? mapText(translationMap, normalizeTipForTranslation(value.tip))
        : undefined,
      status: mapText(translationMap, value.status),
    })),
    nextSteps: parsed.nextSteps.map((step) => mapText(translationMap, step)),
    lifestylePlan: parsed.lifestylePlan
      ? {
          nutrition: mapText(translationMap, parsed.lifestylePlan.nutrition),
          exercise: mapText(translationMap, parsed.lifestylePlan.exercise),
          hydration: mapText(translationMap, parsed.lifestylePlan.hydration),
          nextCheckup: mapText(translationMap, parsed.lifestylePlan.nextCheckup),
        }
      : null,
    doctorVisit: mapText(translationMap, parsed.doctorVisit),
    disclaimer: mapText(translationMap, parsed.disclaimer),
    personalGoals: parsed.personalGoals.map((goal) => ({
      ...goal,
      name: mapText(translationMap, goal.name),
      target: mapText(translationMap, goal.target),
      why: mapText(translationMap, goal.why),
      current: goal.current
        ? mapText(translationMap, goal.current)
        : undefined,
    })),
  };

  return {
    parsed: localizedParsed,
    translated: true,
    sourceLanguage,
  };
}

export async function localizeStoredLabResult(
  supabase: SupabaseClient,
  labResultId: string,
  userId: string,
  targetLanguage: AppLanguage,
) {
  const withTranslations = await supabase
    .from("lab_results")
    .select(
      "id, user_id, ai_analysis, analysis_language, analysis_translations",
    )
    .eq("id", labResultId)
    .eq("user_id", userId)
    .maybeSingle<LabResultTranslationRow>();

  let row = withTranslations.data;
  let fetchError = withTranslations.error;

  if (fetchError && isMissingTranslationColumnError(fetchError)) {
    const fallback = await supabase
      .from("lab_results")
      .select("id, user_id, ai_analysis")
      .eq("id", labResultId)
      .eq("user_id", userId)
      .maybeSingle<LabResultTranslationRow>();

    row = fallback.data;
    fetchError = fallback.error;
  }

  if (fetchError) {
    throw fetchError;
  }

  if (!row) {
    return null;
  }

  const sourceLanguage = detectAnalysisLanguage(
    row.ai_analysis,
    row.analysis_language,
  );

  const cachedParsed = readCachedTranslation(
    row.analysis_translations?.[targetLanguage],
    sourceLanguage,
    targetLanguage,
  );

  if (cachedParsed) {
    return {
      parsed: cachedParsed,
      translated: targetLanguage !== sourceLanguage,
      sourceLanguage,
      cached: true,
    } satisfies LocalizedLabAnalysis;
  }

  const localized = await localizeLabAnalysisContent(
    row.ai_analysis,
    targetLanguage,
    sourceLanguage,
  );

  if (localized.translated && !localized.unavailable) {
    const nextTranslations = {
      ...(row.analysis_translations ?? {}),
      [targetLanguage]: {
        v: TRANSLATION_CACHE_VERSION,
        parsed: localized.parsed,
      },
    };

    const update = await supabase
      .from("lab_results")
      .update({ analysis_translations: nextTranslations })
      .eq("id", labResultId)
      .eq("user_id", userId);

    if (update.error && !isMissingTranslationColumnError(update.error)) {
      console.warn("Lab analysis translation cache save failed:", update.error);
    }
  }

  return localized;
}
