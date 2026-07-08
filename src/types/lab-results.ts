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

export function getAnalysisPreview(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("\n");
}

export const UNREADABLE_IMAGE_MESSAGE =
  "Das Bild war leider nicht gut lesbar. Bitte versuchen Sie ein klareres Foto aufzunehmen.";

export const ANALYSIS_UNAVAILABLE_MESSAGE =
  "Analyse momentan nicht verfügbar. Bitte versuchen Sie es später erneut.";
