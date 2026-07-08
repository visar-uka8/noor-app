"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import {
  type Language,
  type MessageKey,
  translate,
} from "@/lib/i18n/messages";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const storageKey = "noor-language";
const appLanguage: Language = "de";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = appLanguage;
    window.localStorage.setItem(storageKey, appLanguage);
  }, []);

  const setLanguage = useCallback((_next: Language) => {
    // The app is German-only.
  }, []);

  const value = useMemo(
    () => ({
      language: appLanguage,
      setLanguage,
      t: (key: MessageKey, vars?: Record<string, string | number>) =>
        translate(appLanguage, key, vars),
    }),
    [setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}
