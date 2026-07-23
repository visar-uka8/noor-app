export type PharmacyCountryCode =
  | "DE"
  | "AT"
  | "CH"
  | "US"
  | "GB"
  | "FR"
  | "ES"
  | "DEFAULT";

/** Localized Maps search term — button copy stays global for now. */
const MAPS_SEARCH_BY_COUNTRY: Record<PharmacyCountryCode, string> = {
  DE: "Apotheke",
  AT: "Apotheke",
  CH: "Apotheke",
  US: "pharmacy",
  GB: "pharmacy",
  FR: "pharmacie",
  ES: "farmacia",
  DEFAULT: "pharmacy",
};

export const NEAREST_PHARMACY_LABEL = "Find nearest pharmacy";

export function buildNearestPharmacyMapsUrl(searchTerm: string) {
  const query = `${searchTerm} near me`;
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

export function openNearestPharmacy(searchTerm = MAPS_SEARCH_BY_COUNTRY.DEFAULT) {
  window.open(buildNearestPharmacyMapsUrl(searchTerm), "_blank", "noopener,noreferrer");
}

function normalizeCountryCode(value?: string | null): PharmacyCountryCode | null {
  if (!value?.trim()) {
    return null;
  }

  const code = value.trim().toUpperCase();
  if (code === "UK") {
    return "GB";
  }

  if (code in MAPS_SEARCH_BY_COUNTRY) {
    return code as PharmacyCountryCode;
  }

  return null;
}

export function detectClientCountryCode(): PharmacyCountryCode | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const locale of languages) {
    const fromIntl = readRegionFromLocale(locale);
    const normalized = normalizeCountryCode(fromIntl);
    if (normalized && normalized !== "DEFAULT") {
      return normalized;
    }
  }

  return null;
}

function readRegionFromLocale(locale: string) {
  try {
    return new Intl.Locale(locale).region ?? null;
  } catch {
    const match = locale.match(/[-_]([A-Za-z]{2})$/);
    return match?.[1]?.toUpperCase() ?? null;
  }
}

export function resolvePharmacyMapsSearchTerm(options?: {
  countryCode?: string | null;
}) {
  const explicit = normalizeCountryCode(options?.countryCode);
  if (explicit) {
    return MAPS_SEARCH_BY_COUNTRY[explicit];
  }

  const detected = detectClientCountryCode();
  if (detected) {
    return MAPS_SEARCH_BY_COUNTRY[detected];
  }

  return MAPS_SEARCH_BY_COUNTRY.DEFAULT;
}

/** @deprecated Reserved for future pharmacy partner suggestions. */
export type PharmacyPartner = {
  id: string;
  name: string;
  url: string;
};
