"use client";

import { useCallback, useEffect, useState } from "react";
import { dismissFamilyNote, isFamilyNoteDismissed } from "@/lib/family-note-dismiss";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type { PatientFamilyNote } from "@/types/family-notes";

type FamilyNotesResponse = {
  note?: PatientFamilyNote | null;
  error?: string;
};

export function usePatientFamilyNote() {
  const [note, setNote] = useState<PatientFamilyNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetchWithTimeout("/api/family-notes", {
        credentials: "include",
      });

      if (!response.ok) {
        setNote(null);
        return;
      }

      const payload = (await response.json()) as FamilyNotesResponse;
      const nextNote = payload.note ?? null;

      if (nextNote && isFamilyNoteDismissed(nextNote.id)) {
        setNote(null);
        return;
      }

      setNote(nextNote);
    } catch {
      setNote(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handleFocus = () => {
      void load();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [load]);

  const dismiss = useCallback((noteId: string) => {
    dismissFamilyNote(noteId);
    setNote((current) => (current?.id === noteId ? null : current));
  }, []);

  return {
    note,
    isLoading,
    reload: load,
    dismiss,
  };
}
