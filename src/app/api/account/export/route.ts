import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

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

    const supabase = createSupabaseDataClient();

    if (!supabase) {
      return Response.json(
        { error: "Datenexport ist lokal noch nicht verfügbar." },
        { status: 503 },
      );
    }

    const userId = user.id;
    const [
      profile,
      healthPassport,
      labResults,
      medications,
      medicationConfirmations,
      familyLinks,
      pushSubscriptions,
      appointments,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("health_passports").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("lab_results").select("*").eq("user_id", userId),
      supabase.from("medications").select("*").eq("user_id", userId),
      supabase.from("medication_confirmations").select("*").eq("user_id", userId),
      supabase
        .from("family_links")
        .select("*")
        .or(`patient_id.eq.${userId},family_member_id.eq.${userId}`),
      supabase.from("push_subscriptions").select("*").eq("user_id", userId),
      supabase.from("appointments").select("*").eq("patient_id", userId),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile.data,
      healthPassport: healthPassport.data,
      labResults: labResults.data ?? [],
      medications: medications.data ?? [],
      medicationConfirmations: medicationConfirmations.data ?? [],
      familyLinks: familyLinks.data ?? [],
      pushSubscriptions: pushSubscriptions.data ?? [],
      appointments: appointments.data ?? [],
    };

    const filename = `noor-datenexport-${new Date().toISOString().slice(0, 10)}.json`;

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Account export failed", error);

    return Response.json(
      { error: "Datenexport konnte nicht erstellt werden." },
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
