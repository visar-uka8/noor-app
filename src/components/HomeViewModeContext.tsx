"use client";

import { createContext, useContext } from "react";
import type { HomeViewMode } from "@/components/HomeModeSwitcher";

type HomeViewModeContextValue = {
  mode: HomeViewMode;
  hasFamilyConnection: boolean;
  setViewMode: (mode: HomeViewMode) => void;
};

const HomeViewModeContext = createContext<HomeViewModeContextValue>({
  mode: "self",
  hasFamilyConnection: false,
  setViewMode: () => undefined,
});

export function HomeViewModeProvider({
  mode,
  hasFamilyConnection,
  setViewMode,
  children,
}: {
  mode: HomeViewMode;
  hasFamilyConnection: boolean;
  setViewMode: (mode: HomeViewMode) => void;
  children: React.ReactNode;
}) {
  return (
    <HomeViewModeContext.Provider
      value={{ mode, hasFamilyConnection, setViewMode }}
    >
      {children}
    </HomeViewModeContext.Provider>
  );
}

export function useHomeViewModeContext() {
  return useContext(HomeViewModeContext);
}
