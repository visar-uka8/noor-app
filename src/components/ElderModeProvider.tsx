"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ElderModeContextValue = {
  elderMode: boolean;
  setElderMode: (enabled: boolean) => void;
};

const ElderModeContext = createContext<ElderModeContextValue | null>(null);
const storageKey = "noor-elder-mode";

export function ElderModeProvider({ children }: { children: React.ReactNode }) {
  const [elderMode, setElderModeState] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(storageKey) === "true";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("elder-mode", elderMode);
    window.localStorage.setItem(storageKey, String(elderMode));
  }, [elderMode]);

  const value = useMemo(
    () => ({
      elderMode,
      setElderMode: setElderModeState,
    }),
    [elderMode],
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
