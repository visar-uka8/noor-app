import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ stored: false }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { error } = await supabase
      .from("profiles")
      .update({ last_check_in_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) throw error;

    return Response.json({ stored: true });
  } catch (error) {
    console.error("Check-in update failed", error);

    return Response.json({ stored: false }, { status: 500 });
  }
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
