"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/profiles";

/** Loads the signed-in user's role. Returns null while unknown. */
export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle<{ role: string }>();

        if (
          !cancelled &&
          (data?.role === "patient" || data?.role === "family_member")
        ) {
          setRole(data.role);
        }
      } catch {
        // Keep default view when the role cannot be loaded.
      }
    }

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

  return role;
}
