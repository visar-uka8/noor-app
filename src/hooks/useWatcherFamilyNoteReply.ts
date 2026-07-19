"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type { WatcherFamilyNoteReply } from "@/types/family-notes";

type FamilyNoteRepliesResponse = {
  reply?: WatcherFamilyNoteReply | null;
  error?: string;
};

export function useWatcherFamilyNoteReply() {
  const [reply, setReply] = useState<WatcherFamilyNoteReply | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetchWithTimeout("/api/family-notes/replies", {
        credentials: "include",
      });

      if (!response.ok) {
        setReply(null);
        return;
      }

      const payload = (await response.json()) as FamilyNoteRepliesResponse;
      setReply(payload.reply ?? null);
    } catch {
      setReply(null);
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
    setReply((current) => (current?.id === noteId ? null : current));
  }, []);

  return {
    reply,
    isLoading,
    reload: load,
    dismiss,
  };
}
