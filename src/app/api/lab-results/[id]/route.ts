import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { deleteLabResultForUser } from "@/lib/lab-results-db";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const labResultId = id?.trim();

    if (!labResultId) {
      return Response.json({ error: "Befund-ID fehlt." }, { status: 400 });
    }

    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user?.id) {
      return Response.json(
        { error: "Bitte melden Sie sich an, um Befunde zu löschen." },
        { status: 401 },
      );
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { data, error } = await deleteLabResultForUser(
      supabase,
      labResultId,
      user.id,
    );

    if (error) throw error;

    if (!data) {
      return Response.json({ error: "Befund nicht gefunden." }, { status: 404 });
    }

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Lab result delete failed", error);

    return Response.json(
      { error: "Befund konnte gerade nicht gelöscht werden." },
      { status: 500 },
    );
  }
}
