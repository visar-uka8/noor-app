import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { queryWatcherLinkForPatient } from "@/lib/family-links-query";
import {
  insertFamilyNote,
  isMissingFamilyNotesReplyColumnsError,
  isMissingFamilyNotesTableError,
  loadVisibleFamilyNoteForPatient,
  markFamilyNoteRead,
  markFamilyNoteReplySeenBySender,
  normalizeFamilyNoteMessage,
  replyToFamilyNote,
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
    const note = await loadVisibleFamilyNoteForPatient(supabase, user.id);

    return Response.json({ note });
  } catch (error) {
    console.error("Family notes load failed", error);

    if (isMissingFamilyNotesTableError(error)) {
      return Response.json({
        note: null,
        setupRequired: true,
      });
    }

    return Response.json(
      { error: "Nachricht konnte gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      toUserId?: unknown;
      message?: unknown;
    };

    const toUserId =
      typeof payload.toUserId === "string" ? payload.toUserId.trim() : "";
    const message = normalizeFamilyNoteMessage(payload.message);

    if (!toUserId) {
      return Response.json(
        { error: "Empfänger fehlt." },
        { status: 400 },
      );
    }

    if (!message) {
      return Response.json(
        { error: "Bitte schreiben Sie eine kurze Nachricht." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const familyLink = await queryWatcherLinkForPatient(
      supabase,
      user.id,
      toUserId,
    );

    if (!familyLink) {
      return Response.json(
        { error: "Keine aktive Familienverbindung zu dieser Person." },
        { status: 403 },
      );
    }

    const note = await insertFamilyNote(supabase, {
      fromUserId: user.id,
      toUserId,
      message,
    });

    return Response.json({ ok: true, noteId: note.id });
  } catch (error) {
    console.error("Family note send failed", error);

    if (isMissingFamilyNotesTableError(error)) {
      return Response.json(
        {
          error:
            "Nachrichten sind noch nicht eingerichtet. Bitte migration_family_notes.sql in Supabase ausführen.",
        },
        { status: 503 },
      );
    }

    return Response.json(
      { error: "Nachricht konnte nicht gesendet werden." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      noteId?: unknown;
      replyMessage?: unknown;
      markReplySeen?: unknown;
    };
    const noteId = typeof payload.noteId === "string" ? payload.noteId.trim() : "";

    if (!noteId) {
      return Response.json({ error: "Nachricht-ID fehlt." }, { status: 400 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;

    if (payload.markReplySeen === true) {
      await markFamilyNoteReplySeenBySender(supabase, noteId, user.id);
      return Response.json({ ok: true });
    }

    const replyMessage = normalizeFamilyNoteMessage(payload.replyMessage);

    if (replyMessage) {
      await replyToFamilyNote(supabase, noteId, user.id, replyMessage);
      return Response.json({ ok: true });
    }

    await markFamilyNoteRead(supabase, noteId, user.id);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Family note update failed", error);

    if (
      isMissingFamilyNotesTableError(error) ||
      isMissingFamilyNotesReplyColumnsError(error)
    ) {
      return Response.json({ ok: true });
    }

    return Response.json(
      { error: "Nachricht konnte nicht aktualisiert werden." },
      { status: 500 },
    );
  }
}
