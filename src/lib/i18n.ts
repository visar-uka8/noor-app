export { default } from "./i18n/client";
export { changeAppLanguage, ensureI18nReady } from "./i18n/client";
export {
  AI_LANGUAGE_NAMES,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  buildAiLanguageInstruction,
  isAppLanguage,
  normalizeAppLanguage,
  type AppLanguage,
} from "./i18n/languages";
