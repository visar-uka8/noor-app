import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { getWatcherId } from "@/lib/family-roles";
import { queryActiveFamilyLinksForUser } from "@/lib/family-links-query";
import { logSupabaseError } from "@/lib/load-settings-profile";

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
      .select("id, patient_id, watcher_id, family_member_id, active")
      .eq("id", id)
      .maybeSingle<{
        id: string;
        patient_id: string;
        watcher_id: string | null;
        family_member_id: string | null;
        active: boolean | null;
      }>();

    if (linkError) throw linkError;

    if (!link) {
      return Response.json({ error: "Verbindung nicht gefunden." }, { status: 404 });
    }

    const watcherId = getWatcherId(link);
    const canDisconnect =
      link.patient_id === user.id || watcherId === user.id;

    if (!canDisconnect) {
      return Response.json({ error: "Verbindung nicht gefunden." }, { status: 404 });
    }

    if (link.active === false) {
      return Response.json({ disconnected: true });
    }

    const { error } = await supabase
      .from("family_links")
      .update({ active: false })
      .eq("id", id);

    if (error) throw error;

    return Response.json({ disconnected: true });
  } catch (error) {
    logSupabaseError("Family disconnect failed", error);

    return Response.json(
      { error: "Verbindung konnte nicht getrennt werden." },
      { status: 500 },
    );
  }
}
