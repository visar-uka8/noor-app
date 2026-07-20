import { createClient as createAdminClient } from "@supabase/supabase-js";
import { establishOnboardingSession } from "@/lib/registration-session";

function isEmailNotConfirmedMessage(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("email not confirmed") ||
    normalized.includes("not confirmed")
  );
}

export async function resumeRegistration(input: {
  email: string;
  password: string;
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

  if (signInError && !isEmailNotConfirmedMessage(signInError.message)) {
    return {
      ok: false as const,
      error: "E-Mail oder Passwort stimmt nicht.",
    };
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: input.email.trim(),
    });

  const user = linkData?.user;

  if (linkError || !user) {
    return {
      ok: false as const,
      error: "Kein Konto mit dieser E-Mail gefunden.",
    };
  }

  const sessionResult = await establishOnboardingSession({
    email: input.email,
    password: input.password,
    userId: user.id,
  });

  if (!sessionResult.ok) {
    return sessionResult;
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    ok: true as const,
    complete: Boolean(profile?.role),
  };
}
