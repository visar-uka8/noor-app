"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP_BASE_URL } from "@/lib/site-gate";

export function LandingAuthRedirect() {
  useEffect(() => {
    const supabase = createClient();

    async function redirectIfSignedIn() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        window.location.href = APP_BASE_URL;
      }
    }

    void redirectIfSignedIn();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        window.location.href = APP_BASE_URL;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
