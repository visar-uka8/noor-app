export type AppLanguage = "de" | "en" | "tr" | "sq";

export const DEFAULT_LANGUAGE: AppLanguage = "de";

/** Set to true when re-enabling the language picker in settings and registration. */
export const SHOW_LANGUAGE_SELECTOR = false;

export const LANGUAGE_STORAGE_KEY = "noor-language";

export const SUPPORTED_LANGUAGES: Array<{
  code: AppLanguage;
  label: string;
  flag: string;
}> = [
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "sq", label: "Shqip", flag: "🇦🇱" },
];

export const AI_LANGUAGE_NAMES: Record<AppLanguage, string> = {
  de: "Deutsch",
  en: "English",
  tr: "Türkçe",
  sq: "Shqip (Albanian)",
};

export const LANGUAGE_FIELD_LABELS: Record<AppLanguage, string> = {
  de: "Sprache",
  en: "Language",
  tr: "Dil",
  sq: "Gjuha",
};

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return value === "de" || value === "en" || value === "tr" || value === "sq";
}

export function normalizeAppLanguage(
  value: string | null | undefined,
): AppLanguage {
  return isAppLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export const DATE_LOCALE: Record<AppLanguage, string> = {
  de: "de-DE",
  en: "en-GB",
  tr: "tr-TR",
  sq: "sq-AL",
};

export function formatAppDate(
  language: AppLanguage,
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  },
) {
  return date.toLocaleDateString(DATE_LOCALE[language] ?? "de-DE", options);
}

export function buildAiLanguageInstruction(language: AppLanguage) {
  const languageName = AI_LANGUAGE_NAMES[language];

  return `KRITISCH: Antworte IMMER auf ${languageName}.
Niemals auf einer anderen Sprache antworten.
Die gesamte Analyse, alle Erklärungen, alle Empfehlungen müssen auf ${languageName} sein.`;
}
