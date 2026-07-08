export type LabAnalysisResult = {
  analysis: string;
};

export type LabResultRecord = {
  id: string;
  file_url: string;
  ai_analysis: string;
  created_at: string;
};

export function formatLabResultDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const ENGLISH_ANALYSIS_FALLBACK_PREVIEW =
  "Laborwerte analysiert — tippen zum Ansehen";

/** Detects old analyses that were generated in English. */
export function isEnglishAnalysis(text: string) {
  const trimmed = text.trim();

  if (/^hello/i.test(trimmed)) return true;

  const sample = trimmed.slice(0, 400).toLowerCase();
  const englishHits = (
    sample.match(
      /\b(the|your|this|these|and|with|are|please|doctor|values?|results?|blood|summary|explanation)\b/g,
    ) ?? []
  ).length;
  const germanHits = (
    sample.match(
      /\b(der|die|das|und|ihr|ihre|sind|bitte|arzt|wert|werte|befund|blut|zusammenfassung|normalbereich)\b/g,
    ) ?? []
  ).length;

  return englishHits > germanHits;
}

export function getAnalysisPreview(text: string) {
  if (isEnglishAnalysis(text)) {
    return ENGLISH_ANALYSIS_FALLBACK_PREVIEW;
  }

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !/^-{3,}$/.test(line) &&
        // Skip all-caps section headers like ZUSAMMENFASSUNG.
        !/^[A-ZÄÖÜ\s]{4,}$/.test(line),
    )
    .slice(0, 2)
    .join("\n");
}

export const UNREADABLE_IMAGE_MESSAGE =
  "Das Bild war leider nicht gut lesbar. Bitte versuchen Sie ein klareres Foto aufzunehmen.";

export const ANALYSIS_UNAVAILABLE_MESSAGE =
  "Analyse momentan nicht verfügbar. Bitte versuchen Sie es später erneut.";
