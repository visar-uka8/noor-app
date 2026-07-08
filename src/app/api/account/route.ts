import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const supabase = createSupabaseDataClient();

    if (!supabase) {
      return Response.json(
        { error: "Konto konnte lokal nicht gelöscht werden." },
        { status: 503 },
      );
    }

    const userId = user.id;

    await Promise.all([
      supabase.from("push_notifications_sent").delete().eq("family_member_id", userId),
      supabase.from("push_notifications_sent").delete().eq("patient_id", userId),
      supabase.from("notifications_sent").delete().eq("patient_id", userId),
      supabase.from("push_subscriptions").delete().eq("user_id", userId),
      supabase.from("health_passport_shares").delete().eq("patient_id", userId),
      supabase.from("family_invites").delete().eq("patient_id", userId),
      supabase.from("family_links").delete().eq("patient_id", userId),
      supabase.from("family_links").delete().eq("family_member_id", userId),
      supabase.from("medication_confirmations").delete().eq("user_id", userId),
      supabase.from("lab_results").delete().eq("user_id", userId),
      supabase.from("health_passports").delete().eq("user_id", userId),
      supabase.from("appointments").delete().eq("patient_id", userId),
      supabase.from("notifications").delete().eq("user_id", userId),
      supabase.from("profiles").delete().eq("id", userId),
    ]);

    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) throw authDeleteError;

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Account deletion failed", error);

    return Response.json(
      { error: "Konto konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }
}

function createSupabaseDataClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createAdminClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}
