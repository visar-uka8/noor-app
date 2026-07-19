"use client";

import { createContext, useContext } from "react";

export type HomeViewMode = "self" | "family";

type HomeViewModeContextValue = {
  mode: HomeViewMode;
  hasFamilyConnection: boolean;
};

const HomeViewModeContext = createContext<HomeViewModeContextValue>({
  mode: "self",
  hasFamilyConnection: false,
});

export function HomeViewModeProvider({
  mode,
  hasFamilyConnection,
  children,
}: {
  mode: HomeViewMode;
  hasFamilyConnection: boolean;
  children: React.ReactNode;
}) {
  return (
    <HomeViewModeContext.Provider value={{ mode, hasFamilyConnection }}>
      {children}
    </HomeViewModeContext.Provider>
  );
}

export function useHomeViewModeContext() {
  return useContext(HomeViewModeContext);
}
