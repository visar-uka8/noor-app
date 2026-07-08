"use client";

import { useEffect, useState } from "react";

export function useSlowConnection(active: boolean, delayMs = 5_000) {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      setIsSlow(false);
      return;
    }

    const timer = window.setTimeout(() => setIsSlow(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);

  return isSlow;
}
