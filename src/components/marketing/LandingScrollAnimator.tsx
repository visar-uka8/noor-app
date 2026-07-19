"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export function LandingScrollAnimator({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useScrollAnimation();

  return <div ref={ref}>{children}</div>;
}
