"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLandingSignedInRedirectUrl } from "@/lib/site-gate";

export function LandingAuthRedirect() {
  useEffect(() => {
    const supabase = createClient();
    const redirectUrl = getLandingSignedInRedirectUrl();

    async function redirectIfSignedIn() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && redirectUrl) {
        window.location.href = redirectUrl;
      }
    }

    void redirectIfSignedIn();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && redirectUrl) {
        window.location.href = redirectUrl;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
