"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import deCommon from "../../../public/locales/de/common.json";
import enCommon from "../../../public/locales/en/common.json";
import trCommon from "../../../public/locales/tr/common.json";
import sqCommon from "../../../public/locales/sq/common.json";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  type AppLanguage,
} from "@/lib/i18n/languages";

const resources = {
  de: { common: deCommon },
  en: { common: enCommon },
  tr: { common: trCommon },
  sq: { common: sqCommon },
};

const initPromise = i18n.isInitialized
  ? Promise.resolve(i18n)
  : i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: ["de", "en", "tr", "sq"],
        defaultNS: "common",
        ns: ["common"],
        detection: {
          order: ["localStorage", "navigator"],
          caches: ["localStorage"],
          lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        },
        interpolation: {
          escapeValue: false,
        },
      });

export async function ensureI18nReady() {
  await initPromise;
  return i18n;
}

export function changeAppLanguage(language: AppLanguage) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  document.documentElement.lang = language;
  return i18n.changeLanguage(language);
}

export default i18n;
