"use client";

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  isAppLanguage,
  type AppLanguage,
} from "@/lib/i18n/languages";

export const LANGUAGE_CONFIRMED_KEY = "noor-language-confirmed";
export const LANGUAGE_SOURCE_KEY = "noor-language-source";

export type LanguageSource = "saved" | "profile" | "browser" | "ip";

const COUNTRY_TO_LANGUAGE: Record<string, AppLanguage> = {
  DE: "de",
  AT: "de",
  CH: "de",
  GB: "en",
  US: "en",
  TR: "tr",
  AL: "sq",
  XK: "sq",
  MK: "sq",
};

export function getLanguageFromBrowser(): AppLanguage {
  if (typeof navigator === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const browserLangs =
    navigator.languages?.length > 0
      ? navigator.languages
      : [navigator.language];

  for (const lang of browserLangs) {
    const base = lang.split("-")[0]?.toLowerCase();
    if (isAppLanguage(base)) {
      return base;
    }
  }

  return DEFAULT_LANGUAGE;
}

export function detectLanguageSync(): AppLanguage {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved && isAppLanguage(saved)) {
    return saved;
  }

  return getLanguageFromBrowser();
}

export async function detectLanguageFromIP(): Promise<AppLanguage> {
  try {
    const response = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return getLanguageFromBrowser();
    }

    const data = (await response.json()) as { country_code?: string };
    const countryCode = data.country_code?.toUpperCase();
    const mapped = countryCode ? COUNTRY_TO_LANGUAGE[countryCode] : undefined;

    return mapped ?? DEFAULT_LANGUAGE;
  } catch {
    return getLanguageFromBrowser();
  }
}

export async function detectLanguage(): Promise<AppLanguage> {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved && isAppLanguage(saved)) {
    return saved;
  }

  const browserLang = getLanguageFromBrowser();
  if (browserLang !== DEFAULT_LANGUAGE) {
    return browserLang;
  }

  return detectLanguageFromIP();
}

export async function enhanceLanguageFromIP(
  onLanguageDetected: (language: AppLanguage) => void | Promise<void>,
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  if (window.localStorage.getItem(LANGUAGE_CONFIRMED_KEY)) {
    return;
  }

  const source = window.localStorage.getItem(LANGUAGE_SOURCE_KEY);
  if (source === "saved" || source === "profile") {
    return;
  }

  const browserLang = getLanguageFromBrowser();
  if (browserLang !== DEFAULT_LANGUAGE) {
    window.localStorage.setItem(LANGUAGE_SOURCE_KEY, "browser");
    return;
  }

  const ipLang = await detectLanguageFromIP();

  // User may have picked a language while geolocation was in flight.
  if (window.localStorage.getItem(LANGUAGE_CONFIRMED_KEY)) {
    return;
  }
  const sourceAfterWait = window.localStorage.getItem(LANGUAGE_SOURCE_KEY);
  if (sourceAfterWait === "saved" || sourceAfterWait === "profile") {
    return;
  }

  if (ipLang === browserLang) {
    window.localStorage.setItem(LANGUAGE_SOURCE_KEY, "browser");
    return;
  }

  window.localStorage.setItem(LANGUAGE_SOURCE_KEY, "ip");
  await onLanguageDetected(ipLang);
}

export function markLanguageSource(source: LanguageSource) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LANGUAGE_SOURCE_KEY, source);
}

export function confirmDetectedLanguage() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LANGUAGE_CONFIRMED_KEY, "true");
}

export function shouldShowLanguageSuggestion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.localStorage.getItem(LANGUAGE_CONFIRMED_KEY)) {
    return false;
  }

  return window.localStorage.getItem(LANGUAGE_SOURCE_KEY) === "ip";
}
