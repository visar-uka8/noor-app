import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { resolveWatcherPatientLink } from "@/lib/family-links-query";
import { loadHealthPassportForUser } from "@/lib/health-passport-load";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
    }

    const patientId = new URL(request.url).searchParams.get("patientId");
    const supabase = createSupabaseDataClient() ?? authSupabase;
    const familyLink = await resolveWatcherPatientLink(
      supabase,
      user.id,
      patientId,
    );

    if (!familyLink) {
      return Response.json(
        { error: "Keine aktive Familienverbindung gefunden." },
        { status: 404 },
      );
    }

    const passport = await loadHealthPassportForUser(
      familyLink.patient_id,
      supabase,
    );

    if (!passport) {
      return Response.json({ passport: null, patientId: familyLink.patient_id });
    }

    return Response.json({
      passport,
      patientId: familyLink.patient_id,
    });
  } catch (error) {
    console.error("Family health passport load failed", error);

    return Response.json(
      { error: "Gesundheitspass konnte gerade nicht geladen werden." },
      { status: 500 },
    );
  }
}
