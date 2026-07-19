import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import {
  isMissingFamilyNotesReplyColumnsError,
  isMissingFamilyNotesTableError,
  loadUnseenFamilyNoteReplyForSender,
} from "@/lib/family-notes-data";

export const runtime = "nodejs";

export async function GET() {
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
    const reply = await loadUnseenFamilyNoteReplyForSender(supabase, user.id);

    return Response.json({ reply });
  } catch (error) {
    console.error("Family note replies load failed", error);

    if (
      isMissingFamilyNotesTableError(error) ||
      isMissingFamilyNotesReplyColumnsError(error)
    ) {
      return Response.json({ reply: null, setupRequired: true });
    }

    return Response.json(
      { error: "Antwort konnte gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}
