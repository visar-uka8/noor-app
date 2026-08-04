"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addWaterLiters,
  resetWaterToday as resetWaterTodayValue,
} from "@/lib/water-quick-log";

type UseWaterQuickLogOptions = {
  initialLiters: number;
};

export function useWaterQuickLog({ initialLiters }: UseWaterQuickLogOptions) {
  const router = useRouter();
  const [waterLiters, setWaterLiters] = useState(initialLiters);
  const [waterAdded, setWaterAdded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSavingRef = useRef(false);
  const waterLitersRef = useRef(initialLiters);

  useEffect(() => {
    setWaterLiters(initialLiters);
    waterLitersRef.current = initialLiters;
  }, [initialLiters]);

  const showAddedFeedback = useCallback(() => {
    setWaterAdded(true);
    window.setTimeout(() => setWaterAdded(false), 2000);
  }, []);

  const quickAddWater = useCallback(
    async (amount: number): Promise<boolean> => {
      console.log("useWaterQuickLog.quickAddWater:", amount);

      if (amount <= 0) return false;
      if (isSavingRef.current) return false;

      isSavingRef.current = true;
      setIsSaving(true);
      setError(null);

      const previousValue = waterLitersRef.current;

      try {
        const nextValue = await addWaterLiters(previousValue, amount);
        console.log("useWaterQuickLog saved:", nextValue);

        waterLitersRef.current = nextValue;
        setWaterLiters(nextValue);
        showAddedFeedback();
        router.refresh();
        return true;
      } catch (saveError) {
        console.error("useWaterQuickLog error:", saveError);
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Wasser konnte nicht gespeichert werden.",
        );
        return false;
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [router, showAddedFeedback],
  );

  const resetWaterToday = useCallback(async (): Promise<boolean> => {
    if (isSavingRef.current) return false;

    isSavingRef.current = true;
    setIsSaving(true);
    setError(null);

    const previousValue = waterLitersRef.current;

    try {
      await resetWaterTodayValue();
      waterLitersRef.current = 0;
      setWaterLiters(0);
      router.refresh();
      return true;
    } catch (saveError) {
      console.error("useWaterQuickLog reset error:", saveError);
      waterLitersRef.current = previousValue;
      setWaterLiters(previousValue);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Wasser konnte nicht zurückgesetzt werden.",
      );
      return false;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [router]);

  return {
    waterLiters,
    waterAdded,
    isSaving,
    error,
    quickAddWater,
    resetWaterToday,
  };
}
