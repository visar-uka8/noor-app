import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { data: link, error: linkError } = await supabase
      .from("family_links")
      .select("id, patient_id")
      .eq("id", id)
      .maybeSingle<{ id: string; patient_id: string }>();

    if (linkError) throw linkError;

    if (!link || link.patient_id !== user.id) {
      return Response.json({ error: "Verbindung nicht gefunden." }, { status: 404 });
    }

    const { error } = await supabase
      .from("family_links")
      .update({ active: false })
      .eq("id", id);

    if (error) throw error;

    return Response.json({ disconnected: true });
  } catch (error) {
    console.error("Family disconnect failed", error);

    return Response.json(
      { error: "Verbindung konnte nicht getrennt werden." },
      { status: 500 },
    );
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
