"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { createContext, useContext } from "react";
import i18n, { changeAppLanguage, ensureI18nReady } from "@/lib/i18n/client";
import {
  confirmDetectedLanguage,
  detectLanguageSync,
  enhanceLanguageFromIP,
  LANGUAGE_CONFIRMED_KEY,
  LANGUAGE_SOURCE_KEY,
  markLanguageSource,
} from "@/lib/detectLanguage";
import {
  isAppLanguage,
  LANGUAGE_STORAGE_KEY,
  normalizeAppLanguage,
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

async function applyProfileLanguage(userId: string) {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", userId)
    .maybeSingle<{ language: string | null }>();

  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const source = window.localStorage.getItem(LANGUAGE_SOURCE_KEY);

  // Explicit user choice wins over a stale profile while a save is in flight.
  if (source === "saved" && savedLanguage && isAppLanguage(savedLanguage)) {
    if (
      profile?.language &&
      normalizeAppLanguage(profile.language) !== savedLanguage
    ) {
      await changeAppLanguage(savedLanguage);
      return true;
    }
  }

  if (!profile?.language) {
    return false;
  }

  const profileLanguage = normalizeAppLanguage(profile.language);
  await changeAppLanguage(profileLanguage);
  markLanguageSource("profile");
  return true;
}

function LanguageContextBridge({ children }: { children: React.ReactNode }) {
  const { t: i18nT, i18n: i18nextInstance } = useTranslation("common");
  const [ready, setReady] = useState(i18nextInstance.isInitialized);

  useEffect(() => {
    void ensureI18nReady()
      .then(async () => {
        const detected = detectLanguageSync();
        if (normalizeAppLanguage(i18nextInstance.language) !== detected) {
          await changeAppLanguage(detected);
        }

        const existingSource = window.localStorage.getItem(LANGUAGE_SOURCE_KEY);
        if (!existingSource || existingSource === "browser") {
          markLanguageSource("browser");
        }

        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            const appliedProfile = await applyProfileLanguage(user.id);
            if (appliedProfile) {
              return;
            }
          }
        } catch {
          // Profile language sync is best-effort on startup.
        }

        void enhanceLanguageFromIP(async (language) => {
          const source = window.localStorage.getItem(LANGUAGE_SOURCE_KEY);
          if (
            source === "saved" ||
            window.localStorage.getItem(LANGUAGE_CONFIRMED_KEY)
          ) {
            return;
          }
          await changeAppLanguage(language);
        });
      })
      .catch((error) => {
        console.error("Language initialization failed", error);
      })
      .finally(() => {
        setReady(true);
      });
  }, [i18nextInstance]);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Token refresh must not overwrite a language the user just picked.
      if (event === "TOKEN_REFRESHED") {
        return;
      }

      if (!session?.user) {
        return;
      }

      if (
        event !== "SIGNED_IN" &&
        event !== "INITIAL_SESSION" &&
        event !== "USER_UPDATED"
      ) {
        return;
      }

      void applyProfileLanguage(session.user.id).catch(() => {
        // Best-effort sync after login.
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const language = normalizeAppLanguage(i18nextInstance.language);

  const setLanguage = useCallback(
    async (next: AppLanguage, options?: { persistProfile?: boolean }) => {
      // Mark preference first so auth/profile sync cannot race and revert.
      markLanguageSource("saved");
      confirmDetectedLanguage();
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
      await changeAppLanguage(next);

      if (options?.persistProfile === false) {
        return;
      }

      try {
        await fetch("/api/settings", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: next }),
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
