import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { FamilyInvite } from "@/types/family-connect";

export const runtime = "nodejs";

const INVITE_TTL_MS = 48 * 60 * 60 * 1000;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function POST() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Bitte melden Sie sich an, um eine Einladung zu erstellen." },
        { status: 401 },
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
    const invite = {
      patient_id: user.id,
      code: generateInviteCode(),
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      used: false,
    };

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { data, error } = await supabase
      .from("family_invites")
      .insert(invite)
      .select("id, code, patient_id, created_at, expires_at, used")
      .single();

    if (error) throw error;

    return Response.json({
      invite: toClientInvite(data),
    });
  } catch (error) {
    console.error("Family invite creation failed", error);

    return Response.json(
      { error: "Einladung konnte gerade nicht erstellt werden." },
      { status: 500 },
    );
  }
}

function generateInviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));

  return Array.from(bytes, (byte) => CODE_CHARS[byte % CODE_CHARS.length]).join(
    "",
  );
}

function toClientInvite(record: {
  id: string;
  code: string;
  patient_id: string;
  created_at: string;
  expires_at: string;
  used: boolean;
}): FamilyInvite {
  return {
    id: record.id,
    code: record.code,
    patientId: record.patient_id,
    createdAt: record.created_at,
    expiresAt: record.expires_at,
    used: record.used,
  };
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
