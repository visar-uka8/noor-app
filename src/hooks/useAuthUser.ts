"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    async function loadUser() {
      try {
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

        console.log("Home client auth user:", currentUser);
        console.log("Home client auth error:", error);

        if (!cancelled) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Home client auth load failed:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading };
}
