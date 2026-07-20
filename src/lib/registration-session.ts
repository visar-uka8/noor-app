import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function isEmailNotConfirmedMessage(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("email not confirmed") ||
    normalized.includes("not confirmed")
  );
}

export async function establishOnboardingSession(input: {
  email: string;
  password: string;
  userId: string;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return {
      ok: false as const,
      error: "Authentifizierung ist lokal noch nicht konfiguriert.",
    };
  }

  const verifyClient = createAdminClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  });

  if (!signInError) {
    return { ok: true as const, alreadySignedIn: true as const };
  }

  if (!isEmailNotConfirmedMessage(signInError.message)) {
    return { ok: false as const, error: "Anmeldedaten stimmen nicht." };
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } =
    await adminClient.auth.admin.getUserById(input.userId);

  if (
    userError ||
    !userData.user ||
    userData.user.email?.trim().toLowerCase() !== input.email.trim().toLowerCase()
  ) {
    return { ok: false as const, error: "Profil konnte nicht verifiziert werden." };
  }

  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: input.email.trim(),
    });

  const tokenHash = linkData?.properties?.hashed_token;

  if (linkError || !tokenHash) {
    return {
      ok: false as const,
      error: "Anmeldung nach der Registrierung konnte nicht eingerichtet werden.",
    };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });

  if (verifyError) {
    return {
      ok: false as const,
      error: "Anmeldung nach der Registrierung konnte nicht eingerichtet werden.",
    };
  }

  return { ok: true as const };
}
