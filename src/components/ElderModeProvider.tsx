"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyFontSizePreference,
  readFontSizePreference,
  type FontSizePreference,
} from "@/lib/font-size";

type ElderModeContextValue = {
  elderMode: boolean;
  fontSize: FontSizePreference;
  setElderMode: (enabled: boolean) => void;
  setFontSize: (size: FontSizePreference) => void;
};

const ElderModeContext = createContext<ElderModeContextValue | null>(null);

export function ElderModeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizePreference>("normal");

  useEffect(() => {
    const preference = readFontSizePreference();
    setFontSizeState(preference);
    applyFontSizePreference(preference);
  }, []);

  useEffect(() => {
    applyFontSizePreference(fontSize);
  }, [fontSize]);

  const value = useMemo(
    () => ({
      elderMode: fontSize === "large",
      fontSize,
      setElderMode: (enabled: boolean) =>
        setFontSizeState(enabled ? "large" : "normal"),
      setFontSize: setFontSizeState,
    }),
    [fontSize],
  );

  return (
    <ElderModeContext.Provider value={value}>
      {children}
    </ElderModeContext.Provider>
  );
}

export function useElderMode() {
  const context = useContext(ElderModeContext);

  if (!context) {
    throw new Error("useElderMode must be used inside ElderModeProvider.");
  }

  return context;
}
