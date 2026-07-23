"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import {
  createContext,
  useContext,
} from "react";
import i18n, { changeAppLanguage, ensureI18nReady } from "@/lib/i18n/client";
import {
  DEFAULT_LANGUAGE,
  normalizeAppLanguage,
  SHOW_LANGUAGE_SELECTOR,
  type AppLanguage,
} from "@/lib/i18n/languages";
import {
  normalizeInterpolationVars,
  resolveI18nKey,
} from "@/lib/i18n/legacy-key-map";
import type { MessageKey } from "@/lib/i18n/messages";
import { createClient } from "@/lib/supabase/client";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (
    language: AppLanguage,
    options?: { persistProfile?: boolean },
  ) => Promise<void>;
  t: (key: MessageKey | string, vars?: Record<string, string | number>) => string;
  ready: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function LanguageContextBridge({ children }: { children: React.ReactNode }) {
  const { t: i18nT, i18n: i18nextInstance } = useTranslation("common");
  const [ready, setReady] = useState(i18nextInstance.isInitialized);

  useEffect(() => {
    void ensureI18nReady().then(async () => {
      setReady(true);

      if (!SHOW_LANGUAGE_SELECTOR) {
        if (normalizeAppLanguage(i18nextInstance.language) !== DEFAULT_LANGUAGE) {
          await changeAppLanguage(DEFAULT_LANGUAGE);
        }
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("language")
          .eq("id", user.id)
          .maybeSingle<{ language: string | null }>();

        const profileLanguage = normalizeAppLanguage(profile?.language);
        const storedLanguage = normalizeAppLanguage(
          window.localStorage.getItem("noor-language"),
        );

        const language = profile?.language ? profileLanguage : storedLanguage;

        if (language !== normalizeAppLanguage(i18nextInstance.language)) {
          await changeAppLanguage(language);
        }
      } catch {
        // Profile language sync is best-effort on startup.
      }
    });
  }, [i18nextInstance]);

  const language = SHOW_LANGUAGE_SELECTOR
    ? normalizeAppLanguage(i18nextInstance.language)
    : DEFAULT_LANGUAGE;

  const setLanguage = useCallback(
    async (next: AppLanguage, options?: { persistProfile?: boolean }) => {
      const language = SHOW_LANGUAGE_SELECTOR ? next : DEFAULT_LANGUAGE;
      await changeAppLanguage(language);

      if (options?.persistProfile === false) return;

      try {
        await fetch("/api/settings", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language }),
        });
      } catch {
        // Language still applies locally even if profile save fails.
      }
    },
    [],
  );

  const t = useCallback(
    (key: MessageKey | string, vars?: Record<string, string | number>) => {
      const resolved = resolveI18nKey(String(key));
      const translated = i18nT(resolved, normalizeInterpolationVars(vars));
      return translated === resolved && String(key).includes(".")
        ? String(key)
        : translated;
    },
    [i18nT],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      ready,
    }),
    [language, ready, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContextBridge>{children}</LanguageContextBridge>
    </I18nextProvider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}
