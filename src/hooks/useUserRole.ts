"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/profiles";

/** Loads the signed-in user's role. Defaults to patient when unset. */
export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        if (!cancelled) {
          setRole("patient");
          setIsLoading(false);
        }
        return;
      }

      let resolvedRole: UserRole = "patient";

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setRole(null);
            setIsLoading(false);
          }
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle<{ role: string | null }>();

        if (data?.role === "family_member") {
          resolvedRole = "family_member";
        }
      } catch {
        // Fall back to patient when the role cannot be loaded.
      }

      if (!cancelled) {
        setRole(resolvedRole);
        setIsLoading(false);
      }
    }

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

  return { role, isLoading };
}
