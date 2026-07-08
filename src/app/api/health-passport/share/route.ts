import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { buildShareUrl } from "@/lib/health-passport-share";

export const runtime = "nodejs";

const SHARE_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;

    const { data: passport, error: passportError } = await supabase
      .from("health_passports")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle<{ user_id: string }>();

    if (passportError) throw passportError;

    if (!passport) {
      return Response.json(
        { error: "Bitte speichern Sie zuerst Ihren Gesundheitspass." },
        { status: 400 },
      );
    }

    const expiresAt = new Date(Date.now() + SHARE_TTL_MS);
    const token = generateShareToken();

    const { data, error } = await supabase
      .from("health_passport_shares")
      .insert({
        patient_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select("id, token, expires_at")
      .single();

    if (error) throw error;

    return Response.json({
      share: {
        id: data.id,
        token: data.token,
        expiresAt: data.expires_at,
        shareUrl: buildShareUrl(data.token),
      },
    });
  } catch (error) {
    console.error("Health passport share creation failed", error);

    return Response.json(
      { error: "Notfall-Link konnte gerade nicht erstellt werden." },
      { status: 500 },
    );
  }
}

function generateShareToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createSupabaseDataClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createAdminClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}
